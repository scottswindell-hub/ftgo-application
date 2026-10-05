/* Read-only ledger acceptance; explanations never change check results. */
function acceptanceMarkup(doc) {
 const a=doc?.acceptance;if(!a)return '';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={ready:'Ready',blocked:'Blocked',review_required:'Review required',incomplete:'Assessment incomplete'};
 const color={ready:'#238636',blocked:'#da3633',review_required:'#9e6a03',incomplete:'#6e7681'}[a.status]||'#6e7681';
 const core=a.layers?.core_objectives?.violations||[],quality=a.layers?.quality_controls?.findings||[];
 const objectives=[...new Map(core.map(v=>[v.objective_id,v])).values()],failed=a.layers?.quality_controls?.failed_checks||[];
 const explanation=a.reason||(a.missing?.length?'Required evidence unavailable: '+a.missing.join(', '):'');
 return `<section class="card" data-acceptance="${escape(a.status)}" style="border-left:4px solid ${color}"><div class="body"><h2>Acceptance · ${escape(labels[a.status]||a.status)}</h2><p>${a.mode==='shadow'?'Shadow assessment · Native check results remain authoritative.':'Accepted policy determines whether this change can advance.'}</p>${explanation?`<p>${escape(explanation)}</p>`:''}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px"><div><b>Protected objectives</b><p>${core.length?`🔴 ${objectives.length} objective area(s) violated${objectives.map(v=>`<br><span>${escape(v.statement)}</span>`).join('')}`:'See objective evidence; no ledger-linked violations recorded.'}</p></div><div><b>Quality controls</b><p>${failed.length?`🔴 ${failed.length} check(s) failed`:quality.length?`${quality.length} finding(s) · Follow the check response policy`:'See tests and standards results.'}</p></div></div><p>Review shows the semantic changes, affected source and evidence. Accepting a governance change requires an authorized ledger update.</p></div></section>`;
}
if(typeof module!=='undefined')module.exports={acceptanceMarkup};
