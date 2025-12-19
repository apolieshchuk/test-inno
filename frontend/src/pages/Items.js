import React, { useEffect, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useData } from '../state/DataContext';
import { Link } from 'react-router-dom';

function Items() {
  const { items, pagination, loading, fetchItems } = useData();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const abortController = new AbortController();

    fetchItems(abortController.signal, { page, limit: 10, search });

    return () => {
      abortController.abort();
    };
  }, [fetchItems, page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1); // Reset to first page on new search
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search items..."
          style={{ padding: '8px', marginRight: '8px', width: '300px' }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setPage(1);
            }}
            style={{ padding: '8px 16px', marginLeft: '8px' }}
          >
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No items found{search && ` for "${search}"`}</p>
      ) : (
        <>
          <List
            height={400}
            itemCount={items.length}
            itemSize={40}
            width="100%"
          >
            {({ index, style }) => (
              <div style={style}>
                <Link 
                  to={'/items/' + items[index].id}
                  style={{ 
                    display: 'block', 
                    padding: '8px',
                    textDecoration: 'none',
                    color: 'inherit',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  {items[index].name}
                </Link>
              </div>
            )}
          </List>

          {pagination && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={!pagination.hasPrev}
                style={{ padding: '8px 16px' }}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={!pagination.hasNext}
                style={{ padding: '8px 16px' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Items;