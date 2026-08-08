// MatchWise report renderer (pure SVG charts, printable)
import { CATS, t } from "./i18n.js";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// SVG radar chart of category scores
function radar(catScores, lang) {
  const keys = Object.keys(catScores);
  const n = keys.length, cx = 160, cy = 150, R = 105;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  let grid = "";
  for (let g = 1; g <= 4; g++) {
    const pts = keys.map((_, i) => pt(i, R * g / 4).join(",")).join(" ");
    grid += `<polygon points="${pts}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  }
  const axes = keys.map((_, i) => {
    const [x, y] = pt(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`;
  }).join("");
  const poly = keys.map((k, i) => pt(i, R * catScores[k] / 100).join(",")).join(" ");
  const labels = keys.map((k, i) => {
    const [x, y] = pt(i, R + 22);
    const name = CATS[k] ? CATS[k][lang] : k;
    return `<text x="${x}" y="${y}" font-size="9" text-anchor="middle" fill="var(--muted)">${esc(name)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 320 300" width="100%" style="max-width:380px">
    ${grid}${axes}
    <polygon points="${poly}" fill="var(--accent2)" fill-opacity=".25" stroke="var(--accent2)" stroke-width="2"/>
    ${labels}</svg>`;
}

function bars(catScores, lang) {
  return Object.entries(catScores).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
    <div class="cat-row">
      <span class="cat-name">${esc(CATS[c] ? CATS[c][lang] : c)}</span>
      <span class="cat-bar"><i style="width:${v}%"></i></span>
      <span class="cat-val">${v}%</span>
    </div>`).join("");
}

const LOVE = {
  words: { en: "Words of affirmation", ar: "كلمات التقدير" },
  time:  { en: "Quality time", ar: "الوقت النوعي" },
  acts:  { en: "Acts of service", ar: "أفعال الخدمة" },
  touch: { en: "Physical touch", ar: "اللمسة الجسدية" },
  gifts: { en: "Gifts", ar: "الهدايا" },
};
const B5 = {
  O: { en: "Openness", ar: "الانفتاح" }, C: { en: "Conscientiousness", ar: "الانضباط" },
  E: { en: "Extraversion", ar: "الانبساط" }, A: { en: "Agreeableness", ar: "الوفاق" },
  N: { en: "Emotional sensitivity", ar: "الحساسية الانفعالية" },
};

// Poles for the "where you lean" bars — neither end is better than the other
const POLES = {
  personality:   { lo:{en:"Reserved",ar:"متحفّظ"},        hi:{en:"Outgoing",ar:"منفتح"} },
  communication: { lo:{en:"Keeps it in",ar:"يكتم"},        hi:{en:"Talks it out",ar:"يتحدث"} },
  conflict:      { lo:{en:"Withdraws",ar:"ينسحب"},         hi:{en:"Engages calmly",ar:"يناقش بهدوء"} },
  money:         { lo:{en:"Spender",ar:"منفق"},            hi:{en:"Saver",ar:"مدّخر"} },
  lifestyle:     { lo:{en:"Homebody",ar:"بيتوتي"},         hi:{en:"Out and about",ar:"كثير الخروج"} },
  family:        { lo:{en:"Independent",ar:"مستقل"},       hi:{en:"Family-centred",ar:"متمحور حول العائلة"} },
  values:        { lo:{en:"Secular",ar:"غير متديّن"},      hi:{en:"Practising",ar:"ملتزم"} },
  career:        { lo:{en:"Life first",ar:"الحياة أولًا"}, hi:{en:"Career-driven",ar:"مدفوع بالعمل"} },
  trust:         { lo:{en:"Values privacy",ar:"يقدّر الخصوصية"}, hi:{en:"Fully open",ar:"منفتح تمامًا"} },
  emotional:     { lo:{en:"Self-contained",ar:"مكتفٍ ذاتيًا"}, hi:{en:"Needs closeness",ar:"يحتاج القرب"} },
  growth:        { lo:{en:"Prefers stability",ar:"يفضّل الاستقرار"}, hi:{en:"Embraces change",ar:"يتقبّل التغيير"} },
  future:        { lo:{en:"Roots down",ar:"جذور ثابتة"},   hi:{en:"Open road",ar:"طريق مفتوح"} },
};

export function renderSolo(s, p, lang) {
  const L = k => t(k, lang);

  const leanRows = Object.entries(s.catLean).map(([c, v]) => {
    const pole = POLES[c];
    const ends = pole
      ? `<div class="lean-ends"><span>${pole.lo[lang]}</span><span>${pole.hi[lang]}</span></div>` : "";
    return `<div class="lean-block">
      <div class="lean-head"><span>${esc(CATS[c] ? CATS[c][lang] : c)}</span><b>${v}%</b></div>
      <span class="cat-bar"><i style="width:${v}%"></i></span>${ends}
    </div>`;
  }).join("");

  const b5rows = Object.keys(B5).filter(k => k in s.bigFive).map(k => `
    <div class="cat-row"><span class="cat-name">${B5[k][lang]}</span>
      <span class="cat-bar"><i style="width:${s.bigFive[k]}%"></i></span>
      <span class="cat-val">${s.bigFive[k]}%</span>
    </div>`).join("");

  const loveRow = s.love
    ? `<p style="margin-top:12px">${L("sLove")}: <b>${LOVE[s.love][lang]}</b></p>` : "";

  const flags = s.flags.length ? `
    <div class="card report-section"><h3>🔍 ${L("sFlags")}</h3>
      <p class="muted small" style="margin-bottom:10px">${L("sFlagNote")}</p>
      ${s.flags.map(([a, b]) => `<div class="tip">${esc(a[lang])}<br><span class="muted">↕</span><br>${esc(b[lang])}</div>`).join("")}
    </div>` : "";

  const answerList = s.answers.map(({ q, chosen }) => {
    let val = `<span class="muted">—</span>`;
    if (chosen?.opt) val = esc(chosen.opt[lang]);
    else if (chosen?.likert) val = `<b>${chosen.likert}</b> / 7`;
    return `<li><span class="ans-q">${esc(q[lang])}</span><span class="ans-v">${val}</span></li>`;
  }).join("");

  return `
  <div class="card score-hero report-section">
    <h2>${L("sTitle")}</h2>
    <p class="muted small">👤 ${esc(p.name)} · ${new Date(p.date).toLocaleDateString(lang === "ar" ? "ar" : "en")}</p>
    <div class="score-num">${s.confidence}%</div>
    <div class="badge ${s.confidence >= 75 ? "ok" : s.confidence >= 55 ? "warn" : "bad"}">${L("rConfidence")}</div>
    <p class="muted small" style="margin-top:10px">${t("sComplete", lang, { a: s.answered, b: s.total })}</p>
    <p class="disclaimer">${L("sSub")}</p>
  </div>
  <div class="card report-section"><h3>🧭 ${L("sLean")}</h3>
    <p class="muted small" style="margin-bottom:14px">${L("sLeanNote")}</p>
    ${leanRows}
  </div>
  <div class="card report-section"><h3>🧬 ${L("sTraits")}</h3>${b5rows}${loveRow}</div>
  ${flags}
  <div class="card report-section">
    <details><summary class="ans-summary">📋 ${L("sAnswers")}</summary>
      <ul class="answer-list">${answerList}</ul>
    </details>
  </div>`;
}

export function renderReport(res, pa, pb, lang) {
  const L = k => t(k, lang);
  const lvl = res.index >= 75 ? ["ok", L("levelHigh")] : res.index >= 55 ? ["warn", L("levelMid")] : ["bad", L("levelLow")];

  const b5rows = Object.keys(B5).filter(k => k in res.bigFive.a || k in res.bigFive.b).map(k => `
    <div class="cat-row"><span class="cat-name">${B5[k][lang]}</span>
      <span class="cat-bar"><i style="width:${res.bigFive.a[k] ?? 0}%;background:var(--accent)"></i></span>
      <span class="cat-bar"><i style="width:${res.bigFive.b[k] ?? 0}%;background:var(--accent2)"></i></span>
    </div>`).join("");

  const loveRow = (res.love.a && res.love.b) ? `
    <p class="small" style="margin-top:8px">💬 ${esc(pa.name)}: <b>${LOVE[res.love.a][lang]}</b> · ${esc(pb.name)}: <b>${LOVE[res.love.b][lang]}</b></p>` : "";

  const alerts = res.alerts.length ? `
    <div class="card report-section"><h3>⚠️ ${L("rDealbreakers")}</h3>
      ${res.alerts.map(q => `<div class="alert">${esc(q[lang])}</div>`).join("")}
    </div>` : "";

  const topics = res.topics.length ? `
    <div class="card report-section"><h3>🗣 ${L("rTalk")}</h3>
      ${res.topics.map(q => `<div class="tip">${esc(q[lang])}</div>`).join("")}
    </div>` : "";

  const list = arr => arr.length
    ? `<ul class="clean">${arr.map(c => `<li>${esc(CATS[c][lang])} — ${res.catScores[c]}%</li>`).join("")}</ul>`
    : `<p class="muted small">—</p>`;

  return `
  <div class="card score-hero report-section">
    <h2>${L("rTitle")}</h2>
    <p class="muted small">${esc(pa.name)} ♥ ${esc(pb.name)} · ${new Date().toLocaleDateString(lang === "ar" ? "ar" : "en")}</p>
    <div class="score-num">${res.index}%</div>
    <div class="badge ${lvl[0]}">${lvl[1]}</div>
    <p class="muted small" style="margin-top:10px">${L("rConfidence")}: ${res.confidence}%</p>
  </div>
  ${alerts}
  <div class="card report-section"><h3>📊 ${L("rRadar")}</h3>
    <div class="radar-wrap">${radar(res.catScores, lang)}</div>
  </div>
  <div class="card report-section"><h3>${L("rCats")}</h3>${bars(res.catScores, lang)}</div>
  <div class="card report-section"><h3>💪 ${L("rStrengths")}</h3>${list(res.strengths)}</div>
  <div class="card report-section"><h3>🌱 ${L("rChallenges")}</h3>${list(res.challenges)}</div>
  ${topics}
  <div class="card report-section"><h3>🧭 ${L("rSummary")}</h3>
    <div class="legend"><span><b style="background:var(--accent)"></b>${esc(pa.name)}</span>
    <span><b style="background:var(--accent2)"></b>${esc(pb.name)}</span></div>
    ${b5rows}${loveRow}
    <p class="disclaimer">${L("rDisclaimer")}</p>
  </div>`;
}
