import importlib.util
import json
import hashlib
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = Path(__file__).with_name("intent_flow_data.py")
SPEC = importlib.util.spec_from_file_location("intent_flow_data", MODULE_PATH)
intent_flow_data = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(intent_flow_data)


class IntentFlowDataTests(unittest.TestCase):
    def packet_with_projection_size(self, episodes: int, reason_length: int) -> dict:
        return {
            "schema": "intent-tiles-v1",
            "baseline_commit": "baseline", "head_commit": "head",
            "episodes": [{
                "id": f"episode-{index}", "title": f"Change {index}",
                "source_change_kind": "context_changed",
                "source_anchor": {"file": f"src/Change{index}.java", "status": "file"},
                "label_evidence": [{"unit_id": f"unit-{index}", "concept": "revision",
                                    "status": "recorded", "evidence_sha256": f"{index:064x}"}],
                "observed_deltas": [{"kind": "value", "fields": {"quantity": {
                    "before": index, "after": index + 1}}}],
                "potential_impact": [{"id": f"impact-{index}-{n}",
                    "reason": f"evidence-{index}-{n}-" + ("x" * reason_length)}
                    for n in range(3)],
                "new_policy_findings": [{"domain": "test", "severity": "gap",
                    "reason": f"finding-{index}", "subject": f"subject-{index}"}],
                "behavior_judgment": {"status": "unknown"},
                "review_action": "inspect",
            } for index in range(episodes)],
        }

    def test_cli_preserves_all_rows_and_evidence_in_valid_380_kib_view(self):
        packet = self.packet_with_projection_size(71, 1450)
        with tempfile.TemporaryDirectory() as temporary:
            packet_path = Path(temporary) / "packet.json"
            output = Path(temporary) / "intent-flow.json"
            packet_path.write_text(json.dumps(packet), encoding="utf-8")
            subprocess.run([sys.executable, str(MODULE_PATH), str(packet_path), str(output)],
                           check=True, capture_output=True, text=True)
            view = json.loads(output.read_text(encoding="utf-8"))
            self.assertGreater(output.stat().st_size, 350 * 1024)
            self.assertLess(output.stat().st_size, 512 * 1024)
            self.assertEqual(71, len(view["flows"]))
            self.assertEqual(71, len(view["graph"]["nodes"]) // 2)
            self.assertEqual(71, sum(len(flow["concepts"]) for flow in view["flows"]))
            self.assertEqual(213, sum(len(flow["potential_impact"]) for flow in view["flows"]))
            self.assertEqual(71, sum(len(flow["observed_deltas"]) for flow in view["flows"]))
            self.assertEqual(71, sum(len(flow["findings"]) for flow in view["flows"]))
            for index, flow in enumerate(view["flows"]):
                self.assertEqual(f"episode-{index}", flow["id"])
                self.assertEqual(f"unit-{index}", flow["concepts"][0]["unit_id"])
                self.assertEqual(3, len(flow["potential_impact"]))
                self.assertTrue(flow["potential_impact"][2]["reason"].startswith(
                    f"evidence-{index}-2-"))
                self.assertEqual(index + 1, flow["observed_deltas"][0]["fields"]["quantity"]["after"])
                self.assertEqual(f"subject-{index}", flow["findings"][0]["subject"])

    def test_cli_rejects_projection_over_1_mib_without_output(self):
        packet = self.packet_with_projection_size(80, 5000)
        with tempfile.TemporaryDirectory() as temporary:
            packet_path = Path(temporary) / "packet.json"
            output = Path(temporary) / "intent-flow.json"
            packet_path.write_text(json.dumps(packet), encoding="utf-8")
            result = subprocess.run([sys.executable, str(MODULE_PATH), str(packet_path), str(output)],
                                    check=False, capture_output=True, text=True)
            self.assertNotEqual(0, result.returncode)
            self.assertIn("view exceeds 1 MiB", result.stderr)
            self.assertFalse(output.exists())

    def test_incremental_review_retains_its_256_kib_budget(self):
        sys.path.insert(0, str(MODULE_PATH.parent))
        try:
            import incremental_review_data
            self.assertEqual(256 * 1024, incremental_review_data.MAX_VIEW_BYTES)
        finally:
            sys.path.remove(str(MODULE_PATH.parent))

    def test_large_preserved_packet_projects_under_cap_without_losing_evidence(self):
        packet_path = ROOT / "data/governed-agent-loop/runs/c6210de6656841c49a12016be69c3d07/backend/review/intent_review_packet.json"
        if not packet_path.exists():
            self.skipTest("preserved large checkpoint packet is not present")
        packet = json.loads(packet_path.read_text(encoding="utf-8"))
        packet_digest = hashlib.sha256(packet_path.read_bytes()).hexdigest()
        view = intent_flow_data.project(packet, {
            "url": "review/intent_review_packet.json", "sha256": packet_digest,
            "episodes_pointer": "/episodes", "status": "supplied",
        })
        encoded = (json.dumps(view, separators=(",", ":"), ensure_ascii=False) + "\n").encode()

        self.assertEqual(len(packet["episodes"]), len(view["flows"]))
        self.assertEqual(sum(len(e.get("new_policy_findings", [])) for e in packet["episodes"]),
                         sum(len(f["findings"]) for f in view["flows"]))
        self.assertEqual(sum(len(e.get("observed_deltas", [])) for e in packet["episodes"]),
                         sum(len(f["observed_deltas"]) for f in view["flows"]))
        self.assertEqual(sum(len(e.get("potential_impact", [])) for e in packet["episodes"]),
                         sum(len(f["potential_impact"]) for f in view["flows"]))
        self.assertEqual(packet_digest, view["source_packet"]["sha256"])
        self.assertEqual("/episodes", view["source_packet"]["episodes_pointer"])
        self.assertTrue(all(edge["kind"] == "source_of_change" for edge in view["graph"]["edges"]))
        self.assertLessEqual(len(encoded), intent_flow_data.MAX_VIEW_BYTES)

    def test_cli_records_packet_reference_and_writes_compact_view(self):
        packet_path = ROOT / "data/governed-agent-loop/runs/c6210de6656841c49a12016be69c3d07/backend/review/intent_review_packet.json"
        if not packet_path.exists():
            self.skipTest("preserved large checkpoint packet is not present")
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "intent-flow.json"
            import subprocess
            import sys
            subprocess.run([sys.executable, str(MODULE_PATH), str(packet_path), str(output)], check=True)
            view = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(hashlib.sha256(packet_path.read_bytes()).hexdigest(), view["source_packet"]["sha256"])
            self.assertLessEqual(output.stat().st_size, intent_flow_data.MAX_VIEW_BYTES)


if __name__ == "__main__":
    unittest.main()
