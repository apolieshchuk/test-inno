import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Items from './Items';
import { DataProvider } from '../state/DataContext';

// Mock fetch
global.fetch = jest.fn();

const mockItems = [
  { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 },
  { id: 2, name: 'Noise Cancelling Headphones', category: 'Electronics', price: 399 },
  { id: 3, name: 'Ultra-Wide Monitor', category: 'Electronics', price: 999 }
];

const mockPagination = {
  page: 1,
  limit: 10,
  total: 3,
  totalPages: 1,
  hasNext: false,
  hasPrev: false
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <DataProvider>
        {component}
      </DataProvider>
    </BrowserRouter>
  );
};

describe('Items Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: mockItems,
        pagination: mockPagination
      })
    });
  });

  it('should render loading state initially', async () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderWithRouter(<Items />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render items list after loading', async () => {
    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    });

    expect(screen.getByText('Noise Cancelling Headphones')).toBeInTheDocument();
    expect(screen.getByText('Ultra-Wide Monitor')).toBeInTheDocument();
  });

  it('should render search input', async () => {
    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument();
    });

    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should perform search when form is submitted', async () => {
    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search items...');
    const searchButton = screen.getByText('Search');

    // Mock filtered results
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 }],
        pagination: { ...mockPagination, total: 1 }
      })
    });

    fireEvent.change(searchInput, { target: { value: 'laptop' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=laptop'),
        expect.any(Object)
      );
    });
  });

  it('should show clear button when search is active', async () => {
    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search items...');
    const searchButton = screen.getByText('Search');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 }],
        pagination: { ...mockPagination, total: 1 }
      })
    });

    fireEvent.change(searchInput, { target: { value: 'laptop' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  it('should clear search when clear button is clicked', async () => {
    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search items...');
    const searchButton = screen.getByText('Search');

    // Set search
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 }],
        pagination: { ...mockPagination, total: 1 }
      })
    });

    fireEvent.change(searchInput, { target: { value: 'laptop' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    // Clear search
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItems,
        pagination: mockPagination
      })
    });

    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
    });
  });

  it('should display pagination controls', async () => {
    const paginationWithPages = {
      ...mockPagination,
      totalPages: 3,
      hasNext: true,
      hasPrev: false
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItems,
        pagination: paginationWithPages
      })
    });

    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('should disable Previous button on first page', async () => {
    const paginationWithPages = {
      ...mockPagination,
      totalPages: 3,
      hasNext: true,
      hasPrev: false
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItems,
        pagination: paginationWithPages
      })
    });

    renderWithRouter(<Items />);

    await waitFor(() => {
      const prevButton = screen.getByText('Previous');
      expect(prevButton).toBeDisabled();
    });
  });

  it('should disable Next button on last page', async () => {
    const paginationLastPage = {
      ...mockPagination,
      page: 3,
      totalPages: 3,
      hasNext: false,
      hasPrev: true
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItems,
        pagination: paginationLastPage
      })
    });

    renderWithRouter(<Items />);

    await waitFor(() => {
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });
  });

  it('should change page when Next button is clicked', async () => {
    const paginationWithPages = {
      ...mockPagination,
      totalPages: 3,
      hasNext: true,
      hasPrev: false
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItems,
        pagination: paginationWithPages
      })
    });

    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: mockItems,
        pagination: { ...paginationWithPages, page: 2, hasPrev: true }
      })
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  it('should display "No items found" when search returns empty', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [],
        pagination: { ...mockPagination, total: 0 }
      })
    });

    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByText(/No items found/)).toBeInTheDocument();
    });
  });

  it('should display search term in "No items found" message', async () => {
    renderWithRouter(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search items...');
    const searchButton = screen.getByText('Search');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [],
        pagination: { ...mockPagination, total: 0 }
      })
    });

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/No items found for "nonexistent"/)).toBeInTheDocument();
    });
  });
});

