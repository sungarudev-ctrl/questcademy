import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { replay } from "../replay.mjs";

const log = JSON.parse(readFileSync(new URL("../../shared/testdata/attempt_log.json", import.meta.url)));
const golden = readFileSync(new URL("../../shared/testdata/attempt_log.hash", import.meta.url), "utf8").trim();

function shuffled(arr) {
  const a = [...arr];
  let s = 7;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

test("parity: replay of the 1000-attempt log matches the golden hash", () => {
  assert.equal(log.attempts.length, 1000);
  assert.equal(replay(log).hash, golden);
});

test("out-of-order batch yields the same state as an ordered batch", () => {
  assert.equal(replay({ attempts: shuffled(log.attempts) }).hash, golden);
});

test("duplicate delivery is idempotent (I-8)", () => {
  const doubled = [...log.attempts, ...log.attempts.slice(0, 200)];
  const r = replay({ attempts: doubled });
  assert.equal(r.hash, golden);
  assert.equal(r.skipped_duplicates.length, 200);
});

test("excluded attempts never touch state", () => {
  const withBad = [...log.attempts];
  const ex = log.attempts.slice(-5).map((a) => a.attempt_id);
  const r = replay({ attempts: withBad, excluded_attempt_ids: ex });
  assert.notEqual(r.hash, golden);
  assert.equal(r.applied.length, 995);
  assert.equal(r.hash, replay({ attempts: log.attempts.slice(0, 995) }).hash);
});

test("learners are isolated (profile switch)", () => {
  const one = log.attempts.filter((a) => a.learner_id === "learner-parity-1");
  const mixed = replay(log).learners["learner-parity-1"].hash;
  assert.equal(replay({ attempts: one }).learners["learner-parity-1"].hash, mixed);
});
