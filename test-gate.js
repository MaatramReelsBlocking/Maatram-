/* Maatram · Module 1b gate checks — node test-gate.js  (needs: npm i jsdom) */
const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
let pass=0,fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n)); };
const group=n=>console.log('\n== '+n);
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');

const GATED=['timers','app-gate','study-room','stats','leaderboard'];
const OPEN =['index','socials','download','login','roles'];

group('gate.js wiring');
GATED.forEach(n=>{
  const h=read(n+'.html');
  ok(n+': gate.js included once', (h.match(/src="gate\.js"/g)||[]).length===1);
  ok(n+': gate.js loads after theme.js', h.indexOf('theme.js')<h.indexOf('gate.js'));
});
OPEN.forEach(n=>{
  ok(n+': NOT gated (no redirect loop / public page)', !/src="gate\.js"/.test(read(n+'.html')));
});

group('nav link');
[...GATED,...OPEN].forEach(n=>{
  const h=read(n+'.html');
  ok(n+': Account link present once', (h.match(/href="roles\.html"/g)||[]).length>=1
     && (h.match(/class="mn-link(?: active)?" href="roles\.html"/g)||[]).length===1);
  ok(n+': nav has all 9 links', (h.match(/class="mn-link/g)||[]).length===9);
});

group('gate.js behaviour');
const G=read('gate.js');
ok('never gates roles.html', /PAGE==='roles\.html'/.test(G));
ok('never gates login.html', /PAGE==='login\.html'/.test(G));
ok('never gates auth-bridge.html', /auth-bridge\.html/.test(G));
ok('remembers the page it bounced from', /sessionStorage\.setItem\('maatram_next'/.test(G));
ok('uses replace, not push (no back-button trap)', /location\.replace\('roles\.html'\)/.test(G));
ok('reveals on import failure (offline never locks out)', /catch\(e\)\{ reveal\(\); return; \}/.test(G));

function run(url){
  const dom=new JSDOM('<!doctype html><html><head></head><body><h1 id="secret">private</h1></body></html>',
    {runScripts:'dangerously',url});
  dom.window.eval(G);
  return dom;
}
let d1=run('file:///timers.html');
ok('file://: page untouched (dev/offline)',
   !d1.window.document.documentElement.classList.contains('mgate')
   && !d1.window.document.getElementById('maatramGateCSS'));

let d2=run('http://localhost/timers.html');
ok('http: veil style injected', !!d2.window.document.getElementById('maatramGateCSS'));
ok('http: html.mgate set synchronously', d2.window.document.documentElement.classList.contains('mgate'));
ok('http: veil element shown', !!d2.window.document.getElementById('mgate'));
ok('http: page content hidden by CSS rule',
   /html\.mgate body>\*\{visibility:hidden!important\}/.test(d2.window.document.getElementById('maatramGateCSS').textContent));

let d3=run('http://localhost/roles.html');
ok('http roles.html: not gated', !d3.window.document.documentElement.classList.contains('mgate'));

setTimeout(()=>{
  ok('http: reveals when Firebase cannot load (offline)',
     !d2.window.document.documentElement.classList.contains('mgate'));

  group('roles.html return hop');
  const R=read('roles.html');
  ok('reads maatram_next', /sessionStorage\.getItem\('maatram_next'\)/.test(R));
  ok('clears it after use', /removeItem\('maatram_next'\)/.test(R));
  ok('validates the target filename', /\^\[a-z0-9-\]\+\\\.html\$/.test(R));
  ok('never hops back to roles.html', /n!=='roles\.html'/.test(R));
  ok('hops only on a fresh pick', (R.match(/,true\);/g)||[]).length===3);

  console.log('\n'+pass+' pass, '+fail+' fail');
  process.exit(fail?1:0);
},400);
