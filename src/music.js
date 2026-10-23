import { soundtrack } from "./soundtrack.js";

// A native audio element plays the complete licensed recordings. Playback state
// comes from media events; requesting play never means that audio has started.
export function createMixtape({ onPlaying = () => {} } = {}) {
  const $ = (s) => document.querySelector(s),
    tracks = soundtrack,
    audio = $("#mixtape-audio");
  const status = $("#player-status"),
    button = $("#play-track"),
    seek = $("#track-seek"),
    volume = $("#track-volume"),
    mini = $("#music-open");
  let index = 0,
    playing = false,
    started = false,
    requested = false,
    disposed = false,
    request = 0;
  const clock = (seconds) => {
    seconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  function timeline() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.disabled = !duration;
    seek.max = String(duration || 1);
    seek.value = String(audio.currentTime || 0);
    seek.setAttribute(
      "aria-valuetext",
      `${clock(audio.currentTime)} of ${clock(duration)}`,
    );
    $("#track-elapsed").textContent = clock(audio.currentTime);
    $("#track-duration").textContent = clock(duration);
  }
  function showTrack() {
    const track = tracks[index];
    $("#track-title").textContent = track.title;
    $("#track-artist").textContent = track.artist;
    $("#mini-track").textContent = track.title;
    $("#track-source").href = track.url;
    $("#track-credit").textContent = `“${track.title}” by ${track.artist}. `;
    $("#track-queue").replaceChildren(
      ...tracks.map((track, i) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "track-row";
        row.setAttribute("aria-current", String(i === index));
        const title = document.createElement("span");
        title.textContent = `0${i + 1} / ${track.title}`;
        const artist = document.createElement("small");
        artist.textContent = track.artist;
        row.append(title, artist);
        row.addEventListener("click", () => load(i, true));
        return row;
      }),
    );
    if ("mediaSession" in navigator && window.MediaMetadata)
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "After hours",
      });
  }
  function paint(isPlaying, message) {
    playing = isPlaying;
    document.documentElement.classList.toggle("is-playing", playing);
    const active = !audio.paused && !audio.ended && !audio.error;
    button.textContent = active ? "Ⅱ" : "▶";
    button.setAttribute("aria-label", active ? "Pause track" : "Play track");
    mini.setAttribute("aria-label", requested ? "Open player" : "Start music");
    $("#mini-state").textContent = playing
      ? "Playing · Open player"
      : requested
        ? "Paused · Open player"
        : "Click to play";
    if (message) status.textContent = message;
    onPlaying(playing, active);
    if ("mediaSession" in navigator)
      navigator.mediaSession.playbackState = active ? "playing" : "paused";
  }
  function attemptPlay() {
    if (disposed) return;
    requested = true;
    mini.setAttribute("aria-label", "Open player");
    const id = ++request;
    status.textContent = "Starting the music…";
    if (!started) $("#mini-state").textContent = "Starting…";
    // This stays synchronous with the click, preserving browser user activation.
    audio.play()?.catch((error) => {
      if (disposed || id !== request || error.name === "AbortError") return;
      paint(
        false,
        error.name === "NotAllowedError"
          ? "Playback was blocked. Press play to try again."
          : "This track could not load. Try play again or choose another track.",
      );
    });
  }
  function load(i, play = false) {
    request++;
    index = (i + tracks.length) % tracks.length;
    audio.src = tracks[index].src;
    showTrack();
    timeline();
    paint(
      false,
      play ? "Starting the next track…" : "Press play. Stay a while.",
    );
    if (play) attemptPlay();
  }
  const listen = (event, fn) => {
      audio.addEventListener(event, fn);
      listeners.push([event, fn]);
    },
    listeners = [];
  listen("playing", () => {
    started = true;
    paint(true, "Playing now.");
  });
  listen("pause", () => {
    if (!audio.ended && !audio.error) paint(false, "Paused.");
  });
  listen("waiting", () => {
    paint(false, "Buffering…");
    $("#mini-state").textContent = "Buffering…";
  });
  listen("ended", () => load(index + 1, true));
  listen("error", () => {
    paint(
      false,
      "This track could not load. Try play again or choose another track.",
    );
    if (!started) $("#mini-state").textContent = "Could not load · retry";
  });
  listen("timeupdate", timeline);
  listen("durationchange", timeline);
  listen("loadedmetadata", timeline);
  button.addEventListener("click", () =>
    audio.paused ? attemptPlay() : audio.pause(),
  );
  $("#previous-track").addEventListener("click", () => load(index - 1, true));
  $("#next-track").addEventListener("click", () => load(index + 1, true));
  seek.addEventListener("input", () => {
    if (Number.isFinite(audio.duration))
      audio.currentTime = Math.max(
        0,
        Math.min(audio.duration, Number(seek.value)),
      );
    timeline();
  });
  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value);
  });
  audio.volume = Number(volume.value);
  const actions = {
    play: attemptPlay,
    pause: () => audio.pause(),
    previoustrack: () => load(index - 1, true),
    nexttrack: () => load(index + 1, true),
    seekto: ({ seekTime }) => {
      if (Number.isFinite(audio.duration))
        audio.currentTime = Math.min(audio.duration, Math.max(0, seekTime));
    },
  };
  if ("mediaSession" in navigator)
    for (const [action, handler] of Object.entries(actions))
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
  load(0);
  return {
    start: timeline,
    play: attemptPlay,
    pause() {
      audio.pause();
    },
    get playing() {
      return playing;
    },
    get started() {
      return started;
    },
    get requested() {
      return requested;
    },
    get active() {
      return !audio.paused && !audio.ended && !audio.error;
    },
    dispose() {
      disposed = true;
      request++;
      audio.pause();
      for (const [event, fn] of listeners) audio.removeEventListener(event, fn);
      audio.removeAttribute("src");
      audio.load();
      if ("mediaSession" in navigator)
        for (const action of Object.keys(actions))
          try {
            navigator.mediaSession.setActionHandler(action, null);
          } catch {}
    },
  };
}
