import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
const modulePath = process.env.AI_ASSISTANCE_PGLITE_MODULE || process.env.CARE_PGLITE_MODULE;
test('assistant queue enforces exact sources, ownership, leases, expiry, pause and retention', {skip:!modulePath}, async t => {
  const {PGlite} = await import(pathToFileURL(modulePath).href);
  const db = new PGlite();
  const call = async (action,payload={}) => (await db.query('select gascomp_ai_command($1,$2::jsonb) as result',[action,JSON.stringify(payload)])).rows[0].result;
  const entries = ['en','id'].flatMap(language => ['greeting','clarification','handoff'].map(kind => ({id:`${language}.${kind}`,language,kind,questions:['Question'],answer:`${language} ${kind}\n`}))).concat([
    {id:'answer',language:'en',kind:'answer',questions:['Question'],sku:'DEMO',answer:'Exact source.\n'},
    {id:'other-answer',language:'en',kind:'answer',questions:['Question'],sku:'OTHER',answer:'Other source.\n'},
    {id:'global-answer',language:'en',kind:'answer',questions:['Question'],answer:'Global source.\n'},
  ]);
  const publish = async(version='v1') => { await call('knowledge',{ready:true,snapshot:{version,entries}}); await call('heartbeat',{ready:true,knowledgeVersion:version}); };
  const session = async tokenHash => call('session',{tokenHash,language:'en'});
  const send = async(tokenHash,requestId,extra={}) => call('send',{tokenHash,requestId,text:'Question',language:'en',sku:'DEMO',...extra});
  const uuid = number => `00000000-0000-4000-8000-${String(number).padStart(12,'0')}`;
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    await db.exec(await readFile(new URL('../../supabase/migrations/202609170001_ai_assistance.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202609170002_ai_assistance_resolved_sku.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/202609170003_ai_assistance_grounded_responses.sql',import.meta.url),'utf8'));
    await t.test('anonymous callers cannot use the RPC or read private tables',async()=>{
      await db.exec('set role anon');
      await assert.rejects(call('status'),/permission denied/);
      await assert.rejects(db.query('select gascomp_ai_cleanup()'),/permission denied/);
      await assert.rejects(db.query('select * from ai_assistance_messages'),/permission denied/);
      await db.exec('reset role');
    });
    await t.test('no invented assistant message is emitted before first publication',async()=>{
      await session('initial');
      const result = await send('initial',uuid(90));
      assert.equal(result.messages.length,1);assert.equal(result.messages[0].role,'user');assert.equal(result.handoff,null);
    });
    await publish();
    await session('one'); await session('two');
    await t.test('session ownership, idempotency and sequential/global claims',async()=>{
      assert.equal((await call('messages',{tokenHash:'unknown'})).status,401);
      assert.equal((await send('one',uuid(1))).pending,true);
      assert.equal((await send('one',uuid(1))).messages.length,1);
      assert.equal((await send('one',uuid(2))).status,409);
      assert.equal((await send('two',uuid(2))).messages.length,1);
      const {job} = await call('claim');
      assert.equal((await call('claim')).job,null);
      assert.equal((await call('complete',{jobId:job.id,leaseToken:uuid(99),knowledgeVersion:'v1',answerId:'answer'})).accepted,false);
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'answer'})).accepted,true);
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'answer'})).accepted,false);
      const one = await call('messages',{tokenHash:'one'});
      assert.equal(one.messages.length,2); assert.equal(one.messages[1].text,'Exact source.\n');
      assert.equal((await call('messages',{tokenHash:'two'})).messages.length,1);
      const next = (await call('claim')).job;
      await call('complete',{jobId:next.id,leaseToken:next.leaseToken,knowledgeVersion:'v1',answerId:null});
    });
    await t.test('wrong language, wrong SKU and invented IDs produce only stored handoff',async()=>{
      for(const [number,answerId,extra] of [[3,'id.greeting',{}],[4,'answer',{sku:'OTHER'}],[5,'invented',{}]]) {
        await send('one',uuid(number),extra);const {job}=await call('claim');
        assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId})).accepted,false);
        assert.equal((await call('messages',{tokenHash:'one'})).messages.at(-1).text,'en handoff\n');
      }
    });
    await t.test('SKU context accepts explicit text and lowercase hints, rejects conflicts and substring matches',async()=>{
      await call('knowledge',{ready:true,snapshot:{version:'v1',entries}});
      for(const [number,extra] of [[20,{sku:null,text:'Question demo?'}],[21,{sku:'demo',text:'Question'}]]) {
        await session(`sku-${number}`);await send(`sku-${number}`,uuid(number),extra);
        const {job}=await call('claim');assert.equal(job.sku,'DEMO');
        assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'answer'})).accepted,true);
      }
      for(const [number,extra] of [[22,{sku:'DEMO',text:'Question OTHER'}],[23,{sku:null,text:'Question DEMO OTHER'}]]) {
        await session(`sku-${number}`);const result=await send(`sku-${number}`,uuid(number),extra);
        assert.equal(result.pending,true);const job=(await call('claim')).job;assert.equal(job.contextAmbiguous,true);assert.equal(job.sku,null);
        const response=number===22
          ? {text:'Unsupported ambiguous product answer.',kind:'answer',basis:'knowledge',sourceIds:['answer']}
          : {text:'Which product do you mean?',kind:'clarification',basis:'general',sourceIds:[]};
        assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',response})).accepted,number===23);
        assert.equal((await call('messages',{tokenHash:`sku-${number}`})).messages.at(-1).status,number===23?'complete':'handoff');
      }
      await session('sku-boundary');await send('sku-boundary',uuid(24),{sku:null,text:'Question DEMO-X'});
      const {job}=await call('claim');assert.equal(job.sku,null);
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'answer'})).accepted,false);
    });
    await t.test('worker-resolved product context is accepted only for jobs without an established SKU',async()=>{
      await session('resolved-missing');await send('resolved-missing',uuid(25),{sku:null,text:'No explicit product'});
      let job=(await call('claim')).job;assert.equal(job.sku,null);
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'answer'})).accepted,false);
      assert.equal((await call('messages',{tokenHash:'resolved-missing'})).messages.at(-1).text,'en handoff\n');

      await session('resolved-accepted');await send('resolved-accepted',uuid(26),{sku:null,text:'No explicit product'});
      job=(await call('claim')).job;assert.equal(job.sku,null);
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'answer',resolvedSku:' demo '})).accepted,true);
      assert.equal((await call('messages',{tokenHash:'resolved-accepted'})).messages.at(-1).text,'Exact source.\n');

      await session('resolved-conflict');await send('resolved-conflict',uuid(27));
      job=(await call('claim')).job;assert.equal(job.sku,'DEMO');
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'other-answer',resolvedSku:'OTHER'})).accepted,false);
      assert.equal((await call('messages',{tokenHash:'resolved-conflict'})).messages.at(-1).text,'en handoff\n');

      await session('resolved-cannot-override');await send('resolved-cannot-override',uuid(29));
      job=(await call('claim')).job;assert.equal(job.sku,'DEMO');
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'other-answer',resolvedSku:'DEMO'})).accepted,false);
      assert.equal((await call('messages',{tokenHash:'resolved-cannot-override'})).messages.at(-1).text,'en handoff\n');

      await session('resolved-malformed');await send('resolved-malformed',uuid(30),{sku:null,text:'No explicit product'});
      job=(await call('claim')).job;assert.equal(job.sku,null);
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'global-answer',resolvedSku:''})).accepted,false);
      assert.equal((await call('messages',{tokenHash:'resolved-malformed'})).messages.at(-1).text,'en handoff\n');

      await session('resolved-global');await send('resolved-global',uuid(28),{sku:null,text:'No explicit product'});
      job=(await call('claim')).job;assert.equal(job.sku,null);
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'global-answer'})).accepted,true);
      assert.equal((await call('messages',{tokenHash:'resolved-global'})).messages.at(-1).text,'Global source.\n');
    });
    await t.test('grounded responses persist natural text and provenance while retaining legacy completion',async()=>{
      await session('generated-grounded');await send('generated-grounded',uuid(40));
      let job=(await call('claim')).job;
      const response={text:'First, make sure the power cable is connected firmly.\nThen try a different outlet.',kind:'answer',basis:'knowledge',sourceIds:['answer']};
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',response})).accepted,true);
      const message=(await call('messages',{tokenHash:'generated-grounded'})).messages.at(-1);
      assert.equal(message.text,response.text);assert.equal(message.status,'complete');
      const stored=(await db.query("select response_basis,source_ids from ai_assistance_messages where session_id=(select id from ai_assistance_sessions where token_hash='generated-grounded') and role='assistant'")).rows[0];
      assert.deepEqual(stored,{response_basis:'knowledge',source_ids:['answer']});

      await session('generated-general');await send('generated-general',uuid(41),{sku:null,text:'Thank you'});
      job=(await call('claim')).job;
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',response:{text:'You are welcome. Is there anything else I can help with?',kind:'answer',basis:'general',sourceIds:[]}})).accepted,true);
      assert.equal((await call('messages',{tokenHash:'generated-general'})).messages.at(-1).status,'complete');

      await session('generated-handoff');await send('generated-handoff',uuid(42),{sku:null,text:'Account-specific request'});
      job=(await call('claim')).job;
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',response:{text:'I need an administrator to check that account-specific request.',kind:'handoff',basis:'general',sourceIds:[]}})).accepted,true);
      assert.equal((await call('messages',{tokenHash:'generated-handoff'})).messages.at(-1).status,'handoff');
    });
    await t.test('database rejects invented, cross-product, unsafe, or malformed generated responses',async()=>{
      const invalidResponses=[
        {text:'Invented source.',kind:'answer',basis:'knowledge',sourceIds:['invented']},
        {text:'Wrong product.',kind:'answer',basis:'knowledge',sourceIds:['other-answer']},
        {text:'Open https://example.test',kind:'answer',basis:'knowledge',sourceIds:['answer']},
        {text:'<b>Unsafe</b>',kind:'answer',basis:'knowledge',sourceIds:['answer']},
        {text:'Duplicate sources.',kind:'answer',basis:'knowledge',sourceIds:['answer','answer']},
        {text:'Missing provenance.',kind:'answer',basis:'knowledge',sourceIds:[]},
        {text:'Unsafe bare domain example.com',kind:'answer',basis:'knowledge',sourceIds:['answer']},
      ];
      for(let index=0;index<invalidResponses.length;index++) {
        const token=`generated-invalid-${index}`;await session(token);await send(token,uuid(50+index));
        const job=(await call('claim')).job;
        assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',response:invalidResponses[index]})).accepted,false);
        const message=(await call('messages',{tokenHash:token})).messages.at(-1);
        assert.equal(message.text,'en handoff\n');assert.equal(message.status,'handoff');
      }
    });
    await t.test('claims contain only the last eight bounded messages from the same session before the current question',async()=>{
      await session('history-owner');await session('history-other');
      const owner=(await db.query("select id from ai_assistance_sessions where token_hash='history-owner'")).rows[0].id;
      const other=(await db.query("select id from ai_assistance_sessions where token_hash='history-other'")).rows[0].id;
      for(let index=0;index<10;index++) await db.query("insert into ai_assistance_messages(session_id,role,text) values($1,$2,$3)",[owner,index%2?'assistant':'user',index===9?'x'.repeat(900):`owner-${index}`]);
      await db.query("insert into ai_assistance_messages(session_id,role,text) values($1,'user','private-other-session')",[other]);
      await send('history-owner',uuid(60),{sku:null,text:'Current question'});
      const job=(await call('claim')).job;
      assert.equal(job.history.length,8);assert.equal(job.history[0].text,'owner-2');assert.equal(job.history.at(-1).text.length,800);
      assert.equal(job.history.some(message=>message.text==='Current question'||message.text==='private-other-session'),false);
      await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',response:{text:'Please tell me more.',kind:'clarification',basis:'general',sourceIds:[]}});
    });
    await t.test('timeout and snapshot changes reject late results and retain handoff',async()=>{
      await send('one',uuid(6)); const {job}=await call('claim');
      await db.exec("update ai_assistance_jobs set expires_at = now() - interval '1 second' where state = 'processing'");
      assert.equal((await call('complete',{jobId:job.id,leaseToken:job.leaseToken,knowledgeVersion:'v1',answerId:'answer'})).accepted,false);
      await send('one',uuid(7)); const second=(await call('claim')).job;
      await publish('v2');
      assert.equal((await call('complete',{jobId:second.id,leaseToken:second.leaseToken,knowledgeVersion:'v1',answerId:'answer'})).accepted,false);
      await call('knowledge',{ready:false});
      const state=await call('messages',{tokenHash:'one'});
      assert.equal(state.availability,'unavailable');assert.equal(state.handoff,'en handoff\n');assert.equal(state.greeting,null);
    });
    await t.test('offline and pause immediately finish pending jobs with no late response',async()=>{
      await publish('v3'); await send('two',uuid(8));
      await call('pause',{paused:true});assert.equal((await call('claim')).job,null);
      assert.equal((await call('messages',{tokenHash:'two'})).pending,false);
      await call('pause',{paused:false}); await send('two',uuid(9));
      await db.exec("update ai_assistance_runtime set heartbeat_at = now() - interval '31 seconds'");
      assert.equal((await call('messages',{tokenHash:'two'})).availability,'offline');
      assert.equal((await call('messages',{tokenHash:'two'})).pending,false);
    });
    await t.test('independent scheduled cleanup removes expired data while the runtime is paused and offline',async()=>{
      await session('retention-expired');await send('retention-expired',uuid(80));
      const sid=(await db.query("select id from ai_assistance_sessions where token_hash='retention-expired'")).rows[0].id;
      await db.exec("update ai_assistance_sessions set created_at=now()-interval '31 days' where token_hash='retention-expired'; update ai_assistance_runtime set paused=true,worker_ready=false;");
      await db.exec('set role service_role');await db.query('select gascomp_ai_cleanup()');await db.exec('reset role');
      for(const table of ['ai_assistance_sessions','ai_assistance_messages','ai_assistance_jobs']) {
        const key=table==='ai_assistance_sessions'?'id':'session_id';
        assert.equal((await db.query(`select count(*)::int as n from ${table} where ${key}=$1`,[sid])).rows[0].n,0);
      }
    });
    await t.test('message limits and session creation limits are shared by all callers',async()=>{
      await session('limited');
      for(let i=100;i<110;i++) assert.equal((await send('limited',uuid(i))).pending,false);
      assert.equal((await send('limited',uuid(110))).status,429);
      assert.equal((await send('limited',uuid(100))).status,undefined);
      await db.exec("update ai_assistance_limits set count=100 where key='sessions'");
      assert.equal((await session('new')).status,429);
      assert.equal((await session('two')).status,undefined);
    });
    await t.test('heartbeat purges expired sessions and their conversations',async()=>{
      await db.exec("update ai_assistance_sessions set created_at = now() - interval '31 days' where token_hash='one'");
      await call('heartbeat',{ready:false,knowledgeVersion:null});
      assert.equal((await call('messages',{tokenHash:'one'})).status,401);
      assert.equal((await db.query("select count(*)::int as n from ai_assistance_messages where session_id not in (select id from ai_assistance_sessions)")).rows[0].n,0);
    });
  } finally {await db.close();}
});
