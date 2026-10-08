const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function render(packet){
 const state={};
 const context=vm.createContext({document:{addEventListener(){}},reviewBoards:new Map(),URLSearchParams,location:{search:''},
  reviewState:()=>state,esc:value=>String(value??'').replaceAll('<','&lt;'),
  objectiveTerritoriesMarkup:()=>'<svg aria-label="Evidence-backed objective territories"></svg>'});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/governed-objectives.js'),'utf8'),context);
 return context.governedObjectivesMarkup(packet,{scope:'test'});
}
function fixture(head='head'){
 return {baseline_commit:'base',head_commit:head,flows:[],governed_objectives:{
  baseline_commit:'base',head_commit:head,architecture:[{id:'architecture',
   statement:'Services retain independent ownership.',governance_result:{status:'satisfied'}}],
  business:['Approval','Rejection','Cancellation','Revision'].map((name,i)=>({id:name,
   statement:name+' retains its accepted outcome.',governance_result:{status:i===0?'violated':i===1?'evidence_needed':'satisfied'},
   accepted_obligations:[{id:'obligation:'+name,statement:name+' outcome.',status:'accepted'}]})),
  holon_map:{mappings:[],methods:[],holons:[]}}};
}
test('missing workflow overlay still renders all five accepted objective descriptions and results',()=>{
 for(const head of ['head','base']){
  const html=render(fixture(head));
  assert.equal((html.match(/data-governed-area=/g)||[]).length,5);
  assert.match(html,/Services retain independent ownership/);
  assert.match(html,/Objective violated/);
  assert.match(html,/Accepted objective evidence missing/);
  assert.match(html,/Accepted obligations satisfied/);
  assert.match(html,/Evidence-backed objective territories/);
  assert.doesNotMatch(html,/No governed workflows were supplied/);
 }
});
test('missing objective declarations or stale source are explicit, never an empty tab',()=>{
 const packet=fixture();packet.governed_objectives.business=[];packet.governed_objectives.architecture=[];
 assert.match(render(packet),/Governed objectives unavailable/);
 packet.governed_objectives.head_commit='wrong';
 assert.throws(()=>render(packet),/Governance snapshot differs/);
});

test('objective click selects its actual mapped methods and scrolls the rendered terrain into view',()=>{
 const packet=fixture();
 const doc=packet.governed_objectives;
 doc.business=[{id:'mapped',statement:'Mapped outcome.',governance_result:{status:'satisfied'},accepted_obligations:[]}];
 doc.architecture=[{id:'unmapped',statement:'Unmapped constraint.',governance_result:{status:'not_assessed'}}];
 doc.holon_map={mappings:[{id:'mapped',kind:'business',method_ids:['m1','m2'],scope_method_ids:['m1','m2'],holon_ids:['h1']}],
  methods:[{id:'m1',method:'One.first()',file:'One.java',changed:false},{id:'m2',method:'Two.second()',file:'Two.java',changed:false},{id:'m3',method:'Other.third()',file:'Other.java',changed:false},{id:'m4',method:'Else.fourth()',file:'Else.java',changed:false}],
  holons:[{id:'h1',method_ids:['m1','m2','m3']}],services:[]};
 doc.territory={services:[['service','Application']],files:[],calls:[],native_holons:[['h1',[0,1,2]]],
  methods:[['m1',0,'first',0,100,100,0,0],['m2',0,'second',0,200,200,0,0],['m3',0,'third',0,300,300,0,0],['m4',0,'fourth',0,400,400,0,0]],
  relation_counts:{},layout_version:'test',baseline_commit:'base',graph_sha256:'graph',qualification:'test'};
 const handlers={};let rendered='';let scrolled=0;const state={};
 const context=vm.createContext({document:{addEventListener:(name,fn)=>{handlers[name]=fn;},
   querySelectorAll:()=>[{dataset:{reviewScope:'test'},querySelector:()=>({scrollIntoView:()=>scrolled++})}]},reviewBoards:new Map(),URLSearchParams,location:{search:''},
  reviewState:()=>state,esc:value=>String(value??'').replaceAll('<','&lt;'),
  render:()=>{rendered=context.governedObjectivesMarkup(packet,{scope:'test'});}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/objective-territories.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/governed-objectives.js'),'utf8'),context);
 context.render();
 const button={dataset:{governedArea:'mapped'},hasAttribute:()=>false,closest:selector=>selector==='[data-review-scope]'?{dataset:{reviewScope:'test'}}:null};
 handlers.click({target:{closest:()=>button}});
 assert.equal(state.governedArea,'mapped');
 assert.equal(scrolled,1);
 assert.match(rendered,/data-objective-id="mapped"/);
 assert.match(rendered,/data-terrain-method-id="m1"/);
 assert.match(rendered,/data-terrain-method-id="m2"/);
 assert.match(rendered,/stroke="#f08c00"/);
 assert.match(rendered,/Orange: accepted scope/);
 assert.match(rendered,/Blue: mapped region membership/);
 assert.match(rendered,/data-terrain-method-id="m3" opacity="1"/);
 assert.match(rendered,/data-terrain-method-id="m4" opacity="\.14"/);
 button.dataset.governedArea='unmapped';
 handlers.click({target:{closest:()=>button}});
 assert.match(rendered,/No exact source or region mapping is recorded for this objective/);
 assert.doesNotMatch(rendered,/stroke="#f08c00"/);
 assert.doesNotMatch(rendered,/stroke="#1971c2"/);
});
