function flowLabelLines(label) { return (label=>{const words=(label.length>100?label.slice(0,97)+'…':label).split(/\s+/).flatMap(w=>w.match(/.{1,20}/g)||[]),lines=[''];for(const w of words){const i=lines.length-1;if(lines[i].length+w.length>20&&lines[i])lines.push(w);else lines[i]+=(lines[i]?' ':'')+w;}return lines;})(label); }
/* Graph projection only: no inferred call edges or model-generated topology. */
function behaviorActivityGraph(story,packet){
 const nodes=new Map(),edges=new Map(),roots=[];
 const word=s=>String(s??'').replace(/\(\)/g,'').replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/\b(?:get|with) (?=[A-Z])/g,'').replace(/\./g,' / ').trim();
 const state=s=>String(s).replace(/^.*=/,'').split('.').at(-1);
 const action=f=>word(f.owner.split('#').at(-1).replace(/\/\d+$/,''));
 function node(id,label,kind,f,tone){if(!nodes.has(id))nodes.set(id,{id,label,kind,fact:f.id,facts:[f.id],tone});else {const n=nodes.get(id);if(!n.facts.includes(f.id))n.facts.push(f.id);if(n.tone!==tone)n.tone='common';}return id;}
 function edge(from,to,f,tone,label){const key=[from,to].join('|');if(edges.has(key)){const e=edges.get(key);if(e.tone!==tone)e.tone='common';e.label=e.tone==='common'?'recorded in both':e.label;return;}edges.set(key,{from,to,fact:f.id,tone,label});}
 function add(f,tone,isRoot){
  if(f.form==='state_transition'){
   const scope=f.owner.split('#')[0],act=node('action:'+f.owner,action(f),'action',f,tone);
   for(const value of f.parameters.allowed||[]){const id=node(scope+':state:'+state(value),word(state(value)),'state',f,tone);edge(id,act,f,tone,tone==='context'?'current revision':'allowed state');if(isRoot)roots.push(id);}
   const writes=f.parameters.writes||[],stateWrites=writes.filter(v=>v.includes('=')&&v.split('=')[0].split('.').at(-1)===f.parameters.guard);
   for(const value of stateWrites){const id=node(scope+':state:'+state(value),word(state(value)),'state',f,tone);edge(act,id,f,tone,tone==='removed'?'before':tone==='added'?'after':'current revision');}
   for(const value of writes.filter(v=>!stateWrites.includes(v))){const id=node('assignment:'+f.owner+':'+value,word(value),'assignment',f,tone);edge(act,id,f,tone,'recorded assignment');}
   if(!stateWrites.length){const id=node('unknown-write:'+f.owner,'No state assignment recorded','unknown',f,tone);edge(act,id,f,tone,tone==='removed'?'before · evidence limit':tone==='added'?'after · evidence limit':'evidence limit');}
  }else if(f.form==='value_binding'){
   const source=node('value:'+f.owner+':'+f.parameters.value,word(f.parameters.value),'value',f,tone);
   const slot=node('slot:'+f.owner+':'+f.parameters.slot,word(f.parameters.slot),'binding',f,'common');
   const owner=node('action:'+f.owner,action(f),'action',f,'common');
   edge(source,slot,f,tone,tone==='removed'?'before':tone==='added'?'after':'recorded value');edge(slot,owner,f,tone,'field in command');roots.push(source);
  }else if(f.form==='boundary_call'||f.form.startsWith('saga_')){
   const p=f.parameters,owner=node('action:'+f.owner,action(f),'action',f,tone),target=p.participant||[p.receiver,p.operation].filter(Boolean).join('.');
   const operation=node('operation:'+f.owner+':'+target,word(target),'call',f,tone);roots.push(owner);edge(owner,operation,f,tone,f.form==='boundary_call'?'recorded call':word(f.form.replace('saga_','')));
   (p.arguments||[]).forEach((value,i)=>{const id=node('argument:'+f.owner+':'+i+':'+value,word(value),'value',f,tone);edge(id,operation,f,tone,'argument '+(i+1));roots.push(id);});
  }
 }
 for(const id of story.change_ids){const c=packet.changes[id];if(c?.kind==='behavior_delta'){add(c.before,'removed',true);add(c.after,'added',true);}}
 for(const id of story.context_ids){const f=packet.context[id];if(f&&f.side==='after')add(f,'context',false);}
 // Shortest directed distance gives a stable layout; loops remain explicit back edges.
 const levels=new Map(),queue=[...new Set(roots)];queue.forEach(id=>levels.set(id,0));
 for(let i=0;i<queue.length;i++){const id=queue[i];for(const e of edges.values())if(e.from===id&&!levels.has(e.to)){levels.set(e.to,levels.get(id)+1);queue.push(e.to);}}
 const columns=new Map();for(const n of nodes.values()){const level=levels.get(n.id)??0;if(!columns.has(level))columns.set(level,[]);columns.get(level).push(n);}
 const width=Math.max(700,...[...columns.values()].map(v=>v.length*245+80));let cursor=45;
 for(const [level,list] of [...columns].sort((a,b)=>a[0]-b[0])){list.forEach((n,i)=>Object.assign(n,{x:width/(list.length+1)*(i+1)-95,y:cursor,height:Math.max(64,flowLabelLines(n.label).length*16+24)}));cursor+=Math.max(...list.map(n=>n.height))+90;}
 const height=Math.max(490,cursor);
 return {nodes:[...nodes.values()],edges:[...edges.values()],width,height};
}
function activityFlowMarkup(story,packet,index){
 const graph=behaviorActivityGraph(story,packet);if(!graph.nodes.length)return '';
 const colors={removed:'var(--flow-before)',added:'var(--flow-after)',context:'var(--muted)',common:'var(--flow-common)'},positions=new Map(graph.nodes.map(n=>[n.id,n]));
 const marker=tone=>`flow-arrow-${index}-${tone}`;
 const markers=Object.entries(colors).map(([tone,color])=>`<marker id="${marker(tone)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`).join('');
 const edges=graph.edges.map(e=>{const a=positions.get(e.from),b=positions.get(e.to),back=b.y<=a.y,color=colors[e.tone],sx=a.x+95,sy=a.y+a.height,tx=b.x+95,ty=b.y;const d=back?`M${a.x},${a.y+a.height/2} H18 V${b.y+b.height/2} H${b.x}`:`M${sx},${sy} C${sx},${sy+42} ${tx},${ty-42} ${tx},${ty}`;const lx=back?24:(sx+tx)/2+8,ly=back?(a.y+b.y)/2:(sy+ty)/2;return `<g class="activity-edge ${e.tone}"><path d="${d}" fill="none" stroke="${color}" stroke-width="${e.tone==='added'||e.tone==='removed'?3:1.5}" ${e.tone==='removed'||e.tone==='context'?'stroke-dasharray="6 4"':''} marker-end="url(#${marker(e.tone)})"/><text x="${lx}" y="${ly}" text-anchor="start" fill="${color}" font-size="12">${esc(e.label)}</text><title>${esc(e.label+' · '+e.fact)}</title></g>`;}).join('');

 const nodes=graph.nodes.map(n=>{const lines=flowLabelLines(n.label),color=colors[n.tone],h=Math.max(64,lines.length*16+24);return `<g role="button" tabindex="0" class="activity-node" data-behavior-node="${esc(n.fact)}" data-behavior-facts="${esc(JSON.stringify(n.facts))}" aria-pressed="false" data-story-index="${index}" aria-label="${esc(n.label+' · inspect evidence')}" transform="translate(${n.x},${n.y})"><rect width="190" height="${h}" rx="10" fill="var(--panel)" stroke="${color}" stroke-width="2" ${n.tone==='removed'?'stroke-dasharray="3 4"':''}/><text x="95" y="${h/2-(lines.length-1)*8+4}" text-anchor="middle" fill="var(--ink)" font-size="16">${lines.map((line,i)=>`<tspan x="95" dy="${i?16:0}">${esc(line)}</tspan>`).join('')}</text><title>${esc(n.label+' · '+n.kind+' · select to inspect recorded graph fact')}</title></g>`;}).join('');
 return `<div class="activity-toolbar"><span><b>Behavior flow</b> · Changes overlaid</span><span><button type="button" data-flow-zoom="out" aria-label="Zoom out">−</button><button type="button" data-flow-zoom="in" aria-label="Zoom in">+</button><button type="button" data-flow-zoom="fit">Fit</button></span></div><div class="activity-legend"><span class="before">━ Before</span><span class="after">━ After</span><span>━ Recorded in both</span><span>┄ Current-revision context</span></div><div class="behavior-graph activity-canvas"><svg viewBox="0 0 ${graph.width} ${graph.height}" preserveAspectRatio="xMinYMin meet" role="group" aria-label="Behavior flow chart with before and after changes"><defs>${markers}</defs>${edges}${nodes}</svg></div><p class="note">${graph.nodes.some(n=>n.kind==='state')?'Arrows show recorded allowed-state transitions; connected states do not prove call order or runtime reachability. Current-revision context is not baseline evidence.':'Arrows show recorded value bindings, calls, or compensation relationships—not a runtime execution sequence.'} Select a node for graph evidence. Zoom and scroll to explore.</p>`;
}
