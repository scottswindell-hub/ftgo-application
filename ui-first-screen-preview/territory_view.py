"""Deterministic method terrain from a pinned native graph; no inferred governance."""
from collections import Counter, defaultdict
import argparse
import hashlib
import json
import math
from pathlib import Path


def project_territory(graph, baseline_commit):
    if graph.get('source_commit') != baseline_commit:
        raise ValueError('Territory baseline mismatch')
    nodes = graph['nodes']
    methods = sorted((n for n in nodes.values() if n['kind'] == 'method_capsule'), key=lambda n: n['id'])
    services = sorted((n for n in nodes.values() if n['kind'] == 'deployable_application'), key=lambda n: n['id'])
    files = sorted({m['file'] for m in methods})
    file_index = {p: i for i, p in enumerate(files)}
    method_index = {m['id']: i for i, m in enumerate(methods)}
    owners = {m['method']: i for i, m in enumerate(methods)}
    holons = sorted((n for n in nodes.values() if n['kind'] == 'flow_composite_holon'), key=lambda n: n['id'])
    membership = defaultdict(list)
    for h in holons:
        for mid in h.get('method_capsules', []):
            membership[mid].append(h['id'])
    counts = defaultdict(Counter)
    calls = []
    for e in graph['relationships']:
        i = owners.get(e.get('source_method'))
        if i is None:
            continue
        if e['kind'] == 'cpg_relation':
            counts[i][e.get('edge_type')] += 1
        elif e['kind'] == 'resolved_call':
            j = owners.get(e.get('target_method'))
            if j is not None:
                calls.append([i, j])
    groups = defaultdict(list)
    for i, m in enumerate(methods):
        sid = next((j for j, s in enumerate(services) if any(m['file'].startswith(p.rstrip('/') + '/') for p in s.get('source_roots', []))), len(services))
        groups[sid].append(i)
    # A fixed hex lattice fills an ellipse. Angular slices allocate the recorded
    # service populations; native holon order keeps related method capsules near.
    points = []
    lattice = max(40, math.ceil(math.sqrt(len(methods))))
    for y in range(-lattice, lattice + 1):
        for x in range(-lattice, lattice + 1):
            px, py = (x + (y % 2) / 2) / lattice, y / lattice
            if px * px + py * py <= 1:
                points.append((px, py))
    points.sort(key=lambda p: (p[0]*p[0]+p[1]*p[1], p))
    points = points[:len(methods)]
    scale = max((math.hypot(*p) for p in points), default=1) or 1
    points.sort(key=lambda p: (math.atan2(p[1], p[0]), math.hypot(*p), p))
    rows = [None] * len(methods)
    argument_types = []
    argument_type_index = {}
    def method_argument_type_ids(signature):
        body = signature.rsplit('(', 1)[1][:-1] if '(' in signature and signature.endswith(')') else ''
        if not body:
            return []
        values, start, depth = [], 0, 0
        for index, char in enumerate(body):
            if char == '<':
                depth += 1
            elif char == '>':
                depth = max(0, depth - 1)
            elif char == ',' and depth == 0:
                values.append(body[start:index].strip())
                start = index + 1
        values.append(body[start:].strip())
        result = []
        for value in values:
            if value not in argument_type_index:
                argument_type_index[value] = len(argument_types)
                argument_types.append(value)
            result.append(argument_type_index[value])
        return result
    def place_clusters(clusters, positions):
        if len(clusters) == 1:
            return list(zip(clusters[0], sorted(positions, key=lambda p: (p[1], p[0]))))
        middle = len(clusters) // 2
        count = sum(len(c) for c in clusters[:middle])
        axis = max(range(2), key=lambda d: max(p[d] for p in positions) - min(p[d] for p in positions))
        ordered = sorted(positions, key=lambda p: (p[axis], p[1-axis]))
        return place_clusters(clusters[:middle], ordered[:count]) + place_clusters(clusters[middle:], ordered[count:])
    at = 0
    for sid, indices in sorted(groups.items()):
        positions = points[at:at+len(indices)]
        clusters = defaultdict(list)
        for i in indices:
            key = (membership[methods[i]['id']] or [methods[i]['file']])[0]
            clusters[key].append(i)
        for i, (x, y) in place_clusters([clusters[k] for k in sorted(clusters)], positions):
            m = methods[i]
            symbol = m['method'].split('::')[-1].split(':')[0].rsplit('.', 2)
            row = [m['id'], file_index[m['file']], '.'.join(symbol[-2:]), sid,
                   round(360 + x / scale * 320, 2), round(285 + y / scale * 245, 2),
                   counts[i]['CFG'], counts[i]['REACHING_DEF']]
            argument_ids = method_argument_type_ids(m['method'])
            if argument_ids:
                row.append(argument_ids)
            rows[i] = row
        at += len(indices)
    return {'schema': 'objective-terrain-v1', 'baseline_commit': baseline_commit,
            'layout_version': 'native-holon-terrain-1',
            'graph_sha256': hashlib.sha256(json.dumps(graph, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
            'columns': ['id', 'file_index', 'symbol', 'service_index', 'x', 'y', 'cfg_edges', 'data_flow_edges', 'argument_type_ids'],
            'argument_types': argument_types,
            'services': [[s['id'], s.get('deployment_name') or s.get('declared_name', s['id'])] for s in services] + [['unplaced', 'Other source']],
            'files': files, 'methods': rows, 'calls': sorted(calls),
            'native_holons': [[h['id'], sorted(method_index[m] for m in h.get('method_capsules', []) if m in method_index)] for h in holons],
            'relation_counts': dict(sorted(Counter(e.get('edge_type', e['kind']) for e in graph['relationships']).items())),
            'qualification': 'Positions group baseline service and native intent membership. Lines are resolved calls; control-flow and data-flow counts come from the pinned code structure analysis. Objective color comes only from frozen governance mappings, not call reachability. Position and distance have no runtime meaning.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("graph", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    graph = json.loads(args.graph.read_text(encoding="utf-8"))
    terrain = project_territory(graph, graph.get("source_commit"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(terrain, separators=(",", ":")) + "\n",
                           encoding="utf-8")


if __name__ == "__main__":
    main()
