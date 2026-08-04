/* Whole-site integrity checks — run: node tests/test-site.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) pass++;
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
};

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
ok('download.html shipped', pages.includes('download.html'));
ok('all pages present', pages.length === 11, pages.join(','));  // 8 site pages + 404 + auth-bridge + download

/* ---- the bug that broke the last deploy ---- */
ok('release APK sits in downloads/', fs.existsSync(path.join(ROOT, 'downloads/maatram-v1.0.apk')));
ok('old debug APK removed from repo root', !fs.existsSync(path.join(ROOT, 'maatram.apk')));
const apk = fs.readFileSync(path.join(ROOT, 'downloads/maatram-v1.0.apk'));
ok('APK is the 2.86 MB release build', apk.length === 2995466, String(apk.length));
const hash = crypto.createHash('sha256').update(apk).digest('hex');
ok('sidecar hash matches',
  fs.readFileSync(path.join(ROOT, 'downloads/maatram-v1.0.apk.sha256'), 'utf8').startsWith(hash));
ok('page shows the same hash',
  fs.readFileSync(path.join(ROOT, 'download.html'), 'utf8').includes(hash));

/* ---- every internal link on every page resolves ---- */
const broken = [];
for (const p of pages) {
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const dom = new JSDOM(html);
  const refs = [...dom.window.document.querySelectorAll('a[href], link[href], img[src], script[src]')]
    .map(e => e.getAttribute('href') || e.getAttribute('src'))
    .filter(h => h && !/^(https?:|mailto:|data:|#|maatram:)/.test(h))
    .map(h => h.split(/[?#]/)[0]);
  for (const r of refs) {
    const target = r.startsWith('/') ? path.join(ROOT, r.slice(1)) : path.join(ROOT, r);
    if (!fs.existsSync(target)) broken.push(p + ' -> ' + r);
  }
}
ok('no broken internal links anywhere', broken.length === 0, broken.join(' | '));

/* ---- nav + footer wiring ---- */
const navPages = ['index.html', 'timers.html', 'app-gate.html', 'study-room.html',
  'stats.html', 'leaderboard.html', 'socials.html', 'login.html'];
const missingNav = navPages.filter(p =>
  !fs.readFileSync(path.join(ROOT, p), 'utf8').includes('href="download.html"'));
ok('every page links to the download page', missingNav.length === 0, missingNav.join(','));
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
ok('home footer links to it too', /Download the Android app/.test(idx));
ok('nav link added exactly once per page', navPages.every(p =>
  (fs.readFileSync(path.join(ROOT, p), 'utf8').match(/href="download\.html"/g) || []).length ===
  (p === 'index.html' ? 2 : 1)));

/* ---- no stale references to the old file name ---- */
/* vercel.json legitimately names the old path as a redirect SOURCE - excluded */
const stale = pages.concat(['sitemap.xml', 'robots.txt'])
  .filter(f => /(^|[\/"'])maatram\.apk/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
ok('nothing still points at maatram.apk', stale.length === 0, stale.join(','));

/* ---- sitemap ---- */
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
ok('sitemap lists the download page', sm.includes('/download.html'));
const locs = [...sm.matchAll(/<loc>https:\/\/maatram-website\.vercel\.app\/([^<]*)<\/loc>/g)]
  .map(m => m[1]).filter(Boolean);
ok('every sitemap URL is a file that exists',
  locs.every(l => fs.existsSync(path.join(ROOT, l))),
  locs.filter(l => !fs.existsSync(path.join(ROOT, l))).join(','));
ok('login.html not in sitemap', !sm.includes('login.html'));

/* ---- vercel.json ---- */
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const apkRule = cfg.headers.find(h => /apk/.test(h.source));
ok('apk Content-Type header configured',
  !!apkRule && apkRule.headers.some(h => h.value === 'application/vnd.android.package-archive'));
ok('apk served as an attachment',
  !!apkRule && apkRule.headers.some(h => h.key === 'Content-Disposition'));
ok('legacy /maatram.apk redirect present',
  (cfg.redirects || []).some(r => r.source === '/maatram.apk'));
ok('/get short link present', (cfg.redirects || []).some(r => r.source === '/get'));
ok('all redirects target the real file',
  (cfg.redirects || []).every(r => fs.existsSync(path.join(ROOT, r.destination.slice(1)))));

/* ---- housekeeping ---- */
ok('stale kit README removed from web root', !fs.existsSync(path.join(ROOT, 'READ-ME.txt')));
ok('optional-headers stub removed',
  !fs.existsSync(path.join(ROOT, 'vercel-headers-optional.json')));
ok('theme.js still present for all pages', fs.existsSync(path.join(ROOT, 'theme.js')));

console.log('\n  ' + pass + ' passed, ' + fail + ' failed   (site integrity)');
process.exit(fail ? 1 : 0);
