// MatchWise v8 — Insight Engine transport.
// -----------------------------------------------------------------------------
// Pure transport. No SDK, one plain fetch, matching the project's existing
// zero-dependency rule (see js/cloud.js, same pattern). This file knows
// nothing about the quiz, the question bank, or scoring — it only knows how
// to send a packet to the edge function and hand back whatever came back, or
// null. Every caller (js/ai-session-v8.js, built in Phase 2) MUST treat a
// null return as "the Insight Engine said nothing this time" and continue
// exactly as if the layer were switched off. That silence is the whole
// point — see "MatchWise Vault/v8 - AI Assessor Spec.md" §4.2 and §10.
//
// This file never throws. Every failure mode — offline, timeout, a 4xx/5xx,
// a response that isn't valid JSON — ends the same way: resolve to null.
// -----------------------------------------------------------------------------

const AI8_SUPABASE_URL = "https://xtrtilekegrzatnmgyul.supabase.co";
const AI8_SUPABASE_KEY = "sb_publishable_Q0HMULAWDVVKtV7J6pbw_w_q4H42HYQ";
const ASSESS_URL = `${AI8_SUPABASE_URL}/functions/v1/assess`;

const DEFAULT_TIMEOUT_MS = 4000; // must match the edge function's own budget — see supabase/functions/assess/index.ts TIMEOUT_BUDGET_MS
const MIN_RETRY_BUDGET_MS = 800; // below this, a retry can't realistically complete — skip it and just return null

async function attempt(packet, ms, signalExternal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  // If the caller aborted us (e.g. the checkpoint was cancelled because the
  // user already clicked Next), stop immediately rather than finishing a
  // request nobody will use.
  const onExternalAbort = () => ctrl.abort();
  signalExternal?.addEventListener("abort", onExternalAbort);

  try {
    const res = await fetch(ASSESS_URL, {
      method: "POST",
      headers: {
        "apikey": AI8_SUPABASE_KEY,
        "Authorization": `Bearer ${AI8_SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(packet),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, networkError: false };
    const data = await res.json().catch(() => null);
    if (data == null || typeof data !== "object") return { ok: false, networkError: false };
    return { ok: true, data };
  } catch (err) {
    // AbortError = our own timeout, or the caller's cancellation. Neither is
    // a "network error" worth retrying — the budget is simply spent.
    const isAbort = err && err.name === "AbortError";
    return { ok: false, networkError: !isAbort };
  } finally {
    clearTimeout(timer);
    signalExternal?.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * Send one state packet (routing) or report request (report_person /
 * report_couple) to the Insight Engine. Resolves to the parsed JSON
 * directive on success, or `null` on ANY failure — timeout, offline, a
 * non-2xx status, a malformed body. Never rejects.
 *
 * One retry is attempted, but only after a genuine network-level failure
 * (DNS, connection refused, dropped connection) — never after a timeout and
 * never after a 4xx/5xx, since retrying either of those just spends the
 * checkpoint's 4s budget for no better odds. See spec §4.2.
 *
 * @param {object} packet
 * @param {{timeoutMs?: number, signal?: AbortSignal}} [opts]
 * @returns {Promise<object|null>}
 */
export async function postPacket(packet, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();

  const first = await attempt(packet, timeoutMs, opts.signal);
  if (first.ok) return first.data;
  if (!first.networkError) return null;

  const remaining = timeoutMs - (Date.now() - startedAt);
  if (remaining < MIN_RETRY_BUDGET_MS) return null;

  const second = await attempt(packet, remaining, opts.signal);
  return second.ok ? second.data : null;
}

/**
 * Fire-and-forget wake-up call for the Supabase project, which sleeps when
 * idle (observed cold start: ~30-60s). Call once at app load, before the
 * quiz's first real checkpoint, so that checkpoint isn't the one paying the
 * wake-up cost. Result is intentionally ignored — this function never
 * resolves to anything meaningful and never throws.
 */
export function warmUp() {
  try {
    fetch(ASSESS_URL, {
      method: "POST",
      headers: {
        "apikey": AI8_SUPABASE_KEY,
        "Authorization": `Bearer ${AI8_SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId: "warmup", lang: "en", phase: "routing",
        answered: [], openText: [], unresolvedPairs: [], categoryCoverage: [],
        remainingItemIds: [], probeBudgetLeft: 0, checkpointIndex: 0 }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Some environments (very old Safari, certain privacy modes) can throw
    // synchronously on fetch construction rather than rejecting. Either way,
    // a failed warm-up is not an error — the first real checkpoint will just
    // eat the cold-start latency and time out normally.
  }
}
