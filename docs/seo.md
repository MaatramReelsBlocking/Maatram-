# Maatram — SEO pack (v6.4-seo)

Every audit item from `Maatram_Complete_SEO_Audit_Report.pdf` is fixed.
**No feature was removed.** All 8 pages, `theme.js` behaviour, Firebase, points
economy, Performance mode and the theme switcher are untouched.

---

## What changed

| Audit item | Before | Now |
|---|---|---|
| Meta description | missing | unique, 110–260 chars, on all 8 pages |
| Noindex | **critical** | `index, follow, max-image-preview:large` on every page + `X-Robots-Tag` header in `vercel.json` (only `login.html` is intentionally `noindex`) |
| Canonical | missing | absolute self-canonical on every page |
| Open Graph | missing | full OG set + real 1200×630 `og-image.png` |
| Twitter card | missing | `summary_large_image` + `@Maatram_360` |
| Schema | missing | JSON-LD `@graph`: Organization, WebSite, WebApplication/SoftwareApplication, WebPage, BreadcrumbList, FAQPage (home) |
| Sitemap | missing | `sitemap.xml`, 7 URLs, image entry, login excluded |
| robots.txt | missing | `Allow: /` + sitemap line + crawl-delay for scraper bots |
| Image ALT | missing | every `<img>` has a real `alt` |
| H1 | 6 of 8 pages | exactly one H1 on **all 8** |
| External links | none | 5 trusted references in the footer (`rel="noopener noreferrer"`) |
| Internal links | 8 | ~30, footer links every page from home + socials |
| Broken links | unchecked | 0 broken internal links (automated check), `404.html` catches the rest |
| Minify JS | `theme.js` unminified | `theme.js` minified (readable source kept as `theme.src.js`) |
| Favicon / PWA | none | `favicon.ico`, 16/32/180/192/512 PNG, `site.webmanifest`, app shortcuts |
| Security headers | none | HSTS, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options |
| Caching | default | 1-year immutable for images, revalidate for HTML |

---

## Deploy

Unzip into an **empty** folder, then push everything to the repo root:

```bash
git add -A
git commit -m "SEO: metadata, schema, sitemap, robots, OG, icons, minified theme.js"
git push
```

Vercel auto-deploys. `vercel.json` must sit at the repo root next to the HTML.

---

## After deploying — do these 4 things

1. **Google Search Console** → <https://search.google.com/search-console>
   Add property `maatram-website.vercel.app` → verify (HTML tag or DNS) →
   **Sitemaps** → submit `sitemap.xml` → **URL Inspection** on `/` → *Request indexing*.
2. **Bing Webmaster Tools** → <https://www.bing.com/webmasters> → import from GSC.
   This also feeds ChatGPT / Copilot search.
3. **Rich Results Test** → <https://search.google.com/test/rich-results> → paste your
   home URL → confirm FAQ + Software App show up.
4. **Preview check** → paste your URL into WhatsApp and
   <https://cards-dev.twitter.com/validator> to confirm the OG card renders.

---

## If you buy a custom domain

One command swaps every canonical, OG URL and sitemap entry:

```bash
grep -rl "maatram-website.vercel.app" . | xargs sed -i 's|maatram-website\.vercel\.app|yourdomain.com|g'
```

Then in **Vercel → Project → Settings → Domains**: add both `yourdomain.com` and
`www.yourdomain.com`, and set one as the **redirect** to the other.
That is the "WWW Redirect" audit item — it is a Vercel domain setting, not a code change.

> **Note on `*.vercel.app`:** Vercel adds its own `noindex` header to *preview*
> deployment URLs. Only the **production** URL (or a custom domain) is indexable.
> Always submit the production URL to Search Console.

---

## Editing `theme.js` later

`theme.js` is now minified. Edit **`theme.src.js`**, then rebuild:

```bash
npx terser theme.src.js -c passes=2 -m --comments false -o theme.js
```

---

## Files added

```
robots.txt          sitemap.xml         site.webmanifest    vercel.json
404.html            og-image.png        og-image-small.png  favicon.ico
apple-touch-icon.png  icon-16.png  icon-32.png  icon-192.png  icon-512.png
theme.src.js        SEO-README.md
```

## Files edited (head + minor markup only)

```
index.html  timers.html  app-gate.html  study-room.html
stats.html  leaderboard.html  socials.html  login.html  theme.js
```

---

## Pass 2 — optimisation round (v6.5)

| Found | Fixed |
|---|---|
| Phone number still in the socials contact card | removed — email only, no `tel:` left anywhere on the site |
| Two `<footer>` elements on socials | old credit line demoted to `<p class="pagecred">` — identical look, one real footer |
| Google Fonts stylesheet was **render-blocking** on all 9 pages | `preload` + `media="print" onload` async swap + `<noscript>` fallback — removes the biggest blocking request |
| No skip-to-content link, no `main` landmark | `.skip-link` + `id="main" role="main"` on every page (Lighthouse a11y + crawler structure) |
| `<nav>` and the floating icon buttons had no accessible name | `aria-label` on nav, Performance button and the Customize-UI button |
| Avatar images had no size or loading hints | `loading="lazy" decoding="async"` + explicit `width`/`height` (kills layout shift / CLS) |
| Tall footer repainted on every frame | `content-visibility:auto` + `contain-intrinsic-size` |
| `favicon.ico` was 32 KB | rebuilt at 16/32/48 only — **5.4 KB** |
| No language targeting | self-referencing `hreflang="en"` + `x-default` |
| Owned social profiles unlinked as identity | `rel="me"` on Instagram, X, LinkedIn, GitHub, Discord |
| `theme.src.js`, `SEO-README.md`, `firestore.rules` were crawlable | `Disallow`d in `robots.txt` |
| No visible focus ring | `:focus-visible` outline in brand green |

Nothing else in the audit is outstanding. Remaining items are **account-side, not code**:
Search Console verification, sitemap submission, and the www-redirect (a Vercel Domains setting).
