// MatchWise question bank — bilingual (EN/AR)
// Fields:
//  id, cat, type: "likert" | "mcq"
//  mt (match type): "sim" = similarity, "comp" = complementarity ok,
//                   "tol" = tolerance range, "info" = reported only, not scored
//  w: weight 1–3 | db: deal-breaker flag | rv: reverse-scored
//  pair: id of consistency-check twin (contradiction lowers confidence)
//  trait: Big Five tag O/C/E/A/N (+/- direction)
// mcq options: { v: 1–7 scale value, en, ar }  (or k: key for "info")

export const QUESTIONS = [

// ── Personality (Big Five) ──────────────────────────────
{ id:"p1", cat:"personality", type:"likert", mt:"tol", w:1, trait:"E+",
  en:"I enjoy meeting new people and being in social gatherings.",
  ar:"أستمتع بلقاء أشخاص جدد وبالتجمعات الاجتماعية." },
{ id:"p2", cat:"personality", type:"likert", mt:"tol", w:1, trait:"C+",
  en:"I keep my plans organized and finish what I start.",
  ar:"أنظّم خططي وأُنهي ما أبدأه." },
{ id:"p3", cat:"personality", type:"likert", mt:"tol", w:1, trait:"N+",
  en:"I often worry about things that might go wrong.",
  ar:"كثيرًا ما أقلق بشأن أمور قد تسوء." },
{ id:"p4", cat:"personality", type:"likert", mt:"sim", w:1, trait:"O+",
  en:"I enjoy discussing new ideas, art, or different ways of living.",
  ar:"أستمتع بالنقاش حول أفكار جديدة أو فنون أو أساليب حياة مختلفة." },
{ id:"p5", cat:"personality", type:"likert", mt:"sim", w:1, trait:"A+",
  en:"People close to me would describe me as warm and cooperative.",
  ar:"يصفني المقرّبون بأنني ودود ومتعاون." },

// ── Communication ───────────────────────────────────────
{ id:"c1", cat:"communication", type:"mcq", mt:"sim", w:2,
  en:"Something your partner did bothered you. What do you usually do?",
  ar:"أزعجك تصرّف من شريكك. ماذا تفعل عادة؟",
  opts:[
    { v:7, en:"Bring it up calmly soon after", ar:"أطرح الموضوع بهدوء بعدها بقليل" },
    { v:5, en:"Wait for the right moment, then talk", ar:"أنتظر اللحظة المناسبة ثم أتحدث" },
    { v:3, en:"Drop hints and hope they notice", ar:"أُلمّح وأتمنى أن يلاحظ" },
    { v:1, en:"Keep it to myself", ar:"أحتفظ به لنفسي" } ] },
{ id:"c2", cat:"communication", type:"likert", mt:"sim", w:2,
  en:"I find it easy to talk about my feelings.",
  ar:"أجد سهولة في التحدث عن مشاعري." },
{ id:"c3", cat:"communication", type:"mcq", mt:"tol", w:2,
  en:"After a truly terrible day, I mostly want to:",
  ar:"بعد يوم سيّئ جدًا، أرغب غالبًا في أن:",
  opts:[
    { v:7, en:"Talk it through with my partner", ar:"أتحدث عنه مع شريكي" },
    { v:4, en:"Be alone first, then talk", ar:"أبقى وحدي أولًا ثم أتحدث" },
    { v:1, en:"Be left alone until it passes", ar:"أُترك وحدي حتى يمرّ" } ] },
{ id:"c4", cat:"communication", type:"likert", mt:"sim", w:1, rv:true, pair:"c2",
  en:"I tend to keep my feelings to myself, even with people close to me.",
  ar:"أميل إلى الاحتفاظ بمشاعري لنفسي حتى مع المقرّبين مني." },

// ── Conflict & repair ───────────────────────────────────
{ id:"k1", cat:"conflict", type:"mcq", mt:"tol", w:2,
  en:"During a heated disagreement, I usually:",
  ar:"أثناء خلاف محتدم، عادة ما:",
  opts:[
    { v:7, en:"Stay calm and keep discussing", ar:"أبقى هادئًا وأواصل النقاش" },
    { v:5, en:"Ask for a break, then come back to it", ar:"أطلب استراحة ثم أعود للموضوع" },
    { v:3, en:"Get loud, then cool down quickly", ar:"يرتفع صوتي ثم أهدأ سريعًا" },
    { v:1, en:"Go silent and withdraw", ar:"أصمت وأنسحب" } ] },
{ id:"k2", cat:"conflict", type:"mcq", mt:"comp", w:2,
  en:"After a fight, who usually breaks the silence first?",
  ar:"بعد الخلاف، من يكسر الصمت أولًا عادة؟",
  opts:[
    { v:7, en:"Usually me", ar:"غالبًا أنا" },
    { v:5, en:"Depends on who was wrong", ar:"حسب من كان مخطئًا" },
    { v:3, en:"Rarely me", ar:"نادرًا ما أكون أنا" },
    { v:1, en:"I wait for an apology", ar:"أنتظر اعتذارًا" } ] },
{ id:"k3", cat:"conflict", type:"likert", mt:"sim", w:2,
  en:"I can apologize first, even when I think I'm mostly right.",
  ar:"أستطيع الاعتذار أولًا حتى وإن كنت أظن أنني على حق غالبًا." },
{ id:"k4", cat:"conflict", type:"likert", mt:"tol", w:1, rv:true, trait:"N+",
  en:"Small annoyances build up inside me until I explode.",
  ar:"تتراكم المضايقات الصغيرة في داخلي حتى أنفجر." },

// ── Money ───────────────────────────────────────────────
{ id:"m1", cat:"money", type:"mcq", mt:"tol", w:2,
  en:"You receive an unexpected bonus equal to a month's salary. Your first instinct:",
  ar:"حصلت على مكافأة مفاجئة تعادل راتب شهر. أول ما يخطر لك:",
  opts:[
    { v:7, en:"Save or invest almost all of it", ar:"ادخار أو استثمار معظمها" },
    { v:5, en:"Save most, enjoy a little", ar:"ادخار الأغلب والاستمتاع بجزء بسيط" },
    { v:3, en:"Half saving, half enjoying", ar:"نصف ادخار ونصف استمتاع" },
    { v:1, en:"Mostly enjoy it — money is for living", ar:"الاستمتاع بها غالبًا — المال للعيش" } ] },
{ id:"m2", cat:"money", type:"likert", mt:"tol", w:2,
  en:"I'm comfortable taking on debt if it improves our quality of life.",
  ar:"لا مانع لدي من الاقتراض إذا كان سيحسّن جودة حياتنا." },
{ id:"m3", cat:"money", type:"mcq", mt:"sim", w:3,
  en:"In marriage, money should be:",
  ar:"في الزواج، يجب أن يكون المال:",
  opts:[
    { v:7, en:"Fully shared — one pot", ar:"مشتركًا بالكامل — حساب واحد" },
    { v:5, en:"Shared, with personal allowances", ar:"مشتركًا مع مصروف شخصي لكل طرف" },
    { v:2, en:"Mostly separate accounts", ar:"حسابات منفصلة غالبًا" } ] },
{ id:"m4", cat:"money", type:"likert", mt:"tol", w:1, rv:true, pair:"m2",
  en:"I check prices and stick to a budget before most purchases.",
  ar:"أتحقق من الأسعار وألتزم بميزانية قبل معظم المشتريات." },

// ── Lifestyle ───────────────────────────────────────────
{ id:"l1", cat:"lifestyle", type:"mcq", mt:"tol", w:2,
  en:"My ideal weekend looks like:",
  ar:"عطلتي المثالية تبدو هكذا:",
  opts:[
    { v:7, en:"Out — friends, events, new places", ar:"في الخارج — أصدقاء وفعاليات وأماكن جديدة" },
    { v:4, en:"A mix of going out and home time", ar:"مزيج من الخروج والبقاء في المنزل" },
    { v:1, en:"Quiet time at home", ar:"وقت هادئ في المنزل" } ] },
{ id:"l2", cat:"lifestyle", type:"likert", mt:"tol", w:1,
  en:"I like my daily routine stable and predictable.",
  ar:"أحب أن يكون روتيني اليومي ثابتًا ومتوقعًا." },
{ id:"l3", cat:"lifestyle", type:"likert", mt:"sim", w:2,
  en:"A tidy, organized home matters a lot to me.",
  ar:"البيت المرتب والمنظم مهم جدًا بالنسبة لي." },
{ id:"l4", cat:"lifestyle", type:"likert", mt:"tol", w:1,
  en:"Health and fitness are a central part of my life.",
  ar:"الصحة واللياقة جزء أساسي من حياتي." },

// ── Family & children ───────────────────────────────────
{ id:"f1", cat:"family", type:"mcq", mt:"sim", w:3, db:true,
  en:"Do you want children?",
  ar:"هل ترغب في إنجاب أطفال؟",
  opts:[
    { v:7, en:"Definitely yes", ar:"نعم بالتأكيد" },
    { v:5, en:"Probably yes", ar:"على الأرجح نعم" },
    { v:4, en:"Not sure yet", ar:"لست متأكدًا بعد" },
    { v:2, en:"Probably not", ar:"على الأرجح لا" },
    { v:1, en:"No", ar:"لا" } ] },
{ id:"f2", cat:"family", type:"mcq", mt:"sim", w:2,
  en:"How involved should parents and in-laws be in a couple's life?",
  ar:"ما مدى مشاركة الأهل وأهل الشريك في حياة الزوجين؟",
  opts:[
    { v:7, en:"Very close — family is part of everything", ar:"قريبة جدًا — العائلة جزء من كل شيء" },
    { v:4, en:"Consulted on big decisions only", ar:"استشارتهم في القرارات الكبيرة فقط" },
    { v:1, en:"The couple stays fully independent", ar:"يبقى الزوجان مستقلين تمامًا" } ] },
{ id:"f3", cat:"family", type:"likert", mt:"sim", w:1,
  en:"Family gatherings and duties are a priority, even when inconvenient.",
  ar:"تجمّعات العائلة وواجباتها أولوية حتى عندما تكون غير مريحة." },

// ── Values & religion ───────────────────────────────────
{ id:"v1", cat:"values", type:"mcq", mt:"sim", w:3, db:true,
  en:"Religion in my daily life is:",
  ar:"الدين في حياتي اليومية:",
  opts:[
    { v:7, en:"Central — I practice regularly", ar:"محوري — أمارس شعائري بانتظام" },
    { v:5, en:"Important, but I'm flexible", ar:"مهم، لكنني مرن" },
    { v:3, en:"Cultural / on occasions", ar:"ثقافي / في المناسبات" },
    { v:1, en:"Not part of my life", ar:"ليس جزءًا من حياتي" } ] },
{ id:"v2", cat:"values", type:"likert", mt:"sim", w:2,
  en:"I expect my partner to share my level of religious practice.",
  ar:"أتوقع من شريكي أن يشاركني مستوى التزامي الديني." },
{ id:"v3", cat:"values", type:"likert", mt:"sim", w:1,
  en:"Honesty matters more to me than sparing someone's feelings.",
  ar:"الصدق أهم عندي من مجاملة مشاعر الآخرين." },

// ── Career & ambition ───────────────────────────────────
{ id:"r1", cat:"career", type:"likert", mt:"tol", w:2,
  en:"My career is a core part of who I am.",
  ar:"عملي جزء أساسي من هويتي." },
{ id:"r2", cat:"career", type:"mcq", mt:"tol", w:2,
  en:"A big opportunity at work would demand very long hours for a year. You:",
  ar:"فرصة عمل كبيرة تتطلب ساعات طويلة جدًا لمدة سنة. أنت:",
  opts:[
    { v:7, en:"Take it — sacrifices now pay off later", ar:"أقبلها — التضحية الآن تُثمر لاحقًا" },
    { v:4, en:"Take it only if we agree together on limits", ar:"أقبلها فقط إذا اتفقنا معًا على حدود" },
    { v:1, en:"Decline — time together comes first", ar:"أرفضها — وقتنا معًا أولًا" } ] },
{ id:"r3", cat:"career", type:"likert", mt:"sim", w:2,
  en:"I would slow down my career for our family when needed.",
  ar:"سأبطئ مسيرتي المهنية من أجل عائلتنا عند الحاجة." },

// ── Trust & boundaries ──────────────────────────────────
{ id:"t1", cat:"trust", type:"likert", mt:"sim", w:2,
  en:"My partner should be able to look at my phone at any time.",
  ar:"يجب أن يكون بإمكان شريكي الاطلاع على هاتفي في أي وقت." },
{ id:"t2", cat:"trust", type:"mcq", mt:"sim", w:2,
  en:"Your partner has a close friend of the opposite sex. You feel:",
  ar:"لدى شريكك صديق مقرّب من الجنس الآخر. تشعر بأن ذلك:",
  opts:[
    { v:7, en:"Fine — trust is the foundation", ar:"طبيعي — الثقة هي الأساس" },
    { v:5, en:"OK within clear limits", ar:"مقبول ضمن حدود واضحة" },
    { v:2, en:"Uncomfortable for me", ar:"غير مريح لي" } ] },
{ id:"t3", cat:"trust", type:"likert", mt:"sim", w:1,
  en:"Each partner needs some private time and personal space.",
  ar:"كل طرف يحتاج بعض الوقت الخاص والمساحة الشخصية." },
{ id:"t4", cat:"trust", type:"likert", mt:"sim", w:1, rv:true, pair:"t1",
  en:"Some parts of my life should stay private, even from my partner.",
  ar:"بعض جوانب حياتي يجب أن تبقى خاصة حتى عن شريكي." },

// ── Emotional needs ─────────────────────────────────────
{ id:"e1", cat:"emotional", type:"mcq", mt:"info", w:0,
  en:"I feel most loved when my partner:",
  ar:"أشعر بالحب أكثر عندما يقوم شريكي بـ:",
  opts:[
    { k:"words",  en:"Says appreciative, loving words", ar:"قول كلمات محبة وتقدير" },
    { k:"time",   en:"Spends real quality time with me", ar:"قضاء وقت نوعي حقيقي معي" },
    { k:"acts",   en:"Does helpful things for me", ar:"القيام بأمور تساعدني" },
    { k:"touch",  en:"Shows physical affection", ar:"التعبير الجسدي عن الحنان" },
    { k:"gifts",  en:"Gives thoughtful gifts", ar:"تقديم هدايا مدروسة" } ] },
{ id:"e2", cat:"emotional", type:"likert", mt:"tol", w:2,
  en:"I need frequent verbal reassurance in a relationship.",
  ar:"أحتاج إلى طمأنة لفظية متكررة في العلاقة." },
{ id:"e3", cat:"emotional", type:"likert", mt:"sim", w:1,
  en:"When my partner is upset, I usually know how to comfort them.",
  ar:"عندما يكون شريكي منزعجًا، أعرف عادة كيف أواسيه." },
{ id:"e4", cat:"emotional", type:"likert", mt:"sim", w:2,
  en:"It's easy for me to depend on my partner, and for them to depend on me.",
  ar:"من السهل عليّ أن أعتمد على شريكي وأن يعتمد هو عليّ." },

// ── Adaptability & growth (indirect scenarios) ──────────
{ id:"g1", cat:"growth", type:"mcq", mt:"sim", w:2, db:true,
  en:"Your partner gets a great job offer in another city. Your first thought:",
  ar:"حصل شريكك على عرض عمل ممتاز في مدينة أخرى. أول ما يخطر لك:",
  opts:[
    { v:7, en:"An exciting adventure — let's plan it", ar:"مغامرة مشوّقة — لنخطط لها" },
    { v:5, en:"Open to it, but genuinely worried", ar:"منفتح على الفكرة لكنني قلق فعلًا" },
    { v:2, en:"They should refuse — stability comes first", ar:"يجب أن يرفض — الاستقرار أولًا" } ] },
{ id:"g2", cat:"growth", type:"mcq", mt:"sim", w:2,
  en:"Your partner wants to leave a stable job to start their own business. You:",
  ar:"يريد شريكك ترك وظيفة مستقرة ليبدأ مشروعه الخاص. أنت:",
  opts:[
    { v:7, en:"Support fully and plan the risks together", ar:"أدعمه بالكامل ونخطط للمخاطر معًا" },
    { v:5, en:"Support it if the plan convinces me", ar:"أدعمه إذا أقنعتني الخطة" },
    { v:3, en:"Worry quietly but say nothing", ar:"أقلق بصمت دون أن أتكلم" },
    { v:1, en:"Oppose it — stability matters more", ar:"أعارض — الاستقرار أهم" } ] },
{ id:"g3", cat:"growth", type:"mcq", mt:"sim", w:2,
  en:"Your partner suggests a food, hobby, or trip you've never tried. You usually:",
  ar:"يقترح شريكك طعامًا أو هواية أو رحلة لم تجرّبها من قبل. عادة أنت:",
  opts:[
    { v:7, en:"Get excited — I love trying new things", ar:"أتحمّس — أحب تجربة الجديد" },
    { v:5, en:"Try it sometimes, cautiously", ar:"أجرّب أحيانًا وبحذر" },
    { v:2, en:"Prefer what I already know", ar:"أفضّل ما أعرفه مسبقًا" } ] },
{ id:"g4", cat:"growth", type:"likert", mt:"tol", w:2, trait:"O+",
  en:"When life changes suddenly, I adapt quickly.",
  ar:"عندما تتغير الحياة فجأة، أتكيّف بسرعة." },
{ id:"g5", cat:"growth", type:"likert", mt:"sim", w:2,
  en:"I regularly notice and thank my partner for the small things.",
  ar:"ألاحظ بانتظام الأشياء الصغيرة التي يفعلها شريكي وأشكره عليها." },
{ id:"g6", cat:"growth", type:"likert", mt:"tol", w:1, rv:true, pair:"g4",
  en:"Unexpected changes to my plans stress me a lot.",
  ar:"التغييرات المفاجئة في خططي تسبب لي توترًا كبيرًا." },

// ── Future planning ─────────────────────────────────────
{ id:"u1", cat:"future", type:"mcq", mt:"sim", w:2,
  en:"Ten years from now, I picture us:",
  ar:"بعد عشر سنوات، أتخيلنا:",
  opts:[
    { v:2, en:"Settled in one place with deep roots", ar:"مستقرين في مكان واحد بجذور راسخة" },
    { v:5, en:"A balance of stability and new experiences", ar:"في توازن بين الاستقرار والتجارب الجديدة" },
    { v:7, en:"Flexible — exploring wherever life leads", ar:"مرنين — نستكشف حيث تأخذنا الحياة" } ] },
{ id:"u2", cat:"future", type:"likert", mt:"tol", w:1,
  en:"I have clear goals for the next five years.",
  ar:"لدي أهداف واضحة للسنوات الخمس القادمة." },
{ id:"u3", cat:"future", type:"likert", mt:"sim", w:2,
  en:"Big decisions — like major purchases — should always be made together.",
  ar:"القرارات الكبيرة — كالمشتريات الضخمة — يجب أن تُتخذ دائمًا معًا." },
];
