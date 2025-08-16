// prediction-enhancer.js (v3, non-blocking + safe)
(function () {
  function safe(fn){ try { fn&&fn(); } catch(e){ console.warn("[enhancer] error:", e); } }

  // Run only after the page and your main app script are settled
  function onReady(fn){
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(fn, 0);
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  onReady(function(){
    safe(function(){
      // Use the predictor backend only for /predict-next
      var PRED_BASE = "https://stockpricepredictions-api.onrender.com";

      // Grab elements (do not error if missing)
      var elTicker   = document.getElementById("cTicker");
      var elPredNote = document.getElementById("predNote");
      var elSignal   = document.getElementById("cSignal");
      var elYes      = document.getElementById("mktYes");
      var elDisplay  = document.getElementById("mktDisplay");
      var input      = document.getElementById("ticker");
      var btn        = document.getElementById("go");

      if (!elPredNote) return; // don't do anything if your card isn't present

      function currentSignalText(){
        // Prefer explicit signal chip; fallback to predNote
        var raw = elSignal && elSignal.textContent ? elSignal.textContent : (elPredNote.textContent || "");
        // Take the part after the last colon if present
        var i = raw.lastIndexOf(":");
        return (i >= 0 ? raw.slice(i+1) : raw).trim() || "▲";
      }

      function rewritePrediction(targetDate){
        // EXACT format requested:
        // "Prediction For Next Day Date: YYYY-MM-DD : ▲ Price Up (1)"
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

      function symbolFromValue(v) {
        var t = String(v || "").trim();
        var parts = t.split(/\s+/);
        // Prefer tokens like RELIANCE.NS
        for (var i=0;i<parts.length;i++){
          if (/\.\w+$/.test(parts[i])) return parts[i].toUpperCase();
        }
        return t.toUpperCase();
      }

      var lastRequested = ""; // avoid spamming same symbol
      function fetchPrediction(sym){
        sym = (sym || "").trim().toUpperCase();
        if (!sym || sym === lastRequested) return;
        lastRequested = sym;

        var url = PRED_BASE.replace(/\/$/, "") + "/predict-next?symbol=" + encodeURIComponent(sym);
        fetch(url, { mode: "cors" })
          .then(function(res){ return res.text().then(function(txt){ return {ok:res.ok, txt:txt}; }); })
          .then(function(r){
            if (!r.ok) throw new Error("HTTP "+r.status+": "+r.txt);
            var data = JSON.parse(r.txt);
            var target = data && data.prediction && data.prediction.target_date || "-";
            var openNow = !!(data && data.market_meta && data.market_meta.market_open_now);
            var venue   = (data && data.market_meta && data.market_meta.venue) || "";
            rewritePrediction(target);
            setMarket(openNow, venue);
          })
          .catch(function(err){
            console.warn("[enhancer] fetch failed:", err);
            // Never throw; never block autocomplete/indices
          });
      }

      // Debounced trigger so we don't interfere with your app timing
      var tmr = null;
      function triggerDebounced(){
        if (tmr) clearTimeout(tmr);
        tmr = setTimeout(function(){
          var v = (input && input.value) ? input.value : (elTicker && elTicker.textContent) || "";
          if (v) fetchPrediction(symbolFromValue(v));
        }, 200);
      }

      // Observe ticker text updates (non-capturing; won't block your handlers)
      if (elTicker) {
        var lastTickText = elTicker.textContent;
        var mo = new MutationObserver(function(){
          var curr = elTicker.textContent && elTicker.textContent.trim();
          if (curr && curr !== lastTickText) {
            lastTickText = curr;
            triggerDebounced();
          }
        });
        mo.observe(elTicker, { childList: true, characterData: true, subtree: true });
      }

      // Listen to analyze click & Enter key WITHOUT capture (so your handlers run first)
      if (btn) btn.addEventListener("click", triggerDebounced);
      if (input) input.addEventListener("keydown", function(e){ if (e.key === "Enter") triggerDebounced(); });

      // Safety: also trigger once on load in case your app prepopulates a symbol
      setTimeout(triggerDebounced, 400);
    });
  });
})();
