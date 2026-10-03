// Per-IP fixed window, in memory. The backend already limits per API key, but
// this site uses one key, so without a per-visitor limit one person could use
// the whole site's quota. On Vercel each warm instance counts separately, so
// this is a courtesy limit, not a hard one: the hard ceiling is the backend's
// per-key limit and the OpenRouter spending limit.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

const hits = new Map<string, { count: number; resetAt: number }>();

export function checkRate(ip: string, now = Date.now()) {
  if (hits.size > 5_000) {
    for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true as const };
  }
  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    return {
      ok: false as const,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  return { ok: true as const };
}
