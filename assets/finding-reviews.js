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
function open(commandText,url){
 document.querySelector('#finding-confirmation')?.remove();
 const dialog=document.createElement('dialog');dialog.id='finding-confirmation';
 dialog.innerHTML='<h2>Confirm your answer on GitHub</h2><p>Copy this command and post it as a new PR comment. GitHub Actions verifies your write access and records your answer. Return here to see confirmation.</p><textarea readonly rows="4" aria-label="Review command"></textarea><p role="status">Your answer has not been recorded yet.</p><button type="button" data-copy>Copy command</button> <a target="_blank" rel="noopener">Open PR conversation</a> <button type="button" data-close>Close</button>';
 dialog.querySelector('textarea').value=commandText;
 dialog.querySelector('a').href=url;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(commandText);dialog.querySelector('[role=status]').textContent='Copied. Post the command on GitHub to confirm.';}catch(e){dialog.querySelector('textarea').select();dialog.querySelector('[role=status]').textContent='Select and copy the command above.';}};
 document.body.append(dialog);dialog.showModal();
}
root.codeIntentFindingReviews={command,targets,recorded,open};
if(typeof module!=='undefined')module.exports=root.codeIntentFindingReviews;
})(typeof window==='undefined'?globalThis:window);
