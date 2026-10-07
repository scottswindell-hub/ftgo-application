// Intent Flow in reviewer terms: service names for deployables, readable method and concept names,
// plain before/after wording, and governed changes listed before context-only ones. Data is unchanged.
function customerGraph(packet,graph){
 const service=label=>String(label||'').replace(/^ftgo-/,'').replace(/-service$/,' service').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
 const services=new Map((packet.governed_objectives?.holon_map?.services||[]).map(s=>[s.id,service(s.label)]));
 const scope=n=>services.get(String(n.label))||services.get(String(n.id).replace(/^scope:/,''))||({application:'Application'}[n.label])||
   (/^file:/.test(n.label)?'Source file':/^flow_holon:/.test(n.label)?'Intent area':/^method:/.test(n.label)?'Method':/^deployable:/.test(n.label)?'Service':n.label);
 const method=label=>{const m=String(label||'').match(/(\w+)\.([\w<>$]+)[:(]/);return m?`${m[1]}.${m[2].replace(/^<init>$/,'definition')}`:label;};
 const words=t=>String(t??'').replace(/^recognized form(\s·\srecognized form)*$/,'Matched a governed pattern').replace(/^no matching form(\s·\sno matching form)*$/,'No longer matches the governed pattern')
   .replace(/^behavior not compared$/,'Not compared').replace(/^analysis context changed$/,'Surrounding code changed').replace(/^Baseline facts not supplied$/,'No earlier facts recorded').replace(/^New facts not supplied$/,'No new facts recorded');
 const rank=n=>n.kind!=='change'?0:({governed_boundary_change:0,source_changed:1,added:2,removed:2,business_contract:1}[n.change_kind]??3);
 const nodes=(graph.nodes||[]).map(n=>n.kind==='scope'?{...n,label:scope(n)}:n.kind==='change'?{...n,label:/^[A-Z]+-[A-Z0-9-]+$/.test(n.label||'')&&window.conceptLabel?conceptLabel(n.label):method(n.label),before:words(n.before),after:words(n.after)}:
   n.kind==='source'?{...n,anchor_status:n.anchor_status==='file_only'?'file changed':n.anchor_status}:n);
 nodes.sort((a,b)=>rank(a)-rank(b));
 return {...graph,nodes};
}
/* Generated packets and demo fixtures share the Review presentation. */
(async function () {
 const params=new URLSearchParams(location.search);
 let dataPath=params.get('data'),artifactReference=null;
 if(!dataPath&&LIVE){
  await new Promise(resolve=>{
   window.onLiveStatusUpdate=doc=>{
    const ref=doc?.review_artifact;
    if(!ref||ref.schema!=='review-artifact-reference-v1'||ref.name!=='intent-flow.json')return;
    artifactReference=ref;
    const base=/\/status$/.test(LIVE_API)?LIVE_API:LIVE_API+'/status';
    const url=new URL(base,location.href);
    url.search=new URLSearchParams({sha:LIVE_SHA,repo:LIVE_REPO,detail:'review-artifact',name:ref.name});
    dataPath=url.href;resolve();
   };
  });
 }
 if(!dataPath)return;
 const content=document.querySelector('#content');if(!LIVE)content.innerHTML='<p>Loading generated review data…</p>';
 try{
  const artifactURL=new URL(dataPath,location.href);
  const apiURL=LIVE&&LIVE_API?new URL(LIVE_API,location.href):null;
  const trustedArtifactURL=url=>url.origin===location.origin||Boolean(apiURL&&url.origin===apiURL.origin);
  if(!trustedArtifactURL(artifactURL))throw Error('Use a same-origin or configured pipeline artifact.');
  let response;
  for(let attempt=0;attempt<120;attempt++){
   response=await fetch(artifactURL,{cache:'no-store'});
   if(response.status!==202)break;
   await new Promise(resolve=>setTimeout(resolve,1500));
  }
  if(response.status===202)throw Error('Backend artifact is still pending.');
  if(!response.ok)throw Error('Artifact unavailable: '+response.status);
  const raw=await response.text(),rawBytes=new TextEncoder().encode(raw);if(rawBytes.length>1048576)throw Error('View exceeds 1 MiB.');
  if(artifactReference){
   if(rawBytes.length!==artifactReference.size)throw Error('View size differs from the status pin.');
   if(await reviewSha256(rawBytes)!==artifactReference.sha256)throw Error('View checksum differs from the status pin.');
  }
  const packet=JSON.parse(raw);
  if(packet.schema!=='intent-flow-view-v1'||!Array.isArray(packet.flows))throw Error('Unsupported view schema.');
  if(LIVE&&(packet.head_commit!==LIVE_SHA||packet.repository!==LIVE_REPO))throw Error('Artifact repository/head differs from this pipeline run.');
  if(LIVE&&qs.get('run_id')&&packet.simulation?.run_id!==qs.get('run_id'))throw Error('Artifact belongs to another pipeline run.');
  const pinnedIdentity={run_id:packet.simulation?.run_id,repository:packet.repository,head_commit:packet.head_commit,baseline_commit:packet.baseline_commit};
  const detailWarnings=[];
  if(packet.governance_review_artifact){
   const loaded=await loadPinnedDetail(packet.governance_review_artifact,pinnedIdentity,'intent-flow-review-detail-v1');
   if(loaded.available)packet.governance_review=loaded.value.governance_review;
   else {packet.governance_review=null;detailWarnings.push('Governance review detail unavailable: '+loaded.reason);}
  }
  let objectiveSummary=null,focusedObjective=null;
  const summaryRef=packet.objective_summary_artifact;
  if(summaryRef){
   try{
    const url=new URL(summaryRef.url,artifactURL);if(!trustedArtifactURL(url))throw Error('Use a trusted summary.');
    const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Summary unavailable.');
    const bytes=await r.arrayBuffer();if(bytes.byteLength>262144)throw Error('Summary exceeds 256 KiB.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==summaryRef.sha256)throw Error('Summary checksum mismatch.');
    const value=JSON.parse(new TextDecoder().decode(bytes));
    if(value.schema!=='objective-behavior-summary-v1'||value.identity.head_commit!==packet.head_commit||value.identity.baseline_commit!==packet.baseline_commit||(packet.repository&&value.identity.repository!==packet.repository)||value.identity.governance_version!==packet.provenance?.governance_version_id)throw Error('Summary run identity mismatch.');
    objectiveSummary=value;
   }catch(error){console.warn('Optional summary unavailable',error.message);}
  }
  if(!params.has('view')||view==='summary'||view==='flow')view='checks';
  const mappingRef=packet.governed_objectives?.holon_map_artifact;
  if(mappingRef){
   const mappingURL=new URL(mappingRef.url,artifactURL);
   if(!trustedArtifactURL(mappingURL))throw Error('Use a trusted governance mapping.');
   const result=await fetch(mappingURL,{cache:'no-store'});
   if(!result.ok)throw Error('Governance mapping unavailable: '+result.status);
   const bytes=await result.arrayBuffer();
   if(bytes.byteLength>262144)throw Error('Governance mapping exceeds 256 KiB.');
   const digest=await reviewSha256(bytes);
   if(digest!==mappingRef.sha256)throw Error('Governance mapping checksum mismatch.');
   const mapping=JSON.parse(new TextDecoder().decode(bytes));
   if(mapping.schema!=='governance-holon-map-v1'||mapping.baseline_commit!==packet.baseline_commit||mapping.head_commit!==packet.head_commit||mapping.governance_digest!==packet.governed_objectives.governance_digest)throw Error('Governance mapping identity mismatch.');
  packet.governed_objectives.holon_map=mapping.holon_map;
  }
  const impactRef=packet.intent_impact_artifact;
  if(impactRef){
   const url=new URL(impactRef.url,artifactURL);
   if(!trustedArtifactURL(url))throw Error('Use a trusted intent impact view.');
   const result=await fetch(url,{cache:'no-store'});if(!result.ok)throw Error('Intent impact view unavailable.');
   const bytes=await result.arrayBuffer();if(bytes.byteLength>262144)throw Error('Intent impact view exceeds 256 KiB.');
   const digest=await reviewSha256(bytes);
   if(digest!==impactRef.sha256)throw Error('Intent impact checksum mismatch.');
   packet.intent_impact=JSON.parse(new TextDecoder().decode(bytes));
  }
  const terrainRef=packet.governed_objectives?.territory_artifact;
  if(terrainRef){
   const url=new URL(terrainRef.url,artifactURL);
   if(!trustedArtifactURL(url))throw Error('Use a trusted objective terrain.');
   const result=await fetch(url,{cache:'no-store'});if(!result.ok)throw Error('Objective terrain unavailable.');
   const bytes=await result.arrayBuffer();if(bytes.byteLength>262144)throw Error('Objective terrain exceeds 256 KiB.');
   const digest=await reviewSha256(bytes);
   if(digest!==terrainRef.sha256)throw Error('Objective terrain checksum mismatch.');
   const terrain=JSON.parse(new TextDecoder().decode(bytes));
   if(terrain.schema!=='objective-terrain-v1'||terrain.baseline_commit!==packet.baseline_commit)throw Error('Objective terrain baseline mismatch.');
   packet.governed_objectives.territory=terrain;
  }
  const candidateRef=packet.governed_objectives?.candidate_impact_artifact;
  if(candidateRef){
   const url=new URL(candidateRef.url,artifactURL);
   if(!trustedArtifactURL(url))throw Error('Use a trusted candidate-impact view.');
   const result=await fetch(url,{cache:'no-store'});if(!result.ok)throw Error('Candidate-impact view unavailable.');
   const bytes=await result.arrayBuffer();if(bytes.byteLength>262144)throw Error('Candidate-impact view exceeds 256 KiB.');
   const digest=await reviewSha256(bytes);if(digest!==candidateRef.sha256)throw Error('Candidate-impact checksum mismatch.');
   const candidateImpact=JSON.parse(new TextDecoder().decode(bytes));
   if(candidateImpact.schema!=='objective-candidate-impact-v1'||candidateImpact.baseline_commit!==packet.baseline_commit||candidateImpact.head_commit!==packet.head_commit||candidateImpact.governance_version!==packet.governed_objectives.version_id)throw Error('Candidate-impact identity mismatch.');
   packet.governed_objectives.candidate_impact=candidateImpact;
  }
  const workflowRef=packet.governed_objectives?.customer_workflow_artifact;
  if(workflowRef){
   const url=new URL(workflowRef.url,artifactURL);
   if(!trustedArtifactURL(url))throw Error('Use a trusted customer-workflow view.');
   const result=await fetch(url,{cache:'no-store'});if(!result.ok)throw Error('Customer-workflow view unavailable.');
   const bytes=await result.arrayBuffer();if(bytes.byteLength>262144)throw Error('Customer-workflow view exceeds 256 KiB.');
   const digest=await reviewSha256(bytes);if(digest!==workflowRef.sha256)throw Error('Customer-workflow checksum mismatch.');
   const workflows=JSON.parse(new TextDecoder().decode(bytes));
   const candidateImpact=packet.governed_objectives.candidate_impact;
   if(workflows.schema!=='customer-workflow-impact-v1'||workflows.baseline_commit!==packet.baseline_commit||workflows.head_commit!==packet.head_commit||!candidateImpact||workflows.ontology_sha256!==candidateImpact.ontology_sha256)throw Error('Customer-workflow identity mismatch.');
   packet.governed_objectives.customer_workflows=workflows;
  }
  const flows=packet.flows,byId=new Map(flows.map(f=>[f.id,f]));
  window.intentGovernanceAvailable=Boolean(packet.governed_objectives);
  const json=value=>esc(JSON.stringify(customerEvidence(value),null,2));
  const human=value=>({context_only_cpg_drift:'context-only change'}[value]||String(value||'Not supplied').replaceAll('_',' ').replace(/\bcpg\b/gi,'code structure'));
  const methodLabel=f=>(f.method||f.title||f.id).split('::').pop().replace(/:[^:]*$/,'').split('.').pop();
  const conceptLabel=f=>f.concepts.find(c=>String(c.unit_id).startsWith('flow_holon:'))?.concept||methodLabel(f);
  const architectureGap=f=>{
   if(f.change_kind!=='boundary_evidence_gap'||f.title!=='FTGO-DEPLOYABLE-ARCHITECTURE')return null;
   const values=f.observed_deltas.flatMap(delta=>Object.values(delta.fields||{}).flatMap(value=>value?.after||[]));
   const text=values.find(value=>String(value).startsWith('candidate_deployable_boundary '));
   if(!text)return null;
   try{return JSON.parse(String(text).slice(String(text).indexOf('{')));}catch{return null;}
  };
  const architectureRoots=flows.map(architectureGap).filter(Boolean).map(item=>item.root.replace(/\/$/,'')+'/');
  const deltaLines=f=>{const before=[],after=[];for(const delta of f.observed_deltas){if(delta.kind==='learned_form_occurrence'&&delta.fields?.form_id?.before&&delta.fields.form_id.after===null){before.push('recognized_form');after.push('no_matching_form');}for(const [name,value] of Object.entries(delta.fields||{})){
   if(['contract_status','missing','state','value','concept','fact'].includes(name)){
    before.push(`${delta.kind}.${name} = ${JSON.stringify(value.before)}`);after.push(`${delta.kind}.${name} = ${JSON.stringify(value.after)}`);
   }
  }}if(!before.length&&f.change_kind==='added'){before.push('method absent');after.push('method '+methodLabel(f)+' added; behavior not yet established');}return before.length?{before:before.join('\n'),after:after.join('\n')}:{};};
  const details=f=>`<p>Source anchor: ${esc(f.source?.status||'unavailable')} ${f.source?.line?' · line '+esc(f.source.line):''}<br>${esc(f.source?.reason||'')}</p><h4>Concept evidence</h4>${f.concepts.map(c=>`<p><code>${esc(c.concept||c.unit_id)}</code> · ${esc(human(c.status))}</p>`).join('')}<h4>Potential impact</h4>${f.potential_impact.map(x=>`<p>${esc(x.concept||x.id)} · ${esc(x.reason)}</p>`).join('')||'<p>None reported.</p>'}<h4>Published findings</h4>${f.findings.map(x=>`<p><b>${esc(human(x.domain))} · ${esc(human(x.severity))}</b><br>${esc(human(x.reason))}</p>`).join('')||'<p>None reported.</p>'}<details><summary>${f.observed_deltas.some(d=>d.omitted_fields?.length)?'Compact structural delta (source indexes omitted)':'Full observed structural delta and judgment'}</summary><pre>${json({observed_deltas:f.observed_deltas,behavior_judgment:f.behavior_judgment})}</pre></details>`;
  let entries=flows.map(f=>{
   if(f.change_kind==='file_changed_without_method_delta'&&architectureRoots.some(root=>String(f.source?.file||'').startsWith(root)))return null;
   const judgment=f.behavior_judgment||{};
   const contract=f.change_kind==='business_contract';
   const boundary=['governed_boundary_change','boundary_evidence_gap'].includes(f.change_kind),benchmarkMiss=f.change_kind==='benchmark_miss';
   const architecture=architectureGap(f);
   const action=contract&&f.findings.length||judgment.status==='supported_behavior_change'||judgment.status==='supported_boundary_violation';
   const clear=(judgment.choice==='equivalent'||judgment.status==='supported_boundary_preservation')&&!f.findings.length;
   const observed=!boundary&&!contract&&!f.findings.length&&!judgment.status;
   const unresolved=f.findings.some(x=>x.reason==='unresolved_call');
   const unchecked=f.findings.some(x=>x.reason==='added_method_contract_unchecked');
   const contractViolation=contract&&f.findings.some(x=>x.reason==='business_contract_violated');
   const displayTitle=benchmarkMiss?'Selector missed an expected governed change':architecture?`New intent detected`:boundary?`Governed boundary · ${f.title}`:contractViolation?'Accepted business intent no longer satisfied':judgment.status==='supported_behavior_change'?`Behavior differs from baseline · ${methodLabel(f)}`:f.change_kind==='context_changed'&&unresolved?`Call target unresolved · ${methodLabel(f)}`:f.change_kind==='added'&&unchecked?`New method needs behavior review · ${methodLabel(f)}`:`${human(f.change_kind)} · ${methodLabel(f)}`;
   const why=benchmarkMiss?'The labelled evaluation expected a governed boundary change, but deterministic selection emitted no boundary question.':architecture?`This revision introduces ${architecture.root} through ${architecture.descriptor} with ${architecture.changed_files} changed files. The accepted baseline has no deployable-architecture anchor for that root, so intent preservation cannot be judged yet.`:boundary?(judgment.status==='supported_boundary_violation'?'The recorded boundary judgment supports a violation.':judgment.status==='supported_boundary_preservation'?'The recorded boundary judgment supports preservation.':'The governed fact changed, but no completed boundary judgment was supplied.'):contract?f.title:f.change_kind==='context_changed'&&unresolved?'A call target could not be resolved in the changed analysis context. A source edit to this method is not established.':unchecked?'The added method has not been checked against its behavior contract.':judgment.status==='supported_behavior_change'?'The recorded behavior comparison supports a change from baseline.':clear?'The recorded behavior comparison supports equivalence.':'The available analysis does not establish equivalent behavior.';
   const category=benchmarkMiss?'Evidence coverage':boundary||contract?'Intent differences':f.findings.some(x=>['dependency_resolution','extraction_context'].includes(x.domain))&&!action?'Evidence coverage':'Intent differences';
   const source=architecture?{label:architecture.descriptor,file:architecture.descriptor,symbol:architecture.root,qualification:'Build descriptor for the newly detected deployable root.'}:contractViolation?{label:'Governed intent',symbol:methodLabel(f),qualification:f.source?.reason||'The contract witness has no verified source line.'}:{label:f.source?.file||'Source anchor not supplied',file:f.source?.file,symbol:f.source?.file?methodLabel(f):null,qualification:f.source?.line?'Recorded anchor line '+f.source.line:f.source?.reason||'Exact source lines not supplied.'};
   const delta=architecture?{before:`No accepted deployable boundary named ${architecture.root}`,after:`${architecture.root} via ${architecture.descriptor} · ${architecture.changed_files} changed files`}:deltaLines(f);
   const nextStep=architecture?`Establish the governance boundary: confirm this new deployable intent, assign its owner, and define how ${architecture.root} relates to the accepted architecture.`:contractViolation?'Restore the accepted contract, or propose the changed behavior for owner review.':clear?'No response required for this behavior comparison.':contract?'Inspect the affected contract and source evidence with its owner.':action?'Review the behavior change and the connected evidence.':'Supply or verify the missing context before making a decision.';
   const entryDetails=architecture?`<p><b>Detected boundary:</b> ${esc(architecture.root)}</p><p><b>Build descriptor:</b> <code>${esc(architecture.descriptor)}</code></p><p><b>Changed files:</b> ${esc(architecture.changed_files)}</p><p><b>Why analysis stopped:</b> The analysis can evaluate supplied boundary evidence, but it cannot invent or approve a new architecture boundary. An owner disposition must establish how this root relates to the accepted baseline.</p>${details(f)}`:details(f);
   const intentVisual=undefined;
   return {id:f.id,region:f.id,category,statusLabel:contractViolation?'Intent changed':observed?'Observed':undefined,status:observed?'not_applicable':clear?'clear':action?'action':'gap',owner:'Owner not supplied',concept:architecture?'FTGO deployable architecture':conceptLabel(f),title:displayTitle,source,...delta,intentVisual,summary:observed?'The analysis recorded this source change but did not detect a review finding for it.':why,nextStep:observed?'No response required. This observation remains available in the run evidence.':nextStep,details:entryDetails,checks:[...new Set(['Intent differences',...(contractViolation?['Governance policy']:[]),...f.findings.map(x=>human(x.domain))])]};
  }).filter(Boolean);
  for(const entry of entries){const flow=byId.get(entry.id);entry.intentArea=flow?.title?.startsWith('FTGO-')?flow.title:flow?.change_kind==='business_contract'?'Governed contracts':'Supporting evidence';}
  // An unmapped addition needs a scope decision, not an invented violation.
  for(const entry of entries){
   const flow=byId.get(entry.id);
   if(!flow?.findings.some(f=>f.reason==='governance_constrained_region_unmapped'))continue;
   const testAnchor=/\/src\/(?:test|integration-test)\//.test(flow.source?.file||'');
   if(testAnchor){
    entry.title='Test evidence needs a governance connection';
    entry.statusLabel='Production behavior link missing';
    entry.summary='The recorded anchor is test code. This does not establish new production intent or a new service dependency.';
    entry.nextStep='Connect these tests to the production behavior they exercise before deciding its governance scope.';
    delete entry.before;delete entry.after;
    continue;
   }
   const facts=flow.observed_deltas.flatMap(d=>d.fields?.fact?.after||[]);
   const descriptions=facts.map(text=>{
    const start=String(text).indexOf('{');if(start<0)return null;
    let slots;try{slots=JSON.parse(text.slice(start));}catch{return null;}
    const form=text.slice(0,start).trim();
    if(form==='http_endpoint')return `Exposes ${slots.method} ${slots.path}.`;
    if(form==='state_transition')return `Records a transition accepting ${(slots.allowed||[]).join(' or ')||'an unspecified state'}.`;
    if(form==='boundary_call')return `Includes a call to ${slots.receiver}.${slots.operation}().`;
    return null;
   }).filter(Boolean);
   entry.governanceDecision=true;
   entry.status='gap';entry.statusLabel='Governance decision needed';
   entry.title='New intent detected';
   entry.summary=[...new Set(descriptions)].slice(0,2).join(' ')+' This changed behavior has no established governance mapping. It may extend existing intent or need a new boundary; the missing mapping alone is not a violation.';
   entry.nextStep='Decide whether to apply existing governance, establish new governance, or explicitly leave this scope ungoverned. Existing violations remain open.';
   entry.details='<p><b>Decision scope:</b> '+esc(flow.method||flow.source?.file)+' · '+esc(flow.title)+'</p><p>This is a local proposal for owner review. It does not approve a baseline change or exempt other behavior. Grouped evidence may include supporting tests; no production dependency is inferred from test calls.</p>'+entry.details;
   delete entry.before;delete entry.after;
  }
  const unresolvedFlows=flows.filter(f=>f.change_kind==='context_changed'&&f.findings.some(x=>x.reason==='unresolved_call'));
  if(unresolvedFlows.length>1){
   const ids=new Set(unresolvedFlows.map(f=>f.id));
   entries=entries.filter(entry=>!ids.has(entry.id));
   entries.push({id:'intent-unresolved-call-group',region:'intent-evidence',category:'Intent differences',status:'gap',statusLabel:'Evidence incomplete',owner:'Owner not supplied',concept:'Supporting call evidence',title:`${unresolvedFlows.length} analysis-context methods have unresolved calls`,source:{label:`${unresolvedFlows.length} affected methods`,qualification:'These are context-only extraction gaps; no direct source edit is claimed.'},summary:'The extractor could not resolve calls in these context methods. Their causal relationship to the changed intent is not established.',nextStep:'Supply the missing dependency context or rerun extraction with these call targets available.',details:`<p><b>Affected methods</b></p><ul>${unresolvedFlows.map(f=>`<li><code>${esc(f.source?.file||'Source unavailable')} · ${esc(methodLabel(f))}</code></li>`).join('')}</ul><p>No additional behavior change is inferred from these context-only gaps.</p>`,checks:['Intent differences','Evidence coverage']});
  }
  if(packet.intent_stories?.length){
   const replaced=new Set(packet.intent_stories.flatMap(s=>s.related_flow_ids));
   entries=entries.filter(e=>!replaced.has(e.id));
   entries.unshift(...packet.intent_stories.map(story=>intentStoryEntry({...story,objective:story.kind==='state_transition'?'':story.objective,contract_findings:[]})));
  }
  entries=entries.filter(e=>byId.get(e.id)?.change_kind!=='business_contract');
  if(packet.intent_impact){
   // Concept tiles summarise governed boundary changes and no-intent flows; drop their per-fact entries
   // everywhere (board, sidebar, counts). Ungoverned code changes and evidence entries stay.
   const summarised=new Set(['governed_boundary_change','file_changed_without_method_delta','context_changed']);
   entries=entries.filter(e=>{const f=byId.get(e.id);if(String(e.id).startsWith('boundary-impact:'))return false;
    if(!f)return true;return !(summarised.has(f.change_kind)||(f.change_kind==='boundary_evidence_gap'&&f.title!=='FTGO-DEPLOYABLE-ARCHITECTURE'));});
  }
  const improperTestsEntries=()=>{
   const check=(liveDoc?.checks||liveDoc?.stages||[]).find(row=>row.id==='improper_tests');
   if(!check)return [];
   const kinds={
    weak:{status:'action',title:'Test may pass even if the behavior breaks',summary:'The improper-tests check found that this changed test no longer constrains the behavior it claims to cover.',next:'Restore an assertion on the real result, or remove the claim.'},
    deleted:{status:'action',title:'Test method was removed',summary:'A test method present on the base revision is gone. A removal is a review prompt, not an accusation.',next:'Confirm the covered behavior was also removed or is tested elsewhere.'},
    inconclusive:{status:'not_applicable',statusLabel:'Unavailable',title:'Changed test could not be read',summary:'No complete source was supplied for this test file, so the check failed closed instead of reporting a pass.',next:'Supply the changed test source, then rerun this revision.'}
   };
   return (check.findings||check.output?.public_findings||[]).map((finding,index)=>{
    const kind=kinds[finding.kind]||kinds.weak;
    return {
     id:`improper-tests-${finding.kind||'weak'}-${finding.unit||index}`,region:'improper-tests',category:'Improper tests',
     status:kind.status,...(kind.statusLabel?{statusLabel:kind.statusLabel}:{}),owner:finding.owner||'Owner not supplied',
     concept:finding.signals||(finding.judge_score?'Flagged by test analysis':'Changed test'),title:kind.title,
     source:{label:finding.file||'Source anchor not supplied',file:finding.file,symbol:String(finding.unit||'').split('.').pop()||null,qualification:finding.line?`Recorded anchor line ${finding.line}`:'Exact source line not supplied.'},
     summary:kind.summary,nextStep:kind.next,codeHtml:testAnchorPlaceholder(finding),
     details:`${finding.signals?`<p><b>Signals:</b> ${esc(finding.signals)}</p>`:''}<p><b>Judge:</b> ${finding.judge_score?'Test analysis completed':'Not used'} · <b>Basis:</b> ${esc(finding.basis||'Not supplied')}</p><p>Static scan of the changed test method${finding.judge_score?', with a test-quality analysis':''}. No source text is published in the status record.</p>`,
     checks:['Improper tests']
    };
   });
  };
  const testAnchorPlaceholder=f=>f.region?`<div class="test-anchor" data-anchor="${esc(JSON.stringify({file:f.file,region:f.region,helper:f.helper_region||'',line:f.anchor_line||'',mode:f.anchor_mode,confidence:f.anchor_confidence,reason:f.reason_id||'',comment:f.comment||''}))}" style="margin:8px 0;border:1px solid var(--line);border-radius:6px;overflow:hidden;font-size:12px"><p class="note" style="margin:6px 10px">Loading the changed lines…</p></div>`:'';
  const renderTestAnchors=async root=>{
   const nodes=[...root.querySelectorAll('.test-anchor[data-anchor]')];if(!nodes.length)return;
   let patch;try{patch=await loadPatch();}catch(error){nodes.forEach(n=>n.innerHTML=`<p class="note" style="margin:6px 10px">${esc(error.message)}</p>`);return;}
   for(const node of nodes){
    const a=JSON.parse(node.dataset.anchor);const span=t=>{const [x,y]=String(t).split('-').map(Number);return n=>n>=x&&n<=y;};
    const inRegion=span(a.region),inHelper=a.helper?span(a.helper):()=>false;
    const section=patch?.split(/(?=^diff --git )/m).find(s=>s.split('\n').includes('+++ b/'+a.file));
    const rows=[];let n=0,pendingDel=[];
    for(const raw of (section||'').split('\n')){
     const h=raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);if(h){n=Number(h[1]);pendingDel=[];continue;}
     if(!n||raw.startsWith('+++')||raw.startsWith('---'))continue;
     if(raw.startsWith('-')){pendingDel.push(raw.slice(1));continue;}
     if(!(raw.startsWith('+')||raw.startsWith(' ')))continue;
     const keep=inRegion(n)||inHelper(n);
     if(keep&&pendingDel.length)pendingDel.forEach(t=>rows.push({kind:'del',text:t}));
     pendingDel=[];
     if(keep)rows.push({kind:raw[0]==='+'?'add':'ctx',n,text:raw.slice(1)});
     n++;
    }
    const band={high:'high',medium:'medium',low:'low'}[a.confidence]||'low';
    const note=`<tr><td></td><td style="white-space:normal;padding:6px 10px 10px"><div class="test-anchor-note" style="position:sticky;left:10px;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:8px 10px;background:var(--panel);font-family:inherit;font-size:13px"><b>Improper tests</b> <span class="note">· Located by the system</span><p style="margin:4px 0 0">${esc(a.comment||'')}</p></div></td></tr>`;
    let html='',noted=false,prev=null;
    for(const r of rows){
     if(r.n&&prev&&r.n>prev+1)html+=`<tr><td></td><td class="note" style="padding:2px 10px">⋯</td></tr>`;
     if(r.kind==='del'&&a.mode==='removed'&&!noted){/* note follows the deleted block */}
     const bg=r.kind==='del'?'var(--red-bg,#fde8e8)':String(r.n)===a.line?'var(--amber-bg,#fff3c4)':'transparent';
     html+=`<tr style="background:${bg}"><td style="padding:0 8px;text-align:right;color:var(--muted);user-select:none">${r.kind==='del'?'−':r.n}</td><td style="padding:0 10px;white-space:pre;font-family:ui-monospace,monospace">${esc(r.text)||'&nbsp;'}</td></tr>`;
     if(!noted&&((a.mode==='line'&&String(r.n)===a.line)))  {html+=note;noted=true;}
     if(r.n)prev=r.n;
     if(!noted&&a.mode==='removed'&&r.kind==='del'&&(rows[rows.indexOf(r)+1]||{}).kind!=='del'){html+=note;noted=true;}
    }
    if(!noted)html=note+html;
    const fit=()=>node.querySelectorAll('.test-anchor-note').forEach(el=>el.style.width=Math.max(160,node.clientWidth-60)+'px');
    node.innerHTML=rows.length?`<div style="overflow-x:auto;background:var(--bg)"><table style="border-collapse:collapse;width:100%">${html}</table></div>`:`<table style="width:100%">${note}</table><p class="note" style="margin:6px 10px">Lines ${esc(a.region)} are not part of this diff.</p>`;
    fit();
   }
  };
  const codingStandardsEntries=()=>{
   const check=(liveDoc?.checks||liveDoc?.stages||[]).find(row=>row.id==='coding_standards');
   if(!check)return [];
   const active=check.findings||check.output?.public_findings||[];
   const watch=check.watch_only_findings||check.output?.public_watch_only||[];
   const findingEntry=(finding,index,watchOnly)=>{const label=value=>String(value||'').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
    const collection=finding.category_parent?`${label(finding.category_parent)} · ${label(finding.category)}`:label(finding.category||'Repository standards');
    return {
    id:`coding-standards-${watchOnly?'watch':'finding'}-${finding.rule_id||index}-${finding.file||index}`,
    region:'coding-standards',category:'Coding standards',status:watchOnly||finding.band!=='finding'?'clear':'action',
    owner:finding.owner||'Owner not supplied',concept:`${collection} · ${finding.rule_id||'Repository standard'}`,
    title:finding.name||'Coding standard result',
    source:{label:finding.file||'Source anchor not supplied',file:finding.file,symbol:finding.unit||null,qualification:finding.line?`Recorded anchor line ${finding.line}`:'Exact source line not supplied.'},
    summary:watchOnly?'This watch-only result is recorded for evaluation and does not request a response.':finding.band==='finding'?'The standards check reported this changed unit against an active repository standard.':'The standards check published this result for information.',
    nextStep:watchOnly||finding.band!=='finding'?'No response required.':finding.guidance||'Review the changed unit against the governed standard.',
    details:`<p><b>Standards collection:</b> ${esc(collection)}</p><p><b>Rule:</b> ${esc(finding.rule_id||'Not supplied')} v${esc(finding.rule_version||'Not supplied')}</p><p><b>Band:</b> ${esc(finding.band||'Not supplied')} · <b>Severity:</b> ${esc(finding.severity||'Not supplied')}</p>${finding.guidance?`<p><b>Guidance:</b> ${esc(finding.guidance)}</p>`:''}`,
    checks:['Coding standards']
   };};
   const published=[...active.map((finding,index)=>findingEntry(finding,index,false)),...watch.map((finding,index)=>findingEntry(finding,index,true))];
   if(published.length)return published;
   if(check.state==='error')return [{
    id:'coding-standards-operational-gap',region:'coding-standards',category:'Coding standards',status:'not_applicable',statusLabel:'Unavailable',owner:'Platform owner not supplied',concept:'Standards unavailable · no code violation established',
    title:'Coding standards are not available yet',source:{label:'Pipeline configuration',qualification:'No standards package was available; no source-code violation was established.'},
    summary:'The check runtime is missing its governed standards bundle. It evaluated zero repository standards, so this result cannot say whether the changed code complies.',
    nextStep:'Add Clinton’s versioned standards package to the check runtime, then rerun this revision.',
    details:`<p><b>Detected:</b> ${esc(check.detail||'The coding-standards check could not complete.')}</p><p><b>Why:</b> The native check requires <code>standards/BUNDLE.json</code>, the FTGO ruleset manifest, and its rule files. The runtime could not load that package.</p><p><b>Effect:</b> No coding-standard violation was established, but the standards evidence required by the governance decision is unavailable.</p><p><b>Resolution:</b> Build the check runtime from the governed CodeIntent standards directory. Preserve the source repository and commit recorded in <code>BUNDLE.json</code>, then rerun the same revision.</p>`,checks:['Coding standards']
   }];
   if(check.state==='passed'&&/^No standards adopted\b/.test(check.detail||''))return [{
    id:'coding-standards-not-configured',region:'coding-standards',category:'Coding standards',status:'not_applicable',owner:'Owner not supplied',concept:'Repository standards',
    title:'No coding standards adopted',source:{label:'Governed standards catalog',qualification:'The valid standards bundle contains no ruleset for this repository.'},
    summary:'The governed standards catalog has no ruleset assigned to this repository, so the check had nothing to evaluate.',nextStep:'No response required. Adopt a governed ruleset if this repository should be checked.',
    details:`<p>${esc(check.detail)}</p><p>This state requires a valid bundle. A missing or invalid bundle is reported separately as an evidence gap.</p>`,checks:['Coding standards']
   }];
   if(check.state==='passed')return [{
    id:'coding-standards-clear',region:'coding-standards',category:'Coding standards',status:'clear',owner:'Owner not supplied',concept:'Standards evaluation',
    title:'Coding standards check completed',source:{label:'Changed source supplied to the check',qualification:'The status document supplied no source-linked findings.'},
    summary:check.detail||'The check completed without a published finding.',nextStep:'No response required.',
    details:`<p>${esc(check.detail||'No coding-standards findings were published.')}</p>`,checks:['Coding standards']
   }];
   return [];
  };
  let patchPromise;
  const loadPatch=()=>patchPromise||(patchPromise=(async()=>{
   if(typeof packet.source_diff?.content==='string'){
    const raw=new TextEncoder().encode(packet.source_diff.content);
    if(raw.byteLength>262144)throw Error('Source patch exceeds 256 KiB.');
    if(!packet.source_diff.sha256||await reviewSha256(raw)!==packet.source_diff.sha256)throw Error('Source patch digest differs from the generated artifact.');
    return packet.source_diff.content;
   }
   if(!packet.source_diff?.url)throw Error(packet.source_diff?.status==='omitted_too_large'?'Source patch exceeds the review size limit.':'No source patch was supplied for this run. Rerun after updating the pipeline.');
   const url=new URL(packet.source_diff.url,artifactURL);if(!trustedArtifactURL(url))throw Error('Source artifact must use a trusted origin.');
   const r=await fetch(url);if(!r.ok)throw Error('Source patch unavailable: '+r.status);
   const raw=await r.arrayBuffer();if(raw.byteLength>262144)throw Error('Source patch exceeds 256 KiB.');
   if(packet.source_diff.sha256){const actual=await reviewSha256(raw);if(actual!==packet.source_diff.sha256)throw Error('Source patch digest differs from the generated artifact.');}
   return new TextDecoder().decode(raw);
  })());
  const sourceDetails=async entry=>{
   const patch=await loadPatch();
   const section=patch?.split(/(?=^diff --git )/m).find(s=>s.split('\n').some(line=>line==='+++ b/'+entry.source.file||line==='--- a/'+entry.source.file));
   return section?{patch:section,message:'Recorded source patch for this baseline and candidate. This is file-level evidence; no exact method-to-hunk match is claimed.'}:{message:entry.source.file?'No source patch for this file was supplied. This may be a context-only change.':'This finding has no source file anchor.'};
  };
  for(const node of packet.graph?.nodes||[]){if(node.kind==='change'){const f=byId.get(node.flow_id);if(f)node.label=conceptLabel(f);}else if(node.kind==='source')node.label=String(node.label).split('/').pop();}
  if(packet.governance_review){
   const identity=packet.governance_review.identity;
   if(!identity||identity.baseline_commit!==packet.baseline_commit||identity.head_commit!==packet.head_commit||(packet.repository&&identity.repository!==packet.repository))throw Error('Grounded review differs from this revision.');
  }
  window.groundedReviewData=packet.governance_review;
  entries.push(...groundedReviewEntries(packet.governance_review,qs.get('run_id')));
  const localRun=qs.get('local')==='1';
  const options={scope:'generated-packet:'+String(qs.get('run_id')||packet.head_commit),lanes:true,entries,title:'Review findings',description:'Navigate check findings, intent changes, and source evidence.',baseline:packet.baseline_commit,head:packet.head_commit,freshness:LIVE?(localRun?'Pinned PR head · attached to this local run':'Pinned PR head · published by the deployed pipeline'):'Replay snapshot · current head not connected',qualification:LIVE?(localRun?'Real backend artifacts and Lambda status from a local PR simulation. GitHub freshness and merge enforcement are not supplied.':'Digest-verified artifact from the deployed Lambda status API for this repository and head.'):'Generated from pipeline output. Current repository head and CI enforcement are not supplied.',sourceDetails};
  const readableModel=window.codeIntentReviewModel?codeIntentReviewModel(packet,objectiveSummary,entries,liveDoc?.checks||liveDoc?.stages||[]):null;
  document.querySelector('.layout').classList.add('packet-layout');
  document.querySelector('.demo').textContent=LIVE?(localRun?'LOCAL PR PIPELINE · Real backend artifacts and Lambda handlers. Responses are session-only; no GitHub publication or merge enforcement.':'LIVE CODEINTENT REVIEW · Digest-verified artifacts from the deployed pipeline. Responses are session-only.'):'GENERATED PIPELINE DATA · Recorded FTGO replay. Responses are session-only; missing check results stay explicit.';
  document.querySelector('h1').textContent='FTGO intent review'+(LIVE_PR?' · PR #'+LIVE_PR:'');
  document.querySelector('.meta').textContent=`${String(packet.baseline_commit||'Unknown baseline').slice(0,12)} → ${String(packet.head_commit||'Unknown candidate').slice(0,12)}`;
  const outcome=LIVE?({VIOLATION:'Blocked',UNKNOWN:'Incomplete',PASS:'Ready to merge'}[liveDoc?.verdict]||'Analysis in progress'):entries.some(e=>e.status==='action')?'Action needed':entries.some(e=>e.status==='gap')?'Assessment incomplete':'No review action identified';
  document.querySelector('.right').innerHTML=`<div class="card packet-outcome"><h3>Outcome</h3><b id="packet-run-state">${esc(outcome)}</b><p>${LIVE?(localRun?'Same decision as the Governance decision summary. No merge enforcement in this local run.':'Same decision and exact head identity as the deployed governance check.'):'Recorded analysis outcome. CI enforcement status was not supplied.'}</p><details><summary>Run provenance</summary><p>Backend result: ${esc(packet.backend_verdict||'Unknown')}</p><pre>${json(packet.provenance)}</pre><p>${esc(typeof packet.qualification==='string'?packet.qualification:JSON.stringify(packet.qualification))}</p></details></div>`;
  document.querySelector('footer').textContent='Generated review presentation · responses remain session-only';
  const detailNotice=detailWarnings.map(message=>`<p class="empty">${esc(message)}</p>`).join('');
  let ledgerHistory=null,ledgerHistoryLoading=false,ledgerHistoryError='';
  let ledgerHistoryTruncated=false;
  const historyRunId=()=>window.resolveHistoryRunId?resolveHistoryRunId(packet,qs.get('run_id'),liveDoc):packet.simulation?.run_id||qs.get('run_id')||'';
  const renderLedgerHistory=()=>{content.innerHTML=detailNotice+(window.ledgerHistoryMarkup?ledgerHistoryMarkup(ledgerHistory,ledgerHistoryLoading,ledgerHistoryError,ledgerHistoryTruncated):'<p class="empty">Governance history view unavailable.</p>');};
  const fetchLedgerHistory=async(afterApp=0,afterRun=0,afterChange=0,append=false)=>{
   if(ledgerHistoryLoading)return;
   const runId=historyRunId();
   if(!LIVE||!runId){ledgerHistoryError='No verified governance run is linked to this review.';renderLedgerHistory();return;}
   ledgerHistoryLoading=true;ledgerHistoryError='';if(!append){ledgerHistory=null;ledgerHistoryTruncated=false;renderLedgerHistory();}
   try{
    let url;
    const params=historyRequestParams({identity:{application:packet.repository,head_commit:packet.head_commit},runId,
     after:{app:afterApp,run:afterRun,change:afterChange},previous:ledgerHistory,append,local:qs.get('local')==='1'});
    if(qs.get('local')==='1'){
     url=new URL('/ledger-history',location.origin);url.search=new URLSearchParams(params);
    }else{
     const base=/\/status$/.test(LIVE_API)?LIVE_API:LIVE_API+'/status';
     url=new URL(base,location.href);url.search=new URLSearchParams(params);
    }
    const page=await fetchLedgerHistoryPage(fetch,url,{run_id:runId,head_commit:packet.head_commit,
     baseline_commit:packet.baseline_commit,application:packet.repository});
    if(append&&ledgerHistory){
     for(const key of ['application_governance','current_pr_activity','linked_change_activity'])
      ledgerHistoryTruncated=ledgerHistoryTruncated||new Set([...(ledgerHistory[key]?.events||[]),...(page[key]?.events||[])].map(event=>event.event_id)).size>100;
     ledgerHistory=mergeLedgerHistory(ledgerHistory,page);
    }else ledgerHistory=page;
   }catch(error){ledgerHistoryError=error.message;}
   finally{ledgerHistoryLoading=false;if(view==='intent')renderLedgerHistory();}
  };
  render=function(){
   document.querySelector('#flow-panel').classList.add('hidden');content.classList.remove('hidden');
   const layout=document.querySelector('.layout');layout.classList.toggle('flow-layout',view==='flow');layout.classList.toggle('checks-layout',view==='checks'||view==='governance'||view==='intent');layout.classList.toggle('readable-review-layout',view==='review'&&Boolean(readableModel));
   document.querySelector('.right').classList.toggle('hidden',view==='flow'||view==='review'&&Boolean(readableModel));
   const sidebar=document.querySelector('.sidebar');sidebar.classList.toggle('hidden',view!=='review'||Boolean(readableModel));
   sidebar.innerHTML=`<p class="eyebrow">Change walkthrough</p><button class="side-item ${file==='all'?'selected':''}" data-file="all">Overview (${entries.length})</button>${entries.map(e=>`<button class="side-item ${file===e.region?'selected':''}" data-file="${esc(e.region)}" style="overflow-wrap:anywhere">${esc(e.title)}<small>${esc(e.source.label?.split('/').pop())}</small></button>`).join('')}`;
   document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
   document.querySelector('#nav-count').textContent=readableModel?[...readableModel.changes,...readableModel.constraints].length:entries.filter(e=>e.status==='action'&&!reviewState(options.scope).responses.has(e.id)).length+(window.reviewActionCounts?reviewActionCounts(liveDoc).total:0);
   document.querySelector('[data-view="checks"] .count').textContent=LIVE?(localRun?'local':'live'):'packet';
   if(LIVE)document.querySelector('#packet-run-state').textContent=({VIOLATION:'Blocked',UNKNOWN:'Incomplete',PASS:'Ready to merge'}[liveDoc?.verdict]||'Analysis in progress');
   if(view==='checks')content.innerHTML=detailNotice+(LIVE&&liveDoc?.state!=='completed'?'':objectiveSummaryMarkup(objectiveSummary,packet))+(LIVE?liveChecks():`<article class="card"><div class="body"><h2>Checks & review prompts</h2><p>This artifact supplies intent episodes, not the CI check manifest. Missing check results are not passes. Episode findings are available in Review.</p>${gates.map(g=>`<div class="gate"><span class="icon warn">◉</span><div style="flex:1"><strong>${esc(g[1])}</strong><small>${esc(g[2])}<br>Dependency: ${esc(g[3]||'none')}</small></div><span class="pill">Not supplied</span></div>`).join('')}</div></article>`);
   else if(view==='governance'){if(window.requestedGovernedWorkflow){reviewState(options.scope).governedArea=window.requestedGovernedWorkflow;window.requestedGovernedWorkflow=null;}content.innerHTML=detailNotice+governedObjectivesMarkup(packet,options);if(window.renderGovernedMethodSource)renderGovernedMethodSource(content,loadPatch);}
   else if(view==='intent'){renderLedgerHistory();if(!ledgerHistory&&!ledgerHistoryLoading&&!ledgerHistoryError)fetchLedgerHistory();}
   else if(view==='flow')content.innerHTML=detailNotice+`<h2>Intent Flow</h2><p>Source → changed intent → potential impact. Select a change node to inspect its evidence.</p>${intentGraphMarkup(customerGraph(packet,focusedObjective?focusedGraph():packet.graph||{nodes:[],edges:[]}))}${groundedConnectionsMarkup(packet.governance_review)}`;
   else if(readableModel)renderCodeIntentReview(content,readableModel,{scope:options.scope,render});
   else {const impact=packet.intent_impact&&window.intentImpactSection?intentImpactSection(packet,liveDoc):'';const R=window;const decision=R.decisionSection?decisionSection(liveDoc,packet):'';const actions=R.reviewActionCounts?reviewActionCounts(liveDoc):{total:0,per:{}};const checkBodies=R.improperTestsSection?{severity:severitySection(liveDoc),coding_standards:standardsSection(liveDoc),improper_tests:improperTestsSection(liveDoc),rule_impact:ruleImpactSection(liveDoc,packet),connected_evidence:connectedSection(liveDoc,packet),governance_decision:decision?'<p class="note">Summarized at the top of this page. <a href="#rt-decision" data-outline-target="rt-decision">Go to the decision</a></p>':''}:{};content.innerHTML=detailWarnings.map(message=>`<p class="empty">${esc(message)}</p>`).join('')+decision+objectiveRejectedMarkup(objectiveSummary)+reviewBoard({...options,intentImpactHtml:impact,checkBodies,decisionShown:Boolean(decision),extraNeeds:actions.total,checkActions:actions.per,checks:liveDoc?.checks||liveDoc?.stages,entries:[...entries,...codingStandardsEntries(),...improperTestsEntries()],region:file});attachObjectiveFeedback(content,objectiveSummary);renderTestAnchors(content);renderIntentSources(content,options);if(window.renderIntentImpact)renderIntentImpact(content,loadPatch);}
   if(view==='flow')drawIntentGraph();
  };
  function focusedGraph(){
   const card=objectiveSummary.cards.find(c=>c.objective.id===focusedObjective),graph=packet.graph||{nodes:[],edges:[]};
   const ids=new Set(card?.graph.nodes||[]),nodes=graph.nodes.filter(n=>ids.has(n.id));
   for(const id of ids){if(nodes.some(n=>n.id===id))continue;const fact=card.evidence[id];if(fact)nodes.push({id,kind:'scope',label:fact.owner||fact.method||id,scope_kind:'Recorded normalized fact context'});}
   const known=new Set(nodes.map(n=>n.id));return {nodes,edges:(card?.graph.edges||[]).filter(e=>known.has(e.from)&&known.has(e.to))};
  }
  document.addEventListener('click',e=>{
   const more=e.target.closest('[data-ledger-more]');if(more){more.disabled=true;fetchLedgerHistory(Number(more.dataset.afterApp),Number(more.dataset.afterRun),Number(more.dataset.afterChange),true);return;}
   if(e.target.closest('[data-ledger-retry]')){ledgerHistoryError='';fetchLedgerHistory();return;}
   const finding=e.target.closest('[data-summary-finding]');if(finding){
    e.preventDefault();const target=finding.dataset.summaryFinding;view='review';file='all';
    for(const scope of [options.scope,options.scope+':assistant'])Object.assign(reviewState(scope),{filter:'all',check:'all',owner:'all'});
    render();const tile=target.startsWith('finding:')?[...content.querySelectorAll('[data-review-id]')].find(n=>n.dataset.reviewId===target.slice(8)):document.getElementById(target);
    if(tile){for(let node=tile;node&&node!==content;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;const response=tile.querySelector('.ask-intent-response');if(response)response.open=true;tile.tabIndex=-1;tile.focus({preventScroll:true});tile.scrollIntoView({block:'start',behavior:'auto'});}return;
   }
   const flow=e.target.closest('[data-summary-flow]');if(flow){view='checks';render();content.querySelector('.behavior-explore-link')?.click();return;}
   const source=e.target.closest('[data-summary-source]');if(source){
    const card=objectiveSummary?.cards.find(c=>c.objective.id===source.dataset.summarySource);
    const ids=card?.review?.after.evidence_ids||[];
    const anchor=ids.map(id=>card.evidence[id]?.source).find(s=>s?.file)||Object.values(card?.evidence||{}).map(e=>e.source).find(s=>s?.file);
    if(anchor)openReviewSource(options,{source:{...anchor,label:anchor.file,qualification:anchor.line?'Recorded line '+anchor.line:'File anchor only.'}});
   }
   if(e.target.closest('[data-view="flow"]'))focusedObjective=null;
  });
  document.addEventListener('click',e=>{const node=e.target.closest('[data-select-flow]');if(!node)return;const f=byId.get(node.dataset.selectFlow);if(!f)return;document.querySelector('#intent-node-detail').innerHTML=`<div class="body"><h3 style="overflow-wrap:anywhere">${esc(conceptLabel(f))}</h3><p>${esc(f.source?.file||'Source not supplied')}</p><p>${esc(human(f.change_kind))}</p><details><summary>Evidence and qualifications</summary>${details(f)}</details>${graphImpactMarkup('episode:'+f.id)}<button data-open-region="${esc(f.id)}">Open Review tile</button></div>`;});
  file='all';render();
 }catch(error){render=()=>{content.innerHTML=LIVE&&view==='checks'?liveChecks():'';const message=document.createElement('p');message.textContent='Generated view unavailable: '+error.message;content.append(message);};document.querySelector('.sidebar').innerHTML='';document.querySelector('.right').innerHTML='';render();}
})();
