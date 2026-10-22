import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {test} from 'node:test';
const state={container:true,inspection:'valid',saved:0};globalThis.careSubmissionTest=state;
const hooks=registerHooks({resolve(s,c,n){
 if(s==='server-only')return {url:'data:text/javascript,export {};',shortCircuit:true};
 if(s==='../model/input')return n('../model/input.ts',c);
 if(s==='./types')return n('./types.ts',c);
 if(s==='@/shared/media/video-evidence')return {url:'data:text/javascript,'+encodeURIComponent('export const UNREADABLE_VIDEO_ERROR="Unreadable",UNSUPPORTED_VIDEO_ERROR="Unsupported";export async function detectVideoContainer(){return globalThis.careSubmissionTest.container?{mimeType:"video/mp4"}:null}'),shortCircuit:true};
 if(s==='@/shared/media/server/video-inspection')return {url:'data:text/javascript,export async function inspectVideo(){return globalThis.careSubmissionTest.inspection}',shortCircuit:true};
 if(s==='./report-store')return {url:'data:text/javascript,'+encodeURIComponent('export class SubmissionConflict extends Error{};export async function saveCareDirectReport(){globalThis.careSubmissionTest.saved++;return {id:"CD-test"}}'),shortCircuit:true};
 return n(s,c);
}});
const {createCareDirectReport}=await import('./submission.ts');hooks.deregister();
function form(){const f=new FormData();for(const [k,v]of Object.entries({name:'Test',problem:'Problem',whatsapp:'08123456789',orderNumber:'ORDER',agreeNoReturn:'true',agreeNoReview:'true',submissionId:'7a338492-4907-4629-89a0-8195b3897b36'}))f.set(k,v);f.set('video',new File(['video'],'video.mp4'));return f;}
test('unsupported, corrupt or unverifiable videos never create a report',async()=>{state.container=false;assert.equal((await createCareDirectReport(form())).status,400);state.container=true;for(const inspection of ['invalid','unavailable','timeout']){state.inspection=inspection;assert.equal((await createCareDirectReport(form())).status,inspection==='invalid'?400:503);}assert.equal(state.saved,0);state.inspection='valid';const result=await createCareDirectReport(form());assert.deepEqual(result,{status:200,body:{success:true,reportId:'CD-test'}});assert.equal(state.saved,1);});

test('honeypot submissions are rejected without storage',async()=>{const before=state.saved;const f=form();f.set('company','bot');assert.equal((await createCareDirectReport(f)).status,400);assert.equal(state.saved,before);});

test('missing, false and duplicated agreements are rejected before persistence',async()=>{
 for(const key of ['agreeNoReturn','agreeNoReview'])for(const mode of ['missing','false','duplicate']){
  const f=form(),before=state.saved;
  if(mode==='missing')f.delete(key);else if(mode==='false')f.set(key,'false');else f.append(key,'true');
  const result=await createCareDirectReport(f);assert.equal(result.status,400);assert.ok(result.body.fieldErrors[key]);assert.equal(state.saved,before);
 }
});
