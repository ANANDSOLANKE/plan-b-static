// script.js — all calls go through your Render backend to avoid Yahoo/CORS blocks
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
  const elDisplay   = document.getElementById("mktDisplay");
  const elYes       = document.getElementById("mktYes");

  const elTickerTrack = document.getElementById("tickerTrack");

  // ---------------------------
  // Helpers
  // ---------------------------
  const fmt2 = (n) => {
    if (n == null || Number.isNaN(+n)) return "-";
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  const debounce = (fn, ms=160) => { let t=null; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a), ms);}; };
  const normalizeSymbol = (v) => {
    v = String(v||"").trim().toUpperCase();
    if (!v) return v;
    if (v.startsWith("^")) return v;   // index (not used for predict)
    if (/\.\w+$/.test(v)) return v;    // already has suffix
    return v + ".NS";                  // default NSE
  };
  const showCard = () => elCard && elCard.classList.remove("hidden");

  async function fetchJSON(url){
    const res = await fetch(url, { mode: "cors" });
    const txt = await res.text();
    let j; try { j = JSON.parse(txt); } catch { j = { error: txt }; }
    return { ok: res.ok, status: res.status, json: j };
  }

  // ---------------------------
  // Autocomplete (server-side proxy on Render)
  // ---------------------------
  async function getSuggest(q){
    const r = await fetchJSON(`${API}/suggest?q=${encodeURIComponent(q)}`);
    if (r.ok && Array.isArray(r.json.suggestions)) return r.json.suggestions;
    return [];
  }

  function renderSuggest(items){
    if (!elSuggest) return;
    if (!items.length){
      elSuggest.innerHTML = "";
      elSuggest.classList.add("hidden");
      return;
    }
    const html = items.slice(0, 12).map(it=>{
      const sym = it.symbol || "";
      const name = it.name || "";
      const exch = it.exch || "";
      return `<div class="suggest-item" data-sym="${sym}"><strong>${sym}</strong> <span>${name}${exch?` • ${exch}`:""}</span></div>`;
    }).join("");
    elSuggest.innerHTML = html;
    elSuggest.classList.remove("hidden");
  }

  const onType = debounce(async ()=>{
    const q = elInput.value.trim();
    if (!q){ renderSuggest([]); return; }
    const list = await getSuggest(q);
    renderSuggest(list);
  });

  if (elInput){
    elInput.addEventListener("input", onType);
    elInput.addEventListener("focus", ()=> { if (elSuggest && elSuggest.innerHTML) elSuggest.classList.remove("hidden"); });
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
  // Prediction (Render host)
  // ---------------------------
  async function getPredict(sym){
    const r = await fetchJSON(`${API}/predict-next?symbol=${encodeURIComponent(sym)}`);
    if (!r.ok) throw new Error(r.json && r.json.error ? r.json.error : "predict-next failed");
    return r.json;
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

      if (elCTicker) elCTicker.textContent = SYM;
      showCard();

      const data = await getPredict(SYM);

      const prev = data.previous_day || {};
      if (elCOpen)  elCOpen.textContent  = fmt2(prev.open);
      if (elCHigh)  elCHigh.textContent  = fmt2(prev.high);
      if (elCLow)   elCLow.textContent   = fmt2(prev.low);
      if (elCClose) elCClose.textContent = fmt2(prev.close);

      const predicted = data.prediction && data.prediction.predicted_close;
      const sig = computeSignal(prev.close, predicted);
      if (elCSignal) elCSignal.textContent = sig.chip;

      if (elPredNote){
        elPredNote.textContent = `Prediction For Next Day Date: ${(data.prediction && data.prediction.target_date) || "-"} : ${sig.plain}`;
      }

      const openNow = !!(data.market_meta && data.market_meta.market_open_now);
      const venue   = (data.market_meta && data.market_meta.venue) || "";
      if (elYes){
        elYes.textContent = openNow ? "Yes" : "No";
        elYes.classList.remove("chip--ok","chip--off");
        elYes.classList.add(openNow ? "chip--ok" : "chip--off");
      }
      if (elDisplay){
        elDisplay.textContent = `Display Market: ${openNow ? "Open" : "Closed"}${venue?` (${venue})`:""}`;
      }
    }catch(e){
      console.warn("run error:", e);
    }
  }

  if (elBtn){ elBtn.addEventListener("click", ()=> run()); }
  if (elInput){ elInput.addEventListener("keydown", (e)=> { if (e.key === "Enter") run(); }); }

  // ---------------------------
  // World indices scrolling ribbon (also via Render)
  // ---------------------------
  const INDICES = [
    "^GSPC", "^DJI", "^NDX", "^FTSE", "^GDAXI", "^FCHI", "^N225", "^HSI", "^AXJO",
    "^BSESN", "^NSEI", "^NSEBANK"
  ];

  async function getQuote(sym){
    const r = await fetchJSON(`${API}/stock?q=${encodeURIComponent(sym)}`);
    if (r.ok) return { price: r.json.price, change_pct: r.json.change_pct };
    return { price: null, change_pct: null };
  }

  async function loadIndices(){
    if (!elTickerTrack) return;
    const results = await Promise.all(INDICES.map(async(sym)=>{
      const q = await getQuote(sym);
      return { symbol: sym, price: q.price, change_pct: q.change_pct };
    }));
    const row = results.map(it=>{
      const p = (it.price==null) ? "0.00" : fmt2(it.price);
      const ch = (it.change_pct==null) ? "0.00%" : `${fmt2(it.change_pct)}%`;
      const cls = (it.change_pct==null) ? "" : (it.change_pct>0 ? "pos" : (it.change_pct<0 ? "neg" : ""));
      return `<span class="tick ${cls}"><strong>${it.symbol}</strong> ${p} <em>${ch}</em></span>`;
    }).join("");

    // Duplicate for seamless CSS animation
    elTickerTrack.innerHTML = row + row;

    // Restart animation each refresh (keeps it moving)
    elTickerTrack.style.animation = "none";
    // force reflow
    // eslint-disable-next-line no-unused-expressions
    elTickerTrack.offsetHeight;
    elTickerTrack.style.animation = "";
  }

  loadIndices();
  setInterval(loadIndices, 60 * 1000);
})();
