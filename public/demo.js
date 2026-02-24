/* ═══════════════════════════════════════════════════════════
   Rastera — Live Demo Tool
   Handles the interactive site analysis widget on demo.html.
   No dependencies. No build step.
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  const form = document.getElementById("live-demo-form");
  if (!form) return; // guard: only runs on demo.html

  const submitBtn = document.getElementById("demo-submit");
  const resultsEl = document.getElementById("demo-results");
  const errorEl = document.getElementById("demo-error");
  const pdfBtn = document.getElementById("demo-pdf-btn");
  const gaugeArc = document.getElementById("gauge-arc");

  // Circumference of the SVG gauge ring (r=42, 2πr ≈ 264)
  const CIRCUMFERENCE = 2 * Math.PI * 42;
  let currentSiteId = null;

  // ── Form submit ──────────────────────────────────────────
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const address = document.getElementById("demo-address").value.trim();
    if (!address) {
      showError("Please enter an address to analyze.");
      return;
    }

    const password = document.getElementById("demo-password").value;
    if (password !== "gVYJP108!KRSNA") {
      showError("Incorrect password.");
      return;
    }

    const industryTemplate = document.getElementById("demo-industry").value;
    const radiusM = parseInt(document.getElementById("demo-radius").value, 10);

    setLoading(true);
    hideError();
    hideResults();
    currentSiteId = null;

    try {
      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address,
          industry_template: industryTemplate,
          radius_m: radiusM,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || "Analysis failed. Please try again.");
      }

      currentSiteId = data.site_id;
      renderResults(data, address);
    } catch (err) {
      showError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  // ── PDF download ─────────────────────────────────────────
  pdfBtn.addEventListener("click", async function () {
    if (!currentSiteId) return;

    const orig = pdfBtn.innerHTML;
    pdfBtn.disabled = true;
    pdfBtn.innerHTML =
      '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Generating PDF\u2026';

    try {
      const resp = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: currentSiteId }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate report.");
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rastera-report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err.message);
    } finally {
      pdfBtn.disabled = false;
      pdfBtn.innerHTML = orig;
    }
  });

  // ── Render results ───────────────────────────────────────
  function renderResults(data, address) {
    var score = data.score.total;

    // Score gauge animation
    var offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
    var color = scoreColor(score);
    gaugeArc.style.stroke = color;
    gaugeArc.style.strokeDasharray = CIRCUMFERENCE;
    gaugeArc.style.strokeDashoffset = CIRCUMFERENCE;
    setTimeout(function () {
      gaugeArc.style.transition =
        "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)";
      gaugeArc.style.strokeDashoffset = offset;
    }, 60);

    document.getElementById("demo-score-val").textContent =
      Math.round(score);
    document.getElementById("demo-address-label").textContent = address;
    document.getElementById("demo-score-headline").textContent =
      scoreLabel(score);

    // Driver breakdown
    renderDrivers(data.score.drivers);

    // AI summary
    renderAI(data.ai_summary);

    // Show panel
    resultsEl.hidden = false;
    setTimeout(function () {
      resultsEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  }

  function renderDrivers(drivers) {
    var el = document.getElementById("demo-drivers");
    if (!drivers || !drivers.length) {
      el.innerHTML = "";
      return;
    }

    var html =
      '<div class="drivers-label">Score Breakdown</div>';

    drivers.forEach(function (d) {
      var pct = Math.min(100, Math.max(0, (d.impact / 25) * 100));
      html +=
        '<div class="demo-driver">' +
        '<div class="driver-header">' +
        '<span class="driver-name">' + escHtml(d.name) + "</span>" +
        '<span class="driver-val">' + d.impact.toFixed(1) + "</span>" +
        "</div>" +
        '<div class="driver-bar-track">' +
        '<div class="driver-bar-fill" style="width:' + pct + '%"></div>' +
        "</div>" +
        '<div class="driver-reason">' + escHtml(d.reason) + "</div>" +
        "</div>";
    });

    el.innerHTML = html;
  }

  function renderAI(ai) {
    var el = document.getElementById("demo-ai");
    if (!ai) {
      el.innerHTML = "";
      return;
    }

    var html = "";

    if (ai.executive_summary) {
      html +=
        '<div class="ai-exec">' + escHtml(ai.executive_summary) + "</div>";
    }

    html += aiList("Opportunities", ai.opportunities, "emerald");
    html += aiList("Risks", ai.risks, "violet");
    html += aiList("Next Actions", ai.next_actions, "blue");

    el.innerHTML = html;
  }

  function aiList(title, items, color) {
    if (!items || !items.length) return "";
    var lis = items
      .map(function (i) {
        return "<li>" + escHtml(i) + "</li>";
      })
      .join("");
    return (
      '<div class="ai-list ai-list--' + color + '">' +
      '<div class="ai-list-title">' + title + "</div>" +
      "<ul>" + lis + "</ul>" +
      "</div>"
    );
  }

  // ── Helpers ──────────────────────────────────────────────
  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.innerHTML = on
      ? '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Analyzing\u2026'
      : "Analyze Location";
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function hideError() {
    errorEl.hidden = true;
  }

  function hideResults() {
    resultsEl.hidden = true;
    // Reset gauge
    gaugeArc.style.transition = "none";
    gaugeArc.style.strokeDashoffset = CIRCUMFERENCE;
  }

  function scoreLabel(score) {
    if (score >= 80) return "Strong opportunity";
    if (score >= 60) return "Good potential";
    if (score >= 40) return "Moderate fit";
    return "Challenging market";
  }

  function scoreColor(score) {
    if (score >= 80) return "#34d399"; // emerald
    if (score >= 60) return "#4f8fff"; // blue
    if (score >= 40) return "#6366f1"; // indigo
    return "#8b5cf6"; // violet
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
