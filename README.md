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

## Rendering on phones

Construction yields between road and building groups to keep the loading animation
and input responsive. Static surfaces are compacted as construction proceeds;
repeated shapes use shared geometry and spatially bounded instance batches.
Hidden vehicle/person models only supply animation matrices and are excluded from
render traversal. Traffic, people, water reflections and camera interactions stay
active.

Water keeps its full tessellation and wave shader, with bit-identical vertices
sharing indices. Reflection rendering reuses the scene matrices already updated
for the main view.

Facade diffuse textures are shared by style. Compact screens and devices with a
coarse pointer use smaller emissive textures, drawn from the same window layout
and colours. Desktop texture resolution is unchanged. Photographs are rendered
progressively after the world becomes ready, with cancellation and restoration
when the WebGL context is lost. Invisible scene captions retain measurable layout
without permanent full-screen compositor hints.

`npm test` checks static batching against the original geometry, including vertex
attributes, normals, UVs, mirrored/sheared transforms and animated exclusions.
