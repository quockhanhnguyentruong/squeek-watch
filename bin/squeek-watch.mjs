#!/usr/bin/env node
// squeek-watch: a terminal monitor for Squeekchain, the hamster-powered blockchain.

import { parseArgs } from 'node:util';
import { createClient, DEFAULT_API, DEFAULT_RPC } from '../src/client.mjs';
import { describeEvent } from '../src/describe.mjs';
import {
  blockProgressPercent,
  formatAmount,
  formatUnits,
  mmPerSecondToMetres,
  mmToKm,
  percent,
  relativeTime,
  shortHex,
  utcStamp,
} from '../src/format.mjs';

const HELP = `squeek-watch — watch Squeekchain from your terminal

Usage: squeek-watch <command> [options]

Commands
  status        hamster wheel, block maker, oracle and settlement queue (default)
  economy       SQK supply, lifecycle round and contract addresses
  settlements   settled blocks and SQK minted        --range now|24h|7d|30d
  events        recent activity feed                 --category all|protocol|players|measurement --limit 1-100
  verify        check the API's SQK supply against totalSupply() on Sepolia
  watch         print a line whenever the wheel, blocks or settlements change   --interval <seconds>

Options
  --json        print the raw API response (status, economy, settlements, events)
  --api <url>   Squeekchain API base   (default ${DEFAULT_API}, env SQUEEK_API)
  --rpc <url>   Sepolia JSON-RPC URL    (default ${DEFAULT_RPC}, env SEPOLIA_RPC)
`;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    range: { type: 'string', default: '24h' },
    category: { type: 'string', default: 'all' },
    limit: { type: 'string', default: '15' },
    interval: { type: 'string', default: '15' },
    json: { type: 'boolean', default: false },
    api: { type: 'string', default: process.env.SQUEEK_API ?? DEFAULT_API },
    rpc: { type: 'string', default: process.env.SEPOLIA_RPC ?? DEFAULT_RPC },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

const client = createClient({ api: opts.api, rpc: opts.rpc });
const SQK = { symbol: 'SQK', decimals: 18 };

function row(label, value) {
  console.log(`${label.padEnd(11)}${value}`);
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

async function status() {
  const s = await client.status();
  if (opts.json) return printJson(s);
  const m = s.measurement;
  const built = s.builder.projected;
  const closure = s.oracle.latestClosure;
  console.log(`Squeekchain · ${s.installationId}`);
  row('Wheel', `${m.coreStatus} · ${(m.rpmMilli / 1000).toFixed(1)} rpm · ${mmPerSecondToMetres(m.speedMmPerSecond)} · ${mmToKm(m.distanceMm)} this Squeek day`);
  row('', `measurement ${m.freshness}, observed ${relativeTime(m.observedAt)} (${m.provenance})`);
  row('Block', `#${BigInt(built.blockHeight) + 1n} is ${blockProgressPercent(built.blockProgress)} built · ${built.blockHeight} blocks complete`);
  row('Settled', `through round ${s.builder.anchor.settledThroughRound} · ${relativeTime(s.builder.anchor.confirmedAt)} · tx ${shortHex(s.builder.anchor.transactionHash)}`);
  row('Oracle', `${s.oracle.state}${closure ? ` · last closure ${closure.firstRound === closure.lastRound ? `round ${closure.lastRound}` : `rounds ${closure.firstRound}–${closure.lastRound}`} (${relativeTime(closure.acceptedAt)})` : ''}`);
  const buffered = s.settlementQueue.buffered.roundCount;
  row('Queue', `${s.settlementQueue.state} · ${buffered} round${buffered === '1' ? '' : 's'} buffered · settlement ${s.settlementQueue.settlementEnabled ? 'enabled' : 'disabled'}`);
}

async function economy() {
  const e = await client.economy();
  if (opts.json) return printJson(e);
  const asset = e.asset ?? SQK;
  const supply = e.supply;
  console.log(`Squeekchain economy · release ${e.release.id}`);
  row('Lifecycle', `${e.lifecycle.stage} · round ${e.lifecycle.currentRound} (started at ${e.lifecycle.startRound}) · ${e.lifecycle.paused ? 'PAUSED' : 'not paused'}`);
  row('Supply', `${formatAmount(supply.liveSupplyBaseUnits, asset)} of ${formatAmount(supply.capBaseUnits, asset, 0)} cap (${percent(supply.liveSupplyBaseUnits, supply.capBaseUnits)})`);
  row('Mined', `${formatAmount(supply.miningMintedBaseUnits, asset)} · burned ${formatAmount(supply.totalBurnedBaseUnits, asset)}`);
  row('Chain', `${e.chain.target} (${e.chain.chainId}) · safe through block ${e.chain.safeThroughBlock}`);
  const ids = e.identities;
  console.log('Contracts');
  for (const [name, address] of [
    ['core', ids.core],
    ['token (SQK)', ids.token],
    ['genesis NFT', ids.genesis],
    ['mining', ids.mining?.proxy],
    ['staking', ids.staking?.proxy],
    ['launch', ids.launch],
  ]) {
    if (address) console.log(`  ${name.padEnd(13)}${address}`);
  }
}

async function settlements() {
  const s = await client.settlements(opts.range);
  if (opts.json) return printJson(s);
  const minted = s.buckets.reduce((sum, bucket) => sum + BigInt(bucket.sqkMintedBaseUnits), 0n);
  console.log(`Settlements · ${s.range} (${utcStamp(s.window.startAt)} → ${utcStamp(s.window.endAt)} UTC)`);
  row('Summary', `${s.summary.settlementCount} settlements · ${s.summary.activeRoundCount} active rounds · ${s.summary.completedBlockCount} blocks · ${s.summary.workAdded} work`);
  row('Minted', `${formatAmount(minted, SQK)}${s.previousPeriod ? ` (previous period ${formatAmount(s.previousPeriod.sqkMintedBaseUnits, SQK)})` : ''}`);
  if (s.recentSettlements.length === 0) return console.log('No settled blocks in this range.');
  console.log('Recent');
  for (const r of s.recentSettlements) {
    const span = r.firstCompletedBlock === null ? 'no new blocks' : `blocks #${r.firstCompletedBlock}–#${r.lastCompletedBlock} (${r.completedBlockCount})`;
    console.log(`  ${relativeTime(r.blockTimestamp).padEnd(8)} ${span.padEnd(30)} ${formatAmount(r.sqkMintedBaseUnits, SQK).padStart(18)}  ${shortHex(r.transactionHash)}`);
  }
}

async function events() {
  const e = await client.events(opts.category, Number(opts.limit));
  if (opts.json) return printJson(e);
  console.log(`Activity · ${opts.category} · ${e.events.length} events`);
  for (const event of e.events) {
    console.log(`  ${relativeTime(event.occurredAt).padEnd(8)} ${event.type.padEnd(38)} ${describeEvent(event)}`);
  }
}

async function verify() {
  const e = await client.economy();
  const token = e.identities.token;
  const block = e.chain.safeThroughBlock;
  const [chainId, onChain] = await Promise.all([client.chainId(), client.totalSupplyAt(token, block)]);
  const fromApi = BigInt(e.supply.liveSupplyBaseUnits);
  console.log(`SQK token ${token} on chain ${chainId}`);
  row('API', `${formatUnits(fromApi, 18, 18)} SQK (safe block ${block})`);
  row('On-chain', `${formatUnits(onChain, 18, 18)} SQK (totalSupply() at block ${block}, via ${new URL(opts.rpc).host})`);
  if (chainId !== e.chain.chainId) {
    row('Result', `✘ RPC is on chain ${chainId}, but the API is on ${e.chain.chainId}`);
    process.exitCode = 1;
  } else if (onChain === fromApi) {
    row('Result', '✔ match');
  } else {
    row('Result', `✘ mismatch of ${formatUnits(onChain - fromApi, 18, 18)} SQK`);
    process.exitCode = 1;
  }
}

async function watch() {
  const seconds = Math.max(5, Number(opts.interval) || 15);
  let previous = null;
  const log = (message) => console.log(`${new Date().toISOString().slice(11, 19)}  ${message}`);
  log(`watching ${opts.api} every ${seconds}s — Ctrl+C to stop`);
  for (;;) {
    try {
      const s = await client.status();
      const now = {
        wheel: s.measurement.coreStatus,
        freshness: s.measurement.freshness,
        height: s.builder.projected.blockHeight,
        progress: blockProgressPercent(s.builder.projected.blockProgress),
        settled: s.builder.anchor.settledThroughRound,
        closure: s.oracle.latestClosure?.lastRound ?? null,
      };
      if (previous === null) {
        log(`wheel ${now.wheel} · block #${BigInt(now.height) + 1n} ${now.progress} built · settled through round ${now.settled}`);
      } else {
        if (now.wheel !== previous.wheel) log(`wheel ${previous.wheel} → ${now.wheel}`);
        if (now.freshness !== previous.freshness) log(`measurement ${previous.freshness} → ${now.freshness}`);
        if (now.height !== previous.height) log(`block #${now.height} completed (${BigInt(now.height) - BigInt(previous.height)} new)`);
        if (now.closure !== previous.closure) log(`oracle closed round ${now.closure}`);
        if (now.settled !== previous.settled) log(`settled through round ${now.settled} · tx ${shortHex(s.builder.anchor.transactionHash)}`);
      }
      previous = now;
    } catch (error) {
      log(`error: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
}

const commands = { status, economy, settlements, events, verify, watch };
const name = positionals[0] ?? 'status';

if (opts.help || name === 'help') {
  console.log(HELP);
} else if (!commands[name]) {
  console.error(`Unknown command "${name}".\n\n${HELP}`);
  process.exitCode = 2;
} else {
  commands[name]().catch((error) => {
    console.error(`squeek-watch: ${error.message}`);
    process.exitCode = 1;
  });
}
