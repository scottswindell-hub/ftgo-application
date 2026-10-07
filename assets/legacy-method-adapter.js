/* Bridge the original service terrain and provenance explorer into the live review. */
(function(root){
'use strict';
let activeState={},activePacket=null,rerender=()=>{};
root.esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
root.reviewState=()=>activeState;
root.render=()=>rerender();
function patch(file){let selected=false;return String(activePacket?.source_diff?.content||'').split('\n').filter(line=>{if(line.startsWith('diff --git '))selected=line===`diff --git a/${file} b/${file}`;return selected;}).join('\n');}
function markup(packet,state){
 activeState=state;activePacket=packet;
 const workflows=packet?.explorer?.workflows?.workflows||[],map=packet?.explorer?.governance?.holon_map,terrain=packet?.explorer?.terrain;
 if(!terrain||!map||!workflows.length)return '<p>The original method explorer needs the recorded terrain, method mappings, and workflow artifacts.</p>';
 const selected=workflows.find(w=>w.id===state.governedArea)||workflows.find(w=>w.impact_status==='direct_change')||workflows[0];state.governedArea=selected.id;
 const doc={...packet.governed_objectives,territory:terrain,holon_map:map,customer_workflows:packet.explorer.workflows,source_packet:packet};
 return `<section class="legacy-method-explorer" data-review-scope="restored-methods"><label class="legacy-workflow-picker">Workflow lens <select data-workflow-select>${workflows.map(w=>`<option value="${esc(w.id)}" ${w.id===selected.id?'selected':''}>${esc(w.name)}</option>`).join('')}</select></label>${workflowMethodImpactMarkup(doc,selected,workflows,state)}</section>`;
}
function hydrate(){
 const board=document.querySelector('.legacy-method-explorer');if(!board)return;
 for(const element of board.querySelectorAll('[data-governed-source-file]')){
  const text=patch(element.dataset.governedSourceFile);const pre=document.createElement('pre');pre.textContent=text||'No changed-file patch was recorded for this baseline source.';element.replaceChildren(pre);
 }
 const id=activeState.governedMethod,inspector=board.querySelector('.workflow-holon-inspector');
 if(id&&inspector){
  const method=activePacket?.explorer?.governance?.holon_map?.methods?.find(m=>m.id===id);
  const witnesses=(activePacket?.explorer?.workflows?.workflows||[]).flatMap(w=>(w.obligations||[]).flatMap(o=>(o.evidence||[]).filter(e=>e.method_id===id).map(e=>({workflow:w.id,obligation:o.id,...e}))));
  const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Recorded method provenance';pre.textContent=JSON.stringify({method_id:id,baseline_commit:activePacket.baseline_commit,candidate_commit:activePacket.head_commit,governance_version:activePacket.provenance?.governance_version_id,method,workflow_witnesses:witnesses},null,2);details.append(summary,pre);inspector.append(details);
 }
}
root.legacyMethodExplorer={markup,hydrate,setRender(fn){rerender=fn;}};
})(window);
