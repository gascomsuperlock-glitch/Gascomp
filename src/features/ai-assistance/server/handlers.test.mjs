import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
import {beforeEach,test} from 'node:test';
const state={admin:false,token:null,writes:[],calls:[],result:{data:{messages:[],pending:false,availability:'offline',greeting:null,handoff:null},error:null}};
globalThis.assistanceHandlerTest=state;
const mock=source=>({url:`data:text/javascript,${encodeURIComponent(source)}`,shortCircuit:true});
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return mock('export {};');
  if(specifier==='next/headers')return mock('export const cookies=async()=>({get:()=>({value:globalThis.assistanceHandlerTest.token}),set:(...args)=>globalThis.assistanceHandlerTest.writes.push(args)});');
  if(specifier==='@/features/auth/server/session')return mock('export const getAdminSession=async()=>globalThis.assistanceHandlerTest.admin;');
  if(specifier==='./database')return mock('export const assistanceDatabase=()=>{if(globalThis.assistanceHandlerTest.databaseError)throw new Error(globalThis.assistanceHandlerTest.databaseError);return {rpc:async(...args)=>{globalThis.assistanceHandlerTest.calls.push(args);return globalThis.assistanceHandlerTest.result;}};};');
  if((specifier.startsWith('./')||specifier.startsWith('../'))&&!specifier.endsWith('.ts'))return next(`${specifier}.ts`,context);
  return next(specifier,context);
}});
const {handleSession,handleMessages,handleWorker,handleStatus}=await import('./handlers.ts');
hooks.deregister();
const request=(path,data={},headers={})=>new Request(`https://support.example.test/${path}`,{method:'POST',headers:{origin:'https://support.example.test','content-type':'application/json',...headers},body:JSON.stringify(data)});
beforeEach(()=>{process.env.GASCOMP_AI_ASSISTANCE_ENABLED='true';process.env.GASCOMP_AI_WORKER_TOKEN='a'.repeat(40);Object.assign(state,{admin:false,token:null,writes:[],calls:[],databaseError:null,result:{data:{messages:[],pending:false,availability:'offline',greeting:null,handoff:null},error:null}});});
test('disabled feature and cross-origin public writes do not reach persistence',async()=>{
 process.env.GASCOMP_AI_ASSISTANCE_ENABLED='false';assert.equal((await handleSession(request('api/ai-assistance/session',{language:'en'}))).status,404);
 process.env.GASCOMP_AI_ASSISTANCE_ENABLED='true';assert.equal((await handleSession(request('api/ai-assistance/session',{language:'en'},{origin:'https://evil.test'}))).status,403);assert.equal(state.calls.length,0);
});
test('session uses hashed opaque token and HttpOnly cookie; messages require cookie ownership',async()=>{
 assert.equal((await handleMessages(new Request('https://support.example.test/api/ai-assistance/messages'))).status,401);
 const response=await handleSession(request('api/ai-assistance/session',{language:'id'}));assert.equal(response.status,200);
 const [name,token,options]=state.writes[0];assert.equal(name,'gascomp_ai_session');assert.equal(options.httpOnly,true);assert.equal(options.sameSite,'strict');assert.equal(options.path,'/api/ai-assistance');assert.equal(token.length,43);
 assert.equal(state.calls[0][1].payload.tokenHash.length,64);assert.notEqual(state.calls[0][1].payload.tokenHash,token);
 state.token=token;
 assert.equal((await handleMessages(request('api/ai-assistance/messages',{requestId:'00000000-0000-4000-8000-000000000001',language:'en',text:'Question',tokenHash:'another'}))).status,400);
});
test('session reuses a valid cookie without rewriting it',async()=>{
 state.token='b'.repeat(43);
 const response=await handleSession(request('api/ai-assistance/session',{language:'en'}));
 assert.equal(response.status,200);assert.equal(state.writes.length,0);
 assert.equal(state.calls[0][1].action,'session');
 assert.equal(state.calls[0][1].payload.tokenHash,createHash('sha256').update(state.token).digest('hex'));
 assert.equal((await handleSession(request('api/ai-assistance/session',{language:'id',newConversation:false}))).status,200);
 assert.equal(state.writes.length,0);assert.equal(state.calls[1][1].payload.tokenHash,state.calls[0][1].payload.tokenHash);
});
test('new conversation creates a fresh server token and replaces the cookie only after persistence succeeds',async()=>{
 state.token='b'.repeat(43);
 const response=await handleSession(request('api/ai-assistance/session',{language:'id',newConversation:true}));
 assert.equal(response.status,200);assert.equal(state.writes.length,1);
 const [,token]=state.writes[0];assert.equal(token.length,43);assert.notEqual(token,state.token);
 assert.equal(state.calls[0][1].payload.tokenHash,createHash('sha256').update(token).digest('hex'));
});
test('invalid new-chat flags and client-controlled session identifiers are rejected',async()=>{
 assert.equal((await handleSession(request('api/ai-assistance/session',{language:'en',newConversation:'true'}))).status,400);
 assert.equal((await handleSession(request('api/ai-assistance/session',{language:'en',newConversation:true,sessionId:'chosen-by-client'}))).status,400);
 assert.equal(state.calls.length,0);assert.equal(state.writes.length,0);
});
test('failed or rate-limited new conversation never replaces the current cookie',async()=>{
 state.token='b'.repeat(43);state.result={data:null,error:{message:'database unavailable'}};
 assert.equal((await handleSession(request('api/ai-assistance/session',{language:'en',newConversation:true}))).status,503);
 assert.equal(state.writes.length,0);
 state.result={data:{error:'Too many requests.',status:429},error:null};
 assert.equal((await handleSession(request('api/ai-assistance/session',{language:'en',newConversation:true}))).status,429);
 assert.equal(state.writes.length,0);
});
test('worker token, result allowlist and body size protect queue and model output',async()=>{
 assert.equal((await handleWorker(request('worker/claim',{}),'claim')).status,401);
 const auth={authorization:`Bearer ${'a'.repeat(40)}`};
 assert.equal((await handleWorker(request('worker/complete',{jobId:'00000000-0000-4000-8000-000000000001',leaseToken:'00000000-0000-4000-8000-000000000002',knowledgeVersion:'a'.repeat(64),answerId:'known',text:'Invented model text'},auth),'complete')).status,400);
 assert.equal((await handleWorker(request('worker/claim',{text:'x'.repeat(9000)},auth),'claim')).status,413);assert.equal(state.calls.length,0);
});
test('worker completion accepts one strictly validated generated response mode',async()=>{
 const auth={authorization:`Bearer ${'a'.repeat(40)}`};
 const base={jobId:'00000000-0000-4000-8000-000000000001',leaseToken:'00000000-0000-4000-8000-000000000002',knowledgeVersion:'a'.repeat(64)};
 const response={text:'Check the power connection, then try another outlet.',kind:'answer',basis:'knowledge',sourceIds:['grs-01.power']};
 assert.equal((await handleWorker(request('worker/complete',{...base,response},auth),'complete')).status,200);
 assert.deepEqual(state.calls[0][1].payload.response,response);
 for(const payload of [
   {...base,answerId:'known',response},
   {...base},
   {...base,response:{...response,text:'Open https://example.com'}},
   {...base,response:{...response,text:'<b>unsafe</b>'}},
   {...base,response:{...response,basis:'general'}},
   {...base,response:{...response,sourceIds:['grs-01.power','grs-01.power']}},
 ]) assert.equal((await handleWorker(request('worker/complete',payload,auth),'complete')).status,400);
 assert.equal(state.calls.length,1);
});
test('worker completion accepts only a bounded non-empty resolved SKU hint',async()=>{
 const auth={authorization:`Bearer ${'a'.repeat(40)}`};
 const result={jobId:'00000000-0000-4000-8000-000000000001',leaseToken:'00000000-0000-4000-8000-000000000002',knowledgeVersion:'a'.repeat(64),answerId:'known'};
 assert.equal((await handleWorker(request('worker/complete',{...result,resolvedSku:'Product Model 01'},auth),'complete')).status,200);
 assert.equal(state.calls[0][1].payload.resolvedSku,'Product Model 01');
 for(const resolvedSku of ['', '   ', 'x'.repeat(101), 123, null]) {
   assert.equal((await handleWorker(request('worker/complete',{...result,resolvedSku},auth),'complete')).status,400);
 }
 assert.equal(state.calls.length,1);
});
test('invalid authenticated knowledge fails closed, retaining only database templates',async()=>{
 const response=await handleWorker(request('worker/knowledge',{ready:true,snapshot:{version:'bad',entries:[]}},{authorization:`Bearer ${'a'.repeat(40)}`}), 'knowledge');
 assert.equal(response.status,422);assert.deepEqual(state.calls[0][1],{action:'knowledge',payload:{ready:false}});
});
test('admin pause requires both admin authentication and matching origin',async()=>{
 assert.equal((await handleStatus(request('admin/ai-assistance/status',{paused:true}))).status,401);
 state.admin=true;assert.equal((await handleStatus(request('admin/ai-assistance/status',{paused:true},{origin:'https://evil.test'}))).status,403);
 assert.equal((await handleStatus(request('admin/ai-assistance/status',{paused:true}))).status,200);assert.equal(state.calls[0][1].action,'pause');
});
test('database outage returns a generic failure without exposing database details',async()=>{
 state.result={data:null,error:{message:'private connection credentials'}};
 const response=await handleSession(request('api/ai-assistance/session',{language:'en'}));assert.equal(response.status,503);assert.equal(JSON.stringify(await response.json()).includes('private connection'),false);
});

test('disabled admin status remains authenticated and requires no migrated database',async()=>{
 process.env.GASCOMP_AI_ASSISTANCE_ENABLED='false';
 const get=()=>new Request('https://support.example.test/admin/ai-assistance/status');
 assert.equal((await handleStatus(get())).status,401);state.admin=true;
 const response=await handleStatus(get());assert.equal(response.status,200);assert.equal((await response.json()).enabled,false);assert.equal(state.calls.length,0);
 assert.equal((await handleStatus(request('admin/ai-assistance/status',{paused:false}))).status,409);
});

test('broken preview configuration returns only a generic error and never sends an RPC',async()=>{
 state.databaseError='Private invalid preview configuration';
 const response=await handleSession(request('api/ai-assistance/session',{language:'en'}));
 assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'Assistant service is unavailable.'});assert.equal(state.calls.length,0);
});

test('generated completion accepts bounded Unicode text serialized with JSON escapes', async()=>{
 const result={jobId:'00000000-0000-4000-8000-000000000001',leaseToken:'00000000-0000-4000-8000-000000000002',knowledgeVersion:'a'.repeat(64),response:{text:'é'.repeat(2500),kind:'answer',basis:'general',sourceIds:[]}};
 const encoded=JSON.stringify(result).replaceAll('é','\\u00e9');
 assert.ok(encoded.length>8192);
 const req=new Request('https://support.example.test/worker/complete',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${'a'.repeat(40)}`},body:encoded});
 assert.equal((await handleWorker(req,'complete')).status,200);
 assert.equal(state.calls[0][1].payload.response.text,result.response.text);
});
