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
    +'letter-spacing:.04em;text-align:center;padding:24px;white-space:pre-line}';
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


  /* ══ monthly leaderboard cycle ══
     Each signed-in user rolls their OWN doc over on the first page load of a
     new month: this month's points are archived to m_YYYY-MM, added to the
     lifetime total, then zeroed. No cron job, no server, no admin key.
     ponytail: self-reset; move to a Cloud Function only if a user who never
     opens the site again must still be flushed from the board. */
  function cycleId(dt){ dt=dt||new Date();
    return dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2); }

  async function roll(F,db,uid,d){
    var now=cycleId();
    if(d.cycle===now) return;
    var pts=d.points||0, life=d.lifetime||0, patch={cycle:now};
    if(!d.cycle){                       /* first ever run: adopt, do not wipe */
      patch.lifetime = life>pts ? life : pts;
    }else{                              /* new month: archive, then zero */
      patch.lifetime = life+pts;
      patch.points   = 0;
      patch['m_'+d.cycle] = pts;
    }
    await F.updateDoc(F.doc(db,'users',uid),patch);
  }

  /* ══ moderation ══
     banned  : account frozen, every gated page refuses to open
     kickAt  : one-shot force sign-out (admin "kick"); the value is a number,
               the browser remembers the last one it has already acted on. */
  function enforce(U,auth,d){
    if(d && d.banned===true){
      document.documentElement.classList.add('mgate');
      veil('This account is suspended.'+(d.bannedReason?'\n'+d.bannedReason:'')
           +'\nContact maatram97@gmail.com');
      try{ U.signOut(auth); }catch(e){}
      return true;
    }
    if(d && d.kickAt){
      var seen=''; try{ seen=localStorage.getItem('maatram_kick_seen')||''; }catch(e){}
      if(seen!==String(d.kickAt)){
        try{ localStorage.setItem('maatram_kick_seen',String(d.kickAt)); }catch(e){}
        try{ U.signOut(auth); }catch(e){}
        send(); return true;
      }
    }
    return false;
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
        if(enforce(U,auth,d)) return;      /* banned or kicked by an admin */
        if(!d.role){ send(); return; }
        try{ document.documentElement.dataset.role=d.role; }catch(e){}
        /* stay live: a ban or kick lands while the page is open */
        try{ F.onSnapshot(F.doc(db,'users',user.uid),function(s){
               if(s.exists()) enforce(U,auth,s.data());
             }); }catch(e){}
        try{ await roll(F,db,user.uid,d); }catch(e){ }   /* never block the page on this */
        reveal();
      });
    })();
  }

  if(document.body) start();
  else document.addEventListener('DOMContentLoaded',start);
})();
