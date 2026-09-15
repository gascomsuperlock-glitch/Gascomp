import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return {url:'data:text/javascript,export{}',shortCircuit:true};
  if(specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) return next(specifier+'.ts',context);
  return next(specifier,context);
}});
const previous=process.cwd();const root=await mkdtemp(path.join(tmpdir(),'ticket-deletion-'));process.chdir(root);
const store=await import('./local-ticket-store.ts');process.chdir(previous);hooks.deregister();
test('deleted local tickets leave the inbox and evidence access but still prevent repeat claims',async()=>{
  try {
    const id='GWC-20260915-ABCDEF';
    const dir=path.join(root,'.data','warranty-tickets',id);await mkdir(dir,{recursive:true});
    await writeFile(path.join(dir,'ticket.json'),JSON.stringify({ticketId:id,submittedAt:new Date().toISOString(),product:{sku:'SKU-1'},purchase:{orderNumber:'ORDER-1'},evidence:[]}));
    assert.equal((await store.listLocalTickets()).length,1);
    await store.deleteLocalTicket(id);
    assert.equal((await store.listLocalTickets()).length,0);
    assert.equal((await store.listLocalTickets(true)).length,1);
    assert.equal(await store.readLocalEvidence(id,'invoice'),null);
    assert.ok(JSON.parse(await readFile(path.join(dir,'ticket.json'),'utf8')).deletedAt);
    await assert.rejects(store.saveLocalTicket({sku:'sku-1',orderNumber:' order-1 '},'GWC-20260915-000000',new Date().toISOString()),/already exists/);
  } finally {await rm(root,{recursive:true,force:true});}
});
