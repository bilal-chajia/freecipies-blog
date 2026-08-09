# Task 6a report — DayPicker and low-risk UI majors

## Changes

- Upgraded `@daypicker/react` to 10.0.1 and removed `react-day-picker`.
- Upgraded Motion to 13.0.0, NanoID to 6.0.1, and React Easy Crop to 6.2.3.
- Extracted `buildCalendarClassNames` from the Calendar component and changed the DayPicker table class key to `month_grid`.
- Added a Calendar contract test that verifies both the pure helper and the component wrapper expose the DayPicker 10 key.

## Verification

| Check | Result |
| --- | --- |
| Red test | Confirmed: the helper was absent and `month_grid` was undefined. |
| Lockfile-only install | Passed with pnpm 11.20.0 and supply-chain policy verification. |
| Frozen install | Passed with pnpm 11.20.0 and `CI=true`. |
| Calendar contract | Passed with DayPicker 10 installed. |
| TypeScript | Passed with `pnpm typecheck`. |
| Astro Check | Passed: 0 errors across 851 files. |
| Vitest | Passed: 91 files / 555 tests with historical `.tmp` and `.pnpm-store` copies excluded. |
| `git diff --check` | Passed. |
