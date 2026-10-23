// Every fresh visit or reload begins with the opening shot, even after an anchor jump.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (location.hash)
  history.replaceState(null, "", location.pathname + location.search);
const resetPortfolioScroll = () =>
  scrollTo({ top: 0, left: 0, behavior: "instant" });
resetPortfolioScroll();
addEventListener("pageshow", resetPortfolioScroll);
