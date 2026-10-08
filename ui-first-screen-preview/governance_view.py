"""Read-only projection of frozen governance and revision-specific results."""
import hashlib
import json


def project_governance(view, governance, diff, graph=None, optimizer=None, ontology=None, questions=None, judgments=()):
    if (governance.get('source_commit') != view.get('baseline_commit')
            or diff.get('baseline_commit') != view.get('baseline_commit')
            or diff.get('head_commit') != view.get('head_commit')
            or diff.get('governance_version_id') != governance.get('version_id')):
        raise ValueError('Governance view revision/version mismatch')
    accepted = governance.get('objectives', {})
    results = {row['id']: row for row in diff.get('business_contracts', {}).get('rows', [])}
    architecture = diff.get('architecture_changes', {})
    document = {
        'schema': 'governed-objectives-view-v1',
        'baseline_commit': view['baseline_commit'], 'head_commit': view['head_commit'],
        'version_id': governance['version_id'],
        'governance_digest': hashlib.sha256(json.dumps(governance, sort_keys=True).encode()).hexdigest(),
        'architecture': [{**objective, 'observation': architecture
                          if objective.get('policy') == 'preserve_deployable_architecture' else None}
                         for objective in accepted.get('objectives', []) if objective.get('kind', 'architecture') == 'architecture'],
        'business': [{**contract, 'result': results.get(contract['id'])}
                     for contract in [*accepted.get('contracts', []), *[a for a in accepted.get('objectives', []) if a.get('kind') == 'business']]],
        'gaps': accepted.get('gaps', []),
        'qualification': 'Frozen governance evaluated against this revision. This view cannot create or approve objectives.'
    }
    if graph is not None and optimizer is not None:
        document['holon_map'] = project_holon_map(view, accepted, graph, optimizer)
    if ontology is not None:
        from semantic_gate.objective_governance.ontology import project_results
        if (ontology['baseline_commit'] != view['baseline_commit']
                or ontology['governance_version'] != governance['version_id']):
            raise ValueError('Objective ontology revision/version mismatch')
        evaluation = project_results(ontology, diff, questions, judgments)
        results_by_id = {r['objective_id']: r for r in evaluation['objectives']}
        document['objective_ontology'] = {
            'schema': ontology['schema'], 'recipe': ontology['recipe'],
            'ontology_sha256': ontology['ontology_sha256'],
            'evidence_sha256': ontology['evidence_sha256'],
            'accepted_obligations': sum(len(a['obligations']) for a in ontology['objectives']),
            'proposed_obligations': sum(c['status'] == 'proposed' for c in ontology['candidates']),
            'gaps': ontology['gaps'], 'qualification': ontology['qualification']}
        document['objective_evaluation'] = evaluation
        scopes = {a['id']: a for a in ontology['objectives']}
        for area in document['business'] + document['architecture']:
            area['governance_result'] = results_by_id.get(area['id'])
            area['accepted_obligations'] = scopes[area['id']]['obligations']
        if 'holon_map' in document:
            for mapping in document['holon_map']['mappings']:
                scope = scopes[mapping['id']]['scope']
                mapping['scope_method_ids'] = scope['method_ids']
                mapping['holon_ids'] = scope['intent_region_ids']
                mapping['relationship'] = 'Accepted objective scope → declared or accepted obligations → evidenced intent memberships'
    return document


def method_identity(value):
    return value.split('::')[-1].split(':')[0].replace('#', '.').rsplit('/', 1)[0]


def project_holon_map(view, accepted, graph, optimizer):
    if (graph.get('source_commit') != view['baseline_commit']
            or optimizer.get('baseline_commit') != view['baseline_commit']):
        raise ValueError('Holon mapping baseline mismatch')
    services = {key: node for key, node in graph['nodes'].items()
                if node.get('kind') == 'deployable_application'}
    methods, holons = {}, {}
    bindings = optimizer.get('constraints', {}).get('bindings', [])
    for binding in bindings:
        source = binding.get('source', {})
        mid = binding['cameron_method_capsule_id']
        service_ids = [sid for sid, node in services.items()
                       if any(source.get('path', '').startswith(root.rstrip('/') + '/')
                              for root in node.get('source_roots', []))]
        method = methods.setdefault(mid, {'id': mid, 'method': source.get('owner'),
            'file': source.get('path'), 'service_ids': service_ids, 'witness_ids': [], 'holon_ids': []})
        method['witness_ids'].append(binding['binding_id'])
        for rid in binding.get('cameron_intent_region_ids', []):
            method['holon_ids'].append(rid)
            holon = holons.setdefault(rid, {'id': rid, 'label': 'Unlabeled holon',
                'method_ids': [], 'service_ids': [], 'boundary_ids': []})
            holon['method_ids'].append(mid)
            holon['service_ids'].extend(service_ids)
            holon['boundary_ids'].append(binding['boundary_id'])
    for method in methods.values():
        method['witness_ids'] = sorted(set(method['witness_ids']))
        method['holon_ids'] = sorted(set(method['holon_ids']))
        changes = [s for s in view.get('intent_stories', [])
                   if method_identity(s.get('method', '')) == method_identity(method.get('method') or '')]
        method['changed'] = bool(changes)
        method['review_ids'] = [s['id'] for s in changes]
    for holon in holons.values():
        for field in ('method_ids', 'service_ids', 'boundary_ids'):
            holon[field] = sorted(set(holon[field]))
        holon['changed_method_ids'] = [mid for mid in holon['method_ids'] if methods[mid]['changed']]
    mappings = []
    for contract in accepted.get('contracts', []):
        mids = [mid for mid, node in methods.items()
                if method_identity(node.get('method') or '') == method_identity(contract.get('entry_method', ''))]
        mappings.append({'id': contract['id'], 'kind': 'business', 'method_ids': mids,
            'holon_ids': sorted({rid for mid in mids for rid in methods[mid]['holon_ids']}),
            'service_ids': sorted({sid for mid in mids for sid in methods[mid]['service_ids']}),
            'relationship': 'Contract entry method → frozen governance witnesses → constrained holon memberships'})
    for objective in accepted.get('objectives', []):
        anchors = [sid for sid in objective.get('anchors', []) if sid in services]
        mappings.append({'id': objective['id'], 'kind': objective.get('kind', 'architecture'), 'service_ids': anchors,
            'holon_ids': sorted(rid for rid, h in holons.items() if set(h['service_ids']) & set(anchors)),
            'method_ids': [], 'relationship': 'Accepted service anchors → witnessed methods → constrained holon memberships'})
    return {'application': {'id': graph['root_id'], 'label': 'FTGO application'},
        'services': [{'id': sid, 'label': node.get('declared_name', sid)} for sid, node in services.items()],
        'holons': list(holons.values()), 'methods': list(methods.values()), 'mappings': mappings,
        'qualification': 'Cells show service context of mapped witnesses. Shared intent areas may appear in multiple services. Dots are witnessed methods, not all code. Changed dots show recorded intent changes; membership alone does not prove downstream impact. Nested parent-holon links were not retained by this optimizer artifact.'}
