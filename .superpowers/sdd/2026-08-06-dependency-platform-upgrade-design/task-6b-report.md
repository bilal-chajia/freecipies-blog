# Task 6b report — BlockNote 0.52

## Changes

- Upgraded `@blocknote/core`, `@blocknote/mantine`, and `@blocknote/react` to 0.52.1.
- Updated the two editor wrapper selectors from `.bn-container` to `.bn-root`, matching the BlockNote 0.52 container class while preserving the existing scoped theme rules.

## Verification

| Check | Result |
| --- | --- |
| Lockfile-only install | Passed with pnpm 11.20.0 and supply-chain policy verification. |
| Frozen install | Passed with pnpm 11.20.0 and `CI=true`. |
| `.bn-container` scan | Passed: no matches remain in the editor stylesheet. |
| `.bn-root` scan | Passed: both scoped wrapper rules remain. |
| TypeScript | Passed with `pnpm typecheck`. |
| Astro Check | Passed: 0 errors across 851 files. |
| Vitest | Passed: 91 files / 555 tests with historical `.tmp` and `.pnpm-store` copies excluded. |
| `git diff --check` | Passed. |
