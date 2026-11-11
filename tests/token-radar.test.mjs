import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validSolanaAddress, normalizeDexPairs, researchSolanaToken,
  clearRadarCacheForTests, TokenRadarError
} from "../src/token-radar.mjs";

const SOL = "So11111111111111111111111111111111111111112";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAIR = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const OTHER = "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN";
const pair = (overrides = {}) => ({
  chainId: "solana", pairAddress: PAIR, dexId: "raydium",
  baseToken: { address: SOL, name: "Wrapped SOL", symbol: "SOL" },
  quoteToken: { address: USDC, name: "USD Coin", symbol: "USDC" },
  priceUsd: "178.25", liquidity: { usd: 220000 },
  volume: { h24: 300000 }, txns: { h24: { buys: 120, sells: 80 } },
  priceChange: { h24: -2.41 }, pairCreatedAt: 1700000000000,
  ...overrides
});

test("base58 valid 32-byte Solana address; reject invalid alphabets and lengths", () => {
  assert.equal(validSolanaAddress(SOL), true);
  assert.equal(validSolanaAddress(USDC), true);
  assert.equal(validSolanaAddress("0" + SOL.slice(1)), false);
  assert.equal(validSolanaAddress(SOL.slice(0, -1)), false);
  assert.equal(validSolanaAddress("x".repeat(44)), false);
  assert.equal(validSolanaAddress(""), false);
});

test("normalization sorts liquidity, reports provenance and preserves missing values", () => {
  const a = pair({ liquidity: { usd: 120 }, volume: { h24: 999999 } });
  const b = pair({ pairAddress: OTHER, liquidity: { usd: 200000 }, volume: {} });
  const report = normalizeDexPairs([a, b], SOL, 1794370000000);
  assert.equal(report.status, "OBSERVED");
  assert.equal(report.primaryPool.address, OTHER);
  assert.equal(report.primaryPool.volume24hUsd, null);
  assert.equal(report.primaryPool.priceChange24hPct, -2.41);
  assert.equal(report.poolCount, 2);
  assert.equal(report.source.name, "DEX Screener");
  assert.equal(report.source.upstreamUpdatedAt, null);
  assert.equal(report.historyStatus, "INSUFFICIENT_HISTORY");
  assert.equal(report.unsupportedResearch.includes("contract_audit"), true);
});

test("reject malformed source responses; unknown tokens remain empty with no fake data", () => {
  assert.throws(() => normalizeDexPairs({ pairs: [pair()] }, SOL), /INVALID_PROVIDER_RESPONSE/);
  const empty = normalizeDexPairs([], SOL);
  assert.equal(empty.status, "NO_POOLS");
  assert.equal(empty.primaryPool, null);
  assert.equal(empty.token, null);
  assert.deepEqual(empty.pools, []);
  const wrongChain = normalizeDexPairs([pair({ chainId: "ethereum" })], SOL);
  assert.equal(wrongChain.poolCount, 0);
});

test("never silently coerce null, unsafe or absent market metrics to zero", () => {
  const report = normalizeDexPairs([pair({
    priceUsd: null, liquidity: null, volume: { h24: "bad" },
    txns: null, priceChange: { h24: null }
  })], SOL);
  const p = report.primaryPool;
  assert.equal(p.priceUsd, null);
  assert.equal(p.liquidityUsd, null);
  assert.equal(p.volume24hUsd, null);
  assert.equal(p.buys24h, null);
  assert.equal(p.priceChange24hPct, null);
});

test("fetch provider success is cached with explicit status", async () => {
  clearRadarCacheForTests();
  let called = 0;
  const fetchImpl = async url => {
    called++;
    assert.match(url, /api.dexscreener.com\/token-pairs\/v1\/solana\//);
    return { ok: true, status: 200, json: async () => [pair()] };
  };
  const first = await researchSolanaToken(SOL, { fetchImpl, now: 1794370000000 });
  const second = await researchSolanaToken(SOL, { fetchImpl, now: 1794370005000 });
  assert.equal(first.cacheStatus, "FRESH_FETCH");
  assert.equal(second.cacheStatus, "CACHED");
  assert.equal(called, 1);
  clearRadarCacheForTests();
});

test("provider timeout, 429 and invalid JSON fail closed without synthetic responses", async () => {
  clearRadarCacheForTests();
  await assert.rejects(
    researchSolanaToken(SOL, { fetchImpl: async () => { throw new Error("offline"); } }),
    err => err instanceof TokenRadarError && err.status === 503
  );
  await assert.rejects(
    researchSolanaToken(SOL, { fetchImpl: async () => ({ status: 429, ok: false }) }),
    err => err.code === "PROVIDER_RATE_LIMITED"
  );
  await assert.rejects(
    researchSolanaToken(SOL, { fetchImpl: async () => ({ status: 200, ok: true, json: async () => ({}) }) }),
    err => err.code === "INVALID_PROVIDER_RESPONSE"
  );
});
