"""Project recorded boundary facts into compact, source-backed review stories."""
import re


def method_key(value):
    return re.sub(r"/\d+$", "", (value or "").split("::")[-1].split(":")[0]).replace("#", ".")


def destinations(slots):
    values = []
    for write in slots.get('writes', []):
        match = re.fullmatch(r'(?:this\.)?([\w]+)=([\w.]+)', write)
        if match:
            values.append((match[1], match[2].split('.')[-1]))
    return values


def transition_context(old, new, seed_index):
    owner = old['owner'].split('#')[0]
    previous = set(destinations(old['slots']))
    current = set(destinations(new['slots']))
    connections = []
    for path, file in (seed_index or {}).get('files', {}).items():
        for fact in file.get('facts', []):
            if fact.get('form') != 'state_transition' or fact.get('owner') == old['owner']:
                continue
            if fact.get('owner', '').split('#')[0] != owner:
                continue
            slots = fact['slots']
            required = {(slots.get('guard'), value) for value in slots.get('allowed', [])}
            if not previous.intersection(required):
                continue
            connections.append({'method': fact['owner'], 'source': {'file': path, 'line': fact.get('line')},
                                'requires': slots.get('allowed', []), 'destinations': [v for _, v in destinations(slots)],
                                'returns': slots.get('returns', []), 'fact_id': fact['fact_id'],
                                'accepts_new_destination': bool(current.intersection(required))})
    return {'scope': owner.split('.')[-1], 'relationship': 'same entity, matching state guard',
            'connections': connections[:6], 'omitted': max(0, len(connections)-6),
            'qualification': 'State compatibility from recorded facts; execution order and runtime reachability are not established.'}


def project(view, impact, questions, judgments=(), seed_index=None):
    for field in ("baseline_commit", "head_commit"):
        if view.get(field) != impact.get(field) or view.get(field) != questions.get("run", {}).get(field):
            raise ValueError("Walkthrough evidence revision mismatch")
    if seed_index and seed_index.get('provenance', {}).get('commit') != view.get('head_commit'):
        raise ValueError('Walkthrough context revision mismatch')
    stories = []
    for change in impact.get("impacts", []):
        before = [f for f in change.get("removed_facts", []) if f.get("form") == "state_transition"]
        after = [f for f in change.get("added_facts", []) if f.get("form") == "state_transition"]
        for old in before:
            matches = [f for f in after if f.get("owner") == old.get("owner")]
            if len(matches) != 1:
                continue
            new = matches[0]
            packets = [p for p in questions.get("packets", []) if p.get("boundary_id") == change.get("boundary_id")
                       and old in p.get("request", {}).get("state", {}).get("evidence", {}).get("removed_facts", [])
                       and new in p.get("request", {}).get("state", {}).get("evidence", {}).get("added_facts", [])]
            if len(packets) != 1:
                continue
            packet = packets[0]
            state = packet["request"]["state"]
            judgment = next((j for j in judgments if j.get("question_id") == packet.get("question_id")
                             and j.get("evidence_sha256") == state["provenance"]["evidence_sha256"]), None)
            contracts = [f for f in view.get("flows", []) if f.get("change_kind") == "business_contract"
                         and method_key(f.get("method")) == method_key(old.get("owner"))]
            stories.append({"id": change["impact_id"] + ":" + old["fact_id"],
                            "boundary": change["boundary_id"], "method": old["owner"],
                            "before": old["slots"], "after": new["slots"],
                            "kind": "state_transition",
                            "system_context": transition_context(old, new, seed_index),
                            "source": {"file": (change.get("affected_paths") or [None])[0], "line": new.get("line")},
                            "objective": contracts[0]["title"] if len(contracts) == 1 else state["context"]["governance"]["invariant"],
                            "related_flow_ids": [f["id"] for f in contracts] + [change["impact_id"]],
                            "witness_ids": change.get("baseline_witness_ids", []),
                            "region_ids": change.get("intent_region_ids", []),
                            "fact_ids": [old["fact_id"], new["fact_id"]],
                            "judgment": judgment, "question_id": packet["question_id"],
                            "context_methods": change.get("cameron_envelope", {}).get("context", []),
                            "explanation_source": "Recorded boundary facts; deterministic display projection"})
    for change in impact.get('impacts', []):
        facts = [f for f in change.get('added_facts', []) if f.get('form') == 'candidate_deployable_boundary']
        for fact in facts:
            slots = fact['slots']
            stories.append({'id': change['impact_id'], 'kind': 'new_boundary', 'boundary': change['boundary_id'],
                            'root': slots['root'], 'source': {'file': slots['descriptor'], 'line': None},
                            'changed_files': slots.get('changed_files'),
                            'objective': 'Establish how this new build root belongs within the accepted architecture.',
                            'related_flow_ids': [change['impact_id']], 'fact_ids': [fact['fact_id']],
                            'witness_ids': change.get('baseline_witness_ids', []), 'region_ids': change.get('intent_region_ids', []),
                            'judgment': None, 'context_methods': [],
                            'system_context': {'scope': 'Repository architecture', 'connections': [],
                                               'qualification': 'A build descriptor establishes a candidate boundary; runtime deployment and service relationships are not established.'}})
    return stories


if __name__ == '__main__':
    import argparse
    import json
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('backend', type=Path)
    parser.add_argument('--response', type=Path)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    read = lambda path: json.loads(path.read_text())
    view_path = args.backend / 'intent-flow.json'
    view = read(view_path)
    judgments = []
    if args.response:
        body = json.loads(read(args.response)['body'])
        judgments = next(c for c in body['checks'] if c['id'] == 'intent_diff').get('output', {}).get('judgments', [])
    view['intent_stories'] = project(view, read(args.backend / 'context/boundary-impact.json'),
                                     read(args.backend / 'context/contextual-questions.json'), judgments,
                                     read(args.backend / 'context/seed-index.json'))
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from governance_view import project_governance
    ontology_path = args.backend / 'objective-governance/objective-ontology.json'
    ontology = read(ontology_path) if ontology_path.is_file() else None
    view['governed_objectives'] = project_governance(view,
        read(args.backend / 'native/governance-version.json'), read(args.backend / 'native/diff.json'),
        read(args.baseline / 'native/graph.json') if args.baseline else None,
        read(args.baseline / 'optimizer.json') if args.baseline else None,
        ontology=ontology, questions=read(args.backend / 'context/contextual-questions.json'), judgments=judgments)
    if ontology is not None:
        from semantic_gate.objective_governance.candidate_impact import project as project_candidate_impact
        candidate_impact = project_candidate_impact(ontology, read(args.backend / 'context/boundary-impact.json'))
        candidate_path = view_path.with_name('intent-flow.candidate-impact.json')
        candidate_raw = json.dumps(candidate_impact, separators=(',', ':')).encode()
        if len(candidate_raw) > 262144:
            raise ValueError('Candidate-impact artifact exceeds 256 KiB')
        candidate_path.write_bytes(candidate_raw)
        import hashlib
        view['governed_objectives']['candidate_impact_artifact'] = {
            'url': candidate_path.name, 'sha256': hashlib.sha256(candidate_raw).hexdigest()}
        workflow_path = args.backend / 'objective-governance/customer-workflows.json'
        if not workflow_path.is_file() and args.baseline:
            workflow_path = args.baseline / 'objective-governance/customer-workflows.json'
        if workflow_path.is_file():
            from semantic_gate.objective_governance.workflow_impact import project as project_workflow_impact
            from semantic_gate.objective_governance.workflow_promotion import load_graphs
            candidate_l0 = args.backend / 'native/l0'
            workflow_impact = project_workflow_impact(
                read(workflow_path), candidate_impact,
                load_graphs(candidate_l0) if candidate_l0.is_dir() else None,
                read(args.backend / 'context/seed-index.json'))
            workflow_output = view_path.with_name('intent-flow.customer-workflows.json')
            workflow_raw = json.dumps(workflow_impact, separators=(',', ':')).encode()
            if len(workflow_raw) > 262144:
                raise ValueError('Customer-workflow artifact exceeds 256 KiB')
            workflow_output.write_bytes(workflow_raw)
            view['governed_objectives']['customer_workflow_artifact'] = {
                'url': workflow_output.name, 'sha256': hashlib.sha256(workflow_raw).hexdigest()}
    holon_map = view['governed_objectives'].pop('holon_map', None)
    if args.baseline:
        from territory_view import project_territory
        import hashlib
        terrain = project_territory(read(args.baseline / 'native/graph.json'), view['baseline_commit'])
        terrain_raw = json.dumps(terrain, separators=(',', ':')).encode()
        if len(terrain_raw) > 262144:
            raise ValueError('Territory artifact exceeds 256 KiB')
        terrain_path = view_path.with_name('intent-flow.territory.json')
        terrain_path.write_bytes(terrain_raw)
        view['governed_objectives']['territory_artifact'] = {
            'url': terrain_path.name, 'sha256': hashlib.sha256(terrain_raw).hexdigest()}
    if holon_map is not None:
        mapping = {'schema': 'governance-holon-map-v1',
                   'baseline_commit': view['baseline_commit'], 'head_commit': view['head_commit'],
                   'governance_digest': view['governed_objectives']['governance_digest'],
                   'holon_map': holon_map}
        mapping_path = view_path.with_name('intent-flow.governance.json')
        mapping_raw = json.dumps(mapping, separators=(',', ':')).encode()
        mapping_path.write_bytes(mapping_raw)
        import hashlib
        view['governed_objectives']['holon_map_artifact'] = {
            'url': mapping_path.name, 'sha256': hashlib.sha256(mapping_raw).hexdigest()}
    view_path.write_text(json.dumps(view, indent=2) + '\n')
