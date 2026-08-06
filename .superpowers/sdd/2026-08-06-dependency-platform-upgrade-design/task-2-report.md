# Task 2 report — dependency cleanup

## Changes

- Removed the eleven specified unused direct dependencies from `package.json`.
- Regenerated `pnpm-lock.yaml` with `pnpm install --lockfile-only --ignore-scripts --force --config.strict-dep-builds=false --config.auto-install-peers=false`.
- Removed the four obsolete Vite SSR external entries and the `sqlite3` build allowance.
- Left the Vite override unchanged.

The regenerated lockfile has no `sqlite3@6.0.1` package or Drizzle `sqlite3` snapshot. It retains only Drizzle's optional peer declaration, as expected. `tar@7.5.13` is absent.

## Verification

| Command | Result |
| --- | --- |
| `pnpm check:astro` | Blocked before Astro ran. First, pnpm refused to remove the out-of-date `node_modules` layout without a TTY. The CI/script-disabled retry recreated it but rejected the lockfile because its `autoInstallPeers: false` setting did not match the default runtime setting. A retry with `PNPM_CONFIG_AUTO_INSTALL_PEERS=false` was terminated after continued relinking to avoid an unbounded wait. |
| `pnpm typecheck` | Not run: the failed verification relink removed the old `node_modules` layout. |
| `pnpm test` | Not run: the failed verification relink removed the old `node_modules` layout. |
| `pnpm check:boundaries` | Not run: the failed verification relink removed the old `node_modules` layout. |
| `pnpm audit --prod --json` | Completed; 0 critical, 26 high, 41 moderate, 11 low. Exit 1 is pnpm's normal nonzero result when advisories exist. |
| `pnpm audit --json` | Completed; 0 critical, 36 high, 63 moderate, 14 low. Exit 1 is pnpm's normal nonzero result when advisories exist. |
| `git diff --check` | Passed. |
| Source search | No references to ten exact package specifiers under `src` or `scripts`; `openai` appears only as the application's provider/protocol identifier, not an `openai` SDK import. |

## Audit conclusion

The critical `drizzle-orm > sqlite3 > tar` path is removed: neither `sqlite3@6.0.1` nor `tar@7.5.13` remains in the lockfile, and both audit scopes report zero critical vulnerabilities.

## Concern

The lockfile records `settings.autoInstallPeers: false`, which must also be supplied when a clean install is performed (for example, `PNPM_CONFIG_AUTO_INSTALL_PEERS=false`). Without it, pnpm rejects a frozen install. The interrupted verification relink removed the previous `node_modules` layout, so a matching clean install is required before the three remaining local checks can run.
