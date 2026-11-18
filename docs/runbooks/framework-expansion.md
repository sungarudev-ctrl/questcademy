# Runbook: Curriculum Framework Expansion

**Owner:** Curriculum Lead · **Reviewer:** Content Admin  
**Canonical Spec Reference:** `docs/plan.md` §3.4, §6; `docs/02-curriculum-framework-spec.md` §6, §8, §9

---

## 1. Overview & Core Commitments

Adding a new country or exam board to Questcademy is a **content project, not an engineering project**. Mathematics is universal; what changes is *when* a syllabus expects a skill, *how* it assesses it, and *what context* it is dressed in.

### The Invariants Enforced During Expansion
1. **No Codebase Forks:** Adding a framework requires zero schema changes and zero code alterations.
2. **No Bulk Approval:** Mappings from syllabus objectives to canonical skill nodes must be confirmed individually. Bulk approval is prohibited by the service layer.
3. **80% Coverage Gate:** A framework cannot transition to `active` unless its coverage is $\ge 80.0\%$ (objectives mapped to nodes with $\ge 15$ published items).
4. **Math Invariance:** Localization overrides must never alter the mathematics or numeric answer (enforced by SymPy in CI).
5. **Mastery Preservation:** Enrolled learners migrating to the new framework retain byte-identical node progress (Invariant I-11).

---

## 2. The 11-Step Expansion Process

Follow these eleven steps in sequential order:

### Step 1: Syllabus Extraction (CurriculumExtractor)
Acquire the official syllabus PDF (e.g. NECO JSS Mathematics or WAEC BECE Mathematics). Record provenance. Extract structured objectives verbatim.

```bash
# Register country if not already present
curl -X POST https://api.questcademy.edu/api/countries \
  -H "Content-Type: application/json" \
  -H "X-User-Role: curriculum_lead" \
  -d '{
    "country_code": "NG",
    "name": "Nigeria",
    "default_locale": "en-NG",
    "default_currency": "NGN",
    "status": "active"
  }'

# Initialize draft framework
curl -X POST https://api.questcademy.edu/api/frameworks/import \
  -H "Content-Type: application/json" \
  -H "X-User-Role: curriculum_lead" \
  -d '{
    "framework_id": "ng_bece_math_2025",
    "country_code": "NG",
    "board": "NECO",
    "subject": "mathematics",
    "version": "2025.1",
    "locale": "en-NG",
    "currency": "NGN",
    "effective_from": "2025-01-01",
    "grading_scale": [
      {"grade": "A", "min_pct": 75, "meaning": "Distinction"},
      {"grade": "C", "min_pct": 50, "meaning": "Credit"},
      {"grade": "P", "min_pct": 40, "meaning": "Pass"}
    ],
    "exam_structure": {
      "papers": [
        {"paper_id": "1", "name": "Paper 1 (Objective)", "item_types": ["mcq_single"], "duration_min": 60, "marks": 60, "calculator": "prohibited"},
        {"paper_id": "2", "name": "Paper 2 (Essay)", "item_types": ["structured_multipart"], "duration_min": 90, "marks": 60, "calculator": "prohibited"}
      ]
    },
    "grade_bands": [
      {"band_id": "JSS1", "ordinal": 7, "typical_age": 12, "label_local": "JSS 1"},
      {"band_id": "JSS2", "ordinal": 8, "typical_age": 13, "label_local": "JSS 2"},
      {"band_id": "JSS3", "ordinal": 9, "typical_age": 14, "label_local": "JSS 3"}
    ]
  }'
```

### Step 2: Human Objective Correction
The Curriculum Lead audits the extracted objectives against the physical syllabus to ensure verbatim accuracy, proper code numbering, and grade band tags.

### Step 3: Candidate Node Mapping (CurriculumMapper)
The automated mapper proposes candidate mappings from syllabus objectives to existing nodes in the canonical graph with similarity confidence scores.

### Step 4: Human Mapping Confirmation (No Bulk Approval)
The Curriculum Lead reviews every proposed mapping individually. Bulk approving is rejected by the service layer with `BulkMappingProhibitedError`.

```bash
# Map a single objective to a canonical skill node
curl -X POST https://api.questcademy.edu/api/frameworks/ng_bece_math_2025/map-objective \
  -H "Content-Type: application/json" \
  -H "X-User-Role: curriculum_lead" \
  -d '{
    "objective_id": "ng_bece_math_2025.JSS2.NUM.3.2",
    "node_id": "MATH.FRAC.ADD_UNLIKE",
    "actor": "lead_curriculum_officer"
  }'
```

### Step 5: Gap Identification
Query the coverage report to identify unmapped objectives:

```bash
curl -X GET https://api.questcademy.edu/api/frameworks/ng_bece_math_2025/coverage \
  -H "X-User-Role: curriculum_lead"
```

### Step 6: Canonical Node Authoring for Residuals (Pipeline A1)
If the new syllabus contains topics absent from the global graph, author new canonical atomic `SkillNode`s via Pipeline A1. Remember:
- 8–15 minutes instructional size
- At least 2 named misconceptions
- Max 3 hard prerequisites
- Graph must remain acyclic (I-7)

### Step 7: Lesson Content Localization (Pipeline A2 Mode 2)
Author the country's `LocalizationBrief` and run Pipeline A2 Mode 2 to generate sparse `section_overrides` for affected nodes.

```json
{
  "framework_id": "ng_bece_math_2025",
  "currency": "NGN",
  "common_names": ["Chidi", "Amina", "Emeka", "Fatima"],
  "cities": ["Lagos", "Abuja", "Kano", "Ibadan"],
  "foods": ["Jollof rice", "Suya", "Pounded yam"],
  "units_preferred": {"length": "cm", "mass": "kg"},
  "avoid": ["snow", "subway", "Thanksgiving"],
  "scenario_bank": [{"topic": "market", "context": "Balogun market trade"}]
}
```

### Step 8: Item Localization Pass (Pipeline B Step 10)
Generate localized overlays in `item_localizations` (names, currency, food). All overrides must pass SymPy validation in CI.

### Step 9: Coverage Report Verification
Ensure that the percentage of objectives mapped to nodes with $\ge 15$ published items is calculated.

```bash
curl -X GET https://api.questcademy.edu/api/frameworks/ng_bece_math_2025/coverage
```

### Step 10: Request Activation Gate Check
Verify that `coverage_pct >= 80.0`. If coverage is $79.9\%$, the activation call will raise a `422 Unprocessable Entity`.

### Step 11: Framework Activation
Curriculum Lead activates the framework:

```bash
curl -X POST https://api.questcademy.edu/api/frameworks/ng_bece_math_2025/activate \
  -H "X-User-Role: curriculum_lead"
```

---

## 3. Post-Activation Verification Checklist

- [ ] `check_country_isolation.py` passes in CI (0 forbidden references).
- [ ] `check_math_invariance.py` passes for all item overrides.
- [ ] Cross-framework determinism test passes (`determinism.test.ts`).
- [ ] Cohort statistics endpoint responds from `framework_cohort_stats`.
