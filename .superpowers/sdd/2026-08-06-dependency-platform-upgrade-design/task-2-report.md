# Task 2 report — dependency cleanup

## Changes

- Removed the eleven specified unused direct dependencies from `package.json`.
- Regenerated `pnpm-lock.yaml` with `pnpm install --lockfile-only --ignore-scripts --force --config.strict-dep-builds=false`, restoring the baseline `settings.autoInstallPeers: true`.
- Removed the four obsolete Vite SSR external entries and the `sqlite3` build allowance.
- Left the Vite override unchanged.

The regenerated lockfile has no `sqlite3@6.0.1` package or Drizzle `sqlite3` snapshot. It retains only Drizzle's optional peer declaration, as expected. `tar@7.5.13` is absent.

## Verification

| Command | Result |
| --- | --- |
| `pnpm check:astro` | Blocked before Astro ran: after the lockfile-only regeneration, the CI frozen install/relink remained without progress or output for several minutes and was safely terminated. |
| `pnpm typecheck` | Not run: the dependency relink did not complete. |
| `pnpm test` | Not run: the dependency relink did not complete. |
| `pnpm check:boundaries` | Not run: the dependency relink did not complete. |
| `pnpm audit --prod --json` | Completed; 0 critical, 26 high, 41 moderate, 11 low; 1,080 total dependencies. Exit 1 is pnpm's normal nonzero result when advisories exist. |
| `pnpm audit --json` | Completed; 0 critical, 36 high, 63 moderate, 14 low; 1,480 total dependencies. Exit 1 is pnpm's normal nonzero result when advisories exist. |
| `git diff --check` | Passed. |
| Source search | No references to ten exact package specifiers under `src` or `scripts`; `openai` appears only as the application's provider/protocol identifier, not an `openai` SDK import. |

## Audit conclusion

The critical `drizzle-orm > sqlite3 > tar` path is removed: neither `sqlite3@6.0.1` nor `tar@7.5.13` remains in the lockfile, and both audit scopes report zero critical vulnerabilities.

## Concern

The lockfile now uses the baseline `settings.autoInstallPeers: true`; its frozen install no longer has a configuration mismatch. However, the replacement `node_modules` relink remained without progress/output for several minutes and was terminated, so a successful clean install is still required before the four local checks can run.
