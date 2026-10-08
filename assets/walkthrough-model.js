/* Pure projection from the existing Lambda check graph to the two walkthrough rows. */
(function(root){
'use strict';
const ANALYSIS=['pr_source','backend_artifacts','severity','coding_standards','improper_tests'];
const REVIEW=['intent_diff','rule_impact','connected_evidence','governance_decision','ask_code_intent'];
const terminal=new Set(['passed','failed','error','blocked','stopped','skipped']);
function intentionalSkip(check,checks){
 const severity=(checks||[]).find(c=>c.id==='severity');
 const gated=severity?.state==='stopped'&&/confidently below threshold, downstream checks skipped/.test(severity.detail||'');
 return Boolean(gated&&(check===severity||(check?.state==='blocked'&&check.dependency_mode==='pass'&&check.requires?.length===1&&check.requires[0]==='severity')));
}
function currentStep(check){
 const steps=check?.steps||[];
 return steps.find(step=>step.state==='running')||(check?.state==='running'?steps.find(step=>step.state==='pending'):null);
}
function phase(checks,ids,blockedBy){
 const map=new Map((checks||[]).map(check=>[check.id,check]));
 const rows=ids.map(id=>map.get(id)).filter(Boolean);
 if(!rows.length)return {state:'pending',line:blockedBy||'Waiting for the pipeline'};
 const running=rows.find(row=>row.state==='running');
 if(running){const step=currentStep(running);return {state:'running',line:[running.label,step?.label,step?.detail||(!step&&running.detail)].filter(Boolean).join(' · ')};}
 const actionable=rows.find(row=>!terminal.has(row.state));
 if(actionable)return {state:'running',line:[actionable.label,currentStep(actionable)?.label||actionable.detail].filter(Boolean).join(' · ')};
 // A failed boundary-question check alone reads as a warning; any other failure still reads as an error.
 const boundary=row=>row.id==='intent_diff'&&row.state==='failed';
 const failures=rows.filter(row=>['failed','error','blocked','stopped'].includes(row.state)&&!intentionalSkip(row,checks));
 const failed=failures.find(row=>!boundary(row))||failures[0];
 if(failed)return {state:boundary(failed)?'warn':'error',line:[failed.label,failed.detail||'Could not complete'].join(' · ')};
 const skipped=rows.filter(row=>intentionalSkip(row,checks)).length;
 return {state:'passed',line:skipped?`Completed · ${skipped} checks intentionally skipped for a below-threshold change`:`Completed · ${rows.length} checks`};
}
root.walkthroughPipeline={ANALYSIS,REVIEW,phase,intentionalSkip};
if(typeof module!=='undefined')module.exports=root.walkthroughPipeline;
})(typeof window!=='undefined'?window:globalThis);
