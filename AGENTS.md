# AGENTS.md

# User Profile — Senior Frontend Engineer

> **Purpose:** This document is a persistent instruction profile for an AI assistant to understand who I am, how I work, and how to collaborate with me at a production engineering level. Load this at the start of every session.

---

## 👤 Identity

| Field                | Value                                                |
| -------------------- | ---------------------------------------------------- |
| **Role**       | Senior Frontend Engineer                             |
| **Experience** | ~8 years total, 5+ years in production-scale systems |
| **Age**        | 30                                                   |

---

## 🧠 Expertise & Stack

### Core Languages

- **TypeScript** (primary — strict mode always on)
- **JavaScript (ES2022+)**
- **HTML5 / CSS3 / SCSS**

### Frameworks & Libraries

- **React 18+** with concurrent features (Suspense, transitions, `useId`, `useDeferredValue`)
- **Next.js 14/15** — App Router, RSC, Server Actions, Edge Runtime
- **Vue 3** (Composition API) — secondary
- **Zustand**, **Jotai**, **Redux Toolkit** — state management
- **React Query / TanStack Query** — server state
- **Framer Motion / Motion One** — animations
- **Radix UI + Tailwind CSS** — accessible component primitives

### Build & Tooling

- **Vite**, **Turbopack**, **Webpack 5** (custom configs)
- **pnpm** workspaces / **Turborepo** monorepos
- **ESLint** (custom ruleset) + **Prettier** + **Husky** + **lint-staged**
- **Vitest**, **Jest**, **React Testing Library**, **Playwright**, **Cypress**
- **Storybook** (component documentation & visual regression)

### Backend & APIs (Frontend-facing)

- **REST**, **GraphQL** (Apollo, urql), **tRPC**, **WebSockets**
- **Prisma** (BFF patterns), **Supabase**, **Firebase**
- **Edge Functions** (Vercel, Cloudflare Workers)
- **OpenAPI / Zod** schema validation end-to-end

### Infrastructure & DevOps (Frontend Scope)

- **Vercel**, **Netlify**, **AWS Amplify**, **Cloudflare Pages**
- **Docker** (containerized local dev), **GitHub Actions** (CI/CD)
- **Sentry** (error monitoring), **Datadog RUM**, **LogRocket**
- **Chromatic** (visual regression CI), **Lighthouse CI**
- **Feature flags** — LaunchDarkly, Unleash

---

## 🎯 Stack Usage Rules (Not Just an Inventory)

Listing a tool isn't the same as mandating it. These are the defaults; deviating requires a stated reason.

| Concern                                                          | Default                                                                                                                                                    | Escape hatch (must be justified)                                                                                                                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server state** (fetching, caching, mutating remote data) | **React Query / TanStack Query.** Always, for anything that gets refetched, cached, invalidated, paginated, or shared across components.             | A single fire-and-forget call with no caching/refetch/loading-state needs (e.g. a one-shot form POST with no follow-up read) may skip it — state why in a comment. |
| **Client/global UI state**                                 | **Zustand** for most cases; **Redux Toolkit** only if the team already standardized on it or needs its devtools/middleware ecosystem at scale. | Local`useState`/`useReducer` for state that doesn't leave the component subtree.                                                                                |
| **Form state**                                             | React Hook Form + Zod resolver.                                                                                                                            | Uncontrolled native form only for trivial single-field cases.                                                                                                       |
| **Derived state**                                          | `useMemo`, not `useEffect`.                                                                                                                            | Never — this is a hard rule, not a default (see Patterns I Avoid).                                                                                                 |

If a request would introduce ad-hoc `useState` + `useEffect` fetching instead of React Query, or prop-drilled state instead of Zustand, **flag it as a deviation from convention** rather than silently writing it that way.

---

## 🏗️ Project Context

I work on **large-scale, production frontend applications** with the following characteristics:

- **Codebase size:** 100k–500k+ lines of TypeScript
- **Team size:** 5–20 engineers (cross-functional)
- **Traffic:** Millions of monthly active users; performance is a hard requirement
- **Architecture:** Micro-frontends, monorepos, design systems, shared component libraries
- **Deployment cadence:** Multiple times per day via CI/CD pipelines
- **Compliance:** Often subject to WCAG 2.1 AA accessibility, GDPR, and SOC 2 constraints

---

## 🤖 How AI Should Behave With Me

### General Principles

1. **Treat me as a senior peer, not a student.** Skip beginner explanations. Don't define what TypeScript is. Don't add "Note: make sure to install dependencies." I know.
2. **Be direct and dense.** I prefer concise, high-signal responses. No filler. No "Great question!" or "Certainly!". Get to the point.
3. **Show the full picture, then zoom in.** For architecture questions, start with the system-level view before diving into implementation.
4. **Assume TypeScript strict mode.** Every code snippet must be fully typed. No `any`. Use `unknown` with type guards if needed. Use `satisfies`, `as const`, discriminated unions appropriately.
5. **Think in tradeoffs.** When suggesting approaches, call out the tradeoffs explicitly — performance, maintainability, bundle size, DX, accessibility, testability.
6. **Production-first mindset.** Never suggest something that would be inappropriate in a production codebase (e.g., `console.log` left in, no error handling, missing loading/error states).

---

## 💻 Development Guidelines

### Code Style

- **Functional components only** in React. No class components.
- **Named exports** preferred over default exports (except for Next.js pages/layouts).
- **Colocation:** Keep styles, tests, and types close to the component they describe.
- **Barrel files (`index.ts`):** Use thoughtfully — avoid barrel files that cause circular deps or slow down bundlers.
- **File naming:** `kebab-case` for files, `PascalCase` for components, `camelCase` for utils/hooks.
- **No magic numbers/strings.** Use constants, enums, or Zod schemas.
- **Avoid prop drilling beyond 2 levels** — use Context, Zustand, or composition.

### TypeScript Conventions

```ts
// ✅ Prefer explicit return types on exported functions
export function parseUser(raw: unknown): User { ... }

// ✅ Use discriminated unions for state modeling
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// ✅ Use `satisfies` for config objects
const routes = {
  home: '/',
  dashboard: '/dashboard',
} satisfies Record<string, string>;

// ❌ Never use `any`
// ❌ Avoid non-null assertion `!` unless absolutely unavoidable (comment why)
```

### No Lazy Optionals

`Optional<T>` / `T | undefined` / `?` is a modeling tool, not a way to make the compiler stop complaining. Slapping optional on a field because you don't want to think through when it's actually missing is a code smell.

```ts
// ❌ Lazy: "sometimes it has a value, whatever"
type Product = {
  name: string;
  discount?: number;
  approvedBy?: string;
};

// ✅ Explicit: model *why* it's absent
type Product =
  | { status: 'draft'; name: string }
  | { status: 'pending_review'; name: string; discount: number }
  | { status: 'approved'; name: string; discount: number; approvedBy: string };
```

- If a value is optional because it hasn't been fetched yet vs. genuinely doesn't apply vs. failed to load — those are three different states. Model them as three states (discriminated union), not one optional field.
- Function parameters: don't default an argument to optional just to avoid updating call sites. Update the call sites.
- Reserve `?` for cases that are truly, permanently optional in the domain (e.g. a middle name) — not for laziness or unresolved async state.

### No Fake Defaults for Unknown Values

Never substitute a placeholder (`""`, `0`, `"N/A"`, `"Unknown"`, `[]`) for a value that is genuinely unknown, unresolved, or not-yet-loaded, just to satisfy a type or avoid a conditional.

```ts
// ❌ Silently fakes "no data" as "empty data" — caller can't tell the difference
function getUserName(user?: User): string {
  return user?.name ?? '';
}

// ✅ Force the caller to handle "unknown" explicitly
function getUserName(user: User | null): string | null {
  return user?.name ?? null;
}
// UI decides how to render null: skeleton, "—", error state — but it's a decision, not an accident
```

- A missing/unknown value must be representable and distinguishable in the type system (`null`, a `NotFound` variant, a loading state) — never silently coerced into a valid-looking empty value.
- This applies to mock/seed data too: don't fabricate plausible-looking fake data as a fallback in production code paths. Fake data belongs in fixtures/stories/tests only, clearly labeled as such.

### No Silent Failures

Every `try`/`catch` must do one of two things: **log with context**, or **propagate** (rethrow, return a typed error result, surface to an error boundary). An empty catch block, or one that only sets a generic "something went wrong" without logging the original error, is a bug.

```ts
// ❌ Swallows the error — nobody will ever know this failed
try {
  await syncUserPreferences(id);
} catch {
  // ignore
}

// ❌ Also bad — logs nothing, loses the original error
try {
  await syncUserPreferences(id);
} catch (e) {
  setError('Sync failed');
}

// ✅ Log with context AND surface to the user
try {
  await syncUserPreferences(id);
} catch (error) {
  logger.error('syncUserPreferences failed', { userId: id, error });
  setError('Could not save your preferences. Please try again.');
}

// ✅ Or propagate if this layer shouldn't handle it
try {
  return await syncUserPreferences(id);
} catch (error) {
  throw new SyncError('Failed to sync user preferences', { cause: error });
}
```

- Same standard applies to `.catch()` on promises and to error boundaries — the boundary must log before rendering the fallback UI.
- Never catch an error just to satisfy a linter or to stop a red squiggly — if you don't have a meaningful recovery or logging action, don't catch it at all; let it propagate.

### Component Architecture

```
src/
├── app/                   # Next.js App Router pages & layouts
├── components/
│   ├── ui/                # Primitive, unstyled/design-system components
│   ├── features/          # Feature-specific composed components
│   └── layouts/           # Page-level structural layouts
├── hooks/                 # Shared custom hooks
├── lib/                   # Utilities, helpers, constants
├── services/              # API clients, data fetching logic
├── stores/                # Global state (Redux slices)
├── types/                 # Shared TypeScript types & interfaces
└── styles/                # Global styles, Tailwind config extensions
```

### Performance Standards

- **Core Web Vitals targets:** LCP < 2.5s, CLS < 0.1, INP < 200ms
- **Bundle budget:** Initial JS < 150KB gzipped per route
- **Images:** Always use `next/image` or equivalent with explicit dimensions. WebP/AVIF formats.
- **Code splitting:** Dynamic imports for heavy components, route-level splitting by default
- **Memoization:** Use `useMemo`/`useCallback` only where profiling shows benefit — not as a default
- **Virtualization:** Use `@tanstack/react-virtual` for lists > 100 items
- **Avoid layout thrash:** Batch DOM reads and writes

### Accessibility (Non-Negotiable)

- All interactive elements must be keyboard accessible
- Use semantic HTML elements before ARIA (`<button>`, not `<div role="button">`)
- All images need descriptive `alt` text or `alt=""` for decorative images
- Color contrast must meet WCAG AA (4.5:1 text, 3:1 UI components)
- Focus management for modals, drawers, and route changes
- Live regions (`aria-live`) for dynamic content updates
- Test with screen readers (VoiceOver/NVDA) for critical flows

---

## 🐛 Debugging Guidelines

When I bring you a bug, follow this process:

### Triage First

1. **Reproduce the minimal case.** Strip it down to the smallest repro before suggesting fixes.
2. **Identify the category:** UI/render bug, state bug, race condition, network/API bug, type error, hydration mismatch, CSS regression, accessibility violation.
3. **Check the obvious first:** Is it a stale closure? A missing dependency in `useEffect`? An SSR/CSR mismatch? An incorrect key prop?

### Debugging Checklist (React/Next.js)

- [ ] Check React DevTools for unexpected re-renders
- [ ] Verify `useEffect` dependency arrays are complete (eslint-plugin-react-hooks)
- [ ] Look for hydration mismatches (server vs. client HTML diff)
- [ ] Check for race conditions in async data fetching (is the component unmounted before the fetch resolves?)
- [ ] Validate that error boundaries are catching the right errors
- [ ] Confirm Suspense boundaries are placed correctly
- [ ] Inspect network tab — is the right data coming back?
- [ ] Check for CSS specificity conflicts or incorrect Tailwind class order
- [ ] Check for silently swallowed errors (empty/log-less `catch` blocks) before assuming "it just doesn't work"

### When Suggesting a Fix

- Explain **why** the bug occurred, not just what to change
- Show the **before** and **after** code
- Flag if the fix has any performance, accessibility, or type-safety implications
- Suggest a test case to prevent regression

---

## 🚀 Deployment & CI/CD Guidelines

### Pre-Deploy Checklist

```
[ ] TypeScript build passes: `tsc --noEmit`
[ ] All tests pass: unit, integration, e2e
[ ] No ESLint errors (warnings reviewed)
[ ] Bundle size within budget: `pnpm analyze`
[ ] Lighthouse CI score within thresholds (Performance > 90, A11y > 95)
[ ] Visual regression tests pass (Chromatic)
[ ] Feature flags configured correctly for the environment
[ ] Environment variables verified for target environment
[ ] Database migrations (if any) applied and tested
[ ] Error monitoring (Sentry) release tagged
[ ] Rollback plan identified
```

### Environments

| Env            | Branch      | URL Pattern         | Purpose          |
| -------------- | ----------- | ------------------- | ---------------- |
| `local`      | any         | `localhost:3000`  | Dev              |
| `preview`    | feature/*   | `*.vercel.app`    | PR review        |
| `staging`    | `develop` | `staging.app.com` | QA / integration |
| `production` | `main`    | `app.com`         | Live             |

### CI/CD Pipeline (GitHub Actions)

```
PR opened → lint → typecheck → unit tests → build
           → e2e tests (Playwright, staging) → Chromatic visual diff
           → deploy preview → notify Slack

Merge to main → same checks → deploy staging → smoke tests
              → manual approval gate → deploy production
              → Sentry release + Datadog deployment marker
```

### Post-Deploy Monitoring

- Watch **Sentry** for new error spikes (first 15 min are critical)
- Check **Datadog RUM** or **LogRocket** for real user metrics degradation
- Monitor **Core Web Vitals** via CrUX / Vercel Analytics
- Verify **feature flags** are serving the right variant to the right users

---

## 🧪 Testing Philosophy

> **Test behavior, not implementation.** Tests should break when the user experience breaks, not when internal implementation details change.

### Test Pyramid

```
E2E (Playwright)          — 10%  — Critical user journeys only
Integration (RTL)         — 30%  — Component + hook behavior with real interactions
Unit (Vitest/Jest)        — 60%  — Pure utils, complex logic, data transformations
Visual (Chromatic/Percy)  — All components — Snapshot visual regression
```

### What to Always Test

- Every custom hook with edge cases (loading, error, empty states)
- Form validation — valid, invalid, and async validation flows
- Auth-protected routes — redirect behavior
- Error boundaries — that they catch and display gracefully
- Accessibility — axe-core automated checks in RTL tests
- API integration — MSW mocks, not live APIs
- That errors are actually logged/propagated, not swallowed (assert on the logger/error-reporting call in tests that exercise a `catch` path)

### What Not to Test

- Implementation internals (internal state variable names, private methods)
- Third-party library behavior
- Styling (leave to visual regression tests)

---

## 🔐 Security Practices

- **Never trust user input.** Validate and sanitize on both client and server.
- **XSS prevention:** Never use `dangerouslySetInnerHTML` without DOMPurify sanitization.
- **CSP headers:** Always define a strict Content Security Policy.
- **Secrets management:** No secrets in frontend code, `.env` files not committed, use Vault or environment secrets in CI.
- **Dependency hygiene:** Run `pnpm audit` regularly. Automate with Dependabot or Renovate.
- **Auth:** Use established libraries (NextAuth, Clerk, Auth0). Never roll your own auth.
- **API security:** Always validate session/token on sensitive API calls — never rely on UI-only guards.

---

## 📐 Architecture & Design Decisions

When I ask about architecture, always consider:

1. **Scalability** — Will this work with 10x the data / 10x the team?
2. **Maintainability** — Can a new engineer understand this in 6 months?
3. **Performance** — Does this introduce unnecessary re-renders, network waterfalls, or bundle bloat?
4. **Testability** — Is this unit testable without mocking the universe?
5. **DX (Developer Experience)** — Does this make the right thing easy and the wrong thing hard?

### Patterns I Follow

- **Compound components** for flexible, composable UI
- **Render props / headless components** for logic-sharing without coupling
- **Repository pattern** for data-fetching abstraction (service layer)
- **Feature flags** for dark launches and A/B tests
- **Error boundaries + Suspense** at route and critical section level
- **Optimistic UI** for latency-sensitive mutations
- **React Query as the default server-state layer** (see Stack Usage Rules above)

### Patterns I Avoid

- ❌ God components (> 300 lines, > 5 responsibilities)
- ❌ Prop drilling beyond 2 levels
- ❌ Inline styles (except truly dynamic values)
- ❌ `useEffect` for derived state (use `useMemo`)
- ❌ Fetching data in `useEffect` without cleanup / cancellation
- ❌ Global CSS without CSS Modules or CSS-in-JS scoping
- ❌ Optional fields as a substitute for proper state modeling (see "No Lazy Optionals")
- ❌ Fake/placeholder default values standing in for unknown data (see "No Fake Defaults")
- ❌ Empty or logging-free `catch` blocks (see "No Silent Failures")

---

## 📦 Dependency Philosophy

- **Evaluate before installing.** Check bundle size (bundlephobia.com), weekly downloads, last publish date, and open issue count.
- **Prefer native browser APIs** when the native solution is sufficient.
- **Tree-shakeable libraries only** for utilities (lodash-es, not lodash).
- **Lock major versions.** Pin `^` ranges carefully; audit after any major upgrade.
- **Avoid libraries that require CSS global imports** unless scoped.

---

## 🗣️ Communication Style Preferences

When working with me:

- **Lead with the conclusion.** Tell me what to do, then explain why.
- **Use code, not prose,** to explain implementation details.
- **Explicitly call out tradeoffs.** Don't just say "this is better" — better at what, worse at what?
- **Flag unknowns clearly.** If you're unsure about something, say so rather than guessing.
- **Don't pad responses.** No "Great question!", no "Of course!", no unnecessary summaries at the end.
- **Use tables for comparisons.** I process structured data faster than prose lists for multi-option decisions.
- **When showing code changes**, always show a diff or at minimum a clear before/after.

---

## ⚡ Quick Reference — Commands I Use Daily

```bash
# Dev
pnpm dev                         # Start dev server
pnpm build && pnpm start         # Production build test locally
pnpm typecheck                   # tsc --noEmit
pnpm lint                        # ESLint full pass
pnpm lint:fix                    # Auto-fix lint issues

# Testing
pnpm test                        # Vitest unit tests
pnpm test:watch                  # Watch mode
pnpm test:e2e                    # Playwright e2e (needs dev server)
pnpm test:coverage               # Coverage report

# Analysis
pnpm analyze                     # Bundle analyzer
pnpm lighthouse                  # Lighthouse CI run

# Maintenance
pnpm audit                       # Security audit
pnpm dedupe                      # Deduplicate lockfile
```

---

## 🧩 Current Focus Areas (Update Periodically)

- React Server Components architecture patterns at scale
- Streaming SSR with Suspense in Next.js App Router
- Optimizing INP (Interaction to Next Paint) in complex dashboards
- Design system governance — versioning, breaking changes, adoption tracking
- AI-assisted development tooling integration into existing CI/CD pipelines

**Workflow note:** Commit changes after every significant change, only after my explicit approval.

---

Entry point for AI agents working in this repo (a Next.js App Router + Redux Toolkit lending frontend). This file is an index — the detail lives in the linked files below. Read the ones relevant to your task before editing code.

 Conventions & structure

- **[.agents/project-structure.md](.agents/project-structure.md)** — the actual `src/` layout, feature-slice anatomy, naming, import/barrel rules, state/service conventions, and a "where do I put a new…" table. **Follow this when creating or moving files.**

## Code review

The `.agents/code-review-agent/` set defines a review-only agent (detects & reports defects; does not fix):

- **[agent.md](.agents/code-review-agent/agent.md)** — orchestrator: mandate, review flow, report format.
- **[persona.md](.agents/code-review-agent/persona.md)** — the "Senior Frontend Architect" reviewer voice/judgment.
- **[rules.md](.agents/code-review-agent/rules.md)** — 25 non-negotiable check domains (20 stack-wide + 5 finance/lending-specific).
- **[skills.md](.agents/code-review-agent/skills.md)** — the stack + versions every review is conducted against.
- **[ignore.md](.agents/code-review-agent/ignore.md)** — review exclusions; read during context intake, treat as out of scope.

## API & domain reference

- **[.agents/.gemini/api-flow-backend.md](.agents/.gemini/api-flow-backend.md)** — backend API contract, derived from backend source. Source of truth when it conflicts with the frontend flow doc.
- **[docs/api-flow-frontend.md](docs/api-flow-frontend.md)** — frontend API flow.
- **[.agents/.gemini/security-headers.md](.agents/.gemini/security-headers.md)** — X-Frame-Options / iframe config notes (PDF embedding).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
