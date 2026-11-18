## TASK 15 — Infrastructure, Deployment, and Release Pipeline

---

**Context:** Tasks 1–14 complete and confirmed. The engine, backend, Content Studio, web, mobile, and sync are stable in development. Nothing is deployed. There is no production environment, no release pipeline, no observability. The reference device exists on a desk but is not part of any automated flow.

**Your task:** Stand up production infrastructure, the release pipeline, observability, and the runbooks that make operating the platform a known process rather than a heroic one.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§8** — repository structure
2. `docs/00-product-plan.md` **§9** — engineering standards, especially §9.5 (CI gates), §9.6 (review), §9.7 (release), §9.8 (reference device), §9.9 (definition of done)
3. `docs/10-engineering-standards.md` **§5** — CI gates
4. `docs/10-engineering-standards.md` **§7** — release and staged rollout
5. `docs/10-engineering-standards.md` **§8** — reference device

**Deliverables, in order:**

### 15.1 Environments

Three environments, all reproducible from code:

- **`dev`** — local Docker Compose; Null providers; SQLite optional for ultra-fast iteration but Postgres is required for anything touching JSONB or migrations.
- **`staging`** — production-shaped, single-region, synthetic data only. Every PR merges to staging automatically.
- **`prod`** — multi-region, real data, restricted access, every deploy requires a two-person approval.

No environment may use a shared secret with another. Secrets are managed in a dedicated secrets store (Infisical, Vault, or cloud-native equivalent).

### 15.2 Infrastructure as code

- Terraform (or Pulumi) for all cloud resources.
- Docker Compose for local. Kubernetes manifests (or a managed equivalent — ECS, Cloud Run) for staging and prod.
- The IaC is in `infra/`, versioned with the code, reviewed like code.
- Every infrastructure change goes through a PR. No console changes to prod.

### 15.3 Container builds

- Multi-stage Dockerfiles for `backend`, `web`, `content-tools`.
- Builds are deterministic: pinned base images, pinned dependencies, no `latest` tags.
- Images are signed (cosign or equivalent) and scanned (Trivy or equivalent) in CI. A critical vulnerability blocks the release.
- Flutter builds are not containerised — they run on a macOS runner for iOS and a Linux runner for Android. Signing keys are in the secrets store, rotated quarterly.

### 15.4 Database operations

- Alembic migrations run automatically on deploy to staging; on prod they run in a **separate** job, with an explicit approval step.
- Every migration is tested against a production-shaped snapshot before merge. The test asserts both `upgrade` and `downgrade`.
- Long-running migrations use the expand-contract pattern: add new column → backfill → dual write → cutover → drop old column. Never a single migration that rewrites a large table.
- Nightly snapshots to object storage, retained 30 days; weekly to cold storage, retained 1 year.
- A restore drill runs monthly against staging. A runbook documents it.

### 15.5 Redis and Weaviate operations

- Redis is used for cache and Celery broker. Cache and broker are separate logical databases with separate eviction policies (cache: `allkeys-lru`, broker: `noeviction`).
- Weaviate runs with a persistent volume, daily backups to object storage, and a restore drill on the same monthly cadence as Postgres.
- A Weaviate reindex job exists and is tested. If the vector store is lost, the pipeline that repopulates it is a single command.

### 15.6 Release pipeline

Per doc 10 §7:

- **Server (backend + web):** continuous deploy to staging on merge. Prod deploy behind a manual approval, in a canary window.
- **Mobile:** fortnightly releases. Android via Play Store internal → closed → production tracks. iOS via TestFlight → App Store phased release.
- **Content (frameworks, items, content):** content changes deploy through the Content Studio review queue, not through the code pipeline. A content deploy is a promotion of an approved framework version, with the same canary logic as code (2 pilot schools → 10% → 100%).
- **Engine changes:** require a second reviewer, a simulation diff, and a parity test run. Deploy server first, then web, then mobile — in that order, verifying state parity after each step. Mobile has a longer tail because users update slowly; the parity contract is what makes this safe.

### 15.7 Feature flags

- A flags service (Unleash, Flagsmith, or home-built) is required. No flags in environment variables.
- Every learner-facing feature is behind a flag on first release.
- Flags are documented with an owner and a removal date. Stale flags are removed quarterly — enforced by a CI job that fails after the removal date.
- Flags are evaluated per learner, per framework, and per cohort.

### 15.8 Observability

- **Metrics:** Prometheus-compatible. The platform emits metrics for the engine (per doc 04 §14), the API (per endpoint, latency, error rate), the pipelines (per prompt, per model, per framework), the sync path (parity matches, anomalies), and the notification scheduler (deliveries, suppressions).
- **Traces:** OpenTelemetry across backend, Celery workers, and the SDK clients. Sampling rate is high on error paths, low on success paths.
- **Logs:** structured JSON, correlated by trace ID. PII is never logged; a lint rule enforces this.
- **Dashboards:** a single operational dashboard lists:
  - Engine invariants currently violated (must be zero — paged).
  - Simulation drift since last merge.
  - Sync parity mismatches.
  - Cost per framework per day.
  - Notification delivery rate and suppression breakdown.
- **Alerts:** paging on invariant violation, parity mismatch, sync anomaly recurrence (3 in a row), pipeline failure rate > 5% over 15 minutes, cost per framework exceeding 2× its running average.

### 15.9 The reference device in CI

Per doc 10 §8, the reference device is not a suggestion. It is wired into the pipeline:

- A physical device (2GB RAM, Android 8) is connected to a self-hosted runner.
- On every PR touching `web/` or `mobile/`, an automated suite installs the build, runs the golden-path flow, measures cold start and memory, and reports.
- Fails the PR if cold start > 2.5 s or memory > 180 MB.
- A weekly manual pass by a human is still required, documented as a checklist in `docs/runbooks/reference-device-weekly.md`.

### 15.10 Runbooks

`docs/runbooks/`:

- `incident-response.md` — severity levels, on-call rotation, escalation.
- `database-restore.md` — Postgres restore from snapshot, verified quarterly.
- `weaviate-restore.md` — vector store rebuild from Postgres, verified quarterly.
- `framework-rollback.md` — reverting a framework to a superseded version, forcing affected learners onto it, and notifying them.
- `content-quarantine.md` — withdrawing an item or content from serving without losing historical attempts.
- `engine-rollback.md` — the exact procedure for rolling back the engine across server, web, and mobile, including the parity verification at each step.
- `reference-device-weekly.md` — the checklist from doc 10 §8.
- `cost-spike.md` — what to do if a framework's generation cost exceeds budget.

### 15.11 Access and secrets

- No engineer has standing access to prod. Access is granted per incident, expires in 24 hours, and is logged.
- All secrets are rotated quarterly, or immediately on any suspected exposure. Rotation is tested — the platform remains available through a rotation.
- The signing keys for mobile releases are held in a hardware token, not in the cloud. Documented in `docs/runbooks/mobile-signing.md`.

### 15.12 Tests

- Infrastructure tests: `terraform plan` runs on every PR; the plan is reviewed for unexpected changes.
- Deploy tests: a staging deploy runs a smoke suite (auth, onboarding, placement, one practice item, one sync).
- Rollback tests: every runbook has a corresponding automated test that performs the action in staging and verifies the platform remains available.
- Cost gate: daily cost report for each framework is compared to the running average; an alert fires on 2× drift.

### 15.13 CI gates

- All existing gates (Tasks 1–14) still pass.
- Container image scan — fail on critical vulnerability.
- Terraform plan — fail on unexpected resource creation or destruction.
- Deploy smoke suite — fail if any critical path is not green within 5 minutes of staging deploy.
- Reference device suite — fail on cold start or memory budget exceedance.
- Migration `downgrade` test — fail if any migration's downgrade does not restore the previous schema.
- PII logging lint — fail if any log statement includes a field marked `x-pii`.

**Definition of done:**

- All three environments reproducible from code.
- CI runs the full gate suite; every gate fails when deliberately violated.
- Every runbook exists and has a passing automated test in staging.
- The reference device is wired into CI on both web and mobile pipelines.
- Observability dashboards and alerts are live in staging.
- Feature flag service is live; every learner-facing flag has an owner and a removal date.
- Secrets rotation is tested and passes.
- The first production deploy has run end-to-end with two-person approval.
- A post-deploy verification checklist has been executed and signed off.

**Report at the end:** which sections you read, the exact release sequence for engine changes (server → web → mobile), how the reference device is wired into CI, and any place the spec was ambiguous.
