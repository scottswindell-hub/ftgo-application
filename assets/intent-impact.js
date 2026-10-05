/* Source-first review tiles shared by every check on the Review page, plus the page outline.
   One tile design: breadcrumb (check › subject › file:line), name and status, the code (changed lines from
   the run's verified patch, or unchanged code carried in the projection), a trace ladder, and
   Intended / This PR. Intent concepts come from packet.intent_impact joined with intent_diff verdicts;
   improper-test findings come from that check's published findings. Nothing here judges. */
(function(){
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=p=>String(p||'').split('/').pop();
const slug=s=>'rt-'+String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const STATUS={changed:['changed','Behavior changed'],preserved:['preserved','Preserved'],review:['review','Needs review'],gap:['gap',"Can't confirm"],pending:['pending','Awaiting analysis'],
  weak:['changed','Weak test'],clear:['preserved','Test OK'],watch:['review','Would be a finding'],deleted:['changed','Test removed'],inconclusive:['gap',"Can't confirm"]};
const LADDER={rule:'Rule',enforcement:'Enforcement',line:'Changed line',removed:'Removed lines',method:'Method',test:'Test',covers:'Covers',concept:'Concept',reason:'Reason',service:'Reaches',lands:'Lands in · unchanged'};

/* ---------- shared tile ---------- */
function ladder(steps){
  return `<ol class="ii-ladder" aria-label="Trace from changed code to impact">${[...steps].reverse().map(([k,v])=>`<li class="ii-step-${k}"><span class="lk">${LADDER[k]}</span><span class="lv">${e(v)}</span></li>`).join('')}</ol>`;
}
function unchangedCode(a){
  if(!a)return '';
  const rows=a.lines.map((text,i)=>{const n=a.start+i;return `<div class="ii-dl${n===a.anchor?' lands':''}"><span class="n">${n}</span><span class="m"></span><span class="t">${e(text)||' '}</span></div>`;}).join('');
  return `<div class="ii-affected-source"><p class="ii-ah"><b>Affected here</b> · unchanged${a.label?` · <strong>${e(a.label)}</strong>`:''} · <code>${e(short(a.file))}${a.anchor!=null?`:${e(a.anchor)}`:''}</code></p><div class="ii-code ii-affected" role="region" aria-label="Unchanged code in ${e(short(a.file))}">${rows}</div></div>`;
}
function tile(t){
  const [cls,label]=STATUS[t.status]||STATUS.pending;
  const code=t.code?`<p class="ii-ah"><b>Changed here</b> · this PR · <code>${e(short(t.code.file))}</code></p><div class="ii-code ii-changed" data-file="${e(t.code.file)}" data-mode="${e(t.code.mode)}" data-line="${e(t.code.line??'')}" data-region="${e(t.code.region||'')}" data-method="${e(t.code.method||'')}"><p class="note">Loading the changed lines…</p></div>`:'';
  const body=t.custom?`<div class="ii-grid one">${t.custom}</div>`:code||t.affected?`<div class="ii-grid"><div class="ii-src">${code}${unchangedCode(t.affected)}</div>${ladder(t.steps)}</div>`:'';
  return `<article class="ii-tile ${cls}" id="${e(t.id)}" data-outline-name="${e(t.name)}" data-outline-status="${cls}">
<nav class="ii-crumbs" aria-label="Location">${t.crumbs.map(e).join('<span aria-hidden="true"> › </span>')}</nav>
<header><span class="ii-cname">${e(t.name)}</span>${t.badge?`<span class="ii-badge">${e(t.badge)}</span>`:''}<span class="ii-status ${cls}">${e(t.label||label)}</span>${t.conf?`<span class="ii-conf">confidence ${e(t.conf)}</span>`:''}</header>
${body}<dl class="ii-io">${t.io.map(([k,v])=>`<dt>${e(k)}</dt><dd>${v}</dd>`).join('')}</dl>
${t.details?`<details class="ii-sub"><summary>Technical evidence</summary><p class="note">${t.details}</p></details>`:''}</article>`;
}
function quiet(count,text,items){
  if(!count)return '';
  const list=items?.length?`<ul>${items.slice(0,8).map(i=>`<li>${e(short(i))}</li>`).join('')}${items.length>8?`<li>… and ${items.length-8} more</li>`:''}</ul>`:'';
  return `<details class="ii-quiet"><summary><b>${count}</b> ${text}</summary>${list}</details>`;
}

/* ---------- intent differences ---------- */
const conceptName=id=>String(id||'').replace(/^FTGO-/,'').toLowerCase().replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
function verdicts(liveDoc){
  const check=(liveDoc?.checks||liveDoc?.stages||[]).find(c=>c.id==='intent_diff');
  return Object.fromEntries((check?.judgments||[]).filter(r=>r.question_id).map(r=>[r.question_id,r]));
}
function meters(view,changedCount){
  const size=view.size||{},lines=size.lines||0,files=size.files||0;
  const sizePct=Math.min(100,Math.round(100*Math.sqrt(lines/300)));
  const impactPct=changedCount?Math.min(100,Math.max(6,Math.round(100*changedCount/6))):0;
  const noise=(view.noise?.files||[]).length;
  const verdict=!changedCount?'<b>No governed intent changed.</b>':
    lines>=60&&changedCount===1?`<b>${lines} lines changed; one change carries governed impact.</b>${noise?` ${noise} file${noise===1?'':'s'} changed without behavior.`:''}`:
    lines<=10?`<b>${lines===1?'One line':`${lines} lines`}, governed impact.</b>`:
    `<b>${changedCount} governed concept${changedCount===1?'':'s'} changed.</b> Highest confidence first.`;
  return `<div class="ii-meters"><div class="ii-m"><span class="ii-mk">Change size</span><span class="ii-bar"><i style="width:${sizePct}%"></i></span><span class="ii-mv">${files} file${files===1?'':'s'} · ${lines} line${lines===1?'':'s'}</span></div>
<div class="ii-m"><span class="ii-mk">Intent impact</span><span class="ii-bar imp"><i style="width:${impactPct}%"></i></span><span class="ii-mv">${changedCount} governed concept${changedCount===1?'':'s'} changed${(view.services||[]).length?` · reaches ${e(view.services.join(', '))}`:''}</span></div>
<p class="ii-verdict">${verdict}</p></div>`;
}
function conceptTile(t,v){
  const where=`${short(t.changed.file)}:${t.changed.line??'?'}`;
  const steps=[['line',`${short(t.changed.file)}\nline ${t.changed.line??'?'}${t.changed.deleted?', deleted':''}`],['method',t.changed.method],['concept',t.concept],['service',(t.services||[]).join(' → ')]];
  if(t.affected)steps.push(['lands',`${t.affected.label}\nline ${t.affected.anchor}`]);
  return tile({id:slug('intent '+t.question_id),crumbs:['Intent differences',t.concept,where],name:t.concept,badge:'Governed',
    status:v?.verdict||'pending',conf:v?.confidence,code:{file:t.changed.file,mode:t.changed.deleted?'deleted':'line',line:t.changed.line},
    affected:t.affected,steps,io:[['Intended',e(t.intended)],['This PR',t.sentence]],
    details:`Boundary <code>${e(t.boundary_id)}</code> · question <code>${e(t.question_id)}</code>`});
}
window.intentImpactSection=function(packet,liveDoc){
  const view=packet?.intent_impact;
  if(!view)return '';
  const byQuestion=verdicts(liveDoc);
  const rank={changed:0,review:1,pending:2,preserved:3},conf={high:0,medium:1,low:2,'':3};
  const concepts=[...(view.concepts||[])].sort((a,b)=>{const va=byQuestion[a.question_id]||{},vb=byQuestion[b.question_id]||{};
    return (rank[va.verdict??'pending']-rank[vb.verdict??'pending'])||(conf[va.confidence||'']-conf[vb.confidence||'']);});
  const changed=concepts.filter(t=>(byQuestion[t.question_id]?.verdict??'pending')!=='preserved').length;
  const gaps=(view.gaps||[]).map(g=>tile({id:slug('gap '+g.boundary_id),crumbs:['Intent differences',conceptName(g.boundary_id)],name:conceptName(g.boundary_id),badge:'Governed',status:'gap',steps:[],
    io:[['Why','The changed code could not be mapped to this concept\'s accepted region, so its effect is unknown. Other concepts are still judged.']]})).join('');
  return `<section class="ii-section" aria-label="Intent impact"><div class="ii-head"><h4>Intent impact</h4><p class="note">Each change traced from source to the governed concept it affects and the unchanged code that relies on it.</p></div>
${meters(view,changed)}${concepts.map(t=>conceptTile(t,byQuestion[t.question_id])).join('')}${gaps}
${quiet((view.noise?.files||[]).length,'file'+((view.noise?.files||[]).length===1?'':'s')+' changed without method behavior · no intent impact',view.noise?.files)}
${quiet((view.noise?.context_only||[]).length,'nearby method'+((view.noise?.context_only||[]).length===1?'':'s')+' affected only by surrounding changes',view.noise?.context_only)}</section>`;
};

/* ---------- improper tests ---------- */
function covers(unit){
  const [cls,method]=String(unit||'').split('.');
  const subject=(cls||'').replace(/(Tests?|IT)$/,'');
  const behavior=(method||'').replace(/^should/,'').replace(/^./,c=>c.toLowerCase());
  return subject?`${subject}${behavior?` · ${behavior}`:''}`:'Not established';
}
function testTile(f){
  const kind=f.kind||'weak';
  const anchor=f.anchor_line?Number(f.anchor_line):null;
  const regionStart=f.region?Number(String(f.region).split('-')[0]):Number(f.line)||null;
  const mode=kind==='deleted'?'deleted-method':f.anchor_mode==='line'&&anchor?'line':f.anchor_mode==='removed'?'removed':'region';
  const where=`${short(f.file)}${anchor||regionStart?`:${anchor||regionStart}`:''}`;
  const method=String(f.unit||'').split('.').pop();
  const steps=[[mode==='removed'||mode==='deleted-method'?'removed':'line',`${short(f.file)}${anchor||regionStart?`\nline ${anchor||regionStart}`:''}`],
               ['test',f.unit||short(f.file)],['covers',covers(f.unit)]];
  if(f.reason_id)steps.push(['reason',String(f.reason_id).replaceAll('_',' ')]);
  const thisPr=f.comment?e(f.comment):kind==='deleted'?`<code>${e(f.unit)}</code> was removed. Confirm the behavior it covered was removed too, or is tested elsewhere.`:
    kind==='inconclusive'?'The changed test could not be read completely, so the check failed closed.':e(f.signals||'The test may pass even if the behavior it names breaks.');
  return tile({id:slug('test '+f.unit+' '+kind),crumbs:['Improper tests',f.unit||short(f.file),where],name:f.unit||short(f.file),badge:'Test',
    status:kind,conf:f.anchor_confidence,code:f.file?{file:f.file,mode,line:anchor,region:f.region,method}:null,steps,
    io:[['Intended','A test fails when the behavior it names breaks.'],['This PR',thisPr]],
    details:[f.signals?`Signals: ${e(f.signals)}`:'',f.basis?`Basis: ${e(f.basis)}`:''].filter(Boolean).join(' · ')});
}
window.improperTestsSection=function(liveDoc){
  const check=(liveDoc?.checks||liveDoc?.stages||[]).find(c=>c.id==='improper_tests');
  const findings=check?.findings||[];
  const adequacy=window.testAdequacyMarkup?testAdequacyMarkup(check):'';
  if(!findings.length&&!adequacy)return '';
  return `<section class="ii-section" aria-label="Improper tests">${findings.map(testTile).join('')}${adequacy}</section>`;
};

/* ---------- remaining checks ---------- */
const checksOf=liveDoc=>Object.fromEntries((liveDoc?.checks||liveDoc?.stages||[]).map(c=>[c.id,c]));
const chip=(cls,text)=>`<span class="pt-chip ${cls}">${e(text)}</span>`;
const row=(cls,state,name,note,target)=>`<li>${chip(cls,state)}<b>${target?`<a href="#rc-${e(target)}" data-outline-target="rc-${e(target)}">${e(name)}</a>`:e(name)}</b><span class="note">${e(note)}</span></li>`;
const LEVELS=[['Small',0],['Moderate',2],['Broad',3],['Extensive',4]];
const userSeverity=label=>window.codingSeverity?codingSeverity(label).label:String(label||'').replace(/^./,c=>c.toUpperCase());

function gauge(score,threshold){
  const pos=Math.max(0,Math.min(100,score/4*100)),th=Math.max(0,Math.min(100,threshold/4*100));
  return `<div class="pt-gauge" role="img" aria-label="Change scope ${score} of 4, threshold ${threshold}"><div class="pt-track"><i class="pt-skip" style="width:${th}%"></i><b class="pt-th" style="left:${th}%"></b><b class="pt-mark" style="left:${pos}%"></b></div>
<div class="pt-ticks">${LEVELS.map(([l,at])=>`<span style="left:${at*25}%">${l}</span>`).join('')}</div><p class="pt-legend"><span class="sw skip"></span>Below threshold: downstream checks skipped <span class="sw th"></span>Threshold ${e(threshold)}</p></div>`;
}

/* ---------- one set of counts for the whole page ---------- */
// "Needs action" = findings a person must resolve or decide. Advisory evidence gaps are informational.
window.reviewActionCounts=function(liveDoc){
  const c=checksOf(liveDoc),per={};
  per.intent_diff=(c.intent_diff?.judgments||[]).filter(j=>['changed','review'].includes(j.verdict)).length;
  per.improper_tests=(c.improper_tests?.findings||[]).length;
  per.coding_standards=(c.coding_standards?.findings||[]).filter(f=>f.band==='finding').length;
  per.rule_impact=(c.rule_impact?.findings||[]).filter(f=>f.status!=='gap'&&String(f.enforced)==='true').length;
  return {per,total:Object.values(per).reduce((a,b)=>a+b,0)};
};
window.severitySection=function(liveDoc){
  const sev=liveDoc?.severity||{},check=checksOf(liveDoc).severity;
  if(!check||sev.score==null)return '';
  const score=Number(sev.score),threshold=Number(sev.threshold||2),label=String(sev.label||'');
  const ran=sev.decision==='full_analysis';
  const band=c=>c==null?'':Number(c)>=0.85?'high':Number(c)>=0.6?'medium':'low';
  return tile({id:'rt-severity',crumbs:['Change severity','This pull request'],name:'Change severity',badge:'Routing',
    status:ran?'changed':'clear',label:`${userSeverity(label)} · ${score.toFixed(2)} of 4`,conf:band(sev.confidence),custom:gauge(score,threshold),steps:[],
    io:[['Intended','Changes above the threshold get the full analysis; changes below it skip the downstream checks.'],
        ['This PR',ran?`Rated <b>${e(userSeverity(label))}</b> (${score.toFixed(2)} of 4), above the ${threshold} threshold, so every check ran.`
                      :`Rated <b>${e(userSeverity(label))}</b> (${score.toFixed(2)} of 4), below the ${threshold} threshold. Coding standards and intent analysis were skipped; improper tests still run when tests change.`]]});
};

window.standardsSection=function(liveDoc){
  const check=checksOf(liveDoc).coding_standards;
  if(!check)return '';
  const active=(check.findings||[]).map(f=>({...f,watch:false})),watch=(check.watch_only_findings||[]).map(f=>({...f,watch:true}));
  const all=[...active,...watch];
  if(!all.length)return '';
  return `<section class="ii-section" aria-label="Coding standards">${all.map(f=>{
    const finding=f.band==='finding',line=Number(f.line)||null;
    return tile({id:slug('std '+f.rule_id+' '+f.file+' '+f.line),crumbs:['Coding standards',f.rule_id,`${short(f.file)}${line?':'+line:''}`],name:f.name||f.rule_id,
      badge:f.watch?'Watch-only':'Enforced',status:f.watch?'watch':finding?'changed':'clear',label:f.watch?(finding?'Would be a finding':'Would be an FYI'):finding?'Finding':'FYI',
      conf:f.confidence?(Number(f.confidence)>=0.85?'high':Number(f.confidence)>=0.6?'medium':'low'):'',
      code:f.file?{file:f.file,mode:'line',line}:null,
      steps:[['line',`${short(f.file)}${line?`\nline ${line}`:''}`],['method',f.unit||'Not supplied'],['rule',`${f.rule_id} v${f.rule_version||'1'}${f.category?` · ${String(f.category).replace(/-/g,' ')}`:''}`],['enforcement',f.watch?'Watch-only · not enforced yet':'Enforced']],
      io:[['Intended',e(f.name||f.rule_id)],['This PR',`<code>${e(f.unit||short(f.file))}</code> was judged a ${finding?'finding':'note'} against this rule${f.severity?`, ${e(f.severity)} severity`:''}.`],...(f.guidance?[['Suggested fix',e(f.guidance)]]:[])],
      details:`Rule ${e(f.rule_id)} v${e(f.rule_version||'1')}${f.watch?' · watch-only rules are recorded for evaluation and never block':''}`});}).join('')}</section>`;
};

const GAP_LABEL={unresolved_call:'Calls could not be resolved',added_method_contract_unchecked:'New methods with no contract check',removed_method_contract_unchecked:'Removed methods with no contract check'};
window.ruleImpactSection=function(liveDoc,packet){
  const check=checksOf(liveDoc).rule_impact;
  if(!check)return '';
  const findings=check.findings||[];
  const violations=findings.filter(f=>f.status!=='gap'&&String(f.enforced)==='true');
  const groups=new Map();
  for(const f of findings.filter(f=>!violations.includes(f))){
    const key=GAP_LABEL[f.basis]||String(f.basis||f.title||'Evidence gap').replace(/\.$/,'');
    const g=groups.get(key)||{count:0,files:new Map()};g.count++;const file=short(f.file)||'Governed evidence';g.files.set(file,(g.files.get(file)||0)+1);groups.set(key,g);}
  const rows=[...groups].sort((a,b)=>b[1].count-a[1].count).map(([k,g])=>`<tr><td>${e(k)}</td><td class="num">${g.count}</td><td>${[...g.files].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([f,n])=>`${e(f)}${n>1?` ${n}`:''}`).join(' · ')}${g.files.size>4?` · ${g.files.size-4} more`:''}</td></tr>`).join('');
  const evidence=findings.length?tile({id:'rt-rule-evidence',crumbs:['Governance-rule impact','Advisory evidence'],name:`${findings.length-violations.length} evidence gap${findings.length-violations.length===1?'':'s'}`,badge:'Advisory',
    status:violations.length?'changed':'gap',label:violations.length?`${violations.length} governed violation${violations.length===1?'':'s'}`:'No governed violation',steps:[],
    custom:rows?`<div class="pt-table"><table><thead><tr><th>Gap</th><th class="num">Count</th><th>Where</th></tr></thead><tbody>${rows}</tbody></table></div>`:'',
    io:[['Intended','Every changed behavior can be traced to governed evidence.'],
        ['This PR',violations.length?`${violations.length} governed rule${violations.length===1?' is':'s are'} violated; the remaining gaps lower confidence only.`:'No governed rule is violated. These places lack complete evidence; they lower confidence and need no response.']]}):'';
  const subs=packet?.governance_review?.subchecks||[];
  const WHAT={placement:'Logic stays in the class and service that own it',scope:'Every edit is needed for the stated change',module_fit:'Changes fit the purpose of their module',undisclosed:'Behavior does not exceed the PR description',sabotage:'No authorization bypass, secret exposure or unsafe call'};
  const state=s=>s.state==='passed'?['ok','Passed']:s.state==='failed'?['bad',`${s.findings||''} finding${s.findings===1?'':'s'}`.trim()]:['gap',"Couldn't run"];
  const reasons=[...new Set(subs.flatMap(s=>s.state==='error'?(s.gaps||[]):[]).map(g=>String(g).replace(/:.*$/,'').replace(/^region$/,'Some source regions could not be captured')))];
  const bounded=subs.length?tile({id:'rt-bounded-review',crumbs:['Governance-rule impact','Bounded review',`${subs.length} checks`],name:'Bounded review',badge:'Review',
    status:subs.some(s=>s.state==='failed')?'changed':subs.some(s=>s.state==='error')?'gap':'clear',label:subs.some(s=>s.state==='failed')?'Findings':subs.some(s=>s.state==='error')?"Couldn't run":'No issues',steps:[],
    custom:`<ul class="pt-checklist">${subs.map(s=>{const [c,t]=state(s);return row(c,t,s.label,WHAT[s.id]||'');}).join('')}</ul>`,
    io:[...(reasons.length?[['Why',e(reasons.join('. ')+'.')]]:[]),['To complete',subs.some(s=>s.state==='error')?'Declare each module\'s purpose and this PR\'s intended change, then rerun this revision.':'No action needed.']]}):'';
  const semantic=window.semanticReviewsMarkup?semanticReviewsMarkup(check):'';
  return evidence||bounded||semantic?`<section class="ii-section" aria-label="Governance-rule impact">${violations.length?`<p class="note">${violations.length} enforced finding(s) are listed with the review findings below.</p>`:''}${evidence}${bounded}${semantic}</section>`:'';
};

window.connectedSection=function(liveDoc,packet){
  const check=checksOf(liveDoc).connected_evidence;
  if(!check)return '';
  const interp=packet?.governance_review?.interpretation||{};
  const gaps=packet?.intent_impact?.gaps||[];
  const items=[row('ok','Passed','Integrity','Baseline, governance version and source match this revision'),
    row(interp.status==='unavailable'?'gap':'ok',interp.status==='unavailable'?'Unavailable':'Recorded','Interpretation',interp.status==='unavailable'?'No recorded interpretation for this exact evidence':'Interpretation recorded for this evidence'),
    ...gaps.map(g=>row('bad','Missing',conceptName(g.boundary_id),'Changed code is not mapped to the concept\'s accepted region · see Intent differences','intent_diff'))];
  return tile({id:'rt-connected',crumbs:['Connected evidence','Required evidence'],name:'Connected evidence',badge:'Evidence',
    status:gaps.length?'gap':check.state==='passed'?'clear':'gap',label:gaps.length?`${gaps.length} required gap${gaps.length===1?'':'s'}`:check.state==='passed'?'Complete':'Incomplete',steps:[],
    custom:`<ul class="pt-checklist">${items.join('')}</ul>${window.evidenceSelectionMarkup?evidenceSelectionMarkup(check):''}${window.semanticGroundingMarkup?semanticGroundingMarkup(check):''}`,
    io:[['Intended','Every finding is backed by complete, verified evidence.'],['This PR',gaps.length?`${gaps.length} required concept${gaps.length===1?'':'s'} could not be mapped, so the overall assessment is incomplete.`:interp.status==='unavailable'?'Required evidence is complete; the recorded interpretation is not available for this run.':'Required evidence is complete.']]});
};


function decisionNote(id,c,liveDoc){
  const d=String(c.detail||''),n=re=>Number((d.match(re)||[])[1]||0);
  if(['blocked','stopped'].includes(c.state))return 'Skipped for this change';
  if(id==='severity'){const s=liveDoc?.severity||{};return `${userSeverity(s.label)} · ${s.decision==='full_analysis'?'full analysis ran':'downstream checks skipped'}`;}
  if(id==='intent_diff'){const v=n(/(\d+) governed semantic boundary violation/),g=n(/(\d+) governed boundary\(ies\) could not be mapped/),r=n(/(\d+) boundary judgment/);
    return [v&&`${v} governed concept${v===1?'':'s'} changed`,r&&`${r} need${r===1?'s':''} review`,g&&`${g} can't be confirmed`].filter(Boolean).join(' · ')||customerDetail(d);}
  if(id==='coding_standards'){const w=(c.watch_only_findings||[]).length,a=(c.findings||[]).filter(f=>f.band==='finding').length;return `${a} enforced finding${a===1?'':'s'} · ${w} watch-only`;}
  if(id==='improper_tests'){const f=(c.findings||[]).length;return f?`${f} weak or removed test${f===1?'':'s'}`:/no changed Java test/.test(d)?'No test changes':'Tests checked, none weak';}
  if(id==='rule_impact'){const f=c.findings||[],v=f.filter(x=>x.status!=='gap'&&String(x.enforced)==='true').length,g=f.length-v;return `${v} governed violation${v===1?'':'s'} · ${g} evidence gap${g===1?'':'s'}`;}
  if(id==='connected_evidence'){const g=n(/(\d+) required evidence gap/);return g?`${g} required gap${g===1?'':'s'}`:'Required evidence complete';}
  return customerDetail(d);
}
window.decisionSection=function(liveDoc){
  const checks=checksOf(liveDoc),decision=checks.governance_decision;
  if(!decision)return '';
  const verdict=liveDoc?.verdict||'';
  const order=['intent_diff','improper_tests','coding_standards','rule_impact','connected_evidence','severity'];
  const NAME={intent_diff:'Intent differences',improper_tests:'Improper tests',coding_standards:'Coding standards',rule_impact:'Governance-rule impact',connected_evidence:'Connected evidence',severity:'Change severity'};
  const rows=order.filter(id=>checks[id]).map(id=>{const c=checks[id],s=c.state;
    const [cls,label]=id==='severity'?['ok','Routing']:s==='failed'?['bad','Blocks']:s==='error'?['gap','Incomplete']:['blocked','stopped'].includes(s)?['skip','Skipped']:s==='passed'?['ok','No issues']:['gap','Pending'];
    return {cls,label,id,html:row(cls,label,NAME[id],decisionNote(id,c,liveDoc),id)};});
  const blocks=rows.filter(r=>r.label==='Blocks'),incomplete=rows.filter(r=>r.label==='Incomplete');
  const headline=verdict==='PASS'?'<b class="ok">Ready to merge</b><span>Every required check passed for this revision.</span>':
    blocks.length?`<b>Blocked</b><span>${e(blocks.map(r=>NAME[r.id]).join(' and '))} ${blocks.length===1?'reports':'report'} a required finding.${incomplete.length?' The assessment is also incomplete, so a fix must be re-analyzed before approval.':''}</span>`:
    `<b class="gap">Incomplete</b><span>No required finding, but ${e(incomplete.map(r=>NAME[r.id]).join(' and ')||'some checks')} could not finish.</span>`;
  return tile({id:'rt-decision',crumbs:['Governance decision','This pull request'],name:'Governance decision',badge:'Decision',
    status:verdict==='PASS'?'clear':blocks.length?'changed':'gap',label:verdict||'Pending',steps:[],
    custom:`<div class="pt-verdict">${headline}</div><ul class="pt-checklist">${[...blocks,...incomplete,...rows.filter(r=>!blocks.includes(r)&&!incomplete.includes(r))].map(r=>r.html).join('')}</ul>`,
    io:[['Intended','A pull request merges only when every governed concept is preserved and the evidence is complete.'],
        ['This PR',verdict==='PASS'?'Ready for owner review.':blocks.length?`Resolve the findings in ${e(blocks.map(r=>NAME[r.id]).join(' and '))}${incomplete.length?', supply the missing evidence,':''} then rerun.`:'Supply the missing evidence, then rerun.']]});
};

/* ---------- code loading ---------- */
function parseHunks(patch,file){
  const section=(patch||'').split(/(?=^diff --git )/m).find(s=>s.split('\n').includes('+++ b/'+file)||s.split('\n').includes('--- a/'+file));
  if(!section)return [];
  return section.split(/(?=^@@ )/m).map(h=>{
    const head=h.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)/);if(!head)return null;
    let oldNo=+head[1],newNo=+head[2];const rows=[];
    for(const raw of h.split('\n').slice(1)){
      if(raw.startsWith('\\')||raw==='')continue;
      const k=raw[0]==='+'||raw[0]==='-'?raw[0]:' ';
      rows.push({k,o:k==='+'?null:oldNo,n:k==='-'?null:newNo,t:raw.slice(1),near:newNo});
      if(k!=='+')oldNo++;if(k!=='-')newNo++;
    }
    return rows;
  }).filter(Boolean);
}
function selectRows(hunks,{mode,line,region,method}){
  const [a,b]=String(region||'').split('-').map(Number);
  for(const rows of hunks){
    let hits=[];
    if(mode==='line')hits=rows.map((r,i)=>r.k!=='-'&&r.n===line?i:-1).filter(i=>i>=0);
    else if(mode==='deleted')hits=rows.map((r,i)=>r.k==='-'&&r.o===line?i:-1).filter(i=>i>=0);
    else if(mode==='deleted-method'){const start=rows.findIndex(r=>r.k==='-'&&new RegExp('\\b'+method+'\\s*\\(').test(r.t));
      if(start>=0){hits=[start];for(let i=start-1;i>=0&&rows[i].k==='-';i--)hits.unshift(i);for(let i=start+1;i<rows.length&&rows[i].k==='-';i++)hits.push(i);}}
    else hits=rows.map((r,i)=>r.k!==' '&&(!a||(r.near>=a&&r.near<=b+1))?i:-1).filter(i=>i>=0);
    if(!hits.length)continue;
    if(mode==='line'&&rows[hits[0]].k===' '){const added=rows.findIndex((r,i)=>i>=hits[0]&&r.k==='+'),near=added>=0?added:rows.findIndex((r,i)=>i>=hits[0]&&r.k!==' ');if(near>=0)hits=[near];}
    const from=Math.max(0,hits[0]-3),to=Math.min(rows.length,hits[hits.length-1]+4);
    return {rows:rows.slice(from,to),hits:new Set(hits.map(i=>i-from))};
  }
  return null;
}
window.renderGovernedMethodSource=async function(root,loadPatch){
 const nodes=[...root.querySelectorAll('[data-governed-source-file]')];
 if(!nodes.length)return;
 let patch;try{patch=await loadPatch();}catch(error){nodes.forEach(node=>node.innerHTML=`<p class="note">${e(error.message)}</p>`);return;}
 for(const node of nodes){
  const hunks=parseHunks(patch,node.dataset.governedSourceFile);
  const anchors=JSON.parse(node.dataset.sourceAnchors||'[]');
  const matched=hunks.filter(rows=>anchors.some(a=>rows.some(r=>a.deleted?r.k==='-'&&r.o===a.line:r.k==='+'&&r.n===a.line)));
  if(!hunks.length){node.innerHTML='<p class="note">No source changes for this file are present in the recorded patch.</p>';continue;}
  const rowsMarkup=rows=>rows.map(r=>`<div class="ii-dl ${r.k==='+'?'add':r.k==='-'?'del':''}"><span class="n">${r.o??''}</span><span class="n">${r.n??''}</span><span class="m">${r.k.trim()}</span><span class="t">${e(r.t)||' '}</span></div>`).join('');
  node.innerHTML=matched.length?'<p class="note">Patch hunks containing this method’s recorded changed lines. Surrounding context may include adjacent methods.</p>'+matched.map(rowsMarkup).join('<hr>'):'<p class="note">An exact changed-line anchor is unavailable for this method.</p>';
  node.innerHTML+=`<details><summary>Full file diff${matched.length?'':' (not method-specific)'}</summary>${hunks.map(rowsMarkup).join('<hr>')}</details>`;
 }
};
window.renderIntentImpact=async function(root,loadPatch){
  const nodes=[...root.querySelectorAll('.ii-changed[data-file]')];
  if(nodes.length){
    let patch;try{patch=await loadPatch();}catch(err){nodes.forEach(n=>n.innerHTML=`<p class="note">${e(err.message)}</p>`);patch=null;}
    if(patch!==null)for(const node of nodes){
      const d=node.dataset,found=selectRows(parseHunks(patch,d.file),{mode:d.mode,line:Number(d.line)||null,region:d.region,method:d.method});
      node.innerHTML=found?found.rows.map((r,i)=>`<div class="ii-dl ${r.k==='+'?'add':r.k==='-'?'del':''}${found.hits.has(i)?' hit':''}"><span class="n">${r.n??''}</span><span class="m">${r.k.trim()}</span><span class="t">${e(r.t)||' '}</span></div>`).join('')
        :'<p class="note">These lines are not part of the recorded patch.</p>';
    }
  }
  renderReviewOutline(root);
};

/* ---------- page outline: where you are ---------- */
let outlineObserver;
function renderReviewOutline(root){
  const sidebar=document.querySelector('.sidebar');
  const checks=[...root.querySelectorAll('.review-check-tile')];
  if(!sidebar||!checks.length)return;
  const items=checks.map((check,ci)=>{
    if(!check.id)check.id='rc-'+(check.dataset.reviewCheckId||ci);
    const title=check.querySelector('summary h3')?.textContent?.trim()||'Check';
    const state=check.querySelector('summary .pill')?.textContent?.trim()||'';
    const tiles=[...check.querySelectorAll('.ii-tile[id]')];
    const count=Number(check.querySelector('summary .count')?.textContent||0);
    return `<li class="ro-check"><a href="#${e(check.id)}" data-outline-target="${e(check.id)}"><span>${e(title)}</span><small>${e(state)}${count?` · ${count} to act on`:''}</small></a>${tiles.length?`<ol>${tiles.map(t=>`<li><a href="#${e(t.id)}" data-outline-target="${e(t.id)}" class="ro-${e(t.dataset.outlineStatus)}">${e(t.dataset.outlineName)}</a></li>`).join('')}</ol>`:''}</li>`;
  }).join('');
  const top=root.querySelector('#rt-decision');
  const decisionItem=top?`<li class="ro-check"><a href="#rt-decision" data-outline-target="rt-decision"><span>Governance decision</span><small>${e(top.querySelector('.ii-status')?.textContent||'')}</small></a></li>`:'';
  root.querySelectorAll('.pt-checklist a[data-outline-target]').forEach(a=>{if(!document.getElementById(a.dataset.outlineTarget))a.replaceWith(document.createTextNode(a.textContent));});
  sidebar.innerHTML=`<p class="eyebrow">On this page</p><ol class="review-outline">${decisionItem}${items}</ol><div class="side-foot">Checks in run order. The highlighted entry is the one in view.</div>`;
  root.onclick=ev=>{const a=ev.target.closest('.pt-checklist [data-outline-target]');if(!a)return;ev.preventDefault();const el=document.getElementById(a.dataset.outlineTarget);if(!el)return;for(let n=el;n&&n!==root;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});};
  sidebar.onclick=ev=>{const a=ev.target.closest('[data-outline-target]');if(!a)return;ev.preventDefault();
    const el=document.getElementById(a.dataset.outlineTarget);if(!el)return;
    const parent=el.closest('details.review-check-tile');if(parent)parent.open=true;if(el.tagName==='DETAILS')el.open=true;
    el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
  outlineObserver?.disconnect();
  const links=new Map([...sidebar.querySelectorAll('[data-outline-target]')].map(a=>[a.dataset.outlineTarget,a]));
  outlineObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){if(!entry.isIntersecting)continue;
      const tileId=entry.target.id,checkId=entry.target.closest('.review-check-tile')?.id;
      sidebar.querySelectorAll('.current').forEach(x=>x.classList.remove('current'));
      links.get(checkId)?.classList.add('current');links.get(tileId)?.classList.add('current');}
  },{rootMargin:'-20% 0px -70% 0px'});
  root.querySelectorAll('.review-check-tile, .ii-tile[id], #rt-decision').forEach(el=>outlineObserver.observe(el));
}
})();
