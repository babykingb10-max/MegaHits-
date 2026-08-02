const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// GET /api/gaming/new-releases
router.get('/new-releases', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { data } = await axios.get('https://api.rawg.io/api/games', {
      params: { ordering: '-released', key: process.env.RAWG_API_KEY, page_size: 20 },
    });
    res.json(data.results);
  } catch (err) {
    next(err);
  }
});

// GET /api/gaming?q=elden+ring
router.get('/', cacheMiddleware(1800), async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: true, message: 'Missing query param "q"' });
    const { data } = await axios.get('https://api.rawg.io/api/games', {
      params: { search: q, key: process.env.RAWG_API_KEY, page_size: 20 },
    });
    res.json(data.results);
  } catch (err) {
    next(err);
  }
});

// GET /api/gaming/:id/trailer
router.get('/:id/trailer', cacheMiddleware(86400), async (req, res, next) => {
  try {
    const { data } = await axios.get(`https://api.rawg.io/api/games/${req.params.id}/movies`, {
      params: { key: process.env.RAWG_API_KEY },
    });
    res.json(data.results || []);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
