import { describe, expect, it } from 'vitest';
import { createDataTableOptions, dataTableFeatures, type DataTableColumnDef } from '../data-table';

type Row = { name: string };

describe('DataTable TanStack Table 9 contract', () => {
  it('preserves data and columns while enabling the shared v9 features', () => {
    const data: Row[] = [{ name: 'Ada' }, { name: 'Bea' }, { name: 'Cora' }];
    const columns: DataTableColumnDef<Row>[] = [{ accessorKey: 'name', header: 'Name' }];
    const options = createDataTableOptions({ data, columns });

    expect(options.data).toEqual(data);
    expect(options.columns).toBe(columns);
    expect(options.features).toBe(dataTableFeatures);
    expect(Object.keys(dataTableFeatures)).toEqual(expect.arrayContaining([
      'columnFilteringFeature',
      'globalFilteringFeature',
      'rowPaginationFeature',
      'rowSortingFeature',
    ]));
  });
});
