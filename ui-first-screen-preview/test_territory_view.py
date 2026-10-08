import unittest
from territory_view import project_territory


class TerritoryTest(unittest.TestCase):
    def graph(self):
        return {'source_commit': 'base', 'nodes': {
            's': {'id': 's', 'kind': 'deployable_application', 'source_roots': ['src'], 'declared_name': 'Service'},
            'a': {'id': 'a', 'kind': 'method_capsule', 'file': 'src/A.java', 'method': 'src/A.java::A.start:void(java.lang.String)'},
            'b': {'id': 'b', 'kind': 'method_capsule', 'file': 'src/A.java', 'method': 'src/A.java::A.finish:void()'},
            'h': {'id': 'h', 'kind': 'flow_composite_holon', 'method_capsules': ['b', 'a']}},
            'relationships': [
                {'kind': 'resolved_call', 'source_method': 'src/A.java::A.start:void(java.lang.String)', 'target_method': 'src/A.java::A.finish:void()'},
                {'kind': 'cpg_relation', 'edge_type': 'CFG', 'source_method': 'src/A.java::A.start:void(java.lang.String)'}]}

    def test_layout_keeps_all_methods_calls_and_control_flow(self):
        result = project_territory(self.graph(), 'base')
        self.assertEqual([m[0] for m in result['methods']], ['a', 'b'])
        self.assertEqual(result['calls'], [[0, 1]])
        self.assertEqual(result['methods'][0][6], 1)
        self.assertEqual(result['methods'][0][8], [0])
        self.assertEqual(result['argument_types'], ['java.lang.String'])
        self.assertEqual(result['columns'][-1], 'argument_type_ids')
        self.assertEqual(result['native_holons'], [['h', [0, 1]]])
        self.assertNotEqual(result['methods'][0][4:6], result['methods'][1][4:6])

    def test_order_does_not_change_layout_or_graph_identity(self):
        graph = self.graph()
        expected = project_territory(graph, 'base')
        graph['nodes'] = dict(reversed(list(graph['nodes'].items())))
        self.assertEqual(expected, project_territory(graph, 'base'))

    def test_stale_baseline_is_rejected(self):
        with self.assertRaises(ValueError):
            project_territory(self.graph(), 'other')
