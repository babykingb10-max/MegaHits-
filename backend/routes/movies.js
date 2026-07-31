const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();
const TMDB_BASE = 'https://api.themoviedb.org/3';

function tmdbClient() {
  return axios.create({
    baseURL: TMDB_BASE,
    headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}` },
    params: { api_key: process.env.TMDB_API_KEY },
  });
}

// GET /api/movies/genres
router.get('/genres', cacheMiddleware(86400), async (req, res, next) => {
  try {
    const { data } = await tmdbClient().get('/genre/movie/list');
    res.json(data.genres);
  } catch (err) {
    next(err);
  }
});

// GET /api/movies/discover?genre=28
router.get('/discover', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { genre } = req.query;
    const { data } = await tmdbClient().get('/discover/movie', {
      params: { with_genres: genre, sort_by: 'popularity.desc' },
    });
    res.json(data.results);
  } catch (err) {
    next(err);
  }
});

// GET /api/movies/tv/trending
router.get('/tv/trending', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { data } = await tmdbClient().get('/trending/tv/week');
    res.json(data.results);
  } catch (err) {
    next(err);
  }
});

// GET /api/movies/trending
router.get('/trending', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { data } = await tmdbClient().get('/trending/movie/week');
    res.json(data.results);
  } catch (err) {
    next(err);
  }
});

// GET /api/movies/:id  (details + credits + videos in one call)
router.get('/:id', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { data } = await tmdbClient().get(`/movie/${req.params.id}`, {
      params: { append_to_response: 'credits,videos,watch/providers' },
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/movies/search?q=avatar
router.get('/', cacheMiddleware(1800), async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: true, message: 'Missing query param "q"' });
    const { data } = await tmdbClient().get('/search/movie', { params: { query: q } });
    res.json(data.results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
