import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DataProvider, useData } from './DataContext';

// Mock fetch
global.fetch = jest.fn();

const TestComponent = () => {
  const { items, pagination, loading, fetchItems } = useData();

  React.useEffect(() => {
    const abortController = new AbortController();
    fetchItems(abortController.signal, { page: 1, limit: 10 });
    return () => abortController.abort();
  }, [fetchItems]);

  return (
    <div>
      {loading && <div data-testid="loading">Loading...</div>}
      <div data-testid="items-count">{items.length}</div>
      {pagination && <div data-testid="pagination">{JSON.stringify(pagination)}</div>}
    </div>
  );
};

describe('DataContext', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should provide items, pagination, loading, and fetchItems', () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        pagination: null
      })
    });

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    expect(screen.getByTestId('items-count')).toBeInTheDocument();
  });

  it('should set loading to true during fetch', async () => {
    fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should fetch items and update state', async () => {
    const mockItems = [
      { id: 1, name: 'Item 1', category: 'Test', price: 100 }
    ];
    const mockPagination = {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: mockItems,
        pagination: mockPagination
      })
    });

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('items-count')).toHaveTextContent('1');
    });

    expect(screen.getByTestId('pagination')).toHaveTextContent(JSON.stringify(mockPagination));
  });

  it('should include search parameter in fetch URL', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        pagination: null
      })
    });

    const SearchTestComponent = () => {
      const { fetchItems } = useData();

      React.useEffect(() => {
        const abortController = new AbortController();
        fetchItems(abortController.signal, { page: 1, limit: 10, search: 'laptop' });
        return () => abortController.abort();
      }, [fetchItems]);

      return <div>Test</div>;
    };

    render(
      <DataProvider>
        <SearchTestComponent />
      </DataProvider>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=laptop'),
        expect.any(Object)
      );
    });
  });

  it('should include pagination parameters in fetch URL', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
        pagination: null
      })
    });

    const PaginationTestComponent = () => {
      const { fetchItems } = useData();

      React.useEffect(() => {
        const abortController = new AbortController();
        fetchItems(abortController.signal, { page: 2, limit: 5 });
        return () => abortController.abort();
      }, [fetchItems]);

      return <div>Test</div>;
    };

    render(
      <DataProvider>
        <PaginationTestComponent />
      </DataProvider>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        expect.any(Object)
      );
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    fetch.mockRejectedValue(new Error('Network error'));

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should not update state if signal is aborted', async () => {
    const mockItems = [{ id: 1, name: 'Item 1', category: 'Test', price: 100 }];

    fetch.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({
              items: mockItems,
              pagination: null
            })
          });
        }, 100);
      });
    });

    const AbortTestComponent = () => {
      const { items, fetchItems } = useData();

      React.useEffect(() => {
        const abortController = new AbortController();
        fetchItems(abortController.signal, { page: 1, limit: 10 });
        // Abort immediately
        abortController.abort();
        return () => abortController.abort();
      }, [fetchItems]);

      return <div data-testid="items-count">{items.length}</div>;
    };

    render(
      <DataProvider>
        <AbortTestComponent />
      </DataProvider>
    );

    await waitFor(() => {
      // Items should remain empty because fetch was aborted
      expect(screen.getByTestId('items-count')).toHaveTextContent('0');
    });
  });
});

