import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toCustomerCoverage } from './customer-coverage.ts';

test('customer coverage exposes remaining claims and dates without admin usage history', () => {
  const coverage={id:'test',memberId:'private-member',itemLabel:'Test item',purchaseReference:'private-order',purchaseDate:'2026-09-15',expiresOn:'2028-09-14',units:2,claimLimit:6,claimsUsed:1,claimsRemaining:5,status:'active',claims:[{id:'private-claim',reference:'internal-id',usedOn:'2026-09-15'}]};
  assert.deepEqual(toCustomerCoverage({coverages:[coverage]}).coverages,[{id:'test',itemLabel:'Test item',purchaseDate:'2026-09-15',expiresOn:'2028-09-14',claimsRemaining:5,status:'active'}]);
  assert.equal(toCustomerCoverage({coverages:[{...coverage,status:'expired'}]}).coverages[0].claimsRemaining,0);
  assert.equal(toCustomerCoverage({coverages:[],error:'unavailable'}).error,'unavailable');
});
