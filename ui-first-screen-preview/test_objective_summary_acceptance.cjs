const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context=vm.createContext({URLSearchParams,location:{search:''},esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')});
context.window=context;
vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/objective-summary.js'),'utf8'),context);

test('accepted scenario violation remains prominent when cached native review has no findings',()=>{
 const summary={violations:[],presentation:{summary:'Revision calculation was extracted.'}};
 const packet={acceptance:{status:'blocked',layers:{core_objectives:{violations:[
  {objective_id:'revision',statement:'Confirm the accepted revision.'},
  {objective_id:'revision',statement:'Confirm the accepted revision.'}]}}}};
 const before=JSON.stringify({summary,packet});
 const html=context.objectiveSummaryMarkup(summary,packet);
 assert.match(html,/Governance acceptance blocked/);
 assert.match(html,/data-summary-acceptance="blocked"/);
 assert.equal(html.split('Confirm the accepted revision.').length-1,1);
 assert.doesNotMatch(html,/No recorded governed violations|No additional findings/);
 assert.ok(html.indexOf('Governance acceptance blocked')<html.indexOf('Revision calculation was extracted.'));
 assert.equal(JSON.stringify({summary,packet}),before);
});

test('incomplete acceptance is preserved and objective statements are escaped',()=>{
 const html=context.objectiveSummaryMarkup({violations:[]},
  {acceptance:{status:'incomplete',layers:{core_objectives:{violations:[{objective_id:'x',statement:'<script>bad</script>'}]}}}});
 assert.match(html,/Governance assessment incomplete/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
});

test('packet renderer supplies the current acceptance to the summary',()=>{
 const source=fs.readFileSync(path.join(__dirname,'assets/packet-view.js'),'utf8');
 assert.match(source,/objectiveSummaryMarkup\(objectiveSummary,packet\)/);
});

test('summary leads with recorded code intent rather than a generic change recap',()=>{
 const packet={intent_impact:{concepts:[{concept:'Aggregate state',intended:'Cancellation preserves the accepted transition.',sentence:'The allowed source states expanded.'}],unjudged:[{boundary_id:'FTGO-COMMAND-VALUE'}]}};
 const lead=context.intentSemanticLead(packet);
 assert.match(lead,/Code intent affected: Aggregate state/);
 assert.match(lead,/Accepted intent: Cancellation preserves the accepted transition/);
 assert.match(lead,/Recorded semantic effect: The allowed source states expanded/);
 assert.match(lead,/Command value.*no boundary judgment/);
 const html=context.objectiveSummaryMarkup({violations:[],behavior_narrative:{status:'recorded',summary:'Files changed.'}},packet);
 assert.match(html,/Code intent affected: Aggregate state/);
 assert.doesNotMatch(html,/Files changed/);
 assert.doesNotMatch(html,/Click to address/);
});

test('graph-grounded semantics describe behavior and outrank the generic synopsis',()=>{
 const packet={intent_impact:{concepts:[{concept:'Aggregate state',intended:'Keep state coherent.',sentence:'A state write changed.'}],unjudged:[]}};
 const summary={presentation:{summary:'Files and methods changed.'},violations:[],cards:[],omitted_objectives:[],
  intent_semantics:{status:'recorded',explanations:[{change_id:'change-1',concept:'Aggregate state',
   title:'Ticket acceptance records accepted state',behavior_before:'Acceptance emitted an event without a recorded state write.',
   behavior_after:'Acceptance emits the event and records the accepted state.',
   semantic_consequence:'Ticket acceptance now changes aggregate state as well as emitting the acceptance event.',
   user_or_system_effect:'Downstream ticket operations can observe the accepted state after acceptance.',affected_outcome_ids:['fulfill'],
   graph_path:[{workflow_id:'fulfill',workflow_name:'Fulfill a ticket',obligation_statement:'Acceptance advances ticket state.',customer_outcome:'Kitchen staff can fulfill accepted tickets.'}]}]}};
 const lead=context.intentSemanticLead(packet,summary);
 assert.match(lead,/now changes aggregate state/);
 assert.doesNotMatch(lead,/Files and methods changed/);
 const html=context.objectiveSummaryMarkup(summary,packet);
 assert.match(html,/Downstream ticket operations can observe/);
});

test('behavior narrative maps to the exact intent tile target',()=>{
 const summary={behavior_narrative:{status:'recorded',stories:[
  {story_id:'story:ticket',title:'Ticket acceptance changed',explanation:'The accepted transition now writes a different state.',change_ids:['change:ticket']},
  {story_id:'story:order',title:'Order behavior changed',explanation:'Unrelated.',change_ids:['change:order']}
 ],packet:{changes:{
  'change:ticket':{kind:'behavior_delta',before:{owner:'net.ftgo.Ticket#accept/1',source:{file:'service/Ticket.java'}},after:{owner:'net.ftgo.Ticket#accept/1',source:{file:'service/Ticket.java'}}},
  'change:order':{kind:'behavior_delta',after:{owner:'net.ftgo.Order#approve/0',source:{file:'service/Order.java'}}}
 }}}};
 const stories=context.behaviorStoriesForTargets(summary,[{file:'service/Ticket.java',method:'Ticket.accept()',flowIds:''}]);
 assert.equal(stories.length,1);
 assert.equal(stories[0].story_id,'story:ticket');
 assert.equal(context.behaviorStoriesForTargets(summary,[{file:'service/Ticket.java',method:'Ticket.reject()',flowIds:''}]).length,0);
});

test('verified objective explanation takes precedence over a generic graph synopsis',()=>{
 const finding={finding_id:'finding:revision',rule_id:'rule:confirmation',objective_id:'revision'};
 const summary={violations:[],presentation:{summary:'Baseline approved two items; the head throws and keeps one pending.'},
  governance_acceptance:{core_objective_violations:[finding]},
  behavior_narrative:{status:'unavailable',summary:'Graph implementation is not established.'}};
 const packet={acceptance:{status:'blocked',layers:{core_objectives:{violations:[finding]}}}};
 const before=JSON.stringify({summary,packet});
 const html=context.objectiveSummaryMarkup(summary,packet);
 assert.match(html,/Baseline approved two items; the head throws and keeps one pending/);
 assert.doesNotMatch(html,/Behavioral explanation is not available for this graph yet/);
 assert.equal(JSON.stringify({summary,packet}),before);
 const otherFinding={...finding,rule_id:'rule:different'};
 const stale=context.objectiveSummaryMarkup(summary,
  {acceptance:{status:'blocked',layers:{core_objectives:{violations:[otherFinding]}}}});
 assert.match(stale,/Behavioral explanation is not available for this graph yet/);
 assert.doesNotMatch(stale,/Baseline approved two items/);
});
