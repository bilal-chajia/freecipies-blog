# Task 6d report — TanStack Table 9

## Changes

- Upgraded `@tanstack/react-table` to 9.0.0.
- Migrated `DataTable` from `useReactTable` and `get*RowModel` helpers to Table 9 `useTable`, `tableFeatures`, and the `create*RowModel` factories.
- Exported `dataTableFeatures`, `createDataTableOptions`, `DataTableColumnDef`, and `DataTableRow` for shared consumers.
- Updated `ContentListBase` to use the Table 9 feature-aware column and row types.
- Replaced removed `getState()` reads with the Table 9 `table.state` contract.
- Added a three-row model contract test covering data, columns, and filtering/pagination/sorting feature registration.

## Verification

| Check | Result |
| --- | --- |
| Red test | Confirmed: the shared feature set and options builder were initially absent. |
| Lockfile-only install | Passed with pnpm 11.20.0 and supply-chain policy verification. |
| Frozen install | Passed with pnpm 11.20.0 and `CI=true`. |
| Table model contract | Passed. |
| TypeScript | Passed with `pnpm typecheck`. |
| Astro Check | Passed: 0 errors across 852 files. |
| Vitest | Passed: 92 files / 556 tests with historical `.tmp` and `.pnpm-store` copies excluded. |
| `git diff --check` | Passed. |
