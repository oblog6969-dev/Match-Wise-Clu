// MatchWise v6 report — interaction style card. Additive layer over v5.
// -----------------------------------------------------------------------------
// Does NOT modify report.js / report-v3.js / report-v4.js / report-v5.js.
// Wraps renderReportV5 / renderSoloV5 and splices one card in, using the same
// depth-walking card surgery report-v4.js established.
//
// See the long header in scoring-v6.js for why this card exists, why it is
// derived from Big Five rather than asking new questions, and why it is NOT
// called DiSC. Two rules from that header are enforced in this file:
//
//   1. The strings "DiSC" and "Everything DiSC" must never appear as a claim
//      about what this card IS. The card may reference the public DISC model
//      (Marston, 1928) as a cross-reference, clearly marked as such. A
//      guardrail check at the bottom of this file throws if a banned
//      brand-claim phrasing reaches a user-facing string.
//   2. The card must state that DISC's "C" is not the Big Five
//      Conscientiousness shown elsewhere in this same report. Without that
//      line the two numbers silently contradict each other.
//
// SVG note: this file draws a quadrant plot. Per the v5 bugfix round, every
// chart in this app relies on the global `#app svg{direction:ltr}` rule in
// style.css — text-anchor is direction-relative per spec, so without that
// rule Arabic labels render outside the viewBox and vanish. Do not remove it.
// -----------------------------------------------------------------------------

import { renderReportV5, renderSoloV5 } from "./report-v5.js";
import { interactionStyle, compareInteraction, STYLE_MIN_CLARITY } from "./scoring-v6.js";

const esc6 = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const T6 = {
  title:    { en: "Interaction Style", ar: "أسلوب التعامل" },
  soloSub:  { en: "Where your answers put you on the two dimensions that shape how people come across to each other: how outspoken you tend to be, and whether you reach for the task or the person first.",
              ar: "أين تضعك إجاباتك على البعدين اللذين يشكّلان طريقة ظهورك أمام الآخرين: مدى صراحتك ومبادرتك، وهل تتّجه إلى المهمة أولًا أم إلى الشخص أولًا." },
  pairSub:  { en: "How each of you tends to come across. Neither corner is better, and a difference here is not a problem — it is usually just the reason two people read the same conversation differently.",
              ar: "كيف يظهر كل منكما في التعامل. لا توجد زاوية أفضل من غيرها، والاختلاف هنا ليس مشكلة — بل هو غالبًا سبب قراءة كل منكما للحوار نفسه بطريقة مختلفة." },
  notEnough:{ en: "Not enough answers on the two traits this is built from.", ar: "لا توجد إجابات كافية على السمتين اللتين يُبنى عليهما هذا القسم." },
  axisX:    { en: "Reserved → Outspoken", ar: "متحفّظ → صريح ومبادر" },
  axisY:    { en: "Task first → People first", ar: "المهمة أولًا → الناس أولًا" },
  youAre:   { en: "Your leaning", ar: "ميلك" },
  balanced: { en: "Balanced — near the middle on both dimensions",
              ar: "متوازن — قريب من المنتصف في كلا البعدين" },
  balancedNote: { en: "Sitting near the centre is a real result, not a missing one. It usually means you adjust to the situation rather than leading with one style.",
                  ar: "الوقوع قرب المنتصف نتيجة حقيقية لا ناقصة. وغالبًا ما يعني أنك تتكيّف مع الموقف بدل أن تنطلق من أسلوب واحد ثابت." },
  crossRefTitle: { en: "If you know the DISC model", ar: "إن كنت تعرف نموذج DISC" },
};

// Plain-language quadrant names come FIRST and are the real label. The
// classic DISC letter is offered only as a cross-reference for someone who
// already knows that vocabulary — never as the primary identity.
const QUAD6 = {
  driving:   { name: { en: "Driving", ar: "المبادرة والحسم" },
               disc: { en: "D · Dominance", ar: "D · الهيمنة" },
               desc: { en: "Outspoken and task-first. Moves fast, says the hard thing, wants the decision made.",
                       ar: "صريح ويبدأ بالمهمة. يتحرّك بسرعة، ويقول الأمر الصعب، ويريد حسم القرار." } },
  inspiring: { name: { en: "Inspiring", ar: "التأثير والحماس" },
               disc: { en: "I · Influence", ar: "I · التأثير" },
               desc: { en: "Outspoken and people-first. Talks things out, brings energy, persuades rather than instructs.",
                       ar: "صريح ويبدأ بالناس. يناقش الأمور بصوت عالٍ، ويضفي حماسًا، ويُقنع بدل أن يُملي." } },
  steady:    { name: { en: "Steady", ar: "الثبات والدعم" },
               disc: { en: "S · Steadiness", ar: "S · الثبات" },
               desc: { en: "Reserved and people-first. Listens more than speaks, keeps the peace, values a settled rhythm.",
                       ar: "متحفّظ ويبدأ بالناس. يستمع أكثر مما يتكلّم، ويحافظ على السلام، ويقدّر الإيقاع الهادئ." } },
  precise:   { name: { en: "Precise", ar: "الدقة والتروّي" },
               disc: { en: "C · Conscientiousness", ar: "C · التدقيق" },
               desc: { en: "Reserved and task-first. Thinks before speaking, wants it right, is uneasy with a rushed call.",
                       ar: "متحفّظ ويبدأ بالمهمة. يفكّر قبل أن يتكلّم، ويريد إتقان الأمر، ولا يرتاح للقرار المتسرّع." } },
};

// The disambiguation that makes the cross-reference honest rather than
// misleading. Sourced in Build-MatchWise-v6.md.
const CLASH_NOTE = {
  en: "One catch worth knowing: the DISC model's \"C\" is not the same thing as the Conscientiousness figure shown elsewhere in this report. In a 9,000-person study comparing the two, they correlated about zero — DISC's C is about being reserved and precise, not about being organised or dependable. The two numbers are allowed to disagree.",
  ar: "ملاحظة تستحق الانتباه: حرف \"C\" في نموذج DISC ليس هو نفسه مقياس الانضباط الظاهر في موضع آخر من هذا التقرير. في دراسة على أكثر من ٩٠٠٠ شخص قارنت بينهما، كان الارتباط صفرًا تقريبًا — فـ C في DISC تعني التحفّظ والدقة، لا التنظيم والاعتمادية. ومن الطبيعي أن يختلف الرقمان.",
};

const RELATION6 = {
  same: {
    en: (a, b, q) => `${a} and ${b} land in the same corner — ${q}. You will recognise each other's instincts easily. The thing to watch is that you also share the same blind spot: whatever that style under-weights, neither of you is naturally covering.`,
    ar: (a, b, q) => `${a} و${b} في الزاوية نفسها — ${q}. ستتعرّفان على دوافع بعضكما بسهولة. لكن انتبها إلى أنكما تشتركان أيضًا في النقطة العمياء نفسها: ما يهمله هذا الأسلوب لن يغطّيه أي منكما تلقائيًا.`,
  },
  adjacent: {
    en: (a, b) => `${a} and ${b} share one of the two dimensions and differ on the other. That is the easiest combination to work with: there is enough common ground to feel understood, and enough difference that one of you notices what the other misses.`,
    ar: (a, b) => `${a} و${b} يتفقان في أحد البعدين ويختلفان في الآخر. وهذه أسهل التركيبات: أرضية مشتركة كافية للشعور بالتفاهم، واختلاف كافٍ ليلاحظ أحدكما ما يفوت الآخر.`,
  },
  opposite: {
    en: (a, b) => `${a} and ${b} sit on opposite corners. This is not a warning — opposite styles often work well together — but it does mean the same words can land very differently. Expect to translate for each other more often than couples who share a corner.`,
    ar: (a, b) => `${a} و${b} في زاويتين متقابلتين. هذا ليس تحذيرًا — فالأساليب المتقابلة كثيرًا ما تنسجم — لكنه يعني أن الكلمات نفسها قد تصل بشكل مختلف تمامًا. توقّعا الحاجة إلى توضيح المقصود لبعضكما أكثر من غيركما.`,
  },
};

const BALANCED_PAIR = {
  en: "At least one of you sits near the centre of both dimensions, so there is no clear corner to compare. That is a real finding, not a gap — it usually means adapting to the situation rather than leading with one fixed style.",
  ar: "أحدكما على الأقل يقع قرب منتصف البعدين، فلا توجد زاوية واضحة للمقارنة. وهذه نتيجة حقيقية لا نقص — وغالبًا ما تعني التكيّف مع الموقف بدل الانطلاق من أسلوب واحد ثابت.",
};

const DISCLAIMER6 = {
  en: "Built by re-reading the personality answers you already gave — no extra questions, and it never changes the Alignment Index. It describes how you tend to come across, not what you are capable of, and a short questionnaire cannot capture either fully.",
  ar: "مبني على إعادة قراءة إجابات الشخصية التي قدّمتها بالفعل — بلا أسئلة إضافية، ولا يغيّر مؤشر الانسجام إطلاقًا. وهو يصف كيف تظهر عادةً في التعامل، لا ما أنت قادر عليه، ولا يمكن لاستبيان قصير أن يحيط بأي منهما.",
};

/**
 * Quadrant plot. x = outspokenness (Extraversion), y = people-focus
 * (Agreeableness) plotted upward, so the corners land in the classic DISC
 * arrangement: top-right people+outspoken, bottom-right task+outspoken.
 * `pts`: [{x, y, name, color}], one or two.
 */
function stylePlot6(pts, lang) {
  const S = 250, PAD = 40, W = S + PAD * 2;
  const px = v => PAD + (v / 100) * S;
  const py = v => PAD + S - (v / 100) * S;
  const q = k => QUAD6[k].name[lang];
  const dots = pts.map(p => `
    <circle cx="${px(p.x)}" cy="${py(p.y)}" r="8" fill="${p.color}" stroke="var(--card)" stroke-width="2.5"/>
    ${p.name ? `<text x="${px(p.x)}" y="${py(p.y) - 14}" font-size="11" font-weight="700" text-anchor="middle" fill="${p.color}">${esc6(p.name)}</text>` : ""}
  `).join("");
  return `<svg viewBox="0 0 ${W} ${W}" width="100%" style="max-width:330px;display:block;margin:0 auto" role="img">
    <rect x="${PAD}" y="${PAD}" width="${S/2}" height="${S/2}" fill="var(--accent2)" fill-opacity=".06"/>
    <rect x="${PAD+S/2}" y="${PAD}" width="${S/2}" height="${S/2}" fill="var(--ok)" fill-opacity=".07"/>
    <rect x="${PAD}" y="${PAD+S/2}" width="${S/2}" height="${S/2}" fill="var(--warn)" fill-opacity=".08"/>
    <rect x="${PAD+S/2}" y="${PAD+S/2}" width="${S/2}" height="${S/2}" fill="var(--accent)" fill-opacity=".06"/>
    <rect x="${PAD}" y="${PAD}" width="${S}" height="${S}" fill="none" stroke="var(--line)"/>
    <line x1="${PAD+S/2}" y1="${PAD}" x2="${PAD+S/2}" y2="${PAD+S}" stroke="var(--line)"/>
    <line x1="${PAD}" y1="${PAD+S/2}" x2="${PAD+S}" y2="${PAD+S/2}" stroke="var(--line)"/>
    <!-- Quadrant names sit at the OUTER edge of each quadrant, not hugging
         the centre crosshair. Profiles cluster near the middle (that is what
         a 0-100 trait scale does), so centre-hugging labels collide with the
         person dots exactly when the chart is most crowded. -->
    <text x="${PAD+S*0.25}" y="${PAD+15}" font-size="9.5" text-anchor="middle" fill="var(--muted)">${esc6(q("steady"))}</text>
    <text x="${PAD+S*0.75}" y="${PAD+15}" font-size="9.5" text-anchor="middle" fill="var(--muted)">${esc6(q("inspiring"))}</text>
    <text x="${PAD+S*0.25}" y="${PAD+S-8}" font-size="9.5" text-anchor="middle" fill="var(--muted)">${esc6(q("precise"))}</text>
    <text x="${PAD+S*0.75}" y="${PAD+S-8}" font-size="9.5" text-anchor="middle" fill="var(--muted)">${esc6(q("driving"))}</text>
    <text x="${PAD+S/2}" y="${PAD+S+24}" font-size="10" text-anchor="middle" fill="var(--muted)">${esc6(T6.axisX[lang])}</text>
    <text x="${PAD-14}" y="${PAD+S/2}" font-size="10" text-anchor="middle" fill="var(--muted)" transform="rotate(-90 ${PAD-14} ${PAD+S/2})">${esc6(T6.axisY[lang])}</text>
    ${dots}
  </svg>`;
}

/** One person's named result line, or the balanced equivalent. */
function styleLine6(style, lang, who) {
  if (style.balanced) {
    return `<p class="small"><b>${esc6(who)}</b> — ${esc6(T6.balanced[lang])}</p>`;
  }
  const Q = QUAD6[style.quadrant];
  return `<p class="small" style="margin-bottom:4px"><b>${esc6(who)}</b> — <b>${esc6(Q.name[lang])}</b>
    <span class="muted">(${esc6(Q.disc[lang])})</span></p>
    <p class="muted small" style="margin-bottom:10px">${esc6(Q.desc[lang])}</p>`;
}

function crossRef6(lang) {
  return `<details style="margin-top:10px">
    <summary class="ans-summary">${esc6(T6.crossRefTitle[lang])}</summary>
    <p class="muted small" style="margin-top:8px">${esc6(CLASH_NOTE[lang])}</p>
  </details>`;
}

function insufficient6(style, lang) {
  return `<div class="card report-section"><h3>🎭 ${T6.title[lang]}</h3>
    <p class="muted small">${esc6(T6.notEnough[lang])}</p></div>`;
}

/** Interaction-style card for one person. */
export function interactionSolo(bigFive, p, lang) {
  const style = interactionStyle(bigFive);
  if (!style.sufficient) return insufficient6(style, lang);
  return `<div class="card report-section"><h3>🎭 ${T6.title[lang]}</h3>
    <p class="muted small" style="margin-bottom:10px">${esc6(T6.soloSub[lang])}</p>
    ${stylePlot6([{ x: style.x, y: style.y, name: p.name, color: "var(--accent2)" }], lang)}
    <div class="report-section" style="margin-top:12px">
      ${styleLine6(style, lang, p.name)}
      ${style.balanced ? `<p class="muted small">${esc6(T6.balancedNote[lang])}</p>` : ""}
    </div>
    ${crossRef6(lang)}
    <p class="disclaimer">${esc6(DISCLAIMER6[lang])}</p>
  </div>`;
}

/** Interaction-style card for a couple. */
export function interactionPair(bigFive, pa, pb, lang) {
  if (!bigFive || !bigFive.a || !bigFive.b) return "";
  const sa = interactionStyle(bigFive.a), sb = interactionStyle(bigFive.b);
  const cmp = compareInteraction(sa, sb);
  if (!cmp.sufficient) return insufficient6(sa.sufficient ? sb : sa, lang);

  let verdict;
  if (!cmp.relation) {
    verdict = `<p class="muted small">${esc6(BALANCED_PAIR[lang])}</p>`;
  } else if (cmp.relation === "same") {
    verdict = `<p class="small">${esc6(RELATION6.same[lang](pa.name, pb.name, QUAD6[sa.quadrant].name[lang]))}</p>`;
  } else {
    verdict = `<p class="small">${esc6(RELATION6[cmp.relation][lang](pa.name, pb.name))}</p>`;
  }

  return `<div class="card report-section"><h3>🎭 ${T6.title[lang]}</h3>
    <p class="muted small" style="margin-bottom:10px">${esc6(T6.pairSub[lang])}</p>
    <div class="legend"><span><b style="background:var(--accent)"></b>${esc6(pa.name)}</span>
      <span><b style="background:var(--accent2)"></b>${esc6(pb.name)}</span></div>
    ${stylePlot6([
      { x: sa.x, y: sa.y, name: pa.name, color: "var(--accent)" },
      { x: sb.x, y: sb.y, name: pb.name, color: "var(--accent2)" },
    ], lang)}
    <div class="report-section" style="margin-top:12px">
      ${styleLine6(sa, lang, pa.name)}
      ${styleLine6(sb, lang, pb.name)}
      ${verdict}
    </div>
    ${crossRef6(lang)}
    <p class="disclaimer">${esc6(DISCLAIMER6[lang])}</p>
  </div>`;
}

// Placed ahead of v3's closing 🧭 summary card, same anchor and same
// fallback-to-append behaviour report-v4.js and report-v5.js both use.
const ANCHOR6 = '<div class="card report-section"><h3>🧭';
function spliceBefore6(html, card) {
  if (!card) return html;
  const i = html.lastIndexOf(ANCHOR6);
  return i === -1 ? html + card : html.slice(0, i) + card + html.slice(i);
}

export function renderReportV6(res, pa, pb, lang) {
  return spliceBefore6(renderReportV5(res, pa, pb, lang), interactionPair(res.bigFive, pa, pb, lang));
}

export function renderSoloV6(s, p, lang) {
  return spliceBefore6(renderSoloV5(s, p, lang), interactionSolo(s.bigFive, p, lang));
}

// Guardrail check, run at load — mirrors the ideology check in report-v4.js.
// The public DISC model may be referenced as a cross-reference (QUAD6[].disc
// and CLASH_NOTE do exactly that); claiming to BE the DiSC product may not.
{
  const claims = /everything\s*disc|your\s+disc\s+(result|profile|score)|disc\s*®|official\s+disc/i;
  const all = JSON.stringify([T6, QUAD6, CLASH_NOTE, RELATION6, BALANCED_PAIR, DISCLAIMER6]);
  if (claims.test(all))
    throw new Error("report-v6: a user-facing string claims to be the DiSC product");
  if (!/9,?000|٩٠٠٠/.test(JSON.stringify(CLASH_NOTE)))
    throw new Error("report-v6: the C-vs-Conscientiousness note lost its evidence");
  if (STYLE_MIN_CLARITY <= 0)
    throw new Error("report-v6: clarity threshold disabled — quadrants would be forced on centred profiles");
}
