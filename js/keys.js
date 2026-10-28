// Site keys, ignored with a modifier held or while typing in a field:
//   d  toggles dark mode; the choice is kept in localStorage.
//   ←  on an article page, follows the link back to the index.
//   Space  toggles the light rays in the frame around the page (js/rays.js).
//      They start on; turning them off is kept in localStorage. Never on
//      when the system asks for reduced motion, or on a touch screen.
// Loaded in <head> so a dark page does not paint light first. Keys pressed
// inside an embedded slide deck stay in the deck's frame.
(function () {
  var root = document.documentElement;
  var KEY = "theme";
  var RAYS = "rays";
  // No rays on touch screens: phones have no Space key to turn them off, and
  // a full-screen shader costs battery there.
  var still = window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches;

  function rays(on) {
    if (on && !still) {
      root.setAttribute("data-rays", "");
    } else {
      root.removeAttribute("data-rays");
    }
  }

  try {
    rays(localStorage.getItem(RAYS) !== "off");
  } catch (e) {
    rays(true);
  }

  function apply(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  try {
    apply(localStorage.getItem(KEY));
  } catch (e) {}

  document.addEventListener("keydown", function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.repeat) {
      return;
    }
    var t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) {
      return;
    }
    if (ev.key === "d") {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
    } else if (ev.key === " " && !still && t.tagName !== "BUTTON") {
      ev.preventDefault();
      var on = !root.hasAttribute("data-rays");
      rays(on);
      try {
        localStorage.setItem(RAYS, on ? "on" : "off");
      } catch (e) {}
    } else if (ev.key === "ArrowLeft") {
      var back = document.querySelector(".article__nav a");
      if (back) {
        ev.preventDefault();
        window.location.href = back.href;
      }
    }
  });
})();
