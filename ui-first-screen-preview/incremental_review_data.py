"""Project constrained incremental-context artifacts into the shared Review UI.

This is a lossless presentation adapter over already-produced evidence. It does
not rerun analysis, infer a boundary, or call a model.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from intent_flow_data import MAX_PATCH_BYTES

# Incremental review has its own established 256 KiB view budget. Do not
# inherit the larger limit for the full intent-flow packet projection.
MAX_VIEW_BYTES = 256 * 1024


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _fact_text(fact: dict) -> str:
    return f"{fact['form']} " + json.dumps(
        fact.get("slots", {}), sort_keys=True, separators=(",", ":"))


def _fact_source_anchors(row: dict, base: str, head: str) -> dict:
    """Preserve parser locations separately from an expanded logical owner.

    The parser's line can be inside a helper that contributed a fact to another
    method. A viewer/consumer must not treat the logical owner as that physical
    method. Multiple affected paths without per-fact paths cannot locate a fact.
    """
    paths = row.get("affected_paths") or []
    result = {"before": [], "after": []}
    if len(paths) != 1 or not isinstance(paths[0], str) or not paths[0]:
        return result
    for side, key, revision in (("before", "removed_facts", base),
                                ("after", "added_facts", head)):
        for fact in row.get(key, []):
            line = fact.get("line")
            if (type(line) is not int or line < 1
                    or not isinstance(fact.get("fact_id"), str) or not fact["fact_id"]):
                continue
            result[side].append({"fact_id": fact["fact_id"], "file": paths[0],
                "line": line, "revision": revision, "logical_owner": fact.get("owner"),
                "form": fact.get("form")})
    return result


def _judgments(path: Path | None) -> dict[str, dict]:
    if not path or not path.is_file():
        return {}
    document = _read(path)
    if document.get("schema") != "contextual-boundary-judgments-v1":
        raise ValueError("unsupported contextual judgment artifact")
    return {row["boundary_id"]: row for row in document["rows"]}


def _case(evaluation: dict | None, pr: int | None) -> dict | None:
    if not evaluation or pr is None:
        return None
    return next((row for row in evaluation.get("cases", []) if row.get("pr") == pr), None)


def project(artifact_dir: Path, *, judgment_path: Path | None = None,
            evaluation: dict | None = None, pr: int | None = None) -> dict:
    impact = _read(artifact_dir / "boundary-impact.json")
    questions = _read(artifact_dir / "contextual-questions.json")
    invalidation = _read(artifact_dir / "seed-invalidation.json")
    if (impact.get("schema") != "incremental-boundary-impact-v1"
            or questions.get("schema") != "contextual-boundary-questions-v1"):
        raise ValueError("unsupported incremental-context artifacts")
    judgments = _judgments(judgment_path)
    flows, nodes, edges = [], {}, []
    for row in impact["impacts"]:
        flow_id = row["impact_id"]
        episode_id = "episode:" + flow_id
        before = [_fact_text(fact) for fact in row["removed_facts"]]
        after = [_fact_text(fact) for fact in row["added_facts"]]
        source_file = (row.get("affected_paths") or [None])[0]
        source = {"file": source_file, "status": "file_anchor"} if source_file else {
            "status": "not_supplied", "reason": "No changed source path was supplied"}
        judgment = judgments.get(row["boundary_id"])
        behavior = None if judgment is None else {
            "choice": judgment["choice"], "status": judgment["status"],
            "probabilities": judgment.get("probabilities"), "model": judgment.get("model"),
            "request_sha256": judgment.get("request_sha256"),
            "response_sha256": judgment.get("response_sha256"),
        }
        findings = []
        mapping_gap = bool(row.get("optimizer_mapping_gap"))
        if mapping_gap:
            findings.append({"domain": "evidence_coverage", "severity": "gap",
                             "reason": row.get("gap_reason", "governance_constrained_region_unmapped"),
                             "subject": row["boundary_id"]})
        elif judgment and judgment["status"] == "supported_boundary_violation":
            findings.append({"domain": "governed_boundary", "severity": "block",
                             "reason": "governed_boundary_violation",
                             "subject": row["boundary_id"]})
        elif judgment and judgment["status"] == "human_review":
            findings.append({"domain": "governed_boundary", "severity": "gap",
                             "reason": "boundary_judgment_uncertain",
                             "subject": row["boundary_id"]})
        elif judgment is None:
            findings.append({"domain": "governed_boundary", "severity": "gap",
                             "reason": "judgment_not_supplied",
                             "subject": row["boundary_id"]})
        regions = row.get("intent_region_ids") or []
        potential = [{"id": region, "concept": region,
                      "kind": "governance_constrained_region",
                      "reason": row.get("region_reason",
                                        "Boundary witness retained in the constrained Cameron envelope")}
                     for region in regions]
        flows.append({
            "id": flow_id, "title": row["boundary_id"],
            "change_kind": ("boundary_evidence_gap" if mapping_gap
                            else "governed_boundary_change"), "source": source,
            "method": (row["removed_facts"] or row["added_facts"])[0].get("owner"),
            "concepts": [{"unit_id": region, "concept": row["boundary_id"],
                          "status": "governance_constrained"} for region in regions],
            "observed_deltas": [{"kind": "normalized_boundary_fact",
                                  "fields": {"fact": {"before": before or None,
                                                       "after": after or None}}}],
            "potential_impact": potential, "behavior_judgment": behavior,
            "findings": findings, "review_action": "review_governed_boundary",
            "fact_source_anchors": _fact_source_anchors(
                row, impact["baseline_commit"], impact["head_commit"]),
        })
        nodes[episode_id] = {"id": episode_id, "kind": "change", "label": row["boundary_id"],
                             "flow_id": flow_id, "before": " · ".join(before) or "Fact absent",
                             "after": " · ".join(after) or "Fact absent",
                             "change_kind": ("boundary_evidence_gap" if mapping_gap
                                             else "governed_boundary_change")}
        if source_file:
            source_id = "source:" + source_file
            nodes.setdefault(source_id, {"id": source_id, "kind": "source",
                                         "label": source_file, "anchor_status": "file_anchor"})
            edges.append({"from": source_id, "to": episode_id, "kind": "source_of_change"})
        for item in potential:
            scope_id = "scope:" + item["id"]
            nodes.setdefault(scope_id, {"id": scope_id, "kind": "scope",
                                        "label": item["concept"], "scope_kind": item["kind"]})
            edges.append({"from": episode_id, "to": scope_id, "kind": "potential_impact",
                          "reason": item["reason"]})

    benchmark = _case(evaluation, pr)
    if (benchmark and not benchmark.get("correct")
            and benchmark.get("expected") == "BOUNDARY_CHANGE" and not flows):
        flow_id = f"benchmark-miss-pr{pr}"
        source_file = (invalidation.get("changed_files") or [None])[0]
        source = {"file": source_file, "status": "file_anchor"} if source_file else {
            "status": "not_supplied"}
        finding = {"domain": "evaluation_coverage", "severity": "gap",
                   "reason": "expected_boundary_not_selected", "subject": f"PR #{pr}"}
        flows.append({
            "id": flow_id, "title": "Expected governed change was not selected",
            "change_kind": "benchmark_miss", "source": source, "method": None,
            "concepts": [], "observed_deltas": [], "potential_impact": [],
            "behavior_judgment": {"status": "selector_false_negative"},
            "findings": [finding], "review_action": "improve_selector",
        })
        episode_id = "episode:" + flow_id
        nodes[episode_id] = {"id": episode_id, "kind": "change", "label": finding["reason"],
                             "flow_id": flow_id, "before": benchmark["expected"],
                             "after": benchmark["observed"], "change_kind": "benchmark_miss"}
        if source_file:
            source_id = "source:" + source_file
            nodes[source_id] = {"id": source_id, "kind": "source", "label": source_file,
                                "anchor_status": "file_anchor"}
            edges.append({"from": source_id, "to": episode_id, "kind": "source_of_change"})

    optimizer = questions.get("run", {}).get("governance_optimizer")
    return {
        "schema": "intent-flow-view-v1",
        "baseline_commit": impact["baseline_commit"], "head_commit": impact["head_commit"],
        "backend_verdict": impact["classification"],
        "provenance": {"producer": questions.get("producer"),
                       "governance_optimizer": optimizer,
                       "benchmark_pr": pr},
        "qualification": (
            "Generated from governance-constrained incremental artifacts. Graph edges are recorded "
            "evidence links, not runtime proof. Benchmark-miss tiles are evaluation evidence, not "
            "pipeline findings."),
        "flows": flows,
        "graph": {"nodes": list(nodes.values()), "edges": edges,
                  "qualification": "Source changes connect to selected boundaries and their constrained Cameron regions."},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact_dir", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--judgments", type=Path)
    parser.add_argument("--evaluation", type=Path)
    parser.add_argument("--pr", type=int)
    parser.add_argument("--source-patch", type=Path)
    args = parser.parse_args()
    evaluation = _read(args.evaluation) if args.evaluation else None
    view = project(args.artifact_dir, judgment_path=args.judgments,
                   evaluation=evaluation, pr=args.pr)
    patch = None
    if args.source_patch:
        patch = args.source_patch.read_bytes()
        if len(patch) > MAX_PATCH_BYTES:
            parser.error("source patch exceeds 256 KiB; publish separately rather than truncating")
        patch.decode("utf-8")
        view["source_diff"] = {"url": args.output.with_suffix(".source.patch").name,
                               "sha256": hashlib.sha256(patch).hexdigest(),
                               "format": "unified_diff", "status": "supplied"}
    else:
        view["source_diff"] = {"status": "not_supplied"}
    encoded = (json.dumps(view, separators=(",", ":"), ensure_ascii=False) + "\n").encode()
    if len(encoded) > MAX_VIEW_BYTES:
        parser.error("view exceeds 256 KiB")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(encoded)
    if patch is not None:
        args.output.with_suffix(".source.patch").write_bytes(patch)


if __name__ == "__main__":
    main()
