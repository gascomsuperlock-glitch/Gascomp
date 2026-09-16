import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
const state = {active:0,peak:0,uploads:[],metadata:[],removed:[],deleted:[],fail:false};
const delay = () => new Promise(resolve => setTimeout(resolve,10));
const client = {
  from(table) {return {
    select(){return this;},order(){return this;},eq(){return this;},limit(){return this;},
    async range(){return {data:[]};},async maybeSingle(){return {data:null};},
    async insert(rows){if(table==='warranty_evidence') state.metadata.push(rows);return {};},
    delete(){return {eq:async(_key,id)=>{assert.equal(state.active,0);state.deleted.push(id);return {};}};}
  };},
  storage:{from(){return {
    async upload(path,file){state.active++;state.peak=Math.max(state.peak,state.active);state.uploads.push(path);assert.ok(file instanceof File);await delay();state.active--;return state.fail&&path.includes('/photo-1-')?{error:new Error('Upload failed')}:{};},
    async remove(paths){assert.equal(state.active,0);state.removed.push(...paths);return {};}
  };}}
};
globalThis.claimSaveClient=client;
const hooks=registerHooks({resolve(s,c,n){
  if(s==='server-only')return {url:'data:text/javascript,export {};',shortCircuit:true};
  if(s.endsWith('/integrations/supabase/server'))return {url:'data:text/javascript,export const createAdminSupabaseClient=()=>globalThis.claimSaveClient;',shortCircuit:true};
  if(s.startsWith('.')){const url=new URL(s+'.ts',c.parentURL);if(existsSync(url))return {url:url.href,shortCircuit:true};}
  return n(s,c);
}});
const {saveSupabaseTicket}=await import('./supabase-ticket-store.ts');
hooks.deregister();
const file=(name,size,type)=>new File([new Uint8Array(size)],name,{type});
const input={name:'Local test',email:'test@example.invalid',whatsapp:'08123456789',product:'Local test',sku:'LOCAL',store:'Local',purchaseDate:'2026-09-16',orderNumber:'LOCAL-ONLY',purchasePrice:100,problem:'Synthetic test only',invoice:file('invoice.png',1,'image/png'),damagePhotos:[1,2,3,4].map(i=>file('photo'+i+'.png',2,'image/png')),damageVideo:file('video.mp4',50,'video/mp4')};
test('save starts the largest evidence first, caps concurrency and batches metadata after uploads',async()=>{
 const result=await saveSupabaseTicket(input,'GWC-20260916-ABC123',new Date().toISOString());
 assert.equal(state.peak,3);
 assert.match(state.uploads[0],/\/video-/);
 assert.equal(state.uploads.length,6);
 assert.equal(state.metadata.length,1);
 assert.equal(state.metadata[0].length,6);
 assert.equal(result.evidence.length,6);
 assert.equal(state.removed.length,0);
});
test('failed evidence upload waits for active work then removes attempted files and its own ticket',async()=>{
 state.fail=true;state.uploads=[];state.metadata=[];
 await assert.rejects(saveSupabaseTicket(input,'GWC-20260916-DEF456',new Date().toISOString()),/Upload failed/);
 assert.equal(state.metadata.length,0);
 assert.deepEqual(state.removed.sort(),state.uploads.sort());
 assert.deepEqual(state.deleted,['GWC-20260916-DEF456']);
});
