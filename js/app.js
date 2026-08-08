// MatchWise — app controller
import { QUESTIONS } from "./questions.js";
import { STR, t } from "./i18n.js";
import { compare, soloSummary } from "./scoring.js";
import { renderReport, renderSolo } from "./report.js";

const $ = s => document.querySelector(s);
const LS = { profiles: "mw_profiles", lang: "mw_lang", theme: "mw_theme" };

let lang = localStorage.getItem(LS.lang) || "en";
const prefersDark = () => !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
let theme = localStorage.getItem(LS.theme) || (prefersDark() ? "dark" : "light");
let quiz = { name: "", i: 0, answers: {} };

// ---------- persistence ----------
const getProfiles = () => JSON.parse(localStorage.getItem(LS.profiles) || "[]");
const saveProfiles = p => localStorage.setItem(LS.profiles, JSON.stringify(p));

// share code: base64url of compact JSON
const encodeProfile = p => btoa(unescape(encodeURIComponent(JSON.stringify({ n: p.name, d: p.date, a: p.answers, v: 2 }))));
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
function profileToFile(p) {
  return JSON.stringify({
    app: "MatchWise", version: 2, name: p.name, date: p.date, answers: p.answers,
  }, null, 2);
}
function fileToProfile(text) {
  try {
    const o = JSON.parse(text);
    // accept our own file format, or a bare {name, answers}
    const name = o.name ?? o.n, answers = o.answers ?? o.a;
    if (!name || !answers || typeof answers !== "object") return null;
    return { id: "f_" + Date.now(), name, date: o.date || new Date().toISOString(), answers };
  } catch { return null; }
}
function downloadProfile(p) {
  const safe = String(p.name).replace(/[^\w؀-ۿ-]+/g, "_").slice(0, 20);
  const blob = new Blob([profileToFile(p)], { type: "application/json" });
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
  $("#soloRoot").innerHTML = renderSolo(soloSummary(p), p, lang);
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
    div.innerHTML = `<span>👤 <b></b> <span class="muted small">${new Date(p.date).toLocaleDateString()}</span></span>
      <span class="item-actions">
        <button class="mini prev">${t("previewBtn", lang)}</button>
        <button class="mini dl" title="Download">⤓</button>
        <button class="del" title="Delete">✕</button>
      </span>`;
    div.querySelector("b").textContent = p.name;
    div.querySelector(".prev").onclick = () => showSolo(p);
    div.querySelector(".dl").onclick = () => downloadProfile(p);
    div.querySelector(".del").onclick = () => { saveProfiles(list.filter(x => x.id !== p.id)); renderProfileList(); fillSelects(); };
    box.appendChild(div);
  }
  fillSelects();
}
function fillSelects() {
  const list = getProfiles();
  for (const sel of [$("#selectA"), $("#selectB")]) {
    const cur = sel.value;
    sel.innerHTML = `<option value="">${t("select", lang)}</option>` +
      list.map(p => `<option value="${p.id}">${p.name} — ${new Date(p.date).toLocaleDateString()}</option>`).join("");
    sel.value = cur;
  }
}

// ---------- quiz ----------
function renderQuestion() {
  const q = QUESTIONS[quiz.i];
  $("#progressFill").style.width = (quiz.i / QUESTIONS.length * 100) + "%";
  $("#progressText").textContent = t("qOf", lang, { a: quiz.i + 1, b: QUESTIONS.length });
  $("#backBtn").style.visibility = quiz.i > 0 ? "visible" : "hidden";

  const card = $("#questionCard");
  const catName = (STR.appName, q.cat); // category label via CATS in report; show simple tag:
  let html = `<div class="q-cat">${quiz.i + 1} / ${QUESTIONS.length}</div>
    <div class="q-text">${q[lang]}</div>`;

  if (q.type === "likert") {
    html += `<div class="likert"><div class="likert-scale">` +
      [1,2,3,4,5,6,7].map(v => `<button class="likert-dot ${quiz.answers[q.id]===v?"sel":""}" data-v="${v}">${v}</button>`).join("") +
      `</div><div class="likert-labels"><span>${t("likertLow", lang)}</span><span>${t("likertHigh", lang)}</span></div></div>`;
  } else {
    html += q.opts.map((o, idx) => {
      const val = "v" in o ? o.v : o.k;
      const sel = quiz.answers[q.id] === val ? "sel" : "";
      return `<button class="opt ${sel}" data-idx="${idx}">${o[lang]}</button>`;
    }).join("");
  }
  card.innerHTML = html;

  card.querySelectorAll(".likert-dot").forEach(b => b.onclick = () => answer(q, Number(b.dataset.v)));
  card.querySelectorAll(".opt").forEach(b => b.onclick = () => {
    const o = q.opts[Number(b.dataset.idx)];
    answer(q, "v" in o ? o.v : o.k);
  });
}
function answer(q, v) {
  quiz.answers[q.id] = v;
  setTimeout(() => {
    if (quiz.i < QUESTIONS.length - 1) { quiz.i++; renderQuestion(); }
    else finishQuiz();
  }, 220);
}
function finishQuiz() {
  const profile = {
    id: "p_" + Date.now(),
    name: quiz.name,
    date: new Date().toISOString(),
    answers: quiz.answers,
  };
  const list = getProfiles(); list.push(profile); saveProfiles(list);
  $("#shareCode").value = encodeProfile(profile);
  renderProfileList();
  show("done");
}

// ---------- compare ----------
function generate() {
  const list = getProfiles();
  const pa = list.find(p => p.id === $("#selectA").value);
  const pb = list.find(p => p.id === $("#selectB").value);
  const err = $("#compareError");
  if (!pa || !pb || pa.id === pb.id) { err.textContent = t("needTwo", lang); return; }
  err.textContent = "";
  const res = compare(pa, pb);
  $("#reportRoot").innerHTML = renderReport(res, pa, pb, lang);
  show("report");
}

// ---------- events ----------
document.addEventListener("click", e => {
  const a = e.target.closest("[data-action]");
  if (!a) return;
  const act = a.dataset.action;
  if (act === "go-home") show("home");
  if (act === "start") { $("#nameInput").value = ""; show("name"); }
  if (act === "go-compare") { fillSelects(); show("compare"); }
  if (act === "begin-quiz") {
    const n = $("#nameInput").value.trim();
    if (!n) { $("#nameInput").focus(); return; }
    quiz = { name: n, i: 0, answers: {} };
    show("quiz"); renderQuestion();
  }
});
$("#backBtn").onclick = () => { if (quiz.i > 0) { quiz.i--; renderQuestion(); } };
$("#langBtn").onclick = () => { lang = lang === "en" ? "ar" : "en"; applyLang(); if ($("#screen-quiz").classList.contains("active")) renderQuestion(); };
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
$("#importBtn").onclick = () => {
  const p = decodeProfile($("#importCode").value);
  const err = $("#compareError");
  if (!p) { err.textContent = t("importBad", lang); return; }
  const list = getProfiles(); list.push(p); saveProfiles(list);
  $("#importCode").value = "";
  err.textContent = ""; renderProfileList();
  err.style.color = "var(--ok)"; err.textContent = t("importOk", lang);
  setTimeout(() => { err.textContent = ""; err.style.color = ""; }, 2000);
};
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
  const p = fileToProfile(await f.text());
  e.target.value = "";           // allow re-picking the same file
  if (!p) { msg.style.color = ""; msg.textContent = t("fileBad", lang); return; }
  const list = getProfiles(); list.push(p); saveProfiles(list);
  msg.textContent = ""; renderProfileList();
  showSolo(p);                   // straight to their report
};

// ---------- PWA ----------
if ("serviceWorker" in navigator && location.protocol === "https:")
  navigator.serviceWorker.register("sw.js").catch(() => {});

// ---------- init ----------
applyTheme();
applyLang();
show("home");
