import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  blockProgressPercent,
  formatAmount,
  formatUnits,
  mmPerSecondToMetres,
  mmToKm,
  percent,
  relativeTime,
  shortHex,
} from '../src/format.mjs';

test('formatUnits groups thousands and truncates decimals', () => {
  assert.equal(formatUnits('11914771138841588939432012'), '11,914,771.13');
  assert.equal(formatUnits('11914771138841588939432012', 18, 18), '11,914,771.138841588939432012');
  assert.equal(formatUnits('0'), '0.00');
  assert.equal(formatUnits(-1500000000000000000n), '-1.50');
  assert.equal(formatUnits('2100000000000000000000000000', 18, 0), '2,100,000,000');
});

test('formatAmount appends the asset symbol', () => {
  assert.equal(formatAmount('1416386995310382289382'), '1,416.38 SQK');
  assert.equal(formatAmount('1000000', { symbol: 'USDC', decimals: 6 }), '1.00 USDC');
});

test('percent and block progress', () => {
  assert.equal(percent('11914771138841588939432012', '2100000000000000000000000000'), '0.56%');
  assert.equal(percent(1, 3), '33.33%');
  assert.equal(percent(1, 0), '—');
  // cumulativeBlockUnits 2994347019284 → block 2995 is 34.70% built
  assert.equal(blockProgressPercent('347019284'), '34.70%');
});

test('shortHex keeps the head and tail', () => {
  assert.equal(shortHex('0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44'), '0x980b44…3d44');
  assert.equal(shortHex('0x1234'), '0x1234');
});

test('relativeTime', () => {
  const now = Date.parse('2026-10-29T06:20:00Z');
  assert.equal(relativeTime('2026-10-29T06:19:30Z', now), '30s ago');
  assert.equal(relativeTime('2026-10-29T06:10:00Z', now), '10m ago');
  assert.equal(relativeTime('2026-10-29T03:20:00Z', now), '3h ago');
  assert.equal(relativeTime('2026-10-27T06:20:00Z', now), '2d ago');
  assert.equal(relativeTime('2026-10-29T06:25:00Z', now), 'in 5m');
  assert.equal(relativeTime(null, now), '—');
});

test('wheel units', () => {
  assert.equal(mmToKm('9295386'), '9.30 km');
  assert.equal(mmPerSecondToMetres('1600'), '1.60 m/s');
});
