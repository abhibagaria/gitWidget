/* gitWidget — self-contained embed.
   Usage: <div id="gitwidget"></div><script src=".../widget.js" defer></script>
   Inherits the host page's CSS vars (--ink, --good, --accent, --muted, --mono),
   with fallbacks so it works anywhere. No GitHub token in the browser. */
(function () {
  var MOUNT = document.getElementById('gitwidget');
  if (!MOUNT) return;
  // raw.githubusercontent caches only ~5 min (and sends CORS), so the widget stays
  // near-fresh; jsDelivr (7-day browser / 12h edge cache) is just a resilient fallback.
  // A host page (e.g. embed.html on Pages) can set window.GITWIDGET_SOURCES to
  // override the source order — e.g. to try a same-origin copy first.
  var DATA_URLS = (window.GITWIDGET_SOURCES && window.GITWIDGET_SOURCES.length) ? window.GITWIDGET_SOURCES : [
    'https://raw.githubusercontent.com/abhibagaria/gitWidget/main/data/contributions.json',
    'https://cdn.jsdelivr.net/gh/abhibagaria/gitWidget@main/data/contributions.json'
  ];
  var PROFILE = 'https://github.com/abhibagaria';
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var fmt = function (d) { return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };

  // subtle audio: each contribution you sweep over plays a soft note (silent on empty days)
  var actx=null, lastBlip=0, NOTES=[261.63,329.63,392.00,440.00,523.25];
  function audio(){ try{ if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume(); }catch(e){} return actx; }
  function blip(level){ if(level<1) return; var ctx=audio(); if(!ctx) return;
    var t=performance.now(); if(t-lastBlip<26) return; lastBlip=t;
    var n=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain();
    o.type='triangle'; o.frequency.value=NOTES[level]||NOTES[1];
    var vol=0.022+level*0.011;
    g.gain.setValueAtTime(0,n); g.gain.linearRampToValueAtTime(vol,n+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,n+0.18);
    o.connect(g); g.connect(ctx.destination); o.start(n); o.stop(n+0.2);
  }
  window.addEventListener('pointerdown', audio);

  var css = `
  .gitwidget{max-width:680px;font-family:var(--sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif)}
  .gitwidget .gw-label{font-family:var(--mono,ui-monospace,Menlo,Consolas,monospace);font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#6a6a72);margin-bottom:1.1rem;display:inline-flex;align-items:center;gap:.6rem}
  .gitwidget .gw-track{position:relative;height:24px}
  .gitwidget .gw-creature{position:absolute;left:0;bottom:0;height:24px;will-change:transform;pointer-events:none}
  .gitwidget .gw-creature svg{height:24px;width:auto;display:block}
  .gitwidget .gw-months{display:grid;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:.6rem;color:var(--muted,#6a6a72);margin-bottom:5px;height:.8rem}
  .gitwidget .gw-months span{grid-row:1}
  .gitwidget .gw-grid{display:grid;grid-template-rows:repeat(7,1fr);grid-auto-flow:column;gap:3px}
  .gitwidget .gw-cell{aspect-ratio:1;border-radius:2px;background:#e9ece9;box-shadow:inset 0 0 0 1px rgba(12,12,14,.05)}
  .gitwidget .gw-cell.l1{background:#bfe3cb}.gitwidget .gw-cell.l2{background:#7fc79b}
  .gitwidget .gw-cell.l3{background:#3f9f68}.gitwidget .gw-cell.l4{background:var(--good,#1a7f4b)}
  .gitwidget .gw-cell.l0{background:radial-gradient(circle at center,rgba(12,12,14,.17) 0 .9px,transparent 1.3px);box-shadow:none;border-radius:0}
  .gitwidget .gw-cell:hover{box-shadow:inset 0 0 0 1px rgba(12,12,14,.45)}
  .gitwidget .gw-meta{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;margin-top:1rem;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:.8rem;color:var(--muted,#6a6a72);flex-wrap:wrap}
  .gitwidget .gw-meta b{color:var(--ink,#0c0c0e);font-weight:600}
  .gitwidget .gw-meta a{color:var(--accent,#1f63d6);text-decoration:none;font-weight:500}
  .gitwidget .gw-meta a:hover{color:var(--accent-ink,#1850b4)}
  .gitwidget .gw-meta a .arr{display:inline-block;transition:transform .3s cubic-bezier(.16,1,.3,1)}
  .gitwidget .gw-meta a:hover .arr{transform:translateX(3px)}
  .gw-tip{position:fixed;pointer-events:none;background:var(--ink,#0c0c0e);color:#fff;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:.72rem;padding:4px 8px;border-radius:5px;transform:translate(-50%,-145%);white-space:nowrap;opacity:0;transition:opacity .1s;z-index:99999}`;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  MOUNT.className = 'gitwidget';
  MOUNT.innerHTML =
    '<div class="gw-label"><span>still shipping · last 12 months</span></div>' +
    '<div class="gw-track"><div class="gw-creature" aria-hidden="true"></div></div>' +
    '<div class="gw-months"></div><div class="gw-grid"></div>' +
    '<div class="gw-meta"><span><b class="gw-total">—</b> contributions · current streak <b class="gw-streak">—</b> days · longest <b class="gw-long">—</b></span>' +
    '<a href="' + PROFILE + '" target="_blank" rel="noopener">View on GitHub <span class="arr">→</span></a></div>';
  var tip = document.createElement('div'); tip.className = 'gw-tip'; document.body.appendChild(tip);
  var $ = function (s) { return MOUNT.querySelector(s); };

  function monthLabels(weeks){ var out=[],last=-1; weeks.forEach(function(w,i){
    var m=new Date(w[0].date).getMonth(); if(m!==last){out.push({col:i,label:MONTHS[m]});last=m;} });
    return out.filter(function(o,i){return i===0||o.col-out[i-1].col>=2;}); }

  function render(data){
    var weeks = data.weeks || [], n = weeks.length || 53;
    $('.gw-total').textContent = (data.total||0).toLocaleString();
    $('.gw-streak').textContent = data.currentStreak||0;
    $('.gw-long').textContent = data.longestStreak||0;
    var grid=$('.gw-grid'), months=$('.gw-months');
    // screen-reader summary: the grid is decorative per-cell, so expose the
    // headline numbers as a single label instead of 365 unlabelled divs.
    grid.setAttribute('role','img');
    grid.setAttribute('aria-label', (data.total||0)+' contributions in the last year · current streak '
      +(data.currentStreak||0)+' days · longest streak '+(data.longestStreak||0)+' days');
    grid.style.gridTemplateColumns='repeat('+n+',1fr)';
    months.style.gridTemplateColumns='repeat('+n+',1fr)';
    monthLabels(weeks).forEach(function(m){ var s=document.createElement('span');
      s.textContent=m.label; s.style.gridColumn=(m.col+1); months.appendChild(s); });
    weeks.forEach(function(week){ week.forEach(function(day){
      var c=document.createElement('div'); c.className='gw-cell l'+day.level; var date=new Date(day.date);
      c.addEventListener('mouseenter', function(){ blip(day.level); });
      c.addEventListener('mousemove', function(e){ tip.textContent = day.count
          ? day.count+' contributions · '+fmt(date) : 'No contributions · '+fmt(date);
        tip.style.left=e.clientX+'px'; tip.style.top=e.clientY+'px'; tip.style.opacity=1; });
      c.addEventListener('mouseleave', function(){ tip.style.opacity=0; });
      grid.appendChild(c); }); });
    creature();
  }

  function creature(){
    var el=$('.gw-creature'), track=$('.gw-track');
    // A pixel-art tiger, facing right (the widget mirrors it with scaleX(dir)).
    // Authored as ASCII rows so it's easy to read/tweak; each glyph is one pixel.
    // O outline/stripe · # orange · h orange highlight · . white belly/muzzle ·
    // e eye · n nose. Leading spaces set the x-offset, so trailing ones are optional.
    var COLS={O:'#2a1c11',S:'#2a1c11','#':'#ee6a1e','.':'#fdf2e6',e:'#140d06',n:'#3a2415'};
    // Upper body (shared by every pose): ears, striped head + eyes, striped back,
    // white muzzle/belly, and a short curled tail. Right-facing.
    var BODY=[
      "           OO OO",     // two ear tips
      "          O######O",   // head crown
      "  O      O#S###S#O",   // tail tip + forehead stripes
      "  #O     O#ee#ee#O",   // tail ring + two eyes
      "  #O##############O",  // back + head/body join
      "  O#S##S##S##S#.nO",   // stripes + white muzzle + nose
      "  O#S##S##S##S#..O",   // stripes + chin
      "  O#............#O",   // white belly band
      "  O##############O"    // body underside
    ];
    // Leg frames appended below BODY (rows y9–y11). Hind legs sit under the
    // tail (x≈4–5), front legs under the head/chest (x≈13–15).
    var LEGS={
      stand:["    O#O      O#O ","    O#O      O#O ","    O.O      O.O "],
      walkA:["   O#O        O#O"," O#O         O#O "," O.O         O.O "],
      walkB:["     O#O    O#O  ","    O#O      O#O ","    O.O      O.O "],
      run1: ["  O#O          O#O","O#O          O#O ","O.O          O.O "],
      run2: ["    O#O    O#O   ","   O#O      O#O  ","   O.O      O.O  "],
      leap: [" O#O           O#O","O#O           O#O","O.O           O.O"]
    };
    function sprite(pose,eyes){ var r='', rows=BODY.concat(LEGS[pose]||LEGS.stand);
      for(var y=0;y<rows.length;y++){ var row=rows[y];
        for(var x=0;x<row.length;x++){ var ch=row.charAt(x);
          if(ch===' ') continue;
          if(ch==='e'&&!eyes) ch='#';            // blink: eye blends into the fur
          var c=COLS[ch]; if(!c) continue;
          r+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+c+'"/>'; } }
      return '<svg viewBox="0 0 18 12" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">'+r+'</svg>'; }
    var x=40,tx=40,hop=0,hv=0,dir=1,mv=false,fr=0,lf=0,eyes=true,nb=2000,bu=0,nw=3000,cur=false,key='',SPW=36;
    var tw=function(){return track.clientWidth-SPW;};
    MOUNT.addEventListener('mousemove', function(e){ var r=track.getBoundingClientRect();
      tx=Math.max(0,Math.min(tw(), e.clientX-r.left-SPW/2)); cur=true; });
    MOUNT.addEventListener('mouseleave', function(){ cur=false; });
    MOUNT.addEventListener('click', function(){ if(hop===0){ hv=4.4; eyes=true; } });
    function tick(now){
      if(!cur && now>nw){ tx=Math.random()*tw(); nw=now+2200+Math.random()*3500; }
      var dx=tx-x, adx=Math.abs(dx), fast=adx>55;
      if(adx>0.6){ x+=dx*0.08; mv=true; dir=dx<0?-1:1; } else mv=false;
      if(hop>0||hv>0){ hop+=hv; hv-=0.45; if(hop<0){hop=0;hv=0;} }
      if(mv && now-lf>(fast?90:130)){ fr^=1; lf=now; eyes=true; }
      if(!mv){ if(now>nb){ bu=now+150; nb=now+1800+Math.random()*2600; } eyes=now>bu; }
      var pose = hop>0.3 ? 'leap' : mv ? (fast?(fr?'run2':'run1'):(fr?'walkB':'walkA')) : 'stand';
      var k=pose+(eyes?'1':'0');
      if(k!==key){ el.innerHTML=sprite(pose,eyes); key=k; }
      el.style.transform='translateX('+x+'px) translateY('+(-hop)+'px) scaleX('+dir+')';
      requestAnimationFrame(tick);
    }
    el.innerHTML=sprite('stand',true); requestAnimationFrame(tick);
  }

  function load(i){ i=i||0; if(i>=DATA_URLS.length) return Promise.reject(new Error('no data source'));
    return fetch(DATA_URLS[i], {cache:'no-cache'}).then(function(r){ if(!r.ok) throw 0; return r.json(); })
      .catch(function(){ return load(i+1); }); }
  load().then(render).catch(function(e){ console.error('gitWidget:', e); });
})();
