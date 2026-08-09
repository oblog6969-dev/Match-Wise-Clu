// MatchWise — cloud sharing.
//
// A finished assessment is stored server-side and reduced to an 8-character
// code the partner can type in. No SDK: two plain fetch calls against
// Supabase's PostgREST RPC endpoints, so the app keeps its zero-dependency,
// no-build-step rule.
//
// The key below is the *publishable* key. It is meant to sit in client code.
// The `profiles` table has row-level security enabled with no policies, so
// this key cannot read, list, or delete anything directly — it can only call
// the two functions granted to it. See supabase/schema.sql.

const SUPABASE_URL = "https://xtrtilekegrzatnmgyul.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q0HMULAWDVVKtV7J6pbw_w_q4H42HYQ";

const RPC = fn => `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
const HEADERS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// Codes use a 31-symbol alphabet with 0/O/1/I/L removed so they survive being
// read aloud or retyped from a screenshot.
const CODE_LEN = 8;

/** "bpbg kzbd" / "bpbg-kzbd" -> "BPBGKZBD" */
export function normalizeCode(code) {
  return String(code || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/** "BPBGKZBD" -> "BPBG-KZBD" (display only; input accepts either) */
export function formatCode(code) {
  const c = normalizeCode(code);
  return c.length === CODE_LEN ? c.slice(0, 4) + "-" + c.slice(4) : c;
}

export function isCloudCode(code) {
  return normalizeCode(code).length === CODE_LEN;
}

async function rpc(fn, body, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(RPC(fn), {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`${fn} failed (${res.status}) ${detail}`.trim());
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Store a finished profile. Resolves to the share code.
 * Throws on network failure — callers fall back to the offline code.
 */
export async function saveProfile(profile, lang = "en") {
  const code = await rpc("create_profile", {
    p_name: String(profile.name).slice(0, 60),
    p_lang: lang === "ar" ? "ar" : "en",
    p_answers: profile.answers,
  });
  return normalizeCode(code);
}

/**
 * Look up a shared profile. Resolves to a profile object, or null when the
 * code is unknown or older than six months. Throws only on network failure,
 * so the UI can tell "wrong code" apart from "you're offline".
 */
export async function fetchProfile(code) {
  const wanted = normalizeCode(code);
  if (wanted.length !== CODE_LEN) return null;

  const rows = await rpc("get_profile", { p_code: wanted });
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row || !row.answers) return null;

  return {
    id: "cloud_" + row.code,
    code: row.code,
    name: row.name,
    date: row.created_at || new Date().toISOString(),
    expires: row.expires_at || null,
    answers: row.answers,
  };
}
