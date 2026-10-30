// Site keys, ignored with a modifier held or while typing in a field:
//   d  toggles dark mode; the choice is kept in localStorage. Until a
//      viewer presses d, the page follows the system's light or dark
//      setting, including when it changes while the page is open.
//   ←  on an article page, follows the link back to the index.
//   ?  shows a box listing these keys; any key or click closes it.
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

  var system = window.matchMedia("(prefers-color-scheme: dark)");

  function chosen() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  apply(chosen() || (system.matches ? "dark" : "light"));

  system.addEventListener("change", function () {
    if (!chosen()) {
      apply(system.matches ? "dark" : "light");
    }
  });

  var help = null;

  function closeHelp() {
    if (help && help.open) {
      help.close();
    }
  }

  // Built on first use; lists only the keys that do something on this page.
  function openHelp() {
    if (!help) {
      help = document.createElement("dialog");
      help.className = "keys-help";
      var rows = [["d", "dark or light"]];
      if (!still) {
        rows.push(["Space", "light rays on or off"]);
      }
      if (document.querySelector(".article__nav a")) {
        rows.push(["←", "back to the index"]);
      }
      rows.push(["?", "this list"]);
      var list = document.createElement("dl");
      rows.forEach(function (r) {
        var dt = document.createElement("dt");
        var kbd = document.createElement("kbd");
        kbd.textContent = r[0];
        dt.appendChild(kbd);
        var dd = document.createElement("dd");
        dd.textContent = r[1];
        list.appendChild(dt);
        list.appendChild(dd);
      });
      help.appendChild(list);
      help.addEventListener("click", closeHelp);
      document.body.appendChild(help);
    }
    help.showModal();
  }

  document.addEventListener("keydown", function (ev) {
    // While the list is open, any key only closes it.
    if (help && help.open) {
      ev.preventDefault();
      closeHelp();
      return;
    }
    if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.repeat) {
      return;
    }
    var t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) {
      return;
    }
    if (ev.key === "?") {
      ev.preventDefault();
      openHelp();
    } else if (ev.key === "d") {
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
