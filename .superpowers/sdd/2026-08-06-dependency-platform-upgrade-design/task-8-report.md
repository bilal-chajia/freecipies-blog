# Task 8 report — reproducibility and peer evidence

## Changes

- Set `components.json` to `tsx: true`.
- Added `.tmp/` and `.pnpm-store/` to Vitest exclusions and `.tmp/` to `.gitignore`.
- The permanent exclusions make the full `pnpm test` command deterministic despite retained historical copies under `.tmp/`.

## Verification

| Check | Result |
| --- | --- |
| `pnpm test` without CLI exclusions | Passed outside the Windows sandbox: 92 files / 556 tests. The sandbox-only run hit Vite 8 `spawn EPERM` while resolving paths. |
| TypeScript | Passed. |
| Astro Check | Passed: 0 errors across 852 files. |
| Peer check | Two expected non-critical peers: Lobe UI 5.29.1 requests Motion 12 while the approved app target is Motion 13; transitive `@emoji-mart/react` requests React 16–18 while the app uses React 19.2.8. |
| `git diff --check` | Passed. |
