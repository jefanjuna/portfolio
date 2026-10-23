import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "src");
const output = resolve(root, "dist");
const text = (path) => readFile(path, "utf8");
async function walk(path) {
  const found = [];
  for (const name of await readdir(path)) {
    const full = resolve(path, name);
    if ((await stat(full)).isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

const files = await walk(output);
const index = await text(resolve(output, "index.html"));
const credits = await text(resolve(output, "credits.html"));
const sourceHTML = await text(resolve(source, "index.html"));
const extract = (html, attribute) =>
  [
    ...html.matchAll(
      new RegExp(`\\b${attribute}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "g"),
    ),
  ].map((match) => match[1] ?? match[2] ?? match[3]);

// Minification must preserve DOM hooks used by the interface and accessibility.
assert.deepEqual(extract(index, "id").sort(), extract(sourceHTML, "id").sort());
assert.match(index, /Made with ❤️ and 3js/);
assert.doesNotMatch(index, /Website made with/);
const navigation = index.match(/<header\b[\s\S]*?<\/header>/)?.[0] || "";
assert.match(
  navigation,
  /href=(?:"\/credits\.html"|\/credits\.html)[\s\S]*?Credits/,
);
assert.doesNotMatch(await text(resolve(source, "app.js")), /credits-link/);
assert.doesNotMatch(index, /type=["']?importmap|<script(?:\s[^>]*)?>\s*[^<\s]/);
assert.match(credits, /Three-LICENSE\.txt/);

// Every local HTML/CSS reference must resolve within the deployable directory.
const checkURL = async (value) => {
  if (!value.startsWith("/") || value.startsWith("//")) return;
  const path = resolve(
    output,
    "." + new URL(value, "https://portfolio.invalid").pathname,
  );
  assert.ok(
    relative(output, path) && !relative(output, path).startsWith(".."),
    value,
  );
  assert.ok((await stat(path)).isFile(), value);
};
for (const html of [index, credits]) {
  for (const attribute of ["src", "href"]) {
    for (const value of extract(html, attribute)) {
      if (value !== "/") await checkURL(value);
    }
  }
}
for (const file of files) {
  assert.doesNotMatch(file, /\.map$|\/node_modules\/|\/src\/|\/scripts\//);
  if (file.endsWith(".js")) execFileSync(process.execPath, ["--check", file]);
  if (file.endsWith(".css")) {
    const css = await text(file);
    assert.match(css, /animation:letter-load/);
    for (const match of css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g))
      await checkURL(match[1]);
  }
}

// The runtime graph stays local; the 3D module must remain a dynamic import.
const metafile = JSON.parse(await text(resolve(root, ".build/metafile.json")));
assert.ok(
  Object.values(metafile.outputs).some((entry) =>
    entry.imports.some((item) => item.kind === "dynamic-import"),
  ),
);
for (const [path, entry] of Object.entries(metafile.outputs)) {
  for (const dependency of entry.imports) {
    assert.equal(
      dependency.external,
      undefined,
      `${path}: external runtime import`,
    );
    assert.ok(
      (await stat(resolve(root, dependency.path))).isFile(),
      dependency.path,
    );
  }
}

// Re-encoding already-compressed assets is unnecessary and can lose quality.
for (const file of await walk(resolve(source, "assets"))) {
  const name = relative(resolve(source, "assets"), file);
  const built = resolve(output, "assets", name);
  if (file.endsWith(".json")) {
    assert.deepEqual(
      JSON.parse(await text(file)),
      JSON.parse(await text(built)),
    );
  } else if (!file.endsWith(".svg")) {
    assert.deepEqual(await readFile(file), await readFile(built), name);
  }
}
console.log(
  `Production checks passed: ${files.length} files, preserved DOM hooks, local chunks, minified styles and intact assets.`,
);
