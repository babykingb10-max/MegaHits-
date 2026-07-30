require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Core middleware ──────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || '*',
    credentials: true,
  })
);

// Global rate limiter: 120 requests/min per IP, protects upstream free-tier quotas
app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, message: 'Too many requests. Please slow down.' },
  })
);

// ── Health check (used by Render/Heroku/Pterodactyl uptime probes) ─
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Friendly root route — this is an API-only backend, not a website.
// Visiting "/" in a browser is expected; this avoids a confusing 404. ─
app.get('/', (req, res) => {
  res.json({
    name: 'MegaHits Vibez API Gateway',
    status: 'running',
    health: '/health',
    api_base: '/api',
    docs: 'See backend/README or DEPLOY_HEROKU.md in the project repo.',
  });
});

// ── Route mounting — one router per category, per SEHEMU YA 2 ──
app.use('/api/movies', require('./routes/movies'));
app.use('/api/anime', require('./routes/anime'));
app.use('/api/music', require('./routes/music'));
app.use('/api/sports', require('./routes/sports'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/news', require('./routes/news'));
app.use('/api/gaming', require('./routes/gaming'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/books', require('./routes/books'));
app.use('/api/travel', require('./routes/travel'));
app.use('/api/community', require('./routes/community'));
app.use('/api/config', require('./routes/config'));

// ── 404 + error handling ─────────────────────────────────
app.use((req, res) => res.status(404).json({ error: true, message: 'Route not found' }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`MegaHits Vibez API Gateway running on port ${PORT}`);
});
