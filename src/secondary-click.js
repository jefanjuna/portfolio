// Mirror a completed right-button click through the existing primary handlers.
// Keep real pointer coordinates for world picking and native range controls.
export function mirrorSecondaryClick() {
  let down = null;
  const block = (event) => event.preventDefault();
  function start(event) {
    if (event.button === 2) {
      down = { target: event.target, x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  }
  function cancel() {
    down = null;
  }
  function finish(event) {
    if (event.button !== 2) return;
    const origin = down;
    down = null;
    if (
      !origin ||
      origin.target !== event.target ||
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 6
    )
      return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("[inert],:disabled"))
      return;
    const range = target.closest('input[type="range"]');
    if (range) {
      const rect = range.getBoundingClientRect(),
        rtl = getComputedStyle(range).direction === "rtl";
      let ratio = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width),
      );
      if (rtl) ratio = 1 - ratio;
      const min = Number(range.min) || 0,
        max = range.max === "" ? 100 : Number(range.max),
        step = range.step === "any" ? 0 : Number(range.step) || 1;
      const value = min + ratio * (max - min);
      range.value = String(
        step ? min + Math.round((value - min) / step) * step : value,
      );
      range.dispatchEvent(new Event("input", { bubbles: true }));
      range.dispatchEvent(new Event("change", { bubbles: true }));
    }
    target.closest("button,a,input")?.focus({ preventScroll: true });
    target.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        detail: 1,
        clientX: event.clientX,
        clientY: event.clientY,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      }),
    );
  }
  function auxiliary(event) {
    if (event.button === 2) event.preventDefault();
  }
  document.addEventListener("contextmenu", block);
  document.addEventListener("auxclick", auxiliary);
  document.addEventListener("pointerdown", start);
  document.addEventListener("pointerup", finish);
  document.addEventListener("pointercancel", cancel);
  addEventListener("blur", cancel);
  return () => {
    document.removeEventListener("contextmenu", block);
    document.removeEventListener("auxclick", auxiliary);
    document.removeEventListener("pointerdown", start);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", cancel);
    removeEventListener("blur", cancel);
  };
}
