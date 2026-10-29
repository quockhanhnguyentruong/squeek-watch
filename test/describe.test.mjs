import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeEvent } from '../src/describe.mjs';

const SQK = { address: '0x5501e1fa81be1c3f49225fa7668da0245d07db60', symbol: 'SQK', decimals: 18 };

// Payloads below are copied from real GET /v1/events responses (Sepolia, Oct 2026).
test('settlement and checkpoint events', () => {
  assert.equal(
    describeEvent({
      type: 'system.settlement_completed',
      payload: {
        previousSettledThroughRound: '374',
        settledThroughRound: '375',
        activeRoundCount: '1',
        workAdded: '506',
        completedBlockCount: '45',
        firstCompletedBlock: '2950',
        lastCompletedBlock: '2994',
        cumulativeWork: '32660',
        cumulativeBlockUnits: '2994347019284',
        blockHeight: '2994',
      },
    }),
    'settled round 375 · 45 blocks (#2950–#2994) · 506 work · height 2994',
  );
  assert.equal(
    describeEvent({
      type: 'system.mining_checkpointed',
      payload: {
        afterRound: '385',
        throughRound: '386',
        completedBlockCount: '0',
        cumulativeWork: '32660',
        cumulativeBlockUnits: '2994347019284',
        amountBaseUnits: '0',
        asset: SQK,
      },
    }),
    'checkpoint round 386 · 0 blocks · minted 0.00 SQK',
  );
});

test('player events', () => {
  assert.equal(
    describeEvent({
      type: 'account.rewards_claimed',
      payload: {
        account: '0x32cd5f4a2a93bdb558dd04b40520c3b6886acc41',
        recipient: '0x32cd5f4a2a93bdb558dd04b40520c3b6886acc41',
        amountBaseUnits: '1416386995310382289382',
        asset: SQK,
      },
    }),
    '0x32cd5f…cc41 claimed 1,416.38 SQK',
  );
  assert.equal(
    describeEvent({
      type: 'nft.deposited',
      payload: { account: '0x340c4cdb74ea6ccf98592b9e63ee80f814673ad7', collection: '0xcb98349c134ab983da5bfd80527dfe2552bdb70f', tokenId: '8930', basePower: '1000' },
    }),
    '0x340c4c…3ad7 deposited Squeek #8930 (power 1000)',
  );
  assert.equal(
    describeEvent({ type: 'account.claim_recipient_set', payload: { account: '0xd4203e6ffc798765dea121d795b2a56684c1c738', recipient: null } }),
    '0xd4203e…c738 cleared its claim recipient',
  );
});

test('measurement events', () => {
  assert.equal(
    describeEvent({ type: 'measurement.speed_record', payload: { previousRecordMmPerSecond: '1526', recordMmPerSecond: '1600', observedSpeedMmPerSecond: '1600' } }),
    'new wheel speed record 1.60 m/s (was 1.53 m/s)',
  );
  assert.equal(
    describeEvent({ type: 'measurement.distance_streak', payload: { days: 3, minimumDailyDistanceMm: '5000000', endingUtcDate: '2026-10-28' } }),
    '3-day streak of at least 5.00 km per day (through 2026-10-28)',
  );
});

test('unknown events fall back to scalar payload fields', () => {
  assert.equal(
    describeEvent({ type: 'nft.merged', payload: { account: '0x340c4cdb74ea6ccf98592b9e63ee80f814673ad7', survivorId: '12', donorId: '13' } }),
    'account=0x340c4c…3ad7 survivorId=12 donorId=13',
  );
  assert.equal(describeEvent({ type: 'something.new', payload: {} }), '(no details)');
});
