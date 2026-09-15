import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
const rows = Array.from({ length: 1201 }, (_, index) => ({ ticket_id: `T-${String(index).padStart(4, '0')}`, submitted_at: '2026-09-15T00:00:00Z', updated_at: '2026-09-15T00:00:00Z', status: 'new', deleted_at: index === 5 ? '2026-09-15' : null }));
const calls = [];
globalThis.exportClient = { from(table) {
  assert.equal(table, 'warranty_tickets');
  const query = { select() { return this; }, order() { return this; }, range(start, end) { this.start=start; this.end=end; calls.push([start,end]); return this; }, gte(column, value) { assert.equal(column,'submitted_at'); assert.equal(value,'2026-08-31T17:00:00.000Z'); return this; }, lt(column,value) { assert.equal(column,'submitted_at'); assert.equal(value,'2026-09-30T17:00:00.000Z'); return this; }, then(resolve) { resolve({ data: rows.slice(this.start,this.end+1), error: null }); } };
  return query;
} };
const hooks = registerHooks({resolve(specifier,context,next) {
  if (specifier === 'server-only') return {url:'data:text/javascript,export{}',shortCircuit:true};
  if (specifier.endsWith('/supabase/server')) return {url:'data:text/javascript,export const createAdminSupabaseClient=()=>globalThis.exportClient;',shortCircuit:true};
  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier)) return next(specifier+'.ts',context);
  return next(specifier,context);
}});
const { listSupabaseTickets }=await import('./supabase-ticket-store.ts');hooks.deregister();
test('monthly export reads beyond 1000 records, excludes deleted tickets, and skips evidence',async()=>{
  const tickets=await listSupabaseTickets({start:'2026-08-31T17:00:00.000Z',end:'2026-09-30T17:00:00.000Z'});
  assert.equal(tickets.length,1200);
  assert.deepEqual(calls,[[0,499],[500,999],[1000,1499]]);
  assert.ok(tickets.some(ticket=>ticket.ticketId==='T-1200'));
});
