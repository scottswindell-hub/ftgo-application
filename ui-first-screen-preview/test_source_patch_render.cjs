const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
global.window=global;
global.document={querySelector:()=>null};
eval(fs.readFileSync(path.join(__dirname,'assets/intent-impact.js'),'utf8'));
const patch='diff --git a/A.java b/A.java\n--- a/A.java\n+++ b/A.java\n@@ -1 +1 @@\n-old\n+new\n';
test('governed method displays file evidence when no exact anchor exists',async()=>{
 const node={dataset:{governedSourceFile:'A.java',sourceAnchors:'[]'},innerHTML:''};
 await renderGovernedMethodSource({querySelectorAll:()=>[node]},async()=>patch);
 assert.match(node.innerHTML,/details open/);
 assert.match(node.innerHTML,/not method-specific/);
 assert.match(node.innerHTML,/ii-dl add/);
 assert.match(node.innerHTML,/ii-dl del/);
});
test('review shows explicitly file-level source when the anchor misses',async()=>{
 const node={dataset:{file:'A.java',mode:'line',line:'999'},innerHTML:''};
 await renderIntentImpact({querySelectorAll:s=>s==='.ii-changed[data-file]'?[node]:[]},async()=>patch);
 assert.match(node.innerHTML,/not method-specific/);
 assert.match(node.innerHTML,/ii-dl add/);
 assert.match(node.innerHTML,/ii-dl del/);
});
