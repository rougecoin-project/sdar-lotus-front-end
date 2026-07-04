/**
 * Mystical effects: ambient firefly/magic-dust particle field + scroll-reveal animations.
 * Vanilla JS, no external dependencies. Respects prefers-reduced-motion.
 */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealObserver = null;

  /* -----------------------------------------------------------
     Scroll reveal
  ----------------------------------------------------------- */
  function observeReveal(el) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    revealObserver.observe(el);
  }

  function initScrollReveal() {
    var targets = document.querySelectorAll(".mystic-reveal");
    if (!targets.length) return;

    if (!reduceMotion && "IntersectionObserver" in window) {
      revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
      );
    }

    targets.forEach(observeReveal);
  }

  // Exposed so scripts that inject content after load (e.g. the YouTube
  // gallery cards) can register their new .mystic-reveal elements too.
  window.mysticObserveReveal = function (el) {
    if (!el) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      el.classList.add("is-visible");
      return;
    }
    if (!revealObserver) {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          observeReveal(el);
        },
        { once: true }
      );
      return;
    }
    observeReveal(el);
  };

  /* -----------------------------------------------------------
     Ambient particle field ("magic dust" / fireflies)
  ----------------------------------------------------------- */
  function initParticles() {
    if (reduceMotion) return;

    var canvas = document.getElementById("mystic-particles");
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    var particles = [];
    var colors = ["94, 235, 200", "181, 130, 222", "245, 197, 107"];
    var width, height;
    var running = true;
    var rafId = null;

    function isMobile() {
      return window.innerWidth < 768;
    }

    function particleCount() {
      var area = width * height;
      var base = isMobile() ? 45 : 90;
      return Math.min(base, Math.max(24, Math.round(area / 22000)));
    }

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    function makeParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.8 + 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: (Math.random() - 0.5) * 0.25,
        speedY: (Math.random() - 0.5) * 0.25 - 0.08,
        baseAlpha: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.015 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
      };
    }

    function seedParticles() {
      particles = [];
      var count = particleCount();
      for (var i = 0; i < count; i++) {
        particles.push(makeParticle());
      }
    }

    function step(time) {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        var twinkle = Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.35 + 0.65;
        var alpha = p.baseAlpha * twinkle;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color + ", " + alpha * 0.18 + ")";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.color + ", " + alpha + ")";
        ctx.fill();
      }

      rafId = requestAnimationFrame(step);
    }

    function start() {
      if (rafId) return;
      running = true;
      rafId = requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    resize();
    seedParticles();
    start();

    var resizeTimeout;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        resize();
        seedParticles();
      }, 200);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initScrollReveal();
    initParticles();
  });
})();
