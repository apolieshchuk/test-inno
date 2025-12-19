# Backend (Node.js)

## Repository Pattern: Data Access Abstraction

### What Changed

Created `src/repositories/itemRepository.js` to abstract all data access operations. Moved `readData()` and `writeData()` functions from routes into the repository. Both `items.js` and `stats.js` routes now use the repository instead of direct file operations.

### How It Works

The repository implements caching at the data access layer - reads are cached in memory and returned instantly on subsequent calls. Cache is invalidated automatically when:
- Data is written via `writeData()` (immediate invalidation)
- File changes are detected by `fs.watch()` (external changes)

The repository also tracks file modification time and exposes `getLastModifiedTime()` so dependent caches (like stats) can invalidate themselves when data changes.

### Why This Matters

Following the repository pattern separates data access logic from business logic. Routes don't need to know about file paths, caching, or file watching - they just call `readData()` and `writeData()`. This mimics how you'd work with a database where the ORM/repository handles connection pooling, query caching, etc.

Having caching at the repository level means all routes benefit automatically. When one route writes data, the cache is invalidated for everyone. File watching handles external changes (like manual edits) so the cache stays fresh.

## Refactoring: Blocking I/O to Non-Blocking Async Operations

### What Changed

Replaced `fs.readFileSync()` and `fs.writeFileSync()` in `src/routes/items.js` with `fs.promises.readFile()` and `fs.promises.writeFile()`. All route handlers are now async and use await.

### Node.js Version

`fs.promises` was added in **Node.js 10.0.0** (2018). It gives us promise-based file ops so we can use async/await instead of callbacks or blocking sync methods.

### Why This Matters

Node.js runs on a single-threaded event loop. When you use `fs.readFileSync()`, it blocks the entire thread - no other requests can be processed until that file read finishes. This kills concurrency and makes the server unresponsive.

With async I/O, the file operation starts and control returns to the event loop immediately. Node can handle other requests while waiting for the file operation to complete. Much better throughput and scalability.

## Performance Optimization: Stats Caching

### What Changed

Added caching to `GET /api/stats` in `src/routes/stats.js`. Stats are now calculated once and cached until the data file changes. Also switched to `fs.promises` for consistency and started using the `mean` utility from `utils/stats.js`.

### How It Works

Uses `fs.watch()` to monitor the data file. When the file changes, the cache is invalidated and stats are recalculated on the next request. Otherwise, cached stats are returned immediately without reading the file or doing calculations.

### Why This Matters

Recalculating stats on every request means reading the file and running reduce operations every time, even when the data hasn't changed. With caching, subsequent requests are instant - just return the cached object. The file watcher ensures we don't serve stale data.

## Testing: Unit Tests for Items Routes

### Approach

Tbh, I think tests can be easily generated with AI these days. Current AI level is pretty solid for this - it can handle the boilerplate, cover the main cases, and we can tweak it based on real UX scenarios that come up. Saves time and money without losing quality, which is what matters for product development.

### What Needs to Be Covered

**Happy paths:**
- GET `/api/items` - returns all items, handles query params (limit, search)
- GET `/api/items/:id` - returns single item by ID
- POST `/api/items` - creates new item with auto-generated ID

**Error cases:**
- GET `/api/items/:id` - 404 when item not found
- POST `/api/items` - handles invalid/missing data gracefully
- File read/write errors - repository handles I/O failures properly

Mock the repository layer so tests don't touch the actual file system. Focus on route logic, validation, and error handling.

### Implementation

Created `items.test.js` with comprehensive test coverage:

**Backend Tests (Jest + Supertest):**
- GET `/api/items` - pagination, search, combined filters
- GET `/api/items/:id` - happy path and 404 errors
- POST `/api/items` - item creation with auto-generated IDs
- All tests mock the repository to avoid file system dependencies

Tests verify response structure, pagination metadata, search filtering, and error handling. Repository is mocked so tests are fast and don't require actual data files.

---

# Frontend (React)

## Memory Leak Fix: Component Cleanup

### What Changed

Fixed memory leak in `Items.js` where the component could try to update state after unmounting if the fetch request completed slowly. Added `AbortController` to cancel fetch requests when the component unmounts, and updated `DataContext` to check the abort signal before updating state.

### How It Works

When the component mounts, it creates an `AbortController` and passes its signal to `fetchItems()`. The fetch request uses this signal, so if the component unmounts before the request completes, the fetch is cancelled. The `DataContext` also checks if the signal was aborted before calling `setItems()`, preventing state updates on unmounted components.

The cleanup function in `useEffect` calls `abortController.abort()` when the component unmounts, ensuring no pending requests can update state.

## Pagination & Server-Side Search

### What Changed

Implemented pagination and server-side search for the items list. Backend now accepts `page`, `limit`, and `q` (search) query parameters and returns paginated results with metadata. Frontend has a search input and pagination controls.

### How It Works

**Backend (`items.js`):**
- Accepts `page` (default: 1), `limit` (default: 10), and `q` (search query) params
- Filters items by name if `q` is provided (case-insensitive substring match)
- Calculates pagination metadata (total items, total pages, hasNext/hasPrev)
- Returns both `items` array and `pagination` object with metadata

**Frontend (`Items.js` & `DataContext.js`):**
- Search input with debounced submission (resets to page 1 on new search)
- Pagination controls (Previous/Next buttons with page info)
- Loading state while fetching
- `fetchItems` now accepts pagination and search params
- Automatically fetches when page or search changes

## Performance: List Virtualization

### What Changed

Integrated `react-window` to virtualize the items list rendering. Replaced the standard `<ul>` with `FixedSizeList` component that only renders visible items, dramatically improving performance for large lists.

### How It Works

**Virtualization (`Items.js`):**
- Uses `FixedSizeList` from `react-window` instead of mapping over all items
- Only renders items currently visible in the viewport (plus a small buffer)
- Each item has a fixed height of 40px, list container is 400px tall
- As user scrolls, items are dynamically mounted/unmounted
- Row renderer function creates each list item with proper styling and links

**Key Configuration:**
- `height={400}` - Container height in pixels
- `itemCount={items.length}` - Total number of items
- `itemSize={40}` - Height of each item in pixels
- Row renderer receives `index` and `style` props for positioning

### Why This Matters

Without virtualization, rendering 1000+ items means creating 1000+ DOM nodes, even if only 10 are visible. This causes:
- Slow initial render
- High memory usage
- Laggy scrolling
- Poor performance on lower-end devices

With virtualization, only ~10-15 DOM nodes exist at any time (visible items + buffer). Scrolling is smooth, memory usage is constant, and performance stays consistent regardless of list size. Even if pagination limits results, virtualization ensures the UI stays responsive if the limit increases or if we show more items per page.
