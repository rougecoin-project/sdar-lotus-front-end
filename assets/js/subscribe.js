/**
 * On-brand subscribe popup controller.
 *
 * Replaces the default SlickText widget popup with a themed modal we fully
 * control (look, timing, frequency). It submits the mobile number directly to
 * the SlickText sign-up widget, so the visitor never leaves the page.
 *
 * The values below come from the SlickText hosted form (slktxt.io/1jz6Y ->
 * widget.smsinfo.io). If SlickText changes the keyword/list, refetch that form
 * and update FORM_ACTION / EXTRA_FIELDS accordingly.
 */
(function () {
  var FORM_ACTION =
    "https://widget.smsinfo.io/v2/a7c646501a00134c18884adaf8d16f10?st-lid=19439540";
  var FIELD_PHONE = "number"; // SlickText's phone field name
  var EXTRA_FIELDS = { _keyword_id: "2896620", confirm: "on" };

  var STORAGE_KEY = "sdarlotus_subscribe_v1";
  var SHOW_DELAY_MS = 7000; // show after 7s...
  var SHOW_AT_SCROLL = 0.35; // ...or once the visitor scrolls 35% down
  var REMIND_AFTER_DAYS = 7; // re-show after a dismissal this many days later

  var overlay = document.getElementById("subscribe-popup");
  if (!overlay) return;

  var modal = overlay.querySelector(".st-modal");
  var form = document.getElementById("st-form");
  var successView = document.getElementById("st-success");
  var phoneInput = document.getElementById("st-phone");
  var consentInput = document.getElementById("st-consent");
  var errorEl = document.getElementById("st-error");
  var submitBtn = form ? form.querySelector(".st-submit") : null;
  var lastFocused = null;
  var shown = false;

  overlay.removeAttribute("hidden");

  /* ---------- frequency control ---------- */
  function getState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function setState(status) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ status: status, ts: Date.now() })
      );
    } catch (e) {}
  }

  function shouldShow() {
    var s = getState();
    if (!s) return true;
    if (s.status === "subscribed") return false;
    if (s.status === "dismissed") {
      var days = (Date.now() - s.ts) / 86400000;
      return days >= REMIND_AFTER_DAYS;
    }
    return true;
  }

  /* ---------- open / close ---------- */
  function open() {
    if (shown) return;
    shown = true;
    lastFocused = document.activeElement;
    overlay.classList.add("is-open");
    document.addEventListener("keydown", onKeydown);
    if (phoneInput) {
      setTimeout(function () {
        phoneInput.focus();
      }, 300);
    }
  }

  function close(markDismissed) {
    overlay.classList.remove("is-open");
    document.removeEventListener("keydown", onKeydown);
    if (markDismissed) setState("dismissed");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      close(true);
      return;
    }
    if (e.key === "Tab") trapFocus(e);
  }

  function trapFocus(e) {
    var focusables = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    var visible = [];
    for (var i = 0; i < focusables.length; i++) {
      if (focusables[i].offsetParent !== null) visible.push(focusables[i]);
    }
    if (!visible.length) return;
    var first = visible[0];
    var last = visible[visible.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- validation + submit ---------- */
  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    if (errorEl) errorEl.hidden = true;
  }

  function validPhone(v) {
    var digits = (v || "").replace(/\D/g, "");
    return digits.length >= 10;
  }

  function sendToSlickText(phone) {
    if (!FORM_ACTION) {
      console.warn(
        "[subscribe] FORM_ACTION is not configured; submission was not sent to SlickText."
      );
      return;
    }
    // Post via a hidden iframe so the static page never navigates away and
    // cross-origin responses don't matter.
    var frameName = "st-sink-" + Date.now();
    var iframe = document.createElement("iframe");
    iframe.name = frameName;
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    var f = document.createElement("form");
    f.method = "POST";
    f.action = FORM_ACTION;
    f.target = frameName;
    f.style.display = "none";

    function addField(name, value) {
      if (!name) return;
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      f.appendChild(input);
    }
    addField(FIELD_PHONE, phone);
    Object.keys(EXTRA_FIELDS).forEach(function (k) {
      addField(k, EXTRA_FIELDS[k]);
    });

    document.body.appendChild(f);
    f.submit();
    setTimeout(function () {
      f.remove();
      iframe.remove();
    }, 4000);
  }

  function showSuccess() {
    if (form) form.hidden = true;
    if (successView) successView.hidden = false;
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      var phone = phoneInput ? phoneInput.value.trim() : "";

      if (!validPhone(phone)) {
        showError("Please enter a valid mobile number.");
        if (phoneInput) phoneInput.focus();
        return;
      }
      if (consentInput && !consentInput.checked) {
        showError("Please agree to receive text messages to continue.");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Joining\u2026";
      }
      sendToSlickText(phone);
      setState("subscribed");
      showSuccess();
    });
  }

  /* ---------- wire controls ---------- */
  var closeBtn = document.getElementById("st-close");
  var dismissBtn = document.getElementById("st-dismiss");
  var doneBtn = document.getElementById("st-done");
  if (closeBtn) closeBtn.addEventListener("click", function () { close(true); });
  if (dismissBtn) dismissBtn.addEventListener("click", function () { close(true); });
  if (doneBtn) doneBtn.addEventListener("click", function () { close(false); });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) close(true);
  });

  /* ---------- trigger ---------- */
  // Force-show for previews/testing: add ?popup=1 to the URL or #join,
  // which bypasses the once-per-visitor and delay rules.
  var forceShow =
    /[?&]popup=1\b/.test(location.search) || location.hash === "#join";
  if (forceShow) {
    open();
    return;
  }

  if (!shouldShow()) return;

  var timer = setTimeout(function () {
    open();
  }, SHOW_DELAY_MS);

  function onScroll() {
    var scrolled =
      (window.scrollY || document.documentElement.scrollTop) /
      (document.documentElement.scrollHeight - window.innerHeight || 1);
    if (scrolled >= SHOW_AT_SCROLL) {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      open();
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
})();
