# DR-014 — Per-Locale Decimal Separator Policy

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/05-assessment-item-spec.md §4

## Context
Different regional educational systems utilize different decimal separators (e.g. period '.' in UK/Ghana/Nigeria/Sierra Leone, comma ',' in Francophone systems). Numeric inputs must correctly validate without penalizing syntax conventions.

## Decision needed
Define the input parsing and error tolerant policy for decimal separators across locales.

## Options
Option A: Accept both '.' and ',' unconditionally as valid decimal separators in numeric answers.
Option B: Enforce locale-specific separator based on active curriculum framework setting.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option B. Numeric answers are parsed with the decimal separator of the learner's pinned framework locale (full stop for Ghana, Nigeria, Sierra Leone). Digit-grouping characters (space, thin space, and the locale's grouping character) are stripped before parsing. Display follows the same locale. A wrong separator is never the sole reason for marking an answer wrong when the other separator is unambiguous (a single separator and no grouping); in that case the answer is accepted and the learner is shown the locale form.

**Why.** Accepting both separators unconditionally (Option A) makes '1,500' ambiguous between one and a half and fifteen hundred. Locale-by-framework keeps 'country is data' (doc 02 L-2) and is trivial for the pilot markets.

**Consequences and follow-up.** Specified in doc 05 §4; parser must be deterministic and shared by all clients through the engine or shared rules, not re-implemented per client.

**Revisit.** Revisit when a comma-decimal market is added.
