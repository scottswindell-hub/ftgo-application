/* Final run activity; the nine governed checks retain their original outcomes. */
function askingCodeIntentMarkup(doc) {
 const step=doc?.asking_code_intent;
 if(!step)return '';
 const state=step.state||'pending',label={pending:'Pending',running:'Running',passed:'Complete',error:'Unavailable'}[state]||state;
 const steps=step.steps||[],current=steps.at(-1)?.label||step.detail||'Reading governed objectives and graph changes…';
 const progress=state==='running'?`<div class="check-thinking" aria-live="polite"><span class="check-thinking-dot" aria-hidden="true"></span><span class="check-thinking-text">${esc(current)}</span></div>`:steps.length?`<details class="check-trace"><summary>Summary activity · ${steps.length} steps</summary><ol>${steps.map(s=>`<li class="done"><span aria-hidden="true">✓</span><span>${esc(s.label)}</span></li>`).join('')}</ol></details>`:'';
 return `<div class="gate ${esc(state)}" data-asking-code-intent="${esc(state)}" data-pipeline-run="ask_code_intent"><span class="icon ${state==='error'?'stop':state==='passed'?'':'warn'}">${state==='passed'?'✓':state==='running'?'●':state==='error'?'!':'○'}</span><div style="flex:1"><strong>Ask Code Intent</strong><small>${esc(state==='pending'?'Waiting for checks':state==='passed'?'Plain-language explanation of governed changes':step.detail||'Preparing summary')}</small>${progress}</div>${liveStateBadge(state,label)}</div>`;
}
/* Cached objective summaries; no acquisition or policy mutation from the browser. */
// Governed boundary IDs (FTGO-COMMAND-VALUE) shown as readable concept names.
function conceptLabel(value){
 const text=String(value||'');
 return /^[A-Z]+-[A-Z0-9-]+$/.test(text)?text.replace(/^[A-Z]+-/,'').toLowerCase().replace(/-/g,' ').replace(/^./,c=>c.toUpperCase()):text;
}
function summaryFindingTarget(f) {
 const slug=s=>'rt-'+String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
 return f.check_id==='intent_diff'?slug('intent '+f.id):f.check_id==='coding_standards'?slug('std '+f.rule_id+' '+f.file+' '+f.line):'finding:'+f.id;
}
function reviewFindingLabel(f, findings) {
 const categories={intent_diff:['intent-diff','Intent difference','intent'],rule_impact:['rule-impact','Rule impact','rule'],coding_standards:['coding-standard','Coding standard','standard'],improper_tests:['test-err','Test finding','test']};
 const [prefix,category,tone]=categories[f.check_id]||['finding','Finding','rule'];
 // Presentation IDs are scoped to this run; canonical finding IDs still drive navigation.
 const peers=findings.filter(x=>x.check_id===f.check_id).map(x=>x.id).sort();
 return {id:'review-'+prefix+'-'+String(peers.indexOf(f.id)+1).padStart(2,'0'),category,tone};
}
function reviewFindingBadge(f, findings) {
 const label=reviewFindingLabel(f,findings);
 return `<span class="review-finding-id ${label.tone}" data-review-label="${esc(label.id)}" title="${esc(label.category)}">${esc(label.category)} · ${esc(conceptLabel(f.title))}</span><span class="review-violation-badge">Violation</span>`;
}
function summaryGovernanceContext(packet) {
 const acceptance=packet?.acceptance;
 const violations=acceptance?.layers?.core_objectives?.violations||[];
 const objectives=[...new Map(violations.map(row=>[row.objective_id,row])).values()];
 if(!acceptance)return {markup:'',hasViolations:false};
 const label={blocked:'Governance acceptance blocked',incomplete:'Governance assessment incomplete',
  evidence_needed:'Governance evidence needed',ready:'Governance acceptance ready'}[acceptance.status]||'Governance assessment pending';
 return {hasViolations:objectives.length>0,markup:`<div class="gate ${acceptance.status==='blocked'?'error':acceptance.status==='ready'?'passed':'pending'}" data-summary-acceptance="${esc(acceptance.status)}"><div><strong>${esc(label)}</strong>${objectives.length?`<ul>${objectives.map(row=>`<li>${esc(row.statement||row.objective_id)}</li>`).join('')}</ul><small>Open Governed Objectives for the affected area and its behavioral evidence.</small>`:''}</div></div>`};
}
function objectiveSummaryMarkup(summary, packet) {
 if(!summary)return '<p>No cached objective summary is attached to this run. Review the recorded findings and governed objectives.</p>';
 const feedback=summary.presentation, violations=summary.violations||[],narrative=summary.behavior_narrative;
 const governance=summaryGovernanceContext(packet);
 const currentFindings=packet?.acceptance?.layers?.core_objectives?.violations||[];
 const explainedFindings=summary.governance_acceptance?.core_objective_violations||[];
 const explainsCurrentFinding=currentFindings.some(f=>f.finding_id&&explainedFindings.some(
  e=>e.finding_id===f.finding_id&&e.rule_id===f.rule_id&&e.objective_id===f.objective_id));
 const lead=explainsCurrentFinding&&feedback?.summary?feedback.summary:
  narrative?(narrative.status==='unavailable'?'Behavioral explanation is not available for this graph yet.':narrative.summary):feedback?.summary;
 return `<section class="objective-summary card"><div class="body"><h2 class="ask-intent-heading"><svg class="ask-intent-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 5h18a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H14l-7 5v-5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m12 11-4 4 4 4m8-8 4 4-4 4m-3-8-2 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Ask Code Intent Summary</h2><span class="note">Generated summary · Suggested corrections</span>
 ${governance.markup}
 ${lead?`<p class="ask-intent-lead">${esc(lead)}</p>`:'<p>Concise explanation unavailable. Recorded evidence remains available below.</p>'}
 ${narrative?.status==='recorded'?`<a class="behavior-explore-link" href="behavior.html?${esc(new URLSearchParams(location.search).toString())}">Explore behavior changes <span aria-hidden="true">↗</span></a>`:''}
 ${violations.length?`<ul class="summary-findings">${violations.map(f=>{const item=feedback?.items.find(i=>i.finding_id===f.id);return `<li><button type="button" class="summary-finding-button" data-summary-finding="${esc(summaryFindingTarget(f))}"><span class="summary-finding-labels">${reviewFindingBadge(f,violations)}</span><span class="summary-finding-action" title="${esc(item?.correction||'Inspect the governed requirement before choosing a correction.')}">${esc(item?.correction||'Inspect the governed requirement before choosing a correction.')}</span><span class="note">${esc(window.semanticGroundingLabel?semanticGroundingLabel(item):'Semantic interpretation remains unresolved.')}</span><span class="summary-finding-cta">Click to address <span aria-hidden="true">→</span></span></button></li>`;}).join('')}</ul>`:(governance.hasViolations?'':'<p>No additional findings in this cached review. Governance acceptance is shown separately.</p>')}

 ${summary.omitted_objectives?.length?'<p>Some objectives were omitted by the context budget.</p>':''}</div></section>`;
}


function objectiveAssistantEntries(summary) {
 return (summary?.cards||[]).flatMap(card=>(card.review?.comments||[]).map(c=>({
  id:c.id,region:c.id,category:'Ask Code Intent review',governanceObjective:card.objective.statement,
  status:'action',statusLabel:c.origin==='advisory_risk'?'Advisory risk':'System finding explanation',
  owner:'Owner not supplied',title:c.concern,summary:c.rationale,nextStep:c.next_step,
  source:{...c.source,label:c.source.file,qualification:c.source.line?`Recorded source line ${c.source.line}`:'File anchor only; no exact line verified.'},
  details:`<p><b>PM-controlled objective</b><br>${esc(card.objective.statement)}</p><p><b>Accepted requirement</b><br>${esc(card.objective.requirements.find(r=>r.id===c.requirement_id)?.statement||c.requirement_id)}</p><p>${esc(c.origin==='advisory_risk'?'Newly proposed risk. This is not an established violation.':'Explanation of a recorded system finding; interpretation remains advisory.')}</p><p>Citations validated. ${esc(window.semanticGroundingLabel?semanticGroundingLabel(c):'Semantic interpretation remains unresolved.')}</p><p>${esc(c.evidence_ids.join(', '))}</p><ul>${(card.review.uncertainty||[]).map(u=>`<li>${esc(u)}</li>`).join('')}</ul><button data-summary-flow="${esc(card.objective.id)}">Focused objective flow</button>`
 })));
}

function objectiveRejectedMarkup(summary){
 const rows=(summary?.cards||[]).flatMap(c=>(c.review?.rejected_comments||[]).map(r=>({...r,objective:c.objective.statement})));
 return rows.length?`<details class="card"><summary>${rows.length} proposed review comment(s) rejected</summary><p>These proposals are excluded from findings because the supplied evidence did not satisfy validation.</p>${rows.map(r=>`<p><b>${esc(r.objective)}</b><br>${esc(r.concern)}<br><span class="note">${esc(r.reason)}</span></p>`).join('')}</details>`:'';
}

function attachObjectiveFeedback(root, summary) {
 const feedback=new Map((summary?.violations||[]).map(f=>[summaryFindingTarget(f),{finding:f,item:summary.presentation?.items.find(i=>i.finding_id===f.id)}]));
 for(const tile of root.querySelectorAll('.ii-tile, .review-result')) {
  if(tile.id==='rt-decision'||tile.closest('[data-review-check-id="governance_decision"]'))continue;
  if(!tile.matches('.review-result')&&!tile.querySelector('[data-file]')&&!feedback.has(tile.id))continue;
  const match=feedback.get(tile.id)||feedback.get('finding:'+tile.dataset.reviewId);
  const response=document.createElement('details');response.className='ask-intent-response';
  response.innerHTML='<summary>Ask Code Intent</summary>';
  if(match?.item){
   response.dataset.llmFinding=match.finding.id;
   response.innerHTML+=`<div class="summary-finding-labels">${reviewFindingBadge(match.finding,summary.violations)}</div><p><b>Suggested correction:</b> ${esc(match.item.correction)}</p><p class="note">${esc(window.semanticGroundingLabel?semanticGroundingLabel(match.item):'Semantic interpretation remains unresolved.')}</p><p class="note">${esc(conceptLabel(match.finding.title))} · Generated suggestion</p><details><summary>If this behavior change is intentional</summary><p>Propose a change to the governed requirement for owner approval. The current violation remains open until the requirement changes or the code complies.</p></details>`;
  }else{
   const file=tile.querySelector('[data-file]')?.dataset.file;
   const comments=(summary?.cards||[]).flatMap(c=>(c.review?.comments||[]).filter(x=>file&&x.source?.file===file).map(x=>({comment:x,objective:c.objective})));
   if(comments.length){response.innerHTML+=comments.map(({comment:c,objective:o})=>`<p><b>${esc(c.origin==='advisory_risk'?'Advisory risk':'Finding explanation')}:</b> ${esc(c.concern)}</p><p>${esc(c.next_step)}</p><p class="note">${esc(o.statement)} · Generated suggestion; source context does not establish an objective violation.</p>`).join('');}
   else continue;
  }
  tile.append(response);
 }
}

/* Focused graph evidence is rendered only on the linked behavior page. */
function behaviorNarrativeMarkup(narrative) {
 if(!narrative||narrative.status==='unavailable')return '';
 const packet=narrative.packet||{},changes=packet.changes||{},context=packet.context||{};
 const stories=(narrative.stories||[]).map(story=>`<article class="behavior-story"><h4>${esc(story.title)}</h4><p>${esc(story.explanation)}</p></article>`).join('');
 const omitted=(packet.omitted_change_ids||[]).length,unexplained=(narrative.unexplained_change_ids||[]).length;
 return `<details class="behavior-narrative"><summary>Explore behavioral changes · ${(narrative.stories||[]).length}</summary>${stories}${narrative.uncertainty?.length?`<ul class="note">${narrative.uncertainty.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${unexplained?`<p class="note">${unexplained} recorded change(s) lack enough evidence for a behavioral explanation.</p>`:''}${omitted?`<p class="note">${omitted} change(s) omitted by the context budget.</p>`:''}<p class="note">LLM interpretation of intent space evidence.</p></details>`;
}
