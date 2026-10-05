(async function(){
 const root=document.documentElement,params=new URLSearchParams(location.search),content=document.querySelector('#content');
 const themeKey='codeintent-theme',themeButton=document.querySelector('#theme');
 const applyTheme=t=>{root.dataset.theme=t;themeButton.textContent=t==='dark'?'☀ Light':'☾ Dark';themeButton.setAttribute('aria-label','Switch to '+(t==='dark'?'light':'dark')+' theme');};
 const restoreTheme=()=>{let saved=null;try{saved=localStorage.getItem(themeKey);}catch(e){}applyTheme(['light','dark'].includes(saved)?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');};
 restoreTheme();addEventListener('pageshow',restoreTheme);addEventListener('storage',event=>{if(event.key===themeKey)restoreTheme();});
 themeButton.onclick=()=>{const t=root.dataset.theme==='dark'?'light':'dark';applyTheme(t);try{localStorage.setItem(themeKey,t);}catch(e){}};
 const back=new URL('./',location.href);back.search=params;back.searchParams.set('view','checks');document.querySelector('#back').href=back;
 async function bytes(url,limit=262144){if(url.origin!==location.origin)throw Error('Use same-origin evidence.');const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Recorded evidence is not available.');const raw=await response.arrayBuffer();if(raw.byteLength>limit)throw Error('Evidence exceeds the view budget.');return raw;}
 const parse=raw=>JSON.parse(new TextDecoder().decode(raw));
 try{
  const dataPath=params.get('data');
  if(!dataPath)throw Error('No graph artifact selected.');
  const packetURL=new URL(dataPath,location.href),packet=parse(await bytes(packetURL,524288));
  if(packet.schema!=='intent-flow-view-v1'||!packet.objective_summary_artifact)throw Error('No cached graph explanation attached.');
  if(params.get('sha')&&packet.head_commit!==params.get('sha')||params.get('repo')&&packet.repository!==params.get('repo')||params.get('run_id')&&packet.simulation?.run_id!==params.get('run_id'))throw Error('Graph does not match this review.');
  const ref=packet.objective_summary_artifact,raw=await bytes(new URL(ref.url,packetURL));
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(hash!==ref.sha256)throw Error('Summary checksum mismatch.');
  const summary=parse(raw),narrative=summary.behavior_narrative;
  if(summary.schema!=='objective-behavior-summary-v1'||summary.identity.governance_version!==packet.provenance?.governance_version_id||summary.identity.head_commit!==packet.head_commit||summary.identity.baseline_commit!==packet.baseline_commit||summary.identity.repository!==packet.repository)throw Error('Summary revision mismatch.');
  if(narrative?.status!=='recorded')throw Error('A cached behavioral explanation is not available for this graph.');
  content.innerHTML=`<details class="behavior-overview"><summary>Change overview</summary><p class="lead">${esc(narrative.summary)}</p></details>${behaviorNarrativeMarkup(narrative)}`;
  const section=content.querySelector('.behavior-narrative');if(section)section.open=true;
  content.querySelectorAll('.behavior-story').forEach((node,index)=>{
   const graph=document.createElement('div');graph.className='activity-graph-panel';graph.innerHTML=behaviorEvidenceGraph(narrative.stories[index],narrative.packet,index);
   node.insertBefore(graph,node.querySelector('details'));const evidence=graph.querySelector('[data-behavior-detail]');if(evidence){node.append(evidence);const first=narrative.stories[index].change_ids.map(id=>narrative.packet.changes[id]).find(c=>c.kind==='behavior_delta');evidence.innerHTML=first?behaviorDslEvidence(first.after):'<h5>Intent DSL</h5><p class="note">No behavioral DSL is supplied for these method additions.</p>';}
  });
  const picker=document.createElement('nav');picker.className='behavior-story-picker';picker.setAttribute('aria-label','Choose a behavior flow');picker.innerHTML=narrative.stories.map((s,i)=>`<button type="button" data-story-select="${i}" aria-pressed="${i===0}" title="${esc(s.title)}" aria-label="${esc(s.title)}">${esc(shortBehaviorLabel(s,i,narrative.stories))}</button>`).join('');section.before(picker);
  const selectStory=index=>{content.querySelectorAll('.behavior-story').forEach((n,i)=>n.hidden=i!==index);picker.querySelectorAll('button').forEach((n,i)=>n.setAttribute('aria-pressed',String(i===index)));};selectStory(0);
  const selections=new Map();
  const findFact=id=>{const p=narrative.packet,c=p.changes[id];return c?.kind==='structural_change'?{id,source:c.source,owner:c.method,parameters:{change:c.change}}:p.context[id]||Object.values(p.changes).flatMap(c=>c.kind==='behavior_delta'?[c.before,c.after]:[]).find(f=>f.id===id);};
  function showSelection(index,side,chosen){
   const facts=selections.get(String(index))||[];side=side||(facts.some(f=>f.side==='after')?'after':'before');
   const options=facts.filter(f=>f.side===side),fact=options.find(f=>f.id===chosen)||options[0]||facts[0];if(!fact)return;
   const controls=fact.form?`<div class="dsl-selection" role="group" aria-label="Evidence revision">${['before','after'].map(s=>`<button type="button" data-dsl-revision="${s}" aria-pressed="${s===side}" ${facts.some(f=>f.side===s)?'':'disabled'}>${s==='before'?'Before':'Current revision'}</button>`).join('')}</div>${options.length>1?`<label class="dsl-fact-choice">Recorded fact <select data-dsl-fact data-dsl-side="${side}">${options.map(f=>`<option value="${esc(f.id)}" ${f.id===fact.id?'selected':''}>${esc(f.owner.split('#').at(-1)+' · '+f.form)}</option>`).join('')}</select></label>`:''}`:'';
   content.querySelector('[data-behavior-detail="'+index+'"]').innerHTML=controls+behaviorDslEvidence(fact);
  }
  content.addEventListener('change',event=>{if(event.target.matches('[data-dsl-fact]'))showSelection(event.target.closest('[data-behavior-detail]').dataset.behaviorDetail,event.target.dataset.dslSide,event.target.value);});
  content.addEventListener('click',event=>{
   const selected=event.target.closest('[data-story-select]');if(selected){selectStory(Number(selected.dataset.storySelect));return;}

   const zoom=event.target.closest('[data-flow-zoom]');if(zoom){const canvas=zoom.closest('.activity-graph-panel').querySelector('.activity-canvas'),svg=canvas.querySelector('svg'),current=Number(svg.dataset.zoom||1),next=zoom.dataset.flowZoom==='fit'?1:Math.max(1,Math.min(3,current+(zoom.dataset.flowZoom==='in'?.25:-.25)));svg.dataset.zoom=next;svg.style.width=(next*100)+'%';svg.style.height=(next*100)+'%';return;}
   const revision=event.target.closest('[data-dsl-revision]');if(revision){const panel=revision.closest('[data-behavior-detail]');showSelection(panel.dataset.behaviorDetail,revision.dataset.dslRevision);return;}
   const node=event.target.closest('[data-behavior-node]');if(!node)return;
   const index=node.dataset.storyIndex;
   node.closest('.behavior-story').querySelectorAll('[data-behavior-node]').forEach(n=>n.setAttribute('aria-pressed',String(n===node)));
   const ids=node.dataset.behaviorFacts?JSON.parse(node.dataset.behaviorFacts):[node.dataset.behaviorNode];
   selections.set(String(index),ids.map(findFact).filter(Boolean));showSelection(index);

  });
  content.querySelectorAll('.activity-canvas').forEach(canvas=>{
   let drag=null;
   canvas.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('[data-behavior-node]'))return;drag={x:event.clientX,y:event.clientY,left:canvas.scrollLeft,top:canvas.scrollTop};canvas.setPointerCapture(event.pointerId);canvas.style.cursor='grabbing';event.preventDefault();});
   canvas.addEventListener('pointermove',event=>{if(drag){canvas.scrollLeft=drag.left+drag.x-event.clientX;canvas.scrollTop=drag.top+drag.y-event.clientY;}});
   const stop=()=>{drag=null;canvas.style.cursor='grab';};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
  });
  content.addEventListener('keydown',event=>{const node=event.target.closest('[data-behavior-node]');if(node&&['Enter',' '].includes(event.key)){event.preventDefault();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  content.querySelectorAll('.behavior-story').forEach(n=>n.querySelector('[data-behavior-node]')?.dispatchEvent(new MouseEvent('click',{bubbles:true})));
 }catch(error){content.textContent=error.message;content.id='error';}
})();

function behaviorEvidenceGraph(story, packet, index) {
 const changes=story.change_ids.map(id=>packet.changes[id]).filter(Boolean),pairs=changes.filter(c=>c.kind==='behavior_delta'&&c.before&&c.after),structures=changes.filter(c=>c.kind==='structural_change');
 const comparison=activityFlowMarkup(story,packet,index);
 const added=structures.length?`<section class="behavior-structure"><h5>${structures.every(c=>c.change==='added')?'Added structure':structures.every(c=>c.change==='removed')?'Removed structure':'Changed structure'}</h5><p>Behavioral comparison unavailable. Method bodies and prior behavior are not supplied.</p><div class="behavior-structure-items">${structures.map(c=>`<button type="button" data-behavior-node="${esc(c.id)}" data-story-index="${index}"><strong>${esc(c.method.split('::').at(-1).split(':')[0].split('.').slice(-2).join('.'))}</strong><span>${esc(c.change)} · Inspect graph evidence ↗</span></button>`).join('')}</div></section>`:'';
 return `<div class="behavior-graph semantic-comparison">${comparison}${added}</div><div data-behavior-detail="${index}" aria-live="polite"></div>`;
}
function behaviorDslEvidence(fact) {
 const source=fact.source||{},anchor=(source.file||'').split('/').at(-1)+(source.line?':'+source.line:'');
 return `<h5>Intent DSL${fact.side?' · '+esc(fact.side==='before'?'Before':'Current revision'):''}</h5><p class="note">${esc(anchor)}</p>${fact.form?intentDslMarkup(fact.parameters):'<p class="note">No behavioral DSL is supplied for this method.</p>'}`;
}

function shortBehaviorLabel(story,index,stories) {
 const shorten=s=>{const subject=s.title.split(/\b(?:no longer|now|uses?|becomes?|were|was|are|is|methods?)\b/i)[0].trim();return (subject||s.title).split(/\s+/).slice(0,3).join(' ').slice(0,32);};
 const label=shorten(story);return stories.filter(s=>shorten(s)===label).length>1?label+' '+(index+1):label;
}
