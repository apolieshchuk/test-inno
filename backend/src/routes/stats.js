const express = require('express');
const router = express.Router();
const { mean } = require('../utils/stats');
const itemRepository = require('../repositories/itemRepository');

// Cache for calculated stats
let cachedStats = null;
let cachedStatsMtime = null;

// Calculate stats from items
async function calculateStats() {
  const items = await itemRepository.readData();
  
  return {
    total: items.length,
    averagePrice: mean(items.map(item => item.price))
  };
}

// GET /api/stats
router.get('/', async (req, res, next) => {
  try {
    const currentMtime = itemRepository.getLastModifiedTime();
    
    // Invalidate stats cache if data file has changed
    if (cachedStats && cachedStatsMtime !== currentMtime) {
      cachedStats = null;
    }
    
    // Check if stats cache is valid
    if (!cachedStats) {
      cachedStats = await calculateStats();
      cachedStatsMtime = currentMtime;
    }
    
    res.json(cachedStats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;