const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function harness(packets){
 const source=fs.readFileSync(path.join(__dirname,'assets/walkthrough-live.js'),'utf8');
 // Exercise the actual loading/polling functions without starting the DOM UI.
 const end=source.indexOf('\nfunction iconFor(');
 let current=0;
 const ctx={URL,URLSearchParams,Uint8Array,TextDecoder,Map,location:{search:'?repo=o/r&sha=head&api=https://api.example',href:'https://ui.example/' ,origin:'https://ui.example'},
 document:{querySelector:()=>({})},walkthroughPipeline:{},render:()=>{},
 reviewExplorer:{enrich:x=>x},codeIntentReviewModel:(p,s)=>({summary:s}),
 reviewSha256:async()=>String(current),setTimeout:()=>{},
 fetch:async url=>String(url).includes('detail=')?{ok:true,arrayBuffer:async()=>Buffer.from(JSON.stringify(packets[current]))}:{ok:true,json:async()=>({state:'completed',checks:[],review_artifact:{schema:'review-artifact-reference-v1',name:'intent-flow.json',sha256:String(current)}})}};
 vm.createContext(ctx);
 vm.runInContext(source.slice(0,end)+'\nglobalThis.testing={state,poll};})();',ctx);
 return {state:ctx.testing.state,poll:ctx.testing.poll,next:()=>current++};
}
const packet=summary=>({schema:'intent-flow-view-v1',repository:'o/r',baseline_commit:'base',head_commit:'head',flows:[],...(summary?{objective_summary:summary}:{})});
const summary={identity:{repository:'o/r',baseline_commit:'base',head_commit:'head'},intent_semantics:{status:'recorded',explanations:[{title:'Preparation can start before acceptance'}]}};
test('terminal digest refresh replaces initial facts with English summary',async()=>{
 const h=harness([packet(),packet(summary)]);
 await h.poll();assert.equal(h.state.summary,null);
 h.next();await h.poll();
 assert.equal(h.state.summary.intent_semantics.explanations[0].title,'Preparation can start before acceptance');
 assert.equal(h.state.packetDigest,'1');
});
test('foreign summary identity is rejected before committing UI state',async()=>{
 const h=harness([packet({...summary,identity:{...summary.identity,head_commit:'foreign'}})]);
 await h.poll();
 assert.match(h.state.error,/summary identity differs/);
 assert.equal(h.state.packet,null);assert.equal(h.state.summary,null);assert.equal(h.state.model,null);
});
