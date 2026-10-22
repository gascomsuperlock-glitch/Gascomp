import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';
test('isolated CareDirect migration enforces identity, status, idempotency and private access',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 await db.exec(await readFile(new URL('../../../../supabase/migrations/202610220001_care_direct_reports.sql',import.meta.url),'utf8'));
 const id='CD-7a338492-4907-4629-89a0-8195b3897b36',submission=id.slice(3);
 const insert=(record)=>db.query('insert into care_direct_reports(id,submission_id,record) values ($1,$2,$3)',[id,submission,JSON.stringify(record)]);
 await assert.rejects(insert({id,submissionId:submission,status:'invalid'}),/care_direct_report_status/);
 await assert.rejects(insert({id:'wrong',submissionId:submission,status:'new'}),/care_direct_report_identity/);
 await insert({id,submissionId:submission,status:'new'});
 await assert.rejects(insert({id,submissionId:submission,status:'new'}),/duplicate key/);
 for(const status of ['new','in_progress','resolved'])await db.query("update care_direct_reports set record=jsonb_set(record,'{status}',$1::jsonb)",[JSON.stringify(status)]);
 const bucket=(await db.query('select * from storage.buckets')).rows[0];assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),52428800);
 assert.equal((await db.query("select relrowsecurity from pg_class where relname='care_direct_reports'")).rows[0].relrowsecurity,true);
 for(const role of ['anon','authenticated']){await db.exec(`set role ${role}`);await assert.rejects(db.query('select * from care_direct_reports'),/permission denied/);await assert.rejects(db.query('delete from care_direct_reports'),/permission denied/);await db.exec('reset role');}
 }finally{await db.close();}
});
