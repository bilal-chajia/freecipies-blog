import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import DataTable from '../components/ui/data-table';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down">↓</div>,
  ChevronUp: () => <div data-testid="chevron-up">↑</div>,
  ChevronsUpDown: () => <div data-testid="chevrons-up-down">↕</div>,
  ArrowUpDown: () => <div data-testid="arrow-up-down">⇅</div>,
}));

describe('DataTable Component', () => {
  const mockColumns = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span>{row.original.name}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span>{row.original.email}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <span>{row.original.status}</span>,
    },
  ];

  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders table with headers and data', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      // Check headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Check data
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    test('renders search input when filtering is enabled', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableFiltering={true} />);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    test('does not render search input when filtering is disabled', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableFiltering={false} />);

      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    });

    test('renders row selection checkboxes when enabled', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableRowSelection={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(mockData.length + 1); // +1 for header checkbox
    });

    test('does not render row selection checkboxes when disabled', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableRowSelection={false} />);

      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes).toHaveLength(0);
    });
  });

  describe('Sorting Functionality', () => {
    test('shows sort indicators on sortable columns', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableSorting={true} />);

      expect(screen.getByTestId('chevrons-up-down')).toBeInTheDocument();
    });

    test('calls onSortingChange when column is sorted', async () => {
      const mockOnSortingChange = jest.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enableSorting={true}
          onSortingChange={mockOnSortingChange}
        />
      );

      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      expect(mockOnSortingChange).toHaveBeenCalled();
    });

    test('toggles sort direction on multiple clicks', async () => {
      const user = userEvent.setup();

      render(<DataTable columns={mockColumns} data={mockData} enableSorting={true} />);

      const nameHeader = screen.getByText('Name');

      // First click - ascending
      await user.click(nameHeader);
      expect(screen.getByTestId('chevron-up')).toBeInTheDocument();

      // Second click - descending
      await user.click(nameHeader);
      expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
    });
  });

  describe('Filtering Functionality', () => {
    test('filters data based on search input', async () => {
      const user = userEvent.setup();

      render(<DataTable columns={mockColumns} data={mockData} enableFiltering={true} />);

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });

    test('calls onFilteringChange when search input changes', async () => {
      const mockOnFilteringChange = jest.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enableFiltering={true}
          onFilteringChange={mockOnFilteringChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');

      expect(mockOnFilteringChange).toHaveBeenCalled();
    });
  });

  describe('Row Selection', () => {
    test('selects individual rows when checkbox is clicked', async () => {
      const mockOnRowSelectionChange = jest.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enableRowSelection={true}
          onRowSelectionChange={mockOnRowSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const firstRowCheckbox = checkboxes[1]; // Skip header checkbox

      await user.click(firstRowCheckbox);

      expect(mockOnRowSelectionChange).toHaveBeenCalledWith([mockData[0]]);
    });

    test('selects all rows when header checkbox is clicked', async () => {
      const mockOnRowSelectionChange = jest.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enableRowSelection={true}
          onRowSelectionChange={mockOnRowSelectionChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const headerCheckbox = checkboxes[0];

      await user.click(headerCheckbox);

      expect(mockOnRowSelectionChange).toHaveBeenCalledWith(mockData);
    });

    test('shows selection count when rows are selected', async () => {
      const user = userEvent.setup();

      render(<DataTable columns={mockColumns} data={mockData} enableRowSelection={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const firstRowCheckbox = checkboxes[1];
      const secondRowCheckbox = checkboxes[2];

      await user.click(firstRowCheckbox);
      await user.click(secondRowCheckbox);

      expect(screen.getByText('2 rows selected')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    test('renders pagination controls when enabled and data exceeds page size', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enablePagination={true}
          pageSize={2}
        />
      );

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    test('does not render pagination when disabled', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enablePagination={false}
        />
      );

      expect(screen.queryByText('Page 1 of')).not.toBeInTheDocument();
    });

    test('navigates to next page when next button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enablePagination={true}
          pageSize={2}
        />
      );

      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    test('changes page size when select is changed', async () => {
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enablePagination={true}
          pageSize={2}
          pageSizeOptions={[2, 5, 10]}
        />
      );

      const pageSizeSelect = screen.getByDisplayValue('2');
      await user.click(pageSizeSelect);

      const option5 = screen.getByText('5');
      await user.click(option5);

      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });

    test('shows correct result count information', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enablePagination={true}
          pageSize={2}
        />
      );

      expect(screen.getByText('Showing 1 to 2 of 3 results')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    test('shows loading spinner when loading is true', () => {
      render(<DataTable columns={mockColumns} data={[]} loading={true} />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('does not show loading spinner when loading is false', () => {
      render(<DataTable columns={mockColumns} data={mockData} loading={false} />);

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    test('shows error message when error is provided', () => {
      const errorMessage = 'Failed to load data';

      render(<DataTable columns={mockColumns} data={[]} error={errorMessage} />);

      expect(screen.getByText('Error loading data')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    test('shows data when no error', () => {
      render(<DataTable columns={mockColumns} data={mockData} error={null} />);

      expect(screen.queryByText('Error loading data')).not.toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    test('shows custom empty message when no data', () => {
      const emptyMessage = 'No items found';

      render(
        <DataTable
          columns={mockColumns}
          data={[]}
          emptyMessage={emptyMessage}
        />
      );

      expect(screen.getByText(emptyMessage)).toBeInTheDocument();
    });

    test('shows default empty message when no custom message provided', () => {
      render(<DataTable columns={mockColumns} data={[]} />);

      expect(screen.getByText('No data found')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels for checkboxes', () => {
      render(<DataTable columns={mockColumns} data={mockData} enableRowSelection={true} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toHaveAttribute('aria-label', 'Select all');
      expect(checkboxes[1]).toHaveAttribute('aria-label', 'Select row');
    });

    test('has proper ARIA labels for pagination buttons', () => {
      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enablePagination={true}
          pageSize={2}
        />
      );

      expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
    });

    test('table has proper semantic structure', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const headers = within(table).getAllByRole('columnheader');
      expect(headers).toHaveLength(mockColumns.length);

      const rows = within(table).getAllByRole('row');
      expect(rows).toHaveLength(mockData.length + 1); // +1 for header row
    });
  });

  describe('Custom Column Rendering', () => {
    test('renders custom cell content correctly', () => {
      const customColumns = [
        {
          accessorKey: 'name',
          header: 'Name',
          cell: ({ row }) => <strong>{row.original.name}</strong>,
        },
      ];

      render(<DataTable columns={customColumns} data={mockData} />);

      const strongElement = screen.getByText('John Doe').closest('strong');
      expect(strongElement).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('table has horizontal scroll on small screens', () => {
      render(<DataTable columns={mockColumns} data={mockData} />);

      const tableContainer = screen.getByRole('table').parentElement;
      expect(tableContainer).toHaveClass('overflow-x-auto');
    });
  });

  describe('Integration with Callbacks', () => {
    test('calls all callback functions appropriately', async () => {
      const mockOnRowSelectionChange = jest.fn();
      const mockOnSortingChange = jest.fn();
      const mockOnFilteringChange = jest.fn();
      const user = userEvent.setup();

      render(
        <DataTable
          columns={mockColumns}
          data={mockData}
          enableRowSelection={true}
          enableSorting={true}
          enableFiltering={true}
          onRowSelectionChange={mockOnRowSelectionChange}
          onSortingChange={mockOnSortingChange}
          onFilteringChange={mockOnFilteringChange}
        />
      );

      // Test row selection
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);
      expect(mockOnRowSelectionChange).toHaveBeenCalled();

      // Test sorting
      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);
      expect(mockOnSortingChange).toHaveBeenCalled();

      // Test filtering
      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'test');
      expect(mockOnFilteringChange).toHaveBeenCalled();
    });
  });
});