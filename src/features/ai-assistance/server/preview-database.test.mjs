import assert from 'node:assert/strict';
import {test} from 'node:test';
import {getAssistancePreviewDatabase} from './preview-database.ts';
const preview={NODE_ENV:'development',GASCOMP_AI_PREVIEW_URL:'http://127.0.0.1:54330',GASCOMP_AI_PREVIEW_KEY:'local-only-key'};
test('assistant preview accepts only an explicit development loopback origin',()=>{
 for(const host of ['127.0.0.1','localhost','[::1]']) assert.deepEqual(getAssistancePreviewDatabase({...preview,GASCOMP_AI_PREVIEW_URL:`http://${host}:54330/`}),{url:`http://${host}:54330`,key:preview.GASCOMP_AI_PREVIEW_KEY});
 assert.equal(getAssistancePreviewDatabase({NODE_ENV:'development'}),null);
});
test('production, test and missing NODE_ENV ignore all assistant preview settings',()=>{
 for(const NODE_ENV of ['production','test',undefined]) {
  assert.equal(getAssistancePreviewDatabase({...preview,NODE_ENV}),null);
  assert.equal(getAssistancePreviewDatabase({...preview,NODE_ENV,GASCOMP_AI_PREVIEW_URL:'https://remote.example'}),null);
 }
});
test('invalid or partial preview configuration fails closed',()=>{
 for(const GASCOMP_AI_PREVIEW_URL of ['', 'invalid','https://127.0.0.1:54330','http://localhost.evil','http://192.168.1.5:54330','http://user@localhost:54330','http://user:pass@localhost:54330','http://localhost:54330/path','http://localhost:54330?query=1','http://localhost:54330/#fragment','http://localhost:54330?','http://localhost:54330/#','http://localhost:54330/hidden/..']) {
  assert.throws(()=>getAssistancePreviewDatabase({...preview,GASCOMP_AI_PREVIEW_URL}),/unavailable/);
 }
 assert.throws(()=>getAssistancePreviewDatabase({...preview,GASCOMP_AI_PREVIEW_KEY:''}),/unavailable/);
});
