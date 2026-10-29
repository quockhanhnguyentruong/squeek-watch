# squeek-watch

A terminal monitor for [Squeekchain](https://squeekchain.com), the hamster-powered blockchain.
It reads the public Squeekchain API to show the hamster wheel, the block maker, oracle and
settlement progress, SQK issuance and the activity feed. It also checks the API's SQK
supply against `totalSupply()` on Sepolia.

It has no dependencies and needs Node.js 18.17 or newer.

```bash
git clone https://github.com/<you>/squeek-watch.git
cd squeek-watch
node bin/squeek-watch.mjs status
```

Or install it as a command with `npm install -g .` and run `squeek-watch status`.

## Commands

| Command | What it shows |
|---|---|
| `status` (default) | Wheel state, rpm, speed and distance; how far the next block is built; last settlement; oracle closure; settlement queue |
| `economy` | Lifecycle stage and round, live SQK supply against the 2.1B cap, contract addresses |
| `settlements --range now\|24h\|7d\|30d` | Settlement summary, SQK minted in the range and the recent settled block ranges |
| `events --category all\|protocol\|players\|measurement --limit N` | Activity feed as one-line summaries (claims, stakes, NFT deposits, wheel records and more) |
| `verify` | Reads `totalSupply()` from the SQK token at the API's confirmation-safe block and compares it with the supply the API reports |
| `watch --interval 15` | Prints a line each time the wheel starts or stops, a block completes, the oracle closes a round or a settlement lands |

Add `--json` to `status`, `economy`, `settlements` or `events` to print the raw API response.

```text
$ squeek-watch status
Squeekchain · stream-game-sepolia-test-20261025-01
Wheel      IDLE · 0.0 rpm · 0.00 m/s · 9.30 km this Squeek day
           measurement online, observed 2s ago (hardware)
Block      #2995 is 34.70% built · 2994 blocks complete
Settled    through round 386 · 11m ago · tx 0xf23019…1b40
Oracle     accepted · last closure round 387 (2m ago)
Queue      submitted · 1 round buffered · settlement enabled

$ squeek-watch verify
SQK token 0x5501e1fa81be1c3f49225fa7668da0245d07db60 on chain 11155111
API        11,914,771.138841588939432012 SQK (safe block 12017668)
On-chain   11,914,771.138841588939432012 SQK (totalSupply() at block 12017668, via ethereum-sepolia-rpc.publicnode.com)
Result     ✔ match
```

## How it uses Squeekchain

- `GET /v1/status`: live wheel measurement, block builder, oracle and settlement queue
- `GET /v1/economy/state`: release, lifecycle, SQK supply and contract identities
- `GET /v1/settlements?range=…`: settled blocks and SQK minted per period
- `GET /v1/events?category=…&limit=…`: the public activity feed
- `eth_call totalSupply()` on the SQK token (Sepolia, chain 11155111) for `verify`

Squeekchain currently runs its test release on Sepolia. The contract addresses come from the API,
so `squeek-watch` follows new releases without code changes.

## Configuration

| Option | Environment variable | Default |
|---|---|---|
| `--api <url>` | `SQUEEK_API` | `https://api.squeekchain.com` |
| `--rpc <url>` | `SEPOLIA_RPC` | `https://ethereum-sepolia-rpc.publicnode.com` |

## Development

```bash
npm test
```

The tests use payloads captured from the live API and need no network access.

## License

MIT
