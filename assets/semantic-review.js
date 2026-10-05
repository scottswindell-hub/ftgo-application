/* Read-only views of advisory judgments published by the native Lambda stages. */
(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.evidenceSelectionMarkup=function(check){
 const selection=check?.evidence_selection;if(!selection)return '';
 return `<details class="ii-sub" data-evidence-selection><summary>Review context · ${e(selection.retained)} evidence items retained · ${e(selection.omitted)} omitted</summary><p>${e(selection.detail)}</p><p>${e(selection.omitted_regions||'0')} source regions omitted from explanation context. Required findings and supplied uncertainty remain visible.</p>${selection.status==='unresolved'?'<p>Optional evidence ranking could not be completed; remaining evidence uses deterministic ordering.</p>':''}${selection.gaps?.length?`<ul>${selection.gaps.map(g=>`<li>${e(g)}</li>`).join('')}</ul>`:''}</details>`;
};
window.semanticGroundingLabel=function(item){
 const status=item?.semantic_grounding?.status;if(!status)return 'Semantic interpretation remains unresolved.';
 return {supported:'Cited evidence supports this bounded interpretation.',contradicted:'Review this interpretation: cited evidence contradicts it.',insufficient:'Review this interpretation: cited evidence is insufficient.',unresolved:'Semantic interpretation remains unresolved.'}[status]||'Semantic interpretation remains unresolved.';
};
window.semanticGroundingMarkup=function(check){
 const rows=check?.semantic_grounding||[];if(!rows.length)return '';
 return `<details class="ii-sub" data-claim-grounding><summary>Grounding of review claims and proposed updates</summary>${rows.map(r=>`<p><b>Candidate ${e(r.kind)}</b> · ${e(r.status)}<br>${e(r.statement)}</p><p class="note">${e(r.qualification)}</p>`).join('')}</details>`;
};
window.intentDiffCard=function(check,icon,title,stateLabels){
 const state=check?.state||'pending';const judgments=check?.judgments||[];
 const labels={changed:'Changed',preserved:'Preserved',review:'Review required',gap:'Evidence gap'};
 const colors={changed:'red',preserved:'green',review:'amber',gap:'amber'};
 const rows=judgments.map(row=>{const obligations=row.workflow_obligations||[];const regions=row.intent_region_ids||[];const obligationsHtml=obligations.length?obligations.map(o=>`<div class="std-item"><div class="std-head"><span class="pill green">Accepted governance</span><b>${e(o.workflow_name||o.workflow_id)}</b><span>${e(o.phase)}</span></div><p><b>${e(o.obligation_id)}</b><br>${e(o.statement)}</p><p class="note">Objective ${e(o.objective_id)} · ${e(o.witness_count)} witness(es)</p></div>`).join(''):'<p class="note">No accepted workflow obligation is linked to this boundary yet.</p>';return `<details class="ii-sub" data-intent-verdict="${e(row.verdict)}"><summary><span class="pill ${e(colors[row.verdict]||'')}">${e(labels[row.verdict]||row.verdict)}</span> ${e(row.boundary_id)}</summary><p>${e(row.reason)}</p>${obligationsHtml}${regions.length?`<p class="note">Affected Cameron regions: ${regions.map(id=>`<code>${e(id)}</code>`).join(' · ')}</p>`:''}${obligations.length&&window.intentGovernanceAvailable?`<button class="btn" data-intent-governance="1" data-workflow-id="${e(obligations[0].workflow_id)}">Open governed objectives</button>`:''}</details>`}).join('');
 return `<section class="placeholder-card intent-diff-card" data-intent-diff><div class="placeholder-state"><h3>${e(icon)} ${e(check?.label||title)}</h3><span class="pill green">LIVE</span><span class="pill ${state==='passed'?'green':state==='failed'||state==='error'?'red':'amber'}">${e(stateLabels[state]||state)}</span></div><p class="live-detail">${e(check?.detail||'')}</p>${rows||'<p class="note">No governed boundary question was selected. Accepted objective rules are evaluated by Governance-rule impact.</p>'}<p class="placeholder-note">Only accepted governance is shown. Proposed workflow obligations do not govern this pull request.</p></section>`;
};
window.semanticReviewChecksMarkup=function(doc){
 const checks=doc?.checks||doc?.stages||[];
 return evidenceSelectionMarkup(checks.find(c=>c.id==='connected_evidence'))+semanticGroundingMarkup(checks.find(c=>c.id==='connected_evidence'));
};
})();
