const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
function context(){
 const ctx=vm.createContext({window:{},document:{addEventListener(){}},esc:s=>String(s??'').replaceAll('"','&quot;')});
 for(const file of ['objective-territories.js','intent-impact.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'assets',file),'utf8'),ctx);
 return ctx;
}
const file='ftgo-order-service/src/main/java/net/chrisrichardson/ftgo/orderservice/sagas/createorder/CreateOrderSagaState.java';
const patch=fs.readFileSync(path.join(__dirname,'assets/semantic-prs/pr13.source.patch'),'utf8');
test('selected PR 13 method displays its real removed and added lines',async()=>{
 const ctx=context(),node={dataset:{governedSourceFile:file,sourceAnchors:'[{"line":105,"deleted":false}]'}};
 await ctx.window.renderGovernedMethodSource({querySelectorAll:()=>[node]},async()=>patch);
 assert.match(node.innerHTML,/ii-dl del/);assert.match(node.innerHTML,/ii-dl add/);
 assert.match(node.innerHTML,/withConsumerId\(getOrderDetails\(\).getConsumerId\(\)\)/);
 assert.match(node.innerHTML,/withConsumerId\(getOrderId\(\)\)/);
 assert.match(node.innerHTML,/Patch hunks containing this method/);
});
test('missing anchors do not attribute a file diff to the method; failed verification displays no source',async()=>{
 const ctx=context(),node={dataset:{governedSourceFile:file,sourceAnchors:'[]'}};
 await ctx.window.renderGovernedMethodSource({querySelectorAll:()=>[node]},async()=>patch);
 assert.match(node.innerHTML,/not method-specific/);
 assert.doesNotMatch(node.innerHTML,/Patch hunks containing this method/);
 await ctx.window.renderGovernedMethodSource({querySelectorAll:()=>[node]},async()=>{throw Error('Source patch digest differs');});
 assert.match(node.innerHTML,/digest differs/);assert.doesNotMatch(node.innerHTML,/withConsumerId/);
});
test('context-only methods never request a source diff',()=>{
 assert.doesNotMatch(context().governedMethodSourceMarkup({}, {file},false),/data-governed-source-file/);
});
