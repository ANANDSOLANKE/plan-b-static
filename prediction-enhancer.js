// prediction-enhancer.js
(function () {
  // Use dedicated predictor base if set, else fall back to app base
  const BASE = (window.API_BASE_PRED || window.API_BASE || "").replace(/\/$/, "");
  if (!BASE) {
    console.warn("[prediction-enhancer] No API base configured");
    return;
  }

  // Elements from your existing card
  const elTicker = document.getElementById("cTicker");   // shows the chosen symbol/ticker name
  const elPredNote = document.getElementById("predNote"); // contains "Prediction For Next Day: ▲ Price Up (1)"
  const input = document.getElementById("ticker");        // your main search box
  const btn = document.getElementById("go");              // your main Analyze button

  if (!elPredNote) {
    console.warn("[prediction-enhancer] #predNote not found");
    return;
  }

  // Render helper: append dates + predicted close after your existing signal text
  function renderDatesAppend(data) {
    if (!data || !data.prediction || !data.previous_day) return;

    const p = data.prediction;
    const prev = data.previous_day;

    // Existing text (e.g., "Prediction For Next Day: ▲ Price Up (1)")
    const baseText = elPredNote.textContent || "Prediction For Next Day:";

    // Append date info
    const extra = ` — Based on ${prev.date || "-"} → for ${p.target_date || "-"} (Pred Close: ${
      isFinite(+p.predicted_close) ? (+p.predicted_close).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "-"
    })`;

    // Avoid duplicating if re-rendered
    if (!baseText.includes("Based on ")) {
      elPredNote.textContent = baseText + extra;
    } else {
      // If already appended once, replace the trailing part
      elPredNote.textContent = baseText.replace(/— Based on .*$/, extra);
    }
  }

  async function fetchPredict(symbolLike) {
    const sym = String(symbolLike || "").trim().toUpperCase();
    if (!sym) return;
    try {
      const url = `${BASE}/predict-next?symbol=${encodeURIComponent(sym)}`;
      const res = await fetch(url, { mode: "cors" });
      const txt = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${txt}`);
      const data = JSON.parse(txt);
      renderDatesAppend(data);
    } catch (err) {
      console.warn("[prediction-enhancer] fetch failed:", err);
      // Don’t show a visible error; your card stays intact if prediction call fails
    }
  }

  // Strategy 1: watch for changes to #cTicker (your app updates it when a stock is loaded)
  if (elTicker) {
    let lastVal = elTicker.textContent;
    const mo = new MutationObserver(() => {
      const curr = elTicker.textContent && elTicker.textContent.trim();
      if (curr && curr !== lastVal) {
        lastVal = curr;
        // curr may be "RELIANCE.NS" or "RELIANCE (NSE)"; prefer the input if it's a better symbol
        const fallback = (input && input.value) ? input.value : curr;
        // Heuristic: pick the first token with a dot (e.g., RELIANCE.NS) or fallback
        const token = (fallback.split(/\s+/).find(t => /\.\w+$/.test(t)) || fallback).toUpperCase();
        fetchPredict(token);
      }
    });
    mo.observe(elTicker, { characterData: true, childList: true, subtree: true });
  }

  // Strategy 2: also hook your Analyze button & Enter key, to ensure we trigger prediction
  function triggerFromInput() {
    const v = (input && input.value) ? input.value : (elTicker && elTicker.textContent) || "";
    // Prefer symbols like TCS.NS if present in input
    const token = (String(v).split(/\s+/).find(t => /\.\w+$/.test(t)) || v).toUpperCase();
    if (token) fetchPredict(token);
  }

  if (btn) {
    btn.addEventListener("click", () => {
      // Defer slightly so your app updates #cTicker and OHLC first
      setTimeout(triggerFromInput, 150);
    }, { capture: true });
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        setTimeout(triggerFromInput, 150);
      }
    }, { capture: true });
  }
})();
