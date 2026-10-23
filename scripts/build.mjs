import { build, transform } from "esbuild";
import { minify } from "html-minifier-terser";
import { optimize } from "svgo";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "src");
const output = resolve(root, "dist");
const assets = resolve(output, "assets");
const target = ["chrome120", "firefox121", "safari17"];
const digest = (value) =>
  createHash("sha256").update(value).digest("hex").slice(0, 12);

await rm(output, { recursive: true, force: true });
await mkdir(assets, { recursive: true });
await cp(resolve(source, "assets"), assets, { recursive: true });

// Preserve dimensions, IDs, paths and numeric precision in the pixel cursors.
// These plugins only remove redundant serialization/metadata and shorten colours.
for (const name of await readdir(assets)) {
  const path = resolve(assets, name);
  if (name.endsWith(".svg")) {
    const result = optimize(await readFile(path, "utf8"), {
      path,
      multipass: true,
      plugins: [
        "removeComments",
        "removeMetadata",
        "removeDoctype",
        "removeXMLProcInst",
        "cleanupAttrs",
        "removeEmptyAttrs",
        "removeUnusedNS",
        "convertColors",
        "sortAttrs",
      ],
    });
    await writeFile(path, result.data);
  } else if (name.endsWith(".json")) {
    await writeFile(
      path,
      JSON.stringify(JSON.parse(await readFile(path, "utf8"))),
    );
  }
}
await cp(
  resolve(root, "node_modules/three/LICENSE"),
  resolve(assets, "Three-LICENSE.txt"),
);

const common = {
  absWorkingDir: root,
  bundle: true,
  minify: true,
  platform: "browser",
  target,
  outdir: assets,
  entryNames: "[name]-[hash]",
  chunkNames: "[name]-[hash]",
  metafile: true,
  sourcemap: false,
  legalComments: "linked",
  charset: "utf8",
  logLevel: "warning",
};

// Keep the 3D world in a dynamic chunk so the small UI can initialize first.
// Do not mangle properties: shader names and DOM/object lookups rely on them.
const app = await build({
  ...common,
  entryPoints: { app: "src/app.js" },
  format: "esm",
  splitting: true,
  treeShaking: true,
});
const reset = await build({
  ...common,
  entryPoints: { reset: "src/reset.js" },
  format: "iife",
});
const findEntry = (result, name) => {
  const entry = Object.entries(result.metafile.outputs).find(
    ([, value]) => value.entryPoint === name,
  );
  if (!entry) throw new Error(`Missing generated entry point: ${name}`);
  return "/" + relative(output, resolve(root, entry[0])).split("\\").join("/");
};
const appURL = findEntry(app, "src/app.js");
const resetURL = findEntry(reset, "src/reset.js");

const cssSource = await readFile(resolve(source, "style.css"), "utf8");
const css = await transform(cssSource, {
  loader: "css",
  minify: true,
  target,
  legalComments: "none",
  charset: "utf8",
});
if (css.warnings.length)
  throw new Error(css.warnings.map((warning) => warning.text).join("\n"));
const cssURL = `/assets/style-${digest(css.code)}.css`;
await writeFile(resolve(output, "." + cssURL), css.code);

const htmlOptions = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  collapseBooleanAttributes: true,
  removeComments: true,
  removeAttributeQuotes: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  minifyCSS: true,
  minifyJS: true,
};
for (const name of ["index.html", "credits.html"]) {
  const html = (await readFile(resolve(source, name), "utf8"))
    .replaceAll('href="/style.css"', `href="${cssURL}"`)
    .replaceAll('src="/app.js"', `src="${appURL}"`)
    .replaceAll('src="/reset.js"', `src="${resetURL}"`);
  await writeFile(resolve(output, name), await minify(html, htmlOptions));
}

// Local/build diagnostics are kept outside the publicly served output.
await mkdir(resolve(root, ".build"), { recursive: true });
const jsOutputs = { ...app.metafile.outputs, ...reset.metafile.outputs };
const jsPaths = Object.keys(jsOutputs).filter((path) => path.endsWith(".js"));
let jsGzip = 0;
for (const path of jsPaths)
  jsGzip += gzipSync(await readFile(resolve(root, path))).length;
const report = {
  entryPoints: { app: appURL, reset: resetURL, css: cssURL },
  javascript: {
    inputBytes: Object.values({
      ...app.metafile.inputs,
      ...reset.metafile.inputs,
    }).reduce((sum, input) => sum + input.bytes, 0),
    outputBytes: jsPaths.reduce((sum, path) => sum + jsOutputs[path].bytes, 0),
    gzipBytes: jsGzip,
    files: jsPaths.length,
  },
  css: {
    inputBytes: Buffer.byteLength(cssSource),
    outputBytes: Buffer.byteLength(css.code),
  },
};
await writeFile(
  resolve(root, ".build/metafile.json"),
  JSON.stringify(app.metafile, null, 2) + "\n",
);
await writeFile(
  resolve(root, ".build/report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
