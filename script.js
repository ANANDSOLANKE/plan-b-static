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
  function showSuggest(show){ box && box.classList.toggle('hidden', !show || items.length === 0); }
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
    try{
      const res = await fetch(API + '/suggest?q=' + encodeURIComponent(q));
      const data = await res.json();
      items = (data.results || []).slice(0,10);
      renderSuggest();
    }catch(e){ clearSuggest(); }
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
      note.classList.remove('up','down');         // reset classes
      note.classList.add(up ? 'up' : 'down');     // green blink if up, red blink if down
      note.textContent = 'Prediction For Next Day: ' + (up ? '▲ Price Up (1)' : '▼ Price Down (0)');
    }
  }

  /* ---------- Core run: fetch OHLC + compute bindu ---------- */
  async function run(){
    const q = (input?.value||'').trim();
    if(!q){ alert('Enter a company or ticker'); return; }

    if(card) card.classList.remove('hidden');
    setText('cTicker', 'Fetching… ' + q.toUpperCase());
    setText('cOpen','—'); setText('cHigh','—'); setText('cLow','—'); setText('cClose','—');
    const sig = $('cSignal'); if(sig){ sig.className = 'chip'; sig.textContent = 'Loading…'; }
    setText('predNote', 'Prediction For Next Day: …');

    try{
      const r = await fetch(API + '/stock?q=' + encodeURIComponent(q));
      const d = await r.json();
      if(!r.ok) throw new Error(d.error || 'Request failed');

      const {ticker, open, high, low, close} = d;
      setText('cTicker', ticker);
      setText('cOpen', Number(open).toFixed(2));
      setText('cHigh', Number(high).toFixed(2));
      setText('cLow',  Number(low).toFixed(2));
      setText('cClose',Number(close).toFixed(2));

      // Yantra math
      const o=open%9, h=high%9, l=low%9, c=close%9;
      const layer1=(o+c)%9, layer2=(h-l+9)%9, bindu=(layer1*layer2)%9;
      const up = bindu >= 5;
      setSignal(up, bindu);
    }catch(e){
      setText('cTicker', 'Error');
      const chip = $('cSignal'); if(chip){ chip.className='chip down'; chip.textContent='Failed to fetch'; }
      setText('predNote', 'Prediction For Next Day: —');
      console.error(e);
    }
  }

  /* ---------- Events ---------- */
  if(input){
    input.addEventListener('input', onType);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('keydown', e => { if(e.key==='Enter' && (!box || box.classList.contains('hidden'))) run(); });
    input.addEventListener('blur', () => setTimeout(clearSuggest, 120));
  }
  if(go) go.addEventListener('click', run);

  // No trending loader (removed)
})();
