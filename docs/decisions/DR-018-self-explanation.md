# DR-018 — Self-Explanation AI Prompt Evaluation Protocol

**Status:** ACCEPTED (provisional) (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/03-learning-science-spec.md §8

## Context
Spec v2 §8 introduces self-explanation prompts after misconceptions or multi-step errors. AI-driven grading of free-text student explanations requires a standardized evaluation rubric and safety rails.

## Decision needed
Approve the AI prompt schema, evaluation criteria, and latency envelope for evaluating learner self-explanations.

## Options
Option A: Use lightweight prompt returning JSON score (0.0–1.0) with binary feedback for pilot.
Option B: Rule-based keyword matching for offline clients, falling back to LLM when online.

---

## Decision (2026-11-18)

**Status:** ACCEPTED (provisional)

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A for the pilot, narrowed: a self-explanation prompt is offered after an unhinted correct Tier-3 answer (once per node per 24 hours). When online, a lightweight model call returns JSON `{score: 0.0-1.0, feedback: one of a fixed set}`; when offline, the prompt is skipped (Option B's keyword matching is rejected: low validity, and a wrong 'you explained it badly' is worse than none). The explanation and its score are never an attempt and never affect mastery, Elo or the review schedule (doc 04 §9.1). Feedback is shown asynchronously; if the call has not returned within 3 seconds (provisional) the learner proceeds without feedback.

**Why.** Doc 03 §12A rates the evidence low (candidate, unrated); it should not gate progression, and an offline fallback that grades text badly would be a Tier 0 correctness risk.

**Consequences and follow-up.** Doc 08 §4 (tutor) specifies the call; safety rules in doc 13 apply to the free text. Metric: share of prompts answered and next-attempt correctness (doc 03 §14 Q7).

**Revisit.** Doc 03 §15: read the self-explanation literature and assign a rating before any learner-visible claim is made.
