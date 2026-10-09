/* GitHub confirms identity; this page never receives a write credential. */
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
 let session='';
 async function post(path,body){
  const response=await transport(endpoint+path,{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session}:{})},body:JSON.stringify(body),cache:'no-store',credentials:'omit'});
  const value=await response.json();
  if(!response.ok){if(response.status===401)session='';const error=Error(value.error||'Review service unavailable.');error.status=response.status;throw error;}
  return value;
 }
 return {signedIn:()=>!!session,login:async code=>{const value=await post('/session',{access_code:code});session=value.session;return value;},save:request=>post('',request)};
}
const client=createClient();
function signIn(){
 if(client.signedIn())return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const dialog=document.createElement('dialog');dialog.id='finding-confirmation';
  dialog.innerHTML='<form><h2>Sign in to the FTGO demo</h2><p>Answers are recorded as the demo operator.</p><label>Demo access code <input type="password" autocomplete="off" required></label><p role="status"></p><button type="submit">Sign in and save answer</button><button type="button" data-close>Cancel</button></form>';
  let done=false;
  const cancel=()=>{if(!done){done=true;reject(Error('Answer not saved.'));}dialog.remove();};
  dialog.querySelector('[data-close]').onclick=cancel;dialog.addEventListener('cancel',cancel);
  dialog.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const button=dialog.querySelector('[type=submit]');button.disabled=true;
   try{await client.login(dialog.querySelector('input').value);done=true;dialog.close();dialog.remove();resolve();}
   catch(error){dialog.querySelector('[role=status]').textContent=error.message;button.disabled=false;}
  };
  document.body.append(dialog);dialog.showModal();
 });
}
async function submit(request){
 await signIn();
 try{return await client.save(request);}catch(error){
  if(error.status===401){await signIn();return client.save(request);}throw error;
 }
}
root.codeIntentFindingReviews={command,targets,recorded,createClient,submit};
if(typeof module!=='undefined')module.exports=root.codeIntentFindingReviews;
})(typeof window==='undefined'?globalThis:window);
