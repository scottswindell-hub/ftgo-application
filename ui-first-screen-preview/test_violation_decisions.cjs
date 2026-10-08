const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const d=require('./assets/violation-decisions.js');

const recorded={governance_run_id:'run-1'};
const finding={ref:'F-1a2b3c4d',rule_id:'SR-CFG-001',name:'Locations come from configuration',file:'svc/A.java',line:'12',unit:'A.url'};

test('commands are offered only for violations of recorded runs',()=>{
 assert.equal(d.violationControlMarkup(finding,{}),'');
 assert.equal(d.violationControlMarkup(finding,recorded,false),'');
 assert.equal(d.violationControlMarkup({...finding,ref:undefined},recorded),'');
});

test('a violation offers both decisions, for one person with write access',()=>{
 const html=d.violationControlMarkup(finding,recorded);
 assert.match(html,/Someone with write access decides this violation/);
 assert.match(html,/data-copy="\/reject -- "/);
 assert.match(html,/closes this pull request/);
 assert.match(html,/data-copy="\/false-positive F-1a2b3c4d -- "/);
 assert.match(html,/requests a fix to the rule/);
 assert.doesNotMatch(html,/withdraw|uphold|owner/i);
});

test('a requested rule change and a rejected PR are shown instead of the commands',()=>{
 assert.match(d.violationControlMarkup({...finding,decision:'rule_change_requested'},recorded),/rule exception is committed to this pull request/);
 const rejected=d.violationControlMarkup(finding,{...recorded,violation_status:'rejected'});
 assert.match(rejected,/Rejected/);assert.doesNotMatch(rejected,/false-positive/);
});

test('finding text is escaped and labelled by whether it blocks',()=>{
 const html=d.findingItemMarkup({...finding,name:'<img src=x onerror=alert(1)>'},recorded);
 assert.doesNotMatch(html,/<img/);assert.match(html,/Rule violation/);
 assert.match(d.findingItemMarkup(finding,recorded,false),/>Finding</);
});

test('the review pages wire in the decision controls',()=>{
 const legacy=fs.readFileSync(path.join(__dirname,'legacy-review.html'),'utf8');
 assert.match(legacy,/<script src="assets\/violation-decisions.js"><\/script>/);
 assert.doesNotMatch(legacy,/rejectControlMarkup|withdrawnFindingsMarkup|checkVerdictControlMarkup|finding-disputes/);
 const readable=fs.readFileSync(path.join(__dirname,'assets/readable-review.js'),'utf8');
 assert.match(readable,/function violationMarkup\(item\)/);
 assert.match(readable,/\/false-positive \$\{ref\} -- reason/);
});
