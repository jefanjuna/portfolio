// Shared SVG shapes have fixed view boxes, independent of font/emoji rendering.
const namespace = "http://www.w3.org/2000/svg";
export function iconMarkup(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="/assets/icons.svg#${name}"></use></svg>`;
}
export function createIcon(name) {
  const icon = document.createElementNS(namespace, "svg"),
    use = document.createElementNS(namespace, "use");
  icon.setAttribute("class", "icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  use.setAttribute("href", `/assets/icons.svg#${name}`);
  icon.append(use);
  return icon;
}
