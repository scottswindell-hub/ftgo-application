const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {loadPinnedDetail}=require('./assets/pinned-detail.js');

const identity={run_id:'a'.repeat(32),repository:'test/repo',head_commit:'head',baseline_commit:'base'};
const bytes=value=>Buffer.from(JSON.stringify(value));
async function run(value,{status=200,limit=524288,referenceDigest=null}={}){
 const raw=bytes(value);
 global.location={href:'http://localhost:8780/review/?local=1',origin:'http://localhost:8780'};
 global.fetch=async()=>({ok:status===200,status,arrayBuffer:async()=>raw});
 global.reviewSha256=async data=>crypto.createHash('sha256').update(Buffer.from(data)).digest('hex');
 const digest=referenceDigest||crypto.createHash('sha256').update(raw).digest('hex');
 return loadPinnedDetail({url:'/artifacts/run/detail.json',sha256:digest},identity,
   'intent-flow-evidence-detail-v1',limit);
}

(async()=>{
 const assessments=Array.from({length:72},(_,i)=>({id:'finding-'+i,rationale:'evidence-'+i}));
 const payload={schema:'intent-flow-evidence-detail-v1',identity,assessments};
 const loaded=await run(payload);
 assert.equal(loaded.available,true);
 assert.deepEqual(loaded.value.assessments,assessments);
 const wrongRun=await run({...payload,identity:{...identity,run_id:'b'.repeat(32)}});
 assert.equal(wrongRun.available,false);
 assert.match(wrongRun.reason,/another run/);
 const wrongDigest=await run(payload,{referenceDigest:'0'.repeat(64)});
 assert.equal(wrongDigest.available,false);
 assert.match(wrongDigest.reason,/checksum/);
 const oversized=await run(payload,{limit:10});
 assert.equal(oversized.available,false);
 assert.match(oversized.reason,/512 KiB/);
 const missing=await run(payload,{status:404});
 assert.equal(missing.available,false);
 assert.match(missing.reason,/unavailable/);
 console.log('Pinned detail checks passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
