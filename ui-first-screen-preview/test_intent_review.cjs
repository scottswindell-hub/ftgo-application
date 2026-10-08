const assert=require('node:assert/strict');
const fs=require('node:fs');
global.window=global;
global.CSS={escape:s=>String(s)};
global.customerDetail=d=>String(d||'');
eval(fs.readFileSync(__dirname+'/assets/intent-impact.js','utf8'));

const order='ftgo-order-service/src/main/java/p/Order.java',saga='ftgo-order-service/src/main/java/p/CreateOrderSagaState.java';
const view={size:{files:2,lines:40},services:['Order service'],noise:{files:['README.md'],ungoverned:['Order.helper()'],context_only:[]},gaps:[],
 concepts:[{question_id:'q1',boundary_id:'FTGO-COMMAND-VALUE',concept:'Command identity',intended:'Preserve the command field.',sentence:'The <b>consumer id</b> binding was removed.',
   changed:{file:saga,line:105,deleted:true,method:'CreateOrderSagaState.makeAuthorizeCommand()'},affected:null,services:['Order service'],form:'value_binding',
   facts:{before:{slot:'withConsumerId',value:'getConsumerId()'},after:null}}],
 unjudged:['cancel','undoPendingCancel'].map((m,i)=>({flow_id:'f'+i,boundary_id:'FTGO-AGGREGATE-STATE',form:'state_transition',method:`Order.${m}()`,
   changed:{file:order,line:80+i,side:'before'},before:[{allowed:['APPROVED'],writes:['this.state=CANCEL_PENDING']}],after:[],reasons:['judgment_not_supplied']}))};
const live={checks:[{id:'intent_diff',judgments:[{question_id:'q1',verdict:'changed',confidence:'high'}]}]};
const html=intentImpactSection({intent_impact:view},live);

// Summary reports judged and unresolved concepts separately; nothing is judged that was not asked.
assert.match(html,/Intent changed in 1 of 2 concepts/);
assert.match(html,/3 governed changes across 3 methods/);
assert.match(html,/1 other method changed without a governed fact/);
// Concepts: the interpreted one first and open, the unexplained one listed as unresolved.
assert.ok(html.indexOf('data-ii-concept="rt-intent-command-identity"')<html.indexOf('data-ii-concept="rt-intent-aggregate-state"'));
assert.match(html,/id="rt-intent-aggregate-state" data-ii-panel data-outline-name="Aggregate state" data-outline-status="gap" hidden/);
assert.match(html,/no boundary question/);
assert.doesNotMatch(html,/Ask Code Intent/);
assert.doesNotMatch(html,/Can.?t confirm/);
assert.doesNotMatch(html,/Aggregate state<\/b><span class="ii-status/);
// Identical recorded changes across methods collapse into one row with method chips.
assert.match(html,/Order\.cancel\(\) \+1 more/);
assert.match(html,/Same recorded change in 2 methods/);
// Transitions come only from recorded facts; a missing after-side is stated, not inferred.
assert.match(html,/Approved → Cancel pending/);
assert.match(html,/recorded before, not recorded in this PR/);
assert.doesNotMatch(html,/no longer allowed/);
// Evidence keeps the patch loader contract and reads a baseline-only anchor from the old side.
assert.match(html,/class="ii-code ii-changed" data-file="[^"]+Order\.java"[^>]*data-mode="old" data-line="80"/);
assert.match(html,/data-file="[^"]+CreateOrderSagaState\.java"[^>]*data-mode="deleted" data-line="105"/);
assert.match(html,/Before this PR<\/b> · baseline/);



console.log('intent review ok');

// Governance policy: the accepted policy on the decision, and the obligation chain on the concept.
const baseline={status:'accepted',source_commit:'base1',governance_version:'gov:8b93d8283177ea7c34bb9d9f',ontology_sha256:'e4eaf7ad066d',workflows:13,accepted_obligations:20};
const decisionDoc={verdict:'VIOLATION',governance_baseline:baseline,checks:[{id:'governance_decision',state:'failed'},{id:'intent_diff',state:'failed',detail:'',judgments:[]},
  {id:'coding_standards',state:'passed',findings:[],watch_only_findings:[{rule_id:'r'}]},{id:'rule_impact',state:'passed',findings:[{status:'gap',basis:'context_only_cpg_drift',file:'a/B.java',enforced:'false'}]},
  {id:'connected_evidence',state:'passed',detail:'0 required evidence gap(s)',substeps:[{id:'integrity',state:'passed'}]}]};
const pinned={baseline_commit:'base1',governed_objectives:{version_id:baseline.governance_version},intent_impact:view};
const decision=decisionSection(decisionDoc,pinned);
assert.match(decision,/Accepted policy.*gov:8b93d828.*13 workflows · 20 accepted obligations/s);
assert.match(decision,/Pinned to this run's base/);
assert.match(decisionSection(decisionDoc,{...pinned,baseline_commit:'other'}),/Does not match this run's base/);
assert.match(decision,/pt-chip w-enforced">Enforced · blocks<\/span><b><a[^>]*>Intent differences/);
assert.match(decision,/pt-chip w-watch">Watch-only<\/span><b><a[^>]*>Coding standards/);
assert.match(decision,/pt-chip w-advisory">Advisory review<\/span><b><a[^>]*>Governance-rule impact/);
const judgedDoc={checks:[{id:'intent_diff',judgments:[{question_id:'q1',verdict:'changed',confidence:'high',workflow_obligations:[
  {workflow_id:'place_order',workflow_name:'Place an order',workflow_category:'Customer order lifecycle',obligation_id:'place.authorize_order',statement:'Authorization binds the consumer identity.',witness_count:3,governance_status:'accepted',phase:'coordination'}]}]}]};
const governed=intentImpactSection({intent_impact:view},judgedDoc);
assert.match(governed,/Customer workflow<\/span><b>Place an order<\/b>/);
assert.match(governed,/Authorization binds the consumer identity\./);
assert.match(governed,/3 witnesses/);
assert.match(governed,/data-intent-governance="1" data-workflow-id="place_order"/);
assert.match(governed,/Proposed policy change/);

// Evidence coverage: one gap list, two lanes, a fixed action each, no internal tool names.
const gaps=evidenceGaps(decisionDoc,pinned);
assert.deepEqual(gaps.map(g=>g.lane),['advisory','advisory']);
assert.equal(gaps[0].title,'2 governed changes with no boundary question');
assert.equal(gaps[1].title,'Surrounding code structure changed');
assert.ok(gaps.every(g=>g.close));
const coverage=connectedSection(decisionDoc,pinned);
assert.match(coverage,/Nothing required is missing/);
assert.doesNotMatch(coverage,/cpg|typesafe|joern|llm/i);
const failing={...decisionDoc,checks:decisionDoc.checks.map(c=>c.id==='connected_evidence'?{...c,detail:'2 required evidence gap(s)',substeps:[{id:'integrity',state:'failed'}]}:c)};
assert.deepEqual(evidenceGaps(failing,pinned).filter(g=>g.lane==='required').map(g=>g.title),
  ['2 findings cite evidence missing from this revision','Baseline, governance version or source did not match this revision']);
assert.match(connectedSection(failing,pinned),/2 required gaps/);
console.log('governance and coverage ok');

// Standards expose their declared collection instead of appearing as an undifferentiated rule list.
const standards=standardsSection({checks:[{id:'coding_standards',findings:[],watch_only_findings:[{
  rule_id:'SR-AGG-001',rule_version:'1',name:'Aggregate state changes go through aggregate methods',
  category:'domain-model',category_parent:'architecture',band:'finding',confidence:'0.96',
  file:'ftgo-order-history-service/src/main/java/p/OrderHistoryEventHandlers.java',line:'55',
  unit:'OrderHistoryEventHandlers.handleOrderAuthorized',severity:'high'}]}]});
assert.match(standards,/Coding standards.*Architecture · Domain model.*SR-AGG-001/s);
assert.match(standards,/Standards collection<\/span><span class="lv">Architecture · Domain model/);
console.log('standards collection ok');
