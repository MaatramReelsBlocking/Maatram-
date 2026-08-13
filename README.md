# Maatram

**Action ⟹ Value**

Maatram is an open-source tool that helps students cut their own screen time — not by
nagging them, but by putting friction, points and other people between them and the app
they were about to open.

It started as a school business project at SSVM School of Excellence (class 10B, team of
five) and now runs as a live website and an Android app.

- **Live:** https://maatram-website.vercel.app
- **Contact:** maatram97@gmail.com
- **Discord:** https://discord.gg/qdbK2VgjV

---

## Who it is for

| Role | What they get |
|---|---|
| Students | Timers, app blocking, study rooms, points, streaks, screen-time stats |
| Teachers | A class code, a live roster, and their students' productivity points |
| Parents | A read-only view of one child in a class they've joined |

---

## What it does

**App Gate + friction layer.** Opening Instagram, TikTok, Snapchat, YouTube, Facebook, X or
Reddit goes through a gate first: an escalating points toll per app per day, a dwell timer
that doubles with each approved open in the last hour, an intent meter (why are you opening
this, and for how long), a peer veto that lets study-room members add to your wait, and a
"was it worth it?" receipt the next time you try. Walking away pays you points back.

**Hard Lock.** Pick 5–90 minutes. On Android the block is enforced natively by an
accessibility service; the lock is written to `SharedPreferences`, so it survives the app
being killed and expires on its own.

**Timers.** Pomodoro 25/5 and Deep Work 90/15, wall-clock based so background throttling
can't cheat them. Wake lock, haptics, and a power-up screen at the end of each session.

**Study rooms.** Up to five people share a room code and sync over a public
MQTT-over-WebSocket broker — no backend required. Timers, strikes, joins, leaves and chat
are all live. If someone opens a blocked app, everyone sees it.

**Stats.** Manual per-app entry, saved locally, charted per app and per week.

**Leaderboard + accounts.** Google sign-in via Firebase, real users only — no seeded
placeholder accounts.

---

## Points economy

| Event | Points |
|---|---|
| Hard Lock completed | +10 per 5 minutes |
| Study-room session past 10 minutes | +10 |
| Walking away from the gate | +2 (max 3 per day) |
| Opening a social app through the gate | −10 |
| Friction toll, 1st–4th open of an app that day | −5 / −15 / −30 / −50 |
| Three strikes in a study room | points reduced |

All writes are clamped to +200 / −100 per event with a floor of 0.

---

## Stack

Plain HTML, CSS and vanilla JavaScript — no framework, no build step. Each page is a flat
file you can open directly.

- **Auth + database:** Firebase (Google sign-in, Firestore)
- **Hosting:** Vercel
- **Study-room sync:** public MQTT broker over WebSocket
- **Android:** Capacitor wrapper, `com.maatram.app`
- **Native blocking:** Java `AccessibilityService` ("Maatram Shield") + a Capacitor plugin bridge
- **Theming:** shared `theme.js`, two skins (neon / minimal glass), stored in `localStorage`

---

## Repository layout

```
index.html         landing page + intro
timers.html        Pomodoro and Deep Work
app-gate.html      App Gate, friction layer, Hard Lock
study-room.html    5-person synced rooms
stats.html         screen-time entry and charts
leaderboard.html   ranking by productivity points
login.html         Google sign-in
roles.html         persona picker, class codes, parental controls
socials.html       links and contact
theme.js           shared theme engine (edit theme.src.js, not the minified file)
gate.js            auth guard for the app pages
firestore.rules    database rules — must be published in the Firebase console
android/           Capacitor Android project
```

---

## Running it locally

No install, no server needed for the front end:

```bash
git clone https://github.com/MaatramReelsBlocking/Maatram-.git
cd Maatram-
open index.html          # or just double-click it
```

Sign-in, the leaderboard and cross-device sync need Firebase configured (below). Everything
else — timers, the gate, stats — works offline against `localStorage`.

### Firebase

1. Create a Firebase project and enable **Google** under Authentication → Sign-in method.
2. Enable **Firestore**.
3. Add your domain under Authentication → Settings → Authorized domains, or sign-in fails
   with `auth/unauthorized-domain`.
4. Publish `firestore.rules` in the console. The rules in this repo are the ones the app
   expects; the console does not pick them up automatically.
5. Drop your own web config into the pages' Firebase init block.

### Android

```bash
npm install
npx cap sync android
```

Then open `android/` in Android Studio and run.

- Add the Android app to Firebase with package `com.maatram.app` and the SHA-1 from
  `./gradlew signingReport`, or Google sign-in will fail on device.
- `android/` and `node_modules/` must stay siblings — the Capacitor plugin modules are
  resolved by relative path.
- Unzip or check out into an **empty** folder. Stale generated resource files from an older
  build cause duplicate-resource errors.
- On the phone, enable **Maatram Shield** once under Settings → Accessibility. On Android 13+
  a sideloaded build is blocked by "restricted settings" first: Settings → Apps → Maatram →
  ⋮ → Allow restricted settings.
- For sharing builds, use a release-signed APK. A debug build with `debuggable=true` plus an
  accessibility service is blocked by Play Protect.

---

## Tests

The test suites run against jsdom with a fake MQTT broker and per-device storage, so
multi-user study-room behaviour can be exercised without any network.

```bash
node test-roles.js
node test-gate.js
```

---

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues are labelled `good first issue`.
The short version: no build step, no new dependencies without a reason, and every change
should still open from `file://`.

## Security

Found something that could hurt users? See [SECURITY.md](SECURITY.md). Please don't open a
public issue for it.

## License

MIT — see [LICENSE](LICENSE).

## Links

Instagram [@maatram_360](https://www.instagram.com/maatram_360/) ·
X [@Maatram_360](https://x.com/Maatram_360) ·
[LinkedIn](https://www.linkedin.com/in/maatram-exe-10b295423/) ·
[Discord](https://discord.gg/qdbK2VgjV)
