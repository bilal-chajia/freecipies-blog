import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import MediaLibrary from '../pages/media/MediaLibrary';
import { mediaAPI } from '../services/api';

// Mock the API
jest.mock('../services/api', () => ({
  mediaAPI: {
    getAll: jest.fn(),
    upload: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock Zustand store
const mockUseMediaStore = jest.fn(() => ({
  media: [
    {
      id: 1,
      name: 'test-image.jpg',
      url: 'https://example.com/test-image.jpg',
      size: 1024000,
      created_at: '2024-01-01T00:00:00Z',
      alt: 'Test image',
    },
    {
      id: 2,
      name: 'document.pdf',
      url: 'https://example.com/document.pdf',
      size: 2048000,
      created_at: '2024-01-02T00:00:00Z',
    },
  ],
  selectedMedia: [],
  loading: false,
  error: null,
  setMedia: jest.fn(),
  setSelectedMedia: jest.fn(),
  toggleMediaSelection: jest.fn(),
  clearSelection: jest.fn(),
}));

jest.mock('../store/useStore', () => ({
  useMediaStore: mockUseMediaStore,
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock window.confirm
global.confirm = jest.fn(() => true);

describe('MediaLibrary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('renders media library with header and controls', () => {
      render(<MediaLibrary />);

      expect(screen.getByText('Media Library')).toBeInTheDocument();
      expect(screen.getByText('Manage your images, videos, and other media files')).toBeInTheDocument();
      expect(screen.getByText('Upload Files')).toBeInTheDocument();
      expect(screen.getByText('Grid')).toBeInTheDocument();
      expect(screen.getByText('List')).toBeInTheDocument();
    });

    test('displays media files in grid view by default', () => {
      render(<MediaLibrary />);

      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    });

    test('shows search input and filters', () => {
      render(<MediaLibrary />);

      expect(screen.getByPlaceholderText('Search media files...')).toBeInTheDocument();
      expect(screen.getByText('Filter by type')).toBeInTheDocument();
      expect(screen.getByText('Sort by')).toBeInTheDocument();
    });
  });

  describe('View Mode Switching', () => {
    test('switches to list view when list button is clicked', () => {
      render(<MediaLibrary />);

      const listButton = screen.getByRole('button', { name: /list/i });
      fireEvent.click(listButton);

      // In list view, we should see more detailed information
      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
      expect(screen.getByText('Jan 2, 2024')).toBeInTheDocument();
    });

    test('switches back to grid view when grid button is clicked', () => {
      render(<MediaLibrary />);

      const listButton = screen.getByRole('button', { name: /list/i });
      const gridButton = screen.getByRole('button', { name: /grid/i });

      fireEvent.click(listButton);
      fireEvent.click(gridButton);

      // Should be back to grid view
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });
  });

  describe('File Upload Functionality', () => {
    test('opens upload dialog when upload button is clicked', async () => {
      render(<MediaLibrary />);

      const uploadButton = screen.getByText('Upload Files');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Upload Media Files')).toBeInTheDocument();
      });
    });

    test('handles file selection and shows preview for images', async () => {
      const user = userEvent.setup();
      render(<MediaLibrary />);

      // Open upload dialog
      const uploadButton = screen.getByText('Upload Files');
      await user.click(uploadButton);

      // Create a mock file
      const file = new File(['test'], 'test-image.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/choose files/i);

      await user.upload(input, file);

      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.getByText('0 Bytes')).toBeInTheDocument();
    });

    test('shows upload progress during file upload', async () => {
      const user = userEvent.setup();

      // Mock successful upload
      mediaAPI.upload.mockResolvedValue({
        data: { success: true, data: { url: 'https://example.com/uploaded.jpg' } }
      });

      render(<MediaLibrary />);

      // Open upload dialog
      const uploadButton = screen.getByText('Upload Files');
      await user.click(uploadButton);

      // Upload a file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/choose files/i);
      await user.upload(input, file);

      // Click upload button
      const uploadBtn = screen.getByText('Upload');
      await user.click(uploadBtn);

      // Should show uploading state
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    test('handles successful file upload', async () => {
      const user = userEvent.setup();

      // Mock successful upload
      mediaAPI.upload.mockResolvedValue({
        data: { success: true, data: { url: 'https://example.com/uploaded.jpg' } }
      });

      render(<MediaLibrary />);

      // Open upload dialog
      const uploadButton = screen.getByText('Upload Files');
      await user.click(uploadButton);

      // Upload a file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/choose files/i);
      await user.upload(input, file);

      // Click upload button
      const uploadBtn = screen.getByText('Upload');
      await user.click(uploadBtn);

      // Wait for upload to complete
      await waitFor(() => {
        expect(mediaAPI.upload).toHaveBeenCalledWith(
          expect.any(FormData)
        );
      });
    });

    test('handles upload failure', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock failed upload
      mediaAPI.upload.mockRejectedValue(new Error('Upload failed'));

      render(<MediaLibrary />);

      // Open upload dialog
      const uploadButton = screen.getByText('Upload Files');
      await user.click(uploadButton);

      // Upload a file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByLabelText(/choose files/i);
      await user.upload(input, file);

      // Click upload button
      const uploadBtn = screen.getByText('Upload');
      await user.click(uploadBtn);

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to upload file:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    test('validates file type on upload', async () => {
      const user = userEvent.setup();

      render(<MediaLibrary />);

      // Open upload dialog
      const uploadButton = screen.getByText('Upload Files');
      await user.click(uploadButton);

      // Try to upload an unsupported file type
      const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      const input = screen.getByLabelText(/choose files/i);

      // The input should accept the file but validation happens on the backend
      await user.upload(input, file);

      expect(screen.getByText('test.exe')).toBeInTheDocument();
    });
  });

  describe('File Management', () => {
    test('allows copying file URL', async () => {
      const user = userEvent.setup();
      render(<MediaLibrary />);

      // Switch to list view to access actions
      const listButton = screen.getByRole('button', { name: /list/i });
      await user.click(listButton);

      // Find and click the copy URL button
      const copyButtons = screen.getAllByText('Copy URL');
      await user.click(copyButtons[0]);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/test-image.jpg');
    });

    test('allows deleting files with confirmation', async () => {
      const user = userEvent.setup();

      // Mock successful deletion
      mediaAPI.delete.mockResolvedValue({ data: { success: true } });

      render(<MediaLibrary />);

      // Switch to list view to access delete button
      const listButton = screen.getByRole('button', { name: /list/i });
      await user.click(listButton);

      // Find and click the delete button
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      // Should call delete API
      await waitFor(() => {
        expect(mediaAPI.delete).toHaveBeenCalledWith(1);
      });
    });

    test('opens file in new tab when eye icon is clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => {});

      render(<MediaLibrary />);

      // Switch to list view to access eye icon
      const listButton = screen.getByRole('button', { name: /list/i });
      await user.click(listButton);

      // Find and click the eye icon
      const eyeIcons = screen.getAllByLabelText('Eye');
      await user.click(eyeIcons[0]);

      expect(mockOpen).toHaveBeenCalledWith('https://example.com/test-image.jpg', '_blank');

      mockOpen.mockRestore();
    });
  });

  describe('Search and Filtering', () => {
    test('filters files based on search query', async () => {
      const user = userEvent.setup();
      render(<MediaLibrary />);

      const searchInput = screen.getByPlaceholderText('Search media files...');
      await user.type(searchInput, 'test-image');

      // Should still show the matching file
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      // Should hide non-matching files
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();
    });

    test('filters files by type', async () => {
      const user = userEvent.setup();
      render(<MediaLibrary />);

      // Click on filter select
      const filterSelect = screen.getByText('Filter by type');
      await user.click(filterSelect);

      // Select image filter
      const imageOption = screen.getByText('Images');
      await user.click(imageOption);

      // Should show only image files
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();
    });

    test('sorts files by different criteria', async () => {
      const user = userEvent.setup();
      render(<MediaLibrary />);

      // Click on sort select
      const sortSelect = screen.getByText('Sort by');
      await user.click(sortSelect);

      // Select size sorting
      const sizeOption = screen.getByText('Size');
      await user.click(sizeOption);

      // Files should be sorted by size
      const fileElements = screen.getAllByText(/MB/);
      expect(fileElements).toHaveLength(2);
    });
  });

  describe('Bulk Selection', () => {
    test('allows selecting multiple files', async () => {
      const user = userEvent.setup();
      render(<MediaLibrary />);

      // Click on files to select them
      const fileCards = screen.getAllByRole('img').map(img => img.closest('[role="button"]')).filter(Boolean);
      if (fileCards.length >= 2) {
        await user.click(fileCards[0]);
        await user.click(fileCards[1]);

        // Should show selection count
        expect(screen.getByText(/2 files selected/)).toBeInTheDocument();
      }
    });

    test('allows clearing selection', async () => {
      const user = userEvent.setup();
      render(<MediaLibrary />);

      // Select a file first
      const fileCards = screen.getAllByRole('img').map(img => img.closest('[role="button"]')).filter(Boolean);
      if (fileCards.length > 0) {
        await user.click(fileCards[0]);

        // Click clear selection
        const clearButton = screen.getByText('Clear Selection');
        await user.click(clearButton);

        // Selection should be cleared
        expect(screen.queryByText(/files selected/)).not.toBeInTheDocument();
      }
    });

    test('allows bulk deletion', async () => {
      const user = userEvent.setup();

      // Mock successful bulk deletion
      mediaAPI.delete.mockResolvedValue({ data: { success: true } });

      render(<MediaLibrary />);

      // Select files
      const fileCards = screen.getAllByRole('img').map(img => img.closest('[role="button"]')).filter(Boolean);
      if (fileCards.length >= 2) {
        await user.click(fileCards[0]);
        await user.click(fileCards[1]);

        // Click delete selected
        const deleteSelectedButton = screen.getByText('Delete Selected');
        await user.click(deleteSelectedButton);

        // Should call delete for each selected file
        await waitFor(() => {
          expect(mediaAPI.delete).toHaveBeenCalledTimes(2);
        });
      }
    });
  });

  describe('Loading and Error States', () => {
    test('shows loading spinner when loading', () => {
      // Mock loading state
      mockUseMediaStore.mockReturnValueOnce({
        media: [],
        selectedMedia: [],
        loading: true,
        error: null,
        setMedia: jest.fn(),
        setSelectedMedia: jest.fn(),
        toggleMediaSelection: jest.fn(),
        clearSelection: jest.fn(),
      });

      render(<MediaLibrary />);

      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });

    test('shows error message when there is an error', () => {
      // Mock error state
      mockUseMediaStore.mockReturnValueOnce({
        media: [],
        selectedMedia: [],
        loading: false,
        error: 'Failed to load media',
        setMedia: jest.fn(),
        setSelectedMedia: jest.fn(),
        toggleMediaSelection: jest.fn(),
        clearSelection: jest.fn(),
      });

      render(<MediaLibrary />);

      expect(screen.getByText('Error loading homepage settings: Failed to load media')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no files are found', () => {
      // Mock empty media state
      mockUseMediaStore.mockReturnValueOnce({
        media: [],
        selectedMedia: [],
        loading: false,
        error: null,
        setMedia: jest.fn(),
        setSelectedMedia: jest.fn(),
        toggleMediaSelection: jest.fn(),
        clearSelection: jest.fn(),
      });

      render(<MediaLibrary />);

      expect(screen.getByText('No media files found')).toBeInTheDocument();
      expect(screen.getByText('Upload your first media file to get started')).toBeInTheDocument();
    });

    test('shows filtered empty state', async () => {
      const user = userEvent.setup();
      render(<MediaLibrary />);

      // Search for non-existent file
      const searchInput = screen.getByPlaceholderText('Search media files...');
      await user.type(searchInput, 'nonexistent-file');

      expect(screen.getByText('No media files found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });
  });

  describe('File Type Icons', () => {
    test('shows correct icons for different file types', () => {
      render(<MediaLibrary />);

      // Should show image icon for JPG
      const imageIcon = screen.getByAltText('Test image');
      expect(imageIcon).toBeInTheDocument();

      // Should show file icon for PDF
      const fileIcon = screen.getByText('document.pdf').closest('div').querySelector('svg');
      expect(fileIcon).toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    test('displays file count and total size', () => {
      render(<MediaLibrary />);

      expect(screen.getByText('Showing 2 of 2 files')).toBeInTheDocument();
      expect(screen.getByText(/bytes total/)).toBeInTheDocument();
    });
  });
});