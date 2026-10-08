"""Project a run's governed boundary changes into source-first intent impact tiles.

One tile per selected governed boundary question. Each tile carries:
  changed   the source line this PR changed (file, line, method), located from recorded facts
            and, for deletions, from the PR patch;
  affected  unchanged code at the head commit that depends on the change, found by deterministic
            links (command type -> registered handler, saga compensation -> its command handler,
            read-model update -> the query that returns it, state transition -> same-entity
            transitions guarded on the changed state);
  sentence  a plain description filled from the before/after facts (no generated text).
Change size and intent impact are reported separately, and everything that changed without
governed meaning is counted as noise. Verdicts are joined later by question id from the
intent-diff check; this view never judges.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from intent_walkthrough import method_key, transition_context

MAX_SNIPPET = 12
_SERVICE = re.compile(r"^ftgo-([\w-]+?)(?:-service)?/")


def service_name(path: str | None) -> str:
    match = _SERVICE.match(path or "")
    if not match:
        return "Repository"
    return match.group(1).replace("-", " ").capitalize() + (" service" if not match.group(1).endswith("history") else "")


def method_label(owner: str | None) -> str:
    key = method_key(owner)
    parts = key.split(".")
    if len(parts) < 2:
        return key
    cls, name = parts[-2], parts[-1]
    return f"{cls} definition" if name == "<init>" else f"{cls}.{name}()"


def intended(question: str) -> str:
    text = re.sub(r"^Does the candidate\s+", "", question or "").rstrip("?").strip()
    return (text[:1].upper() + text[1:] + ".") if text else ""


def _patch_sections(patch: str) -> dict[str, str]:
    out = {}
    for section in re.split(r"(?m)^diff --git ", patch or ""):
        match = re.search(r"(?m)^\+\+\+ b/(.+)$", section) or re.search(r"(?m)^--- a/(.+)$", section)
        if match:
            out[match.group(1).strip()] = section
    return out


def _deleted_line(section: str, needle: str) -> int | None:
    """Old-file line number of the first deleted line containing `needle`."""
    old = None
    for line in section.splitlines():
        header = re.match(r"@@ -(\d+)", line)
        if header:
            old = int(header.group(1))
            continue
        if old is None or line.startswith(("+++", "---")):
            continue
        if line.startswith("-"):
            if needle in line:
                return old
            old += 1
        elif not line.startswith("+"):
            old += 1
    return None


def _added_line(section: str, needle: str) -> int | None:
    """New-file line number of the first added line containing `needle`."""
    new = None
    for line in section.splitlines():
        header = re.match(r"@@ -\d+(?:,\d+)? \+(\d+)", line)
        if header:
            new = int(header.group(1))
            continue
        if new is None or line.startswith(("+++", "---")):
            continue
        if line.startswith("+"):
            if needle and needle in line:
                return new
            new += 1
        elif not line.startswith("-"):
            new += 1
    return None


def _java_files(repo: Path):
    yield from sorted(repo.glob("*/src/main/java/**/*.java"))


def _method_span(lines: list[str], name: str, start_hint: int = 0) -> tuple[int, int] | None:
    for index in range(start_hint, len(lines)):
        # A declaration may break before its parameter list: `Message name` / `(Args a) {`.
        joined = lines[index] + (" " + lines[index + 1].strip() if index + 1 < len(lines) else "")
        if re.search(r"\b" + re.escape(name) + r"\s*\(", joined) and re.search(r"\b" + re.escape(name) + r"\b", lines[index]) \
                and not lines[index].strip().endswith(";") and "this::" not in lines[index] \
                and not lines[index].lstrip().startswith(("return", ".", "//")):
            depth, opened = 0, False
            for end in range(index, min(len(lines), index + 80)):
                depth += lines[end].count("{") - lines[end].count("}")
                opened = opened or "{" in lines[end]
                if opened and depth <= 0:
                    return index, end
            return index, min(len(lines) - 1, index + MAX_SNIPPET)
    return None


def _snippet(repo: Path, path: str, start: int, end: int, anchor: int, label: str, note: str) -> dict:
    lines = (repo / path).read_text().splitlines()
    start, end = max(0, start), min(len(lines) - 1, end, start + MAX_SNIPPET - 1)
    return {"file": path, "start": start + 1, "anchor": anchor + 1, "label": label, "note": note,
            "lines": lines[start:end + 1]}


def _handler_for(repo: Path, command: str) -> tuple[str, list[str], str] | None:
    pattern = re.compile(r"onMessage\(\s*(?:\w+\.)*" + re.escape(command) + r"\.class\s*,\s*this::(\w+)")
    for file in _java_files(repo):
        text = file.read_text()
        match = pattern.search(text)
        if match:
            return str(file.relative_to(repo)), text.splitlines(), match.group(1)
    return None


def _command_value_link(repo, fact, changed_text):
    command = re.search(r"new\s+(\w+)\s*\(", changed_text or "")
    slot = fact["slots"].get("slot", "")
    if not command:
        return None
    found = _handler_for(repo, command.group(1))
    if not found:
        return None
    path, lines, handler = found
    span = _method_span(lines, handler)
    if not span:
        return None
    getter = "get" + re.sub(r"^(with|set)", "", slot)
    anchor = next((i for i in range(span[0], span[1] + 1) if getter + "(" in lines[i]), span[0])
    return _snippet(repo, path, span[0], max(anchor + 2, span[0] + 3), anchor,
                    f"{Path(path).stem}.{handler}",
                    f"Unchanged. Receives the new value in <code>{getter}()</code> and acts on it.")


def _saga_compensation_link(repo, fact):
    participant = fact["slots"].get("participant", "")
    proxy, _, field = participant.rpartition(".")
    if not field:
        return None
    pattern = re.compile(r"\b" + re.escape(field) + r"\s*=\s*CommandEndpointBuilder\s*\.forCommand\(\s*(\w+)\.class", re.S)
    # Prefer the proxy named after the participant (kitchenService -> KitchenServiceProxy).
    preferred = (proxy[:1].upper() + proxy[1:] + "Proxy") if proxy else ""
    for file in sorted(_java_files(repo), key=lambda f: f.stem != preferred):
        match = pattern.search(file.read_text())
        if not match:
            continue
        found = _handler_for(repo, match.group(1))
        if not found:
            continue
        path, lines, handler = found
        span = _method_span(lines, handler)
        if not span:
            return None
        return _snippet(repo, path, span[0], span[1], span[0], f"{Path(path).stem}.{handler}",
                        f"Unchanged, and no longer reached from this saga: nothing sends <code>{match.group(1)}</code> "
                        "when a later step fails.")
    return None


def _read_model_link(repo, path):
    module = (path or "").split("/", 1)[0]
    for file in sorted((repo / module).glob("src/main/java/**/*Controller.java")):
        lines = file.read_text().splitlines()
        for index, line in enumerate(lines):
            if re.search(r"\.get(Status|State)\(\)", line):
                rel = str(file.relative_to(repo))
                return _snippet(repo, rel, index - 1, index + 1, index, f"{file.stem} · read model query",
                                "Unchanged. Returns the recorded state to callers as stored.")
    return None


def _state_link(repo, old, new, seed_index):
    context = transition_context(old, new, seed_index)
    for connection in context.get("connections", []):
        path, line = connection["source"]["file"], connection["source"].get("line")
        if not path or not line:
            continue
        verb = "now also reachable" if connection.get("accepts_new_destination") else "relies on the previous state"
        return _snippet(repo, path, line - 2, line + 4, line - 1, method_label(connection["method"]),
                        f"Unchanged transition on the same entity that {verb}.")
    return None


def _fmt(value) -> str:
    return re.sub(r"\b(?:OrderState|TicketState)\.", "", str(value))


def sentence(form, before, after) -> str:
    """Plain description of the governed change, filled from the recorded fact slots."""
    b, a = (before or {}).get("slots", {}), (after or {}).get("slots", {})
    if form == "value_binding":
        field = re.sub(r"(?<!^)([A-Z])", r" \1", re.sub(r"^(with|set)", "", a.get("slot") or b.get("slot", ""))).lower()
        if a and b:
            return f"The <b>{field}</b> now comes from <code>{a['value']}</code> (was <code>{b['value'][:70]}</code>)."
        return f"The <b>{field}</b> binding was {'added' if a else 'removed'}."
    if form == "state_transition":
        parts = []
        new_sources = [s for s in a.get("allowed", []) if s not in b.get("allowed", [])]
        if new_sources:
            parts.append(f"is now allowed from <b>{', '.join(map(_fmt, new_sources))}</b> "
                         f"(was only {', '.join(map(_fmt, b.get('allowed', [])))})")
        writes = [w for w in a.get("writes", []) if w not in b.get("writes", [])]
        if writes:
            parts.append("now writes " + ", ".join(f"<code>{_fmt(w)}</code>" for w in writes)
                         + (" (before: no state write)" if not b.get("writes") else ""))
        return ("The transition " + "; ".join(parts) + ".") if parts else "The transition's results changed."
    if form == "boundary_call" and a and b:
        changed = [(x, y) for x, y in zip(b.get("arguments", []), a.get("arguments", [])) if x != y]
        if changed:
            return (f"<code>{a.get('receiver')}.{a.get('operation')}</code> now records <b>{_fmt(changed[0][1])}</b> "
                    f"(was <b>{_fmt(changed[0][0])}</b>).")
    if form == "boundary_call" and (a or b) and not (a and b):
        call = a or b
        target = f"<code>{call.get('receiver')}.{call.get('operation')}</code>"
        return (f"A governed call to {target} was {'added' if a else 'removed'}; "
                f"code that {'did not expect' if a else 'relied on'} it may behave differently.")
    if form == "saga_withCompensation" and b and not a:
        return (f"This saga step no longer compensates with <code>{b.get('participant')}</code>; if a later step "
                "fails, that work is left in place.")
    kind = (form or "governed").replace("_", " ")
    has_before, has_after = before is not None, after is not None
    return f"A governed {kind} was {'changed' if has_before and has_after else 'added' if has_after else 'removed'}."


def _parse_fact(text):
    """`form {json slots}` as recorded in a flow's normalized boundary delta."""
    form, _, raw = str(text or "").partition(" ")
    try:
        return form, json.loads(raw) if raw else {}
    except ValueError:
        return form, {"value": raw}


def _semantic_delta_anchor(row, sections):
    """Prefer the changed fact constituent over the method-level Joern guard anchor."""
    if row.get("form") != "state_transition" or not row.get("changed", {}).get("file"):
        return
    section = sections.get(row["changed"]["file"])
    if not section:
        return
    before = row.get("before", [{}])[0] if row.get("before") else {}
    after = row.get("after", [{}])[0] if row.get("after") else {}
    added = ([w for w in after.get("writes", []) if w not in before.get("writes", [])]
             + [s for s in after.get("allowed", []) if s not in before.get("allowed", [])])
    removed = ([w for w in before.get("writes", []) if w not in after.get("writes", [])]
               + [s for s in before.get("allowed", []) if s not in after.get("allowed", [])])
    for value in added:
        line = _added_line(section, str(value).split("=")[-1].split(".")[-1])
        if line:
            row["changed"].update(line=line, side="after")
            return
    for value in removed:
        line, deleted = _deleted_line(section, str(value).split("=")[-1].split(".")[-1])
        if line and deleted:
            row["changed"].update(line=line, side="before")
            return


def unjudged_changes(view, judged_boundaries, sections=None):
    """Deterministic governed diffs that still need an Ask Code Intent explanation."""
    out = []
    for flow in view.get("flows", []):
        identity = (method_key(method_label(flow.get("method"))), flow.get("title"))
        if flow.get("change_kind") != "governed_boundary_change" or identity in judged_boundaries:
            continue
        sides = {"before": [], "after": []}
        form = None
        for delta in flow.get("observed_deltas", []):
            fact = (delta.get("fields") or {}).get("fact") or {}
            for side in sides:
                for text in fact.get(side) or []:
                    form, slots = _parse_fact(text)
                    sides[side].append(slots)
        anchors = flow.get("fact_source_anchors") or {}
        anchor = (anchors.get("after") or anchors.get("before") or [{}])[0]
        reasons = sorted({f.get("reason") for f in flow.get("findings", []) if f.get("reason")})
        out.append({"flow_id": flow.get("id"), "boundary_id": flow.get("title"), "form": form or anchor.get("form"),
                    "method": method_label(flow.get("method")),
                    "changed": {"file": anchor.get("file") or (flow.get("source") or {}).get("file"),
                                "line": anchor.get("line"), "side": "after" if anchors.get("after") else "before"},
                    "before": sides["before"], "after": sides["after"], "reasons": reasons})
    grouped = {}
    for row in out:
        grouped.setdefault((row["boundary_id"], row["form"], row["method"]), []).append(row)
    merged = []
    for rows in grouped.values():
        before = [row for row in rows if row["before"] and not row["after"]]
        after = [row for row in rows if row["after"] and not row["before"]]
        if len(rows) == 2 and len(before) == len(after) == 1:
            row = dict(after[0])
            row["flow_id"] = before[0]["flow_id"] + "+" + after[0]["flow_id"]
            row["before"] = before[0]["before"]
            row["reasons"] = sorted(set(before[0]["reasons"] + after[0]["reasons"]))
            merged.append(row)
        else:
            merged.extend(rows)
    for row in merged:
        _semantic_delta_anchor(row, sections or {})
    return merged


def project_impact(view, impact, questions, patch, repo, seed_index=None):
    repo = Path(repo)
    sections = _patch_sections(patch)
    impacts = {i.get("intent_region_id"): i for i in impact.get("impacts", [])}
    tiles = []
    for packet in questions.get("packets", []):
        state = packet["request"]["state"]
        evidence = state.get("evidence", {})
        added, removed = evidence.get("added_facts", []), evidence.get("removed_facts", [])
        fact = (added or removed or [{}])[0]
        before = next((f for f in removed if f.get("owner") == fact.get("owner") and f.get("form") == fact.get("form")), None)
        after = next((f for f in added if f.get("owner") == fact.get("owner") and f.get("form") == fact.get("form")), None)
        change = impacts.get(packet.get("intent_region_id"), {})
        path = (change.get("affected_paths") or [None])[0]
        line, deleted = (after or {}).get("line"), False
        if line is None and before and path in sections:
            needle = before["slots"].get("participant") or before["slots"].get("value") or ""
            line, deleted = _deleted_line(sections[path], needle.split(".")[-1] if needle else ""), True
        if after and not deleted and path in sections and fact.get("form") == "state_transition":
            # A transition fact is recorded at its guard; anchor on the added line carrying the new write.
            new_writes = [w for w in after["slots"].get("writes", []) if w not in (before or {}).get("slots", {}).get("writes", [])]
            for write in new_writes:
                token = write.split("=")[-1].split(".")[-1]
                found = _added_line(sections[path], token)
                if found:
                    line = found
                    break
        changed_text = ""
        if path and line and not deleted and (repo / path).exists():
            source = (repo / path).read_text().splitlines()
            changed_text = source[line - 1] if line <= len(source) else ""
        form = fact.get("form")
        try:
            if form == "value_binding":
                affected = _command_value_link(repo, after or fact, changed_text)
            elif form == "saga_withCompensation":
                affected = _saga_compensation_link(repo, before or fact)
            elif form == "boundary_call":
                affected = _read_model_link(repo, path)
            elif form == "state_transition" and before and after:
                affected = _state_link(repo, before, after, seed_index)
            else:
                affected = None
        except (OSError, KeyError, ValueError):
            affected = None
        services = [service_name(path)]
        if affected and service_name(affected["file"]) not in services:
            services.append(service_name(affected["file"]))
        tiles.append({
            "question_id": packet["question_id"], "boundary_id": packet["boundary_id"],
            "concept": state["context"]["domain"].get("role") or packet["boundary_id"],
            "intended": intended(state["context"]["question"].get("text", "")),
            "sentence": sentence(form, before, after),
            "changed": {"file": path, "line": line, "deleted": deleted, "method": method_label(fact.get("owner"))},
            "affected": affected, "services": services,
            "region_ids": packet.get("intent_region_ids", []),
            "form": form, "facts": {"before": (before or {}).get("slots"), "after": (after or {}).get("slots")},
        })
    flows = view.get("flows", [])
    noise_files = sorted({f.get("source", {}).get("file") or f.get("title") for f in flows
                          if f.get("change_kind") == "file_changed_without_method_delta"})
    context_only = [method_label(f.get("method", "").split("::")[-1]) for f in flows if f.get("change_kind") == "context_changed"]
    judged_boundaries = {(method_key(t["changed"]["method"]), t["boundary_id"]) for t in tiles}
    governed_owners = {owner for owner, _ in judged_boundaries}
    unjudged = unjudged_changes(view, judged_boundaries, sections)
    governed_owners |= {method_key(u["method"]) for u in unjudged}
    ungoverned = [method_label(f.get("method", "").split("::")[-1]) for f in flows
                  if f.get("change_kind") in {"source_changed", "added", "removed"}
                  and method_key(method_label(f.get("method", "").split("::")[-1])) not in governed_owners]
    gaps = [{"boundary_id": g.get("boundary_id"), "reason": g.get("reason")} for g in questions.get("gaps", [])]
    files = len(sections)
    lines = sum(1 for section in sections.values() for row in section.splitlines()
                if row[:1] in "+-" and not row.startswith(("+++", "---")))
    return {
        "schema": "intent-impact-view-v1",
        "baseline_commit": view.get("baseline_commit"), "head_commit": view.get("head_commit"),
        "size": {"files": files, "lines": lines},
        "concepts": tiles, "gaps": gaps, "unjudged": unjudged,
        "services": sorted({s for t in tiles for s in t["services"]}
                           | {service_name(u["changed"]["file"]) for u in unjudged if u["changed"].get("file")}),
        "noise": {"files": noise_files, "context_only": context_only, "ungoverned": ungoverned},
        "qualification": "Deterministic projection of recorded boundary facts and head-commit source. "
                         "Affected code is found by type and registration links, not by execution.",
    }


NOISE_KINDS = {"file_changed_without_method_delta", "context_changed"}


def compact_noise(view: dict) -> dict:
    """Drop repeated containment ancestry from no-intent flows; the impact view counts them instead.

    A comment-only file or a context-only method keeps its flow, its source and its source edge,
    but loses the potential-impact list and edges that repeat "inside this file, service and
    application". Large pull requests would otherwise exceed the review view's size contract.
    """
    noise = {f["id"] for f in view.get("flows", []) if f.get("change_kind") in NOISE_KINDS}
    dropped = 0
    for flow in view.get("flows", []):
        if flow["id"] in noise and flow.get("potential_impact"):
            flow["potential_impact"] = []
    graph = view.get("graph") or {}
    kept = []
    for edge in graph.get("edges", []):
        ends = {str(edge.get("from", "")).replace("episode:", "", 1), str(edge.get("to", "")).replace("episode:", "", 1)}
        if edge.get("kind") == "potential_impact" and ends & noise:
            dropped += 1
            continue
        kept.append(edge)
    if graph:
        graph["edges"] = kept
        used = {e.get("from") for e in kept} | {e.get("to") for e in kept}
        graph["nodes"] = [n for n in graph.get("nodes", []) if n.get("kind") != "scope" or n.get("id") in used]
    return {"noise_flows": len(noise), "dropped_ancestry_edges": dropped,
            "qualification": "No-intent flows keep their source; repeated containment ancestry is summarized."}


if __name__ == "__main__":
    import argparse
    import json
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backend", type=Path)
    parser.add_argument("--repo", type=Path, required=True)
    args = parser.parse_args()
    read = lambda path: json.loads(path.read_text())
    view_path = args.backend / "intent-flow.json"
    view = read(view_path)
    seed = args.backend / "context/seed-index.json"
    projection = project_impact(
        view, read(args.backend / "context/boundary-impact.json"),
        read(args.backend / "context/contextual-questions.json"),
        (args.backend / "review/source.patch").read_text(), args.repo,
        read(seed) if seed.exists() else None)
    # Published beside the view, bound by checksum, so the view stays within its own size contract.
    import hashlib
    raw = json.dumps(projection, separators=(",", ":"), sort_keys=True).encode()
    if len(raw) > 262144:
        raise ValueError("Intent impact artifact exceeds 256 KiB")
    side = view_path.with_name("intent-flow.impact.json")
    side.write_bytes(raw)
    view.pop("intent_impact", None)
    view["compaction"] = compact_noise(view)
    view["intent_impact_artifact"] = {"url": side.name, "sha256": hashlib.sha256(raw).hexdigest()}
    view_path.write_text(json.dumps(view, indent=2, sort_keys=True))
