/* ═══════════════════════════════════════════════════════════
   Rastera — Micro-interactions
   Minimal JS for scroll reveals and nav behavior.
   No dependencies. No build step.
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Scroll Reveal ───────────────────────────────────────── */
  const revealElements = document.querySelectorAll(".reveal, .reveal-stagger");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback: show everything immediately
    revealElements.forEach((el) => el.classList.add("visible"));
  }

  /* ── Nav solid on scroll ─────────────────────────────────── */
  const nav = document.getElementById("nav");
  if (nav) {
    let lastScroll = 0;
    window.addEventListener(
      "scroll",
      () => {
        const scrollY = window.scrollY;
        if (scrollY > 60) {
          nav.style.background = "rgba(6, 8, 15, 0.92)";
        } else {
          nav.style.background = "";
        }
        lastScroll = scrollY;
      },
      { passive: true }
    );
  }

  /* ── Close mobile nav on link click ──────────────────────── */
  const navLinks = document.querySelector(".nav-links");
  if (navLinks) {
    navLinks.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        navLinks.classList.remove("open");
      }
    });
  }
})();
