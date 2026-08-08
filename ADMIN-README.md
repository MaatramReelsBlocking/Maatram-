# Maatram — admin console + anti-cheat drop

All files are flat. Upload every one of them to the repo root (shift-select), same as usual.

| File | What it is |
|---|---|
| `admin.html` | NEW. The admin console. Opens only for the admin email. |
| `firestore.rules` | REPLACES the old one. The actual cheat fix + admin powers. |
| `gate.js` | REPLACES. Now enforces ban and kick on every gated page. |
| `leaderboard.html` | REPLACES. Banned accounts drop off the board. |
| `test-admin.js` | 43 checks. `node test-admin.js` (needs jsdom). |

## Step 1 — publish the rules (this is the real fix)

Uploading the file to GitHub does **nothing** on its own. Firestore rules only take
effect when they are published in the Firebase console:

Firebase console → project `maatram-859f4` → Build → Firestore Database → **Rules** tab
→ paste the whole contents of `firestore.rules` → **Publish**.

Until you press Publish, the old rules are still live and the cheat still works.

## Step 2 — open the console

`https://maatram-website.vercel.app/admin.html`

There is no link to it anywhere on the site, and it is marked `noindex`. Sign in with
the admin account. Any other account sees "This page is for Maatram admins only."

## Admin account

The admin address is `maatram97@gmail.com`. It is listed in two places and both must
match:

1. `admin.html` → `const ADMINS = ['maatram97@gmail.com'];` — controls the page
2. `firestore.rules` → `isAdmin()` — controls what the database will accept

If the account you sign in with is a different address, change it in **both** files,
then re-publish the rules.

## What the ban actually does

`banned: true` on the user document. From then on `gate.js` refuses to open timers,
app gate, study room, stats, leaderboard and sports, signs them out mid-session if
they are already inside, the rules block them from writing points at all, and the
leaderboard skips them.

`kickAt` is a one-shot force sign-out — the account still works, they just get logged
out once. Use it for a live study-room problem.

## Second step — admin passphrase

The passphrase step is **already switched on** in this `admin.html` — your hash is baked in
at `PW_HASH`. Nothing to set up. Sign in, then type your passphrase.

If `make-hash.html` is still sitting in your repo, delete it: open the file on GitHub →
`⋯` menu → **Delete file** → Commit. It is not needed again unless you change the passphrase.

To change the passphrase later, ask me for a fresh `make-hash.html`, or send me the new
64-character hash and I will rebuild this file.

Only the hash is stored, never the passphrase itself. There is no reset — forget it and
you edit `PW_HASH` back to `''`. Extra: a **Lock** button in the header, and the console
locks itself after five minutes of no clicks or keys.

### What this layer really does

It stops someone using **your already-signed-in browser** — a friend on your laptop at
school, a phone you left open. That is the real risk and this closes it.

It does **not** stop someone who reads the page source: the check runs in their browser,
so they can skip it. That does not matter, because skipping it gets them an empty screen —
**every ban, kick and points edit is checked again by `firestore.rules` against the signed-in
email.** A stranger with the file, the hash and the whole source still cannot change one
point. The page is a convenience; the rules are the lock.

The one thing that actually breaks everything is somebody getting into
`maatram97@gmail.com`. Put 2-step verification on that Google account — that is worth more
than any passphrase in this file.

## Honest limit

The rules now cap every single write at +100 points and cap a month at 3000, so one
account can no longer jump to 10,000. What rules **cannot** do on the free Spark plan
is rate-limit: someone patient can still script many small legal writes. Closing that
completely needs a Cloud Function (Blaze plan) or a points timestamp written on every
award. Say the word and I will do the timestamp version — it touches the 5 pages that
award points.
