// MatchWise v8 — Insight Engine edge function.
// -----------------------------------------------------------------------------
// PHASE 1 STUB. This function does not call any model yet — it validates the
// request shape, applies the same rate-limit/CORS/size gates the real version
// will use, and returns a hard-coded VALID directive so the client transport
// (js/ai-client-v8.js) and the whole prefetch/timeout/abandon loop can be
// built and tested before any model cost is incurred.
//
// Swap-in point for the real model call is clearly marked below
// (`// PHASE-1-STUB:`). Nothing else needs to change when that happens.
//
// Contract: see "MatchWise Vault/v8 - AI Assessor Spec.md" §7 in the project.
// The AI (real, once wired) NEVER sets scores. This function only ever
// returns: which unanswered items to show next, which flagged consistency
// pairs got a clarifying answer, and — for report phases — narrative text
// plus evidence pointers into answers the user already gave. Every one of
// those is re-validated client-side before it can affect anything the user
// sees; this function's own job is just to not hand back garbage.
// -----------------------------------------------------------------------------

// ---------------------------------------------------------------- config ---

// Comma-separated list of allowed browser origins, e.g.
//   "https://matchwise.example,https://www.matchwise.example"
// Set via `supabase secrets set ALLOWED_ORIGINS=...`. Left unset, no browser
// origin is trusted — only non-browser callers (no Origin header, e.g. curl
// during testing) get through. This is intentionally the safer default: a
// forgotten wildcard here would let any site read partner answers.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map(s => s.trim()).filter(Boolean);

const MAX_PACKET_BYTES = 24 * 1024;          // spec §7.5
const MAX_CALLS_PER_SESSION = 20;            // spec §7.4
const MAX_CALLS_PER_IP_PER_HOUR = 60;        // spec §7.4 — conservative first value, revisit with real usage
const TIMEOUT_BUDGET_MS = 4000;              // matches the client's own budget (spec §4.2) — no point holding a connection open past what the client will use

const VALID_PHASES = new Set(["routing", "report_person", "report_couple"]);

// ---------------------------------------------------------- rate limiting --
// In-memory only. A Deno edge function instance can be recycled or scaled to
// multiple isolates at any time, so this is best-effort, not a hard cap.
// Good enough to blunt an accidental infinite loop or a casual script; NOT
// sufficient on its own against a determined abuser. If usage in production
// shows this matters, move counters to a Supabase table (a few rows, cheap)
// so the limit is shared across instances. Flagging this rather than quietly
// shipping a limiter that looks solid but isn't.
const sessionCounts = new Map<string, number>();
const ipWindows = new Map<string, { count: number; windowStart: number }>();

function sessionAllowed(sessionId: string): boolean {
  const n = (sessionCounts.get(sessionId) ?? 0) + 1;
  sessionCounts.set(sessionId, n);
  return n <= MAX_CALLS_PER_SESSION;
}

function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const w = ipWindows.get(ip);
  if (!w || now - w.windowStart > 60 * 60 * 1000) {
    ipWindows.set(ip, { count: 1, windowStart: now });
    return true;
  }
  w.count += 1;
  return w.count <= MAX_CALLS_PER_IP_PER_HOUR;
}

// ------------------------------------------------------------------ CORS --

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin);
  const h: HeadersInit = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
  if (allowed) h["Access-Control-Allow-Origin"] = origin!;
  return h;
}

// A browser Origin header that isn't on the allow-list is rejected outright
// (defense in depth — CORS headers alone only stop *browsers* from reading
// the response, they don't stop the request from being processed). A
// missing Origin header (non-browser caller: curl, server-to-server testing)
// is allowed through, since CORS is a browser-only concept.
function originIsTrusted(origin: string | null): boolean {
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

// -------------------------------------------------------- request schema --

interface RoutingPacket {
  sessionId: string;
  lang: "en" | "ar";
  phase: "routing";
  answered: Array<{ id: string; cat: string; type: string; value: unknown }>;
  openText: Array<{ id: string; text: string }>;
  unresolvedPairs: Array<{ aId: string; bId: string; gap: number }>;
  categoryCoverage: Array<{ cat: string; answered: number; total: number }>;
  remainingItemIds: string[];
  probeBudgetLeft: number;
  checkpointIndex: number;
}

function isRoutingPacket(b: any): b is RoutingPacket {
  return b && typeof b.sessionId === "string" && b.sessionId.length > 0 &&
    (b.lang === "en" || b.lang === "ar") &&
    b.phase === "routing" &&
    Array.isArray(b.answered) && Array.isArray(b.openText) &&
    Array.isArray(b.unresolvedPairs) && Array.isArray(b.categoryCoverage) &&
    Array.isArray(b.remainingItemIds) &&
    typeof b.probeBudgetLeft === "number" && typeof b.checkpointIndex === "number";
}

function isReportPacket(b: any): boolean {
  // Report-phase request shape is intentionally looser here — it's finalized
  // in Phase 5 alongside report-v8.js, which is what actually produces it.
  // For the Phase 1 round-trip test, only the envelope fields matter.
  return b && typeof b.sessionId === "string" && b.sessionId.length > 0 &&
    (b.lang === "en" || b.lang === "ar") &&
    (b.phase === "report_person" || b.phase === "report_couple");
}

// ------------------------------------------------------- response schema --
// Mirrors spec §4.4 (routing) and §6.1/§6.2 (report). Every field the model
// will eventually produce is validated here before it leaves this function —
// not trusted, checked. The stub trivially passes its own validator; once
// the real model call is wired in, a response that fails this check is
// discarded and {} is returned instead (spec §7.3), same as today.

function isValidRoutingDirective(d: any): boolean {
  if (!d || typeof d !== "object") return false;
  if (!Array.isArray(d.injectItems) || !d.injectItems.every((x: unknown) => typeof x === "string")) return false;
  if (!Array.isArray(d.reorder) || !d.reorder.every((x: unknown) => typeof x === "string")) return false;
  if (!Array.isArray(d.pairResolutions)) return false;
  for (const r of d.pairResolutions) {
    if (!r || typeof r.aId !== "string" || typeof r.bId !== "string" || typeof r.resolvedBy !== "string") return false;
  }
  if (typeof d.probesUsed !== "number") return false;
  return true;
}

function isValidReportDirective(d: any): boolean {
  // Loose envelope check for Phase 1. Tightened in Phase 5 to match
  // report-v8.js's actual consumer shape (spec §6).
  return d && typeof d === "object";
}

// PHASE-1-STUB: canned, schema-valid responses. Replace the body of these
// two functions with the real Anthropic API call when Phase 1's transport
// test passes. Everything around them — size/rate/CORS gates, the
// validators above, the response envelope below — stays as-is.

function stubRoutingDirective() {
  return {
    injectItems: [],
    reorder: [],
    pairResolutions: [],
    probesUsed: 0,
  };
}

function stubReportDirective(phase: "report_person" | "report_couple") {
  if (phase === "report_person") {
    return { card: { summary: "", consistency: "", mattersMost: [] } };
  }
  return { insights: [], conversations: [], divergences: [] };
}

// ------------------------------------------------------------------ main --

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const started = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders(origin) });
  }

  if (!originIsTrusted(origin)) {
    // Deliberately vague — don't help a probe figure out the allow-list.
    return new Response(JSON.stringify({}), { status: 403, headers: corsHeaders(origin) });
  }

  const lenHeader = req.headers.get("content-length");
  if (lenHeader && Number(lenHeader) > MAX_PACKET_BYTES) {
    return new Response(JSON.stringify({}), { status: 413, headers: corsHeaders(origin) });
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).length > MAX_PACKET_BYTES) {
    return new Response(JSON.stringify({}), { status: 413, headers: corsHeaders(origin) });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({}), { status: 400, headers: corsHeaders(origin) });
  }

  if (!body || typeof body.phase !== "string" || !VALID_PHASES.has(body.phase)) {
    return new Response(JSON.stringify({}), { status: 400, headers: corsHeaders(origin) });
  }

  if (typeof body.sessionId !== "string" || body.sessionId.length === 0) {
    return new Response(JSON.stringify({}), { status: 400, headers: corsHeaders(origin) });
  }

  if (!sessionAllowed(body.sessionId)) {
    return new Response(JSON.stringify({}), { status: 429, headers: corsHeaders(origin) });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!ipAllowed(ip)) {
    return new Response(JSON.stringify({}), { status: 429, headers: corsHeaders(origin) });
  }

  let status = 200;
  let result: unknown = {};

  if (body.phase === "routing") {
    if (!isRoutingPacket(body)) {
      status = 400;
    } else {
      // PHASE-1-STUB — see note above stubRoutingDirective().
      const directive = stubRoutingDirective();
      result = isValidRoutingDirective(directive) ? directive : {};
    }
  } else {
    if (!isReportPacket(body)) {
      status = 400;
    } else {
      // PHASE-1-STUB — see note above stubReportDirective().
      const directive = stubReportDirective(body.phase);
      result = isValidReportDirective(directive) ? directive : {};
    }
  }

  // Log shape only — never packet content. `answered`/`openText`/etc. are
  // deliberately not referenced anywhere in this log line.
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    phase: body.phase,
    status,
    latencyMs: Date.now() - started,
  }));

  return new Response(JSON.stringify(result), {
    status,
    headers: { ...corsHeaders(origin), "content-type": "application/json" },
  });
});
