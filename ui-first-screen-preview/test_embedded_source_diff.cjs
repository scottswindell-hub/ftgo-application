const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

global.window=global;
global.CSS={escape:value=>String(value)};
eval(fs.readFileSync(path.join(__dirname,'assets/intent-impact.js'),'utf8'));

test('governed method source renders an embedded file diff without a sidecar',async()=>{
 const node={dataset:{governedSourceFile:'src/A.java',sourceAnchors:'[]'},innerHTML:''};
 const root={querySelectorAll:selector=>selector==='[data-governed-source-file]'?[node]:[]};
 const patch='diff --git a/src/A.java b/src/A.java\n--- a/src/A.java\n+++ b/src/A.java\n@@ -1 +1 @@\n-old\n+new\n';
 await renderGovernedMethodSource(root,async()=>patch);
 assert.match(node.innerHTML,/An exact changed-line anchor is unavailable/);
 assert.match(node.innerHTML,/Full file diff \(not method-specific\)/);
 assert.match(node.innerHTML,/class="ii-dl del"/);
 assert.match(node.innerHTML,/class="ii-dl add"/);
 assert.match(node.innerHTML,/>old</);
 assert.match(node.innerHTML,/>new</);
});

test('missing source evidence is explicit',async()=>{
 const node={dataset:{governedSourceFile:'src/A.java',sourceAnchors:'[]'},innerHTML:''};
 const root={querySelectorAll:()=>[node]};
 await renderGovernedMethodSource(root,async()=>null);
 assert.match(node.innerHTML,/No source patch was supplied/);
});
