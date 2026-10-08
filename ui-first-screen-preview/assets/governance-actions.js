/* Secure handoff from static GitHub Pages to protected GitHub Actions. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.codeIntentGovernanceActions=api;api.init();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const WORKFLOWS={
  rules:'update-governance-rule.yml',
  baseline:'update-baseline.yml',
  semantic:'update-semantic-baseline.yml'
 };
 let context={repo:'',pr:'',sha:'',responses:[]};

 function repository(value){
  const repo=String(value||'').trim();
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)?repo:'';
 }
 function workflowUrl(repo,workflow){
  const safe=repository(repo);
  if(!safe||!Object.values(WORKFLOWS).includes(workflow))return '';
  return `https://github.com/${safe}/actions/workflows/${workflow}`;
 }
 function reviewContext(value){
  const safeRepo=repository(value.repo);
  return JSON.stringify({
   repository:safeRepo,
   pull_request:String(value.pr||''),
   head_commit:String(value.sha||''),
   responses:Array.isArray(value.responses)?value.responses.map(item=>({
    id:String(item.id||''),
    decision:item.decision==='yes'?'accepted':'investigate',
    summary:String(item.summary||''),
    type:String(item.type||'Behavior')
   })):[]
  },null,2);
 }
 function markup(){
  return `<dialog class="governance-dialog" id="governance-actions-dialog" aria-labelledby="governance-actions-title">
   <form method="dialog" class="governance-card">
    <header><div><h2 id="governance-actions-title">Governance actions</h2><p>GitHub Pages never receives an API key. It hands reviewed input to a protected GitHub Actions workflow, where the environment supplies the secret.</p></div><button class="dialog-close" value="close" aria-label="Close">×</button></header>
    <section>
     <h3>Governed rule lifecycle</h3>
     <p>Copy the PR review context for traceability, then open the rule workflow. Choose author, validate, approve, or activate and enter the command arguments reviewed for that lifecycle step.</p>
     <label for="governance-review-context">PR review context</label>
     <textarea id="governance-review-context" readonly></textarea>
     <div class="governance-buttons"><button type="button" class="btn" data-governance-copy>Copy review context</button><a class="btn blue" data-governance-workflow="rules" target="_blank" rel="noopener">Open protected rule Action</a></div>
    </section>
    <section>
     <h3>Accepted baseline</h3>
     <p>Baseline publication also runs in protected Actions. Use the workflow baseline for merged workflow changes, or the semantic baseline for a reviewed PR candidate.</p>
     <div class="governance-buttons"><a class="btn" data-governance-workflow="baseline" target="_blank" rel="noopener">Update workflow baseline</a><a class="btn" data-governance-workflow="semantic" target="_blank" rel="noopener">Review semantic baseline</a></div>
    </section>
    <p class="governance-status" data-governance-status aria-live="polite"></p>
   </form>
  </dialog>`;
 }
 function refresh(){
  const area=document.querySelector('#governance-review-context');if(area)area.value=reviewContext(context);
  for(const link of document.querySelectorAll('[data-governance-workflow]')){
   const url=workflowUrl(context.repo,WORKFLOWS[link.dataset.governanceWorkflow]);
   if(url){link.href=url;link.removeAttribute('aria-disabled');}else{link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
  }
 }
 async function copy(){
  const status=document.querySelector('[data-governance-status]');
  try{await navigator.clipboard.writeText(reviewContext(context));status.textContent='Review context copied. Paste it into the workflow review record or PR discussion.';}
  catch{status.textContent='Clipboard access was unavailable. Select and copy the review context above.';}
 }
 function open(value){
  context={...context,...value};refresh();
  const dialog=document.querySelector('#governance-actions-dialog');
  if(dialog&&!dialog.open)dialog.showModal();
 }
 function init(){
  if(document.querySelector('#governance-actions-dialog'))return;
  document.body.insertAdjacentHTML('beforeend',markup());
  document.querySelector('[data-governance-copy]').addEventListener('click',copy);
  const params=new URLSearchParams(location.search);
  context={repo:params.get('repo')||'',pr:params.get('pr')||'',sha:params.get('sha')||'',responses:[]};
  refresh();
 }
 return {WORKFLOWS,repository,workflowUrl,reviewContext,init,open};
});
