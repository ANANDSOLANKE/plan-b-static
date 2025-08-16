// script.js  — unified front-end for suggest, OHLC card, and indices ribbon
(function(){
  // ---------------------------
  // Config & DOM
  // ---------------------------
  const API = (window.API_BASE || "").replace(/\/$/, "");
  const elInput     = document.getElementById("ticker");
  const elBtn       = document.getElementById("go");
  const elSuggest   = document.getElementById("suggestBox");

  const elCard      = document.getElementById("card");
  const elCTicker   = document.getElementById("cTicker");
  const elCOpen     = document.getElementById("cOpen");
  const elCHigh     = document.getElementById("cHigh");
  const elCLow      = document.getElementById("cLow");
  const elCClose    = document.getElementById("cClose");
  const elCSignal   = document.getElementById("cSignal");
  const elPredNote  = document.getElementById("predNote");

  const elTickerTrack = document.getElementById("tickerTrack");

  // ---------------------------
  // Helpers
  // ---------------------------
  const fmt2 = (n) => {
    if (n == null || Number.isNaN(+n)) return "-";
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const debounce = (fn, ms=200) => {
    let t=null;
    return (...args) => { clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
  };

  const normalizeSymbol = (v) => {
    v = String(v||"").trim().toUpperCase();
    if (!v) return v;
    if (v.startsWith("^")) return v;     // index (not used for predict)
    if (/\.\w+$/.test(v)) return v;      // already has suffix
    return v + ".NS";                    // default to NSE; enhancer will fallback to BSE if needed
  };

  const showCard = () => elCard && elCard.classList.remove("hidden");

  // ---------------------------
  // Autocomplete
  // ---------------------------
  async function fetchSuggest(q){
    if (!q) return [];
    try{
      const res = await fetch(`${API}/suggest?q=${encodeURIComponent(q)}`, { mode: "cors" });
      if(!res.ok) throw new Error("suggest http "+res.status);
      const j = await res.json();
      return Array.isArray(j.suggestions) ? j.suggestions : [];
    }catch(e){
      console.warn("suggest error:", e);
      return [];
    }
  }

  function renderSuggest(items){
    if (!elSuggest) return;
    if (!items.length){
      elSuggest.innerHTML = "";
      elSuggest.classList.add("hidden");
      return;
    }
    const html = items.slice(0, 8).map(it=>{
      const sym = it.symbol || "";
      const name = it.name || "";
      const exch = it.exch || "";
      return `<div class="suggest-item" data-sym="${sym}"><strong>${sym}</strong> <span>${name}${exch?` • ${exch}`:""}</span></div>`;
    }).join("");
    elSuggest.innerHTML = html;
    elSuggest.classList.remove("hidden");
  }

  const onType = debounce(async (ev)=>{
    const q = elInput.value.trim();
    if (!q){ renderSuggest([]); return; }
    const list = await fetchSuggest(q);
    renderSuggest(list);
  }, 180);

  if (elInput){
    elInput.addEventListener("input", onType);
    elInput.addEventListener("focus", ()=> {
      if (elSuggest && elSuggest.innerHTML) elSuggest.classList.remove("hidden");
    });
    document.addEventListener("click", (e)=>{
      if (!elSuggest) return;
      if (!elSuggest.contains(e.target) && e.target !== elInput){
        elSuggest.classList.add("hidden");
      }
    });
    if (elSuggest){
      elSuggest.addEventListener("click", (e)=>{
        const item = e.target.closest(".suggest-item");
        if (!item) return;
        const sym = item.getAttribute("data-sym");
        if (sym){
          elInput.value = sym;
          elSuggest.classList.add("hidden");
          run(sym);
        }
      });
    }
  }

  // ---------------------------
  // Main run (populate card)
  // ---------------------------
  async function fetchPredict(symRaw){
    // For OHLC we will use /predict-next → previous_day
    const SYM = normalizeSymbol(symRaw);
    if (!SYM || SYM.startsWith("^")) throw new Error("Invalid symbol");
    // try NSE first; if 404/no OHLC, retry BSE once
    let url = `${API}/predict-next?symbol=${encodeURIComponent(SYM)}`;
    let res = await fetch(url, { mode: "cors" });
    if (!res.ok){
      // retry BSE if symbol was defaulted/ends with .NS
      if (SYM.endsWith(".NS")){
        const bse = SYM.replace(/\.NS$/, ".BO");
        res = await fetch(`${API}/predict-next?symbol=${encodeURIComponent(bse)}`, { mode: "cors" });
      }
    }
    const j = await res.json();
    if (!res.ok) throw new Error(j && j.error ? j.error : "predict-next failed");
    return j;
  }

  function computeSignal(prevClose, predictedClose){
    if (!isFinite(+prevClose) || !isFinite(+predictedClose)) return { chip:"→ Neutral (0)", plain:"→ Neutral (0)" };
    const diff = +predictedClose - +prevClose;
    if (Math.abs(diff) < 1e-6) return { chip:"→ Sideways (0)", plain:"→ Sideways (0)" };
    if (diff > 0) return { chip:"▲ Price Up (1)", plain:"▲ Price Up (1)" };
    return { chip:"▼ Price Down (1)", plain:"▼ Price Down (1)" };
  }

  async function run(symRaw){
    try{
      const SYM = normalizeSymbol(symRaw || elInput.value);
      if (!SYM){ return; }

      // Set ticker immediately (mutation observed by enhancer too)
      if (elCTicker) elCTicker.textContent = SYM;
      showCard();

      const data = await fetchPredict(SYM);

      // Fill OHLC from previous_day (last completed session)
      const prev = data.previous_day || {};
      if (elCOpen)  elCOpen.textContent  = fmt2(prev.open);
      if (elCHigh)  elCHigh.textContent  = fmt2(prev.high);
      if (elCLow)   elCLow.textContent   = fmt2(prev.low);
      if (elCClose) elCClose.textContent = fmt2(prev.close);

      // Compute simple next-day signal by comparing predicted vs prev close
      const predicted = data.prediction && data.prediction.predicted_close;
      const sig = computeSignal(prev.close, predicted);

      // Update your chip so the enhancer uses this exact text after colon
      if (elCSignal) elCSignal.textContent = sig.chip;

      // Also set an initial pred line (enhancer will overwrite date portion)
      if (elPredNote){
        elPredNote.textContent = `Prediction For Next Day Date: ${(data.prediction && data.prediction.target_date) || "-"} : ${sig.plain}`;
      }

    }catch(e){
      console.warn("run error:", e);
      // leave prior content intact
    }
  }

  if (elBtn){
    elBtn.addEventListener("click", ()=> run());
  }
  if (elInput){
    elInput.addEventListener("keydown", (e)=> { if (e.key === "Enter") run(); });
  }

  // ---------------------------
  // Global indices ribbon
  // ---------------------------
  const INDICES = [
    "^GSPC", "^DJI", "^NDX", "^FTSE", "^GDAXI", "^FCHI", "^N225", "^HSI", "^AXJO",
    "^BSESN", "^NSEI", "^NSEBANK"
  ];

  async function fetchQuote(sym){
    try{
      const r = await fetch(`${API}/stock?q=${encodeURIComponent(sym)}`, { mode:"cors" });
      if (!r.ok) throw new Error("quote http "+r.status);
      const j = await r.json();
      return { symbol: sym, price: j.price, change_pct: j.change_pct };
    }catch(e){
      return { symbol: sym, price: null, change_pct: null };
    }
  }

  async function loadIndices(){
    if (!elTickerTrack) return;
    const results = await Promise.all(INDICES.map(fetchQuote));
    const html = results.map(it=>{
      const p = (it.price==null) ? "0.00" : fmt2(it.price);
      const ch = (it.change_pct==null) ? "0.00%" : `${fmt2(it.change_pct)}%`;
      const cls = (it.change_pct==null) ? "" : (it.change_pct>0 ? "pos" : (it.change_pct<0 ? "neg" : ""));
      return `<span class="tick ${cls}"><strong>${it.symbol}</strong> ${p} <em>${ch}</em></span>`;
    }).join("");
    elTickerTrack.innerHTML = html + html; // duplicate for smooth scroll
  }

  // Initial indices load; repeat occasionally
  loadIndices();
  setInterval(loadIndices, 60 * 1000);
})();
