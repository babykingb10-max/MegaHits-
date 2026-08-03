const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// GET /api/news?category=technology&country=KE
// Uses Currents API — unlike NewsAPI's free tier, it works on live/production domains.
router.get('/', cacheMiddleware(1800), async (req, res, next) => {
  try {
    const { category = 'general', language = 'en', country } = req.query;
    const { data } = await axios.get('https://api.currentsapi.services/v1/latest-news', {
      params: { category, language, country, apiKey: process.env.CURRENTS_API_KEY },
    });
    res.json(data.news);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
