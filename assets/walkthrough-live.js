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
const dataPath=qs.get('data')||'';
const {ANALYSIS,REVIEW}=walkthroughPipeline;
const state={status:null,packet:null,summary:null,model:null,view:qs.get('view')==='review'?'review':'checks',selected:null,drafts:new Map(),submitted:new Map(),error:'',loadingArtifact:false};
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
  const packet=await loadJson(dataPath,1024*1024,null);if(!packet)return;
  if(packet.schema!=='intent-flow-view-v1'||!Array.isArray(packet.flows))throw Error('Unsupported CodeIntent artifact.');
  if(packet.repository!==repo||packet.head_commit!==sha)throw Error('Artifact identity differs from this pull request.');
  if(runId&&packet.simulation?.run_id!==runId)throw Error('Artifact belongs to another local run.');
  if(packet.source_diff?.status==='supplied'&&packet.source_diff.url){
   const patchUrl=new URL(packet.source_diff.url,new URL(dataPath,location.href)).href;
   packet.source_diff.content=await loadText(patchUrl,512*1024,packet.source_diff.sha256);
  }
  state.packet=packet;
  const ref=packet.objective_summary_artifact;
  if(ref){
   const summary=await loadJson(new URL(ref.url,new URL(dataPath,location.href)).href,262144,ref.sha256);
   if(summary){
    const identity=summary.identity||{};
    if(identity.repository!==repo||identity.head_commit!==sha||identity.baseline_commit!==packet.baseline_commit)throw Error('Semantic summary identity differs from this run.');
    state.summary=summary;
   }
  }
  state.model=codeIntentReviewModel(packet,state.summary||{},[],checks());
 }catch(error){state.error='Review evidence unavailable: '+error.message;}
 finally{state.loadingArtifact=false;render();}
}
async function poll(){
 try{
  if(!api||!repo||!sha)throw Error('This link is missing api, repo, or sha.');
  const response=await fetch(statusUrl(),{cache:'no-store'});if(!response.ok)throw Error('Status returned HTTP '+response.status+'.');
  state.status=await response.json();state.error='';
  if(state.packet)state.model=codeIntentReviewModel(state.packet,state.summary||{},[],checks());
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
  if(state.model&&!items().length)after='<div class="happy"><span class="face" aria-hidden="true">✓</span><h3>Behavior is unchanged</h3><p>The implementation changed, but no semantic change requiring a decision was established.</p></div>';
 }else{
  top=`<div class="merge-top"><span class="ic bad">!</span><div><h3>${verdict()==='VIOLATION'?'CodeIntent found a violation':'CodeIntent needs review'}</h3><p>${count?`${count} review item${count===1?'':'s'} from the completed checks.`:'The run could not establish an accepted outcome.'}</p></div></div>`;
  after=`<div class="violation-box"><h3>${count?`${count} review item${count===1?'':'s'}`:'Review evidence is incomplete'}</h3><p style="margin:0">${esc(count?'Open CodeIntent to review each behavior, rule finding, and test finding.':state.status?.reason||'Open CodeIntent to review the recorded evidence.')}</p><p style="margin:0"><button type="button" class="btn blue" data-act="open">Review in CodeIntent →</button></p></div>`;
 }
 return githubHead()+`<div class="merge">${top}${phaseRow('analysis',analysis)}${phaseRow('intent review',intent)}</div>${after}${provenance()}`;
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
 const status=answer==='yes'?(submitted?'Accepted · submitted':'Yes, I meant this'):answer==='no'?(submitted?'Investigating · submitted':'No, investigate'):'';
 const type=String(item.reviewType||'Behavior');
 return `<button type="button" class="row ${answer||''} ${submitted?'submitted':''}" data-row="${esc(item.id)}"><span class="t">${esc(item.summary)}</span><span class="row-side">${typeIcon(type)}${status?`<span class="st">${esc(status)}</span>`:''}</span></button>`;
}
function listScreen(){
 if(!state.model)return `<div class="ci">${ciTop()}<div class="loading">Waiting for the semantic review artifact…</div></div>`;
 const all=items();
 if(!all.length){
  if(state.model.confirmedNoChange)return `<div class="ci">${ciTop()}<div class="happy"><span class="face">✓</span><h3>Behavior is unchanged</h3><p>The implementation changed, but no semantic change requiring a decision was established.</p><button type="button" class="btn" data-act="checks">Back to checks</button></div></div>`;
  return `<div class="ci">${ciTop()}<div class="violation-box"><h3>Review evidence is unavailable</h3><p>${esc(state.status?.reason||'The analysis did not complete, so this view cannot determine whether behavior changed.')}</p><button type="button" class="btn" data-act="checks">Back to checks</button></div></div>`;
 }
 return `<div class="ci">${ciTop()}<h2>Review these changes</h2>
  <div class="rows">${state.model.changes.map(item=>row(item,'change')).join('')||'<div class="empty-list">No ungoverned behavioral changes need a decision.</div>'}</div>
  ${state.model.constraints.length?`<h2 style="margin-top:24px">Constraint violations</h2><div class="rows">${state.model.constraints.map(item=>row(item,'constraint')).join('')}</div>`:''}
  <div class="actions"><button type="button" class="btn blue" data-act="undo" ${state.drafts.size?'':'disabled'}>Undo All</button><button type="button" class="btn blue" data-act="submit" ${state.drafts.size?'':'disabled'}>Submit</button></div>${provenance()}</div>`;
}
function ciTop(){return `<div class="ci-top"><b>CodeIntent</b><a href="#" data-act="checks">← Pull request #${esc(pr||'—')}</a><span class="sp"></span><button type="button" class="btn" data-act="governance">Governance actions</button></div>`;}
function detailScreen(item){
 const answer=decision(item.id),intent=diffLines(intentLines(item.intentBefore),intentLines(item.intentAfter));
 const connections=item.connections?.length?`<div class="holon"><b>Connected governed outcomes</b><ul>${item.connections.map(connection=>`<li><b>${esc(connection.title)}</b> · ${esc(connection.detail)}</li>`).join('')}</ul></div>`:'';
 const resolution=item.resolution?`<div class="rule"><small>HOW TO RESOLVE IT</small><p>${esc(item.resolution)}</p></div>`:'';
 const interpretation=`<div class="summary"><small>${esc(item.groundingLabel||'RECORDED PIPELINE EVIDENCE')}</small><p>${esc(item.detailSummary||item.summary)}</p></div>`;
 const question='Did you mean this?';
 const yes='Yes, I meant this',no='No, investigate';
 return `<div class="ci">${ciTop()}<button type="button" class="back" data-act="list">← All changes</button><article class="tile">
  <div class="tile-head"><h3>${esc(item.title)}</h3>${typeIcon(item.reviewType||'Behavior')}</div>
  <div class="tile-sub"><code>${esc(item.method||short(item.file))}</code></div>
  ${item.objective?`<div class="rule"><small>ACCEPTED CONSTRAINT</small><p>${esc(item.objective)}</p></div>`:''}
  <div class="ba"><div><small>BEFORE</small>${esc(item.before)}</div><div class="after"><small>AFTER</small>${esc(item.after)}</div></div>
  ${interpretation}
  <div class="diffs ${intent.length?'':'source-only'}">${intent.length?`<div class="pane"><header><b>Intent</b><span>${esc(label(item.concept))}</span></header><pre>${lines(intent)}</pre></div>`:''}<div class="pane"><header><b>Code</b><span>${esc(short(item.file))}</span></header><pre>${lines(sourceLines(item))}</pre></div></div>
  ${resolution}${connections}
  ${item.status==='watch'?'<div class="ask"><b>No response required while this rule is under evaluation.</b></div>':`<div class="ask"><b>${esc(question)}</b><button type="button" class="choice yes" data-act="yes" aria-pressed="${answer==='yes'}">${esc(yes)}</button><button type="button" class="choice no" data-act="no" aria-pressed="${answer==='no'}">${esc(no)}</button></div>`}
 </article></div>`;
}
function provenance(){return `<p class="provenance">Pinned review <code>${esc((state.packet?.baseline_commit||'baseline pending').slice(0,12))}</code> → <code>${esc((sha||'candidate pending').slice(0,12))}</code>${state.status?.updated_at?` · updated ${esc(state.status.updated_at)}`:''}</p>`;}
function render(){
 runContext.textContent=repo+(pr?' · Pull request #'+pr:'');
 const legacy=new URL('legacy-review.html',location.href);legacy.search=location.search;document.querySelector('#legacy-link').href=legacy.href;
 urlLabel.textContent=state.view==='checks'?`github.com/${repo||'repository'}/pull/${pr||'—'}/checks`:`codeintent.app/review/${repo||'repository'}/${pr||'—'}${state.selected?'/'+state.selected:''}`;
 document.title=`CodeIntent · ${repo||'review'}${pr?' #'+pr:''}`;
 if(state.error&&!state.status&&!state.packet){screen.innerHTML=`<div class="error-box"><b>CodeIntent could not load this run.</b><p>${esc(state.error)}</p><p><a href="/">Return to local PR runs</a></p></div>`;return;}
 if(state.view==='checks')screen.innerHTML=checksScreen();
 else if(state.selected){const item=items().find(value=>value.id===state.selected);screen.innerHTML=item?detailScreen(item):listScreen();}
 else screen.innerHTML=listScreen();
}

document.addEventListener('click',event=>{
 const target=event.target.closest('button,a,[data-row]');if(!target)return;
 const action=target.dataset.act;
 if(action==='open'){state.view='review';state.selected=null;render();}
 else if(action==='checks'){event.preventDefault();state.view='checks';state.selected=null;render();}
 else if(action==='list'){state.selected=null;render();}
 else if(target.dataset.row){state.view='review';state.selected=target.dataset.row;render();scrollTo(0,0);}
 else if(action==='yes'||action==='no'){state.drafts.set(state.selected,action);state.selected=null;render();}
 else if(action==='undo'){state.drafts.clear();render();}
 else if(action==='governance')window.codeIntentGovernanceActions.open({repo,pr,sha,responses:[]});
 else if(action==='submit'){
  const responses=[];
  for(const [id,value] of state.drafts){
   state.submitted.set(id,value);
   const item=items().find(candidate=>candidate.id===id)||{};
   responses.push({id,decision:value,summary:item.summary||item.title||'',type:item.reviewType||'Behavior'});
  }
  state.drafts.clear();render();
  window.codeIntentGovernanceActions.open({repo,pr,sha,responses});
 }
});
document.querySelector('#governance-actions').addEventListener('click',()=>window.codeIntentGovernanceActions.open({repo,pr,sha,responses:[]}));
const theme=document.querySelector('#theme');
function setTheme(value){document.documentElement.dataset.theme=value;theme.textContent=value==='dark'?'Light':'Dark';}
setTheme(localStorage.getItem('codeintent-theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
theme.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('codeintent-theme',next);setTheme(next);});
render();poll();
})();
