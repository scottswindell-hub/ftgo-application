const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const code=fs.readFileSync(path.join(__dirname,'assets/packet-view.js'),'utf8');
const start=code.indexOf('  let patchPromise;');
const end=code.indexOf('  const sourceDetails=',start);
function loader(source){
 return new Function('packet','reviewSha256','TextEncoder',code.slice(start,end)+';return loadPatch;')(
  {source_diff:source},async raw=>createHash('sha256').update(raw).digest('hex'),TextEncoder);
}
test('embedded patch loads without a URL and rejects tampering',async()=>{
 const content='diff --git a/A.java b/A.java\n--- a/A.java\n+++ b/A.java\n@@ -1 +1 @@\n-old\n+new\n';
 const sha256=createHash('sha256').update(content).digest('hex');
 assert.equal(await loader({content,sha256})(),content);
 await assert.rejects(loader({content:content+'x',sha256})(),/digest differs/);
 await assert.rejects(loader({content,sha256:''})(),/digest differs/);
});
test('missing and oversized evidence do not claim an unchanged file',async()=>{
 await assert.rejects(loader({})(),/No source patch was supplied/);
 await assert.rejects(loader({status:'omitted_too_large'})(),/size limit/);
 await assert.rejects(loader({content:'x'.repeat(262145)})(),/256 KiB/);
});
