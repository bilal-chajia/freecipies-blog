# Final validation report — dependency/platform conformance

## Results

| Check | Result |
| --- | --- |
| Production audit | 0 critical, 3 high, 6 moderate, 3 low. |
| `pnpm build` | Passed outside the Windows sandbox. Cloudflare server output completed successfully. |
| `pnpm preview` | Astro build passed and Wrangler started successfully; the short-lived process was stopped after the tool timeout, with no Wrangler process left running. |
| Full test suite | 92 files / 556 tests passed with permanent `.tmp` and `.pnpm-store` exclusions. |
| TypeScript | Passed. |
| Astro Check | Passed: 0 errors across 852 files. |
| Peer check | Two expected non-critical peers remain: Lobe UI → Motion 12 and transitive Emoji Mart → React 16–18. |

## Non-blocking warnings

- The dynamic Pinterest RSS route still warns that `getStaticPaths()` is ignored without `prerender = true`.
- The CSS optimizer warns about the generated `--space-1.5` token.
- The existing `upload-font` endpoint remains documented as requiring a separate R2-backed Workerd design.
