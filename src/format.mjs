// Pure formatting helpers. Amounts from the Squeekchain API are decimal strings in
// base units, so all arithmetic stays in BigInt to avoid float rounding.

// One Squeekchain block is 1e9 block units (cumulativeBlockUnits = height * 1e9 + progress).
export const BLOCK_UNITS = 1_000_000_000n;

export function groupThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Truncates (never rounds up) to `fractionDigits` decimals.
export function formatUnits(baseUnits, decimals = 18, fractionDigits = 2) {
  const value = BigInt(baseUnits);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const scale = 10n ** BigInt(decimals);
  const whole = groupThousands((abs / scale).toString());
  if (fractionDigits <= 0) return (negative ? '-' : '') + whole;
  const fraction = ((abs % scale) * 10n ** BigInt(fractionDigits)) / scale;
  return `${negative ? '-' : ''}${whole}.${fraction.toString().padStart(fractionDigits, '0')}`;
}

export function formatAmount(baseUnits, asset = { symbol: 'SQK', decimals: 18 }, fractionDigits = 2) {
  return `${formatUnits(baseUnits, asset.decimals, fractionDigits)} ${asset.symbol}`;
}

// part / whole as a percentage string, e.g. percent(1, 3) === '33.33%'.
export function percent(part, whole, fractionDigits = 2) {
  const denominator = BigInt(whole);
  if (denominator === 0n) return '—';
  const scaled = (BigInt(part) * 100n * 10n ** BigInt(fractionDigits)) / denominator;
  return `${formatUnits(scaled, fractionDigits, fractionDigits)}%`;
}

export function blockProgressPercent(blockProgress) {
  return percent(blockProgress, BLOCK_UNITS);
}

export function shortHex(hex, head = 6, tail = 4) {
  if (typeof hex !== 'string' || hex.length <= head + tail + 2) return String(hex);
  return `${hex.slice(0, head + 2)}…${hex.slice(-tail)}`;
}

export function relativeTime(iso, now = Date.now()) {
  if (!iso) return '—';
  const seconds = Math.round((now - Date.parse(iso)) / 1000);
  const future = seconds < 0;
  const s = Math.abs(seconds);
  let text;
  if (s < 60) text = `${s}s`;
  else if (s < 3600) text = `${Math.floor(s / 60)}m`;
  else if (s < 86400) text = `${Math.floor(s / 3600)}h`;
  else text = `${Math.floor(s / 86400)}d`;
  return future ? `in ${text}` : `${text} ago`;
}

export function mmToKm(mm) {
  return `${(Number(mm) / 1e6).toFixed(2)} km`;
}

export function mmPerSecondToMetres(mmPerSecond) {
  return `${(Number(mmPerSecond) / 1000).toFixed(2)} m/s`;
}

export function utcStamp(iso) {
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
}
