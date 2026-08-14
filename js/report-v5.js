// MatchWise v5 report — additive layer over v4.
// -----------------------------------------------------------------------------
// Does NOT modify js/report.js, js/report-v3.js or js/report-v4.js. Uses the
// same card-surgery approach report-v4.js established: take the finished
// HTML string renderReportV4() already produces and splice new cards into it
// by walking div depth from a text anchor — never string-replace on content
// that could appear more than once.
//
// What v5 adds to the couple report only (a solo profile has no "in short"
// story, no growth-together concept and nothing to recommend to a pair):
//   1. "In short" — one paragraph placed right after the headline ring,
//      before any chart, so a reader gets the story in words first. Mirrors
//      the plain-language executive-summary pattern reviewed from another
//      build, but built only from numbers compareV4() already computed.
//   2. Growth opportunities — see scoring-v5.js for the definition.
//   3. Recommendations — templated action lines, never claiming more than
//      compareV4()'s own strengths/challenges/growth support.
//
// GUARDRAIL: every string here is bilingual (en/ar) in the same T-object
// pattern report-v4.js uses (T4). No key is ever read through only one
// language — a missing translation must be a code review catch, not a
// runtime fallback to English inside an Arabic report.
// -----------------------------------------------------------------------------

import { renderReportV4, renderSoloV4 } from "./report-v4.js";
import { growthOpportunities, recommendations } from "./scoring-v5.js";
import { CATS, t } from "./i18n.js";

// Same duplication rationale report-v3.js and report-v4.js already state:
// CATS is exported by i18n.js and extended here; the three extra categories
// are not, so they're repeated rather than importing report-v4.js internals.
const CATS5 = { ...CATS,
  appreciation: { en: "Appreciation", ar: "التقدير" },
  fairness: { en: "Fairness at Home", ar: "العدالة في المنزل" },
  intimacy: { en: "Physical Intimacy", ar: "القرب الجسدي" },
};
const catNameForV5 = lang => k => (CATS5[k] ? CATS5[k][lang] : k);

const esc5 = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const T5 = {
  overviewTitle: { en: "In short", ar: "باختصار" },
  growthTitle:   { en: "Growth Opportunities", ar: "فرص للنمو معًا" },
  growthSub:     { en: "Areas where you both lean the same way, on your own answers alone — not a disagreement, a shared starting point.",
                    ar: "محاور يميل فيها كلاكما بالاتجاه نفسه، بناءً على إجابة كلٍّ منكما وحده — ليست خلافًا، بل نقطة بداية مشتركة." },
  growthEmpty:   { en: "Nothing stood out here — the two of you don't share a low lean on the same area.",
                    ar: "لا شيء بارز هنا — لا يشترك ميلكما المنخفض في المحور نفسه." },
  recTitle:      { en: "Recommendations", ar: "توصيات" },
  recSub:        { en: "A few concrete places to start a conversation — not a checklist to complete.",
                    ar: "بعض النقاط الملموسة لبدء حوار — لا قائمة مهام لإنجازها." },
};

// Each entry is a function per language so the category name can be dropped
// straight into the sentence without a separate {a}/{b} substitution step —
// consistent with how report-v4.js builds its own sentences inline.
const REC_TEXT = {
  challenge: {
    en: cat => `Schedule an early, honest conversation about ${cat} — it is where you agree least right now.`,
    ar: cat => `خصّصا وقتًا مبكرًا لحديث صريح عن ${cat} — فهو المحور الذي تتفقان فيه أقل من غيره حاليًا.`,
  },
  growth: {
    en: cat => `Explore ${cat} together — you both lean the same way here, which makes it a natural place to grow as a pair rather than a gap to close.`,
    ar: cat => `استكشفا ${cat} معًا — كلاكما يميل بالاتجاه نفسه هنا، ما يجعله مكانًا طبيعيًا للنمو كثنائي لا فجوة يجب سدّها.`,
  },
  strength: {
    en: cat => `Keep investing in ${cat} — it is already working, and strengths fade fastest when they're taken for granted.`,
    ar: cat => `واصلا الاستثمار في ${cat} — فهو يعمل جيدًا بالفعل، ونقاط القوة تضعف أسرع ما تضعف حين تُؤخذ كأمر مسلّم به.`,
  },
};

const OVERVIEW_TEXT = {
  en: (a, b, index, confidence, top, low) =>
    `${a} and ${b} come out with an alignment index of ${index}% (${confidence}% confidence in the result). ` +
    `Agreement runs strongest in ${top}. ` +
    `The areas most worth deliberate attention are ${low} — not because they are weak, but because that's where an honest conversation will do the most good.`,
  ar: (a, b, index, confidence, top, low) =>
    `يحصل ${a} و${b} على مؤشر انسجام ${index}٪ (بموثوقية ${confidence}٪). ` +
    `يظهر أقوى اتفاق في ${top}. ` +
    `أما المحاور التي تستحق اهتمامًا واعيًا فهي ${low} — لا لأنها ضعيفة، بل لأنها الأماكن التي سيفيد فيها حوار صادق أكثر من غيرها.`,
};

const DEALBREAKER_NOTE = {
  en: n => n === 1
    ? " One answer pair flagged a serious mismatch — read the alert above before anything else here."
    : ` ${n} answer pairs flagged a serious mismatch — read the alerts above before anything else here.`,
  ar: n => n === 1
    ? " أشارت إجابة واحدة إلى تعارض جوهري — راجعا التنبيه أعلاه قبل أي شيء آخر هنا."
    : ` أشارت ${n} إجابات إلى تعارضات جوهرية — راجعا التنبيهات أعلاه قبل أي شيء آخر هنا.`,
};

const JOIN = { en: " and ", ar: " و" };

function joinNames(list, lang) {
  return list.join(JOIN[lang]);
}

function overviewCard(res, pa, pb, lang, catName) {
  const entries = Object.entries(res.catScores || {});
  if (entries.length < 2) return "";
  const sortedDesc = entries.slice().sort((x, y) => y[1] - x[1]);
  const top = sortedDesc.slice(0, 2).map(([c]) => catName(c));
  const low = sortedDesc.slice(-2).map(([c]) => catName(c)).reverse();

  let text = OVERVIEW_TEXT[lang](
    esc5(pa.name), esc5(pb.name), res.index, res.confidence,
    joinNames(top, lang), joinNames(low, lang)
  );
  if (res.alerts && res.alerts.length) text += DEALBREAKER_NOTE[lang](res.alerts.length);

  return `<div class="card report-section"><h3>💡 ${T5.overviewTitle[lang]}</h3>
    <p>${text}</p>
  </div>`;
}

function growthCard(res, lang, catName) {
  const cats = growthOpportunities(res);
  const body = cats.length
    ? `<ul class="clean">${cats.map(c => `<li>${esc5(catName(c))}</li>`).join("")}</ul>`
    : `<p class="muted small">${T5.growthEmpty[lang]}</p>`;
  return `<div class="card report-section"><h3>🌿 ${T5.growthTitle[lang]}</h3>
    <p class="muted small">${T5.growthSub[lang]}</p>
    ${body}
  </div>`;
}

function recommendationsCard(res, lang, catName) {
  const recs = recommendations(res);
  if (!recs.length) return "";
  const rows = recs.map(r => `<li>${REC_TEXT[r.type][lang](esc5(catName(r.cat)))}</li>`).join("");
  return `<div class="card report-section"><h3>🧩 ${T5.recTitle[lang]}</h3>
    <p class="muted small">${T5.recSub[lang]}</p>
    <ul class="clean">${rows}</ul>
  </div>`;
}

// Insert `newHtml` right after the card whose opening tag contains `marker`,
// by walking div depth from that card's start — the mirror of report-v4.js's
// replaceCard(), but appending after the card instead of replacing it.
function insertAfterCard(html, marker, newHtml) {
  if (!newHtml) return html;
  const at = html.indexOf(marker);
  if (at === -1) return html;
  const start = html.lastIndexOf('<div class="card', at);
  if (start === -1) return html;
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) {
      const end = m.index + m[0].length;
      return html.slice(0, end) + newHtml + html.slice(end);
    }
  }
  return html;
}

// Same anchor report-v4.js's spliceBeforeSummary() uses (the closing 🧭
// personality/love-language card) — Growth and Recommendations land after
// the Worldview card v4 already inserted there, and before that closing card.
const ANCHOR5 = '<div class="card report-section"><h3>🧭';
function insertBeforeAnchor(html, newHtml) {
  if (!newHtml) return html;
  const i = html.lastIndexOf(ANCHOR5);
  return i === -1 ? html + newHtml : html.slice(0, i) + newHtml + html.slice(i);
}

export function renderReportV5(res, pa, pb, lang) {
  let html = renderReportV4(res, pa, pb, lang);
  const catName = catNameForV5(lang);
  html = insertAfterCard(html, 'class="card score-hero', overviewCard(res, pa, pb, lang, catName));
  html = insertBeforeAnchor(html, growthCard(res, lang, catName) + recommendationsCard(res, lang, catName));
  return html;
}

// Growth opportunities, recommendations and "in short" are all couple-only
// concepts — a solo profile has no partner to grow with or agree with, so
// solo reports pass straight through to v4, byte for byte.
export function renderSoloV5(s, p, lang) {
  return renderSoloV4(s, p, lang);
}
