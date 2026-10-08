const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function fixture(){
 const packet=JSON.parse(fs.readFileSync(path.join(__dirname,'assets/semantic-prs/pr13.json'),'utf8'));
 packet.intent_impact={baseline_commit:packet.baseline_commit,head_commit:packet.head_commit,concepts:[{
  boundary_id:'FTGO-COMMAND-VALUE',question_id:'q',concept:'Command identity and value continuity',
  changed:{file:packet.flows[0].source.file,method:'CreateOrderSagaState.makeAuthorizeCommand()',line:105},
  sentence:'The consumer ID binding changed.',
  affected:{file:'ftgo-accounting-service/src/AccountingServiceCommandHandler.java',
   label:'AccountingServiceCommandHandler.authorize',anchor:39,
   lines:['public void authorize(CommandMessage<AuthorizeCommand> cm) {']}
 }]};
 return packet;
}
function render(packet,judgments=[]){
 const context=vm.createContext({document:{addEventListener(){}},liveDoc:{checks:[{id:'intent_diff',judgments}]},
  esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/governed-objectives.js'),'utf8'),context);
 return context.changedConceptsCard(packet);
}
test('PR 13 explains the exact substitution and receiver even without a model judgment',()=>{
 const html=render(fixture());
 assert.match(html,/Accounting’s AuthorizeCommand now carries the order ID in its consumer ID field/);
 assert.match(html,/Previously, it carried the consumer ID from order details/);
 assert.match(html,/withConsumerId ← getOrderDetails\(\).getConsumerId\(\)/);
 assert.match(html,/withConsumerId ← getOrderId\(\)/);
 assert.match(html,/AccountingServiceCommandHandler.authorize/);
 assert.doesNotMatch(html,/Command identity and value continuity|Not assessed/);
 assert.doesNotMatch(html,/wrong account|authorization fails|Behavior changed/);
});
test('missing or ambiguous bindings do not invent a substitution; missing receiver does not invent accounting',()=>{
 const packet=fixture();packet.intent_impact.concepts[0].affected=null;
 assert.match(render(packet),/The command now carries/);
 assert.doesNotMatch(render(packet),/Accounting/);
 packet.flows.push(structuredClone(packet.flows[0]));
 assert.doesNotMatch(render(packet),/now carries/);
 packet.flows=[];
 assert.match(render(packet),/The consumer ID binding changed/);
});
test('stale evidence is withheld and source text is escaped while assessment stays separate',()=>{
 const packet=fixture();packet.intent_impact.head_commit='wrong';
 assert.doesNotMatch(render(packet),/now carries/);
 packet.intent_impact.head_commit=packet.head_commit;
 packet.intent_impact.concepts[0].affected.label='<script>bad()</script>';
 const html=render(packet,[{question_id:'q',verdict:'preserved'}]);
 assert.doesNotMatch(html,/Preserved/);
 assert.match(html,/now carries the order ID/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
