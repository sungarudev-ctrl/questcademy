// Deterministic generator for shared/testdata/attempt_log.json (1000 attempts: placement, practice, reviews, lapses).
// Seeded LCG so the file is reproducible; the checked-in file is the contract, this is how it was made.
import { writeFileSync } from "node:fs";

let seed = 20260901;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const nodes = ["MATH.FRAC.EQUIV", "MATH.FRAC.ADD_UNLIKE", "MATH.FRAC.MULT", "MATH.DEC.PLACE"];
const learners = ["learner-parity-1", "learner-parity-2"];
const attempts = [];
const base = Date.parse("2026-09-01T08:00:00Z");
for (let i = 0; i < 1000; i++) {
  const learner = learners[i % 2];
  const node = nodes[Math.floor(i / 250)];
  const day = Math.floor(i / 20);
  const occurred = new Date(base + day * 86400000 + (i % 20) * 300000).toISOString().replace(".000Z", "Z");
  const phase = i % 250;
  const isPlacement = phase < 15;
  const isReview = !isPlacement && phase % 9 === 0;
  const tier = 1 + Math.floor(rnd() * 3);
  const correct = rnd() < (phase > 120 && phase < 140 ? 0.2 : 0.78);
  attempts.push({
    attempt_id: `parity-${String(i).padStart(4, "0")}`,
    learner_id: learner,
    node_id: node,
    item_id: `item-${node}-${i % 30}`,
    difficulty_tier: tier,
    correct,
    partial_credit: correct ? 1.0 : 0.0,
    selected_option: correct ? "A" : "B",
    misconception_id: correct ? null : "MISC.PARITY",
    latency_ms: 4000 + Math.floor(rnd() * 20000),
    hints_used: rnd() < 0.1 ? 1 : 0,
    session_id: `sess-${day}`,
    occurred_at: occurred,
    is_review: isReview,
    is_placement: isPlacement,
    is_exam: false,
  });
}
writeFileSync(new URL("./attempt_log.json", import.meta.url), JSON.stringify({ attempts }, null, 1));
