// A card with a picture stays hidden until the picture has loaded, or has
// failed to, so the whole card appears at once. Loaded in <head> so the
// cards-wait class is on <html> before the first paint; without this script
// the cards show as their pictures arrive. The card keeps its space while
// hidden, so nothing moves when it appears.
(function () {
  document.documentElement.classList.add("cards-wait");

  function ready(img) {
    var card = img.closest(".card");
    if (card) {
      card.classList.add("card--ready");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".card > .card__image").forEach(function (img) {
      // complete is also true for a picture that failed.
      if (img.complete) {
        ready(img);
        return;
      }
      img.addEventListener("load", function () { ready(img); });
      img.addEventListener("error", function () { ready(img); });
    });
  });
})();
