/* gitWidget — self-contained embed.
   Usage: <div id="gitwidget"></div><script src=".../widget.js" defer></script>
   Inherits the host page's CSS vars (--ink, --good, --accent, --muted, --mono),
   with fallbacks so it works anywhere. No GitHub token in the browser. */
(function () {
  var MOUNT = document.getElementById('gitwidget');
  if (!MOUNT) return;
  var DATA_URL = 'https://cdn.jsdelivr.net/gh/abhibagaria/gitWidget@main/data/contributions.json';
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
  .gitwidget .gw-label i{width:7px;height:7px;border-radius:50%;background:var(--good,#1a7f4b);animation:gwpulse 2.6s cubic-bezier(.16,1,.3,1) infinite}
  @keyframes gwpulse{0%{box-shadow:0 0 0 0 rgba(26,127,75,.45)}70%{box-shadow:0 0 0 6px rgba(26,127,75,0)}100%{box-shadow:0 0 0 0 rgba(26,127,75,0)}}
  .gitwidget .gw-track{position:relative;height:24px}
  .gitwidget .gw-creature{position:absolute;left:0;bottom:1px;height:22px;color:var(--good,#1a7f4b);will-change:transform;pointer-events:none}
  .gitwidget .gw-creature svg{height:22px;width:auto;display:block}
  .gitwidget .gw-months{display:grid;font-family:var(--mono,ui-monospace,Menlo,monospace);font-size:.6rem;color:var(--muted,#6a6a72);margin-bottom:5px;height:.8rem}
  .gitwidget .gw-months span{grid-row:1}
  .gitwidget .gw-grid{display:grid;grid-template-rows:repeat(7,1fr);grid-auto-flow:column;gap:3px}
  .gitwidget .gw-cell{aspect-ratio:1;border-radius:2px;background:#e9ece9;box-shadow:inset 0 0 0 1px rgba(12,12,14,.05)}
  .gitwidget .gw-cell.l1{background:#bfe3cb}.gitwidget .gw-cell.l2{background:#7fc79b}
  .gitwidget .gw-cell.l3{background:#3f9f68}.gitwidget .gw-cell.l4{background:var(--good,#1a7f4b)}
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
    '<div class="gw-label"><i></i> <span>still shipping · last 12 months</span></div>' +
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
    var BODY=[[1,0],[6,0],[2,1],[3,1],[4,1],[5,1],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],
      [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],
      [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[1,6],[2,6],[3,6],[4,6],[5,6],[6,6]];
    var WA=[[1,7],[2,7],[5,7],[6,7]], WB=[[2,7],[3,7],[4,7],[5,7]], ST=[[1,7],[3,7],[5,7]];
    function sprite(legs,eyes){ var r='';
      function put(x,y,c){ r+='<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+c+'"/>'; }
      BODY.forEach(function(p){put(p[0],p[1],'currentColor');}); legs.forEach(function(p){put(p[0],p[1],'currentColor');});
      if(eyes){put(2,3,'#fff');put(5,3,'#fff');}
      return '<svg viewBox="-1 0 11 8" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">'+r+'</svg>'; }
    var x=40,tx=40,hop=0,hv=0,dir=1,mv=false,fr=0,lf=0,eyes=true,nb=2000,bu=0,nw=3000,cur=false,key='',SPW=25;
    var tw=function(){return track.clientWidth-SPW;};
    MOUNT.addEventListener('mousemove', function(e){ var r=track.getBoundingClientRect();
      tx=Math.max(0,Math.min(tw(), e.clientX-r.left-SPW/2)); cur=true; });
    MOUNT.addEventListener('mouseleave', function(){ cur=false; });
    MOUNT.addEventListener('click', function(){ if(hop===0){ hv=4.4; eyes=true; } });
    function tick(now){
      if(!cur && now>nw){ tx=Math.random()*tw(); nw=now+2200+Math.random()*3500; }
      var dx=tx-x; if(Math.abs(dx)>0.6){ x+=dx*0.08; mv=true; dir=dx<0?-1:1; } else mv=false;
      if(hop>0||hv>0){ hop+=hv; hv-=0.45; if(hop<0){hop=0;hv=0;} }
      if(mv && now-lf>120){ fr^=1; lf=now; eyes=true; }
      if(!mv){ if(now>nb){ bu=now+150; nb=now+1800+Math.random()*2600; } eyes=now>bu; }
      var legs=mv?(fr?WB:WA):ST, k=(legs===WB?'b':legs===WA?'a':'s')+(eyes?'1':'0');
      if(k!==key){ el.innerHTML=sprite(legs,eyes); key=k; }
      el.style.transform='translateX('+x+'px) translateY('+(-hop)+'px) scaleX('+dir+')';
      requestAnimationFrame(tick);
    }
    el.innerHTML=sprite(ST,true); requestAnimationFrame(tick);
  }

  fetch(DATA_URL, {cache:'no-cache'}).then(function(r){ return r.json(); }).then(render)
    .catch(function(e){ console.error('gitWidget:', e); });
})();
