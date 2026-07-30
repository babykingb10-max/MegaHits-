const express = require('express');
const router = express.Router();

// GET /api/config
// Google OAuth Client IDs are meant to be public (unlike the client
// secret), so it's safe to expose this to the frontend for Google
// Identity Services sign-in.
router.get('/', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

module.exports = router;
