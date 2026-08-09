// MatchWise v3 question bank — additive layer over v2.
// -----------------------------------------------------------------------------
// This file does NOT modify js/questions.js. It imports the v2 bank, applies a
// small set of metadata overrides, and appends the v3 items.
//
// New/changed fields introduced in v3:
//   v3   : true            marks an item added in v3 (v2 profiles never have it)
//   sub  : "anx" | "avo"   attachment subscale
//   mod  : "intimacy"      optional module — skippable, gated behind a toggle
//   qc   : "im" | "attn"   response-quality item (impression mgmt / attention)
//   exp  : <number>        expected answer, attention-check items only
//
// Scoring rules for v3 items (implemented in scoring-v3.js, not here):
//   - attachment, personality top-ups and quality items are mt:"info", w:0.
//     They never enter the pair-matching engine. They feed the per-person
//     profile only, which is what the evidence supports.
//   - a Big Five domain or attachment subscale with fewer than 3 answered
//     items must render as "not enough data", never as a number.
//   - impression-management and attention flags lower confidence only.
//
// Arabic wording is a first pass and is FLAGGED FOR NATIVE-SPEAKER REVIEW
// before release. See Build-MatchWise-v3.md, Part 4, step 1.
//
// Attachment items are written in the *style* of the ECR-S (Wei et al., 2007)
// two-dimension model. No ECR/ECR-S item text is reproduced.
// -----------------------------------------------------------------------------

// NOT `import { QUESTIONS as QUESTIONS_V2 }` — build-single.js strips whole
// `^import` lines to flatten everything into one script for the offline
// preview file, and it doesn't understand `as` aliases, so the alias would
// vanish along with the import and leave QUESTIONS_V2 undefined in the
// bundle. A plain import plus a separate const alias survives that flattening
// (the const line isn't touched by the stripper) and behaves identically as
// an ES module. See build-single.js's own bundle order for why this matters.
import { QUESTIONS } from "./questions.js";
const QUESTIONS_V2 = QUESTIONS;

// ── Overrides applied to existing v2 items ───────────────────────────────
// Appreciation is a top-5 predictor of relationship quality (Joel et al., 2020)
// and was buried inside "growth" at weight 2. It gets its own category and
// weight 3. The item id and text are unchanged, so v2 answers still map.
export const OVERRIDES_V3 = {
  g5: { cat: "appreciation", w: 3 },
};

// ── A. Attachment — 12 items (6 anxiety, 6 avoidance) ────────────────────
const ATTACHMENT = [
  { id:"an1", cat:"attachment", sub:"anx", type:"likert", mt:"info", w:0, v3:true,
    en:"I worry that my partner does not care about me as much as I care about them.",
    ar:"أقلق من أن شريكي لا يهتم بي بقدر اهتمامي به." },
  { id:"an2", cat:"attachment", sub:"anx", type:"likert", mt:"info", w:0, v3:true,
    en:"I need to hear often that I am loved before I feel secure.",
    ar:"أحتاج أن أسمع كثيرًا أنني شخص محبوب حتى أشعر بالأمان." },
  { id:"an3", cat:"attachment", sub:"anx", type:"likert", mt:"info", w:0, v3:true,
    en:"The thought of being left by someone I love frightens me.",
    ar:"فكرة أن يتركني من أحب تخيفني." },
  { id:"an4", cat:"attachment", sub:"anx", type:"likert", mt:"info", w:0, v3:true,
    en:"If my partner is out of touch for a while, I start imagining something is wrong between us.",
    ar:"إذا انقطع تواصل شريكي لفترة، أبدأ بتخيّل أن هناك خطأ ما بيننا." },
  { id:"an5", cat:"attachment", sub:"anx", type:"likert", mt:"info", w:0, v3:true,
    en:"I get upset when my partner is not available at the moment I need them.",
    ar:"أنزعج عندما لا يكون شريكي متاحًا في اللحظة التي أحتاجه فيها." },
  { id:"an6", cat:"attachment", sub:"anx", type:"likert", mt:"info", w:0, rv:true, pair:"an3", v3:true,
    en:"I rarely spend time worrying about whether my partner will stay.",
    ar:"نادرًا ما أقلق بشأن استمرار علاقتنا." },

  { id:"av1", cat:"attachment", sub:"avo", type:"likert", mt:"info", w:0, v3:true,
    en:"I prefer not to let a partner see how I really feel deep down.",
    ar:"أفضّل ألا يرى شريكي حقيقة ما أشعر به في أعماقي." },
  { id:"av2", cat:"attachment", sub:"avo", type:"likert", mt:"info", w:0, v3:true,
    en:"I feel uncomfortable when a partner wants to be very emotionally close.",
    ar:"أشعر بعدم الارتياح عندما يرغب شريكي في قرب عاطفي شديد." },
  { id:"av3", cat:"attachment", sub:"avo", type:"likert", mt:"info", w:0, v3:true,
    en:"Keeping some emotional distance makes a relationship healthier.",
    ar:"الاحتفاظ ببعض المسافة العاطفية يجعل العلاقة أكثر صحة." },
  { id:"av4", cat:"attachment", sub:"avo", type:"likert", mt:"info", w:0, rv:true, pair:"av1", v3:true,
    en:"When something goes wrong, my partner is the first person I turn to.",
    ar:"عندما يسوء شيء ما، شريكي هو أول من ألجأ إليه." },
  { id:"av5", cat:"attachment", sub:"avo", type:"likert", mt:"info", w:0, rv:true, pair:"av3", v3:true,
    en:"I let my partner see the parts of me I am not proud of.",
    ar:"أسمح لشريكي أن يرى الجوانب التي لا أفتخر بها في نفسي." },
  { id:"av6", cat:"attachment", sub:"avo", type:"likert", mt:"info", w:0, v3:true,
    en:"Under stress I would rather handle things alone than lean on my partner.",
    ar:"تحت الضغط أفضّل أن أتدبر الأمور وحدي بدلًا من الاتكاء على شريكي." },
];

// ── B. Big Five top-up — 10 items (brings each domain from 1 to 3) ───────
// Negatively-keyed items carry BOTH trait "X-" (reversed by bigFive) and
// rv:true (reversed by norm, so consistency pairs read correctly).
const BIGFIVE_TOPUP = [
  { id:"p6",  cat:"personality", type:"likert", mt:"info", w:0, trait:"E+", v3:true,
    en:"In a group, I am usually one of the people doing the talking.",
    ar:"في المجموعة، عادةً ما أكون من الأشخاص الذين يتحدثون." },
  { id:"p7",  cat:"personality", type:"likert", mt:"info", w:0, trait:"E-", rv:true, pair:"p1", v3:true,
    en:"I tend to stay quiet and keep to myself around others.",
    ar:"أميل إلى الصمت والانطواء على نفسي بين الآخرين." },

  { id:"p8",  cat:"personality", type:"likert", mt:"info", w:0, trait:"C+", v3:true,
    en:"People can count on me to do what I said I would do.",
    ar:"يستطيع الناس الاعتماد عليّ لأفعل ما قلت إنني سأفعله." },
  { id:"p9",  cat:"personality", type:"likert", mt:"info", w:0, trait:"C-", rv:true, pair:"p2", v3:true,
    en:"I am often disorganized and leave things unfinished.",
    ar:"كثيرًا ما أكون غير منظم وأترك الأمور دون إنهاء." },

  { id:"p10", cat:"personality", type:"likert", mt:"info", w:0, trait:"N+", v3:true,
    en:"My mood drops easily and takes a while to lift.",
    ar:"يهبط مزاجي بسهولة ويحتاج وقتًا حتى يتحسن." },
  { id:"p11", cat:"personality", type:"likert", mt:"info", w:0, trait:"N-", rv:true, pair:"p3", v3:true,
    en:"I stay emotionally steady even when things get difficult.",
    ar:"أحافظ على توازني العاطفي حتى عندما تصعب الأمور." },

  { id:"p12", cat:"personality", type:"likert", mt:"info", w:0, trait:"O+", v3:true,
    en:"I am curious about many different subjects.",
    ar:"لديّ فضول تجاه مواضيع كثيرة ومختلفة." },
  { id:"p13", cat:"personality", type:"likert", mt:"info", w:0, trait:"O-", rv:true, pair:"p4", v3:true,
    en:"I have little patience for abstract or theoretical discussions.",
    ar:"لا أملك صبرًا كبيرًا على النقاشات النظرية أو الافتراضية." },

  { id:"p14", cat:"personality", type:"likert", mt:"info", w:0, trait:"A+", v3:true,
    en:"I assume the best about people's intentions until shown otherwise.",
    ar:"أفترض حسن النية في الناس حتى يثبت العكس." },
  { id:"p15", cat:"personality", type:"likert", mt:"info", w:0, trait:"A-", rv:true, pair:"p5", v3:true,
    en:"I can be blunt or cold with people when I am not in the mood.",
    ar:"قد أكون شخصًا قاسيًا أو باردًا مع الناس حين لا يكون مزاجي جيدًا." },
];

// ── C. Sexual & physical intimacy — 3 items (optional module) ────────────
// Sexual satisfaction is a top-5 relationship-specific predictor (Joel 2020).
// Gated: mod:"intimacy" — skipping the whole module costs no confidence.
const INTIMACY = [
  { id:"i1", cat:"intimacy", mod:"intimacy", type:"likert", mt:"tol", w:2, v3:true,
    en:"Physical affection is one of the main ways I feel connected to a partner.",
    ar:"التعبير الجسدي عن الحنان من أهم الطرق التي أشعر بها بالارتباط بشريكي." },
  { id:"i2", cat:"intimacy", mod:"intimacy", type:"likert", mt:"sim", w:2, v3:true,
    en:"I could talk openly and without embarrassment with my partner about our physical relationship.",
    ar:"أستطيع التحدث بصراحة ودون حرج مع شريكي عن علاقتنا الجسدية." },
  { id:"i3", cat:"intimacy", mod:"intimacy", type:"mcq", mt:"tol", w:2, v3:true,
    en:"If our needs for physical closeness turned out to be different, I would expect us to:",
    ar:"إذا اختلفت حاجتنا إلى القرب الجسدي، أتوقع أن:",
    opts:[
      { v:7, en:"Talk about it openly and find a middle ground", ar:"نتحدث بصراحة ونجد حلًا وسطًا" },
      { v:5, en:"Talk about it, though it would be awkward at first", ar:"نتحدث عنه رغم أن ذلك سيكون محرجًا في البداية" },
      { v:3, en:"Adjust quietly without making it a topic", ar:"نتأقلم بهدوء دون أن نجعله موضوعًا" },
      { v:1, en:"Avoid the subject — it is too private to discuss", ar:"نتجنب الموضوع — إنه أخص من أن يُناقش" } ] },
];

// ── D. Money — frequency of financial disagreement ───────────────────────
// Financial disagreement is the strongest disagreement-type predictor of
// divorce (Dew, Britt & Huston, 2012) — stronger than saving style, which m1
// already covers.
const MONEY_V3 = [
  { id:"m5", cat:"money", type:"mcq", mt:"sim", w:3, v3:true,
    en:"Realistically, how often do you expect money to cause an argument between you?",
    ar:"واقعيًا، كم تتوقع أن يسبب المال خلافًا بينكما؟",
    opts:[
      { v:7, en:"Almost never — we would see money the same way", ar:"شبه أبدًا — سنرى المال بالطريقة نفسها" },
      { v:5, en:"Occasionally, and we would settle it quickly", ar:"أحيانًا، وسنحسم الأمر بسرعة" },
      { v:3, en:"Fairly often — money is a sensitive subject for me", ar:"كثيرًا نوعًا ما — المال موضوع حساس بالنسبة لي" },
      { v:1, en:"Often, and those arguments would be hard to end", ar:"كثيرًا، وسيصعب إنهاء تلك الخلافات" } ] },
];

// ── E. Fairness & division of labour — 2 items ───────────────────────────
// Perceived fairness predicts satisfaction better than actual equality does.
const FAIRNESS = [
  { id:"fa1", cat:"fairness", type:"mcq", mt:"tol", w:2, v3:true,
    en:"How should housework and childcare be divided between a couple?",
    ar:"كيف ينبغي تقسيم أعمال المنزل ورعاية الأطفال بين الزوجين؟",
    opts:[
      { v:7, en:"Split roughly 50/50, whatever each person's job is", ar:"مناصفة تقريبًا مهما كانت وظيفة كل طرف" },
      { v:5, en:"Divided by who has the time, and it can shift", ar:"يُقسَّم حسب من لديه الوقت، ويمكن أن يتغير" },
      { v:3, en:"Mostly one person, with real help from the other", ar:"طرف واحد غالبًا مع مساعدة حقيقية من الآخر" },
      { v:1, en:"Along traditional roles — each has their own domain", ar:"تقليدي كما هو متعارف عليه في المجتمع — لكل طرف مجاله" } ] },
  { id:"fa2", cat:"fairness", type:"likert", mt:"sim", w:2, v3:true,
    en:"However we divide the work at home, it has to feel fair to both of us — not necessarily equal.",
    ar:"مهما قسّمنا العمل في المنزل، يجب أن يشعر كلانا بأنه عادل — وليس بالضرورة متساويًا." },
];

// ── Response-quality items — 4 impression management + 1 attention ───────
// BIDR-style. Never affect the compatibility score; they lower confidence only,
// and the total deduction is capped in scoring-v3.js.
export const QUALITY_ITEMS = [
  { id:"q1", cat:"quality", qc:"im", type:"likert", mt:"info", w:0, v3:true,
    en:"I have never been irritated by someone close to me.",
    ar:"لم أنزعج قط من شخص قريب مني." },
  { id:"q2", cat:"quality", qc:"im", type:"likert", mt:"info", w:0, v3:true,
    en:"I always admit it immediately when I am wrong.",
    ar:"أعترف دائمًا وفورًا عندما أكون مخطئًا." },
  { id:"q3", cat:"quality", qc:"im", type:"likert", mt:"info", w:0, v3:true,
    // "قط" is kept deliberately: impression-management items only work as an
    // absolute claim that almost nobody can truthfully endorse. Dropping it
    // turns this into a normal opinion item and the flag stops detecting.
    en:"I have never said anything about someone that I would not say to their face.",
    ar:"لم أتكلم قط عن أحد بشيء لا أستطيع قوله في حضوره." },
  { id:"q4", cat:"quality", qc:"im", type:"likert", mt:"info", w:0, v3:true,
    en:"I have never regretted something I said in anger.",
    ar:"لم أندم قط على شيء قلته في لحظة غضب." },
  // Worded by NUMBER, not position: the scale renders left-to-right in English
  // and right-to-left in Arabic, so "second from the top/left" would be wrong
  // in one of the two languages. The digit 6 is unambiguous in both.
  { id:"q5", cat:"quality", qc:"attn", type:"likert", mt:"info", w:0, exp:6, v3:true,
    en:"This is a check question — please choose 6.",
    ar:"هذا سؤال للتحقق من الانتباه — يرجى اختيار الرقم 6." },
];

// ── Assembly ─────────────────────────────────────────────────────────────

// ── Optional-module gate copy ────────────────────────────────────────────
// Shown before the intimacy block so the user opts in knowing what is shared.
//
// ⚠ PRECONDITION — this note is NOT true of the app as it stands today.
// A partner's profile is stored locally by rememberProfile() in app.js, and
// every stored profile gets a "Preview" button that calls renderSolo(), which
// prints the FULL answer list. So a partner can currently read every raw
// answer, not just the results.
//
// RESOLVED in step 3: app.js now tags any profile obtained through a share
// code (compare screen's "Load partner's results" and the preview screen's
// "open by test code") as `imported: true`, and showSolo() redacts the
// itemized per-question answer list for those before handing the summary to
// renderSolo(). A profile restored from your OWN downloaded .json file is
// NOT tagged — that is the documented self-recovery path (see README), not
// partner sharing. Aggregate results (leans, traits, confidence) still show
// for an imported profile — only the raw item-by-item list is hidden, which
// matches what `privacy` below promises.
export const MODULES = {
  intimacy: {
    ready: true,
    title: {
      en: "Include questions about physical intimacy?",
      ar: "هل تريد تضمين أسئلة عن العلاقة الجسدية؟" },
    privacy: {
      en: "Your partner never sees your individual answers — only the combined results. You can skip this section, and skipping it does not lower your confidence score.",
      ar: "لن يرى شريكك إجاباتك الفردية إطلاقًا — سيرى النتائج المجمّعة فقط. يمكنك تخطي هذا القسم، والتخطي لا يقلل نسبة الموثوقية." },
  },
};

/** Items added in v3 only (28 content items — quality items excluded). */
export const NEW_ITEMS_V3 = [
  ...ATTACHMENT,
  ...BIGFIVE_TOPUP,
  ...INTIMACY,
  ...MONEY_V3,
  ...FAIRNESS,
];

/** v2 bank with v3 metadata overrides applied. Original objects are not mutated. */
export const QUESTIONS_V2_PATCHED = QUESTIONS_V2.map(
  q => (OVERRIDES_V3[q.id] ? { ...q, ...OVERRIDES_V3[q.id] } : q)
);

/** Full v3 bank: 47 v2 items + 28 new + 5 quality = 80. */
export const QUESTIONS_V3 = [
  ...QUESTIONS_V2_PATCHED,
  ...NEW_ITEMS_V3,
  ...QUALITY_ITEMS,
];

/** Ids a v2 profile will never contain — used for graceful v2 × v3 comparison. */
export const V3_ONLY_IDS = new Set(
  QUESTIONS_V3.filter(q => q.v3).map(q => q.id)
);

/** Consistency pairs in the v3 bank (4 inherited from v2 + 8 added here). */
export const CONSISTENCY_PAIRS = QUESTIONS_V3
  .filter(q => q.pair)
  .map(q => [q.id, q.pair]);

/**
 * The bank to actually present, honouring the optional-module toggle.
 * @param {{intimacy?: boolean}} opts - modules the user opted into
 */
export function activeQuestions({ intimacy = false } = {}) {
  return QUESTIONS_V3.filter(q => !q.mod || (q.mod === "intimacy" && intimacy));
}

// Fail loudly on duplicate ids — a collision would silently overwrite answers.
{
  const seen = new Set();
  for (const q of QUESTIONS_V3) {
    if (seen.has(q.id)) throw new Error(`questions-v3: duplicate id "${q.id}"`);
    seen.add(q.id);
  }
  for (const [id, target] of CONSISTENCY_PAIRS) {
    if (!seen.has(target)) throw new Error(`questions-v3: "${id}" pairs with missing "${target}"`);
  }
}
