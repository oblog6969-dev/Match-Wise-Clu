// MatchWise scoring & compatibility engine
import { QUESTIONS } from "./questions.js";

const byId = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

// Normalize a raw answer to 1–7 (reverse-scored handled here)
function norm(q, v) {
  if (v == null || typeof v !== "number") return null;
  return q.rv ? 8 - v : v;
}

// Pairwise score for one question: 0..1 (null = not scored)
export function questionScore(q, a, b) {
  if (q.mt === "info") return null;
  const va = norm(q, a), vb = norm(q, b);
  if (va == null || vb == null) return null;
  const d = Math.abs(va - vb); // 0..6
  if (q.mt === "sim")  return 1 - d / 6;
  if (q.mt === "comp") return 1 - Math.abs(d - 2) / 5; // moderate difference is fine
  if (q.mt === "tol")  return d <= 2 ? 1 : 1 - (d - 2) / 4; // free band, then penalty
  return null;
}

// Confidence per profile: base 90, −10 per contradicted consistency pair
export function profileConfidence(answers) {
  let conf = 90;
  for (const q of QUESTIONS) {
    if (!q.pair) continue;
    const twin = byId[q.pair];
    const v1 = norm(q, answers[q.id]);
    const v2 = norm(twin, answers[twin.id]);
    if (v1 != null && v2 != null && Math.abs(v1 - v2) >= 3) conf -= 10;
  }
  const answered = QUESTIONS.filter(q => answers[q.id] != null).length;
  conf -= Math.round((1 - answered / QUESTIONS.length) * 30); // penalty for skips
  return Math.max(35, conf);
}

// Big Five estimate (0–100 per trait) from tagged questions
export function bigFive(answers) {
  const acc = {}; // trait -> [sum, n]
  for (const q of QUESTIONS) {
    if (!q.trait) continue;
    const v = answers[q.id];
    if (v == null) continue;
    const key = q.trait[0];
    const val = q.trait[1] === "-" ? 8 - v : v;
    (acc[key] ||= [0, 0]); acc[key][0] += val; acc[key][1]++;
  }
  const out = {};
  for (const k in acc) out[k] = Math.round(((acc[k][0] / acc[k][1]) - 1) / 6 * 100);
  return out; // O C E A N (subset that has data)
}

export function loveLanguage(answers) {
  return answers["e1"] || null; // categorical key
}

// Single-profile summary — no partner needed.
// Returns the person's own leanings, traits and any self-contradictions.
export function soloSummary(p) {
  const cats = {};
  const answers = [];   // every question with the option the person chose

  for (const q of QUESTIONS) {
    const raw = p.answers[q.id];
    // human-readable chosen answer
    let chosen = null;
    if (raw != null) {
      if (q.type === "likert") chosen = { likert: raw };
      else {
        const o = q.opts.find(o => ("v" in o ? o.v : o.k) === raw);
        if (o) chosen = { opt: o };
      }
    }
    answers.push({ q, chosen });

    if (q.mt === "info" || !q.w) continue;
    const v = norm(q, raw);
    if (v == null) continue;
    (cats[q.cat] ||= { sum: 0, w: 0 });
    cats[q.cat].sum += ((v - 1) / 6) * q.w;
    cats[q.cat].w += q.w;
  }

  const catLean = {};
  for (const c in cats) catLean[c] = Math.round(cats[c].sum / cats[c].w * 100);

  // consistency pairs that disagreed
  const flags = [];
  for (const q of QUESTIONS) {
    if (!q.pair) continue;
    const twin = byId[q.pair];
    const a = norm(q, p.answers[q.id]), b = norm(twin, p.answers[twin.id]);
    if (a != null && b != null && Math.abs(a - b) >= 3) flags.push([q, twin]);
  }

  return {
    catLean, answers, flags,
    bigFive: bigFive(p.answers),
    love: loveLanguage(p.answers),
    confidence: profileConfidence(p.answers),
    answered: QUESTIONS.filter(q => p.answers[q.id] != null).length,
    total: QUESTIONS.length,
  };
}

// Full comparison of two profiles { name, answers }
export function compare(pa, pb) {
  const cats = {};     // cat -> {sum, w}
  const perQ = [];     // detailed rows
  const alerts = [];   // deal-breaker mismatches

  for (const q of QUESTIONS) {
    const s = questionScore(q, pa.answers[q.id], pb.answers[q.id]);
    if (s == null) continue;
    (cats[q.cat] ||= { sum: 0, w: 0 });
    cats[q.cat].sum += s * q.w;
    cats[q.cat].w += q.w;
    perQ.push({ q, s });
    if (q.db) {
      const d = Math.abs(norm(q, pa.answers[q.id]) - norm(q, pb.answers[q.id]));
      if (d >= 3) alerts.push(q);
    }
  }

  const catScores = {};
  let total = 0, totalW = 0;
  for (const c in cats) {
    catScores[c] = Math.round(cats[c].sum / cats[c].w * 100);
    total += cats[c].sum; totalW += cats[c].w;
  }
  let index = Math.round(total / totalW * 100);
  // Deal-breaker mismatch caps the headline index
  if (alerts.length) index = Math.min(index, 65 - (alerts.length - 1) * 10);

  const confidence = Math.min(profileConfidence(pa.answers), profileConfidence(pb.answers));

  // Topics to discuss: lowest-scoring weighted questions (excluding info)
  const topics = perQ
    .filter(r => r.s < 0.55 && r.q.w >= 2)
    .sort((x, y) => x.s - y.s)
    .slice(0, 6)
    .map(r => r.q);

  const sorted = Object.entries(catScores).sort((a, b) => b[1] - a[1]);
  return {
    index, confidence, catScores, alerts, topics,
    strengths: sorted.filter(([, v]) => v >= 75).slice(0, 4).map(([c]) => c),
    challenges: sorted.filter(([, v]) => v < 60).map(([c]) => c),
    bigFive: { a: bigFive(pa.answers), b: bigFive(pb.answers) },
    love: { a: loveLanguage(pa.answers), b: loveLanguage(pb.answers) },
  };
}
