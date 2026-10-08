# Review UI implementation handoff

Review presents one change-centered problem per tile, with its contributing
checks, intent/source delta, next action, owner, and expandable evidence. Checks
remains the pipeline status board: running stage, progress messages, and final
results. Intent Flow connects recorded source, changed regions, and potential
impact; selecting a graph node opens evidence and its Review tile.

## Try it

- Large illustrative PR: `http://localhost:8765/review/`
- Generated FTGO replay: `http://localhost:8765/review/?data=assets/intent-flow-example.json`
- Checks progress: `http://localhost:8765/review/?view=checks`, then Replay analysis.

Both Review paths use `assets/review-ui.js`. The generated path is produced by
`intent_flow_data.py`; see [INTENT_FLOW_DATA.md](INTENT_FLOW_DATA.md) for the exact
command and artifact limits. It adds no model calls. Existing Codex/TypeSafe
outputs remain evidence from upstream analysis, rather than calls from the UI.

## Reviewer workflow

Needs action is the default filter. Awaiting others contains responses awaiting
an owner, author, or fresh analysis. All includes changes needing no response.
Check and owner filters narrow the work. The walkthrough opens a specific changed
area, clearing conflicting filters so its tile remains visible. Source selection
opens a revision-bound evidence panel; actual replay patches load on demand and
are verified against the generated SHA256. A file anchor never claims an exact
method-to-hunk mapping.

Fix submitted means awaiting analysis. Context supplied means awaiting analysis.
Request changes means awaiting author. Dispute means awaiting review. Ask owner
means awaiting owner. The original finding and overall analysis outcome remain
open until the backend confirms a resolution. Session responses can be undone;
Intent log lists those responses and the reviewed revision.

Action needed and Evidence needed describe review work. They do not claim that
this prototype has blocked the PR. Show Merge blocked only when an actual CI gate
publishes that enforcement state. Backend enums belong in expanded provenance.

Reviewed baseline and head are visible. Replay freshness says current head is
not connected. Production must compare the reviewed head with the repository
head and bind approval/exception events to the exact evidence and revision.

## Independent review

The comparison agent reviewed this against the documented workflows of
[CodeRabbit findings](https://docs.coderabbit.ai/change-stack/findings),
[GitHub review resolution](https://docs.github.com/en/pull-requests/concepts/resolving-reviews),
and [SonarQube issue management](https://docs.sonarsource.com/sonarqube-cloud/managing-your-projects/issues/editing).
Its five recommendations were implemented: pending responses distinct from
resolution, triage filters, source inspection, revision context, and a shared
renderer for real generated data and illustrative fixtures. Its follow-up found
contradictory guidance for equivalent changes and filters hiding direct-navigation
targets; both were corrected.

Browser validation covered the two paths: response lifecycle and undo/history,
filters, source inspection (including real lazy patch loading and digest/cache),
graph-to-review links, preserved Checks and progress, and mobile page width.
Repeat script generation produced identical view JSON and source patch.

## Production connections still required

Persist authenticated responses and owner decisions through the real API; track
finding identity and verified resolution across analysis runs. Supply the complete
CI manifest, current repository head, and finer source anchors when available.
The replay packet supplies neither CI enforcement nor authorized audit events;
its Checks lanes stay Not supplied. These omissions remain explicit in the UI.

## Human reviewability pass

A second pass with the comparison agent focused on first-time reviewers. Findings
now appear in stable order: actionable results, evidence gaps, then cleared
changes. Generated titles explain the recorded judgment or unresolved context;
context-only episodes do not imply that their source files were edited.
Source labels use file/function names, keeping full paths in inspection. Visible
revision hashes are shortened, with full values in run context. Missing owners
are stated once above the board. Repeated primary-check tags and generic summary
text are removed. Deltas explicitly read Baseline → This revision.
Response controls use Mark fix submitted, Mark context supplied, and Request owner
review, with a shared explanation that these record responses. Browser validation
covered sorting, shorter labels, filters, source patch loading, response state,
graph navigation and mobile width on both data paths.


## Independent check examples

The composite PR includes coding standards (error translation), improper tests
(mocked assertion), placement (tax arithmetic in a response getter), scope
(unrelated courier selection), module fit (order-total calculation in accounting),
undisclosed change (a helper refactor dropping event publication), and sabotage
check (a cached response bypassing ownership validation). All seven are selectable
in the same Review Check filter and linked from their Checks lane.

These checks use their own source/context evidence; intent analysis is not a
required intermediate representation. Placement, module fit and undisclosed
examples adapt code patterns from the repository `examples/judged-checks/4-placement`
demos. The composite PR changes the original context, so original probabilities
are not reused as new measurements. Scope and security examples are illustrative.
The ordinary-bug experiment in `5-bugs` is not a sabotage evaluation. Tool/provenance
notes remain in expanded evidence. The standalone Soft rules lane is removed;
judged coding standards continue to appear under Coding standards.

The graph includes before/changed facts, source connections, recorded potential
impact, selection highlights, an inspector, zoom and fit-width controls. Explicit
added/removed dependency annotations in the fixture color/filter those edges;
the generated path never guesses unrecorded dependency changes. Independent check
examples do not force a new intent node merely to appear in Review.

For a fresh preview with caching disabled:

```sh
python3 github-lambda-workflow/review-prototype/preview.py --port 8765
```

Open `http://localhost:8765/review/` for the composite fixture, or
`http://localhost:8765/review/?data=assets/intent-flow-example.json` for generated data.
