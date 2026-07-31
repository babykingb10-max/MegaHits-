const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

function apiFootballClient() {
  return axios.create({
    baseURL: 'https://v3.football.api-sports.io',
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
  });
}

// GET /api/sports/live -- refresh every 60s on the client
router.get('/live', cacheMiddleware(60), async (req, res, next) => {
  try {
    const { data } = await apiFootballClient().get('/fixtures', { params: { live: 'all' } });
    res.json(data.response);
  } catch (err) {
    next(err);
  }
});

// GET /api/sports/standings?league=39&season=2026
router.get('/standings', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { league, season } = req.query;
    const { data } = await apiFootballClient().get('/standings', { params: { league, season } });
    res.json(data.response);
  } catch (err) {
    next(err);
  }
});

// GET /api/sports/fixture/:id/stats
router.get('/fixture/:id/stats', cacheMiddleware(60), async (req, res, next) => {
  try {
    const { data } = await apiFootballClient().get('/fixtures/statistics', {
      params: { fixture: req.params.id },
    });
    res.json(data.response);
  } catch (err) {
    next(err);
  }
});

// GET /api/sports/players?search=Messi
router.get('/players', cacheMiddleware(86400), async (req, res, next) => {
  try {
    const { search, league, season = new Date().getFullYear() } = req.query;
    if (!search) return res.status(400).json({ error: true, message: 'Missing "search" query param' });
    const { data } = await apiFootballClient().get('/players', {
      params: { search, league, season },
    });
    res.json(data.response);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
