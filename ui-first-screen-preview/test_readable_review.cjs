const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function load(name,extra={}){
 const context={console,...extra};context.globalThis=context;vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'assets',name),'utf8'),context);
 return context;
}

test('semantic explanations become the readable before and after review',()=>{
 const ui=load('readable-review.js');
 const packet={baseline_commit:'base',head_commit:'head',repository:'o/r',flows:[{
  id:'change-1',title:'FTGO-AGGREGATE-STATE',method:'p.Ticket#cancel/0',source:{file:'svc/Ticket.java'},
  fact_changes:[{form:'state_transition',before:[{allowed:['ACCEPTED']}],after:[{allowed:['ACCEPTED','PREPARING']}]}]
 }]};
 const summary={intent_semantics:{status:'recorded',uncertainty:['Static evidence only.'],explanations:[{
  change_id:'change-1',title:'Ticket cancellation',concept:'FTGO-AGGREGATE-STATE',
  behavior_before:'Accepted tickets could be cancelled.',behavior_after:'Preparing tickets can also be cancelled.',
 semantic_consequence:'Cancellation expands into active preparation.',user_or_system_effect:'Kitchen work may now be interrupted.',
  accepted_intent:null,affected_outcome_ids:[],graph_path:[],decision_state:'governance_mapping_not_decided',region_ids:[],
  source_comparison:{complete:true,file:'svc/Ticket.java',before:{text:'old body'},after:{text:'new body'}}
 }]},behavior_narrative:{packet:{changes:{}}},cards:[]};
 const model=ui.codeIntentReviewModel(packet,summary,[]);
 assert.equal(model.changes.length,1);assert.equal(model.constraints.length,0);
 assert.equal(model.changes[0].status,'decision');
 assert.equal(model.changes[0].comparison.before.text,'old body');
 assert.equal(model.changes[0].summary,'Cancellation expands into active preparation.');
 const html=ui.codeIntentReviewMarkup(model,'test');
 assert.match(html,/Did you intend these behavioral changes/);
 assert.match(html,/Cancellation expands into active preparation/);
 assert.doesNotMatch(html,/Kitchen work may now be interrupted/);
 assert.doesNotMatch(html,/model|confidence|probability/i);
});

test('accepted graph paths put a change in constraint violations',()=>{
 const ui=load('readable-review.js');
 const packet={flows:[{id:'c',method:'Ticket.cancel',source:{file:'Ticket.java'},behavior_judgment:{status:'supported_boundary_violation'}}]};
 const summary={intent_semantics:{status:'recorded',explanations:[{change_id:'c',title:'Cancellation states',concept:'State',behavior_before:'Only accepted.',behavior_after:'Also preparing.',semantic_consequence:'The state contract changes.',user_or_system_effect:'Preparation can be interrupted.',accepted_intent:'Tickets in preparation cannot be cancelled.',affected_outcome_ids:['cancel'],graph_path:[{workflow_id:'cancel',customer_outcome:'Cancel an order',obligation_statement:'Preserve ticket eligibility.'}]}]}};
 const model=ui.codeIntentReviewModel(packet,summary,[]);
 assert.equal(model.changes.length,0);assert.equal(model.constraints.length,1);
 assert.equal(model.constraints[0].status,'violation');
 assert.match(ui.codeIntentReviewMarkup(model,'constraint'),/Constraint violations/);
});

test('an empty semantic review has the quiet pass state',()=>{
 const ui=load('readable-review.js');
 const model=ui.codeIntentReviewModel({flows:[]},{intent_semantics:{status:'no_changes',explanations:[]}},[
  {id:'legacy',category:'Intent differences',title:'Legacy fallback must not override no changes'}
 ],[{id:'intent_diff',state:'passed'}]);
 assert.equal(model.changes.length,0);
 assert.match(ui.codeIntentReviewMarkup(model,'empty'),/Behavior is unchanged/);
});

test('missing semantic evidence never claims behavior is unchanged',()=>{
 const ui=load('readable-review.js');
 const model=ui.codeIntentReviewModel({flows:[]},{},[],[
  {id:'backend_artifacts',state:'error'},{id:'intent_diff',state:'blocked'}
 ]);
 assert.equal(model.confirmedNoChange,false);
 const html=ui.codeIntentReviewMarkup(model,'missing');
 assert.match(html,/Review evidence is unavailable/);
 assert.doesNotMatch(html,/Behavior is unchanged/);
});

test('recorded governed flow remains reviewable without optional semantic prose',()=>{
 const ui=load('readable-review.js');
 const file='src/DeliveryService.java';
 const packet={acceptance:{layers:{core_objectives:{violations:[{statement:'Preserve delivery scheduling.'}]}}},
  source_diff:{content:`diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -1 +1 @@\n-old\n+new`},flows:[
   {id:'removed',title:'FTGO-CROSS-SERVICE-EFFECT',method:'DeliveryService#scheduleDelivery/2',source:{file},
    behavior_judgment:{question_id:'q1',boundary_id:'FTGO-CROSS-SERVICE-EFFECT',status:'supported_boundary_violation',choice:'violated'},
    observed_deltas:[{fields:{fact:{before:['boundary_call {"receiver":"courier"}'],after:null}}}]},
   {id:'added',title:'FTGO-CROSS-SERVICE-EFFECT',method:'DeliveryService#scheduleDelivery/2',source:{file},
    behavior_judgment:{question_id:'q1',boundary_id:'FTGO-CROSS-SERVICE-EFFECT',status:'supported_boundary_violation',choice:'violated'},
    observed_deltas:[{fields:{fact:{before:null,after:['boundary_call {"receiver":"courier"}']}}}]}
  ]};
 const model=ui.codeIntentReviewModel(packet,{},[],[{id:'intent_diff',state:'failed'}]);
 assert.equal(model.constraints.length,1);
 assert.equal(model.constraints[0].status,'violation');
 assert.equal(model.constraints[0].objective,'Preserve delivery scheduling.');
 const html=ui.codeIntentReviewMarkup(model,'governed-fallback');
 assert.match(html,/Cross service effect/);
 assert.doesNotMatch(html,/Behavior is unchanged|Review evidence is unavailable/);
});

test('an unresolved intent check remains reviewable when semantic prose has no rows',()=>{
 const ui=load('readable-review.js');
 const model=ui.codeIntentReviewModel({flows:[]},{intent_semantics:{status:'no_changes',explanations:[]}},[
  {id:'legacy',category:'Intent differences',title:'Recorded unresolved change'}
 ],[{id:'intent_diff',state:'error'}]);
 assert.equal(model.changes.length,1);
 assert.match(ui.codeIntentReviewMarkup(model,'unresolved'),/Recorded unresolved change/);
});

test('paired-source narrative supplies the readable fallback without another semantic call',()=>{
 const ui=load('readable-review.js');
 const comparison={file:'DeliveryService.java',complete:true,before:{text:'random courier'},after:{text:'assignment policy'}};
 const summary={intent_semantics:{status:'no_changes',explanations:[]},behavior_narrative:{status:'recorded',
  summary:'Scheduling delegates courier selection to a policy.',stories:[{story_id:'s',title:'Use assignment policy',change_ids:['c'],explanation:'Direct random selection is replaced by the assignment policy.'}],
  unexplained_change_ids:['supporting'],packet:{changes:{c:{method:'DeliveryService.scheduleDelivery',source:{file:'DeliveryService.java'},source_comparison:comparison}}}}};
 const model=ui.codeIntentReviewModel({flows:[]},summary,[{id:'legacy',category:'Intent differences',title:'Legacy'}],[{id:'intent_diff',state:'error'}]);
 assert.equal(model.changes.length,1);assert.equal(model.changes[0].title,'Use assignment policy');
 assert.match(model.changes[0].groundingLabel,/AGENT INTERPRETATION/);
 assert.equal(model.changes[0].intentBefore.length,0);assert.equal(model.additionalRecorded,1);
 assert.match(ui.codeIntentReviewMarkup(model,'narrative'),/1 additional analyzed change remains/);
});

test('bounded semantic omissions remain visible without adding review rows',()=>{
 const ui=load('readable-review.js');
 const model=ui.codeIntentReviewModel({flows:[]},{intent_semantics:{
  status:'recorded',explanations:[],uncertainty:[],omitted_change_ids:['a','b']
 }},[{id:'fallback',category:'Intent differences',title:'Fallback change'}]);
 assert.equal(model.omitted,2);
 assert.match(ui.codeIntentReviewMarkup(model,'bounded'),/2 additional grouped intent changes were recorded/);
});

test('pipeline status uses the existing checks under two headings',()=>{
 const ui=load('readable-pipeline.js',{customerDetail:value=>value,customerCheckLabel:check=>check.label,checkStepsMarkup:()=>''});
 const html=ui.readablePipelineChecksMarkup({verdict:'UNKNOWN',sha:'abcdef',checks:[
  {id:'severity',label:'Assess change scope',state:'passed',detail:'Broad'},
  {id:'intent_diff',label:'Analyze intent',state:'error',detail:'Owner decision needed'}
 ]});
 assert.match(html,/CodeIntent \/ analysis/);assert.match(html,/CodeIntent \/ intent review/);
 assert.match(html,/Assess change scope/);assert.match(html,/Analyze intent/);
});
