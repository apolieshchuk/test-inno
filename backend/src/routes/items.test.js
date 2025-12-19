const request = require('supertest');
const express = require('express');
const itemsRouter = require('./items');

// Mock the repository
jest.mock('../repositories/itemRepository', () => {
  const mockItems = [
    { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 },
    { id: 2, name: 'Noise Cancelling Headphones', category: 'Electronics', price: 399 },
    { id: 3, name: 'Ultra-Wide Monitor', category: 'Electronics', price: 999 },
    { id: 4, name: 'Ergonomic Chair', category: 'Furniture', price: 799 },
    { id: 5, name: 'Standing Desk', category: 'Furniture', price: 1199 }
  ];

  let mockData = [...mockItems];

  return {
    readData: jest.fn(async () => [...mockData]),
    writeData: jest.fn(async (data) => {
      mockData = data;
    }),
    getLastModifiedTime: jest.fn(() => new Date())
  };
});

const app = express();
app.use(express.json());
app.use('/api/items', itemsRouter);
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

describe('Items Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/items', () => {
    it('should return all items with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/items')
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.items).toHaveLength(5);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
    });

    it('should paginate results correctly', async () => {
      const res = await request(app)
        .get('/api/items?page=1&limit=2')
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      });
    });

    it('should return second page correctly', async () => {
      const res = await request(app)
        .get('/api/items?page=2&limit=2')
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.hasNext).toBe(true);
      expect(res.body.pagination.hasPrev).toBe(true);
    });

    it('should filter items by search query', async () => {
      const res = await request(app)
        .get('/api/items?q=laptop')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toContain('Laptop');
      expect(res.body.pagination.total).toBe(1);
    });

    it('should handle case-insensitive search', async () => {
      const res = await request(app)
        .get('/api/items?q=CHAIR')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toContain('Chair');
    });

    it('should combine search and pagination', async () => {
      const res = await request(app)
        .get('/api/items?q=electronics&page=1&limit=1')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.pagination.total).toBe(3); // 3 electronics items
    });

    it('should return empty array when search has no matches', async () => {
      const res = await request(app)
        .get('/api/items?q=nonexistent')
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/items/:id', () => {
    it('should return a single item by id', async () => {
      const res = await request(app)
        .get('/api/items/1')
        .expect(200);

      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('name', 'Laptop Pro');
    });

    it('should return 404 when item not found', async () => {
      const res = await request(app)
        .get('/api/items/999')
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Item not found');
    });

    it('should handle invalid id format', async () => {
      const res = await request(app)
        .get('/api/items/invalid')
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Item not found');
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItem = {
        name: 'New Item',
        category: 'Test',
        price: 100
      };

      const res = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'New Item');
      expect(res.body).toHaveProperty('category', 'Test');
      expect(res.body).toHaveProperty('price', 100);
      expect(typeof res.body.id).toBe('number');
    });

    it('should auto-generate id for new item', async () => {
      const newItem = {
        name: 'Another Item',
        category: 'Test',
        price: 200
      };

      const res = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      expect(res.body.id).toBeGreaterThan(0);
    });

    it('should persist the new item', async () => {
      const newItem = {
        name: 'Persisted Item',
        category: 'Test',
        price: 300
      };

      await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      // Verify it was saved by checking the repository was called
      const itemRepository = require('../repositories/itemRepository');
      expect(itemRepository.writeData).toHaveBeenCalled();
    });
  });
});

