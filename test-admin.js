/* Maatram · admin + moderation checks   ->  node test-admin.js
   Static checks on admin.html / gate.js / firestore.rules / leaderboard.html,
   plus a live run of gate.js's enforce() behaviour in jsdom. */
const fs = require('fs'), path = require('path');
const {JSDOM} = require('jsdom');
const R = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
const ok = (name, cond) => { cond ? pass++ : fail++;
  console.log('  ' + (cond ? 'ok  ' : 'FAIL') + ' ' + name); };

const admin = R('admin.html'), gate = R('gate.js'),
      rules = R('firestore.rules'), board = R('leaderboard.html');

console.log('\nadmin.html');
ok('is not indexable',            /name="robots"[^>]*noindex/.test(admin));
ok('admin list is a constant',    /const ADMINS\s*=\s*\[/.test(admin));
ok('lists the Maatram address',   /maatram97@gmail\.com/.test(admin));
ok('checks email before showing', /ADMINS\.includes\(\(user\.email\|\|''\)\.toLowerCase\(\)\)/.test(admin));
ok('hides app until authorised',  /class="wrap hide" id="app"/.test(admin));
['set','zero','kick','ban','unban','del'].forEach(a =>
  ok('has the ' + a + ' action', new RegExp("b\\.dataset\\.a==='" + a + "'").test(admin)));
ok('ban writes banned + reason',  /banned:true,\s*bannedReason/.test(admin));
ok('ban also kicks the session',  /banned:true,[^}]*kickAt:Date\.now\(\)/.test(admin));
ok('delete needs typed DELETE',   /!=='DELETE'/.test(admin));
ok('every action writes a log',   (admin.match(/await note\(/g) || []).length >= 6);
ok('log collection is admin_log', /collection\(db,'admin_log'\)/.test(admin));
ok('user text is escaped',        /function esc\(/.test(admin) && /esc\(u\.name/.test(admin));
ok('documents each command',      ['Set points','Zero','Kick','Ban','Unban','Delete']
                                    .every(c => admin.includes('<dt>' + c + '</dt>')));

console.log('\npassphrase step');
ok('salt + hash constants',       /const PW_SALT =/.test(admin) && /const PW_HASH =/.test(admin));
ok('passphrase step is switched on',/const PW_HASH = '[0-9a-f]{64}';/.test(admin));
ok('hashes with SHA-256',         /digest\('SHA-256'/.test(admin));
ok('never stores the plaintext',  !/PW_PLAIN|password:\s*'/.test(admin));
ok('compares against PW_HASH',    /got === PW_HASH/.test(admin));
ok('console opens only via one door',
   (admin.match(/appEl\.classList\.remove\('hide'\)/g)||[]).length === 1);
ok('skipped when hash is blank',  /if\(PW_HASH\) askPass\(\); else openConsole\(\);/.test(admin));
ok('has a Lock button',           /id="lockNow"/.test(admin));
ok('auto-locks when idle',        /IDLE_LOCK_MS/.test(admin));
ok('watchers start once only',    /if\(!started\)\{ started=true;/.test(admin));
ok('documents the Lock command',  admin.includes('<dt>Lock</dt>'));

ok('hash generator is gone',      !fs.existsSync(path.join(__dirname,'make-hash.html')));

console.log('\nfirestore.rules');
ok('has an isAdmin() function',   /function isAdmin\(\)/.test(rules));
ok('admin may update any user',   /allow update: if isAdmin\(\);/.test(rules));
ok('per-write gain capped at 100',/points \+ 100|old\(\)\.points \+ 100/.test(rules));
ok('hard ceiling on points',      /points <= 3000/.test(rules));
ok('banned accounts frozen',      /old\(\)\.get\('banned', ?false\) != true/.test(rules));
ok('moderation fields locked',    /!touched\(\['banned','kickAt','bannedReason','isAdmin'\]\)/.test(rules));
ok('lifetime not free to set',    /!touched\(\['lifetime'\]\)/.test(rules));
ok('roll must add the real total',/neu\(\)\.lifetime == old\(\)\.get\('lifetime',0\) \+ old\(\)\.get\('points',0\)/.test(rules));
ok('only admins delete a user',   /allow delete: if isAdmin\(\);/.test(rules));
ok('admin_log is admin-only',     /match \/admin_log/.test(rules) && /allow update, delete: if false;/.test(rules));

console.log('\nleaderboard.html');
ok('banned users cannot rank',    /v\.banned!==true/.test(board));

console.log('\ngate.js');
ok('defines enforce()',           /function enforce\(U,auth,d\)/.test(gate));
ok('runs before the role check',  gate.indexOf('enforce(U,auth,d)') < gate.indexOf("if(!d.role)"));
ok('listens for a live ban',      /onSnapshot\(F\.doc\(db,'users',user\.uid\)/.test(gate));
ok('remembers the last kick',     /maatram_kick_seen/.test(gate));
ok('veil keeps line breaks',      /white-space:pre-line/.test(gate));

/* ── behaviour: load gate.js in a page and call enforce() directly ── */
console.log('\nenforce() behaviour');
const dom = new JSDOM('<!doctype html><html><body><p>page</p></body></html>',
  {url:'https://maatram-website.vercel.app/timers.html', runScripts:'outside-only'});
const win = dom.window;
let signedOut = 0, replaced = null;
win.eval('window.__enforce=null;');
/* re-expose enforce by evaluating the file with a tail hook */
win.eval(gate.replace('if(document.body) start();',
  'window.__enforce=enforce; window.__veil=veil; if(false) start();'));
const U = {signOut(){ signedOut++; }};
const enforce = win.__enforce;

ok('clean doc passes through',    enforce(U,{},{role:'student'}) === false);
ok('banned doc is stopped',       enforce(U,{},{banned:true}) === true);
ok('ban signs the user out',      signedOut === 1);
ok('ban message reaches the veil',
   /suspended/.test(win.document.getElementById('mgate').textContent));
ok('ban reason is shown',
   (enforce(U,{},{banned:true,bannedReason:'Points were not earned honestly.'}),
    /not earned honestly/.test(win.document.getElementById('mgate').textContent)));

const kicked = enforce(U,{},{role:'student',kickAt:1700000000000});
ok('first kick is acted on',      kicked === true);
ok('kick is remembered',          win.localStorage.getItem('maatram_kick_seen') === '1700000000000');
ok('same kick does not repeat',   enforce(U,{},{role:'student',kickAt:1700000000000}) === false);
ok('a newer kick fires again',    enforce(U,{},{role:'student',kickAt:1700000000001}) === true);

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
