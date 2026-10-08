const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('adapter passes original terrain and provenance to the legacy renderer',()=>{
 let received;
 const sandbox={window:null,workflowMethodImpactMarkup:(...args)=>{received=args;return '<svg class="original"></svg>';}};sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/legacy-method-adapter.js'),'utf8'),sandbox);
 const packet={baseline_commit:'b',head_commit:'h',governed_objectives:{architecture:[]},explorer:{terrain:{methods:[['m']]},governance:{holon_map:{methods:[]}},workflows:{workflows:[{id:'w',name:'<Workflow>',impact_status:'direct_change'}]}}};
 const state={};const html=sandbox.legacyMethodExplorer.markup(packet,state);
 assert.equal(received[0].territory,packet.explorer.terrain);assert.equal(received[0].source_packet,packet);assert.equal(received[3],state);assert.equal(state.governedArea,'w');assert.match(html,/&lt;Workflow&gt;/);assert.match(html,/class="original"/);
 let calls=0;sandbox.legacyMethodExplorer.setRender(()=>calls++);sandbox.render();assert.equal(calls,1);
});
