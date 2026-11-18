# 05 — Assessment & Item Specification

**Owner:** Curriculum lead + Engineering · **Change control:** append-mostly
**Version:** v2 (2026-11-18) — changes marked **(v2)**; see Change Log and Decisions Needed at the end. Per this document's own rule, no v2 change alters an existing type's scoring; the threshold and locale changes below do not touch marking.

> The normative catalogue of every question type. Changing an existing type's scoring rule invalidates historical calibration and requires a migration plan. Adding a new type is cheap.

---

## 1. Item Anatomy

Every item, regardless of type, carries:

```
Item {
  item_id           : string        # stable, never reused
  node_id           : string        # exactly one canonical node (doc 02)
  type              : ItemType      # §3
  difficulty_tier   : 1 | 2 | 3     # authored intent; Elo is the live truth
  difficulty_elo    : int           # live, engine-maintained (doc 04 §5)
  stem              : Block[]       # 17-block content, incl. KaTeX
  payload           : TypePayload   # type-specific, §3
  scoring           : ScoringRule   # §4
  hints             : [Hint; 3]     # progressive, §5 — exactly the 3 generic hints
  hint_variants     : [Hint]        # (v2) optional misconception-targeted additions, §5
  worked_solution   : Block[]
  # (v2) locale_variants REMOVED from the item. Localization is an overlay keyed by framework_id
  # (doc 02 §10, rules L-1/L-2; Product Plan §2.10). `country_code` never appears on an item.
  offline_capable   : bool
  printable         : bool          # (v2) renders and is answerable on paper, rule A-9
  media_bytes       : int           # enforced against bundle budget
  status            : ItemStatus    # §7
  stats             : ItemStats     # p-value, discrimination, n
  a11y              : A11yMetadata  # §6
}
```

### Universal rules

**Added 2026-07-30 — the same gap the `Hint` schema had, found the same way: referenced everywhere, defined nowhere.** `Block[]` appears 6 times above and below (stem, worked_solution, every option's content, shared_stem) as "17-block content," but nothing ever specified what a `Block` actually is. This is the shared content primitive — items and lessons (doc 06 §11) both render the same 17 block types, so an author never has to think in two different content models depending on what they're authoring.

```
Block = TextBlock | HeadingBlock | MathBlock | ImageBlock | CalloutBlock
      | DefinitionBlock | WorkedExampleBlock | MisconceptionAlertBlock
      | TableBlock | ListBlock | DesmosBlock | GeoGebraBlock
      | NumberLineBlock | HotspotBlock | AudioBlock | VideoBlock
      | CheckBlock

TextBlock             { type: "text", content: string }
HeadingBlock           { type: "heading", level: 1 | 2 | 3, content: string }
MathBlock              { type: "math", katex: string, display: "inline" | "block" }
ImageBlock             { type: "image", src: string, alt: string }               # alt REQUIRED, not optional
CalloutBlock           { type: "callout", style: "info" | "tip" | "warning", content: Block[] }
DefinitionBlock        { type: "definition", term: string, definition: string }
WorkedExampleBlock     { type: "worked_example", steps: Block[][] }              # each inner array = one step
MisconceptionAlertBlock{ type: "misconception_alert", misconception_id: string, content: Block[] }
TableBlock             { type: "table", headers: string[], rows: string[][] }
ListBlock              { type: "list", ordered: bool, items: string[] }
DesmosBlock            { type: "desmos", expression: string, bounds?: object }
GeoGebraBlock          { type: "geogebra", ggb_ref: string }
NumberLineBlock        { type: "number_line", range: [number, number], marks?: number[] }
HotspotBlock           { type: "hotspot", image: string, zones: Zone[] }         # same Zone shape as doc 05 §3.17, teaching not testing
AudioBlock             { type: "audio", src: string, transcript: string }        # transcript REQUIRED — a11y, doc 05 §6
VideoBlock             { type: "video", src: string, poster: string }            # see note below — never in the default path
CheckBlock             { type: "check", question: string, options: string[], correct_index: int }  # ungated, doesn't feed mastery/Elo — see doc 06 §11
```

**Two rules worth stating explicitly, not left implicit:**

- **`VideoBlock` exists as a type but is never in the default delivery path** — this is doc 01 §1's own constraint ("no video in the default path"), not relaxed by adding the block type. A lesson containing a video block must have a genuinely equivalent non-video path (the block is additive/optional content, never the only way to learn the skill), and bundle/CDN delivery treats it accordingly (doc 06 §11 — opt-in or wifi-gated, not bundled by default the way every other block type is).
- **`CheckBlock` is not an `Item`.** It's a lightweight, embedded, ungated comprehension check inside a lesson — no `misconception_id` requirement, no scoring, no Elo impact, no mastery contribution. Confusing this with a real assessment item would quietly weaken doc 04's whole mastery-determination story; keep the boundary sharp.

| ID | Rule |
|---|---|
| A-1 | An item MUST map to exactly one node. Items spanning two skills cannot diagnose. |
| A-2 | Every selectable wrong answer MUST carry a `misconception_id`. **Hard CI gate.** |
| A-3 | Stem reading level MUST be ≥ 2 years below the target grade. We assess the subject, not English. **(v2)** Applies to mathematics and science. For ELA, reading level *is* the construct and this rule does not apply; ELA rules arrive when ELA enters scope (see §3). |
| A-4 | An item MUST be answerable in ≤ 90 seconds at Tier 1–2, ≤ 180s at Tier 3. |
| A-5 | Media MUST be SVG or WebP. No item exceeds 40KB of media. |
| A-6 | If `offline_capable = false`, the item MUST NOT appear in the mastery path — only in optional enrichment. |
| A-7 | No item may depend on colour alone to convey meaning. |
| A-8 | No negatively-worded stems ("Which is NOT…") below JSS3. They test reading, not the skill. |
| A-9 | **(v2)** `printable = true` only if the type renders and can be answered on paper: MCQ, multi-select, numeric, cloze, ordering, matching, table completion, categorization (and written-response types for written papers). Number line, drag-and-drop, hotspot, Desmos, GeoGebra, photo and audio are not printable unless a `print_variant` is authored. Teacher-generated quizzes and mock papers (Product Plan §12.2) draw only `printable` items at `reviewed` or beyond. |
| A-10 | **(v2)** `worked_solution`, and any hint or tutor content that reveals the answer, MUST NOT be shown while the item is live. It is shown after the item closes (answered correctly, or hints exhausted and answered). The tutor may not reveal it (Product Plan §13.1). |
| A-11 | **(v2)** Each node MUST carry at least 2 Tier-3 items that are auto-marked and offline-capable, so the Tier-3 clause of the mastery predicate (doc 04 §4) can be satisfied offline. Deferred-marked types (§3.11, §3.12) do not count toward this floor. |

---

## 2. Difficulty Tiers

Tier is *authored intent*; Elo is the live measurement. They must not diverge wildly — an item whose live `difficulty_elo` ends up more than 400 from its **seed** (`node.difficulty_elo + tier_offset`, doc 04 §5.1: T1 −285, T2 −115, T3 +20) is mis-authored and goes to the revision queue. **(v2)** v1 said "a Tier 1 item above 1600 Elo". Since doc 04's 2026-08-09 change, item difficulty is node-relative, so a Tier 1 item on a node at graph level 28 or deeper is *seeded* at 1615 or more and an absolute 1600 rule would flag it on day one.

| Tier | Definition | Target p-value |
|---|---|---|
| **1 — Recognition** | Single-step, familiar surface, numbers chosen for ease. Confirms the procedure is present. | 0.75–0.90 |
| **2 — Fluency** | Single skill, unfamiliar surface or awkward numbers. Requires the skill, not recall of an example. | 0.55–0.75 |
| **3 — Transfer** | Skill embedded in a novel context or multi-step problem. Mastery requires ≥1 correct at this tier. | 0.35–0.60 |

**Tier 3 is not "harder arithmetic."** It is the *same* skill in an unfamiliar wrapper. Making the numbers uglier produces Tier 1 with more opportunity for slips.

---

## 3. Item Type Catalogue

### Legend
**Off** = works fully offline · **Marking** = auto (deterministic) / AI (Tier 3 batch) · **Dx** = diagnostic power (ability to identify a specific misconception)

| # | Type | Off | Marking | Dx | Phase |
|---|---|---|---|---|---|
| 1 | MCQ single-answer | ✅ | auto | ★★★ | 1 |
| 2 | Multi-select | ✅ | auto | ★★★ | 1 |
| 3 | Numeric entry | ✅ | auto | ★★☆ | 1 |
| 4 | Expression entry | ✅ | auto | ★★☆ | 1 |
| 5 | Cloze / fill-in-blank | ✅ | auto | ★★☆ | 1 |
| 6 | Ordering | ✅ | auto | ★★☆ | 1 |
| 7 | Matching | ✅ | auto | ★★★ | 1 |
| 8 | Table completion | ✅ | auto | ★★☆ | 1 |
| 9 | Number line placement | ✅ | auto | ★★★ | 2 |
| 10 | Diagram labelling / drag-drop | ✅ | auto | ★★★ | 2 |
| 11 | Short constructed response | ⚠️ deferred | AI | ★★☆ | 3 |
| 12 | Structured multi-part (WAEC) | ⚠️ deferred | AI | ★★★ | 3 |
| 13 | Graph interaction (Desmos) | ⚠️ verify | auto | ★★☆ | 3 |
| 14 | Geometry construction (GeoGebra) | ✅ | auto | ★★☆ | 4 |
| 15 | Working-shown photo | ❌ | AI | ★★★ | 4 |
| 16 | Audio response (oral fluency) | ⚠️ deferred | AI | ★★★ | 4 |
| 17 | Hotspot | ✅ | auto | ★★★ | 2 |
| 18 | Categorization | ✅ | auto | ★★☆ | 2 |

**⚠️ deferred marking:** the learner answers offline; the response queues and is marked on next sync. The engine treats it as pending — it does not block progression, but does not count toward mastery until marked.

**(v2) The engine has no contract for this yet.** Doc 04's `Attempt.correct` is a bool and attempts are ordered by `occurred_at`; there is no pending state. Before any deferred type ships (Phase 3), specify with doc 04 (proposed): `marking_status: marked | pending`; a pending attempt is excluded from `recent_window`, Elo and FSRS; when marked it is placed in `occurred_at` order and node state is recomputed by replay (doc 04 I-8, I-9); mastery cannot be evaluated while a Tier-3 attempt is pending. Paper 2 of the BECE mock paper (doc 02 §3.3) depends on this, so until then mock papers are Paper 1 only.

**(v2) Desmos offline.** The documented Desmos API setup loads `calculator.js` from Desmos's own servers with an API key; the terms for offline or self-hosted use were not confirmed. Until confirmed, treat §3.13 as online-only, which A-6 keeps out of the mastery path. GeoGebra (§3.14) needs the same check.

**Added 2026-07-30 — reconciled against an external 22-type taxonomy Albert brought in.** Most of it was already covered directly or as a pattern (see doc's session context); these two were genuine, math-relevant gaps. Deliberately did NOT add: True/False (worse guessing floor than MCQ for less diagnostic value), Image Selection (an MCQ option-content variant, not a structurally new type), Video Question (contradicts doc 01 §1's no-video constraint), or the Language Arts / Computer Science types (no such subject in scope — doc 01's phases only add Integrated Science). **(v2: this exclusion is stale for ELA.** The US is planned (doc 02 §8) and Pre-K/K ELA content already exists. ELA needs its own types and rules (e.g. letter-sound and phoneme tasks, oral reading), and A-3 and A-8 do not carry over. Specify them before ELA items are authored; this document is otherwise mathematics and science.)

---

### 3.1 MCQ Single-Answer

**The workhorse.** ~55% of the bank. Highest diagnostic power per byte.

```
payload: {
  options: [
    { id: "a", content: Block[], correct: true },
    { id: "b", content: Block[], correct: false, misconception_id: "FRAC.ADD_NUM_DEN" },
    { id: "c", content: Block[], correct: false, misconception_id: "FRAC.LCD_MULTIPLY" },
    { id: "d", content: Block[], correct: false, misconception_id: "FRAC.IGNORE_DEN" }
  ],
  shuffle: true
}
```

**Distractor rules (see doc 09 §4):**
- Exactly 4 options at JSS level. 3 for lower primary.
- Every distractor MUST be the answer a learner *would actually produce* under a named misconception. Never filler, never "obviously wrong."
- No "all of the above" / "none of the above" — they defeat diagnosis.
- Distractors MUST be similar in length and form to the key. Learners pattern-match on the longest option.
- The key's position MUST be shuffled at render (`shuffle: true`), seeded per learner so it's stable on re-render.

**Scoring:** exact match. `selected_option` → `misconception_id` feeds the remediation router (doc 04 §6).

**Guessing floor:** 25%. This is the primary reason for the Tier-3-required and two-session mastery gates, and for BKT if it is ever adopted (doc 04 §10).

**(v2) Placement.** Doc 04 §7 probes with single Tier-2 items, three per depth. A pure guesser passes a 3-probe round (2 or more correct) on a 4-option MCQ with probability 0.156 (3·0.25²·0.75 + 0.25³). Prefer numeric or expression entry for placement items; where only MCQ exists for a node, rely on the 14-day provisional re-verification (doc 04 §7.1) and track `provisional_mastery_failure_rate`.

---

### 3.2 Multi-Select

Use when the misconception is *over*- or *under*-inclusion (e.g. "which of these are prime?").

```
payload: {
  options: [...],            # 5-6 options, 2-3 correct
  min_select: 2, max_select: 4,
  scoring_mode: "all_or_nothing" | "partial"
}
```

**Scoring:**
- `all_or_nothing` — default for mastery-path items. Clean signal.
- `partial` — `max(0, (correct_selected - incorrect_selected) / total_correct)`. Use only for Tier 3.

**Diagnosis:** the *set* of selections maps to a misconception, not a single option. Define `misconception_patterns` as sets:
```
{ pattern: ["9", "15"], misconception_id: "PRIME.ODD_MEANS_PRIME" }
```

---

### 3.3 Numeric Entry

Removes the guessing floor. Use wherever a number is the natural answer.

```
payload: {
  answer: 3.75,
  tolerance: { type: "absolute" | "relative" | "sig_figs", value: 0.01 },
  unit: "cm" | null,
  unit_required: false,
  accept_equivalent_forms: true,     # 3.75 = 3¾ = 15/4
  keypad: "numeric" | "numeric_fraction" | "scientific"
}
```

**Rules:**
- MUST specify tolerance explicitly. Defaulting to exact match causes false negatives on rounding.
- **(v2)** Decimal separator MUST be locale-driven. The custom keypad offers `.` only for en-GH, en-NG, en-SL and en-US, where a comma is a **thousands** separator. v1 required accepting `,` as a decimal, which would read "1,500" as 1.5. On typed input, accept a comma as a decimal only where the locale uses one, and never interpret a thousands separator as a decimal point.
- MUST accept equivalent forms unless the skill *is* form conversion.
- Custom keypad required — the Android system keyboard is a usability disaster for fractions on a small screen.

**Diagnosis via anticipated wrong answers:**
```
anticipated_errors: [
  { value: 3.57, misconception_id: "DEC.DIGIT_TRANSPOSE" },
  { value: 375,  misconception_id: "DEC.POINT_DROPPED" },
  { value: 0.375, misconception_id: "DEC.PLACE_SHIFT" }
]
```
This recovers most of MCQ's diagnostic power without the guessing floor. **Author these for every numeric item** — it is the highest-leverage authoring habit in the whole bank.

---

### 3.4 Expression / Equation Entry

For algebra, where the answer is symbolic.

```
payload: {
  answer: "2x + 3",
  equivalence: "algebraic" | "literal" | "simplified_form",
  variables: ["x"],
  input: "mathlive"
}
```

- `algebraic` — CAS equivalence. `2x+3` ≡ `3+2x` ≡ `2·x+3`. Default.
- `simplified_form` — requires simplification. Use only when simplifying *is* the skill.
- `literal` — string match after normalisation. Rarely correct; avoid.

Implementation: MathLive for input, a lightweight CAS (math.js or equivalent) for equivalence. **Must run offline** — no server round-trip for marking.

---

### 3.5 Cloze / Fill-in-the-Blank

Multiple blanks inside a stem. Good for procedural sequences and for reducing reading load.

```
stem: "To add {{b1}} and {{b2}}, first find the {{b3}} denominator."
payload: {
  blanks: {
    b1: { type: "numeric", answer: ... },
    b3: { type: "select", options: [...], answer: "common",
          distractor_misconceptions: {...} }
  },
  scoring_mode: "per_blank"
}
```

**Scoring:** per-blank partial credit. Each blank carries its own misconception mapping. Mastery-path items MUST require all blanks correct.

---

### 3.6 Ordering

Sequencing steps, ordering magnitudes.

```
payload: {
  items: [...],
  correct_order: ["c","a","d","b"],
  scoring: "exact" | "kendall_tau"
}
```

`kendall_tau` gives partial credit on near-misses — appropriate for Tier 3 only. Common misconception patterns (e.g. reversed order) map via `misconception_patterns`.

---

### 3.7 Matching

**Underused and high-value.** Excellent diagnostic density: one item probes 4–5 associations.

```
payload: {
  left: [...], right: [...],
  correct_pairs: [["l1","r3"], ...],
  distractor_pairs: {
    "l1:r2": "FRAC.DECIMAL_CONFUSION"
  },
  scoring: "per_pair"
}
```

Include 1–2 unmatched right-hand items to defeat elimination strategies.

---

### 3.8 Table Completion

Ratio tables, function tables, data organisation. Strong for proportional reasoning.

```
payload: {
  headers: [...],
  rows: [[value|blank, ...], ...],
  answers: { "r2c3": {value: 12, misconception_map: {...}}, ... },
  scoring: "per_cell"
}
```

---

### 3.9 Number Line Placement

Best available diagnostic for fraction and decimal magnitude — the misconception most invisible to MCQ.

```
payload: {
  min: 0, max: 1,
  ticks: { major: 0.5, minor: 0.1, labelled: [0, 0.5, 1] },
  answer: 0.75,
  tolerance: 0.03,
  misconception_zones: [
    { range: [0.30, 0.45], misconception_id: "FRAC.NUM_AS_POSITION" },
    { range: [0.05, 0.15], misconception_id: "DEC.LONGER_IS_SMALLER" }
  ]
}
```

**Zone-based diagnosis is the key feature.** Where the learner drops the marker tells you *what they believe*, which no MCQ distractor can capture as richly. Requires a large touch target (≥ 44dp) and a coarse/fine drag mode on small screens.

---

### 3.10 Diagram Labelling / Drag-and-Drop

Geometry, fraction models, place value, science diagrams.

```
payload: {
  background: "svg-ref",
  targets: [{ id, x, y, w, h, accepts: ["label_3"] }],
  labels: [...],
  distractor_placements: { "label_2:target_1": "GEO.RADIUS_DIAMETER" }
}
```

MUST have a keyboard/tap-tap fallback for drag — drag is unreliable on cheap touchscreens and inaccessible to screen readers.

---

### 3.11 Short Constructed Response

Free text, 1–3 sentences or a short calculation. **The BECE/WAEC gap that MCQ cannot close.**

```
payload: {
  expected_length: "short",
  rubric: {
    criteria: [
      { id: "c1", description: "States that denominators must match", marks: 1 },
      { id: "c2", description: "Identifies LCD as 12", marks: 1 },
      { id: "c3", description: "Correct final answer 7/12", marks: 1 }
    ],
    total: 3
  },
  exemplars: {
    full:    ["..."],   # ≥3 real learner answers scoring full marks
    partial: ["..."],
    zero:    ["..."]
  },
  misconception_indicators: {
    "adds denominators": "FRAC.ADD_NUM_DEN"
  }
}
```

**Marking (doc 08 `MarkingService`):**
- Criterion-by-criterion, never holistic. Holistic LLM grading is unstable across runs.
- Exemplars are few-shot anchors — **an item without ≥ 3 real exemplars per band MUST NOT ship.**
- Model returns per-criterion marks + evidence span + a misconception flag.
- Confidence below threshold → routes to teacher review queue, not to the learner.
- Marks are advisory to the teacher and binding to the engine only above the confidence threshold.
- **Spelling, grammar and handwriting MUST NOT affect the mark** on a mathematics item.

Offline: answer captured locally, queued, marked on sync.

---

### 3.12 Structured Multi-Part (WAEC/BECE format)

The real exam format: a stem with parts (a), (b)(i), (b)(ii), each carrying marks, with **error carried forward**.

```
payload: {
  shared_stem: Block[],
  parts: [
    { id: "a", stem: ..., type: "numeric", marks: 2, node_id: "..." },
    { id: "bi", stem: ..., type: "short_response", marks: 3, node_id: "...",
      carry_forward_from: "a" }
  ],
  total_marks: 8
}
```

**Rules:**
- Each part MAY map to a different node. Part-level results are attributed to their own node — this is what makes mock-exam gap reports work (doc 01 §3.8).
- **Error carried forward MUST be implemented.** A wrong value in (a) used correctly in (b) earns (b)'s marks. WAEC does this; failing to replicate it destroys learner trust in the mock grade.
- Only appears in Exam Mode and Tier 3 practice, never in the standard practice loop — too long for the 90-second budget.

---

### 3.13 Graph Interaction (Desmos)

Plotting points, sketching lines, reading graphs. Rendered via WebView.

```
payload: {
  desmos_state: {...},
  expected: { type: "line", slope: 2, intercept: -3, tolerance: 0.15 },
  learner_actions: ["plot_points", "drag_line"],
  misconception_checks: [
    { condition: "slope ≈ -2", misconception_id: "ALG.SLOPE_SIGN" },
    { condition: "slope ≈ 0.5", misconception_id: "ALG.SLOPE_INVERTED" }
  ]
}
```

WebView adds ~30MB RAM. **MUST NOT be used in the standard practice loop on Android Go** — enrichment and Tier 3 only, with a static-image fallback where the device reports low memory.

---

### 3.14 Geometry Construction (GeoGebra)

Angle construction, bisectors, loci. Same WebView constraints as 3.13, more severe. Not scheduled; senior secondary only.

---

### 3.15 Working-Shown Photo Upload

Learner photographs handwritten working. Marked by a vision model.

**Constraints:** online-only, high data cost (compress to ≤ 200KB), highest marking uncertainty. **(v2)** Images of minors' work are personal data: strip EXIF and location, reject images showing faces or names, apply a retention limit, never use them to train a model, and delete on request (Product Plan §16).
**Use:** optional deep-practice and teacher-assigned homework only. **Never on the mastery path.**
**Value:** the only type that diagnoses *procedural* errors mid-calculation rather than inferring from a final answer. High teacher value; low engine value.

---

### 3.16 Audio Response (Oral Reading Fluency)

Not scheduled; lower primary. Learner reads a passage aloud; model scores words-correct-per-minute and flags decoding errors.

```
payload: {
  passage: "...",
  target_wcpm: 60,
  phoneme_focus: ["th", "sh"]
}
```

Records locally, uploads compressed audio (Opus, ~8KB/s) on sync. **This is the single highest-impact item type for lower primary** and the reason the audio bundle track exists (doc 01 §7.2). Requires explicit parent consent for voice capture (doc 01 §8). **(v2)** Also: a retention limit, no model training on voice data, and deletion on request (Product Plan §16).

---

### 3.17 Hotspot

**Added 2026-07-30.** Tap or click the correct region of an image or diagram. Directly extends §3.9's zone-based diagnostic pattern from a 1D line to a 2D image — same underlying idea (where the learner taps reveals *what they believe*, not just whether they're right), same reason it beats MCQ for genuinely spatial content.

```
payload: {
  image: "svg-ref",
  target_zone: { shape: "circle" | "rect" | "polygon", coords: [...] },
  tolerance_px: 12,
  misconception_zones: [
    { shape: "circle", coords: [...], misconception_id: "GEO.VERTEX_MIDPOINT_CONFUSION" }
  ]
}
```

**Rules:**
- Zones defined as vector shapes (SVG-native), not raster pixel maps — resolution-independent across device sizes, consistent with the rest of this doc's diagram approach (§3.10).
- `misconception_zones` follows §3.9's exact pattern: a wrong tap inside a *named* zone diagnoses a specific belief, not just "incorrect."
- Touch target minimum 44dp still applies (doc 05 §6) — `tolerance_px` must be generous enough to satisfy this on the reference device, not just look correct on a designer's monitor.
- Keyboard/screen-reader fallback required, same as §3.10 — a tap-only interaction with no alternative path fails doc 05 §6 outright.

**Clarified 2026-08-11 — an unzoned region is legal, and A-2 was never saying otherwise.** Read in isolation, A-2 ("every selectable wrong answer MUST carry a `misconception_id`") can be taken to mean every distinguishable feature of a hotspot image must sit under a named zone. It does not, and **§3.9 is the precedent this section already points at.** §3.9's number line runs 0–1 with a correct zone at 0.75 ± 0.03 and exactly two `misconception_zones`; every other point on that line is unzoned, and a drop at 0.6 is *incorrect but undiagnosed* — the model working as designed. Since this section states it "directly extends §3.9's zone-based diagnostic pattern from a 1D line to a 2D image", it inherits that model.

The distinction is enumeration. **A-2 governs types whose wrong answers are enumerated** — §3.1 MCQ, §3.2 multi-select, §3.5 cloze — where every option is, by construction, a selectable answer and a distractor without a diagnosis wastes the item's only diagnostic slot (§10). **A hotspot image is continuous: only a defined zone is an answer.** Image content carrying no zone is content, not an undiagnosed distractor.

§10's filler-distractor rule is not evaded by this. "Banana" is filler because it is *absurd* — no learner produces it, so the slot is wasted. A plausible-but-unnamed region is different in kind: it is a wrong answer a learner genuinely produces, which simply does not isolate one belief. It still contributes correct/incorrect signal to Elo (§5.2) and the mastery predicate (§4); it routes no remediation. That is exactly what an off-zone number-line drop has always done.

**This changes no scoring rule.** Doc 00 makes this document append-mostly and warns that altering an existing type's scoring invalidates calibration data — nothing here alters scoring, tolerance, or how a response is marked. It states which rule A-2 was always applying to this type. Do not read it as a relaxation: within an enumerated type A-2 is unchanged and remains a hard CI gate.

**Consequence for authoring.** A hotspot row may hold plausible distractors that carry no zone, so option count is set by §3.1's guidance (4 at JSS, **3 for lower primary**) rather than by how many named beliefs happen to exist for that content. The strict reading forces two-option items wherever a node has few named misconceptions, and a 50% guessing floor is outside anything this document contemplates — §3.1's own floor is 25%, which §3.1 names as the reason the Tier-3 and two-session mastery gates exist. *(v2: two cross-references in this section corrected: cloze is §3.5, and the guessing floor is named in §3.1, not §7.)*

**Clarified 2026-08-11 — §3.1's key-position rule applies here, and the mechanism is different.** §3.1 requires that "the key's position MUST be shuffled at render (`shuffle: true`), seeded per learner so it's stable on re-render", and gives the reason: *learners pattern-match*. That reason is about the learner, not about the item type, so it applies to Hotspot in full. **But `HotspotPayload` has no `shuffle` field and cannot usefully have one** — an MCQ's options are enumerated, so the renderer can reorder them; a hotspot's layout is baked into its SVG, and its zones are coordinates into that image. Reordering at render would require rewriting the image.

So for Hotspot the requirement is met **at authoring time, across the bank, not at render within one item**: the correct region MUST NOT sit in the same place in every item on a node. A generated bank with the answer always in the first slot is guessable by position alone — "tap the first one" scores far above chance without the learner reading a single letterform, which is exactly the failure §3.1's rule exists to prevent, arrived at by a different route.

Concretely: an authoring tool or generator that lays out a hotspot MUST vary the target's position across the items it produces, and a hand-authored hotspot's position is a review checklist item. This is a **weaker guarantee** than §3.1's, and deliberately so — per-learner shuffling is impossible here, so two learners see the same layout for the same item, and only the spread across items protects the measurement.

**The same risk exists for §3.10 (Diagram Labelling / Drag-and-Drop) and §3.18 (Categorization)**, whose targets are also baked into a diagram or a fixed set of bins. Named here so it is on the record; **nothing is specified or built for them in this note**, because neither has authored content yet and a rule written before its first item is a rule written blind.

---

### 3.18 Categorization

**Added 2026-07-30.** Sort items into two or more groups — genuinely distinct from Matching (§3.7, which is 1:1 pairing): this is N items into K buckets, and an item can only belong to one bucket, which is a different cognitive task and a different common-error pattern than mismatching pairs.

```
payload: {
  items: [...],
  categories: ["Rational", "Irrational"],
  correct_assignment: { "item_1": "Rational", "item_2": "Irrational", ... },
  distractor_assignments: {
    "item_3:Rational": "NUM.REPEATING_DECIMAL_AS_RATIONAL_CONFUSION"
  },
  scoring: "per_item" | "all_or_nothing"
}
```

**Rules:**
- `per_item` scoring is the default for the mastery path (partial credit per correctly-sorted item) — `all_or_nothing` only for Tier 3, matching the same tier-appropriate partial-credit pattern established for Multi-Select (§3.2) and Table Completion (§3.8).
- Every category needs at least one distractor-worthy item that plausibly (but wrongly) belongs there — an item with an obvious-only-one-right-bucket answer wastes the format's diagnostic value.
- Minimum 2 categories, minimum 4 items — below that, this collapses into a binary MCQ with extra UI overhead for no diagnostic gain.

---

## 4. Scoring Rules

```
ScoringRule {
  mode          : exact | tolerance | partial | rubric | pattern
  max_marks     : int
  partial_policy: none | per_component | weighted
  penalty       : none                    # NEVER negative marking
}
```

**No negative marking, ever.** It teaches risk aversion, disproportionately harms lower-confidence learners, and corrupts the Elo signal.

**Attempt outcome mapping (input to doc 04):**
```
correct        = (marks_awarded == max_marks)
partial_credit = marks_awarded / max_marks
```
Mastery uses `correct` only, and only with `hints_used == 0` (doc 04 §4, I-10). Elo uses `correct`, with a hinted correct counted as half credit (doc 04 §5.2). Partial credit is for teacher reporting and exam prediction.

**(v2)** A structured multi-part item (§3.12) produces **one attempt per part**, each attributed to that part's node. Doc 04's `Attempt` carries a single `node_id`, so a part is an attempt; the item as a whole is not.

---

## 5. Hints

Exactly 3 levels per item. Precomputed at authoring, shipped in the bundle (Tier 1, doc 01 §5.1).

| Level | Purpose | Rule |
|---|---|---|
| **1 — Orient** | Points at what to notice. | MUST NOT restate the method. "What do you need before you can add these?" |
| **2 — Method** | Names the procedure. | MUST NOT do the arithmetic. "Find a common denominator first." |
| **3 — Partial work** | Does the first step. | MUST leave the final step to the learner. "12 is the common denominator. 1/4 = 3/12. Now convert 1/3." |

**Level 3 MUST NOT give the answer.** If a learner exhausts level 3 and fails, the engine may offer the tutor immediately (`offer_tutor`, reason `hint_ladder_exhausted`, doc 04 §9.1) and escalates (`escalate_to_tutor`) after repeated failure (doc 04 §9) — that is the designed path, not the hint.

Hints MUST be misconception-aware where the wrong answer is known: a learner who selected the `ADD_NUM_DEN` distractor gets a hint targeting that belief, not the generic one.

**Added 2026-07-30 — the actual gap: `Hint` (doc 05 §1's `hints : [Hint; 3]`) was never given a real schema, anywhere.** Found because a hand-written sample using a guessed shape didn't load into the live form — not a loader bug, a spec gap the guess had no way to avoid.

```
Hint {
  level             : 1 | 2 | 3
  content           : Block[]              # 17-block format, same as stem — plain text is valid (a single text block)
  misconception_id  : string?              # null for the generic hint; set when targeting a specific known wrong answer
}
```

Always exactly 3 entries, one per level, in order. `misconception_id` lets a node carry *multiple* hint sets — a generic level-1/2/3 progression plus additional misconception-targeted variants for level 1 or 2 specifically (doc 04 §6's remediation override serves these). The minimum viable set is the 3 generic (null-misconception) hints; misconception-targeted variants are additive, not a replacement requirement for shipping.

**(v2) Resolution of a type mismatch.** `hints: [Hint; 3]` held exactly three entries while this text allowed several hint sets. `hints` now holds exactly the 3 generic hints; misconception-targeted variants live in `hint_variants` (§1).

---

## 6. Accessibility Requirements

| Requirement | Applies to |
|---|---|
| All non-decorative images carry alt text describing mathematical content, not appearance | all types |
| KaTeX output MUST emit MathML for screen readers | all types |
| TTS MUST read the stem correctly — no bare `\frac` leakage; author a `speech_text` override where notation is ambiguous | all types |
| Colour never the sole carrier of meaning; palettes deuteranopia-safe | 3.10, 3.13, 3.14 |
| Touch targets ≥ 44dp | 3.9, 3.10 |
| Drag has a tap-tap fallback | 3.10 |
| Full keyboard operability on web | all types |
| Dyslexia-friendly font option applies to stems and options | all types |
| Timed items MUST be extendable (accommodation flag) | 3.12 exam mode |

An item failing stage 10 of the pipeline (doc 01 §4.1) does not ship.

---

## 7. Item Lifecycle

```
draft → generated → tagged → reviewed → localized → piloted → live
                                                        ↓
                                          calibrating → calibrated
                                                        ↓
                                              revision → retired
```

| Status | Meaning |
|---|---|
| `generated` | AI-produced, untagged. Never served. |
| `tagged` | Distractors carry misconception IDs. Never served. |
| `reviewed` | Curriculum lead approved. Never served. |
| `piloted` | Served to one class for sanity check. |
| `live` | Serving, `n < 50`. Elo K=32. |
| `calibrating` | `50 ≤ n < 200`. |
| `calibrated` | `n ≥ 200`. Trusted for placement and exam mode. |
| `revision` | Failed a quality threshold. Withdrawn from serving. |
| `retired` | Permanently withdrawn. History preserved. |

**Which statuses count toward the publish gate (added 2026-08-10).** doc 10 §5's content gate requires "every node ≥ 15 published items and ≥ 5 tier-3", and "published" needed defining against this table. **The floor is `reviewed`** — statuses `reviewed`, `piloted`, `live`, `calibrating`, `calibrated` count; `draft`, `generated`, `tagged`, `revision` and `retired` do not.

- **Why `reviewed` and not `piloted`.** The first implementation required `piloted` and could never be satisfied. `piloted` is defined above as "served to one class" — serving requires delivery, delivery is the bundle (doc 06 §4.1), and the bundle required piloted items. No first bundle could ever be built. `reviewed` is this table's human-approval bar ("curriculum lead approved"), which is the quality property the gate exists to enforce; `piloted` and `live` are states an item *acquires* by moving through doc 06 §4.3's rollout ladder, not prerequisites for entering it.
- **`revision` and `retired` are excluded although they sit later in the diagram.** The lifecycle is not linear. Both are withdrawn-from-serving states, and an item pulled for failing a quality threshold must not prop up a node's count.
- **`localized` is not a status.** It appears in the lifecycle arrow above and in no row of this table, no other document, and nowhere in the code. It is doc 01 §4.1's stage 11 (Localization) — a pipeline stage that leaked into the diagram. Treat the table as authoritative.
- **`draft` is a real status missing from the table.** It appears in the arrow and is the default in `items.status`; it is the pre-`generated` authoring state and counts toward nothing.

### Automatic quality thresholds (evaluated at n ≥ 50)

| Condition | Action |
|---|---|
| Point-biserial discrimination < 0.15 | → `revision` |
| Discrimination < 0.05 or negative | → `retired` immediately |
| p-value outside tier band by > 0.20 | → `revision` (re-tier) |
| A distractor chosen by < 3% of learners | flag: non-functional distractor |
| Median latency > 3× node median | flag: reading-load problem |
| `|difficulty_elo - item_seed| > 400` | → `revision` (mis-authored). **(v2)** `item_seed = node.difficulty_elo + tier_offset(tier)`, doc 04 §5.1. v1's `tier_initial` meant 1200/1500/1800 absolute, which doc 04 replaced on 2026-08-09. |

**(v2) These thresholds need n ≥ 50 responses per item.** A small pilot may never reach that, so items stay `live` and are reviewed by hand. State the expected responses per item in the pilot plan (Product Plan §17.2, item 9).

**Negative discrimination means stronger learners get it wrong more often than weaker ones.** That is almost always an ambiguous stem or a wrong key. Retire immediately, do not queue.

---

## 8. Bank Composition Targets

Per node, when it is first published to learners (pilot content):

| Tier | Count | Types |
|---|---|---|
| 1 | 8–12 | MCQ, numeric, cloze |
| 2 | 8–12 | MCQ, numeric, matching, table, number line |
| 3 | 5–8 | MCQ, expression, short response, structured |

**Minimum to serve a node:** 8 items with ≥ 2 at Tier 3. Below this the engine emits `content_gap`. **(v2)** At least 2 of those Tier-3 items must be auto-marked and offline-capable (A-11).

**Clarified 2026-08-10 — this is the SERVE FLOOR, not the publish bar, and the two are different numbers on purpose.** 8/2 describes what doc 04 §6's selector needs to function: below it, §6.3 step 4 emits `content_gap` telemetry and the node is served badly rather than not at all. It is a runtime condition, not a build decision, and nothing fails CI because of it. **The publish bar is 15 published items with ≥ 5 at Tier 3** (doc 10 §5, doc 09 §4.3, and doc 06 §4.1 as corrected on the same date) — what must hold before a node ships in a bundle. The table above is the Phase 1 exit target and clears both. A node between 8/2 and 15/5 is servable but not publishable, which is the normal state of a node mid-authoring.

Type mix across the whole bank, target:
MCQ 45% · numeric 20% · cloze/table 12% · matching/ordering 8% · number line 6% · short response 6% · other 3%

---

## 9. Misconception Taxonomy

ID scheme: `DOMAIN.SPECIFIC_BELIEF`, screaming snake, stable forever.

```
FRAC.ADD_NUM_DEN          # adds numerators and denominators
FRAC.LCD_MULTIPLY         # multiplies denominators instead of finding LCD
FRAC.NUM_AS_POSITION      # treats numerator as position on number line
DEC.LONGER_IS_BIGGER      # 0.125 > 0.5 because more digits
ALG.SLOPE_SIGN            # sign error reading gradient
INT.NEG_TIMES_NEG_NEG     # believes (−)(−) = (−)
```

```
Misconception {
  id, domain, description,
  learner_facing_name : string     # never shown as "your error"
  prevalence          : float      # measured, not assumed
  affected_nodes      : [node_id]
  remediation_id      : string
  typical_origin      : string     # for teacher-facing notes
}
```

**A misconception is a *belief*, not a mistake.** "Careless error" is not a misconception. If you cannot state the (incorrect) rule the learner is consistently applying, it does not belong in the taxonomy.

**Pilot target: ~150 named misconceptions for JSS maths.** **(v2)** The figure is mathematics only; Integrated Science and later subjects need their own domains and targets. `prevalence` stays null until response volume exists, which a small pilot will not provide. This asset — measured prevalence across tens of thousands of West African learners, mapped to nodes and remediations — is the platform's deepest moat (doc 01 §14).

---

## 10. Item Authoring Anti-Patterns

| Anti-pattern | Why it fails |
|---|---|
| Filler distractors ("banana") | Wastes the only diagnostic slot the item has |
| Two skills in one item | Cannot attribute failure to a node |
| Reading level above target grade | Assesses English, not mathematics |
| "All of the above" | Defeats diagnosis, invites elimination |
| Key noticeably longer than distractors | Learners pattern-match without reading |
| Trick questions | Punishes careful readers, destroys trust |
| Culturally alien context (snow, subway, Thanksgiving) | Adds construct-irrelevant load |
| Tier 3 = uglier numbers | Produces Tier 1 with more slips, not transfer |
| Negative stems below JSS3 | Tests parsing, not the skill |
| Short response with no exemplars | AI marking is unstable without anchors |

---

## Change Log

**v2 — 2026-11-18**

- §1: removed country-keyed `locale_variants` from the item (overlay by framework); added `hint_variants` and `printable`; A-3 made subject-neutral; added A-9 (printable), A-10 (worked-solution timing), A-11 (auto-marked Tier-3 floor).
- §2, §7: absolute Elo thresholds replaced by deviation from the node-relative seed.
- §3: Desmos marked verify; deferred-marking engine contract proposed; ELA exclusion marked stale; placement guess-floor note; locale-driven decimal separator; photo and audio data rules; two cross-references corrected.
- §4: attempt semantics for hints and multi-part items.
- §5: tutor offers; `hint_variants`.
- §8, §9: Tier-3 floor; scope of the misconception target.

**Decision records:** DR-010 to DR-014

## Decisions (resolved 2026-11-18)

Accepted on the owner's delegated instruction. Code consequences are in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| # | Topic | Decision | Status |
|---|---|---|---|
| 1 | Pending-attempt contract ([DR-010](decisions/DR-010-pending-attempt-contract.md)) | Separate `pending_attempts` queue; blocks deferred types and Paper 2 mocks until built | Provisional |
| 2 | Desmos/GeoGebra offline ([DR-011](decisions/DR-011-desmos-offline.md)) | Online-only; offline graphing uses a permissively licensed library after a licence check | Accepted |
| 3 | ELA types ([DR-012](decisions/DR-012-ela-types.md)) | Specify after the Phase 0 exit review, before any ELA content is authored | Accepted |
| 4 | `printable` ([DR-013](decisions/DR-013-printable-metadata.md)) | Derived from type; author may only downgrade; missing value rejected | Accepted |
| 5 | Decimal separator ([DR-014](decisions/DR-014-decimal-separator.md)) | Framework-locale separator; grouping characters stripped; unambiguous other separator accepted | Accepted |
| 6 | Phase labels ([DR-008](decisions/DR-008-phase-labels.md)) | Plan §18 translation table | Accepted |

This document remains append-mostly: none of the above changes an existing type's scoring rule.
