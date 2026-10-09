/* Keep native check outcome, acceptance, and producer lifecycle visibly separate. */
function liveAssessmentMarkup(doc, acceptanceRenderer) {
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const acceptance=doc?.acceptance||{};
 const state=doc?.state||'pending';
 const nativeVerdict=doc?.verdict==='UNKNOWN'?'LACKS_DETERMINISTIC_EVIDENCE':doc?.verdict||'Not available';
 const acceptanceStatus=acceptance.status;
 const blocked=acceptanceStatus==='blocked';
 const incomplete=acceptanceStatus==='incomplete';
 const evidenceNeeded=acceptanceStatus==='evidence_needed';
 const review=acceptanceStatus==='review_required';
 const ready=acceptanceStatus==='ready';
 const active=state!=='completed';
 const title=blocked?'Governance acceptance blocked':incomplete?'Governance assessment incomplete':evidenceNeeded?'Governance inputs incomplete':
  review?'Governance review required':ready?(active?'Acceptance ready · run in progress':'Run complete · acceptance ready'):
  active?'Run in progress':'Run complete';
 const tone=blocked?'fail':incomplete||evidenceNeeded||review?'pending':ready&&!active?'pass':'pending';
 const runLabel=state==='completed'?'Complete':state==='in_progress'||state==='running'?'In progress':
  state==='failed'?'Failed':state==='error'?'Error':'Pending';
 const acceptanceHtml=typeof acceptanceRenderer==='function'?acceptanceRenderer(doc):'';
 const explanation=acceptance.reason||doc?.reason;
 const reason=explanation?`<br>${escape(explanation)}`:'';
 return `${acceptanceHtml}<div class="summary-box ${tone}" data-acceptance-status="${escape(acceptanceStatus||'unknown')}" data-run-state="${escape(state)}"><strong>${escape(title)}</strong><p>Native checks: ${escape(nativeVerdict)} · Run: ${escape(runLabel)}${reason}</p></div>`;
}
if(typeof module!=='undefined')module.exports={liveAssessmentMarkup};
