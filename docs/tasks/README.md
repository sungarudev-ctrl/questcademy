# Task Hand-offs

One self-contained prompt per task, split out of `docs/tasks.md` so a new agent or contributor can be given exactly one. Hand them out in order, one at a time, and verify each task's "Definition of done" before starting the next (the engine tasks especially: doc 10 §1).

`docs/tasks.md` keeps the full text and the chaining notes. If the two differ, `docs/tasks.md` is the master and these files must be regenerated.

## Status (verified against the repository, 2026-11-18)

Status reflects files and test runs on disk, not agent reports. `questcademy` has no git history, so "done" means the deliverables exist and the tests that exist pass.

| Task | File | Status | What is missing |
|---|---|---|---|
| 1 Mastery + master prompt | [task-1-mastery.md](task-1-mastery.md) | Done | |
| 2 Elo | [task-2-elo.md](task-2-elo.md) | Done | `elo_review_no_ability_update` vector skipped pending DR-002 |
| 3 Selection | [task-3-selection.md](task-3-selection.md) | Done | Interleave `correct_total` gate pending DR-003 |
| 4 Placement | [task-4-placement.md](task-4-placement.md) | Done | `propagate_mastery_down` vector skipped pending DR-001 |
| 5 FSRS | [task-5-srs.md](task-5-srs.md) | Done | |
| 6 Escalation, invariants, simulation | [task-6-escalation-simulation.md](task-6-escalation-simulation.md) | Done | `offer_tutor` pending DR-003 |
| 7 Framework layer | [task-7-framework-layer.md](task-7-framework-layer.md) | Done | |
| 8 Content pipelines | [task-8-content-pipelines.md](task-8-content-pipelines.md) | Done | |
| 9 Content Studio | [task-9-content-studio.md](task-9-content-studio.md) | Done | Sync-anomalies view (Task 12 §12.11) |
| 10 Web student app | [task-10-web.md](task-10-web.md) | Partial | Sync is simulated; not wired to the server |
| 11 Mobile student app | [task-11-mobile.md](task-11-mobile.md) | Partial | Re-implements engine logic in Dart, contrary to the sync contract |
| 12 Sync and offline | [task-12-sync-offline.md](task-12-sync-offline.md) | Partial | Server side done (`docs/sync-contract.md`); web and mobile clients, admin view, three-green-commit rule |
| 13 Student API | [task-13-api-surface.md](task-13-api-surface.md) | Not started | Auth, attempts/placement/session endpoints, OpenAPI, SDK |
| 14 Notifications | [task-14-notifications.md](task-14-notifications.md) | Not started | Everything |
| 15 Infrastructure | [task-15-infrastructure.md](task-15-infrastructure.md) | Not started | No `infra/`, release pipeline or runbooks beyond framework expansion |
| 16 Curriculum onboarding | [task-16-curriculum-onboarding.md](task-16-curriculum-onboarding.md) | Not started | Onboarding pack, first-import findings |
| 17 RCT | [task-17-rct-preregistration.md](task-17-rct-preregistration.md) | Not started | Pre-registration, instrumentation |

## Notes on these files

- Task 1's file contains the master prompt (§1–§11), which applies to every later task.
- Task 7 in the original had no markdown heading; it was given one here.
- References to `docs/plan.md` were changed to `docs/00-product-plan.md`, and the old name "ExamGPT" to "Questcademy". Spec numbering and section references are otherwise unchanged.
- Spec v2 work not covered by any task (classroom layer, teacher toolkit, inline tutor, nudges) is specified in docs 12 and 13 and has no task file yet. See `docs/00-product-plan.md` §20 items 14–20.
