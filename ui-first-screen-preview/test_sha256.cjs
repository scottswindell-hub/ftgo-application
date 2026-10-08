const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

const context=vm.createContext({crypto:undefined});
vm.runInContext(fs.readFileSync(path.join(__dirname,'assets/sha256.js'),'utf8'),context);

test('fallback verifies artifacts when Web Crypto is unavailable',async()=>{
 const bytes=Uint8Array.from([97,98,99]);
 assert.equal(await context.reviewSha256(bytes),
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('empty artifact digest is stable',async()=>{
 assert.equal(await context.reviewSha256(new Uint8Array()),
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});
