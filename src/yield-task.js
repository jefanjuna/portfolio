// A resolved Promise stays in the same task. Give rendering, input and garbage
// collection a real opportunity to run during construction, including Safari.
export function yieldTask() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}
