import json
from pathlib import Path
import re
import subprocess
import unittest


INDEX = Path(__file__).with_name("index.html")


class CodingSeverityUiTest(unittest.TestCase):
    def test_provider_labels_map_to_four_user_facing_levels(self):
        html = INDEX.read_text(encoding="utf-8")
        match = re.search(
            r"(function codingSeverity\(value\)\{.*?\})\nfunction outcome",
            html,
        )
        self.assertIsNotNone(match)
        script = match.group(1) + "\nconsole.log(JSON.stringify([\n" + (
            "'trivial','low','medium','high','severe','critical'"
        ) + "].map(value => codingSeverity(value).label)));"
        result = subprocess.run(
            ["node", "-e", script],
            check=True,
            capture_output=True,
            text=True,
        )
        self.assertEqual(
            ["Small", "Small", "Moderate", "Broad", "Broad", "Extensive"],
            json.loads(result.stdout),
        )
        for css_class in ("scope-small", "scope-moderate", "scope-broad", "scope-extensive"):
            self.assertIn(f".pill.{css_class}", html)

    def test_severity_stage_does_not_render_pipeline_pass_fail_as_severity(self):
        html = INDEX.read_text(encoding="utf-8")
        self.assertIn("const severityStage=check.id==='severity'", html)
        self.assertIn("severityStage?`<span", html)
        self.assertIn("Change scope: ${esc(coding.label)}", html)

    def test_severity_check_uses_customer_facing_scope_name(self):
        script = INDEX.with_name("assets").joinpath("review-ui.js").read_text(encoding="utf-8")
        self.assertIn("severity:'Assess change scope'", script)


if __name__ == "__main__":
    unittest.main()
