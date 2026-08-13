# Maatram website — v1.0 APK

Everything is flat. No subfolders. Select all files in this folder and drop them into
the GitHub repo root, commit, done.

## What was wrong

`download.html` pointed at `downloads/maatram-v1.0.apk`, but the APK was uploaded to
the repo root as `Maatram v1.apk` — the `downloads/` folder never existed. The button
hit a 404, Chrome said "File wasn't available on site", and the size chip read 0.00 MB
because the live size probe was measuring the 404 page instead of the APK.

## Fixed

- APK now lives in the repo root as `maatram-v1.0.apk` (no space in the name)
- The Download button is a plain link straight to it — nothing else, no JS
- The size probe is gone; the page states 2.86 MB as a fact
- `download.html` now uses the exact same top nav as every other page (same markup,
  same CSS, same sign-in chip), so it matches in Neon and in Minimal Glass
- "Get the app" is the active nav item on that page
- `vercel.json`: `.apk` served as `application/vnd.android.package-archive`, plus
  redirects so `/get`, `/maatram.apk` and the old `/downloads/...` paths still work

Delete the old `Maatram v1.apk` from GitHub when you upload — it is the same binary
under a name with a space in it, and nothing links to it any more.

## Check after pushing

    https://maatram-website.vercel.app/download.html   -> loads
    click Download APK                                 -> 2.86 MB file, no error

APK: com.maatram.app 1.0, 2 995 466 bytes, Android 5.1+, release-signed, not debuggable
sha256 1bd438d9c296af15f5e47e3240cf988af149a4c2592b71502fb599e0a318ed98

Check any future build first:  python3 preflight.py app-release.apk
