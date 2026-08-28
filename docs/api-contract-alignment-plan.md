# API Contract Alignment Plan

Scope: reconcile the frontend with the three backend contracts
(`api-flow-backend.md`, `api-flow-farmer.md`, `api-flow-seller.md`), focused on
the **bank/dev-agent Application List** and the **farmer My Applications** page.

The single theme behind almost every item: the backend moved to **per-bank
dynamic pipeline stages** (`stage_id` / `stage_label` / `archetype_state`), while
the frontend still speaks the retired fixed vocabulary
(`Draft` / `Pending Review` / `Processing` / `Action Required` / `Approved`).
`get_all_loans` now **rejects** unrecognised `status` values with 400, so this is
not cosmetic drift — the filters actively break the list.

---

## Phase 0 — Contract layer (do first; everything else depends on it)

**`src/lib/api/api.schemas.ts`**

1. `loanApplicationSummarySchema` vs the real `get_all_loans` row:
   - Add `bank`, `region`, `woreda`, `kebele`, `sequence`, `is_terminal`, `is_successful`.
   - **Remove `location`** — the endpoint never sends it (see Phase 1.1).
   - Make `step` optional: the farmer's `list_applications` rows do not carry it.
2. Add `farmerApplicationSummarySchema` for `farmer.applications.list_applications`
   (`requested_amount`, `loan_amount`, `stage_id`, `stage_label`, `sequence`,
   `is_terminal`, `is_successful`, `loan_product`, `loan_product_name`, `bank`,
   `creation`) — it is a *different* shape from `get_all_loans` and should not
   reuse the same schema.
3. Add `loanMetadataSchema` for `loan_applications.get_loan_metadata`:
   `{ statuses: [{ status, stage_id, sequence, is_terminal, is_successful }] }`.

**`src/features/loans/api/loan.service.ts`**

4. `LoanSummaryMetrics`: drop `by_status`. `get_loan_summary` returns
   `{ total, stages, tab_counts }` — there is no `by_status` key, so every
   selector reading `by_status['In Transition']` is reading `undefined` today.
5. `GetLoansParams`: drop `location`; add `region`, `woreda`, `kebele`,
   `archetype`. Document that `status` takes stage labels/`stage_id`s (JSON-array
   string preferred) and `loan_officer` takes an **email** or the literal
   `unassigned`.
6. Add `loanService.getLoanMetadata()` → `oan_a2c.api.v1.loan_applications.get_loan_metadata`.
   This is the **role-agnostic** source of visible statuses (Bank → own stages,
   Farmer → banks applied to, Dev Agent/Admin → union). It is the replacement for
   `seller.loan_stages.get_stages` everywhere outside the bank portals.
7. `submitApplication()` hardcodes `status: 'Processed'`. With per-bank stages
   that label is not guaranteed to exist. Resolve the bank's initial stage, or
   route farmer/dev submissions through `farmer.applications.submit_application`.

**`fetchApi`** — verify the `validate_lead` quirk is handled: `get_basic_profile`,
`update_basic_profile` and `create_loan_application` return HTTP 400/404 with an
envelope that still says `"status": "success"` and an inline `data.error`. The
HTTP status must be checked first for those three.

---

## Phase 1 — Bank Application List (agent + admin share `AgentApplicationListClient`)

Files: `src/features/loans/store/bankApplicationsSlice.ts`,
`src/app/(dashboard)/(bank-agent)/agent-application-lists/*`.

1. **Location column is permanently `—`.** `selectRowsData` maps `row.location`,
   but `get_all_loans` returns `region` / `woreda` / `kebele`. Compose the display
   string from those three, and use `region` for the region field.
2. **Location filter is a no-op.** `selectBankQueryParams` sends `params.location`;
   the endpoint has no such parameter. Send `region` (hierarchical `LIKE 'value%'`
   prefix match), optionally `woreda`/`kebele`.
3. **Status filter can 400.** `BANK_STATUS_OPTIONS` (`Processed` / `Approved` /
   `Rejected`) is used as a fallback before stages resolve; those values are not
   valid stage labels for every bank and `get_all_loans` throws
   `400 VALIDATION_ERROR` on an unrecognised status. Drop the hardcoded fallback —
   disable the status filter while `isStagesLoading`, and build options only from
   the resolved stages.
4. **KPI cards.** `selectBankMetrics` falls back to `summary.by_status[...]`,
   which does not exist. Rebuild from `summary.data.stages` (per stage-label
   counts) folded into archetypes via the stage list, with `summary.data.total`
   for the total.
5. **Add the `archetype` filter** (`Active` / `In Transition` / `Completed` /
   `Rejected`) as the coarse tab row. It is backend-validated and bank-agnostic,
   so it works even before per-bank stages load.
6. **Status-update action.** `UPDATABLE_STATUSES` / `STATUS_UPDATE_REASONS` in
   `loans.constants.ts` still list `Pending Review` / `Action Required` / `Draft`.
   `update_loan_status` resolves against bank stages, so drive the target list
   from the stage list and disable the action when the current stage
   `is_terminal`.

---

## Phase 2 — Dev-agent Application List + Loan Dashboard

Files: `src/app/(dashboard)/(dev-agent)/dev-application-lists/page.tsx`,
`src/features/loans/store/loanDashboardSlice.ts`, `LoanTable.tsx`,
`LoanAdvancedFilters.tsx`.

1. **`fetchBankStages` 403s for a Development Agent.** The dev list page renders
   the bank client verbatim, which dispatches `fetchBankStages()` →
   `seller.loan_stages.get_stages`, an endpoint restricted to bank roles with a
   bank binding (and requiring an explicit `bank` for platform admins). Switch the
   dev-agent path to `get_loan_metadata` (Phase 0.6), or parameterise the client
   with a stage-source thunk.
2. **`fetchLoanStages` result is discarded.** The thunk exists in
   `loanDashboardSlice` and is dispatched by `LoanApplicationsTable`, but the
   slice has **no `extraReducers` case for it** — `state.stages` is always `[]`.
   Consequently `selectLoanStageOptions` is empty, `LoanTable` falls back to a
   hardcoded `['Submitted','Underwriting','Approved','Disbursed','Rejected']`
   list, and `selectLiveMetrics` renders `—`. Wire the cases (and repoint the
   thunk per item 1).
3. **`selectQueryParams` sends retired statuses.** The tone→status mapping emits
   `Pending Review`, `Processing`, `Action Required`, `Draft`, `Approved` — each
   an unrecognised stage → `400 VALIDATION_ERROR`. Rebuild status selection from
   metadata stages, and express the tone-style grouping as `archetype`.
4. **`NO_STATUS_SENTINEL` (`__NONE__`) will 400.** Remove it; represent "no
   statuses selected" client-side by rendering an empty result without a request.
5. **`loan_officer: 'my'`** is sent literally; the backend expects an email
   (`unassigned` is the only literal). Send the signed-in user's email.
6. **`params.location`** — same fix as Phase 1.2.
7. `LOAN_FILTER_STATUS_OPTIONS` / `SELLER_FILTER_STATUS_OPTIONS` in
   `loans.constants.ts`: delete, or reduce to archetype options.

---

## Phase 3 — Farmer "My Applications"

Files: `src/features/(farmer-application)/{types,api/farmerApi.ts,my-applications/*}`.

1. **`FarmerLoanApplication.status` is a 4-value union**
   (`'Draft' | 'Under Review' | 'Disbursed' | 'Rejected'`). None of those are what
   the endpoint returns: a draft is `Active`, and everything else is a *bank-defined
   stage label*. Change to `status: string` and add `stage_id`, `stage_label`,
   `sequence`, `is_terminal`, `is_successful`.
2. **Tabs and summary cards are hardcoded to those four literals**
   (`counts.ts`, `ApplicationList.tsx`, `ApplicationSummary.tsx`), so for most
   banks every tab reads 0 and the list filters to nothing. Re-cut the tabs by
   **archetype**: Drafts (`Active`) / In Progress (`In Transition`) / Completed
   (`is_successful`) / Rejected (`is_terminal && !is_successful`), and filter
   server-side via the `archetype` parameter.
3. **Pagination is ignored.** `getMyApplications()` is called with no arguments,
   so only the first 20 applications ever load, and the tab counts are computed
   over that one page. Pass `page`/`page_size`, read `pagination.total`, and add
   paging controls.
   - *Backend gap:* there is no farmer equivalent of `get_loan_summary`, so true
     per-tab counts need either one `page_size=1` call per archetype (4 cheap
     calls, read `pagination.total`) or a new summary endpoint. Recommend asking
     for the endpoint; use the 4-call approach in the interim.
4. **Card/modal themes are keyed by the same four literals**
   (`ApplicationCard.tsx`, `ApplicationActionModal.tsx`) — every real stage falls
   to `fallbackTheme`. Key off archetype/`is_terminal` and reuse
   `getStageStyle()` from `features/loans/utils/stageStyles.ts` so farmer and bank
   badges agree.
5. **The "Resume Draft" / submit path never appears.** `ApplicationActionModal`
   gates on `currentStatus === 'Draft'`; the real draft status is `Active`. Also
   surface `submit_application`'s two documented 400s — not `Active`, and
   *consent missing or not approved* — rather than a generic failure.
6. **`interest_rate` / `tenure_months` are not returned** by `list_applications`,
   so `formatRate` / `formatTenure` always render the placeholder. Either drop the
   two card slots, hydrate them from the product catalog, or request the fields on
   the list response.

---

## Phase 4 — Adjacent farmer drift (same feature, worth folding in)

1. `getProduct()` calls **`seller.loan_products.get_product`** — a seller endpoint
   requiring `read` on `A2C Loan Product`. An `A2C Farmer` will get 403. There is
   no farmer product-detail endpoint in the contract; **backend ask**.
2. `getCatalog()` sends `tenure_months` and `loan_product`, neither of which
   `list_catalog` accepts, and omits `bank`, `region`, `tag`, `is_saved`,
   `min_tenure_months`, `max_tenure_months`, `min_interest_rate`-side sorting.
3. `CatalogFacets` type does not match the response: categories/tags are
   `{ id, name }` objects, and `regions`, `banks`, `tenure_range` are missing.
4. `FarmerDashboardSummary` declares `top_loan_offers` and
   `available_loan_types`; `get_dashboard_summary` returns only `farmer_profile`
   and `recent_applications`, so `TopLoanOffersCard` and `AvailableLoanTypes`
   render empty. Either drop them or feed them from `list_catalog`.

---

## Backend asks

- Farmer application **counts/summary** endpoint (Phase 3.3).
- Farmer-accessible **product detail** endpoint (Phase 4.1).
- `interest_rate` / `tenure_months` on farmer `list_applications` rows (Phase 3.6).
- Fix the `validate_lead` malformed envelope (`status: "success"` on 400/404).

## Test updates

`bankApplicationsSlice.test.ts` and `stageStyles.test.ts` fixtures carry the old
`location` field and legacy statuses; update alongside Phase 0–2. Add coverage for
the query-param builders (no retired status ever leaves the client) and for the
farmer archetype tab mapping.
