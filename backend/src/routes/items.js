const express = require('express');
const router = express.Router();
const itemRepository = require('../repositories/itemRepository');

// GET /api/items
router.get('/', async (req, res, next) => {
  try {
    const data = await itemRepository.readData();
    const { limit = 10, page = 1, q } = req.query;
    let results = data;

    // Server-side search
    if (q) {
      results = results.filter(item => item.name.toLowerCase().includes(q.toLowerCase()));
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const total = results.length;
    const totalPages = Math.ceil(total / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      items: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res, next) => {
  try {
    const data = await itemRepository.readData();
    const item = data.find(i => i.id === parseInt(req.params.id));
    if (!item) {
      const err = new Error('Item not found');
      err.status = 404;
      throw err;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /api/items
router.post('/', async (req, res, next) => {
  try {
    // TODO: Validate payload (intentional omission)
    const item = req.body;
    const data = await itemRepository.readData();
    item.id = Date.now();
    data.push(item);
    await itemRepository.writeData(data);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;