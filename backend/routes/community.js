const express = require('express');
const router = express.Router();

// GET /api/community/links -- front-end fetches these instead of hard-coding URLs
router.get('/links', (req, res) => {
  res.json({
    whatsapp: process.env.SOCIAL_WHATSAPP_URL || null,
    telegram: process.env.SOCIAL_TELEGRAM_URL || null,
    youtube: process.env.SOCIAL_YOUTUBE_URL || null,
    instagram: process.env.SOCIAL_INSTAGRAM_URL || null,
    tiktok: process.env.SOCIAL_TIKTOK_URL || null,
    facebook: process.env.SOCIAL_FACEBOOK_URL || null,
  });
});

module.exports = router;
