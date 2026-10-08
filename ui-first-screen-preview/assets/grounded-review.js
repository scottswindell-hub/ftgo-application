/* Render system findings and cached reviewer contributions without changing policy. */
function groundedReviewEntries(review, runScope) {
 if(!review)return [];
 const interpreted=review.interpretation||{},components=interpreted.components||[];
 const entries=(review.findings||[]).filter(f=>f.severity!=='pass').map(f=>{
  const parts=components.filter(c=>c.finding_id===f.id);
  const supported=parts.filter(c=>c.verification?.status==='supported');
  const unresolved=parts.filter(c=>c.verification?.status==='unresolved');
  const rejected=[...(interpreted.rejected||[]).filter(c=>c.component?.finding_id===f.id),...parts.filter(c=>c.verification?.status==='rejected').map(c=>({component:c,reason:c.verification.reason||'Cached semantic judgment does not support this interpretation.'}))];
  const proposals=(interpreted.proposals||[]).filter(p=>p.finding_id===f.id);
  const source=supported.find(c=>c.source)?.source||f.source||{};
  const explain=list=>list.map(c=>`<p>${esc(c.description||'')}<br><span class="note">${esc(c.kind==='potential_impact'?'Potential impact · runtime consequence unproven':'Observed change')} · citations ${esc((c.evidence_ids||[]).join(', '))}</span></p>`).join('');
  const proposalHTML=proposals.map(p=>`<details><summary>Proposed ${esc(p.kind.replaceAll('_',' '))} · awaiting authorized review</summary><p>${esc(p.rationale)}</p><p>Target: ${esc(p.target)} · governance ${esc(review.identity?.governance_version)}</p><button data-download-proposal="${esc(f.id)}" data-proposal-kind="${esc(p.kind)}">Download unsigned proposal</button></details>`).join('');
  const before=f.before,after=f.after;
  return {id:f.id,region:f.id,category:f.category||'Governance policy',
   status:f.status==='fyi'?'clear':f.severity==='block'?'action':f.severity==='warn'?'gap':f.status||'action',
   statusLabel:f.status==='fyi'?'FYI':undefined,owner:f.owner||'Owner not supplied',
   title:f.title||String(f.reason||'Governed finding').replaceAll('_',' '),
   source:{file:source.file,label:source.file||'Governed evidence',symbol:f.subject,
           qualification:source.line?`Pinned source line ${source.line}`:'No verified exact source line supplied.'},
   before,after,summary:supported[0]?.description||f.description||String(f.reason||'').replaceAll('_',' '),
   nextStep:f.next_step||'Inspect the evidence; correct the change or propose it for owner review.',
   checks:['Governance-rule impact',...(parts.length?['Connected evidence']:[])],
   details:`<div class="grounded-chain"><p><b>System signal</b><br>${esc(String(f.reason||'').replaceAll('_',' '))} · ${esc(f.severity==='block'?'Enforced policy':'Advisory or evidence warning')}</p><p><b>Affected governance</b><br>${esc(window.conceptLabel?conceptLabel(f.subject||f.category||'Declared responsibility'):(f.subject||f.category||'Declared responsibility'))}</p><p><b>Ask Code Intent review</b>${parts.length?'<br><span class="pill">Ask Code Intent review</span>':''}</p>${supported.length?explain(supported):'<p>No supported cached interpretation supplied. The system finding remains visible.</p>'}${unresolved.length?`<details><summary>${unresolved.length} proposed interpretation(s) need verification</summary>${explain(unresolved)}</details>`:''}${rejected.length?`<details><summary>${rejected.length} interpretation component(s) rejected</summary>${rejected.map(r=>`<p>${esc(r.reason)}</p>`).join('')}</details>`:''}<p><b>Verification</b><br>${supported.length} supported · ${unresolved.length} unresolved · ${rejected.length} rejected. Citations are bound to this source revision; analysis support is evidence, not proof.</p>${proposalHTML}<details><summary>Evidence and uncertainty</summary><p>${esc((f.evidence_ids||[]).join(', '))}</p><ul>${(interpreted.unknowns||[]).map(u=>`<li>${esc(u)}</li>`).join('')}</ul></details></div>`};
 });
 // Check gaps are review work; never disguise an unavailable advisory as clean.
 for(const s of review.subchecks||[]){if(!(s.gaps||[]).length)continue;entries.push({
  id:'subcheck-gap:'+s.id,region:'subcheck-gap:'+s.id,category:s.label,status:'gap',owner:'Owner not supplied',
  title:s.label+' evidence unavailable',source:{label:'Bounded review evidence'},
  summary:s.gaps.join('; '),nextStep:'Supply the missing context or acquire an exact judgment capture.',
  details:'<p>Advisory coverage gap. This subcheck does not independently block the policy result.</p>',checks:['Governance-rule impact']});}
 return entries;
}
function groundedConnectionsMarkup(review) {
 const parts=(review?.interpretation?.components||[]).filter(c=>c.connection);
 if(!parts.length)return '';
 return `<details class="card"><summary>Ask Code Intent review connections (${parts.length})</summary>${parts.map(c=>`<p><b>${esc(c.verification?.status||'unresolved')}</b> · ${esc(c.description)}<br><span class="note">${esc(c.verification?.graph_path_verified?'Graph path verified; semantic support reported separately':'Proposed connection')} · runtime impact is not established</span><br>${(c.connection.path?.length?c.connection.path:[{from:c.connection.from,to:c.connection.to,kind:'Proposed relationship'}]).map(e=>`${esc(e.from)} → ${esc(e.to)} (${esc(e.kind)})`).join('<br>')}</p>`).join('')}</details>`;
}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-download-proposal]');if(!button)return;
 const proposals=window.groundedReviewData?.interpretation?.proposals||[];
 const p=proposals.find(p=>p.finding_id===button.dataset.downloadProposal&&p.kind===button.dataset.proposalKind);
 if(!p)return;const url=URL.createObjectURL(new Blob([JSON.stringify(p,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='unsigned-governance-proposal.json';a.click();URL.revokeObjectURL(url);
});
