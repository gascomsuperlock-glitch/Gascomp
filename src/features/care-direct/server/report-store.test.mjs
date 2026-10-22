import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const hooks=registerHooks({resolve(s,c,n){if(s==='./video-response')return n('./video-response.ts',c);if(s==='server-only')return {url:'data:text/javascript,export {};',shortCircuit:true};if(s==='@/shared/integrations/supabase/server')return {url:'data:text/javascript,export function createAdminSupabaseClient(){return null}',shortCircuit:true};return n(s,c);}});
const {deleteCareDirectReport,saveCareDirectReport,listCareDirectReports,updateCareDirectStatus,streamCareDirectVideo,SubmissionConflict}=await import('./report-store.ts');hooks.deregister();
test('concurrent identical submissions commit once, retry preserves status, conflicts cannot overwrite evidence',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'care-store-')); const cwd=process.cwd();process.chdir(dir);
 try {
 const input={name:'Test',problem:'Problem',whatsapp:'628123456789',orderNumber:'ORDER',submissionId:'7a338492-4907-4629-89a0-8195b3897b36'};
 const video=new File(['video bytes'],'video.mp4');
 const reports=await Promise.all(Array.from({length:5},()=>saveCareDirectReport(input,video,'video/mp4')));
 assert.equal(new Set(reports.map(r=>r.id)).size,1);assert.equal((await listCareDirectReports()).length,1);
 assert.equal((await readdir(path.join(dir,'.data/care-direct',reports[0].id))).length,1);
 await updateCareDirectStatus(reports[0].id,'resolved');assert.equal((await saveCareDirectReport(input,video,'video/mp4')).status,'resolved');
 await assert.rejects(saveCareDirectReport({...input,problem:'Changed'},video,'video/mp4'),SubmissionConflict);
 assert.equal(await (await streamCareDirectVideo(new Request('http://localhost/video'),reports[0].id)).text(),'video bytes');
 assert.equal(await streamCareDirectVideo(new Request('http://localhost/video'),'../../secret'),null);
 const ranged=await streamCareDirectVideo(new Request('http://localhost/video',{headers:{range:'bytes=2-5'}}),reports[0].id);
 assert.equal(ranged.status,206);assert.equal(await ranged.text(),'deo ');
 const head=await streamCareDirectVideo(new Request('http://localhost/video',{method:'HEAD'}),reports[0].id);assert.equal(head.body,null);assert.equal(head.headers.get('content-length'),'11');
 assert.ok(!('storagePath' in reports[0]));assert.ok(!('fingerprint' in reports[0]));
 await Promise.all([updateCareDirectStatus(reports[0].id,'new'),deleteCareDirectReport(reports[0].id),updateCareDirectStatus(reports[0].id,'resolved')]);
 assert.equal((await listCareDirectReports()).length,0);
 assert.equal(await streamCareDirectVideo(new Request('http://localhost/video'),reports[0].id),null);
 await assert.rejects(readdir(path.join(dir,'.data/care-direct',reports[0].id)),{code:'ENOENT'});
 await deleteCareDirectReport(reports[0].id);
 assert.equal(await updateCareDirectStatus(reports[0].id,'new'),null);
 }finally{process.chdir(cwd);await rm(dir,{recursive:true,force:true});}
});
test('production does not silently fall back to local persistence',async()=>{const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(listCareDirectReports(),/not configured/);}finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}});
