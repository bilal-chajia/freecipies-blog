# Task 3 report — compatible runtime and tooling updates

## Changes

- Updated the compatible manifest targets from the approved brief; Astro/Vite and the planned major UI migrations remain deferred.
- Resolved the lockfile with pnpm 11.20.0 and verified a frozen install in the reconstructed checkout. The lock resolves the requested direct versions; expected peer-context updates follow React 19.2.8 and the Wrangler 4.119 runtime.
- pnpm added `minimumReleaseAgeExclude` entries for the two newly released packages `lucide-react@1.29.0` and `shadcn@4.16.2`; retain them for reproducible installs under the current supply-chain policy and review them during the final policy pass.

## Verification

| Check | Result |
| --- | --- |
| `corepack pnpm@11.20.0 install --lockfile-only --ignore-scripts` | Passed; lockfile policy verification passed. |
| Frozen install | Passed in the reconstructed checkout with `CI=true`, `--frozen-lockfile`, and `--ignore-scripts`; no lockfile changes. |
| Direct version resolution | Passed; React/DOM 19.2.8, TypeScript 6.0.3, Tailwind 4.3.3, Zod 4.4.3, Wrangler 4.119.0, Vitest 4.1.10, and all brief targets resolved. |
| Astro Check | Passed: `0 errors` across 847 files. |
| TypeScript 6.0.3 | Passed with `pnpm typecheck`. |
| Boundary check | Passed. |
| Vitest | Passed: 89 files / 549 tests with historical `.tmp` and `.pnpm-store` copies excluded. The permanent exclusions are added in the reproducibility unit. |
| `git diff --check` | Passed. |

## Compatibility impact

- React 19.2.8 and the refreshed Konva/React-Konva types remove the baseline JSX diagnostics observed with the older peer graph; the full TypeScript check is now clean in the isolated install.
- Wrangler 4.119 updates the Cloudflare/Miniflare runtime closure but does not change the application adapter yet; Astro 6/Cloudflare 13 remains intentionally unchanged.
- No application source refactor was required in this unit. React Router 8, BlockNote, Mantine, DayPicker, TanStack Table, Motion, NanoID, EasyCrop, Astro 7, Vite 8, and adapter migration risks remain isolated for later units.
