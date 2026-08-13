# Maatram docs

Operational notes for the site and the app. Start at the root [README](../README.md) for
what Maatram is and how to run it.

| Doc | What it covers |
|---|---|
| [seo.md](seo.md) | The SEO pack — metadata, schema, sitemap, robots, icons, security headers, and the four post-deploy checks (Search Console, Bing, Rich Results, OG preview). Also explains why you edit `theme.src.js` and not `theme.js`. |
| [firebase-rules.md](firebase-rules.md) | The class-code `permission-denied` bug and its fix. Read this before touching `firestore.rules` — in Firestore rules, reading a field that does not exist is an error, not `undefined`, so always use `get('field', default)`. |
| [apk-release.md](apk-release.md) | How the APK is served — `vercel.json` content type, the redirects for `/get` and the old `/downloads/` paths, and checking a build with `preflight.py`. |

## The one thing people forget

`firestore.rules` is **not** deployed by pushing to GitHub or Vercel. It only takes effect
when you paste it into the Firebase console and press **Publish**. Every rules change needs
that step.
