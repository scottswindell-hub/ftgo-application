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
// Return only when GitHub can display progress or the exact completed receipt.
async function waitForComment(repo,commentId,result,transport=(...args)=>fetch(...args),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
 const url=`https://api.github.com/repos/${repo.split('/').map(encodeURIComponent).join('/')}/issues/comments/${commentId}`;
 const marker=`<!-- codeintent-review:${result.scope}:${result.decision}:${result.record} -->`;
 for(let attempt=0;attempt<20;attempt++){
  try{
   const response=await transport(url,{cache:'no-store'});
   if(response.ok){
    const comment=await response.json(),body=comment.body||'';
    if(comment.user?.login==='github-actions[bot]'&&(body.includes(marker)||(body.includes('checks-running.gif')&&body.includes('Updating review'))))return;
   }
  }catch(error){/* Retry transient GitHub reads while retaining the saved request. */}
  await pause(2000);
 }
 throw Error('Your answer was saved, but GitHub has not updated yet. Press Return to Github to retry.');
}
root.codeIntentFindingReviews={command,targets,recorded,createClient,submit,waitForComment};
if(typeof module!=='undefined')module.exports=root.codeIntentFindingReviews;
})(typeof window==='undefined'?globalThis:window);
