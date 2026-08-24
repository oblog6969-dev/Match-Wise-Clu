// MatchWise v8 — Insight Engine probe bank + open-text items.
// -----------------------------------------------------------------------------
// Phase 3 content. Same shape js/questions-v3.js / js/questions-v4.js use, so
// renderQuestion() in app.js needs no special case beyond the "text" type
// branch added in Phase 3 (see the q.type === "text" branch there).
//
// NONE of these ids ever appear in js/questions-v4.js's QUESTIONS_V4, so
// compareV4() (scoring-v4.js) and profileConfidenceV3() (scoring-v3.js) —
// which both iterate a fixed, known bank, never the raw answers object —
// structurally cannot see them. That is what makes "the AI never touches
// the score" true by construction rather than by convention. See
// "MatchWise Vault/v8 - AI Assessor Spec.md" §2 and js/ai-session-v8.js's
// header comment.
//
// ⚠ Arabic wording below is a first pass, same status as v3/v4's Arabic —
// flagged for native-speaker review before release, not machine-translated.
//
// Three `kind`s, matching the three things js/ai-session-v8.js can act on:
//   "contradiction" — targets one specific real CONSISTENCY_PAIRS entry
//                      (js/questions-v3.js). A third independent wording of
//                      the same construct, phrased in the SAME direction as
//                      that pair's primary (non-reverse-scored) item — see
//                      `resolvesPair` + `sameDirectionAs` below. This is
//                      what Phase 4's scoring-v8.js will need to judge
//                      whether an answer actually clarifies anything.
//   "vague"          — one per real user-facing category (all 17 minus
//                       "quality", which is the response-quality/attention-
//                       check category, not a topic — injecting a fake
//                       probe there would risk interfering with the app's
//                       own attention-check mechanism). A more concrete,
//                       scenario-style follow-up than the category's
//                       existing items, for when an answer sits in the
//                       middle of the scale.
//   "dealbreaker"     — deepens the app's three REAL flagged deal-breaker
//                        topics only (db:true in questions.js): children
//                        (f1, family), religion (v1, values), relocation
//                        (g1, growth). Nothing else is treated as a
//                        deal-breaker topic here, matching the app's own
//                        restraint — see Decisions Log.
// -----------------------------------------------------------------------------

// ── A. Contradiction probes — one per real consistency pair ────────────────
const CONTRADICTION_PROBES = [
  { id: "p_ctr_01", cat: "attachment", kind: "contradiction", type: "likert",
    resolvesPair: ["an3", "an6"], sameDirectionAs: "an3",
    en: "If my partner goes quiet for a day, I start imagining the worst.",
    ar: "إذا انقطع شريكي عن التواصل ليوم كامل، أبدأ بتخيّل أسوأ الاحتمالات." },
  { id: "p_ctr_02", cat: "attachment", kind: "contradiction", type: "likert",
    resolvesPair: ["av1", "av4"], sameDirectionAs: "av1",
    en: "Even in a serious relationship, I keep an emotional guard up.",
    ar: "حتى في علاقة جادة، أبقي حاجزًا عاطفيًا بيني وبين الطرف الآخر." },
  { id: "p_ctr_03", cat: "attachment", kind: "contradiction", type: "likert",
    resolvesPair: ["av3", "av5"], sameDirectionAs: "av3",
    en: "I think two people can love each other and still need a lot of separate space to feel okay.",
    ar: "أعتقد أن شخصين يمكن أن يحبّا بعضهما ومع ذلك يحتاجان مساحة منفصلة كبيرة ليشعرا بالارتياح." },
  { id: "p_ctr_04", cat: "personality", kind: "contradiction", type: "likert",
    resolvesPair: ["p1", "p7"], sameDirectionAs: "p1",
    en: "After a busy social day, I usually want more of that energy, not less.",
    ar: "بعد يوم اجتماعي مزدحم، عادة ما أريد المزيد من هذه الطاقة، لا أقل منها." },
  { id: "p_ctr_05", cat: "personality", kind: "contradiction", type: "likert",
    resolvesPair: ["p2", "p9"], sameDirectionAs: "p2",
    en: "People who know me well would trust me to follow through on a commitment without reminders.",
    ar: "من يعرفونني جيدًا يثقون بأنني سأنفّذ التزامًا ما دون الحاجة لتذكيري به." },
  { id: "p_ctr_06", cat: "personality", kind: "contradiction", type: "likert",
    resolvesPair: ["p3", "p11"], sameDirectionAs: "p3",
    en: "Small setbacks can put me in a bad mood for the rest of the day.",
    ar: "أبسط العقبات قد تُفسد مزاجي لبقية اليوم." },
  { id: "p_ctr_07", cat: "personality", kind: "contradiction", type: "likert",
    resolvesPair: ["p4", "p13"], sameDirectionAs: "p4",
    en: "I'd rather try something unfamiliar than stick with what I already know works.",
    ar: "أفضّل تجربة شيء غير مألوف على التمسّك بما أعرف أنه ناجح بالفعل." },
  { id: "p_ctr_08", cat: "personality", kind: "contradiction", type: "likert",
    resolvesPair: ["p5", "p15"], sameDirectionAs: "p5",
    en: "When someone disagrees with me, my first instinct is to find common ground, not to win.",
    ar: "عندما يختلف معي أحد، ردة فعلي الأولى هي البحث عن أرضية مشتركة، لا الفوز بالنقاش." },
  { id: "p_ctr_09", cat: "communication", kind: "contradiction", type: "likert",
    resolvesPair: ["c2", "c4"], sameDirectionAs: "c2",
    en: "When something is bothering me, I can usually put it into words the same day.",
    ar: "عندما يزعجني أمر ما، أستطيع عادة التعبير عنه بالكلام في نفس اليوم." },
  { id: "p_ctr_10", cat: "money", kind: "contradiction", type: "likert",
    resolvesPair: ["m2", "m4"], sameDirectionAs: "m2",
    en: "If a big purchase meant paying it off over the next year or two, I'd still say yes to something we really wanted.",
    ar: "إذا كان شراء شيء كبير يعني التقسيط على مدى سنة أو سنتين، سأوافق طالما أننا نريده فعلًا." },
  { id: "p_ctr_11", cat: "trust", kind: "contradiction", type: "likert",
    resolvesPair: ["t1", "t4"], sameDirectionAs: "t1",
    en: "I wouldn't think twice about handing my partner my phone, unlocked, right now.",
    ar: "لن أتردد لحظة في تسليم شريكي هاتفي، مفتوحًا، الآن." },
  { id: "p_ctr_12", cat: "growth", kind: "contradiction", type: "likert",
    resolvesPair: ["g4", "g6"], sameDirectionAs: "g4",
    en: "A last-minute change of plans is something I can usually roll with, not something that ruins my day.",
    ar: "التغيير المفاجئ في الخطط أمر أتعامل معه عادة بمرونة، لا شيء يُفسد يومي." },
];

// ── B. Vague probes — one per real user-facing category (+1 extra: conflict) ──
const VAGUE_PROBES = [
  { id: "p_vg_01", cat: "appreciation", kind: "vague", type: "likert",
    en: "I notice and say something when my partner does even small things well.",
    ar: "ألاحظ وأعبّر عن تقديري حين يفعل شريكي أمرًا جيدًا حتى لو كان صغيرًا." },
  { id: "p_vg_02", cat: "attachment", kind: "vague", type: "likert",
    en: "When I'm stressed, my instinct is to reach out to my partner rather than handle it alone.",
    ar: "عندما أكون متوترًا، ردة فعلي الأولى هي التواصل مع شريكي بدلًا من مواجهة الأمر وحدي." },
  { id: "p_vg_03", cat: "career", kind: "vague", type: "mcq",
    en: "If your career required moving away from family for a few years, you would:",
    ar: "إذا تطلّب عملك الانتقال بعيدًا عن العائلة لبضع سنوات، فإنك:",
    opts: [
      { v: 7, en: "Do it without much hesitation", ar: "تفعل ذلك دون تردد يُذكر" },
      { v: 5, en: "Do it, but it would be hard", ar: "تفعل ذلك، لكن الأمر سيكون صعبًا" },
      { v: 3, en: "Only if my partner came too", ar: "فقط إذا رافقك شريكك" },
      { v: 1, en: "Turn the opportunity down", ar: "ترفض الفرصة" },
    ] },
  { id: "p_vg_04", cat: "communication", kind: "vague", type: "likert",
    en: "When I'm annoyed with my partner, I say so soon rather than waiting for them to notice.",
    ar: "عندما أنزعج من شريكي، أقول ذلك سريعًا بدلًا من انتظاره ليلاحظ بنفسه." },
  { id: "p_vg_05", cat: "conflict", kind: "vague", type: "likert",
    en: "During an argument, I can usually stay calm enough to actually listen.",
    ar: "خلال الخلاف، أستطيع عادة البقاء هادئًا بما يكفي للاستماع فعليًا." },
  { id: "p_vg_06", cat: "conflict", kind: "vague", type: "mcq",
    en: "Right after a real argument with your partner, you usually:",
    ar: "مباشرة بعد خلاف حقيقي مع شريكك، عادة ما:",
    opts: [
      { v: 7, en: "Want to talk it through immediately", ar: "تريد التحدث عن الأمر فورًا" },
      { v: 5, en: "Need a little time alone before talking", ar: "تحتاج وقتًا قصيرًا بمفردك قبل الحديث" },
      { v: 3, en: "Act like nothing happened", ar: "تتصرف وكأن شيئًا لم يحدث" },
      { v: 1, en: "Bring it up again once you've both calmed down", ar: "تعيد فتح الموضوع لاحقًا بعد أن تهدآ" },
    ] },
  { id: "p_vg_07", cat: "emotional", kind: "vague", type: "likert",
    en: "I need my partner to reassure me, not just fix my problem, when I'm upset.",
    ar: "أحتاج من شريكي أن يطمئنني، لا أن يكتفي بحل المشكلة فقط، عندما أكون منزعجًا." },
  { id: "p_vg_08", cat: "fairness", kind: "vague", type: "likert",
    en: "In my past relationships, chores and responsibilities were split roughly evenly.",
    ar: "في علاقاتي السابقة، كانت الأعمال المنزلية والمسؤوليات مقسّمة بشكل متوازن تقريبًا." },
  { id: "p_vg_09", cat: "family", kind: "vague", type: "mcq",
    en: "How involved do you want grandparents to be in day-to-day parenting decisions?",
    ar: "ما مدى المشاركة التي تريدها للأجداد في قرارات تربية الأطفال اليومية؟",
    opts: [
      { v: 7, en: "Very involved", ar: "مشاركة كبيرة" },
      { v: 5, en: "Involved when we ask", ar: "مشاركة عند الطلب فقط" },
      { v: 3, en: "Mostly hands-off", ar: "غير متدخّلين إلى حد كبير" },
      { v: 1, en: "Not involved", ar: "بلا تدخّل نهائيًا" },
    ] },
  { id: "p_vg_10", cat: "future", kind: "vague", type: "likert",
    en: "I have a fairly specific picture of where I want to be in 5 years.",
    ar: "لديّ تصوّر واضح إلى حد ما لما أريد أن أكون عليه خلال 5 سنوات." },
  { id: "p_vg_11", cat: "growth", kind: "vague", type: "likert",
    en: "I'd rather grow and change alongside my partner than stay exactly who I am today.",
    ar: "أفضّل أن أنمو وأتغيّر مع شريكي على أن أبقى كما أنا تمامًا اليوم." },
  { id: "p_vg_12", cat: "intimacy", kind: "vague", type: "likert",
    en: "Everyday physical affection matters to how loved I feel, not just intimacy itself.",
    ar: "الحنان الجسدي اليومي مهم لشعوري بالحب، وليس فقط العلاقة الحميمة بحد ذاتها." },
  { id: "p_vg_13", cat: "lifestyle", kind: "vague", type: "mcq",
    en: "On a free weekend with no plans, you'd rather:",
    ar: "في عطلة نهاية أسبوع خالية من الخطط، تفضّل أن:",
    opts: [
      { v: 7, en: "Fill it with people and activity", ar: "تملأها بالناس والنشاطات" },
      { v: 5, en: "A mix of both", ar: "مزيج من الاثنين" },
      { v: 3, en: "Keep it quiet and unplanned", ar: "تبقيها هادئة بلا خطط" },
      { v: 1, en: "Spend it mostly alone, recharging", ar: "تقضيها بمفردك غالبًا لاستعادة طاقتك" },
    ] },
  { id: "p_vg_14", cat: "money", kind: "vague", type: "mcq",
    en: "If you and your partner disagreed on a big purchase, you would:",
    ar: "إذا اختلفت أنت وشريكك حول شراء كبير، فإنك:",
    opts: [
      { v: 7, en: "Talk until you both genuinely agree", ar: "تتحدثان حتى تتفقا فعليًا" },
      { v: 5, en: "Defer to whoever earns more", ar: "تتنازل لمن يكسب أكثر" },
      { v: 3, en: "Split it — everyone controls their own share", ar: "تقسّمانه — كل شخص يتحكم بحصته" },
      { v: 1, en: "One of you usually just decides", ar: "أحدكما عادة ما يقرر وحده" },
    ] },
  { id: "p_vg_15", cat: "personality", kind: "vague", type: "likert",
    en: "I'd rather be described as steady than exciting.",
    ar: "أفضّل أن يُوصف بأنني ثابت المزاج على أن أُوصف بأنني مثير للحماس." },
  { id: "p_vg_16", cat: "trust", kind: "vague", type: "likert",
    en: "If my partner came home late without texting, I would assume something reasonable happened, not worry.",
    ar: "لو تأخر شريكي في العودة دون رسالة، سأفترض أن هناك سببًا منطقيًا ولن أقلق." },
  { id: "p_vg_17", cat: "values", kind: "vague", type: "mcq",
    en: "If your partner's family traditions differed a lot from yours, you would:",
    ar: "إذا اختلفت تقاليد عائلة شريكك كثيرًا عن تقاليد عائلتك، فإنك:",
    opts: [
      { v: 7, en: "Blend both comfortably", ar: "تمزج بينهما براحة" },
      { v: 5, en: "Adopt theirs mostly", ar: "تتبنى تقاليدهم إلى حد كبير" },
      { v: 3, en: "Keep mine, respect theirs", ar: "تحافظ على تقاليدك مع احترام تقاليدهم" },
      { v: 1, en: "This would genuinely be hard for me", ar: "سيكون هذا صعبًا عليّ فعلًا" },
    ] },
];

// ── C. Dealbreaker probes — deepen the app's 3 REAL flagged topics only ────
const DEALBREAKER_PROBES = [
  // children (family) — f1 is db:true
  { id: "p_db_01", cat: "family", kind: "dealbreaker", type: "mcq",
    en: "If you and your partner wanted a different number of children, that would be:",
    ar: "إذا اختلفتما أنت وشريكك في عدد الأطفال الذي تريدانه، فإن ذلك سيكون:",
    opts: [
      { v: 7, en: "Something we could compromise on", ar: "أمرًا يمكن أن نتوافق عليه" },
      { v: 5, en: "A real problem, but workable", ar: "مشكلة حقيقية، لكنها قابلة للحل" },
      { v: 3, en: "Very hard to move past", ar: "صعب تجاوزه فعلًا" },
      { v: 1, en: "A dealbreaker for me", ar: "أمرًا لا أستطيع تجاوزه إطلاقًا" },
    ] },
  { id: "p_db_02", cat: "family", kind: "dealbreaker", type: "mcq",
    en: "How soon after marriage would you want to start trying for children?",
    ar: "بعد كم من الوقت من الزواج تريد البدء بمحاولة الإنجاب؟",
    opts: [
      { v: 7, en: "Right away", ar: "فورًا" },
      { v: 5, en: "Within 2–3 years", ar: "خلال سنتين إلى ثلاث سنوات" },
      { v: 3, en: "After 5+ years", ar: "بعد أكثر من 5 سنوات" },
      { v: 1, en: "Not sure yet", ar: "لست متأكدًا بعد" },
    ] },
  { id: "p_db_03", cat: "family", kind: "dealbreaker", type: "likert",
    en: "If my partner wanted to be a stay-at-home parent for a few years, I would fully support that.",
    ar: "لو أراد شريكي التفرغ لتربية الأطفال لبضع سنوات، سأدعم ذلك تمامًا." },
  { id: "p_db_04", cat: "family", kind: "dealbreaker", type: "likert",
    en: "I have a clear idea of the parenting style I want, and it matters a lot to me that my partner shares it.",
    ar: "لديّ تصوّر واضح لأسلوب التربية الذي أريده، ويهمني كثيرًا أن يشاركني شريكي فيه." },
  // religion (values) — v1 is db:true
  { id: "p_db_05", cat: "values", kind: "dealbreaker", type: "mcq",
    en: "If you have children, how important is it that they're raised in your specific religion?",
    ar: "إذا رُزقت بأطفال، ما مدى أهمية أن يُربّوا على دينك تحديدًا؟",
    opts: [
      { v: 7, en: "Essential — not negotiable", ar: "أساسي — غير قابل للتفاوض" },
      { v: 5, en: "Important, open to blending traditions", ar: "مهم، لكنني منفتح على مزج التقاليد" },
      { v: 3, en: "Not that important to me", ar: "ليس مهمًا لي كثيرًا" },
      { v: 1, en: "I'd prefer they choose for themselves", ar: "أفضّل أن يختاروا بأنفسهم" },
    ] },
  { id: "p_db_06", cat: "values", kind: "dealbreaker", type: "likert",
    en: "I would find it hard to be with someone who doesn't share my religious practice, even if we agree on everything else.",
    ar: "سيكون من الصعب عليّ الارتباط بشخص لا يشاركني ممارستي الدينية، حتى لو اتفقنا في كل شيء آخر." },
  { id: "p_db_07", cat: "values", kind: "dealbreaker", type: "mcq",
    en: "How would you feel about a partner from a different religious background than yours?",
    ar: "ما شعورك تجاه شريك من خلفية دينية مختلفة عن خلفيتك؟",
    opts: [
      { v: 7, en: "Completely fine", ar: "لا مشكلة إطلاقًا" },
      { v: 5, en: "Fine, with some adjustment", ar: "مقبول، مع بعض التكيّف" },
      { v: 3, en: "Difficult, but possible", ar: "صعب، لكنه ممكن" },
      { v: 1, en: "Not something I'd consider", ar: "ليس أمرًا سأفكر فيه" },
    ] },
  { id: "p_db_08", cat: "values", kind: "dealbreaker", type: "likert",
    en: "Religious holidays and traditions are something I want to keep at the center of our home life.",
    ar: "المناسبات والتقاليد الدينية أمر أريد أن يبقى في صميم حياة بيتنا." },
  // relocation (growth) — g1 is db:true
  { id: "p_db_09", cat: "growth", kind: "dealbreaker", type: "mcq",
    en: "If your partner's dream job required relocating far from your family, you would:",
    ar: "إذا تطلّبت وظيفة أحلام شريكك الانتقال بعيدًا عن عائلتك، فإنك:",
    opts: [
      { v: 7, en: "Go, without much hesitation", ar: "تنتقل دون تردد يُذكر" },
      { v: 5, en: "Go, but it would be hard", ar: "تنتقل، لكن الأمر سيكون صعبًا" },
      { v: 3, en: "Ask them to turn it down", ar: "تطلب منه رفض الفرصة" },
      { v: 1, en: "This would be a serious problem for us", ar: "سيكون هذا مشكلة جدية بيننا" },
    ] },
  { id: "p_db_10", cat: "growth", kind: "dealbreaker", type: "likert",
    en: "Living close to my extended family matters enough to me that I'd turn down a major opportunity elsewhere.",
    ar: "القرب من عائلتي الممتدة يهمني بما يكفي لأرفض فرصة كبيرة في مكان آخر." },
  { id: "p_db_11", cat: "growth", kind: "dealbreaker", type: "mcq",
    en: "How far would you be willing to live from your parents long-term?",
    ar: "إلى أي مسافة توافق على العيش بعيدًا عن والديك على المدى الطويل؟",
    opts: [
      { v: 7, en: "Anywhere — distance doesn't matter to me", ar: "أي مكان — المسافة لا تهمني" },
      { v: 5, en: "Same country is fine, doesn't have to be close", ar: "نفس البلد يكفي، لا يلزم أن يكون قريبًا" },
      { v: 3, en: "Same city", ar: "نفس المدينة" },
      { v: 1, en: "Very close — it matters a lot to me", ar: "قريب جدًا — هذا يهمني كثيرًا" },
    ] },
];

export const PROBE_ITEMS = [...CONTRADICTION_PROBES, ...VAGUE_PROBES, ...DEALBREAKER_PROBES];

// ── D. Open-text items ──────────────────────────────────────────────────────
// Always skippable (see the q.type === "text" branch in app.js's
// renderQuestion()/answerOptionalText()). maxLen matches the 500-char cap in
// spec §4.3 and the Supabase row size limit already enforced by
// supabase/schema.sql's answers_size check.
export const OPEN_TEXT_ITEMS = [
  { id: "ot_conflict_1", cat: "conflict", type: "text", maxLen: 500,
    en: "Think about the last real disagreement you had with a partner or someone close to you. What was it about, and how did it end?",
    ar: "فكّر في آخر خلاف حقيقي حصل بينك وبين شريك أو شخص مقرّب منك. ما كان سببه، وكيف انتهى؟" },
  { id: "ot_money_1", cat: "money", type: "text", maxLen: 500,
    en: "Describe a time money caused real tension between you and someone close to you.",
    ar: "صف موقفًا سبّب فيه المال توترًا حقيقيًا بينك وبين شخص مقرّب منك." },
  { id: "ot_family_1", cat: "family", type: "text", maxLen: 500,
    en: "What's one thing about how you were raised that you definitely want to repeat — or definitely don't — with your own family one day?",
    ar: "ما هو الشيء الذي تربّيت عليه وتريد بالتأكيد تكراره — أو عدم تكراره أبدًا — مع عائلتك يومًا ما؟" },
  { id: "ot_emotional_1", cat: "emotional", type: "text", maxLen: 500,
    en: "When you're going through something hard, what do you actually need from a partner — and what tends to backfire?",
    ar: "عندما تمر بشيء صعب، ما الذي تحتاجه فعلًا من شريكك — وما الذي عادة ما يأتي بنتيجة عكسية؟" },
];

export const AI_ITEMS_BY_ID = Object.fromEntries(
  [...PROBE_ITEMS, ...OPEN_TEXT_ITEMS].map(q => [q.id, q])
);
