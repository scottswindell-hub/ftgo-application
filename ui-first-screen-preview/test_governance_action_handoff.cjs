const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const actions=require('./assets/governance-actions.js');

test('handoff opens only known workflows in the selected GitHub repository',()=>{
 assert.equal(actions.workflowUrl('scottswindell-hub/ftgo-application',actions.WORKFLOWS.rules),
  'https://github.com/scottswindell-hub/ftgo-application/actions/workflows/update-governance-rule.yml');
 assert.equal(actions.workflowUrl('owner/repo','unknown.yml'),'');
 assert.equal(actions.workflowUrl('owner/repo/extra',actions.WORKFLOWS.rules),'');
});

test('review decisions become context, not credentials or direct ledger commands',()=>{
 const value=JSON.parse(actions.reviewContext({repo:'owner/repo',pr:27,sha:'abc',responses:[
  {id:'change-1',decision:'yes',summary:'Order cancellation changed',type:'Business'},
  {id:'change-2',decision:'no',summary:'Retry behavior changed',type:'Behavior'}
 ]}));
 assert.deepEqual(value,{repository:'owner/repo',pull_request:'27',head_commit:'abc',responses:[
  {id:'change-1',decision:'accepted',summary:'Order cancellation changed',type:'Business'},
  {id:'change-2',decision:'investigate',summary:'Retry behavior changed',type:'Behavior'}
 ]});
 assert.equal(Object.hasOwn(value,'api_key'),false);
 assert.equal(Object.hasOwn(value,'command'),false);
});

test('static UI delegates mutations to protected Actions and contains no credential path',()=>{
 const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 const handoff=fs.readFileSync(path.join(__dirname,'assets','governance-actions.js'),'utf8');
 const live=fs.readFileSync(path.join(__dirname,'assets','walkthrough-live.js'),'utf8');
 assert.match(page,/assets\/governance-actions\.js/);
 assert.match(handoff,/GitHub Pages never receives an API key/);
 assert.match(handoff,/Open protected rule Action/);
 assert.match(live,/codeIntentGovernanceActions\.open/);
 for(const source of [page,handoff,live]){
  assert.doesNotMatch(source,/GOVERNANCE_RULE_API_KEY|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|x-api-key/);
 }
});
