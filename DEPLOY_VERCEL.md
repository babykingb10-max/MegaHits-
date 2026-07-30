# Deploying the frontend to Vercel

Backend yako tayari ipo hai: `https://megh-04620da54745.herokuapp.com`
Frontend ni static files tu (`frontend/`), kwa hiyo Vercel ndiyo sehemu bora —
ina free plan nzuri na inakubali custom domain bila malipo.

## Hatua kwa hatua (kupitia dashboard, si CLI)

1. Nenda **vercel.com** → **Add New… → Project**.
2. Chagua repo yako ya GitHub: `babykingb10-max/MegaHits-`.
3. Kwenye ukurasa wa "Configure Project":
   - **Root Directory** → bonyeza "Edit" na chagua folder **`frontend`**
     (hii ndiyo hatua muhimu zaidi — bila hii Vercel itajaribu ku-build
     backend nzima na kushindwa).
   - **Framework Preset** → chagua **"Other"** (si Next.js, si React — ni
     HTML/CSS/JS tupu, hakuna build step).
   - **Build Command** → acha wazi/tupu.
   - **Output Directory** → acha wazi (au weka `.`).
4. Bonyeza **Deploy**. Dakika moja hivi, utapata URL kama
   `https://mega-hits-xxxx.vercel.app`.

## Baada ya deploy ya kwanza

1. Fungua URL uliyopewa — tovuti nzima inapaswa kuonekana (header, hero
   slider, categories, n.k.) ikitumia sample data mpaka uweke API keys
   halisi kwenye Heroku.

2. **Unganisha CORS**: nenda Heroku dashboard → app yako `megh` → Settings →
   Config Vars → badilisha `FRONTEND_ORIGIN` iwe URL halisi ya Vercel yako
   (mfano `https://mega-hits-xxxx.vercel.app`). Bila hatua hii, backend
   itakataa maombi kutoka frontend yako kwa sababu ya CORS policy.

3. Kama baadaye ukibadilisha Heroku app URL au ukiweka custom domain kwenye
   backend, sasisha thamani ya `window.MEGAHITS_API_BASE` kwenye
   `frontend/index.html`, kisha `git push` — Vercel ita-redeploy kiotomatiki.

## Kuongeza Custom Domain (ndiyo ulichouliza)

1. Kwenye Vercel: project yako → **Settings → Domains → Add**.
2. Andika domain yako (mfano `megahitsvibez.com` au `www.megahitsvibez.com`).
3. Vercel itakuonyesha DNS records za kuongeza kwenye DNS provider yako
   (Cloudflare, Namecheap, n.k.):
   - Domain ya root (`megahitsvibez.com`) → A record kuelekea IP ya Vercel
   - Subdomain (`www`) → CNAME kuelekea `cname.vercel-dns.com`
4. Baada ya DNS kusambaa (dakika hadi masaa machache), Vercel itatoa HTTPS
   certificate kiotomatiki — hakuna cha kufanya zaidi.

## Auto-deploy kwa kila push

Vercel inaunganisha moja kwa moja na GitHub — kila `git push` kwenye branch
kuu, Vercel ita-redeploy frontend yako kiotomatiki. Backend yako ya Heroku
nayo ina automatic deploys ikiwa uliiwasha kwenye tab ya "Deploy".
