const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

async function reverseGeocodeCountry(lat, lon) {
  try {
    const { data } = await axios.get('https://api.openweathermap.org/geo/1.0/reverse', {
      params: { lat, lon, limit: 1, appid: process.env.OPENWEATHER_API_KEY },
    });
    return data?.[0]?.country || null;
  } catch (e) {
    return null;
  }
}
async function ticketmasterSearch(params) {
  const { data } = await axios.get('https://app.ticketmaster.com/discovery/v2/events.json', {
    params: { apikey: process.env.TICKETMASTER_API_KEY, ...params },
  });
  return data._embedded?.events || [];
}

// GET /api/travel?lat=-6.79&lon=39.20
// Ticketmaster's inventory is thin in many regions, so this tries a nearby
// radius first, then a much wider one, then falls back to "anything
// happening in this country" rather than showing an empty page.
router.get('/', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { lat, lon, radius = 100 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: true, message: 'Missing "lat" and/or "lon" query params' });
    }

    let events = await ticketmasterSearch({ latlong: `${lat},${lon}`, radius, unit: 'km' });
    let scope = 'nearby';

    if (!events.length) {
      events = await ticketmasterSearch({ latlong: `${lat},${lon}`, radius: 500, unit: 'km' });
      scope = 'regional';
    }
    if (!events.length) {
      const country = await reverseGeocodeCountry(lat, lon);
      if (country) {
        events = await ticketmasterSearch({ countryCode: country, sort: 'date,asc', size: 20 });
        scope = 'country';
      }
    }
    res.json({ scope, events });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
