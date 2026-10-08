const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {acceptanceMarkup}=require('./assets/acceptance-view.js');
test('accepted objective and quality results remain distinct and escaped',()=>{
 const html=acceptanceMarkup({acceptance:{status:'blocked',layers:{core_objectives:{violations:[{objective_id:'cancel',statement:'<script>Cancellation pending</script>'}]},quality_controls:{failed_checks:['tests']}}}});
 assert.match(html,/1 objective area\(s\) violated/);assert.match(html,/Cancellation pending/);
 assert.match(html,/1 check\(s\) failed/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/authorized ledger update/);
});
test('incomplete evidence is not displayed as preservation',()=>{
 const html=acceptanceMarkup({acceptance:{status:'incomplete',missing:['objective_projection']}});
 assert.match(html,/Assessment incomplete/);assert.match(html,/Required evidence unavailable: objective_projection/);
 assert.doesNotMatch(html,/objectives preserved/i);
});
test('both pages have identical presentation without the retired risk lane',()=>{
 assert.equal(fs.readFileSync(path.join(__dirname,'assets/acceptance-view.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../status-page/assets/acceptance-view.js'),'utf8'));
 assert.equal(acceptanceMarkup({}), '');assert.doesNotMatch(acceptanceMarkup({acceptance:{status:'ready'}}),/Intent risk|high risk|Other intent changes/);
});
