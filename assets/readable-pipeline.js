/* Compact two-stage view over the existing Lambda check graph. */
(function(root){
'use strict';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const ANALYSIS=new Set(['pr_source','backend_artifacts','severity','coding_standards','improper_tests']);
const REVIEW=new Set(['intent_diff','rule_impact','connected_evidence','governance_decision','ask_code_intent']);
const rank={error:0,failed:0,stopped:1,running:2,blocked:3,pending:4,queued:4,passed:5,skipped:5};
function groupState(rows){
 if(!rows.length)return 'pending';
 return rows.map(row=>row.state||'pending').sort((a,b)=>(rank[a]??4)-(rank[b]??4))[0];
}
// Boundary-question findings from intent_diff are labelled amber; the governance decision still enforces them.
const boundaryFinding=row=>row.id==='intent_diff'&&row.state==='failed';
function rowMeta(row){const meta=stateMeta(row.state);return boundaryFinding(row)?[meta[0],meta[1],'amber']:meta;}
function stateMeta(state){return ({passed:['✓','Passed','green'],failed:['!','Issue found','red'],error:['!','Incomplete','red'],stopped:['!','Stopped','amber'],running:['●','Running','amber'],blocked:['○','Waiting','amber'],pending:['○','Queued',''],queued:['○','Queued',''],skipped:['–','Skipped','']})[state]||['○',state||'Pending',''];}
function subcheck(row){
 const meta=rowMeta(row),detail=typeof customerDetail==='function'?customerDetail(row.detail||'Waiting to run'):row.detail||'Waiting to run';
 const label=typeof customerCheckLabel==='function'?customerCheckLabel(row):row.label||row.id;
 return `<li class="rr-subcheck ${escapeHtml(row.state||'pending')}${boundaryFinding(row)?' boundary':''}"><span class="rr-subcheck-icon">${meta[0]}</span><div><b>${escapeHtml(label)}</b><small>${escapeHtml(detail)}</small>${typeof checkStepsMarkup==='function'?checkStepsMarkup(row):''}</div><span class="rr-subcheck-state ${meta[2]}">${escapeHtml(meta[1])}</span></li>`;
}
function group(title,description,rows,review){
 const state=groupState(rows),worst=rows.filter(row=>(row.state||'pending')===state);
 const meta=worst.length&&worst.every(boundaryFinding)?rowMeta(worst[0]):stateMeta(state);
 return `<section class="rr-pipeline-group"><header><span class="rr-pipeline-icon ${meta[2]}">${meta[0]}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div><span class="rr-pipeline-state ${meta[2]}">${escapeHtml(meta[1])}</span></header><ol>${rows.map(subcheck).join('')||'<li class="rr-no-checks">No pipeline stages were published.</li>'}</ol>${review&&['failed','error'].includes(state)?'<footer><button type="button" data-view="review">Review intent decisions →</button></footer>':''}</section>`;
}
function readablePipelineChecksMarkup(doc){
 const checks=doc.checks||doc.stages||[];
 const analysis=checks.filter(row=>ANALYSIS.has(row.id));
 const review=checks.filter(row=>REVIEW.has(row.id));
 const known=new Set([...ANALYSIS,...REVIEW]);
 analysis.push(...checks.filter(row=>!known.has(row.id)));
 const baseline=doc.governance_baseline||{};
 const baselineText=baseline.governance_version?`${baseline.workflows||0} accepted workflows · ${baseline.accepted_obligations||0} proved obligations · ${baseline.governance_version}`:'Accepted baseline identity has not been published yet.';
 return `<article class="rr-pipeline"><header><div><h2>CodeIntent checks</h2><p>The existing Lambda checks grouped into analysis and intent review.</p></div><span class="pill ${doc.verdict==='PASS'?'green':doc.verdict==='VIOLATION'?'red':'amber'}">${escapeHtml(doc.verdict==='UNKNOWN'?'LACKS_DETERMINISTIC_EVIDENCE':doc.verdict||doc.state||'Running')}</span></header>
  ${group('CodeIntent / analysis','Read the PR, build semantic evidence, and run adopted quality checks.',analysis,false)}
  ${group('CodeIntent / intent review','Compare intent, apply accepted governance, and produce the review decision.',review,true)}
  <details class="rr-pipeline-baseline"><summary>Accepted baseline and run identity</summary><p>${escapeHtml(baselineText)}</p><p><code>${escapeHtml(doc.sha||'Commit unavailable')}</code></p></details>
  <p class="note">Updated ${escapeHtml(doc.updated_at||'—')} · pipeline <code>CodeIntent</code></p></article>`;
}
root.readablePipelineChecksMarkup=readablePipelineChecksMarkup;
if(typeof module!=='undefined')module.exports={readablePipelineChecksMarkup};
})(typeof window!=='undefined'?window:globalThis);
