(function () {
  // ====== Config ======
  const API = (window.API_BASE || "").replace(/\/+$/, "");   // e.g., "https://your-api.onrender.com"
  const MAX_SUGGESTIONS = 8;
  const DEBOUNCE_MS = 180;

  // ====== Helpers ======
  const $ = (id) => document.getElementById(id);
  const elInput = $("ticker");
  const elGo = $("go");
  const elCard = $("card");
  const elCTicker = $("cTicker");
  const elOpen = $("cOpen");
  const elHigh = $("cHigh");
  const elLow = $("cLow");
  const elClose = $("cClose");
  const elSignal = $("cSignal");
  const elNote = $("predNote");

  // Create suggestions container if missing
  let elSug = $("suggestions");
  if (!elSug) {
    elSug = document.createElement("div");
    elSug.id = "suggestions";
    elSug.style.position = "absolute";
    elSug.style.zIndex = 9999;
    elSug.style.background = "#0f172a";
    elSug.style.border = "1px solid #1f2937";
    elSug.style.borderRadius = "10px";
    elSug.style.marginTop = "4px";
    elSug.style.padding = "6px 0";
    elSug.style.display = "none";
    elSug.style.maxHeight = "280px";
    elSug.style.overflowY = "auto";

    // Try to place under input
    if (elInput && elInput.parentElement) {
      elInput.parentElement.style.position = "relative";
      elInput.parentElement.appendChild(elSug);
    } else {
      document.body.appendChild(elSug);
    }
  }

  function showSuggestions(items) {
    if (!items || items.length === 0) {
      elSug.style.display = "none";
      elSug.innerHTML = "";
      return;
    }
    elSug.innerHTML = "";
    items.slice(0, MAX_SUGGESTIONS).forEach((q) => {
      const sym = q.symbol || q.symbol || "";
      const name = q.shortname || q.longname || q.name || "";
      const exch = q.exchange || q.exchDisp || "";
      const li = document.createElement("div");
      li.style.padding = "8px 12px";
      li.style.cursor = "pointer";
      li.style.whiteSpace = "nowrap";
      li.title = name ? `${name} — ${sym}` : sym;
      li.innerHTML = `<strong>${sym}</strong> <span style="opacity:.7">${name ? "• " + name : ""}${exch ? " • " + exch : ""}</span>`;
      li.addEventListener("click", () => {
        elInput.value = sym;
        elSug.style.display = "none";
        elSug.innerHTML = "";
        run(sym);
      });
      li.addEventListener("mouseenter", () => (li.style.background = "rgba(255,255,255,.06)"));
      li.addEventListener("mouseleave", () => (li.style.background = "transparent"));
      elSug.appendChild(li);
    });
    elSug.style.display = "block";
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  async function fetchSuggestions(q) {
    // Yahoo Finance search API (unofficial, but common)
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${MAX_SUGGESTIONS}&newsCount=0`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return (data.quotes || []).filter(x => x.symbol);
  }

  function fmt(n) {
    if (n == null || Number.isNaN(n)) return "-";
    const dp = Math.abs(n) >= 1000 ? 2 : 4;
    return Number(n).toFixed(dp).replace(/\.?0+$/, (m) => (m === "." ? "" : m));
  }

  function signal(close, open) {
    if (close > open) return { text: "UP Bias", cls: "up" };
    if (close < open) return { text: "DOWN Bias", cls: "down" };
    return { text: "NEUTRAL", cls: "flat" };
  }

  async function fetchStock(ticker) {
    const url = `${API}/stock?q=${encodeURIComponent(ticker)}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const msg = await r.text().catch(() => r.statusText);
      throw new Error(`API ${r.status}: ${msg}`);
    }
    return r.json();
  }

  async function run(ticker) {
    try {
      elCard?.classList.add("hidden");
      if (elSignal) {
        elSignal.textContent = "Fetching...";
        elSignal.className = "chip";
      }

      const data = await fetchStock(ticker);

      elCTicker && (elCTicker.textContent = data.ticker);
      elOpen && (elOpen.textContent = fmt(data.ohlc.open));
      elHigh && (elHigh.textContent = fmt(data.ohlc.high));
      elLow && (elLow.textContent = fmt(data.ohlc.low));
      elClose && (elClose.textContent = fmt(data.ohlc.close));

      const sig = signal(data.ohlc.close, data.ohlc.open);
      if (elSignal) {
        elSignal.textContent = sig.text;
        elSignal.className = `chip ${sig.cls}`;
      }

      if (elNote) {
        elNote.textContent = `Used Session: ${data.used_session_date} (${data.exchange_timezone}) • Prediction For: ${data.prediction_date}`;
      }

      elCard?.classList.remove("hidden");
    } catch (err) {
      if (elSignal) { elSignal.textContent = "Error"; elSignal.className = "chip error"; }
      if (elNote) elNote.textContent = err?.message || "Failed";
      elCard?.classList.remove("hidden");
    }
  }

  // ====== Events ======
  if (elGo) {
    elGo.addEventListener("click", () => {
      const t = (elInput.value || "").trim();
      if (t) run(t);
    });
  }
  if (elInput) {
    elInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const t = (elInput.value || "").trim();
        elSug.style.display = "none";
        elSug.innerHTML = "";
        if (t) run(t);
      }
    });

    // Autocomplete on typing (debounced)
    const debounced = debounce(async () => {
      const q = (elInput.value || "").trim();
      if (!q || q.length < 1) {
        showSuggestions([]);
        return;
      }
      try {
        const items = await fetchSuggestions(q);
        showSuggestions(items);
      } catch {
        showSuggestions([]);
      }
    }, DEBOUNCE_MS);

    elInput.addEventListener("input", debounced);
    // hide suggestions if clicking elsewhere
    document.addEventListener("click", (e) => {
      if (!elSug.contains(e.target) && e.target !== elInput) {
        elSug.style.display = "none";
      }
    });
  }
})();
