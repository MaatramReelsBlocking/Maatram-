# Contributing to Maatram

Thanks for looking. Maatram is a student project that real students use, so the bar is
"does this help someone spend less time on their phone", not "is this clever".

## Before you write code

- Open an issue first for anything bigger than a typo. It saves you building something
  that doesn't fit.
- Check the `good first issue` label if you're new here.
- Say which page you're touching. Each page is a flat file and mostly self-contained.

## Ground rules

**No build step.** Every page must still open by double-clicking it from `file://`. If
your change needs bundling, transpiling, or `npm run` to view, it's the wrong change.

**No new dependencies without a reason in the issue.** The stack is vanilla HTML, CSS and
JavaScript on purpose. If the browser already does it, use the browser.

**Don't touch the minified theme.** Edit `theme.src.js` and re-minify. Editing `theme.js`
directly gets overwritten.

**Keep the points economy consistent.** Points are written from several pages. If you
change an award or a penalty, change it everywhere and update the table in the README.

**Never commit secrets.** No API keys, no service-account JSON, no keystore files. Firebase
web config is public by design; anything else is not.

**Mind the accessibility service.** The Android blocker is the most sensitive part of the
codebase. Changes there can silently stop blocking working. Test on a real device and say
which one in the pull request.

## Making the change

1. Fork, then branch: `git checkout -b fix/short-description`
2. Make the smallest change that fixes the thing.
3. Run the tests:
   ```bash
   node test-roles.js
   node test-gate.js
   ```
4. Check the page at 375px, 768px and 1280px, and with the browser's
   reduced-motion setting turned on.
5. Commit with a plain message: `fix: study room timer drifts after resume`

## Pull requests

Fill in the template. The parts that matter:

- What broke or what's new, in one sentence.
- Which pages you opened and checked.
- Which device or browser you tested on.
- A before/after screenshot for anything visual.

Small pull requests get reviewed. Large ones sit.

## Reporting bugs

Use the bug template. A bug report without the device, the browser and the steps is a
guess, and guesses take three rounds to resolve.

## Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Short version: this project is run by school
students and used by school students. Behave accordingly.
