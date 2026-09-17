import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {after,beforeEach,test} from 'node:test';
const state={primaryCalls:0,previewCalls:[],previewError:false,primaryAvailable:true};
globalThis.assistanceDatabaseRoutingTest=state;
const mock=source=>({url:`data:text/javascript,${encodeURIComponent(source)}`,shortCircuit:true});
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return mock('export {};');
 if(specifier==='@supabase/supabase-js')return mock('export const createClient=(...args)=>{globalThis.assistanceDatabaseRoutingTest.previewCalls.push(args);return {rpc:async()=>{if(globalThis.assistanceDatabaseRoutingTest.previewError)throw new Error("Local database unavailable");return {data:"preview",error:null};}};};');
 if(specifier==='@/shared/integrations/supabase/server')return mock('export const createAdminSupabaseClient=()=>{globalThis.assistanceDatabaseRoutingTest.primaryCalls++;return globalThis.assistanceDatabaseRoutingTest.primaryAvailable?{rpc:async()=>({data:"primary",error:null})}:null;};');
 if(specifier==='./preview-database')return next('./preview-database.ts',context);
 return next(specifier,context);
}});
const {assistanceDatabase}=await import('./database.ts');hooks.deregister();
const original=Object.fromEntries(['NODE_ENV','GASCOMP_AI_PREVIEW_URL','GASCOMP_AI_PREVIEW_KEY'].map(key=>[key,process.env[key]]));
beforeEach(()=>{
 Object.assign(state,{primaryCalls:0,previewCalls:[],previewError:false,primaryAvailable:true});
 process.env.NODE_ENV='development';process.env.GASCOMP_AI_PREVIEW_URL='http://127.0.0.1:54330';process.env.GASCOMP_AI_PREVIEW_KEY='local-test-key';
});
after(()=>{for(const [key,value]of Object.entries(original)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
test('assistant preview connects only to the local bridge with session persistence disabled',async()=>{
 assert.equal((await assistanceDatabase().rpc('gascomp_ai_command')).data,'preview');assert.equal(state.primaryCalls,0);
 assert.deepEqual(state.previewCalls,[['http://127.0.0.1:54330','local-test-key',{auth:{autoRefreshToken:false,persistSession:false}}]]);
});
test('preview outage never falls through to the primary database',async()=>{
 state.previewError=true;await assert.rejects(assistanceDatabase().rpc('gascomp_ai_command'),/unavailable/);assert.equal(state.primaryCalls,0);assert.equal(state.previewCalls.length,1);
});
test('broken or partial preview config never opens the primary connection',()=>{
 process.env.GASCOMP_AI_PREVIEW_URL='https://unexpected.example';assert.throws(()=>assistanceDatabase(),/unavailable/);
 delete process.env.GASCOMP_AI_PREVIEW_URL;assert.throws(()=>assistanceDatabase(),/unavailable/);
 assert.equal(state.primaryCalls,0);assert.equal(state.previewCalls.length,0);
});
test('production always uses the existing primary database despite preview environment variables',async()=>{
 process.env.NODE_ENV='production';assert.equal((await assistanceDatabase().rpc('gascomp_ai_command')).data,'primary');assert.equal(state.primaryCalls,1);assert.equal(state.previewCalls.length,0);
});
test('unconfigured development uses the primary database and unavailable primary fails closed',async()=>{
 delete process.env.GASCOMP_AI_PREVIEW_URL;delete process.env.GASCOMP_AI_PREVIEW_KEY;
 assert.equal((await assistanceDatabase().rpc('gascomp_ai_command')).data,'primary');
 state.primaryAvailable=false;assert.throws(()=>assistanceDatabase(),/unavailable/);assert.equal(state.previewCalls.length,0);
});
