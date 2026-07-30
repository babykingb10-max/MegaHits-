# Kuweka API Keys Halisi — MegaHits Vibez

Kila key hapa chini inaenda kwenye **Heroku → app `megh` → Settings →
Config Vars** (jina la key liwe sawa kabisa na column ya "ENV VAR").
Baada ya kuweka key mpya, Heroku ita-restart app yako yenyewe — hakuna
haja ya kufanya `git push` tena kwa hatua hii.

Huhitaji kuweka zote mara moja — weka chache kwanza (mfano Movies na
Weather), tazama zinafanya kazi, kisha endelea na zilizobaki.

---

## 1. Movies & Cinema — TMDB
- Nenda **themoviedb.org** → Jisajili (bure) → **Settings → API**
- Omba "Developer" API key (chagua "Component" ukiulizwa matumizi)
- Utapata mbili: **API Key (v3 auth)** na **API Read Access Token (v4 auth)**

| ENV VAR | Weka thamani ya |
|---|---|
| `TMDB_API_KEY` | API Key (v3 auth) |
| `TMDB_READ_ACCESS_TOKEN` | API Read Access Token (v4 auth) |

## 2. Cartoons & Anime — Jikan
Hakuna hatua! Jikan (`api.jikan.moe`) ni bure na haihitaji key kabisa —
route ya `/api/anime` tayari inafanya kazi bila config vars.

## 3. Music & Media — Spotify
- Nenda **developer.spotify.com/dashboard** → Log in → **Create app**
- Jaza jina lolote + redirect URI yoyote (mfano `https://example.com`) — hatuitumii OAuth ya mtumiaji, ni Client Credentials tu
- Baada ya kuunda app, bonyeza **Settings** kwenye app hiyo

| ENV VAR | Weka thamani ya |
|---|---|
| `SPOTIFY_CLIENT_ID` | Client ID |
| `SPOTIFY_CLIENT_SECRET` | Client Secret (bonyeza "View client secret") |

## 4. Live Sports — API-Football
- Nenda **api-sports.io** → Jisajili → **Dashboard**
- Copy key iliyopo chini ya "My Access"

| ENV VAR | Weka thamani ya |
|---|---|
| `API_FOOTBALL_KEY` | API key yako |

> Free plan ina mipaka midogo (maombi 100/siku) — caching yetu (saa 1 kwa data ya kawaida, dakika 1 kwa live scores) inasaidia isiishe haraka.

## 5. Live Weather — OpenWeatherMap
- Nenda **openweathermap.org** → Jisajili → **API keys** (kwenye profile yako)
- Key mpya inachukua ~10 min kuanza kufanya kazi baada ya kuundwa — subiri kidogo usipoona ikifanya kazi mara moja

| ENV VAR | Weka thamani ya |
|---|---|
| `OPENWEATHER_API_KEY` | API key yako |

## 6. Finance & Crypto — CoinGecko + ExchangeRate-API
- **CoinGecko**: bei za crypto zinafanya kazi **bila key kabisa** (public endpoint) — huhitaji kufanya lolote kwa `/api/finance/crypto`
- **ExchangeRate-API** (kwa currency converter): nenda **exchangerate-api.com** → Jisajili bure → Dashboard → copy key

| ENV VAR | Weka thamani ya |
|---|---|
| `EXCHANGERATE_API_KEY` | API key kutoka exchangerate-api.com |

## 7. Recipe Finder — Spoonacular
- Nenda **spoonacular.com/food-api** → Jisajili → **Console → Profile**
- Free plan: points 150/siku

| ENV VAR | Weka thamani ya |
|---|---|
| `SPOONACULAR_API_KEY` | API key yako |

## 8. Breaking News — NewsAPI
- Nenda **newsapi.org** → Jisajili → copy key kutoka "Your API key"
- ⚠️ Free plan ya NewsAPI **haifanyi kazi kwenye production/live domain** — ni kwa localhost/development pekee. Ukiona error kwenye news route ukiwa live, hiyo ndiyo sababu — chaguo: upgrade NewsAPI, au tumia **Currents API** (currentsapi.services, free tier inaruhusu production) badala yake.

| ENV VAR | Weka thamani ya |
|---|---|
| `NEWS_API_KEY` | API key kutoka newsapi.org (localhost/dev pekee) |
| `CURRENTS_API_KEY` | Mbadala inayoruhusu production (currentsapi.services) |

## 9. Gaming & Esports — RAWG
- Nenda **rawg.io/apidocs** → Jisajili → **API key** kwenye profile settings

| ENV VAR | Weka thamani ya |
|---|---|
| `RAWG_API_KEY` | API key yako |

## 10. AI Utilities — OpenAI
- Nenda **platform.openai.com** → Log in → **API keys → Create new secret key**
- ⚠️ Hii inahitaji uweke billing (malipo kidogo ya mategemeo) kwenye akaunti yako ya OpenAI — si bure kabisa kama nyingine

| ENV VAR | Weka thamani ya |
|---|---|
| `OPENAI_API_KEY` | Secret key (huanza na `sk-...`) |

## 11. Books & Comics — Google Books
- Nenda **console.cloud.google.com** → Unda project mpya (au tumia iliyopo) → **APIs & Services → Library** → tafuta "Books API" → **Enable**
- Kisha **Credentials → Create Credentials → API Key**

| ENV VAR | Weka thamani ya |
|---|---|
| `GOOGLE_BOOKS_API_KEY` | API key yako |

## 12. Travel & Events — Ticketmaster
- Nenda **developer.ticketmaster.com** → Jisajili → **Create New App**
- Copy "Consumer Key" (ndiyo API key inayotumika kwenye ombi)

| ENV VAR | Weka thamani ya |
|---|---|
| `TICKETMASTER_API_KEY` | Consumer Key |

## 13. Social / Community links
Hizi si API keys — ni URLs zako halisi za WhatsApp group, Telegram channel, n.k.

| ENV VAR | Mfano wa thamani |
|---|---|
| `SOCIAL_WHATSAPP_URL` | `https://chat.whatsapp.com/xxxxxxx` |
| `SOCIAL_TELEGRAM_URL` | `https://t.me/megahitsvibez` |
| `SOCIAL_YOUTUBE_URL` | `https://youtube.com/@megahitsvibez` |
| `SOCIAL_INSTAGRAM_URL` | `https://instagram.com/megahitsvibez` |
| `SOCIAL_TIKTOK_URL` | `https://tiktok.com/@megahitsvibez` |

## 14. Google Sign-In (hiari — frontend bado ina "demo" sign-in)
- Nenda **console.cloud.google.com → APIs & Services → Credentials**
- **Create Credentials → OAuth client ID** → chagua "Web application"
- Weka Authorized origins: URL yako ya Vercel na Heroku

| ENV VAR | Weka thamani ya |
|---|---|
| `GOOGLE_CLIENT_ID` | Client ID |
| `GOOGLE_CLIENT_SECRET` | Client Secret |

---

## Njia ya haraka — Heroku CLI (badala ya kubonyeza moja moja kwenye dashboard)

```bash
heroku config:set -a megh \
  TMDB_API_KEY=xxxxx \
  TMDB_READ_ACCESS_TOKEN=xxxxx \
  SPOTIFY_CLIENT_ID=xxxxx \
  SPOTIFY_CLIENT_SECRET=xxxxx \
  API_FOOTBALL_KEY=xxxxx \
  OPENWEATHER_API_KEY=xxxxx \
  EXCHANGERATE_API_KEY=xxxxx \
  SPOONACULAR_API_KEY=xxxxx \
  NEWS_API_KEY=xxxxx \
  RAWG_API_KEY=xxxxx \
  GOOGLE_BOOKS_API_KEY=xxxxx \
  TICKETMASTER_API_KEY=xxxxx \
  SOCIAL_WHATSAPP_URL=https://chat.whatsapp.com/xxxxx \
  SOCIAL_TELEGRAM_URL=https://t.me/xxxxx \
  SOCIAL_YOUTUBE_URL=https://youtube.com/@xxxxx \
  SOCIAL_INSTAGRAM_URL=https://instagram.com/xxxxx
```

## Jinsi ya kujua kama key inafanya kazi

Fungua route husika moja kwa moja kwenye browser au bonyeza "Watch"/"See all"
kwenye category husika ukiwa live:

```
https://megh-04620da54745.herokuapp.com/api/movies/trending
https://megh-04620da54745.herokuapp.com/api/weather?lat=-6.79&lon=39.20
```

Ukiona JSON ya data halisi → key inafanya kazi. Ukiona `{"error":true,...}`
→ soma "message" — mara nyingi inaonyesha key haijawekwa sahihi au bado
haijaanza kufanya kazi (baadhi zinachukua dakika chache baada ya kuundwa).
