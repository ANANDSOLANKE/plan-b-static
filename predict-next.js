(function(){
  const API = window.API_BASE || "http://localhost:5000";
  const input = document.getElementById('symbol');
  const btn = document.getElementById('go');
  const out = document.getElementById('result');
  const dateBox = document.getElementById('dates');

  async function fetchPrediction(sym){
    const url = `${API}/predict-next?symbol=${encodeURIComponent(sym)}`;
    const res = await fetch(url, { mode:'cors' });
    if(!res.ok){
      const t = await res.text().catch(()=>'');
      throw new Error(`API error ${res.status}: ${t}`);
    }
    return await res.json();
  }

  function renderPrediction(data){
    if(!out) return;
    const p = data.prediction || {};
    const prev = data.previous_day || {};
    out.innerHTML = `
      <div class="card">
        <h3>Prediction for <strong>${p.target_date || '-'}</strong></h3>
        <div class="grid two">
          <div>
            <div class="muted">Based on previous day (OHLC) – ${prev.date || '-'}</div>
            <ul class="kv">
              <li><span>Open</span><b>${fmt(prev.open)}</b></li>
              <li><span>High</span><b>${fmt(prev.high)}</b></li>
              <li><span>Low</span><b>${fmt(prev.low)}</b></li>
              <li><span>Close</span><b>${fmt(prev.close)}</b></li>
              <li><span>Volume</span><b>${fmt(prev.volume)}</b></li>
            </ul>
          </div>
          <div class="big-num">
            <div class="muted">Next-day predicted close</div>
            <div class="value">${fmt(p.predicted_close)}</div>
            <div class="muted tiny">Method: ${p.method || '-'}</div>
          </div>
        </div>
      </div>
    `;
  }

  function fmt(v){
    if(v === null || v === undefined || Number.isNaN(v)) return '-';
    const n = Number(v);
    if(!Number.isFinite(n)) return String(v);
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  async function run(){
    const sym = (input && input.value || "AAPL").trim().toUpperCase();
    try{
      out.innerHTML = "<div class='muted'>Loading...</div>";
      const data = await fetchPrediction(sym);
      renderPrediction(data);
    }catch(err){
      out.innerHTML = `<div class='error'>${err.message}</div>`;
    }
  }

  if(btn) btn.addEventListener('click', run);
  if(input) input.addEventListener('keydown', e => { if(e.key==='Enter') run(); });

  // auto-run if symbol preset via query (?s=)
  const params = new URLSearchParams(location.search);
  const qs = params.get('s');
  if(qs){
    if(input) input.value = qs.toUpperCase();
    run();
  }
})();