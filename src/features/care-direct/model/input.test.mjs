import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const hooks = registerHooks({ resolve(s,c,n) { if(s==='./types') return n('./types.ts',c); return n(s,c); } });
const {parseCareDirectInput,SUBMISSION_ID_PATTERN} = await import('./input.ts');
hooks.deregister();
function form() {const f=new FormData(); for(const [k,v] of Object.entries({name:' Test ',problem:'Problem',whatsapp:'+62 (812) 3456-7890',orderNumber:'ORDER',agreeNoReturn:'true',agreeNoReview:'true',submissionId:'7a338492-4907-4629-89a0-8195b3897b36'})) f.set(k,v); f.set('video',new File(['video'],'test.mp4'));return f;}
test('normalizes contact details and preserves order identifiers',()=>{const parsed=parseCareDirectInput(form());assert.deepEqual(parsed.fieldErrors,{});assert.equal(parsed.input.name,'Test');assert.equal(parsed.input.whatsapp,'6281234567890');assert.equal(parsed.input.orderNumber,'ORDER');assert.ok(SUBMISSION_ID_PATTERN.test(parsed.input.submissionId));});
test('requires every field, rejects oversized text and multiple videos',()=>{assert.equal(Object.keys(parseCareDirectInput(new FormData()).fieldErrors).length,7);const f=form();f.set('problem','a'.repeat(5001));f.append('video',new File(['another'],'second.mp4'));assert.deepEqual(Object.keys(parseCareDirectInput(f).fieldErrors),['problem','video']);f.set('whatsapp','letters');assert.ok(parseCareDirectInput(f).fieldErrors.whatsapp);});
