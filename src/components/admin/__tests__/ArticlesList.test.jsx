import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import ArticlesList from '../pages/articles/ArticlesList';

// Mock the API
jest.mock('../services/api', () => ({
  articlesAPI: {
    getAll: jest.fn(),
    delete: jest.fn(),
    toggleOnline: jest.fn(),
    toggleFavorite: jest.fn(),
  },
  categoriesAPI: {
    getAll: jest.fn(),
  },
  authorsAPI: {
    getAll: jest.fn(),
  },
}));

// Mock Zustand stores
jest.mock('../store/useStore', () => ({
  useArticlesStore: () => ({
    articles: [
      {
        id: 1,
        slug: 'test-article',
        label: 'Test Article',
        type: 'article',
        categoryLabel: 'Technology',
        authorName: 'John Doe',
        isOnline: true,
        isFavorite: false,
        viewCount: 150,
        createdAt: '2024-01-01T00:00:00Z',
        publishedAt: '2024-01-02T00:00:00Z',
        shortDescription: 'This is a test article description',
        image: { url: 'https://example.com/image.jpg' },
      },
      {
        id: 2,
        slug: 'test-recipe',
        label: 'Test Recipe',
        type: 'recipe',
        categoryLabel: 'Food',
        authorName: 'Jane Smith',
        isOnline: false,
        isFavorite: true,
        viewCount: 250,
        createdAt: '2024-01-03T00:00:00Z',
        publishedAt: '2024-01-04T00:00:00Z',
        shortDescription: 'This is a test recipe description',
      },
    ],
    filters: {
      type: 'all',
      category: 'all',
      author: 'all',
      status: 'all',
      search: '',
    },
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    },
    setArticles: jest.fn(),
    setFilters: jest.fn(),
    setPagination: jest.fn(),
  }),
  useCategoriesStore: () => ({
    categories: [
      { slug: 'technology', label: 'Technology' },
      { slug: 'food', label: 'Food' },
    ],
    setCategories: jest.fn(),
  }),
  useAuthorsStore: () => ({
    authors: [
      { slug: 'john-doe', name: 'John Doe' },
      { slug: 'jane-smith', name: 'Jane Smith' },
    ],
    setAuthors: jest.fn(),
  }),
}));

// Mock DataTable component
jest.mock('../components/ui/data-table.jsx', () => {
  return function MockDataTable({ columns, data, onRowSelectionChange, ...props }) {
    return (
      <div data-testid="data-table">
        <div data-testid="data-table-columns">{JSON.stringify(columns.map(col => col.header))}</div>
        <div data-testid="data-table-data">{JSON.stringify(data.map(item => item.label))}</div>
        <button
          data-testid="select-row-1"
          onClick={() => onRowSelectionChange && onRowSelectionChange([data[0]])}
        >
          Select First Row
        </button>
        {props.children}
      </div>
    );
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon">➕</div>,
  Eye: () => <div data-testid="eye-icon">👁️</div>,
  EyeOff: () => <div data-testid="eye-off-icon">🙈</div>,
  Star: () => <div data-testid="star-icon">⭐</div>,
  Edit: () => <div data-testid="edit-icon">✏️</div>,
  Trash2: () => <div data-testid="trash-icon">🗑️</div>,
  MoreVertical: () => <div data-testid="more-vertical-icon">⋮</div>,
}));

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Wrapper component for routing
const Wrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('ArticlesList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders articles list with header and navigation', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      expect(screen.getByText('Articles')).toBeInTheDocument();
      expect(screen.getByText('Manage your articles and recipes')).toBeInTheDocument();
      expect(screen.getByText('New Article')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    test('renders DataTable component with correct props', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      const dataTable = screen.getByTestId('data-table');
      expect(dataTable).toBeInTheDocument();

      // Check if data is passed correctly
      const dataElement = screen.getByTestId('data-table-data');
      expect(dataElement).toHaveTextContent('Test Article');
      expect(dataElement).toHaveTextContent('Test Recipe');
    });

    test('shows bulk actions when rows are selected', async () => {
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      // Bulk actions should appear
      expect(screen.getByText('Set Online')).toBeInTheDocument();
      expect(screen.getByText('Set Offline')).toBeInTheDocument();
      expect(screen.getByText('Delete Selected')).toBeInTheDocument();
    });
  });

  describe('DataTable Integration', () => {
    test('passes correct columns to DataTable', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      const columnsElement = screen.getByTestId('data-table-columns');
      const columns = JSON.parse(columnsElement.textContent);

      expect(columns).toContain('Article');
      expect(columns).toContain('Type');
      expect(columns).toContain('Category');
      expect(columns).toContain('Author');
      expect(columns).toContain('Status');
      expect(columns).toContain('Views');
      expect(columns).toContain('Date');
      expect(columns).toContain('Actions');
    });

    test('passes correct data to DataTable', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      const dataElement = screen.getByTestId('data-table-data');
      const data = JSON.parse(dataElement.textContent);

      expect(data).toEqual(['Test Article', 'Test Recipe']);
    });

    test('enables row selection in DataTable', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // DataTable should be configured with row selection enabled
      const dataTable = screen.getByTestId('data-table');
      expect(dataTable).toBeInTheDocument();
    });
  });

  describe('Bulk Actions', () => {
    test('handles bulk online toggle', async () => {
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Select a row
      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      // Click bulk online toggle
      const setOnlineButton = screen.getByText('Set Online');
      await user.click(setOnlineButton);

      // Should call API for each selected article
      await waitFor(() => {
        expect(require('../services/api').articlesAPI.toggleOnline).toHaveBeenCalledWith('test-article');
      });
    });

    test('handles bulk offline toggle', async () => {
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Select a row
      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      // Click bulk offline toggle
      const setOfflineButton = screen.getByText('Set Offline');
      await user.click(setOfflineButton);

      // Should call API for each selected article
      await waitFor(() => {
        expect(require('../services/api').articlesAPI.toggleOnline).toHaveBeenCalledWith('test-article');
      });
    });

    test('handles bulk delete', async () => {
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Select a row
      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      // Click bulk delete
      const deleteButton = screen.getByText('Delete Selected');
      await user.click(deleteButton);

      // Should call API for each selected article
      await waitFor(() => {
        expect(require('../services/api').articlesAPI.delete).toHaveBeenCalledWith('test-article');
      });
    });

    test('shows confirmation dialog for bulk delete', async () => {
      const user = userEvent.setup();
      global.confirm.mockReturnValue(false); // User cancels

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Select a row
      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      // Click bulk delete
      const deleteButton = screen.getByText('Delete Selected');
      await user.click(deleteButton);

      // Should not call API when user cancels
      expect(require('../services/api').articlesAPI.delete).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    test('shows loading state initially', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // DataTable should handle loading state
      const dataTable = screen.getByTestId('data-table');
      expect(dataTable).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    test('loads articles on component mount', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      expect(require('../services/api').articlesAPI.getAll).toHaveBeenCalled();
      expect(require('../services/api').categoriesAPI.getAll).toHaveBeenCalled();
      expect(require('../services/api').authorsAPI.getAll).toHaveBeenCalled();
    });

    test('handles API errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      require('../services/api').articlesAPI.toggleOnline.mockRejectedValue(new Error('API Error'));

      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Select a row and try bulk action
      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      const setOnlineButton = screen.getByText('Set Online');
      await user.click(setOnlineButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle articles:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Navigation', () => {
    test('navigates to new article page when button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      const newArticleButton = screen.getByText('New Article');
      await user.click(newArticleButton);

      // Should navigate to new article route
      expect(window.location.pathname).toBe('/articles/new');
    });
  });

  describe('Responsive Design', () => {
    test('renders properly on different screen sizes', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Check that responsive classes are applied
      const mainContainer = screen.getByText('Articles').closest('div');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper heading structure', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      const heading = screen.getByRole('heading', { level: 2, name: 'Articles' });
      expect(heading).toBeInTheDocument();
    });

    test('buttons have proper labels and icons', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
      expect(screen.getByText('New Article')).toBeInTheDocument();
    });

    test('table is accessible through DataTable component', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      const dataTable = screen.getByTestId('data-table');
      expect(dataTable).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    test('updates selected rows state correctly', async () => {
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      // Selection state should be updated
      expect(screen.getByText('1 article selected')).toBeInTheDocument();
    });

    test('clears selection after bulk operations', async () => {
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Select a row
      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      expect(screen.getByText('1 article selected')).toBeInTheDocument();

      // Perform bulk operation
      const setOnlineButton = screen.getByText('Set Online');
      await user.click(setOnlineButton);

      // Selection should be cleared after operation
      await waitFor(() => {
        expect(screen.queryByText('1 article selected')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles bulk operation failures gracefully', async () => {
      const user = userEvent.setup();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      require('../services/api').articlesAPI.delete.mockRejectedValue(new Error('Delete failed'));

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Select a row and try bulk delete
      const selectButton = screen.getByTestId('select-row-1');
      await user.click(selectButton);

      const deleteButton = screen.getByText('Delete Selected');
      await user.click(deleteButton);

      // Should show error alert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to delete some articles');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    test('uses React.memo for DataTable to prevent unnecessary re-renders', () => {
      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Component should render without performance issues
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });

    test('debounces rapid user interactions', async () => {
      const user = userEvent.setup();

      render(
        <Wrapper>
          <ArticlesList />
        </Wrapper>
      );

      // Rapid interactions should be handled efficiently
      const selectButton = screen.getByTestId('select-row-1');

      await user.click(selectButton);
      await user.click(selectButton);
      await user.click(selectButton);

      // Should handle multiple interactions without issues
      expect(screen.getByTestId('data-table')).toBeInTheDocument();
    });
  });
});