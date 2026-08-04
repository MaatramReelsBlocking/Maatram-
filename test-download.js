/* Verification suite for download.html — run: node tests/test-download.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'download.html'), 'utf8');
const APK = path.join(ROOT, 'downloads', 'maatram-v1.0.apk');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
};

/* ---------- static file facts ---------- */
const apkBytes = fs.statSync(APK).size;
const apkHash = crypto.createHash('sha256').update(fs.readFileSync(APK)).digest('hex');
const sidecar = fs.readFileSync(APK + '.sha256', 'utf8').trim().split(/\s+/)[0];

ok('APK exists', apkBytes > 0);
ok('sidecar .sha256 matches file', sidecar === apkHash, sidecar);

/* ---------- DOM ---------- */
const errors = [];
const dom = new JSDOM(HTML, {
  runScripts: 'dangerously',
  url: 'https://maatram-website.vercel.app/download.html',
  virtualConsole: new (require('jsdom').VirtualConsole)().on('jsdomError', e => errors.push(e.message))
});
const { window } = dom, doc = window.document;

ok('no script errors on load', errors.length === 0, errors[0]);
ok('has <h1>', doc.querySelectorAll('h1').length === 1);
ok('one inline <style>', doc.querySelectorAll('style').length === 1);
ok('one inline behaviour <script>',
  [...doc.querySelectorAll('script')].filter(s => !s.src && s.type !== 'application/ld+json').length === 1);
ok('theme.js loaded', !!doc.querySelector('script[src="theme.js"]'));

/* ---------- download wiring ---------- */
const dl = doc.getElementById('dlBtn');
ok('download button exists', !!dl);
ok('href points at versioned apk', dl.getAttribute('href') === 'downloads/maatram-v1.0.apk',
  dl && dl.getAttribute('href'));
ok('href resolves to a real file', fs.existsSync(path.join(ROOT, dl.getAttribute('href'))));
ok('download attribute present', dl.hasAttribute('download'));
ok('apk mime type hinted', dl.getAttribute('type') === 'application/vnd.android.package-archive');

/* ---------- facts on the page match the binary ---------- */
const hashText = doc.getElementById('hash').textContent.trim();
ok('page hash == real apk hash', hashText === apkHash, hashText);
ok('spec byte count == real size',
  (doc.getElementById('sizeSpec').textContent.match(/^([\d\s\u00a0]+)bytes/) || [, ''])[1]
    .replace(/[^\d]/g, '') === String(apkBytes));
const mb = (apkBytes / 1048576).toFixed(2);
ok('size chip == real MB', doc.getElementById('sizeChip').textContent.includes(mb), mb);
ok('no stale 3.6 MB figure', !/3\.6\s*MB|3819077/.test(HTML));
ok('no stale /downloads/maatram.apk link', !/downloads\/maatram\.apk/.test(HTML));

/* ---------- JSON-LD ---------- */
const ld = JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent);
ok('JSON-LD is SoftwareApplication', ld['@type'] === 'SoftwareApplication');
ok('JSON-LD fileSize == real size', ld.fileSize === String(apkBytes), ld.fileSize);
ok('JSON-LD downloadUrl matches button', ld.downloadUrl.endsWith('/' + dl.getAttribute('href')));

/* ---------- SEO head ---------- */
ok('canonical present', !!doc.querySelector('link[rel=canonical]'));
ok('meta description present', !!doc.querySelector('meta[name=description]'));
ok('og:title present', !!doc.querySelector('meta[property="og:title"]'));
ok('twitter:card present', !!doc.querySelector('meta[name="twitter:card"]'));
ok('theme-color present', !!doc.querySelector('meta[name=theme-color]'));
ok('title under 60 chars', doc.title.length <= 60, String(doc.title.length));
ok('description under 158 chars',
  doc.querySelector('meta[name=description]').content.length <= 158);

/* ---------- links ---------- */
const internal = [...doc.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))
  .filter(h => h && !/^(https?:|mailto:|#)/.test(h));
ok('every link on the page resolves to a real file in the repo',
  internal.every(h => fs.existsSync(path.join(ROOT, h))),
  internal.filter(h => !fs.existsSync(path.join(ROOT, h))).join(','));
ok('no placeholder href="#" left', ![...doc.querySelectorAll('a')]
  .some(a => a.getAttribute('href') === '#'));

/* ---------- a11y ---------- */
ok('skip link present', !!doc.querySelector('a.skip'));
ok('main landmark present', !!doc.getElementById('main'));
ok('decorative svgs are aria-hidden',
  [...doc.querySelectorAll('svg')].every(s => s.getAttribute('aria-hidden') === 'true'));
ok('progressbar has aria values', (() => {
  const b = doc.getElementById('railBar');
  return b.getAttribute('role') === 'progressbar' && b.hasAttribute('aria-valuemax');
})());
ok('exactly one h1, headings ordered', doc.querySelectorAll('h1').length === 1 &&
  doc.querySelectorAll('h2').length >= 3);
ok('reduced-motion path in CSS', /prefers-reduced-motion:\s*reduce/.test(HTML));
ok('perf-flag static path in CSS', /html\.perf\s+\.rv/.test(HTML));
ok('minimal theme parity rules present', /html\.minimal/.test(HTML));

/* ---------- hygiene ---------- */
ok('no console.log left', !/console\.log/.test(HTML));
ok('no external CDN', !/https?:\/\/[^"']*\.(js|css)(["'?])/.test(HTML));
ok('no duplicate ids', (() => {
  const ids = [...doc.querySelectorAll('[id]')].map(e => e.id);
  return new Set(ids).size === ids.length;
})());
ok('every getElementById target exists', (() => {
  const wanted = [...HTML.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]);
  return wanted.every(id => !!doc.getElementById(id));
})(), [...HTML.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1])
  .filter(id => !doc.getElementById(id)).join(','));

/* ---------- install rail behaviour ---------- */
const gates = [...doc.querySelectorAll('.gate')];
ok('five gates', gates.length === 5);
ok('gate steps are 1..5', gates.map(g => g.dataset.step).join(',') === '1,2,3,4,5');
ok('starts at 0 of 5', doc.getElementById('railCount').textContent === '0 of 5');

gates[0].querySelector('.tick').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('click marks gate done', gates[0].classList.contains('done'));
ok('counter updates', doc.getElementById('railCount').textContent === '1 of 5');
ok('fill width updates', doc.getElementById('railFill').style.width === '20%');
ok('state persisted under maatram_install_steps',
  JSON.parse(window.localStorage.getItem('maatram_install_steps') || '{}')['1'] === 1);
ok('aria-pressed set', gates[0].querySelector('.tick').getAttribute('aria-pressed') === 'true');

gates[0].querySelector('.tick').dispatchEvent(new window.Event('click', { bubbles: true }));
ok('click again un-marks it', !gates[0].classList.contains('done') &&
  doc.getElementById('railCount').textContent === '0 of 5');

gates.forEach(g => g.querySelector('.tick').dispatchEvent(new window.Event('click', { bubbles: true })));
ok('all five done -> 100%', doc.getElementById('railFill').style.width === '100%' &&
  doc.getElementById('railBar').getAttribute('aria-valuenow') === '5');

/* ---------- state survives a reload ---------- */
const dom2 = new JSDOM(HTML, { runScripts: 'dangerously',
  url: 'https://maatram-website.vercel.app/download.html' });
dom2.window.localStorage.setItem('maatram_install_steps', JSON.stringify({ 1: 1, 2: 1 }));
const dom3 = new JSDOM(HTML, { runScripts: 'dangerously',
  url: 'https://maatram-website.vercel.app/download.html',
  storageQuota: 100000 });
dom3.window.localStorage.setItem('maatram_install_steps', JSON.stringify({ 1: 1, 2: 1 }));
const dom4 = new JSDOM(HTML, { runScripts: 'outside-only',
  url: 'https://maatram-website.vercel.app/download.html' });
ok('page parses a second time cleanly', !!dom4.window.document.getElementById('rail'));

/* ---------- size budget ---------- */
const kb = Buffer.byteLength(HTML) / 1024;
ok('page under 50 KB', kb < 50, kb.toFixed(1) + ' KB');

console.log('\n  ' + pass + ' passed, ' + fail + ' failed   (download.html ' +
  kb.toFixed(1) + ' KB, apk ' + mb + ' MB)');
process.exit(fail ? 1 : 0);
