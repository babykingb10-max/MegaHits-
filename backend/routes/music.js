const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// GET /api/music/top50
// Uses Deezer's public chart endpoint — no API key required, and unlike
// Spotify's official playlists, Deezer's chart data isn't restricted for
// third-party apps.
router.get('/top50', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { data } = await axios.get('https://api.deezer.com/chart/0/tracks', {
      params: { limit: 50 },
    });
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// GET /api/music?q=track+name
router.get('/', cacheMiddleware(1800), async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: true, message: 'Missing query param "q"' });
    const { data } = await axios.get('https://api.deezer.com/search', {
      params: { q, limit: 20 },
    });
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
