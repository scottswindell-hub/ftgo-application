/* Readable review: a narrow projection of recorded intent facts and bounded Ask Code Intent prose. */
(function(root){
'use strict';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const words=value=>String(value||'').replace(/^FTGO-/,'').replaceAll('_',' ').replaceAll('-',' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
const shortMethod=value=>String(value||'').split('::').pop().replace(/:[^:(]*(?:\(.*)?$/,'').replace(/\(.*$/,'').replace(/\/\d+$/,'');
const shortFile=value=>String(value||'').split('/').pop()||'Source unavailable';
const valueText=value=>value===undefined||value===null?'Not represented':typeof value==='string'?value:JSON.stringify(value,null,2);

function comparisons(summary){
 const found=new Map();
 const add=(id,value)=>{if(id&&value?.source_comparison?.complete)found.set(id,value.source_comparison);};
 for(const value of summary?.intent_semantics?.explanations||[])add(value.change_id,value);
 for(const [id,value] of Object.entries(summary?.behavior_narrative?.packet?.changes||{}))add(id,value);
 for(const card of summary?.cards||[])for(const [id,value] of Object.entries(card.evidence||{}))add(id,value);
 return found;
}

function patchComparison(packet,file){
 const patch=packet?.source_diff?.content;
 if(!file||typeof patch!=='string')return null;
 const lines=patch.split('\n');let selected=false,before=[],after=[],diffLines=[],added=false,removed=false;
 for(const line of lines){
  if(line.startsWith('diff --git ')){
   const match=line.match(/^diff --git a\/(.+) b\/(.+)$/);
   selected=Boolean(match&&(match[1]===file||match[2]===file));
   continue;
  }
  if(selected&&line==='--- /dev/null')added=true;
  if(selected&&line==='+++ /dev/null')removed=true;
  if(selected&&line.startsWith('@@'))diffLines.push([' ',line]);
  if(selected&&/^[ +\-]/.test(line)&&!line.startsWith('--- ')&&!line.startsWith('+++ '))diffLines.push([line[0],line.slice(1)]);
  if(!selected||line.startsWith('index ')||line.startsWith('new file ')||
     line.startsWith('deleted file ')||line.startsWith('--- ')||line.startsWith('+++ ')||
     line.startsWith('@@'))continue;
  if(line.startsWith('-'))before.push(line.slice(1));
  else if(line.startsWith('+'))after.push(line.slice(1));
  else if(line.startsWith(' ')){before.push(line.slice(1));after.push(line.slice(1));}
 }
 if(!before.length&&!after.length)return null;
 return {complete:false,file,method:'',diffLines,
  before:{text:added?'(file did not exist in the accepted baseline)':before.join('\n')},
  after:{text:removed?'(file was removed in this revision)':after.join('\n')},
  qualification:'Exact changed hunk from the digest-verified PR source patch.'};
}

function flowFacts(flow,side){
 const values=[];
 for(const change of flow?.fact_changes||[]){
  const rows=change?.[side];
  if(rows)values.push({form:change.form,facts:rows});
 }
 if(values.length)return values;
 for(const delta of flow?.observed_deltas||[]){
  const facts=delta?.fields?.fact?.[side];
  if(facts)values.push({kind:delta.kind,facts});
 }
 return values;
}

function explanationStatus(row,flow){
 const judgment=flow?.behavior_judgment||{};
 if(judgment.status==='supported_boundary_violation')return 'violation';
 if(judgment.status==='supported_boundary_preservation'||judgment.choice==='equivalent')return 'preserved';
 return row.decision_state==='governance_mapping_not_decided'?'decision':'review';
}

function reviewType(value){
 const finding=value?.findings?.[0]||value||{};
 if(finding.kind==='test')return 'Test';
 if(finding.kind==='standard'){
  if(finding.category_parent==='defects'||finding.category==='defects'||String(finding.rule_id||'').startsWith('SR-BUG-'))return 'Bug';
  if(finding.category_parent==='architecture'||finding.category==='architecture')return 'Architecture';
  return 'Standard';
 }
 if(value?.objective_kind==='architecture')return 'Architecture';
 if(value?.objective_kind==='business'||value?.objective)return 'Business';
 return 'Behavior';
}

function sourceComparison(packet,summary,row,flow,index){
 const byId=comparisons(summary);
 if(byId.has(row.change_id))return byId.get(row.change_id);
 for(const id of row.member_change_ids||[])if(byId.has(id))return byId.get(id);
 const file=flow?.source?.file;
 const method=shortMethod(flow?.method);
 for(const value of byId.values()){
  if(file&&value.file===file&&(!method||shortMethod(value.method)===method))return value;
 }
 return patchComparison(packet,row.changed_source?.file||file);
}

function evidenceGap(flow){
 const judgment=flow?.behavior_judgment||{};
 return flow?.change_kind==='boundary_evidence_gap'||judgment.verdict==='gap'||judgment.answer==='insufficient_evidence'||
  (flow?.findings||[]).some(row=>row.domain==='evidence_coverage'&&row.severity==='gap');
}
function modelFromEvidenceGaps(packet){
 return (packet?.flows||[]).filter(evidenceGap).map(flow=>({
  id:flow.id,kind:'change',status:'unknown',title:'LACKS_DETERMINISTIC_EVIDENCE',
  concept:flow.boundary_id||flow.title,file:flow.source?.file||'',method:shortMethod(flow.method),
  before:'Baseline behavior is not established by this comparison.',
  after:'A behavior change cannot be established from the available evidence.',
  summary:'Analysis has an evidence gap; this is not an established behavior change.',
  detailSummary:'',connections:[],intentBefore:flowFacts(flow,'before'),intentAfter:flowFacts(flow,'after'),
  comparison:patchComparison(packet,flow.source?.file),reviewType:'Behavior',groundingLabel:'RECORDED ANALYSIS GAP'
 }));
}
function modelFromSemantics(packet,summary){
 const byFlow=new Map((packet?.flows||[]).map(flow=>[flow.id,flow]));
 const rows=summary?.intent_semantics?.status==='recorded'?summary.intent_semantics.explanations||[]:[];
 return rows.filter(row=>!(row.member_change_ids||[row.change_id]).some(id=>evidenceGap(byFlow.get(id)))).map((row,index)=>{
  const related=(row.member_change_ids||[row.change_id]).map(id=>byFlow.get(id)).filter(Boolean);
  const flow=related[0]||{};
  const paths=row.graph_path||[];
  const objective=row.accepted_intent||paths.map(path=>path.obligation_statement||path.customer_outcome).filter(Boolean).join(' · ');
  const comparison=sourceComparison(packet,summary,row,flow,index);
  const addedFile=comparison?.before?.text==='(file did not exist in the accepted baseline)';
  return {
   id:row.change_id||`semantic-${index}`,kind:objective?'constraint':'change',status:explanationStatus(row,flow),
   title:row.title||words(row.concept)||'Behavior change',concept:row.concept||flow.title||'Changed behavior',
   method:shortMethod(row.changed_source?.method||flow.method),file:row.changed_source?.file||flow.source?.file||'',owner:paths.map(path=>path.owner).find(Boolean)||'',objective,
   before:addedFile?`The accepted baseline did not contain ${shortFile(row.changed_source?.file||flow.source?.file)}.`:row.behavior_before,
   after:row.behavior_after,
   summary:row.semantic_consequence,
   detailSummary:[row.semantic_consequence,row.user_or_system_effect].filter(Boolean).join(' '),
   intentBefore:related.flatMap(value=>flowFacts(value,'before')),intentAfter:related.flatMap(value=>flowFacts(value,'after')),
   connections:paths.map(path=>({title:path.customer_outcome||path.workflow_name||path.workflow_id,
    detail:path.obligation_statement||path.obligation_phase||'Accepted workflow connection'})),
   comparison,reviewType:reviewType({objective}),
   groundingLabel:'AGENT INTERPRETATION · GROUNDED IN DETERMINISTIC EVIDENCE',
   qualification:'Agent wording over deterministic before/after intent facts. Governance status comes from the accepted ledger and pipeline checks.'
  };
 });
}

function modelFromNarrative(summary,packet){
 const gaps=new Set((packet?.flows||[]).filter(evidenceGap).map(flow=>flow.id));
 const narrative=summary?.behavior_narrative;
 if(narrative?.status!=='recorded')return [];
 const changes=narrative.packet?.changes||{};
 return (narrative.stories||[]).filter(story=>!(story.change_ids||[]).some(id=>gaps.has(id))).map((story,index)=>{
  const related=(story.change_ids||[]).map(id=>changes[id]).filter(Boolean);
  const change=related[0]||{},comparison=change.source_comparison||null;
  return {id:story.story_id||`narrative-${index}`,kind:'change',status:'review',
   title:story.title||'Behavior change',concept:'Changed behavior',method:shortMethod(change.method),
   file:change.source?.file||comparison?.file||'',owner:'',objective:'',
   before:'The baseline method is shown in the recorded source comparison below.',
   after:narrative.summary||story.explanation,
   summary:story.explanation||narrative.summary,intentBefore:[],intentAfter:[],connections:[],comparison,reviewType:'Behavior',
   groundingLabel:'AGENT INTERPRETATION · GROUNDED IN DETERMINISTIC EVIDENCE',
   qualification:'Agent wording over a digest-pinned before/after method comparison. No intent-graph connection or governance violation is inferred.'};
 });
}

function modelFromEntries(entries){
 return (entries||[]).filter(entry=>(entry.story||entry.governanceDecision||entry.category==='Intent differences')&&!/\/src\/(?:test|integration-test)\//.test(entry.source?.file||'')).map(entry=>({
  id:entry.id,kind:entry.governanceObjective?'constraint':'change',status:entry.status==='action'?'violation':entry.status==='clear'?'preserved':'review',
  title:entry.title,concept:entry.concept||entry.category,method:entry.source?.symbol||'',file:entry.source?.file||'',owner:entry.owner||'',objective:entry.governanceObjective||'',
  before:entry.beforeResult||entry.beforeState||entry.before||'Baseline behavior is recorded in the technical evidence.',
  after:entry.afterResult||entry.afterState||entry.after||'Revised behavior needs review.',summary:entry.summary||entry.nextStep||'',
  intentBefore:entry.story?.before||entry.before,intentAfter:entry.story?.after||entry.after,connections:[],comparison:null,
  groundingLabel:'RECORDED ANALYSIS · SEMANTIC EXPLANATION UNAVAILABLE',
  reviewType:reviewType({objective:entry.governanceObjective,objective_kind:entry.objectiveKind||entry.objective_kind}),
  qualification:'Deterministic review projection; no semantic explanation artifact was available.'
 }));
}

function publicJudgment(flow,checks){
 const embedded=flow?.behavior_judgment||{};
 if(embedded.question_id&&/^supported_boundary_/.test(embedded.status||''))return embedded;
 const boundary=flow?.boundary_id||flow?.title;
 const regions=new Set((flow?.concepts||[]).map(row=>row.unit_id).filter(Boolean));
 const rows=(checks||[]).find(check=>check.id==='intent_diff')?.judgments||[];
 const match=rows.find(row=>row.question_id&&row.boundary_id===boundary&&
  (!regions.size||(row.intent_region_ids||[]).some(id=>regions.has(id)))&&
  ['violated','preserved','equivalent'].includes(row.answer));
 if(!match)return embedded;
 return {...match,choice:match.answer,status:match.answer==='violated'?
  'supported_boundary_violation':'supported_boundary_preservation'};
}

function modelFromGovernedFlows(packet,checks){
 const grouped=new Map();
 for(const flow of packet?.flows||[]){
  if(evidenceGap(flow))continue;
  const judgment=publicJudgment(flow,checks);
  if(!judgment.question_id||!/^supported_boundary_/.test(judgment.status||''))continue;
  if(!grouped.has(judgment.question_id))grouped.set(judgment.question_id,[]);
  grouped.get(judgment.question_id).push({...flow,behavior_judgment:judgment});
 }
 const objectiveViolations=packet?.acceptance?.layers?.core_objectives?.violations||[];
 return [...grouped].map(([id,flows])=>{
  const flow=flows[0],judgment=flow.behavior_judgment||{};
  const file=flows.map(value=>value.source?.file).find(Boolean)||'';
  const objective=objectiveViolations.length===1?objectiveViolations[0].statement||'':'';
  const violated=judgment.status==='supported_boundary_violation'||judgment.choice==='violated';
  return {id,kind:objective?'constraint':'change',status:violated?'violation':'preserved',
   title:words(judgment.boundary_id||flow.title)||'Governed boundary change',
   concept:judgment.boundary_id||flow.title||'Governed boundary',method:shortMethod(flow.method),file,owner:'',objective,
   before:'The accepted baseline recorded the governed boundary behavior shown below.',
   after:violated?'This pull request changes that governed boundary and the recorded judgment reports a violation.':'The recorded judgment reports that this pull request preserves the governed boundary.',
   summary:violated?'The deterministic boundary comparison and recorded judgment establish a governed semantic violation.':'The deterministic boundary comparison and recorded judgment establish preservation.',
   detailSummary:'',intentBefore:flows.flatMap(value=>flowFacts(value,'before')),
   intentAfter:flows.flatMap(value=>flowFacts(value,'after')),connections:[],
   comparison:patchComparison(packet,file),reviewType:objective?'Business':'Behavior',
   groundingLabel:'RECORDED GOVERNED BOUNDARY JUDGMENT',
   qualification:'Projected directly from the digest-pinned intent-flow facts and recorded governed-boundary judgment; no optional semantic prose was available.'};
 });
}

function reviewFindings(checks){
 const rows=[];
 const standards=(checks||[]).find(check=>check.id==='coding_standards');
 const active=standards?.output?.public_findings||standards?.findings||[];
 const watch=standards?.output?.public_watch_only||standards?.watch_only_findings||[];
 for(const [index,finding] of [...active.map(row=>({...row,watchOnly:false})),...watch.map(row=>({...row,watchOnly:true}))].entries()){
  if(finding.kind==='check_verdict'||!finding.rule_id||(finding.band&&finding.band!=='finding'))continue;
  rows.push({id:`standard-${finding.rule_id||index}-${finding.file||index}-${finding.unit||index}`,kind:'standard',
   findingKey:[finding.rule_id,finding.file,finding.unit].map(value=>String(value||'')).join('|'),
   title:finding.name||'Repository standard needs attention',
   summary:finding.guidance||'',
   file:finding.file||'',method:finding.unit||'',line:finding.line||'',
   basis:[finding.category_parent,finding.category,finding.rule_id].filter(Boolean).join(' · '),
   category:finding.category||'',category_parent:finding.category_parent||'',rule_id:finding.rule_id||'',
   watchOnly:finding.watchOnly,ref:finding.ref||'',decision:finding.decision||''});
 }
 const tests=(checks||[]).find(check=>check.id==='improper_tests');
 const descriptions={weak:'The changed test may still pass when the behavior it claims to cover is broken.',
  deleted:'A test that previously constrained this behavior was removed.',
  inconclusive:'The changed test could not be reconstructed, so its evidence was not accepted.'};
 for(const [index,finding] of (tests?.output?.public_findings||tests?.findings||[]).entries()){
  rows.push({id:`test-${finding.kind||'weak'}-${finding.unit||index}`,kind:'test',
   findingKey:[`improper_tests:${finding.kind||'weak'}`,finding.file,finding.unit].map(value=>String(value||'')).join('|'),
   title:finding.kind==='deleted'?'Behavioral test removed':finding.kind==='inconclusive'?'Test evidence unavailable':'Test may not detect broken behavior',
   summary:descriptions[finding.kind]||descriptions.weak,file:finding.file||'',method:finding.unit||'',
   line:finding.line||'',basis:[finding.signals,finding.basis].filter(Boolean).join(' · '),
   ref:finding.ref||'',decision:finding.decision||''});
 }
 return rows;
}

function reviewFindingItems(packet,summary,items,checks){
 const interpretations=new Map((summary?.intent_semantics?.finding_explanations||[])
  .map(row=>[row.finding_id,{summary:row.summary||row.explanation,review:row.review||row.explanation}]));
 const projected=[];
 for(const finding of reviewFindings(checks)){
  const candidates=items.filter(item=>finding.file&&item.file===finding.file);
  const method=shortMethod(finding.method);
  const target=finding.kind==='standard'?(candidates.find(item=>method&&shortMethod(item.method)===method)
    ||(candidates.length===1?candidates[0]:null)):null;
  const interpretation=interpretations.get(finding.findingKey)||{};
  const plain=interpretation.summary||target?.summary||finding.title;
  const fallback=finding.kind==='test'?[finding.summary,finding.basis].filter(Boolean).join(' '):plain;
  projected.push({id:finding.id,kind:finding.kind==='standard'&&!finding.watchOnly?'constraint':'change',status:finding.watchOnly?'watch':'finding',title:finding.title,
   concept:finding.kind==='test'?'Behavioral evidence':'Repository standard',method:finding.method,
   file:finding.file,owner:'',objective:'',
   before:target?.before||(finding.kind==='test'?'The baseline retained test evidence for the affected behavior.':'The baseline did not contain this reported rule conflict.'),
   after:target?.after||(finding.kind==='test'?finding.summary:`The pipeline reported this rule against ${finding.method||finding.file}.`),
   summary:interpretation.summary||target?.summary||fallback,
   detailSummary:interpretation.review||target?.detailSummary||target?.summary||fallback,
   resolution:'',
   intentBefore:target?.intentBefore||[],intentAfter:target?.intentAfter||[],
   connections:target?.connections||[],comparison:target?.comparison||patchComparison(packet,finding.file),findings:[finding],
   relatedBehaviorId:target?.id||null,reviewType:reviewType(finding),
   groundingLabel:interpretation.summary?'AGENT INTERPRETATION · GROUNDED IN DETERMINISTIC EVIDENCE':target?'AGENT INTERPRETATION · RULE FINDING GROUNDED IN DETERMINISTIC EVIDENCE':'RECORDED PIPELINE EVIDENCE',
   qualification:interpretation.summary?'The finding comes from the structured Lambda check. The wording translates its bounded deterministic evidence.':target?'The rule result comes from the structured Lambda check. The before/after behavior comes from the matching bounded CodeIntent explanation.':'Projected directly from the structured Lambda check result. No additional model judgment was used.'});
 }
 return projected;
}

function ownerReviewItems(packet,summary,items,checks){
 const represented=new Set(items.map(item=>item.id));
 for(const row of summary?.intent_semantics?.explanations||[])if(represented.has(row.change_id))
  for(const id of row.member_change_ids||[row.change_id])represented.add(id);
 const flows=new Map((packet?.flows||[]).map(flow=>[flow.id,flow]));
 const result=[];
 function describe(flow,side){
  const descriptions=[];
  for(const change of flow?.fact_changes||[])for(const fact of change[side]||[]){
   if(fact.operation)descriptions.push(`${fact.receiver?fact.receiver+'.':''}${fact.operation}(${(fact.arguments||[]).join(', ')})`);
   else if(fact.slot&&fact.value!==undefined)descriptions.push(`${fact.slot}: ${typeof fact.value==='string'?fact.value:JSON.stringify(fact.value)}`);
   else if(fact.expression)descriptions.push(String(fact.expression));
  }
  return descriptions.length?'Recorded source: '+[...new Set(descriptions)].join('; ').slice(0,1200):
   side==='before'?'No corresponding before-fact was recorded for this observation.':'See the exact changed source below; no concise after-fact was recorded.';
 }
 for(const check of checks||[])for(const finding of check.findings||[]){
  if(finding.review_kind!=='intent'||represented.has(finding.id))continue;
  const flow=flows.get(finding.id),file=finding.file||flow?.source?.file||'';
  result.push({id:finding.id,kind:'change',status:'review',title:finding.title,
   summary:finding.title,detailSummary:finding.observation||'',before:describe(flow,'before'),after:describe(flow,'after'),
   concept:'Source behavior requiring intent review',method:shortMethod(finding.unit||flow?.method),file,
   objective:'',owner:'',reviewType:'Behavior',connections:[],
   intentBefore:flowFacts(flow,'before'),intentAfter:flowFacts(flow,'after'),comparison:patchComparison(packet,file),
   groundingLabel:'RECORDED SOURCE CHANGE',qualification:'Intent review only; no accepted obligation or violation is inferred.'});
 }
 return result;
}

function codeIntentReviewModel(packet,summary,entries=[],checks=[]){
 // Older artifacts projected the same unbound observation twice, once as an
 // unmapped governed region. Keep the explicit owner-review projection only.
 const ownerIds=new Set((packet?.flows||[]).filter(flow=>flow.change_kind==='unbound_business_behavior'&&
  flow.acceptance_decision==='owner_review_required'&&flow.acceptance_decision_authority==='human_owner'&&
  flow.advisory===true&&flow.objective_violation===false&&!flow.behavior_judgment).map(flow=>flow.id));
 if(ownerIds.size)packet={...packet,flows:(packet.flows||[]).filter(flow=>!(ownerIds.has(flow.id)&&
  flow.change_kind==='boundary_evidence_gap'&&!flow.behavior_judgment&&flow.findings?.length&&
  flow.findings.every(f=>f.domain==='evidence_coverage'&&f.reason==='governance_constrained_region_unmapped')))};

 const items=modelFromSemantics(packet,summary);
 const narrativeItems=modelFromNarrative(summary,packet);
 const semanticStatus=summary?.intent_semantics?.status||'unavailable';
 const intentCheck=(checks||[]).find(check=>check.id==='intent_diff');
 const confirmedNoChange=semanticStatus==='no_changes'&&intentCheck?.state==='passed';
 const usingNarrative=!items.length&&!confirmedNoChange&&Boolean(narrativeItems.length);
 const entryItems=modelFromEntries(entries);
 const effective=items.length||confirmedNoChange?items:usingNarrative?narrativeItems:
  entryItems.length?entryItems:modelFromGovernedFlows(packet,checks);
 const unique=[];const seen=new Set();
 for(const item of [...modelFromEvidenceGaps(packet),...effective]){if(seen.has(item.id))continue;seen.add(item.id);unique.push(item);}
 for(const item of reviewFindingItems(packet,summary,unique,checks)){if(!seen.has(item.id)){seen.add(item.id);unique.push(item);}}
 for(const item of ownerReviewItems(packet,summary,unique,checks)){if(!seen.has(item.id)){seen.add(item.id);unique.push(item);}}
 const changes=unique.filter(item=>item.kind==='change'&&item.status!=='preserved');
 const constraints=unique.filter(item=>item.kind==='constraint'&&item.status!=='preserved');
 const preserved=unique.filter(item=>item.status==='preserved').length;
 const usefulUncertainty=(summary?.intent_semantics?.uncertainty||[]).filter(value=>
  !/no (?:accepted outcome|governed obligation|governance|objective).*(?:connected|supplied|mapped)/i.test(value));
 return {schema:'readable-intent-review-v1',changes,constraints,preserved,
  semanticStatus,confirmedNoChange,
  omitted:summary?.intent_semantics?.omitted_change_ids?.length||0,
  additionalRecorded:usingNarrative?(summary?.behavior_narrative?.unexplained_change_ids?.length||0):0,
  uncertainty:usefulUncertainty,
  baseline:packet?.baseline_commit||'',head:packet?.head_commit||'',repository:packet?.repository||''};
}

const states=new Map();
function reviewState(scope){if(!states.has(scope))states.set(scope,{selected:null,drafts:new Map(),submitted:new Map()});return states.get(scope);}
function allItems(model){return [...model.changes,...model.constraints];}
function decision(state,id){return state.drafts.get(id)||state.submitted.get(id)||'';}
function label(item){return item.status==='violation'?'Constraint changed':item.status==='finding'?'Check failed':'Behavior change';}
function rowMarkup(item,state){
 const answer=decision(state,item.id),submitted=state.submitted.has(item.id);
 return `<button type="button" class="rr-row ${answer||''} ${submitted?'submitted':''}" data-rr-open="${escapeHtml(item.id)}"><span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.summary)}</small></span><span class="rr-row-state">${answer==='yes'?(submitted?'Accepted':'Yes, intended'):answer==='no'?(submitted?'Investigating':'No, investigate'):escapeHtml(label(item))}</span></button>`;
}
function intentText(value){
 const lines=[];
 for(const entry of Array.isArray(value)?value:[value]){
  for(const fact of entry?.facts||[]){
   if(typeof fact!=='string'){lines.push(valueText(fact));continue;}
   const start=fact.indexOf('{');if(start<0){lines.push(fact);continue;}
   let slots;try{slots=JSON.parse(fact.slice(start));}catch{lines.push(fact);continue;}
   const form=fact.slice(0,start).trim().replaceAll('_',' ');lines.push(form);
   if(slots.slot&&Object.hasOwn(slots,'value'))lines.push(`  ${slots.slot} := ${valueText(slots.value)}`);
   else for(const [key,item] of Object.entries(slots))lines.push(`  ${key}: ${Array.isArray(item)?item.join(' | '):valueText(item)}`);
  }
 }
 return lines.join('\n')||'Not represented';
}
function sourceDiffLines(comparison){
 if(comparison?.diffLines)return comparison.diffLines;
 const split=text=>text===''?[]:String(text??'').split('\n');
 const before=split(comparison?.before?.text),after=split(comparison?.after?.text);
 // Refuse an oversized calculation rather than display a fabricated full replacement.
 if((before.length+1)*(after.length+1)>1000000)return [[' ','Source comparison is too large for the compact diff. Open Source evidence.']];
 const dp=Array.from({length:before.length+1},()=>new Uint32Array(after.length+1));
 for(let i=before.length-1;i>=0;i--)for(let j=after.length-1;j>=0;j--)
  dp[i][j]=before[i]===after[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const rows=[];let i=0,j=0;
 while(i<before.length||j<after.length){
  if(i<before.length&&j<after.length&&before[i]===after[j]){rows.push([' ',before[i++]]);j++;}
  else if(i<before.length&&(j===after.length||dp[i+1][j]>=dp[i][j+1]))rows.push(['-',before[i++]]);
  else rows.push(['+',after[j++]]);
 }
 return rows;
}
function comparisonMarkup(before,after,formatter){
 const rows=sourceDiffLines({before:{text:formatter(before)},after:{text:formatter(after)}});
 return `<pre class="rr-diff">${rows.map(([mark,text])=>`<span class="${mark==='-'?'rr-del':mark==='+'?'rr-add':''}">${mark} ${escapeHtml(text)}</span>`).join('')}</pre>`;
}

function codeText(comparison,side){return comparison?.[side]?.text||'Source comparison was not supplied for this intent change.';}
function violationMarkup(item){
 // A rule violation is decided in a PR comment by one person with write access (codeintent-violations.yml).
 const finding=(item.findings||[]).find(f=>f.ref&&!f.watchOnly);
 if(!finding)return '';
 const ref=escapeHtml(finding.ref);
 const body=finding.decision==='rule_change_requested'
  ?'<p>Reported as a false detection: a rule exception is committed to this pull request, and the checks re-run.</p>'
  :`<p>Someone with write access decides, in a PR comment:</p><ul><li><b>Real violation:</b> <code>/reject -- reason</code> closes this pull request.</li><li><b>False detection:</b> <code>/false-positive ${ref} -- reason</code> requests a fix to the rule.</li></ul>`;
 return `<section class="rr-violation"><small>RULE VIOLATION · ${ref}</small>${body}</section>`;
}
function detailMarkup(item,state){
 const answer=decision(state,item.id);
 const connections=item.connections.length?`<section class="rr-reach"><h4>Connected outcomes</h4><ul>${item.connections.map(c=>`<li><b>${escapeHtml(c.title)}</b><small>${escapeHtml(c.detail)}</small></li>`).join('')}</ul></section>`:'';
 return `<button type="button" class="rr-back" data-rr-back>← All changes</button><article class="rr-detail">
  <header><div><h2>${escapeHtml(item.title)}</h2><p><code>${escapeHtml(item.method||shortFile(item.file))}</code></p></div><span class="rr-badge ${item.status}">${escapeHtml(label(item))}</span></header>
  ${item.objective?`<section class="rr-objective"><small>ACCEPTED CONSTRAINT</small><b>${escapeHtml(item.objective)}</b></section>`:''}
  <div class="rr-before-after"><section><small>BEFORE</small><p>${escapeHtml(item.before)}</p></section><section><small>WITH THIS PR</small><p>${escapeHtml(item.after)}</p></section></div>
  <section class="rr-explanation"><small>${escapeHtml(item.groundingLabel||'ASK CODE INTENT')}</small><p>${escapeHtml(item.summary)}</p></section>
  <div class="rr-evidence ${item.intentBefore?.length||item.intentAfter?.length?'':'source-only'}">${item.intentBefore?.length||item.intentAfter?.length?`<section><header><b>Intent</b><span>${escapeHtml(words(item.concept))}</span></header>${comparisonMarkup(item.intentBefore,item.intentAfter,intentText)}</section>`:''}
  <section><header><b>Code</b><span title="${escapeHtml(item.file)}">${escapeHtml(shortFile(item.file))}</span></header>${comparisonMarkup(codeText(item.comparison,'before'),codeText(item.comparison,'after'),valueText)}</section></div>
  ${connections}<details class="rr-grounding"><summary>How this answer was produced</summary><p>${escapeHtml(item.qualification)}</p><p><code>${escapeHtml(item.file||'No source anchor supplied')}</code></p></details>
  ${violationMarkup(item)}${item.status==='unknown'?'<footer>Assessment is unavailable until the evidence gap is resolved.</footer>':`<footer><b>Did you mean this?</b><div><button type="button" data-rr-answer="yes" data-rr-id="${escapeHtml(item.id)}" aria-pressed="${answer==='yes'}">Yes, I meant this</button><button type="button" data-rr-answer="no" data-rr-id="${escapeHtml(item.id)}" aria-pressed="${answer==='no'}">No, investigate</button></div></footer>`}
 </article>`;
}
function codeIntentReviewMarkup(model,scope){
 const state=reviewState(scope),items=allItems(model),selected=items.find(item=>item.id===state.selected);
 if(selected)return detailMarkup(selected,state);
 if(!items.length){
  if(model.confirmedNoChange)return `<section class="rr-empty"><span>✓</span><h2>Behavior is unchanged</h2><p>The implementation changed, but no semantic change requiring a decision was established.</p>${model.preserved?`<small>${model.preserved} preserved intent comparison${model.preserved===1?'':'s'} recorded.</small>`:''}</section>`;
  return `<section class="rr-empty"><span>!</span><h2>Review evidence is unavailable</h2><p>The analysis did not complete, so this view cannot determine whether behavior changed.</p></section>`;
 }
 const drafts=state.drafts.size;
 return `<section class="rr-review" data-rr-scope="${escapeHtml(scope)}"><header class="rr-lede"><div><h2>Did you intend these behavioral changes?</h2><p>${items.length} decision${items.length===1?'':'s'} from the code-intent comparison.</p></div><span>${model.preserved} preserved</span></header>
  <section><h3>Behavioral changes <span>${model.changes.length}</span></h3><div class="rr-rows">${model.changes.map(item=>rowMarkup(item,state)).join('')||'<p class="rr-none">No ungoverned behavioral changes need a decision.</p>'}</div></section>
  ${model.constraints.length?`<section><h3>Constraint violations <span>${model.constraints.length}</span></h3><div class="rr-rows">${model.constraints.map(item=>rowMarkup(item,state)).join('')}</div></section>`:''}
  ${model.uncertainty.length||model.omitted||model.additionalRecorded?`<details class="rr-limit"><summary>Analysis limits</summary><ul>${model.omitted?`<li>${model.omitted} additional grouped intent change${model.omitted===1?' was':'s were'} recorded but not translated in this bounded review.</li>`:''}${model.additionalRecorded?`<li>${model.additionalRecorded} additional analyzed change${model.additionalRecorded===1?' remains':'s remain'} in the run evidence outside this semantic narrative.</li>`:''}${model.uncertainty.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></details>`:''}
  <footer class="rr-submit"><span>Responses are draft decisions until submitted.</span><button type="button" data-rr-undo ${drafts?'':'disabled'}>Undo all</button><button type="button" class="primary" data-rr-submit ${drafts?'':'disabled'}>Submit ${drafts||''}</button></footer></section>`;
}
function bindReadableReview(render){
 if(root.__readableReviewBound)return;root.__readableReviewBound=true;
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-rr-open],[data-rr-back],[data-rr-answer],[data-rr-submit],[data-rr-undo]');if(!button)return;
  const section=button.closest('[data-rr-scope]');const scope=section?.dataset.rrScope||root.__readableReviewScope;if(!scope)return;
  const state=reviewState(scope);
  if(button.dataset.rrOpen)state.selected=button.dataset.rrOpen;
  else if(button.hasAttribute('data-rr-back'))state.selected=null;
  else if(button.dataset.rrAnswer){state.drafts.set(button.dataset.rrId,button.dataset.rrAnswer);state.selected=null;}
  else if(button.hasAttribute('data-rr-submit')){for(const [id,value] of state.drafts)state.submitted.set(id,value);state.drafts.clear();}
  else if(button.hasAttribute('data-rr-undo'))state.drafts.clear();
  render();
 });
}
function renderCodeIntentReview(target,model,options){
 root.__readableReviewScope=options.scope;target.innerHTML=codeIntentReviewMarkup(model,options.scope);bindReadableReview(options.render);
}

root.codeIntentSourceDiffLines=sourceDiffLines;
root.codeIntentReviewModel=codeIntentReviewModel;
root.codeIntentReviewMarkup=codeIntentReviewMarkup;
root.renderCodeIntentReview=renderCodeIntentReview;
if(typeof module!=='undefined')module.exports={codeIntentReviewModel,codeIntentReviewMarkup,sourceDiffLines};
})(typeof window!=='undefined'?window:globalThis);
