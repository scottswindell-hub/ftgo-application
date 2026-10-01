/* Generated packets and demo fixtures share the Review presentation. */
(async function () {
 const params=new URLSearchParams(location.search);
 const semanticPR=params.get('mode')==='semantic'&&/^\d+$/.test(params.get('pr')||'')?params.get('pr'):null;
 const dataPath=params.get('data')||(semanticPR?`assets/semantic-prs/pr${semanticPR}.json`:null);
 if(!dataPath||LIVE)return;
 const content=document.querySelector('#content');content.innerHTML='<p>Loading generated review data…</p>';
 try{
  const artifactURL=new URL(dataPath,location.href);
  if(artifactURL.origin!==location.origin)throw Error('Use a same-origin generated artifact.');
  const response=await fetch(artifactURL);if(!response.ok)throw Error('Artifact unavailable: '+response.status);
  const raw=await response.text();if(new TextEncoder().encode(raw).length>262144)throw Error('View exceeds 256 KiB.');
  const packet=JSON.parse(raw);
  if(packet.schema!=='intent-flow-view-v1'||!Array.isArray(packet.flows))throw Error('Unsupported view schema.');
  const flows=packet.flows,byId=new Map(flows.map(f=>[f.id,f]));
  const json=value=>esc(JSON.stringify(value,null,2));
  const human=value=>String(value||'Not supplied').replaceAll('_',' ');
  const methodLabel=f=>(f.method||f.title||f.id).split('::').pop().replace(/:[^:]*$/,'').split('.').pop();
  const conceptLabel=f=>f.concepts.find(c=>String(c.unit_id).startsWith('flow_holon:'))?.concept||methodLabel(f);
  const deltaLines=f=>{const before=[],after=[];for(const delta of f.observed_deltas){if(delta.kind==='learned_form_occurrence'&&delta.fields?.form_id?.before&&delta.fields.form_id.after===null){before.push('recognized_form');after.push('no_matching_form');}for(const [name,value] of Object.entries(delta.fields||{})){
   if(['contract_status','missing','state','value','concept','fact'].includes(name)){
    before.push(`${delta.kind}.${name} = ${JSON.stringify(value.before)}`);after.push(`${delta.kind}.${name} = ${JSON.stringify(value.after)}`);
   }
  }}if(!before.length&&f.change_kind==='added'){before.push('method absent');after.push('method '+methodLabel(f)+' added; behavior not yet established');}return before.length?{before:before.join('\n'),after:after.join('\n')}:{};};
  const details=f=>`<p>Source anchor: ${esc(f.source?.status||'unavailable')} ${f.source?.line?' · line '+esc(f.source.line):''}<br>${esc(f.source?.reason||'')}</p><h4>Concept evidence</h4>${f.concepts.map(c=>`<p><code>${esc(c.concept||c.unit_id)}</code> · ${esc(human(c.status))}</p>`).join('')}<h4>Potential impact</h4>${f.potential_impact.map(x=>`<p>${esc(x.concept||x.id)} · ${esc(x.reason)}</p>`).join('')||'<p>None reported.</p>'}<h4>Published findings</h4>${f.findings.map(x=>`<p><b>${esc(human(x.domain))} · ${esc(human(x.severity))}</b><br>${esc(human(x.reason))}</p>`).join('')||'<p>None reported.</p>'}${f.behavior_judgment?.probabilities?`<details><summary>Behavior judgment probabilities</summary><pre>${json(f.behavior_judgment.probabilities)}</pre><p>These score the behavior comparison; they are not the chance that the PR is safe.</p></details>`:''}<details><summary>Full observed structural delta and judgment</summary><pre>${json({observed_deltas:f.observed_deltas,behavior_judgment:f.behavior_judgment})}</pre></details>`;
  const entries=flows.map(f=>{
   const judgment=f.behavior_judgment||{};
   const contract=f.change_kind==='business_contract';
   const boundary=['governed_boundary_change','boundary_evidence_gap'].includes(f.change_kind),benchmarkMiss=f.change_kind==='benchmark_miss';
   const action=contract&&f.findings.length||judgment.status==='supported_behavior_change'||judgment.status==='supported_boundary_violation';
   const clear=(judgment.choice==='equivalent'||judgment.status==='supported_boundary_preservation')&&!f.findings.length;
   const unresolved=f.findings.some(x=>x.reason==='unresolved_call');
   const unchecked=f.findings.some(x=>x.reason==='added_method_contract_unchecked');
   const displayTitle=benchmarkMiss?'Selector missed an expected governed change':boundary?`Governed boundary · ${f.title}`:contract&&f.findings.some(x=>x.reason==='business_contract_violated')?'Business contract no longer satisfied':judgment.status==='supported_behavior_change'?`Behavior differs from baseline · ${methodLabel(f)}`:f.change_kind==='context_changed'&&unresolved?`Call target unresolved · ${methodLabel(f)}`:f.change_kind==='added'&&unchecked?`New method needs behavior review · ${methodLabel(f)}`:`${human(f.change_kind)} · ${methodLabel(f)}`;
   const why=benchmarkMiss?'The labelled evaluation expected a governed boundary change, but deterministic selection emitted no boundary question.':boundary?(judgment.status==='supported_boundary_violation'?'The recorded boundary judgment supports a violation.':judgment.status==='supported_boundary_preservation'?'The recorded boundary judgment supports preservation.':'The governed fact changed, but no completed boundary judgment was supplied.'):contract?f.title:f.change_kind==='context_changed'&&unresolved?'A call target could not be resolved in the changed analysis context. A source edit to this method is not established.':unchecked?'The added method has not been checked against its behavior contract.':judgment.status==='supported_behavior_change'?'The recorded behavior comparison supports a change from baseline.':clear?'The recorded behavior comparison supports equivalence.':'The available analysis does not establish equivalent behavior.';
   const category=benchmarkMiss?'Evidence coverage':boundary?'Governed boundary':contract?'Governance policy':f.findings.some(x=>['dependency_resolution','extraction_context'].includes(x.domain))&&!action?'Evidence coverage':'Intent differences';
   return {id:f.id,region:f.id,category,status:clear?'clear':action?'action':'gap',owner:'Owner not supplied',concept:conceptLabel(f),title:displayTitle,source:{label:f.source?.file||'Source anchor not supplied',file:f.source?.file,symbol:f.source?.file?methodLabel(f):null,qualification:f.source?.line?'Recorded anchor line '+f.source.line:f.source?.reason||'Exact source lines not supplied.'},...deltaLines(f),summary:why,nextStep:clear?'No response required for this behavior comparison.':contract?'Inspect the affected contract and source evidence with its owner.':action?'Review the behavior change and the connected evidence.':'Supply or verify the missing context before making a decision.',details:details(f),checks:[...new Set(f.findings.map(x=>human(x.domain)))]};
  });
  let patchPromise;
  const loadPatch=()=>patchPromise||(patchPromise=(async()=>{
   if(!packet.source_diff?.url)return null;
   const url=new URL(packet.source_diff.url,artifactURL);if(url.origin!==location.origin)throw Error('Source artifact must be same origin.');
   const r=await fetch(url);if(!r.ok)throw Error('Source patch unavailable: '+r.status);
   const raw=await r.arrayBuffer();if(raw.byteLength>262144)throw Error('Source patch exceeds 256 KiB.');
   if(packet.source_diff.sha256){const digest=await crypto.subtle.digest('SHA-256',raw);const actual=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');if(actual!==packet.source_diff.sha256)throw Error('Source patch digest differs from the generated artifact.');}
   return new TextDecoder().decode(raw);
  })());
  const sourceDetails=async entry=>{
   const patch=await loadPatch();
   const section=patch?.split(/(?=^diff --git )/m).find(s=>s.split('\n').some(line=>line==='+++ b/'+entry.source.file||line==='--- a/'+entry.source.file));
   return section?{patch:section,message:'Recorded source patch for this baseline and candidate. This is file-level evidence; no exact method-to-hunk match is claimed.'}:{message:entry.source.file?'No source patch for this file was supplied. This may be a context-only change.':'This finding has no source file anchor.'};
  };
  for(const node of packet.graph?.nodes||[]){if(node.kind==='change'){const f=byId.get(node.flow_id);if(f)node.label=conceptLabel(f);}else if(node.kind==='source')node.label=String(node.label).split('/').pop();}
  const options={scope:'generated-packet',entries,title:'FTGO intent review',description:'Changed regions from the completed analysis packet.',baseline:packet.baseline_commit,head:packet.head_commit,freshness:'Replay snapshot · current head not connected',qualification:'Generated from pipeline output. Current repository head and CI enforcement are not supplied.',sourceDetails};
  document.querySelector('.demo').textContent='GENERATED PIPELINE DATA · Recorded FTGO replay. Responses are session-only; missing check results stay explicit.';
  document.querySelector('h1').textContent='FTGO intent review · generated from analysis';
  document.querySelector('.meta').textContent=`${String(packet.baseline_commit||'Unknown baseline').slice(0,12)} → ${String(packet.head_commit||'Unknown candidate').slice(0,12)}`;
  document.querySelector('.right').innerHTML=`<div class="card"><h3>Review outcome</h3><b>${entries.some(e=>e.status==='action')?'Action needed':entries.some(e=>e.status==='gap')?'Evidence needed':'No review action identified'}</b><p>Recorded analysis outcome. CI enforcement status was not supplied.</p><details><summary>Run provenance</summary><p>Backend result: ${esc(packet.backend_verdict||'Unknown')}</p><pre>${json(packet.provenance)}</pre><p>${esc(typeof packet.qualification==='string'?packet.qualification:JSON.stringify(packet.qualification))}</p></details></div>`;
  document.querySelector('footer').textContent='Generated review presentation · responses remain session-only';
  render=function(){
   document.querySelector('#flow-panel').classList.add('hidden');content.classList.remove('hidden');
   document.querySelector('.layout').classList.toggle('flow-layout',view==='flow');document.querySelector('.layout').classList.toggle('checks-layout',view==='checks'||view==='intent');
   document.querySelector('.right').classList.toggle('hidden',view==='flow');
   const sidebar=document.querySelector('.sidebar');sidebar.classList.toggle('hidden',view!=='review');
   sidebar.innerHTML=`<p class="eyebrow">Change walkthrough</p><button class="side-item ${file==='all'?'selected':''}" data-file="all">All changed regions (${flows.length})</button>${entries.map(e=>`<button class="side-item ${file===e.id?'selected':''}" data-file="${esc(e.id)}" style="overflow-wrap:anywhere">${esc(e.concept)}<small>${esc(e.source.label)}</small></button>`).join('')}`;
   document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
   document.querySelector('#nav-count').textContent=entries.filter(e=>e.status!=='clear'&&!reviewState(options.scope).responses.has(e.id)).length;
   document.querySelector('[data-view="checks"] .count').textContent='packet';
   if(view==='checks')content.innerHTML=`<article class="card"><div class="body"><h2>Checks & review prompts</h2><p>This artifact supplies intent episodes, not the CI check manifest. Missing check results are not passes. Episode findings are available in Review.</p>${gates.map(g=>`<div class="gate"><span class="icon warn">◉</span><div style="flex:1"><strong>${esc(g[1])}</strong><small>${esc(g[2])}<br>Dependency: ${esc(g[3]||'none')}</small></div><span class="pill">Not supplied</span></div>`).join('')}</div></article>`;
   else if(view==='intent')content.innerHTML=reviewResponseHistory(options.scope);
   else if(view==='flow')content.innerHTML=`<h2>Intent Flow</h2><p>Source → changed intent → potential impact. Select a change node to inspect its evidence.</p>${intentGraphMarkup(packet.graph||{nodes:[],edges:[]})}`;
   else content.innerHTML=reviewBoard({...options,region:file});
   if(view==='flow')drawIntentGraph();
  };
  document.addEventListener('click',e=>{const node=e.target.closest('[data-select-flow]');if(!node)return;const f=byId.get(node.dataset.selectFlow);if(!f)return;document.querySelector('#intent-node-detail').innerHTML=`<div class="body"><h3 style="overflow-wrap:anywhere">${esc(conceptLabel(f))}</h3><p>${esc(f.source?.file||'Source not supplied')}</p><p>${esc(human(f.change_kind))}</p><details><summary>Evidence and qualifications</summary>${details(f)}</details>${graphImpactMarkup('episode:'+f.id)}<button data-open-region="${esc(f.id)}">Open Review tile</button></div>`;});
  file='all';render();
 }catch(error){render=()=>{content.textContent='Generated view unavailable: '+error.message;};document.querySelector('.sidebar').innerHTML='';document.querySelector('.right').innerHTML='';render();}
})();
