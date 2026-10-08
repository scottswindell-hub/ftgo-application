# Intent Flow data projection

`intent_flow_data.py` projects a completed `intent-tiles-v1` review packet into
`intent-flow-view-v1`. The checked-in `assets/intent-flow-example.json` comes
from the `contract-helper-behavior-change` replay case. It is an example of
real pipeline output, not a live PR result.

```sh
python3 github-lambda-workflow/review-prototype/intent_flow_data.py \
  /path/to/completed-review/intent_review_packet.json \
  github-lambda-workflow/review-prototype/assets/intent-flow-example.json
```

The view joins each episode's source anchor, observed change, concept evidence,
potential impact, behavior judgment, and finding summary. It also includes a
`source_packet` reference with the packet URL, SHA-256, and `/episodes` pointer,
so a consumer can retrieve and verify the complete upstream evidence. Concept status and
source-anchor status remain visible: these labels and links are evidence with
uncertainty, not a verified business-intent graph. The view omits policy files,
rule text, and baseline findings unrelated to the changed episodes.

`graph.nodes` contains a compact index of source files and change episodes;
`graph.edges` contains only recorded `source_of_change` relations. Potential
impact entries remain complete on each flow, where their reasons and scope IDs
are already present, so the graph does not repeat them. The relation marks a
source/episode association and does not establish a runtime call or confirmed
behavioral effect. An architecture episode can remain isolated when it has no
verified source anchor. Node order follows packet order, with IDs from recorded
identities.

Generate once after the review packet is produced, then cache the compact JSON
under the head commit, baseline commit, governance version, and packet digest.
Lambda should serve that cached JSON. Projection uses one pass over episodes,
label evidence, impact entries, and findings: O(E + L + I + F) expected time
with dictionary deduplication and O(output size) memory.
There is no graph traversal, source parsing, model call, or Prolog invocation
in the request path. Standalone CLI projections use the digest-pinned patch
sidecar described below. The production Lambda packet instead embeds its
bounded unified diff in `source_diff`, because the governed view is published
as one digest-bound document and does not retain a sidecar.

The CLI rejects packets over 8 MiB and projected views over 1 MiB (the browser/public-view budget) with an
error. It never truncates episodes, observed deltas, impact entries, or findings.
These are prototype guardrails, not proven Lambda capacity limits. The preserved
47-episode checkpoint packet projects to 254,424 bytes (from a prior 313,733-byte
projection); all 203 findings, 104 observed deltas, and 207 impact entries
remain in the view, and the source packet hash allows verification of the full
artifact. Across nine local replay packets, input was 1.33–1.40 MB, output
was 1–46 KB, episodes numbered 0–13, graph nodes 0–26, graph edges 0–28,
and episode findings numbered 0–15.
The largest observed episode title was 198 characters. On this development
machine, one complete CLI invocation for the 13-episode case (startup, read,
parse, project, serialize, write) took 23.31 ms with 16,644 KiB peak child RSS.
These are local measurements; Lambda cold start, runtime memory, storage, and
network costs have not been measured.

## View the generated data

Open the hosted prototype with:

`http://localhost:8765/review/?data=assets/intent-flow-example.json`

`assets/packet-view.js` renders that JSON into Review, change walkthrough,
Intent Flow, and published findings. The renderer has no FTGO symbol matching
or manually authored tile text. It preserves missing judgments, unconfirmed
concept labels, potential impact, and file-only anchors. It does not invent
check results, approvals, execution order, or baseline-to-candidate equivalence.
No Prolog text is displayed. The source packet already contains upstream
analysis/labeling outputs; this projection invokes neither Codex nor TypeSafe.
This demonstrates packet-to-view generation, not rerunning the full upstream
baseline/diff pipeline.

The graph renderer can use `graph.nodes` and `graph.edges` directly, selecting
change nodes to show the corresponding `flows` detail and loading source diffs
on demand. The adapter supplies no layout coordinates or inferred relationships.

The bare `/` URL remains the illustrative large-PR design fixture. That fixture
is for UI breadth only, not evidence of detector performance. The `?data=` path
is the repeatable implementation proof using real replay output. Generate a
new JSON artifact with the command above and pass its same-origin URL in `data`.
The production integration should serve it under the review run identity and
connect actual CI check results and approval events through their own contracts.

Governance-constrained incremental artifacts use the sibling adapter:

```sh
python3 github-lambda-workflow/review-prototype/incremental_review_data.py \
  /path/to/pr-artifacts \
  /path/to/workflow-aware-run/intent-flow.json \
  --judgments /path/to/contextual-judgments.json \
  --evaluation /path/to/evaluation.json --pr 13 \
  --source-patch /path/to/pr.patch
```

Only publish this output as current FTGO evidence when the input run is bound to
the accepted all-workflows baseline. The output uses the same
`intent-flow-view-v1` renderer. It carries constrained
Cameron region IDs, normalized boundary before/after facts, exact judgment
hashes when supplied, and explicit optimizer or selector gaps. It never converts
a missing boundary selection into a finding; an optional labelled evaluation
overlay presents such a miss only as benchmark evidence.

Validation: a repeat generation compared byte-identically with the sample;
browser checks rendered all six sample episodes, followed flow-to-review links,
verified missing-check qualifications and mobile width without JavaScript errors.

## Shared Review interface

The generated packet and illustrative large-PR fixture use the same compact
renderer in `assets/review-ui.js`. Review prioritizes items needing action;
filters expose items awaiting an owner or fresh analysis, cleared changes,
individual checks, and owners. Selecting a walkthrough area opens its tile.
A response moves the item to Awaiting and records the reviewed revision in the
session history. It does not change the finding, backend decision, or baseline.
Verified resolution and durable audit events still require backend integration.

Revision context states the recorded baseline/head and whether a current head
was supplied. Replay artifacts have no live repository freshness information;
the UI never calls them current. No approval action is offered for these views.

The projection CLI automatically copies `source.patch` when it is beside the
input packet, or accepts `--source-patch PATH`. It publishes a separate
`<output-name>.source.patch` artifact and its SHA256 in the view manifest. Source
inspection fetches that patch only when selected, verifies its digest, caches
it in the browser, and selects the matching file section. File-level source
inspection never claims a verified method-to-hunk mapping. Missing file patches
stay explicit, including context-only changes. Patches over 256 KiB fail
explicitly and require separate publication or pagination.

For live Lambda packets, `source_diff.status` is `embedded`, `not_supplied`, or
`omitted_too_large`. Embedded content carries its UTF-8 size and SHA-256 and is
verified before display. Live rendering never falls back to the CLI sidecar.

The graph is generated from recorded source/change/potential-impact links and
laid out deterministically in the browser without a force simulation. Nodes
support pointer and keyboard selection. The Review source panel, graph evidence
panel, and check links use the same episode identity. Checks retains its existing
lane presentation; the replay packet has no CI manifest, so its lanes show Not
supplied. The illustrative PR can replay progress and show recorded issue links.

Still to integrate: authenticated response events, repository-current revision
checks, the independent CI manifest, source-range mappings, and finding lifecycle
across repeated analyses. Codex/TypeSafe outputs are reused from upstream packets;
this presentation step adds no AI calls.
