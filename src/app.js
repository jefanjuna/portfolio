import { createMixtape } from "./music.js";
import { createPointer } from "./pointer.js";
import { mirrorSecondaryClick } from "./secondary-click.js";
import { createSceneLayout } from "./scene-layout.js";
import { JOURNEY_END } from "./world-path.js";
const root = document.documentElement,
  $ = (s) => document.querySelector(s);
const chapters = [...document.querySelectorAll(".chapter")],
  panels = [...document.querySelectorAll(".scene-panel")],
  nav = [...document.querySelectorAll(".chapter-nav a")];
const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
  fine = matchMedia("(hover: hover) and (pointer: fine)");
const dialogs = [...document.querySelectorAll("dialog")];
const sceneLayout = createSceneLayout(panels, root);
const pointer = createPointer({ fine, reduced }),
  disposeSecondaryClick = mirrorSecondaryClick();
let world = null,
  scenePosition = 0,
  active = 0,
  scheduled = false,
  paused = reduced.matches,
  soundOn = false,
  entered = false,
  ember = false;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
  smooth = (v) => {
    v = clamp(v);
    return v * v * (3 - 2 * v);
  };
const mixtape = createMixtape({
  onPlaying: (value, active = value) => {
    soundOn = active;
    paintSound();
  },
});
const returnLeg = $("#journey-return"),
  loopBuffer = $("#loop-buffer");
let wrapCount = 0;
function sizeLoop() {
  loopBuffer.style.height = `${innerHeight + 4}px`;
}
sizeLoop();
const readJourneyLayout = () => ({
  width: innerWidth,
  heights: [...chapters, returnLeg].map((section) => section.offsetHeight),
});
let journeyLayout = readJourneyLayout();
// Headings reveal word by word; the complete phrase remains available to assistive technology.
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
  acceptNode: (n) =>
    n.parentElement.closest(".scene-panel h1,.scene-panel h2") &&
    n.textContent.trim()
      ? NodeFilter.FILTER_ACCEPT
      : NodeFilter.FILTER_REJECT,
});
const textNodes = [];
while (walker.nextNode()) textNodes.push(walker.currentNode);
textNodes.forEach((node) => {
  const fragment = document.createDocumentFragment();
  node.textContent.split(/(\s+)/).forEach((word) => {
    if (!word.trim()) {
      fragment.append(document.createTextNode(word));
      return;
    }
    const span = document.createElement("span");
    span.className = "word";
    const inner = document.createElement("span");
    inner.className = "word-inner";
    inner.textContent = word;
    span.append(inner);
    fragment.append(span);
  });
  node.replaceWith(fragment);
});
panels.forEach((panel) =>
  panel
    .querySelectorAll(".word")
    .forEach((word, i) =>
      word.style.setProperty("--word-delay", `${i * 55}ms`),
    ),
);
function update() {
  scheduled = false;
  const seam = returnLeg.offsetTop + returnLeg.offsetHeight;
  if (entered && scrollY >= seam && !dialogs.some((d) => d.open)) {
    // Rebase the browser and the damped camera together. The two endpoint shots
    // are identical; the camera can finish easing across the seam in either order.
    const cycles = Math.max(1, Math.floor(scrollY / seam));
    wrapCount += cycles;
    world?.shiftProgress(-cycles * JOURNEY_END);
    scrollTo({ top: scrollY - cycles * seam, behavior: "instant" });
    root.dataset.journeyLoops = String(wrapCount);
    if (location.hash)
      history.replaceState(null, "", location.pathname + location.search);
  }
  const returning = scrollY >= returnLeg.offsetTop,
    returnT = clamp((scrollY - returnLeg.offsetTop) / returnLeg.offsetHeight);
  let chapterIndex = 0;
  chapters.forEach((chapter, i) => {
    if (scrollY + innerHeight * 0.025 >= chapter.offsetTop) chapterIndex = i;
  });
  active = chapterIndex;
  const chapter = chapters[active],
    local = clamp(
      (scrollY + innerHeight * 0.025 - chapter.offsetTop) /
        chapter.offsetHeight,
    );
  scenePosition = returning
    ? 10 + returnT * (JOURNEY_END - 10)
    : active + local;
  panels.forEach((panel, i) => {
    const p = (scrollY - chapters[i].offsetTop) / chapters[i].offsetHeight,
      fadeIn = i === 0 ? 1 : smooth((p + 0.12) / 0.12),
      fadeOut = 1 - smooth((p - 0.8) / 0.2),
      opacity = returning
        ? i === 0
          ? smooth((returnT - 0.86) / 0.14)
          : 0
        : clamp(fadeIn * fadeOut);
    panel.style.opacity = opacity;
    panel.inert = opacity < 0.5 || !entered;
    panel.classList.toggle("active", opacity > 0.5 && entered);
    panel.style.transform =
      reduced.matches || returning
        ? "none"
        : `translate3d(0,${(clamp(p, -0.2, 1.2) - 0.3) * -12}px,0)`;
    panel.style.filter =
      reduced.matches || opacity === 1 || opacity === 0
        ? "none"
        : `blur(${(1 - opacity) * 6}px)`;
    if (i === 0) root.style.setProperty("--scene-fade", opacity);
  });
  root.classList.toggle(
    "story-right",
    panels[active].classList.contains("right-panel"),
  );
  root.classList.toggle(
    "story-ending",
    active === panels.length - 1 && !returning,
  );
  $("#chapter-count").textContent = returning
    ? "↺ / 00"
    : `${String(active).padStart(2, "0")} / ${String(chapters.length - 1).padStart(2, "0")}`;
  $("#chapter-place").textContent = returning
    ? "Back to Marina Bay"
    : chapter.dataset.place;
  $("#progress-line").style.width =
    `${clamp(scrollY / Math.max(1, root.scrollHeight - innerHeight)) * 100}%`;
  nav.forEach((a, i) => {
    if (i === (returning ? 0 : active))
      a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
  world?.setProgress(scenePosition, reduced.matches);
}
function schedule() {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(update);
  }
}
function resizeJourney() {
  sizeLoop();
  const nextLayout = readJourneyLayout(),
    changed =
      nextLayout.width !== journeyLayout.width ||
      nextLayout.heights.some(
        (height, i) => height !== journeyLayout.heights[i],
      );
  journeyLayout = nextLayout;
  // Viewport-relative chapter heights change on rotation. Keep the same
  // point in the story rather than interpreting the old pixel offset anew.
  if (entered && changed) {
    const q = scenePosition,
      index = Math.min(chapters.length - 1, Math.floor(q)),
      chapter = chapters[index],
      top =
        q >= 10
          ? returnLeg.offsetTop +
            ((q - 10) / (JOURNEY_END - 10)) * returnLeg.offsetHeight
          : chapter.offsetTop +
            (q - index) * chapter.offsetHeight -
            innerHeight * 0.025;
    scrollTo({ top: Math.max(0, top), behavior: "instant" });
  }
  schedule();
}
addEventListener("scroll", schedule, { passive: true });
addEventListener("resize", resizeJourney);
document.fonts?.ready.then(schedule);
addEventListener("load", schedule);
// No gesture gate. Readiness dismisses the loader automatically, with a bounded fallback.
const arrival = $("#arrival"),
  background = [
    ...document.querySelectorAll(".masthead,.hud,.chapter-nav,.journey"),
  ],
  loadStarted = performance.now();
root.classList.add("loading");
background.forEach((e) => (e.inert = true));
function reveal() {
  if (entered) return;
  entered = true;
  arrival.classList.add("closed");
  arrival.inert = true;
  root.classList.remove("loading");
  background.forEach((e) => (e.inert = false));
  update();
  world?.setMotion(!paused);
}
function ready(failed = false) {
  arrival.classList.add("ready");
  $("#loading-label").textContent = failed
    ? "Ready to explore"
    : "Portfolio ready";
  setTimeout(
    reveal,
    reduced.matches ? 0 : Math.max(0, 650 - (performance.now() - loadStarted)),
  );
}
import("./world.js")
  .then(async (module) => {
    world = await module.createWorld($("#world"));
    root.classList.remove("no-webgl");
    root.classList.add("webgl");
    $("#world").classList.add("ready");
    world.setProgress(scenePosition, reduced.matches);
    if ($("#viewfinder").open) world.setViewfinder(true);
    world.setMotion(sceneCanMove());
    if (ember) world.setAccent(ember);
    ready();
  })
  .catch(() => {
    root.classList.add("no-webgl");
    ready(true);
  });
setTimeout(() => {
  if (!entered) {
    root.classList.add("no-webgl");
    ready(true);
  }
}, 4500);
function setMotion(value) {
  paused = value;
  root.classList.toggle("motion-off", paused);
  $("#motion-toggle").setAttribute("aria-pressed", String(paused));
  $("#motion-toggle").setAttribute(
    "aria-label",
    paused ? "Resume idle animation" : "Pause idle animation",
  );
  $("#motion-toggle").innerHTML = `${paused ? "▷" : "Ⅱ"} <span>Motion</span>`;
  world?.setMotion(sceneCanMove());
}
$("#motion-toggle").addEventListener("click", () => setMotion(!paused));
reduced.addEventListener("change", (e) => {
  setMotion(e.matches);
  schedule();
});
setMotion(paused);
let fxContext = null;
function fx(kind = "click") {
  if (!soundOn || !entered) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!fxContext) fxContext = new AudioContext();
    if (fxContext.state === "suspended") fxContext.resume();
    const oscillator = fxContext.createOscillator(),
      gain = fxContext.createGain(),
      t = fxContext.currentTime;
    oscillator.type = kind === "shutter" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kind === "shutter" ? 130 : 650, t);
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === "shutter" ? 45 : 420,
      t + 0.08,
    );
    gain.gain.setValueAtTime(kind === "shutter" ? 0.045 : 0.018, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    oscillator.connect(gain).connect(fxContext.destination);
    oscillator.start();
    oscillator.stop(t + 0.1);
  } catch {}
}
function paintSound() {
  $("#sound-toggle").setAttribute("aria-pressed", String(soundOn));
  $("#sound-toggle").setAttribute(
    "aria-label",
    soundOn ? "Turn sound off" : "Turn sound on",
  );
  $("#sound-toggle").innerHTML =
    `${soundOn ? "♪" : "♩"} <span>Sound ${soundOn ? "on" : "off"}</span>`;
}
$("#sound-toggle").addEventListener("click", () =>
  mixtape.active ? mixtape.pause() : mixtape.play(),
);
function theme() {
  ember = !ember;
  root.dataset.palette = ember ? "ember" : "ice";
  document.querySelector("meta[name=theme-color]").content = ember
    ? "#180e13"
    : "#080d19";
  $("#theme-switch").setAttribute(
    "aria-label",
    ember
      ? "Switch the site colour palette to ice"
      : "Switch the site colour palette to ember",
  );
  world?.setAccent(ember);
}
$("#theme-switch").addEventListener("click", theme);
const details = {
  profile: {
    kicker: "The quick introduction",
    title: "Josh, in a minute.",
    html: '<p class="intro-line">I’m Josh Stefan Junarto. A student in Singapore, teaching myself code and trying to understand the systems underneath.</p><dl class="profile-facts"><div><dt>NOW</dt><dd>JC1 at Anderson Serangoon Junior College, 2026.</dd></div><div><dt>BEFORE</dt><dd>Maris Stella High School. Executive committee member, Marist Digital Media Club.</dd></div><div><dt>INTERESTS</dt><dd>AI, Linux, cybersecurity, computer systems, hardware — and photography.</dd></div><div><dt>WITH PEOPLE</dt><dd>Class leader. Open to suggestions, sharing work, and helping others learn.</dd></div><div><dt>ACHIEVEMENTS</dt><dd>AI Fundamentals by IBM. Cisco Python Essentials.</dd></div></dl><p>I’m still exploring the connections between software, silicon and energy. Outside the terminal, I like noticing everyday details with a camera.</p>',
    url: "https://github.com/jefanjuna",
  },
  media: {
    kicker: "A little backstory",
    title: "Behind the scenes.",
    html: '<p class="intro-line">Before ASRJC, I was at Maris Stella High School and in Marist Digital Media Club.</p><h3>What that involved</h3><p>As an executive committee member, I worked with cameras, lights and microphones, coordinated with others, and helped plan club activities.</p><h3>What I’m still learning</h3><p>Equipment is only part of it. Getting a group to work together takes patience and clear communication.</p>',
    url: "https://github.com/jefanjuna",
  },
  work: {
    kicker: "Small projects, real questions",
    title: "Project showcase.",
    html: '<p>Pick something to see the problem, the approach and the current scope.</p><button class="work-row" type="button" data-detail="pyjosh"><strong>01 / PyJosh ↗</strong><small>A configurable neural-network framework with Python and JAX.</small></button><button class="work-row" type="button" data-detail="sunbrew"><strong>02 / Sunbrew ↗</strong><small>A homework tracker for a familiar school problem.</small></button><button class="work-row" type="button" data-detail="optialgos"><strong>03 / optialgos ↗</strong><small>Algorithm experiments in Python and C++.</small></button>',
    url: "https://github.com/jefanjuna",
  },
  pyjosh: {
    kicker: "Python / JAX / learning project",
    title: "PyJosh",
    html: '<p class="intro-line">How can we make neural network architectures easily configurable?</p><h3>The approach</h3><p>A small feedforward neural-network framework, with configurable layers, activations, cross-entropy loss and a training loop. JAX supplies gradient computation.</p><h3>What it shows</h3><p>Layers and activations can be configured to explore different network architectures. JAX handles gradients while the framework brings the model and training steps together.</p>',
    url: "https://github.com/jefanjuna/PyJosh",
  },
  sunbrew: {
    kicker: "Next.js / TypeScript / Prisma",
    title: "Sunbrew",
    html: '<p class="intro-line">Schoolwork accumulates. I wanted a clearer view of it.</p><h3>The approach</h3><p>A homework tracker for junior college students. The code includes homework posts, checklist records, and actions for creating and updating entries.</p><h3>Current scope</h3><p>Next.js and TypeScript form the interface and server layer; Prisma connects the data model. This is a small application project.</p>',
    url: "https://github.com/jefanjuna/sunbrew",
  },
  optialgos: {
    kicker: "Python / C++ / algorithms",
    title: "optialgos",
    html: '<p class="intro-line">Sometimes the useful change is recognising a pattern.</p><h3>The approach</h3><p>Programming and algorithm experiments in Python and C++. One example explores a two-pointer approach to closest-pair sums.</p><h3>What I’m exploring</h3><p>How the structure of a problem changes the amount of work a solution needs. The repository contains the experiments; it does not establish benchmark improvements.</p>',
    url: "https://github.com/jefanjuna/optialgos",
  },
};
nav.forEach((anchor) => {
  const link = document.createElement("a");
  link.href = anchor.getAttribute("href");
  link.textContent = anchor.getAttribute("aria-label");
  document.querySelector("#scene-list").append(link);
});
const closing = new WeakSet();
let returnFocus = null;
function sceneCanMove() {
  return (
    entered && !paused && !dialogs.some((d) => d.open && d.id !== "viewfinder")
  );
}
function openDialog(dialog) {
  if (!entered) reveal();
  if (!dialog.open) {
    returnFocus = document.activeElement;
    dialog.classList.remove("closing");
    dialog.showModal();
    pointer.lift();
  }
  root.classList.add("modal-open");
  world?.setMotion(sceneCanMove());
  if (dialog.id === "viewfinder") {
    root.classList.add("viewfinding");
    world?.setViewfinder(true);
  }
  if (dialog.id === "music-dialog") mixtape.start();
}
function closeDialog(dialog) {
  if (!dialog.open || closing.has(dialog)) return;
  closing.add(dialog);
  dialog.classList.add("closing");
  if (dialog.id === "viewfinder") world?.setViewfinder(false);
  let timer = 0,
    finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    dialog.removeEventListener("animationend", onEnd);
    if (dialog.open) dialog.close();
    closing.delete(dialog);
    dialog.classList.remove("closing");
  };
  const onEnd = (e) => {
    if (e.target === dialog) finish();
  };
  dialog.addEventListener("animationend", onEnd);
  timer = setTimeout(finish, reduced.matches ? 0 : 420);
}
function showDetail(key) {
  const item = details[key];
  if (!item) return;
  const content = $("#details .dialog-content");
  content.classList.remove("content-in");
  $("#detail-kicker").textContent = item.kicker;
  $("#detail-title").textContent = item.title;
  $("#detail-copy").innerHTML =
    (["pyjosh", "sunbrew", "optialgos"].includes(key)
      ? '<button class="detail-back" type="button" data-detail="work">← Back to projects</button>'
      : "") + item.html;
  $("#detail-source").href = item.url;
  $("#detail-source").textContent = ["profile", "media", "work"].includes(key)
    ? "Find me on GitHub ↗"
    : "Explore the repository ↗";
  openDialog($("#details"));
  $("#details").scrollTop = 0;
  requestAnimationFrame(() => content.classList.add("content-in"));
}
$("#chapter-open").addEventListener("click", () =>
  openDialog($("#chapter-dialog")),
);
$("#scene-list").addEventListener("click", (event) => {
  if (event.target.closest("a")) closeDialog($("#chapter-dialog"));
});
$("#music-open").addEventListener("click", () => {
  if (mixtape.requested) openDialog($("#music-dialog"));
  else mixtape.play();
});
$("#viewfinder-button").addEventListener("click", () =>
  openDialog($("#viewfinder")),
);
const viewFrame = $(".viewfinder-frame");
let viewDrag = null;
viewFrame.addEventListener("pointerdown", (event) => {
  if (![0, 2].includes(event.button) || event.target.closest("button")) return;
  viewDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  viewFrame.setPointerCapture(event.pointerId);
  $("#viewfinder").classList.add("dragging");
  event.preventDefault();
});
viewFrame.addEventListener("pointermove", (event) => {
  if (!viewDrag || viewDrag.id !== event.pointerId) return;
  world?.panView(event.clientX - viewDrag.x, event.clientY - viewDrag.y);
  viewDrag.x = event.clientX;
  viewDrag.y = event.clientY;
});
function endViewDrag(event) {
  if (!viewDrag || event.pointerId !== viewDrag.id) return;
  if (viewFrame.hasPointerCapture(event.pointerId))
    viewFrame.releasePointerCapture(event.pointerId);
  viewDrag = null;
  $("#viewfinder").classList.remove("dragging");
}
viewFrame.addEventListener("pointerup", endViewDrag);
viewFrame.addEventListener("pointercancel", endViewDrag);
viewFrame.addEventListener("lostpointercapture", () => {
  viewDrag = null;
  $("#viewfinder").classList.remove("dragging");
});
let lastShutter = 0;
$("#shutter-button").addEventListener("click", () => {
  if (performance.now() - lastShutter < 700) return;
  lastShutter = performance.now();
  fx("shutter");
  if (!reduced.matches) {
    $("#viewfinder").classList.remove("exposing");
    requestAnimationFrame(() => $("#viewfinder").classList.add("exposing"));
  }
});
document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-detail]");
  if (button) showDetail(button.dataset.detail);
  const close = e.target.closest("[data-close]");
  if (close) closeDialog(document.getElementById(close.dataset.close));
  if (e.target.closest("button,a") && !e.target.closest("#shutter-button"))
    fx();
  if (
    !e.target.closest("button,a,input,label,p,h1,h2,h3") &&
    world &&
    entered &&
    !dialogs.some((d) => d.open)
  ) {
    const action = world.pick(e.clientX, e.clientY);
    if (action === "theme") theme();
    else if (action === "viewfinder") openDialog($("#viewfinder"));
    else if (action) showDetail(action);
  }
});
dialogs.forEach((dialog) => {
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialog(dialog);
  });
  dialog.addEventListener("close", () => {
    if (dialog.id === "viewfinder") {
      root.classList.remove("viewfinding");
      world?.setViewfinder(false);
    }
    if (!dialogs.some((d) => d.open)) {
      root.classList.remove("modal-open");
      world?.setMotion(entered && !paused);
      returnFocus?.focus({ preventScroll: true });
    }
  });
});
// Coalesce hover picking; input events only store the latest point.
let lastHover = 0,
  hoverFrame = 0,
  hoverPoint = null,
  hoverBlocked = true;
function paintHover(stamp) {
  hoverFrame = 0;
  if (!hoverPoint || !world || !entered) return;
  if (stamp - lastHover < 45) {
    hoverFrame = requestAnimationFrame(paintHover);
    return;
  }
  const point = hoverPoint;
  hoverPoint = null;
  lastHover = stamp;
  const blocked =
    !!point.target.closest("a,button,label,input,p,h1,h2,h3") ||
    dialogs.some((d) => d.open);
  if (!blocked || !hoverBlocked) world.hover(point.x, point.y, blocked);
  hoverBlocked = blocked;
}
function queueHover(event) {
  if (
    !fine.matches ||
    reduced.matches ||
    root.classList.contains("touch-input")
  )
    return;
  hoverPoint = { x: event.clientX, y: event.clientY, target: event.target };
  if (!hoverFrame) hoverFrame = requestAnimationFrame(paintHover);
}
addEventListener("pointermove", queueHover, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden && fxContext) fxContext.suspend();
});
$("#year").textContent = new Date().getFullYear();
update();
addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  pointer.dispose();
  sceneLayout.dispose();
  disposeSecondaryClick();
  cancelAnimationFrame(hoverFrame);
  removeEventListener("pointermove", queueHover);
  world?.dispose();
  mixtape.dispose();
  fxContext?.close();
});
