# 03 — Learning Science Specification

**Owner:** Curriculum lead · **Change control:** strict — encodes pedagogy
**Version:** v2 (2026-11-18) — see Change Log at the end. Each change needs a decision record.

> What the evidence supports, what we have committed to building, and — equally important — what we have decided *not* to do despite it being popular. Every design commitment here traces to a mechanism in doc 04 or a rule in doc 05.

**Evidence strength ratings:** ★★★ = large replicated effects, multiple meta-analyses · ★★☆ = solid but context-dependent · ★☆☆ = promising, thin in our specific population.

---

## 1. Mastery Learning ★★★

**Finding.** Learners allowed to reach a criterion before advancing substantially outperform time-paced peers. Bloom's original 2-sigma claim is inflated under scrutiny, but meta-analyses consistently show effects in the 0.4–0.8 SD range for well-implemented mastery approaches.

**Mechanism.** Curricula are cumulative. An unmastered prerequisite compounds — a learner who never secured place value does not fail *one* topic, they fail every topic downstream. Time-paced instruction guarantees accumulating debt.

**Commitments**
- Progression gated by a mastery predicate, never by time or by completion (doc 04 §4).
- Prerequisite DAG enforced: no node available until prerequisites are secured (I-1).
- No "move on anyway" affordance. Learners may work on any *available* node, but cannot skip a gate.

**Measured by:** 30-day retrieval retention ≥ 75%.

---

## 2. Teaching at the Right Level ★★★

**Finding.** The strongest evidence base in developing-country education. Randomised evaluations across India and East/West Africa show that grouping and instructing by *demonstrated level* rather than enrolled grade produces large gains, frequently 0.3–0.7 SD, where curriculum-paced remediation produces near zero.

**Mechanism.** The modal learner in a JSS classroom in the region operates 2–4 years below the curriculum. Grade-paced instruction is unintelligible to them, so instructional time yields nothing. Meeting them at their actual level converts dead time into learning.

**This is the single highest-leverage commitment in the platform.**

**Commitments**
- Every learner is placed by diagnostic, never by enrolled grade (doc 04 §7).
- The skill graph is grade-agnostic; grade is a *hint*, not a constraint.
- A JSS2 learner may work at P4 nodes without any interface signalling deficiency.
- Re-diagnosis after 30 days inactive.

**Design consequence — dignity.** Being taught below grade is only tolerable if it is never framed as failure. The UI MUST NOT display grade level, percentile, comparison to peers, or "behind/ahead" language. Copy is forward-looking: "your starting point," "next up."

**The same rule binds teacher- and parent-facing views (v2).** Teacher dashboards show what to teach next and which misconception to address, never a ranking of children or grade-level deficiency labels. A learner's placement is shown as "working on", never "behind".

**Equity caveat (v2).** In the Sierra Leone trial (§12) learners with stronger starting mathematics gained more, and the authors warn that edtech can widen gaps. Placement-first design is our counter to this, but it is a hypothesis. Report every outcome by starting-level band.

**Measured by:** placement completion rate ≥ 85%; 8-week retention of below-grade-placed learners ≥ that of at-grade learners; effect size by starting-level band.

---

## 3. Spaced Practice ★★★

**Finding.** Practice distributed across sessions produces markedly better long-term retention than the same total practice massed into one session. Effect sizes ~0.4–0.6 on delayed tests. Optimal gap scales with the retention interval — roughly 10–20% of it.

**Mechanism.** Retrieval after partial forgetting is effortful, and that effort is what consolidates. Massed practice keeps the item in working memory, so retrieval is trivial and consolidation is weak.

**Commitments**
- **Spacing is built into the mastery predicate itself**, not offered as an optional review feature. Mastery requires correct performance on ≥ 2 non-consecutive days (doc 04 §4).
- FSRS-derived scheduler over mastered nodes (doc 04 §8).
- Exam-aware interval compression so nothing goes unreviewed inside the exam window.

**This is the commitment most likely to be attacked for hurting engagement metrics.** A learner who masters 3 nodes in a session feels more productive than one who masters 1 and reviews 2. Do not relax it. The first learner has demonstrated performance; the second has learned.

**Measured by:** 30-day retrieval retention; gap between immediate post-test and delayed post-test in the pre-registered RCT (§14).

---

## 4. Retrieval Practice ★★★

**Finding.** Being tested on material produces better retention than re-studying it for equal time — robustly, across ages, domains and retention intervals. Often 0.5–0.7 SD on delayed tests.

**Mechanism.** Retrieval is not a neutral readout of memory; the act of retrieving modifies and strengthens the trace.

**Commitments**
- The default learner activity is **answering**, not reading. Lesson content is short and instrumental to practice.
- Every lesson block sequence ends in items within 3 minutes.
- Review queue is retrieval, never re-presentation of the lesson.
- Low-stakes: no marks, no ranking, no penalty for wrong answers (doc 05 §4 — no negative marking).

**Design consequence.** This is why Questcademy is not a video platform. Video is re-study. The evidence favours the harder, less-pleasant activity.

---

## 5. Interleaving ★★☆

**Finding.** Mixing problem types within a practice session improves discrimination and transfer relative to blocked practice — but *depresses* in-session performance and learner confidence.

**Mechanism.** Blocked practice lets learners apply a procedure without deciding *which* procedure applies. Real assessment requires that decision.

**Commitments**
- Every 4th item is drawn from the review queue across previously mastered nodes (doc 04 §6).
- Mock exams are fully interleaved by definition.

**Deliberate limit.** We interleave at a 3:1 ratio, not fully. Full interleaving during initial acquisition is counterproductive; the evidence supports it for consolidation, not for first exposure. New nodes get blocked practice until 2 correct, then interleaving begins.

**Trade-off accepted:** interleaving makes learners feel worse while learning more. Combined with §3, this is a real engagement cost. It is paid deliberately.

---

## 6. Desirable Difficulty ★★☆

**Finding.** Conditions that slow acquisition and increase in-session errors often improve long-term retention and transfer. Success rates around 75–85% appear near-optimal for adaptive practice in several large-scale studies.

**Commitments**
- Item selection targets an expected success probability of 0.75–0.85 (doc 04 §6.1).
- Elo maintains this band automatically as ability grows.
- Self-correcting: sustained >0.90 raises target difficulty; sustained <0.60 lowers it.

**Boundary condition — motivation.** The 85% ceiling is not arbitrary. Below ~65% success, learners in low-support contexts disengage rather than persist, and the theoretical benefit is never realised. We accept a slightly easier band than pure difficulty research would suggest, because a learner who quits learns nothing.

---

## 7. Worked Examples & Expertise Reversal ★★☆

**Finding.** Novices learn more from studying worked examples than from solving equivalent problems. The advantage *reverses* as expertise develops — for competent learners, worked examples become redundant and problem-solving is superior.

**Commitments**
- Every node opens with 1–2 worked examples before first practice.
- Worked examples fade with progress: full → completion problems (partial solution, learner finishes) → unguided.
- Hint level 3 is a completion problem, not a full solution (doc 05 §5).
- Once a node reaches Tier 2 fluency, worked examples are available on request but not pushed.

**Design consequence.** "Explain differently" swaps to an alternative representation, not a longer explanation. More words is the wrong response to confusion.

---

## 8. Cognitive Load ★★★

**Finding.** Working memory is severely limited. Extraneous load — split attention, redundant text, decorative media, ambiguous notation — directly consumes capacity needed for learning.

**Commitments (mostly encoded as authoring rules)**
- Reading level ≥ 2 years below target grade (doc 05 A-3). *We assess mathematics, not English.*
- One skill per item (A-1).
- Diagram labels placed on the diagram, never in a separate legend (split attention).
- No decorative imagery. Every image carries information.
- Lesson blocks ≤ 15 minutes of content per node.
- No animation during problem-solving.

**Convenient alignment:** cognitive load discipline and the 2MB bundle constraint push in the same direction. The pedagogically correct lesson is also the cheapest to deliver.

---

## 9. Feedback ★★★

**Finding.** Feedback is among the largest effects in education research, but *quality varies enormously*. Elaborated feedback that addresses the specific error outperforms verification-only ("correct/incorrect") substantially. Immediate feedback is generally superior for procedural skills.

**Commitments**
- Feedback is immediate on every item.
- **Feedback is misconception-specific, not generic.** A learner who added numerators and denominators receives a response addressing *that belief*, not a restatement of the correct method (doc 05 §9).
- Feedback targets the work, never the learner. No "you're struggling with fractions." Instead: "This answer comes from adding the denominators. Let's look at why they need to match first."
- Correct answers get brief confirmation, not celebration inflation.

**This is why the misconception library exists.** Without distractor-level diagnosis, feedback can only be verification plus a generic re-explanation — the weak form of the strongest effect in the literature.

---

## 10. Diagnostic Teaching of Misconceptions ★★☆

**Finding.** Instruction that surfaces and directly confronts a learner's existing incorrect rule outperforms instruction that simply presents the correct rule. Misconceptions are *stable, rule-governed beliefs*, not random errors, and they survive correct instruction unless directly challenged.

**Mechanism.** A learner with a working (wrong) rule has no reason to abandon it. They must first see it fail on a case where it visibly gives the wrong result.

**Commitments**
- Every distractor maps to a named belief (doc 05 A-2).
- Remediation micro-lessons follow **elicit → conflict → resolve**: state the learner's rule neutrally, show a case where it fails, then build the correct rule.
- Remediation is triggered by the specific misconception detected, not by node failure generally (doc 04 §6).
- Misconception prevalence is *measured*, not assumed. Published lists are Western-derived; regional prevalence differs and we discover ours empirically.

---

## 11. Motivation: Self-Determination ★★☆

**Finding.** Sustained engagement is best supported by autonomy, competence and relatedness. Extrinsic reward systems reliably increase short-run activity and, in several well-replicated paradigms, *undermine* intrinsic motivation once withdrawn.

**Commitments**
- **Competence:** the 0.75–0.85 success band is itself the primary motivational mechanism. Visible mastery progress is the reward.
- **Autonomy:** learners choose among available nodes; the system recommends but does not compel.
- **Relatedness:** cooperative class goals, teacher assignment, parent acknowledgement. Class and school *aggregates* may be shown; individual children are never ranked or compared (v2 clarification — reconcile Product Plan §15, which says "no peer comparison").

**What we deliberately reject (doc 01 §13.3):** avatars, collectibles, virtual currency, mentor characters, seasonal events. Three reasons, in order of weight:
1. In *this* context, social accountability — the parent nudge, the teacher assignment, the exam countdown — is the dominant driver of dose, and it is near-free in bytes.
2. Extrinsic reward layers risk optimising engagement metrics while learning outcomes stay flat. That failure mode is invisible until the RCT.
3. Asset-heavy features are directly hostile to a 2MB bundle on a shared 2GB device.

**Teachers are the strongest dose lever we have evidence for (v2).** In the Sierra Leone trial teachers led the lessons, and 69% of students reached the usage target, against roughly 5% the authors cite for typical voluntary edtech. The trial tested a bundle (teacher training, paired work, lesson structures, technical support), so the tool alone was not isolated. In a separate Khanmigo trial, students given an optional tutor rarely used it. Design consequence: dose is delivered through teacher-scheduled sessions (Product Plan §14); an optional learner-initiated feature is never the primary loop.

**Standing rule:** any proposed engagement feature must have a stated hypothesis for how it increases *mastery*, not just minutes. Minutes without mastery is the failure mode we are most at risk of celebrating.

---

## 12. Dosage ★★☆

**Finding.** Trial evidence from the region — including the pre-registered, cluster-randomised Sierra Leone trial of Gemini Guided Learning (1,763 students, 12 schools in Port Loko District, 8 weeks, classrooms randomised) — shows an intent-to-treat gain of about +0.26 SD, with a *target* of 12 hours over 8 weeks. Students who reached 12 hours showed a larger estimated effect (about +0.38 SD), and each additional hour was associated with roughly +0.016 SD: a dose–response that rises with hours, not a demonstrated threshold. *(v2 correction: v1 described a threshold effect, which the published reports do not support. Evidence is a single district, a bundled teacher-led intervention, and a developer-published initial report.)*

**Implication.** Dose is a *precondition*, not an outcome. Whether there is a threshold is an open question (§14, Q4); until it is answered, treat 12 hours over 8 weeks as the minimum studied dose, not a proven cliff.

**Commitments**
- Weekly goal expressed in **minutes**: **90 minutes a week for P4-JSS3** (the studied dose, 12 hours over 8 weeks) and 60 for P1-P3 (provisional; no source studies that band). Decided in DR-009 (2026-11-18); doc 01 §12 is aligned.
- Engagement is a first-class engineering workstream (from the pilot onward), not polish.
- Parent WhatsApp nudge fires on dose shortfall, not on absence alone. It requires collecting a parent contact and a consent basis (Product Plan §16); until then nudges go to the learner and the teacher.

**This is the metric that kills the project if missed.** Everything in §1–§11 is downstream of a learner opening the app four times a week.

---

## 12A. AI Tutoring & Guardrails ★☆☆ (v2)

*Numbered 12A so that existing references to §13–§15 stay valid.*

**Finding.** Evidence is mixed and thin. In a randomised study of about 1,000 high-school maths students in Turkey (Bastani et al., PNAS 2025), unrestricted GPT access raised practice scores 48% but lowered later no-AI exam scores 17% versus control. A tutor configured to give hints instead of answers raised practice scores 127% and did not lower exam scores, but it also did not clearly beat control on the unaided exam. In a two-year Tennessee study of Khanmigo (Oreopoulos & Low, NBER w35620) students given an optional tutor mostly did not use it. In the Sierra Leone trial the tutor gave direct solutions in about 2% of messages and asked scaffolding questions in about 76%, inside a teacher-led programme.

**Mechanism.** Unrestricted AI lets a learner skip the retrieval effort (§4) that produces learning; guardrails restore it. A tutor beside the content is ignored; one woven into the practice loop is used.

**Commitments**
- The **engine decides when** the tutor appears (doc 04 §9); the model only responds. It is never an open chat on a live item.
- Inline, not a side panel: triggered by an exhausted hint ladder, a repeated misconception, or an optional self-explanation prompt (Product Plan §13).
- Socratic by default. It never gives the final answer to a live item. Worked solutions appear only after the item is closed.
- Every numeric claim is SymPy-verified before display; on disagreement, fall back to the precomputed solution.
- Works offline by falling back to the hint ladder. No new runtime AI dependency on a Tier 0 path.
- Short sessions with a turn cap, ending back in practice.
- No unrestricted learner access to a general-purpose chatbot inside the product.

**Candidate, unrated:** a self-explanation prompt after a correct hard item ("why does that work?"). Read the source literature before assigning a rating (§15).

**Measured by:** tutor open rate when offered; next-attempt correctness at the same node versus a no-tutor baseline; off-task share of tutor turns.

---

## 13. Rejected Practices

Popular, requested, and not supported. Recorded so they do not reappear as feature requests.

| Practice | Status | Reason |
|---|---|---|
| **Learning styles** (visual/auditory/kinaesthetic matching) | ❌ Rejected | Repeatedly tested, no reliable meaning-matching effect. We vary representation because multiple representations help *everyone*, not because a learner "is a visual learner." Never label a learner with a style. |
| **Unguided discovery for novices** | ❌ Rejected | Minimally-guided instruction underperforms explicit instruction for learners without domain knowledge. Discovery is appropriate after fluency, not before. |
| **Re-reading / re-watching as the main activity** | ❌ Rejected | Feels productive, produces little. See §4. |
| **Grade-paced progression** | ❌ Rejected | See §2. This is the core failure we exist to fix. |
| **Negative marking** | ❌ Rejected | Teaches risk aversion, harms lower-confidence learners disproportionately, corrupts the ability signal. |
| **Personality/learning-profile typing** | ❌ Rejected | No predictive validity for instruction. Also a privacy liability on minors. |
| **Public leaderboards ranking individual children** | ❌ Rejected | Demotivates the bottom half — precisely our target population. Class and school aggregates only. Also applies to any teacher-facing ranking of children. |
| **Streak-only motivation** | ⚠️ Constrained | Streaks are retained *with grace days* but must never be the primary loop; they measure attendance, not learning. Any streak shown in the product (Product Plan §15) must have grace days and show days practised, not score. |
| **Unrestricted AI chat for learners** (v2) | ❌ Rejected | See §12A: unrestricted access improved practice and lowered later unaided performance. |
| **Optional side-panel tutor as the primary AI surface** (v2) | ❌ Rejected | See §12A and §11: optional tutors get ignored. |
| **Engagement as a proxy for learning** | ❌ Rejected | Any metric review must pair a minutes figure with a mastery figure. |

---

## 14. Open Questions for the Pre-Registered RCT

Genuine uncertainties, pre-registered rather than assumed. *(v2: the first RCT now starts with the pilot in Product Plan §17, not a later phase.)*

1. Does the two-session mastery gate improve 30-day retention enough to justify its engagement cost? (Compare against a single-session gate arm.)
2. Is the 0.75–0.85 success band right for this population, or does low-support context favour a higher band?
3. Does misconception-specific remediation outperform generic re-explanation at a measurable margin? (This is the moat's core assumption — it should be tested, not assumed.)
4. What is the actual dose–response curve here — is it threshold-shaped or gradual — and is the 12-hour-over-8-weeks target (about 90 min/week) sufficient?
5. Does the parent WhatsApp nudge move dose, and by how much relative to teacher assignment?
6. (v2) Do gains differ by starting-level band? Does placement-first instruction narrow or widen the gap?
7. (v2) Does the inline, engine-triggered tutor improve next-attempt correctness over the hint ladder alone, and is it actually used when offered?

**Pre-register all seven before data collection starts (the pilot).** Analysing them post hoc against a moving product yields nothing publishable and nothing trustworthy.

---

## 15. Bibliography — starting set for the curriculum lead

Bloom (1984) on mastery and the 2-sigma problem · Guskey on mastery learning implementation · Banerjee, Duflo et al. on Teaching at the Right Level · Cepeda et al. (2006) meta-analysis on distributed practice · Roediger & Karpicke (2006) on test-enhanced learning · Rohrer & Taylor on interleaved practice · Bjork on desirable difficulties · Sweller on cognitive load and worked examples · Kalyuga on expertise reversal · Shute (2008) on formative feedback · Swan on diagnostic teaching of misconceptions · Deci & Ryan on self-determination theory · Kirschner, Sweller & Clark (2006) on minimal guidance · Pashler et al. (2008) on learning styles · Bastani et al. (2025, PNAS), *Generative AI Without Guardrails Can Harm Learning* · Oreopoulos & Low, *One Click Away: AI Tutoring with Khanmigo in a Two-Year School Experiment* (NBER w35620) · Fab AI / Google DeepMind (2026), Sierra Leone Guided Learning trial report (initial, developer-published; check for the full technical report) · Self-explanation literature (to be selected by the curriculum lead before rating the candidate in §12A).

Obtain and read these before authoring begins. The authoring rules in doc 09 will make sense only against them.

---

## Change Log

**v2 — 2026-11-18**

- §12: corrected the Sierra Leone finding (target and dose–response, not a threshold); noted evidence limits; flagged the 80 vs 90 minutes/week mismatch with doc 01 §12.
- §2: dignity rule extended to teacher and parent views; equity caveat and by-baseline reporting added.
- §11: individual-ranking ban clarified against aggregates; teacher-led dose evidence added.
- §12A (new): AI tutoring and guardrails.
- §13: added rejected practices (unrestricted AI chat, side-panel tutor as primary surface); constrained streaks further.
- §14: RCT timing aligned with the pilot; added questions 6 and 7; threshold wording fixed.
- §15: bibliography additions.

**Open items:** reconcile doc 01 §12 weekly minutes ([DR-009](decisions/DR-009-weekly-minutes.md)); reconcile Product Plan §15 wording on peer comparison and streaks; confirm the phase labels used in docs 01 and 03; select and rate the self-explanation literature ([DR-018](decisions/DR-018-self-explanation.md)).

**Decision records:** DR-009, DR-018
