# CodeIntent review prototype

This is the canonical prototype source for the CodeIntent review interface.
The refreshed experience uses a single illustrative FTGO PR with 16 changed
areas, compact Review tiles, a Checks status board, and an interactive Intent
Flow showing before/changed facts and recorded potential impact.

## Preview

From the repository root:

```sh
python3 github-lambda-workflow/review-prototype/preview.py
```

- Composite review: `http://localhost:8765/review/`
- Generated FTGO replay: `http://localhost:8765/review/?data=assets/intent-flow-example.json`
- Checks progress: `http://localhost:8765/review/?view=checks`
- Rule Atlas: `http://localhost:8765/rules/`

The preview disables browser caching. Use `--port 8766` if needed.
On GitHub Pages, add `mode=demo` to explicitly view the static prototype rather
than enter live mode. It also works with `data` and `view`.

## Review experience

Needs action is the default. Reviewers can filter by check, owner, and pending
responses, inspect source evidence, and navigate from the walkthrough, Checks,
or graph to the relevant tile. Responses are session-only pending events: they
do not close findings, authenticate approvals, update baselines, or change CI.

The composite fixture includes Coding standards, Improper tests, Placement
check, Scope check, Module fit, Undisclosed change, and Sabotage check alongside
intent/governance examples. Independent checks use source and contextual
judgments; they do not require an intent graph. These examples illustrate
presentation, not measured detector performance. Checks retains its running
lane/progress/result layout; the standalone Soft rules lane is removed.

Intent Flow uses deterministic SVG layout with source, change, and connected
impact columns, before/changed modes, selection, evidence, zoom, and Review
links. Recorded potential impact is qualified; it is not proof of execution or
confirmed downstream behavior.

## Repeatable pipeline-data view

`intent_flow_data.py` projects completed `intent-tiles-v1` packets into compact
`intent-flow-view-v1` JSON. It preserves observed episodes, evidence status, and
potential impact, and publishes a separately fetched SHA256-verified source
patch. The checked-in sample is actual FTGO replay output from semantic_gate,
not a live pull-request result. Missing CI results remain Not supplied.
The adapter and browser add no Codex or TypeSafe calls; they reuse upstream
analysis. No Prolog rule text is displayed.

The prototype no longer selects checked-in PR scorecards by PR number. Those
artifacts predated accepted workflow obligations. Use the local PR pipeline or
an explicit same-origin `data` URL produced by a workflow-aware run.

See [INTENT_FLOW_DATA.md](INTENT_FLOW_DATA.md) for inputs, limits, complexity,
and regeneration instructions. Supply your completed packet path; the upstream
semantic_gate replay corpus is not part of this repository.

## Existing live integration

Live mode requires `sha`, `api`, and `repo`; `pr` is optional. It polls
`<api>/status?sha=...&repo=...` until completion. Query parameters or a github.io
hostname activate live mode unless `mode=demo` is supplied.
The primary change-scope display is an impact classification with exactly
four user-facing levels: Small, Moderate, Broad, and Extensive. Provider labels
`trivial` and `low` map to Small, while `high` maps to Broad. Pipeline execution
states such as passed, failed, blocked, and pending remain visible only on the
non-severity diagnostic checks; they are not severity values.
Live check states and run identity remain labelled LIVE. The Coding standards
card renders real `findings` and clearly qualified `watch_only_findings`, with
HTML-escaped fields. Other review cards remain explicit placeholders until
structured results are supplied. Live mode never appends the illustrative
fixture, fake reviewers, replay controls, or browser-only response history.
Those examples remain available only in explicit demo mode. When a verified
review artifact is available, Intent Flow and governance history are rendered
from that repository-and-commit-scoped packet.

The standalone preview serves the composite review at both `/` and `/review/`;
`/rules/` retains its routing. The local PR pipeline server owns its own `/`
launcher with runnable PR cases and links to previous runs.

## Validation and integration

Browser validation covers all seven independent categories, filtering,
source inspection, pending response/undo/history, preserved Checks/progress,
graph navigation, and desktop/mobile widths. Generated-data validation covers
all six replay episodes and lazy patch digest verification/cache. Live API
validation covers status identity, active/watch-only findings, HTML escaping,
and unavailable-status handling. Preview and Rule Atlas routes are preserved.

See [REVIEW_UI_HANDOFF.md](REVIEW_UI_HANDOFF.md) for the reviewer workflow and
remaining backend connections: authenticated durable responses, verified
resolution, current-head checks, CI manifests, and precise source ranges.
