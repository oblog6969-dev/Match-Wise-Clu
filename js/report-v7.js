// MatchWise v7 report — type preferences card. Additive layer over v6.
// -----------------------------------------------------------------------------
// Does NOT modify report.js / report-v3.js / report-v4.js / report-v5.js /
// report-v6.js. Wraps renderReportV6 / renderSoloV6 and splices one card in,
// using the same depth-walking card surgery report-v4.js established.
//
// See the long header in scoring-v7.js for the mapping, the citations, and why
// this is not the branded instrument. Four rules from that header are enforced
// in this file, three of them by a load-time guardrail at the bottom:
//
//   1. No user-facing string may claim to BE the branded instrument. The card
//      may reference the four-letter type model as a cross-reference, clearly
//      marked as such — the same latitude report-v6.js takes with DISC.
//   2. The card must state that the four-letter model leaves out emotional
//      volatility (Neuroticism), and that this is the trait with the strongest
//      evidence for relationship outcomes. See MISSING_NOTE.
//   3. The card must state that the dimensions are continuous, not two kinds
//      of people, and that retest instability follows from that. See DIM_NOTE.
//   4. No compatibility score. compareTypes returns description only, and this
//      file must not turn it into a number or a verdict.
//
// Layout note: this card deliberately uses no SVG. The four dimensions are
// drawn with the existing `.axis4-track` slider from v4, which is built on
// logical properties (inset-inline-start) and so mirrors correctly under RTL
// on its own. That avoids the whole text-anchor/direction class of bug the v5
// round documented. The one thing that must NOT mirror is the letter code
// itself — a code is read left-to-right in both languages — which is why it
// reuses `.code-display` (style.css already pins that to direction:ltr under
// [dir="rtl"]).
// -----------------------------------------------------------------------------

import { renderReportV6, renderSoloV6 } from "./report-v6.js";
import { typePreferences, compareTypes, TYPE_MIN_CLARITY, UNDIFFERENTIATED } from "./scoring-v7.js";
import { typeDistances, keirseyMatches, typeDistanceCouple, TYPE_TABLE } from "./scoring-v7.js";

const esc7 = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const T7 = {
  title:    { en: "Type Preferences", ar: "تفضيلات النمط" },
  soloSub:  { en: "The four preferences behind the familiar four-letter shorthand, read from the personality answers you already gave. The sliders are the real result; the letters are a summary of them.",
              ar: "التفضيلات الأربعة التي يقوم عليها الاختصار المعروف من أربعة أحرف، مقروءةً من إجابات الشخصية التي قدّمتها بالفعل. المؤشّرات المتدرّجة هي النتيجة الحقيقية، والأحرف مجرّد تلخيص لها." },
  pairSub:  { en: "Where each of you leans on the four preferences. A difference is not a mismatch — these describe how you each take in information and reach a decision, not whether you suit each other.",
              ar: "أين يميل كل منكما في التفضيلات الأربعة. الاختلاف هنا ليس تنافرًا — فهذه تصف كيف يستقبل كل منكما المعلومات ويصل إلى قرار، لا ما إذا كنتما مناسبين لبعضكما." },
  notEnough:{ en: "Not enough answers on the traits this is built from.", ar: "لا توجد إجابات كافية على السمات التي يُبنى عليها هذا القسم." },
  partial:  { en: "Some preferences have too few answers to show, so no four-letter summary is given — a code with a gap in it would read as a type, and a partial type is an invented one.",
              ar: "بعض التفضيلات لا تحتوي على إجابات كافية لعرضها، لذلك لا يُعرض ملخّص من أربعة أحرف — فالرمز الناقص يُقرأ وكأنه نمط، والنمط الناقص نمط مُختلق." },
  yourCode: { en: "Your four letters", ar: "أحرفك الأربعة" },
  undiff:   { en: "Undifferentiated", ar: "غير محسوم" },
  strong:   { en: "well-supported mapping", ar: "ارتباط قوي" },
  moderate: { en: "moderate mapping", ar: "ارتباط متوسط" },
  crossRefTitle: { en: "How much weight to put on this", ar: "ما مقدار الثقة التي تستحقها هذه النتيجة" },
  compareTitle:  { en: "Where you two differ", ar: "أين تختلفان" },
  sharedAll: { en: "All four preferences land on the same side for both of you.",
               ar: "التفضيلات الأربعة كلها تقع في الجهة نفسها لكليكما." },
  sharedNone:{ en: "The two of you lean opposite ways on every preference that could be compared.",
               ar: "كلٌّ منكما يميل في الاتجاه المعاكس في كل تفضيل أمكن مقارنته." },
};

/**
 * The four dimensions in plain language. `name` is the real label; `letters`
 * is offered only as a cross-reference for someone who already knows the
 * vocabulary — never as the primary identity, same rule as QUAD6 in v6.
 */
const DIM7 = {
  EI: {
    name:    { en: "Where your energy comes back", ar: "من أين تستعيد طاقتك" },
    letters: { en: "I · Introversion — E · Extraversion", ar: "I · الانطواء — E · الانبساط" },
    lo: { en: "From quiet and few people", ar: "من الهدوء وقلّة المخالطة" },
    hi: { en: "From talk and company", ar: "من الحديث والمخالطة" },
    loDesc: { en: "You recharge alone or with one or two people, and think a thing through before saying it.",
              ar: "تستعيد طاقتك وحدك أو مع شخص أو اثنين، وتفكّر في الأمر قبل أن تقوله." },
    hiDesc: { en: "You recharge around people, and often work a thought out by saying it aloud.",
              ar: "تستعيد طاقتك بين الناس، وكثيرًا ما تُنضج الفكرة بقولها بصوت مسموع." },
  },
  SN: {
    name:    { en: "What you notice first", ar: "ما الذي تلاحظه أولًا" },
    letters: { en: "S · Sensing — N · Intuition", ar: "S · الحسّ — N · الحدس" },
    lo: { en: "Concrete detail", ar: "التفاصيل الملموسة" },
    hi: { en: "Patterns and possibilities", ar: "الأنماط والاحتمالات" },
    loDesc: { en: "You start from what is actually there — facts, specifics, what has worked before.",
              ar: "تبدأ ممّا هو موجود فعلًا — وقائع وتفاصيل وما نجح سابقًا." },
    hiDesc: { en: "You start from what it could mean — connections, implications, what it might become.",
              ar: "تبدأ ممّا قد يعنيه الأمر — الروابط والدلالات وما يمكن أن يصير إليه." },
  },
  TF: {
    name:    { en: "How you weigh a decision", ar: "كيف تزن القرار" },
    letters: { en: "T · Thinking — F · Feeling", ar: "T · التفكير — F · الوجدان" },
    lo: { en: "By the logic of it", ar: "بمنطق المسألة" },
    hi: { en: "By its effect on people", ar: "بأثره في الناس" },
    loDesc: { en: "You step back and look for the consistent answer, even when it is the less comfortable one.",
              ar: "تتراجع خطوة وتبحث عن الجواب المتّسق، حتى لو كان الأقلّ راحة." },
    hiDesc: { en: "You weigh what it will do to the people involved, and treat that as part of the answer.",
              ar: "تزن ما سيفعله القرار بالمعنيّين به، وتعدّ ذلك جزءًا من الجواب." },
  },
  JP: {
    name:    { en: "How you handle plans", ar: "كيف تتعامل مع الخطط" },
    letters: { en: "P · Perceiving — J · Judging", ar: "P · الاستكشاف — J · الحسم" },
    lo: { en: "Keep options open", ar: "إبقاء الخيارات مفتوحة" },
    hi: { en: "Settle it and move on", ar: "الحسم والمضيّ قدمًا" },
    loDesc: { en: "You would rather stay flexible and decide late, and a fixed plan can feel like a cage.",
              ar: "تفضّل البقاء مرنًا وتأجيل الحسم، وقد تشعر أن الخطة الجامدة قيد." },
    hiDesc: { en: "You would rather settle it, get it on the calendar, and stop carrying the open question.",
              ar: "تفضّل الحسم وتثبيت الموعد والتخلّص من عبء السؤال المعلّق." },
  },
};

/**
 * GUARDRAIL-CHECKED. The omission that matters most in this app specifically.
 * Parallel to CLASH_NOTE in report-v6.js: a note that exists because the same
 * report shows a number the user would otherwise silently misread.
 */
const MISSING_NOTE = {
  en: "The four-letter model leaves one thing out completely: how much your mood swings under stress — the trait shown as emotional volatility elsewhere in this report. It is not one of the four letters and never has been. That matters here more than it would at work, because across 115 long-term studies of couples, that one trait was the most consistent personality predictor of how satisfied and how stable a relationship turned out to be. So the four letters are silent on the trait with the strongest evidence for the question you came here with.",
  ar: "يغفل نموذج الأحرف الأربعة أمرًا واحدًا تمامًا: مدى تقلّب مزاجك تحت الضغط — وهي السمة المعروضة باسم التقلّب الوجداني في موضع آخر من هذا التقرير. فهي ليست أحد الأحرف الأربعة ولم تكن يومًا. وهذا مهمّ هنا أكثر منه في العمل، لأن ١١٥ دراسة طويلة الأمد على الأزواج وجدت أن تلك السمة وحدها كانت أثبت مؤشّرات الشخصية تنبّؤًا برضا العلاقة واستقرارها. أي أن الأحرف الأربعة صامتة تمامًا عن السمة صاحبة أقوى الأدلة بشأن السؤال الذي جئت من أجله.",
};

/**
 * GUARDRAIL-CHECKED. Why the sliders are the result and the letters are not.
 */
const DIM_NOTE = {
  en: "Each of these four is a smooth scale, not two kinds of people — when large samples are measured, the scores pile up in the middle rather than splitting into two humps. The letter is just a cut made at the midpoint. That is why a score near the middle is shown here as X instead of a letter, and why retaking a four-letter questionnaire flips at least one letter for about half of people within five weeks: near the middle, the cut is close to a coin toss.",
  ar: "كلٌّ من هذه الأربعة مقياس متدرّج، لا نوعان من البشر — فعند قياس عيّنات كبيرة تتكدّس الدرجات في المنتصف بدل أن تنقسم إلى قمّتين. والحرف ليس إلا قطعًا عند نقطة المنتصف. ولهذا تُعرض هنا الدرجة القريبة من المنتصف بحرف X بدل حرف حقيقي، ولهذا أيضًا يتغيّر حرف واحد على الأقل لدى نحو نصف الناس عند إعادة استبيان الأحرف الأربعة خلال خمسة أسابيع: فقرب المنتصف يكون القطع أقرب إلى رمي عملة.",
};

/**
 * GUARDRAIL-CHECKED. Stated because the user is very likely to arrive
 * expecting exactly the thing this refuses to give them.
 */
const NO_PAIRING_NOTE = {
  en: "This report does not rate the two of you as a type pairing, and no letter here moves your Alignment Index. Charts that say which types belong together are folk advice, not findings — pairing rules of that kind have not held up when tested against how couples actually fare. What the letters are useful for is noticing why the same conversation lands differently for each of you.",
  ar: "لا يقيّم هذا التقرير الاقتران بين نمطيكما، ولا يؤثّر أي حرف هنا في مؤشّر الانسجام لديكما. أمّا الجداول التي تحدّد أي الأنماط تناسب بعضها فهي نصيحة شائعة لا نتيجة بحثية — إذ لم تصمد قواعد الاقتران هذه عند اختبارها بما يحدث للأزواج فعلًا. وفائدة الأحرف الحقيقية أنها تعينك على إدراك سبب وصول الحديث نفسه إلى كل منكما بشكل مختلف.",
};

const UNDIFF_NOTE = {
  en: `A letter shown as ${UNDIFFERENTIATED} means that preference came out close enough to the middle that naming a side would be inventing one. It is a real result, not a missing answer: it usually means you go either way depending on the situation.`,
  ar: `الحرف المعروض ${UNDIFFERENTIATED} يعني أن ذلك التفضيل جاء قريبًا من المنتصف بدرجة تجعل تسمية جهة بعينها اختلاقًا لها. وهي نتيجة حقيقية لا إجابة ناقصة: وغالبًا ما تعني أنك تسلك هذا أو ذاك بحسب الموقف.`,
};

const ALL_BALANCED = {
  en: "Every one of the four came out near the middle, so there is no four-letter summary to give. That is a finding in itself — it describes someone who shifts with the situation rather than running on one fixed setting.",
  ar: "جاءت الأربعة كلها قريبة من المنتصف، فلا يوجد ملخّص من أربعة أحرف يمكن تقديمه. وهذه بذاتها نتيجة — فهي تصف شخصًا يتحرّك مع الموقف بدل أن يسير على إعداد واحد ثابت.",
};

/**
 * Phrased around how many preferences were CLEAR ENOUGH ON BOTH SIDES to
 * compare, because that count is often not four.
 *
 * The earlier wording ("...on every preference that could be compared") was
 * true but read as if it covered all four, when on the demo pair only one
 * dimension was actually comparable — the other three had an X on one side.
 * A reader would have taken "opposite on everything" from a single letter.
 */
const SHARED_TEXT = {
  en: (n, total) => total === 1
    ? `Only one preference came out clear enough on both sides to compare, and on that one you ${n ? "match" : "lean opposite ways"}.`
    : `Of the ${total} preferences clear enough on both sides to compare, you share ${n}.`,
  ar: (n, total) => total === 1
    ? `تفضيل واحد فقط جاء محسومًا لدى كليكما بما يكفي للمقارنة، وفيه ${n ? "تتفقان" : "تميلان في اتجاهين متعاكسين"}.`
    : `من بين ${total} تفضيلات جاءت محسومة لدى كليكما بما يكفي للمقارنة، تشتركان في ${n}.`,
};

/** Per-dimension "what this difference looks like day to day". Descriptive. */
const DIFF7 = {
  EI: { en: "One of you refills by being around people and the other by being away from them. The usual friction is not about affection — it is about what counts as a restful evening.",
        ar: "أحدكما يستعيد طاقته بين الناس والآخر بعيدًا عنهم. والاحتكاك المعتاد هنا ليس في المودّة — بل في تعريف الأمسية المريحة." },
  SN: { en: "One of you starts from the specifics and the other from what it might mean. Expect one to want the details settled while the other is still circling the shape of the thing.",
        ar: "أحدكما يبدأ من التفاصيل والآخر ممّا قد يعنيه الأمر. توقّعا أن يريد أحدكما حسم التفاصيل بينما لا يزال الآخر يدور حول الصورة العامة." },
  TF: { en: "One of you reaches for the consistent answer and the other for what it does to the people involved. Both are reasons; the argument is usually about which one gets to go first.",
        ar: "أحدكما يقصد الجواب المتّسق والآخر يقصد أثره في المعنيّين. وكلاهما سبب وجيه؛ والخلاف عادةً على أيّهما يأتي أولًا." },
  JP: { en: "One of you wants it decided and the other wants room to change course. This is the difference most likely to show up as a real argument, and it is usually about timing rather than the decision itself.",
        ar: "أحدكما يريد الحسم والآخر يريد مساحة لتغيير المسار. وهذا هو الاختلاف الأرجح أن يظهر كخلاف فعلي، وهو غالبًا على التوقيت لا على القرار نفسه." },
};

const DISCLAIMER7 = {
  en: "Built by re-reading the personality answers you already gave — no extra questions, and it never changes the Alignment Index. This is not the branded four-letter questionnaire and is not scored against its norms; it is this app's own reading of four traits it already measures.",
  ar: "مبني على إعادة قراءة إجابات الشخصية التي قدّمتها بالفعل — بلا أسئلة إضافية، ولا يغيّر مؤشر الانسجام إطلاقًا. وهو ليس الاستبيان التجاري ذا الأحرف الأربعة ولا يُصحَّح وفق معاييره؛ بل هو قراءة هذا التطبيق لأربع سمات يقيسها أصلًا.",
};

// ── Type-map strings ─────────────────────────────────────────────────────────
// Two separate blocks, kept apart on purpose. TMAP7 describes a MEASURED
// quantity (how close your four scores sit to each type). KEIRSEY7 describes a
// PROPOSED pairing chart. Merging them into one "compatibility" number is the
// exact move this card exists to avoid, so the two never share a heading.
const TMAP7 = {
  title:   { en: "Type map — how close each type is to your scores", ar: "خريطة الأنماط — قرب كل نمط من درجاتك" },
  sub:     { en: "Every one of the sixteen types, shaded by how near it sits to the four scores above. Darker means nearer. This measures resemblance, not suitability — it is arithmetic on your own numbers, with no claim about who you would get along with.",
             ar: "الأنماط الستة عشر جميعها، مظلّلة بحسب قربها من الدرجات الأربع أعلاه. وكلما زاد الغمق زاد القرب. وهذا يقيس التشابه لا المناسَبة — فهو حساب على أرقامك أنت، دون أي ادّعاء بشأن من ستنسجم معه." },
  pairSub: { en: "Every one of the sixteen types, shaded by how near it sits to whichever of you is closer to it. Each of your own types is outlined in your colour. This shades by resemblance, not by who suits whom.",
             ar: "الأنماط الستة عشر جميعها، مظلّلة بحسب قربها من أقربكما إليها. ونمط كلٍّ منكما محاط بإطار بلونه. والتظليل بحسب التشابه لا بحسب من يناسب من." },
  nearest: { en: "Nearest to your profile", ar: "الأقرب إلى ملفك" },
  furthest:{ en: "Furthest from your profile", ar: "الأبعد عن ملفك" },
  near:    { en: "Near", ar: "قريب" },
  far:     { en: "Far", ar: "بعيد" },
  yours:   { en: "your type", ar: "نمطك" },
  flat:    { en: "All sixteen come out about equally far away, so there is no nearer or further to shade — the scores sit near the middle of every dimension.",
             ar: "تأتي الأنماط الستة عشر كلها على بُعد متقارب، فلا يوجد أقرب ولا أبعد للتظليل — إذ تقع الدرجات قرب منتصف كل بعد." },
};

const KEIRSEY7 = {
  title: { en: "The popular “best match” chart — and why it is here in quotes",
           ar: "جدول «أفضل تطابق» الشائع — ولماذا هو بين قوسين هنا" },
  best:  { en: "Named as the best match", ar: "يُذكر باعتباره أفضل تطابق" },
  worst: { en: "Named as the hardest match", ar: "يُذكر باعتباره أصعب تطابق" },
  // GUARDRAIL-CHECKED. This label is the whole reason the chart may be shown.
  note:  { en: "These four came from one published proposal (Keirsey & Bates, 1978): that couples do best sharing the second letter while differing on the first and fourth. Almost every “best match” chart online descends from it. It was a suggestion, not a result — when type pairings have actually been tested against how satisfied couples turn out to be, no dependable effect has shown up, and a US National Research Council review in 1991 found the evidence did not support using the instrument this way. It is shown here because you asked to see it, clearly marked, rather than found somewhere that presents it as fact. Nothing in this block touches your Alignment Index.",
           ar: "هذه الأربعة مصدرها اقتراح منشور واحد (كيرسي وبيتس، ١٩٧٨): أن أفضل الأزواج حالًا من يتفقون في الحرف الثاني ويختلفون في الأول والرابع. وتكاد كل جداول «أفضل تطابق» على الإنترنت تتحدّر منه. وقد كان اقتراحًا لا نتيجة — فعند اختبار اقترانات الأنماط فعليًا مقابل مدى رضا الأزواج، لم يظهر أي أثر يُعتمد عليه، ووجدت مراجعة لمجلس البحوث القومي الأمريكي عام ١٩٩١ أن الأدلة لا تدعم هذا الاستخدام للأداة. وهو معروض هنا لأنك طلبت رؤيته، موسومًا بوضوح، بدل أن تجده في موضع يقدّمه على أنه حقيقة. ولا شيء في هذه الفقرة يمسّ مؤشّر الانسجام لديكما." },
};

/**
 * A code is only usable as a MARK on the type map when every letter is clear.
 *
 * `t.code` may legitimately contain X (that is the whole point of the dead
 * band), but "INXX" is not one of the sixteen cells, so passing it as a mark
 * silently highlighted nothing — the outline just never appeared and there was
 * no error to notice. Returns null instead, and the caller says so in words.
 */
function markCode7(t) {
  return t && t.code && !t.code.includes(UNDIFFERENTIATED) ? t.code : null;
}

const NO_MARK = {
  en: "Your own square is not outlined, because at least one of your letters came out undifferentiated — you do not sit on a single one of the sixteen.",
  ar: "لا يوجد إطار حول مربّعك، لأن حرفًا واحدًا على الأقل من حروفك جاء غير محسوم — فأنت لا تقع على واحد بعينه من الستة عشر.",
};
/**
 * Shown in place of the pairing chart when a code is not fully clear.
 *
 * keirseyMatches() returns null for any code containing X, which is correct —
 * the chart is defined over the sixteen, and there is no row for "INXX". But
 * returning null made the whole block disappear with nothing in its place,
 * so a user who came specifically to see their best and worst matches just
 * found the feature missing and no reason given. Say why.
 */
const NO_CHART = {
  en: "No “best match” list is shown for you, because that chart is defined only over the sixteen four-letter types and at least one of your letters came out undifferentiated. The type map above still applies: it works from your actual scores rather than from a letter, so it does not need you to sit on one of the sixteen.",
  ar: "لا تُعرض لك قائمة «أفضل تطابق»، لأن ذلك الجدول معرّف على الأنماط الستة عشر ذات الأحرف الأربعة فقط، وقد جاء حرف واحد على الأقل من حروفك غير محسوم. أمّا خريطة الأنماط أعلاه فتبقى صالحة: فهي تعمل من درجاتك الفعلية لا من حرف، ولا تحتاج أن تقع على واحد من الستة عشر.",
};

const NO_MARK_PAIR = {
  en: "A square is outlined only for whoever has four clear letters; an undifferentiated letter means that person does not sit on a single one of the sixteen.",
  ar: "لا يُحاط بإطار إلا مربّع من كانت حروفه الأربعة محسومة؛ فالحرف غير المحسوم يعني أن صاحبه لا يقع على واحد بعينه من الستة عشر.",
};

const DIST7 = {
  title: { en: "How far apart the two of you sit", ar: "ما مدى تباعدكما" },
  sub:   { en: "Measured straight from the four scores — the average distance between you across the four preferences, and the gap on each one.",
           ar: "مقيسة مباشرةً من الدرجات الأربع — متوسّط المسافة بينكما عبر التفضيلات الأربعة، والفارق في كل تفضيل." },
  same:  { en: "Very similar", ar: "متشابهان جدًا" },
  apart: { en: "Very different", ar: "مختلفان كثيرًا" },
  overall:{ en: "Average distance", ar: "متوسّط المسافة" },
  // GUARDRAIL-CHECKED. The number above is easy to misread as a score.
  note:  { en: "Read this as a description, not a grade. Neither end of the strip is the good end: similar couples find it easier to predict each other, different couples cover more ground between them, and measured similarity in personality is a weak predictor of how relationships actually turn out either way. Your Alignment Index is unaffected by anything in this block.",
           ar: "اقرأ هذا وصفًا لا تقييمًا. فلا طرف من الشريط هو الطرف الجيّد: المتشابهان يسهل على كلٍّ منهما توقّع الآخر، والمختلفان يغطّيان مساحة أوسع بينهما، والتشابه المقيس في الشخصية مؤشّر ضعيف على مآل العلاقات في الحالتين. ولا يتأثّر مؤشّر الانسجام لديكما بأي شيء في هذه الفقرة." },
};

/**
 * The 16-type map. Plain CSS grid rather than SVG — no text-anchor, no manual
 * RTL mirroring, so none of the chart bugs the v5 round documented can occur
 * here. `direction:ltr` is pinned on the grid because type codes read
 * left-to-right in both languages; the surrounding prose still flows RTL.
 *
 * `marks`: [{code, color, name}] drawn as an outline on that cell.
 */
function typeGrid7(byCode, marks, lang) {
  // Shade across the OBSERVED range, not the theoretical 0-100.
  // Trait scores cluster near the midpoint, so real distances to the sixteen
  // centroids occupy a narrow band — on live demo data the spread was about
  // 20 points wide. Mapping that band onto an absolute 0-100 ramp made all
  // sixteen cells render the same shade and the map carried no information at
  // all. Stretching the ramp to the actual min/max is what makes "darker
  // means nearer" legible. (Same family of mistake as the v6 quadrant labels
  // hugging the centre: designed for the full range, used on clustered data.)
  const vals = Object.values(byCode);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo;
  // If every type really is equidistant, a stretched ramp would manufacture
  // contrast that is not in the data. Render one flat shade and drop the
  // Near/Far legend rather than implying an ordering that does not exist.
  const flat = span < 2;
  const cells = TYPE_TABLE.map(row => row.map(code => {
    const d = byCode[code];
    const near = flat ? 0.5 : 1 - (d - lo) / span;   // 0 = furthest seen, 1 = nearest
    const shade = Math.round(5 + near * 47);
    const mk = marks.find(m => m.code === code);
    return `<div class="t7-cell"${mk ? ` style="border-color:${mk.color};border-width:2px;font-weight:800"` : ""}>
      <span class="t7-code" style="background:color-mix(in srgb,var(--accent2) ${shade}%,transparent)">${esc7(code)}</span>
      ${mk ? `<i class="t7-you" style="color:${mk.color}">${esc7(mk.name)}</i>` : ""}
    </div>`;
  }).join("")).join("");
  return `<div class="t7-grid">${cells}</div>
    ${flat ? `<p class="muted small">${esc7(TMAP7.flat[lang])}</p>`
           : `<div class="t7-scale"><span>${esc7(TMAP7.near[lang])}</span>
      <i></i><span>${esc7(TMAP7.far[lang])}</span></div>`}`;
}

/** Ranked "nearest / furthest" lists under the map. */
function rankList7(items, label, lang) {
  return `<div class="t7-rank" style="flex:1;min-width:140px">
    <div class="lean-head"><span class="muted small">${esc7(label)}</span></div>
    <ul class="clean" style="direction:ltr;text-align:start">
      ${items.map(r => `<li style="display:flex;justify-content:space-between;gap:10px">
        <b>${esc7(r.code)}</b><span class="muted small">${r.distance}</span></li>`).join("")}
    </ul></div>`;
}

/** Keirsey's proposal, shown only with its label attached. */
function keirseyBlock7(code, lang) {
  const k = keirseyMatches(code);
  if (!k) return `<p class="muted small" style="margin-top:12px">${esc7(NO_CHART[lang])}</p>`;
  const chips = (list, color) => `<div style="display:flex;gap:6px;flex-wrap:wrap;direction:ltr">
    ${list.map(c => `<span class="t7-chip" style="border-color:${color};color:${color}">${esc7(c)}</span>`).join("")}</div>`;
  return `<details style="margin-top:12px">
    <summary class="ans-summary">${esc7(KEIRSEY7.title[lang])}</summary>
    <div class="notice" style="margin-top:10px">
      <div class="lean-head"><span class="muted small">${esc7(KEIRSEY7.best[lang])}</span></div>
      ${chips(k.best, "var(--ok)")}
      <div class="lean-head" style="margin-top:10px"><span class="muted small">${esc7(KEIRSEY7.worst[lang])}</span></div>
      ${chips(k.worst, "var(--bad)")}
      <p class="muted small" style="margin-top:10px">${esc7(KEIRSEY7.note[lang])}</p>
    </div>
  </details>`;
}

/** Couple distance: overall strip + per-dimension gap bars. */
function distanceBlock7(dist, pa, pb, lang) {
  if (!dist) return "";
  const gaps = dist.usable.map(d => `<div class="lean-block" style="margin-bottom:10px">
    <div class="lean-head"><span>${esc7(DIM7[d.key].name[lang])}</span>
      <span class="muted small">${d.gap}</span></div>
    <div class="cat-bar"><i style="width:${d.gap}%"></i></div>
  </div>`).join("");
  return `<div class="report-section" style="margin-top:14px">
    <h4 class="lean-head t7-h">${esc7(DIST7.title[lang])}</h4>
    <p class="muted small" style="margin-bottom:10px">${esc7(DIST7.sub[lang])}</p>
    <div class="lean-head"><span class="muted small">${esc7(DIST7.overall[lang])}</span>
      <span class="muted small">${dist.overall}</span></div>
    <div class="axis4-track"><b style="inset-inline-start:${dist.overall}%;background:var(--accent)"></b></div>
    <div class="lean-ends"><span>${esc7(DIST7.same[lang])}</span><span>${esc7(DIST7.apart[lang])}</span></div>
    <div style="margin-top:14px">${gaps}</div>
    <p class="muted small">${esc7(DIST7.note[lang])}</p>
  </div>`;
}

/**
 * The four-letter code. Reuses `.code-display`, which style.css already pins
 * to direction:ltr under [dir="rtl"] — a code reads left-to-right in both
 * languages. Undifferentiated letters are dimmed so the eye does not read an
 * X as an equal member of the code.
 */
function codeBlock7(t, lang, label) {
  if (!t.complete) return `<p class="muted small">${esc7(T7.partial[lang])}</p>`;
  if (t.allBalanced) return `<p class="muted small">${esc7(ALL_BALANCED[lang])}</p>`;
  const letters = t.dims.map(d =>
    d.clear ? esc7(d.letter)
            : `<span style="opacity:.35" title="${esc7(T7.undiff[lang])}">${esc7(d.letter)}</span>`
  ).join("");
  return `<div class="lean-head"><span class="muted small">${esc7(label)}</span></div>
    <div class="code-display">${letters}</div>`;
}

/** One dimension row: slider + poles. `marks`: [{value, color, name}]. */
function dimRow7(dim, lang, marks) {
  const D = DIM7[dim.key];
  const dots = marks.map(m =>
    `<b style="inset-inline-start:${m.value}%;background:${m.color}" title="${esc7(m.name || "")}"></b>`).join("");
  return `<div class="lean-block">
    <div class="lean-head t7-dimhead"><span>${esc7(D.name[lang])}</span>
      <span class="muted small">${esc7(D.letters[lang])}</span></div>
    <div class="axis4-track">${dots}</div>
    <div class="lean-ends"><span>${esc7(D.lo[lang])}</span><span>${esc7(D.hi[lang])}</span></div>
  </div>`;
}

function insufficientRow7(dim, lang) {
  return `<div class="lean-block">
    <div class="lean-head"><span>${esc7(DIM7[dim.key].name[lang])}</span>
      <span class="muted small">${esc7(T7.notEnough[lang])}</span></div>
  </div>`;
}

/** Prose for one person on one dimension, only when the letter is clear. */
function dimLine7(dim, lang) {
  if (!dim.sufficient || !dim.clear) return "";
  const D = DIM7[dim.key];
  const desc = dim.value >= 50 ? D.hiDesc[lang] : D.loDesc[lang];
  return `<li><b>${esc7(dim.letter)}</b> — ${esc7(desc)}</li>`;
}

function crossRef7(lang, pair) {
  return `<details style="margin-top:10px">
    <summary class="ans-summary">${esc7(T7.crossRefTitle[lang])}</summary>
    <p class="muted small" style="margin-top:8px">${esc7(DIM_NOTE[lang])}</p>
    <p class="muted small" style="margin-top:8px">${esc7(MISSING_NOTE[lang])}</p>
    ${pair ? `<p class="muted small" style="margin-top:8px">${esc7(NO_PAIRING_NOTE[lang])}</p>` : ""}
  </details>`;
}

function insufficient7(lang) {
  return `<div class="card report-section"><h3>🔤 ${T7.title[lang]}</h3>
    <p class="muted small">${esc7(T7.notEnough[lang])}</p></div>`;
}

/** Type-preferences card for one person. */
export function typeSolo(bigFive, p, lang) {
  const t = typePreferences(bigFive);
  if (!t.sufficient) return insufficient7(lang);

  const rows = t.dims.map(d => d.sufficient
    ? dimRow7(d, lang, [{ value: d.value, color: "var(--accent2)", name: p.name }])
    : insufficientRow7(d, lang)).join("");
  const lines = t.dims.map(d => dimLine7(d, lang)).join("");
  const anyX = t.dims.some(d => d.sufficient && !d.clear);

  // Type map. Only when all four dimensions are answered — a map built from
  // three of four would rank all sixteen types on partial evidence.
  const dist = typeDistances(t);
  const map = !dist ? "" : `<div class="report-section" style="margin-top:14px">
    <h4 class="lean-head t7-h">${esc7(TMAP7.title[lang])}</h4>
    <p class="muted small" style="margin-bottom:10px">${esc7(TMAP7.sub[lang])}</p>
    ${typeGrid7(dist.byCode, markCode7(t)
        ? [{ code: markCode7(t), color: "var(--accent)", name: TMAP7.yours[lang] }] : [], lang)}
    ${markCode7(t) ? "" : `<p class="muted small">${esc7(NO_MARK[lang])}</p>`}
    <div style="display:flex;gap:18px;margin-top:12px;flex-wrap:wrap">
      ${rankList7(dist.nearest, TMAP7.nearest[lang], lang)}
      ${rankList7(dist.furthest, TMAP7.furthest[lang], lang)}
    </div>
    ${keirseyBlock7(t.allBalanced ? null : t.code, lang)}
  </div>`;

  return `<div class="card report-section"><h3>🔤 ${T7.title[lang]}</h3>
    <p class="muted small" style="margin-bottom:10px">${esc7(T7.soloSub[lang])}</p>
    ${codeBlock7(t, lang, T7.yourCode[lang])}
    ${anyX ? `<p class="muted small" style="margin-bottom:12px">${esc7(UNDIFF_NOTE[lang])}</p>` : ""}
    <div class="report-section" style="margin-top:12px">${rows}</div>
    ${lines ? `<ul class="clean">${lines}</ul>` : ""}
    ${map}
    ${crossRef7(lang, false)}
    <p class="disclaimer">${esc7(DISCLAIMER7[lang])}</p>
  </div>`;
}

/** Type-preferences card for a couple. Descriptive only — no pairing score. */
export function typePair(bigFive, pa, pb, lang) {
  if (!bigFive || !bigFive.a || !bigFive.b) return "";
  const ta = typePreferences(bigFive.a), tb = typePreferences(bigFive.b);
  const cmp = compareTypes(ta, tb);
  if (!cmp.sufficient) return insufficient7(lang);

  const rows = cmp.dims.map(d => d.sufficient
    ? dimRow7(d, lang, [
        { value: d.a.value, color: "var(--accent)", name: pa.name },
        { value: d.b.value, color: "var(--accent2)", name: pb.name },
      ])
    : insufficientRow7(d, lang)).join("");

  let summary = "";
  if (cmp.comparable.length) {
    const n = cmp.sharedCount, total = cmp.comparable.length;
    // sharedAll / sharedNone say "all four" and "every one", so they may only
    // be used when all four really were comparable. Otherwise fall through to
    // the counted wording, which states the denominator.
    summary = total === 4 && n === 4 ? T7.sharedAll[lang]
            : total === 4 && n === 0 ? T7.sharedNone[lang]
            : SHARED_TEXT[lang](n, total);
  }
  const diffs = cmp.differing.map(d =>
    `<li><b>${esc7(DIM7[d.key].name[lang])}</b> — ${esc7(DIFF7[d.key][lang])}</li>`).join("");

  const anyX = cmp.dims.some(d => d.sufficient && (!d.a.clear || !d.b.clear));

  // Measured distance between the two people.
  const dist = typeDistanceCouple(ta, tb);

  // Shared type map, shaded by the average of the two people's distances.
  const da = typeDistances(ta), db = typeDistances(tb);
  let map = "";
  if (da && db) {
    // Nearest of the two, NOT the average.
    //
    // Averaging is degenerate here: for any type, distance-to-A plus
    // distance-to-B is constant whenever A and B sit on opposite sides of the
    // space, so an opposite-leaning couple got an identical shade in all
    // sixteen cells and a Near/Far legend that described nothing. Taking the
    // minimum asks "is this type near either of you", which stays informative
    // for exactly the couples the averaged version failed on.
    const near = Object.fromEntries(Object.keys(da.byCode).map(c =>
      [c, Math.min(da.byCode[c], db.byCode[c])]));
    const marks = [];
    if (markCode7(ta)) marks.push({ code: markCode7(ta), color: "var(--accent)", name: pa.name });
    if (markCode7(tb)) marks.push({ code: markCode7(tb), color: "var(--accent2)", name: pb.name });
    map = `<div class="report-section" style="margin-top:14px">
      <h4 class="lean-head t7-h">${esc7(TMAP7.title[lang])}</h4>
      <p class="muted small" style="margin-bottom:10px">${esc7(TMAP7.pairSub[lang])}</p>
      ${typeGrid7(near, marks, lang)}
      ${marks.length === 2 ? "" : `<p class="muted small">${esc7(NO_MARK_PAIR[lang])}</p>`}
    </div>`;
  }

  return `<div class="card report-section"><h3>🔤 ${T7.title[lang]}</h3>
    <p class="muted small" style="margin-bottom:10px">${esc7(T7.pairSub[lang])}</p>
    <div class="legend"><span><b style="background:var(--accent)"></b>${esc7(pa.name)}</span>
      <span><b style="background:var(--accent2)"></b>${esc7(pb.name)}</span></div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <div style="flex:1">${codeBlock7(ta, lang, pa.name)}</div>
      <div style="flex:1">${codeBlock7(tb, lang, pb.name)}</div>
    </div>
    ${anyX ? `<p class="muted small" style="margin-bottom:12px">${esc7(UNDIFF_NOTE[lang])}</p>` : ""}
    <div class="report-section" style="margin-top:12px">${rows}</div>
    ${summary ? `<p class="small">${esc7(summary)}</p>` : ""}
    ${diffs ? `<div class="report-section"><h4 class="lean-head t7-h">${esc7(T7.compareTitle[lang])}</h4>
      <ul class="clean">${diffs}</ul></div>` : ""}
    ${distanceBlock7(dist, pa, pb, lang)}
    ${map}
    ${crossRef7(lang, true)}
    <p class="disclaimer">${esc7(DISCLAIMER7[lang])}</p>
  </div>`;
}

// Placed ahead of v3's closing 🧭 summary card, same anchor and same
// fallback-to-append behaviour v4/v5/v6 all use. Because v6 splices at the
// same anchor and v7 runs after it, the Type Preferences card lands directly
// after Interaction Style — which is the order that reads best, since the two
// cards draw on overlapping traits.
const ANCHOR7 = '<div class="card report-section"><h3>🧭';
function spliceBefore7(html, card) {
  if (!card) return html;
  const i = html.lastIndexOf(ANCHOR7);
  return i === -1 ? html + card : html.slice(0, i) + card + html.slice(i);
}

export function renderReportV7(res, pa, pb, lang) {
  return spliceBefore7(renderReportV6(res, pa, pb, lang), typePair(res.bigFive, pa, pb, lang));
}

export function renderSoloV7(s, p, lang) {
  return spliceBefore7(renderSoloV6(s, p, lang), typeSolo(s.bigFive, p, lang));
}

// Guardrail check, run at load — mirrors report-v4.js and report-v6.js.
// The public four-letter model may be referenced as a cross-reference (DIM7[]
// .letters and DIM_NOTE do exactly that); claiming to BE the branded
// instrument, or to be scored against it, may not.
{
  const ALL7 = JSON.stringify([T7, DIM7, MISSING_NOTE, DIM_NOTE, NO_PAIRING_NOTE,
                               UNDIFF_NOTE, ALL_BALANCED, DIFF7, DISCLAIMER7,
                               TMAP7, KEIRSEY7, DIST7, NO_MARK, NO_MARK_PAIR, NO_CHART]);

  const claims = /myers[\s-]*briggs|\bmbti\b|type\s+indicator|16\s*personalities|official\s+type|certified\s+practitioner/i;
  if (claims.test(ALL7))
    throw new Error("report-v7: a user-facing string names or claims the branded type instrument");

  /**
   * Assert that a caveat survives IN BOTH LANGUAGES.
   *
   * This is deliberately per-language rather than one regex alternating
   * /english|arabic/. An alternation passes as long as either translation
   * still carries the evidence — which means the single most likely way this
   * card degrades (someone rewrites the English copy and leaves the Arabic,
   * or vice versa) sails straight through the check. Verified: a one-language
   * edit is caught by this form and was NOT caught by the alternation.
   */
  const bothLangs = (block, want, err) => {
    for (const lang of ["en", "ar"])
      if (!want[lang].test(block[lang]))
        throw new Error(`report-v7: ${err} (${lang})`);
  };

  // Rule 2 — the omitted fifth factor, with its evidence intact.
  bothLangs(MISSING_NOTE, { en: /115/, ar: /١١٥/ },
    "the missing-Neuroticism note lost its evidence");

  // Rule 3 — continuity, and the retest consequence that follows from it.
  bothLangs(DIM_NOTE, { en: /five weeks/i, ar: /خمسة أسابيع/ },
    "the continuity note lost its retest-instability evidence");

  // Rule 4 — no pairing score. Catches a future edit that reintroduces one.
  bothLangs(NO_PAIRING_NOTE, { en: /Alignment Index/i, ar: /مؤشّر الانسجام/ },
    "the no-pairing-score note lost its Alignment Index guarantee");

  if (TYPE_MIN_CLARITY <= 0)
    throw new Error("report-v7: clarity threshold disabled — letters would be forced on centred profiles");

  // ── Rules covering the two visualisations ────────────────────────────────
  // The type map shades by resemblance. If a future edit relabels it as
  // compatibility, the map silently becomes the pairing claim this card is
  // built to avoid making — so the disclaimer is required to survive.
  bothLangs(TMAP7.sub, { en: /not suitability/i, ar: /لا المناسَبة/ },
    "the type map lost its resemblance-not-suitability disclaimer");
  bothLangs(TMAP7.pairSub, { en: /not by who suits whom/i, ar: /لا بحسب من يناسب من/ },
    "the couple type map lost its resemblance-not-suitability disclaimer");

  // An X in a code means the person is genuinely not on one of the sixteen.
  // If this explanation is dropped, the missing outline reads as a rendering
  // fault rather than the result it actually is.
  bothLangs(NO_MARK, { en: /undifferentiated/i, ar: /غير\s+(?:ال)?محسوم/ },
    "the unmarked-square note lost its explanation");
  bothLangs(NO_MARK_PAIR, { en: /undifferentiated/i, ar: /غير\s+(?:ال)?محسوم/ },
    "the unmarked-square note for couples lost its explanation");
  bothLangs(NO_CHART, { en: /undifferentiated/i, ar: /غير\s+(?:ال)?محسوم/ },
    "the absent-pairing-chart note lost its explanation");

  // The Keirsey chart may only ever appear with its provenance AND the fact
  // that it did not hold up. Losing either one turns a labelled proposal back
  // into the unlabelled "best match" chart this card exists to replace.
  bothLangs(KEIRSEY7.note, { en: /1978/, ar: /١٩٧٨/ },
    "the pairing chart lost its source");
  bothLangs(KEIRSEY7.note, { en: /1991/, ar: /١٩٩١/ },
    "the pairing chart lost its refutation");

  // Neither visualisation may be presented as feeding the couple's score.
  bothLangs(KEIRSEY7.note, { en: /Alignment Index/i, ar: /مؤشّر الانسجام/ },
    "the pairing chart lost its Alignment Index guarantee");
  bothLangs(DIST7.note, { en: /Alignment Index/i, ar: /مؤشّر الانسجام/ },
    "the distance strip lost its Alignment Index guarantee");
}
