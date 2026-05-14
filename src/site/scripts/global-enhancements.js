/**
 * Global enhancements for the public site:
 * - Reading progress bar
 * - Back-to-top button
 * - Fade-up animations on scroll
 */

// ── Reading Progress Bar ──
(function initProgressBar() {
  const bar = document.createElement("div");
  bar.id = "reading-progress";
  bar.setAttribute("aria-hidden", "true");
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    background: var(--brand-primary, #e74c3c);
    z-index: 9999;
    transition: width 0.1s linear;
    pointer-events: none;
  `;
  document.body.appendChild(bar);

  let ticking = false;
  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + "%";
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  }, { passive: true });
})();

// ── Back to Top ──
(function initBackToTop() {
  const btn = document.createElement("button");
  btn.id = "back-to-top";
  btn.type = "button";
  btn.setAttribute("aria-label", "Retour en haut de la page");
  btn.setAttribute("title", "Retour en haut");
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
  `;
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg-elevated, #fff);
    color: var(--text, #1a1a1a);
    border: 1px solid var(--border, #e8e8e8);
    box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,0.08));
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.3s ease, transform 0.3s ease, background 0.2s;
    z-index: 900;
    pointer-events: none;
  `;
  document.body.appendChild(btn);

  let visible = false;
  function toggle() {
    const shouldShow = (window.scrollY || document.documentElement.scrollTop) > 500;
    if (shouldShow === visible) return;
    visible = shouldShow;
    btn.style.opacity = shouldShow ? "1" : "0";
    btn.style.transform = shouldShow ? "translateY(0)" : "translateY(16px)";
    btn.style.pointerEvents = shouldShow ? "auto" : "none";
  }

  window.addEventListener("scroll", toggle, { passive: true });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  toggle();
})();

// ── Fade-up on scroll (IntersectionObserver) ──
(function initFadeUp() {
  // Helper: check if an element is currently in the viewport
  function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  // 1. Find all elements that will participate in fade-up
  const explicitEls = document.querySelectorAll("[data-fade-up]");
  const autoTargets = document.querySelectorAll("section, article, .recipe-card, .content-blocks");

  // 2. Auto-attach data-fade-up to macro containers NOT already opted-in
  autoTargets.forEach((el) => {
    if (!el.hasAttribute("data-fade-up") && !el.closest("[data-fade-up]")) {
      el.setAttribute("data-fade-up", "");
    }
  });

  // 3. Mark ALL elements already in the viewport as immediately visible
  //    This MUST happen BEFORE we add .js-fade-enabled to prevent the flash
  document.querySelectorAll("[data-fade-up]").forEach((el) => {
    if (isInViewport(el)) {
      el.classList.add("is-visible");
    }
  });

  // 4. NOW enable the animation system (elements already marked won't flash)
  document.body.classList.add("js-fade-enabled");

  // 5. Set up IntersectionObserver for below-the-fold elements
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
  );

  // Observe only elements NOT yet visible
  document.querySelectorAll("[data-fade-up]:not(.is-visible)").forEach((el) => {
    observer.observe(el);
  });

  // 6. Safety: if IO somehow fails, force visible after 2.5s
  setTimeout(function() {
    document.querySelectorAll('[data-fade-up]:not(.is-visible)').forEach(function(el) {
      el.classList.add('is-visible');
    });
  }, 2500);
})();
