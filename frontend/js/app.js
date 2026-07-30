/* ============================================================
   MEGAHITS VIBEZ — APP.JS
   Vanilla ES6+, zero external UI frameworks. Talks to the Express
   proxy in /backend. Falls back to bundled sample data ONLY when a
   request truly fails (offline / API not configured yet) — a
   successful-but-empty response shows an honest "no results" state
   instead of fake data.
   ============================================================ */

const API_BASE = window.MEGAHITS_API_BASE || '/api';
const DEFAULT_COORDS = { lat: -6.7924, lon: 39.2083 }; // Dar es Salaam fallback

function refreshIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch (e) { /* non-fatal */ }
  }
}

/* ---------- 1. CATEGORY REGISTRY ---------- */
const CATEGORIES = [
  { id: 'movies',  name: 'Movies & Cinema',  icon: 'film',        badge: null },
  { id: 'anime',   name: 'Cartoons & Anime', icon: 'tv',          badge: 'KIDS SAFE' },
  { id: 'music',   name: 'Music & Media',    icon: 'music',       badge: null },
  { id: 'sports',  name: 'Live Sports',      icon: 'trophy',      badge: 'LIVE' },
  { id: 'weather', name: 'Live Weather',     icon: 'cloud-sun',   badge: null },
  { id: 'finance', name: 'Finance & Crypto', icon: 'trending-up', badge: null },
  { id: 'recipes', name: 'Recipe Finder',    icon: 'chef-hat',    badge: null },
  { id: 'news',    name: 'Breaking News',    icon: 'newspaper',   badge: 'NEW' },
  { id: 'gaming',  name: 'Gaming & Esports', icon: 'gamepad-2',   badge: null },
  { id: 'books',   name: 'Books & Comics',   icon: 'book-open',   badge: null },
  { id: 'travel',  name: 'Travel & Events',  icon: 'map-pin',     badge: null },
];

/* ---------- 2. OFFLINE FALLBACK DATA (only used if a request fails) ---------- */
const SAMPLE = {
  movies: [
    { title: 'Avatar 3: Fire & Ash', sub: '2026', rating: '8.6', image: null, description: 'The next chapter of Pandora arrives.' },
    { title: 'Dune: Part Three', sub: '2026', rating: '8.4', image: null, description: 'Paul Atreides unites the Fremen.' },
  ],
  anime: [
    { title: 'One Piece', sub: '1000+ episodes · PG', rating: '8.7', image: null, description: 'Luffy and crew sail the Grand Line.' },
  ],
  music: [
    { title: 'Sitting On Top Of The World', sub: 'Burna Boy', image: null, preview: null, description: 'Afrobeats hit.' },
  ],
  gaming: [
    { title: 'Elden Ring: Shadow Realms', sub: 'PS5 / PC · Metacritic 94', image: null, description: 'Open-world action RPG.' },
  ],
  recipes: [
    { title: 'Chicken Pilau', sub: 'A comforting East African classic', image: null, description: 'Spiced rice with chicken.' },
  ],
  news: [
    { title: 'MegaHits Vibez is now live', sub: 'MegaHits Vibez', image: null, description: 'Thanks for trying the app.' },
  ],
  books: [
    { title: 'Things Fall Apart', sub: 'Chinua Achebe', image: null, description: 'A classic of African literature.' },
  ],
  travel: [
    { title: 'No events loaded', sub: '', image: null, description: 'Could not reach the events service.' },
  ],
};

/* ---------- 3. STATE ---------- */
const state = {
  kidsSafe: JSON.parse(localStorage.getItem('mhv-kids-safe') || 'false'),
  theme: localStorage.getItem('mhv-theme') || 'dark',
  lang: localStorage.getItem('mhv-lang') || 'en',
  currency: localStorage.getItem('mhv-currency') || 'USD',
  heroIndex: 0,
  heroTimer: null,
  audio: { playing: false },
  user: null,
  categoryItems: {}, // populated per-category with the *real* rendered items, for click handlers
};
state.audioEl = new Audio();

/* ---------- 4. FETCH HELPERS ---------- */
// Simple GET used for singular endpoints (hero, community links, config).
async function fetchJSON(path, fallback) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return fallback;
  }
}

// Category-grid fetch: distinguishes "request failed" from "request
// succeeded but returned zero results" so we never show fake data for a
// working-but-empty API.
async function fetchAPI(path) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) return { ok: false, data: null };
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: null };
  }
}

function getUserCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(DEFAULT_COORDS);
    const timer = setTimeout(() => resolve(DEFAULT_COORDS), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }); },
      () => { clearTimeout(timer); resolve(DEFAULT_COORDS); },
      { timeout: 3500 }
    );
  });
}

async function buildEndpoint(catId) {
  switch (catId) {
    case 'movies': return '/movies/trending';
    case 'anime': return '/anime/top';
    case 'music': return '/music/top50';
    case 'sports': return '/sports/live';
    case 'weather': { const { lat, lon } = await getUserCoords(); return `/weather?lat=${lat}&lon=${lon}`; }
    case 'finance': return '/finance/crypto';
    case 'recipes': return '/recipes?ingredients=chicken,rice,tomato,onion,garlic';
    case 'news': return '/news?category=general';
    case 'gaming': return '/gaming/new-releases';
    case 'books': return '/books?q=bestseller+fiction';
    case 'travel': { const { lat, lon } = await getUserCoords(); return `/travel?lat=${lat}&lon=${lon}&radius=100`; }
    default: return null;
  }
}

/* ---------- 5. NORMALIZERS — map each API's raw shape to a common display shape ---------- */
const NORMALIZERS = {
  movies: (raw) => ({
    title: raw.title || raw.name || 'Untitled',
    sub: `${(raw.release_date || '').slice(0, 4) || 'TBA'}${raw.vote_average ? ' · ' + raw.vote_average.toFixed(1) + ' \u2605' : ''}`,
    rating: raw.vote_average ? raw.vote_average.toFixed(1) : null,
    image: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null,
    description: raw.overview || 'No description available.',
  }),
  anime: (raw) => ({
    title: raw.title || raw.title_english || 'Untitled',
    sub: `${raw.episodes ?? '?'} episodes${raw.rating ? ' · ' + raw.rating.split(' ')[0] : ''}`,
    rating: raw.score ? raw.score.toFixed(1) : null,
    image: raw.images?.jpg?.image_url || null,
    description: raw.synopsis || 'No synopsis available.',
  }),
  music: (raw) => ({
    title: raw.title || 'Untitled',
    sub: raw.artist?.name || 'Unknown artist',
    image: raw.album?.cover_medium || raw.album?.cover || null,
    preview: raw.preview || null,
    description: `${raw.title || ''}${raw.album?.title ? ' — from ' + raw.album.title : ''}`,
  }),
  gaming: (raw) => ({
    title: raw.name || 'Untitled',
    sub: `${(raw.platforms || []).slice(0, 2).map((p) => p.platform?.name).filter(Boolean).join(', ') || 'Multi-platform'}${raw.metacritic ? ' · Metacritic ' + raw.metacritic : ''}`,
    rating: raw.metacritic ? String(raw.metacritic) : null,
    image: raw.background_image || null,
    description: `Released ${raw.released || 'TBA'}.${(raw.genres || []).length ? ' Genres: ' + raw.genres.map((g) => g.name).join(', ') + '.' : ''}`,
  }),
  recipes: (raw) => ({
    title: raw.title || 'Untitled recipe',
    sub: `Uses ${raw.usedIngredientCount ?? 0} of your ingredients${raw.missedIngredientCount ? `, needs ${raw.missedIngredientCount} more` : ''}`,
    image: raw.image || null,
    description: `You have ${raw.usedIngredientCount ?? 0} of the ingredients for this recipe; missing ${raw.missedIngredientCount ?? 0}.`,
  }),
  news: (raw) => ({
    title: raw.title || 'Untitled',
    sub: `${raw.author && raw.author !== 'null' ? raw.author : 'Unknown author'}${raw.published ? ' · ' + raw.published.slice(0, 10) : ''}`,
    image: raw.image && raw.image !== 'None' ? raw.image : null,
    description: raw.description || '',
    url: raw.url,
  }),
  books: (raw) => ({
    title: raw.volumeInfo?.title || 'Untitled',
    sub: (raw.volumeInfo?.authors || []).join(', ') || 'Unknown author',
    image: raw.volumeInfo?.imageLinks?.thumbnail || null,
    description: raw.volumeInfo?.description || 'No description available.',
    url: raw.volumeInfo?.infoLink,
  }),
  travel: (raw) => ({
    title: raw.name || 'Untitled event',
    sub: `${raw._embedded?.venues?.[0]?.city?.name || ''}${raw.dates?.start?.localDate ? ' · ' + raw.dates.start.localDate : ''}`,
    image: raw.images?.[0]?.url || null,
    description: raw.info || raw.pleaseNote || raw.name || '',
    url: raw.url,
  }),
};

function normalizeMatch(raw) {
  return {
    home: raw.teams?.home?.name || 'Home',
    away: raw.teams?.away?.name || 'Away',
    homeScore: raw.goals?.home ?? 0,
    awayScore: raw.goals?.away ?? 0,
    minute: raw.fixture?.status?.elapsed ? `${raw.fixture.status.elapsed}'` : (raw.fixture?.status?.short || ''),
    league: raw.league?.name || '',
    events: raw.events || [],
  };
}
function normalizeWeather(raw) {
  const c = raw?.current;
  if (!c) return null;
  return {
    temp: Math.round(c.main.temp),
    city: c.name,
    condition: c.weather?.[0]?.description || '',
    humidity: `${c.main.humidity}%`,
    wind: `${Math.round((c.wind?.speed || 0) * 3.6)} km/h`,
  };
}
function normalizeCoin(raw) {
  return {
    name: raw.name,
    symbol: (raw.symbol || '').toUpperCase(),
    image: raw.image,
    price: raw.current_price != null ? raw.current_price.toLocaleString(undefined, { maximumFractionDigits: raw.current_price < 1 ? 4 : 2 }) : '—',
    change: raw.price_change_percentage_24h != null ? +raw.price_change_percentage_24h.toFixed(2) : 0,
  };
}

/* ---------- 6. UI HELPERS ---------- */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
  toast.innerHTML = `<svg class="icon icon-sm" data-lucide="${iconName}"></svg><span>${message}</span>`;
  container.appendChild(toast);
  refreshIcons();
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 220);
  }, 3000);
}
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

/* ---------- 7. SIDEBAR + HAMBURGER MENU ---------- */
function buildSidebar() {
  const list = document.getElementById('sidebar-categories');
  list.innerHTML = CATEGORIES.map((c) => `
    <li>
      <a href="#/${c.id}" class="sidebar-link" data-category="${c.id}">
        <svg class="icon" data-lucide="${c.icon}"></svg>
        <span>${c.name}</span>
        ${c.badge ? `<span class="nav-badge ${c.badge === 'LIVE' ? 'live' : ''}">${c.badge}</span>` : ''}
      </a>
    </li>
  `).join('');

  list.querySelectorAll('.sidebar-link[data-category]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSidebar(false);
      const target = document.getElementById(`section-${link.dataset.category}`);
      setTimeout(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280);
    });
  });

  document.getElementById('nav-home').addEventListener('click', (e) => {
    e.preventDefault();
    toggleSidebar(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 280);
  });
}

function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('menu-toggle');
  const isOpen = open ?? !sidebar.classList.contains('active');
  sidebar.classList.toggle('active', isOpen);
  overlay.classList.toggle('active', isOpen);
  toggleBtn.setAttribute('aria-expanded', String(isOpen));
}

/* ---------- 8. HERO SLIDER — real trending movies + live match ---------- */
async function buildHero() {
  const el = document.getElementById('hero-slider');
  let slides = [];

  const { ok: moviesOk, data: movies } = await fetchAPI('/movies/trending');
  if (moviesOk && Array.isArray(movies) && movies.length) {
    movies.slice(0, 4).forEach((m) => {
      const bgImage = m.backdrop_path
        ? `url('https://image.tmdb.org/t/p/w1280${m.backdrop_path}') center/cover no-repeat, `
        : '';
      slides.push({
        title: m.title || m.name,
        badge: 'TRENDING NOW',
        desc: m.overview || '',
        bg: `${bgImage}linear-gradient(135deg, #1a1a20, #0d0d10)`,
        cta: 'Details',
        detail: { title: m.title || m.name, sub: (m.release_date || '').slice(0, 4), image: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null, description: m.overview || '' },
      });
    });
  }

  const { ok: sportsOk, data: live } = await fetchAPI('/sports/live');
  if (sportsOk && Array.isArray(live) && live.length) {
    const match = normalizeMatch(live[0]);
    slides.unshift({
      title: `${match.home} ${match.homeScore} – ${match.awayScore} ${match.away}`,
      badge: 'LIVE MATCH',
      live: true,
      desc: `${match.league} — minute ${match.minute || '—'}`,
      bg: 'linear-gradient(135deg, #1a1a20, #0d0d10)',
      cta: 'Live stats',
      detail: { title: `${match.home} vs ${match.away}`, sub: match.league, image: null, description: match.events.map((e) => `⚽ ${e.time?.elapsed}' — ${e.player?.name || 'Unknown'} (${e.team?.name || ''})`).join('\n') || 'No events yet.' },
    });
  }

  if (!slides.length) slides = [{ title: 'Welcome to MegaHits Vibez', badge: 'GETTING STARTED', desc: 'Content will appear here once the backend is reachable.', bg: 'linear-gradient(135deg, #1a1a20, #0d0d10)', cta: 'Details', detail: { title: 'MegaHits Vibez', description: 'Content will appear here once the backend is reachable.' } }];

  el.innerHTML = slides.map((h, i) => `
    <div class="hero-slide ${i === 0 ? 'active' : ''}" style="background:${h.bg}" data-index="${i}">
      <div class="hero-content">
        <span class="hero-badge ${h.live ? 'live' : ''}">${h.live ? '<span class="dot"></span>' : ''}${h.badge}</span>
        <h1 class="hero-title">${h.title}</h1>
        <p class="hero-desc">${h.desc}</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-hero-cta="${i}">
            <svg class="icon icon-sm" data-lucide="play"></svg> ${h.cta}
          </button>
          <button class="btn btn-ghost" data-hero-info="${i}">
            <svg class="icon icon-sm" data-lucide="info"></svg> Details
          </button>
        </div>
      </div>
    </div>
  `).join('') + `<div class="hero-dots">${slides.map((_, i) => `<span class="hero-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></span>`).join('')}</div>`;

  refreshIcons();
  el.querySelectorAll('[data-hero-info]').forEach((btn) => btn.addEventListener('click', () => showMediaDetail(slides[+btn.dataset.heroInfo].detail)));
  el.querySelectorAll('[data-hero-cta]').forEach((btn) => btn.addEventListener('click', () => showMediaDetail(slides[+btn.dataset.heroCta].detail)));
  el.querySelectorAll('[data-dot]').forEach((dot) => dot.addEventListener('click', () => goToSlide(+dot.dataset.dot)));
  el.addEventListener('mouseenter', stopHeroAutoplay);
  el.addEventListener('mouseleave', startHeroAutoplay);
  el.addEventListener('touchstart', stopHeroAutoplay, { passive: true });
  startHeroAutoplay();
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  slides.forEach((s) => s.classList.remove('active'));
  dots.forEach((d) => d.classList.remove('active'));
  slides[index]?.classList.add('active');
  dots[index]?.classList.add('active');
  state.heroIndex = index;
}
function startHeroAutoplay() {
  stopHeroAutoplay();
  const count = document.querySelectorAll('.hero-slide').length;
  if (count < 2) return;
  state.heroTimer = setInterval(() => goToSlide((state.heroIndex + 1) % count), 6000);
}
function stopHeroAutoplay() {
  if (state.heroTimer) clearInterval(state.heroTimer);
}

/* ---------- 9. CATEGORY GRID ---------- */
function emptyStateHTML(message) {
  return `<div class="card" style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:24px;">${message}</div>`;
}

function cardTemplate(cat, items) {
  if (cat.id === 'sports') {
    return items.map((m) => `
      <article class="card">
        <div class="score-row">
          <div class="score-team">${m.home}</div>
          <div class="score-value">${m.homeScore} – ${m.awayScore}</div>
          <div class="score-team">${m.away}</div>
        </div>
        <div class="score-minute">${m.league}${m.minute ? ' · LIVE ' + m.minute : ''}</div>
        <div class="card-actions" style="margin-top:10px;">
          <button class="chip-btn live-stats-btn"><svg class="icon icon-sm" data-lucide="bar-chart-2"></svg> Live stats</button>
        </div>
      </article>
    `).join('');
  }
  if (cat.id === 'weather') {
    const w = items;
    return `
      <article class="card">
        <div class="weather-temp">${w.temp}°C</div>
        <div class="card-sub">${w.city} · ${w.condition}</div>
        <div class="weather-meta">
          <span><svg class="icon icon-sm" data-lucide="droplets"></svg> ${w.humidity}</span>
          <span><svg class="icon icon-sm" data-lucide="wind"></svg> ${w.wind}</span>
        </div>
      </article>
    `;
  }
  if (cat.id === 'finance') {
    return items.map((c) => `
      <article class="card">
        <div class="crypto-row">
          <div style="display:flex; align-items:center; gap:8px;">
            ${c.image ? `<img src="${c.image}" alt="" style="width:28px;height:28px;border-radius:50%;" />` : ''}
            <div>
              <div class="card-title">${c.name}</div>
              <div class="card-sub">${c.symbol}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="crypto-price">$${c.price}</div>
            <div class="crypto-change ${c.change >= 0 ? 'up' : 'down'}">${c.change >= 0 ? '▲' : '▼'} ${Math.abs(c.change)}%</div>
          </div>
        </div>
      </article>
    `).join('');
  }
  // Generic poster-style card (movies, anime, music, recipes, news, gaming, books, travel)
  return items.map((m) => `
    <article class="card">
      <div class="card-media" style="${m.image ? '' : 'display:flex;align-items:center;justify-content:center;'}">
        ${m.image ? `<img src="${m.image}" alt="${m.title}" loading="lazy" />` : `<svg class="icon icon-lg" data-lucide="${cat.icon}" style="color:var(--text-muted);"></svg>`}
        ${m.rating ? `<span class="rating-badge"><svg class="icon" data-lucide="star"></svg>${m.rating}</span>` : ''}
      </div>
      <div class="card-title">${m.title}</div>
      <div class="card-sub">${m.sub || ''}</div>
      <div class="card-actions">
        <button class="chip-btn primary card-play-btn">
          <svg class="icon icon-sm" data-lucide="${cat.id === 'music' ? 'play' : 'play-circle'}"></svg>
          ${cat.id === 'music' ? 'Play' : cat.id === 'recipes' ? 'Cook now' : cat.id === 'books' ? 'Read' : cat.id === 'news' ? 'Read' : cat.id === 'travel' ? 'Explore' : 'Watch'}
        </button>
        <button class="chip-btn card-info-btn"><svg class="icon icon-sm" data-lucide="info"></svg></button>
      </div>
    </article>
  `).join('');
}

async function buildCategoryGrid() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = CATEGORIES.map((c) => `
    <section class="card" style="grid-column: 1 / -1; padding:16px;" id="section-${c.id}">
      <div class="section-heading" style="margin-bottom:12px;">
        <h3 class="section-title" style="font-size:1rem;">
          <svg class="icon" data-lucide="${c.icon}"></svg> ${c.name}
          ${c.badge ? `<span class="nav-badge ${c.badge === 'LIVE' ? 'live' : ''}" style="margin-left:6px;">${c.badge}</span>` : ''}
        </h3>
      </div>
      <div class="grid" id="grid-${c.id}"><div class="card-sub">Loading…</div></div>
    </section>
  `).join('');
  refreshIcons();

  for (const cat of CATEGORIES) {
    if (state.kidsSafe && cat.id !== 'anime') {
      document.getElementById(`section-${cat.id}`).style.display = 'none';
      continue;
    }
    document.getElementById(`section-${cat.id}`).style.display = '';

    const endpoint = await buildEndpoint(cat.id);
    const container = document.getElementById(`grid-${cat.id}`);
    const { ok, data } = await fetchAPI(endpoint);

    if (cat.id === 'weather') {
      const w = ok ? normalizeWeather(data) : null;
      container.innerHTML = w ? cardTemplate(cat, w) : emptyStateHTML('Weather is unavailable right now — check your OPENWEATHER_API_KEY.');
      refreshIcons();
      continue;
    }

    if (cat.id === 'sports') {
      const matches = ok && Array.isArray(data) ? data.map(normalizeMatch) : null;
      if (!matches) { container.innerHTML = emptyStateHTML('Could not load live sports right now.'); continue; }
      if (!matches.length) { container.innerHTML = emptyStateHTML('No live matches at the moment — check back soon.'); continue; }
      container.innerHTML = cardTemplate(cat, matches);
      refreshIcons();
      container.querySelectorAll('.live-stats-btn').forEach((btn, i) => {
        btn.addEventListener('click', () => showMediaDetail({
          title: `${matches[i].home} vs ${matches[i].away}`,
          sub: `${matches[i].league} · ${matches[i].homeScore}-${matches[i].awayScore}`,
          description: matches[i].events.length
            ? matches[i].events.map((e) => `⚽ ${e.time?.elapsed}' — ${e.player?.name || 'Unknown'} (${e.team?.name || ''})`).join('\n')
            : 'No goal events yet.',
        }));
      });
      continue;
    }

    if (cat.id === 'finance') {
      const coins = ok && Array.isArray(data) ? data.map(normalizeCoin) : null;
      if (!coins) { container.innerHTML = emptyStateHTML('Could not load crypto prices right now.'); continue; }
      container.innerHTML = cardTemplate(cat, coins.slice(0, 8));
      refreshIcons();
      continue;
    }

    // Generic poster categories
    const normalizer = NORMALIZERS[cat.id];
    let items = null;
    if (ok && Array.isArray(data)) items = data.map(normalizer);
    else if (ok && data?.items && Array.isArray(data.items)) items = data.items.map(normalizer);

    if (items === null) {
      // request failed outright — offline fallback
      items = SAMPLE[cat.id] || [];
      if (items.length) container.innerHTML = cardTemplate(cat, items);
      else container.innerHTML = emptyStateHTML('Could not load this section right now.');
    } else if (!items.length) {
      container.innerHTML = emptyStateHTML('No results found right now — check back soon.');
    } else {
      container.innerHTML = cardTemplate(cat, items);
    }

    refreshIcons();
    state.categoryItems[cat.id] = items;

    const playButtons = container.querySelectorAll('.card-play-btn');
    const infoButtons = container.querySelectorAll('.card-info-btn');
    playButtons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const item = state.categoryItems[cat.id][i];
        if (cat.id === 'music') playTrack(item);
        else if (item.url) window.open(item.url, '_blank', 'noopener');
        else showMediaDetail(item);
      });
    });
    infoButtons.forEach((btn, i) => {
      btn.addEventListener('click', () => showMediaDetail(state.categoryItems[cat.id][i]));
    });
  }
}

/* ---------- 10. MEDIA DETAIL MODAL ---------- */
function showMediaDetail(item) {
  if (!item) return;
  document.getElementById('media-modal-title').textContent = item.title || 'Details';
  const img = item.image ? `<img src="${item.image}" alt="${item.title || ''}" style="width:100%;border-radius:var(--radius-md);margin-bottom:16px;max-height:320px;object-fit:cover;" />` : '';
  const link = item.url ? `<a href="${item.url}" target="_blank" rel="noopener" class="btn btn-primary" style="margin-top:14px;"><svg class="icon icon-sm" data-lucide="external-link"></svg> Open</a>` : '';
  document.getElementById('media-modal-body').innerHTML = `
    ${img}
    ${item.sub ? `<div class="card-sub" style="margin-bottom:10px;">${item.sub}</div>` : ''}
    <p style="color:var(--text-secondary); font-size:0.9rem; line-height:1.6; white-space:pre-line;">${item.description || 'No further details available.'}</p>
    ${link}
  `;
  refreshIcons();
  openModal('media-modal');
}

/* ---------- 11. DRAGGABLE FLOATING AUDIO PLAYER — real Deezer preview playback ---------- */
function playTrack(track) {
  if (!track?.preview) { showToast('No audio preview available for this track.', 'error'); return; }
  const player = document.getElementById('audio-player');
  document.getElementById('player-track').textContent = track.title;
  document.getElementById('player-artist').textContent = track.sub;
  document.getElementById('player-cover').src = track.image || '';
  document.getElementById('bubble-cover').src = track.image || '';

  state.audioEl.src = track.preview;
  state.audioEl.play().catch(() => showToast('Playback was blocked — tap play again.', 'error'));

  player.classList.remove('hidden');
  player.classList.add('playing');
  state.audio.playing = true;
  document.querySelector('#player-play-btn svg').setAttribute('data-lucide', 'pause');
  refreshIcons();
  showToast(`Now playing "${track.title}"`, 'success');
}

function initAudioPlayer() {
  const player = document.getElementById('audio-player');
  const handle = document.getElementById('drag-handle');
  const playBtn = document.getElementById('player-play-btn');
  const minimizeBtn = document.getElementById('player-minimize');
  const closeBtn = document.getElementById('player-close');
  const bubble = document.getElementById('audio-bubble');

  state.audioEl.addEventListener('timeupdate', () => {
    const pct = state.audioEl.duration ? (state.audioEl.currentTime / state.audioEl.duration) * 100 : 0;
    const fill = document.getElementById('player-progress-fill');
    if (fill) fill.style.width = `${pct}%`;
  });
  state.audioEl.addEventListener('ended', () => {
    state.audio.playing = false;
    player.classList.remove('playing');
    document.querySelector('#player-play-btn svg')?.setAttribute('data-lucide', 'play');
    refreshIcons();
  });

  playBtn.addEventListener('click', () => {
    if (!state.audioEl.src) return;
    if (state.audioEl.paused) { state.audioEl.play(); state.audio.playing = true; }
    else { state.audioEl.pause(); state.audio.playing = false; }
    player.classList.toggle('playing', state.audio.playing);
    document.querySelector('#player-play-btn svg').setAttribute('data-lucide', state.audio.playing ? 'pause' : 'play');
    refreshIcons();
  });

  minimizeBtn.addEventListener('click', () => { player.classList.add('hidden'); bubble.classList.add('active'); });
  bubble.addEventListener('click', () => { bubble.classList.remove('active'); player.classList.remove('hidden'); });
  closeBtn.addEventListener('click', () => {
    state.audioEl.pause();
    state.audioEl.src = '';
    player.classList.add('hidden');
    bubble.classList.remove('active');
    state.audio.playing = false;
  });

  // Drag logic — mouse + touch, snap to nearest edge on release
  let dragging = false;
  let startX = 0, startY = 0, originX = 0, originY = 0;
  function onDown(x, y) {
    dragging = true; startX = x; startY = y;
    const rect = player.getBoundingClientRect();
    originX = rect.left; originY = rect.top;
    player.classList.add('dragging');
  }
  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - startX, dy = y - startY;
    const newLeft = Math.min(Math.max(originX + dx, 8), window.innerWidth - player.offsetWidth - 8);
    const newTop = Math.min(Math.max(originY + dy, 8), window.innerHeight - player.offsetHeight - 8);
    player.style.left = `${newLeft}px`; player.style.top = `${newTop}px`;
    player.style.right = 'auto'; player.style.bottom = 'auto';
  }
  function onUp() {
    if (!dragging) return;
    dragging = false; player.classList.remove('dragging');
    const rect = player.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const snapLeft = center < window.innerWidth / 2 ? 12 : window.innerWidth - rect.width - 12;
    player.style.transition = 'left 0.3s var(--ease)';
    player.style.left = `${snapLeft}px`;
    setTimeout(() => { player.style.transition = ''; }, 300);
  }
  handle.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onUp);
  handle.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  window.addEventListener('touchmove', (e) => { if (dragging) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener('touchend', onUp);
}

/* ---------- 12. SEARCH ---------- */
function buildSearchResultsHTML(q) {
  const matches = [];
  CATEGORIES.forEach((cat) => {
    const items = state.categoryItems[cat.id];
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      if ((item.title || '').toLowerCase().includes(q)) matches.push({ cat, item });
    });
  });
  return matches.length
    ? matches.slice(0, 8).map((m) => `
        <div class="search-result-item" data-search-cat="${m.cat.id}" data-search-idx="${state.categoryItems[m.cat.id].indexOf(m.item)}">
          <svg class="icon icon-sm" data-lucide="${m.cat.icon}"></svg>
          <div>
            <div>${m.item.title}</div>
            <div class="search-result-category">${m.cat.name}</div>
          </div>
        </div>
      `).join('')
    : `<div class="search-result-item">No results for "${q}" yet — try after the page finishes loading.</div>`;
}
function wireSearchResultClicks(container) {
  container.querySelectorAll('[data-search-cat]').forEach((el) => {
    el.addEventListener('click', () => {
      const item = state.categoryItems[el.dataset.searchCat]?.[+el.dataset.searchIdx];
      if (item) showMediaDetail(item);
    });
  });
}
function attachSearchField(input, results, { overlayToggle } = {}) {
  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; if (overlayToggle) results.classList.remove('active'); return; }
    debounceTimer = setTimeout(() => {
      results.innerHTML = buildSearchResultsHTML(q);
      if (overlayToggle) results.classList.add('active');
      refreshIcons();
      wireSearchResultClicks(results);
    }, 300);
  });
}
function initSearch() {
  const desktopInput = document.getElementById('search-input');
  const desktopResults = document.getElementById('search-results');
  attachSearchField(desktopInput, desktopResults, { overlayToggle: true });
  document.addEventListener('click', (e) => {
    if (!desktopResults.contains(e.target) && e.target !== desktopInput) desktopResults.classList.remove('active');
  });

  const mobileInput = document.getElementById('search-input-mobile');
  const mobileResults = document.getElementById('search-results-mobile');
  attachSearchField(mobileInput, mobileResults, { overlayToggle: false });

  document.getElementById('search-toggle-btn').addEventListener('click', () => {
    openModal('search-modal');
    mobileInput.value = ''; mobileResults.innerHTML = '';
    setTimeout(() => mobileInput.focus(), 150);
  });
}

/* ---------- 13. SETTINGS MODAL (theme / language / currency) ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}
function initSettings() {
  document.getElementById('settings-toggle').addEventListener('click', () => openModal('settings-modal'));
  document.getElementById('nav-settings').addEventListener('click', (e) => { e.preventDefault(); toggleSidebar(false); openModal('settings-modal'); });

  document.querySelectorAll('#theme-options .option-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#theme-options .option-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.theme = btn.dataset.theme;
      localStorage.setItem('mhv-theme', state.theme);
      applyTheme(state.theme);
    });
  });

  const langSelect = document.getElementById('lang-select');
  langSelect.value = state.lang;
  langSelect.addEventListener('change', () => { state.lang = langSelect.value; localStorage.setItem('mhv-lang', state.lang); });

  const currencySelect = document.getElementById('currency-select');
  currencySelect.value = state.currency;
  currencySelect.addEventListener('change', () => { state.currency = currencySelect.value; localStorage.setItem('mhv-currency', state.currency); });
}

/* ---------- 14. KIDS SAFE MODE ---------- */
function initKidsSafe() {
  const toggle = document.getElementById('kids-toggle');
  toggle.classList.toggle('on', state.kidsSafe);
  toggle.setAttribute('aria-checked', String(state.kidsSafe));
  toggle.addEventListener('click', () => {
    state.kidsSafe = !state.kidsSafe;
    localStorage.setItem('mhv-kids-safe', JSON.stringify(state.kidsSafe));
    toggle.classList.toggle('on', state.kidsSafe);
    toggle.setAttribute('aria-checked', String(state.kidsSafe));
    showToast(state.kidsSafe ? 'Kids Safe Mode turned on' : 'Kids Safe Mode turned off', 'success');
    buildCategoryGrid();
  });
}

/* ---------- 15. JOIN US DRAWER — icon-only social grid ---------- */
const SOCIAL_ICONS = {
  whatsapp: 'message-circle',
  telegram: 'send',
  youtube: 'youtube',
  instagram: 'instagram',
  tiktok: 'music-2',
  facebook: 'facebook',
};
async function initJoinUs() {
  document.getElementById('nav-join').addEventListener('click', async (e) => {
    e.preventDefault();
    toggleSidebar(false);
    const links = await fetchJSON('/community/links', {});
    document.getElementById('social-grid').innerHTML = Object.entries(SOCIAL_ICONS)
      .filter(([key]) => links[key])
      .map(([key, icon]) => `
        <a href="${links[key]}" target="_blank" rel="noopener" class="social-icon-link" aria-label="${key}">
          <svg class="icon" data-lucide="${icon}"></svg>
        </a>
      `).join('') || `<div class="card-sub">No social links configured yet.</div>`;
    refreshIcons();
    openModal('join-modal');
  });

  document.getElementById('feedback-submit').addEventListener('click', () => {
    const val = document.getElementById('feedback-input').value.trim();
    if (!val) { showToast('Write something before sending', 'error'); return; }
    document.getElementById('feedback-input').value = '';
    closeModal('join-modal');
    showToast('Thanks for your feedback!', 'success');
  });
}

async function initFooterSocial() {
  const links = await fetchJSON('/community/links', {});
  document.getElementById('footer-social').innerHTML = Object.entries(SOCIAL_ICONS)
    .filter(([key]) => links[key])
    .map(([key, icon]) => `
      <a href="${links[key]}" target="_blank" rel="noopener" aria-label="${key}">
        <svg class="icon icon-sm" data-lucide="${icon}"></svg>
      </a>
    `).join('');
  refreshIcons();
}

/* ---------- 16. GOOGLE SIGN-IN (real, via Google Identity Services) ---------- */
let googleReady = false;
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))));
  } catch { return null; }
}
function renderSignedInState() {
  const btn = document.getElementById('signin-btn');
  if (state.user) {
    btn.innerHTML = `<img class="avatar" src="${state.user.picture}" alt="${state.user.name}" />`;
  } else {
    btn.innerHTML = `<svg class="icon icon-sm" data-lucide="log-in"></svg><span>Sign in</span>`;
    refreshIcons();
  }
}
function handleGoogleCredential(response) {
  const payload = decodeJwt(response.credential);
  if (!payload) return;
  state.user = { name: payload.name, picture: payload.picture, email: payload.email };
  localStorage.setItem('mhv-user', JSON.stringify(state.user));
  renderSignedInState();
  showToast(`Welcome, ${payload.given_name || payload.name}!`, 'success');
}
async function initGoogleSignIn() {
  const config = await fetchJSON('/config', null);
  const clientId = config?.googleClientId;
  if (!clientId) return; // sign-in stays inactive until a client ID is configured on the backend
  try {
    await loadScript('https://accounts.google.com/gsi/client');
    window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential, auto_select: false });
    googleReady = true;
  } catch (e) { /* script blocked or offline — sign-in button will show a helpful toast instead */ }
}
function initSignIn() {
  const stored = localStorage.getItem('mhv-user');
  if (stored) { try { state.user = JSON.parse(stored); } catch { /* ignore */ } }
  renderSignedInState();
  initGoogleSignIn();

  document.getElementById('signin-btn').addEventListener('click', () => {
    if (state.user) {
      state.user = null;
      localStorage.removeItem('mhv-user');
      renderSignedInState();
      showToast('Signed out', 'info');
      if (googleReady) window.google.accounts.id.disableAutoSelect();
      return;
    }
    if (googleReady) window.google.accounts.id.prompt();
    else showToast("Sign-in isn't configured on this deployment yet.", 'error');
  });
}

/* ---------- 17. MODAL CLOSE WIRING ---------- */
function initModalClosers() {
  document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach((m) => closeModal(m.id)); });
}

/* ---------- 18. SCROLL-TO-TOP ---------- */
function initScrollTop() {
  const btn = document.getElementById('scroll-top-btn');
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- 19. PWA INSTALL PROMPT ---------- */
function initPWA() {
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    document.getElementById('install-banner').classList.add('active');
  });
  document.getElementById('install-btn').addEventListener('click', async () => {
    document.getElementById('install-banner').classList.remove('active');
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
  });
  document.getElementById('install-dismiss').addEventListener('click', () => document.getElementById('install-banner').classList.remove('active'));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    let hasReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloaded) return;
      hasReloaded = true;
      window.location.reload();
    });
  }
}

/* ---------- 20. INIT ---------- */
function init() {
  applyTheme(state.theme);
  document.getElementById('theme-options').querySelectorAll('.option-btn').forEach((b) => b.classList.toggle('selected', b.dataset.theme === state.theme));

  document.getElementById('menu-toggle').addEventListener('click', () => toggleSidebar());
  document.getElementById('sidebar-overlay').addEventListener('click', () => toggleSidebar(false));

  buildSidebar();
  buildHero();
  buildCategoryGrid();
  initAudioPlayer();
  initSearch();
  initSettings();
  initKidsSafe();
  initJoinUs();
  initFooterSocial();
  initSignIn();
  initModalClosers();
  initScrollTop();
  initPWA();

  refreshIcons();
}

document.addEventListener('DOMContentLoaded', init);
