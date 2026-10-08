import copy
import unittest
from intent_walkthrough import project


class WalkthroughTest(unittest.TestCase):
    def setUp(self):
        self.view = {'baseline_commit': 'base', 'head_commit': 'head', 'flows': [
            {'id': 'contract:payment', 'change_kind': 'business_contract',
             'method': 'payments.Payment.authorize:void()', 'title': 'Authorization must remain pending.'}]}
        old = {'fact_id': 'old', 'form': 'state_transition', 'owner': 'payments.Payment#authorize/0',
               'slots': {'allowed': ['NEW'], 'writes': ['state=PENDING']}}
        new = {**old, 'fact_id': 'new', 'slots': {'allowed': ['NEW'], 'writes': ['state=AUTHORIZED']}}
        self.impact = {**self.view, 'impacts': [{'impact_id': 'impact', 'boundary_id': 'payment',
            'removed_facts': [old], 'added_facts': [new], 'affected_paths': ['Payment.java']}]}
        self.questions = {'run': {'baseline_commit': 'base', 'head_commit': 'head'}, 'packets': [
            {'question_id': 'question', 'boundary_id': 'payment', 'request': {'state': {
                'evidence': {'removed_facts': [old], 'added_facts': [new]},
                'context': {'governance': {'invariant': 'payment invariant'}},
                'provenance': {'evidence_sha256': 'digest'}}}}]}

    def test_projects_other_domain_without_cancellation_templates(self):
        story = project(self.view, self.impact, self.questions)[0]
        self.assertEqual('Authorization must remain pending.', story['objective'])
        self.assertEqual(['state=AUTHORIZED'], story['after']['writes'])
        self.assertEqual(['contract:payment', 'impact'], story['related_flow_ids'])
        self.assertIsNone(story['judgment'])

    def test_rejects_stale_revision(self):
        changed = copy.deepcopy(self.questions)
        changed['run']['head_commit'] = 'other'
        with self.assertRaises(ValueError):
            project(self.view, self.impact, changed)

    def test_does_not_attach_judgment_for_different_evidence(self):
        judgment = {'question_id': 'question', 'evidence_sha256': 'different', 'choice': 'violated'}
        self.assertIsNone(project(self.view, self.impact, self.questions, [judgment])[0]['judgment'])
        judgment['evidence_sha256'] = 'digest'
        self.assertEqual(judgment, project(self.view, self.impact, self.questions, [judgment])[0]['judgment'])

    def test_requires_matching_question_facts(self):
        changed = copy.deepcopy(self.questions)
        changed['packets'][0]['request']['state']['evidence']['added_facts'] = []
        self.assertEqual([], project(self.view, self.impact, changed))

    def test_context_matches_entity_and_state_not_method_name(self):
        def fact(owner, allowed):
            return {'fact_id': owner, 'form': 'state_transition', 'owner': owner,
                    'slots': {'guard': 'state', 'allowed': [allowed], 'writes': ['state=DONE']}}
        seed = {'provenance': {'commit': 'head'}, 'files': {'Payment.java': {'facts': [
            fact('payments.Payment#finish/0', 'PENDING'),
            fact('payments.Payment#unrelated/0', 'OTHER'),
            fact('shipping.Package#finish/0', 'PENDING')]}}}
        context = project(self.view, self.impact, self.questions, seed_index=seed)[0]['system_context']
        self.assertEqual(1, len(context['connections']))
        self.assertEqual('payments.Payment#finish/0', context['connections'][0]['method'])
        self.assertFalse(context['connections'][0]['accepts_new_destination'])
        seed['provenance']['commit'] = 'stale'
        with self.assertRaises(ValueError):
            project(self.view, self.impact, self.questions, seed_index=seed)


if __name__ == '__main__':
    unittest.main()
