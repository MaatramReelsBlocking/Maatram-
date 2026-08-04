# Maatram website — v1.0 APK release

Full site. Every file here replaces what is in the repo now.

## What was actually broken

`download.html` was in the repo root and linked to `/downloads/maatram.apk`, but the
APK had been dropped at the root as `maatram.apk` — the `downloads/` folder never
existed. Page loaded, download 404'd, and nothing on the site linked to the page.
Separately, that APK was the debug build (3 819 077 B, `CN=Android Debug`,
`debuggable="true"`) which Play Protect blocks on install.

## Deploy

Unzip into an empty folder, copy everything over your repo, then:

    git rm maatram.apk READ-ME.txt vercel-headers-optional.json
    git add -A
    git commit -m "release: Maatram v1.0 APK + download page"
    git push

Vercel auto-deploys. Then check:

    curl -I https://maatram-website.vercel.app/download.html          # 200
    curl -I https://maatram-website.vercel.app/downloads/maatram-v1.0.apk
      # 200, content-length: 2995466,
      # content-type: application/vnd.android.package-archive

If the first one 404s, the push did not reach the branch Vercel builds — check
Vercel > Deployments that the source says GitHub and the production branch matches.

## What changed

    + download.html                        rebuilt, 21.8 KB, self-contained
    + downloads/maatram-v1.0.apk           the release build (2.86 MB)
    + downloads/maatram-v1.0.apk.sha256
    - maatram.apk                          debug build, deleted
    - READ-ME.txt                          stale instructions, deleted
    - vercel-headers-optional.json         merged into vercel.json, deleted
    ~ 8 pages                              "Get the app" added to the nav
    ~ index.html                           footer link under Project
    ~ sitemap.xml                          download.html added, lastmod bumped
    ~ vercel.json                          APK headers + 3 redirects

Redirects, so no shared link dies: `/get`, `/maatram.apk` and
`/downloads/maatram.apk` all land on `/downloads/maatram-v1.0.apk`.

## The APK

    package     com.maatram.app          version 1.0 (code 1)
    size        2 995 466 bytes          Android 5.1+ (API 22), built to 34
    signing     release key, v1 + v2     CN=Ram Saravanan, cert valid to 2051
    debuggable  false
    sha256      1bd438d9c296af15f5e47e3240cf988af149a4c2592b71502fb599e0a318ed98

One warning, not a blocker: no v3 signature scheme. Installs fine; it only means
you cannot rotate the signing key later. Keep the keystore and its password safe —
lose it and you can never ship an update to anyone who installed this build.

## Checks

    node tests/test-site.js       23 checks — links, nav, sitemap, headers, APK identity
    node tests/test-download.js   53 checks — page facts match the real binary

Both green. For any future build, gate it first:

    python3 tools/preflight.py app-release.apk

It reads the APK manifest and signing block directly (no Android SDK) and prints
PASS or FAIL. It fails the old debug APK on both counts.

## On the phone, before you share it

1. Install on a phone that never had Maatram; if it had one, uninstall first
2. `sha256` of the downloaded file matches the hash above
3. Settings > Accessibility > Maatram Shield turns on
   (Android 13+: Settings > Apps > Maatram > tap the three dots >
   Allow restricted settings, first)
4. Start a 5-minute Hard Lock, open YouTube — it should bounce you home
