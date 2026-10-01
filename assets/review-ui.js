/* Shared presentation of fixture and generated findings. Responses are session-only. */
const reviewBoards = new Map();
const reviewViewState = new Map();
function reviewState(scope) {
  if (!reviewViewState.has(scope)) reviewViewState.set(scope, {filter:'needs',check:'all',owner:'all',responses:new Map()});
  return reviewViewState.get(scope);
}
function reviewResponseState(action) {
  return action === 'fix-submitted' ? 'Fix submitted · awaiting analysis' : action === 'context-supplied' ? 'Context supplied · awaiting analysis' : action === 'dispute' ? 'Disputed · awaiting review' : action === 'request-changes' ? 'Changes requested · awaiting author' : 'Response recorded · awaiting owner';
}
function reviewEntryStatus(e) { return e.status==='clear'?'No action needed':e.status==='gap'?'Evidence needed':'Action needed'; }
function reviewEntryActions(e) {
  if (e.status==='clear') return [];
  return e.status==='gap' ? [ ['context-supplied','Mark context supplied'], ['escalate','Request owner review'], ['dispute','Dispute finding'] ] : [ ['request-changes','Request changes'], ['fix-submitted','Mark fix submitted'], ['dispute','Dispute finding'] ];
}
function shortReviewSource(source){
 const text=source.label||'Source unavailable',parts=text.split('::');
 const file=parts[0].split('/').pop();
 return file+(source.symbol||parts[1]?' · '+(source.symbol||parts[1]):'');
}
function shortReviewRevision(value){return /^[0-9a-f]{40,64}$/i.test(value||'')?value.slice(0,12):value||'Not supplied';}
function reviewBoard(options) {
  reviewBoards.set(options.scope,options);
  const state=reviewState(options.scope), entries=options.entries;
  const counts={needs:0,awaiting:0,clear:0};
  for(const e of entries) counts[e.status==='clear'?'clear':state.responses.has(e.id)?'awaiting':'needs']++;
  const region=options.region||'all';
  const visible=entries.filter(e=>(region==='all'||e.region===region)&&(state.check==='all'||e.category===state.check)&&(state.owner==='all'||e.owner===state.owner)&&(state.filter==='all'||state.filter==='awaiting'&&state.responses.has(e.id)||state.filter==='needs'&&e.status!=='clear'&&!state.responses.has(e.id))).sort((a,b)=>({action:0,gap:1,clear:2}[a.status]??1)-({action:0,gap:1,clear:2}[b.status]??1));
  const checkOptions=[...new Set(entries.map(e=>e.category))],owners=[...new Set(entries.map(e=>e.owner).filter(x=>x&&x!=='Owner not supplied'))];
  return `<section data-review-scope="${esc(options.scope)}"><div class="review-board-head"><div><h2>${esc(options.title)}</h2><p>${esc(options.description||'')}</p></div></div><div class="review-revision"><b>Reviewed revision</b> <code title="${esc(options.head||'Not supplied')}">${esc(shortReviewRevision(options.head))}</code> <span>· ${esc(options.freshness||'Current head not supplied')}</span><details><summary>Baseline and run context</summary><p>Reviewed head <code>${esc(options.head||'Not supplied')}</code></p><p>Baseline <code>${esc(options.baseline||'Not supplied')}</code></p><p>${esc(options.qualification||'')}</p></details></div>${entries.some(e=>!e.owner||e.owner==='Owner not supplied')?'<p class="note">Review owners were not identified in this artifact. Assign them before recording an approval.</p>':''}<div class="review-triage" aria-label="Review filters">${[['needs',counts.needs+' need action'],['awaiting',counts.awaiting+' awaiting others'],['all','All '+entries.length+' · '+counts.clear+' no action']].map(([id,label])=>`<button data-review-filter="${id}" aria-pressed="${state.filter===id}" class="${state.filter===id?'selected':''}">${esc(label)}</button>`).join('')}<label>Check <select data-review-check><option value="all">All checks</option>${checkOptions.map(x=>`<option ${state.check===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>${owners.length?`<label>Owner <select data-review-owner><option value="all">All owners</option>${owners.map(x=>`<option ${state.owner===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`:''}</div><p class="note">Response buttons record your response; analysis or owner review is still pending.</p><div class="review-board">${visible.map(e=>reviewEntryTile(e,options,state)).join('')}</div>${visible.length?'':`<div class="card"><div class="body"><p>No items match these filters. Choose All to include items awaiting others and changes with no action needed.</p></div></div>`}<p class="note">Responses are recorded for this browser session. A fix becomes verified only after new analysis; responses do not clear CI checks or change the baseline.</p></section>`;
}
function reviewEntryTile(e,options,state) {
  const response=state.responses.get(e.id);
  const color=e.status==='clear'?'green':e.status==='gap'?'amber':'red';
  const concept=e.concept&&!e.title.includes(e.concept)?e.concept.replaceAll('_',' '):'';
  const context=[concept,e.owner&&e.owner!=='Owner not supplied'?e.owner:''].filter(Boolean);
  const supporting=[...new Set(e.checks||[])].filter(x=>x.toLowerCase()!==e.category.toLowerCase());
  return `<article class="review-result ${e.status==='gap'?'evidence':e.status==='clear'?'pass':'intent'}" data-review-id="${esc(e.id)}" data-packet-id="${esc(e.id)}" data-regions="${esc(e.region)}"><div class="result-head"><h3>${esc(e.category)}</h3><span class="pill ${color}">${esc(reviewEntryStatus(e))}</span></div><div class="result-body"><button class="result-path source-button" data-review-source="${esc(e.id)}" title="${esc(e.source.label)} · Inspect source evidence">${esc(shortReviewSource(e.source))}</button><h4>${esc(e.title)}</h4>${context.length?`<p class="note">${esc(context.join(' · '))}</p>`:''}${e.before!==undefined?`<p class="delta-caption">${esc(e.deltaLabel||'Baseline → This revision')}</p><div class="mini-diff"><div class="del">− ${esc(e.before)}</div><div class="add">+ ${esc(e.after)}</div></div>`:''}${e.summary?`<p><b>Why review:</b> ${esc(e.summary)}</p>`:''}<p><b>Next step:</b> ${esc(e.nextStep)}</p>${supporting.length?`<div class="review-check-tags"><span class="note">Also detected by</span>${supporting.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>`:''}<details class="result-details"><summary>Checks, policy and connected evidence</summary>${e.details||'<p>No additional evidence supplied.</p>'}</details>${response?`<div class="result-actions"><div class="response-state"><b>${esc(reviewResponseState(response.action))}</b><small>${esc(response.label)} · ${esc(response.at)}<br>Revision ${esc(response.head||'not supplied')} · original finding remains open</small></div><button data-review-undo="${esc(e.id)}">Undo response</button></div>`:e.status==='clear'?'<p class="note">No response required.</p>':`<div class="result-actions">${reviewEntryActions(e).map(([action,label])=>`<button data-review-action="${action}" data-entry-id="${esc(e.id)}">${esc(label)}</button>`).join('')}</div>`}</div></article>`;
}
function reviewSourceDialog() {
  let dialog=document.querySelector('#review-source-dialog');
  if(!dialog){dialog=document.createElement('dialog');dialog.id='review-source-dialog';document.body.append(dialog);}
  return dialog;
}
async function openReviewSource(options,entry){
  const dialog=reviewSourceDialog();
  dialog.innerHTML='<button data-source-close>Close</button><p>Loading source evidence…</p>';
  dialog.showModal();
  try {
    const data=await options.sourceDetails(entry);
    if(!dialog.open)return;
    const patch=data.patch;
    dialog.innerHTML=`<div class="source-dialog-head"><h2>Source evidence</h2><button data-source-close>Close</button></div><p style="overflow-wrap:anywhere"><code>${esc(entry.source.label)}</code></p><p class="note">${esc(options.baseline||'Unknown baseline')} → ${esc(options.head||'Unknown revision')}</p><p>${esc(data.message||'')}</p>${patch?`<pre class="source-patch">${patch.split('\n').map(line=>`<span class="${line.startsWith('+')?'add':line.startsWith('-')?'del':''}">${esc(line)}</span>`).join('\n')}</pre>`:''}${data.evidence?`<pre>${esc(data.evidence)}</pre>`:''}<p class="note">${esc(entry.source.qualification||'Exact source lines are not supplied.')}</p>`;
  } catch(error){dialog.innerHTML=`<button data-source-close>Close</button><p>Source evidence unavailable: ${esc(error.message)}</p>`;}
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-source-close]')){reviewSourceDialog().close();return;}
  const button=e.target.closest('button');if(!button)return;
  const section=button.closest('[data-review-scope]');if(!section)return;
  const options=reviewBoards.get(section.dataset.reviewScope);if(!options)return;
  const state=reviewState(options.scope);
  if(button.dataset.reviewFilter){state.filter=button.dataset.reviewFilter;render();return;}
  if(button.dataset.reviewSource){const entry=options.entries.find(x=>x.id===button.dataset.reviewSource);if(entry)openReviewSource(options,entry);return;}
  if(button.dataset.reviewAction){state.responses.set(button.dataset.entryId,{action:button.dataset.reviewAction,label:button.textContent,at:new Date().toLocaleTimeString(),head:options.head});render();return;}
  if(button.dataset.reviewUndo){state.responses.delete(button.dataset.reviewUndo);render();}
});
document.addEventListener('change',e=>{
  const section=e.target.closest('[data-review-scope]');if(!section)return;
  const state=reviewState(section.dataset.reviewScope);
  if(e.target.matches('[data-review-check]'))state.check=e.target.value;
  else if(e.target.matches('[data-review-owner]'))state.owner=e.target.value;
  else return;
  render();
});
function reviewResponseHistory(scope){
 const state=reviewState(scope),options=reviewBoards.get(scope),byId=new Map((options?.entries||[]).map(e=>[e.id,e]));
 return `<article class="card"><div class="body"><h2>Review responses</h2>${state.responses.size?[...state.responses].map(([id,r])=>`<div class="gate"><div><strong>${esc(byId.get(id)?.title||id)}</strong><small>${esc(reviewResponseState(r.action))}<br>${esc(r.label)} · ${esc(r.at)} · revision ${esc(r.head||'not supplied')}</small></div></div>`).join(''):'<p>No responses recorded for this review.</p>'}<p class="note">Session-only responses. No approvals, verified fixes or backend audit events are inferred.</p></div></article>`;
}
