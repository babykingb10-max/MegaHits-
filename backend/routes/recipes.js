const express = require('express');
const axios = require('axios');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// GET /api/recipes?ingredients=rice,tomato,chicken
// GET /api/recipes?cuisine=African&ingredients=chicken (optional ingredients boost)
router.get('/', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { ingredients, cuisine } = req.query;

    if (cuisine) {
      // findByIngredients has no cuisine filter, so cuisine browsing uses complexSearch instead.
      const { data } = await axios.get('https://api.spoonacular.com/recipes/complexSearch', {
        params: { cuisine, includeIngredients: ingredients, number: 12, apiKey: process.env.SPOONACULAR_API_KEY },
      });
      return res.json((data.results || []).map((r) => ({
        id: r.id, title: r.title, image: r.image, usedIngredientCount: null, missedIngredientCount: null,
      })));
    }

    if (!ingredients) {
      return res.status(400).json({ error: true, message: 'Missing "ingredients" query param' });
    }
    const { data } = await axios.get('https://api.spoonacular.com/recipes/findByIngredients', {
      params: { ingredients, number: 12, apiKey: process.env.SPOONACULAR_API_KEY },
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes/:id/information
router.get('/:id/information', cacheMiddleware(3600), async (req, res, next) => {
  try {
    const { data } = await axios.get(
      `https://api.spoonacular.com/recipes/${req.params.id}/information`,
      { params: { apiKey: process.env.SPOONACULAR_API_KEY } }
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
