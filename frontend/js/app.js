/* ============================================================
   MEGAHITS VIBEZ — APP.JS
   Vanilla ES6+, zero external UI frameworks (per spec: sifuri za
   maktaba nzito). Talks to the Express proxy in /backend; falls
   back to bundled sample data so the UI is fully explorable
   before real API keys are wired up.
   ============================================================ */

const API_BASE = window.MEGAHITS_API_BASE || '/api'; // point this at your deployed backend

/* Icons are loaded from the Lucide CDN. Guard every call so a blocked/slow
   CDN (offline dev, restrictive network) degrades gracefully instead of
   breaking the rest of the app. */
function refreshIcons() {
  if (window.lucide && typeof lucide.createIcons === 'function') {
    try { lucide.createIcons(); } catch (e) { /* non-fatal */ }
  }
}

/* ---------- 1. CATEGORY REGISTRY (drives grid + sidebar) ---------- */
const CATEGORIES = [
  { id: 'movies',  name: 'Movies & Cinema',  icon: 'film',        endpoint: '/movies/trending', badge: null },
  { id: 'anime',   name: 'Cartoons & Anime', icon: 'tv',          endpoint: '/anime/top',       badge: 'KIDS SAFE' },
  { id: 'music',   name: 'Music & Media',    icon: 'music',       endpoint: '/music/top50',     badge: null },
  { id: 'sports',  name: 'Live Sports',      icon: 'trophy',      endpoint: '/sports/live',     badge: 'LIVE' },
  { id: 'weather', name: 'Live Weather',     icon: 'cloud-sun',   endpoint: '/weather',         badge: null },
  { id: 'finance', name: 'Finance & Crypto', icon: 'trending-up', endpoint: '/finance/crypto',  badge: null },
  { id: 'recipes', name: 'Recipe Finder',    icon: 'chef-hat',    endpoint: '/recipes',         badge: null },
  { id: 'news',    name: 'Breaking News',    icon: 'newspaper',   endpoint: '/news',            badge: 'NEW' },
  { id: 'gaming',  name: 'Gaming & Esports', icon: 'gamepad-2',   endpoint: '/gaming/new-releases', badge: null },
  { id: 'ai',      name: 'AI Utilities',     icon: 'sparkles',    endpoint: '/ai',              badge: null },
  { id: 'books',   name: 'Books & Comics',   icon: 'book-open',   endpoint: '/books',           badge: null },
  { id: 'travel',  name: 'Travel & Events',  icon: 'map-pin',     endpoint: '/travel',          badge: null },
];

/* ---------- 2. SAMPLE DATA (used until real API keys are set) ---------- */
const SAMPLE = {
  hero: [
    {
      title: 'Avatar 3: Fire & Ash',
      badge: 'TRENDING NOW',
      desc: 'The next chapter of Pandora arrives. Watch the new trailer and mark the release date.',
      bg: 'linear-gradient(135deg, #1a1a20, #0d0d10)',
      cta: 'Watch trailer',
    },
    {
      title: 'Arsenal 2 – 1 Chelsea',
      badge: 'LIVE MATCH',
      live: true,
      desc: "Premier League matchday 12 — second half underway, minute 75'.",
      bg: 'linear-gradient(135deg, #1a1a20, #0d0d10)',
      cta: 'Live stats',
    },
    {
      title: 'Top 50 Global — Fresh Drops',
      badge: 'NEW MUSIC',
      desc: 'This week\'s biggest tracks across Afrobeats, Bongo Flava and Hip-Hop.',
      bg: 'linear-gradient(135deg, #1a1a20, #0d0d10)',
      cta: 'Play now',
    },
  ],
  movies: [
    { title: 'Avatar 3: Fire & Ash', sub: '2026 · Sci-Fi', rating: '8.6' },
    { title: 'Dune: Part Three', sub: '2026 · Adventure', rating: '8.4' },
    { title: 'The Batman Part II', sub: '2026 · Action', rating: '8.1' },
    { title: 'Mission: Impossible — Legacy', sub: '2026 · Thriller', rating: '7.9' },
  ],
  anime: [
    { title: 'One Piece', sub: '1000+ episodes · PG', rating: '8.7' },
    { title: 'Jujutsu Kaisen', sub: '48 episodes · PG-13', rating: '8.5' },
    { title: 'Spy x Family', sub: '25 episodes · PG', rating: '8.3' },
    { title: 'Frieren', sub: '28 episodes · PG', rating: '9.0' },
  ],
  music: [
    { title: 'Sitting On Top Of The World', sub: 'Burna Boy', },
    { title: 'Amapiano Nights', sub: 'DJ Maphorisa' },
    { title: 'Bongo Flava Vibes', sub: 'Harmonize' },
    { title: 'Water', sub: 'Tyla' },
  ],
  sports: [
    { home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 1, minute: "75'", league: 'EPL' },
    { home: 'Simba SC', away: 'Yanga SC', homeScore: 1, awayScore: 1, minute: "60'", league: 'NBC PL' },
  ],
  weather: { temp: 29, city: 'Dar es Salaam', condition: 'Partly cloudy', humidity: '68%', wind: '14 km/h' },
  finance: [
    { name: 'Bitcoin', symbol: 'BTC', price: '68,420', change: 2.4 },
    { name: 'Ethereum', symbol: 'ETH', price: '3,180', change: -1.1 },
    { name: 'Solana', symbol: 'SOL', price: '164', change: 5.6 },
  ],
  recipes: [
    { title: 'Chicken Pilau', sub: '45 mins · Easy' },
    { title: 'Coastal Coconut Fish Curry', sub: '35 mins · Medium' },
  ],
  news: [
    { title: 'Global markets rally on tech earnings', sub: 'Reuters · 2h ago' },
    { title: 'East Africa tech funding hits record high', sub: 'TechCrunch · 5h ago' },
  ],
  gaming: [
    { title: 'Elden Ring: Shadow Realms', sub: 'PS5 / PC · Metacritic 94' },
    { title: 'Forza Horizon 6', sub: 'Xbox / PC · Metacritic 89' },
  ],
  ai: [
    { title: 'AI Text Summarizer', sub: 'Paste any article' },
    { title: 'Quick Translator', sub: 'English ⇄ Kiswahili' },
  ],
  books: [
    { title: 'Things Fall Apart', sub: 'Chinua Achebe' },
    { title: 'Half of a Yellow Sun', sub: 'Chimamanda Ngozi Adichie' },
  ],
  travel: [
    { title: 'Wasafi Festival 2026', sub: 'Dar es Salaam · Dec 12' },
    { title: 'Nairobi Music Week', sub: 'Nairobi · Nov 3' },
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
  audio: { playing: false, minimized: false },
  dragPos: { x: 0, y: 0 },
};

/* ---------- 4. HELPERS ---------- */
async function fetchJSON(path, fallback) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // Backend not deployed yet / offline — use bundled sample data so the UI stays useful.
    return fallback;
  }
}

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

/* ---------- 5. SIDEBAR + HAMBURGER MENU ---------- */
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

/* ---------- 6. HERO SLIDER ---------- */
async function buildHero() {
  const el = document.getElementById('hero-slider');
  let slides = [];

  const movies = await fetchJSON('/movies/trending', null);
  if (Array.isArray(movies) && movies.length) {
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
      });
    });
  }

  const live = await fetchJSON('/sports/live', null);
  if (Array.isArray(live) && live.length) {
    const match = live[0];
    slides.unshift({
      title: `${match.teams?.home?.name || 'Home'} ${match.goals?.home ?? 0} – ${match.goals?.away ?? 0} ${match.teams?.away?.name || 'Away'}`,
      badge: 'LIVE MATCH',
      live: true,
      desc: `${match.league?.name || 'Live match'} — minute ${match.fixture?.status?.elapsed ?? '—'}'`,
      bg: 'linear-gradient(135deg, #1a1a20, #0d0d10)',
      cta: 'Live stats',
    });
  }

  if (!slides.length) slides = SAMPLE.hero; // offline / no data yet fallback

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

  el.querySelectorAll('[data-hero-info]').forEach((btn) =>
    btn.addEventListener('click', () => showMediaDetail(slides[+btn.dataset.heroInfo].title))
  );
  el.querySelectorAll('[data-hero-cta]').forEach((btn) =>
    btn.addEventListener('click', () => showMediaDetail(slides[+btn.dataset.heroCta].title))
  );
  el.querySelectorAll('[data-dot]').forEach((dot) =>
    dot.addEventListener('click', () => goToSlide(+dot.dataset.dot))
  );
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
  slides[index].classList.add('active');
  dots[index].classList.add('active');
  state.heroIndex = index;
}
function startHeroAutoplay() {
  stopHeroAutoplay();
  state.heroTimer = setInterval(() => {
    goToSlide((state.heroIndex + 1) % SAMPLE.hero.length);
  }, 6000);
}
function stopHeroAutoplay() {
  if (state.heroTimer) clearInterval(state.heroTimer);
}

/* ---------- 7. CATEGORY GRID ---------- */
function cardTemplate(cat, items) {
  if (cat.id === 'sports') {
    return items.map((m) => `
      <article class="card">
        <div class="score-row">
          <div class="score-team">${m.home}</div>
          <div class="score-value">${m.homeScore} – ${m.awayScore}</div>
          <div class="score-team">${m.away}</div>
        </div>
        <div class="score-minute">${m.league} · LIVE ${m.minute}</div>
        <div class="card-actions" style="margin-top:10px;">
          <button class="chip-btn"><svg class="icon icon-sm" data-lucide="bar-chart-2"></svg> Live stats</button>
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
          <div>
            <div class="card-title">${c.name}</div>
            <div class="card-sub">${c.symbol}</div>
          </div>
          <div style="text-align:right;">
            <div class="crypto-price">$${c.price}</div>
            <div class="crypto-change ${c.change >= 0 ? 'up' : 'down'}">${c.change >= 0 ? '▲' : '▼'} ${Math.abs(c.change)}%</div>
          </div>
        </div>
      </article>
    `).join('');
  }
  // Default poster-style card (movies, anime, music, recipes, news, gaming, books, travel, ai)
  return items.map((m, i) => `
    <article class="card">
      <div class="card-media" style="display:flex;align-items:center;justify-content:center;">
        <svg class="icon icon-lg" data-lucide="${cat.icon}" style="color:var(--text-muted);"></svg>
        ${m.rating ? `<span class="rating-badge"><svg class="icon" data-lucide="star"></svg>${m.rating}</span>` : ''}
      </div>
      <div class="card-title">${m.title}</div>
      <div class="card-sub">${m.sub || ''}</div>
      <div class="card-actions">
        <button class="chip-btn primary" data-play="${cat.id}-${i}">
          <svg class="icon icon-sm" data-lucide="${cat.id === 'music' ? 'play' : 'play-circle'}"></svg>
          ${cat.id === 'music' ? 'Play' : cat.id === 'recipes' ? 'Cook now' : cat.id === 'books' ? 'Read' : 'Watch'}
        </button>
        <button class="chip-btn" data-info="${cat.id}-${i}"><svg class="icon icon-sm" data-lucide="info"></svg></button>
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
        <span class="section-link">See all</span>
      </div>
      <div class="grid" id="grid-${c.id}"><div class="card-sub">Loading…</div></div>
    </section>
  `).join('');
  refreshIcons();

  for (const cat of CATEGORIES) {
    if (state.kidsSafe && !['anime'].includes(cat.id)) continue; // Kids Safe Mode: only child-appropriate categories render
    const data = await fetchJSON(cat.endpoint, SAMPLE[cat.id]);
    const container = document.getElementById(`grid-${cat.id}`);
    container.innerHTML = cardTemplate(cat, data);
    refreshIcons();

    container.querySelectorAll('[data-play]').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (cat.id === 'music') playTrack(SAMPLE.music[+btn.dataset.play.split('-')[1]]);
        else showMediaDetail(cardTitleFromKey(cat, btn.dataset.play));
      })
    );
    container.querySelectorAll('[data-info]').forEach((btn) =>
      btn.addEventListener('click', () => showMediaDetail(cardTitleFromKey(cat, btn.dataset.info)))
    );
  }

  if (state.kidsSafe) {
    document.querySelectorAll('.section .card[id^="section-"]').forEach((sec) => {
      const id = sec.id.replace('section-', '');
      if (!['anime'].includes(id)) sec.style.display = 'none';
    });
  }
}
function cardTitleFromKey(cat, key) {
  const idx = +key.split('-')[1];
  const item = SAMPLE[cat.id][idx];
  return item?.title || cat.name;
}

/* ---------- 8. MEDIA DETAIL MODAL ---------- */
function showMediaDetail(title) {
  document.getElementById('media-modal-title').textContent = title;
  document.getElementById('media-modal-body').innerHTML = `
    <p style="color:var(--text-secondary); font-size:0.9rem; line-height:1.6;">
      Full details for <strong>${title}</strong> will appear here once the backend proxy is
      connected to its live API key (see backend/.env.example).
    </p>
  `;
  openModal('media-modal');
}

/* ---------- 9. DRAGGABLE FLOATING AUDIO PLAYER ---------- */
function playTrack(track) {
  const player = document.getElementById('audio-player');
  document.getElementById('player-track').textContent = track.title;
  document.getElementById('player-artist').textContent = track.sub;
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

  playBtn.addEventListener('click', () => {
    state.audio.playing = !state.audio.playing;
    player.classList.toggle('playing', state.audio.playing);
    document.querySelector('#player-play-btn svg').setAttribute('data-lucide', state.audio.playing ? 'pause' : 'play');
    refreshIcons();
  });

  minimizeBtn.addEventListener('click', () => {
    player.classList.add('hidden');
    bubble.classList.add('active');
  });
  bubble.addEventListener('click', () => {
    bubble.classList.remove('active');
    player.classList.remove('hidden');
  });
  closeBtn.addEventListener('click', () => {
    player.classList.add('hidden');
    bubble.classList.remove('active');
    state.audio.playing = false;
  });

  // Drag logic — mouse + touch, snap to nearest edge on release
  let dragging = false;
  let startX = 0, startY = 0, originX = 0, originY = 0;

  function onDown(x, y) {
    dragging = true;
    startX = x; startY = y;
    const rect = player.getBoundingClientRect();
    originX = rect.left; originY = rect.top;
    player.classList.add('dragging');
  }
  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - startX, dy = y - startY;
    const newLeft = Math.min(Math.max(originX + dx, 8), window.innerWidth - player.offsetWidth - 8);
    const newTop = Math.min(Math.max(originY + dy, 8), window.innerHeight - player.offsetHeight - 8);
    player.style.left = `${newLeft}px`;
    player.style.top = `${newTop}px`;
    player.style.right = 'auto';
    player.style.bottom = 'auto';
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    player.classList.remove('dragging');
    // Snap to nearest horizontal edge
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

/* ---------- 10. SEARCH (debounced, cross-category) ---------- */
function buildSearchResultsHTML(q) {
  const matches = [];
  CATEGORIES.forEach((cat) => {
    const items = SAMPLE[cat.id];
    if (!Array.isArray(items)) return;
    items.forEach((item) => {
      const title = item.title || `${item.home} vs ${item.away}` || '';
      if (title.toLowerCase().includes(q)) matches.push({ cat, item, title });
    });
  });
  return matches.length
    ? matches.slice(0, 8).map((m) => `
        <div class="search-result-item">
          <svg class="icon icon-sm" data-lucide="${m.cat.icon}"></svg>
          <div>
            <div>${m.title}</div>
            <div class="search-result-category">${m.cat.name}</div>
          </div>
        </div>
      `).join('')
    : `<div class="search-result-item">No results for "${q}"</div>`;
}

function attachSearchField(input, results, { overlayToggle } = {}) {
  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '';
      if (overlayToggle) results.classList.remove('active');
      return;
    }
    debounceTimer = setTimeout(() => {
      results.innerHTML = buildSearchResultsHTML(q);
      if (overlayToggle) results.classList.add('active');
      refreshIcons();
    }, 300);
  });
}

function initSearch() {
  // Desktop inline search bar
  const desktopInput = document.getElementById('search-input');
  const desktopResults = document.getElementById('search-results');
  attachSearchField(desktopInput, desktopResults, { overlayToggle: true });
  document.addEventListener('click', (e) => {
    if (!desktopResults.contains(e.target) && e.target !== desktopInput) desktopResults.classList.remove('active');
  });

  // Mobile full-screen search modal
  const mobileInput = document.getElementById('search-input-mobile');
  const mobileResults = document.getElementById('search-results-mobile');
  attachSearchField(mobileInput, mobileResults, { overlayToggle: false });

  document.getElementById('search-toggle-btn').addEventListener('click', () => {
    openModal('search-modal');
    mobileInput.value = '';
    mobileResults.innerHTML = '';
    setTimeout(() => mobileInput.focus(), 150);
  });
}

/* ---------- 11. SETTINGS MODAL ---------- */
function initSettings() {
  document.getElementById('settings-toggle').addEventListener('click', () => openModal('settings-modal'));
  document.getElementById('nav-settings').addEventListener('click', (e) => { e.preventDefault(); toggleSidebar(false); openModal('settings-modal'); });

  document.querySelectorAll('#theme-options .option-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#theme-options .option-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.theme = btn.dataset.theme;
      localStorage.setItem('mhv-theme', state.theme);
      document.documentElement.dataset.theme = state.theme;
    });
  });

  const langSelect = document.getElementById('lang-select');
  langSelect.value = state.lang;
  langSelect.addEventListener('change', () => {
    state.lang = langSelect.value;
    localStorage.setItem('mhv-lang', state.lang);
  });

  const currencySelect = document.getElementById('currency-select');
  currencySelect.value = state.currency;
  currencySelect.addEventListener('change', () => {
    state.currency = currencySelect.value;
    localStorage.setItem('mhv-currency', state.currency);
  });
}

/* ---------- 12. KIDS SAFE MODE ---------- */
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

/* ---------- 13. JOIN US DRAWER ---------- */
async function initJoinUs() {
  document.getElementById('nav-join').addEventListener('click', async (e) => {
    e.preventDefault();
    toggleSidebar(false);
    const links = await fetchJSON('/community/links', {
      whatsapp: '#', telegram: '#', youtube: '#', instagram: '#', tiktok: '#',
    });
    const social = [
      { key: 'whatsapp', label: 'WhatsApp', icon: 'message-circle' },
      { key: 'telegram', label: 'Telegram', icon: 'send' },
      { key: 'youtube', label: 'YouTube', icon: 'youtube' },
      { key: 'instagram', label: 'Instagram', icon: 'instagram' },
    ];
    document.getElementById('social-grid').innerHTML = social.map((s) => `
      <a href="${links[s.key] || '#'}" target="_blank" rel="noopener" class="social-link">
        <svg class="icon icon-sm" data-lucide="${s.icon}"></svg> ${s.label}
      </a>
    `).join('');
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
  const links = await fetchJSON('/community/links', {
    whatsapp: '#', telegram: '#', youtube: '#', instagram: '#',
  });
  const social = [
    { key: 'whatsapp', icon: 'message-circle' },
    { key: 'telegram', icon: 'send' },
    { key: 'youtube', icon: 'youtube' },
    { key: 'instagram', icon: 'instagram' },
  ];
  document.getElementById('footer-social').innerHTML = social.map((s) => `
    <a href="${links[s.key] || '#'}" target="_blank" rel="noopener" aria-label="${s.key}">
      <svg class="icon icon-sm" data-lucide="${s.icon}"></svg>
    </a>
  `).join('');
  refreshIcons();
}

/* ---------- 14. GOOGLE SIGN-IN (stub — wire real OAuth client ID in production) ---------- */
function initSignIn() {
  const btn = document.getElementById('signin-btn');
  let signedIn = false;
  btn.addEventListener('click', () => {
    signedIn = !signedIn;
    if (signedIn) {
      btn.innerHTML = `<img class="avatar" src="https://api.dicebear.com/7.x/initials/svg?seed=Guest" alt="Profile" />`;
      showToast('Welcome!', 'success');
    } else {
      btn.innerHTML = `<svg class="icon icon-sm" data-lucide="log-in"></svg><span>Sign in</span>`;
      refreshIcons();
      showToast('Signed out', 'info');
    }
  });
}

/* ---------- 15. MODAL CLOSE WIRING ---------- */
function initModalClosers() {
  document.querySelectorAll('[data-close-modal]').forEach((btn) =>
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal))
  );
  document.querySelectorAll('.modal-overlay').forEach((overlay) =>
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach((m) => closeModal(m.id));
  });
}

/* ---------- 16. PWA INSTALL PROMPT ---------- */
function initPWA() {
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-banner').classList.add('active');
  });
  document.getElementById('install-btn').addEventListener('click', async () => {
    document.getElementById('install-banner').classList.remove('active');
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; }
  });
  document.getElementById('install-dismiss').addEventListener('click', () => {
    document.getElementById('install-banner').classList.remove('active');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // Registration can fail on file:// or unsupported hosts — non-fatal.
      });
    });
  }
}

/* ---------- 17. INIT ---------- */
function init() {
  document.documentElement.dataset.theme = state.theme;
  document.getElementById('theme-options').querySelectorAll('.option-btn').forEach((b) => {
    b.classList.toggle('selected', b.dataset.theme === state.theme);
  });

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
  initPWA();

  refreshIcons();
}

document.addEventListener('DOMContentLoaded', init);
