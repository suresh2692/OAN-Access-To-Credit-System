# Frontend Development Guide — OAN Access-to-Credit System

This document is the required reading for anyone writing frontend code in this repository. It captures the coding standards, architecture rules, and core features that every change must follow. If a change conflicts with this guide, either fix the change or update this guide deliberately (not silently).

---

## 1. Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict mode)
- **State:** Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Styling:** Tailwind CSS 4 (utility classes) + SCSS modules for complex components
- **Validation:** Zod (API response schemas, form validation)
- **Testing:** Vitest + MSW (Mock Service Worker)
- **Backend:** Frappe (Python), consumed only through the same-origin proxy — never called directly from the browser

---

## 2. Project Architecture — Import Boundaries Are Enforced

The codebase enforces a **strict, one-directional dependency graph** via `eslint-plugin-boundaries` in [eslint.config.mjs](../eslint.config.mjs). Violations are linted, so understand this before adding imports.

```
app (routing)  →  feature (via index.ts barrel only)  →  shared UI / lib
```

Rules:
- **`src/app/**`** — routing only. May import `feature`, `shared`, `lib`, `store`, `hooks`, `types`.
- **`src/features/*/**`** — a feature may import `shared`, `lib`, `hooks`, `types`, `store`, and its **own** internals. It may **not** import another feature's internals directly (only through cross-feature `index.ts` barrels where explicitly wired, e.g. `new-lead` thunks used by `leads`).
- **`src/components/**`** (shared/ui) — may import `lib`, `hooks`, `types` only. No feature imports.
- **`src/lib/**`** — leaf layer. May only import `types`. Never import from `app`, `features`, `store`, or `components`.
- **`src/store/**`** — may import `types`, `lib`.
- **`src/hooks/**`** — may import `lib`, `types`.
- **From outside a feature, you must import from its `index.ts` barrel**, not from internal paths like `features/leads/store/leadSlice` directly. Add new public exports to the barrel.

When adding a new feature or shared module, follow this graph. Don't reach "sideways" into another feature's `components/`, `store/`, or `api/` folders.

---

## 3. Feature Module Structure

Every feature under `src/features/<name>/` follows the same internal shape:

```
features/<name>/
  api/          # *.service.ts — raw fetch calls to the backend via /api/proxy
  components/   # feature-scoped React components
  constants/    # enums, static config
  hooks/        # feature-scoped hooks
  store/        # Redux slice(s): <name>Slice.ts with thunks + selectors
  types/        # <name>.types.ts
  index.ts      # PUBLIC barrel — the only import path used from outside the feature
```

When adding a feature:
1. Create the folders above as needed (not all are mandatory — only what the feature uses).
2. Export everything consumed outside the feature (services, thunks, selectors, action creators, types) from `index.ts`.
3. Keep backend request-shaping (query params, response parsing) inside `api/*.service.ts`, not inside components or thunks.

---

## 4. State Management (Redux Toolkit)

- One slice per feature domain in `store/<name>Slice.ts`, combined in [src/store/index.ts](../src/store/index.ts).
- Async work uses `createAsyncThunk`. Thunks catch errors and call `rejectWithValue(error.message)` — never let a raw error object hit the store; always reduce it to a string message.
- Always support `AbortSignal` (the `signal` from thunk API) for requests tied to component lifecycles, and let `AbortError` re-throw instead of being swallowed by `rejectWithValue`.
- Export **selectors** alongside the slice (`selectX`) instead of reading `state.feature.x` inline in components.
- Global cross-cutting concerns live as **store middleware**, not per-component logic:
  - `unauthenticatedMiddleware` — a 401 (`ApiErrorCode.Auth`) anywhere triggers a global logout + redirect.
  - `permissionToastMiddleware` — surfaces permission-denied toasts for rejections no component explicitly handles.
  - `storageMiddleware` — persists specific slices (e.g. in-progress loan form) to `sessionStorage`, never `localStorage`, to avoid persisting PII.

Do not add new ad-hoc global side effects in components — add middleware if the behavior must be global.

---

## 5. API Layer & Error Handling

- All backend calls go through `/api/proxy/api/method/...` (never a direct absolute backend URL from client code). The proxy is what attaches auth and enforces same-origin.
- Use [src/lib/api/fetchApi.ts](../src/lib/api/fetchApi.ts) or the pattern within it (timeout via `AbortController`, single-flight session refresh on 401) for new raw calls — don't reinvent fetch wrappers per feature.
- Validate/parse backend responses with **Zod schemas** in [src/lib/api/api.schemas.ts](../src/lib/api/api.schemas.ts) when the shape matters beyond simple pass-through, especially for anything used in forms or financial calculations.
- Classify every API failure using [src/lib/api/apiErrors.ts](../src/lib/api/apiErrors.ts) (`ApiErrorCode`, `classifyError`) instead of string-matching errors ad hoc:
  - `UNAUTHORIZED` (401) → handled globally, triggers logout. Don't catch/suppress this in a component.
  - `FORBIDDEN` (403) → render `AccessDenied`-style UI. Never logs the user out.
  - `CONNECTION` (5xx / network / timeout) → render a retryable `ConnectionError`-style UI.
- Never hardcode these sentinel strings elsewhere — import `ApiErrorCode`.
- **Never leave a `catch` block empty or with only a comment.** Every catch must either: re-throw, call `logger.error(...)`, or set visible UI error state. "Silently ignore" is only acceptable for a deliberate, narrow case (e.g. aborting an in-flight request on unmount) — and that reason must be a one-line comment explaining why, not a blank block.
- Pick **one** reporting channel per layer and stay consistent: services/thunks log with `logger.error` (never `console.*` directly); user-facing failures surface via `toast.error` from a component/thunk-consumer, not from inside the service layer itself.

---

## 6. Security Requirements (non-negotiable)

- **RBAC is UX-only on the frontend.** [src/features/auth/rbac.ts](../src/features/auth/rbac.ts) and [src/proxy.ts](../src/proxy.ts) route users to the right portal and block obviously-wrong navigation, but **the backend is the actual authorization boundary**. Never assume a frontend route guard is a security control — don't skip backend permission checks because "the UI already hides it."
- **CSRF:** state-changing Next.js API routes must call `checkCsrf(request)` from [src/lib/csrf.ts](../src/lib/csrf.ts) before performing the action.
- **CSP:** the proxy sets a per-request nonce + strict CSP. Do not add inline `<script>`/`<style>` or `eval`-like patterns that would require loosening it.
- **Cookies:** auth tokens are `HttpOnly` cookies set by server-side API routes, never stored in `localStorage`/`sessionStorage` or exposed to client JS.
- **Sensitive data:** mask sensitive identifiers (national IDs, etc.) using `maskSensitiveId()` in [src/lib/utils.ts](../src/lib/utils.ts) rather than rendering raw values by default.
- **File URLs:** backend file URLs must be rewritten with `toProxiedFileUrl()` before use in `<img>`/links — direct backend file URLs will fail CSP and lack auth headers.
- Never construct URLs or fetch targets from unvalidated user input.

---

## 7. TypeScript Standards

`tsconfig.json` runs in strict mode with extra safety flags — write code that satisfies them, don't disable them:
- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`.
- Use the `@/*` path alias (`@/features/...`, `@/lib/...`, `@/components/...`) instead of relative `../../../` chains for anything outside the immediate folder.
- Prefer explicit `type`/`interface` exports colocated in each feature's `types/` folder; import types with `import type { ... }`.
- **`any` is not allowed** in auth, API service, or Redux store code — type the real shape (or `unknown` + a narrowing check) instead. A `catch (error: any)` should be `catch (error)` with `error instanceof Error` narrowing. If a third-party/mock payload genuinely can't be typed yet, use `unknown` and note why, not `any`.
- Don't add `// eslint-disable` to silence a rule — fix the underlying issue, or if the rule genuinely doesn't apply, ask a senior reviewer before disabling it (and disable only the specific line, never the file).

---

## 8. Component & Styling Conventions

- Shared, reusable UI primitives live in `src/components/ui/` (e.g. `Button.tsx`, `SelectField.tsx`, `TextField.tsx`) — check here before building a new generic control. **Do not create a second version of an existing primitive** (e.g. a new `InputField` when `TextField` already exists) — extend the existing one with a prop instead.
- Shared UI components use `forwardRef`, accept `variant`/`size` style props with explicit `Record<Variant, string>` class maps, merge classes with `cn()` from [src/lib/utils.ts](../src/lib/utils.ts) (which wraps `clsx` + `tailwind-merge`) — don't concatenate class strings manually.
- **No hardcoded hex colors or one-off arbitrary Tailwind values** (`bg-[#16A34A]`, `w-[280px]`, ad hoc `shadow-[...]` strings). Use the palette/spacing defined in [tailwind.config.mts](../tailwind.config.mts) (extend it with a named token if the value doesn't exist yet, e.g. `brand-green`, `sidebar-width`) so a color/size change is a one-line update, not a repo-wide find-replace.
- Prefer Tailwind utility classes for layout/styling. Use `.module.scss` only for styling too complex/stateful for utility classes (see `Sidebar.module.scss`, `TopHeader.module.scss`).
- Keep components colocated with their owning feature (`features/<name>/components/`) unless truly generic/cross-feature, in which case they belong in `src/components/`.
- **Loading/pending props are always named `isLoading`** (matches `Button`'s `isLoading` prop) — do not introduce `loading`, `pending`, or a bespoke `status === 'loading'` check in a component's own props for the same concept.
- **Add/Edit pairs (modals, forms) share one implementation.** If two components differ only by "create vs update," extract a single component taking a `mode: 'add' | 'edit'` (or an optional initial-value) prop instead of duplicating the form/validation/error-handling logic (see the current `AddLoanProductModal`/`EditLoanProductModal` duplication as the anti-pattern to avoid repeating).

---

## 9. Testing

- Use Vitest ([vitest.config.ts](../vitest.config.ts)). Colocate tests next to the code under test with a `.test.ts`/`.test.tsx` suffix (e.g. `fetchApi.test.ts`, `api.schemas.test.ts`).
- Mock backend calls with MSW rather than mocking `fetch` ad hoc, so request/response shapes stay realistic.
- Run `pnpm test` before submitting changes; run `pnpm typecheck` for type errors (build does not implicitly guarantee typecheck-level strictness in watch mode).
- **Baseline going forward:** any new or materially-changed Redux slice, API service, or auth-related component must ship with at least one test covering its success path and its error/rejection path. Existing untested code doesn't block a PR, but don't add more untested surface area on top of it.

---

## 10. Main Application Features (domain map)

Understanding these helps you place new code in the right feature and respect existing role boundaries. Roles (from `rbac.ts`): `bank_admin`, `bank_agent`, `dev_agent`, `marketplace`, `farmer`.

| Feature (`src/features/...`) | Purpose | Primary roles |
|---|---|---|
| `auth` | Login, session (JWT via HttpOnly cookies), `rbac.ts` routing rules | all |
| `leads` | Lead list/dashboard, filters, summary counts | `dev_agent` |
| `new-lead` | Lead detail flow: consent (OTP), farmer profile, visit scheduling, assignment | `dev_agent` |
| `loans` | Loan dashboard/list, statuses | `dev_agent` |
| `new-loan` | Loan application creation/edit form (multi-step, persisted to `sessionStorage`) | `dev_agent` |
| `seller` | Bank-side loan products, onboarding, team management | `bank_admin`, `bank_agent` |
| `(farmer-application)` | Loan discovery, applying, tracking own applications | `farmer` |
| `notifications` | In-app notification center | all |

Route groups under `src/app/(dashboard)/` mirror these roles: `(bank-admin)`, `(bank-agent)`, `(dev-agent)`, `(farmer-dashboard)`. New pages must be added under the correct route group **and** added to `ROUTE_ACCESS` in `rbac.ts` if they should be role-restricted.

---

## 11. Known Gaps From the Aug 2026 Codebase Audit (do not repeat these)

This codebase was largely AI-assisted/junior-built without a shared standard in place, which produced the same class of issue repeated across features. These are **not yet fixed everywhere**, but any new code must not add to them, and touching a file with one of these issues is a good opportunity to fix it in the same PR:

| Issue | Where it shows up today | Rule going forward |
|---|---|---|
| Hardcoded hex colors / arbitrary Tailwind values | `Button.tsx`, sidebars, card shadows (300+ occurrences) | Use theme tokens (§8) |
| Duplicated Add/Edit modal & OTP popup logic | `seller/components/loan-products/*`, two separate `OtpVerificationPopup` | Extract one shared implementation (§8) |
| Inconsistent error handling (toast vs logger vs silent catch) | scattered across services/components | One channel per layer (§5) |
| `any` in auth/mocks/error catches | `lib/mocks/handlers.ts`, several `catch (error: any)` | No `any` in auth/API/store (§7) |
| Inconsistent thunk/service naming (`xThunk` vs bare verb) | `authSlice.ts`, `farmerSlice.ts`, `newLoanFormSlice.ts` | New thunks: name as `verbNoun` (e.g. `fetchLeads`, `updateLeadStatus`) — no `Thunk` suffix, for consistency with the majority pattern |
| Near-zero test coverage (~1%) | whole app | New/changed slices & services need tests (§9) |

---

## 12. Checklist Before Opening a PR

- [ ] New cross-feature imports go through an `index.ts` barrel, not internal paths.
- [ ] New backend calls go through the proxy and use `ApiErrorCode`/`classifyError` for failure handling.
- [ ] No secrets/tokens read from or written to `localStorage`.
- [ ] New API route handlers that mutate state call `checkCsrf`.
- [ ] Sensitive identifiers are masked by default in the UI.
- [ ] No new hardcoded hex colors/arbitrary Tailwind values; no new duplicated modal/form logic; no new `any` in auth/API/store code.
- [ ] Every `catch` block does something visible (log, rethrow, or set UI error state) — none are empty.
- [ ] New/changed slice or service has at least a success-path and error-path test.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] New restricted routes are added to `rbac.ts` `ROUTE_ACCESS`.
