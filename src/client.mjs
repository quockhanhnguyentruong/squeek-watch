// Thin client for the public Squeekchain API plus the two JSON-RPC calls the
// supply check needs. No dependencies: Node 18+ ships fetch and AbortSignal.timeout.

export const DEFAULT_API = 'https://api.squeekchain.com';
export const DEFAULT_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
export const SETTLEMENT_RANGES = ['now', '24h', '7d', '30d'];
export const EVENT_CATEGORIES = ['all', 'protocol', 'players', 'measurement'];

const TOTAL_SUPPLY_SELECTOR = '0x18160ddd'; // totalSupply()

export function createClient({ api = DEFAULT_API, rpc = DEFAULT_RPC, timeoutMs = 15_000, fetchImpl = fetch } = {}) {
  async function get(path) {
    const res = await fetchImpl(api + path, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = body?.error ? ` (${body.error})` : '';
      throw new Error(`GET ${path} failed: HTTP ${res.status}${detail}`);
    }
    if (body?.status === 'unavailable') {
      throw new Error(`GET ${path}: Squeekchain reports the data as unavailable (${body.reason ?? 'no reason given'})`);
    }
    return body;
  }

  async function rpcCall(method, params) {
    const res = await fetchImpl(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.json();
    if (body.error) throw new Error(`${method} failed: ${body.error.message}`);
    return body.result;
  }

  return {
    status: () => get('/v1/status'),
    economy: () => get('/v1/economy/state'),
    core: () => get('/v1/core'),
    settlements(range = '24h') {
      if (!SETTLEMENT_RANGES.includes(range)) throw new Error(`range must be one of ${SETTLEMENT_RANGES.join(', ')}`);
      return get(`/v1/settlements?range=${encodeURIComponent(range)}`);
    },
    events(category = 'all', limit = 20, cursor = null) {
      if (!EVENT_CATEGORIES.includes(category)) throw new Error(`category must be one of ${EVENT_CATEGORIES.join(', ')}`);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('limit must be an integer from 1 to 100');
      const query = new URLSearchParams({ category, limit: String(limit) });
      if (cursor) query.set('cursor', cursor);
      return get(`/v1/events?${query}`);
    },
    async chainId() {
      return BigInt(await rpcCall('eth_chainId', [])).toString();
    },
    async totalSupplyAt(token, blockNumber) {
      const tag = `0x${BigInt(blockNumber).toString(16)}`;
      return BigInt(await rpcCall('eth_call', [{ to: token, data: TOTAL_SUPPLY_SELECTOR }, tag]));
    },
  };
}
