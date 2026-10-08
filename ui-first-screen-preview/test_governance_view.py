import unittest
from governance_view import project_governance, project_holon_map


class GovernanceViewTest(unittest.TestCase):
    def test_missing_evidence_is_not_reclassified_as_violation(self):
        view = {'baseline_commit': 'base', 'head_commit': 'head'}
        governance = {'source_commit': 'base', 'version_id': 'v1', 'objectives': {
            'contracts': [{'id': 'pending', 'statement': 'Preserve pending state.'}],
            'objectives': [{'id': 'architecture', 'policy': 'preserve_deployable_architecture'}]}}
        diff = {'baseline_commit': 'base', 'head_commit': 'head', 'governance_version_id': 'v1',
                'business_contracts': {'rows': [{'id': 'pending', 'status': 'evidence_unavailable'}]},
                'architecture_changes': {'changes': [], 'observed_services': 8}}
        result = project_governance(view, governance, diff)
        self.assertEqual(result['business'][0]['result']['status'], 'evidence_unavailable')
        self.assertEqual(result['architecture'][0]['observation']['changes'], [])
        diff['governance_version_id'] = 'different'
        with self.assertRaises(ValueError):
            project_governance(view, governance, diff)

    def test_no_result_stays_unassessed(self):
        result = project_governance({'baseline_commit': 'b', 'head_commit': 'h'},
            {'source_commit': 'b', 'version_id': 'v', 'objectives': {'contracts': [{'id': 'x'}]}},
            {'baseline_commit': 'b', 'head_commit': 'h', 'governance_version_id': 'v'})
        self.assertIsNone(result['business'][0]['result'])

    def test_shared_holon_keeps_recorded_memberships_and_change_identity(self):
        view = {'baseline_commit': 'b', 'head_commit': 'h', 'intent_stories': [
            {'id': 'change', 'method': 'Order#cancel/0'}]}
        accepted = {'contracts': [{'id': 'pending', 'entry_method': 'Order.cancel'}],
                    'objectives': [{'id': 'architecture', 'anchors': ['orders']}]}
        graph = {'source_commit': 'b', 'root_id': 'app', 'nodes': {
            'orders': {'kind': 'deployable_application', 'source_roots': ['orders']},
            'other': {'kind': 'deployable_application', 'source_roots': ['other']}}}
        optimizer = {'baseline_commit': 'b', 'constraints': {'bindings': [
            {'binding_id': 'w1', 'boundary_id': 'a', 'cameron_method_capsule_id': 'm1',
             'source': {'owner': 'Order#cancel/0', 'path': 'orders/Order.java'},
             'cameron_intent_region_ids': ['shared']},
            {'binding_id': 'w2', 'boundary_id': 'b', 'cameron_method_capsule_id': 'm2',
             'source': {'owner': 'Other#cancel/0', 'path': 'other/Other.java'},
             'cameron_intent_region_ids': ['shared']}]}}
        result = project_holon_map(view, accepted, graph, optimizer)
        self.assertEqual(result['holons'][0]['service_ids'], ['orders', 'other'])
        self.assertEqual(result['holons'][0]['changed_method_ids'], ['m1'])
        self.assertEqual(result['mappings'][0]['method_ids'], ['m1'])
        self.assertEqual(result['mappings'][0]['holon_ids'], ['shared'])
        self.assertEqual(result['mappings'][1]['holon_ids'], ['shared'])
        self.assertFalse(result['methods'][1]['changed'])
        graph['source_commit'] = 'stale'
        with self.assertRaises(ValueError):
            project_holon_map(view, accepted, graph, optimizer)

    def test_objective_lane_projects_scopes_and_exact_accepted_rule_rollup(self):
        from semantic_gate.objective_governance.test_ontology import fixture, assessed, diff, judged
        from semantic_gate.objective_governance.ontology import regenerate, digest
        inputs = fixture(); inputs['graph']['root_id'] = 'app'
        c, decision, capture = assessed(inputs)
        inputs['governance']['objectives']['intent_bindings'] = [{
            'candidate_id': c['id'], 'candidate_sha256': c['candidate_sha256'], 'assessment_sha256': digest(decision)}]
        ontology = regenerate(**inputs, assessments=capture)
        questions, judgments = judged()
        document = project_governance({'baseline_commit': 'base', 'head_commit': 'head'},
            inputs['governance'], diff(), inputs['graph'], inputs['optimizer'], ontology, questions, judgments)
        self.assertEqual(document['business'][0]['governance_result']['status'], 'violated')
        self.assertEqual(document['business'][0]['result']['status'], 'satisfied')
        self.assertEqual(document['architecture'][0]['governance_result']['status'], 'satisfied')
        self.assertEqual(document['holon_map']['mappings'][0]['scope_method_ids'], ['m'])
        self.assertEqual(document['objective_ontology']['accepted_obligations'], 3)
        self.assertEqual(document['objective_ontology']['proposed_obligations'], 1)



if __name__ == '__main__':
    unittest.main()
