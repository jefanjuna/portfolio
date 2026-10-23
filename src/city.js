import { buildBayWater } from "./bay-water.js";
import { buildLandmarks } from "./landmarks.js";
import { buildStreetLife } from "./street-life.js";
import { buildClouds } from "./clouds.js";
import { makeArchitecture } from "./architecture.js";
import { buildStreetGround } from "./street-ground.js";
import { buildLandscape } from "./landscape.js";
import { buildNightSky } from "./night-sky.js";
import { sampleShot } from "./world-path.js";
import { createStaticBatch } from "./static-batch.js";
import { yieldTask } from "./yield-task.js";
export async function buildCity(scene, k) {
  const map = await fetch("./assets/marina-bay-map.json").then((r) => {
      if (!r.ok) throw Error("Map geometry unavailable");
      return r.json();
    }),
    { THREE: T, group, mesh, mat } = k,
    city = group(scene);
  function polygon(points, height, material, y = 0) {
    if (points.length < 3) return;
    const shape = new T.Shape(points.map(([x, z]) => new T.Vector2(x, -z))),
      geo = height
        ? new T.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
        : new T.ShapeGeometry(shape);
    if (height && material.map) {
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++)
        uv.setXY(i, uv.getX(i) / 64, uv.getY(i) / 105.6);
      for (const g of geo.groups)
        if (g.materialIndex === 0)
          for (let i = g.start; i < g.start + g.count; i++)
            uv.setXY(i, 0.001, 0.001);
    }
    geo.rotateX(-Math.PI / 2);
    const o = mesh(geo, material, city, 0, y, 0);
    o.receiveShadow = true;
    o.castShadow = height > 2;
    return o;
  }
  const batches = createStaticBatch(city),
    ground = await buildStreetGround(city, k, map, async () => {
      batches.collect();
      await yieldTask();
    }),
    architecture = makeArchitecture(k, city, map);
  for (let i = 0; i < map.buildings.length; i++) {
    architecture.build(map.buildings[i]);
    if (i % 80 === 79) {
      batches.collect();
      await yieldTask();
    }
  }
  batches.collect();
  await yieldTask();
  const landscape = buildLandscape(city, k, map, polygon, ground.space),
    towers = [
      architecture.facade("glass", "#8dabb6"),
      architecture.facade("silver", "#718c9b"),
      architecture.facade("glass", "#446d80"),
      architecture.facade("stone", "#b6b8b0"),
      architecture.facade("residential", "#71969b"),
      architecture.facade("concrete", "#b6b7b3"),
      architecture.facade("glass", "#7b9aa8"),
    ];
  batches.collect();
  await yieldTask();
  const landmarks = buildLandmarks(city, k, map, polygon, towers);
  batches.collect();
  await yieldTask();
  const life = buildStreetLife(city, k, map, landscape.obstacles),
    clouds = buildClouds(city, k),
    sky = buildNightSky(city, k);
  const water = buildBayWater(city, k, map);
  await batches.finish();
  let lastEye = [];
  return {
    city,
    map,
    ground,
    landmarks,
    life,
    obstacles: landscape.obstacles,
    architecture,
    landscape,
    water,
    sky,
    setProgress(q, shotEye) {
      const leaf = architecture.opening;
      if (leaf) leaf.rotation.y = T.MathUtils.smoothstep(q, 1.47, 1.95) * 1.42;
      const exit = architecture.exitOpening;
      if (exit) exit.rotation.y = -T.MathUtils.smoothstep(q, 8.6, 9.45) * 1.42;
      clouds.setProgress(q > 12 ? (13 - q) * 0.65 : q);
      life.setProgress(q);
      const eye = shotEye || sampleShot(q).eye;
      if (
        !lastEye.length ||
        Math.hypot(eye[0] - lastEye[0], eye[2] - lastEye[2]) > 8
      ) {
        landscape.setEye(eye);
        lastEye = eye;
      }
    },
    dispose() {
      life.dispose();
      water.dispose();
    },
  };
}
