const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();
const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Jikan (MyAnimeList) is a free, unofficial-mirror service and goes down
// often. When it fails, we fall back to TMDB's Animation genre (id 16) and
// reshape the response to look like Jikan's so the frontend never needs to
// know which source served the data.
async function tmdbAnimationFallback(query) {
  const client = axios.create({
    baseURL: 'https://api.themoviedb.org/3',
    params: { api_key: process.env.TMDB_API_KEY },
  });
  const { data } = query
    ? await client.get('/search/tv', { params: { query, with_genres: 16 } })
    : await client.get('/discover/tv', { params: { with_genres: 16, sort_by: 'popularity.desc' } });

  return (data.results || [])
    .filter((tv) => !query || (tv.genre_ids || []).includes(16))
    .map((tv) => ({
      title: tv.name,
      title_english: tv.name,
      episodes: null,
      rating: null,
      score: tv.vote_average || null,
      synopsis: tv.overview,
      images: { jpg: { image_url: tv.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : null } },
      _source: 'tmdb-fallback',
    }));
}

// GET /api/anime/top
router.get('/top', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { data } = await axios.get(`${JIKAN_BASE}/top/anime`, {
      params: { filter: 'bypopularity', limit: 20 },
    });
    res.json(data.data);
  } catch (err) {
    try {
      res.json(await tmdbAnimationFallback());
    } catch (fallbackErr) {
      next(err);
    }
  }
});

// GET /api/anime/:id
router.get('/:id', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { data } = await axios.get(`${JIKAN_BASE}/anime/${req.params.id}/full`);
    res.json(data.data);
  } catch (err) {
    next(err);
  }
});

// GET /api/anime?q=naruto -- kids-safe search
router.get('/', cacheMiddleware(1800), async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: true, message: 'Missing query param "q"' });
    const { data } = await axios.get(`${JIKAN_BASE}/anime`, {
      params: { q, rating: 'g,pg', limit: 20 },
    });
    res.json(data.data);
  } catch (err) {
    try {
      res.json(await tmdbAnimationFallback(q));
    } catch (fallbackErr) {
      next(err);
    }
  }
});

module.exports = router;
