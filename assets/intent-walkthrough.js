/* Narratives are assembled only from the recorded boundary facts. */
function intentDslMarkup(value,missingValues=[]){
 const text=typeof value==='string'?value:JSON.stringify(value,null,2);
 const tokens=/"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?\b/g;
 return '<pre class="intent-declaration"><code>'+text.split('\n').map((line,index)=>{
  let at=0,html='';
  for(const match of line.matchAll(tokens)){
   html+=esc(line.slice(at,match.index));const token=match[0];
   const key=token.startsWith('"')&&/^\s*:/.test(line.slice(match.index+token.length));
   const missing=!key&&missingValues.some(v=>token===JSON.stringify(v));
   const kind=missing?'missing':key?'key':token.startsWith('"')?'string':/^(true|false|null)$/.test(token)?'literal':'number';
   html+=`<span class="dsl-token-${kind}">${esc(token)}</span>`;at=match.index+token.length;
  }
  return `<span class="dsl-line"><span class="dsl-line-number" aria-hidden="true">${index+1}</span><span>${html+esc(line.slice(at))}</span></span>`;
 }).join('')+'</code></pre>';
}
function intentDslComparison(story){
 return `<div class="intent-dsl-grid intent-dsl-primary">${[['Baseline',story.before],['This revision',story.after]].map(([label,slots])=>`<section><h4>${label} <code>state_transition</code></h4>${intentDslMarkup(slots)}</section>`).join('')}</div>`;
}
function readableAcceptedIntent(story) {
 const objective=String(story.objective||'');
 if(objective&&!objective.includes('state_transition('))return {text:objective,source:'Recorded baseline context'};
 const words=value=>String(value).replace(/^.*\./,'').replace(/_/g,' ').toLowerCase();
 const name=story.method.split('.').pop().replace('#','.').replace(/\/\d+$/,'');
 const before=story.before||{};
 const allowed=(before.allowed||[]).map(words).join(' or ');
 const writes=(before.writes||[]).map(value=>{
  const split=value.indexOf('=');
  return split<0?null:`${words(value.slice(0,split))} to ${words(value.slice(split+1))}`;
 }).filter(Boolean);
 return {text:`In the baseline, ${name}()${allowed?` accepts ${words(before.guard||'state')} ${allowed}`:''}${writes.length?`${allowed?' and sets':' sets'} ${writes.join(' and ')}`:'. No assignment is recorded for this transition'}.`,source:'Recorded baseline behavior · original facts in evidence'};
}

function intentStoryEntry(story) {
 if(story.kind==='new_boundary')return {id:story.id,region:story.id,category:'Intent differences',status:'gap',statusLabel:'Governance decision needed',governanceDecision:true,owner:'Owner not supplied',title:`New intent detected · ${story.root}`,source:{label:story.source.file,file:story.source.file,qualification:'Recorded build descriptor'},story,summary:`${story.changed_files} changed files introduce a build root outside the accepted architecture anchors.`,nextStep:'Apply existing governance, establish new governance, or explicitly leave this new component ungoverned. Record its scope for owner review.'};
 const name=story.method.split('.').pop().replace('#','.').replace(/\/\d+$/,'');
 const writes=slots=>(slots.writes||[]).map(value=>value.replace(/^.*?=/,'').replace(/^\w+\./,'')).join(', ')||'No recorded assignment';
 const allowed=slots=>(slots.allowed||[]).join(' or ')||'Source state unspecified';
 const changed=JSON.stringify(story.before.writes)!==JSON.stringify(story.after.writes);
 const contractViolation=story.contract_findings?.some(f=>f.reason==='business_contract_violated');
 const contractGap=story.contract_findings?.some(f=>f.reason==='business_contract_evidence_unavailable');
 const violated=contractViolation||story.judgment?.status==='supported_boundary_violation';
 const assignmentRemoved=changed&&!(story.after.writes||[]).length;
 const preserved=story.judgment?.status==='supported_boundary_preservation';
 return {id:story.id,region:story.id,category:'Intent differences',governanceObjective:story.contract_findings?.length?story.objective:null,status:violated?'action':preserved?'clear':'gap',...(violated&&!contractViolation?{tone:'amber'}:{}),
  statusLabel:contractGap?'Blocked · required step not verified':violated?'Baseline violated':preserved?'Preserved':'Review needed',owner:'Owner not supplied',
  title:assignmentRemoved?`${name}: baseline state assignment removed`:changed?`${name} now sets ${writes(story.after)}`:`${name}: state-transition intent changed`,
  source:{label:story.source.file||'Source unavailable',file:story.source.file,symbol:name,qualification:`Boundary fact anchor: line ${story.source.line||'not supplied'}.`},
  story, beforeState:allowed(story.before),afterState:allowed(story.after),beforeResult:writes(story.before),afterResult:writes(story.after),
  summary:assignmentRemoved?`The baseline assignment to ${writes(story.before)} is absent from the revised transition. The extracted facts do not establish a replacement destination.`:changed?`The destination changes from ${writes(story.before)} to ${writes(story.after)}${allowed(story.before)===allowed(story.after)?`, while the allowed source state remains ${allowed(story.before)}`:''}.`:'The recorded transition differs from its accepted boundary facts.',
  nextStep:'Restore the required behavior, or ask the rule owner to approve a change to the rule.'};
}

function intentStoryTile(e,options,state) {
 const s=e.story,response=state.responses.get(e.id);
 const accepted=readableAcceptedIntent(s);
 const contractGap=s.contract_findings?.some(f=>f.reason==='business_contract_evidence_unavailable');
 const required=[...new Set((s.contract_findings||[]).flatMap(f=>f.requirement||[]).map(r=>`${r.target_field} = ${r.value_field}`))];
 const lane=(label,start,end,revision)=>`<div class="story-lane ${revision?'revision':''}"><span>${label}</span><div><code>${esc(start)}</code><span aria-hidden="true">→</span><code>${esc(end)}</code></div></div>`;
 const same=['guard','allowed','returns'].filter(key=>JSON.stringify(s.before?.[key])===JSON.stringify(s.after?.[key])&&s.before?.[key]!==undefined);
 const actions=e.governanceDecision?reviewEntryActions(e):[['request-changes','Request restoration'],['escalate','Request a rule change'],['dispute','Dispute evidence']];
 const connections=s.system_context?.connections||[];
 const destinationKnown=Boolean(s.after?.writes?.length);
 const short=value=>String(value).split('.').pop().replace('#','.').replace(/\/\d+$/,'');
 const context=`<section class="story-context"><b>System context · ${esc(s.system_context?.scope||e.source.symbol)}</b>${connections.length?`<p>The accepted destination connects this operation to ${connections.length} other state transitions.</p><div class="story-connections">${connections.map(c=>`<div><strong>${esc(short(c.method))}</strong><span><code>${esc(c.requires.join(' / '))}</code> → <code>${esc(c.destinations.join(' / ')||'No recorded assignment')}</code></span><small>${!destinationKnown?'Revised destination not established':c.accepts_new_destination?'Accepts the revised destination':'Does not accept the revised destination'}</small></div>`).join('')}</div>`:`<p>${esc(s.system_context?.qualification||'Surrounding relationships have not been supplied.')}</p>`}</section>`;
 const mismatch=connections.filter(c=>!c.accepts_new_destination);
 const consequence=s.kind==='new_boundary'?'Existing architecture rules cannot establish whether this new component fits until its responsibilities and connections are defined.':!destinationKnown?'The baseline state assignment is missing. These facts alone do not establish the resulting state or prove that a later operation will fail.':mismatch.length?`The revised destination does not satisfy the recorded guards of ${mismatch.map(c=>short(c.method)).join(' and ')}. If invoked next, these operations would receive a state outside their allowed inputs.`:'The changed transition must be reviewed against the accepted objective. Broader runtime consequences are not established by this evidence.';
 return `<article class="review-result intent-story" data-review-id="${esc(e.id)}" data-regions="${esc(e.region)}">
 <div class="result-head"><h3>Intent differences</h3><span class="pill ${e.tone||(e.status==='action'?'red':e.status==='clear'?'green':'amber')}">${esc(e.statusLabel)}</span></div>
 <div class="story-body"><div class="story-kicker">${esc(e.source.file?.split('/')[0]||'Governed behavior')}${e.source.symbol?' / '+esc(e.source.symbol):''}</div><h3>${esc(e.governanceObjective||e.title)}</h3>${e.governanceObjective?'':`<p class="story-objective"><b>${s.kind==='new_boundary'?'New intent':'Baseline intent'}</b><span>${esc(accepted.text)}</span><small>${esc(accepted.source)}</small></p>`}
 ${e.governanceObjective?`<p class="story-requirement"><b>What must stay true</b> ${esc(required.length?required.map(value=>value.replace(' = ',' must be ')).join('; '):'See the recorded contract evidence.')}</p><p class="story-change-label"><b>What changed</b> ${esc(e.title)}</p>`:''}${s.kind==='state_transition'?intentDslComparison(s):`<div class="story-comparison">${lane('BASELINE','Accepted architecture','No anchor for '+s.root,false)+lane('THIS REVISION',s.root,'New build root',true)}</div>`}
 <p class="story-meaning">${esc(e.summary)}</p>${s.contract_findings?.length?`<p class="story-confirmed ${contractGap?'evidence-gap':''}"><b>${contractGap?'Required step not verified':'Rule violated'}</b>${contractGap?'The check could not verify the step required by this rule, so it blocked the change. Its result is missing evidence, not a confirmed violation.':'The structural contract check found that this change violates the accepted objective.'} The broader intent assessment remains separate.</p>`:''}
 <p class="story-consequence"><b>Why it matters</b>${esc(consequence)}</p>
 ${s.kind==='state_transition'?`<details class="story-detail"><summary>Source diff · ${esc(s.source.file?.split('/').pop()||'Source unavailable')}${s.source.line?':'+esc(s.source.line):''}</summary><div class="intent-source-preview" data-intent-source="${esc(e.id)}"><p>Loading recorded source evidence…</p></div></details>`:''}<details class="story-detail"><summary>Related behavior and state context</summary>${context}</details><div class="story-evidence-bar"><button class="source-button" data-review-source="${esc(e.id)}">Inspect ${esc(e.source.file?.split('/').pop()||'source')}${s.source.line?':'+esc(s.source.line):''}</button><span>${s.witness_ids.length} baseline witness · ${s.region_ids.length} intent regions</span></div>
 <details class="story-detail"><summary>Evidence behind this explanation</summary><p>${s.judgment?`The recorded boundary judgment is <b>${esc(s.judgment.choice)}</b>.`:'No completed boundary judgment is attached.'}</p><p>${esc(s.system_context?.qualification||'Explanation assembled from recorded facts.')}</p>${connections.map(c=>`<p><b>${esc(short(c.method))}</b> · ${esc(c.source.file)}:${esc(c.source.line)}<br>Fact: <code>${esc(c.fact_id)}</code></p>`).join('')}<p>Unchanged recorded fields: ${esc(same.join(', ')||'none')}.</p><p>Boundary: <code>${esc(s.boundary)}</code></p><details><summary>Evidence identifiers and facts</summary><pre>${esc(JSON.stringify({contract_findings:s.contract_findings,original_objective:s.objective,witnesses:s.witness_ids,regions:s.region_ids,facts:s.fact_ids,before:s.before,after:s.after},null,2))}</pre></details></details>
 ${s.context_methods.length?`<details class="story-detail"><summary>Analysis context · ${s.context_methods.length} methods</summary><p>These methods were included in the extraction context. This relationship alone does not prove a downstream behavior change or test coverage.</p><ul>${s.context_methods.map(m=>`<li>${esc(m.split('::').pop())}</li>`).join('')}</ul></details>`:''}
 <div class="story-decision"><b>What to do</b><p>${esc(e.nextStep)}</p>${response?`<p>${esc(reviewResponseState(response.action))}</p><button data-review-undo="${esc(e.id)}">Undo response</button>`:e.status==='clear'?'<p>No response required.</p>':`<div class="result-actions">${actions.map(([action,label])=>`<button data-review-action="${action}" data-entry-id="${esc(e.id)}">${label}</button>`).join('')}</div>`}<small>Responses are session-only; the baseline stays unchanged.</small></div></div></article>`;
}

function intentEvidenceTrace(e){
 const s=e.story;if(s.kind!=='state_transition')return '';
 const dsl=slots=>'state_transition '+JSON.stringify(slots,null,2);
 return `<details class="intent-trace"><summary>Trace intent to DSL and source</summary><ol class="intent-trace-tree">
 <li><small>${e.governanceObjective?'Governed contract':'Recorded baseline behavior'}</small><strong>${esc(e.governanceObjective||readableAcceptedIntent(s).text)}</strong>${e.governanceObjective?'<p class="trace-caption">This packet links the contract to affected intent regions. A parent business-objective link was not supplied.</p>':''}
 <ol><li><small>Boundary</small><strong>${esc(s.boundary)}</strong><details><summary>${s.region_ids.length} linked intent regions</summary>${s.region_ids.map(r=>`<code>${esc(r)}</code>`).join('<br>')}</details>
 <ol><li><small>Affected method</small><strong>${esc(e.source.symbol||s.method)}</strong><small>${esc(s.source.file)}${s.source.line?':'+esc(s.source.line):''}</small>
 <div class="intent-dsl-grid">${[['Baseline intent',s.before],['This revision',s.after]].map(([label,slots])=>`<section><h4>${label}</h4><pre>${esc(dsl(slots))}</pre></section>`).join('')}</div>
 <p class="trace-caption">Normalized intent DSL from recorded facts. Empty writes means no assignment was extracted; it does not prove the runtime state is unchanged.</p>
 <div class="intent-source-preview" data-intent-source="${esc(e.id)}"><p>Loading the recorded source diff…</p></div><button data-review-source="${esc(e.id)}">Open full file diff</button>
 </li></ol></li></ol></li></ol></details>`;
}
function intentSourceHunk(patch,line){
 if(!Number.isInteger(line))return null;
 return String(patch||'').split(/(?=^@@ )/m).find(chunk=>{const m=chunk.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);return m&&line>=Number(m[1])&&line<Number(m[1])+Number(m[2]??1);})||null;
}
async function renderIntentSources(root,options){
 await Promise.all([...root.querySelectorAll('[data-intent-source]')].map(async node=>{
  const entry=options.entries.find(e=>e.id===node.dataset.intentSource);if(!entry)return;
  try{
   const data=await options.sourceDetails(entry),hunk=intentSourceHunk(data.patch,entry.story.source.line);
   if(!hunk){node.innerHTML='<p class="trace-caption">No supplied diff hunk contains this method anchor. Open the full file diff to inspect the evidence.</p>';return;}
   node.innerHTML=`<h4>Source diff · ${esc(entry.source.file.split('/').pop())}</h4><p class="trace-caption">Hunk containing the recorded method anchor; nearby changes may be included.</p><pre class="intent-source-code">${hunk.trimEnd().split('\n').map(line=>`<span class="${line.startsWith('+')?'add':line.startsWith('-')?'del':'ctx'}">${esc(line)}</span>`).join('\n')}</pre>`;
  }catch(error){node.innerHTML=`<p class="trace-caption">Source evidence unavailable: ${esc(error.message)}</p>`;}
 }));
}
