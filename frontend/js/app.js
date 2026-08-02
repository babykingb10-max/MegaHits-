/* ============================================================
   MEGAHITS VIBEZ — APP.JS
   Vanilla ES6+, zero external UI frameworks. Talks to the Express
   proxy in /backend. Hash-based router: "#/" = home (lite previews),
   "#/{category}" = full category page. Falls back to bundled sample
   data ONLY when a request truly fails — a successful-but-empty
   response shows an honest "no results" state instead of fake data.
   ============================================================ */

const API_BASE = window.MEGAHITS_API_BASE || '/api';
const DEFAULT_COORDS = { lat: -6.7924, lon: 39.2083 }; // Dar es Salaam fallback

function refreshIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch (e) { /* non-fatal */ }
  }
}
function loadingHTML(message = 'Loading…') {
  return `<div class="loading-inline"><span class="spinner-sm"></span> ${message}</div>`;
}
function extractArray(catId, data) {
  if (Array.isArray(data)) return data;
  if (catId === 'travel' && Array.isArray(data?.events)) return data.events;
  return null;
}
function hidePreloader() {
  const el = document.getElementById('preloader');
  if (el) el.classList.add('hidden');
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
const LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78, name: 'Bundesliga' },
  { id: 61, name: 'Ligue 1' },
  { id: 2, name: 'Champions League' },
];
const NEWS_CATEGORIES = ['general', 'technology', 'business', 'sports', 'entertainment', 'science'];

/* ---------- 2. OFFLINE FALLBACK DATA (only used if a request fails) ---------- */
const SAMPLE = {
  movies: [{ title: 'Avatar 3: Fire & Ash', sub: '2026', rating: '8.6', image: null, description: 'The next chapter of Pandora arrives.' }],
  anime: [{ title: 'One Piece', sub: '1000+ episodes · PG', rating: '8.7', image: null, description: 'Luffy and crew sail the Grand Line.' }],
  music: [{ title: 'Sitting On Top Of The World', sub: 'Burna Boy', image: null, preview: null, description: 'Afrobeats hit.' }],
  gaming: [{ title: 'Elden Ring: Shadow Realms', sub: 'PS5 / PC · Metacritic 94', image: null, description: 'Open-world action RPG.' }],
  recipes: [{ title: 'Chicken Pilau', sub: 'A comforting East African classic', image: null, description: 'Spiced rice with chicken.' }],
  news: [{ title: 'MegaHits Vibez is now live', sub: 'MegaHits Vibez', image: null, description: 'Thanks for trying the app.' }],
  books: [{ title: 'Things Fall Apart', sub: 'Chinua Achebe', image: null, description: 'A classic of African literature.' }],
  travel: [{ title: 'No events loaded', sub: '', image: null, description: 'Could not reach the events service.' }],
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
  categoryItems: {}, // full normalized arrays per category, used by both home preview and category pages
  currentCoords: null,
};
state.audioEl = new Audio();

/* ---------- 4. FETCH HELPERS ---------- */
async function fetchJSON(path, fallback) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return fallback;
  }
}
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
  if (state.currentCoords) return Promise.resolve(state.currentCoords);
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

/* ---------- 5. NORMALIZERS ---------- */
const NORMALIZERS = {
  movies: (raw) => ({
    id: raw.id,
    title: raw.title || raw.name || 'Untitled',
    sub: `${(raw.release_date || raw.first_air_date || '').slice(0, 4) || 'TBA'}${raw.vote_average ? ' · ' + raw.vote_average.toFixed(1) + ' \u2605' : ''}`,
    rating: raw.vote_average ? raw.vote_average.toFixed(1) : null,
    image: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null,
    description: raw.overview || 'No description available.',
    isMovie: true,
  }),
  anime: (raw) => ({
    id: raw.mal_id || null,
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
    id: raw.id || null,
    title: raw.name || 'Untitled',
    sub: `${(raw.platforms || []).slice(0, 2).map((p) => p.platform?.name).filter(Boolean).join(', ') || 'Multi-platform'}${raw.metacritic ? ' · Metacritic ' + raw.metacritic : ''}`,
    rating: raw.metacritic ? String(raw.metacritic) : null,
    image: raw.background_image || null,
    description: `Released ${raw.released || 'TBA'}.${(raw.genres || []).length ? ' Genres: ' + raw.genres.map((g) => g.name).join(', ') + '.' : ''}`,
  }),
  recipes: (raw) => ({
    id: raw.id,
    title: raw.title || 'Untitled recipe',
    sub: `Uses ${raw.usedIngredientCount ?? 0} of your ingredients${raw.missedIngredientCount ? `, needs ${raw.missedIngredientCount} more` : ''}`,
    image: raw.image || null,
    description: `You have ${raw.usedIngredientCount ?? 0} of the ingredients for this recipe; missing ${raw.missedIngredientCount ?? 0}.`,
    isRecipe: true,
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
    feelsLike: Math.round(c.main.feels_like),
    city: c.name,
    country: c.sys?.country || '',
    condition: c.weather?.[0]?.description || '',
    humidity: `${c.main.humidity}%`,
    wind: `${Math.round((c.wind?.speed || 0) * 3.6)} km/h`,
    forecast: raw.forecast,
  };
}
function normalizeCoin(raw) {
  return {
    name: raw.name,
    symbol: (raw.symbol || '').toUpperCase(),
    image: raw.image,
    price: raw.current_price != null ? raw.current_price.toLocaleString(undefined, { maximumFractionDigits: raw.current_price < 1 ? 4 : 2 }) : '—',
    priceRaw: raw.current_price,
    change: raw.price_change_percentage_24h != null ? +raw.price_change_percentage_24h.toFixed(2) : 0,
  };
}
function dailyForecast(forecastRaw) {
  if (!forecastRaw?.list) return [];
  const byDay = {};
  forecastRaw.list.forEach((entry) => {
    const day = entry.dt_txt.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(entry);
  });
  return Object.entries(byDay).slice(0, 5).map(([day, entries]) => {
    const midday = entries.find((e) => e.dt_txt.includes('12:00')) || entries[Math.floor(entries.length / 2)];
    return {
      label: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
      temp: Math.round(midday.main.temp),
      icon: midday.weather?.[0]?.main || '',
    };
  });
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
  setTimeout(() => { toast.classList.add('leaving'); setTimeout(() => toast.remove(), 220); }, 3000);
}
function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }

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
    link.addEventListener('click', () => toggleSidebar(false));
  });
  document.getElementById('nav-home').addEventListener('click', () => toggleSidebar(false));
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

/* ---------- 8. ROUTER ---------- */
function router() {
  const hash = location.hash.replace('#/', '').replace('#', '');
  const cat = CATEGORIES.find((c) => c.id === hash);
  document.querySelectorAll('.sidebar-link[data-category]').forEach((l) => l.classList.toggle('active', l.dataset.category === hash));
  window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  const hero = document.getElementById('hero-slider');
  if (cat) {
    hero.style.display = 'none';
    stopHeroAutoplay();
    document.getElementById('view-home').style.display = 'none';
    document.getElementById('view-category').style.display = '';
    renderCategoryPage(cat);
  } else {
    hero.style.display = '';
    startHeroAutoplay();
    document.getElementById('view-category').style.display = 'none';
    document.getElementById('view-home').style.display = '';
  }
}

/* ---------- 9. HERO SLIDER — rotating pool across categories ---------- */
async function buildHero() {
  const el = document.getElementById('hero-slider');
  let pool = [];

  const { ok: sportsOk, data: live } = await fetchAPI('/sports/live');
  let liveSlide = null;
  if (sportsOk && Array.isArray(live) && live.length) {
    const match = normalizeMatch(live[0]);
    liveSlide = {
      title: `${match.home} ${match.homeScore} – ${match.awayScore} ${match.away}`,
      badge: 'LIVE MATCH', live: true,
      desc: `${match.league} — minute ${match.minute || '—'}`,
      bg: 'linear-gradient(135deg, #1a1a20, #0d0d10)', cta: 'Live stats',
      detail: { title: `${match.home} vs ${match.away}`, sub: match.league, description: match.events.map((e) => `⚽ ${e.time?.elapsed}' — ${e.player?.name || 'Unknown'} (${e.team?.name || ''})`).join('\n') || 'No events yet.' },
      link: '#/sports',
    };
  }

  const { ok: moviesOk, data: movies } = await fetchAPI('/movies/trending');
  if (moviesOk && Array.isArray(movies) && movies.length) {
    movies.slice(0, 3).forEach((m) => pool.push({
      title: m.title, badge: 'TRENDING MOVIE',
      desc: m.overview || '',
      bg: m.backdrop_path ? `url('https://image.tmdb.org/t/p/w1280${m.backdrop_path}') center/cover no-repeat, linear-gradient(135deg, #1a1a20, #0d0d10)` : 'linear-gradient(135deg, #1a1a20, #0d0d10)',
      cta: 'Details',
      detail: { title: m.title, sub: (m.release_date || '').slice(0, 4), image: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null, description: m.overview || '' },
      link: '#/movies',
    }));
  }
  const { ok: gamingOk, data: games } = await fetchAPI('/gaming/new-releases');
  if (gamingOk && Array.isArray(games) && games.length) {
    const g = games[0];
    pool.push({
      title: g.name, badge: 'NEW GAME RELEASE', desc: `Released ${g.released || 'recently'}.`,
      bg: g.background_image ? `url('${g.background_image}') center/cover no-repeat, linear-gradient(135deg, #1a1a20, #0d0d10)` : 'linear-gradient(135deg, #1a1a20, #0d0d10)',
      cta: 'Details',
      detail: { title: g.name, image: g.background_image, description: `Released ${g.released || 'TBA'}.` },
      link: '#/gaming',
    });
  }
  const { ok: newsOk, data: news } = await fetchAPI('/news?category=general');
  if (newsOk && Array.isArray(news) && news.length) {
    const n = news[0];
    pool.push({
      title: n.title, badge: 'BREAKING NEWS', desc: n.description || '',
      bg: n.image && n.image !== 'None' ? `url('${n.image}') center/cover no-repeat, linear-gradient(135deg, #1a1a20, #0d0d10)` : 'linear-gradient(135deg, #1a1a20, #0d0d10)',
      cta: 'Read', detail: { title: n.title, description: n.description || '', url: n.url },
      link: '#/news',
    });
  }

  // shuffle the non-live pool and take up to 3, live match always first if present
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }
  let slides = [...(liveSlide ? [liveSlide] : []), ...pool.slice(0, 3)];
  if (!slides.length) slides = [{ title: 'Welcome to MegaHits Vibez', badge: 'GETTING STARTED', desc: 'Content will appear here once the backend is reachable.', bg: 'linear-gradient(135deg, #1a1a20, #0d0d10)', cta: 'Details', detail: { title: 'MegaHits Vibez', description: 'Content will appear here once the backend is reachable.' } }];

  el.innerHTML = slides.map((h, i) => `
    <div class="hero-slide ${i === 0 ? 'active' : ''}" style="background:${h.bg}" data-index="${i}">
      <div class="hero-content">
        <span class="hero-badge ${h.live ? 'live' : ''}">${h.live ? '<span class="dot"></span>' : ''}${h.badge}</span>
        <h1 class="hero-title">${h.title}</h1>
        <p class="hero-desc">${h.desc}</p>
        <div class="hero-actions">
          <button class="btn btn-primary" data-hero-cta="${i}"><svg class="icon icon-sm" data-lucide="play"></svg> ${h.cta}</button>
          ${h.link ? `<a href="${h.link}" class="btn btn-ghost"><svg class="icon icon-sm" data-lucide="layout-grid"></svg> View category</a>` : ''}
        </div>
      </div>
    </div>
  `).join('') + `<div class="hero-dots">${slides.map((_, i) => `<span class="hero-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></span>`).join('')}</div>`;

  refreshIcons();
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
  slides[index]?.classList.add('active'); dots[index]?.classList.add('active');
  state.heroIndex = index;
}
function startHeroAutoplay() {
  stopHeroAutoplay();
  const count = document.querySelectorAll('.hero-slide').length;
  if (count < 2) return;
  state.heroTimer = setInterval(() => goToSlide((state.heroIndex + 1) % count), 6000);
}
function stopHeroAutoplay() { if (state.heroTimer) clearInterval(state.heroTimer); }

/* ---------- 10. SHARED CARD TEMPLATE ---------- */
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
        <div class="card-actions" style="margin-top:10px;"><button class="chip-btn live-stats-btn"><svg class="icon icon-sm" data-lucide="bar-chart-2"></svg> Live stats</button></div>
      </article>
    `).join('');
  }
  if (cat.id === 'finance') {
    return items.map((c) => `
      <article class="card">
        <div class="crypto-row">
          <div style="display:flex; align-items:center; gap:8px;">
            ${c.image ? `<img src="${c.image}" alt="" style="width:28px;height:28px;border-radius:50%;" />` : ''}
            <div><div class="card-title">${c.name}</div><div class="card-sub">${c.symbol}</div></div>
          </div>
          <div style="text-align:right;">
            <div class="crypto-price">$${c.price}</div>
            <div class="crypto-change ${c.change >= 0 ? 'up' : 'down'}">${c.change >= 0 ? '▲' : '▼'} ${Math.abs(c.change)}%</div>
          </div>
        </div>
      </article>
    `).join('');
  }
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
          <svg class="icon icon-sm" data-lucide="${cat.id === 'music' ? 'play' : m.isMovie ? 'clapperboard' : 'play-circle'}"></svg>
          ${cat.id === 'music' ? 'Play' : cat.id === 'recipes' ? 'Steps' : cat.id === 'books' ? 'Read' : cat.id === 'news' ? 'Read' : cat.id === 'travel' ? 'Explore' : m.isMovie ? 'Trailer' : 'Watch'}
        </button>
        <button class="chip-btn card-info-btn"><svg class="icon icon-sm" data-lucide="info"></svg></button>
      </div>
    </article>
  `).join('');
}
function wireGenericCardButtons(container, cat, items) {
  container.querySelectorAll('.card-play-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const item = items[i];
      if (cat.id === 'music') playTrack(item);
      else if (cat.id === 'movies' && item.id) openTrailer(item);
      else if (cat.id === 'anime') openAnimeTrailer(item);
      else if (cat.id === 'gaming') openGameTrailer(item);
      else if (cat.id === 'recipes' && item.id) openRecipeDetail(item);
      else if (item.url) window.open(item.url, '_blank', 'noopener');
      else showMediaDetail(item);
    });
  });
  container.querySelectorAll('.card-info-btn').forEach((btn, i) => btn.addEventListener('click', () => showMediaDetail(items[i])));
}

/* ---------- 11. HOME VIEW (lite previews) ---------- */
async function buildHomePreview() {
  const container = document.getElementById('home-preview-container');
  container.innerHTML = CATEGORIES.map((c) => `
    <div style="margin-bottom:28px;">
      <div class="preview-row-header">
        <h3 class="section-title" style="font-size:1rem;">
          <svg class="icon" data-lucide="${c.icon}"></svg> ${c.name}
          ${c.badge ? `<span class="nav-badge ${c.badge === 'LIVE' ? 'live' : ''}" style="margin-left:6px;">${c.badge}</span>` : ''}
        </h3>
        <a href="#/${c.id}" class="view-all-link">View all <svg class="icon icon-sm" data-lucide="chevron-right"></svg></a>
      </div>
      <div class="preview-row" id="preview-${c.id}">${loadingHTML()}</div>
    </div>
  `).join('');
  refreshIcons();

  for (const cat of CATEGORIES) {
    if (state.kidsSafe && cat.id !== 'anime') {
      document.getElementById(`preview-${cat.id}`).closest('div').style.display = 'none';
      continue;
    }
    const endpoint = await buildEndpoint(cat.id);
    const container2 = document.getElementById(`preview-${cat.id}`);
    const { ok, data } = await fetchAPI(endpoint);

    if (cat.id === 'weather') {
      const w = ok ? normalizeWeather(data) : null;
      container2.innerHTML = w
        ? `<article class="card" style="grid-column:span 2;"><div class="weather-temp">${w.temp}°C</div><div class="card-sub">${w.city} · ${w.condition}</div></article>`
        : emptyStateHTML('Weather unavailable right now.');
      refreshIcons();
      continue;
    }
    if (cat.id === 'sports') {
      const matches = ok && Array.isArray(data) ? data.map(normalizeMatch) : null;
      if (!matches || !matches.length) { container2.innerHTML = emptyStateHTML('No live matches right now.'); continue; }
      container2.innerHTML = cardTemplate(cat, matches.slice(0, 3));
      refreshIcons();
      continue;
    }
    if (cat.id === 'finance') {
      const coins = ok && Array.isArray(data) ? data.map(normalizeCoin) : null;
      if (!coins) { container2.innerHTML = emptyStateHTML('Crypto prices unavailable.'); continue; }
      container2.innerHTML = cardTemplate(cat, coins.slice(0, 4));
      refreshIcons();
      continue;
    }

    const normalizer = NORMALIZERS[cat.id];
    let items = null;
    const arr = extractArray(cat.id, data);
    if (ok && arr) items = arr.map(normalizer);
    if (items === null) items = SAMPLE[cat.id] || [];
    state.categoryItems[cat.id] = items;

    if (!items.length) { container2.innerHTML = emptyStateHTML('No results right now.'); continue; }
    container2.innerHTML = cardTemplate(cat, items.slice(0, 4));
    refreshIcons();
    wireGenericCardButtons(container2, cat, items.slice(0, 4));
  }
}

/* ---------- 12. CATEGORY PAGE (full page per category) ---------- */
async function renderCategoryPage(cat) {
  document.getElementById('category-page-title').textContent = cat.name;
  document.getElementById('category-page-icon').setAttribute('data-lucide', cat.icon);
  document.getElementById('category-page-toolbar').innerHTML = '';
  document.getElementById('category-page-extra').innerHTML = '';
  document.getElementById('category-page-grid').innerHTML = loadingHTML();
  refreshIcons();

  if (cat.id === 'weather') return renderWeatherPage();
  if (cat.id === 'sports') return renderSportsPage();
  if (cat.id === 'finance') return renderFinancePage();
  if (cat.id === 'movies') return renderMoviesPage();
  if (cat.id === 'music') return renderMusicPage();
  if (cat.id === 'recipes') return renderRecipesPage();
  if (cat.id === 'news') return renderNewsPage();
  return renderGenericSearchPage(cat);
}

// ---- Music page: genre chips (Afrobeats, Hip-Hop, Gospel-adjacent, etc.) + search ----
async function renderMusicPage() {
  const cat = CATEGORIES.find((c) => c.id === 'music');
  const toolbar = document.getElementById('category-page-toolbar');
  const extra = document.getElementById('category-page-extra');
  toolbar.innerHTML = `<div class="toolbar-search"><svg class="icon icon-sm" data-lucide="search"></svg><input type="text" id="music-search-input" placeholder="Search tracks, artists, albums…" /></div>`;
  refreshIcons();

  let debounceTimer = null;
  document.getElementById('music-search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.trim();
    debounceTimer = setTimeout(async () => {
      if (!q) { renderFullGrid(cat, state.categoryItems.music || []); return; }
      document.getElementById('category-page-grid').innerHTML = loadingHTML('Searching…');
      const { ok, data } = await fetchAPI(`/music?q=${encodeURIComponent(q)}`);
      renderFullGrid(cat, ok && Array.isArray(data) ? data.map(NORMALIZERS.music) : []);
    }, 400);
  });

  const { ok: genresOk, data: genres } = await fetchAPI('/music/genres');
  if (genresOk && Array.isArray(genres) && genres.length) {
    extra.innerHTML = `<div class="chip-row" id="music-genre-chips">
      <button class="filter-chip active" data-genre="">Trending</button>
      ${genres.slice(0, 14).map((g) => `<button class="filter-chip" data-genre="${g.id}">${g.name}</button>`).join('')}
    </div>`;
    extra.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', async () => {
        extra.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const genreId = chip.dataset.genre;
        document.getElementById('category-page-grid').innerHTML = loadingHTML();
        const path = genreId ? `/music/genre/${genreId}` : '/music/top50';
        const { ok, data } = await fetchAPI(path);
        const items = ok && Array.isArray(data) ? data.map(NORMALIZERS.music) : (state.categoryItems.music || []);
        renderFullGrid(cat, items);
      });
    });
  }

  let items = state.categoryItems.music;
  if (!items) {
    const { ok, data } = await fetchAPI('/music/top50');
    items = ok && Array.isArray(data) ? data.map(NORMALIZERS.music) : (SAMPLE.music || []);
    state.categoryItems.music = items;
  }
  renderFullGrid(cat, items);
}

// Generic search + grid, used by anime, gaming, books, travel
async function renderGenericSearchPage(cat) {
  const toolbar = document.getElementById('category-page-toolbar');
  const grid = document.getElementById('category-page-grid');
  const searchable = ['anime', 'gaming', 'books'].includes(cat.id);

  if (searchable) {
    toolbar.innerHTML = `<div class="toolbar-search"><svg class="icon icon-sm" data-lucide="search"></svg><input type="text" id="cat-search-input" placeholder="Search ${cat.name.toLowerCase()}…" /></div>`;
    refreshIcons();
    let debounceTimer = null;
    document.getElementById('cat-search-input').addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const q = e.target.value.trim();
      debounceTimer = setTimeout(() => { if (q) runCategorySearch(cat, q); else renderFullGrid(cat, state.categoryItems[cat.id] || []); }, 400);
    });
  }

  let items = state.categoryItems[cat.id];
  if (!items) {
    const endpoint = await buildEndpoint(cat.id);
    const { ok, data } = await fetchAPI(endpoint);
    const arr = extractArray(cat.id, data);
    items = ok && arr ? arr.map(NORMALIZERS[cat.id]) : (SAMPLE[cat.id] || []);
    state.categoryItems[cat.id] = items;
  }
  renderFullGrid(cat, items);
}

async function runCategorySearch(cat, q) {
  const grid = document.getElementById('category-page-grid');
  grid.innerHTML = loadingHTML('Searching…');
  const searchPaths = {
    anime: `/anime?q=${encodeURIComponent(q)}`,
    music: `/music?q=${encodeURIComponent(q)}`,
    gaming: `/gaming?q=${encodeURIComponent(q)}`,
    books: `/books?q=${encodeURIComponent(q)}`,
  };
  const { ok, data } = await fetchAPI(searchPaths[cat.id]);
  const items = ok && Array.isArray(data) ? data.map(NORMALIZERS[cat.id]) : [];
  if (!items.length) { grid.innerHTML = emptyStateHTML(`No results for "${q}".`); return; }
  renderFullGrid(cat, items);
}

function renderFullGrid(cat, items) {
  const grid = document.getElementById('category-page-grid');
  if (!items.length) { grid.innerHTML = emptyStateHTML('No results found right now.'); return; }
  grid.innerHTML = cardTemplate(cat, items);
  refreshIcons();
  wireGenericCardButtons(grid, cat, items);
}

/* ---- Movies page: search + genre chips + Movies/Series toggle + trailer ---- */
async function renderMoviesPage() {
  const cat = CATEGORIES.find((c) => c.id === 'movies');
  const toolbar = document.getElementById('category-page-toolbar');
  const extra = document.getElementById('category-page-extra');
  toolbar.innerHTML = `<div class="toolbar-search"><svg class="icon icon-sm" data-lucide="search"></svg><input type="text" id="movie-search-input" placeholder="Search movies…" /></div>`;
  refreshIcons();

  let debounceTimer = null;
  document.getElementById('movie-search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.trim();
    debounceTimer = setTimeout(async () => {
      if (!q) { renderFullGrid(cat, state.categoryItems.movies || []); return; }
      const { ok, data } = await fetchAPI(`/movies?q=${encodeURIComponent(q)}`);
      const items = ok && Array.isArray(data) ? data.map(NORMALIZERS.movies) : [];
      renderFullGrid(cat, items);
    }, 400);
  });

  const { ok: genresOk, data: genres } = await fetchAPI('/movies/genres');
  extra.innerHTML = `
    <div class="chip-row" id="type-tabs">
      <button class="filter-chip active" data-type="movies">Movies</button>
      <button class="filter-chip" data-type="series">Series</button>
    </div>
    ${genresOk && Array.isArray(genres) ? `<div class="chip-row" id="genre-chips">
      <button class="filter-chip active" data-genre="">Trending</button>
      ${genres.slice(0, 10).map((g) => `<button class="filter-chip" data-genre="${g.id}">${g.name}</button>`).join('')}
    </div>` : ''}
  `;
  refreshIcons();

  extra.querySelectorAll('#type-tabs .filter-chip').forEach((tab) => {
    tab.addEventListener('click', async () => {
      extra.querySelectorAll('#type-tabs .filter-chip').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const genreChips = document.getElementById('genre-chips');
      document.getElementById('category-page-grid').innerHTML = loadingHTML();
      if (tab.dataset.type === 'series') {
        if (genreChips) genreChips.style.display = 'none';
        const { ok, data } = await fetchAPI('/movies/tv/trending');
        renderFullGrid(cat, ok && Array.isArray(data) ? data.map(NORMALIZERS.movies) : []);
      } else {
        if (genreChips) genreChips.style.display = '';
        renderFullGrid(cat, state.categoryItems.movies || []);
      }
    });
  });

  extra.querySelectorAll('#genre-chips .filter-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      extra.querySelectorAll('#genre-chips .filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const genreId = chip.dataset.genre;
      const grid = document.getElementById('category-page-grid');
      grid.innerHTML = loadingHTML();
      const path = genreId ? `/movies/discover?genre=${genreId}` : '/movies/trending';
      const { ok, data } = await fetchAPI(path);
      const items = ok && Array.isArray(data) ? data.map(NORMALIZERS.movies) : (state.categoryItems.movies || []);
      renderFullGrid(cat, items);
    });
  });

  let items = state.categoryItems.movies;
  if (!items) {
    const { ok, data } = await fetchAPI('/movies/trending');
    items = ok && Array.isArray(data) ? data.map(NORMALIZERS.movies) : (SAMPLE.movies || []);
    state.categoryItems.movies = items;
  }
  renderFullGrid(cat, items);
}

/* ---- Floating trailer/media window: shared by movies, anime, games ---- */
function openMediaWindow({ title, type, src }) {
  document.getElementById('trailer-window-title').textContent = title || 'Trailer';
  const body = document.getElementById('trailer-window-body');
  if (type === 'youtube' && src) {
    body.innerHTML = `<iframe src="https://www.youtube.com/embed/${src}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else if (type === 'video' && src) {
    body.innerHTML = `<video src="${src}" controls autoplay playsinline></video>`;
  } else {
    body.innerHTML = `<div class="trailer-window-empty">No trailer is available for "${title}" yet.</div>`;
  }
  const win = document.getElementById('trailer-window');
  win.classList.remove('hidden');
  document.getElementById('trailer-bubble').classList.remove('active');
}
function closeMediaWindow() {
  const win = document.getElementById('trailer-window');
  win.classList.add('hidden');
  win.classList.remove('maximized');
  document.getElementById('trailer-window-body').innerHTML = '';
  document.getElementById('trailer-bubble').classList.remove('active');
}

async function openTrailer(item) {
  const { ok, data } = await fetchAPI(`/movies/${item.id}`);
  const videos = ok ? data.videos?.results : [];
  const trailer = (videos || []).find((v) => v.site === 'YouTube' && v.type === 'Trailer') || (videos || [])[0];
  openMediaWindow({ title: item.title, type: trailer ? 'youtube' : 'none', src: trailer?.key });
}
async function openAnimeTrailer(item) {
  if (!item.id) { showMediaDetail(item); return; }
  const { ok, data } = await fetchAPI(`/anime/${item.id}`);
  const ytId = ok ? data.trailer?.youtube_id : null;
  openMediaWindow({ title: item.title, type: ytId ? 'youtube' : 'none', src: ytId });
}
async function openGameTrailer(item) {
  if (!item.id) { showMediaDetail(item); return; }
  const { ok, data } = await fetchAPI(`/gaming/${item.id}/trailer`);
  const clip = ok && Array.isArray(data) && data.length ? data[0] : null;
  const src = clip?.data?.max || clip?.data?.['480'];
  openMediaWindow({ title: item.title, type: src ? 'video' : 'none', src });
}

function initTrailerWindow() {
  const win = document.getElementById('trailer-window');
  const header = document.getElementById('trailer-drag-handle');
  const bubble = document.getElementById('trailer-bubble');

  document.getElementById('trailer-close-btn').addEventListener('click', closeMediaWindow);
  document.getElementById('trailer-minimize-btn').addEventListener('click', () => {
    win.classList.add('hidden');
    bubble.classList.add('active');
  });
  bubble.addEventListener('click', () => {
    win.classList.remove('hidden');
    bubble.classList.remove('active');
  });
  document.getElementById('trailer-maximize-btn').addEventListener('click', (e) => {
    const nowMaximized = win.classList.toggle('maximized');
    e.currentTarget.querySelector('svg').setAttribute('data-lucide', nowMaximized ? 'minimize-2' : 'maximize-2');
    refreshIcons();
    if (nowMaximized) { win.style.left = ''; win.style.top = ''; }
  });

  // Decorative transport controls — visual feedback only, no real video control.
  const decoPlay = document.getElementById('trailer-deco-play');
  decoPlay.addEventListener('click', () => {
    const playing = decoPlay.dataset.playing === '1';
    decoPlay.querySelector('svg').setAttribute('data-lucide', playing ? 'play' : 'pause');
    decoPlay.dataset.playing = playing ? '0' : '1';
    refreshIcons();
  });

  // Drag (mouse + touch) — disabled while maximized
  let dragging = false; let startX = 0, startY = 0, originX = 0, originY = 0;
  function onDown(x, y) {
    if (win.classList.contains('maximized')) return;
    dragging = true; startX = x; startY = y;
    const r = win.getBoundingClientRect(); originX = r.left; originY = r.top;
    header.classList.add('dragging');
  }
  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - startX, dy = y - startY;
    const newLeft = Math.min(Math.max(originX + dx, 8), window.innerWidth - win.offsetWidth - 8);
    const newTop = Math.min(Math.max(originY + dy, 8), window.innerHeight - win.offsetHeight - 8);
    win.style.left = `${newLeft}px`; win.style.top = `${newTop}px`; win.style.right = 'auto';
  }
  function onUp() { dragging = false; header.classList.remove('dragging'); }
  header.addEventListener('mousedown', (e) => { if (!e.target.closest('button')) onDown(e.clientX, e.clientY); });
  window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onUp);
  header.addEventListener('touchstart', (e) => { if (!e.target.closest('button')) onDown(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener('touchmove', (e) => { if (dragging) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener('touchend', onUp);
}

/* ---- Recipes page: ingredient search + full detail ---- */
async function renderRecipesPage() {
  const cat = CATEGORIES.find((c) => c.id === 'recipes');
  const toolbar = document.getElementById('category-page-toolbar');
  toolbar.innerHTML = `<div class="toolbar-search"><svg class="icon icon-sm" data-lucide="search"></svg><input type="text" id="recipe-ing-input" placeholder="Ingredients you have, comma separated…" value="chicken, rice, tomato, onion, garlic" /></div>`;
  refreshIcons();
  let debounceTimer = null;
  document.getElementById('recipe-ing-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.trim();
    debounceTimer = setTimeout(async () => {
      if (!q) return;
      const grid = document.getElementById('category-page-grid');
      grid.innerHTML = loadingHTML('Searching…');
      const { ok, data } = await fetchAPI(`/recipes?ingredients=${encodeURIComponent(q)}`);
      const items = ok && Array.isArray(data) ? data.map(NORMALIZERS.recipes) : [];
      state.categoryItems.recipes = items;
      renderFullGrid(cat, items);
    }, 500);
  });

  let items = state.categoryItems.recipes;
  if (!items) {
    const { ok, data } = await fetchAPI('/recipes?ingredients=chicken,rice,tomato,onion,garlic');
    items = ok && Array.isArray(data) ? data.map(NORMALIZERS.recipes) : (SAMPLE.recipes || []);
    state.categoryItems.recipes = items;
  }
  renderFullGrid(cat, items);
}
async function openRecipeDetail(item) {
  const { ok, data } = await fetchAPI(`/recipes/${item.id}/information`);
  if (!ok) { showMediaDetail(item); return; }
  const ingredients = (data.extendedIngredients || []).map((i) => `<li>${i.original}</li>`).join('');
  document.getElementById('media-modal-title').textContent = data.title;
  document.getElementById('media-modal-body').innerHTML = `
    ${data.image ? `<img src="${data.image}" alt="${data.title}" style="width:100%;border-radius:var(--radius-md);margin-bottom:16px;max-height:280px;object-fit:cover;" />` : ''}
    <div class="card-sub" style="margin-bottom:10px;">${data.readyInMinutes ? data.readyInMinutes + ' mins' : ''}${data.servings ? ' · Serves ' + data.servings : ''}</div>
    <h4 style="font-size:0.85rem; margin-bottom:8px;">Ingredients</h4>
    <ul style="color:var(--text-secondary); font-size:0.85rem; line-height:1.7; padding-left:18px; margin-bottom:14px;">${ingredients || '<li>Not listed</li>'}</ul>
    <p style="color:var(--text-secondary); font-size:0.85rem; line-height:1.6;">${(data.summary || '').replace(/<[^>]+>/g, '')}</p>
  `;
  openModal('media-modal');
}

/* ---- News page: category chips + search ---- */
async function renderNewsPage() {
  const cat = CATEGORIES.find((c) => c.id === 'news');
  const extra = document.getElementById('category-page-extra');
  extra.innerHTML = `<div class="chip-row" id="news-chips">${NEWS_CATEGORIES.map((n, i) => `<button class="filter-chip ${i === 0 ? 'active' : ''}" data-news-cat="${n}">${n[0].toUpperCase()}${n.slice(1)}</button>`).join('')}</div>`;
  extra.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      extra.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const grid = document.getElementById('category-page-grid');
      grid.innerHTML = loadingHTML();
      const { ok, data } = await fetchAPI(`/news?category=${chip.dataset.newsCat}`);
      const items = ok && Array.isArray(data) ? data.map(NORMALIZERS.news) : [];
      state.categoryItems.news = items;
      renderFullGrid(cat, items);
    });
  });
  let items = state.categoryItems.news;
  if (!items) {
    const { ok, data } = await fetchAPI('/news?category=general');
    items = ok && Array.isArray(data) ? data.map(NORMALIZERS.news) : (SAMPLE.news || []);
    state.categoryItems.news = items;
  }
  renderFullGrid(cat, items);
}

/* ---- Weather page: search city + forecast ---- */
async function renderWeatherPage() {
  const toolbar = document.getElementById('category-page-toolbar');
  toolbar.innerHTML = `
    <div class="toolbar-search"><svg class="icon icon-sm" data-lucide="search"></svg><input type="text" id="city-search-input" placeholder="Search any city…" /></div>
    <div class="city-search-results" id="city-search-results"></div>
  `;
  refreshIcons();
  let debounceTimer = null;
  document.getElementById('city-search-input').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const q = e.target.value.trim();
    const resultsEl = document.getElementById('city-search-results');
    if (!q) { resultsEl.innerHTML = ''; return; }
    debounceTimer = setTimeout(async () => {
      const { ok, data } = await fetchAPI(`/weather/search?q=${encodeURIComponent(q)}`);
      if (!ok || !Array.isArray(data) || !data.length) { resultsEl.innerHTML = emptyStateHTML('City not found.'); return; }
      resultsEl.innerHTML = data.map((c, i) => `<div class="city-result-item" data-lat="${c.lat}" data-lon="${c.lon}"><svg class="icon icon-sm" data-lucide="map-pin"></svg> ${c.name}${c.state ? ', ' + c.state : ''}, ${c.country}</div>`).join('');
      refreshIcons();
      resultsEl.querySelectorAll('.city-result-item').forEach((el) => {
        el.addEventListener('click', () => {
          state.currentCoords = { lat: el.dataset.lat, lon: el.dataset.lon };
          resultsEl.innerHTML = '';
          document.getElementById('city-search-input').value = '';
          loadWeatherFor(state.currentCoords);
        });
      });
    }, 400);
  });
  loadWeatherFor(await getUserCoords());
}
async function loadWeatherFor(coords) {
  const grid = document.getElementById('category-page-grid');
  const extra = document.getElementById('category-page-extra');
  grid.innerHTML = loadingHTML();
  const { ok, data } = await fetchAPI(`/weather?lat=${coords.lat}&lon=${coords.lon}`);
  const w = ok ? normalizeWeather(data) : null;
  if (!w) { grid.innerHTML = emptyStateHTML('Weather is unavailable right now — check your OPENWEATHER_API_KEY.'); return; }
  extra.innerHTML = `
    <div class="weather-hero-card">
      <div>
        <div class="weather-hero-temp">${w.temp}°C</div>
        <div class="card-sub">${w.city}${w.country ? ', ' + w.country : ''} · ${w.condition}</div>
        <div class="weather-meta" style="margin-top:8px;">
          <span><svg class="icon icon-sm" data-lucide="thermometer"></svg> Feels like ${w.feelsLike}°C</span>
          <span><svg class="icon icon-sm" data-lucide="droplets"></svg> ${w.humidity}</span>
          <span><svg class="icon icon-sm" data-lucide="wind"></svg> ${w.wind}</span>
        </div>
      </div>
      <svg class="icon icon-lg" data-lucide="cloud-sun" style="width:64px;height:64px;color:var(--accent);"></svg>
    </div>
    <div class="forecast-row">${dailyForecast(w.forecast).map((d) => `
      <div class="forecast-day-card"><div class="day">${d.label}</div><svg class="icon" data-lucide="cloud"></svg><div class="temp">${d.temp}°C</div></div>
    `).join('')}</div>
  `;
  grid.innerHTML = '';
  refreshIcons();
}

/* ---- Sports page: league selector + standings + live ---- */
async function renderSportsPage() {
  const cat = CATEGORIES.find((c) => c.id === 'sports');
  const extra = document.getElementById('category-page-extra');
  extra.innerHTML = `
    <div class="toolbar-search"><svg class="icon icon-sm" data-lucide="search"></svg><input type="text" id="player-search-input" placeholder="Search players…" /></div>
    <div id="player-search-results"></div>

    <h4 style="font-size:0.9rem; margin-bottom:10px;">Live right now</h4>
    <div class="grid" id="live-matches-grid" style="margin-bottom:24px;">${loadingHTML()}</div>
    <h4 style="font-size:0.9rem; margin-bottom:10px;">League standings</h4>
    <div class="league-select-row">
      <select class="select-input" id="league-select" style="max-width:220px;">${LEAGUES.map((l) => `<option value="${l.id}">${l.name}</option>`).join('')}</select>
    </div>
    <div id="standings-container"><div class="card-sub">Select a league to see standings.</div></div>
  `;
  document.getElementById('category-page-grid').innerHTML = '';
  refreshIcons();

  let playerDebounce = null;
  document.getElementById('player-search-input').addEventListener('input', (e) => {
    clearTimeout(playerDebounce);
    const q = e.target.value.trim();
    const resultsEl = document.getElementById('player-search-results');
    if (!q || q.length < 3) { resultsEl.innerHTML = q ? emptyStateHTML('Keep typing (min 3 letters)…') : ''; return; }
    resultsEl.innerHTML = loadingHTML('Searching players…');
    playerDebounce = setTimeout(async () => {
      const { ok, data } = await fetchAPI(`/sports/players?search=${encodeURIComponent(q)}`);
      const players = ok && Array.isArray(data) ? data : [];
      if (!players.length) { resultsEl.innerHTML = emptyStateHTML(`No players found for "${q}" — the free plan often needs an exact league too.`); return; }
      resultsEl.innerHTML = players.slice(0, 6).map((p) => `
        <div class="city-result-item" data-idx="${players.indexOf(p)}" style="cursor:pointer;">
          ${p.player.photo ? `<img src="${p.player.photo}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />` : `<svg class="icon icon-sm" data-lucide="user"></svg>`}
          <div><div>${p.player.name}</div><div class="search-result-category">${p.statistics?.[0]?.team?.name || p.player.nationality || ''}</div></div>
        </div>
      `).join('');
      refreshIcons();
      resultsEl.querySelectorAll('[data-idx]').forEach((el) => {
        el.addEventListener('click', () => {
          const p = players[+el.dataset.idx];
          showMediaDetail({
            title: p.player.name,
            image: p.player.photo,
            sub: `${p.player.nationality || ''}${p.player.age ? ' · Age ' + p.player.age : ''}`,
            description: p.statistics?.[0]
              ? `Team: ${p.statistics[0].team?.name || '—'}\nPosition: ${p.statistics[0].games?.position || '—'}\nAppearances: ${p.statistics[0].games?.appearences ?? '—'}\nGoals: ${p.statistics[0].goals?.total ?? '—'}`
              : 'No statistics available.',
          });
        });
      });
    }, 500);
  });

  const { ok, data } = await fetchAPI('/sports/live');
  const matches = ok && Array.isArray(data) ? data.map(normalizeMatch) : null;
  const liveGrid = document.getElementById('live-matches-grid');
  if (!matches || !matches.length) liveGrid.innerHTML = emptyStateHTML('No live matches at the moment.');
  else {
    liveGrid.innerHTML = cardTemplate(cat, matches);
    refreshIcons();
    liveGrid.querySelectorAll('.live-stats-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => showMediaDetail({
        title: `${matches[i].home} vs ${matches[i].away}`, sub: `${matches[i].league} · ${matches[i].homeScore}-${matches[i].awayScore}`,
        description: matches[i].events.length ? matches[i].events.map((e) => `⚽ ${e.time?.elapsed}' — ${e.player?.name || 'Unknown'} (${e.team?.name || ''})`).join('\n') : 'No goal events yet.',
      }));
    });
  }

  async function loadStandings(leagueId) {
    const container = document.getElementById('standings-container');
    container.innerHTML = loadingHTML('Loading standings…');
    const { ok, data } = await fetchAPI(`/sports/standings?league=${leagueId}&season=${new Date().getFullYear()}`);
    const table = ok && data?.response?.[0]?.league?.standings?.[0];
    if (!table) { container.innerHTML = emptyStateHTML('Standings unavailable for this league right now.'); return; }
    const seasonNote = data.season && data.season !== new Date().getFullYear()
      ? `<div class="card-sub" style="margin-bottom:8px;">Showing ${data.season} season (latest available)</div>` : '';
    container.innerHTML = `
      ${seasonNote}
      <table class="standings-table">
        <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead>
        <tbody>${table.map((row) => `
          <tr>
            <td>${row.rank}</td>
            <td class="team-cell"><img src="${row.team.logo}" alt="" /> ${row.team.name}</td>
            <td>${row.all.played}</td><td>${row.all.win}</td><td>${row.all.draw}</td><td>${row.all.lose}</td>
            <td><strong>${row.points}</strong></td>
          </tr>
        `).join('')}</tbody>
      </table>
    `;
  }
  document.getElementById('league-select').addEventListener('change', (e) => loadStandings(e.target.value));
  loadStandings(LEAGUES[0].id);
}

/* ---- Finance page: full list + currency converter ---- */
async function renderFinancePage() {
  const cat = CATEGORIES.find((c) => c.id === 'finance');
  const extra = document.getElementById('category-page-extra');
  extra.innerHTML = `
    <div class="converter-box">
      <input type="number" id="conv-amount" value="1" style="width:100px;" />
      <select id="conv-from" class="select-input" style="width:90px;">
        ${['USD', 'TZS', 'KES', 'EUR'].map((c) => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <svg class="icon" data-lucide="arrow-right"></svg>
      <select id="conv-to" class="select-input" style="width:90px;">
        ${['TZS', 'USD', 'KES', 'EUR'].map((c) => `<option value="${c}">${c}</option>`).join('')}
      </select>
      <button class="btn btn-primary" id="conv-btn">Convert</button>
      <span class="converter-result" id="conv-result"></span>
    </div>
  `;
  refreshIcons();
  document.getElementById('conv-btn').addEventListener('click', async () => {
    const amount = document.getElementById('conv-amount').value || 1;
    const from = document.getElementById('conv-from').value;
    const to = document.getElementById('conv-to').value;
    const resultEl = document.getElementById('conv-result');
    resultEl.textContent = '…';
    const { ok, data } = await fetchAPI(`/finance/convert?from=${from}&to=${to}&amount=${amount}`);
    resultEl.textContent = ok ? `${data.conversion_result?.toLocaleString()} ${to}` : 'Unavailable';
  });

  const { ok, data } = await fetchAPI('/finance/crypto');
  const coins = ok && Array.isArray(data) ? data.map(normalizeCoin) : null;
  const grid = document.getElementById('category-page-grid');
  grid.innerHTML = coins ? cardTemplate(cat, coins) : emptyStateHTML('Crypto prices unavailable right now.');
  refreshIcons();
}

/* ---------- 13. MEDIA DETAIL MODAL ---------- */
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

/* ---------- 14. DRAGGABLE FLOATING AUDIO PLAYER — real Deezer preview playback ---------- */
function playTrack(track) {
  if (!track?.preview) { showToast('No audio preview available for this track.', 'error'); return; }
  const player = document.getElementById('audio-player');
  document.getElementById('player-track').textContent = track.title;
  document.getElementById('player-artist').textContent = track.sub;
  document.getElementById('player-cover').src = track.image || '';
  document.getElementById('bubble-cover').src = track.image || '';
  state.audioEl.src = track.preview;
  state.audioEl.play().catch(() => showToast('Playback was blocked — tap play again.', 'error'));
  player.classList.remove('hidden'); player.classList.add('playing');
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
    state.audio.playing = false; player.classList.remove('playing');
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
    state.audioEl.pause(); state.audioEl.src = '';
    player.classList.add('hidden'); bubble.classList.remove('active'); state.audio.playing = false;
  });

  let dragging = false; let startX = 0, startY = 0, originX = 0, originY = 0;
  function onDown(x, y) { dragging = true; startX = x; startY = y; const r = player.getBoundingClientRect(); originX = r.left; originY = r.top; player.classList.add('dragging'); }
  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - startX, dy = y - startY;
    const newLeft = Math.min(Math.max(originX + dx, 8), window.innerWidth - player.offsetWidth - 8);
    const newTop = Math.min(Math.max(originY + dy, 8), window.innerHeight - player.offsetHeight - 8);
    player.style.left = `${newLeft}px`; player.style.top = `${newTop}px`; player.style.right = 'auto'; player.style.bottom = 'auto';
  }
  function onUp() {
    if (!dragging) return;
    dragging = false; player.classList.remove('dragging');
    const r = player.getBoundingClientRect();
    const center = r.left + r.width / 2;
    const snapLeft = center < window.innerWidth / 2 ? 12 : window.innerWidth - r.width - 12;
    player.style.transition = 'left 0.3s var(--ease)'; player.style.left = `${snapLeft}px`;
    setTimeout(() => { player.style.transition = ''; }, 300);
  }
  handle.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', onUp);
  handle.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  window.addEventListener('touchmove', (e) => { if (dragging) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener('touchend', onUp);
}

/* ---------- 15. GLOBAL SEARCH (header) ---------- */
function buildSearchResultsHTML(q) {
  const matches = [];
  CATEGORIES.forEach((cat) => {
    const items = state.categoryItems[cat.id];
    if (!Array.isArray(items)) return;
    items.forEach((item) => { if ((item.title || '').toLowerCase().includes(q)) matches.push({ cat, item }); });
  });
  return matches.length
    ? matches.slice(0, 8).map((m) => `
        <div class="search-result-item" data-search-cat="${m.cat.id}" data-search-idx="${state.categoryItems[m.cat.id].indexOf(m.item)}">
          <svg class="icon icon-sm" data-lucide="${m.cat.icon}"></svg>
          <div><div>${m.item.title}</div><div class="search-result-category">${m.cat.name}</div></div>
        </div>
      `).join('')
    : `<div class="search-result-item">No results for "${q}" yet — try opening the category page and searching there.</div>`;
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
  document.addEventListener('click', (e) => { if (!desktopResults.contains(e.target) && e.target !== desktopInput) desktopResults.classList.remove('active'); });

  const mobileInput = document.getElementById('search-input-mobile');
  const mobileResults = document.getElementById('search-results-mobile');
  attachSearchField(mobileInput, mobileResults, { overlayToggle: false });
  document.getElementById('search-toggle-btn').addEventListener('click', () => {
    openModal('search-modal'); mobileInput.value = ''; mobileResults.innerHTML = '';
    setTimeout(() => mobileInput.focus(), 150);
  });
}

/* ---------- 16. SETTINGS ---------- */
function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); }
function initSettings() {
  document.getElementById('settings-toggle').addEventListener('click', () => openModal('settings-modal'));
  document.getElementById('nav-settings').addEventListener('click', (e) => { e.preventDefault(); toggleSidebar(false); openModal('settings-modal'); });
  document.querySelectorAll('#theme-options .option-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#theme-options .option-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.theme = btn.dataset.theme; localStorage.setItem('mhv-theme', state.theme); applyTheme(state.theme);
    });
  });
  const langSelect = document.getElementById('lang-select');
  langSelect.value = state.lang;
  langSelect.addEventListener('change', () => { state.lang = langSelect.value; localStorage.setItem('mhv-lang', state.lang); });
  const currencySelect = document.getElementById('currency-select');
  currencySelect.value = state.currency;
  currencySelect.addEventListener('change', () => { state.currency = currencySelect.value; localStorage.setItem('mhv-currency', state.currency); });
}

/* ---------- 17. KIDS SAFE MODE ---------- */
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
    buildHomePreview();
  });
}

/* ---------- 18. JOIN US DRAWER — icon-only social grid ---------- */
const SOCIAL_ICONS = { whatsapp: 'message-circle', telegram: 'send', youtube: 'youtube', instagram: 'instagram', tiktok: 'music-2', facebook: 'facebook' };
async function initJoinUs() {
  document.getElementById('nav-join').addEventListener('click', async (e) => {
    e.preventDefault(); toggleSidebar(false);
    const links = await fetchJSON('/community/links', {});
    document.getElementById('social-grid').innerHTML = Object.entries(SOCIAL_ICONS)
      .filter(([key]) => links[key])
      .map(([key, icon]) => `<a href="${links[key]}" target="_blank" rel="noopener" class="social-icon-link" aria-label="${key}"><svg class="icon" data-lucide="${icon}"></svg></a>`)
      .join('') || `<div class="card-sub">No social links configured yet.</div>`;
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
    .map(([key, icon]) => `<a href="${links[key]}" target="_blank" rel="noopener" aria-label="${key}"><svg class="icon icon-sm" data-lucide="${icon}"></svg></a>`)
    .join('');
  refreshIcons();
}

/* ---------- 19. GOOGLE SIGN-IN ---------- */
let googleReady = false;
function loadScript(src) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject; document.head.appendChild(s); }); }
function decodeJwt(token) { try { const payload = token.split('.')[1]; return JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return null; } }
function renderSignedInState() {
  const guestBtn = document.getElementById('signin-btn');
  const guestSettingsBtn = document.getElementById('settings-toggle');
  const userMenu = document.getElementById('user-menu');
  const img = document.getElementById('user-avatar-img');
  const fallback = document.getElementById('user-avatar-fallback');

  if (state.user) {
    guestBtn.style.display = 'none';
    guestSettingsBtn.style.display = 'none';
    userMenu.style.display = '';
    document.getElementById('user-dropdown-name').textContent = state.user.name || state.user.email || 'Account';
    fallback.textContent = (state.user.name || state.user.email || '?').trim().charAt(0).toUpperCase();
    // Google profile photos 404 without this attribute in some browsers, and can
    // fail to load for other reasons — fall back to initials instead of a broken icon.
    img.style.display = 'none';
    fallback.style.display = 'flex';
    if (state.user.picture) {
      img.onload = () => { img.style.display = ''; fallback.style.display = 'none'; };
      img.onerror = () => { img.style.display = 'none'; fallback.style.display = 'flex'; };
      img.src = state.user.picture;
    }
  } else {
    guestBtn.style.display = '';
    guestSettingsBtn.style.display = '';
    userMenu.style.display = 'none';
    document.getElementById('user-dropdown').classList.remove('active');
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
  if (!clientId) return;
  try {
    await loadScript('https://accounts.google.com/gsi/client');
    window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleCredential, auto_select: false });
    googleReady = true;
  } catch (e) { /* offline/blocked — sign-in stays inactive */ }
}
function signOut() {
  state.user = null;
  localStorage.removeItem('mhv-user');
  renderSignedInState();
  showToast('Signed out', 'info');
  if (googleReady) window.google.accounts.id.disableAutoSelect();
}
function initSignIn() {
  const stored = localStorage.getItem('mhv-user');
  if (stored) { try { state.user = JSON.parse(stored); } catch { /* ignore */ } }
  renderSignedInState();
  initGoogleSignIn();

  document.getElementById('signin-btn').addEventListener('click', () => {
    if (googleReady) window.google.accounts.id.prompt();
    else showToast("Sign-in isn't configured on this deployment yet.", 'error');
  });

  const dropdown = document.getElementById('user-dropdown');
  document.getElementById('user-avatar-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const isActive = dropdown.classList.toggle('active');
    document.getElementById('user-avatar-btn').setAttribute('aria-expanded', String(isActive));
  });
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target.id !== 'user-avatar-btn') dropdown.classList.remove('active');
  });
  document.getElementById('dropdown-settings-btn').addEventListener('click', () => {
    dropdown.classList.remove('active');
    openModal('settings-modal');
  });
  document.getElementById('dropdown-logout-btn').addEventListener('click', () => {
    dropdown.classList.remove('active');
    signOut();
  });
}

/* ---------- 20. MODAL CLOSE WIRING ---------- */
function initModalClosers() {
  document.querySelectorAll('[data-close-modal]').forEach((btn) => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); }));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay.active').forEach((m) => closeModal(m.id));
    if (!document.getElementById('trailer-window').classList.contains('hidden')) closeMediaWindow();
  });
}

/* ---------- 21. SCROLL-TO-TOP ---------- */
function initScrollTop() {
  const btn = document.getElementById('scroll-top-btn');
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 500), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- 22. PWA ---------- */
function initPWA() {
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; document.getElementById('install-banner').classList.add('active'); });
  document.getElementById('install-btn').addEventListener('click', async () => {
    document.getElementById('install-banner').classList.remove('active');
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
  });
  document.getElementById('install-dismiss').addEventListener('click', () => document.getElementById('install-banner').classList.remove('active'));
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    let hasReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hasReloaded) return; hasReloaded = true; window.location.reload(); });
  }
}

/* ---------- 23. INIT ---------- */
function init() {
  applyTheme(state.theme);
  document.getElementById('theme-options').querySelectorAll('.option-btn').forEach((b) => b.classList.toggle('selected', b.dataset.theme === state.theme));

  document.getElementById('menu-toggle').addEventListener('click', () => toggleSidebar());
  document.getElementById('sidebar-overlay').addEventListener('click', () => toggleSidebar(false));
  document.getElementById('category-back-btn').addEventListener('click', () => { location.hash = '#/'; });

  buildSidebar();
  buildHero();
  buildHomePreview();
  initAudioPlayer();
  initTrailerWindow();
  initSearch();
  initSettings();
  initKidsSafe();
  initJoinUs();
  initFooterSocial();
  initSignIn();
  initModalClosers();
  initScrollTop();
  initPWA();

  window.addEventListener('hashchange', router);
  router();

  refreshIcons();
  setTimeout(hidePreloader, 900);
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('load', () => setTimeout(hidePreloader, 4000)); // failsafe in case init() errors early
