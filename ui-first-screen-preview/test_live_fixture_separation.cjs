'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'legacy-review.html'),'utf8');
const liveRender=html.match(/if\(flow\)return;\n  if\(LIVE\)\{([\s\S]*?)\n  \}else\{/);
assert.ok(liveRender,'live render branch is present');
assert.doesNotMatch(liveRender[1],/simulatedChecks\(|simulatedReview\(|simulationNotice\(|intent\(\)/);
assert.match(liveRender[1],/view==='checks'\?liveChecks\(\)/);
assert.match(liveRender[1],/view==='review'\?liveReviewPlaceholders\(\)/);

const initLive=html.match(/function initLive\(\)\{([\s\S]*?)\n\}/);
assert.ok(initLive,'live initialization is present');
assert.doesNotMatch(initLive[1],/SIMULATED|simulated|live \+ demo/);
assert.match(initLive[1],/LIVE CODEINTENT REVIEW/);
assert.match(initLive[1],/\.sidebar'\)\.classList\.add\('hidden'\)/);

console.log('live fixture separation tests passed');
