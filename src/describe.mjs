// Turns Squeekchain activity events (GET /v1/events) into one-line summaries.

import { formatAmount, mmPerSecondToMetres, mmToKm, shortHex } from './format.mjs';

const SQK = { symbol: 'SQK', decimals: 18 };

function amount(payload) {
  return payload.amountBaseUnits === undefined ? null : formatAmount(payload.amountBaseUnits, payload.asset ?? SQK);
}

function rounds(from, through) {
  return from === through ? `round ${through}` : `rounds ${from}–${through}`;
}

function blocks(payload) {
  const count = Number(payload.completedBlockCount ?? 0);
  if (count === 0 || payload.firstCompletedBlock == null) return `${count} blocks`;
  return `${count} blocks (#${payload.firstCompletedBlock}–#${payload.lastCompletedBlock})`;
}

const describers = {
  'system.settlement_completed': (p) =>
    `settled ${rounds(BigInt(p.previousSettledThroughRound) + 1n, BigInt(p.settledThroughRound))} · ${blocks(p)} · ${p.workAdded} work · height ${p.blockHeight}`,
  'system.mining_checkpointed': (p) =>
    `checkpoint ${rounds(BigInt(p.afterRound) + 1n, BigInt(p.throughRound))} · ${blocks(p)} · minted ${amount(p)}`,
  'account.rewards_claimed': (p) =>
    `${shortHex(p.account)} claimed ${amount(p)}${p.recipient && p.recipient !== p.account ? ` → ${shortHex(p.recipient)}` : ''}`,
  'account.rewards_staked': (p) => `${shortHex(p.account)} staked rewards ${amount(p) ?? ''}`.trim(),
  'account.sqk_staked': (p) => `${shortHex(p.account)} staked ${amount(p) ?? 'SQK'}`,
  'account.sqk_unstaked': (p) => `${shortHex(p.account)} unstaked ${amount(p) ?? 'SQK'}`,
  'account.claim_recipient_set': (p) =>
    p.recipient ? `${shortHex(p.account)} sends rewards to ${shortHex(p.recipient)}` : `${shortHex(p.account)} cleared its claim recipient`,
  'nft.deposited': (p) => `${shortHex(p.account)} deposited Squeek #${p.tokenId}${p.basePower ? ` (power ${p.basePower})` : ''}`,
  'nft.withdrawn': (p) => `${shortHex(p.account)} withdrew Squeek #${p.tokenId}`,
  'measurement.speed_record': (p) =>
    `new wheel speed record ${mmPerSecondToMetres(p.recordMmPerSecond)} (was ${mmPerSecondToMetres(p.previousRecordMmPerSecond)})`,
  'measurement.speed_milestone': (p) =>
    `wheel hit ${mmPerSecondToMetres(p.observedSpeedMmPerSecond)} (milestone ${mmPerSecondToMetres(p.thresholdSpeedMmPerSecond)})`,
  'measurement.distance_milestone': (p) =>
    `lifetime distance passed ${mmToKm(p.thresholdDistanceMm)} (now ${mmToKm(p.observedLifetimeDistanceMm)})`,
  'measurement.daily_distance_milestone': (p) =>
    `${p.utcDate}: ran ${mmToKm(p.observedDayDistanceMm)} (milestone ${mmToKm(p.thresholdDistanceMm)})`,
  'measurement.distance_streak': (p) =>
    `${p.days}-day streak of at least ${mmToKm(p.minimumDailyDistanceMm)} per day (through ${p.endingUtcDate})`,
};

export function describeEvent(event) {
  const describe = describers[event.type];
  if (describe) {
    try {
      return describe(event.payload ?? {});
    } catch {
      // Fall through to the generic summary if the payload shape changed.
    }
  }
  const fields = Object.entries(event.payload ?? {})
    .filter(([, value]) => value !== null && typeof value !== 'object')
    .slice(0, 4)
    .map(([key, value]) => `${key}=${typeof value === 'string' && value.startsWith('0x') ? shortHex(value) : value}`);
  return fields.join(' ') || '(no details)';
}
