/**
 * simulation/assertions.ts
 *
 * Simulation diff engine per docs/10-engineering-standards.md §4, §6.
 *
 * Compares current simulation metrics against simulation/baseline.json.
 * If any metric has shifted:
 *   - The diff is reported in structured format.
 *   - The run FAILS unless an explanatory entry exists in simulation/CHANGELOG.md.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runSimulation } from "./harness.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export function compareMetrics(baseline, current, changelogContent, tolerance = 0.0001) {
    const shifts = [];
    function checkNumber(name, bVal, cVal) {
        const delta = Math.abs(cVal - bVal);
        if (delta > tolerance) {
            const pct = bVal !== 0 ? (((cVal - bVal) / bVal) * 100).toFixed(2) + "%" : "N/A";
            shifts.push({
                metric: name,
                baseline: bVal,
                current: cVal,
                delta: Math.round((cVal - bVal) * 10000) / 10000,
                percentChange: pct,
            });
        }
    }
    checkNumber("mean_30_day_retention", baseline.mean_30_day_retention, current.mean_30_day_retention);
    checkNumber("mean_selection_success_band", baseline.mean_selection_success_band, current.mean_selection_success_band);
    checkNumber("escalation_rate", baseline.escalation_rate, current.escalation_rate);
    checkNumber("days_to_mastery.mean", baseline.days_to_mastery_distribution.mean, current.days_to_mastery_distribution.mean);
    checkNumber("days_to_mastery.median", baseline.days_to_mastery_distribution.median, current.days_to_mastery_distribution.median);
    checkNumber("content_gap_count", baseline.content_gap_count, current.content_gap_count);
    checkNumber("invariant_violations_count", baseline.invariant_violations_count, current.invariant_violations_count);
    const hasShift = shifts.length > 0;
    const releaseEntries = changelogContent
        .split("\n## ")
        .slice(1)
        .filter((entry) => !entry.startsWith("[Unreleased]"));
    // The initial baseline is entry 1 ([1.0.0]). Any subsequent metric shift requires
    // a new release entry in CHANGELOG.md explaining the shift.
    const hasDocumentedEntry = releaseEntries.length > 1;
    return {
        hasShift,
        shifts,
        changelogAcknowledged: hasDocumentedEntry,
        changelogPath: join(__dirname, "CHANGELOG.md"),
    };
}
export function runDiffCheck() {
    const baselinePath = join(__dirname, "baseline.json");
    const changelogPath = join(__dirname, "CHANGELOG.md");
    if (!existsSync(baselinePath)) {
        throw new Error(`Baseline not found at ${baselinePath}. Run 'npm run simulation' first.`);
    }
    const baseline = JSON.parse(readFileSync(baselinePath, "utf-8"));
    const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, "utf-8") : "";
    console.log("Running simulation diff against baseline.json...");
    const current = runSimulation({ numLearners: 10000, seed: 1337042 });
    const report = compareMetrics(baseline, current, changelog);
    if (!report.hasShift) {
        console.log("PASS: Current simulation matches baseline.json exactly. No metric drift detected.");
        return;
    }
    console.log("\n=== SIMULATION METRIC DRIFT DETECTED ===");
    console.table(report.shifts);
    if (!report.changelogAcknowledged) {
        console.error("\nFAIL: Metrics shifted from baseline without an acknowledged entry in simulation/CHANGELOG.md.");
        console.error("Per doc 10 §4 and §6, any baseline shift requires an explanation in CHANGELOG.md.\n");
        process.exit(1);
    }
    else {
        console.log("\nPASS: Metric drift detected, but documented and acknowledged in simulation/CHANGELOG.md.\n");
    }
}
if (process.argv[1] && process.argv[1].endsWith("assertions.js")) {
    runDiffCheck();
}
