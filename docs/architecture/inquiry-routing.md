# Inquiry Routing — Generalization & BU-Routing Algorithm

**Status:** proposed — ADR-0055 (2026-06-09)
**Maintainer:** architect agent / owner

> **Scope:** This document specifies the `Inquiry` generalization (replacing `EventInquiry`)
> and the deterministic BU-routing algorithm. No LLM, no ML, no auto-routing.
> Schema operationalization is in ADR-0056 (Task 11).

---

## 1. Why generalize EventInquiry?

`EventInquiry` (Task 03, ADR-0034) was scoped to CUBE Premium. As Rauschenberger's
Motorworld-Inn and central catering operations also receive inquiries — via their own
websites, via email import, and via manual staff entry — a single brand-specific table
is insufficient.

`Inquiry` generalizes `EventInquiry` to:
- Support **5 source channels** (not just CUBE website).
- Route to **5 BusinessUnits** (not just event-specific flows).
- Carry **PII-sanitization** at the service layer (ADR-0021 §5).
- Be **audited** at the routing step (`InquiryClassificationAudit` table).

`EventInquiry` is **deprecated but not dropped** in this slice. A Phase 5.4 migration
provides the final cut-over with a backward-compatible DB view.

---

## 2. Status Workflow

```text
NEW
 │
 ├─► NEEDS_CLASSIFICATION   (routing rule found no match → human must classify)
 │
 ├─► NEEDS_HUMAN_REVIEW     (ambiguous signal, rule matched but low confidence)
 │
 ├─► OFFER_DRAFT            (manager has started composing offer)
 │
 ├─► APPROVED               (offer approved internally)
 │
 ├─► SENT                   (offer sent to client)
 │
 ├─► CONFIRMED              (client confirmed)
 │
 ├─► LOST                   (lost — no response or competitor)
 │
 ├─► REJECTED               (internally rejected — out of scope, spam)
 │
 └─► ARCHIVED               (closed, retained for reporting)
```

**Status transitions managed by:** Admin or assigned Manager.
**Auto-set transitions:** `NEW → NEEDS_CLASSIFICATION` is set by the classification
service when no routing rule fires. **No other** auto-transition is permitted in this
slice (mutation surface in ADR-0061).

---

## 3. Source Channels

| `source` value | Description |
|---|---|
| `RAUSCHENBERGER_WEBSITE` | Contact form on customer website (domain masked — see productization audit) |
| `CUBE_WEBSITE` | CUBE event-inquiry form |
| `MOTORWORLD_INN_WEBSITE` | Motorworld Inn reservation/event form |
| `MANUAL_ENTRY` | Staff enters inquiry directly in Cockpit |
| `EMAIL_IMPORT` | Ingest via ProcurementMailImport or future email-parse pipeline |

---

## 4. Subject Types

Used both for display and as a routing signal in `InquiryRoutingRule.matchSubjectTypes`.

```
BUSINESS_DINNER | CORPORATE_EVENT | INCENTIVE | WEDDING | PRIVATE_EVENT
| BIRTHDAY | CONFERENCE | SEMINAR | WORKSHOP | CHRISTMAS_PARTY
| PRODUCT_PRESENTATION | OTHER
```

---

## 5. Deterministic BU-Routing Algorithm

### 5.1 Invariants

- **No LLM.** Per ADR-0021 §3, no language model may classify, route, or score an Inquiry.
- **No auto-routing.** The algorithm produces a **suggestion** (`businessUnitHint`). A manager
  confirms or overrides in Cockpit. The actual `status` change is a separate mutation (ADR-0061).
- **Audit trail.** Every classification call records a row in `InquiryClassificationAudit`
  (matchedRuleId, matchedKeywords, confidence score 0–100, timestamp, callerUserId).

### 5.2 Rule structure (`InquiryRoutingRule`)

```
priority: Int          lowest fires first (1 = highest priority)
matchKeywords: String[]        lowercase, case-insensitive match on (rawMessage + subject)
matchSubjectTypes: InquirySubject[]    exact enum match
matchGuestCountMin: Int?       lower bound inclusive
matchGuestCountMax: Int?       upper bound inclusive
businessUnitHint: BusinessUnitName     target BU if rule fires
isActive: Boolean
```

### 5.3 Algorithm (pseudocode)

```
function classifyInquiry(input: { rawMessage?, subject?, guestCount?, inquiryId? }):
  ClassificationResult

  rules ← loadRules(isActive = true, orderBy = priority ASC)
  text  ← normalize(input.rawMessage + " " + input.subject)  // lowercase, strip diacritics

  for rule in rules:
    if matchesRule(rule, text, input.subject, input.guestCount):
      keywords ← findMatchedKeywords(rule, text)
      confidence ← computeConfidence(rule, keywords, input)
      audit ← writeClassificationAudit(rule.id, keywords, confidence, input.inquiryId)
      return {
        matchedRuleId: rule.id,
        businessUnitHint: rule.businessUnitHint,
        confidence: confidence,
        matchedKeywords: keywords,
        auditId: audit.id,
      }

  // No rule matched
  audit ← writeClassificationAudit(null, [], 0, input.inquiryId)
  return {
    matchedRuleId: null,
    businessUnitHint: null,
    confidence: 0,
    matchedKeywords: [],
    auditId: audit.id,
  }


function matchesRule(rule, text, subjectEnum, guestCount):
  keywordMatch ← any(k in rule.matchKeywords where text.includes(k))
  subjectMatch ← rule.matchSubjectTypes.length > 0
                 AND subjectEnum in rule.matchSubjectTypes
  guestMatch   ← (rule.matchGuestCountMin == null OR guestCount >= rule.matchGuestCountMin)
                 AND (rule.matchGuestCountMax == null OR guestCount <= rule.matchGuestCountMax)
  return (keywordMatch OR subjectMatch) AND guestMatch


function computeConfidence(rule, matchedKeywords, input):
  base ← matchedKeywords.length > 0 ? 60 : 0
  subjectBonus ← input.subject in rule.matchSubjectTypes ? 25 : 0
  guestBonus   ← guestCountInRange(rule, input.guestCount) ? 15 : 0
  return min(100, base + subjectBonus + guestBonus)
```

### 5.4 Confidence interpretation

| Score | Meaning |
|---|---|
| 85–100 | Strong match — Cockpit shows "Empfehlung: [BU]" |
| 60–84 | Partial match — Cockpit shows "Vorschlag: [BU]" |
| 1–59 | Weak match — Cockpit shows "Hinweis: [BU]" with review flag |
| 0 | No match → `status: NEEDS_HUMAN_REVIEW` |

---

## 6. InquiryClassificationAudit

Dedicated audit table (introduced in ADR-0056). Not derived from `WorkflowEvent`
because the semantics differ — it records the **decision trace of the routing algorithm**,
not a user-initiated workflow transition.

**Key fields:**
- `inquiryId String?` — nullable (classify-without-persist is allowed for draft testing).
- `matchedRuleId String?` — null when no rule fired.
- `matchedKeywords String[]` — which keywords triggered the match.
- `confidence Int` — 0–100.
- `businessUnitHint BusinessUnitName?` — resulting hint.
- `callerUserId String?` — who triggered classify (for manual Cockpit calls).
- `createdAt`.

---

## 7. PII-Sanitization Contract

All `GET /admin/inquiries*` endpoints (ADR-0057) apply the `pii-sanitizer` before
serializing the response. The sanitizer strips:

- `rawMessage` → replaced by `hasRawMessage: Boolean`
- `contactEmail` → replaced by `hasContactEmail: Boolean`
- `contactPhone` → replaced by `hasContactPhone: Boolean`
- `contactName` → replaced by `contactNameInitials: String` (e.g. `"J. D."`)
- `contactAddress` → dropped entirely in list responses; included in detail with masking

Full PII access (role-gated) is reserved for `GET /admin/inquiries/:id/full`,
which is scoped to ADR-0062 (Phase 5.5).

---

## 8. Migration Strategy: EventInquiry → Inquiry

| Phase | Action |
|---|---|
| ADR-0056 (Task 11) | Add `Inquiry` table. `EventInquiry` stays, gains `@deprecated` comment. |
| ADR-0057 (Task 12) | Read APIs use `Inquiry`; Cockpit CUBE views remain on `EventInquiry`. |
| Phase 5.4 (future) | DB view `public.event_inquiries` maps `EventInquiry → Inquiry` columns. Cockpit migrated. |
| Phase 5.5 (future) | `EventInquiry` table dropped; view removed. |

**No CUBE Cockpit path is broken in this slice.** All `EventInquiry`-based queries
in `apps/cockpit/` continue to hit the `EventInquiry` table until Phase 5.4.

---

## 9. Open Questions (resolved 2026-06-09)

| # | Question | Resolution |
|---|---|---|
| OQ1 | Separate audit table or reuse `WorkflowEvent`? | Separate `InquiryClassificationAudit` — different semantics. |
| OQ2 | `compatibilityScore` as Int or enum? | Int 0–100 — planner needs granularity. |
| OQ3 | `upcomingEvents` list: which statuses? | NEW, NEEDS_HUMAN_REVIEW, OFFER_DRAFT only. |
| OQ4 | `overview` endpoint date param? | Always "today" — historical snapshots need separate Reporting ADR. |
| OQ5 | `classify` without persisted Inquiry? | Yes — raw `rawMessage` input allowed for draft testing. |

---

## 10. Gate

Per ADR-0055:
- This document is part of the docs-only Phase A contract.
- `git diff --stat` shows only `docs/` changes.
- `prisma validate`, `typecheck`, `vitest` unchanged.

---

*Document owner: baum777 · Created 2026-06-09 · Governed by ADR-0055*
