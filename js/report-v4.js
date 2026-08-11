// MatchWise v4 report — additive layer over v3.
// -----------------------------------------------------------------------------
// Does NOT modify js/report.js or js/report-v3.js. It calls the v3 renderers
// for everything they already draw, then injects one extra card: Worldview.
//
// Naming rules for this file, and they are not negotiable:
//   - The four axes are described in plain language about *decisions and
//     expectations*. No ideology is ever named. The words feminism,
//     liberalism, Islamism, secularism, capitalism, tradition-as-a-camp and
//     any political or state reference must not appear in any string here,
//     in either language.
//   - Neither end of any axis is described as better, more modern, more
//     correct, or more religious. Both poles get respectful wording.
//   - The card says explicitly what it is and is not, because a user who
//     feels profiled will not trust the rest of the report either.
//   - Nothing indicates that any question was gendered.
// -----------------------------------------------------------------------------

import { renderSoloV3, renderReportV3 } from "./report-v3.js";
import { AXES, AXES_CRITICAL } from "./questions-v4.js";

const esc4 = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const T4 = {
  title:   { en: "Worldview", ar: "نظرتك إلى الحياة" },
  soloSub: { en: "Where you sat on four everyday questions about how decisions get made. There is no better end of any line.",
             ar: "أين تقع إجاباتك في أربعة أسئلة يومية عن طريقة اتخاذ القرارات. لا يوجد طرف أفضل من الآخر في أي محور." },
  pairSub: { en: "How each of you tends to frame a decision. Difference here is normal — it only matters when you expect different things without knowing it.",
             ar: "كيف يميل كل منكما إلى النظر إلى القرارات. الاختلاف هنا طبيعي — ولا يصبح مهمًا إلا عندما يتوقع كل منكما شيئًا مختلفًا دون أن يدرك ذلك." },
  notEnough: { en: "Not enough answers to show this one.", ar: "لا توجد إجابات كافية لعرض هذا المحور." },
  close:   { en: "You read this the same way.", ar: "تنظران إلى هذا بالطريقة نفسها." },
  some:    { en: "Some distance, nothing unusual.", ar: "هناك بعض الاختلاف، ولا شيء غير معتاد." },
  wide:    { en: "You are far apart here.", ar: "هناك فرق واضح بينكما هنا." },
  worthTalking: { en: "Worth talking about", ar: "يستحق الحديث عنه" },
  disclaimer: {
    en: "This describes how each of you talks about decisions, not what either of you believes. It is drawn from ordinary answers across the assessment, it is not a score, and it does not change the number above.",
    ar: "يصف هذا طريقة حديث كل منكما عن القرارات، لا ما يؤمن به أي منكما. وهو مستخلص من إجاباتكما على مواقف يومية في التقييم، وليس درجة، ولا يغيّر الرقم أعلاه.",
  },
};

// Pole labels. `lo` is the negative end of the scale, `hi` the positive.
const POLE4 = {
  trad: {
    name: { en: "Continuity and change", ar: "الثبات والتغيير" },
    lo:   { en: "Keep what works", ar: "التمسك بما ينجح" },
    hi:   { en: "Open to change it", ar: "الاستعداد للتغيير" } },
  auth: {
    name: { en: "Who decides", ar: "من يقرر" },
    lo:   { en: "Family has a say", ar: "للعائلة رأي" },
    hi:   { en: "The two of you decide", ar: "القرار لكما" } },
  econ: {
    name: { en: "Money and risk", ar: "المال والمخاطرة" },
    lo:   { en: "Security first", ar: "الأمان أولًا" },
    hi:   { en: "Worth the risk", ar: "المخاطرة تستحق العناء" } },
  role: {
    name: { en: "Roles at home", ar: "الأدوار في البيت" },
    lo:   { en: "Each has their own area", ar: "لكلٍّ مجاله" },
    hi:   { en: "Whoever can, does", ar: "من يستطيع، يتولى المهمة" } },
};

// Said only when a critical axis is wide. Phrased as a question to sit with,
// never as a verdict about the relationship.
const GAP_PROMPT = {
  auth: {
    en: "One of you treats a decision as the couple's alone; the other expects family to be in it. Agree early on which decisions the family hears about, and when.",
    ar: "أحدكما يعتبر القرار شأنًا بينكما وحدكما، والآخر يتوقع أن تكون العائلة جزءًا منه. اتفقا مبكرًا على أي القرارات تُطرح على العائلة ومتى.",
  },
  role: {
    en: "You are working from different pictures of who does what at home and who earns. That gap rarely announces itself — it shows up the first month one of you is stretched thin.",
    ar: "لديكما تصورات مختلفة حول من يتولى ماذا في البيت ومن يتحمل جانب الكسب. هذا الاختلاف نادرًا ما يظهر بوضوح من البداية — لكنه يظهر سريعًا عندما يصبح أحدكما تحت ضغط كبير.",
  },
};

/** One axis line: a labelled bar with the pole names beneath it. */
// Dots are positioned with `inset-inline-start`, not `left`, on purpose.
// The pole labels underneath sit in a flex row, which the browser reverses
// in RTL — so a physically-positioned dot would drift to the wrong pole in
// Arabic while the labels swapped underneath it. The logical property flips
// with the labels and keeps the two in agreement in both directions.
function axisRow(axis, lang, marks) {
  const p = POLE4[axis];
  const dots = marks.map(m =>
    `<b style="inset-inline-start:${(m.value + 100) / 2}%;background:${m.color}" title="${esc4(m.name || "")}"></b>`).join("");
  return `<div class="lean-block">
    <div class="lean-head"><span>${esc4(p.name[lang])}</span></div>
    <div class="axis4-track">${dots}</div>
    <div class="lean-ends"><span>${esc4(p.lo[lang])}</span><span>${esc4(p.hi[lang])}</span></div>
  </div>`;
}

function insufficientRow(axis, lang) {
  return `<div class="lean-block">
    <div class="lean-head"><span>${esc4(POLE4[axis].name[lang])}</span>
      <span class="muted small">${T4.notEnough[lang]}</span></div>
  </div>`;
}

/** Worldview card for one person. */
export function worldviewSolo(worldview, lang) {
  if (!worldview) return "";
  const rows = AXES.map(a => worldview[a] && worldview[a].sufficient
    ? axisRow(a, lang, [{ value: worldview[a].value, color: "var(--accent)" }])
    : insufficientRow(a, lang)).join("");
  if (!rows) return "";
  return `<div class="card report-section"><h3>🧭 ${T4.title[lang]}</h3>
    <p class="muted small">${T4.soloSub[lang]}</p>
    ${rows}
    <p class="disclaimer">${T4.disclaimer[lang]}</p>
  </div>`;
}

/** Worldview card for a couple. */
export function worldviewPair(wv, pa, pb, lang) {
  if (!wv || !wv.axes) return "";
  const bandWord = { close: T4.close, some: T4.some, wide: T4.wide };

  const rows = AXES.map(a => {
    const c = wv.axes[a];
    if (!c || !c.sufficient) return insufficientRow(a, lang);
    const row = axisRow(a, lang, [
      { value: c.a, color: "var(--accent)", name: pa.name },
      { value: c.b, color: "var(--accent2)", name: pb.name },
    ]);
    const note = `<p class="muted small" style="margin:-4px 0 10px">${bandWord[c.band][lang]}</p>`;
    return row + note;
  }).join("");

  const flagged = AXES.filter(a => wv.axes[a] && wv.axes[a].flagged);
  const prompts = flagged.length ? `
    <div class="report-section">
      <p class="small" style="margin-bottom:6px"><b>${T4.worthTalking[lang]}</b></p>
      ${flagged.map(a => `<div class="tip">${GAP_PROMPT[a][lang]}</div>`).join("")}
    </div>` : "";

  return `<div class="card report-section"><h3>🧭 ${T4.title[lang]}</h3>
    <p class="muted small">${T4.pairSub[lang]}</p>
    <div class="legend"><span><b style="background:var(--accent)"></b>${esc4(pa.name)}</span>
      <span><b style="background:var(--accent2)"></b>${esc4(pb.name)}</span></div>
    ${rows}${prompts}
    <p class="disclaimer">${T4.disclaimer[lang]}</p>
  </div>`;
}

// The v3 renderers return one HTML string. Rather than fork them, v4 splices
// its card in ahead of the closing summary panel, falling back to appending
// if that anchor ever moves. Keeps report-v3.js untouched.
const ANCHOR = '<div class="card report-section"><h3>🧭';
function splice4(html, card) {
  if (!card) return html;
  const i = html.lastIndexOf(ANCHOR);
  return i === -1 ? html + card : html.slice(0, i) + card + html.slice(i);
}

export function renderSoloV4(s, p, lang) {
  return splice4(renderSoloV3(s, p, lang), worldviewSolo(s.worldview, lang));
}

export function renderReportV4(res, pa, pb, lang) {
  return splice4(renderReportV3(res, pa, pb, lang), worldviewPair(res.worldview, pa, pb, lang));
}

// Guardrail check, run at load: no named ideology may appear in this file's
// strings. Cheap insurance against a future edit reintroducing labels.
{
  const banned = /feminis|liberal|islamis|secular|capitalis|patriarch|conservative party|vision 2030|نسويّ|نسوي|ليبرالي|علماني|رأسمالي|إسلاموي/i;
  const all = JSON.stringify([T4, POLE4, GAP_PROMPT]);
  if (banned.test(all)) throw new Error("report-v4: a named ideology reached a user-facing string");
  if (AXES_CRITICAL.some(a => !GAP_PROMPT[a]))
    throw new Error("report-v4: a critical axis has no discussion prompt");
}
