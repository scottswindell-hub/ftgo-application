const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {ledgerHistoryMarkup,resolveHistoryRunId,historyRequestParams,fetchLedgerHistoryPage,mergeLedgerHistory}=require('./assets/ledger-history.js');

const identity={application:'repo/app',run_id:'run-42',head_commit:'head-abc',baseline_commit:'base-xyz'};
test('history view distinguishes accepted app state, this PR, and unlinked proposals',()=>{
 const html=ledgerHistoryMarkup({schema:'governance-history-view-v1',identity,
  application_governance:{events:[{action:'Governance revision activated',status:'accepted_revision',sequence:3,event_id:'a'.repeat(64)}],next:3,qualification:'Accepted state.'},
  current_pr_activity:{events:[{action:'PR evidence assessment recorded',status:'recorded',sequence:4,event_id:'b'.repeat(64),subject:'risk:abc'}],next:4,qualification:'Pinned run.'},
  linked_change_activity:{events:[],next:null,state:'unlinked',qualification:'Governance proposals are not linked to this PR.'},
  source:{kind:'governance_ledger',read_only:true}});
 assert.match(html,/Application governance/);assert.match(html,/This PR run/);
 assert.match(html,/Governance revision activated/);assert.match(html,/risk:abc/);
 assert.match(html,/Governance proposals are not linked to this PR/);
 assert.match(html,/Viewing it does not approve proposals/);
 assert.match(html,/data-after-app="3" data-after-run="4"/);
});
test('history projection escapes values and never renders payloads or provider details',()=>{
 const html=ledgerHistoryMarkup({schema:'governance-history-view-v1',identity,
  application_governance:{events:[{action:'<script>bad</script>',status:'recorded',sequence:1,event_id:'c'.repeat(64),subject:'<img src=x>',secret_capture:'should not appear'}],next:null,qualification:'Safe.'},
  current_pr_activity:{events:[],next:null,qualification:'Pinned.'},
  linked_change_activity:{events:[],next:null,state:'unlinked',qualification:'Unlinked.'},source:{read_only:true}});
 assert.doesNotMatch(html,/<script>|<img src=x>|should not appear/);
 assert.match(html,/&lt;script&gt;bad/);assert.doesNotMatch(html,/provider|model details/);
});
test('invalid or missing ledger projection fails closed',()=>{
 assert.match(ledgerHistoryMarkup(null,false,''),/unavailable/);
 assert.match(ledgerHistoryMarkup({},false,''),/unavailable/);
 assert.match(ledgerHistoryMarkup(null,true,''),/Loading verified ledger history/);
 assert.match(ledgerHistoryMarkup(null,false,'Request failed'),/Request failed/);
});
test('run resolution uses only packet/query IDs or a matching live status identity',()=>{
 const packet={repository:identity.application,head_commit:identity.head_commit};
 assert.equal(resolveHistoryRunId(packet,'',{}),'');
 assert.equal(resolveHistoryRunId(packet,'query-run',{}),'query-run');
 assert.equal(resolveHistoryRunId(packet,'',{repo:identity.application,sha:identity.head_commit,governance_run_id:'live-run'}),'live-run');
 assert.equal(resolveHistoryRunId(packet,'',{repo:'other/repo',sha:identity.head_commit,governance_run_id:'bad'}),'');
 assert.equal(resolveHistoryRunId({...packet,simulation:{run_id:'packet-run'}},'query-run',{}),'packet-run');
});
test('request cursor builder skips exhausted streams and pages a linked change stream',()=>{
 const previous={application_governance:{next:null},current_pr_activity:{next:17},linked_change_activity:{state:'linked',next:9}};
 const params=historyRequestParams({identity,runId:'run-42',after:{app:11,run:17,change:9},previous,append:true});
 assert.equal(params.after_app,'11');assert.equal(params.after_run,'17');assert.equal(params.after_change,'9');
 assert.equal(params.skip_app,'1');assert.equal(params.skip_run,undefined);assert.equal(params.skip_change,undefined);
 const linkedDone=historyRequestParams({identity,runId:'run-42',after:{app:0,run:0,change:20},previous:{...previous,linked_change_activity:{state:'linked',next:null}},append:true});
 assert.equal(linkedDone.skip_change,'1');
});
test('fetch checks bounded authenticated projection identity before returning a page',async()=>{
 const body={schema:'governance-history-view-v1',identity,source:{kind:'governance_ledger',read_only:true}};
 let requested;
 const fetcher=async(url,options)=>{requested={url,options};return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(body)).buffer};};
 const page=await fetchLedgerHistoryPage(fetcher,'https://api.example/status',{...identity,run_id:'run-42'});
 assert.equal(page.identity.run_id,'run-42');assert.equal(requested.options.cache,'no-store');
 await assert.rejects(fetchLedgerHistoryPage(fetcher,'/status',{...identity,head_commit:'wrong'}),/identity differs/);
 const oversized=async()=>({ok:true,arrayBuffer:async()=>new Uint8Array(131073).buffer});
 await assert.rejects(fetchLedgerHistoryPage(oversized,'/status',identity),/exceeds 128 KiB/);
});
test('page merge deduplicates and bounds each of three streams without reopening completed lanes',()=>{
 const events=(prefix,n)=>Array.from({length:n},(_,i)=>({event_id:`${prefix}-${i}`,sequence:i+1}));
 const previous={application_governance:{events:events('app',100),next:null},current_pr_activity:{events:events('run',2),next:2},linked_change_activity:{state:'linked',events:events('change',1),next:1}};
 const page={application_governance:{events:events('app',2),next:101},current_pr_activity:{events:[{event_id:'run-2',sequence:3},{event_id:'run-3',sequence:4}],next:4},linked_change_activity:{state:'linked',events:[{event_id:'change-1',sequence:2},{event_id:'change-2',sequence:3}],next:3}};
 const merged=mergeLedgerHistory(previous,page);
 assert.equal(merged.application_governance.events.length,100);assert.equal(merged.application_governance.next,null);
 assert.equal(merged.current_pr_activity.events.length,4);assert.equal(merged.linked_change_activity.events.length,3);
 assert.equal(merged.linked_change_activity.events[0].event_id,'change-0');
});
test('browser-loaded asset exports and runs the same pinned paging helpers',async()=>{
 const source=require('node:fs').readFileSync(require('node:path').join(__dirname,'assets/ledger-history.js'),'utf8');
 const browser={TextDecoder,TextEncoder,Map,Set,JSON,String,Number,Error};browser.window=browser;
 vm.runInNewContext(source,browser);
 assert.equal(browser.resolveHistoryRunId({repository:identity.application,head_commit:identity.head_commit},'',
  {repo:identity.application,sha:identity.head_commit,governance_run_id:'browser-run'}),'browser-run');
 const params=browser.historyRequestParams({identity,runId:'browser-run',after:{app:0,run:4,change:5},
  previous:{application_governance:{next:null},current_pr_activity:{next:4},linked_change_activity:{state:'linked',next:5}},append:true});
 assert.equal(params.run_id,'browser-run');assert.equal(params.skip_app,'1');assert.equal(params.after_change,'5');
 const page={schema:'governance-history-view-v1',identity:{...identity,run_id:'browser-run'},source:{kind:'governance_ledger',read_only:true}};
 const result=await browser.fetchLedgerHistoryPage(async()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(page)).buffer}),'/status',{...identity,run_id:'browser-run'});
 assert.equal(result.identity.run_id,'browser-run');
 assert.equal(browser.mergeLedgerHistory(null,result),result);
});
