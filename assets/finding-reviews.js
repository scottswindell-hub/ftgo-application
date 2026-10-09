/* Anonymous FTGO demo: GitHub credentials stay on the server. */
(function(root){
'use strict';
function command(answer,sha,scope){
 if(!['yes','no'].includes(answer)||!/^[0-9a-f]{40}$/.test(sha)||!/^[0-9a-f]{64}$/.test(scope))throw Error('Recorded review evidence is unavailable.');
 return `/codeintent-review ${answer} ${sha} ${scope}`;
}
function targets(item,items,packet,summary,checks){
 const out=[];
 for(const check of checks)for(const finding of check.findings||[]){
  if(!finding.review?.scope)continue;
  const matched=root.walkthroughPipeline.descriptionItem(items,packet,summary,checks,check.id,finding.id||finding.ref);
  if(matched?.id===item.id)out.push({check,finding});
 }
 return out;
}
function recorded(target,body){
 const r=target?.finding.review;
 return !!r?.record&&['accepted','unresolved'].includes(r.decision)&&body.includes(`<!-- codeintent-review:${r.scope}:${r.decision}:${r.record} -->`);
}
const ENDPOINT='https://qgd63ljozc.execute-api.us-east-1.amazonaws.com/demo/reviews';
function createClient(endpoint=ENDPOINT,transport=(...args)=>fetch(...args)){
 async function save(body){
  const response=await transport(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',credentials:'omit'});
  const value=await response.json();
  if(!response.ok){const error=Error(value.error||'Review service unavailable.');error.status=response.status;throw error;}
  return value;
 }
 return {save};
}
const client=createClient();
async function submit(request){return client.save(request);}
// Beacon queues a small POST that survives navigation. Plain text avoids a CORS
// preflight during unload; the endpoint parses and validates the JSON body.
function queue(request,beacon=(...args)=>navigator.sendBeacon(...args)){
 const body=new Blob([JSON.stringify(request)],{type:'text/plain;charset=UTF-8'});
 if(!beacon(ENDPOINT,body))throw Error('The browser could not send your answer. Press Return to Github to retry.');
}
root.codeIntentFindingReviews={command,targets,recorded,createClient,submit,queue};
if(typeof module!=='undefined')module.exports=root.codeIntentFindingReviews;
})(typeof window==='undefined'?globalThis:window);
