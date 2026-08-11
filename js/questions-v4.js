// MatchWise v4 question bank — additive layer over v3.
// -----------------------------------------------------------------------------
// This file does NOT modify js/questions.js or js/questions-v3.js. It imports
// the v3 bank, applies scenario REWRITES over existing items, appends a few
// new items, and exposes buildBankV4(), which is what app.js asks for.
//
// Three changes land here. See Build-MatchWise-v4.md for the reasoning.
//
// 1. SITUATIONAL FORMAT.  47 scored items become scenarios with four
//    reactions instead of statements with a 1-7 agreement scale. SJTs are
//    measurably harder to fake than Likert self-report (see the spec, §0.1).
//    Personality (p*), attachment (an*/av*) and quality (q*) items stay
//    Likert on purpose: they are written in the style of validated
//    instruments and scenario-izing them would break that claim.
//
//    Every rewritten item KEEPS ITS ID and its mt/w/db/pair metadata, and
//    every option keeps a v: on the same 1-7 scale. That is what lets a v2
//    or v3 profile still be scored against a v4 one, item for item, with no
//    migration. Never renumber. The original wording is preserved in `was:`
//    so a later audit can check the construct did not drift.
//
// 2. GENDERED WING (INVISIBLE).  18 items are authored twice via `gv:{m,f}`.
//    Both versions ask the same underlying question from opposite chairs and
//    score identically. The user picks male/female once, on the first
//    screen, and must never be able to tell afterwards which items were
//    tailored: no header, no badge, no change in order, count or progress,
//    no marker in the report, and no UI string anywhere that mentions it.
//    A profile with no gender (every profile made before v4, and anyone who
//    chose "prefer not to say") gets `gv.n`, the neutral version.
//
// 3. WORLDVIEW AXES.  Options may carry `ax:{...}` loads on four axes:
//      trad  tradition & continuity   <-> openness & change
//      auth  family/collective decides <-> the couple decides alone
//      econ  security & obligation     <-> market & individual return
//      role  distinct gender roles     <-> interchangeable roles
//    No item exists solely to measure an axis; loads ride on ordinary
//    questions spread across money, family and lifestyle, so there is no
//    "values section" for the user to notice or game. Within one item, two
//    options often describe nearly the same behaviour in different
//    vocabulary — rights/choice/partnership vs duty/responsibility/what
//    people will say. The behaviour is neutral; the register is the signal.
//    Every option must be something a reasonable person would defend out
//    loud. If one option is obviously "correct", the item is broken.
//
// Arabic here is authored, not translated, but is still FLAGGED FOR
// NATIVE-SPEAKER REVIEW before release — same rule v3 shipped under.
// -----------------------------------------------------------------------------

// Plain import + separate alias: build-single.js strips whole `^import` lines
// and does not understand `as` aliases. Same trick questions-v3.js uses.
import { QUESTIONS_V3, CONSISTENCY_PAIRS } from "./questions-v3.js";
const BANK_V3 = QUESTIONS_V3;
const PAIRS_V3 = CONSISTENCY_PAIRS;

/** The four worldview axes. Order is the report's display order. */
export const AXES = ["trad", "auth", "econ", "role"];

/** Axes where a large gap between partners is a real problem (see spec §3.3). */
export const AXES_CRITICAL = ["role", "auth"];

/** Minimum loaded items answered before an axis may be reported at all. */
export const AXIS_MIN_ITEMS = 5;

// =============================================================================
// A. Scenario rewrites over existing items
// =============================================================================
// Shape: id -> { en, ar, opts }  or  { gv: { m:{...}, f:{...}, n:{...} } }
// A rewrite never changes cat / mt / w / db / pair / trait. Only presentation.
// `was` is documentation only and is never rendered.

export const REWRITES_V4 = {

// ── Communication ───────────────────────────────────────────────────────
c1: {
  was: "Something your partner did bothered you. What do you usually do?",
  en: "You asked your partner twice to handle something. It still is not done, and they have not mentioned it. That evening you:",
  ar: "طلبت من شريكك مرتين أن يتولى أمرًا ما. لم يُنجَز بعد، ولم يذكر الموضوع. في تلك الليلة:",
  opts: [
    { v:7, en:"Say it plainly that night — \"this is still bothering me\"", ar:"تقولها بوضوح في تلك الليلة: «ما زال هذا يضايقني»" },
    { v:5, en:"Wait for a calmer moment in the week, then raise it", ar:"تنتظر لحظة أهدأ خلال الأسبوع ثم تطرحه" },
    { v:3, en:"Mention it lightly, half joking, and watch the reaction", ar:"تذكره بخفة وبشيء من المزاح، وتراقب رد الفعل" },
    { v:1, en:"Do it yourself and say nothing about it", ar:"تنجزه بنفسك ولا تقول شيئًا" } ] },

c3: {
  was: "After a truly terrible day, I mostly want to:",
  gv: {
    n: { en:"You come home after the worst day you have had in months. Your partner asks what happened. You:",
         ar:"تعود إلى البيت بعد أسوأ يوم مرّ عليك منذ شهور. يسألك شريكك عمّا حدث. أنت:",
      opts: [
        { v:7, en:"Tell them the whole thing right away, in detail", ar:"تحكي القصة كاملة فورًا وبالتفصيل" },
        { v:5, en:"Give the short version now, the rest after you settle", ar:"تعطي النسخة المختصرة الآن، والباقي بعد أن تهدأ" },
        { v:3, en:"Say \"long day\" and ask them to talk about something else", ar:"تقول «يوم طويل» وتطلب الحديث عن شيء آخر" },
        { v:1, en:"Say you are fine and deal with it on your own", ar:"تقول إنك بخير وتتعامل مع الأمر وحدك" } ] },
    m: { en:"You come home after the worst day you have had in months — a problem at work you have not solved yet. Your wife can tell something is off and asks. You:",
         ar:"تعود إلى البيت بعد أسوأ يوم مرّ عليك منذ شهور — مشكلة في العمل لم تحلّها بعد. تلاحظ زوجتك أن شيئًا ما ليس على ما يرام وتسألك. أنت:",
      opts: [
        { v:7, en:"Tell her the whole thing right away, unfinished as it is", ar:"تحكي لها كل شيء فورًا رغم أن الأمر لم ينتهِ بعد" },
        { v:5, en:"Give the short version now, the rest once you have a plan", ar:"تعطيها النسخة المختصرة الآن، والباقي حين تصبح لديك خطة" },
        { v:3, en:"Say it is work and change the subject", ar:"تقول إنها أمور عمل وتغيّر الموضوع" },
        { v:1, en:"Say nothing — no reason to put it on her too", ar:"لا تقول شيئًا — لا داعي لتحميلها هذا أيضًا" } ] },
    f: { en:"You come home after the worst day you have had in months, and the house still needs sorting before anyone sleeps. Your husband asks what happened. You:",
         ar:"تعودين إلى البيت بعد أسوأ يوم مرّ عليكِ منذ شهور، والبيت ما زال يحتاج ترتيبًا قبل أن ينام أحد. يسألكِ زوجك عمّا حدث. أنتِ:",
      opts: [
        { v:7, en:"Sit down and tell him everything before anything else", ar:"تجلسين وتحكين له كل شيء قبل أي شيء آخر" },
        { v:5, en:"Say the short version, finish what is needed, then talk", ar:"تقولين النسخة المختصرة، تنهين المطلوب، ثم تتحدثين" },
        { v:3, en:"Say \"long day\" and keep moving through the tasks", ar:"تقولين «يوم طويل» وتواصلين إنجاز المهام" },
        { v:1, en:"Say you are fine and get through the evening alone", ar:"تقولين إنكِ بخير وتنهين المساء وحدكِ" } ] } } },

c2: {
  was: "I find it easy to talk about my feelings.",
  en: "Something has been weighing on you for a week. Your partner asks, gently, what is wrong. What comes out:",
  ar: "هناك أمر يثقل عليك منذ أسبوع. يسألك شريكك بلطف عمّا بك. ماذا تقول:",
  opts: [
    { v:7, en:"All of it — you say what you feel without editing", ar:"كل ما في داخلك — تقول ما تشعر به دون أن تنتقي كلماتك" },
    { v:5, en:"Most of it, once you find the words", ar:"معظمه، حين تجد الكلمات" },
    { v:3, en:"The facts of the situation, not what it did to you", ar:"وقائع الموقف، لا أثره عليك" },
    { v:1, en:"\"Nothing important\" — and you change the subject", ar:"«لا شيء مهم» — وتغيّر الموضوع" } ] },

// ── Conflict & repair ───────────────────────────────────────────────────
k3: {
  was: "I can apologize first, even when I think I'm mostly right.",
  en: "The argument ends with both of you hurt. Looking at it honestly, you were right about the substance and wrong about how you said it. You:",
  ar: "ينتهي الخلاف وكلاكما متألم. وبنظرة صادقة، كنت محقًا في الجوهر ومخطئًا في طريقة قولك. أنت:",
  opts: [
    { v:7, en:"Apologise first, for your part, without conditions", ar:"تعتذر أولًا عن نصيبك، دون شروط" },
    { v:5, en:"Apologise for how you said it, and restate the point", ar:"تعتذر عن طريقة قولك وتعيد طرح وجهة نظرك" },
    { v:3, en:"Wait to see whether they move first", ar:"تنتظر لترى إن كان الطرف الآخر سيبادر أولًا" },
    { v:1, en:"Hold your ground — the point still needs to stand", ar:"تتمسك بموقفك — ما زال الرأي بحاجة إلى أن يثبت" } ] },

k1: {
  was: "During a heated disagreement, I usually:",
  en: "An argument has escalated. Your voice is up, theirs is up, and you are both repeating yourselves. In that moment you:",
  ar: "احتدم الخلاف. ارتفع صوتك وصوت شريكك، وصرتما تكرران الكلام نفسه. في تلك اللحظة:",
  opts: [
    { v:7, en:"Lower your voice on purpose and keep the discussion going", ar:"تخفض صوتك عمدًا وتواصل النقاش" },
    { v:5, en:"Say \"give me twenty minutes\" and come back to it", ar:"تقول «أمهلني عشرين دقيقة» ثم تعود للموضوع" },
    { v:3, en:"Finish saying everything you feel, loudly, then cool off fast", ar:"تُخرج كل ما تشعر به بصوت عالٍ ثم تهدأ سريعًا" },
    { v:1, en:"Stop talking and leave the room", ar:"تتوقف عن الكلام وتغادر الغرفة" } ] },

k2: {
  was: "After a fight, who usually breaks the silence first?",
  gv: {
    n: { en:"Two days have passed since the argument. Neither of you has mentioned it. You are both in the same room, saying nothing. You:",
         ar:"مرّ يومان على الخلاف. لم يذكره أي منكما. تجلسان في الغرفة نفسها دون كلام. أنت:",
      opts: [
        { v:7, en:"Break it first — \"we need to finish this\"", ar:"تبادر أنت: «علينا أن نُنهي هذا»" },
        { v:5, en:"Break it first only if you were the one at fault", ar:"تبدأ أنت فقط إن كنت المخطئ" },
        { v:3, en:"Warm up gradually without naming the argument at all", ar:"تعودان تدريجيًا إلى طبيعتكما دون ذكر الخلاف إطلاقًا" },
        { v:1, en:"Wait — whoever started it should be the one to end it", ar:"تنتظر — من بدأ الخلاف هو من يُنهيه" } ] },
    m: { en:"Two days have passed since the argument. She has not brought it up and neither have you. You are both in the same room, saying nothing. You:",
         ar:"مرّ يومان على الخلاف. لم تطرحه هي ولم تطرحه أنت. تجلسان في الغرفة نفسها دون كلام. أنت:",
      opts: [
        { v:7, en:"Break it first — \"we need to finish this\"", ar:"تبادر أنت: «علينا أن نُنهي هذا»" },
        { v:5, en:"Break it first only if you were the one at fault", ar:"تبدأ أنت فقط إن كنت المخطئ" },
        { v:3, en:"Bring her something, and let that be the apology", ar:"تُحضر لها شيئًا، ويكون ذلك هو الاعتذار" },
        { v:1, en:"Wait — she knows what she said", ar:"تنتظر — هي تعرف ما قالته" } ] },
    f: { en:"Two days have passed since the argument. He has not brought it up and neither have you. You are both in the same room, saying nothing. You:",
         ar:"مرّ يومان على الخلاف. لم يطرحه هو ولم تطرحيه أنتِ. تجلسان في الغرفة نفسها دون كلام. أنتِ:",
      opts: [
        { v:7, en:"Break it first — \"we need to finish this\"", ar:"تبدئين أنتِ: «علينا أن نُنهي هذا»" },
        { v:5, en:"Break it first only if you were the one at fault", ar:"تبدئين أنتِ فقط إن كنتِ المخطئة" },
        { v:3, en:"Go back to normal without naming it, and let it pass", ar:"تعودين إلى الطبيعي دون ذكره وتتركينه يمرّ" },
        { v:1, en:"Wait — he knows what he said", ar:"تنتظرين — هو يعرف ما قاله" } ] } } },

// ── Money ───────────────────────────────────────────────────────────────
m1: {
  was: "You receive an unexpected bonus equal to a month's salary. Your first instinct:",
  en: "A bonus lands in your account — one month's salary, unplanned. Before you tell anyone, you have already decided to:",
  ar: "وصلت إلى حسابك مكافأة غير متوقعة تعادل راتب شهر. قبل أن تخبر أحدًا، تكون قد قررت أن:",
  opts: [
    { v:7, en:"Move all of it into savings the same day", ar:"تحوّلها كاملة إلى المدخرات في اليوم نفسه", ax:{ econ:-2 } },
    { v:5, en:"Save most of it and spend a small part on something nice", ar:"تدخر معظمها وتنفق جزءًا صغيرًا على شيء جميل", ax:{ econ:-1 } },
    { v:3, en:"Split it — half put away, half enjoyed now", ar:"تقسمها — تدخر نصفها وتستمتع بالنصف الآخر الآن" },
    { v:1, en:"Spend most of it — money is meant to be lived with", ar:"تنفق معظمها — فالمال وُجد أيضًا للاستمتاع بالحياة", ax:{ econ:+2 } } ] },

m3: {
  was: "In marriage, money should be:",
  gv: {
    n: { en:"Six months into marriage, you are setting up how money will work between you. What you propose:",
         ar:"بعد ستة أشهر من الزواج، تنظّمان طريقة إدارة المال بينكما. ما تقترحه:",
      opts: [
        { v:7, en:"One shared account — everything in, everything out", ar:"حساب مشترك واحد — كل شيء يدخل منه ويخرج", ax:{ role:+1 } },
        { v:5, en:"A shared account for the home, plus a personal amount each", ar:"حساب مشترك للبيت، مع مبلغ شخصي لكل طرف", ax:{ role:+1 } },
        { v:3, en:"Separate accounts, with each contributing a fixed share", ar:"حسابان منفصلان، ويساهم كل طرف بنسبة ثابتة", ax:{ econ:+1 } },
        { v:2, en:"Separate — each keeps what they earn and covers their own duties", ar:"حسابات منفصلة — يحتفظ كل طرف بدخله ويتولى التزاماته", ax:{ econ:+1, role:-1 } } ] },
    m: { en:"Six months into marriage, you are setting up how money will work. She earns her own salary. What you propose:",
         ar:"بعد ستة أشهر من الزواج، تنظّمان طريقة إدارة المال. لها راتبها الخاص. ما تقترحه:",
      opts: [
        { v:7, en:"One shared account — both salaries in, everything out of it", ar:"حساب مشترك واحد — الراتبان يدخلان فيه وكل شيء يخرج منه", ax:{ role:+1 } },
        { v:5, en:"You cover the home; her salary is hers, and she adds if she wants", ar:"أنت تغطي البيت، وراتبها لها، وتضيف إن أرادت", ax:{ role:-1 } },
        { v:3, en:"Both contribute a fixed share, the rest stays personal", ar:"يساهم كلاكما بنسبة ثابتة، والباقي شخصي", ax:{ econ:+1 } },
        { v:2, en:"Keep the accounts fully separate and settle costs as they come", ar:"تبقى الحسابات منفصلة تمامًا وتُسوّى المصاريف عند حدوثها", ax:{ econ:+1, role:-1 } } ] },
    f: { en:"Six months into marriage, you are setting up how money will work. You earn your own salary. What you propose:",
         ar:"بعد ستة أشهر من الزواج، تنظّمان طريقة إدارة المال. لكِ راتبك الخاص. ما تقترحينه:",
      opts: [
        { v:7, en:"One shared account — both salaries in, everything out of it", ar:"حساب مشترك واحد — الراتبان يدخلان فيه وكل شيء يخرج منه", ax:{ role:+1 } },
        { v:5, en:"He covers the home; your salary stays yours, and you add if you want", ar:"هو يغطي البيت، وراتبك يبقى لكِ، وتضيفين إن أردتِ", ax:{ role:-1 } },
        { v:3, en:"Both contribute a fixed share, the rest stays personal", ar:"يساهم كلاكما بنسبة ثابتة، والباقي شخصي", ax:{ econ:+1 } },
        { v:2, en:"Keep the accounts fully separate and settle costs as they come", ar:"تبقى الحسابات منفصلة تمامًا وتُسوّى المصاريف عند حدوثها", ax:{ econ:+1, role:-1 } } ] } } },

m5: {
  was: "Realistically, how often do you expect money to cause an argument between you?",
  en: "Picture the two of you three years in, sitting down over the monthly numbers. Realistically, how do those conversations go?",
  ar: "تخيّل حياتكما بعد ثلاث سنوات، وأنتما تراجعان مصروفات الشهر معًا. واقعيًا، كيف تسير هذه النقاشات؟",
  opts: [
    { v:7, en:"Quietly — you see money the same way and agree fast", ar:"بهدوء — تريان المال بالطريقة نفسها وتتفقان سريعًا" },
    { v:5, en:"A disagreement here and there, settled in the same sitting", ar:"خلاف بين حين وآخر، يُحسم في الجلسة نفسها" },
    { v:3, en:"Tense — money is a sensitive subject for you", ar:"بتوتر — المال موضوع حساس بينكما" },
    { v:1, en:"Badly, and the argument carries into the following days", ar:"بشكل سيئ، ويمتد الخلاف إلى الأيام التالية" } ] },

m2: {
  was: "I'm comfortable taking on debt if it improves our quality of life.",
  en: "The car you both want is affordable only on a three-year instalment plan. The monthly payment fits, but it uses up your margin. You:",
  ar: "السيارة التي تريدانها لا يمكنكما تحمل تكلفتها إلا بالتقسيط على ثلاث سنوات. القسط الشهري مناسب، لكنه يستنفد هامشكما المالي. أنت:",
  opts: [
    { v:7, en:"Take the plan — you can afford the payment and life is now", ar:"تأخذ التقسيط — القسط في متناولكما والحياة الآن", ax:{ econ:+2 } },
    { v:5, en:"Take it, but on the shortest term you can carry", ar:"تأخذه، لكن بأقصر مدة تستطيع تحملها", ax:{ econ:+1 } },
    { v:3, en:"Buy something cheaper outright instead", ar:"تشتري شيئًا أرخص نقدًا بدلًا من ذلك", ax:{ econ:-1 } },
    { v:1, en:"Wait and save until you can pay in full", ar:"تنتظر وتدخر حتى تدفع المبلغ كاملًا", ax:{ econ:-2 } } ] },

// ── Lifestyle ───────────────────────────────────────────────────────────
l3: {
  was: "A tidy, organized home matters a lot to me.",
  en: "You walk in and the place is a mess — dishes out, things not put away. Nobody is coming over. You:",
  ar: "تدخل فتجد المكان في فوضى — أطباق متروكة وأشياء لم تُعد إلى مكانها. ولا أحد قادم للزيارة. أنت:",
  opts: [
    { v:7, en:"Deal with all of it before you sit down", ar:"تعالج كل ذلك قبل أن تجلس" },
    { v:5, en:"Clear the worst of it, leave the rest for tomorrow", ar:"تزيل أسوأ ما فيه وتترك الباقي للغد" },
    { v:3, en:"Sit down first; you will get to it at some point", ar:"تجلس أولًا؛ ستصل إليه في وقت ما" },
    { v:1, en:"Barely notice it — it is not what a home is for", ar:"بالكاد تلاحظها — فالبيت ليس هدفه أن يبقى مرتبًا طوال الوقت" } ] },

l4: {
  was: "Health and fitness are a central part of my life.",
  en: "A month of long days has left no room for exercise or decent food. What you do about it:",
  ar: "شهر من الأيام الطويلة لم يترك مجالًا للرياضة ولا للأكل الجيد. ما تفعله حيال ذلك:",
  opts: [
    { v:7, en:"Rearrange the day around it — this is not negotiable for you", ar:"تعيد ترتيب يومك حوله — هذا غير قابل للتفاوض عندك" },
    { v:5, en:"Get back to it as soon as this stretch is over", ar:"تعود إليه فور انتهاء هذه الفترة" },
    { v:3, en:"Mean to, and mostly do not", ar:"تنوي ذلك، ولا تفعله غالبًا" },
    { v:1, en:"Leave it — there are more important things to spend the day on", ar:"تترك الأمر — فهناك أمور أهم تستحق وقتك خلال اليوم" } ] },

l1: {
  was: "My ideal weekend looks like:",
  gv: {
    n: { en:"Thursday evening, nothing is planned and the whole weekend is open. What you want it to look like:",
         ar:"مساء الخميس، لا توجد أي خطط والعطلة كلها أمامكما. كيف تود أن تقضياها؟",
      opts: [
        { v:7, en:"Out both days — people, an event, somewhere new", ar:"تقضيان اليومين خارج البيت — لقاءات وفعالية ومكان جديد", ax:{ trad:+1 } },
        { v:5, en:"One day out with others, one day just the two of you", ar:"يوم في الخارج مع آخرين ويوم لكما وحدكما" },
        { v:3, en:"Family visits, then home", ar:"زيارات عائلية ثم البيت", ax:{ trad:-1, auth:-1 } },
        { v:1, en:"Home, quiet, no plans at all", ar:"في البيت، بهدوء، بلا خطط إطلاقًا" } ] },
    m: { en:"Thursday evening, nothing is planned. Your friends have a majlis going and she has said nothing either way. You:",
         ar:"مساء الخميس، لا خطط لديكما. لأصدقائك مجلس، ولم تُبدِ هي رأيًا. أنت:",
      opts: [
        { v:7, en:"Go, and suggest you both do something out on Friday", ar:"تذهب، وتقترح أن تخرجا معًا يوم الجمعة", ax:{ trad:+1 } },
        { v:5, en:"Ask her first, then decide together", ar:"تسألها أولًا ثم تقرران معًا" },
        { v:3, en:"Skip it — the weekend is for family visits", ar:"تعتذر — العطلة للزيارات العائلية", ax:{ trad:-1, auth:-1 } },
        { v:1, en:"Skip it and stay home, quiet, no plans", ar:"تعتذر وتبقى في البيت بهدوء بلا خطط" } ] },
    f: { en:"Thursday evening, nothing is planned. Your friends are meeting and he has said nothing either way. You:",
         ar:"مساء الخميس، لا خطط لديكما. صديقاتك مجتمعات، ولم يُبدِ هو رأيًا. أنتِ:",
      opts: [
        { v:7, en:"Go, and suggest you both do something out on Friday", ar:"تذهبين، وتقترحين أن تخرجا معًا يوم الجمعة", ax:{ trad:+1 } },
        { v:5, en:"Ask him first, then decide together", ar:"تسألينه أولًا ثم تقرران معًا" },
        { v:3, en:"Skip it — the weekend is for family visits", ar:"تعتذرين — العطلة للزيارات العائلية", ax:{ trad:-1, auth:-1 } },
        { v:1, en:"Skip it and stay home, quiet, no plans", ar:"تعتذرين وتبقين في البيت بهدوء بلا خطط" } ] } } },

// ── Family & children ───────────────────────────────────────────────────
f1: {
  was: "Do you want children?",
  gv: {
    n: { en:"A year from now the subject of children comes up seriously for the first time. Where you stand:",
         ar:"بعد سنة من الآن يُطرح موضوع الأطفال بجدية لأول مرة. ما موقفك؟",
      opts: [
        { v:7, en:"Ready — you want this and you want it soon", ar:"مستعد — تريد ذلك وتريده قريبًا" },
        { v:5, en:"Yes, though later than sooner", ar:"نعم، لكن لاحقًا لا قريبًا" },
        { v:4, en:"You honestly do not know yet", ar:"بصدق، لا تعرف بعد" },
        { v:2, en:"Probably not — it is not how you picture your life", ar:"على الأرجح لا — ليست هكذا تتخيل حياتك" },
        { v:1, en:"No, and that will not change", ar:"لا، ولن يتغير ذلك" } ] },
    m: { en:"A year from now the subject of children comes up seriously for the first time — hers, and both families'. Where you stand:",
         ar:"بعد سنة من الآن يُطرح موضوع الأطفال بجدية لأول مرة — منها ومن العائلتين. ما موقفك؟",
      opts: [
        { v:7, en:"Ready — you want this and you want it soon", ar:"مستعد — تريد ذلك وتريده قريبًا" },
        { v:5, en:"Yes, once the income is where you want it", ar:"نعم، حين يصل الدخل إلى ما تريده" },
        { v:4, en:"You honestly do not know yet", ar:"بصدق، لا تعرف بعد" },
        { v:2, en:"Probably not — it is not how you picture your life", ar:"على الأرجح لا — ليست هكذا تتخيل حياتك" },
        { v:1, en:"No, and that will not change", ar:"لا، ولن يتغير ذلك" } ] },
    f: { en:"A year from now the subject of children comes up seriously for the first time — his, and both families'. Where you stand:",
         ar:"بعد سنة من الآن يُطرح موضوع الأطفال بجدية لأول مرة — منه ومن العائلتين. ما موقفكِ؟",
      opts: [
        { v:7, en:"Ready — you want this and you want it soon", ar:"مستعدة — تريدين ذلك وتريدينه قريبًا" },
        { v:5, en:"Yes, once you are further along in your own plans", ar:"نعم، حين تتقدمين أكثر في خططك الخاصة" },
        { v:4, en:"You honestly do not know yet", ar:"بصدق، لا تعرفين بعد" },
        { v:2, en:"Probably not — it is not how you picture your life", ar:"على الأرجح لا — ليست هكذا تتخيلين حياتك" },
        { v:1, en:"No, and that will not change", ar:"لا، ولن يتغير ذلك" } ] } } },

f2: {
  was: "How involved should parents and in-laws be in a couple's life?",
  gv: {
    n: { en:"You and your partner have made a decision about where to live. Before you announce it, a parent calls to ask what you decided. You:",
         ar:"اتفقتما على قرار بشأن مكان السكن. قبل أن تعلناه، يتصل أحد الوالدين ليسأل عمّا قررتما. أنت:",
      opts: [
        { v:7, en:"Tell them, and genuinely want their opinion before you finalize", ar:"تخبره، وتريد رأيه فعلًا قبل أن تحسم", ax:{ auth:-2 } },
        { v:5, en:"Tell them the decision and listen, but it is already made", ar:"تخبره بالقرار وتستمع، لكنه قرار محسوم", ax:{ auth:-1 } },
        { v:3, en:"Give a general answer until the two of you are ready to say it", ar:"تعطي إجابة عامة حتى تكونا مستعدين للإعلان", ax:{ auth:+1 } },
        { v:1, en:"Say it is settled between you two — that is where it stays", ar:"تقول إن القرار محسوم بينكما — ويبقى بينكما", ax:{ auth:+2 } } ] },
    m: { en:"You and your wife have decided where you will live. Before you announce it, your mother calls to ask what you decided. You:",
         ar:"اتفقت وزوجتك على مكان السكن. قبل أن تعلنا القرار، تتصل والدتك لتسأل عمّا قررتما. أنت:",
      opts: [
        { v:7, en:"Tell her, and genuinely want her opinion before you finalize", ar:"تخبرها، وتريد رأيها فعلًا قبل أن تحسم", ax:{ auth:-2 } },
        { v:5, en:"Tell her the decision and listen, but it is already made", ar:"تخبرها بالقرار وتستمع، لكنه قرار محسوم", ax:{ auth:-1 } },
        { v:3, en:"Give a general answer until you and your wife announce it", ar:"تعطي إجابة عامة حتى تعلنا القرار معًا", ax:{ auth:+1 } },
        { v:1, en:"Say it is settled between you and your wife", ar:"تقول إنه أمر محسوم بينك وبين زوجتك", ax:{ auth:+2 } } ] },
    f: { en:"You and your husband have decided where you will live. Before you announce it, his mother calls to ask what you decided. You:",
         ar:"اتفقتِ وزوجك على مكان السكن. قبل أن تعلنا القرار، تتصل والدته لتسأل عمّا قررتما. أنتِ:",
      opts: [
        { v:7, en:"Tell her, and genuinely want her opinion before you finalize", ar:"تخبرينها، وتريدين رأيها فعلًا قبل أن تُحسم", ax:{ auth:-2 } },
        { v:5, en:"Tell her the decision and listen, but it is already made", ar:"تخبرينها بالقرار وتستمعين، لكنه قرار محسوم", ax:{ auth:-1 } },
        { v:3, en:"Say your husband will call her back about it", ar:"تقولين إن زوجك سيعاود الاتصال بها بشأنه", ax:{ auth:+1 } },
        { v:1, en:"Say it is settled between you and your husband", ar:"تقولين إنه أمر محسوم بينكِ وبين زوجك", ax:{ auth:+2 } } ] } } },

f3: {
  was: "Family gatherings and duties are a priority, even when inconvenient.",
  gv: {
    n: { en:"There is a family gathering on the one free evening you have had in three weeks, and you are exhausted. You:",
         ar:"هناك تجمّع عائلي في الليلة الوحيدة الفارغة لديك منذ ثلاثة أسابيع، وأنت مُرهق. أنت:",
      opts: [
        { v:7, en:"Go, without treating it as a question", ar:"تذهب، دون أن تجعل الأمر محل نقاش", ax:{ trad:-2, auth:-1 } },
        { v:5, en:"Go, stay an hour, and leave early", ar:"تذهب وتبقى ساعة ثم تنصرف مبكرًا", ax:{ trad:-1 } },
        { v:3, en:"Apologise and go next time instead", ar:"تعتذر وتذهب في المرة القادمة بدلًا من ذلك", ax:{ trad:+1 } },
        { v:1, en:"Skip it — you need the evening more", ar:"لا تذهب — فأنت أحوج إلى هذه الأمسية", ax:{ trad:+2, auth:+1 } } ] },
    m: { en:"There is a gathering at your family's house on the one free evening you have had in three weeks. Your wife is tired and would rather not. You:",
         ar:"هناك تجمّع في بيت أهلك في الليلة الوحيدة الفارغة لديكما منذ ثلاثة أسابيع. زوجتك متعبة وتفضّل عدم الذهاب. أنت:",
      opts: [
        { v:7, en:"Both go — it is not really optional", ar:"تذهبان معًا — الأمر ليس اختياريًا فعلًا", ax:{ trad:-2, auth:-1 } },
        { v:5, en:"Both go, stay an hour, and leave early", ar:"تذهبان وتبقيان ساعة ثم تنصرفان مبكرًا", ax:{ trad:-1 } },
        { v:3, en:"Go alone and tell them she was not well", ar:"تذهب وحدك وتقول إنها ليست بخير", ax:{ trad:+1 } },
        { v:1, en:"Neither of you goes — you both need the evening", ar:"لا يذهب أي منكما — كلاكما يحتاج المساء", ax:{ trad:+2, auth:+1 } } ] },
    f: { en:"There is a gathering at his family's house on the one free evening you have had in three weeks, and you are exhausted. You:",
         ar:"هناك تجمّع في بيت أهله في الليلة الوحيدة الفارغة لديكِ منذ ثلاثة أسابيع، وأنتِ مُرهقة. أنتِ:",
      opts: [
        { v:7, en:"Go, without treating it as a question", ar:"تذهبين، دون أن تجعلي الأمر محل نقاش", ax:{ trad:-2, auth:-1 } },
        { v:5, en:"Go, stay an hour, and leave early", ar:"تذهبين وتبقين ساعة ثم تنصرفين مبكرًا", ax:{ trad:-1 } },
        { v:3, en:"Ask him to go alone this time", ar:"تطلبين منه أن يذهب وحده هذه المرة", ax:{ trad:+1 } },
        { v:1, en:"Skip it — you need the evening more", ar:"لا تذهبين — فأنتِ أحوج إلى هذه الأمسية", ax:{ trad:+2, auth:+1 } } ] } } },

// ── Values & religion ───────────────────────────────────────────────────
v1: {
  was: "Religion in my daily life is:",
  en: "A week where everything goes wrong — work, family, no time. By the end of it, your religious practice has:",
  ar: "تمرّ عليك فترة أسبوع يسير فيها كل شيء على نحو سيئ — عمل وعائلة ولا وقت. في نهايتها، تكون ممارستك الدينية قد:",
  opts: [
    { v:7, en:"Stayed exactly as it is — that is the part that does not move", ar:"بقيت كما هي تمامًا — هذا هو الجزء الذي لا يتزحزح", ax:{ trad:-1 } },
    { v:5, en:"Slipped in places, and you notice and return to it", ar:"تراجعت في مواضع، وتلاحظ ذلك وتعود إليها" },
    { v:3, en:"Come down to the occasions and the habits you grew up with", ar:"اقتصرت على المناسبات والعادات التي نشأت عليها" },
    { v:1, en:"Not really been a factor either way", ar:"لم تكن عاملًا في الأمر أصلًا", ax:{ trad:+1 } } ] },

v2: {
  was: "I expect my partner to share my level of religious practice.",
  en: "A year in, it is clear your partner practises noticeably more, or noticeably less, than you do. You:",
  ar: "بعد سنة، يتضح أن شريكك أكثر التزامًا منك بوضوح، أو أقل بوضوح. أنت:",
  opts: [
    { v:7, en:"Expect it to converge — this is not a difference you can live beside", ar:"تتوقع أن يتقارب مستوى التزامكما — فهذا ليس فرقًا يمكنك التعايش معه", ax:{ trad:-1 } },
    { v:5, en:"Raise it, and hope you meet somewhere in the middle", ar:"تطرح الأمر، وتأمل أن تلتقيا في منتصف الطريق" },
    { v:3, en:"Leave it alone as long as the home runs on the same rhythm", ar:"تترك الأمر ما دام البيت يسير على الإيقاع نفسه" },
    { v:1, en:"Leave it alone entirely — that part is between them and God", ar:"تترك الأمر تمامًا — هذا الجانب بينه وبين الله", ax:{ trad:+1 } } ] },

v3: {
  was: "Honesty matters more to me than sparing someone's feelings.",
  en: "Your partner asks your opinion on something they are clearly proud of, and you do not think much of it. You:",
  ar: "يسألك شريكك عن رأيك في شيء يفتخر به بوضوح، وأنت لا ترى فيه الكثير. أنت:",
  opts: [
    { v:7, en:"Say what you actually think, plainly", ar:"تقول ما تراه فعلًا، بوضوح" },
    { v:5, en:"Say the honest version, wrapped carefully", ar:"تقول النسخة الصادقة، مغلّفة بعناية" },
    { v:3, en:"Praise the effort and keep the rest to yourself", ar:"تثني على الجهد وتبقي الباقي لنفسك" },
    { v:1, en:"Say you like it — there is nothing to gain from the truth here", ar:"تقول إنه أعجبك — لا فائدة تُرجى من الصدق هنا" } ] },

// ── Career & ambition ───────────────────────────────────────────────────
r1: {
  was: "My career is a core part of who I am.",
  en: "Someone you have just met asks what you do. You notice how you answer:",
  ar: "يسألك شخص قابلته للتو عن عملك. تلاحظ كيف تجيب:",
  opts: [
    { v:7, en:"With your work — it is the first true thing about you", ar:"تبدأ بعملك — فهو أول شيء حقيقي تعرّف به نفسك" },
    { v:5, en:"With your work, then quickly move past it", ar:"بعملك، ثم تتجاوزه سريعًا" },
    { v:3, en:"With your work, and it feels like the least interesting part", ar:"بعملك، وتشعر أنه أقل الأجزاء إثارة للاهتمام" },
    { v:1, en:"You would rather be asked almost anything else", ar:"تفضّل أن تُسأل عن أي شيء آخر تقريبًا" } ] },

r2: {
  was: "A big opportunity at work would demand very long hours for a year. You:",
  en: "You are offered a role that would put you ahead by years. For twelve months it means late nights and working weekends. You:",
  ar: "عُرض عليك منصب يقدّمك سنوات إلى الأمام. لمدة اثني عشر شهرًا يعني سهرًا وعملًا في العطلات. أنت:",
  opts: [
    { v:7, en:"Accept — a year is a short price for where it leads", ar:"تقبل — سنة ثمن بسيط مقابل ما قد توصلك إليه", ax:{ econ:+2 } },
    { v:5, en:"Accept, after you two agree on limits you will hold", ar:"تقبل بعد أن تتفقا على حدود تلتزم بها" },
    { v:3, en:"Ask to take it in a lighter form, and accept less of it", ar:"تطلب تولّي الدور بصيغة أخف، وتقبل بمسؤوليات أقل", ax:{ econ:-1 } },
    { v:1, en:"Decline — a year of that costs more than it pays", ar:"ترفض — سنة كهذه تكلّف أكثر مما تعطي", ax:{ econ:-2 } } ] },

r3: {
  was: "I would slow down my career for our family when needed.",
  gv: {
    n: { en:"Family life needs more from one of you for the next two years, and it will cost that person professionally. You:",
         ar:"تحتاج الحياة العائلية إلى وقت أكبر من أحدكما خلال السنتين القادمتين، وسيكون لذلك أثر مهني على ذلك الطرف. أنت:",
      opts: [
        { v:7, en:"Step back yourself — the work will still be there later", ar:"تتراجع أنت — العمل سيبقى موجودًا لاحقًا" },
        { v:5, en:"Take turns — one of you now, the other after", ar:"تتناوبان — أحدكما الآن والآخر بعده", ax:{ role:+2 } },
        { v:3, en:"Buy the time instead — help at home, and neither steps back", ar:"تستعينان بمساعدة منزلية لتوفيرا الوقت، فلا يضطر أي منكما إلى التراجع مهنيًا" },
        { v:1, en:"Whoever earns less should be the one to step back", ar:"من دخله أقل هو من يتراجع", ax:{ econ:+1 } } ] },
    m: { en:"Family life will need more from one of you for the next two years, and it will cost that person professionally. You:",
         ar:"ستحتاج الحياة العائلية إلى وقت أكبر من أحدكما خلال السنتين القادمتين، وسيكون لذلك أثر مهني على ذلك الطرف. أنت:",
      opts: [
        { v:7, en:"Cut your own hours back and carry more at home", ar:"تقلّص ساعات عملك وتتحمل أكثر في البيت", ax:{ role:+2 } },
        { v:5, en:"Take turns — you first, then her", ar:"تتناوبان — أنت أولًا ثم هي", ax:{ role:+1 } },
        { v:3, en:"Bring in help at home so neither of you steps back", ar:"تُحضران مساعدة في البيت كي لا يتراجع أي منكما" },
        { v:1, en:"She steps back — your income is what the house runs on", ar:"هي تتراجع — دخلك هو ما يقوم عليه البيت", ax:{ role:-2 } } ] },
    f: { en:"Family life will need more from one of you for the next two years, and it will cost that person professionally. You:",
         ar:"ستحتاج الحياة العائلية إلى وقت أكبر من أحدكما خلال السنتين القادمتين، وسيكون لذلك أثر مهني على ذلك الطرف. أنتِ:",
      opts: [
        { v:7, en:"Ask him to cut back first — it is your turn to build", ar:"تطلبين منه أن يقلّص ساعات عمله أولًا — فقد حان دوركِ للتقدم مهنيًا", ax:{ role:+2 } },
        { v:5, en:"Take turns — you first, then him", ar:"تتناوبان — أنتِ أولًا ثم هو", ax:{ role:+1 } },
        { v:3, en:"Bring in help at home so neither of you steps back", ar:"تُحضران مساعدة في البيت كي لا يتراجع أي منكما" },
        { v:1, en:"You step back — this stage matters more than the job", ar:"تتراجعين أنتِ — هذه المرحلة أهم من الوظيفة", ax:{ role:-2 } } ] } } },

// ── Trust & boundaries ──────────────────────────────────────────────────
t1: {
  was: "My partner should be able to look at my phone at any time.",
  gv: {
    n: { en:"Your phone is on the table. Your partner picks it up to check something and it is unlocked. You:",
         ar:"هاتفك على الطاولة. يلتقطه شريكك ليتحقق من شيء والهاتف غير مقفل. أنت:",
      opts: [
        { v:7, en:"Nothing — there is nothing on it you would hide", ar:"لا شيء — ليس فيه ما تخفيه" },
        { v:5, en:"Fine with it, though you would rather they asked first", ar:"لا مانع، لكنك تفضّل أن يسأل أولًا" },
        { v:3, en:"Feel a small pull to take it back, and let it go", ar:"تشعر برغبة خفيفة في استرجاعه، ثم تتجاهلها" },
        { v:1, en:"Ask for it back — a phone is personal, not a secret", ar:"تطلب استرجاعه — الهاتف شخصي وليس سرًا" } ] },
    m: { en:"Your phone is on the majlis table. Your wife picks it up to check something and it is unlocked. You:",
         ar:"هاتفك على طاولة المجلس. تلتقطه زوجتك لتتحقق من شيء والهاتف غير مقفل. أنت:",
      opts: [
        { v:7, en:"Nothing — there is nothing on it you would hide", ar:"لا شيء — ليس فيه ما تخفيه" },
        { v:5, en:"Fine with it, though you would rather she asked first", ar:"لا مانع، لكنك تفضّل أن تسأل أولًا" },
        { v:3, en:"Feel a small pull to take it back, and let it go", ar:"تشعر برغبة خفيفة في استرجاعه، ثم تتجاهلها" },
        { v:1, en:"Ask for it back — a phone is personal, not a secret", ar:"تطلب استرجاعه — الهاتف شخصي وليس سرًا" } ] },
    f: { en:"Your phone is on the table. Your husband picks it up to check something and it is unlocked. You:",
         ar:"هاتفك على الطاولة. يلتقطه زوجك ليتحقق من شيء والهاتف غير مقفل. أنتِ:",
      opts: [
        { v:7, en:"Nothing — there is nothing on it you would hide", ar:"لا شيء — ليس فيه ما تخفينه" },
        { v:5, en:"Fine with it, though you would rather he asked first", ar:"لا مانع، لكنك تفضّلين أن يسأل أولًا" },
        { v:3, en:"Feel a small pull to take it back, and let it go", ar:"تشعرين برغبة خفيفة في استرجاعه، ثم تتجاهلينها" },
        { v:1, en:"Ask for it back — a phone is personal, not a secret", ar:"تطلبين استرجاعه — الهاتف شخصي وليس سرًا" } ] } } },

t2: {
  was: "Your partner has a close friend of the opposite sex. You feel:",
  gv: {
    n: { en:"Your partner mentions a colleague of the opposite sex they talk to often, and clearly enjoy talking to. You:",
         ar:"يذكر شريكك زميلًا من الجنس الآخر يتحدث معه كثيرًا ويستمتع بالحديث معه بوضوح. أنت:",
      opts: [
        { v:7, en:"Think nothing of it — you would expect the same freedom", ar:"لا تعير الأمر اهتمامًا — وتتوقع الحرية نفسها لنفسك", ax:{ role:+1 } },
        { v:5, en:"Fine, as long as you both know where the line is", ar:"لا مانع، ما دام كلاكما يعرف أين الحد" },
        { v:3, en:"Say nothing, and find yourself thinking about it later", ar:"لا تقول شيئًا، ثم تجد نفسك تفكر في الأمر لاحقًا" },
        { v:1, en:"Say plainly that it does not sit right with you", ar:"تقول بوضوح إن الأمر لا يريحك", ax:{ role:-1 } } ] },
    m: { en:"Your wife mentions a male colleague she talks to often, and clearly enjoys talking to. You:",
         ar:"تذكر زوجتك زميلًا في العمل تتحدث معه كثيرًا وتستمتع بالحديث معه بوضوح. أنت:",
      opts: [
        { v:7, en:"Think nothing of it — she is entitled to her working life", ar:"لا تعير الأمر اهتمامًا — من حقها حياتها المهنية", ax:{ role:+1 } },
        { v:5, en:"Fine, as long as you both know where the line is", ar:"لا مانع، ما دام كلاكما يعرف أين الحد" },
        { v:3, en:"Say nothing, and find yourself thinking about it later", ar:"لا تقول شيئًا، ثم تجد نفسك تفكر في الأمر لاحقًا" },
        { v:1, en:"Say plainly that it does not sit right with you", ar:"تقول بوضوح إن الأمر لا يريحك", ax:{ role:-1 } } ] },
    f: { en:"Your husband mentions a female colleague he talks to often, and clearly enjoys talking to. You:",
         ar:"يذكر زوجك زميلة في العمل يتحدث معها كثيرًا ويستمتع بالحديث معها بوضوح. أنتِ:",
      opts: [
        { v:7, en:"Think nothing of it — you would expect the same freedom", ar:"لا تعيرين الأمر اهتمامًا — وتتوقعين الحرية نفسها لنفسك", ax:{ role:+1 } },
        { v:5, en:"Fine, as long as you both know where the line is", ar:"لا مانع، ما دام كلاكما يعرف أين الحد" },
        { v:3, en:"Say nothing, and find yourself thinking about it later", ar:"لا تقولين شيئًا، ثم تجدين نفسك تفكرين في الأمر لاحقًا" },
        { v:1, en:"Say plainly that it does not sit right with you", ar:"تقولين بوضوح إن الأمر لا يريحك", ax:{ role:-1 } } ] } } },

t3: {
  was: "Each partner needs some private time and personal space.",
  en: "A free afternoon appears. Your partner says they are going to spend it on their own, doing their own thing. You:",
  ar: "تتاح لكما فترة فراغ بعد الظهر. يقول شريكك إنه سيقضيها وحده يفعل ما يحلو له. أنت:",
  opts: [
    { v:7, en:"Are glad for them, and plan your own afternoon", ar:"تسعد له، وتخطط أنت أيضًا لما ستفعله في فترة بعد الظهر" },
    { v:5, en:"Fine with it, and would want it back sometimes too", ar:"لا مانع، وستريد المثل أحيانًا أيضًا" },
    { v:3, en:"Say fine, and wonder why they did not include you", ar:"تقول لا بأس، وتتساءل لماذا لم يشملك" },
    { v:1, en:"Say you would rather spend a free afternoon together", ar:"تقول إنك تفضّل أن تقضيا وقت الفراغ معًا" } ] },

// ── Emotional needs ─────────────────────────────────────────────────────
e2: {
  was: "I need frequent verbal reassurance in a relationship.",
  en: "Things between you are good, but nothing has been said about it in weeks. How that sits with you:",
  ar: "الأمور بينكما جيدة، لكن لم يُعبَّر عنها بالكلام منذ أسابيع. كيف تشعر حيال ذلك؟",
  opts: [
    { v:7, en:"Badly — you need it said, and you start to doubt without it", ar:"بشكل سيئ — تحتاج إلى سماعها صراحة، ومن دون ذلك تبدأ بالشك" },
    { v:5, en:"You notice its absence and ask for it", ar:"تلاحظ غيابها وتطلبها" },
    { v:3, en:"You notice, and it does not really trouble you", ar:"تلاحظ، ولا يزعجك الأمر فعلًا" },
    { v:1, en:"Fine — what they do says it better than words would", ar:"لا بأس — أفعاله تعبّر عنها أفضل من الكلمات" } ] },

e3: {
  was: "When my partner is upset, I usually know how to comfort them.",
  en: "Your partner is clearly upset and will not say why. Fifteen minutes pass. What you end up doing:",
  ar: "شريكك منزعج بوضوح ولا يقول السبب. تمر خمس عشرة دقيقة. ما ينتهي بك الأمر إلى فعله:",
  opts: [
    { v:7, en:"The thing that works for them — you know which it is", ar:"تفعل ما تعرف أنه يناسبه — فأنت تعرف ما هو" },
    { v:5, en:"Ask what would help, and do that", ar:"تسأل عمّا سيساعد، وتفعله" },
    { v:3, en:"Try something, and watch whether it lands", ar:"تجرّب شيئًا وتراقب إن كان قد نجح" },
    { v:1, en:"Give them room until they come to you", ar:"تعطيه مساحة حتى يأتي إليك" } ] },

e4: {
  was: "It's easy for me to depend on my partner, and for them to depend on me.",
  en: "You need something you cannot handle alone — money, time, or help you would rather not ask for. You:",
  ar: "تحتاج شيئًا لا تستطيع تدبّره وحدك — مالًا أو وقتًا أو مساعدة تفضّل ألا تطلبها. أنت:",
  opts: [
    { v:7, en:"Ask your partner first, without it costing you anything", ar:"تطلب من شريكك أولًا، من دون أن تشعر بثقل في طلب ذلك" },
    { v:5, en:"Ask, after a day of trying to avoid asking", ar:"تسأل، بعد يوم من محاولة تجنّب السؤال" },
    { v:3, en:"Ask someone else instead", ar:"تسأل شخصًا آخر بدلًا منه" },
    { v:1, en:"Handle it alone, however long that takes", ar:"تتدبره وحدك، مهما طال ذلك" } ] },

// ── Adaptability & growth ───────────────────────────────────────────────
g5: {
  was: "I regularly notice and thank my partner for the small things.",
  en: "Your partner has quietly handled the same small thing every day for a month without being asked. When did you last say something about it:",
  ar: "تولّى شريكك بهدوء الأمر الصغير نفسه كل يوم لشهر دون أن يُطلب منه. متى كانت آخر مرة قلت فيها شيئًا عن ذلك:",
  opts: [
    { v:7, en:"This week — you say it out loud, by name, often", ar:"هذا الأسبوع — تذكر الأمر صراحة وتعبّر عن تقديرك له كثيرًا" },
    { v:5, en:"Recently enough, though not often", ar:"مؤخرًا بما يكفي، وإن لم يكن كثيرًا" },
    { v:3, en:"You cannot remember, but you do notice", ar:"لا تتذكر، لكنك تلاحظ فعلًا" },
    { v:1, en:"You show it in other ways rather than saying it", ar:"تُظهر ذلك بطرق أخرى بدل أن تقوله" } ] },

// ── Future planning ─────────────────────────────────────────────────────
u2: {
  was: "I have clear goals for the next five years.",
  en: "Someone asks where you expect to be in five years. Your answer:",
  ar: "يسألك أحدهم أين تتوقع أن تكون بعد خمس سنوات. إجابتك:",
  opts: [
    { v:7, en:"Specific — you have written it down and you track it", ar:"محددة — كتبتها وتتابعها" },
    { v:5, en:"A clear direction, without the details fixed", ar:"اتجاه واضح، دون تثبيت التفاصيل" },
    { v:3, en:"A rough idea that changes when you are asked", ar:"فكرة عامة تتغير كلما سُئلت" },
    { v:1, en:"You do not plan that far — five years is not knowable", ar:"لا تخطط إلى هذا الحد — فما سيحدث بعد خمس سنوات لا يمكن معرفته" } ] },

g1: {
  was: "Your partner gets a great job offer in another city. Your first thought:",
  gv: {
    n: { en:"Your partner is offered the job they have wanted for years. It is in another city, and both your families are here. Your first reaction:",
         ar:"عُرضت على شريكك الوظيفة التي أرادها منذ سنوات. إنها في مدينة أخرى، وعائلتاكما هنا. أول رد فعل لديك:",
      opts: [
        { v:7, en:"Start looking at what the move would take", ar:"تبدأ بالنظر في ما يتطلبه الانتقال", ax:{ trad:+1, auth:+1 } },
        { v:5, en:"Open to it, and honestly anxious about leaving", ar:"منفتح على الفكرة، وقلق فعلًا من الرحيل" },
        { v:3, en:"Say you would want the families' view before deciding", ar:"تقول إنك تريد رأي العائلتين قبل القرار", ax:{ auth:-2 } },
        { v:1, en:"Hope they turn it down — what you have here is worth more", ar:"تتمنى أن يرفض — ما لديكما هنا يساوي أكثر", ax:{ trad:-1 } } ] },
    m: { en:"Your wife is offered the job she has wanted for years. It is in another city, and both your families are here. Your first reaction:",
         ar:"عُرضت على زوجتك الوظيفة التي أرادتها منذ سنوات. إنها في مدينة أخرى، وعائلتاكما هنا. أول رد فعل لديك:",
      opts: [
        { v:7, en:"Start looking at what the move would take for you too", ar:"تبدأ بالنظر في ما يتطلبه الانتقال بالنسبة لك أيضًا", ax:{ role:+2, auth:+1 } },
        { v:5, en:"Open to it, and honestly anxious about leaving", ar:"منفتح على الفكرة، وقلق فعلًا من الرحيل" },
        { v:3, en:"Say you would want the families' view before deciding", ar:"تقول إنك تريد رأي العائلتين قبل القرار", ax:{ auth:-2 } },
        { v:1, en:"Hope she turns it down — what you have here is worth more", ar:"تتمنى أن ترفض — ما لديكما هنا يساوي أكثر", ax:{ role:-1, trad:-1 } } ] },
    f: { en:"Your husband is offered the job he has wanted for years. It is in another city, and both your families are here — including yours. Your first reaction:",
         ar:"عُرضت على زوجك الوظيفة التي أرادها منذ سنوات. إنها في مدينة أخرى، وعائلتاكما هنا — ومنها عائلتك. أول رد فعل لديكِ:",
      opts: [
        { v:7, en:"Start looking at what the move would take for you too", ar:"تبدئين بالنظر في ما يتطلبه الانتقال بالنسبة لكِ أيضًا", ax:{ trad:+1, auth:+1 } },
        { v:5, en:"Open to it, and honestly anxious about leaving", ar:"منفتحة على الفكرة، وقلقة فعلًا من الرحيل" },
        { v:3, en:"Say you would want the families' view before deciding", ar:"تقولين إنك تريدين رأي العائلتين قبل القرار", ax:{ auth:-2 } },
        { v:1, en:"Hope he turns it down — what you have here is worth more", ar:"تتمنين أن يرفض — ما لديكما هنا يساوي أكثر", ax:{ trad:-1 } } ] } } },

g2: {
  was: "Your partner wants to leave a stable job to start their own business. You:",
  gv: {
    n: { en:"Your partner wants to leave a secure salary to start something of their own. Savings would cover about eight months. You:",
         ar:"يريد شريكك ترك راتب مضمون ليبدأ مشروعه الخاص. المدخرات تكفي نحو ثمانية أشهر. أنت:",
      opts: [
        { v:7, en:"Back it, and work through the risks together", ar:"تدعمه وتدرسان المخاطر معًا", ax:{ econ:+2 } },
        { v:5, en:"Back it if the numbers hold up when you look at them", ar:"تدعمه إذا بدت الأرقام منطقية بعد مراجعتها", ax:{ econ:+1 } },
        { v:3, en:"Worry a lot, and keep most of it to yourself", ar:"تقلق كثيرًا وتبقي معظم قلقك لنفسك" },
        { v:1, en:"Say no — a secure income is not something you give up", ar:"ترفض — الدخل المضمون ليس مما يُتخلى عنه", ax:{ econ:-2 } } ] },
    m: { en:"Your wife wants to leave a secure salary to start something of her own. Savings would cover about eight months. You:",
         ar:"تريد زوجتك ترك راتب مضمون لتبدأ مشروعها الخاص. المدخرات تكفي نحو ثمانية أشهر. أنت:",
      opts: [
        { v:7, en:"Back it, and work through the risks together", ar:"تدعمها وتدرسان المخاطر معًا", ax:{ econ:+2, role:+1 } },
        { v:5, en:"Back it if the numbers hold up when you look at them", ar:"تدعمها إذا بدت الأرقام منطقية بعد مراجعتها", ax:{ econ:+1 } },
        { v:3, en:"Worry a lot, and keep most of it to yourself", ar:"تقلق كثيرًا وتبقي معظم قلقك لنفسك" },
        { v:1, en:"Say no — you carry the house, and this adds risk to it", ar:"ترفض — فأنت من يتحمل نفقات البيت، وهذا يضيف إليه مخاطرة أخرى", ax:{ econ:-2, role:-1 } } ] },
    f: { en:"Your husband wants to leave a secure salary to start something of his own. Savings would cover about eight months. You:",
         ar:"يريد زوجك ترك راتب مضمون ليبدأ مشروعه الخاص. المدخرات تكفي نحو ثمانية أشهر. أنتِ:",
      opts: [
        { v:7, en:"Back it, and work through the risks together", ar:"تدعمينه وتدرسان المخاطر معًا", ax:{ econ:+2 } },
        { v:5, en:"Back it if the numbers hold up when you look at them", ar:"تدعمينه إذا بدت الأرقام منطقية بعد مراجعتها", ax:{ econ:+1 } },
        { v:3, en:"Worry a lot, and keep most of it to yourself", ar:"تقلقين كثيرًا وتبقين معظم قلقك لنفسك" },
        { v:1, en:"Say no — a secure income is not something you give up", ar:"ترفضين — الدخل المضمون ليس مما يُتخلى عنه", ax:{ econ:-2 } } ] } } },

g3: {
  was: "Your partner suggests a food, hobby, or trip you've never tried. You usually:",
  en: "Your partner books something you have never done before and tells you an hour beforehand. You:",
  ar: "يحجز شريكك نشاطًا لم تجرّبه من قبل ويخبرك قبل الموعد بساعة. أنت:",
  opts: [
    { v:7, en:"Go, and enjoy not having decided it yourself", ar:"تذهب، وتستمتع بكون القرار لم يكن قرارك هذه المرة", ax:{ trad:+1 } },
    { v:5, en:"Go, after asking a few questions about what it involves", ar:"تذهب بعد أن تسأل بضعة أسئلة عمّا يتضمنه" },
    { v:3, en:"Go, but say you would rather be told in advance next time", ar:"تذهب، لكنك تقول إنك تفضّل أن تُخبر مسبقًا في المرة القادمة" },
    { v:1, en:"Ask to move it — you would rather do something familiar", ar:"تطلب تأجيله — تفضّل شيئًا مألوفًا", ax:{ trad:-1 } } ] },

// ── Future planning ─────────────────────────────────────────────────────
u1: {
  was: "Ten years from now, I picture us:",
  en: "Ten years out, someone asks where the two of you ended up. The answer you would want to give:",
  ar: "بعد عشر سنوات، يسألك أحدهم أين استقر بكما الحال. الإجابة التي تودّ أن تعطيها:",
  opts: [
    { v:2, en:"In one place, with roots — the same house, the same people", ar:"في مكان واحد وبجذور — البيت نفسه والناس أنفسهم", ax:{ trad:-2 } },
    { v:5, en:"Settled, but with things you would not have predicted", ar:"مستقران، لكن مع أمور لم تكونا تتوقعانها" },
    { v:7, en:"Somewhere neither of you could have named back then", ar:"في مكان لم يكن أي منكما ليسمّيه حينها", ax:{ trad:+2 } } ] },

u3: {
  was: "Big decisions — like major purchases — should always be made together.",
  gv: {
    n: { en:"You have found something worth about three months' income and you want it. Your partner does not know yet. You:",
         ar:"وجدت شيئًا تقارب قيمته دخل ثلاثة أشهر وتريده. لا يعرف شريكك بعد. أنت:",
      opts: [
        { v:7, en:"Do not move until the two of you have decided together", ar:"لا تتحرك حتى تقررا معًا", ax:{ auth:+1 } },
        { v:5, en:"Say you are going to do it, and hear them out first", ar:"تخبر شريكك أنك تنوي شراءه، وتستمع إلى رأيه أولًا" },
        { v:3, en:"Do it, and tell them the same day", ar:"تفعلها وتخبره في اليوم نفسه" },
        { v:1, en:"Do it — it is your money and your call", ar:"تفعلها — إنه مالك وقرارك", ax:{ econ:+1 } } ] },
    m: { en:"You have found something worth about three months' income and you want it. Your wife does not know yet. You:",
         ar:"وجدت شيئًا تقارب قيمته دخل ثلاثة أشهر وتريده. لا تعرف زوجتك بعد. أنت:",
      opts: [
        { v:7, en:"Do not move until the two of you have decided together", ar:"لا تتحرك حتى تقررا معًا", ax:{ auth:+1, role:+1 } },
        { v:5, en:"Say you are going to do it, and hear her out first", ar:"تخبرها أنك تنوي شراءه، وتستمع إلى رأيها أولًا" },
        { v:3, en:"Do it, and tell her the same day", ar:"تفعلها وتخبرها في اليوم نفسه" },
        { v:1, en:"Do it — you earned it, and the house lacks nothing", ar:"تفعلها — أنت كسبته والبيت لا ينقصه شيء", ax:{ role:-1, econ:+1 } } ] },
    f: { en:"You have found something worth about three months' income and you want it. Your husband does not know yet. You:",
         ar:"وجدتِ شيئًا تقارب قيمته دخل ثلاثة أشهر وتريدينه. لا يعرف زوجك بعد. أنتِ:",
      opts: [
        { v:7, en:"Do not move until the two of you have decided together", ar:"لا تتحركين حتى تقررا معًا", ax:{ auth:+1 } },
        { v:5, en:"Say you are going to do it, and hear him out first", ar:"تخبرينه أنك تنوين شراءه، وتستمعين إلى رأيه أولًا" },
        { v:3, en:"Do it, and tell him the same day", ar:"تفعلينها وتخبرينه في اليوم نفسه" },
        { v:1, en:"Do it — it is your own income and your call", ar:"تفعلينها — إنه دخلك الخاص وقرارك", ax:{ role:+1, econ:+1 } } ] } } },

// ── Fairness at home ────────────────────────────────────────────────────
fa1: {
  was: "How should housework and childcare be divided between a couple?",
  gv: {
    n: { en:"It is a normal weekday evening. Dinner, dishes, laundry and a child who will not settle are all waiting. In your house, what actually happens:",
         ar:"مساء يوم عادي. العشاء والصحون والغسيل وطفل لا يهدأ، كلها بانتظاركما. في بيتكما، ما الذي يحدث فعلًا:",
      opts: [
        { v:7, en:"You split it as it comes, without anyone assigning anything", ar:"تتقاسمان المهام كما تأتي، دون أن يوزّعها أحد عليكما", ax:{ role:+2 } },
        { v:5, en:"Whoever has more left in them that evening takes more", ar:"من تبقى لديه طاقة أكثر في تلك الليلة يتولى أكثر", ax:{ role:+1 } },
        { v:3, en:"One of you carries most of it and the other steps in", ar:"يتحمل أحدكما معظم المهام، ويتدخل الآخر للمساعدة", ax:{ role:-1 } },
        { v:1, en:"Each of you has your own domain, and it works", ar:"لكل منكما مجاله، والأمر يسير", ax:{ role:-2 } } ] },
    m: { en:"It is a normal weekday evening. Dinner, dishes, laundry and a child who will not settle are all waiting. You have just come in from work. What actually happens:",
         ar:"مساء يوم عادي. العشاء والصحون والغسيل وطفل لا يهدأ، كلها بانتظاركما. وقد عدت للتو من العمل. ما الذي يحدث فعلًا:",
      opts: [
        { v:7, en:"You take half of it, without being asked", ar:"تأخذ نصفها دون أن يُطلب منك", ax:{ role:+2 } },
        { v:5, en:"Whoever has more left in them that evening takes more", ar:"من تبقى لديه طاقة أكثر في تلك الليلة يتولى أكثر", ax:{ role:+1 } },
        { v:3, en:"She carries most of it and you step in where you can", ar:"هي تحمل معظمها وأنت تتدخل حيث تستطيع", ax:{ role:-1 } },
        { v:1, en:"That side is hers, the earning side is yours, and it works", ar:"هذا الجانب من مسؤوليتها، والكسب من مسؤوليتك، وهذا الترتيب يناسبكما", ax:{ role:-2 } } ] },
    f: { en:"It is a normal weekday evening. Dinner, dishes, laundry and a child who will not settle are all waiting. You have just come in from work too. What actually happens:",
         ar:"مساء يوم عادي. العشاء والصحون والغسيل وطفل لا يهدأ، كلها بانتظاركما. وقد عدتِ أنتِ أيضًا للتو من العمل. ما الذي يحدث فعلًا:",
      opts: [
        { v:7, en:"He takes half of it, without being asked", ar:"يأخذ نصفها دون أن يُطلب منه", ax:{ role:+2 } },
        { v:5, en:"Whoever has more left in them that evening takes more", ar:"من تبقى لديه طاقة أكثر في تلك الليلة يتولى أكثر", ax:{ role:+1 } },
        { v:3, en:"You carry most of it and he steps in where he can", ar:"أنتِ تحملين معظمها وهو يتدخل حيث يستطيع", ax:{ role:-1 } },
        { v:1, en:"That side is yours, the earning side is his, and it works", ar:"هذا الجانب من مسؤوليتكِ، والكسب من مسؤوليته، وهذا الترتيب يناسبكما", ax:{ role:-2 } } ] } } },

// ── Physical intimacy (optional module) ─────────────────────────────────
i1: {
  was: "Physical affection is one of the main ways I feel connected to a partner.",
  en: "A stretch of weeks where you are both busy and physical closeness drops off. By the end of it, you feel:",
  ar: "فترة أسابيع تكونان فيها مشغولين ويتراجع فيها القرب الجسدي. في نهايتها، تشعر بأنك:",
  opts: [
    { v:7, en:"Noticeably further apart — this is how you stay connected", ar:"تشعر بتباعد ملحوظ — فالقرب الجسدي إحدى الطرق التي تحافظان بها على اتصالكما" },
    { v:5, en:"A little distant, and glad when it comes back", ar:"تشعر ببعض البعد، وتسعد حين يعود القرب بينكما" },
    { v:3, en:"Much the same — other things carry the connection", ar:"تقريبًا كما كنت — فهناك أمور أخرى تحافظ على اتصالكما" },
    { v:1, en:"Unchanged — you had not counted the weeks", ar:"لم يتغير شيء — لم تكن تعدّ الأسابيع" } ] },

i2: {
  was: "I could talk openly and without embarrassment with my partner about our physical relationship.",
  en: "There is something about your physical relationship you would want changed. Bringing it up:",
  ar: "هناك أمر في علاقتكما الجسدية تودّ تغييره. طرحه:",
  opts: [
    { v:7, en:"You would say it directly, the way you would say anything else", ar:"ستقوله مباشرة، كما تقول أي أمر آخر" },
    { v:5, en:"You would say it, after working out how", ar:"ستقوله بعد أن تفكر في الطريقة" },
    { v:3, en:"You would hint at it and hope it is picked up", ar:"ستلمّح إليه وتأمل أن يفهم شريكك التلميح" },
    { v:1, en:"You would not raise it — some things resist being said", ar:"لن تطرحه — بعض الأمور يصعب وضعها في كلام" } ] },

i3: {
  was: "If our needs for physical closeness turned out to be different, I would expect us to:",
  en: "A few months in, it is clear one of you wants physical closeness more often than the other. What happens next:",
  ar: "بعد بضعة أشهر، يتضح أن أحدكما يرغب في القرب الجسدي أكثر من الآخر. ما الذي يحدث بعد ذلك:",
  opts: [
    { v:7, en:"One of you says it out loud, and you work it out together", ar:"يتحدث أحدكما عنه صراحة، وتعملان على إيجاد حل معًا" },
    { v:5, en:"It gets said eventually, awkwardly, and it helps", ar:"يُطرح الأمر في النهاية بشيء من الحرج، ويساعدكما ذلك" },
    { v:3, en:"Neither of you names it, and you both adjust quietly", ar:"لا يتحدث أي منكما عنه صراحة، ويتأقلم كلاكما بهدوء" },
    { v:1, en:"It stays unsaid — some things are not discussed", ar:"تبقى دون قول — بعض الأمور لا تُناقش" } ] },

};

// =============================================================================
// B. New v4 items
// =============================================================================
// Four scenarios covering the failure modes the KSA divorce literature names
// most often and that the v3 bank did not reach directly: an income shock,
// the default-parent problem, contact from outside the marriage, and a family
// decision handed down rather than discussed. All four are gendered.
// Ids are new, so no existing profile contains them — v2/v3 profiles simply
// score without them, exactly as they already do for the v3 additions.

export const NEW_ITEMS_V4 = [

{ id:"n1", cat:"money", type:"mcq", mt:"sim", w:3, v4:true,
  gv: {
    n: { en:"Your income drops sharply and stays down for six months. Your partner can cover the shortfall from their own salary. You:",
         ar:"ينخفض دخلك بشدة ويبقى منخفضًا ستة أشهر. يستطيع شريكك تغطية العجز من راتبه. أنت:",
      opts: [
        { v:7, en:"Accept, and say plainly that you will do the same for them", ar:"تقبل، وتقول بوضوح إنك ستفعل المثل من أجله", ax:{ role:+1 } },
        { v:5, en:"Accept for now, and treat it as something you owe back", ar:"تقبل مؤقتًا، وتعتبره دينًا عليك تردّه", ax:{ econ:-1 } },
        { v:3, en:"Cut everything down instead, and avoid taking it", ar:"تقلّص كل شيء بدلًا من ذلك وتتجنب أخذه" },
        { v:1, en:"Refuse, and find the money elsewhere", ar:"ترفض وتدبّر المال من مكان آخر", ax:{ role:-1 } } ] },
    m: { en:"Your income drops sharply and stays down for six months. Your wife can cover the rent from her own salary until it recovers. You:",
         ar:"ينخفض دخلك بشدة ويبقى منخفضًا ستة أشهر. تستطيع زوجتك تغطية الإيجار من راتبها حتى يتعافى. أنت:",
      opts: [
        { v:7, en:"Accept, and say plainly that you would do the same for her", ar:"تقبل، وتقول بوضوح إنك ستفعل المثل من أجلها", ax:{ role:+2 } },
        { v:5, en:"Accept for now, and treat it as something you owe back", ar:"تقبل مؤقتًا، وتعتبره دينًا عليك تردّه", ax:{ econ:-1 } },
        { v:3, en:"Cut everything down instead, and keep it off her salary", ar:"تقلّص كل شيء بدلًا من ذلك ولا تمسّ راتبها" },
        { v:1, en:"Refuse — the rent is your responsibility, not hers", ar:"ترفض — الإيجار مسؤوليتك أنت لا هي", ax:{ role:-2 } } ] },
    f: { en:"Your husband's income drops sharply and stays down for six months. You can cover the rent from your own salary until it recovers. You:",
         ar:"ينخفض دخل زوجك بشدة ويبقى منخفضًا ستة أشهر. تستطيعين تغطية الإيجار من راتبك حتى يتعافى. أنتِ:",
      opts: [
        { v:7, en:"Offer it, and say plainly you expect the same in reverse", ar:"تعرضين ذلك، وتقولين بوضوح إنك تتوقعين المثل في المقابل", ax:{ role:+2 } },
        { v:5, en:"Offer it as a loan between you, to be settled later", ar:"تعرضينه كقرض بينكما يُسوّى لاحقًا", ax:{ econ:-1 } },
        { v:3, en:"Cut the household down instead and wait it out", ar:"تقلّصان مصاريف البيت بدلًا من ذلك وتنتظران" },
        { v:1, en:"Leave it to him — the rent is his responsibility, not yours", ar:"تتركين الأمر له — الإيجار مسؤوليته هو لا مسؤوليتك", ax:{ role:-2 } } ] } } },

{ id:"n2", cat:"fairness", type:"mcq", mt:"sim", w:2, v4:true,
  gv: {
    n: { en:"It is 3am and the child is awake and crying. Both of you have work in the morning. What happens:",
         ar:"الساعة الثالثة فجرًا والطفل مستيقظ يبكي. لدى كليكما عمل في الصباح. ما الذي يحدث:",
      opts: [
        { v:7, en:"Whoever wakes first goes, and it evens out over the week", ar:"من يستيقظ أولًا يتولى الأمر، وتتوازن الأدوار خلال الأسبوع", ax:{ role:+2 } },
        { v:5, en:"You alternate nights, agreed in advance", ar:"تتناوبان الليالي، باتفاق مسبق", ax:{ role:+1 } },
        { v:3, en:"The same one of you goes most nights, and both accept that", ar:"يتولى الطرف نفسه الأمر في معظم الليالي، وكلاكما متقبل لذلك", ax:{ role:-1 } },
        { v:1, en:"The same one of you goes every night — that is the arrangement", ar:"يتولى الطرف نفسه الأمر كل ليلة — هذا هو الترتيب بينكما", ax:{ role:-2 } } ] },
    m: { en:"It is 3am and the child is awake and crying. You both have work in the morning, and she went the last two nights. What happens:",
         ar:"الساعة الثالثة فجرًا والطفل مستيقظ يبكي. لدى كليكما عمل في الصباح، وقد ذهبت هي في الليلتين الماضيتين. ما الذي يحدث:",
      opts: [
        { v:7, en:"You get up before she does", ar:"تنهض أنت قبل أن تنهض هي", ax:{ role:+2 } },
        { v:5, en:"You wake her and offer to swap for tomorrow", ar:"توقظها وتعرض أن تتبادلا غدًا", ax:{ role:+1 } },
        { v:3, en:"You stay down — she settles him faster than you can", ar:"تبقى في مكانك — فهي تهدّئ الطفل أسرع منك", ax:{ role:-1 } },
        { v:1, en:"You stay down — nights are hers, mornings are yours", ar:"تبقى في مكانك — الليالي من مسؤوليتها، والصباحات من مسؤوليتك", ax:{ role:-2 } } ] },
    f: { en:"It is 3am and the child is awake and crying. You both have work in the morning, and you went the last two nights. What happens:",
         ar:"الساعة الثالثة فجرًا والطفل مستيقظ يبكي. لدى كليكما عمل في الصباح، وقد ذهبتِ أنتِ في الليلتين الماضيتين. ما الذي يحدث:",
      opts: [
        { v:7, en:"He gets up before you do", ar:"ينهض هو قبلك", ax:{ role:+2 } },
        { v:5, en:"You wake him and ask him to take this one", ar:"توقظينه وتطلبين منه أن يتولى هذه المرة", ax:{ role:+1 } },
        { v:3, en:"You go — it is faster than explaining it", ar:"تذهبين أنتِ — أسرع من شرح الأمر", ax:{ role:-1 } },
        { v:1, en:"You go — nights are yours, mornings are his", ar:"تذهبين أنتِ — الليالي لكِ والصباحات له", ax:{ role:-2 } } ] } } },

{ id:"n3", cat:"trust", type:"mcq", mt:"sim", w:2, v4:true,
  gv: {
    n: { en:"Someone you used to be close to years ago messages you out of nowhere, warmly, asking how you have been. You:",
         ar:"يراسلك فجأة شخص كنت قريبًا منه قبل سنوات، برسالة ودّية يسأل فيها عن أحوالك. أنت:",
      opts: [
        { v:7, en:"Show your partner the message before you reply", ar:"تُري شريكك الرسالة قبل أن ترد" },
        { v:5, en:"Reply briefly and mention it that evening", ar:"ترد باختصار وتذكر الأمر في المساء" },
        { v:3, en:"Reply, and see no reason to bring it up", ar:"ترد، ولا ترى داعيًا لذكر الأمر" },
        { v:1, en:"Do not reply, and do not mention it either", ar:"لا ترد، ولا تذكر الأمر أيضًا" } ] },
    m: { en:"A woman you were close to years ago messages you out of nowhere, warmly, asking how you have been. You:",
         ar:"تراسلك فجأة امرأة كنت قريبًا منها قبل سنوات، برسالة ودّية تسأل فيها عن أحوالك. أنت:",
      opts: [
        { v:7, en:"Show your wife the message before you reply", ar:"تُري زوجتك الرسالة قبل أن ترد" },
        { v:5, en:"Reply briefly and mention it that evening", ar:"ترد باختصار وتذكر الأمر في المساء" },
        { v:3, en:"Reply, and see no reason to bring it up", ar:"ترد، ولا ترى داعيًا لذكر الأمر" },
        { v:1, en:"Do not reply, and do not mention it either", ar:"لا ترد، ولا تذكر الأمر أيضًا" } ] },
    f: { en:"A man you were close to years ago messages you out of nowhere, warmly, asking how you have been. You:",
         ar:"يراسلك فجأة رجل كنتِ قريبة منه قبل سنوات، برسالة ودّية يسأل فيها عن أحوالك. أنتِ:",
      opts: [
        { v:7, en:"Show your husband the message before you reply", ar:"تُرين زوجك الرسالة قبل أن تردي" },
        { v:5, en:"Reply briefly and mention it that evening", ar:"تردين باختصار وتذكرين الأمر في المساء" },
        { v:3, en:"Reply, and see no reason to bring it up", ar:"تردين، ولا ترين داعيًا لذكر الأمر" },
        { v:1, en:"Do not reply, and do not mention it either", ar:"لا تردين، ولا تذكرين الأمر أيضًا" } ] } } },

{ id:"n4", cat:"family", type:"mcq", mt:"sim", w:2, v4:true,
  gv: {
    n: { en:"A parent announces, in front of everyone, a plan that involves the two of you — a date, a trip, a commitment — without asking first. You:",
         ar:"يعلن أحد الوالدين أمام الجميع خطة تشمل كليكما — موعدًا أو سفرًا أو التزامًا — دون أن يسأل أولًا. أنت:",
      opts: [
        { v:7, en:"Say there and then that you two will decide and reply later", ar:"تقول في حينها إنكما ستقرران وتردّان لاحقًا", ax:{ auth:+2 } },
        { v:5, en:"Say nothing then, and settle it privately afterwards", ar:"لا تقول شيئًا حينها، وتحسم الأمر على انفراد بعدها", ax:{ auth:+1 } },
        { v:3, en:"Go along with it, and tell your partner you had no choice", ar:"تجاري الأمر، وتقول لشريكك إنه لم يكن لديك خيار", ax:{ auth:-1 } },
        { v:1, en:"Go along with it — this is how things are arranged", ar:"تساير الأمر — فهكذا تُرتَّب الأمور", ax:{ auth:-2, trad:-1 } } ] },
    m: { en:"Your father announces, in front of everyone, a plan that involves you and your wife — a date, a trip, a commitment — without asking first. You:",
         ar:"يعلن والدك أمام الجميع خطة تخصك وزوجتك — موعد أو سفر أو التزام — دون أن يسأل أولًا. أنت:",
      opts: [
        { v:7, en:"Say there and then that you two will decide and reply later", ar:"تقول في حينها إنكما ستقرران وتردّان لاحقًا", ax:{ auth:+2 } },
        { v:5, en:"Say nothing then, and settle it privately afterwards", ar:"لا تقول شيئًا حينها، وتحسم الأمر على انفراد بعدها", ax:{ auth:+1 } },
        { v:3, en:"Go along with it, and tell her you had no choice", ar:"تجاري الأمر، وتقول لها إنه لم يكن لديك خيار", ax:{ auth:-1 } },
        { v:1, en:"Go along with it — this is how things are arranged", ar:"تساير الأمر — فهكذا تُرتَّب الأمور", ax:{ auth:-2, trad:-1 } } ] },
    f: { en:"Your father-in-law announces, in front of everyone, a plan that involves you and your husband — a date, a trip, a commitment — without asking first. You:",
         ar:"يعلن والد زوجك أمام الجميع خطة تخصك وزوجك — موعد أو سفر أو التزام — دون أن يسأل أولًا. أنتِ:",
      opts: [
        { v:7, en:"Say there and then that you two will decide and reply later", ar:"تقولين في حينها إنكما ستقرران وتردّان لاحقًا", ax:{ auth:+2 } },
        { v:5, en:"Say nothing then, and settle it privately afterwards", ar:"لا تقولين شيئًا حينها، وتحسمان الأمر على انفراد بعدها", ax:{ auth:+1 } },
        { v:3, en:"Look to your husband to answer for both of you", ar:"تنظرين إلى زوجك ليجيب عنكما", ax:{ auth:-1, role:-1 } },
        { v:1, en:"Go along with it — this is how things are arranged", ar:"تسايرين الأمر — فهكذا تُرتَّب الأمور", ax:{ auth:-2, trad:-1 } } ] } } },

];

// =============================================================================
// B2. Relationship stage — prospective wording
// =============================================================================
// The app's audience is mostly people deciding whether to marry, not people
// already married. But 26 stems and 7 options name "your wife" / "your
// husband" / "the child", which presupposes a marriage and a child that do
// not exist yet for that reader.
//
// The fix is wording, not content. Asking a not-yet-married person how they
// would handle married life is the established method, not a flaw in it —
// PREPARE, the standard premarital inventory, does exactly this and predicts
// marital satisfaction at 80-85% in two three-year longitudinal studies. The
// item is measuring an *expectation*, and expectation mismatch is what causes
// the conflict later. So nothing is removed and nothing is gated.
//
// Two registers only:
//   present     — "your wife picks up your phone".  Used for stage "mar".
//   prospective — "she picks up your phone".        Used for "pre" and "was".
//
// Same id, same option values, same scoring, both ways. A married person and
// a single person still compare item for item — the same guarantee the gender
// wing gives. Stage is stated once, in the intro, so no stem has to repeat
// "imagine you are married" 26 times.
//
// A profile with no stage recorded (everything made before this shipped) gets
// the present register, which is the wording those people actually saw.
//
// Key is `id|genderVariant`. `opts` is keyed by the option's score value, so
// a reordering of the options can never silently rewrite the wrong one.

export const PROSPECTIVE = {

// ── stems that name a spouse ────────────────────────────────────────────
"c3|m": { en:"You come home after the worst day you have had in months — a problem at work you have not solved yet. She can tell something is off and asks. You:",
          ar:"تعود إلى البيت بعد أسوأ يوم مرّ عليك منذ شهور — مشكلة في العمل لم تحلّها بعد. تلاحظ أن شيئًا ما ليس على ما يرام وتسألك. أنت:" },
"c3|f": { en:"You come home after the worst day you have had in months, and the house still needs sorting before anyone sleeps. He asks what happened. You:",
          ar:"تعودين إلى البيت بعد أسوأ يوم مرّ عليكِ منذ شهور، والبيت ما زال يحتاج ترتيبًا قبل أن ينام أحد. يسألك عمّا حدث. أنتِ:" },

"m3|n": { en:"Six months after the wedding, the two of you are setting up how money will work. What you would propose:",
          ar:"بعد ستة أشهر من الزواج، تنظّمان طريقة إدارة المال بينكما. ما الذي ستقترحه:" },
"m3|m": { en:"Six months after the wedding, the two of you are setting up how money will work. She earns her own salary. What you would propose:",
          ar:"بعد ستة أشهر من الزواج، تنظّمان طريقة إدارة المال. لها راتبها الخاص. ما الذي ستقترحه:" },
"m3|f": { en:"Six months after the wedding, the two of you are setting up how money will work. You earn your own salary. What you would propose:",
          ar:"بعد ستة أشهر من الزواج، تنظّمان طريقة إدارة المال. لكِ راتبك الخاص. ما الذي ستقترحينه:" },

"f2|m": { en:"The two of you have decided where you will live. Before you announce it, your mother calls to ask what you decided. You:",
          ar:"اتفقتما على مكان السكن. قبل أن تعلنا القرار، تتصل والدتك لتسأل عمّا قررتما. أنت:",
          opts:{ 3:{ en:"Give a general answer until the two of you announce it", ar:"تعطي إجابة عامة حتى تعلنا القرار معًا" },
                 1:{ en:"Say it is settled between the two of you", ar:"تقول إنه أمر محسوم بينكما" } } },
"f2|f": { en:"The two of you have decided where you will live. Before you announce it, his mother calls to ask what you decided. You:",
          ar:"اتفقتما على مكان السكن. قبل أن تعلنا القرار، تتصل والدته لتسأل عمّا قررتما. أنتِ:",
          opts:{ 3:{ en:"Say he will call her back about it", ar:"تقولين إنه سيعاود الاتصال بها بشأنه" },
                 1:{ en:"Say it is settled between the two of you", ar:"تقولين إنه أمر محسوم بينكما" } } },

"f3|m": { en:"There is a gathering at your family's house on the one free evening the two of you have had in three weeks. She is tired and would rather not. You:",
          ar:"هناك تجمّع في بيت أهلك في الليلة الوحيدة الفارغة لديكما منذ ثلاثة أسابيع. هي متعبة وتفضّل عدم الذهاب. أنت:" },

"t1|m": { en:"Your phone is on the majlis table. She picks it up to check something and it is unlocked. You:",
          ar:"هاتفك على طاولة المجلس. تلتقطه لتتحقق من شيء والهاتف غير مقفل. أنت:" },
"t1|f": { en:"Your phone is on the table. He picks it up to check something and it is unlocked. You:",
          ar:"هاتفك على الطاولة. يلتقطه ليتحقق من شيء والهاتف غير مقفل. أنتِ:" },

"t2|m": { en:"She mentions a male colleague she talks to often, and clearly enjoys talking to. You:",
          ar:"تذكر زميلًا في العمل تتحدث معه كثيرًا وتستمتع بالحديث معه بوضوح. أنت:" },
"t2|f": { en:"He mentions a female colleague he talks to often, and clearly enjoys talking to. You:",
          ar:"يذكر زميلة في العمل يتحدث معها كثيرًا ويستمتع بالحديث معها بوضوح. أنتِ:" },

"g1|m": { en:"She is offered the job she has wanted for years. It is in another city, and both your families are here. Your first reaction:",
          ar:"تُعرض عليها الوظيفة التي أرادتها منذ سنوات. إنها في مدينة أخرى، وعائلتاكما هنا. أول رد فعل لديك:" },
"g1|f": { en:"He is offered the job he has wanted for years. It is in another city, and both your families are here — including yours. Your first reaction:",
          ar:"تُعرض عليه الوظيفة التي أرادها منذ سنوات. إنها في مدينة أخرى، وعائلتاكما هنا — ومنها عائلتك. أول رد فعل لديكِ:" },

"g2|m": { en:"She wants to leave a secure salary to start something of her own. Savings would cover about eight months. You:",
          ar:"تريد ترك راتب مضمون لتبدأ مشروعها الخاص. المدخرات تكفي نحو ثمانية أشهر. أنت:" },
"g2|f": { en:"He wants to leave a secure salary to start something of his own. Savings would cover about eight months. You:",
          ar:"يريد ترك راتب مضمون ليبدأ مشروعه الخاص. المدخرات تكفي نحو ثمانية أشهر. أنتِ:" },

"u3|m": { en:"You have found something worth about three months' income and you want it. She does not know yet. You:",
          ar:"وجدت شيئًا تقارب قيمته دخل ثلاثة أشهر وتريده. لا تعرف بعد. أنت:" },
"u3|f": { en:"You have found something worth about three months' income and you want it. He does not know yet. You:",
          ar:"وجدتِ شيئًا تقارب قيمته دخل ثلاثة أشهر وتريدينه. لا يعرف بعد. أنتِ:" },

"n1|m": { en:"Your income drops sharply and stays down for six months. She can cover the rent from her own salary until it recovers. You:",
          ar:"ينخفض دخلك بشدة ويبقى منخفضًا ستة أشهر. تستطيع تغطية الإيجار من راتبها حتى يتعافى. أنت:" },
"n1|f": { en:"His income drops sharply and stays down for six months. You can cover the rent from your own salary until it recovers. You:",
          ar:"ينخفض دخله بشدة ويبقى منخفضًا ستة أشهر. تستطيعين تغطية الإيجار من راتبك حتى يتعافى. أنتِ:" },

"n3|m": { opts:{ 7:{ en:"Show her the message before you reply", ar:"تُريها الرسالة قبل أن ترد" } } },
"n3|f": { opts:{ 7:{ en:"Show him the message before you reply", ar:"تُرينه الرسالة قبل أن تردي" } } },

"n4|m": { en:"Your father announces, in front of everyone, a plan that involves the two of you — a date, a trip, a commitment — without asking first. You:",
          ar:"يعلن والدك أمام الجميع خطة تشمل كليكما — موعدًا أو سفرًا أو التزامًا — دون أن يسأل أولًا. أنت:" },
"n4|f": { en:"His father announces, in front of everyone, a plan that involves the two of you — a date, a trip, a commitment — without asking first. You:",
          ar:"يعلن والده أمام الجميع خطة تشمل كليكما — موعدًا أو سفرًا أو التزامًا — دون أن يسأل أولًا. أنتِ:",
          opts:{ 3:{ en:"Look to him to answer for both of you", ar:"تنظرين إليه ليجيب عنكما" } } },

// ── stems that assume a child already exists ────────────────────────────
"n2|n": { en:"Picture a child of your own, awake and crying at 3am. Both of you have work in the morning. What happens:",
          ar:"تخيّل طفلًا لكما، مستيقظًا يبكي في الثالثة فجرًا. لدى كليكما عمل في الصباح. ما الذي يحدث:" },
"n2|m": { en:"Picture a child of your own, awake and crying at 3am. You both have work in the morning, and she went the last two nights. What happens:",
          ar:"تخيّل طفلًا لكما، مستيقظًا يبكي في الثالثة فجرًا. لدى كليكما عمل في الصباح، وقد ذهبت هي في الليلتين الماضيتين. ما الذي يحدث:" },
"n2|f": { en:"Picture a child of your own, awake and crying at 3am. You both have work in the morning, and you went the last two nights. What happens:",
          ar:"تخيّلي طفلًا لكما، مستيقظًا يبكي في الثالثة فجرًا. لدى كليكما عمل في الصباح، وقد ذهبتِ أنتِ في الليلتين الماضيتين. ما الذي يحدث:" },

"fa1|n": { en:"Picture an ordinary weekday evening once you are living together: dinner, dishes, laundry and a child who will not settle. What would actually happen:",
           ar:"تخيّل مساء يوم عادي بعد أن تعيشا معًا: العشاء والصحون والغسيل وطفل لا يهدأ. ما الذي سيحدث فعلًا:" },
"fa1|m": { en:"Picture an ordinary weekday evening once you are living together: dinner, dishes, laundry and a child who will not settle. You have just come in from work. What would actually happen:",
           ar:"تخيّل مساء يوم عادي بعد أن تعيشا معًا: العشاء والصحون والغسيل وطفل لا يهدأ. وقد عدت للتو من العمل. ما الذي سيحدث فعلًا:" },
"fa1|f": { en:"Picture an ordinary weekday evening once you are living together: dinner, dishes, laundry and a child who will not settle. You have just come in from work too. What would actually happen:",
           ar:"تخيّلي مساء يوم عادي بعد أن تعيشا معًا: العشاء والصحون والغسيل وطفل لا يهدأ. وقد عدتِ أنتِ أيضًا للتو من العمل. ما الذي سيحدث فعلًا:" },

};

// =============================================================================
// C. Bank assembly
// =============================================================================

/** Genders the bank understands. `n` is the neutral fallback and is what every
 *  pre-v4 profile, and anyone who declines to say, receives. */
const GENDER_KEYS = ["m", "f", "n"];

/** Relationship stages. "pre" and "was" both read the prospective register. */
export const STAGES = ["pre", "mar", "was"];
const PROSPECTIVE_STAGES = new Set(["pre", "was"]);

/** Pick the variant of a gendered item for one gender, or the item as-is. */
function resolveGender(q, gender) {
  const g = GENDER_KEYS.includes(gender) ? gender : "n";
  if (!q.gv) return q;
  const v = q.gv[g] || q.gv.n;
  // gv is stripped from the returned object so nothing downstream — report,
  // answer list, export — can accidentally reveal that variants exist.
  const { gv, ...rest } = q;
  return { ...rest, ...v, type: v.opts ? "mcq" : rest.type };
}

/**
 * Apply the prospective wording on top of an already gender-resolved item.
 * Only stems and individual options listed in PROSPECTIVE change; everything
 * else — id, score values, weights, axis loads — is untouched, which is what
 * keeps a "pre" profile comparable to a "mar" one.
 */
function resolveStage(q, gender, stage) {
  if (!PROSPECTIVE_STAGES.has(stage)) return q;
  const g = GENDER_KEYS.includes(gender) ? gender : "n";
  const o = PROSPECTIVE[`${q.id}|${g}`];
  if (!o) return q;
  const out = { ...q };
  if (o.en) out.en = o.en;
  if (o.ar) out.ar = o.ar;
  if (o.opts && q.opts) {
    // Keyed by score value, never by index — reordering options must not be
    // able to silently rewrite a different answer than the one intended.
    out.opts = q.opts.map(opt => {
      const rep = o.opts[opt.v];
      return rep ? { ...opt, en: rep.en, ar: rep.ar } : opt;
    });
  }
  return out;
}

/** v3 bank with v4 scenario rewrites applied. Original objects are not mutated. */
export const QUESTIONS_V3_REWRITTEN = BANK_V3.map(q => {
  const r = REWRITES_V4[q.id];
  if (!r) return q;
  const { was, ...body } = r;
  // A rewrite may not change what an item measures or how it is weighted.
  return { ...q, ...body, type: (body.opts || (body.gv && body.gv.n.opts)) ? "mcq" : q.type,
           cat: q.cat, mt: q.mt, w: q.w, db: q.db, pair: q.pair, rv: q.rv, trait: q.trait,
           sub: q.sub, mod: q.mod, qc: q.qc, exp: q.exp };
});

/** Full v4 bank, before gender resolution and before module filtering. */
export const QUESTIONS_V4 = [...QUESTIONS_V3_REWRITTEN, ...NEW_ITEMS_V4];

/** Ids a v2/v3 profile will never contain. */
export const V4_ONLY_IDS = new Set(NEW_ITEMS_V4.map(q => q.id));

/** Ids that carry at least one worldview load, per axis. Used by scoring-v4. */
export const AXIS_ITEM_IDS = (() => {
  const out = Object.fromEntries(AXES.map(a => [a, new Set()]));
  for (const q of QUESTIONS_V4)
    for (const g of GENDER_KEYS) {
      const r = resolveGender(q, g);
      for (const o of r.opts || [])
        for (const a of Object.keys(o.ax || {})) out[a].add(q.id);
    }
  return Object.fromEntries(AXES.map(a => [a, [...out[a]]]));
})();

/**
 * The bank to actually present.
 * Order, count and progress are identical for every gender and every stage —
 * the gendered items sit in their original positions and are never grouped,
 * and stage only rewords. See the invisibility rule in
 * Build-MatchWise-v4.md §2.4.
 *
 * @param {{gender?: "m"|"f"|null, stage?: "pre"|"mar"|"was"|null, intimacy?: boolean}} opts
 */
export function buildBankV4({ gender = null, stage = null, intimacy = false } = {}) {
  return QUESTIONS_V4
    .filter(q => !q.mod || (q.mod === "intimacy" && intimacy))
    .map(q => resolveStage(resolveGender(q, gender), gender, stage));
}

/** True if these answers contain any v4-only item. */
export function isV4Answers(answers) {
  return Object.keys(answers || {}).some(id => V4_ONLY_IDS.has(id));
}

/**
 * The axis loads for one answered item, given the gender the person took it
 * under. Returns {} for anything unloaded. Kept here rather than in
 * scoring-v4.js so the loads live next to the wording they belong to.
 */
export function axisLoadFor(id, value, gender) {
  const q = QUESTIONS_V4.find(x => x.id === id);
  if (!q) return {};
  const r = resolveGender(q, gender);
  const opt = (r.opts || []).find(o => o.v === value);
  return (opt && opt.ax) || {};
}

// ── Self-checks: fail loudly at load rather than silently mis-scoring ────
{
  const ids = new Set();
  for (const q of QUESTIONS_V4) {
    if (ids.has(q.id)) throw new Error(`questions-v4: duplicate id "${q.id}"`);
    ids.add(q.id);
  }
  for (const [id, target] of PAIRS_V3)
    if (!ids.has(target)) throw new Error(`questions-v4: "${id}" pairs with missing "${target}"`);

  // A rewrite that targets an id which no longer exists is a silent no-op.
  for (const id of Object.keys(REWRITES_V4))
    if (!BANK_V3.some(q => q.id === id))
      throw new Error(`questions-v4: rewrite targets unknown id "${id}"`);

  for (const q of QUESTIONS_V4) {
    for (const g of GENDER_KEYS) {
      const r = resolveGender(q, g);
      if (r.gv) throw new Error(`questions-v4: "${q.id}" leaked gv after resolution`);
      if (!r.en || !r.ar) throw new Error(`questions-v4: "${q.id}" missing text for gender "${g}"`);
      if (r.type === "mcq" && !(r.opts && r.opts.length))
        throw new Error(`questions-v4: "${q.id}" is mcq with no options for gender "${g}"`);
      // Gender variants must offer the same score values, or the two versions
      // are not the same question and cannot be compared across partners.
      if (q.gv && r.opts) {
        const base = (q.gv.n.opts || []).map(o => o.v).join(",");
        if (base && r.opts.map(o => o.v).join(",") !== base)
          throw new Error(`questions-v4: "${q.id}" gender variants have different score values`);
      }
    }
  }

  // Every axis must be loaded on enough items to ever clear AXIS_MIN_ITEMS.
  for (const a of AXES)
    if (AXIS_ITEM_IDS[a].length < AXIS_MIN_ITEMS)
      throw new Error(`questions-v4: axis "${a}" loaded on only ${AXIS_ITEM_IDS[a].length} items, needs ${AXIS_MIN_ITEMS}`);

  // ── stage layer ──────────────────────────────────────────────────────
  for (const key of Object.keys(PROSPECTIVE)) {
    const [id, g] = key.split("|");
    if (!ids.has(id)) throw new Error(`questions-v4: PROSPECTIVE targets unknown id "${id}"`);
    if (!GENDER_KEYS.includes(g)) throw new Error(`questions-v4: PROSPECTIVE "${key}" has an unknown gender variant`);
    const base = resolveGender(QUESTIONS_V4.find(q => q.id === id), g);
    const o = PROSPECTIVE[key];
    if ((o.en && !o.ar) || (o.ar && !o.en))
      throw new Error(`questions-v4: PROSPECTIVE "${key}" has only one language`);
    for (const v of Object.keys(o.opts || {}))
      if (!(base.opts || []).some(x => String(x.v) === v))
        throw new Error(`questions-v4: PROSPECTIVE "${key}" rewrites option value ${v}, which this item does not have`);
  }

  // Stage must never change what is scored — only how it reads.
  for (const g of GENDER_KEYS) for (const st of ["pre", "was"]) {
    const now = buildBankV4({ gender: g === "n" ? null : g, intimacy: true });
    const later = buildBankV4({ gender: g === "n" ? null : g, stage: st, intimacy: true });
    if (now.length !== later.length) throw new Error("questions-v4: stage changed the item count");
    for (let i = 0; i < now.length; i++) {
      if (now[i].id !== later[i].id) throw new Error("questions-v4: stage changed the item order");
      const a = (now[i].opts || []).map(o => o.v).join(",");
      const b = (later[i].opts || []).map(o => o.v).join(",");
      if (a !== b) throw new Error(`questions-v4: stage changed the score values of "${now[i].id}"`);
      if (JSON.stringify((now[i].opts || []).map(o => o.ax || null)) !== JSON.stringify((later[i].opts || []).map(o => o.ax || null)))
        throw new Error(`questions-v4: stage changed the axis loads of "${now[i].id}"`);
    }
  }
}
