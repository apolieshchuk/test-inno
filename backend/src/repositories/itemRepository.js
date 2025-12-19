const fs = require('fs').promises;
const fsEvents = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/items.json');

// In-memory cache for items data
let cachedData = null;
let lastFileMtime = null;

// Watch file for external changes and invalidate cache
async function watchFile() {
  try {
    const watcher = fsEvents.watch(DATA_PATH, async (eventType) => {
      if (eventType === 'change') {
        try {
          const stats = await fs.stat(DATA_PATH);
          // Only invalidate if mtime actually changed (avoid duplicate events)
          if (!lastFileMtime || stats.mtime.getTime() !== lastFileMtime.getTime()) {
            cachedData = null;
            lastFileMtime = stats.mtime;
          }
        } catch (err) {
          // File might have been deleted, invalidate cache
          cachedData = null;
        }
      }
    });

    // Handle watcher errors
    watcher.on('error', (err) => {
      console.error('File watcher error:', err);
    });
  } catch (err) {
    console.error('Failed to initialize file watcher:', err);
  }
}

// Initialize file watching and get initial mtime
async function initFileWatcher() {
  try {
    const stats = await fs.stat(DATA_PATH);
    lastFileMtime = stats.mtime;
  } catch (err) {
    // File might not exist yet, will be set on first read
  }
  await watchFile();
}

initFileWatcher();

// Read data from cache or file
async function readData() {
  if (cachedData) {
    return cachedData;
  }
  
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  cachedData = JSON.parse(raw);
  const stats = await fs.stat(DATA_PATH);
  lastFileMtime = stats.mtime;
  return cachedData;
}

// Check if data has changed (for cache invalidation in dependent caches)
function getLastModifiedTime() {
  return lastFileMtime;
}

// Write data to file and invalidate cache
async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
  cachedData = null; // Invalidate cache on write
  const stats = await fs.stat(DATA_PATH);
  lastFileMtime = stats.mtime; // Update mtime after write
}

module.exports = {
  readData,
  writeData,
  getLastModifiedTime
};

