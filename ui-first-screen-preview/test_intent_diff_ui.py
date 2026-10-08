import json
from pathlib import Path
import subprocess
import unittest


ROOT = Path(__file__).resolve().parent


class IntentDiffUiTest(unittest.TestCase):
    def render(self):
        check = {
            "id": "intent_diff", "label": "Analyze intent differences", "state": "error",
            "detail": "1 boundary judgment requires human review", "judgments": [{
                "question_id": "question:1", "boundary_id": "FTGO-SAGA-PROTOCOL",
                "verdict": "review", "answer": "preserved", "confidence": "medium",
                "reason": "The provider choice did not meet the automatic decision threshold",
                "intent_region_ids": ["flow_holon:confirm"],
                "workflow_obligations": [{
                    "workflow_id": "cancel_order", "workflow_name": "Cancel an order",
                    "workflow_category": "Customer order lifecycle",
                    "obligation_id": "cancel.confirm", "objective_id": "cancel_order_confirms",
                    "statement": "Confirm ticket and order coherently.", "phase": "success",
                    "governance_status": "accepted", "witness_count": 4,
                    "intent_region_ids": ["flow_holon:confirm"],
                }],
            }],
        }
        script = (
            "const fs=require('fs');global.window={intentGovernanceAvailable:true};"
            f"eval(fs.readFileSync({json.dumps(str(ROOT / 'assets/semantic-review.js'))},'utf8'));"
            f"console.log(window.intentDiffCard({json.dumps(check)},'⇄','Intent differences',"
            "{error:'Error'}));"
        )
        return subprocess.run(["node", "-e", script], check=True, capture_output=True,
                              text=True).stdout

    def test_live_card_shows_workflow_obligation_region_and_review_state(self):
        html = self.render()
        self.assertIn("Review required", html)
        self.assertIn("Cancel an order", html)
        self.assertIn("cancel.confirm", html)
        self.assertIn("Confirm ticket and order coherently.", html)
        self.assertIn("flow_holon:confirm", html)
        self.assertIn("Open governed objectives", html)
        self.assertIn("Accepted governance", html)

    def test_canonical_page_uses_the_intent_renderer_and_governance_action(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("id==='intent_diff'&&typeof intentDiffCard==='function'", html)
        self.assertIn("if(b.dataset.intentGovernance){window.requestedGovernedWorkflow=", html)
        self.assertIn("Governed boundary questions", html)
        renderer = (ROOT / "assets/semantic-review.js").read_text(encoding="utf-8")
        self.assertIn("Accepted objective rules are evaluated by Governance-rule impact", renderer)


if __name__ == "__main__":
    unittest.main()
