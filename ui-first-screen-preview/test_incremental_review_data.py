import json
from pathlib import Path
import tempfile
import unittest

from incremental_review_data import project


class IncrementalReviewDataTests(unittest.TestCase):
    def artifacts(self, root: Path, *, impacts: list[dict]) -> Path:
        documents = {
            "boundary-impact.json": {
                "schema": "incremental-boundary-impact-v1", "baseline_commit": "base",
                "head_commit": "head", "classification": (
                    "BOUNDARY_CHANGE" if impacts else "NO_BOUNDARY_CHANGE"), "impacts": impacts,
            },
            "contextual-questions.json": {
                "schema": "contextual-boundary-questions-v1",
                "producer": {"name": "test", "version": "1"},
                "run": {"governance_optimizer": {"schema": "optimizer"}},
            },
            "seed-invalidation.json": {
                "schema": "incremental-seed-invalidation-v1", "changed_files": ["Demo.java"],
            },
        }
        for name, value in documents.items():
            (root / name).write_text(json.dumps(value))
        return root

    def test_projects_constrained_boundary_without_inventing_judgment(self):
        impact = {
            "impact_id": "impact:1", "boundary_id": "FTGO-TEST",
            "intent_region_id": "flow_holon:1", "intent_region_ids": ["flow_holon:1"],
            "optimizer_mapping_gap": False, "affected_paths": ["Demo.java"],
            "removed_facts": [{"form": "state_transition", "slots": {"writes": ["A"]},
                               "owner": "Demo#go/0"}],
            "added_facts": [{"form": "state_transition", "slots": {"writes": ["B"]},
                             "owner": "Demo#go/0"}],
        }
        with tempfile.TemporaryDirectory() as directory:
            view = project(self.artifacts(Path(directory), impacts=[impact]))
        flow = view["flows"][0]
        self.assertEqual("governed_boundary_change", flow["change_kind"])
        self.assertEqual("flow_holon:1", flow["concepts"][0]["unit_id"])
        self.assertIsNone(flow["behavior_judgment"])
        self.assertEqual("judgment_not_supplied", flow["findings"][0]["reason"])

    def test_labelled_false_negative_is_an_evaluation_gap(self):
        evaluation = {"cases": [{"pr": 23, "expected": "BOUNDARY_CHANGE",
                                  "observed": "NO_BOUNDARY_CHANGE", "correct": False}]}
        with tempfile.TemporaryDirectory() as directory:
            view = project(self.artifacts(Path(directory), impacts=[]),
                           evaluation=evaluation, pr=23)
        self.assertEqual("benchmark_miss", view["flows"][0]["change_kind"])
        self.assertEqual("expected_boundary_not_selected",
                         view["flows"][0]["findings"][0]["reason"])

    def test_expanded_fact_keeps_physical_line_and_logical_owner_distinct(self):
        impact = {"impact_id": "impact:helper", "boundary_id": "FTGO-TEST",
            "affected_paths": ["Demo.java"], "removed_facts": [],
            "added_facts": [{"fact_id": "fact:helper", "line": 51,
                "owner": "Demo#initialize/0", "form": "value_binding",
                "slots": {"slot": "reply", "value": "updated"}}]}
        with tempfile.TemporaryDirectory() as directory:
            view = project(self.artifacts(Path(directory), impacts=[impact]))
        flow = view['flows'][0]
        self.assertEqual(flow['method'], 'Demo#initialize/0')
        self.assertEqual(flow['fact_source_anchors'], {'before': [], 'after': [{
            'fact_id': 'fact:helper', 'file': 'Demo.java', 'line': 51,
            'revision': 'head', 'logical_owner': 'Demo#initialize/0', 'form': 'value_binding'}]})

    def test_unknown_paths_and_invalid_lines_do_not_invent_fact_locations(self):
        impact = {"impact_id": "impact:unknown", "boundary_id": "FTGO-TEST",
            "affected_paths": ["A.java", "B.java"], "removed_facts": [],
            "added_facts": [{"fact_id": "fact:unknown", "line": 4,
                "owner": "Demo#initialize/0", "form": "value_binding", "slots": {}}]}
        for paths, line in [(['A.java', 'B.java'], 4), (['A.java'], True),
                            (['A.java'], 0), (['A.java'], None)]:
            impact['affected_paths'] = paths
            impact['added_facts'][0]['line'] = line
            with self.subTest(paths=paths, line=line), tempfile.TemporaryDirectory() as directory:
                view = project(self.artifacts(Path(directory), impacts=[impact]))
            self.assertEqual(view['flows'][0]['fact_source_anchors'], {'before': [], 'after': []})


if __name__ == "__main__":
    unittest.main()
