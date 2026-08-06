/* Maatram · roles.html checks — node test-roles.js  (needs: npm i jsdom) */
const fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const FILE=path.join(__dirname,'roles.html');
const HTML=fs.readFileSync(FILE,'utf8');

let pass=0,fail=0;
const ok=(n,c)=>{ c?(pass++,console.log('  ok   '+n)):(fail++,console.log('  FAIL '+n)); };
const group=n=>console.log('\n== '+n);

/* ---------- 1. static file checks ---------- */
group('file');
ok('single <style>', (HTML.match(/<style>/g)||[]).length===1);
ok('loads theme.js', /<script src="theme\.js"><\/script>/.test(HTML));
ok('no local asset refs beyond site files', !/src="https?:\/\/(?!www\.gstatic)/.test(HTML));
ok('reduced-motion path present', /prefers-reduced-motion/.test(HTML));
ok('skip link', /class="skip"/.test(HTML));
ok('shared #mnav present', /<nav id="mnav"/.test(HTML));
ok('nav marks Account active', /class="mn-link active" href="roles\.html"/.test(HTML));
ok('nav keeps all 9 site links', (HTML.match(/class="mn-link/g)||[]).length===9);
ok('noindex (private page)', /name="robots" content="noindex/.test(HTML));
ok('under 50 KB', Buffer.byteLength(HTML)<50*1024);
ok('persona copy verbatim: student', /Standard learner workspace access\./.test(HTML));
ok('persona copy verbatim: teacher', /Educator management tools access\./.test(HTML));
ok('persona copy verbatim: parent', /Guardian oversight module access\./.test(HTML));
ok('parental controls labelled', /Parental Controls/.test(HTML));
ok('placeholder disclosed as non-enforcing', /do not restrict the/i.test(HTML));

/* ---------- 2. DOM boot ---------- */
group('boot (file:// = signed out)');
const fileDom=new JSDOM(HTML,{runScripts:'dangerously',url:'file:///roles.html',pretendToBeVisual:true});
ok('sign-in disabled off a web address', fileDom.window.document.getElementById('gBtn').disabled===true);
fileDom.window.close();

const dom=new JSDOM(HTML,{runScripts:'dangerously',url:'http://localhost/roles.html',pretendToBeVisual:true});
const w=dom.window,d=w.document,$=id=>d.getElementById(id);
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;};

ok('gate visible when signed out', $('secGate').hidden===false);
ok('workspace hidden when signed out', $('secWs').hidden===true);
ok('persona modal closed', $('pick').open!==true);
ok('no student/teacher/parent data leaked pre-auth',
   $('wsStudent').hidden&&$('wsTeacher').hidden&&$('wsParent').hidden);
ok('helpers exported', typeof w.__roles==='object'&&typeof w.__roles.genCode==='function');

/* ---------- 3. code helpers ---------- */
group('class code');
const R=w.__roles;
const codes=new Set(); for(let i=0;i<400;i++) codes.add(R.genCode());
ok('genCode is 6 chars', [...codes].every(c=>c.length===6));
ok('genCode alphabet safe (no I O 0 1)', [...codes].every(c=>/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(c)));
ok('genCode not constant', codes.size>390);
ok('normCode uppercases + strips', R.normCode(' ab-c1z! ')==='ABC1Z');
ok('normCode caps at 6', R.normCode('abcdefghij').length===6);

/* ---------- 4. workspace render per role ---------- */
group('workspace render');
R.showWorkspace({role:'student',name:'Ram Saravanan',email:'a@b.c',points:120,classCode:'ABC123'});
ok('student panel shown', $('wsStudent').hidden===false);
ok('teacher panel hidden for student', $('wsTeacher').hidden===true);
ok('parent panel hidden for student', $('wsParent').hidden===true);
ok('student points rendered', $('stPts').textContent==='120');
ok('student class rendered', /ABC123/.test($('stClass').textContent));
ok('first name only', $('wsName').textContent==='Ram');
ok('gate hidden once in workspace', $('secGate').hidden===true);

R.showWorkspace({role:'teacher',name:'T',email:'t@b.c',classCode:'XYZ789'});
ok('teacher panel shown', $('wsTeacher').hidden===false);
ok('student panel swapped out', $('wsStudent').hidden===true);
ok('class code rendered', $('tcCode').textContent==='XYZ789');

R.showWorkspace({role:'parent',name:'P',email:'p@b.c',childName:'Kid A',childPoints:55});
ok('parent panel shown', $('wsParent').hidden===false);
ok('teacher panel swapped out', $('wsTeacher').hidden===true);
ok('child name rendered', $('paChild').textContent==='Kid A');
ok('child points rendered', $('paPts').textContent==='55');

/* ---------- 5. rosters ---------- */
group('rosters');
R.renderRoster([]);
ok('empty roster shows empty line', $('tcEmpty').hidden===false && $('tcRoster').children.length===0);
R.renderRoster([{name:'A',points:10},{name:'B',points:3}]);
ok('roster renders rows', $('tcRoster').children.length===2);
ok('roster empty line hidden', $('tcEmpty').hidden===true);
ok('roster shows points', /10 PTS/.test($('tcRoster').textContent));

let picked=null;
R.renderChildren([{name:'Kid A',uid:'u1'},{name:'Kid B',uid:'u2'}],k=>picked=k);
ok('child list renders', $('chList').children.length===2);
$('chList').querySelectorAll('button')[1].click();
ok('picking a child fires callback with that uid', picked&&picked.uid==='u2');
R.renderChildren([],()=>{});
ok('empty class shows ask-them-to-join line', $('chEmpty').hidden===false);

/* ---------- 6. parental controls persist ---------- */
group('parental controls');
const boxes=[...d.querySelectorAll('[data-pc]')];
ok('three toggles rendered', boxes.length===3);
boxes[0].checked=true; boxes[2].checked=true; R.pcSave();
const stored=JSON.parse(w.localStorage.getItem('maatram_pc'));
ok('saved to localStorage maatram_pc', stored.pc1===true&&stored.pc2===false&&stored.pc3===true);
boxes.forEach(b=>b.checked=false);
R.pcLoad();
ok('reload restores toggle state', boxes[0].checked===true&&boxes[1].checked===false&&boxes[2].checked===true);
ok('toggles are real inputs with labels', boxes.every(b=>b.type==='checkbox'&&b.getAttribute('aria-label')));

/* ---------- 7. modal steps ---------- */
group('modal steps');
R.step('cards');
ok('cards step shows 3 personas', d.querySelectorAll('.persona').length===3 && $('pickCards').hidden===false);
ok('teacher step hidden on cards', $('stepTeacher').hidden===true);
R.step('teacher');
ok('teacher step shows create-class', $('stepTeacher').hidden===false && $('stepCode').hidden===true);
R.step('code');
ok('code step shows input', $('stepCode').hidden===false && $('codeIn'));
R.step('child');
ok('child step shows picker', $('stepChild').hidden===false && $('stepCode').hidden===true);

/* ---------- 8. strict-mode marker gate ---------- */
group('content gate');
const markers=(HTML.match(/\[\[NEEDS:[^\]]*\]\]/g)||[]);
console.log('  markers open: '+markers.length+(markers.length?' -> '+markers.join(' | '):''));
ok('zero open markers (delivery gate)', markers.length===0);
ok('toggle labels are real text', [...d.querySelectorAll('.toggle span')].every(x=>x.textContent.trim().length>4));
ok('each toggle aria-label matches its visible label',
   [...d.querySelectorAll('.toggle')].every(t=>t.querySelector('input').getAttribute('aria-label')===t.querySelector('span').textContent.trim()));

console.log('\n'+pass+' pass, '+fail+' fail');
process.exit(fail?1:0);
