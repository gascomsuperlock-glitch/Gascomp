import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {test} from 'node:test';
const state={authenticated:false,reads:0,updates:0,videos:0,deletes:0};globalThis.careAdminTest=state;
const hooks=registerHooks({resolve(s,c,n){
 if(s==='server-only')return {url:'data:text/javascript,export {};',shortCircuit:true};
 if(s==='@/features/auth/server/session')return {url:'data:text/javascript,export async function getAdminSession(){return globalThis.careAdminTest.authenticated}',shortCircuit:true};
 if(s==='./report-store')return {url:'data:text/javascript,'+encodeURIComponent(`export async function deleteCareDirectReport(){globalThis.careAdminTest.deletes++;if(globalThis.careAdminTest.failDelete)throw new Error('Storage failed')} export async function listCareDirectReports(){globalThis.careAdminTest.reads++;return []} export async function updateCareDirectStatus(id,status){globalThis.careAdminTest.updates++;return id==='missing'?null:{id,status}} export async function streamCareDirectVideo(){globalThis.careAdminTest.videos++;return new Response('private')}`),shortCircuit:true};
 return n(s,c);
}});
const {deleteCareDirectReportRoute,getCareDirectReports,patchCareDirectReport,getCareDirectVideo}=await import('./admin-route.ts');hooks.deregister();
function request(body='{"status":"resolved"}',origin='https://support.test'){return new Request('https://support.test/admin/care-direct/reports/id',{method:'PATCH',headers:{origin,'content-type':'application/json'},body});}
test('all admin endpoints reject missing sessions before reading or writing customer records',async()=>{assert.equal((await getCareDirectReports()).status,401);assert.equal((await patchCareDirectReport(request(),'id')).status,401);assert.equal((await getCareDirectVideo(new Request('https://support.test/video'),'id')).status,401);assert.deepEqual(state,{authenticated:false,reads:0,updates:0,videos:0,deletes:0});});
test('admin changes enforce origin, bounded body, valid status and existence',async()=>{state.authenticated=true;assert.equal((await patchCareDirectReport(request(undefined,'https://evil.test'),'id')).status,403);assert.equal((await patchCareDirectReport(request('{"status":"closed"}'),'id')).status,400);assert.equal((await patchCareDirectReport(request('x'.repeat(1025)),'id')).status,413);assert.equal(state.updates,0);assert.equal((await patchCareDirectReport(request(),'missing')).status,404);const response=await patchCareDirectReport(request(),'CD-id');assert.equal(response.status,200);assert.deepEqual(await response.json(),{report:{id:'CD-id',status:'resolved'}});assert.equal(response.headers.get('cache-control'),'private, no-store');});

test('deletion requires a session, same origin and valid ID; failures are retryable',async()=>{
 const id='CD-7a338492-4907-4629-89a0-8195b3897b36';
 const req=(origin='https://support.test')=>new Request('https://support.test/admin/care-direct/reports/'+id,{method:'DELETE',headers:{origin}});
 state.authenticated=false;assert.equal((await deleteCareDirectReportRoute(req(),id)).status,401);
 state.authenticated=true;assert.equal((await deleteCareDirectReportRoute(req('https://evil.test'),id)).status,403);
 assert.equal((await deleteCareDirectReportRoute(req(),'invalid')).status,404);assert.equal(state.deletes,0);
 state.failDelete=true;assert.equal((await deleteCareDirectReportRoute(req(),id)).status,503);
 state.failDelete=false;const response=await deleteCareDirectReportRoute(req(),id);assert.equal(response.status,204);assert.equal(response.headers.get('cache-control'),'private, no-store');
});
