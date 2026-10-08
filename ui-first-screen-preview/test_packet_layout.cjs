const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('generated packet outcome is a full-width strip above the content columns',()=>{
 const source=fs.readFileSync(path.join(__dirname,'assets/packet-view.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'assets/intent-walkthrough.css'),'utf8');
 assert.match(source,/classList\.add\('packet-layout'\)/);
 assert.match(source,/class="card packet-outcome"/);
 assert.match(css,/\.packet-layout>\.right\{[^}]*grid-column:1\/-1;[^}]*grid-row:1/);
 assert.match(css,/\.packet-layout>\.sidebar,\.packet-layout>#main-content\{grid-row:2\}/);
 assert.match(css,/\.layout\.packet-layout\.checks-layout\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.packet-layout \.governed-objectives\{max-width:none;margin:0\}/);
});

test('review pages require a query artifact or a digest-pinned live status artifact',()=>{
 const packet=fs.readFileSync(path.join(__dirname,'assets/packet-view.js'),'utf8');
 const behavior=fs.readFileSync(path.join(__dirname,'assets/behavior-page.js'),'utf8');
 assert.match(packet,/params\.get\('data'\)/);
 assert.match(packet,/review-artifact-reference-v1/);
 assert.match(packet,/detail:'review-artifact'/);
 assert.match(packet,/View checksum differs from the status pin/);
 assert.match(packet,/rawBytes\.length>1048576/);
 assert.match(packet,/View exceeds 1 MiB/);
 assert.match(packet,/typeof packet\.source_diff\?\.content==='string'/);
 assert.match(packet,/reviewSha256\(raw\)/);
 assert.match(packet,/renderGovernedMethodSource\(content,loadPatch\)/);
 assert.match(behavior,/bytes\(packetURL,1048576\)/);
 assert.match(packet,/packet\.repository!==LIVE_REPO/);
 assert.match(behavior,/params\.get\('data'\)/);
 for(const source of [packet,behavior])assert.doesNotMatch(source,/semantic-prs|mode.*semantic/);
});

test('legacy governed objectives render a published snapshot or an explicit unavailable state',()=>{
 const page=fs.readFileSync(path.join(__dirname,'legacy-review.html'),'utf8');
 const objectives=fs.readFileSync(path.join(__dirname,'assets/governed-objectives.js'),'utf8');
 assert.match(page,/view==='governance'\?liveGovernedObjectives\(\)/);
 assert.match(objectives,/function liveGovernedObjectivesMarkup\(doc\)/);
 assert.match(objectives,/governed-objectives-status-v1/);
 assert.match(objectives,/Governed objectives unavailable/);
 assert.match(objectives,/data-live-governed-objectives/);
});
