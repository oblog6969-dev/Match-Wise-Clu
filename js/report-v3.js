// MatchWise v3 report renderer — additive layer over v2.
// -----------------------------------------------------------------------------
// Does NOT modify js/report.js. report.js exports only renderSolo/renderReport
// — its escV3()/radarV3()/barsV3()/POLES/B5_V3/LOVE_V3 helpers are module-private, so they
// can't be imported and extended. This file duplicates the handful of small
// helpers it needs (same pattern already used in scoring-v3.js, for the same
// reason: nothing there is exported either). CATS *is* exported by i18n.js,
// so category labels are extended, not duplicated.
//
// Design: builds on the app's existing visual language (the rose→violet
// gradient used for the score number and progress bar, the soft rounded
// cards, the uppercase accent2 "eyebrow" labels) rather than introducing a
// new one — v2 and v3 screens should feel like the same app. The one new
// signature element is the attachment quadrant chart (see attachmentPlot
// below): a small, honestly-captioned 2-axis plot in the same restrained
// style as the existing radarV3 chart, using warm plain-language quadrant
// names instead of clinical attachment-theory jargon (nobody should read
// "disorganized" about themselves from a 6-item unvalidated questionnaire).
// -----------------------------------------------------------------------------

import { CATS, t } from "./i18n.js";
import { REFERENCE_RELIABILITY, SUBSCALE_MIN } from "./scoring-v3.js";

const escV3 = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ── Category labels & poles, extended for the 3 new scored categories ─────
// (attachment and quality are mt:"info"/w:0 — they never appear in
// catScores/catLean, so they need no entry here.)
const CATS_V3 = {
  ...CATS,
  appreciation: { en: "Appreciation", ar: "التقدير" },
  fairness: { en: "Fairness at Home", ar: "العدالة في المنزل" },
  intimacy: { en: "Physical Intimacy", ar: "القرب الجسدي" },
};
const POLES_V3 = {
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
  appreciation:  { lo:{en:"Rarely says it",ar:"نادرًا ما يعبّر"}, hi:{en:"Notices often",ar:"يلاحظ كثيرًا"} },
  fairness:      { lo:{en:"Traditional split",ar:"تقسيم تقليدي"}, hi:{en:"Fully shared",ar:"مشترك بالكامل"} },
  intimacy:      { lo:{en:"Private about it",ar:"يفضّل الخصوصية"}, hi:{en:"Openly expressive",ar:"معبّر بصراحة"} },
};
const LOVE_V3 = {
  words: { en: "Words of affirmation", ar: "كلمات التقدير" },
  time:  { en: "Quality time", ar: "الوقت النوعي" },
  acts:  { en: "Acts of service", ar: "أفعال الخدمة" },
  touch: { en: "Physical touch", ar: "اللمسة الجسدية" },
  gifts: { en: "Gifts", ar: "الهدايا" },
};
const B5_V3 = {
  O: { en: "Openness", ar: "الانفتاح" }, C: { en: "Conscientiousness", ar: "الانضباط" },
  E: { en: "Extraversion", ar: "الانبساط" }, A: { en: "Agreeableness", ar: "الوفاق" },
  N: { en: "Emotional sensitivity", ar: "الحساسية الانفعالية" },
};
const B5_ORDER = ["O", "C", "E", "A", "N"];

const NEED_MORE = {
  en: (n, needed) => `Not enough data yet (${n} of ${needed} questions answered)`,
  ar: (n, needed) => `لا توجد بيانات كافية بعد (تمت الإجابة عن ${n} من ${needed} أسئلة)`,
};

// ── Duplicated from report.js (not exported there — see file header) ─────
function radarV3(catScores, lang) {
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
    const name = CATS_V3[k] ? CATS_V3[k][lang] : k;
    return `<text x="${x}" y="${y}" font-size="9" text-anchor="middle" fill="var(--muted)">${escV3(name)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 320 300" width="100%" style="max-width:380px">
    ${grid}${axes}
    <polygon points="${poly}" fill="var(--accent2)" fill-opacity=".25" stroke="var(--accent2)" stroke-width="2"/>
    ${labels}</svg>`;
}
function barsV3(catScores, lang) {
  return Object.entries(catScores).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
    <div class="cat-row">
      <span class="cat-name">${escV3(CATS_V3[c] ? CATS_V3[c][lang] : c)}</span>
      <span class="cat-bar"><i style="width:${v}%"></i></span>
      <span class="cat-val">${v}%</span>
    </div>`).join("");
}

// ── Signature element: attachment quadrant chart ──────────────────────────
// x = anxiety (0 secure → 100 anxious), y = avoidance (0 secure → 100
// avoidant, plotted upward). Plain-language quadrant names on purpose — see
// file header. `pts`: [{x,y,name,color}], 1 or 2 points.
function attachmentPlot(pts, lang) {
  const S = 260, PAD = 34, W = S + PAD * 2;
  const px = v => PAD + (v / 100) * S;
  const py = v => PAD + S - (v / 100) * S;
  const QUAD = {
    en: ["Steady & open", "Seeks closeness", "Values independence", "Guarded but longing"],
    ar: ["مستقر ومنفتح", "يسعى للقرب", "يقدّر الاستقلالية", "متحفّظ لكنه يتوق للقرب"],
  }[lang];
  const dots = pts.map(p => `
    <circle cx="${px(p.x)}" cy="${py(p.y)}" r="8" fill="${p.color}" stroke="var(--card)" stroke-width="2.5"/>
    ${p.name ? `<text x="${px(p.x)}" y="${py(p.y) - 14}" font-size="11" font-weight="700" text-anchor="middle" fill="${p.color}">${escV3(p.name)}</text>` : ""}
  `).join("");
  return `<svg viewBox="0 0 ${W} ${W}" width="100%" style="max-width:320px;display:block;margin:0 auto">
    <rect x="${PAD}" y="${PAD}" width="${S/2}" height="${S/2}" fill="var(--ok)" fill-opacity=".06"/>
    <rect x="${PAD+S/2}" y="${PAD}" width="${S/2}" height="${S/2}" fill="var(--accent)" fill-opacity=".06"/>
    <rect x="${PAD}" y="${PAD+S/2}" width="${S/2}" height="${S/2}" fill="var(--accent2)" fill-opacity=".06"/>
    <rect x="${PAD+S/2}" y="${PAD+S/2}" width="${S/2}" height="${S/2}" fill="var(--warn)" fill-opacity=".08"/>
    <rect x="${PAD}" y="${PAD}" width="${S}" height="${S}" fill="none" stroke="var(--line)"/>
    <line x1="${PAD+S/2}" y1="${PAD}" x2="${PAD+S/2}" y2="${PAD+S}" stroke="var(--line)"/>
    <line x1="${PAD}" y1="${PAD+S/2}" x2="${PAD+S}" y2="${PAD+S/2}" stroke="var(--line)"/>
    <text x="${PAD+S*0.25}" y="${PAD+S*0.5-8}" font-size="9.5" text-anchor="middle" fill="var(--muted)">${escV3(QUAD[0])}</text>
    <text x="${PAD+S*0.75}" y="${PAD+S*0.5-8}" font-size="9.5" text-anchor="middle" fill="var(--muted)">${escV3(QUAD[1])}</text>
    <text x="${PAD+S*0.25}" y="${PAD+S*0.5+16}" font-size="9.5" text-anchor="middle" fill="var(--muted)">${escV3(QUAD[2])}</text>
    <text x="${PAD+S*0.75}" y="${PAD+S*0.5+16}" font-size="9.5" text-anchor="middle" fill="var(--muted)">${escV3(QUAD[3])}</text>
    <text x="${PAD+S/2}" y="${PAD+S+22}" font-size="10" text-anchor="middle" fill="var(--muted)">${lang==="ar"?"القلق ←":"→ Anxiety"}</text>
    <text x="${PAD-12}" y="${PAD+S/2}" font-size="10" text-anchor="middle" fill="var(--muted)" transform="rotate(-90 ${PAD-12} ${PAD+S/2})">${lang==="ar"?"التجنّب ←":"→ Avoidance"}</text>
    ${dots}
  </svg>`;
}

function attachmentSection(att, lang, opts = {}) {
  const L = k => t(k, lang);
  const ready = att.anx.sufficient && att.avo.sufficient;
  const caveat = { en: "Simplified labels from a short, unvalidated questionnaire — not a diagnosis.",
                   ar: "تصنيفات مبسّطة من استبيان قصير غير مُعتمَد علميًا — وليست تشخيصًا." }[lang];
  if (!ready) {
    const short = !att.anx.sufficient ? att.anx : att.avo;
    return `<div class="card report-section"><h3>🧭 ${L("v3Attachment")}</h3>
      <p class="muted small">${NEED_MORE[lang](short.n, SUBSCALE_MIN)}</p></div>`;
  }
  const pts = opts.pts || [{ x: att.anx.value, y: att.avo.value, color: "var(--accent2)" }];
  return `<div class="card report-section"><h3>🧭 ${L("v3Attachment")}</h3>
    <p class="muted small" style="margin-bottom:10px">${L("v3AttachmentNote")}</p>
    ${attachmentPlot(pts, lang)}
    ${opts.legend || ""}
    <p class="disclaimer">${caveat}</p>
  </div>`;
}

function qualityBanner(q, lang) {
  const bits = [];
  if (q.im.flagged) bits.push({ en: "A few of your answers to the absolute \"always / never\" questions came out unusually strong. That's common, and it only affects the confidence percentage — never your results.",
                                 ar: "بعض إجاباتك على أسئلة \"دائمًا / أبدًا\" المطلقة جاءت قوية بشكل غير معتاد. هذا أمر شائع، ويؤثر فقط على نسبة الموثوقية — لا على نتائجك." }[lang]);
  if (q.attention.tested && !q.attention.passed) bits.push({ en: "One question simply asked you to pick a specific number, to check attention. Your answer didn't match — it doesn't affect your results, but it's worth a look if anything here feels off.",
                                                               ar: "طلب أحد الأسئلة ببساطة اختيار رقم معيّن للتحقق من الانتباه. إجابتك لم تطابقه — هذا لا يؤثر على نتائجك، لكن يستحق نظرة إن شعرت أن شيئًا هنا غير دقيق." }[lang]);
  if (!bits.length) return "";
  return `<div class="notice report-section">${bits.map(b => `<p>${escV3(b)}</p>`).join("")}</div>`;
}

function methodologyPanel(lang, { itemCount, pairCount }) {
  const L = k => t(k, lang);
  const rr = REFERENCE_RELIABILITY;
  const rows = [
    { label: { en: "Attachment (anxiety)", ar: "التعلّق (القلق)" }, r: rr.attachment.anx },
    { label: { en: "Attachment (avoidance)", ar: "التعلّق (التجنّب)" }, r: rr.attachment.avo },
    { label: { en: "Personality traits", ar: "سمات الشخصية" }, r: rr.personality.O },
  ];
  const relRows = rows.map(r => `<li>${escV3(r.label[lang])}: α ${r.r.alpha[0]}–${r.r.alpha[1]} <span class="muted">(${escV3(r.r.source)})</span></li>`).join("");
  return `<div class="card report-section">
    <details><summary class="ans-summary">📐 ${L("v3Methodology")}</summary>
      <p class="small" style="margin-top:10px">${t("v3MethodItems", lang, { a: itemCount, b: pairCount })}</p>
      <p class="small muted" style="margin-top:8px">${L("v3MethodReliabilityIntro")}</p>
      <ul class="clean small">${relRows}</ul>
      <p class="small muted" style="margin-top:8px">${rr.note}</p>
      <p class="small muted" style="margin-top:8px">${L("v3MethodWeights")}</p>
      <p class="small muted" style="margin-top:8px">${L("v3MethodSimilarity")}</p>
    </details>
  </div>`;
}

// ── Solo report ─────────────────────────────────────────────────────────
export function renderSoloV3(s, p, lang) {
  const L = k => t(k, lang);

  const leanRows = Object.entries(s.catLean).map(([c, v]) => {
    const pole = POLES_V3[c];
    const ends = pole ? `<div class="lean-ends"><span>${pole.lo[lang]}</span><span>${pole.hi[lang]}</span></div>` : "";
    return `<div class="lean-block">
      <div class="lean-head"><span>${escV3(CATS_V3[c] ? CATS_V3[c][lang] : c)}</span><b>${v}%</b></div>
      <span class="cat-bar"><i style="width:${v}%"></i></span>${ends}
    </div>`;
  }).join("");

  const b5rows = B5_ORDER.map(k => {
    const d = s.bigFive[k];
    if (!d) return "";
    if (!d.sufficient) return `<div class="cat-row"><span class="cat-name">${B5_V3[k][lang]}</span><span class="muted small">${NEED_MORE[lang](d.n, SUBSCALE_MIN)}</span></div>`;
    return `<div class="cat-row"><span class="cat-name">${B5_V3[k][lang]}</span>
      <span class="cat-bar"><i style="width:${d.value}%"></i></span>
      <span class="cat-val">${d.value}%</span></div>`;
  }).join("");

  const loveRow = s.love ? `<p style="margin-top:12px">${L("sLove")}: <b>${LOVE_V3[s.love][lang]}</b></p>` : "";

  const flags = s.flags.length ? `
    <div class="card report-section"><h3>🔍 ${L("sFlags")}</h3>
      <p class="muted small" style="margin-bottom:10px">${L("sFlagNote")}</p>
      ${s.flags.map(([a, b]) => `<div class="tip">${escV3(a[lang])}<br><span class="muted">↕</span><br>${escV3(b[lang])}</div>`).join("")}
    </div>` : "";

  const answerList = s.answers.map(({ q, chosen }) => {
    let val = `<span class="muted">—</span>`;
    if (chosen?.opt) val = escV3(chosen.opt[lang]);
    else if (chosen?.likert) val = `<b>${chosen.likert}</b> / 7`;
    return `<li><span class="ans-q">${escV3(q[lang])}</span><span class="ans-v">${val}</span></li>`;
  }).join("");

  return `
  <div class="card score-hero report-section">
    <h2>${L("sTitle")}</h2>
    <p class="muted small">👤 ${escV3(p.name)} · ${new Date(p.date).toLocaleDateString(lang === "ar" ? "ar" : "en")}</p>
    <div class="score-num">${s.confidence}%</div>
    <div class="badge ${s.confidence >= 75 ? "ok" : s.confidence >= 55 ? "warn" : "bad"}">${L("rConfidence")}</div>
    <p class="muted small" style="margin-top:10px">${t("sComplete", lang, { a: s.answered, b: s.total })}</p>
    <p class="disclaimer">${L("sSub")}</p>
  </div>
  ${qualityBanner(s.quality, lang)}
  <div class="card report-section"><h3>🧭 ${L("sLean")}</h3>
    <p class="muted small" style="margin-bottom:14px">${L("sLeanNote")}</p>
    ${leanRows}
  </div>
  <div class="card report-section"><h3>🧬 ${L("sTraits")}</h3>${b5rows}${loveRow}</div>
  ${attachmentSection(s.attachment, lang)}
  ${flags}
  <div class="card report-section">
    <details><summary class="ans-summary">📋 ${L("sAnswers")}</summary>
      <ul class="answer-list">${answerList}</ul>
    </details>
  </div>
  ${methodologyPanel(lang, { itemCount: s.total, pairCount: 12 })}`;
}

// ── Compare report ──────────────────────────────────────────────────────
const CROSS_VERSION_NOTE = {
  en: "One of you took an earlier, shorter version of this assessment. The score above is based only on the questions you both answered, and the confidence percentage has been lowered to reflect that.",
  ar: "أجرى أحدكما نسخة أقدم وأقصر من هذا التقييم. النتيجة أعلاه مبنية فقط على الأسئلة التي أجاب عنها كلاكما، وتم تخفيض نسبة الموثوقية لتعكس ذلك.",
};

export function renderReportV3(res, pa, pb, lang) {
  const L = k => t(k, lang);
  const lvl = res.index >= 75 ? ["ok", L("levelHigh")] : res.index >= 55 ? ["warn", L("levelMid")] : ["bad", L("levelLow")];

  const b5rows = B5_ORDER.filter(k => (k in res.bigFive.a) || (k in res.bigFive.b)).map(k => {
    const da = res.bigFive.a[k], db = res.bigFive.b[k];
    const wa = da?.sufficient ? da.value : 0, wb = db?.sufficient ? db.value : 0;
    const note = (da && !da.sufficient) || (db && !db.sufficient)
      ? `<span class="muted small">${NEED_MORE[lang]((da&&!da.sufficient)?da.n:db.n, SUBSCALE_MIN)}</span>` : "";
    return `<div class="cat-row"><span class="cat-name">${B5_V3[k][lang]}</span>
      <span class="cat-bar"><i style="width:${wa}%;background:var(--accent)"></i></span>
      <span class="cat-bar"><i style="width:${wb}%;background:var(--accent2)"></i></span>
      ${note}</div>`;
  }).join("");

  const loveRow = (res.love.a && res.love.b) ? `
    <p class="small" style="margin-top:8px">💬 ${escV3(pa.name)}: <b>${LOVE_V3[res.love.a][lang]}</b> · ${escV3(pb.name)}: <b>${LOVE_V3[res.love.b][lang]}</b></p>` : "";

  const alerts = res.alerts.length ? `
    <div class="card report-section"><h3>⚠️ ${L("rDealbreakers")}</h3>
      ${res.alerts.map(q => `<div class="alert">${escV3(q[lang])}</div>`).join("")}
    </div>` : "";

  const topics = res.topics.length ? `
    <div class="card report-section"><h3>🗣 ${L("rTalk")}</h3>
      ${res.topics.map(q => `<div class="tip">${escV3(q[lang])}</div>`).join("")}
    </div>` : "";

  const list = arr => arr.length
    ? `<ul class="clean">${arr.map(c => `<li>${escV3(CATS_V3[c] ? CATS_V3[c][lang] : c)} — ${res.catScores[c]}%</li>`).join("")}</ul>`
    : `<p class="muted small">—</p>`;

  const crossNote = res.crossVersion ? `<p class="muted small report-section">${CROSS_VERSION_NOTE[lang]}</p>` : "";

  const attA = res.attachment.a, attB = res.attachment.b;
  const attReady = attA.anx.sufficient && attA.avo.sufficient && attB.anx.sufficient && attB.avo.sufficient;
  const attachmentBoth = attReady ? attachmentSection(attA, lang, {
    pts: [
      { x: attA.anx.value, y: attA.avo.value, color: "var(--accent)", name: pa.name },
      { x: attB.anx.value, y: attB.avo.value, color: "var(--accent2)", name: pb.name },
    ],
    legend: `<div class="legend"><span><b style="background:var(--accent)"></b>${escV3(pa.name)}</span>
      <span><b style="background:var(--accent2)"></b>${escV3(pb.name)}</span></div>`,
  }) : "";

  const qualA = qualityBanner(res.quality.a, lang), qualB = qualityBanner(res.quality.b, lang);
  const quality = (qualA || qualB) ? `<div class="report-section">
      ${qualA ? `<p class="small muted" style="margin-bottom:4px">${escV3(pa.name)}</p>${qualA}` : ""}
      ${qualB ? `<p class="small muted" style="margin:8px 0 4px">${escV3(pb.name)}</p>${qualB}` : ""}
    </div>` : "";

  return `
  ${alerts}
  ${topics}
  <div class="card score-hero report-section">
    <h2>${L("v3IndexTitle")}</h2>
    <p class="muted small">${escV3(pa.name)} ♥ ${escV3(pb.name)} · ${new Date().toLocaleDateString(lang === "ar" ? "ar" : "en")}</p>
    <div class="score-num">${res.index}%</div>
    <div class="badge ${lvl[0]}">${lvl[1]}</div>
    <p class="muted small" style="margin-top:10px">${L("rConfidence")}: ${res.confidence}%</p>
    <p class="disclaimer">${L("v3NotAPrediction")}</p>
  </div>
  ${crossNote}
  <div class="card report-section"><h3>📊 ${L("rRadar")}</h3>
    <div class="radarV3-wrap">${radarV3(res.catScores, lang)}</div>
  </div>
  <div class="card report-section"><h3>${L("rCats")}</h3>${barsV3(res.catScores, lang)}</div>
  <div class="card report-section"><h3>💪 ${L("rStrengths")}</h3>${list(res.strengths)}</div>
  <div class="card report-section"><h3>🌱 ${L("rChallenges")}</h3>${list(res.challenges)}</div>
  ${attachmentBoth}
  ${quality}
  <div class="card report-section"><h3>🧭 ${L("rSummary")}</h3>
    <div class="legend"><span><b style="background:var(--accent)"></b>${escV3(pa.name)}</span>
    <span><b style="background:var(--accent2)"></b>${escV3(pb.name)}</span></div>
    ${b5rows}${loveRow}
    <p class="disclaimer">${L("rDisclaimer")}</p>
  </div>
  ${methodologyPanel(lang, { itemCount: Math.max(res.confidence ? 80 : 47, 47), pairCount: 12 })}`;
}
