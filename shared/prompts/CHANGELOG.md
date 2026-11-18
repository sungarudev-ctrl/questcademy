# Prompt Library Changelog

This changelog records every versioned prompt in `shared/prompts/v1/`. Every modification or creation must record the prompt version, author, date, and rationale.

---

## [1.0.0] - 2026-09-15

### Initial Release (Task 8 — Framework-Aware Content Pipelines)
**Author:** Curriculum Engineering Team

- **`node_authoring.md`** (v1.0.0): Initial prompt for Pipeline A1. Enforces doc 02 §2.1 atomicity test (`est_minutes` in [8, 15], >=2 named misconceptions, >=20 candidate items capacity, permanent screaming-snake node IDs). Target model: `gemini-2.5-pro`.
- **`content_canonical.md`** (v1.0.0): Initial prompt for Pipeline A2 Mode 1. Generates 17-block base content with KaTeX math, >=3 worked examples, Flesch-Kincaid grade level >=2 years below band, and misconception-aligned common mistakes. Target model: `gemini-2.5-pro`.
- **`content_localized.md`** (v1.0.0): Initial prompt for Pipeline A2 Mode 2. Emits sparse section overrides adhering to national localization briefs while strictly guaranteeing mathematical invariance. Target model: `gemini-2.5-pro`.
- **`item_generation.md`** (v1.0.0): Initial prompt for Pipeline B Step 1. Generates 18-type items following the doc 05 §8 tier mix, enforcing Rule A-2 (every distractor tagged with a named misconception) and doc 05 §5 (exactly 3 scaffolding hints). Target model: `gemini-2.5-flash`.
- **`item_localization.md`** (v1.0.0): Initial prompt for Pipeline B Step 10. Adapts stems/payloads with target framework localization tokens (currencies, names, cities) while keeping the numeric answer invariant. Target model: `gemini-2.5-flash`.
- **`framework_extraction.md`** (v1.0.0): Initial prompt for Pipeline C Step 1. Extracts verbatim syllabus learning objectives, hierarchical codes, and grade bands from national curriculum documents. Target model: `gemini-2.5-pro`.
- **`framework_mapping.md`** (v1.0.0): Initial prompt for Pipeline C Step 3. Proposes objective-to-node candidate mappings with confidence scores and pedagogical rationales following rules M-1 through M-5. Target model: `gemini-2.5-pro`.
- **`self_evaluation.md`** (v1.0.0): Initial prompt for automated quality evaluation. Rigorously audits candidate items and content on mathematical correctness and diagnostic depth with an automated rejection floor at 0.70. Target model: `gemini-2.5-flash`.
- **`localization_refresh.md`** (v1.0.0): Initial prompt for Pipeline D. Refreshes historical item/content overrides against updated localization briefs. Target model: `gemini-2.5-flash`.
