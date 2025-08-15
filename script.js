(function(){
  const API = window.API_BASE || "";
  const $ = id => document.getElementById(id);

  async function fetchWithTimeout(url, opts={}, ms=12000){
    const ctl = new AbortController();
    const t = setTimeout(()=>ctl.abort(), ms);
    try{
      return await fetch(url, {...opts, signal: ctl.signal});
    } finally { clearTimeout(t); }
  }

  // ===== header API status =====
  const apiDot = $('apiDot');
  async function pingHealth(){
    if(!API || !apiDot) return;
    try{
      const r = await fetchWithTimeout(API + '/health', {}, 6000);
      if(!r.ok) throw 0;
      await r.json();
      apiDot.className = 'api-dot ok';
    }catch(_){
      apiDot.className = 'api-dot down';
    }
  }
  setInterval(pingHealth, 60000);

  // ===== search + analyze =====
  const input = $('ticker');
  const go = $('go');
  const box = $('suggestBox');
  const card = $('card');

  const setText = (id,val)=>{ const el = $(id); if(el) el.textContent = val; };

  let items = [], activeIdx = -1, lastQ = "", timer = null;

  function showSuggest(show){ if(!box) return; box.classList.toggle('hidden', !show || items.length === 0); }
  function clearSuggest(){ items=[]; if(box){ box.innerHTML=""; box.classList.add('hidden'); } activeIdx=-1; }
  function renderSuggest(){
    if(!box) return;
    box.innerHTML="";
    items.forEach((it, idx)=>{
      const row=document.createElement('div');
      row.className='suggest-item'+(idx===activeIdx?' active':'');
      row.setAttribute('role','option');
      row.innerHTML=`<div class="left">${it.symbol||''}</div>
                     <div class="right">${(it.shortname||'').slice(0,70)} ${it.exchange?' · '+it.exchange:''}</div>`;
      row.addEventListener('mousedown', e=>{ e.preventDefault(); choose(idx); });
      box.appendChild(row);
    });
    showSuggest(true);
  }
  async function fetchSuggest(q){
    try{
      const res = await fetchWithTimeout(API + '/suggest?q=' + encodeURIComponent(q), {}, 10000);
      if(!res.ok) throw 0;
      const data = await res.json();
      items = (data.results||[]).slice(0,10);
      renderSuggest();
    }catch(_){ clearSuggest(); }
  }
  function debounce(fn, ms){ return (...a)=>{ clearTimeout(timer); timer=setTimeout(()=>fn(...a), ms); }; }
  const onType = debounce(()=>{ const q=(input?.value||'').trim(); if(!q || q===lastQ){ if(!q) clearSuggest(); return; } lastQ=q; fetchSuggest(q); }, 200);
  function choose(i){ if(i<0||i>=items.length) return; if(input) input.value = items[i].symbol; clearSuggest(); run(); }
  function onKeyDown(e){
    if (!box || box.classList.contains('hidden')) return;
    if (e.key==='ArrowDown'){ e.preventDefault(); activeIdx=Math.min(items.length-1, activeIdx+1); renderSuggest(); }
    else if (e.key==='ArrowUp'){ e.preventDefault(); activeIdx=Math.max(0, activeIdx-1); renderSuggest(); }
    else if (e.key==='Enter'){ if(activeIdx>=0){ e.preventDefault(); choose(activeIdx); } }
    else if (e.key==='Escape'){ clearSuggest(); }
  }

  function setSignal(up, bindu){
    const chip=$('cSignal'); if(chip){ chip.className='chip '+(up?'up':'down'); chip.textContent=(up?'▲ Bullish':'▼ Bearish')+` • Bindu ${bindu}`; }
    const note=$('predNote'); if(note){ note.classList.remove('up','down'); note.classList.add(up?'up':'down'); note.textContent='Prediction For Next Day: '+(up?'▲ Price Up (1)':'▼ Price Down (0)'); }
  }
  function showApiDown(){
    const note=$('predNote'); if(note){ note.classList.remove('up','down'); note.textContent='Prediction For Next Day: API unavailable. Try again.'; }
    if(apiDot) apiDot.className='api-dot down';
  }

  async function run(){
    const q=(input?.value||'').trim();
    if(!q){ alert('Enter a company or ticker'); return; }
    if(card) card.classList.remove('hidden');
    setText('cTicker','Fetching… '+q.toUpperCase());
    setText('cOpen','-'); setText('cHigh','-'); setText('cLow','-'); setText('cClose','-');
    const sig=$('cSignal'); if(sig){ sig.className='chip'; sig.textContent='Loading...'; }
    setText('predNote','Prediction For Next Day: -');

    try{
      const r = await fetchWithTimeout(API + '/stock?q=' + encodeURIComponent(q), {}, 12000);
      if(!r.ok) throw 0;
      const d = await r.json();
      const {ticker, open, high, low, close} = d;
      setText('cTicker', ticker);
      setText('cOpen', Number(open).toFixed(2));
      setText('cHigh', Number(high).toFixed(2));
      setText('cLow',  Number(low).toFixed(2));
      setText('cClose',Number(close).toFixed(2));
      const o=open%9, h=high%9, l=low%9, c=close%9;
      const layer1=(o+c)%9, layer2=(h-l+9)%9, bindu=(layer1*layer2)%9;
      setSignal(bindu>=5, bindu);
      pingHealth(); // refresh dot after heavy call
    }catch(_){
      setText('cTicker','Error');
      const chip=$('cSignal'); if(chip){ chip.className='chip down'; chip.textContent='Failed to fetch'; }
      showApiDown();
    }
  }

  // ======= WORLD INDICES ticker now calls /indices ONCE =======
  function buildTrackFromRows(rows){
    const track = $('tickerTrack'), viewport = track?.parentElement;
    if(!track || !viewport) return;
    track.innerHTML='';
    const make = d => {
      const el=document.createElement('span');
      el.className='ticker-item';
      el.innerHTML = `
        <span class="nm">${d.name}</span>
        <span class="px">${d.price}</span>
        <span class="chg ${d.up ? 'up':'down'}">${d.up?'▲':'▼'} ${Number(d.chg).toFixed(2)} (${d.up?'+':''}${Number(d.pct).toFixed(2)}%)</span>`;
      return el;
    };
    rows.forEach(d=>track.appendChild(make(d)));
    while (track.scrollWidth < viewport.clientWidth * 2.2) rows.forEach(d=>track.appendChild(make(d)));
  }

  async function loadIndicesOnce(){
    const track = $('tickerTrack'); if(!track) return;
    // show cached immediately
    try{
      const cached = localStorage.getItem('tickerRows');
      if(cached){ const rows = JSON.parse(cached); if(Array.isArray(rows)&&rows.length) buildTrackFromRows(rows); }
    }catch(_){}

    try{
      const r = await fetchWithTimeout(API + '/indices', {}, 15000);
      if(!r.ok) throw 0;
      const data = await r.json();
      const rows = data.results || [];
      buildTrackFromRows(rows);
      try{ localStorage.setItem('tickerRows', JSON.stringify(rows)); }catch(_){}
      pingHealth(); // green dot if success
    }catch(_){
      if(!track.children.length) track.textContent='Markets ticker unavailable. Retrying…';
      if(apiDot) apiDot.className='api-dot down';
    }
  }

  function startTickerAnimation(){
    const track=$('tickerTrack'); if(!track) return;
    let pos=0, speed=40, last=null, paused=false;
    const step=t=>{
      if(paused){ last=t; return requestAnimationFrame(step); }
      if(!last) last=t;
      const dt=(t-last)/1000; last=t;
      pos -= speed*dt;
      const half=track.scrollWidth/2;
      if(-pos>=half) pos+=half;
      track.style.transform=`translateX(${pos}px)`;
      requestAnimationFrame(step);
    };
    const viewport=track.parentElement;
    viewport.addEventListener('mouseenter', ()=>paused=true);
    viewport.addEventListener('mouseleave', ()=>paused=false);
    requestAnimationFrame(step);
  }

  async function initTicker(){
    await loadIndicesOnce();
    startTickerAnimation();
    setInterval(loadIndicesOnce, 10*60*1000); // refresh every 10 min
  }

  // ===== init =====
  window.addEventListener('load', ()=>{
    pingHealth();
    initTicker();
  });
  if(input){
    input.addEventListener('input', onType);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('keydown', e=>{ if(e.key==='Enter' && (!box || box.classList.contains('hidden'))) run(); });
    input.addEventListener('blur', ()=> setTimeout(clearSuggest,120));
  }
  if(go) go.addEventListener('click', run);
})();
