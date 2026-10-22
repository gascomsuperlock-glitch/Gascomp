import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {test} from 'node:test';
const state={rows:new Map(),objects:new Map(),insertFailure:false,ambiguous:false,uploadFailure:false};
const client = {
  from() {
    return {
      delete() { return {async eq(_,id){if(state.deleteFailure)return {error:new Error('Delete failed')};state.rows.delete(id);return {error:null}}}; },
      select() { return { eq(_, id) { return { async maybeSingle() { return { data: state.rows.has(id) ? { record: state.rows.get(id) } : null, error: null }; } }; } }; },
      async insert({ id, record }) {
        if (state.insertFailure) throw new Error('Insert failed');
        if (state.rows.has(id)) return { error: new Error('Duplicate') };
        state.rows.set(id, record);
        if (state.ambiguous) throw new Error('Response lost');
        return { error: null };
      },
    };
  },
  storage: {
    from() { return {
      async upload(key, bytes) { state.objects.set(key, bytes); if (state.uploadFailure) throw new Error('Upload failed'); return { error: null }; },
      async createSignedUrl(key) { return {data:{signedUrl:`https://storage.test/${key}?token=private`},error:null}; },
      async remove(keys) { if(state.removeFailure)return {error:new Error("Remove failed")}; for (const key of keys) state.objects.delete(key); return { error: null }; },
    }; },
  },
};
globalThis.careStoreClient=client;
const hooks=registerHooks({resolve(s,c,n){if(s==='./video-response')return n('./video-response.ts',c);if(s==='server-only')return {url:'data:text/javascript,export {};',shortCircuit:true};if(s==='@/shared/integrations/supabase/server')return {url:'data:text/javascript,export function createAdminSupabaseClient(){return globalThis.careStoreClient}',shortCircuit:true};return n(s,c);}});
const {deleteCareDirectReport,saveCareDirectReport,streamCareDirectVideo}=await import('./report-store.ts');hooks.deregister();
const input={name:'Test',problem:'Problem',whatsapp:'628123456789',orderNumber:'ORDER',submissionId:'7a338492-4907-4629-89a0-8195b3897b36'};
const video=new File(['video bytes'],'video.mp4');
function reset(){state.deleteFailure=false;state.removeFailure=false;state.rows.clear();state.objects.clear();state.insertFailure=false;state.ambiguous=false;state.uploadFailure=false;}
test('concurrent remote attempts retain exactly the winning evidence',async()=>{reset();const reports=await Promise.all(Array.from({length:5},()=>saveCareDirectReport(input,video,'video/mp4')));assert.equal(new Set(reports.map(r=>r.id)).size,1);assert.equal(state.rows.size,1);assert.equal(state.objects.size,1);assert.ok(state.objects.has([...state.rows.values()][0].storagePath));});
test('metadata failure and thrown upload failures remove attempted evidence',async()=>{for(const kind of ['insertFailure','uploadFailure']){reset();state[kind]=true;await assert.rejects(saveCareDirectReport(input,video,'video/mp4'));assert.equal(state.rows.size,0);assert.equal(state.objects.size,0);}});
test('lost insert confirmation recovers a committed report without deleting its video',async()=>{reset();state.ambiguous=true;const report=await saveCareDirectReport(input,video,'video/mp4');assert.equal(report.id,`CD-${input.submissionId}`);assert.equal(state.rows.size,1);assert.equal(state.objects.size,1);});

test('private range proxy streams bytes, keeps signed URLs server-side and propagates cancellation',async()=>{
 reset();await saveCareDirectReport(input,video,'video/mp4');
 const originalFetch=globalThis.fetch;let cancelled=false;
 globalThis.fetch=async(url,options)=>{
  assert.ok(String(url).includes('token=private'));assert.equal(options.headers.Range,'bytes=2-5');
  return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('deo '));},cancel(){cancelled=true;}}),{status:206,headers:{'content-range':'bytes 2-5/11'}});
 };
 try {
  const response=await streamCareDirectVideo(new Request('https://support.test/video',{headers:{range:'bytes=2-5'}}),`CD-${input.submissionId}`);
  assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 2-5/11');assert.equal(response.headers.get('location'),null);
  const reader=response.body.getReader();assert.equal(new TextDecoder().decode((await reader.read()).value),'deo ');await reader.cancel();assert.equal(cancelled,true);
 }finally{globalThis.fetch=originalFetch;}
});

test('deletion removes only its own evidence and is safe to repeat',async()=>{
 reset();const report=await saveCareDirectReport(input,video,'video/mp4');state.objects.set('unrelated','keep');
 await deleteCareDirectReport(report.id);await deleteCareDirectReport(report.id);
 assert.equal(state.rows.size,0);assert.deepEqual([...state.objects.keys()],['unrelated']);
});
test('storage failure preserves the report and evidence for retry',async()=>{
 reset();const report=await saveCareDirectReport(input,video,'video/mp4');state.removeFailure=true;
 await assert.rejects(deleteCareDirectReport(report.id));assert.equal(state.rows.size,1);assert.equal(state.objects.size,1);
 state.removeFailure=false;await deleteCareDirectReport(report.id);assert.equal(state.rows.size,0);assert.equal(state.objects.size,0);
});
test('metadata deletion failure can be retried after evidence is already removed',async()=>{
 reset();const report=await saveCareDirectReport(input,video,'video/mp4');state.deleteFailure=true;
 await assert.rejects(deleteCareDirectReport(report.id));assert.equal(state.rows.size,1);assert.equal(state.objects.size,0);
 state.deleteFailure=false;await deleteCareDirectReport(report.id);assert.equal(state.rows.size,0);
});
