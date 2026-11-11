// SignalForge Token Radar R1 — public, read-only source-backed Solana DEX observations.
// This module NEVER falls back to synthetic prices, volume, liquidity or contract-risk data.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const INDEX = new Map(Array.from(ALPHABET).map((c, i) => [c, i]));
const CACHE_MS = 45000;
const cache = new Map();

export class TokenRadarError extends Error {
  constructor(code, status = 502) {
    super(code);
    this.name = "TokenRadarError";
    this.code = code;
    this.status = status;
  }
}

// Validate the byte length as well as the Base58 alphabet: a plausible string can
// still encode the wrong number of bytes and must not be presented as a mint.
export function validSolanaAddress(value) {
  if (typeof value !== "string" || value.length < 32 || value.length > 44) return false;
  let number = 0n;
  for (const ch of value) {
    const digit = INDEX.get(ch);
    if (digit === undefined) return false;
    number = number * 58n + BigInt(digit);
  }
  let bytes = 0;
  while (number > 0n) {
    bytes++;
    number >>= 8n;
  }
  const leadingZeroBytes = value.match(/^1*/)[0].length;
  return bytes + leadingZeroBytes === 32;
}

export function numericOrNull(value, min = 0) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min ? n : null;
}

function validPair(pair, mint) {
  return pair && typeof pair === "object" &&
    pair.chainId === "solana" &&
    pair.baseToken && typeof pair.baseToken.address === "string" &&
    pair.quoteToken && typeof pair.quoteToken.address === "string" &&
    validSolanaAddress(pair.pairAddress) &&
    (pair.baseToken?.address === mint || pair.quoteToken?.address === mint);
}

export function normalizeDexPairs(raw, mint, now = Date.now()) {
  if (!validSolanaAddress(mint)) throw new TokenRadarError("INVALID_SOLANA_ADDRESS", 400);
  if (!Array.isArray(raw)) throw new TokenRadarError("INVALID_PROVIDER_RESPONSE", 502);
  const pools = raw.filter(p => validPair(p, mint)).slice(0, 60).map(p => {
    const liquidityUsd = numericOrNull(p.liquidity?.usd);
    const volume24hUsd = numericOrNull(p.volume?.h24);
    const createdAtMs = numericOrNull(p.pairCreatedAt);
    const safeCreatedAt = createdAtMs && createdAtMs <= now ? new Date(createdAtMs).toISOString() : null;
    return {
      address: p.pairAddress,
      dex: typeof p.dexId === "string" ? p.dexId.slice(0, 60) : "Unknown DEX",
      base: {
        address: p.baseToken.address,
        name: String(p.baseToken.name || "Unknown").slice(0, 90),
        symbol: String(p.baseToken.symbol || "?").slice(0, 32)
      },
      quote: {
        address: p.quoteToken.address,
        name: String(p.quoteToken.name || "Unknown").slice(0, 90),
        symbol: String(p.quoteToken.symbol || "?").slice(0, 32)
      },
      priceUsd: numericOrNull(p.priceUsd),
      liquidityUsd,
      volume24hUsd,
      buys24h: numericOrNull(p.txns?.h24?.buys),
      sells24h: numericOrNull(p.txns?.h24?.sells),
      priceChange24hPct: numericOrNull(p.priceChange?.h24, -Infinity),
      createdAt: safeCreatedAt,
      ageHours: safeCreatedAt ? Math.round((now - createdAtMs) / 3600000) : null,
      explorerUrl: "https://dexscreener.com/solana/" + encodeURIComponent(p.pairAddress),
      source: "DEX Screener"
    };
  });
  pools.sort((a, b) => (b.liquidityUsd ?? -1) - (a.liquidityUsd ?? -1) ||
    (b.volume24hUsd ?? -1) - (a.volume24hUsd ?? -1) ||
    a.address.localeCompare(b.address));
  const primary = pools[0] || null;
  const token = primary ? (primary.base.address === mint ? primary.base : primary.quote) : null;
  return {
    chainId: "solana",
    address: mint,
    status: primary ? "OBSERVED" : "NO_POOLS",
    token,
    primaryPool: primary,
    pools,
    poolCount: pools.length,
    poolSelection: "Highest reported USD liquidity; 24-hour volume breaks ties. Not a safety ranking.",
    source: {
      name: "DEX Screener",
      endpoint: "https://api.dexscreener.com/token-pairs/v1/solana/" + mint,
      observedAt: new Date(now).toISOString(),
      upstreamUpdatedAt: null,
      freshness: "PROVIDER_CACHED",
      caveat: "Observation time is the retrieval time, not the last onchain transaction time. Provider data may be delayed."
    },
    explorerUrl: "https://solscan.io/token/" + mint,
    unsupportedResearch: ["holder_distribution", "mint_authority", "freeze_authority", "contract_audit"],
    historyStatus: "INSUFFICIENT_HISTORY"
  };
}

async function fetchDexScreener(mint, fetchImpl, now) {
  const endpoint = "https://api.dexscreener.com/token-pairs/v1/solana/" + mint;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "GET",
      headers: { "accept": "application/json" },
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    throw new TokenRadarError("PROVIDER_UNAVAILABLE", 503);
  }
  if (response.status === 429) throw new TokenRadarError("PROVIDER_RATE_LIMITED", 503);
  if (!response.ok) throw new TokenRadarError("PROVIDER_HTTP_ERROR", 503);
  let data;
  try { data = await response.json(); }
  catch { throw new TokenRadarError("INVALID_PROVIDER_RESPONSE", 502); }
  return normalizeDexPairs(data, mint, now);
}

export const TOKEN_PROVIDERS = Object.freeze({
  dexscreener: Object.freeze({ id: "dexscreener", label: "DEX Screener", lookup: fetchDexScreener })
});

export async function researchSolanaToken(mint, opts = {}) {
  if (!validSolanaAddress(mint)) throw new TokenRadarError("INVALID_SOLANA_ADDRESS", 400);
  const now = opts.now ?? Date.now();
  const provider = TOKEN_PROVIDERS[opts.provider || "dexscreener"];
  if (!provider) throw new TokenRadarError("UNSUPPORTED_PROVIDER", 400);
  const key = provider.id + ":" + mint;
  const old = cache.get(key);
  if (!opts.noCache && old && now - old.at >= 0 && now - old.at < CACHE_MS) {
    return { ...old.data, cacheStatus: "CACHED" };
  }
  const data = await provider.lookup(mint, opts.fetchImpl || fetch, now);
  if (cache.size > 256) cache.clear();
  cache.set(key, { at: now, data });
  return { ...data, cacheStatus: "FRESH_FETCH" };
}

export function clearRadarCacheForTests() { cache.clear(); }
