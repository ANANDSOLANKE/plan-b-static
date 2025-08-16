
// prediction-enhancer.js — adds target date + market status from backend
(function () {
  function ready(fn){
    if (document.readyState === "complete" || document.readyState === "interactive") { setTimeout(fn, 0); }
    else { document.addEventListener("DOMContentLoaded", fn); }
  }

  ready(function(){
    var PRED_BASE   = "https://stockpricepredictions-api.onrender.com";
    var elTicker    = document.getElementById("cTicker");
    var elPredNote  = document.getElementById("predNote");
    var elSignal    = document.getElementById("cSignal");
    var elYes       = document.getElementById("mktYes");
    var elDisplay   = document.getElementById("mktDisplay");
    var input       = document.getElementById("ticker");
    var btn         = document.getElementById("go");

    if (!elPredNote) return;

    function currentSignalText(){
      var raw = (elSignal && elSignal.textContent) ? elSignal.textContent : (elPredNote.textContent || "");
      var i = raw.lastIndexOf(":");
      return (i >= 0 ? raw.slice(i+1) : raw).trim() || "▲";
    }

    function rewritePrediction(targetDate){
      var signal = currentSignalText();
      elPredNote.textContent = "Prediction For Next Day Date: " + (targetDate || "-") + " : " + signal;
    }

    function setMarket(openNow, venue){
      if (elYes) {
        elYes.textContent = openNow ? "Yes" : "No";
        elYes.classList.remove("chip--ok","chip--off");
        elYes.classList.add(openNow ? "chip--ok" : "chip--off");
      }
      if (elDisplay) {
        elDisplay.textContent = "Display Market: " + (openNow ? "Open" : "Closed") + (venue ? " ("+venue+")" : "");
      }
    }

    function normalizeSymbol(v){
      v = String(v || "").trim().toUpperCase();
      if (!v) return v;
      if (v.startsWith("^")) return v;        // index — skip for predict
      if (/\.\w+$/.test(v)) return v;       // already has suffix
      return v + ".NS";                       // default to NSE
    }

    var lastRequested = "";
    function fetchPrediction(symRaw){
      var SYM = normalizeSymbol(symRaw);
      if (!SYM || SYM.startsWith("^")) return;
      if (SYM === lastRequested) return;
      lastRequested = SYM;

      var url = PRED_BASE.replace(/\/$/, "") + "/predict-next?symbol=" + encodeURIComponent(SYM);
      fetch(url, { mode: "cors" })
        .then(function(res){ return res.text().then(function(txt){ return {status:res.status, ok:res.ok, txt:txt}; }); })
        .then(function(r){
          if (!r.ok) throw new Error("HTTP "+r.status+": "+r.txt);
          var data = JSON.parse(r.txt);
          var target = (data && data.prediction && data.prediction.target_date) || "-";
          var openNow = !!(data && data.market_meta && data.market_meta.market_open_now);
          var venue   = (data && data.market_meta && data.market_meta.venue) || "";
          rewritePrediction(target);
          setMarket(openNow, venue);
        })
        .catch(function(err){
          console.warn("[enhancer] fetch failed:", err);
        });
    }

    function triggerAfterApp(){
      setTimeout(function(){
        var v = (input && input.value) ? input.value : (elTicker && elTicker.textContent) || "";
        if (v) fetchPrediction(v);
      }, 200);
    }

    if (elTicker) {
      var last = elTicker.textContent;
      var mo = new MutationObserver(function(){
        var curr = elTicker.textContent && elTicker.textContent.trim();
        if (curr && curr !== last) {
          last = curr;
          triggerAfterApp();
        }
      });
      mo.observe(elTicker, { childList: true, characterData: true, subtree: true });
    }

    if (btn)   btn.addEventListener("click", triggerAfterApp);
    if (input) input.addEventListener("keydown", function(e){ if (e.key === "Enter") triggerAfterApp(); });

    setTimeout(triggerAfterApp, 400);
  });
})();
