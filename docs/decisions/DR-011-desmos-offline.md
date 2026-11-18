# DR-011 — Desmos / GeoGebra Offline Licensing & Runtime Terms

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/05-assessment-item-spec.md §2

## Context
Interactive graphing and geometric construction items rely on Desmos or GeoGebra web components. In low-bandwidth and offline school deployment scenarios, local asset bundling and licensing terms must be clarified.

## Decision needed
Confirm technical packaging and licensing terms for offline graphing components.

## Options
Option A: Use offline-embeddable open-source GeoGebra/Mafs math engines for zero external licensing dependencies.
Option B: Secure OEM offline redistribution rights for Desmos API.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** The offline bundle depends on neither Desmos nor GeoGebra. Items and lesson blocks that need them are online-only and are never used for Tier 0 or for items required by A-11 (at least 2 auto-marked offline Tier-3 items per node). Offline graphing and construction use a permissively licensed library (a candidate is Mafs or JSXGraph) after a licence check. Licence terms for Desmos and GeoGebra are not assumed and not relied on.

**Why.** Offline-first is a commitment; relying on redistribution rights nobody has confirmed puts the 2 MB, offline bundle at the mercy of a third party. Using them online costs nothing in the pilot, which is Number and Fractions heavy.

**Consequences and follow-up.** Doc 05 A-11 stays satisfiable without these blocks. Licence check of the replacement library is an authoring-tools task before any graphing item is built.

**Revisit.** Revisit when graphing items enter scope.
