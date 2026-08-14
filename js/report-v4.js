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
import { CATS, t } from "./i18n.js";

// CATS covers the 12 v2 categories. v3 added three more and holds them in an
// unexported const, so they are repeated here rather than editing report-v3.js.
const CATS4 = { ...CATS,
  appreciation: { en: "Appreciation", ar: "التقدير" },
  fairness: { en: "Fairness at Home", ar: "العدالة في المنزل" },
  intimacy: { en: "Physical Intimacy", ar: "القرب الجسدي" },
};
const catNameFor = lang => k => (CATS4[k] ? CATS4[k][lang] : k);

const esc4 = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// =============================================================================
// Card surgery
// =============================================================================
// v4 replaces four of v3's sections with charts. report-v3.js itself is not
// edited — v3 profiles must keep rendering exactly as they do today — so v4
// takes v3's finished HTML string and swaps whole cards out of it.
//
// Cards nest divs, so a regex cannot find where one ends. This walks the
// tags and counts depth. If the marker is not found the original HTML is
// returned untouched, which is the safe failure: a report with v3's old
// section beats a report with a hole in it.
function replaceCard(html, marker, newHtml) {
  const at = html.indexOf(marker);
  if (at === -1) return html;
  const start = html.lastIndexOf('<div class="card', at);
  if (start === -1) return html;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(0, start) + newHtml + html.slice(m.index + m[0].length);
  }
  return html;
}

// Colour for a 0-100 agreement figure. Matches the badge thresholds v3
// already uses for the headline, so the chart and the badge never disagree.
const band4 = v => v >= 75 ? "var(--ok)" : v >= 55 ? "var(--warn)" : "var(--bad)";

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
  // Stage note. Context, never a caveat — nothing about it lowers a score or
  // a confidence figure. Premarital answers predict marital satisfaction at
  // 80-85% in the PREPARE longitudinal studies, so presenting an expectation
  // as second-class data would be wrong on the evidence.
  stageMix: { en: "One of you answered from experience of married life, the other from expectation of it. Both are worth reading — they are just answering slightly different questions.",
              ar: "أجاب أحدكما من واقع تجربة الزواج، والآخر مما يتوقعه منه. كلاهما يستحق القراءة — لكنهما يجيبان عن سؤالين مختلفين قليلًا." },
  stageBoth: { en: "Both of you answered about a marriage you have not started yet, so these are expectations rather than reports. That is the point: expectations are what collide later.",
               ar: "أجبتما كلاكما عن زواج لم يبدأ بعد، فهذه توقعات لا وقائع. وهذا هو المقصود: التوقعات هي ما يصطدم لاحقًا." },
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

// =============================================================================
// Charts — all hand-written inline SVG
// =============================================================================
// No chart library. The app is an offline-first PWA with no build step: every
// asset is precached by sw.js and build-single.js inlines the whole app into
// one file, so a CDN script would break both. All four charts below are
// plain SVG, which also prints cleanly and scales to any phone width.
//
// RTL: SVG does not mirror automatically. Any chart with a directional axis
// takes `lang` and flips its own coordinates. Text anchors are set per side
// rather than relying on the document's direction.

const CHART = {
  aligned:   { en: "Where you align", ar: "أين تتفقان" },
  differ:    { en: "Where you differ", ar: "أين تختلفان" },
  gapTitle:  { en: "How far apart", ar: "حجم الفارق" },
  confLabel: { en: "Confidence", ar: "الموثوقية" },
  radarNote: { en: "Each line is one of you. Where the two lines sit apart is where your answers pulled in different directions.",
               ar: "كل خط يمثل أحدكما. حيث يتباعد الخطان، تكون إجاباتكما قد اتجهت في اتجاهين مختلفين." },
  soloRadarNote: { en: "Where you lean in each area, on your own answers alone.",
                   ar: "أين تميل في كل محور، بناءً على إجاباتك وحدك." },
  divergeNote: { en: "Sorted by how closely your two sets of answers matched in each area.",
                 ar: "مرتبة حسب مدى تطابق إجاباتكما في كل محور." },
};

/**
 * Headline number as a ring.
 * Outer arc = the alignment index, coloured by band. Inner, lighter arc =
 * confidence, drawn as a separate ring rather than mixed into the same one,
 * because they measure different things and stacking them would imply the
 * confidence somehow reduces the index. It does not.
 */
function ringGauge(index, confidence, lang, label) {
  const S = 200, c = S / 2, R = 78, r2 = 62;
  const circ = 2 * Math.PI * R, circ2 = 2 * Math.PI * r2;
  const dash = v => `${(Math.max(0, Math.min(100, v)) / 100) * circ} ${circ}`;
  const dash2 = v => `${(Math.max(0, Math.min(100, v)) / 100) * circ2} ${circ2}`;
  // -90deg start puts 0% at 12 o'clock. In RTL the ring fills anticlockwise
  // so the direction of "more" matches the reading direction.
  const spin = lang === "ar" ? `rotate(-90 ${c} ${c}) scale(-1 1) translate(${-S} 0)` : `rotate(-90 ${c} ${c})`;
  return `<svg viewBox="0 0 ${S} ${S}" width="100%" style="max-width:230px;display:block;margin:0 auto" role="img">
    <circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="var(--line)" stroke-width="13"/>
    <circle cx="${c}" cy="${c}" r="${r2}" fill="none" stroke="var(--line)" stroke-width="5" opacity=".55"/>
    <g transform="${spin}">
      <circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${band4(index)}" stroke-width="13"
              stroke-linecap="round" stroke-dasharray="${dash(index)}"/>
      <circle cx="${c}" cy="${c}" r="${r2}" fill="none" stroke="var(--accent)" stroke-width="5"
              stroke-linecap="round" stroke-dasharray="${dash2(confidence)}" opacity=".55"/>
    </g>
    <text x="${c}" y="${c + 4}" text-anchor="middle" font-size="42" font-weight="800" fill="var(--text)">${index}<tspan font-size="20">%</tspan></text>
    <text x="${c}" y="${c + 26}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc4(label)}</text>
    <text x="${c}" y="${c + 44}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc4(CHART.confLabel[lang])} ${confidence}%</text>
  </svg>`;
}

/**
 * Radar with one polygon per person.
 *
 * v3's radar plots a single polygon of the couple's agreement per category,
 * which cannot show WHICH of the two is pulling a category down. These are
 * each person's own lean, so the shape of the gap between the two outlines
 * is the actual information.
 */
function radarDual(series, cats, lang, catName) {
  const keys = cats;
  // v5 fix: cx used to be 175 in a 350-wide viewBox (dead-centered, but with
  // only ~40px margin past the label ring on either side). With up to 16
  // categories on this chart, a long label landing near the 0°/180° spoke —
  // where text-anchor pushes it AWAY from center rather than centering it —
  // could run past the viewBox edge and get clipped by SVG's default
  // overflow:hidden. Arabic category names are frequently longer than their
  // English counterparts, so this showed up there first (e.g. "تخطيط
  // المستقبل" / Future Planning). Widening the canvas to 430 and keeping cx
  // centered (215) adds ~40px of margin on BOTH sides without touching the
  // angle math, the anchor logic, or the visual radius (R) at all.
  const n = keys.length, cx = 215, cy = 165, R = 112;
  if (!n) return "";
  // Angle step is negated in RTL so the categories read round the circle in
  // the same direction as the language.
  const dir = lang === "ar" ? -1 : 1;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + dir * i * 2 * Math.PI / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  let grid = "";
  for (let g = 1; g <= 4; g++)
    grid += `<polygon points="${keys.map((_, i) => pt(i, R * g / 4).join(",")).join(" ")}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
  const spokes = keys.map((_, i) => {
    const [x, y] = pt(i, R);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>`;
  }).join("");
  const polys = series.map(s => {
    const pts = keys.map((k, i) => pt(i, R * (s.values[k] ?? 0) / 100).join(",")).join(" ");
    return `<polygon points="${pts}" fill="${s.color}" fill-opacity=".16" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`;
  }).join("");
  const labels = keys.map((k, i) => {
    const [x, y] = pt(i, R + 20);
    const anchor = Math.abs(x - cx) < 12 ? "middle" : (x > cx ? "start" : "end");
    return `<text x="${x}" y="${y + 3}" font-size="9" text-anchor="${anchor}" fill="var(--muted)">${esc4(catName(k))}</text>`;
  }).join("");
  return `<svg viewBox="0 0 430 330" width="100%" style="max-width:430px;display:block;margin:0 auto" role="img">
    ${grid}${spokes}${polys}${labels}</svg>`;
}

/**
 * Strengths and challenges as one sorted chart instead of two lists.
 * Bars grow from a shared baseline, coloured by band, so the eye reads the
 * whole picture at once and the boundary between "aligned" and "differs"
 * is visible rather than being a heading.
 */
function divergingCats(catScores, lang, catName) {
  const rows = Object.entries(catScores).sort((a, b) => b[1] - a[1]);
  if (!rows.length) return "";
  const H = 22, W = 320, LBL = 118, BAR = W - LBL - 34;
  const rtl = lang === "ar";
  const svgH = rows.length * H + 26;
  const body = rows.map(([c, v], i) => {
    const y = i * H + 18;
    const w = Math.max(2, BAR * v / 100);
    const x = rtl ? W - LBL - w : LBL;
    const lx = rtl ? W - 4 : LBL - 8;
    const vx = rtl ? W - LBL - w - 6 : LBL + w + 6;
    return `<text x="${lx}" y="${y + 10}" font-size="9.5" text-anchor="end" fill="var(--muted)">${esc4(catName(c))}</text>
      <rect x="${rtl ? W - LBL - BAR : LBL}" y="${y + 2}" width="${BAR}" height="11" rx="5.5" fill="var(--line)" opacity=".5"/>
      <rect x="${x}" y="${y + 2}" width="${w}" height="11" rx="5.5" fill="${band4(v)}"/>
      <text x="${vx}" y="${y + 11}" font-size="9" text-anchor="${rtl ? "end" : "start"}" fill="var(--muted)">${v}%</text>`;
  }).join("");
  const head = `<text x="${rtl ? W - 4 : 4}" y="10" font-size="9" text-anchor="${rtl ? "end" : "start"}" fill="var(--muted)">${esc4(CHART.aligned[lang])} ↑</text>
    <text x="${rtl ? 4 : W - 4}" y="${svgH - 4}" font-size="9" text-anchor="${rtl ? "start" : "end"}" fill="var(--muted)">↓ ${esc4(CHART.differ[lang])}</text>`;
  return `<svg viewBox="0 0 ${W} ${svgH}" width="100%" role="img">${head}${body}</svg>`;
}

/**
 * Topics to discuss, each with a bar showing how far apart the two answers
 * were. `s` is the item's agreement score, 0-1, so the gap is 1 - s.
 * Widest gap first, which is the order the couple should talk in.
 */
function topicGaps(detail, lang) {
  if (!detail || !detail.length) return "";
  return detail.map(({ q, s }) => {
    const gap = Math.round((1 - s) * 100);
    return `<div class="tip topic-gap">
      <div class="topic-text">${esc4(q[lang])}</div>
      <div class="topic-bar"><i style="width:${gap}%;background:${band4(100 - gap)}"></i></div>
    </div>`;
  }).join("");
}

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
  return `<div class="card report-section"><h3>🗺 ${T4.title[lang]}</h3>
    <p class="muted small">${T4.soloSub[lang]}</p>
    ${rows}
    <p class="disclaimer">${T4.disclaimer[lang]}</p>
  </div>`;
}

/** Worldview card for a couple. */
export function worldviewPair(wv, pa, pb, lang, stage) {
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

  return `<div class="card report-section"><h3>🗺 ${T4.title[lang]}</h3>
    <p class="muted small">${T4.pairSub[lang]}</p>
    <div class="legend"><span><b style="background:var(--accent)"></b>${esc4(pa.name)}</span>
      <span><b style="background:var(--accent2)"></b>${esc4(pb.name)}</span></div>
    ${rows}${prompts}${stageNote(stage, lang)}
    <p class="disclaimer">${T4.disclaimer[lang]}</p>
  </div>`;
}

// One neutral line when the two people answered from different places in
// life, or when both answered prospectively. Silent otherwise, and silent
// for any profile taken before stage was recorded.
const PRE = new Set(["pre", "was"]);
function stageNote(stage, lang) {
  if (!stage || !stage.a || !stage.b) return "";
  const a = PRE.has(stage.a), b = PRE.has(stage.b);
  if (a && b) return `<p class="muted small report-section">${T4.stageBoth[lang]}</p>`;
  if (a !== b) return `<p class="muted small report-section">${T4.stageMix[lang]}</p>`;
  return "";
}

// =============================================================================
// Entry points
// =============================================================================
// v4 keeps everything v3 draws that still earns its place — the attachment
// quadrant, the Big Five comparison, the response-quality banner, the
// methodology panel and the deal-breaker alerts — and swaps four sections
// for charts. report-v3.js is never edited, so a v3 profile is unaffected.

// Anchors. Each is a string that appears exactly once, inside the card being
// replaced. Emoji were chosen by v3 and are stable; the worldview card uses
// 🗺 so it can never collide with the attachment or summary cards, which
// both use 🧭.
function swapCouple(html, res, pa, pb, lang) {
  const L = k => t(k, lang);
  const cats = Object.keys(res.catScores);
  const name = catNameFor(lang);

  // 1. Headline number -> ring gauge. The badge, the date line and the
  //    "not a prediction" disclaimer are preserved word for word.
  const lvl = res.index >= 75 ? ["ok", L("levelHigh")] : res.index >= 55 ? ["warn", L("levelMid")] : ["bad", L("levelLow")];
  const hero = `<div class="card score-hero report-section">
    <h2>${L("v3IndexTitle")}</h2>
    <p class="muted small">${esc4(pa.name)} ♥ ${esc4(pb.name)} · ${new Date().toLocaleDateString(lang === "ar" ? "ar" : "en")}</p>
    ${ringGauge(res.index, res.confidence, lang, L("v3IndexTitle"))}
    <div class="badge ${lvl[0]}">${lvl[1]}</div>
    <p class="disclaimer">${L("v3NotAPrediction")}</p>
  </div>`;
  html = replaceCard(html, 'class="card score-hero', hero);

  // 2. Single-polygon radar -> one polygon per person.
  if (res.catLean) {
    const radar = `<div class="card report-section"><h3>📊 ${L("rRadar")}</h3>
      <div class="legend"><span><b style="background:var(--accent)"></b>${esc4(pa.name)}</span>
        <span><b style="background:var(--accent2)"></b>${esc4(pb.name)}</span></div>
      ${radarDual([
        { values: res.catLean.a, color: "var(--accent)" },
        { values: res.catLean.b, color: "var(--accent2)" },
      ], cats, lang, name)}
      <p class="muted small">${CHART.radarNote[lang]}</p>
    </div>`;
    html = replaceCard(html, "📊", radar);
  }

  // 3. Two bullet lists -> one sorted chart. The strengths card is replaced
  //    and the challenges card removed, since both are now the same picture.
  const diverge = `<div class="card report-section"><h3>📈 ${L("rCats")}</h3>
    ${divergingCats(res.catScores, lang, name)}
    <p class="muted small">${CHART.divergeNote[lang]}</p>
  </div>`;
  html = replaceCard(html, "💪", diverge);
  html = replaceCard(html, "🌱", "");
  // v3's plain category bar list is now redundant with the chart above it.
  html = replaceCard(html, `<h3>${L("rCats")}</h3>`, "");

  // 4. Topics get a gap bar each, widest first.
  if (res.topicsDetail && res.topicsDetail.length) {
    const topics = `<div class="card report-section"><h3>🗣 ${L("rTalk")}</h3>
      <p class="muted small" style="margin-bottom:10px">${CHART.gapTitle[lang]} →</p>
      ${topicGaps(res.topicsDetail, lang)}
    </div>`;
    html = replaceCard(html, "🗣", topics);
  }
  return html;
}

export function renderReportV4(res, pa, pb, lang) {
  const base = swapCouple(renderReportV3(res, pa, pb, lang), res, pa, pb, lang);
  return spliceBeforeSummary(base, worldviewPair(res.worldview, pa, pb, lang, res.stage));
}

export function renderSoloV4(s, p, lang) {
  let html = renderSoloV3(s, p, lang);
  const cats = Object.keys(s.catLean || {});
  if (cats.length) {
    // The solo report has no couple index, so the ring shows confidence —
    // the only headline figure a single profile legitimately has.
    const card = `<div class="card report-section"><h3>📊 ${t("rRadar", lang)}</h3>
      ${radarDual([{ values: s.catLean, color: "var(--accent2)" }], cats, lang, catNameFor(lang))}
      <p class="muted small">${CHART.soloRadarNote[lang]}</p>
      ${ringGauge(s.confidence, s.confidence, lang, CHART.confLabel[lang])}
    </div>`;
    // Placed after v3's profile header and ahead of the per-area lean bars,
    // rather than replacing them: on a solo report the bars carry the pole
    // labels ("keeps the peace" ↔ "says it straight"), which a radar cannot.
    html = insertAfterFirstCard(html, card);
  }
  return spliceBeforeSummary(html, worldviewSolo(s.worldview, lang));
}

// Drop a card in immediately after the first one, so it lands under the
// profile header rather than above it. Same depth-counting walk as
// replaceCard; falls back to prepending if the structure ever changes.
function insertAfterFirstCard(html, card) {
  const start = html.indexOf('<div class="card');
  if (start === -1) return card + html;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) {
      const end = m.index + m[0].length;
      return html.slice(0, end) + card + html.slice(end);
    }
  }
  return card + html;
}

// The worldview card goes ahead of v3's closing summary panel, falling back
// to appending if that anchor ever moves.
const SUMMARY_ANCHOR = '<div class="card report-section"><h3>🧭';
function spliceBeforeSummary(html, card) {
  if (!card) return html;
  const i = html.lastIndexOf(SUMMARY_ANCHOR);
  return i === -1 ? html + card : html.slice(0, i) + card + html.slice(i);
}

// Guardrail check, run at load: no named ideology may appear in this file's
// strings. Cheap insurance against a future edit reintroducing labels.
{
  const banned = /feminis|liberal|islamis|secular|capitalis|patriarch|conservative party|vision 2030|نسويّ|نسوي|ليبرالي|علماني|رأسمالي|إسلاموي/i;
  const all = JSON.stringify([T4, POLE4, GAP_PROMPT, CHART]);
  if (banned.test(all)) throw new Error("report-v4: a named ideology reached a user-facing string");
  if (AXES_CRITICAL.some(a => !GAP_PROMPT[a]))
    throw new Error("report-v4: a critical axis has no discussion prompt");
}
