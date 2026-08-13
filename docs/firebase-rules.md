# Maatram — class-code join fix (permission-denied)

## What was broken
Signing in, picking **Student** (or **Parent**), entering a real teacher-made
class code, and pressing **Join** returned:

> Could not check that code: permission-denied

The class code was fine. The class document read was fine. The write that
failed was the very next line — saving `role` + `classCode` onto your own
`users/{uid}` document.

## Root cause
In `firestore.rules`, the normal-user update branch started with:

    old().banned != true

In Firestore Security Rules, reading a field that does **not exist** on the
document is an evaluation **error**, not `undefined`. Almost no user document
has a `banned` field — it is only written by the admin console when someone is
actually banned. So for every normal user that expression threw, the whole
`allow update` branch was denied, and the client saw `permission-denied`.

The same missing-field pattern also sat in the monthly-roll branch
(`old().cycle`, `old().points`).

Teacher **Create class** looked like it half-worked for the same reason: the
`classes/{code}` document was written first and succeeded, then the teacher's
own profile write hit the same denial — which is why real codes existed in the
database that nobody could join.

## The fix
`firestore.rules` now uses defaulted reads:

| before                                             | after                                                        |
|----------------------------------------------------|--------------------------------------------------------------|
| `old().banned != true`                             | `old().get('banned', false) != true`                          |
| `neu().cycle != old().cycle`                       | `neu().cycle != old().get('cycle', '')`                       |
| `... + old().points`                               | `... + old().get('points', 0)`                                |

No permission was widened. Bans, the +100 per-write cap, the 3000 monthly
ceiling, the locked moderation fields and the admin overrides are all unchanged
— they simply evaluate now instead of erroring.

`roles.html` additionally stops hiding the real failure: the profile write has
its own catch, and `permission-denied` now reads
"the database rules need publishing" instead of blaming the class code.

## YOU MUST DO THIS — the code change alone does nothing
`firestore.rules` is **not** deployed by pushing to GitHub or Vercel.

1. Firebase console -> project **maatram-859f4**
2. Firestore Database -> **Rules** tab
3. Paste the contents of `firestore.rules` from this zip
4. Press **Publish**

Until you press Publish, joining will keep failing.

## Files in this zip (all flat — upload to the repo root)
- `firestore.rules`  — the actual fix
- `roles.html`       — clearer errors on the join screen
- `test-admin.js`    — 2 assertions updated to the new rule text
- `test-sports.js`   — 3 stale assertions updated (they still checked the
                       pre-admin `+ 200` cap and the old rule wording; they
                       were already failing before this change)

## Test results
    test-roles.js    59/59
    test-gate.js     63/63
    test-admin.js    55/55
    test-sports.js   152/152
    test-download.js 54/54

`test-site.js` still fails — it looks for `downloads/maatram-v1.0.apk`, a folder
you deliberately flattened away. Unrelated to this fix; say the word and I will
retarget it.
