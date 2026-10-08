const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {liveAssessmentMarkup}=require('./assets/live-assessment.js');
const {acceptanceMarkup}=require('./assets/acceptance-view.js');

test('blocked governance acceptance is prominent without changing native check outcomes',()=>{
 const checks=[{id:'intent_diff',state:'passed',label:'Intent diff'}];
 const doc={state:'in_progress',verdict:'PASS',reason:'Native checks are complete.',checks,
  acceptance:{status:'blocked',layers:{core_objectives:{violations:[{objective_id:'loop:business:revision-pending',
   statement:'Revision proposal remains distinct from the committed order.'}]}}}};
 const before=JSON.stringify(doc.checks);
 const html=liveAssessmentMarkup(doc,acceptanceMarkup);
 assert.match(html,/Governance acceptance blocked/);
 assert.match(html,/Native checks: PASS · Run: In progress/);
 assert.match(html,/data-acceptance="blocked"/);
 assert.match(html,/🔴 1 objective area\(s\) violated/);
 assert.match(html,/Revision proposal remains distinct/);
 assert.equal(JSON.stringify(doc.checks),before);
 assert.equal(doc.checks[0].state,'passed');
 assert.doesNotMatch(html,/data-run-state="completed"/);
});

test('ready acceptance and completed lifecycle are reported separately from native verdict',()=>{
 const html=liveAssessmentMarkup({state:'completed',verdict:'PASS',acceptance:{status:'ready'}},acceptanceMarkup);
 assert.match(html,/Run complete · acceptance ready/);
 assert.match(html,/Native checks: PASS · Run: Complete/);
 assert.match(html,/data-acceptance-status="ready"/);
 assert.match(html,/data-run-state="completed"/);
});

test('missing evidence remains visibly incomplete while run lifecycle is active',()=>{
 for(const status of ['incomplete','evidence_needed']){
  const html=liveAssessmentMarkup({state:'in_progress',verdict:'PASS',acceptance:{status,missing:['intent_risk']}},acceptanceMarkup);
  assert.match(html,status==='incomplete'?/Governance assessment incomplete/:/Governance inputs incomplete/);
  assert.match(html,/Native checks: PASS · Run: In progress/);
  assert.match(html,/data-run-state="in_progress"/);
 }
});

test('the preserved legacy renderer uses the shared live assessment projection',()=>{
 const html=fs.readFileSync(path.join(__dirname,'legacy-review.html'),'utf8');
 assert.match(html,/liveAssessmentMarkup\(liveDoc,acceptanceMarkup\)/);
 assert.match(html,/<script src="assets\/live-assessment\.js"><\/script>/);
});
