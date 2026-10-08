const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/objective-territories.js'),'utf8'),context);
function fixture(){return {business:[{id:'business',result:{status:'satisfied'}}],architecture:[{id:'architecture',anchors:['service']}],boundaries:[{result:{status:'violated'},method_ids:['origin']}],holon_map:{mappings:[{id:'business',kind:'business',method_ids:['unrelated'],holon_ids:['shared']}],holons:[{id:'shared',method_ids:['origin','unrelated']}]},territory:{methods:['origin','caller','ancestor','callee','unrelated'].map(id=>[id,0,id,0]),services:[['service']],calls:[[1,0],[2,1],[0,3],[1,2]],native_holons:[['h',[0,4]],['h2',[1,2]]]}};}
test('source changes map without governance bindings and do not promote context-only or mismatched methods',()=>{
 const terrain={files:['A.java','B.java'],methods:[['method:a',0],['method:b',1]]};
 const flow=(id,file,kind='source_changed')=>({change_kind:kind,source:{file},observed_deltas:[{kind:'method_capsule',unit_id:id}]});
 const result=context.terrainSourceChanges({flows:[flow('method:a','A.java'),flow('method:b','B.java','context_changed'),flow('method:b','Wrong.java'),flow('method:new','New.java','added')]},terrain);
 assert.deepEqual([...result.mapped.keys()],['method:a']);
 assert.equal(result.unmapped.length,2);
 assert.equal(context.terrainSourceChanges({},terrain).mapped.size,0);
});
test('impact follows dependent callers transitively, terminates cycles, excludes callees and shared-only members',()=>{
 const b=context.territoryBlastRadius(fixture());
 assert.deepEqual([...b.potential].sort(),['ancestor','caller']);
 assert.equal(b.paths.get(2).next,1);assert.equal(b.paths.get(1).next,0);
 assert.equal(b.holons.length,2);
});
test('objective intersection preserves result and distinguishes contract entry from shared context',()=>{
 const d=fixture(),b=context.territoryBlastRadius(d);
 assert.equal(b.objectives[0].context.length,1);assert.equal(b.objectives[0].direct.length,0);
 assert.equal(b.objectives[1].context.length,3);assert.equal(d.business[0].result.status,'satisfied');
});
test('missing origin is explicit and cannot generate reach',()=>{
 const d=fixture();d.boundaries[0].method_ids=['missing'];const b=context.territoryBlastRadius(d);
 assert.deepEqual([...b.unmapped],['missing']);assert.equal(b.paths.size,0);
});
test('an actual violated business result seeds its recorded entry',()=>{
 const d=fixture();d.boundaries=[];d.business[0].result.status='violated';const b=context.territoryBlastRadius(d);
 assert.deepEqual([...b.origins],['unrelated']);assert.equal(b.paths.size,1);
});
context.document={addEventListener(){}};
vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/governed-objectives.js'),'utf8'),context);
const actualWorkflowImpactStatus=context.workflowImpactStatus;
test('workflow intersections are derived from the canonical bounded evidence list',()=>{
 context.esc=value=>String(value);
 const evidence=(candidate,classification)=>({candidate_id:candidate,classification,form:'state_transition',baseline_parameters:{writes:['state']},replacement_parameters:[],source:{owner:'Order#cancel/0',path:'Order.java',line:1},method_id:'method'});
 const data={workflows:[{id:'cancel',name:'Cancel an order',obligations:[{id:'pending',statement:'Enter cancel pending',evidence:[evidence('affected','exact_fact_change'),evidence('stable','unaffected')]}]}]};
 const markup=context.workflowIntersectionMap(data);
 assert.match(markup,/Cancel an order/);
 assert.match(markup,/<small>affected<\/small>/);
 assert.doesNotMatch(markup,/<small>stable<\/small>/);
});
test('finding mapping requires method arity, source file and an unambiguous witness',()=>{
 const packet={governed_objectives:{holon_map:{methods:[{id:'a',method:'C#run/1',file:'C.java'},{id:'b',method:'C#run/2',file:'C.java'}]}},flows:[{id:'f',title:'rule',method:'C#run/1',source:{file:'C.java'},behavior_judgment:{boundary_id:'rule',status:'supported_boundary_violation'}}]};
 assert.deepEqual([...context.governedBoundaryAreas(packet)[0].method_ids],['a']);
 packet.flows[0].source.file='other.java';
 assert.deepEqual([...context.governedBoundaryAreas(packet)[0].method_ids],[]);
 assert.deepEqual([...context.governedBoundaryAreas(packet)[0].unmapped_flow_ids],['f']);
});
test('unbound changed intent spreads amber potential impact without governing an objective',()=>{
 const d=fixture();d.boundaries[0].result.status='baseline_update_proposed';const b=context.territoryBlastRadius(d);
 assert.equal(b.origins.size,0);assert.deepEqual([...b.changeOrigins],['origin']);
 assert.deepEqual([...b.potential].sort(),['ancestor','caller']);
});
test('mixed bound and unbound findings in a category retain separate origin colors',()=>{
 const packet={governed_objectives:{objective_evaluation:{objectives:[{obligations:[{question_ids:['bound']}]}]},holon_map:{methods:[{id:'a',method:'C#run/1',file:'C.java'},{id:'b',method:'C#stop/0',file:'C.java'}]}},flows:[['a','run/1','bound'],['b','stop/0','unbound']].map(([id,method,q])=>({id,title:'rule',method:'C#'+method,source:{file:'C.java'},behavior_judgment:{boundary_id:'rule',question_id:q,status:'supported_boundary_violation'}}))};
 const area=context.governedBoundaryAreas(packet)[0];
 assert.equal(area.result.status,'violated');assert.deepEqual([...area.violation_method_ids],['a']);assert.deepEqual([...area.unbound_method_ids],['b']);
});

test('affected methods have a wide SVG hit target while retaining an equal-sized dot',()=>{
 context.esc=value=>String(value);context.workflowOutcome=()=>'';context.workflowImpactStatus=()=>({label:'Direct PR intersection'});
 const evidence={classification:'changed_witness_method',intent_region_ids:['holon'],method_id:'method'};
 const obligation={id:'obligation',impact_status:'direct_change',evidence:[evidence]};
 const workflow={id:'workflow',name:'Manage a consumer',actor:'participant',governance_status:'proposed',impact_status:'direct_change',obligations:[obligation]};
 const doc={territory:{methods:[['method',0,'C#method',0,100,100]],services:[['service','consumer-service']]},holon_map:{services:[{id:'service',label:'consumer-service'}],methods:[{id:'method',method:'C#method',service_ids:['service']}],holons:[{id:'holon',method_ids:['method'],service_ids:['service']}]},architecture:[],customer_workflows:{workflow_sets:[],candidate_inventory:{}}};
 const markup=context.workflowMethodImpactMarkup(doc,workflow,[workflow],{});
 assert.match(markup,/workflow-impact-method changed_witness_method[^>]+data-governed-method="method"/);
 assert.match(markup,/workflow-method-hit[^>]+r="7"/);
 assert.match(markup,/workflow-method-dot[^>]+r="2"/);
 assert.match(markup,/consumer-service/);
 const css=fs.readFileSync(path.join(__dirname,'assets/intent-walkthrough.css'),'utf8');
 assert.match(css,/workflow-method-hit\{[^}]*stroke-width:14;pointer-events:stroke/);
 assert.match(css,/workflow-method-holon-ring\{[^}]*stroke:#8c959f[^}]*opacity:\.65/);
 assert.match(css,/is-holon-hovering \.workflow-method-holon-ring\.is-active\{[^}]*stroke:var\(--holon-color\)/);
 assert.match(css,/is-holon-hovering \.workflow-impact-method\.direct-pr-intersection\{opacity:1\}/);
 assert.match(css,/@keyframes direct-pr-intersection-pulse/);
 assert.match(css,/holon-viewer:not\(\[open\]\)\{display:none!important\}/);
 assert.match(css,/method-holon-hover-status\{[^}]*flex-wrap:nowrap;[^}]*height:38px;[^}]*overflow-x:auto;overflow-y:hidden/);
 assert.doesNotMatch(css,/workflow-collapse-target/);
});

test('workflow focus highlights methods without rendering holon placements',()=>{
 context.esc=value=>String(value);context.workflowOutcome=()=>'';context.workflowImpactStatus=()=>({label:'Direct PR intersection'});
 const evidence={classification:'changed_witness_method',intent_region_ids:['shared-holon'],method_id:'method-a',replacement_parameters:[],baseline_parameters:{},form:'fact',source:{path:'C.java',line:1}};
 const obligation={id:'obligation',statement:'Preserve behavior',impact_status:'direct_change',evidence:[evidence]};
 const workflow={id:'workflow',name:'Place an order',actor:'customer',governance_status:'proposed',impact_status:'direct_change',obligations:[obligation]};
 const doc={territory:{methods:[['method-a',0,'C#a',0,100,100],['method-b',0,'C#b',1,105,100]],services:[['order','order-service'],['kitchen','kitchen-service']]},holon_map:{services:[{id:'order',label:'order-service'},{id:'kitchen',label:'kitchen-service'}],methods:[{id:'method-a',method:'C#a',service_ids:['order']},{id:'method-b',method:'C#b',service_ids:['kitchen']}],holons:[{id:'shared-holon',method_ids:['method-a','method-b'],service_ids:['order','kitchen']}]},architecture:[],customer_workflows:{workflow_sets:[],candidate_inventory:{}}};
 const markup=context.workflowMethodImpactMarkup(doc,workflow,[workflow],{governedMethod:'method-a'});
 assert.equal((markup.match(/data-method-id=/g)||[]).length,2);
 assert.match(markup,/workflow-impact-method changed_witness_method direct-pr-intersection ungrouped selected workflow-focus/);
 assert.match(markup,/class="workflow-pr-intersection-pulse"/);
 assert.doesNotMatch(markup,/data-holon-id=/);
 assert.match(markup,/2 methods/);
});

test('workflow impact retains the complete equal-sized baseline method map',()=>{
 context.esc=value=>String(value);context.workflowOutcome=()=>'';context.workflowImpactStatus=()=>({label:'Direct PR intersection'});
 const evidence={classification:'changed_witness_method',intent_region_ids:['affected'],method_id:'method-a'};
 const obligation={id:'obligation',impact_status:'direct_change',evidence:[evidence]};
 const workflow={id:'workflow',name:'Cancel an order',actor:'customer',governance_status:'accepted',impact_status:'direct_change',obligations:[obligation]};
 const doc={territory:{methods:[['method-a',0,'C#a',0,100,100],['method-b',0,'C#b',0,200,100],['method-c',0,'C#c',0,300,100]],services:[['service','order-service']],native_holons:[['affected',[0]],['stable-one',[1]],['stable-two',[2]]]},holon_map:{services:[{id:'service',label:'order-service'}],methods:[{id:'method-a',method:'C#a',service_ids:['service']},{id:'method-b',method:'C#b',service_ids:['service']},{id:'method-c',method:'C#c',service_ids:['service']}],holons:[{id:'affected',method_ids:['method-a'],service_ids:['service']},{id:'stable-one',method_ids:['method-b'],service_ids:['service']},{id:'stable-two',method_ids:['method-c'],service_ids:['service']}]},architecture:[],customer_workflows:{workflow_sets:[],candidate_inventory:{}}};
 const markup=context.workflowMethodImpactMarkup(doc,workflow,[workflow],{});
 assert.equal((markup.match(/data-method-id=/g)||[]).length,3);
 assert.equal((markup.match(/workflow-method-dot[^>]+r="2"/g)||[]).length,3);
 assert.match(markup,/3 methods/);
 assert.doesNotMatch(markup,/Collapse into holons/);
 assert.equal((markup.match(/class="workflow-method-holon-ring"/g)||[]).length,3);
 assert.match(markup,/data-holon-ids="affected"/);
 assert.match(markup,/Hover a method to inspect its holon memberships; click to open its source changes/);
 assert.match(markup,/Source method changed/);
 assert.equal((markup.match(/class="territory-legend/g)||[]).length,1);
 assert.match(markup,/<h3>Holon viewer<\/h3>/);
 assert.equal((markup.match(/data-holon-viewer-id=/g)||[]).length,3);
 assert.match(markup,/Intersects this PR <span>1<\/span>/);
 assert.match(markup,/Cancel an order · order service · a<\/b><small class="holon-search-match"[^>]*><\/small><span class="holon-row-badges"><small>1 method<\/small><small>1 service<\/small><small class="direct">Contains the same 1 global PR method/);
 assert.match(markup,/Other holons <span>2<\/span>/);
 assert.match(markup,/data-default-relationship="Cancel an order → 1 related flow holon → 1 affected workflow method → 1 PR method shown globally"/);
 assert.match(markup,/<div class="holon-map-viewer"><div class="holon-map-canvas">.*<\/svg>.*<\/div><dialog class="holon-viewer"/);
 assert.match(markup,/data-open-holon-viewer>Open holon viewer/);
 assert.doesNotMatch(markup,/<dialog[^>]+\sopen(?:\s|>)/);
 assert.match(markup,/holon viewer highlights member methods while direct PR intersections remain visible and pulse/);
 assert.match(markup,/Every dot is a clickable method/);
 assert.doesNotMatch(markup,/data-holon-id=/);
});

test('native source-changed flows light the matching terrain method without workflow overclaim',()=>{
 context.esc=value=>String(value);context.workflowOutcome=()=>'';context.workflowImpactStatus=()=>({label:'Unaffected'});
 const workflow={id:'workflow',name:'Observe an order',actor:'operator',governance_status:'accepted',impact_status:'unaffected',obligations:[]};
 const sourcePacket={baseline_commit:'base',head_commit:'head',flows:[{change_kind:'source_changed',source:{file:'src/C.java'},method:'src/C.java::p.C.changed:void()',observed_deltas:[{kind:'method_source_change',unit_id:'src/C.java::p.C.changed:void()'}],potential_impact:[]}]};
 const doc={source_packet:sourcePacket,territory:{files:['src/C.java'],methods:[['method-a',0,'C.stable',0,100,100],['method-b',0,'C.changed',0,200,100]],services:[['service','order-service']],native_holons:[['holon',[0,1]]]},holon_map:{services:[{id:'service',label:'order-service'}],methods:[{id:'method-a',method:'C#stable/0',file:'src/C.java',service_ids:['service']},{id:'method-b',method:'C#changed/0',file:'src/C.java',service_ids:['service']}],holons:[]},architecture:[],customer_workflows:{workflow_sets:[],candidate_inventory:{}}};
 const markup=context.workflowMethodImpactMarkup(doc,workflow,[workflow],{governedMethod:'method-b'});
 assert.match(markup,/workflow-impact-method source_changed direct-pr-intersection/);
 assert.match(markup,/1 affected · 1 directly changed/);
 assert.match(markup,/PR intersection<\/b><span>source changed/);
 assert.match(markup,/data-governed-source-file="src\/C\.java"/);
 assert.doesNotMatch(markup,/exact-fact change|witness-method change/);
});

test('every method opens its signature, arguments, and optimizer memberships',()=>{
 context.esc=value=>String(value);context.workflowOutcome=()=>'';context.workflowImpactStatus=()=>({label:'Unaffected'});
 const evidence={candidate_id:'candidate',classification:'unaffected',intent_region_ids:['holon-a','holon-b'],method_id:'method',replacement_parameters:[],baseline_parameters:{},form:'fact',source:{path:'src/OrderService.java',line:10}};
 const obligation={id:'observe.order',statement:'Observe the order',impact_status:'unaffected',evidence:[evidence]};
 const workflow={id:'workflow',set_id:'operations',name:'Observe an order',actor:'operator',governance_status:'accepted',impact_status:'unaffected',obligations:[obligation]};
 const doc={territory:{files:['src/OrderService.java'],argument_types:['java.lang.Long','java.lang.String'],methods:[['method',0,'OrderService.cancel',0,100,100,0,0,[0,1]]],services:[['service','order-service']],native_holons:[['holon-a',[0]],['holon-b',[0]]]},holon_map:{services:[{id:'service',label:'order-service'}],methods:[],holons:[]},architecture:[],customer_workflows:{workflow_sets:[],candidate_inventory:{}}};
 const markup=context.workflowMethodImpactMarkup(doc,workflow,[workflow],{governedMethod:'method'});
 assert.match(markup,/data-pinned-method="method"/);
 assert.match(markup,/data-governed-method="method" tabindex="0" role="button"/);
 assert.match(markup,/<h3>OrderService\.cancel<\/h3>/);
 assert.match(markup,/<code>java\.lang\.Long<\/code> <code>java\.lang\.String<\/code>/);
 assert.match(markup,/data-governed-holon="holon-a"/);
 assert.match(markup,/data-governed-holon="holon-b"/);
 assert.match(markup,/data-governed-holon="holon-a" title="holon-a">Observe an order · order service/);
 assert.match(markup,/Workflow-evidence binding/);
 assert.match(markup,/1 bound candidate · stable in this PR/);
 assert.match(markup,/PR intersection<\/b><span>No direct intersection/);
 assert.doesNotMatch(markup,/type unavailable/);
 const holonMarkup=context.workflowMethodImpactMarkup(doc,workflow,[workflow],{governedHolon:'holon-a'});
 assert.match(holonMarkup,/data-pinned-holon="holon-a"/);
 assert.match(holonMarkup,/<h3>Observe an order · order service · cancel<\/h3><code>holon-a<\/code>/);
 assert.match(holonMarkup,/1 member method · 1 bound workflow candidate/);
 assert.match(holonMarkup,/Observe an order/);
});

test('holon hover data preserves multi-membership methods and leaves ungrouped methods explicit',()=>{
 context.esc=value=>String(value);context.workflowOutcome=()=>'';context.workflowImpactStatus=()=>({label:'Unaffected'});
 const workflow={id:'workflow',name:'Observe an order',actor:'operator',governance_status:'accepted',impact_status:'unaffected',obligations:[]};
 const doc={territory:{methods:[['shared',0,'C#shared',0,100,100],['single',0,'C#single',0,200,100],['ungrouped',0,'C#ungrouped',0,300,100]],services:[['service','order-service']],native_holons:[['holon-a',[0,1]],['holon-b',[0]]]},holon_map:{services:[{id:'service',label:'order-service'}],methods:[],holons:[]},architecture:[],customer_workflows:{workflow_sets:[],candidate_inventory:{}}};
 const markup=context.workflowMethodImpactMarkup(doc,workflow,[workflow],{});
 assert.equal((markup.match(/class="workflow-method-holon-ring"/g)||[]).length,3);
 assert.match(markup,/data-method-id="shared"[^>]+data-holon-ids="holon-a holon-b"/);
 assert.match(markup,/data-holon-membership="holon-a" data-member-method="shared"/);
 assert.match(markup,/data-holon-membership="holon-b" data-member-method="shared"/);
 assert.match(markup,/data-holon-description-id="holon-a" data-holon-label="Unbound flow · order service · shared"/);
 assert.match(markup,/data-holon-description-id="holon-b" data-holon-label="Unbound flow · order service · shared"/);
 assert.match(markup,/workflow-impact-method stable\s+ungrouped[^>]+data-method-id="ungrouped"/);
 assert.match(markup,/data-method-id="ungrouped"[^>]+data-holon-ids=""/);
 assert.doesNotMatch(markup,/is-collapsed|Expand to methods|workflow-collapse-target/);
});

test('holon descriptions deterministically combine sorted workflows and services',()=>{
 context.esc=value=>String(value);context.workflowOutcome=()=>'';context.workflowImpactStatus=()=>({label:'Unaffected'});
 const makeWorkflow=(id,name)=>({id,name,actor:'operator',governance_status:'proposed',impact_status:'unaffected',obligations:[{id:id+'.observe',statement:'Observe',impact_status:'unaffected',evidence:[{candidate_id:id,classification:'unaffected',intent_region_ids:['holon'],method_id:'method-b'}]}]});
 const alpha=makeWorkflow('alpha','Alpha workflow'),zeta=makeWorkflow('zeta','Zeta workflow');
 const doc={territory:{methods:[['method-b',0,'Zeta.run',0,100,100],['method-a',0,'Alpha.run',0,110,100]],services:[['service','order-service']],native_holons:[['holon',[0,1]]]},holon_map:{services:[],methods:[],holons:[]},architecture:[],customer_workflows:{workflow_sets:[],candidate_inventory:{}}};
 const markup=context.workflowMethodImpactMarkup(doc,zeta,[zeta,alpha],{});
 assert.match(markup,/data-holon-label="Alpha workflow \+ Zeta workflow · order service · run"/);
});

test('overlapping PR 13 targets select the nearest dot regardless of SVG paint order or scale',()=>{
 const method=(id,x,y)=>({dataset:{methodId:id},querySelector:()=>({getAttribute:key=>key==='cx'?x:y})});
 const changed=method('authorize',270.59,84.91),neighbor=method('setId',277.47,74.38);
 let methods=[changed,neighbor];
 const svg={getScreenCTM:()=>({inverse:()=>({})}),createSVGPoint:()=>({matrixTransform(){return {x:(this.x-100)/2,y:(this.y-50)/2};}}),querySelectorAll:()=>methods};
 const event={type:'click',detail:1,clientX:270.59*2+100,clientY:84.91*2+50,target:{closest:()=>svg}};
 assert.equal(context.nearestTerrainMethod(event),changed);
 methods=[neighbor,changed];assert.equal(context.nearestTerrainMethod(event),changed);
 event.clientX=277.47*2+100;event.clientY=74.38*2+50;
 assert.equal(context.nearestTerrainMethod(event),neighbor);
 event.type='mousemove';assert.equal(context.nearestTerrainMethod(event),neighbor);
 event.type='click';event.detail=0;assert.equal(context.nearestTerrainMethod(event),null);
 event.detail=1;event.clientX=1000;assert.equal(context.nearestTerrainMethod(event),null);
});
test('hover assigns distinct holon colors and highlights every shared member',()=>{
 const classList=()=>{const values=new Set();return {add:(...items)=>items.forEach(item=>values.add(item)),remove:(...items)=>items.forEach(item=>values.delete(item)),toggle:(item,on)=>on?values.add(item):values.delete(item),contains:item=>values.has(item)};};
 const style=()=>{const values={};return {values,setProperty:(key,value)=>values[key]=value,removeProperty:key=>delete values[key]};};
 const method=(id,holons)=>({dataset:{methodId:id,methodLabel:id,holonIds:holons},classList:classList()});
 const origin=method('origin','holon-a holon-b'),sameA=method('same-a','holon-a'),sameBoth=method('same-both','holon-a holon-b'),other=method('other','holon-c'),methods=[origin,sameA,sameBoth,other];
 const ring=(holon)=>({dataset:{holonMembership:holon},classList:classList(),style:style(),radius:'4',setAttribute(key,value){if(key==='r')this.radius=value;}});
 const rings=[ring('holon-a'),ring('holon-b'),ring('holon-a'),ring('holon-c')];
 const descriptions=[{dataset:{holonDescriptionId:'holon-a',holonLabel:'Cancel an order: Order.cancel'}},{dataset:{holonDescriptionId:'holon-b',holonLabel:'Cancel an order: CancelOrderSaga.beginCancel'}}];
 let statusText='';const status={chips:[],get textContent(){return statusText;},set textContent(value){statusText=value;if(value==='')this.chips=[];},append(node){this.chips.push(node);}};
 const terrain={dataset:{},classList:classList(),querySelectorAll(selector){return selector==='.workflow-impact-method'?methods:selector==='[data-holon-description-id]'?descriptions:rings;},querySelector(){return status;}};
 methods.forEach(node=>node.closest=()=>terrain);
 context.document.createElement=()=>({className:'',style:style(),textContent:''});
 context.showMethodHolonHover(origin);
 assert.equal(terrain.classList.contains('is-holon-hovering'),true);
 assert.equal(origin.classList.contains('holon-origin'),true);
 assert.equal(sameA.classList.contains('holon-peer'),true);
 assert.equal(sameBoth.classList.contains('holon-peer'),true);
 assert.equal(other.classList.contains('holon-peer'),false);
 assert.equal(rings[0].radius,'4');
 assert.equal(rings[1].radius,'5.8');
 assert.notEqual(rings[0].style.values['--holon-color'],rings[1].style.values['--holon-color']);
 assert.equal(status.chips.length,3);
 assert.equal(status.chips[1].textContent,'Cancel an order: Order.cancel');
 assert.equal(status.chips[1].title,'holon-a');
 terrain.dataset.pinnedMethod='origin';
 context.showMethodHolonHover(other);
 context.clearMethodHolonHover(terrain);
 assert.equal(origin.classList.contains('holon-origin'),true);
 assert.equal(other.classList.contains('holon-origin'),false);
 assert.equal(terrain.classList.contains('is-holon-hovering'),true);
 assert.equal(status.chips[0].textContent,'origin belongs to');
 terrain.dataset.pinnedMethod='';
 context.clearMethodHolonHover(terrain);
 assert.equal(terrain.classList.contains('is-holon-hovering'),false);
 assert.equal(rings.some(node=>node.classList.contains('is-active')),false);
});

test('holon viewer hover highlights and lists its member methods',()=>{
 const classList=(initial=[])=>{const values=new Set(initial);return {add:(...items)=>items.forEach(item=>values.add(item)),remove:(...items)=>items.forEach(item=>values.delete(item)),toggle:(item,on)=>on?values.add(item):values.delete(item),contains:item=>values.has(item)};};
 const style=()=>{const values={};return {values,setProperty:(key,value)=>values[key]=value,removeProperty:key=>delete values[key]};};
 const element=(tag='div')=>({tag,dataset:{},className:'',children:[],textContent:'',style:style(),append(...nodes){this.children.push(...nodes);}});
 const method=(id,label,holons,classes=[])=>({dataset:{methodId:id,methodLabel:label,holonIds:holons},classList:classList(classes)});
 const alpha=method('alpha','Alpha.run','holon-a',['stable']),beta=method('beta','Beta.run','holon-a',['changed_witness_method']),other=method('other','Other.run','holon-b',['stable']),methods=[beta,other,alpha];
 const ring=holon=>({dataset:{holonMembership:holon},classList:classList(),style:style(),setAttribute(){}}),rings=[ring('holon-a'),ring('holon-b')];
 const status=element(),detail=element();
 let button;
 const terrain={dataset:{},classList:classList(),querySelectorAll(selector){return selector==='.workflow-impact-method'?methods:selector==='.workflow-method-holon-ring'?rings:selector==='[data-holon-viewer-id]'?[button]:[];},querySelector(selector){return selector==='[data-holon-hover-status]'?status:selector==='[data-holon-viewer-detail]'?detail:null;}};
 button={dataset:{holonViewerId:'holon-a',holonViewerLabel:'Ordering: Alpha.run, Beta.run'},closest:()=>terrain};
 context.document.createElement=element;
 context.showHolonViewerPreview(button);
 assert.equal(alpha.classList.contains('holon-peer'),true);
 assert.equal(beta.classList.contains('holon-peer'),true);
 assert.equal(other.classList.contains('holon-peer'),false);
 assert.equal(rings[0].classList.contains('is-active'),true);
 assert.equal(rings[1].classList.contains('is-active'),false);
 assert.equal(status.children[1].textContent,'Ordering: Alpha.run, Beta.run');
 assert.equal(detail.children[0].textContent,'Ordering: Alpha.run, Beta.run');
 assert.equal(detail.children[2].textContent,'2 methods · 1 direct PR intersection · 0 context');
 const directListed=detail.children[3].children[1].children;
 assert.deepEqual(directListed.map(node=>node.children[0].textContent),['Beta.run']);
 assert.equal(directListed[0].className,'holon-viewer-method changed_witness_method');
 assert.equal(directListed[0].dataset.governedMethod,'beta');
 const stableListed=detail.children[4].children[1].children;
 assert.deepEqual(stableListed.map(node=>node.children[0].textContent),['Alpha.run']);
 assert.equal(stableListed[0].className,'holon-viewer-method stable');
 terrain.dataset.pinnedHolon='holon-a';status.children=[];
 context.clearMethodHolonHover(terrain);
 assert.equal(status.children.at(-2).textContent,'Holon:');
 assert.equal(status.children[1].textContent,'Ordering: Alpha.run, Beta.run');
 assert.equal(terrain.classList.contains('is-holon-hovering'),true);
});

test('workflow labels state PR impact explicitly',()=>{
 assert.equal(actualWorkflowImpactStatus({impact_status:'direct_change'}).label,'Affected by this PR');
 assert.equal(actualWorkflowImpactStatus({impact_status:'unaffected'}).label,'Not affected by this PR');
});
