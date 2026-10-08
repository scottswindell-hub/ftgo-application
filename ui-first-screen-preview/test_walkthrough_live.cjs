const test=require('node:test');
const assert=require('node:assert/strict');
const model=require('./assets/walkthrough-model.js');

test('analysis row shows only the currently running substep',()=>{
 const checks=[
  {id:'pr_source',label:'Read the pull request',state:'passed',steps:[{label:'Computing the change',state:'done'}]},
  {id:'backend_artifacts',label:'Analyze the changed code',state:'running',steps:[
   {label:'Verifying the accepted baseline',state:'done'},
   {label:'Checking service boundaries',state:'running'},
   {label:'Building review evidence',state:'pending'}
  ]},
  {id:'severity',label:'Assess change scope',state:'pending'}
 ];
 const row=model.phase(checks,model.ANALYSIS,'Waiting');
 assert.deepEqual(row,{state:'running',line:'Analyze the changed code · Checking service boundaries'});
 assert.doesNotMatch(row.line,/Verifying|Building review evidence/);
});

test('analysis row advances to the next check after completion',()=>{
 const checks=[
  {id:'pr_source',label:'Read the pull request',state:'passed'},
  {id:'backend_artifacts',label:'Analyze the changed code',state:'passed'},
  {id:'severity',label:'Assess change scope',state:'running',detail:'Selecting downstream checks'}
 ];
 assert.deepEqual(model.phase(checks,model.ANALYSIS,'Waiting'),{
  state:'running',line:'Assess change scope · Selecting downstream checks'
 });
});

test('completed and failed phases collapse to one terminal line',()=>{
 const passed=model.ANALYSIS.map((id,index)=>({id,label:'Check '+index,state:'passed'}));
 assert.deepEqual(model.phase(passed,model.ANALYSIS,'Waiting'),{state:'passed',line:'Completed · 5 checks'});
 passed[3]={id:'coding_standards',label:'Check coding standards',state:'error',detail:'Bundle unavailable'};
 assert.deepEqual(model.phase(passed,model.ANALYSIS,'Waiting'),{state:'error',line:'Check coding standards · Bundle unavailable'});
});

test('default page retains two durable phase rows and embeds the expanded evidence viewer',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const live=fs.readFileSync(path.join(__dirname,'assets','walkthrough-live.js'),'utf8');
 const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 assert.match(live,/phaseRow\('analysis'/);assert.match(live,/phaseRow\('intent review'/);
 assert.match(page,/assets\/review-explorer\.js/);assert.match(page,/assets\/legacy-method-adapter\.js/);
 assert.doesNotMatch(page,/legacy-review\.html/);assert.doesNotMatch(page,/class="(?:nav|sidebar|right)"/);
 assert.equal(fs.existsSync(path.join(__dirname,'legacy-review.html')),true);
 assert.doesNotMatch(live,/Responses are session-only/);
 assert.doesNotMatch(live,/Decision needed|Evaluation signal|Check failed/);
 assert.doesNotMatch(live,/Dispute finding|Yes, fix it|Fix required|Challenge finding/);
 assert.match(live,/Did you mean this/);assert.match(live,/Yes, I meant this/);assert.match(live,/No, investigate/);
 assert.match(live,/function typeIcon/);
 assert.match(live,/aria-label="\$\{type\}"/);
 assert.doesNotMatch(live,/badge type-/);
 assert.match(live,/state\.model\?\.semanticStatus==='no_changes'/);
 assert.match(live,/More recorded evidence/);
});

test('minimal review keeps behavioral and constraint lists in their own scroll regions',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const live=fs.readFileSync(path.join(__dirname,'assets','walkthrough-live.js'),'utf8');
 const css=fs.readFileSync(path.join(__dirname,'assets','walkthrough-live.css'),'utf8');
 const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
 assert.match(live,/Did you intend these behavioral changes\?/);
 assert.match(live,/Did you mean to change these constraints\?/);
 assert.match(live,/item\.kind===kind/);
 assert.match(css,/grid-template-rows:minmax\(0,1fr\) minmax\(0,1fr\) auto/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/height:calc\(100vh - 56px\)/);
 assert.match(page,/assets\/holonic-logo\.png/);
 assert.match(page,/theme-icon-moon/);
 assert.match(page,/theme-icon-sun/);
 assert.match(live,/group\.length\?/);
 assert.match(live,/fitReviewLayout/);
 assert.match(live,/updateScrollAffordances/);
 assert.match(css,/max-height:70%/);
 assert.match(css,/\.is-scrollable\.section-count-2/);
 assert.match(css,/\.has-scroll-overflow::before/);
 assert.match(css,/\.has-scroll-overflow::after/);
 assert.match(css,/padding-right:18px/);
 assert.match(live,/--scroll-thumb-height/);
});

test('each structured Lambda finding becomes its own behavior-grounded review tile',()=>{
 const review=require('./assets/readable-review.js');
 const packet={repository:'r',baseline_commit:'b',head_commit:'h',source_diff:{content:'diff --git a/Order.java b/Order.java\n--- a/Order.java\n+++ b/Order.java\n@@ -1 +1 @@\n-old\n+new'},flows:[{id:'c1',source:{file:'Order.java'},method:'Order::cancel',fact_changes:[]}]};
 const summary={intent_semantics:{status:'recorded',finding_explanations:[{finding_id:'SR-EXC-001|Order.java|Order.cancel',summary:'This handler hides a business failure.',review:'The handler catches the failure without returning or propagating it. Callers can continue as though cancellation succeeded.'}],explanations:[{change_id:'c1',title:'Order cancellation',concept:'state transition',changed_source:{file:'Order.java',method:'Order::cancel()'},behavior_before:'Cancellation was rejected.',behavior_after:'Cancellation succeeds.',semantic_consequence:'Cancellation now succeeds.',user_or_system_effect:'Callers may observe a successful cancellation.'}]}};
 const checks=[{id:'coding_standards',output:{public_findings:[{rule_id:'SR-EXC-001',name:'No swallowed exceptions',band:'finding',file:'Order.java',unit:'Order.cancel',guidance:'Return an explicit failure.'}]}}];
 const model=review.codeIntentReviewModel(packet,summary,[],checks);
 assert.equal(model.changes.length,2);
 const finding=model.changes.find(row=>row.status==='finding');
 assert.equal(finding.findings[0].title,'No swallowed exceptions');
 assert.equal(finding.findings[0].basis,'SR-EXC-001');
 assert.equal(finding.before,'Cancellation was rejected.');
 assert.equal(finding.after,'Cancellation succeeds.');
 assert.equal(finding.summary,'This handler hides a business failure.');
 assert.match(finding.detailSummary,/Callers can continue/);
 assert.equal(finding.comparison.after.text,'new');
 assert.equal(finding.reviewType,'Standard');
 assert.match(finding.groundingLabel,/AGENT INTERPRETATION/);
});

test('improper-test findings use agent wording grounded in their deterministic signals',()=>{
 const review=require('./assets/readable-review.js');
 const packet={repository:'r',baseline_commit:'b',head_commit:'h',source_diff:{content:'diff --git a/src/test/java/OrderTest.java b/src/test/java/OrderTest.java\n--- a/src/test/java/OrderTest.java\n+++ b/src/test/java/OrderTest.java\n@@ -1 +1 @@\n-old\n+assertEquals(value, value);'},flows:[]};
 const findingId='improper_tests:weak|src/test/java/OrderTest.java|OrderTest.cancel';
 const summary={intent_semantics:{status:'recorded',finding_explanations:[{finding_id:findingId,summary:'This test compares a value with itself.',review:'The assertion succeeds regardless of the cancellation result. Broken behavior can leave this test passing.'}],explanations:[]}};
 const checks=[{id:'improper_tests',output:{public_findings:[{kind:'weak',file:'src/test/java/OrderTest.java',unit:'OrderTest.cancel',signals:'asserts a value equals itself',basis:'pattern match'}]}}];
 const model=review.codeIntentReviewModel(packet,summary,[],checks);
 assert.equal(model.changes.length,1);
 assert.equal(model.changes[0].summary,'This test compares a value with itself.');
 assert.match(model.changes[0].detailSummary,/Broken behavior/);
 assert.match(model.changes[0].groundingLabel,/AGENT INTERPRETATION/);
 assert.equal(model.changes[0].reviewType,'Test');
});

test('a digest-pinned PR patch supplies code when paired method source is unavailable',()=>{
 const review=require('./assets/readable-review.js');
 const file='src/MenuService.java';
 const packet={repository:'r',baseline_commit:'b',head_commit:'h',source_diff:{content:[
  `diff --git a/${file} b/${file}`,'new file mode 100644','--- /dev/null',`+++ b/${file}`,
  '@@ -0,0 +1,3 @@','+class MenuService {','+  String load() { return reader.readLine(); }','+}'
 ].join('\n')},flows:[{id:'c1',source:{file},method:'MenuService.load',fact_changes:[]}]};
 const summary={intent_semantics:{status:'recorded',explanations:[{change_id:'c1',title:'Menu loading',concept:'resource handling',changed_source:{file,method:'MenuService.load'},behavior_before:'No baseline behavior is supplied.',behavior_after:'Menu loading reads the first line.'}]}};
 const model=review.codeIntentReviewModel(packet,summary,[],[]);
 assert.equal(model.changes[0].comparison.before.text,'(file did not exist in the accepted baseline)');
 assert.equal(model.changes[0].before,'The accepted baseline did not contain MenuService.java.');
 assert.match(model.changes[0].comparison.after.text,/reader\.readLine/);
});

test('multiple rule findings remain separate tiles for the same behavior',()=>{
 const review=require('./assets/readable-review.js');
 const packet={repository:'r',baseline_commit:'b',head_commit:'h',flows:[{id:'c1',source:{file:'Order.java'},method:'Order::cancel',fact_changes:[]}]};
 const summary={intent_semantics:{status:'recorded',explanations:[{change_id:'c1',title:'Order cancellation',concept:'state transition',changed_source:{file:'Order.java',method:'Order::cancel'},behavior_before:'Cancellation was rejected.',behavior_after:'Cancellation succeeds.'}]}};
 const checks=[{id:'coding_standards',output:{public_findings:[
  {rule_id:'SR-EXC-001',name:'No swallowed exceptions',band:'finding',file:'Order.java',unit:'Order.cancel',guidance:'Return an explicit failure.'},
  {rule_id:'SR-BUG-NULL-001',name:'Validate nullable inputs',band:'finding',file:'Order.java',unit:'Order.cancel',guidance:'Reject missing order identifiers.'},
  {kind:'check_verdict',name:'2 standards findings',ref:'F-audit'}
 ]}}];
 const model=review.codeIntentReviewModel(packet,summary,[],checks);
 const findings=model.changes.filter(row=>row.status==='finding');
 assert.equal(model.changes.length,3);
 assert.deepEqual(findings.map(row=>row.findings[0].basis),['SR-EXC-001','SR-BUG-NULL-001']);
 assert.ok(findings.every(row=>row.relatedBehaviorId==='c1'));
});

test('review categories come from deterministic rule metadata',()=>{
 const review=require('./assets/readable-review.js');
 const checks=[{id:'coding_standards',output:{public_findings:[
  {rule_id:'SR-BUG-NULL-001',name:'Validate nullable inputs',band:'finding',category:'null-and-equality',category_parent:'defects',file:'Order.java'},
  {rule_id:'SR-AGG-001',name:'Protect aggregate state',band:'finding',category:'domain-model',category_parent:'architecture',file:'Ticket.java'}
 ]}},{id:'improper_tests',output:{public_findings:[{kind:'weak',file:'OrderTest.java'}]}}];
 const model=review.codeIntentReviewModel({flows:[]},{intent_semantics:{status:'no_changes'}},[],checks);
 assert.deepEqual(model.changes.map(row=>row.reviewType),['Bug','Architecture','Test']);
});

test('an improper-test failure prevents a false unchanged-behavior screen',()=>{
 const review=require('./assets/readable-review.js');
 const checks=[{id:'intent_diff',state:'passed'},{id:'improper_tests',output:{public_findings:[{kind:'weak',file:'OrderTest.java',unit:'OrderTest.cancels',signals:'has no assertion',basis:'pattern match'}]}}];
 const model=review.codeIntentReviewModel({repository:'r',baseline_commit:'b',head_commit:'h',flows:[]},{intent_semantics:{status:'no_changes'}},[],checks);
 assert.equal(model.changes.length,1);
 assert.equal(model.changes[0].title,'Test may not detect broken behavior');
 assert.match(model.changes[0].summary,/has no assertion/);
});

test('watch-only defects stay visible without being presented as enforced',()=>{
 const review=require('./assets/readable-review.js');
 const checks=[{id:'intent_diff',state:'passed'},{id:'coding_standards',watch_only_findings:[{rule_id:'SR-BUG-MEM-001',name:'State does not grow without limit',band:'finding',file:'TenantHandler.java',unit:'TenantHandler.withTenant'}]}];
 const model=review.codeIntentReviewModel({repository:'r',baseline_commit:'b',head_commit:'h',flows:[]},{intent_semantics:{status:'no_changes'}},[],checks);
 assert.equal(model.changes.length,1);
 assert.equal(model.changes[0].findings[0].title,'State does not grow without limit');
 assert.equal(model.changes[0].status,'watch');
});

test('completed checks with review items do not render an all-passed headline',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const live=fs.readFileSync(path.join(__dirname,'assets','walkthrough-live.js'),'utf8');
 assert.match(live,/verdict\(\)==='PASS'&&!count/);
 assert.match(live,/review item/);
});

test('generic missing-governance prose is not presented as an analysis limit',()=>{
 const review=require('./assets/readable-review.js');
 const summary={intent_semantics:{status:'no_changes',uncertainty:['No governed obligation was supplied for this change.','Runtime dispatch could not be resolved.']}};
 const model=review.codeIntentReviewModel({repository:'r',baseline_commit:'b',head_commit:'h',flows:[]},summary,[],[{id:'intent_diff',state:'passed'}]);
 assert.deepEqual(model.uncertainty,['Runtime dispatch could not be resolved.']);
});

test('a status judgment restores a governed flow when optional embedded interpretation is unavailable',()=>{
 const review=require('./assets/readable-review.js');
 const packet={repository:'owner/repo',baseline_commit:'base',head_commit:'head',flows:[{
  id:'change-1',title:'FTGO-AGGREGATE-STATE',boundary_id:'FTGO-AGGREGATE-STATE',
  source:{file:'Order.java'},method:'Order#cancel/0',behavior_judgment:null,
  concepts:[{unit_id:'region-1'}],fact_changes:[{form:'state_transition',
   before:[{allowed:['APPROVED']}],after:[{allowed:['APPROVAL_PENDING','APPROVED']}]}]
 }]};
 const checks=[{id:'intent_diff',state:'failed',judgments:[{question_id:'question-1',
  boundary_id:'FTGO-AGGREGATE-STATE',intent_region_ids:['region-1'],answer:'violated'}]}];
 const model=review.codeIntentReviewModel(packet,{},[],checks);
 assert.equal(model.changes.length,1);
 assert.equal(model.changes[0].status,'violation');
 assert.equal(model.changes[0].method,'Order#cancel');
 assert.match(model.changes[0].summary,/governed semantic violation/);
});

test('live walkthrough derives and digest-verifies the pinned production artifact from status',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const live=fs.readFileSync(path.join(__dirname,'assets','walkthrough-live.js'),'utf8');
 assert.match(live,/review-artifact-reference-v1/);
 assert.match(live,/searchParams\.set\('detail','review-artifact'\)/);
 assert.match(live,/loadJson\(dataPath,2\*1024\*1024,digest\)/);
});

// Exercise the no-artifact render branch with terminal and pending run states.
test('missing review artifacts show terminal failures instead of waiting',()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const source=fs.readFileSync(require('node:path').join(__dirname,'assets/walkthrough-live.js'),'utf8');
 const fn=source.slice(source.indexOf('function listScreen(){'),source.indexOf('function ',source.indexOf('function listScreen(){')+10));
 const state={model:null,status:{state:'completed'},error:''};
 const sandbox={state,ciTop:()=>'',checks:()=>[{id:'intent_diff',label:'Governed boundary',state:'error',detail:'Base does not match an accepted baseline'}],esc:s=>String(s)};
 vm.createContext(sandbox);vm.runInContext(fn,sandbox);
 assert.match(sandbox.listScreen(),/Base does not match an accepted baseline/);
 assert.doesNotMatch(sandbox.listScreen(),/Waiting for recorded/);
 state.status.state='in_progress';
 assert.match(sandbox.listScreen(),/Waiting for recorded/);
 state.error='Artifact checksum differs';
 assert.match(sandbox.listScreen(),/Artifact checksum differs/);
 assert.doesNotMatch(sandbox.listScreen(),/Waiting for recorded/);
});
