import React, { createContext, useCallback, useContext, useState } from 'react';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async (signal, { page = 1, limit = 10, search = '' } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) {
        params.append('q', search);
      }

      const res = await fetch(`http://localhost:3001/api/items?${params}`, { signal });
      if (signal?.aborted) return;
      const json = await res.json();
      if (signal?.aborted) return;
      
      setItems(json.items || []);
      setPagination(json.pagination || null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <DataContext.Provider value={{ items, pagination, loading, fetchItems }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);