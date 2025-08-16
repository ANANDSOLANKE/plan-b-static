// ==== CONFIG ====
const API_BASE = "https://api.stockpricepredictions.com"; // <-- change if running locally
// ===============

const $ = (id) => document.getElementById(id);
const box = $("searchBox");
const sug = $("suggestions");
const ribbonTrack = $("ribbonTrack");

const elSymbol = $("selSymbol");
const elExTz   = $("exchangeTz");
const elLast   = $("lastDate");
const elOpen   = $("open");
const elHigh   = $("high");
const elLow    = $("low");
const elClose  = $("close");
const elVol    = $("volume");
const elPred   = $("predDate");
const elDebug  = $("debugBars");

// Year in footer
$("year").textContent = String(new Date().getFullYear());

// ---------- Debounce ----------
function debounce(fn, ms){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}

// ---------- Search ----------
async function fetchSuggestions(q){
  try{
    const r = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
    if(!r.ok) return [];
    return await r.json();
  }catch(e){ return []; }
}

function renderSuggestions(items){
  if(!items.length){
    sug.style.display = "none";
    sug.innerHTML = "";
    return;
  }
  sug.innerHTML = items.map(it => `
    <div class="suggestion-item" data-symbol="${it.symbol}">
      <div class="suggestion-left">
        <strong>${(it.shortname || it.symbol || "").toString().slice(0,60)}</strong>
        <span style="opacity:.7">${it.symbol}</span>
      </div>
      <div class="suggestion-right">${(it.exch || "")} ${(it.type? "• "+it.type : "")}</div>
    </div>
  `).join("");
  sug.style.display = "block";
}

sug.addEventListener("click", (e) => {
  const item = e.target.closest(".suggestion-item");
  if(!item) return;
  const symbol = item.getAttribute("data-symbol");
  box.value = symbol;
  sug.style.display = "none";
  loadSelectedSymbol(symbol);
});

box.addEventListener("input", debounce(async (e)=>{
  const q = e.target.value.trim();
  if(q.length < 2){ sug.style.display = "none"; return; }
  const items = await fetchSuggestions(q);
  renderSuggestions(items);
}, 200));

document.addEventListener("click", (e)=>{
  if(!sug.contains(e.target) && e.target !== box) sug.style.display = "none";
});

// ---------- Selection loader ----------
async function loadSelectedSymbol(sym){
  try{
    // debug=1 so we can show the last 5 bars
    const r = await fetch(`${API_BASE}/stock?symbol=${encodeURIComponent(sym)}&debug=1`);
    const data = await r.json();

    if(!r.ok){
      elSymbol.textContent = `Error: ${data?.error || r.status}`;
      elExTz.textContent = "";
      return;
    }

    elSymbol.textContent = data.symbol || sym;
    elExTz.textContent = data.exchange_timezone ? `Exchange TZ: ${data.exchange_timezone}` : "";
    elLast.textContent = data.last_completed_session_date || "—";
    const o = data.ohlc_used || {};
    elOpen.textContent  = isFinite(o.open)  ? Number(o.open).toFixed(2) : "—";
    elHigh.textContent  = isFinite(o.high)  ? Number(o.high).toFixed(2) : "—";
    elLow.textContent   = isFinite(o.low)   ? Number(o.low).toFixed(2) : "—";
    elClose.textContent = isFinite(o.close) ? Number(o.close).toFixed(2) : "—";
    elVol.textContent   = isFinite(o.volume) ? new Intl.NumberFormat().format(o.volume) : "—";
    elPred.textContent  = data.prediction_date || "—";

    if(Array.isArray(data.recent_bars)){
      const lines = data.recent_bars.map(b=>(
        `${b.date_ex}  O:${fmtNum(b.open)}  H:${fmtNum(b.high)}  L:${fmtNum(b.low)}  C:${fmtNum(b.close)}  V:${fmtInt(b.volume)}`
      ));
      elDebug.textContent = lines.join("\n");
    }else{
      elDebug.textContent = "";
    }

  }catch(err){
    elSymbol.textContent = `Error: ${err.message}`;
    elExTz.textContent = "";
  }
}

function fmtNum(x){ return isFinite(x) ? Number(x).toFixed(2) : "—"; }
function fmtInt(x){ return isFinite(x) ? new Intl.NumberFormat().format(x) : "—"; }

// ---------- Ribbon ----------
async function loadRibbon(){
  try{
    const r = await fetch(`${API_BASE}/ribbon`);
    if(!r.ok) return;
    const items = await r.json();
    const pass = items.map(x=>{
      const p = isFinite(x.price) ? Number(x.price).toFixed(2) : "--";
      const pc = (x.changePercent == null) ? "" : `${Number(x.changePercent).toFixed(2)}%`;
      const cls = (x.changePercent == null) ? "" : (x.changePercent >= 0 ? "up" : "down");
      const name = (x.name && x.name.length>22) ? x.name.slice(0,22)+"…" : (x.name || x.symbol);
      return `<span class="ribbon-chip ${cls}" title="${x.symbol}">${name} ${p} ${pc}</span>`;
    }).join("");

    // Duplicate for seamless scroll
    ribbonTrack.innerHTML = pass + pass;
  }catch(e){ /* ignore */ }
}

// Load ribbon periodically
loadRibbon();
setInterval(loadRibbon, 60000);

// Optional: preload something on first visit
// loadSelectedSymbol("^NSEI");
