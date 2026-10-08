(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var each = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };

  // Reveal on scroll
  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal], .mk-stagger"));
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  // Light / dark toggle (choice is remembered; otherwise follows the system)
  var root = document.documentElement;
  var themeBtn = document.querySelector(".mk-theme-toggle");
  var syncTheme = function () {
    if (!themeBtn) return;
    var dark = root.dataset.theme === "dark";
    themeBtn.setAttribute("aria-pressed", String(dark));
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  };
  syncTheme();
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("mk-theme", next); } catch (e) {}
      syncTheme();
    });
  }
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var onSystemChange = function (e) {
    var stored = null;
    try { stored = localStorage.getItem("mk-theme"); } catch (err) {}
    if (stored === "light" || stored === "dark") return;
    root.dataset.theme = e.matches ? "dark" : "light";
    syncTheme();
  };
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", onSystemChange);

  // Top bar scroll progress
  var bar = document.querySelector(".mk-bar");
  if (bar) {
    var ticking = false;
    var update = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--p", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
      ticking = false;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // Chapter rail: highlight the chapter in view
  var rail = document.querySelector(".mk-rail");
  if (rail && "IntersectionObserver" in window) {
    var links = Array.prototype.slice.call(rail.querySelectorAll("a"));
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var railObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && byId[entry.target.id]) {
          links.forEach(function (a) { a.classList.remove("is-active"); });
          byId[entry.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) railObserver.observe(el);
    });
  }

  // Sliding pill for document tabs
  each(".mk-tabs", function (nav) {
    var pill = nav.querySelector(".mk-tabs__pill");
    var tabs = Array.prototype.slice.call(nav.querySelectorAll("a"));
    if (!pill || !tabs.length) return;
    var active = nav.querySelector("[aria-current]") || tabs[0];
    var move = function (el) {
      tabs.forEach(function (t) { t.classList.toggle("is-under", t === el); });
      pill.style.width = el.offsetWidth + "px";
      pill.style.height = el.offsetHeight + "px";
      pill.style.transform = "translate(" + el.offsetLeft + "px, " + el.offsetTop + "px)";
    };
    pill.style.transition = "none";
    move(active);
    pill.style.opacity = "1";
    void pill.offsetWidth;
    pill.style.transition = "";
    tabs.forEach(function (t) {
      t.addEventListener("pointerenter", function () { move(t); });
      t.addEventListener("focus", function () { move(t); });
    });
    nav.addEventListener("pointerleave", function () { move(active); });
    window.addEventListener("resize", function () { move(active); });
  });

  // Pointer tilt (fine pointers only)
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    each("[data-tilt]", function (el) {
      var max = 3;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", (px * max * 2).toFixed(2) + "deg");
        el.style.setProperty("--rx", (-py * max * 2).toFixed(2) + "deg");
      });
      el.addEventListener("pointerleave", function () {
        el.style.setProperty("--ry", "0deg");
        el.style.setProperty("--rx", "0deg");
      });
    });
  }

  // Hero video: sound toggle, pause off-screen, honour reduced motion
  each(".mk-video", function (box) {
    var video = box.querySelector("video");
    var btn = box.querySelector(".mk-video__sound");
    if (!video) return;

    var saveData = navigator.connection && navigator.connection.saveData;
    if (reduceMotion || saveData) {
      video.removeAttribute("autoplay");
      video.pause();
      video.controls = true;
      if (btn) btn.hidden = true;
      return;
    }

    if (btn) {
      var label = btn.querySelector("span");
      btn.addEventListener("click", function () {
        var willUnmute = video.muted;
        video.muted = !willUnmute;
        if (willUnmute) {
          video.currentTime = 0;
          video.play();
        }
        btn.setAttribute("aria-pressed", String(willUnmute));
        if (label) label.textContent = willUnmute ? "Mute" : "Play with sound";
      });
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.25 }).observe(box);
    }
  });

  // App Views coverflow
  each(".gallery[data-count]", function (g) {
    var track = g.querySelector(".gallery__track");
    var viewport = g.querySelector(".gallery__viewport");
    var slides = Array.prototype.slice.call(g.querySelectorAll(".gallery__slide"));
    var current = g.querySelector(".gallery__current");
    var idx = 0;

    function show(n) {
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        s.classList.remove("is-active", "is-near", "is-far");
        var d = Math.abs(i - idx);
        s.classList.add(d === 0 ? "is-active" : d === 1 ? "is-near" : "is-far");
      });
      var slideW = slides[0].offsetWidth;
      var offset = viewport.offsetWidth / 2 - slideW / 2 - idx * slideW;
      track.style.transform = "translateX(" + offset + "px)";
      if (current) current.textContent = String(idx + 1);
    }

    g.querySelector(".gallery__nav--prev").addEventListener("click", function () { show(idx - 1); });
    g.querySelector(".gallery__nav--next").addEventListener("click", function () { show(idx + 1); });
    slides.forEach(function (s, i) {
      s.addEventListener("click", function () { if (i !== idx) show(i); });
    });
    g.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
    });

    var sx = null;
    g.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    g.addEventListener("touchend", function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });

    window.addEventListener("resize", function () { show(idx); });
    show(0);
  });

  // Arriving from the gallery: lift the curtain, then forget the flag
  if (document.documentElement.classList.contains("mk-entering")) {
    window.setTimeout(function () { document.documentElement.classList.remove("mk-entering"); }, 1400);
  }

  // Home: Today cards
  var cards = Array.prototype.slice.call(document.querySelectorAll("a.mk-tcard"));
  if (cards.length) {
    var saveData = navigator.connection && navigator.connection.saveData;

    // Launch each card (icon first, then content) as it comes into view, staggered
    var openCard = function (c) { c.classList.add("is-open"); };
    if ("IntersectionObserver" in window && !reduceMotion) {
      var openObserver = new IntersectionObserver(function (entries) {
        var batch = 0;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var c = entry.target;
          openObserver.unobserve(c);
          window.setTimeout(function () { openCard(c); }, 350 + batch * 220);
          batch += 1;
        });
      }, { threshold: 0.45 });
      cards.forEach(function (c) { openObserver.observe(c); });
    } else {
      cards.forEach(openCard);
    }

    // Hover: tilt toward the cursor and let a soft light follow it
    if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
      cards.forEach(function (c) {
        c.addEventListener("pointermove", function (e) {
          var r = c.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          c.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
          c.style.setProperty("--my", (py * 100).toFixed(1) + "%");
          c.style.setProperty("--ry", ((px - 0.5) * 8).toFixed(2) + "deg");
          c.style.setProperty("--rx", ((0.5 - py) * 6).toFixed(2) + "deg");
        });
        c.addEventListener("pointerleave", function () {
          c.style.setProperty("--rx", "0deg");
          c.style.setProperty("--ry", "0deg");
        });
      });
    }

    // Videos play only while their card is on screen
    if ("IntersectionObserver" in window && !reduceMotion && !saveData) {
      var videoObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target.querySelector("video");
          if (!v) return;
          if (entry.isIntersecting) {
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            v.pause();
          }
        });
      }, { threshold: 0.4 });
      cards.forEach(function (c) { if (c.querySelector("video")) videoObserver.observe(c); });
    }

    // Open: the card grows into the page (transform only, so it stays smooth)
    cards.forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (reduceMotion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!document.body.animate) return;
        e.preventDefault();

        var style = getComputedStyle(card);
        var r = card.getBoundingClientRect();
        var W = window.innerWidth;
        var H = window.innerHeight;
        var sx = r.width / W;
        var sy = r.height / H;
        var radius = parseFloat(style.borderTopLeftRadius) || 26;

        var dim = document.createElement("div");
        dim.className = "mk-portal-dim";
        var portal = document.createElement("div");
        portal.className = "mk-portal";
        portal.style.width = W + "px";
        portal.style.height = H + "px";
        portal.style.backgroundImage = style.backgroundImage;
        var veil = document.createElement("div");
        veil.className = "mk-portal-veil";
        veil.style.background = style.getPropertyValue("--mk-from").trim() || "#fff";

        document.body.appendChild(dim);
        document.body.appendChild(portal);
        document.body.appendChild(veil);
        var video = card.querySelector("video");
        if (video) video.pause();

        dim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: "forwards" });
        portal.animate(
          [
            {
              opacity: 0,
              transform: "translate(" + r.left + "px, " + r.top + "px) scale(" + sx + ", " + sy + ")",
              borderRadius: radius / sx + "px / " + radius / sy + "px"
            },
            { opacity: 1, offset: 0.15 },
            { opacity: 1, transform: "translate(0px, 0px) scale(1, 1)", borderRadius: "0px / 0px" }
          ],
          { duration: 520, easing: "cubic-bezier(.32,.72,0,1)", fill: "forwards" }
        );
        var fade = veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 360, fill: "forwards" });
        fade.onfinish = function () {
          try { sessionStorage.setItem("mk-enter", "1"); } catch (err) {}
          window.location.href = card.href;
        };
      });
    });

    window.addEventListener("pageshow", function () {
      each(".mk-portal, .mk-portal-dim, .mk-portal-veil", function (n) { n.remove(); });
    });
  }
})();
