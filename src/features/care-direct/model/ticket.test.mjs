import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {test} from 'node:test';
const hooks=registerHooks({resolve(s,c,n){return n(s==='./copy'?'./copy.ts':s,c)}});
const {buildCareDirectTicket}=await import('./ticket.ts');hooks.deregister();
test('both languages retain every field, long concerns and special characters in WhatsApp text',()=>{
 const data=new FormData(),problem='A & # ? + 😀\n'.repeat(300)+'END';
 for(const [key,value] of Object.entries({name:'Test & Name',whatsapp:'081234567890',orderNumber:'ORDER/#42',problem}))data.set(key,value);
 data.set('video',new File(['video'],'issue #1.mp4'));
 for(const language of ['id','en']){
  const ticket=buildCareDirectTicket(data,'CD-test','https://support.test',language);
  for(const value of ['Test & Name','081234567890','ORDER/#42',problem,'issue #1.mp4','https://support.test/admin/care-direct/reports/CD-test/video'])assert.ok(ticket.includes(value));
  assert.equal((ticket.match(/\[✓\]/g)||[]).length,2);
  const url=new URL('https://wa.me/628123456789?text='+encodeURIComponent(ticket));assert.equal(url.searchParams.get('text'),ticket);
  assert.ok(!ticket.includes('token='));
 }
});
