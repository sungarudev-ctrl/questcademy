# Simulation Baseline Changelog

All changes to learning engine core predicates (mastery, Elo, selection, review scheduler, state machine) that shift simulation baseline metrics must be recorded in this document per `docs/10-engineering-standards.md` §4 and §6.

A change that shifts the baseline without an explanation here fails CI.

---

## [1.0.0] - 2026-09-15

### Added
- Initial canonical baseline established across 10,000 synthetic learners over 12 simulated weeks.
- Ability distribution: $\mathcal{N}(1200, 200)$ truncated to $[600, 2000]$.
- Key baseline metrics:
  - Mean 30-day retention: $\ge 0.75$
  - Mean selection success band: $\in [0.75, 0.85]$
  - Escalation rate: $< 10\%$
  - Invariant violations: $0$
  - Content gap detection verified for nodes with $< 8$ items.
