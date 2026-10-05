/* Fetch saved review detail only; this helper never starts analysis or model work. */
async function loadPinnedDetail(reference, expected, schema, limit=524288){
 const unavailable=reason=>({available:false,reason});
 try{
  const url=new URL(reference.url,location.href);
  if(url.origin!==location.origin)throw Error('Detail must be same-origin.');
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw Error('Saved detail unavailable (HTTP '+response.status+').');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength>limit)throw Error('Saved detail exceeds 512 KiB.');
  const digest=await reviewSha256(bytes);
  if(digest!==reference.sha256)throw Error('Saved detail checksum mismatch.');
  const value=JSON.parse(new TextDecoder().decode(bytes));
  if(value.schema!==schema||!value.identity||Object.keys(expected).some(key=>value.identity[key]!==expected[key]))throw Error('Saved detail belongs to another run.');
  return {available:true,value};
 }catch(error){return unavailable(error.message||'Saved detail unavailable.');}
}

if(typeof module!=='undefined')module.exports={loadPinnedDetail};
