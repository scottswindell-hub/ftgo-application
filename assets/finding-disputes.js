/* Reject any finding on the pull request; its owner withdraws or upholds it.

Every published finding carries a reference (`ref`, F-xxxxxxxx). People reject
one with a PR comment `/reject F-xxxxxxxx -- reason`; an owner answers with
`/withdraw` or `/uphold` (webhook_receiver.py, finding_disputes.py). The
controls appear only when the run is recorded in the governance ledger
(`governance_run_id`): without it a rejection cannot be recorded, so none is
offered. */
function disputesEnabled(doc){return Boolean(doc&&doc.governance_run_id);}

function disputeEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function disputeCopyButton(command,label){
 return `<button type="button" class="dispute-copy" data-copy="${disputeEscape(command)}" aria-label="${disputeEscape(label)}">Copy</button>`;
}

function rejectControlMarkup(f,doc){
 if(!f||!f.ref||!disputesEnabled(doc))return '';
 const ref=disputeEscape(f.ref);
 const owner=f.owner?disputeEscape(f.owner):'';
 if(f.dispute_status==='withdrawn')return `<p class="std-reject"><b>${ref}</b> · Withdrawn by its owner after a dispute. It no longer counts.</p>`;
 if(f.dispute_status==='disputed'){
  const withdraw=`/withdraw ${f.ref} -- `,uphold=`/uphold ${f.ref} -- `;
  return `<p class="std-reject"><b>${ref}</b> · Disputed: waiting for ${owner||'the owner'} to withdraw or uphold it. It still counts until then.</p>`+
   `<p class="std-reject">Owner: comment <code>${disputeEscape(withdraw)}reason</code>${disputeCopyButton(withdraw,'Copy the withdraw command for '+f.ref)}`+
   ` or <code>${disputeEscape(uphold)}reason</code>${disputeCopyButton(uphold,'Copy the uphold command for '+f.ref)}</p>`;
 }
 const reject=`/reject ${f.ref} -- `;
 const upheld=f.dispute_status==='upheld'?' Upheld by its owner after an earlier dispute.':'';
 return `<p class="std-reject">Disagree? Comment <code>${disputeEscape(reject)}your reason</code> on the pull request`+
  `${disputeCopyButton(reject,'Copy the reject command for '+f.ref)} · ${owner?owner+' decides':'the finding owner decides'}. It still counts until then.${upheld}</p>`;
}

function findingItemMarkup(f,doc){
 const title=f.name||f.title||f.observation||f.message||f.category||'Finding';
 const verdict=f.kind==='check_verdict';
 const where=f.file?`<p class="std-where"><code>${disputeEscape(f.file)}${f.line?':'+disputeEscape(f.line):''}</code>${f.unit?' · '+disputeEscape(f.unit):''}</p>`:'';
 return `<div class="std-item"><div class="std-head"><span class="pill ${verdict?'red':'amber'}">${verdict?'Check verdict':'Finding'}</span><span>${disputeEscape(title)}</span></div>${where}${rejectControlMarkup(f,doc)}</div>`;
}

function withdrawnFindingsMarkup(check,doc){
 const items=(check&&check.withdrawn_findings)||[];
 if(!items.length)return '';
 return `<h4>Withdrawn after a dispute</h4><p class="note">Their owner withdrew these; they no longer count.</p>${items.map(f=>findingItemMarkup(f,doc)).join('')}`;
}

function checkVerdictControlMarkup(check,doc){
 return ((check&&check.findings)||[]).filter(f=>f.kind==='check_verdict').map(f=>rejectControlMarkup(f,doc)).join('');
}

if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const button=event.target.closest&&event.target.closest('button.dispute-copy');
 if(!button)return;
 event.preventDefault();event.stopPropagation();
 const done=()=>{button.textContent='Copied';setTimeout(()=>{button.textContent='Copy';},1500);};
 try{navigator.clipboard.writeText(button.dataset.copy).then(done,()=>{button.textContent='Select and copy';});}
 catch(_){button.textContent='Select and copy';}
},true);

if(typeof module!=='undefined')module.exports={disputesEnabled,rejectControlMarkup,findingItemMarkup,withdrawnFindingsMarkup,checkVerdictControlMarkup};
