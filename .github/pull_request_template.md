## What changed

<!-- Short description of the change and which feature(s) it touches -->

## Checklist (reviewer + author must confirm)

### Architecture & standards ([docs/frontend-development-guide.md](../docs/frontend-development-guide.md))
- [ ] No import boundary violations (app → feature-barrel → shared/lib; features don't reach into other features' internals)
- [ ] New/changed feature code follows the standard folder shape (`api/components/constants/hooks/store/types/index.ts`)
- [ ] New public exports added to the feature's `index.ts` barrel
- [ ] API calls go through the proxy and use `ApiErrorCode` / `classifyError` for failure handling
- [ ] No secrets/tokens in `localStorage`; no raw sensitive IDs rendered without `maskSensitiveId()`
- [ ] State-changing API routes call `checkCsrf()`
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (new logic has test coverage where practical)

### Application feel / UI consistency
- [ ] Reuses existing shared components from `src/components/ui/` instead of new one-off styled elements
- [ ] Spacing, colors, and typography match existing screens (no visually inconsistent buttons/cards/forms)
- [ ] Loading, empty, and error states match the existing pattern (e.g. `AccessDenied`, `ConnectionError`, route-level `loading.tsx`)
- [ ] Behaves consistently across the role it's built for (correct sidebar/header, correct route group)
- [ ] Verified in the browser, not just "should work"

## Screenshots / recording (UI changes)

<!-- Before/after screenshots so the reviewer can check visual consistency -->
