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

  // Home hero: a small forge. "crafted" is heated, struck three times, and cooled.
  var craft = document.querySelector(".mk-craft");
  var forge = document.querySelector(".mk-forge");
  if (craft && forge && forge.getContext && !reduceMotion) {
    var fctx = forge.getContext("2d");
    var dEl = craft.querySelector(".mk-craft__d");
    var eEl = craft.querySelector(".mk-craft__e");
    var tEl = craft.querySelector(".mk-craft__t");
    var hotEls = [tEl, eEl, dEl];
    var gapEl = craft.querySelector(".mk-craft__gap");
    var tool = craft.querySelector(".mk-craft__tool");
    var CYCLE = 5.2;
    var STRIKES = [0.9, 1.6, 2.3];
    // [time (s), hammer angle (deg), easing into this key]
    var KEYS = [
      [0, 40, "io"], [0.5, 46, "io"], [0.78, 62, "out"], [0.9, -2, "in"], [1.02, 24, "out"],
      [1.45, 62, "io"], [1.6, -2, "in"], [1.72, 22, "out"], [2.15, 62, "io"], [2.3, -2, "in"],
      [2.45, 28, "out"], [3.3, 40, "io"], [5.2, 40, "io"]
    ];
    var EASE = {
      "in": function (x) { return x * x * x; },
      "out": function (x) { return 1 - Math.pow(1 - x, 3); },
      "io": function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    };
    // Steel colour by temperature: dull red -> cherry -> orange -> yellow -> near white
    var STOPS = [[0, [58, 10, 2]], [0.25, [143, 22, 6]], [0.45, [214, 58, 10]], [0.65, [255, 122, 18]], [0.82, [255, 184, 74]], [1, [255, 241, 194]]];

    var angleAt = function (t) {
      for (var i = 1; i < KEYS.length; i++) {
        if (t <= KEYS[i][0]) {
          var a = KEYS[i - 1];
          var b = KEYS[i];
          return a[1] + (b[1] - a[1]) * EASE[b[2]]((t - a[0]) / (b[0] - a[0]));
        }
      }
      return KEYS[KEYS.length - 1][1];
    };
    var heatAt = function (t) {
      if (t < 0.6) return EASE.out(t / 0.6);
      if (t < 0.9) return 1;
      return Math.pow(Math.max(0, 1 - (t - 0.9) / 3.6), 1.5);
    };
    var heatRGB = function (h) {
      for (var i = 1; i < STOPS.length; i++) {
        if (h <= STOPS[i][0]) {
          var a = STOPS[i - 1];
          var b = STOPS[i];
          var f = (h - a[0]) / (b[0] - a[0]);
          return [0, 1, 2].map(function (k) { return a[1][k] + (b[1][k] - a[1][k]) * f; });
        }
      }
      return STOPS[STOPS.length - 1][1];
    };
    var parseRGB = function (s) {
      var m = s.match(/\d+(\.\d+)?/g);
      return m ? [+m[0], +m[1], +m[2]] : [20, 24, 40];
    };

    var W = 0;
    var H = 0;
    var fs = 80;
    var ink = [20, 24, 40];
    var dark = false;
    var hit = { x: 0, y: 0 };
    var dBox = { x: 0, y: 0, w: 0, h: 0 };
    var parts = [];
    var flashes = [];
    var struck = -1;
    var t0 = 0;
    var prevT = 0;
    var prevAngle = 40;
    var lastFrame = 0;
    var forgeRaf = 0;
    var heroVisible = true;
    var impactAt = -1e9;

    var measure = function () {
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      var box = forge.getBoundingClientRect();
      W = box.width;
      H = box.height;
      forge.width = Math.round(W * dpr);
      forge.height = Math.round(H * dpr);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fs = parseFloat(getComputedStyle(craft).fontSize) || 80;
      var g = gapEl.getBoundingClientRect();
      var tr = tEl.getBoundingClientRect();
      var d = dEl.getBoundingClientRect();
      hit.x = g.left - box.left;
      hit.y = g.top - box.top - 0.54 * fs;
      dBox = { x: tr.left - box.left, y: d.top - box.top, w: d.right - tr.left, h: d.height };
      dark = document.documentElement.dataset.theme === "dark";
      var keep = hotEls.map(function (el) { return el.style.color; });
      hotEls.forEach(function (el) { el.style.color = ""; });
      ink = parseRGB(getComputedStyle(dEl).color);
      hotEls.forEach(function (el, i) { el.style.color = keep[i]; });
    };

    var strike = function (heat) {
      var n = Math.round(14 + heat * 22);
      for (var i = 0; i < n; i++) {
        var ang = (-172 + Math.random() * 164) * Math.PI / 180;
        var sp = (2.5 + Math.random() * 6.5) * fs * (0.55 + heat * 0.6);
        parts.push({
          x: hit.x, y: hit.y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 0, max: 0.3 + Math.random() * 0.75,
          w: Math.max(1, fs * (dark ? 0.016 : 0.022) * (0.6 + Math.random())),
          ember: false
        });
      }
      flashes.push({ x: hit.x, y: hit.y, t: 0, k: 0.5 + heat * 0.5 });
    };

    var sparkColor = function (k) {
      if (dark) return k > 0.7 ? "#fff4d6" : k > 0.45 ? "#ffc857" : k > 0.22 ? "#ff7a1a" : "#b8320b";
      return k > 0.7 ? "#ffb020" : k > 0.45 ? "#ff8a00" : k > 0.22 ? "#e8590c" : "#a8290a";
    };

    var draw = function (dt) {
      fctx.clearRect(0, 0, W, H);
      fctx.globalCompositeOperation = dark ? "lighter" : "source-over";
      fctx.lineCap = "round";

      for (var i = flashes.length - 1; i >= 0; i--) {
        var f = flashes[i];
        f.t += dt;
        var a = 1 - f.t / 0.12;
        if (a <= 0) { flashes.splice(i, 1); continue; }
        var r = 0.6 * fs;
        var grad = fctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        grad.addColorStop(0, "rgba(255,236,170," + (0.9 * a * f.k).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(255,150,40,0)");
        fctx.globalAlpha = 1;
        fctx.fillStyle = grad;
        fctx.fillRect(f.x - r, f.y - r, r * 2, r * 2);
      }

      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j];
        p.life += dt;
        if (p.life >= p.max || p.y > H + 20) { parts.splice(j, 1); continue; }
        var drag = 1 - 1.6 * dt;
        p.vx *= drag;
        p.vy = p.vy * drag + (p.ember ? -0.35 * fs : 9 * fs) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        var k = 1 - p.life / p.max;
        fctx.globalAlpha = Math.min(1, k * 1.6) * (p.ember ? 0.6 + 0.4 * Math.sin(p.life * 30) : 1);
        if (p.ember) {
          fctx.fillStyle = sparkColor(0.3 + k * 0.4);
          fctx.beginPath();
          fctx.arc(p.x, p.y, p.w * (0.5 + 0.5 * k), 0, 6.283);
          fctx.fill();
        } else {
          fctx.strokeStyle = sparkColor(k);
          fctx.lineWidth = p.w * (0.4 + 0.6 * k);
          fctx.beginPath();
          fctx.moveTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
          fctx.lineTo(p.x, p.y);
          fctx.stroke();
        }
      }
      fctx.globalAlpha = 1;
      fctx.globalCompositeOperation = "source-over";
    };

    var paintHeat = function (el, h) {
      var hc = heatRGB(dark ? h : h * 0.68);
      var mix = Math.min(1, h * 1.8);
      var col = [0, 1, 2].map(function (k) { return Math.round(ink[k] + (hc[k] - ink[k]) * mix); });
      el.style.color = "rgb(" + col.join(",") + ")";
      el.style.textShadow = h > 0.02
        ? "0 0 " + (0.05 + 0.3 * h).toFixed(3) + "em rgba(255," + Math.round(70 + 130 * h) + ",20," + (0.85 * h).toFixed(2) + "), 0 0 " + (0.02 + 0.06 * h).toFixed(3) + "em rgba(255,240,200," + (0.6 * h * h).toFixed(2) + ")"
        : "none";
    };

    var tickForge = function (now) {
      forgeRaf = 0;
      if (!heroVisible || document.hidden) { lastFrame = 0; return; }
      if (!t0) t0 = now;
      var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0.016;
      lastFrame = now;
      var t = ((now - t0) / 1000) % CYCLE;
      if (t < prevT) { struck = -1; measure(); }
      prevT = t;

      for (var i = struck + 1; i < STRIKES.length; i++) {
        if (t >= STRIKES[i]) {
          struck = i;
          strike(heatAt(t));
          impactAt = now;
        }
      }

      var ang = angleAt(t);
      var spin = Math.abs(ang - prevAngle) / Math.max(dt, 0.001);
      prevAngle = ang;
      tool.style.transform = "rotate(" + ang.toFixed(2) + "deg)";
      tool.style.filter = spin > 450 ? "blur(0.9px)" : "";

      var since = (now - impactAt) / 1000;
      var h = heatAt(t);
      if (since < 0.1) h = Math.min(1, h + 0.2 * (1 - since / 0.1));
      // e and d take the blow; t sits a little further from it and runs cooler
      paintHeat(tEl, h * 0.72);
      paintHeat(eEl, h);
      paintHeat(dEl, h);

      var dk = since < 0.14 ? 1 - since / 0.14 : 0;
      var squash = dk ? "scale(" + (1 + 0.05 * dk).toFixed(3) + "," + (1 - 0.07 * dk).toFixed(3) + ")" : "";
      eEl.style.transform = squash;
      dEl.style.transform = squash;
      craft.style.transform = dk
        ? "translate(" + ((Math.random() - 0.5) * 0.028 * fs * dk).toFixed(2) + "px," + ((Math.random() - 0.5) * 0.022 * fs * dk).toFixed(2) + "px)"
        : "";

      if (h > 0.25 && Math.random() < 0.25 * h) {
        parts.push({
          x: dBox.x + Math.random() * dBox.w,
          y: dBox.y + dBox.h * (0.3 + Math.random() * 0.5),
          vx: (Math.random() - 0.5) * 0.3 * fs,
          vy: -(0.4 + Math.random() * 0.6) * fs,
          life: 0, max: 0.8 + Math.random() * 0.9,
          w: fs * 0.02, ember: true
        });
      }

      draw(dt);
      forgeRaf = window.requestAnimationFrame(tickForge);
    };

    var runForge = function () {
      if (!forgeRaf && heroVisible && !document.hidden) forgeRaf = window.requestAnimationFrame(tickForge);
    };

    craft.classList.add("is-forging");
    measure();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        heroVisible = entries[0].isIntersecting;
        runForge();
      }).observe(forge);
    }
    document.addEventListener("visibilitychange", runForge);
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    var toggle = document.querySelector(".mk-theme-toggle");
    if (toggle) toggle.addEventListener("click", function () { window.setTimeout(measure, 0); });
    runForge();
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
