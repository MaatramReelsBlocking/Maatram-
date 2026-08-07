/* Maatram Module 6 checks — Sports Corner + monthly leaderboard cycle.
   run:  node test-sports.js          (needs jsdom) */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : (fail++, console.log('  FAIL  ' + name)); };
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

const PAGES = ['index.html','timers.html','app-gate.html','study-room.html','stats.html',
               'leaderboard.html','sports.html','socials.html','download.html','roles.html','login.html'];

/* ── 1. file exists, parses, no duplicate ids ── */
const sports = read('sports.html');
const dom = new JSDOM(sports, { runScripts: 'outside-only' });
const D = dom.window.document;

ok('sports.html parses', !!D.querySelector('body'));
const ids = [...D.querySelectorAll('[id]')].map(e => e.id);
ok('no duplicate ids', new Set(ids).size === ids.length);
ok('single h1', D.querySelectorAll('h1').length === 1);
ok('canonical set', /canonical" href="https:\/\/maatram-website\.vercel\.app\/sports\.html/.test(sports));
ok('og:url set', /og:url" content="https:\/\/maatram-website\.vercel\.app\/sports\.html/.test(sports));
ok('title present', (D.title || '').includes('Sports'));
ok('meta description present', !!D.querySelector('meta[name="description"]'));

/* ── 2. shared shell ── */
ok('loads theme.js', /<script src="theme\.js"><\/script>/.test(sports));
ok('loads gate.js (page is gated)', /<script src="gate\.js"><\/script>/.test(sports));
ok('gate.js comes after theme.js',
   sports.indexOf('src="gate.js"') > sports.indexOf('src="theme.js"'));
ok('has #mnav', !!D.getElementById('mnav'));
ok('nav marks Sports active', !!D.querySelector('#mnav a.mn-link.active[href="sports.html"]'));
ok('has perf toggle', !!D.getElementById('perfBtn'));
ok('has perf head script', /window\.MAATRAM_PERF/.test(sports));
ok('has skip link', !!D.querySelector('a.skip-link[href="#main"]'));
ok('main landmark', !!D.querySelector('#main[role="main"]'));
ok('reduced-motion path', /prefers-reduced-motion/.test(sports));
ok('overflow-x clip (Android WebView scroll fix)', /overflow-x:clip/.test(sports));

/* ── 3. every page links to Sports exactly once in the nav ── */
PAGES.forEach(f => {
  const d = new JSDOM(read(f)).window.document;
  const links = d.querySelectorAll('#mnav a[href="sports.html"]');
  ok('nav link on ' + f, links.length === 1);
});

/* ── 4. filters / selector ── */
['fCity','fSport','fWhen','fQ','locBtn','grid','empty','count'].forEach(id =>
  ok('#' + id + ' exists', !!D.getElementById(id)));
ok('city select is native', D.getElementById('fCity').tagName === 'SELECT');
ok('date filter is native select', D.getElementById('fWhen').tagName === 'SELECT');
ok('search is text input', D.getElementById('fQ').getAttribute('type') === 'text');
ok('no geocoding API call', !/geocod|mapbox|googleapis\.com\/maps|opencage|nominatim/i.test(sports));
ok('uses browser geolocation', /navigator\.geolocation/.test(sports));
ok('nearest-city table present', /const CITIES=\[/.test(sports));
ok('Coimbatore in city table', /'Coimbatore',11\.0168/.test(sports));
ok('sport list present', /const SPORTS=\[/.test(sports));

/* ── 5. register goes OUT to the organiser, never in-platform ── */
ok('register link is external anchor', /target="_blank" rel="noopener noreferrer nofollow"/.test(sports));
ok('register label names the organiser', /Register on organiser site/.test(sports));
ok('http(s) scheme validated before rendering a link', /\^https:\\\/\\\/\|\^http:\\\/\\\//.test(sports));
ok('no in-platform registration write', !/addDoc\([^)]*'registrations'|attendees/.test(sports));
ok('no points awarded on this page', !/maatramAddPoints|maatramAward|increment\(/.test(sports));
ok('no-link fallback state', /No official link given/.test(sports));

/* ── 6. add-event form ── */
['aTitle','aSport','aCity','aDate','aVenue','aOrg','aUrl','aBtn','addMsg'].forEach(id =>
  ok('#' + id + ' exists', !!D.getElementById(id)));
ok('url field typed url', D.getElementById('aUrl').getAttribute('type') === 'url');
ok('date field typed date', D.getElementById('aDate').getAttribute('type') === 'date');
ok('writes to events collection', /collection\(db,'events'\)/.test(sports));
ok('stamps author uid', /ev\.by=me\.uid/.test(sports));
ok('rejects non-http link', /The link must start with https/.test(sports));
ok('requires sign-in to publish', /Sign in first, then publish/.test(sports));

/* ── 7. no invented content (website-strict) ── */
ok('no seeded fake events', !/SEED|dummyEvents|sampleEvents/.test(sports));
ok('empty state instead of filler', /Nothing listed here yet/.test(sports));

/* ── 8. gate.js monthly roll ── */
const gate = read('gate.js');
ok('gate has cycleId', /function cycleId\(/.test(gate));
ok('gate has roll()', /async function roll\(/.test(gate));
ok('roll archives to m_<cycle>', /patch\['m_'\+d\.cycle\] = pts/.test(gate));
ok('roll zeroes points', /patch\.points\s*=\s*0/.test(gate));
ok('roll accumulates lifetime', /patch\.lifetime = life\+pts/.test(gate));
ok('first run adopts instead of wiping', /first ever run: adopt/.test(gate));
ok('roll skipped when cycle current', /if\(d\.cycle===now\) return;/.test(gate));
ok('roll never blocks the page', /catch\(e\)\{ \}\s*\/\* never block/.test(gate));
ok('roll called after role check', gate.indexOf('await roll(') > gate.indexOf("if(!d.role)"));
ok('no cron / no server key in gate', !/firebase-admin|serviceAccount/i.test(gate));

/* behavioural test of the roll logic, lifted out of gate.js */
(function () {
  const cycleId = dt => dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2);
  function rollCalc(d, now) {
    if (d.cycle === now) return null;
    const pts = d.points || 0, life = d.lifetime || 0, patch = { cycle: now };
    if (!d.cycle) { patch.lifetime = life > pts ? life : pts; }
    else { patch.lifetime = life + pts; patch.points = 0; patch['m_' + d.cycle] = pts; }
    return patch;
  }
  ok('cycleId formats YYYY-MM', cycleId(new Date(2026, 7, 7)) === '2026-08');
  ok('cycleId pads month', cycleId(new Date(2026, 0, 1)) === '2026-01');

  const same = rollCalc({ cycle: '2026-08', points: 40 }, '2026-08');
  ok('same month = no write', same === null);

  const first = rollCalc({ points: 120 }, '2026-08');
  ok('migration keeps points', first.points === undefined);
  ok('migration seeds lifetime', first.lifetime === 120);
  ok('migration sets cycle', first.cycle === '2026-08');

  const rolled = rollCalc({ cycle: '2026-07', points: 90, lifetime: 300 }, '2026-08');
  ok('new month zeroes points', rolled.points === 0);
  ok('new month adds to lifetime', rolled.lifetime === 390);
  ok('new month archives old total', rolled['m_2026-07'] === 90);

  const zero = rollCalc({ cycle: '2026-07', points: 0, lifetime: 10 }, '2026-08');
  ok('zero-point month still rolls', zero.cycle === '2026-08' && zero.lifetime === 10);
})();

/* ── 9. leaderboard tabs ── */
const lb = read('leaderboard.html');
const L = new JSDOM(lb).window.document;
ok('tabMonth exists', !!L.getElementById('tabMonth'));
ok('tabLife exists', !!L.getElementById('tabLife'));
ok('cycleNote exists', !!L.getElementById('cycleNote'));
ok('tablist role', !!L.querySelector('.tabs[role="tablist"]'));
ok('month tab selected by default', L.getElementById('tabMonth').getAttribute('aria-selected') === 'true');
ok('tabs are 44px+ targets', /\.tabs button\{min-height:44px/.test(lb));
ok('one read feeds both boards', (lb.match(/onSnapshot\(query\(collection\(db,'users'\)/g) || []).length === 1);
ok('all time = lifetime + this month', /lifetime\|\|0\)\+\(v\.points\|\|0\)/.test(lb));
ok('month board is raw points', /cloudUsers\.push\(\{\.\.\.base,points:v\.points\|\|0\}\)/.test(lb));
ok('both boards sorted client-side', /cloudUsers\.sort\(/.test(lb) && /cloudLife\s*\.sort\(/.test(lb));
ok('render picks source by tab', /TAB==='month'\?cloudUsers:cloudLife/.test(lb));
ok('setTab wired to buttons', /\$\('tabLife'\)\.onclick=\(\)=>setTab\('life'\)/.test(lb));
ok('reset date shown to users', /scores archive and reset on/.test(lb));
ok('leaderboard nav still marks itself active', !!L.querySelector('#mnav a.mn-link.active[href="leaderboard.html"]'));

/* ── 10. firestore rules ── */
const rules = read('firestore.rules');
ok('events block present', /match \/events\/\{id\}/.test(rules));
ok('events readable when signed in', /allow read:\s+if request\.auth != null;/.test(rules));
ok('events created only by author', /request\.resource\.data\.by == request\.auth\.uid/.test(rules));
ok('events edited only by author', /resource\.data\.by == request\.auth\.uid/.test(rules));
ok('event title length capped', /title\.size\(\) <= 80/.test(rules));
ok('reset branch allows zeroing', /request\.resource\.data\.points == 0/.test(rules));
ok('reset branch requires a cycle change', /request\.resource\.data\.cycle != resource\.data\.cycle/.test(rules));
ok('normal caps still enforced', /resource\.data\.points \+ 200/.test(rules));
ok('classes block untouched', /match \/classes\/\{code\}/.test(rules));

/* ── 11. flat delivery (he uploads to the repo root) ── */
const files = fs.readdirSync(__dirname).filter(f => f !== 'node_modules' && f !== 'package.json' && f !== 'package-lock.json');
ok('no subfolders in package', files.every(f => !fs.statSync(path.join(__dirname, f)).isDirectory()));

/* ── 12. coach's corner ── */
ok('coach section exists', !!D.getElementById('coach'));
ok('coach list exists', !!D.getElementById('coachList'));
ok('coach heading labelled', D.getElementById('coach').getAttribute('aria-labelledby') === 'coachH');
ok('COACH data present', /const COACH=\{/.test(sports));
ok('renderCoach called on load', /boot\(\);\nrender\(\);\nrenderCoach\(\);/.test(sports));
ok('sport filter refreshes notes', /if\(id==='fSport'\)\{renderCoach\(\);\}/.test(sports));
ok('no invented attributions', !/\u2014 [A-Z][a-z]+ [A-Z][a-z]+, (coach|player)/.test(sports));
ok('notes are inserted as text, not HTML', /li\.textContent=t/.test(sports));
(function () {
  const m = sports.match(/const COACH=\{[\s\S]*?\n\};/);
  ok('COACH block parses', !!m);
  const COACH = m ? new Function('return ' + m[0].replace(/^const COACH=/, '').replace(/;$/, ''))() : {};
  const sportList = (sports.match(/const SPORTS=\[([\s\S]*?)\];/) || [,''])[1]
    .split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
  ok('every sport has notes', sportList.every(s => Array.isArray(COACH[s])));
  ok('exactly five notes per sport', Object.values(COACH).every(v => v.length === 5));
  ok('no empty notes', Object.values(COACH).every(v => v.every(t => t.length > 20)));
  ok('Badminton covered', !!COACH['Badminton']);
  ok('Tennis covered', !!COACH['Tennis']);
  ok('fallback bucket covered', !!COACH['Other']);
})();

/* ── 13. teachers and parents are off the board ── */
ok('competes() helper exists', /function competes\(v\)/.test(lb));
ok('missing role still competes', /!v\.role \|\| v\.role==='student'/.test(lb));
ok('board read filters non-students', /if\(!competes\(v\)\)return;[\s\S]{0,200}cloudUsers\.push/.test(lb));
ok('same filter covers the all-time board', /if\(!competes\(v\)\)return;[\s\S]{0,200}cloudLife\s*\.push/.test(lb));
ok('fetch window widened past the 50 shown', /limit\(300\)/.test(lb));
ok('still shows only 50', /cloudUsers=cloudUsers\.slice\(0,50\)/.test(lb) && /cloudLife\s*=cloudLife\s*\.slice\(0,50\)/.test(lb));
/* -- 14. author/admin removal + sticky filters (Aug 7 round) -- */
ok('remove button styled', /\.ev \.rm\{/.test(sports));
ok('author uid carried into the list', /by:v\.by\|\|''/.test(sports));
ok('board re-renders when auth resolves', /onAuthStateChanged\(U\.getAuth\(app\),u=>\{me=u;render\(\);\}\)/.test(sports));
ok('remove shown only to the Maatram account', /me&&db&&api&&\(me\.email\|\|''\)\.toLowerCase\(\)===ADMIN_EMAIL/.test(sports));
ok('admin address is the Maatram inbox', /ADMIN_EMAIL='maatram97@gmail\.com'/.test(sports));
ok('removal needs a second tap', /Tap again to remove/.test(sports));
ok('removal calls deleteDoc on the doc id', /api\.deleteDoc\(api\.doc\(db,'events',e\.id\)\)/.test(sports));
ok('failed removal is reported, not swallowed', /Could not remove: /.test(sports));
ok('geolocation no longer overwrites a touched add-form city', /if\(!addTouched\)\$\('aCity'\)\.value=city/.test(sports));
ok('add-form selects track their own edits', /\['aCity','aSport'\]\.forEach/.test(sports));
ok('sport filter remembered', /localStorage\.setItem\('maatram_sport'/.test(sports));
ok('when filter remembered', /localStorage\.setItem\('maatram_when'/.test(sports));
ok('saved filters restored on load', /maatram_sport'\);[\s\S]{0,120}getItem\('maatram_when'/.test(sports));
ok('publish snaps the filter onto the new event', /\$\('fSport'\)\.value=ev\.sport; \$\('fWhen'\)\.value='up'/.test(sports));
ok('publish message names where it went', /Filter moved to '\+ev\.sport/.test(sports));

ok('viewer notice markup', !!L.getElementById('watchNote'));
ok('viewer notice hidden by default', L.getElementById('watchNote').hasAttribute('hidden'));
ok('notice waits for gate.js role', /MutationObserver[\s\S]{0,200}data-role/.test(lb));
ok('notice only for teacher or parent', /r!=='teacher'&&r!=='parent'/.test(lb));

console.log('\n' + pass + '/' + (pass + fail) + ' checks pass' + (fail ? '  — ' + fail + ' FAILED' : ''));
process.exit(fail ? 1 : 0);
