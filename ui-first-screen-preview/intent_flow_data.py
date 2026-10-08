"""Project a completed intent review packet into bounded Intent Flow view data.

This is presentation work only: the packet is the source of truth. No graph walk,
policy execution, model call, or source parsing happens on the request path.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path

MAX_PACKET_BYTES = 8 * 1024 * 1024
# Keep in sync with the public-view encoder bound in scripts/local_pr_pipeline.py and the
# browser's packet-view.js limit. This projection preserves complete evidence;
# it must reject above the transport contract rather than truncate.
MAX_VIEW_BYTES = 1024 * 1024
MAX_PATCH_BYTES = 256 * 1024


def change_summary(episode):
    before, after = [], []
    for delta in episode.get("observed_deltas", []):
        fields = delta.get("fields", {})
        if "contract_status" in fields:
            before.append("contract " + str(fields["contract_status"].get("before")))
            after.append("contract " + str(fields["contract_status"].get("after")))
        if delta.get("kind") == "learned_form_occurrence" and fields.get("form_id", {}).get("before") and fields.get("form_id", {}).get("after") is None:
            before.append("recognized form")
            after.append("no matching form")
    kind = episode.get("source_change_kind")
    if not before and kind == "added":
        before, after = ["method absent"], ["new method; behavior not established"]
    if not before and kind == "context_changed":
        before, after = ["behavior not compared"], ["analysis context changed"]
    return " · ".join(before) or "Baseline facts not supplied", " · ".join(after) or "New facts not supplied"


def project(packet, packet_evidence=None):
    flows = []
    nodes = {}
    edges = []
    for episode in packet.get("episodes", []):
        episode_id = "episode:" + str(episode.get("id"))
        before, after = change_summary(episode)
        nodes[episode_id] = {
            "id": episode_id, "kind": "change", "label": episode.get("title"),
            "flow_id": episode.get("id"), "before": before, "after": after,
            "change_kind": episode.get("source_change_kind"),
        }
        anchor = episode.get("source_anchor") or {}
        if anchor.get("file"):
            source_id = "source:" + anchor["file"]
            nodes.setdefault(source_id, {
                "id": source_id, "kind": "source", "label": anchor["file"],
                "anchor_status": anchor.get("status"),
            })
            edges.append({"from": source_id, "to": episode_id, "kind": "source_of_change"})
        concepts = []
        seen = set()
        for item in episode.get("label_evidence", []):
            key = (item.get("unit_id"), item.get("concept"))
            if key not in seen:
                seen.add(key)
                concepts.append({
                    "unit_id": item.get("unit_id"),
                    "concept": item.get("concept"),
                    "status": item.get("status"),
                    "evidence_sha256": item.get("evidence_sha256"),
                })
        flows.append({
            "id": episode.get("id"),
            "title": episode.get("title"),
            "change_kind": episode.get("source_change_kind"),
            "source": episode.get("source_anchor"),
            "method": episode.get("method"),
            "concepts": concepts,
            "observed_deltas": episode.get("observed_deltas", []),
            "potential_impact": episode.get("potential_impact", []),
            "behavior_judgment": episode.get("behavior_judgment"),
            "findings": [
                {"domain": finding.get("domain"), "severity": finding.get("severity"),
                 "reason": finding.get("reason"), "subject": finding.get("subject")}
                for finding in episode.get("new_policy_findings", [])
            ],
            "review_action": episode.get("review_action"),
        })
    # The impact entries are already retained in each flow. Duplicating every
    # scope node and impact edge in this graph made large, valid reviews exceed
    # the view cap. Keep the graph as a compact source/change index; consumers
    # can follow each flow's potential_impact records for scope evidence.
    compact_nodes = []
    for node in nodes.values():
        if node["kind"] == "change":
            compact_nodes.append({
                "id": node["id"], "kind": "change", "flow_id": node["flow_id"],
                "change_kind": node["change_kind"],
            })
        elif node["kind"] == "source":
            compact_nodes.append({"id": node["id"], "kind": "source", "label": Path(node["label"]).name})
    result = {
        "schema": "intent-flow-view-v1",
        "baseline_commit": packet.get("baseline_commit"),
        "head_commit": packet.get("head_commit"),
        "backend_verdict": packet.get("backend_verdict"),
        "provenance": packet.get("provenance", {}),
        "qualification": packet.get("qualification"),
        "flows": flows,
        "graph": {
            "nodes": compact_nodes, "edges": edges,
            "qualification": "Edges link recorded source files to change episodes. Potential impact scope evidence is retained on each flow and is not repeated here. No edge claims execution, calls, or confirmed behavioral impact.",
        },
    }
    if packet_evidence:
        result["source_packet"] = packet_evidence
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("packet", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--source-patch", type=Path, help="optional source patch; defaults to source.patch beside the packet")
    args = parser.parse_args()
    if args.packet.stat().st_size > MAX_PACKET_BYTES:
        parser.error("packet exceeds 8 MiB; retain the full artifact and investigate size")
    packet_bytes = args.packet.read_bytes()
    packet = json.loads(packet_bytes.decode("utf-8"))
    if packet.get("schema") != "intent-tiles-v1":
        parser.error("expected intent-tiles-v1")
    view = project(packet, {
        "url": Path(os.path.relpath(args.packet, args.output.parent)).as_posix(),
        "sha256": hashlib.sha256(packet_bytes).hexdigest(),
        "episodes_pointer": "/episodes",
        "status": "supplied",
    })
    patch_path = args.source_patch or args.packet.parent / "source.patch"
    patch_bytes = None
    if patch_path.exists():
        if patch_path.stat().st_size > MAX_PATCH_BYTES:
            parser.error("source patch exceeds 256 KiB; publish separately rather than truncating")
        patch_bytes = patch_path.read_bytes()
        patch_bytes.decode("utf-8")
        view["source_diff"] = {"url": args.output.with_suffix(".source.patch").name,
                               "sha256": hashlib.sha256(patch_bytes).hexdigest(),
                               "format": "unified_diff", "status": "supplied"}
    else:
        view["source_diff"] = {"status": "not_supplied"}
    encoded = (json.dumps(view, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")
    if len(encoded) > MAX_VIEW_BYTES:
        parser.error("view exceeds 1 MiB; retain the full artifact and investigate size")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if patch_bytes is not None:
        args.output.with_suffix(".source.patch").write_bytes(patch_bytes)
    args.output.write_bytes(encoded)


if __name__ == "__main__":
    main()
