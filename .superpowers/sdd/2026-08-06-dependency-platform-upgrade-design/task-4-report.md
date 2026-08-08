# Task 4 report — React Router 8

## Changes

- Replaced `react-router-dom` with direct dependency `react-router@^8.3.0` and migrated all 29 `src` imports. No DOM-only API was used.
- Added pure route contracts for authentication redirection and animated editor routes, then consumed them in the existing application components.
- Centralized the sidebar URL targets in `admin-navigation.ts`; the contract test verifies that every target matches the declared route tree.
- Added the explicit `React` import required when the route module’s JSX is evaluated by Vitest.

## Verification

| Check | Result |
| --- | --- |
| Router contract RED | Failed as intended before implementation because direct package `react-router` was absent. |
| `corepack pnpm@11.20.0 install --lockfile-only --ignore-scripts` | Passed; the regenerated lockfile passed supply-chain policy verification. |
| Frozen install | Passed in the reconstructed checkout with `CI=true`, `--frozen-lockfile`, and `--ignore-scripts`; Router 8 replaced Router DOM 7. |
| Route-contract test | Passed: 4 tests. |
| No legacy imports | Passed: `rg` found no `react-router-dom` reference in `src`, `package.json`, or `pnpm-lock.yaml`. |
| TypeScript | Passed with `pnpm typecheck`. |
| Astro Check | Passed: `0 errors` across 850 files. |
| Vitest | Passed: 90 files / 553 tests with historical `.tmp` and `.pnpm-store` copies excluded. Permanent exclusions are added in the reproducibility unit. |
| Boundary check | Passed. |
| `git diff --check` | Passed. |
