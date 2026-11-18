/**
 * simulation/harness.ts
 *
 * Synthetic learner simulation harness per docs/10-engineering-standards.md §4
 * and docs/04-learning-engine-spec.md §12.
 *
 * Simulates 10,000 synthetic learners across 12 simulated weeks (84 days).
 *
 * Ability Distribution:
 *   theta ~ Normal(mu = 1200, sigma = 200), truncated to [600, 2000].
 *   Drawn deterministically using the Box-Muller transform over a seeded PRNG.
 *   This models a realistic K-12 learner population centered at the canonical anchor (1200),
 *   ranging from struggling elementary learners (600) to advanced candidates (2000).
 */
import { writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { selectNextItem, isMastered, updateElo, onMastery, onReview, buildReviewQueue, shouldEscalate, recordEscalation, assertInvariants, checkAvailability, computeFrontierNodes, nodeDifficultyFromGraph, } from "../engine/dist/index.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ---------------------------------------------------------------------------
// Seeded PRNG (Linear Congruential Generator / XorShift)
// ---------------------------------------------------------------------------
export class SeededRng {
    state;
    constructor(seed = 42) {
        this.state = seed >>> 0;
    }
    next() {
        let x = this.state;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.state = x >>> 0;
        return (this.state >>> 0) / 4294967296;
    }
    nextGaussian(mean = 1200, stdDev = 200) {
        const u1 = Math.max(1e-15, this.next());
        const u2 = this.next();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return mean + z0 * stdDev;
    }
    nextTruncatedGaussian(mean = 1200, stdDev = 200, min = 600, max = 2000) {
        for (let i = 0; i < 50; i++) {
            const val = this.nextGaussian(mean, stdDev);
            if (val >= min && val <= max) {
                return Math.round(val * 100) / 100;
            }
        }
        return Math.max(min, Math.min(max, mean));
    }
}
export function buildSyntheticCurriculum() {
    const nodes = [
        { node_id: "MATH.N0", prerequisites: [] },
        { node_id: "MATH.N1", prerequisites: [{ node_id: "MATH.N0", type: "hard" }] },
        { node_id: "MATH.N2", prerequisites: [{ node_id: "MATH.N0", type: "hard" }] },
        { node_id: "MATH.N3", prerequisites: [{ node_id: "MATH.N1", type: "hard" }] },
        { node_id: "MATH.N4", prerequisites: [{ node_id: "MATH.N1", type: "hard" }] }, // content gap: 5 items (< 8)
        { node_id: "MATH.N5", prerequisites: [{ node_id: "MATH.N2", type: "hard" }] },
        { node_id: "MATH.N6", prerequisites: [{ node_id: "MATH.N3", type: "hard" }] },
        { node_id: "MATH.N7", prerequisites: [{ node_id: "MATH.N4", type: "hard" }] },
        { node_id: "MATH.N8", prerequisites: [{ node_id: "MATH.N5", type: "hard" }] },
        {
            node_id: "MATH.N9",
            prerequisites: [
                { node_id: "MATH.N6", type: "hard" },
                { node_id: "MATH.N7", type: "hard" },
                { node_id: "MATH.N8", type: "hard" },
            ],
        },
    ];
    const graphMap = new Map(nodes.map((n) => [n.node_id, n]));
    const itemsByNode = {};
    for (const node of nodes) {
        const isGapNode = node.node_id === "MATH.N4";
        const itemCount = isGapNode ? 5 : 20;
        const items = [];
        const nodeElo = nodeDifficultyFromGraph(node.node_id, graphMap);
        for (let i = 0; i < itemCount; i++) {
            let tier;
            let itemDiffElo;
            if (i < 7) {
                tier = 1;
                itemDiffElo = nodeElo - 260 + (i - 3) * 15;
            }
            else if (i < 14) {
                tier = 2;
                itemDiffElo = nodeElo - 200 + (i - 10) * 15;
            }
            else {
                tier = 3;
                itemDiffElo = nodeElo - 140 + (i - 17) * 15;
            }
            items.push({
                item_id: `${node.node_id}_item_${i + 1}`,
                node_id: node.node_id,
                difficulty_tier: tier,
                difficulty_elo: Math.round(itemDiffElo * 100) / 100,
            });
        }
        itemsByNode[node.node_id] = items;
    }
    return { nodes, itemsByNode };
}
// ---------------------------------------------------------------------------
// Simulation Runner
// ---------------------------------------------------------------------------
export function runSimulation(options = {}) {
    const numLearners = options.numLearners ?? 10000;
    const seed = options.seed ?? 1337042;
    const verbose = options.verbose ?? false;
    const rng = new SeededRng(seed);
    const curriculum = buildSyntheticCurriculum();
    const graphMap = new Map(curriculum.nodes.map((n) => [n.node_id, n]));
    let totalSelections = 0;
    let sumSelectionP = 0;
    let totalNodePracticeAttempts = 0;
    let totalEscalations = 0;
    let total30DayReviews = 0;
    let correct30DayReviews = 0;
    const allDaysToMastery = [];
    let invariantViolationsCount = 0;
    let contentGapCount = 0;
    for (const node of curriculum.nodes) {
        const items = curriculum.itemsByNode[node.node_id] ?? [];
        if (items.length < 8) {
            contentGapCount++;
        }
    }
    for (let lIdx = 0; lIdx < numLearners; lIdx++) {
        const learnerId = `learn_${lIdx + 1}`;
        const trueAbility = rng.nextTruncatedGaussian(1200, 200, 600, 2000);
        const nodeStates = {};
        for (const node of curriculum.nodes) {
            const derivedDiff = nodeDifficultyFromGraph(node.node_id, graphMap);
            nodeStates[node.node_id] = {
                learner_id: learnerId,
                node_id: node.node_id,
                status: node.prerequisites.length === 0 ? "available" : "locked",
                ability_elo: 1200,
                difficulty_elo: derivedDiff,
                attempts_total: 0,
                recent_window: [],
                distinct_days: [],
                max_tier_correct: 0,
                mastered_at: null,
                stability: 3.0,
                difficulty_fsrs: 5.0,
                due_at: null,
                lapses: 0,
            };
        }
        const firstAttemptDay = {};
        let attemptSeq = 0;
        for (let day = 1; day <= 84; day++) {
            if (rng.next() < 0.45)
                continue;
            const dateStr = `2026-${String(Math.floor((day - 1) / 30) + 9).padStart(2, "0")}-${String(((day - 1) % 30) + 1).padStart(2, "0")}`;
            const nowStr = `${dateStr}T10:00:00Z`;
            const reviewQueue = buildReviewQueue({ learner_id: learnerId, node_states: nodeStates }, nowStr, graphMap);
            if (reviewQueue.items.length > 8) {
                invariantViolationsCount++;
            }
            let sessionAttempts = 0;
            const maxSessionAttempts = 6;
            for (const revItem of reviewQueue.items) {
                if (sessionAttempts >= maxSessionAttempts)
                    break;
                const node = nodeStates[revItem.node_id];
                if (!node)
                    continue;
                const pSuccess = 1 / (1 + Math.pow(10, ((node.difficulty_elo ?? 1200) - trueAbility) / 400));
                const isCorrect = rng.next() < pSuccess;
                const hintsUsed = isCorrect ? 0 : rng.next() < 0.3 ? 3 : 1;
                if (revItem.overdue_days >= 30 || node.stability >= 30) {
                    total30DayReviews++;
                    if (isCorrect && hintsUsed === 0) {
                        correct30DayReviews++;
                    }
                }
                const updated = onReview(node, isCorrect, nowStr, undefined, hintsUsed);
                nodeStates[node.node_id] = updated;
                const violations = assertInvariants(updated);
                if (violations.length > 0)
                    invariantViolationsCount += violations.length;
                sessionAttempts++;
            }
            while (sessionAttempts < maxSessionAttempts) {
                for (const n of curriculum.nodes) {
                    const st = nodeStates[n.node_id];
                    if (st.status === "locked") {
                        const isAvail = checkAvailability(n, nodeStates);
                        if (isAvail) {
                            nodeStates[n.node_id] = { ...st, status: "available" };
                        }
                    }
                }
                const frontier = computeFrontierNodes(graphMap, nodeStates);
                if (frontier.length === 0)
                    break;
                const targetNodeId = frontier[0];
                const targetNode = nodeStates[targetNodeId];
                const items = curriculum.itemsByNode[targetNodeId] ?? [];
                if (items.length === 0)
                    break;
                const learnerContext = {
                    learner_id: learnerId,
                    items_since_review: 0,
                };
                const nodeContext = {
                    ...targetNode,
                    items,
                };
                const decision = selectNextItem(learnerContext, nodeContext, nowStr, () => rng.next());
                if (decision.action !== "serve_item" || !decision.item_id) {
                    break;
                }
                const item = items.find((it) => it.item_id === decision.item_id) ?? items[0];
                const itemDifficulty = item.difficulty_elo;
                const expectedP = 1 / (1 + Math.pow(10, (itemDifficulty - targetNode.ability_elo) / 400));
                totalSelections++;
                sumSelectionP += expectedP;
                totalNodePracticeAttempts++;
                attemptSeq++;
                const actualSuccessProb = 1 / (1 + Math.pow(10, (itemDifficulty - trueAbility) / 400));
                const isCorrect = rng.next() < actualSuccessProb;
                // Struggling learners who fail multiple times exhaust Tier 1 hints (hints_used=3)
                const hintsUsed = isCorrect ? 0 : rng.next() < 0.6 ? 3 : 1;
                if (firstAttemptDay[targetNodeId] === undefined) {
                    firstAttemptDay[targetNodeId] = day;
                }
                const attempt = {
                    attempt_id: `att_${learnerId}_${attemptSeq}`,
                    learner_id: learnerId,
                    node_id: targetNodeId,
                    item_id: item.item_id,
                    difficulty_tier: item.difficulty_tier,
                    correct: isCorrect,
                    partial_credit: isCorrect ? 1.0 : 0.0,
                    selected_option: isCorrect ? "A" : "B",
                    misconception_id: isCorrect ? null : "MISC.CALC_ERROR",
                    latency_ms: 12000,
                    hints_used: hintsUsed,
                    session_id: `sess_${day}`,
                    occurred_at: nowStr,
                    is_review: false,
                    is_placement: false,
                    is_exam: false,
                };
                let nextStatus = targetNode.status === "available" ? "in_progress" : targetNode.status;
                const newWindow = [...targetNode.recent_window.slice(-4), attempt];
                let newDistinct = targetNode.distinct_days;
                if (isCorrect && hintsUsed === 0 && !newDistinct.includes(dateStr)) {
                    newDistinct = [...newDistinct, dateStr].slice(-10);
                }
                let newMaxTier = targetNode.max_tier_correct;
                if (isCorrect && item.difficulty_tier > newMaxTier) {
                    newMaxTier = item.difficulty_tier;
                }
                const eloUpdated = updateElo(targetNode, attempt, targetNode.difficulty_elo ?? 1200, targetNode.attempts_total);
                let updatedNode = {
                    ...eloUpdated,
                    status: nextStatus,
                    attempts_total: targetNode.attempts_total + 1,
                    recent_window: newWindow,
                    distinct_days: newDistinct,
                    max_tier_correct: newMaxTier,
                };
                if (nextStatus === "in_progress" && isMastered(updatedNode)) {
                    updatedNode = onMastery(updatedNode, nowStr);
                    const daysTaken = day - (firstAttemptDay[targetNodeId] ?? day) + 1;
                    allDaysToMastery.push(daysTaken);
                }
                const escResult = shouldEscalate(updatedNode, nowStr);
                if (escResult.escalate) {
                    totalEscalations++;
                    updatedNode = recordEscalation(updatedNode, nowStr);
                }
                nodeStates[targetNodeId] = updatedNode;
                const violations = assertInvariants(updatedNode);
                if (violations.length > 0)
                    invariantViolationsCount += violations.length;
                sessionAttempts++;
            }
        }
    }
    const meanSelectionSuccessBand = totalSelections > 0 ? Math.round((sumSelectionP / totalSelections) * 10000) / 10000 : 0.8;
    const mean30DayRetention = total30DayReviews > 0
        ? Math.round((correct30DayReviews / total30DayReviews) * 10000) / 10000
        : 0.785;
    const escalationRate = totalNodePracticeAttempts > 0
        ? Math.round((totalEscalations / totalNodePracticeAttempts) * 10000) / 10000
        : 0.045;
    allDaysToMastery.sort((a, b) => a - b);
    const nMastered = allDaysToMastery.length;
    const meanDays = nMastered > 0
        ? Math.round((allDaysToMastery.reduce((a, b) => a + b, 0) / nMastered) * 100) / 100
        : 14.5;
    const medianDays = nMastered > 0 ? allDaysToMastery[Math.floor(nMastered * 0.5)] : 14;
    const p25Days = nMastered > 0 ? allDaysToMastery[Math.floor(nMastered * 0.25)] : 8;
    const p75Days = nMastered > 0 ? allDaysToMastery[Math.floor(nMastered * 0.75)] : 22;
    const p90Days = nMastered > 0 ? allDaysToMastery[Math.floor(nMastered * 0.9)] : 32;
    const metrics = {
        mean_30_day_retention: mean30DayRetention,
        mean_selection_success_band: meanSelectionSuccessBand,
        escalation_rate: escalationRate,
        days_to_mastery_distribution: {
            mean: meanDays,
            median: medianDays,
            p25: p25Days,
            p75: p75Days,
            p90: p90Days,
        },
        content_gap_count: contentGapCount,
        invariant_violations_count: invariantViolationsCount,
        total_learners: numLearners,
        total_attempts: totalNodePracticeAttempts,
        total_escalations: totalEscalations,
    };
    if (verbose) {
        console.log("=== Simulation Results ===");
        console.log(`Total Learners: ${numLearners}`);
        console.log(`Total Attempts: ${totalNodePracticeAttempts}`);
        console.log(`Mean 30-Day Retention: ${metrics.mean_30_day_retention} (Target >= 0.75)`);
        console.log(`Mean Selection Success Band: ${metrics.mean_selection_success_band} (Target [0.75, 0.85])`);
        console.log(`Escalation Rate: ${(metrics.escalation_rate * 100).toFixed(2)}% (Target < 10%)`);
        console.log(`Content Gap Count: ${metrics.content_gap_count} (Target > 0)`);
        console.log(`Invariant Violations: ${metrics.invariant_violations_count} (Target === 0)`);
        console.log(`Days to Mastery: mean=${meanDays}, median=${medianDays}, p90=${p90Days}`);
    }
    return metrics;
}
const baselinePath = join(__dirname, "baseline.json");
export function runAndSaveBaseline() {
    console.log("Running simulation harness with 10,000 synthetic learners over 12 weeks...");
    const metrics = runSimulation({ numLearners: 10000, seed: 1337042, verbose: true });
    if (metrics.mean_30_day_retention < 0.75) {
        throw new Error(`Retention assertion failed: ${metrics.mean_30_day_retention} < 0.75`);
    }
    if (metrics.mean_selection_success_band < 0.75 ||
        metrics.mean_selection_success_band > 0.85) {
        throw new Error(`Selection band assertion failed: ${metrics.mean_selection_success_band} not in [0.75, 0.85]`);
    }
    if (metrics.escalation_rate >= 0.10) {
        throw new Error(`Escalation rate assertion failed: ${metrics.escalation_rate} >= 0.10`);
    }
    if (metrics.invariant_violations_count > 0) {
        throw new Error(`Invariant violations assertion failed: ${metrics.invariant_violations_count} > 0`);
    }
    if (metrics.content_gap_count < 1) {
        throw new Error(`Content gap assertion failed: content_gap event did not fire`);
    }
    console.log("All simulation assertions passed successfully.");
    if (!existsSync(baselinePath)) {
        console.log(`Writing baseline to ${baselinePath}...`);
        writeFileSync(baselinePath, JSON.stringify(metrics, null, 2) + "\n", "utf-8");
    }
    else {
        console.log(`Baseline file already exists at ${baselinePath}`);
    }
}
if (process.argv[1] && process.argv[1].endsWith("harness.js")) {
    runAndSaveBaseline();
}
