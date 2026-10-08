/* Live implementation of docs/ui-designs/review-walkthrough/codeintent-review-walkthrough.html. */
(function(){
'use strict';
const qs=new URLSearchParams(location.search);
const screen=document.querySelector('#screen');
const runContext=document.querySelector('#run-context');
const urlLabel=document.querySelector('#url');
const repo=qs.get('repo')||'';
const sha=qs.get('sha')||'';
const pr=qs.get('pr')||'';
const runId=qs.get('run_id')||'';
const api=(qs.get('api')||'').replace(/\/+$/,'');
let dataPath=qs.get('data')||'';
const {ANALYSIS,REVIEW}=walkthroughPipeline;
const state={status:null,packet:null,summary:null,model:null,view:qs.get('view')==='review'?'review':'checks',selected:null,explore:false,tab:'graph',node:null,full:false,evidenceFile:'',methods:{},drafts:new Map(),submitted:new Map(),error:'',loadingArtifact:false};
let pollTimer=null;

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const short=value=>String(value||'').split('/').pop();
const label=value=>String(value||'').replace(/^FTGO-/,'').replaceAll('_',' ').replaceAll('-',' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
const checks=()=>state.status?.checks||state.status?.stages||[];
const items=()=>state.model?[...state.model.changes,...state.model.constraints]:[];
const decision=id=>state.drafts.get(id)||state.submitted.get(id)||'';

function statusUrl(){
 const base=/\/status$/.test(api)?api:api+'/status';
 return base+'?'+new URLSearchParams({sha,repo,...(runId?{run_id:runId}:{})});
}
function trusted(url){
 if(url.origin===location.origin)return true;
 try{return api&&url.origin===new URL(api,location.href).origin;}catch{return false;}
}
async function loadJson(reference,maxBytes,digest){
 const url=new URL(reference,location.href);if(!trusted(url))throw Error('Artifact URL is outside the configured pipeline origin.');
 const response=await fetch(url,{cache:'no-store'});if(response.status===202)return null;
 if(!response.ok)throw Error('Artifact returned HTTP '+response.status+'.');
 const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>maxBytes)throw Error('Artifact exceeds the review size limit.');
 if(digest&&await reviewSha256(bytes)!==digest)throw Error('Artifact checksum differs from the pinned run.');
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function loadText(reference,maxBytes,digest){
 const url=new URL(reference,location.href);if(!trusted(url))throw Error('Artifact URL is outside the configured pipeline origin.');
 const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Artifact returned HTTP '+response.status+'.');
 const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>maxBytes)throw Error('Artifact exceeds the review size limit.');
 if(digest&&await reviewSha256(bytes)!==digest)throw Error('Artifact checksum differs from the pinned run.');
 return new TextDecoder().decode(bytes);
}
async function loadArtifacts(){
 if(state.loadingArtifact||state.packet||!dataPath)return;
 state.loadingArtifact=true;
 try{
  const reference=state.status?.review_artifact;
  const digest=reference?.name==='intent-flow.json'?reference.sha256:null;
  const packet=await loadJson(dataPath,1024*1024,digest);if(!packet)return;
  if(packet.schema!=='intent-flow-view-v1'||!Array.isArray(packet.flows))throw Error('Unsupported CodeIntent artifact.');
  if(packet.repository!==repo||packet.head_commit!==sha)throw Error('Artifact identity differs from this pull request.');
  if(runId&&packet.simulation?.run_id!==runId)throw Error('Artifact belongs to another local run.');
  if(packet.source_diff?.status==='supplied'&&packet.source_diff.url){
   const patchUrl=new URL(packet.source_diff.url,new URL(dataPath,location.href)).href;
   packet.source_diff.content=await loadText(patchUrl,512*1024,packet.source_diff.sha256);
  }
  packet.explorer={
   terrain:packet.governed_objectives?.territory,
   governance:packet.governed_objectives?.holon_map?{holon_map:packet.governed_objectives.holon_map}:undefined,
   workflows:packet.governed_objectives?.customer_workflows,
   impact:packet.intent_impact,
   results:{checks:checks()}
  };packet.explorer_errors=[];
  const explorerReferences={
   terrain:packet.governed_objectives?.territory_artifact,
   governance:packet.governed_objectives?.holon_map_artifact,
   workflows:packet.governed_objectives?.customer_workflow_artifact,
   impact:packet.intent_impact_artifact,
   ...(packet.explorer_artifacts||{})
  };
  await Promise.all(Object.entries(explorerReferences).filter(([,ref])=>ref?.url).map(async ([key,ref])=>{
   try{
    const detail=await loadJson(new URL(ref.url,new URL(dataPath,location.href)).href,4*1024*1024,ref.sha256);
    if(!detail)throw Error('Evidence is still being prepared');
    const identity=detail.identity||detail;
    if(identity.baseline_commit!==packet.baseline_commit||(key!=='terrain'&&identity.head_commit!==packet.head_commit)||(key==='terrain'&&identity.head_commit&&identity.head_commit!==packet.head_commit))throw Error('Evidence revision mismatch');
    if(identity.repository&&identity.repository!==repo)throw Error('Evidence repository mismatch');
    packet.explorer[key]=detail;
   }catch(error){packet.explorer_errors.push(key+': '+error.message);}
  }));
  packet.explorer.results={checks:checks()};state.packet=packet;
  const ref=packet.objective_summary_artifact;
  if(ref){
   const summary=await loadJson(new URL(ref.url,new URL(dataPath,location.href)).href,262144,ref.sha256);
   if(summary){
    const identity=summary.identity||{};
    if(identity.repository!==repo||identity.head_commit!==sha||identity.baseline_commit!==packet.baseline_commit)throw Error('Semantic summary identity differs from this run.');
    state.summary=summary;
   }
  }
  state.model=reviewExplorer.enrich(codeIntentReviewModel(packet,state.summary||{},[],checks()),packet,state.summary,checks());
 }catch(error){state.error='Review evidence unavailable: '+error.message;}
 finally{state.loadingArtifact=false;render();}
}
async function poll(){
 try{
  if(!api||!repo||!sha)throw Error('This link is missing api, repo, or sha.');
  const response=await fetch(statusUrl(),{cache:'no-store'});if(!response.ok)throw Error('Status returned HTTP '+response.status+'.');
  state.status=await response.json();state.error='';
  const reference=state.status?.review_artifact;
  if(!dataPath&&reference?.schema==='review-artifact-reference-v1'&&reference.name==='intent-flow.json'){
   const artifact=new URL(statusUrl());artifact.searchParams.set('detail','review-artifact');artifact.searchParams.set('name',reference.name);dataPath=artifact.href;
  }
  if(state.packet){state.packet.explorer.results={checks:checks()};state.model=reviewExplorer.enrich(codeIntentReviewModel(state.packet,state.summary||{},[],checks()),state.packet,state.summary,checks());}
  else await loadArtifacts();
 }catch(error){state.error='Live pipeline unavailable: '+error.message;}
 render();
 if(!state.status||state.status.state!=='completed')pollTimer=setTimeout(poll,1500);
}

function iconFor(value){return value.state==='passed'?'<span class="dot ok">✓</span>':value.state==='error'?'<span class="dot bad">!</span>':'<span class="dot run"></span>';}
function badgeFor(value){return value.state==='passed'?'<span class="verdict pass">PASS</span>':value.state==='error'?'<span class="verdict violation">REVIEW</span>':'';}
function phaseRow(name,value){return `<div class="check" data-phase="${esc(name)}">${iconFor(value)}<span><b>CodeIntent / ${esc(name)}</b><small aria-live="polite">${esc(value.line)}</small></span>${badgeFor(value)}</div>`;}
function verdict(){return state.status?.verdict||'';}
function githubHead(){
 const branch=sha.slice(0,12)||'candidate';
 return `<div class="gh-head"><h1>Review FTGO changes <span>#${esc(pr||'—')}</span></h1>
  <div class="gh-meta"><span class="pill">Open</span><span><b>${esc(repo.split('/')[0]||'repository owner')}</b> wants to merge into <code>main</code> from <code>${esc(branch)}</code></span></div>
  <div class="tabs"><span>Conversation</span><span>Commits</span><span class="on">Checks</span><span>Files changed</span></div></div>`;
}
function checksScreen(){
 const analysis=walkthroughPipeline.phase(checks(),ANALYSIS,'Waiting for source analysis');
 const intent=analysis.state==='running'?{state:'pending',line:'Waiting for CodeIntent / analysis'}:walkthroughPipeline.phase(checks(),REVIEW,'Waiting for intent review');
 const completed=state.status?.state==='completed';
 const count=items().length;
 let top,after='';
 if(!completed)top='<div class="merge-top"><span class="ic run">…</span><div><h3>Some checks haven’t completed yet</h3><p>CodeIntent is evaluating this revision.</p></div></div>';
 else if(verdict()==='PASS'&&!count){
  top='<div class="merge-top"><span class="ic ok">✓</span><div><h3>All checks have passed</h3><p>2 successful CodeIntent checks</p></div></div>';
  if(state.model?.noGovernedChanges)after='<div class="happy"><span class="face" aria-hidden="true">✓</span><h3>No governed changes require review</h3><p>Analysis passed. No governed behavior changes were selected for review.</p></div>';
  else if(state.model?.semanticStatus==='no_changes'&&!items().length)after='<div class="happy"><span class="face" aria-hidden="true">✓</span><h3>Behavior is unchanged</h3><p>The implementation changed, but no semantic change requiring a decision was established.</p></div>';
 }else{
  top=`<div class="merge-top"><span class="ic bad">!</span><div><h3>${verdict()==='VIOLATION'?'CodeIntent found a violation':'CodeIntent needs review'}</h3><p>${count?`${count} review item${count===1?'':'s'} from the completed checks.`:'The run could not establish an accepted outcome.'}</p></div></div>`;
  after=`<div class="violation-box"><h3>${count?`${count} review item${count===1?'':'s'}`:'Review evidence is incomplete'}</h3><p style="margin:0">${esc(count?'Open CodeIntent to review each behavior, rule finding, and test finding.':state.status?.reason||'Open CodeIntent to review the recorded evidence.')}</p><p style="margin:0"><button type="button" class="btn blue" data-act="open">Review in CodeIntent →</button></p></div>`;
 }
 if(completed&&verdict()==='PASS'&&state.status?.acceptance?.mode==='enforce'&&state.status.acceptance.status!=='ready')top=top.replace('All checks have passed','Analysis passed').replace('2 successful CodeIntent checks','Governance acceptance is reported separately below.');
 return githubHead()+`<div class="merge">${top}${phaseRow('analysis',analysis)}${phaseRow('intent review',intent)}</div>${after}${acceptanceNotice()}${provenance()}`;
}

function intentLines(value){
 const lines=[];
 for(const entry of Array.isArray(value)?value:[value])for(const fact of entry?.facts||[]){
  if(typeof fact!=='string'){lines.push(JSON.stringify(fact));continue;}
  const start=fact.indexOf('{');if(start<0){lines.push(fact);continue;}
  let slots;try{slots=JSON.parse(fact.slice(start));}catch{lines.push(fact);continue;}
  lines.push(fact.slice(0,start).trim().replaceAll('_',' '));
  if(slots.slot&&Object.hasOwn(slots,'value'))lines.push(`  ${slots.slot} := ${typeof slots.value==='string'?slots.value:JSON.stringify(slots.value)}`);
  else for(const [key,item] of Object.entries(slots))lines.push(`  ${key}: ${Array.isArray(item)?item.join(' | '):typeof item==='string'?item:JSON.stringify(item)}`);
 }
 return lines;
}
function diffLines(before,after){return [...before.map(text=>['-',text]),...after.map(text=>['+',text])];}
function sourceLines(item){
 const before=String(item.comparison?.before?.text||'Source comparison was not supplied.').split('\n');
 const after=String(item.comparison?.after?.text||'Source comparison was not supplied.').split('\n');
 return diffLines(before,after);
}
function lines(rows){return rows.map(([mark,text])=>`<span class="${mark==='+'?'a':mark==='-'?'d':''}">${esc((mark||' ')+' '+text)}</span>`).join('');}
function typeIcon(value){
 const type=['Bug','Architecture','Test','Standard','Business','Behavior'].includes(value)?value:'Behavior';
 const paths={
  Bug:'<path d="M9 4h6M10 7V5m4 2V5M7 11H4m3 4H4m16-4h-3m3 4h-3M8 9c0-2 1.8-3 4-3s4 1 4 3v6c0 2.5-1.8 4-4 4s-4-1.5-4-4V9Zm0 3h8"/>',
  Architecture:'<path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM9 14h6v6H9v-6ZM7 10v2h5m5-2v2h-5v2"/>',
  Test:'<path d="M9 3h6m-5 0v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/>',
  Standard:'<path d="M7 3h10v18H7V3Zm3 4h4m-4 4h4m-4 4h4"/>',
  Business:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 6-6"/>',
  Behavior:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 6h8M7 8l4 8m6-8-4 8"/>'
 };
 return `<span class="type-icon type-${type.toLowerCase()}" title="${type}" aria-label="${type}"><svg viewBox="0 0 24 24" aria-hidden="true">${paths[type]}</svg></span>`;
}
function row(item,kind){
 const answer=decision(item.id),submitted=state.submitted.has(item.id);
 const status=item.status==='unknown'?'Cannot be established':answer==='yes'?(submitted?'Expected · handed off':'Yes, I meant this'):answer==='no'?(submitted?'Investigating · handed off':'No, investigate'):'';
 const type=String(item.reviewType||'Behavior');
 return `<button type="button" class="row ${answer||''} ${submitted?'submitted':''}" data-row="${esc(item.id)}"><span class="t"><b>${esc(item.title||item.summary)}</b><small class="meta">${esc(item.concept||item.file||item.groundingLabel||'Recorded review evidence')}${item.objective?' · accepted constraint':''}</small></span><span class="row-side"><span class="type-name">${esc(type)}</span>${typeIcon(type)}${status?`<span class="st">${esc(status)}</span>`:''}</span></button>`;
}
function coverage(){return reviewExplorer.coverage(state.packet,state.summary,checks());}
function saveBar(){return `<div class="actions rx-save"><span>${state.drafts.size} staged assessment${state.drafts.size===1?'':'s'} · governance changes are handed to protected GitHub Actions.</span><button type="button" class="btn" data-act="undo" ${state.drafts.size?'':'disabled'}>Discard staged</button><button type="button" class="btn blue" data-act="submit" ${state.drafts.size?'':'disabled'}>Continue to governance actions</button></div>`;}
function listScreen(){
 if(!state.model)return `<div class="ci">${ciTop()}<div class="loading">Waiting for recorded review evidence…</div></div>`;
 const all=items(),unknown=all.filter(i=>i.status==='unknown').length;
 const complete=(state.model.semanticStatus==='no_changes'||state.model.noGovernedChanges)&&verdict()==='PASS';
 const empty=complete?'No change to evaluated governed behavior was established.':'Review evidence is incomplete. An empty list does not establish unchanged behavior.';
 return `<div class="ci">${ciTop()}<h2>Review these changes</h2><p class="review-lede">Review the recorded behavior changes and their supporting evidence.</p>
 ${!all.length?(complete?'<div class="happy"><span class="face" aria-hidden="true">✓</span><h3>No governed changes require review</h3><p>Analysis passed. No review response is needed for this change.</p></div>':`<p class="empty-list">${empty}</p>`):''}${acceptanceNotice()}
 ${[['change','Behavioral review tiles'],['constraint','Constraint violation tiles']].map(([kind,title])=>{const group=all.filter(i=>i.status!=='unknown'&&i.kind===kind);return `<h3 class="review-section-title">${title} · ${group.length}</h3><div class="rows">${group.length?group.map(i=>row(i,kind)).join(''):'<p class="empty-list">No established items in this group.</p>'}</div>`;}).join('')}
 ${unknown?`<details class="rx-coverage review-gaps"><summary><b>Analysis coverage · ${unknown} unresolved items</b></summary><p>These are incomplete analyses or unresolved evidence, not established findings. They cannot be assessed as expected.</p>${all.filter(i=>i.status==='unknown').map(i=>row(i,'unknown')).join('')}</details>`:''}${coverage()}<details class="rx-coverage"><summary><b>Governance model for this PR</b> · workflows, obligations and method evidence</summary>${reviewExplorer.governanceCatalog(state.packet)}</details>${saveBar()}${provenance()}</div>`;
}
function ciTop(){return `<div class="ci-top"><b>CodeIntent</b><a href="#" data-act="checks">← Pull request #${esc(pr||'—')}</a><span class="sp"></span><button type="button" class="btn" data-act="checks">Pipeline checks</button></div>`;}
function detailScreen(item){
 const answer=decision(item.id),intent=diffLines(intentLines(item.intentBefore),intentLines(item.intentAfter));
 const connections=item.connections?.length?`<div class="holon"><b>Connected governed outcomes</b><ul>${item.connections.map(connection=>`<li><b>${esc(connection.title)}</b> · ${esc(connection.detail)}</li>`).join('')}</ul></div>`:'';
 const resolution=item.resolution?`<div class="rule"><small>HOW TO RESOLVE IT</small><p>${esc(item.resolution)}</p></div>`:'';
 const interpretation=`<div class="summary"><small>${esc(item.groundingLabel||'RECORDED PIPELINE EVIDENCE')}</small><p>${esc(item.detailSummary||item.summary)}</p></div>`;
 const question='Did you mean this?';
 const yes='Yes, I meant this',no='No, investigate';
 return `<div class="ci">${ciTop()}<button type="button" class="back" data-act="list">← All changes</button><article class="tile">
  <div class="tile-head"><h3>${esc(item.title)}</h3><span class="tile-type">${esc(item.reviewType||'Behavior')}${typeIcon(item.reviewType||'Behavior')}</span></div>
  <div class="tile-sub"><code>${esc(item.method||short(item.file))}</code></div>
  ${item.objective?`<div class="rule"><small>ACCEPTED CONSTRAINT</small><p>${esc(item.objective)}</p></div>`:item.concept?`<div class="rule boundary-context"><small>RECORDED REVIEW CONTEXT</small><p>${esc(item.concept)}</p></div>`:''}
  <div class="ba"><div><small>BEFORE</small>${esc(item.before)}</div><div class="after"><small>WITH THIS PR</small>${esc(item.after)}</div></div>
  ${interpretation}
  <div class="diffs">
   <section class="pane"><header><b>Intent</b><span>${esc(label(item.concept))}</span></header>${intent.length?`<pre>${lines(intent)}</pre>`:'<p class="evidence-empty">No intent comparison recorded for this item.</p>'}</section>
   <section class="pane"><header><b>Code</b><span>${esc(short(item.file))}</span></header>${item.comparison?.before?.text!=null&&item.comparison?.after?.text!=null?`<pre>${lines(sourceLines(item))}</pre>${item.comparison.complete?'':'<p class="evidence-empty">Recorded source excerpt; open more evidence for context.</p>'}`:'<p class="evidence-empty">No source comparison recorded for this item. Check the source evidence view for available patches.</p>'}</section>
  </div>
  <div class="compact-evidence"><button type="button" class="btn" data-act="explore" aria-expanded="${state.explore}" aria-controls="recorded-evidence">${state.explore?'Hide recorded evidence':'More recorded evidence'}</button>${state.explore?`<div id="recorded-evidence">${resolution}${connections}${reviewExplorer.pane(item,state.packet,state.summary,checks(),{tab:state.tab,node:state.node,full:state.full,file:state.evidenceFile,methods:state.methods})}</div>`:''}</div>
  ${item.status==='unknown'?'<div class="ask"><b>Cannot be established. Review the analysis gap; assessments are unavailable.</b></div>':item.status==='watch'?'<div class="ask"><b>No response required while this rule is under evaluation.</b></div>':`<div class="ask"><b>${esc(question)}</b><button type="button" class="choice yes" data-act="yes" aria-pressed="${answer==='yes'}">${esc(yes)}</button><button type="button" class="choice no" data-act="no" aria-pressed="${answer==='no'}">${esc(no)}</button></div>`}
 ${saveBar()}</article></div>`;
}
function acceptanceNotice(){
 const a=state.status?.acceptance;
 if(a?.mode!=='enforce'||a.status==='ready')return '';
 return `<div class="notice"><b>Governance acceptance: ${esc(a.status||'unavailable')}</b><p>${esc(a.reason||'Acceptance is not ready.')}</p><p>This is separate from the source-analysis result.</p></div>`;
}
function provenance(){return `<p class="provenance">Pinned review <code>${esc((state.packet?.baseline_commit||'baseline pending').slice(0,12))}</code> → <code>${esc((sha||'candidate pending').slice(0,12))}</code>${state.status?.updated_at?` · updated ${esc(state.status.updated_at)}`:''}</p>`;}
function render(){
 runContext.textContent=repo+(pr?' · Pull request #'+pr:'');
 urlLabel.textContent=state.view==='checks'?`github.com/${repo||'repository'}/pull/${pr||'—'}/checks`:`codeintent.app/review/${repo||'repository'}/${pr||'—'}${state.selected?'/'+state.selected:''}`;
 document.title=`CodeIntent · ${repo||'review'}${pr?' #'+pr:''}`;
 if(state.error&&!state.status&&!state.packet){screen.innerHTML=`<div class="error-box"><b>CodeIntent could not load this run.</b><p>${esc(state.error)}</p><p><a href="/">Return to local PR runs</a></p></div>`;return;}
 if(state.view==='checks')screen.innerHTML=checksScreen();
 else if(state.selected){const item=items().find(value=>value.id===state.selected);screen.innerHTML=item?detailScreen(item):listScreen();}
 else screen.innerHTML=listScreen();
 legacyMethodExplorer.hydrate();
}

document.addEventListener('click',event=>{
 const target=event.target.closest('button,a,[data-row],[data-node],[data-method-id],[data-method-service],input');if(!target)return;
 if(target.closest('.legacy-method-explorer'))return;
 const action=target.dataset.act;
 if(target.dataset.exTab){state.tab=target.dataset.exTab;render();document.querySelector('#rx-tab-'+state.tab)?.focus();return;}
 if(target.dataset.node){state.node=target.dataset.node;render();return;}
 if(action==='explore'){state.explore=!state.explore;render();return;}
 if(action==='graph-full'){state.full=!state.full;state.node=null;render();return;}

 if(action==='open'){state.view='review';state.selected=null;render();}
 else if(action==='checks'){event.preventDefault();state.view='checks';state.selected=null;render();}
 else if(action==='list'){state.selected=null;render();}
 else if(target.dataset.row){state.view='review';state.selected=target.dataset.row;state.explore=false;state.evidenceFile='';state.node=null;state.full=false;render();scrollTo(0,0);}
 else if(action==='yes'||action==='no'){const item=items().find(i=>i.id===state.selected);if(item&&item.status!=='unknown'&&item.status!=='watch')state.drafts.set(state.selected,action);render();}
 else if(action==='undo'){state.drafts.clear();render();}
 else if(action==='governance')window.codeIntentGovernanceActions.open({repo,pr,sha,responses:[]});
 else if(action==='submit'){
  const responses=[];
  for(const [id,value] of state.drafts){state.submitted.set(id,value);const item=items().find(candidate=>candidate.id===id)||{};responses.push({id,decision:value,summary:item.summary||item.title||'',type:item.reviewType||'Behavior'});}
  state.drafts.clear();render();window.codeIntentGovernanceActions.open({repo,pr,sha,responses});
 }
});
document.addEventListener('change',event=>{

 if(event.target.matches('[data-evidence-file]')){state.evidenceFile=event.target.value;state.node=null;render();document.querySelector('[data-evidence-file]')?.focus();}
});
document.addEventListener('keydown',event=>{
 if(event.target.matches('input,textarea,select')||event.ctrlKey||event.metaKey||event.altKey)return;
 if(event.target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const ts=[...document.querySelectorAll('[data-ex-tab]')],n=ts.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?ts.length-1:(n+(event.key==='ArrowRight'?1:-1)+ts.length)%ts.length;ts[next].click();return;}
 if(event.target.closest('[data-node]')&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.closest('[data-node]').dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
 if(state.view!=='review')return;
 if(['j','k'].includes(event.key)&&!state.selected){const rows=[...document.querySelectorAll('[data-row]')];const n=rows.indexOf(document.activeElement);rows[(n+(event.key==='j'?1:-1)+rows.length)%rows.length]?.focus();event.preventDefault();}
 if(state.selected&&['y','n'].includes(event.key)){document.querySelector(`[data-act="${event.key==='y'?'yes':'no'}"]`)?.click();event.preventDefault();}
});
legacyMethodExplorer.setRender(render);
document.querySelector('#governance-actions').addEventListener('click',()=>window.codeIntentGovernanceActions.open({repo,pr,sha,responses:[]}));
const theme=document.querySelector('#theme');
function setTheme(value){document.documentElement.dataset.theme=value;theme.textContent=value==='dark'?'Light':'Dark';}
setTheme(localStorage.getItem('codeintent-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
theme.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('codeintent-theme',next);setTheme(next);});
render();poll();
})();
