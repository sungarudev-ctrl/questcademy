## TASK 14 — Notifications, Parent and Teacher Digests, and Dose Accountability

---

**Context:** Tasks 1–13 complete and confirmed. The API surface is stable. Every learner has a well-defined dose goal from doc 03 §12 (≥ 80 minutes/week). Dose is the single metric that kills the project if missed. The platform must nudge without becoming noise.

**Your task:** Build the notification subsystem — in-app, push, and the parent/teacher digest — with the same discipline the rest of the platform applies to learning science.

**Read first, in this order:**

1. `docs/03-learning-science-spec.md` **§11** — self-determination, rejections
2. `docs/03-learning-science-spec.md` **§12** — dosage
3. `docs/03-learning-science-spec.md` **§13** — rejected practices (leaderboards, streak-only motivation, personality typing)
4. `docs/00-product-plan.md` **§4** — the flow (exam window suppression)
5. `docs/02-curriculum-framework-spec.md` **§4** — academic calendar, exam windows
6. `docs/10-engineering-standards.md` **§5** — CI gates
7. Local privacy law where the learner resides — the platform does not assume one jurisdiction

**Deliverables, in order:**

### 14.1 Notification taxonomy

Every notification is typed and registered. No ad-hoc strings.

| Type | Trigger | Channel | Recipient | Suppression rules |
|---|---|---|---|---|
| `review_due` | FSRS due queue non-empty and no session today | Push | Learner | Suppressed inside exam window's final 24h before a mock |
| `dose_shortfall` | Weekly minutes below 80% of goal, sent Thursday evening | Push + in-app | Learner | Suppressed during holidays and school breaks |
| `streak_at_risk` | Streak active and no session by 19:00 local | Push | Learner | Grace days apply; never on consecutive days |
| `milestone_mastered` | First mastery of a node in a topic | In-app only | Learner | Never pushes |
| `framework_updated` | Framework superseded; learner pin older than new version | In-app banner | Learner | Never pushes; dismissible |
| `parent_weekly_digest` | Weekly, Sunday evening local | WhatsApp + email | Parent (opt-in) | Suppressed during holidays and breaks |
| `teacher_dose_report` | Weekly, Monday morning local | Email | Teacher | Suppressed during holidays and breaks |
| `teacher_gap_report` | Weekly, Monday morning local | Email | Teacher | Only if the class has a mastery gap > 20% between top and bottom quartiles |
| `consent_reminder` | Voice recording enabled, consent not confirmed within 7 days | In-app | Parent | Only once |

**Rule:** a notification type not in this table must not fire. There is no generic "send" API.

### 14.2 Suppression rules

Every notification is filtered by:

- **Quiet hours:** no push between 21:00 and 07:00 local, no exceptions.
- **Exam window:** no push of any type in the 24 hours before a registered mock or real exam, except `review_due` for a node whose FSRS interval has elapsed by ≥ 2 days.
- **Calendar:** all non-essential notifications suppressed during holidays and school breaks (from `academic_calendars.holidays`).
- **Frequency cap:** no more than 3 push notifications per learner per day, no more than 10 per learner per week, regardless of trigger.
- **Automatic opt-out after 4 ignored weeks:** if the learner has not opened a push in 4 consecutive weeks, push pauses for 2 weeks and resumes only on a mastery event.

### 14.3 Delivery infrastructure

- **Push:** Firebase Cloud Messaging (FCM) for Android, APNs for iOS, Web Push (VAPID) for web. Single `PushService` abstraction; providers are pluggable.
- **WhatsApp:** Meta Cloud API, with a template message for the parent digest. Template reviewed and approved per locale.
- **Email:** transactional provider (e.g., Postmark or equivalent). Templates rendered from `shared/design/tokens.json` for consistency with brand.
- **In-app:** a `notifications` table per learner with read/unread state.

### 14.4 Digest content (parent)

The digest is a single message. It contains:

- Learner first name.
- Weekly minutes (as a bar vs goal, not a number alone).
- Nodes mastered this week (count, no names).
- One forward-looking sentence: "Next up: [topic from the current frontier]."
- One optional note if a mastery anomaly was detected: "Rivers is spending a lot of time on fractions — this is normal at this stage."
- Never: a rank, a percentile, a comparison to another child, a grade level, or any diagnostic label.

The digest is drafted by an LLM **only from a fixed template with slots**, never free-form. Every sentence is authored by the curriculum team, filled by numbers. The LLM's only role is translation into the learner's local language, and even that is validated against a human-authored reference.

### 14.5 Teacher reports

- One page per class, one row per learner.
- Columns: minutes this week, nodes mastered, nodes in review, one word for "moving forward / stuck / needs attention."
- **No individual leaderboard.** Classes are shown as aggregates plus a per-learner strip that teachers can sort privately.
- The "needs attention" flag is triggered only by a persistent gap (no mastery in 3 weeks despite ≥ 60 min/week), not by a single bad week.

### 14.6 Consent and opt-in

- Parent digest is opt-in. No digest sends until the parent confirms via a one-tap link.
- Voice recording features (Phase 4) require explicit written consent from a parent or guardian, with the exact wording stored alongside the timestamp.
- Consent can be withdrawn at any time from within the app; withdrawal triggers immediate cessation of the affected notification type.

### 14.7 Provider abstractions

```
PushProvider           — FCM | APNs | WebPush | Null
MessagingProvider      — WhatsApp Cloud | Email | Null
DigestRenderer         — template + slots
NotificationScheduler  — reads triggers, applies suppression, enqueues
```

`Null` providers are required so the platform can run in a local or test environment with zero external calls.

### 14.8 Data model

```sql
CREATE TABLE notification_preferences (
  learner_id        UUID REFERENCES users(id),
  channel           TEXT NOT NULL,           -- 'push' | 'whatsapp' | 'email'
  notification_type TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (learner_id, channel, notification_type)
);

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id        UUID REFERENCES users(id),
  notification_type TEXT NOT NULL,
  payload           JSONB NOT NULL,
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  suppressed        BOOLEAN NOT NULL DEFAULT FALSE,
  suppression_reason TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parent_contacts (
  learner_id        UUID REFERENCES users(id),
  contact_kind      TEXT NOT NULL,           -- 'whatsapp' | 'email'
  contact_value     TEXT NOT NULL,
  consent_given_at  TIMESTAMPTZ,
  consent_withdrawn_at TIMESTAMPTZ,
  locale            TEXT NOT NULL,
  PRIMARY KEY (learner_id, contact_kind)
);

CREATE TABLE teacher_classrooms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID REFERENCES users(id),
  name              TEXT NOT NULL,
  framework_id      TEXT REFERENCES curriculum_frameworks(framework_id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teacher_classroom_members (
  classroom_id      UUID REFERENCES teacher_classrooms(id),
  learner_id        UUID REFERENCES users(id),
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (classroom_id, learner_id)
);
```

### 14.9 Scheduler

A Celery beat task runs every 5 minutes and evaluates the trigger table. It:

1. Loads all active learners with any enabled notification type.
2. Computes the trigger state per learner.
3. Applies suppression rules.
4. Enqueues deliveries with a per-provider rate limit.

The scheduler is idempotent: running it twice within the same 5-minute window produces no duplicates.

### 14.10 Tests

- `test_suppression.py` — quiet hours, exam window, holidays, frequency cap, auto opt-out.
- `test_digest_rendering.py` — the digest renders from a template with slots; no free-form LLM text reaches the wire.
- `test_opt_in.py` — no digest sends before consent; withdrawal stops it immediately.
- `test_idempotent_scheduler.py` — running twice in one window produces no duplicates.
- `test_teacher_report.py` — no leaderboard, per-learner strip sortable, "needs attention" only on persistent gap.
- `test_providers.py` — every provider has a Null implementation that records intent without sending.

### 14.11 CI gates

- **No free-form LLM text in digests** — a test that asserts every outbound digest body matches a template + numeric slot.
- **No notification without a registered type** — a lint rule.
- **Quiet hours respected** — a test that verifies no push enqueues between 21:00 and 07:00 local under any trigger.
- **Frequency cap respected** — a test that floods triggers and asserts the cap.
- **Consent gate** — a test that sends a digest trigger before consent and asserts no delivery.

**Definition of done:**

- Every notification type in the taxonomy implemented with its suppression rules.
- Scheduler idempotent and rate-limited.
- Digest content is template-driven, not LLM-authored.
- No leaderboard exists anywhere in the teacher or parent surface.
- Consent flows complete with withdrawal support.
- All CI gates fail when deliberately violated.
- Local test environment runs with `Null` providers and passes every test.

**Report at the end:** which sections you read, the exact suppression algorithm, how the digest templates are versioned, and any place the spec was ambiguous.

**Do not proceed to Task 15 until notifications are confirmed.**
