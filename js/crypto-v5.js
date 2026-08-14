// MatchWise v5 export encryption — additive layer. No other file's exported
// function signatures change; js/app.js is the only caller.
// -----------------------------------------------------------------------------
// Encrypts a downloaded profile .json with AES-GCM-256 under a key that
// lives only in this browser's localStorage (`mw_device_key_v5`). No
// passphrase is asked for: the file re-imports automatically on the SAME
// device/browser via "Choose file…" — the same no-passphrase design
// documented for the build this was reviewed against. Moving the file to a
// different device or browser cannot decrypt it; that is the intended
// limit, not a bug. This protects a file sitting in email or a cloud drive,
// it is not a portable password.
//
// GUARDRAIL: this is opt-in (see the checkbox app.js wires up), OFF by
// default. Every .json this app has ever exported is plain, human-readable
// JSON — README calls that out explicitly — and something outside this app
// may already read those files. Turning encryption on by default would
// silently change that contract; a user (or a script of theirs) has to ask
// for it first.
// -----------------------------------------------------------------------------

const PREFIX = "MWENC1:";
const KEY_LS = "mw_device_key_v5";

function cryptoSupported() {
  return typeof crypto !== "undefined" && !!crypto.subtle && typeof crypto.subtle.encrypt === "function";
}

function toB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
}

async function deviceKey() {
  let raw = localStorage.getItem(KEY_LS);
  if (!raw) {
    raw = toB64(crypto.getRandomValues(new Uint8Array(32)).buffer);
    localStorage.setItem(KEY_LS, raw);
  }
  return crypto.subtle.importKey("raw", fromB64(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** True if `text` is this module's own envelope, vs. a legacy plain-JSON export. */
export function isEncrypted(text) {
  return typeof text === "string" && text.startsWith(PREFIX);
}

/** Only called when the user has opted in; the caller checks that. */
export async function encryptText(plain) {
  if (!cryptoSupported()) return plain; // no WebCrypto: ship plaintext rather than fail the download
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return PREFIX + btoa(JSON.stringify({ iv: toB64(iv.buffer), data: toB64(cipher) }));
}

/**
 * Reverses encryptText(). Throws with `.code === "wrong-device"` when the
 * envelope is well-formed but this browser doesn't hold the key that made
 * it (a different device, or localStorage was cleared) — callers use that
 * to show a specific message instead of "not a valid profile".
 */
export async function decryptText(text) {
  if (!isEncrypted(text)) return text;
  if (!cryptoSupported()) { const e = new Error("crypto-unsupported"); e.code = "wrong-device"; throw e; }
  try {
    const env = JSON.parse(atob(text.slice(PREFIX.length)));
    const key = await deviceKey();
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(env.iv) }, key, fromB64(env.data));
    return new TextDecoder().decode(plain);
  } catch {
    const e = new Error("decrypt-failed"); e.code = "wrong-device"; throw e;
  }
}
