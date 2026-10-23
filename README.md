# Josh Junarto

An interactive portfolio built with JavaScript and Three.js.

Live site: https://joshjunarto.vercel.app/

## Source and production builds

`src/` contains the readable, commented website source. Edit these files.
`scripts/` contains the production build and its checks.

```sh
npm ci
npm run build
python -m http.server 4173 --directory dist
```

Open http://localhost:4173/ to view the production build locally.

Vercel runs the same build for `main` and serves only `dist/`. No separate production branch is needed. Generated files, dependencies and local build reports are ignored by Git. The build runs validation automatically; `npm run check` can also recheck an existing build.

The build bundles and minifies JavaScript, removes unused dependency exports, keeps the 3D world in a dynamic chunk, and minifies CSS, HTML, SVG serialization and JSON. JavaScript and CSS receive content-based filenames for safe long-term caching. Object properties and geometric precision are preserved. Source maps are not published.

Audio and WOFF2 fonts are already compressed; the build copies them without re-encoding. Licence notices are preserved, including the bundled Three.js licence. Map, music and font details are available on the site's Credits page.

The readable source is public; do not put credentials or private files in `src/assets/`.
