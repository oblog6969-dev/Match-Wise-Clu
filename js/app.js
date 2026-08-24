// MatchWise — app controller
import { STR, t } from "./i18n.js";
import { compare, soloSummary } from "./scoring.js";
import { renderReport, renderSolo } from "./report.js";
import { renderReportV3, renderSoloV3 } from "./report-v3.js";
import { saveProfile, fetchProfile, formatCode, normalizeCode, isCloudCode } from "./cloud.js";
import { MODULES, activeQuestions } from "./questions-v3.js";
import { compareV3, soloSummaryV3, isV3Answers } from "./scoring-v3.js";
import { buildBankV4 } from "./questions-v4.js";
import { compareV4, soloSummaryV4, genderOf, stageOf, GENDER_KEY, STAGE_KEY } from "./scoring-v4.js";
import { renderReportV4, renderSoloV4 } from "./report-v4.js";
import { renderReportV5 } from "./report-v5.js";
import { renderReportV6, renderSoloV6 } from "./report-v6.js";
import { renderReportV7, renderSoloV7 } from "./report-v7.js";
import { buildDemoProfiles, DEMO_IDS } from "./demo-v5.js";
import { encryptText, decryptText, isEncrypted } from "./crypto-v5.js";
// v8 — Insight Engine. Entirely optional: every call site below is guarded
// so the app behaves exactly as it does today with this off or unreachable.
// See "MatchWise Vault/v8 - AI Assessor Spec.md" §9 for why these are the
// only three touch points.
import { createAiSession } from "./ai-session-v8.js";
import { warmUp } from "./ai-client-v8.js";
import { buildAiReportAddon, renderAiReportAddon } from "./report-v8.js";

// ---------- v4 routing ----------
// v4 is the version new assessments are taken in. Older profiles are NOT
// migrated: a v2 pair still renders through the v2 report and a v3 pair
// through the v3 report, exactly as before. v4 is reached when either side
// carries a v4 marker — a v4-only item id, or the gender key. Everything
// v4 adds is additive, so a v3 profile compared against a v4 one simply
// scores on the items they share, which is the same graceful path v3
// already established for v2.
const isV4 = p => !!(p && p.answers &&
  (genderOf(p) || stageOf(p) || ["n1", "n2", "n3", "n4"].some(id => p.answers[id] != null)));

// ---------- v3 routing helpers ----------
// A profile is "v3" purely by virtue of which item ids appear in its answers
// — see isV3Answers() in scoring-v3.js. Nothing is stamped on the profile
// object, so every existing profile (local storage, downloaded .json, share
// codes, Supabase rows) keeps working with zero migration.
//
// Step 3 shipped a bridge that flattened v3 results into v2's report shape
// so profiles rendered before report-v3.js existed. That bridge is gone now
// — v3 profiles go straight through renderSoloV3/renderReportV3, which
// understand the real {value,n,sufficient} shape and draw the attachment
// chart, methodology panel and quality banner report.js never had.
//
// Partner-shared profiles must not expose the itemized answer list — only
// aggregate results. Self-restored backups (via the "Choose file…" flow)
// are NOT redacted; that path is documented as personal recovery, not
// sharing. See MODULES.intimacy note in questions-v3.js for why this had to
// be true before the intimacy module could ship.
function redactAnswerList(s) {
  return { ...s, answers: s.answers.map(a => ({ q: a.q, chosen: null })) };
}

const $ = s => document.querySelector(s);
const LS = { profiles: "mw_profiles", lang: "mw_lang", theme: "mw_theme", encrypt: "mw_encrypt_exports", aiEnabled: "mw_ai_enabled" };

let lang = localStorage.getItem(LS.lang) || "en";
const prefersDark = () => !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
let theme = localStorage.getItem(LS.theme) || (prefersDark() ? "dark" : "light");
// quiz.bank: the actual question list being asked, chosen at "Begin" from
// the intimacy toggle. quiz.intimacy: the toggle's current value.
let quiz = { name: "", i: 0, answers: {}, bank: [], intimacy: true };

// v8 — Insight Engine. No UI toggle exists yet (Phase 6 adds the Settings
// checkbox bound to this same key) — until then this defaults to on with no
// way to turn it off in the UI, but the localStorage key is already the
// real switch so Phase 6 needs no further app.js changes, only a checkbox.
// aiSession is (re)created per quiz in the "begin-quiz" handler below and is
// null whenever the AI layer is off or between quizzes — every call site
// uses `aiSession?.method(...)`, so null is always a safe, silent no-op.
function aiEnabled() { return localStorage.getItem(LS.aiEnabled) !== "0"; }
let aiSession = null;
if (aiEnabled()) warmUp();

// ---------- persistence ----------
const getProfiles = () => JSON.parse(localStorage.getItem(LS.profiles) || "[]");
const saveProfiles = p => localStorage.setItem(LS.profiles, JSON.stringify(p));

// share code: base64url of compact JSON. `v` is written for humans reading
// the payload — nothing in this app parses it back out (see decodeProfile
// below), so getting it right is a courtesy, not a functional requirement.
const encodeProfile = p => btoa(unescape(encodeURIComponent(JSON.stringify({ n: p.name, d: p.date, a: p.answers, v: isV4(p) ? 4 : isV3Answers(p.answers) ? 3 : 2 }))));
function decodeProfile(code) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!o.a || !o.n) return null;
    return { id: "imp_" + Date.now(), name: o.n, date: o.d || new Date().toISOString(), answers: o.a };
  } catch { return null; }
}

// ---------- i18n / theme ----------
// ---------- profile files (.json) ----------
// A downloadable, human-readable backup. Re-uploadable to regenerate the report.
//
// v5: encryption is opt-in (see #encryptExportsCheck) and OFF by default —
// see the guardrail note in crypto-v5.js. When it's off this produces
// exactly the plain JSON it always has; nothing reading these files today
// has to change.
const encryptExportsOn = () => localStorage.getItem(LS.encrypt) === "1";

async function profileToFile(p) {
  const plain = JSON.stringify({
    app: "MatchWise", version: isV4(p) ? 4 : isV3Answers(p.answers) ? 3 : 2, name: p.name, date: p.date,
    code: p.code || undefined, answers: p.answers,
  }, null, 2);
  return encryptExportsOn() ? encryptText(plain) : plain;
}

/**
 * Throws with `.code === "wrong-device"` (see crypto-v5.js) when the text is
 * an encrypted envelope this browser cannot open — callers show a specific
 * message for that instead of "not a valid profile".
 */
async function fileToProfile(text) {
  const plain = isEncrypted(text) ? await decryptText(text) : text;
  try {
    const o = JSON.parse(plain);
    // accept our own file format, or a bare {name, answers}
    const name = o.name ?? o.n, answers = o.answers ?? o.a;
    if (!name || !answers || typeof answers !== "object") return null;
    return { id: "f_" + Date.now(), name, date: o.date || new Date().toISOString(),
             code: o.code || null, answers };
  } catch { return null; }
}
async function downloadProfile(p) {
  const safe = String(p.name).replace(/[^\w؀-ۿ-]+/g, "_").slice(0, 20);
  const text = await profileToFile(p);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `matchwise-${safe}-${p.date.slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- solo preview ----------
let lastSolo = null;
function showSolo(p) {
  lastSolo = p;
  const v4 = isV4(p), v3 = isV3Answers(p.answers);
  let s = v4 ? soloSummaryV4(p) : v3 ? soloSummaryV3(p) : soloSummary(p);
  if (p.imported) s = redactAnswerList(s);
  $("#soloRoot").innerHTML = v4 ? renderSoloV7(s, p, lang)
    : v3 ? renderSoloV3(s, p, lang) : renderSolo(s, p, lang);
  // v5: a demo profile is illustrative sample data, never a real person's —
  // it must not leave the device as a downloadable file either.
  $("#soloDownloadBtn").style.display = p.demo ? "none" : "";
  show("solo");
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $("#langBtn").textContent = lang === "ar" ? "ع" : "EN";
  document.querySelectorAll("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n, lang));
  document.querySelectorAll("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh, lang));
  localStorage.setItem(LS.lang, lang);
  renderProfileList();
  applyIntimacyModuleCopy();
}
// Pulled straight from questions-v3.js MODULES rather than duplicated into
// i18n.js — one source of truth for text that's tightly coupled to the
// module's gating logic (see the "RESOLVED in step 3" note there).
function applyIntimacyModuleCopy() {
  const label = $("#intimacyLabel"), note = $("#intimacyNote"), wrap = $("#intimacyToggle");
  if (!label || !wrap) return;
  wrap.hidden = !MODULES.intimacy.ready;
  label.textContent = MODULES.intimacy.title[lang];
  note.textContent = MODULES.intimacy.privacy[lang];
}
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  $("#themeBtn").textContent = theme === "dark" ? "☀" : "☾";
  localStorage.setItem(LS.theme, theme);
}

// ---------- navigation ----------
function show(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $("#screen-" + id).classList.add("active");
  window.scrollTo({ top: 0 });
}

// ---------- profiles UI ----------
function renderProfileList() {
  const list = getProfiles();
  const box = $("#profileList");
  box.innerHTML = list.length ? "" : `<p class="profile-empty">${t("noProfiles", lang)}</p>`;
  for (const p of list) {
    const div = document.createElement("div");
    div.className = "profile-item";
    // v5: demo profiles carry a visible tag and no download button — they
    // are sample data, never a real person's file. See demo-v5.js.
    div.innerHTML = `<span>👤 <b></b> <span class="muted small">${new Date(p.date).toLocaleDateString()}</span>
        ${p.demo ? `<span class="demo-badge">${t("demoTag", lang)}</span>` : ""}
        ${p.code ? `<div class="code-chip">${formatCode(p.code)}</div>` : ""}</span>
      <span class="item-actions">
        <button class="mini prev">${t("previewBtn", lang)}</button>
        ${p.demo ? "" : `<button class="mini dl" title="Download">⤓</button>`}
        <button class="del" title="Delete">✕</button>
      </span>`;
    div.querySelector("b").textContent = p.name;
    div.querySelector(".prev").onclick = () => showSolo(p);
    const dl = div.querySelector(".dl");
    if (dl) dl.onclick = () => downloadProfile(p);
    div.querySelector(".del").onclick = () => { saveProfiles(list.filter(x => x.id !== p.id)); renderProfileList(); fillSelects(); };
    box.appendChild(div);
  }
  fillSelects();
}
function fillSelects() {
  const list = getProfiles();
  for (const sel of [$("#selectA"), $("#selectB"), $("#selectPreview")]) {
    if (!sel) continue;
    const cur = sel.value;
    sel.innerHTML = `<option value="">${t("select", lang)}</option>` +
      list.map(p => `<option value="${p.id}">${p.name} — ${new Date(p.date).toLocaleDateString()}</option>`).join("");
    sel.value = cur;
  }
}

// ---------- preview picker ----------
function openPreviewPicker() {
  fillSelects();
  const list = getProfiles();
  $("#previewLocal").hidden = list.length === 0;
  $("#previewEmpty").hidden = list.length > 0;
  if (list.length) $("#selectPreview").value = list[list.length - 1].id;
  $("#previewError").textContent = "";
  $("#previewCode").value = "";
  show("preview");
}

// ---------- quiz ----------
function renderQuestion() {
  // v8: apply any Insight Engine directive that resolved since the last
  // render — reorders/injects only ever land after quiz.i, so this is safe
  // to call unconditionally before quiz.bank[quiz.i] is read below.
  aiSession?.drainPending(quiz.bank, quiz.i);
  const q = quiz.bank[quiz.i];
  $("#progressFill").style.width = (quiz.i / quiz.bank.length * 100) + "%";
  $("#progressText").textContent = t("qOf", lang, { a: quiz.i + 1, b: quiz.bank.length });
  $("#backBtn").style.visibility = quiz.i > 0 ? "visible" : "hidden";

  const card = $("#questionCard");
  const catName = (STR.appName, q.cat); // category label via CATS in report; show simple tag:
  let html = `<div class="q-cat">${quiz.i + 1} / ${quiz.bank.length}</div>
    <div class="q-text">${q[lang]}</div>`;

  if (q.type === "likert") {
    html += `<div class="likert"><div class="likert-scale">` +
      [1,2,3,4,5,6,7].map(v => `<button class="likert-dot ${quiz.answers[q.id]===v?"sel":""}" data-v="${v}">${v}</button>`).join("") +
      `</div><div class="likert-labels"><span>${t("likertLow", lang)}</span><span>${t("likertHigh", lang)}</span></div></div>`;
  } else if (q.type === "text") {
    // v8 — open-text items (js/questions-v8.js). Always skippable: this is
    // the one question type in the whole quiz that doesn't require an
    // answer to advance. See spec §1 — even the presence of a Skip option
    // here must look identical in style to every other question's controls.
    const maxLen = q.maxLen || 500;
    const existing = quiz.answers[q.id] || "";
    html += `<div class="q-text-input">
      <textarea id="textAnswer" maxlength="${maxLen}">${existing}</textarea>
      <div class="q-text-counter"><span id="textCount">${existing.length}</span>/${maxLen}</div>
    </div>
    <div class="q-actions">
      <button class="opt" data-text-action="skip">${t("skipBtn", lang)}</button>
      <button class="opt" data-text-action="continue">${t("continueBtn", lang)}</button>
    </div>`;
  } else {
    html += q.opts.map((o, idx) => {
      const val = "v" in o ? o.v : o.k;
      const sel = quiz.answers[q.id] === val ? "sel" : "";
      return `<button class="opt ${sel}" data-idx="${idx}">${o[lang]}</button>`;
    }).join("");
  }
  card.innerHTML = html;

  if (q.type === "text") {
    const ta = $("#textAnswer"), count = $("#textCount");
    const maxLen = q.maxLen || 500;
    ta.placeholder = t("optTextPlaceholder", lang);
    ta.oninput = () => { count.textContent = ta.value.length; };
    card.querySelector('[data-text-action="skip"]').onclick = () => answerOptionalText(q, null);
    card.querySelector('[data-text-action="continue"]').onclick = () => answerOptionalText(q, ta.value.trim().slice(0, maxLen));
  } else {
    card.querySelectorAll(".likert-dot").forEach(b => b.onclick = () => answer(q, Number(b.dataset.v)));
    card.querySelectorAll(".opt").forEach(b => b.onclick = () => {
      const o = q.opts[Number(b.dataset.idx)];
      answer(q, "v" in o ? o.v : o.k);
    });
  }
}
// The 220ms pause is the selection animation. Without a guard, taps landing
// inside that window queue extra advances — and on the last question each one
// calls finishQuiz() again, saving a duplicate profile and publishing a
// duplicate share code. A stress test that tapped faster than the animation
// produced 62 profiles from a single run. `advancing` swallows anything that
// arrives before the transition completes.
let advancing = false;
// Shared by answer() and answerOptionalText() (v8's open-text items — the
// one question type that can be skipped, so it needs its own entry point
// but the exact same advance/guard timing as every other question).
function advanceQuiz() {
  advancing = true;
  setTimeout(() => {
    if (quiz.i < quiz.bank.length - 1) { quiz.i++; advancing = false; renderQuestion(); }
    // On the last question the guard stays latched deliberately: the quiz is
    // over, and nothing should be able to call finishQuiz() a second time.
    else finishQuiz();
  }, 220);
}
function answer(q, v) {
  if (advancing) return;
  quiz.answers[q.id] = v;
  // v8: record the answer and, if a checkpoint is due, fire it now — while
  // the user is still looking at the 220ms selection animation below, well
  // before they'd reach whatever question comes next. Never awaited: this
  // returns immediately and the checkpoint resolves (or times out) in the
  // background. See spec §4.2.
  aiSession?.onAnswer(q, v, quiz.bank, quiz.i, quiz.answers);
  advanceQuiz();
}
// v8 — open-text items only. `text` is null on Skip: nothing is written to
// quiz.answers (a skipped item must not appear "answered" to
// categoryCoverage or to the Insight Engine — see ai-session-v8.js), and
// the Insight Engine isn't notified either, since skipping isn't a signal
// worth spending checkpoint bookkeeping on.
function answerOptionalText(q, text) {
  if (advancing) return;
  if (text) {
    quiz.answers[q.id] = text;
    aiSession?.onAnswer(q, text, quiz.bank, quiz.i, quiz.answers);
  }
  advanceQuiz();
}
function finishQuiz() {
  // v8: carry this run's confirmed pair-resolution claims along with the
  // profile itself — under a reserved key, the same pattern GENDER_KEY/
  // STAGE_KEY already use, so it travels through every existing channel
  // (localStorage, .json export, the Supabase share code) with zero schema
  // changes, and is automatically invisible to compareV4()/
  // profileConfidenceV3() since neither iterates unknown answer keys. See
  // js/scoring-v8.js's parseResolutionLog(). Numeric confirmation of each
  // claim (does it actually narrow anything) happens there, not here —
  // this only persists what ai-session-v8.js structurally validated.
  if (aiSession) {
    const log = aiSession.getSessionSummary().resolutionLog;
    if (log.length) quiz.answers.__ai8 = JSON.stringify(log);
  }
  const profile = {
    id: "p_" + Date.now(),
    name: quiz.name,
    date: new Date().toISOString(),
    code: null,
    g: quiz.gender || null,
    s: quiz.stage || null,
    answers: quiz.answers,
  };
  const list = getProfiles(); list.push(profile); saveProfiles(list);
  renderProfileList();
  show("done");
  publishCode(profile);
}

// Upload the profile and show its short code. If the network is down the
// profile is already saved locally, so we offer a retry and point the user at
// the file download instead of losing their work.
let pendingProfile = null;
async function publishCode(profile) {
  pendingProfile = profile;
  const field = $("#shareCode"), err = $("#codeError"), retry = $("#codeRetryBtn"), life = $("#codeLife");

  if (profile.code) { field.value = formatCode(profile.code); return; }

  field.value = t("codeSaving", lang);
  err.hidden = true; retry.hidden = true; life.hidden = false;

  try {
    const code = await saveProfile(profile, lang);
    profile.code = code;
    // persist the code alongside the stored profile
    const list = getProfiles();
    const stored = list.find(p => p.id === profile.id);
    if (stored) { stored.code = code; saveProfiles(list); }
    field.value = formatCode(code);
    renderProfileList();
  } catch {
    field.value = "";
    life.hidden = true;
    err.hidden = false; err.textContent = t("codeOffline", lang);
    retry.hidden = false;
  }
}

// ---------- compare ----------
// v5 fix: the couple report used to be drawn once and never redrawn, so
// switching language while screen-report was open left the report showing
// its original language even though the rest of the app switched. `lastPair`
// remembers who is being compared so the language toggle (below) can call
// this again instead of only re-running the quiz/solo screens.
let lastPair = null;
function renderCoupleReport(pa, pb) {
  const bothV2 = !isV3Answers(pa.answers) && !isV3Answers(pb.answers);
  let compareResult = null;
  if (isV4(pa) || isV4(pb)) {
    // v7 wraps v6 (which wraps v5, which wraps v4) and adds the Type
    // Preferences card. Every layer is presentation-only: compareV4()'s index,
    // confidence and deal-breaker capping are untouched by all of them.
    compareResult = compareV4(pa, pb);
    $("#reportRoot").innerHTML = renderReportV7(compareResult, pa, pb, lang);
  } else if (bothV2) {
    $("#reportRoot").innerHTML = renderReport(compare(pa, pb), pa, pb, lang);
  } else {
    $("#reportRoot").innerHTML = renderReportV3(compareV3(pa, pb), pa, pb, lang);
  }
  lastPair = { pa, pb };
  show("report");

  // v8: purely additive, never blocks or replaces what's already on screen
  // above. Fires in the background after the real report is already showing
  // and appends its own DOM node only if/when something safe and non-empty
  // comes back — see report-v8.js's own header for the full contract. Guarded
  // against a stale report (language switch, a different pair opened while
  // this was in flight) by re-checking both lastPair and the active screen
  // before ever touching the DOM.
  if (compareResult && aiEnabled()) {
    const myPair = lastPair;
    buildAiReportAddon({ sessionId: crypto.randomUUID(), lang, pa, pb, compareResult })
      .then(addon => {
        if (lastPair !== myPair) return;
        if (!$("#screen-report").classList.contains("active")) return;
        const node = renderAiReportAddon(addon, pa, pb, lang);
        if (node) $("#reportRoot").appendChild(node);
      })
      .catch(() => {}); // a report-layer failure must never surface to the user
  }
}
function generate() {
  const list = getProfiles();
  const pa = list.find(p => p.id === $("#selectA").value);
  const pb = list.find(p => p.id === $("#selectB").value);
  const err = $("#compareError");
  if (!pa || !pb || pa.id === pb.id) { err.textContent = t("needTwo", lang); return; }
  err.textContent = "";
  renderCoupleReport(pa, pb);
}

// ---------- events ----------
document.addEventListener("click", e => {
  const a = e.target.closest("[data-action]");
  if (!a) return;
  const act = a.dataset.action;
  if (act === "go-home") show("home");
  if (act === "start") { $("#nameInput").value = ""; show("name"); }
  if (act === "go-compare") { fillSelects(); show("compare"); }
  if (act === "go-preview") openPreviewPicker();
  if (act === "begin-quiz") {
    const n = $("#nameInput").value.trim();
    if (!n) { $("#nameInput").focus(); return; }
    const intimacyEl = $("#intimacyCheck");
    const includeIntimacy = intimacyEl ? intimacyEl.checked : true;
    const gEl = document.querySelector('input[name="gender"]:checked');
    const gender = gEl && (gEl.value === "m" || gEl.value === "f") ? gEl.value : null;
    const sEl = document.querySelector('input[name="stage"]:checked');
    const stage = sEl && ["pre", "mar", "was"].includes(sEl.value) ? sEl.value : null;
    // Both keys are seeded into answers immediately so they travel with every
    // copy of this profile — share code, Supabase row, .json backup — without
    // a schema change. See genderOf() / stageOf() in scoring-v4.js.
    const seed = {};
    if (gender) seed[GENDER_KEY] = gender;
    if (stage) seed[STAGE_KEY] = stage;
    quiz = { name: n, i: 0, gender, stage, answers: seed, intimacy: includeIntimacy,
             bank: buildBankV4({ gender, stage, intimacy: includeIntimacy }) };
    // v8: a fresh session per quiz, never reused across runs. sessionId is
    // random and lives only for this run — never stored, never sent
    // alongside anything that could identify who took the quiz. See spec §8.
    aiSession = aiEnabled()
      ? createAiSession({ lang, sessionId: crypto.randomUUID(), enabled: true })
      : null;
    advancing = false;   // release the tap guard for the new run
    show("quiz"); renderQuestion();
  }
});
$("#backBtn").onclick = () => { if (advancing) return; if (quiz.i > 0) { quiz.i--; renderQuestion(); } };
// v5 fix: previously only the quiz screen re-rendered on a language switch,
// so a couple report or solo preview kept showing its original language
// while the rest of the app (including the report's own headings, which
// come from applyLang()'s data-i18n pass) switched underneath it.
$("#langBtn").onclick = () => {
  lang = lang === "en" ? "ar" : "en";
  applyLang();
  if ($("#screen-quiz").classList.contains("active")) renderQuestion();
  if ($("#screen-solo").classList.contains("active") && lastSolo) showSolo(lastSolo);
  if ($("#screen-report").classList.contains("active") && lastPair) renderCoupleReport(lastPair.pa, lastPair.pb);
};
$("#themeBtn").onclick = () => { theme = theme === "dark" ? "light" : "dark"; applyTheme(); };
$("#copyBtn").onclick = async () => {
  await navigator.clipboard.writeText($("#shareCode").value).catch(() => $("#shareCode").select());
  $("#copyBtn").textContent = t("copied", lang);
  setTimeout(() => $("#copyBtn").textContent = t("copyBtn", lang), 1500);
};
$("#shareBtn").onclick = () => {
  if (navigator.share) navigator.share({ title: "MatchWise", text: $("#shareCode").value });
  else $("#shareCode").select();
};
// Resolve whatever the user typed into a profile.
// Short 8-character strings are looked up on the server; anything longer is
// treated as a legacy v2 share code so old links keep working offline.
// Returns a profile, or null when the code simply doesn't exist.
// Throws only when the network fails, so callers can say so plainly.
//
// Every profile that arrives via a typed code is tagged `imported: true` —
// this is the partner-sharing path (as opposed to "Choose file…", which is
// documented as self-recovery of your own backup and is deliberately left
// untagged). showSolo() uses the tag to hide the itemized answer list.
async function resolveCode(raw) {
  const input = String(raw || "").trim();
  if (!input) return null;
  const p = isCloudCode(input) ? await fetchProfile(input) : decodeProfile(input);
  return p ? { ...p, imported: true } : p;
}

// Add to the local list unless an identical profile is already there.
function rememberProfile(p) {
  const list = getProfiles();
  const dupe = list.find(x => (p.code && x.code === p.code) ||
                              (x.name === p.name && JSON.stringify(x.answers) === JSON.stringify(p.answers)));
  if (dupe) return dupe;
  list.push(p); saveProfiles(list); renderProfileList();
  return p;
}

async function withBusy(btn, errEl, fn) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = t("importBusy", lang);
  errEl.style.color = ""; errEl.textContent = "";
  try {
    return await fn();
  } catch {
    errEl.textContent = t("netError", lang);
    return undefined;
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}

$("#importBtn").onclick = async () => {
  const err = $("#compareError"), btn = $("#importBtn");
  const p = await withBusy(btn, err, () => resolveCode($("#importCode").value));
  if (p === undefined) return;                       // network error, already shown
  if (!p) { err.textContent = t("importBad", lang); return; }

  const stored = rememberProfile(p);
  $("#importCode").value = "";
  fillSelects();
  // drop the newcomer straight into whichever slot is still empty
  if (!$("#selectA").value) $("#selectA").value = stored.id;
  else if (!$("#selectB").value || $("#selectB").value === $("#selectA").value) $("#selectB").value = stored.id;

  err.style.color = "var(--ok)"; err.textContent = t("importOk", lang);
  setTimeout(() => { err.textContent = ""; err.style.color = ""; }, 2500);
};

// ---------- preview screen ----------
$("#previewOpenBtn").onclick = () => {
  const p = getProfiles().find(x => x.id === $("#selectPreview").value);
  if (!p) { $("#previewError").textContent = t("importBad", lang); return; }
  showSolo(p);
};
$("#previewCodeBtn").onclick = async () => {
  const err = $("#previewError"), btn = $("#previewCodeBtn");
  const p = await withBusy(btn, err, () => resolveCode($("#previewCode").value));
  if (p === undefined) return;
  if (!p) { err.textContent = t("importBad", lang); return; }
  rememberProfile(p);
  showSolo(p);
};
$("#previewUploadBtn").onclick = () => $("#fileInput").click();
$("#donePreviewBtn").onclick = () => { if (pendingProfile) showSolo(pendingProfile); };
$("#codeRetryBtn").onclick = () => { if (pendingProfile) publishCode(pendingProfile); };

// Type the code in any case, with or without the dash.
for (const el of [$("#importCode"), $("#previewCode")]) {
  el.addEventListener("input", () => {
    const raw = normalizeCode(el.value).slice(0, 8);
    el.value = raw.length > 4 ? raw.slice(0, 4) + "-" + raw.slice(4) : raw;
  });
}
$("#generateBtn").onclick = generate;

// ---------- file download / upload ----------
$("#downloadBtn").onclick = () => {
  const list = getProfiles();
  const p = list[list.length - 1];
  if (p) downloadProfile(p);
};
$("#soloDownloadBtn").onclick = () => { if (lastSolo) downloadProfile(lastSolo); };

$("#uploadBtn").onclick = () => $("#fileInput").click();
$("#fileInput").onchange = async e => {
  const f = e.target.files[0];
  const msg = $("#fileMsg");
  if (!f) return;
  let p;
  try {
    p = await fileToProfile(await f.text());
  } catch (err) {
    e.target.value = "";
    msg.style.color = "";
    msg.textContent = err && err.code === "wrong-device" ? t("fileWrongDevice", lang) : t("fileBad", lang);
    return;
  }
  e.target.value = "";           // allow re-picking the same file
  if (!p) { msg.style.color = ""; msg.textContent = t("fileBad", lang); return; }
  const list = getProfiles(); list.push(p); saveProfiles(list);
  msg.textContent = ""; renderProfileList();
  showSolo(p);                   // straight to their report
};

// ---------- v5: demo profiles ----------
// One click, no fetch: buildDemoProfiles() generates both answer sets in the
// browser from the live question bank (see demo-v5.js). Loaded at most once
// — if the two demo ids are already saved, this only opens the compare
// screen with them pre-selected rather than duplicating the rows.
$("#demoBtn").onclick = () => {
  const list = getProfiles();
  const already = DEMO_IDS.every(id => list.some(p => p.id === id));
  if (!already) { saveProfiles([...list.filter(p => !DEMO_IDS.includes(p.id)), ...buildDemoProfiles()]); renderProfileList(); }
  fillSelects();
  const fresh = getProfiles();
  const a = fresh.find(p => p.id === "demo_a"), b = fresh.find(p => p.id === "demo_b");
  if (a) $("#selectA").value = a.id;
  if (b) $("#selectB").value = b.id;
  $("#compareError").style.color = "var(--ok)";
  $("#compareError").textContent = t("demoLoaded", lang);
  show("compare");
};

// ---------- PWA ----------
if ("serviceWorker" in navigator && location.protocol === "https:")
  navigator.serviceWorker.register("sw.js").catch(() => {});

// ---------- v5: encrypt-exports toggle ----------
$("#encryptExportsCheck").checked = encryptExportsOn();
$("#encryptExportsCheck").onchange = e => localStorage.setItem(LS.encrypt, e.target.checked ? "1" : "0");

// ---------- v8: Insight Engine opt-out toggle ----------
// Reflects aiEnabled() on load; writing "0"/"1" is exactly what aiEnabled()
// itself reads (see its definition near the top of this file). Turning this
// off takes effect on the NEXT quiz/report — a session already in progress
// (an existing `aiSession`, or an addon fetch already in flight from
// renderCoupleReport()) is not torn down mid-flight, matching how the
// encrypt-exports toggle above also only affects what happens next.
$("#aiEnabledCheck").checked = aiEnabled();
$("#aiEnabledCheck").onchange = e => localStorage.setItem(LS.aiEnabled, e.target.checked ? "1" : "0");

// ---------- init ----------
applyTheme();
applyLang();
show("home");
