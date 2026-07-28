/* ============================================================
   Pine Ridge Roofing and Mitigation - site behavior
   Built by OTM Web Design
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Active nav state ---------- */
  var page = document.body.getAttribute("data-page");
  if (page) {
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      if (link.getAttribute("data-nav") === page) link.classList.add("is-active");
    });
  }

  /* ---------- Mobile menu ---------- */
  var hamburger = document.querySelector(".hamburger");
  var mobileMenu = document.querySelector(".mobile-menu");
  var backdrop = document.querySelector(".nav-backdrop");

  function closeMenu() {
    if (!hamburger) return;
    hamburger.classList.remove("is-open");
    if (mobileMenu) mobileMenu.classList.remove("is-open");
    if (backdrop) backdrop.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    hamburger.setAttribute("aria-expanded", "false");
  }

  if (hamburger) {
    hamburger.addEventListener("click", function () {
      var open = hamburger.classList.toggle("is-open");
      if (mobileMenu) mobileMenu.classList.toggle("is-open", open);
      if (backdrop) backdrop.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  if (backdrop) backdrop.addEventListener("click", closeMenu);
  if (mobileMenu) {
    mobileMenu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Gallery carousels: featured-center, auto-advancing ----------
     Supports multiple carousels on one page. Each .gallery-carousel gets its
     own index, timer, and dots so they run independently. ---------- */
  var carousels = document.querySelectorAll(".gallery-carousel");

  carousels.forEach(function (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".gallery-slide"));
    if (!slides.length) return;

    var dotsWrap = carousel.querySelector(".carousel-dots");
    var prevBtn = carousel.querySelector(".carousel-prev");
    var nextBtn = carousel.querySelector(".carousel-next");
    var index = 0;
    var timer = null;
    var INTERVAL = 4500;

    var dots = [];
    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var dot = document.createElement("button");
        dot.className = "carousel-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", "Go to image " + (i + 1));
        dot.addEventListener("click", function () { goTo(i); restart(); });
        dotsWrap.appendChild(dot);
      });
      dots = Array.prototype.slice.call(dotsWrap.children);
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      var prev = (index - 1 + slides.length) % slides.length;
      var next = (index + 1) % slides.length;
      slides.forEach(function (slide, s) {
        slide.classList.remove("is-active", "is-prev", "is-next");
        if (s === index) slide.classList.add("is-active");
        else if (s === prev) slide.classList.add("is-prev");
        else if (s === next) slide.classList.add("is-next");
      });
      dots.forEach(function (dot, d) { dot.classList.toggle("is-active", d === index); });
    }
    function start() { if (reduceMotion) return; timer = setInterval(function () { goTo(index + 1); }, INTERVAL); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(index - 1); restart(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(index + 1); restart(); });
    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", function () { if (!timer) start(); });

    goTo(0);
    start();
  });

  /* ---------- Before / after sliders ----------
     Position is driven by a single CSS custom property (--ba-pos) on the
     frame. The before image is masked with clip-path, never resized, so
     there is no zoom, scale, or drift while dragging.
     Pointer events cover mouse, touch, and pen in one code path. ---------- */
  document.querySelectorAll("[data-ba]").forEach(function (slider) {
    var frame = slider.querySelector(".ba-frame");
    var handle = slider.querySelector(".ba-handle");
    if (!frame || !handle) return;

    var pos = 50;
    var dragging = false;
    var rafId = null;
    var pendingX = null;

    function apply(p, animate) {
      pos = Math.max(0, Math.min(100, p));
      frame.classList.toggle("is-animating", !!animate && !reduceMotion);
      frame.style.setProperty("--ba-pos", pos + "%");
      var rounded = Math.round(pos);
      handle.setAttribute("aria-valuenow", rounded);
      handle.setAttribute("aria-valuetext", rounded + " percent");
    }

    function percentFromX(clientX) {
      var rect = frame.getBoundingClientRect();
      if (!rect.width) return pos;
      return ((clientX - rect.left) / rect.width) * 100;
    }

    /* Coalesce pointermove into one update per animation frame so fast
       drags stay smooth instead of thrashing layout. */
    function scheduleFromX(clientX) {
      pendingX = clientX;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(function () {
        rafId = null;
        if (pendingX !== null) apply(percentFromX(pendingX), false);
        pendingX = null;
      });
    }

    frame.addEventListener("pointerdown", function (e) {
      dragging = true;
      frame.classList.remove("is-animating");
      try { frame.setPointerCapture(e.pointerId); } catch (err) {}
      apply(percentFromX(e.clientX), false);
      e.preventDefault();
    });

    frame.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      scheduleFromX(e.clientX);
      e.preventDefault();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      if (pendingX !== null) { apply(percentFromX(pendingX), false); pendingX = null; }
      try { frame.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    frame.addEventListener("pointerup", endDrag);
    frame.addEventListener("pointercancel", endDrag);
    frame.addEventListener("lostpointercapture", function () { dragging = false; });

    /* Keyboard support */
    handle.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { apply(pos - step, true); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") { apply(pos + step, true); e.preventDefault(); }
      else if (e.key === "Home") { apply(0, true); e.preventDefault(); }
      else if (e.key === "End") { apply(100, true); e.preventDefault(); }
    });

    /* Keep the split accurate if the frame is resized or rotated. */
    window.addEventListener("resize", function () { apply(pos, false); });

    apply(50, false);
  });

  /* ---------- Phone fields: live US formatting + validation ---------- */
  function initPhoneFields() {
    var fields = document.querySelectorAll('input[type="tel"]');
    fields.forEach(function (field) {
      field.setAttribute("inputmode", "tel");
      field.setAttribute("maxlength", "14");
      if (!field.getAttribute("placeholder")) field.setAttribute("placeholder", "(555) 123-4567");

      field.addEventListener("input", function () {
        var d = field.value.replace(/\D/g, "").slice(0, 10);
        var out = "";
        if (d.length > 6) out = "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
        else if (d.length > 3) out = "(" + d.slice(0, 3) + ") " + d.slice(3);
        else if (d.length > 0) out = "(" + d.slice(0, 3);
        field.value = out;
        if (field.classList.contains("invalid") && d.length === 10) {
          field.classList.remove("invalid");
        }
      });
    });
  }
  initPhoneFields();

  function phoneIsValid(field) {
    return field.value.replace(/\D/g, "").length === 10;
  }

  /* ---------- Form validation (required fields, phone, TCPA consent) ---------- */
  var form = document.querySelector("form[data-validate]");
  if (form) {
    form.addEventListener("submit", function (e) {
      var ok = true;
      var firstInvalid = null;

      form.querySelectorAll("input, textarea, select").forEach(function (field) {
        if (field.type === "checkbox") return;
        if (field.hasAttribute("required")) {
          var empty = !field.value.trim();
          var badPhone = field.type === "tel" && !empty && !phoneIsValid(field);
          if (empty || badPhone) {
            field.classList.add("invalid");
            ok = false;
            if (!firstInvalid) firstInvalid = field;
          } else {
            field.classList.remove("invalid");
          }
        }
      });

      /* TCPA consent must be checked */
      var consent = form.querySelector('input[name="consent"]');
      var consentError = form.querySelector("#consent-error");
      if (consent && !consent.checked) {
        ok = false;
        if (consentError) consentError.classList.add("show");
        if (!firstInvalid) firstInvalid = consent;
      } else if (consentError) {
        consentError.classList.remove("show");
      }

      if (!ok) {
        e.preventDefault();
        if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
      }
    });
  }
})();