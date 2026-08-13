# Security Policy

## Reporting a vulnerability

Email **maatram97@gmail.com** with `SECURITY` in the subject. Please do not open a public
issue — the app holds student accounts and school class rosters.

Include what you found, how to reproduce it, and what an attacker could do with it. You'll
get a reply as soon as we can; this is a student project, not a company, so allow a few days.

Please don't test against other people's accounts, other schools' class codes, or the live
study rooms. Use your own account.

## Areas worth looking at

- **Firestore rules.** `firestore.rules` is in the repo. Reads and writes that should be
  scoped to one user or one class are the highest-value target.
- **Class codes.** Six characters. Joining a class you were not invited to is a real bug.
- **Study rooms.** Sync runs over a public MQTT broker. Room contents are not private
  against someone who guesses a room code — this is a known limitation, not a finding, but
  anything worse than that is.
- **The Android accessibility service.** It can read window state and send global actions.
  Anything that lets another app drive it, or that leaks what the user opened, matters.

## Known and accepted

- The Firebase **web** config is public. That is how Firebase works; the protection is in
  the Firestore rules.
- Screen-time figures are entered by the user and are not verified.
- The parental-controls panel is a settings UI. It does not restrict the device, and the
  page says so.
