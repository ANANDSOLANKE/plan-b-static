(function () {
  const API = (window.API_BASE || "").replace(/\/+$/, ""); // set in index.html
  const el = (id) => document.getElementById(id);

  const inp = el("ticker");
  const go  = el("go");
  const card = el("card");
  const f = {
    t: el("cTicker"),
    o: el("cOpen"),
    h: el("cHigh"),
    l: el("cLow"),
    c: el("cClose"),
    note: el("predNote"),
    sig: el("cSignal"),
  };

  async function fetchStock(ticker) {
    const url = `${API}/stock?q=${encodeURIComponent(ticker)}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const msg = await r.text().catch(() => r.statusText);
      throw new Error(`API ${r.status}: ${msg}`);
    }
    return r.json();
  }

  function fmt(n) {
    if (n == null || Number.isNaN(n)) return "-";
    // keep 2–4 dp depending on magnitude
    const dp = Math.abs(n) >= 1000 ? 2 : 4;
    return Number(n).toFixed(dp).replace(/\.?0+$/, (m) => (m === "." ? "" : m));
  }

  function setSignal(close, open) {
    if (close > open)      return { text: "UP Bias", cls: "up" };
    else if (close < open) return { text: "DOWN Bias", cls: "down" };
    return { text: "NEUTRAL", cls: "flat" };
  }

  async function run(ticker) {
    try {
      card.classList.add("hidden");
      f.sig.textContent = "Fetching...";
      f.sig.className = "chip";

      const data = await fetchStock(ticker);

      f.t.textContent = data.ticker;
      f.o.textContent = fmt(data.ohlc.open);
      f.h.textContent = fmt(data.ohlc.high);
      f.l.textContent = fmt(data.ohlc.low);
      f.c.textContent = fmt(data.ohlc.close);

      const sig = setSignal(data.ohlc.close, data.ohlc.open);
      f.sig.textContent = sig.text;
      f.sig.className = `chip ${sig.cls}`;

      // Example note:
      // Used Session: 2025-08-14 (Asia/Kolkata) • Prediction For: 2025-08-18
      f.note.textContent =
        `Used Session: ${data.used_session_date} (${data.exchange_timezone}) • ` +
        `Prediction For: ${data.prediction_date}`;

      card.classList.remove("hidden");
    } catch (err) {
      f.sig.textContent = "Error";
      f.sig.className = "chip error";
      f.note.textContent = (err && err.message) ? err.message : "Failed";
      card.classList.remove("hidden");
    }
  }

  go?.addEventListener("click", () => {
    const t = (inp.value || "").trim();
    if (t) run(t);
  });
  inp?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const t = (inp.value || "").trim();
      if (t) run(t);
    }
  });
})();
