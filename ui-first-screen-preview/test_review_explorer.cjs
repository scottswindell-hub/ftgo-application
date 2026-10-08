const test=require('node:test'),assert=require('node:assert/strict');
const ex=require('./assets/review-explorer.js');
const empty={changes:[],constraints:[],semanticStatus:'unavailable'};
test('missing explanation preserves recorded evidence and disables assessment',()=>{
 const model=ex.enrich(empty,{flows:[{id:'a',change_kind:'source_changed',source:{file:'Ticket.java'}}]},null,[{id:'intent_diff',state:'error',detail:'Evidence budget exceeded'}]);
 assert.equal(model.changes.length,2);assert.ok(model.changes.every(i=>i.status==='unknown'));
 assert.match(ex.pane(model.changes[0],{flows:[]},null,[],{tab:'ask'}),/No saved explanation/);
});

test('unjudged before/after evidence becomes a concise review card before generic file fallback',()=>{
 const explorer=require('./assets/review-explorer.js');
 const model={semanticStatus:'unavailable',changes:[],constraints:[]};
 const packet={flows:[],explorer:{impact:{unjudged:[{method:'Action.makePickup()',boundary_id:'FTGO-COMMAND-VALUE',
   changed:{file:'Action.java'},flow_id:'old+new',before:[{value:{attrs:{arguments:[{attrs:{member:'DROPOFF'}}]}}}],
   after:[{value:{attrs:{arguments:[{attrs:{member:'PICKUP'}}]}}}]}]}}};
 const result=explorer.enrich(model,packet,{},[]);
 assert.equal(result.changes.length,1);
 assert.equal(result.changes[0].summary,'Action.makePickup() now uses PICKUP instead of DROPOFF.');
 assert.deepEqual(result.changes[0].flowIds,['old','new']);
});

test('only an explicit objective binding classifies recorded evidence as a constraint',()=>{
 const explorer=require('./assets/review-explorer.js');
 const row={method:'Ticket.accept()',changed:{file:'Ticket.java'},before:[{allowed:['NEW']}],after:[{allowed:['ACCEPTED']}],
  objective:'A ticket must be accepted before preparation begins'};
 const result=explorer.enrich({semanticStatus:'unavailable',changes:[],constraints:[]},{flows:[],explorer:{impact:{unjudged:[row]}}},{},[]);
 assert.equal(result.changes.length,0);
 assert.equal(result.constraints.length,1);
 assert.equal(result.constraints[0].kind,'constraint');
 assert.equal(result.constraints[0].objective,row.objective);
});
test('coverage escapes external text and does not declare unanalysed code unchanged',()=>{
 const html=ex.coverage({flows:[],qualification:'<img onerror=alert(1)>'},{intent_semantics:{status:'unavailable'}},[{id:'intent',state:'error',detail:'<script>bad</script>'}]);
 assert.ok(!html.includes('<script>'));assert.match(html,/1 incomplete checks/);assert.match(html,/&lt;img/);
});
test('graph includes only recorded connections and exposes omitted context',()=>{
 const packet={flows:[],graph:{nodes:[{id:'c'},{id:'outcome'},{id:'unrelated'}],edges:[{from:'c',to:'outcome',kind:'mapping'}]}};
 assert.deepEqual(ex.graphData({id:'c'},packet,false).nodes.map(n=>n.id),['c','outcome']);
 assert.equal(ex.graphData({id:'c'},packet,true).nodes.length,3);
});
test('confirmed no changes still exposes required analysis errors',()=>{
 const m=ex.enrich({...empty,semanticStatus:'no_changes'},{flows:[]},null,[{id:'standards',state:'error'}]);assert.equal(m.changes[0].status,'unknown');
});
test('check-level gaps expose selected-file source and recorded workflow witnesses',()=>{
 const file='src/Ticket.java';const packet={flows:[{id:'f',source:{file},method:'Ticket.cancel'}],source_diff:{content:`diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -1 +1 @@\n-case ACCEPTED:\n+case PREPARING:`},explorer:{workflows:{workflows:[{name:'Cancel an order',governance_status:'accepted',obligations:[{id:'cancel.ticket',statement:'Only accepted tickets cancel',governance:{status:'accepted'},evidence:[{source:{path:file,owner:'Ticket.cancel'},baseline_parameters:{allowed:['ACCEPTED']},replacement_parameters:[]}]}]}]},results:{checks:[{id:'intent_diff',output:{gaps:[{reason:'budget exceeded'}]}}]}}};
 const item={id:'coverage:intent_diff',status:'unknown',check:{id:'intent_diff'}};
 assert.match(ex.pane(item,packet,{},[],{tab:'src',file}),/case PREPARING/);
 assert.match(ex.pane(item,packet,{},[],{tab:'src',file}),/not a finding attributed/);
 assert.match(ex.pane(item,packet,{},[],{tab:'obj',file}),/Cancel an order/);
 assert.match(ex.pane(item,packet,{},[],{tab:'path',file}),/ACCEPTED/);
 assert.match(ex.pane(item,packet,{},[],{tab:'analysis',file}),/budget exceeded/);
 assert.match(ex.pane(item,packet,{},[],{tab:'ask',file}),/no model explanation was generated/);
});
test('recorded region links respect objective method scope',()=>{
 const packet={flows:[],explorer:{governance:{holon_map:{methods:[{id:'m1',file:'A.java',holon_ids:['r1']}],mappings:[{id:'o1',holon_ids:['r1'],scope_method_ids:['m1']}]}},workflows:{workflows:[{id:'w',name:'Order',obligations:[{id:'step',governance:{objective_id:'o1'},evidence:[{source:{path:'B.java'},method_id:'m2'}]}]}]}}};
 assert.equal(ex.linkedObligations('A.java',packet)[0].relationship,'Recorded shared intent region');
 packet.explorer.governance.holon_map.mappings[0].scope_method_ids=['m2'];
 assert.equal(ex.linkedObligations('A.java',packet).length,0);
});
test('a file without membership still shows full PR governance without claiming a connection',()=>{
 const packet={flows:[],explorer:{workflows:{architecture:{status:'accepted',statement:'Preserve services'},workflows:[{id:'cancel',name:'Cancel order',governance_status:'accepted',impact_status:'direct_change',obligations:[{id:'cancel.ticket',statement:'Preserve cancellation states',evidence:[{source:{path:'Ticket.java',owner:'Ticket.cancel'},intent_region_ids:['r1']}]}]}]}}};
 const html=ex.pane({id:'a',file:'Getter.java'},packet,{},[],{tab:'obj'});
 assert.match(html,/No direct or scoped-region objective connection/);assert.match(html,/Cancel order/);assert.match(html,/Ticket.cancel/);assert.match(html,/Preserve services/);assert.ok(!html.includes('Selected file: Direct source witness'));
});
