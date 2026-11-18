# DR-012 — English Language Arts (ELA) Item Type Specification

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/05-assessment-item-spec.md

## Context
Existing item types primarily cover STEM (Mathematics and Science). ELA items (reading passages, phonics, audio response, vocabulary in context) require dedicated schemas and evaluation criteria.

## Decision needed
Specify the schema, renderers, and scoring mechanics for ELA item types when expanding beyond STEM.

## Options
Option A: Define ELA schemas in milestone M3 prior to literacy pilot.
Option B: Adapt existing MCQ and Fill-Blank types with rich text passages without new schemas.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A in substance, with the timing fixed: ELA item schemas, renderers and scoring are specified after the Phase 0 exit review and before any ELA content is authored. Nothing ELA is built in Phase 0 (plan §17.1 freezes scope to JSS2 Mathematics).

**Why.** Choosing Option B (reuse MCQ and fill-blank with rich passages) would hide a real design gap: reading fluency, phonics and audio response need new contracts (doc 05 §3.15-3.16).

**Consequences and follow-up.** No work now. Gate: no ELA node may enter authoring until the schema record exists.

**Revisit.** Phase 0 exit review.
