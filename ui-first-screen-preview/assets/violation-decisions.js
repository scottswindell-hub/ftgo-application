/* Decide a rule violation on the pull request, by one person with write access.

A real violation: comment `/reject -- reason`, and the PR is closed.
A false detection: comment `/false-positive F-xxxxxxxx -- reason` (optionally
`match="text"`), which commits a rule exception to the PR's
.codeintent/rule-exceptions.yaml and re-runs the checks. The workflow
codeintent-violations.yml records both in the governance ledger. Commands are offered only for runs the ledger
recorded (`governance_run_id`), and only on violations: findings of failed checks. */
function decisionsEnabled(doc){return Boolean(doc&&doc.governance_run_id);}

function decisionEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function decisionCopyButton(command,label){
 return `<button type="button" class="decision-copy" data-copy="${decisionEscape(command)}" aria-label="${decisionEscape(label)}">Copy</button>`;
}

function violationControlMarkup(f,doc,failed=true){
 if(!f||!f.ref||!failed||!decisionsEnabled(doc))return '';
 const ref=decisionEscape(f.ref);
 if(doc&&doc.violation_status==='rejected')return `<p class="std-reject"><b>Rejected:</b> this violation was confirmed and the pull request was closed.</p>`;
 if(f.decision==='rule_change_requested')
  return `<p class="std-reject"><b>${ref}</b> · Reported as a false detection: a rule exception is committed to this pull request, and the checks re-run.</p>`;
 const reject='/reject -- ',fix=`/false-positive ${f.ref} -- `;
 return `<p class="std-reject">Someone with write access decides this violation:</p><ul class="std-reject">`+
  `<li>Real violation: <code>${decisionEscape(reject)}reason</code>${decisionCopyButton(reject,'Copy the reject command')} closes this pull request.</li>`+
  `<li>False detection: <code>${decisionEscape(fix)}reason</code>${decisionCopyButton(fix,'Copy the false-positive command for '+f.ref)} requests a fix to the rule.</li></ul>`;
}

function findingItemMarkup(f,doc,failed=true){
 const title=f.name||f.title||f.observation||f.message||f.category||'Finding';
 const where=f.file?`<p class="std-where"><code>${decisionEscape(f.file)}${f.line?':'+decisionEscape(f.line):''}</code>${f.unit?' · '+decisionEscape(f.unit):''}</p>`:'';
 return `<div class="std-item"><div class="std-head"><span class="pill ${failed?'red':'amber'}">${failed?'Rule violation':'Finding'}</span><span>${decisionEscape(title)}</span></div>${where}${violationControlMarkup(f,doc,failed)}</div>`;
}

if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const button=event.target.closest&&event.target.closest('button.decision-copy');
 if(!button)return;
 event.preventDefault();event.stopPropagation();
 const done=()=>{button.textContent='Copied';setTimeout(()=>{button.textContent='Copy';},1500);};
 try{navigator.clipboard.writeText(button.dataset.copy).then(done,()=>{button.textContent='Select and copy';});}
 catch(_){button.textContent='Select and copy';}
},true);

if(typeof module!=='undefined')module.exports={decisionsEnabled,violationControlMarkup,findingItemMarkup};
