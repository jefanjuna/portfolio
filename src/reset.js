// Every fresh visit or reload begins with the opening shot, even after an anchor jump.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (location.hash)
  history.replaceState(null, "", location.pathname + location.search);
const resetPortfolioScroll = () =>
  scrollTo({ top: 0, left: 0, behavior: "instant" });
resetPortfolioScroll();
addEventListener("pageshow", resetPortfolioScroll);

// This classic script runs independently of the application's module graph.
// A failed module download or an exception during UI setup must not trap the
// visitor behind the loading sheet. Slow, healthy 3D initialization is allowed
// to finish normally; elapsed time is not treated as an error.
function stopPortfolioStartupGuard() {
  removeEventListener("error", portfolioStartupError, true);
  removeEventListener("portfolio:ui-ready", stopPortfolioStartupGuard);
}
function portfolioStartupError(event) {
  const entry = document.querySelector('script[type="module"][src]'),
    moduleLoadFailed = entry && event.target === entry,
    applicationError =
      event instanceof ErrorEvent &&
      event.filename &&
      new URL(event.filename, location.href).origin === location.origin;
  if (!moduleLoadFailed && !applicationError) return;
  stopPortfolioStartupGuard();
  function showStory() {
    const root = document.documentElement,
      arrival = document.querySelector("#arrival");
    root.classList.add("startup-error", "no-webgl");
    root.classList.remove("loading");
    document
      .querySelectorAll(".masthead,.hud,.chapter-nav,.journey,.scene-panel")
      .forEach((element) => (element.inert = false));
    if (arrival) {
      arrival.classList.add("closed");
      arrival.inert = true;
    }
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", showStory, { once: true });
  else showStory();
}
addEventListener("error", portfolioStartupError, true);
addEventListener("portfolio:ui-ready", stopPortfolioStartupGuard);
