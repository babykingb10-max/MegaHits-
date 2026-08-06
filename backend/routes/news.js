const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// GET /api/news?category=technology&country=KE
// Uses Currents API — unlike NewsAPI's free tier, it works on live/production domains.
// Currents' free-tier index is thin for many countries, so combining country +
// category often returns zero results even when either filter alone would
// work. This tries progressively broader queries instead of giving up.
async function fetchCurrentsNews(params) {
  const { data } = await axios.get('https://api.currentsapi.services/v1/latest-news', {
    params: { ...params, apiKey: process.env.CURRENTS_API_KEY },
  });
  return data.news || [];
}

router.get('/', cacheMiddleware(1800), async (req, res, next) => {
  try {
    const { category = 'general', language = 'en', country } = req.query;

    let news = await fetchCurrentsNews({ category, language, country });
    let scope = 'category+country';

    if (!news.length && country) {
      news = await fetchCurrentsNews({ language, country });
      scope = 'country-only';
    }
    if (!news.length) {
      news = await fetchCurrentsNews({ category, language });
      scope = 'category-only';
    }
    res.json({ scope, news });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
