(function(){
  const API = window.API_BASE || "";
  const $ = id => document.getElementById(id);

  const input = $('ticker');
  const go = $('go');
  const box = $('suggestBox');
  const card = $('card');

  const setText = (id,val)=>{ const el = $(id); if(el) el.textContent = val; };

  let items = [];
  let activeIdx = -1;
  let lastQ = "";
  let timer = null;

  /* ---------- Suggestions (typeahead) ---------- */
  function showSuggest(show){ if(!box) return; box.classList.toggle('hidden', !show || items.length === 0); }
  function clearSuggest(){ items = []; if(box){ box.innerHTML = ""; box.classList.add('hidden'); } activeIdx = -1; }
  function renderSuggest() {
    if(!box) return;
    box.innerHTML = "";
    items.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'suggest-item' + (idx === activeIdx ? ' active' : '');
      row.setAttribute('role','option');
      row.innerHTML = `
        <div class="left">${it.symbol || ''}</div>
        <div class="right">${(it.shortname || '').slice(0,70)} ${it.exchange ? ' · ' + it.exchange : ''}</div>
      `;
      row.addEventListener('mousedown', (e) => { e.preventDefault(); choose(idx); });
      box.appendChild(row);
    });
    showSuggest(true);
  }

  async function fetchSuggest(q){
    if(!API){ console.warn("API_BASE not set"); return clearSuggest(); }
    try{
      const res = await fetch(API + '/suggest?q=' + encodeURIComponent(q));
      if(!res.ok) throw new Error(await res.text());
      const data = await res.json();
      items = (data.results || []).slice(0,10);
      renderSuggest();
    }catch(e){
      console.warn("suggest error:", e.message || e);
      clearSuggest();
    }
  }

  function debounce(fn, ms){
    return function(...args){
      clearTimeout(timer);
      timer = setTimeout(()=>fn.apply(this,args), ms);
    };
  }

  const onType = debounce(() => {
    const q = (input?.value || '').trim();
    if (!q || q === lastQ) { if(!q) clearSuggest(); return; }
    lastQ = q;
    fetchSuggest(q);
  }, 200);

  function choose(idx){
    if (idx < 0 || idx >= items.length) return;
    const sym = items[idx].symbol;
    if(input) input.value = sym;
    clearSuggest();
    run();
  }

  function onKeyDown(e){
    if (!box || box.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(items.length-1, activeIdx+1); renderSuggest(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(0, activeIdx-1); renderSuggest(); }
    else if (e.key === 'Enter') { if (activeIdx >= 0) { e.preventDefault(); choose(activeIdx); } }
    else if (e.key === 'Escape') { clearSuggest(); }
  }

  /* ---------- Signal rendering ---------- */
  function setSignal(up, bindu){
    const chip = $('cSignal');
    if (chip){
      chip.className = 'chip ' + (up ? 'up' : 'down');
      chip.textContent = (up ? '▲ Bullish' : '▼ Bearish') + ` • Bindu ${bindu}`;
    }

    const note = $('predNote');
    if (note){
      note.classList.remove('up','down');
      note.classList.add(up ? 'up' : 'down');
      note.textContent = 'Prediction For Next Day: ' + (up ? '▲ Price Up (1)' : '▼ Price Down (0)');
    }
  }

  /* ---------- Core run: fetch OHLC + compute bindu ---------- */
  async function run(){
    const q = (input?.value||'').trim();
    if(!q){ alert('Enter a company or ticker'); return; }

    if(card) card.classList.remove('hidden');
    setText('cTicker', 'Fetching… ' + q.toUpperCase());
    setText('cOpen','-'); setText('cHigh','-'); setText('cLow','-'); setText('cClose','-');
    const sig = $('cSignal'); if(sig){ sig.className = 'chip'; sig.textContent = 'Loading...'; }
    setText('predNote', 'Prediction For Next Day: -');

    try{
      const r = await fetch(API + '/stock?q=' + encodeURIComponent(q));
      if(!r.ok) throw new Error(await r.text());
      const d = await r.json();

      const {ticker, open, high, low, close} = d;
      setText('cTicker', ticker);
      setText('cOpen', Number(open).toFixed(2));
      setText('cHigh', Number(high).toFixed(2));
      setText('cLow',  Number(low).toFixed(2));
      setText('cClose',Number(close).toFixed(2));

      const o=open%9, h=high%9, l=low%9, c=close%9;
      const layer1=(o+c)%9, layer2=(h-l+9)%9, bindu=(layer1*layer2)%9;
      const up = bindu >= 5;
      setSignal(up, bindu);
    }catch(e){
      setText('cTicker', 'Error');
      const chip = $('cSignal'); if(chip){ chip.className='chip down'; chip.textContent='Failed to fetch'; }
      setText('predNote', 'Prediction For Next Day: -');
      console.error("stock error:", e.message || e);
    }
  }

  /* ---------- WORLD INDICES: smooth marquee ribbon ---------- */
  const TICKER_SYMBOLS = [
    {name:'S&P 500',    sym:'^GSPC'},
    {name:'Dow Jones',  sym:'^DJI'},
    {name:'Nasdaq 100', sym:'^NDX'},
    {name:'FTSE 100',   sym:'^FTSE'},
    {name:'DAX',        sym:'^GDAXI'},
    {name:'CAC 40',     sym:'^FCHI'},
    {name:'Nikkei 225', sym:'^N225'},
    {name:'Hang Seng',  sym:'^HSI'},
    {name:'ASX 200',    sym:'^AXJO'},
    {name:'Sensex',     sym:'^BSESN'},
    {name:'Nifty 50',   sym:'^NSEI'},
    {name:'Bank Nifty', sym:'^NSEBANK'}
  ];

  async function fetchIndex(symObj){
    try{
      const r = await fetch(API + '/stock?q=' + encodeURIComponent(symObj.sym));
      if(!r.ok) throw new Error(await r.text());
      const d = await r.json();
      const px = Number(d.close), op = Number(d.open);
      const chg = px - op, pct = op ? (chg/op*100) : 0;
      return {
        name: symObj.name,
        price: isFinite(px) ? px.toFixed(2) : '-',
        chg: isFinite(chg) ? chg.toFixed(2) : '0.00',
        pct: isFinite(pct) ? pct.toFixed(2) : '0.00',
        up: chg >= 0
      };
    }catch(e){
      return {name:symObj.name, price:'-', chg:'0.00', pct:'0.00', up:false};
    }
  }

  async function buildTickerOnce(){
    const track = document.getElementById('tickerTrack');
    const viewport = track?.parentElement;
    if(!track || !viewport) return;

    // get data
    const rows = [];
    for(const s of TICKER_SYMBOLS){ /* eslint-disable no-await-in-loop */
      rows.push(await fetchIndex(s));
    }

    // build one pass
    track.innerHTML = '';
    const makeItem = (d) => {
      const el = document.createElement('span');
      el.className = 'ticker-item';
      el.innerHTML = `
        <span class="nm">${d.name}</span>
        <span class="px">${d.price}</span>
        <span class="chg ${d.up ? 'up' : 'down'}">${d.up ? '▲' : '▼'} ${d.chg} (${d.up?'+':''}${d.pct}%)</span>
      `;
      return el;
    };
    rows.forEach(d => track.appendChild(makeItem(d)));

    // duplicate until > 2× viewport width for seamless scroll
    while (track.scrollWidth < viewport.clientWidth * 2.2) {
      rows.forEach(d => track.appendChild(makeItem(d)));
    }
  }

  function startTickerAnimation(){
    const track = document.getElementById('tickerTrack');
    if(!track) return;

    let pos = 0;            // translateX in px
    const speed = 40;       // px per second
    let last = null;
    let paused = false;

    const onFrame = (t) => {
      if (paused) { last = t; requestAnimationFrame(onFrame); return; }
      if (!last) last = t;
      const dt = (t - last) / 1000; last = t;
      pos -= speed * dt;

      const half = track.scrollWidth / 2;
      if (-pos >= half) pos += half;       // loop seamlessly
      track.style.transform = `translateX(${pos}px)`;
      requestAnimationFrame(onFrame);
    };

    const viewport = track.parentElement;
    viewport.addEventListener('mouseenter', ()=> paused = true);
    viewport.addEventListener('mouseleave', ()=> paused = false);

    requestAnimationFrame(onFrame);
  }

  async function initTicker(){
    await buildTickerOnce();
    startTickerAnimation();
    setInterval(async ()=>{ await buildTickerOnce(); }, 10 * 60 * 1000); // refresh every 10 min
  }

  /* ---------- Init ---------- */
  window.addEventListener('load', async () => {
    initTicker();                       // start the scrolling ribbon
  });

  if(input){
    input.addEventListener('input', onType);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('keydown', e => { if(e.key==='Enter' && (!box || box.classList.contains('hidden'))) run(); });
    input.addEventListener('blur', () => setTimeout(clearSuggest, 120));
  }
  if(go) go.addEventListener('click', run);

})();
