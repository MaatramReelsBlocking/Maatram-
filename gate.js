/* ══ Maatram · page gate ══
   One line per page:  <script src="gate.js"></script>  (right after theme.js)
   Signed out, or signed in with no profile chosen -> roles.html.
   Never add this to roles.html or login.html (redirect loop). */
(function(){
  var HOSTED = location.protocol==='http:'||location.protocol==='https:';
  if(!HOSTED) return;                       /* opened from a file: leave the page alone */

  var PAGE=(location.pathname.split('/').pop()||'index.html');
  if(PAGE==='roles.html'||PAGE==='login.html'||PAGE==='auth-bridge.html') return;

  /* hide the page before anything paints, so signed-out content never flashes */
  var s=document.createElement('style');
  s.id='maatramGateCSS';
  s.textContent='html.mgate body>*{visibility:hidden!important}'
    +'html.mgate #mgate{visibility:visible!important}'
    +'#mgate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;'
    +'background:#06090B;color:#8FA3A0;font:600 14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;'
    +'letter-spacing:.04em;text-align:center;padding:24px}';
  (document.head||document.documentElement).appendChild(s);
  document.documentElement.classList.add('mgate');

  function veil(text){
    var v=document.getElementById('mgate');
    if(!v){ v=document.createElement('div'); v.id='mgate'; document.body.appendChild(v); }
    v.textContent=text;
  }
  function reveal(){
    document.documentElement.classList.remove('mgate');
    var v=document.getElementById('mgate'); if(v) v.remove();
  }
  function send(){
    try{ sessionStorage.setItem('maatram_next',PAGE); }catch(e){}
    location.replace('roles.html');
  }

  function start(){
    veil('Checking your sign-in…');
    (async function(){
      var m;
      try{
        m=await Promise.all([
          import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
          import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),
          import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js')
        ]);
      }catch(e){ reveal(); return; }        /* offline: never lock the user out */
      var A=m[0],U=m[1],F=m[2];
      var app=A.getApps().length?A.getApp():A.initializeApp({apiKey:"AIzaSyAjiAm61IkH3wB1tjwOyGRrXAuRMKQyCcQ",authDomain:"maatram-859f4.firebaseapp.com",projectId:"maatram-859f4",storageBucket:"maatram-859f4.firebasestorage.app",messagingSenderId:"770970784123",appId:"1:770970784123:web:7c73c74ddb2179b69dedde"});
      var auth=U.getAuth(app), db=F.getFirestore(app), done=false;
      U.onAuthStateChanged(auth, async function(user){
        if(done) return; done=true;
        if(!user){ send(); return; }
        var d={};
        try{ var snap=await F.getDoc(F.doc(db,'users',user.uid)); d=snap.exists()?snap.data():{}; }
        catch(e){ reveal(); return; }       /* read failed: let them work, do not trap them */
        if(!d.role){ send(); return; }
        try{ document.documentElement.dataset.role=d.role; }catch(e){}
        reveal();
      });
    })();
  }

  if(document.body) start();
  else document.addEventListener('DOMContentLoaded',start);
})();
