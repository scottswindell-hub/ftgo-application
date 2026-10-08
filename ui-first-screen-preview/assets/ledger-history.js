(function(root){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function resolveHistoryRunId(packet, queryRunId, liveStatus){
  const packetRun=packet?.simulation?.run_id;
  if(typeof packetRun==='string'&&packetRun)return packetRun;
  if(typeof queryRunId==='string'&&queryRunId)return queryRunId;
  if(liveStatus?.repo===packet?.repository&&liveStatus?.sha===packet?.head_commit
      &&typeof liveStatus?.governance_run_id==='string'&&liveStatus.governance_run_id)return liveStatus.governance_run_id;
  return '';
 }
 function historyRequestParams({identity,runId,after={app:0,run:0,change:0},previous=null,append=false,local=false}){
  const params=local?{run_id:runId,after_app:String(after.app),after_run:String(after.run),after_change:String(after.change)}:
   {detail:'ledger-history',sha:identity.head_commit,repo:identity.application,run_id:runId,after_app:String(after.app),after_run:String(after.run),after_change:String(after.change)};
  if(append&&previous){
   if(previous.application_governance?.next===null)params.skip_app='1';
   if(previous.current_pr_activity?.next===null)params.skip_run='1';
   if(previous.linked_change_activity?.state!=='unlinked'&&previous.linked_change_activity?.next===null)params.skip_change='1';
  }
  return params;
 }
 async function fetchLedgerHistoryPage(fetcher,url,expected){
  const response=await fetcher(url,{cache:'no-store'});if(!response.ok)throw Error('Ledger history is unavailable for this pinned run.');
  const bytes=await response.arrayBuffer();if(bytes.byteLength>131072)throw Error('Ledger history view exceeds 128 KiB.');
  const page=JSON.parse(new TextDecoder().decode(bytes));
  if(page.schema!=='governance-history-view-v1'||page.identity?.run_id!==expected.run_id||page.identity?.head_commit!==expected.head_commit||page.identity?.baseline_commit!==expected.baseline_commit||page.identity?.application!==expected.application||page.source?.kind!=='governance_ledger'||page.source?.read_only!==true)throw Error('Ledger history identity differs from this review.');
  return page;
 }
 function mergeLedgerHistory(previous,page){
  if(!previous)return page;
  for(const key of ['application_governance','current_pr_activity','linked_change_activity']){
   const old=previous[key],incoming=page[key];if(!old||!incoming)continue;
   if(old.state==='unlinked')continue;
   const rows=[...(old.events||[]),...(incoming.events||[])],byId=new Map(rows.map(event=>[event.event_id,event]));
   incoming.events=[...byId.values()].slice(-100);
   if(old.next===null)incoming.next=null;
  }
  return page;
 }
 function ledgerHistoryMarkup(data, loading=false, error='', truncated=false){
  if(loading)return '<article class="card"><div class="body"><h2>Governance history</h2><p>Loading verified ledger history…</p></div></article>';
  if(error)return `<article class="card"><div class="body"><h2>Governance history</h2><p class="empty">${esc(error)}</p><button type="button" data-ledger-retry>Retry history</button></div></article>`;
  if(!data||data.schema!=='governance-history-view-v1'||!data.identity)return ledgerHistoryMarkup(null,false,'Verified ledger history is unavailable for this run.');
  const stream=(title,section)=>{
   const events=Array.isArray(section?.events)?section.events:[];
   return `<section><h3>${esc(title)}</h3><p class="note">${esc(section?.qualification||'')}</p>${events.length?events.map(event=>`<div class="gate"><div><strong>${esc(event.action||'Governance event')}</strong>${event.subject?` · <code>${esc(event.subject)}</code>`:''}<small>${esc(event.status||'recorded')}${event.decision?` · ${esc(event.decision)}`:''}${event.event_type==='evaluate'&&event.evaluation_result?` · ${esc(event.evaluation_result)}`:''}${Number.isInteger(event.evidence_count)&&event.evidence_count?` · ${esc(event.evidence_count)} evidence reference(s)`:''}<br>Sequence ${esc(event.sequence)}${event.recorded_at?` · ${esc(event.recorded_at)}`:''}${event.actor?` · ${esc(event.actor)}`:''}</small><details><summary>Provenance · ${esc(String(event.event_id||'').slice(0,12))}</summary><p>Ledger event ID: <code>${esc(event.event_id||'')}</code></p><p>${esc(event.qualification||'Verified ledger event.')}</p></details></div></div>`).join(''):'<p>No events in this page.</p>'}</section>`;
  };
  const app=data.application_governance||{},run=data.current_pr_activity||{},change=data.linked_change_activity||{};
  const more=app.next!==null||run.next!==null||(change.state!=='unlinked'&&change.next!==null);
  const appAfter=app.next??app.events?.at(-1)?.sequence??0,runAfter=run.next??run.events?.at(-1)?.sequence??0,changeAfter=change.next??change.events?.at(-1)?.sequence??0;
  return `<article class="card"><div class="body"><h2>Governance history</h2><p>Read-only history from the append-only ledger. Pinned to this PR run; streams display oldest first.</p>${truncated?'<p class="note">Showing the latest 100 loaded entries per stream; earlier loaded entries are omitted.</p>':''}${stream('Application governance',app)}${stream('This PR run',run)}<section><h3>Governance proposals</h3><p class="note">${esc(change.qualification||'')}</p>${change.state==='unlinked'?'<p>Governance proposals are not linked to this PR.</p>':stream('PR-linked proposal',change)}</section>${more?`<p><button type="button" data-ledger-more data-after-app="${esc(appAfter)}" data-after-run="${esc(runAfter)}" data-after-change="${esc(changeAfter)}">Load more history</button></p>`:''}<details><summary>Run provenance</summary><p>Application: <code>${esc(data.identity.application)}</code><br>Run: <code>${esc(data.identity.run_id)}</code><br>Baseline: <code>${esc(data.identity.baseline_commit)}</code><br>Head: <code>${esc(data.identity.head_commit)}</code></p></details><p class="note">History is read-only. Viewing it does not approve proposals or create ledger events.</p></div></article>`;
 }
 root.ledgerHistoryMarkup=ledgerHistoryMarkup;
 root.resolveHistoryRunId=resolveHistoryRunId;
 root.historyRequestParams=historyRequestParams;
 root.fetchLedgerHistoryPage=fetchLedgerHistoryPage;
 root.mergeLedgerHistory=mergeLedgerHistory;
 if(typeof module!=='undefined'&&module.exports)module.exports={ledgerHistoryMarkup,resolveHistoryRunId,historyRequestParams,fetchLedgerHistoryPage,mergeLedgerHistory};
})(typeof window!=='undefined'?window:globalThis);
