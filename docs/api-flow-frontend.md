# API Flow – OAN Access-to-Credit System

Reference for how the frontend calls the backend: which endpoints are co-called, their frequency, request chains, loading strategy, and response shapes.

---

## 1. API Call Grouping (Co-Called APIs)


### Group A: Lead Detail Page Load (5 concurrent calls)
When a user opens a lead detail view, the frontend fires all of the following in parallel:

| Call | Endpoint |
|------|----------|
| Lead basic info | `get_basic_profile?lead_id=` |
| Credit info | `get_lead_credit_infos?lead_id=` |
| Call logs | `get_lead_call_logs?lead_id=` |
| Timeline / activities | `get_lead_timeline?lead_id=` |
| Visit schedules | `get_visit_schedules?lead_id=` |

**Implementation Note:** The orchestrator component for this view is `NewLeadDashboard` (renamed from `LeadDashboard` and relocated from `src/features/leads/components/` to `src/features/new-lead/components/new-lead/NewLeadDashboard.tsx`), since it is composed entirely of `new-lead` selection and display sub-sections.

---

### Group B: Leads Dashboard Initial Load (2 concurrent calls)
Every time the leads dashboard mounts or filters change:

| Call | Endpoint |
|------|----------|
| Lead list | `get_leads?{filters}` |
| Lead summary/counts | `get_lead_summary` |

---

### Group C: Loan Dashboard Initial Load (2 concurrent calls)

| Call | Endpoint |
|------|----------|
| Loan list | `get_all_loans?{filters}` |
| Loan summary/counts | `get_loan_summary` |

---

### Group D: New Loan Application Creation — single call
`create_loan_application` is atomic: it creates the application, advances the lead to `Processed`
(only from `Active`/`Verified`; never overrides a terminal state), and returns the full `application`
object plus `lead_status` + `lead_status_updated`. The frontend uses this single response for both
the new loan and the updated lead status — no separate `update_lead_status` or `get_all_loans` refetch.

---

### Group E: Lead Creation + Metadata (2 calls on New Lead form mount)

| Call | Endpoint |
|------|----------|
| Lead metadata (sources, statuses, loan types) | `get_lead_metadata` |
| _(After creation)_ Specific lead fetch | `get_leads?search_query={lead_id}` |

---

## 2. Call Frequency & Priority

### High-Frequency

| Endpoint | Trigger | Frequency |
|----------|---------|-----------|
| `get_leads` | Every filter change, tab switch, status update | Very High |
| `get_lead_summary` | Same as above (paired with get_leads) | Very High |
| `get_lead_detail` sub-calls | Every lead card click | High |
| `get_all_loans` | Every loan filter change | High |
| `get_loan_summary` | Paired with get_all_loans | High |
| `update_loan_step` | Every wizard step navigation (prev/next) | High |

**Notes:**
- `get_leads` and `get_all_loans` are server-side paginated (`start`/`page_length`, default 20, with `total_count`).
- DB indexes (`search_index`) exist on `status` and `assigned_to`. `creation` is indexed by the
  backend natively; `lead_id` filters resolve via the linked-doctype subquery, so no extra index is
  needed on Lead itself.
- `get_leads` folds each lead's **latest** visit (`visit_date` + `schedule_status`) into the list
  response via a single query scoped to the current page's leads (mirrors the credit-info batch
  pattern). No field is stored on the Lead and no write-back hook fires on visit changes, so there is
  no sync cost or staleness. The list reads `schedule_status` / `visit_date` from this response;
  `get_visit_schedules` is used only on the lead **detail** page for full visit history (Group A).

---

### Medium-Frequency

| Endpoint | Trigger |
|----------|---------|
| `get_lead_credit_infos` | Lead detail open |
| `get_lead_timeline` | Lead detail open |
| `get_lead_call_logs` | Lead detail open |
| `get_full_profile` | Loan detail modal open |
| `get_supporting_documents` | Loan detail modal open |

**Notes:**
- `get_full_profile`, `get_supporting_documents`, and `get_credit_info` are memoized per
  `application_id` for the session.

---

### Low-Frequency

| Endpoint | Trigger |
|----------|---------|
| `login` / `logout` | Session boundary |
| `create_lead` | New lead form submit |
| `create_loan_application` | Loan form initiation |
| `upload_supporting_documents` | Document upload |
| `delete_supporting_document` | Document delete |
| `schedule_visit` | Visit scheduling |
| `update_visit_schedule_status` | Status update on visit |
| `search_farmer` | Fayda ID lookup |
| `request_otp` / `verify_otp` | Consent flow |
| `get_assignable_users` | Assignment modal open, search input |

**Notes:**
- `get_assignable_users` (search-as-you-type) is debounced with a 300ms delay and a minimum 2-character threshold.

---

## 3. Data Flow & Dependencies (Request Chains)

### Chain 1: Consent Flow
```
searchFarmer(fayda_id)
  └─► sendOtpAndCreateConsent(fayda_id, ...)
        └─► verifyOtp(consent_request, otp_code)
              └─► submitConsent(consent_request, consent document, ...)
```
The consent flow is not lead-anchored. `request_otp` returns the
`consent_request` identifier, which is passed to `verify_otp` and
`submit_consent`; `lead_id` is not required by these calls.

**Optimization:** `verifyOtp` response should return the updated consent state so
an additional consent-state refetch is unnecessary.

---

### Chain 2: Loan Application Creation
```
createLoanApplication(lead_id)   [returns application object + lead_status='Processed', atomically]
```
The endpoint is atomic — it advances the lead to `Processed` and returns the full new loan object,
so no separate `updateLeadStatus` or `getLoans` refetch is needed (see Group D above).

---

### Chain 3: Loan Wizard Navigation
```
createLoanApplication(lead_id)   [on wizard start]
  └─► updateLoanStep(id, step)   [on each Next click]
  └─► updateLoanStep(id, step)   [on each Back click]
  ...
  └─► uploadSupportingDocument() [step-gated]
  └─► submitApplication()        [final step]
```

---

## 4. Data Loading Strategy

### On User Action (lazy, triggered)
| Data | Trigger | Endpoint |
|------|---------|----------|
| Lead detail | Click lead card | `get_lead_detail` (proposed aggregate) |
| Loan full profile | Open loan modal | `get_full_profile` |
| Supporting documents | Open docs tab in loan modal | `get_supporting_documents` |
| Loan credit info | Open credit tab | `get_credit_info` |
| Assignable users | Open assign modal + type | `get_assignable_users` (debounced) |
| Farmer search | Fayda ID submit | `search_farmer` |
| OTP request | Consent form submit | `request_otp` |

---

### On Filter Change (debounced, ~400ms)
| Data | Endpoint |
|------|----------|
| Filtered lead list | `get_leads` |
| Filtered loan list | `get_all_loans` |

---

### Optimistic Updates (no refetch needed)
| Action | Optimistic behavior |
|--------|-------------------|
| `update_lead_status` | Update Redux state immediately; revert on error |
| `assign_lead` | Update `assignedTo` field in lead record immediately |
| `update_visit_schedule_status` | Update status locally |
| `add_lead_comment` | Append comment to timeline locally |
| `add_lead_credit_info` | Append credit item locally |

---

### Polling / WebSocket (future consideration)
| Use Case | Recommendation |
|----------|---------------|
| Lead status changes (from external webhook, e.g. consent callback) | Short-poll `/get_leads` every 30s OR use WebSocket push for status-change events |
| Loan status changes (bank processing) | Same — poll `get_loan_summary` or subscribe to push |
| OTP verification result | Already synchronous via `verify_otp` — no change needed |

---

## 5. Response Shape Optimization

### Over-fetching Issues

#### `get_leads` response
The frontend only renders: `id, name, phone, status, location, loanType, loanAmount, source, assignedTo, creation, visitDate, scheduleStatus`.

Currently the response likely includes full backend document metadata (`owner`, `modified_by`, `docstatus`, `idx`, `__islocal`, etc.). Strip these server-side.

**Recommendation:** Return a projection:
```json
{
  "results": [
    {
      "lead_id": "string",
      "full_name": "string",
      "phone": "string",
      "status": "string",
      "location": "string",
      "loan_type": "string",
      "loan_amount": "number",
      "lead_source": "string",
      "assigned_to": "string | null",
      "creation": "ISO8601",
      "visit_date": "ISO8601 | null",
      "schedule_status": "string | null",
      "farmer_id": "string | null",
      "consent_date": "ISO8601 | null"
    }
  ],
  "total_count": "number",
  "summary": {
    "total": 0, "active": 0, "verified": 0,
    "processed": 0, "rejected": 0, "dormant": 0
  }
}
```

---

#### `get_lead_metadata` response
This is static configuration data (`sources`, `statuses`, `loan_types`) derived from doctype Select
options, which only change on the next backend migration. It is cached server-side in Redis
(key `a2c_lead_metadata`, `expires_in_sec=3600`); RBAC is still enforced on every request, only the
meta computation is cached.

---

### Under-fetching

#### `create_lead` response
`create_lead` returns the full lead object (`data.lead` with name, phone, names, email, source,
external_id, status) alongside `lead_id`. The frontend consumes `data.lead` directly, so no
post-creation `get_leads?search_query={lead_id}` refetch is needed.
