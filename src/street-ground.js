import { makeStreetSpace } from "./street-space.js";
export function buildStreetGround(city, k, map) {
  const {
      THREE: T,
      mat,
      box,
      mesh,
      cyl,
      tube,
      texture,
      random,
      group,
      palette: p,
    } = k,
    asphalt = mat({ color: "#242e36", roughness: 0.8, metalness: 0.15 }),
    paving = mat({ color: "#5d6568", roughness: 0.86 }),
    paint = mat({ color: "#c5c3ad", roughness: 0.8 }),
    rail = mat({ color: "#71828b", metalness: 0.7, roughness: 0.33 });
  const noise = texture(128, 128, (c, w, h) => {
    c.fillStyle = "#858585";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      const l = 75 + random() * 85;
      c.fillStyle = `rgb(${l},${l},${l})`;
      c.fillRect(random() * w, random() * h, 1, 1);
    }
  });
  noise.wrapS = noise.wrapT = T.RepeatWrapping;
  noise.repeat.set(0.8, 0.2);
  asphalt.map = noise;
  box(
    26000,
    1,
    26000,
    mat({ color: "#343d42", roughness: 0.94 }),
    city,
    0,
    -0.7,
    0,
  );
  function ribbon(
    points,
    width,
    material,
    ys,
    offset = 0.08,
    avoidRoad = false,
  ) {
    const v = [],
      uv = [],
      index = [];
    let s = 0;
    for (let i = 0; i < points.length; i++) {
      const [x, z] = points[i],
        a = points[Math.max(0, i - 1)],
        b = points[Math.min(points.length - 1, i + 1)],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz) || 1,
        y = (ys?.[i] || 0) + offset;
      if (i) s += Math.hypot(x - points[i - 1][0], z - points[i - 1][1]);
      v.push(
        x - ((dz / len) * width) / 2,
        y,
        z + ((dx / len) * width) / 2,
        x + ((dz / len) * width) / 2,
        y,
        z - ((dx / len) * width) / 2,
      );
      uv.push(0, s, 1, s);
      if (i) {
        const j = i * 2;
        let clear = true;
        if (avoidRoad) {
          for (const n of [j - 2, j - 1, j, j + 1])
            if (space.onRoad(v[n * 3], v[n * 3 + 2], v[n * 3 + 1], 0.12))
              clear = false;
          const a = points[i - 1];
          if (space.onRoad((x + a[0]) / 2, (z + a[1]) / 2, y, 0.12))
            clear = false;
        }
        if (clear) index.push(j - 2, j, j - 1, j - 1, j, j + 1);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    const o = mesh(g, material, city);
    o.receiveShadow = true;
    return o;
  }
  const space = makeStreetSpace(map),
    joints = new Map(),
    roadSegments = [];
  for (const r of map.roads) {
    r.width = Math.max(3.4, r.lanes * 3.2);
    ribbon(r.p, r.width + 2, paving, r.y, 0.055);
    ribbon(r.p, r.width, asphalt, r.y, 0.085);
    r.p.forEach((p, i) => {
      const key = p.join(","),
        o = joints.get(key) || { p, y: r.y[i], w: 0, count: 0 };
      o.w = Math.max(o.w, r.width);
      o.count++;
      joints.set(key, o);
    });
    for (let j = 1; j < r.p.length; j++) {
      const a = r.p[j - 1],
        b = r.p[j],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz) || 1;
      roadSegments.push({ a, b, width: r.width, y0: r.y[j - 1], y1: r.y[j] });
      if (r.lanes > 1)
        for (let lane = 1; lane < r.lanes; lane++) {
          const side = r.width / 2 - lane * 3.2;
          for (let s = 2; s < len - 1; s += 10) {
            const o = box(
              0.11,
              0.014,
              3,
              paint,
              city,
              a[0] + (dx * s) / len + (dz / len) * side,
              r.y[j - 1] + ((r.y[j] - r.y[j - 1]) * s) / len + 0.1,
              a[1] + (dz * s) / len - (dx / len) * side,
            );
            o.rotation.y = Math.atan2(dx, dz);
          }
        }
      if (r.bridge && len > 20) {
        for (let d = 8; d < len; d += 32) {
          const x = a[0] + (dx * d) / len,
            z = a[1] + (dz * d) / len,
            y = r.y[j - 1] + ((r.y[j] - r.y[j - 1]) * d) / len;
          if (y > 2) {
            const pier = cyl(1.2, y, paving, city, x, y / 2, z);
            pier.castShadow = true;
          }
        }
        for (const side of [-1, 1]) {
          const off = r.width / 2 + 1;
          tube(
            [
              [
                a[0] + (dz / len) * off * side,
                r.y[j - 1] + 1.1,
                a[1] - (dx / len) * off * side,
              ],
              [
                b[0] + (dz / len) * off * side,
                r.y[j] + 1.1,
                b[1] - (dx / len) * off * side,
              ],
            ],
            0.12,
            rail,
            city,
          );
        }
      }
    }
  }
  for (const j of joints.values())
    if (j.count > 2) {
      const o = mesh(
        new T.CircleGeometry(j.w / 2, 16),
        asphalt,
        city,
        j.p[0],
        j.y + 0.088,
        j.p[1],
      );
      o.rotation.x = -Math.PI / 2;
    }
  for (const w of map.walks) {
    if (w.steps) continue;
    if (!w.crossing) {
      const points = [],
        heights = [];
      for (let i = 1; i < w.p.length; i++) {
        const a = w.p[i - 1],
          b = w.p[i],
          n = Math.max(
            1,
            Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.8),
          );
        for (let j = i === 1 ? 0 : 1; j <= n; j++) {
          const t = j / n;
          points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
          heights.push(
            (w.y?.[i - 1] || 0) + ((w.y?.[i] || 0) - (w.y?.[i - 1] || 0)) * t,
          );
        }
      }
      ribbon(points, 2.4, paving, heights, 0.12, true);
    }
    for (let i = 1; i < w.p.length; i++) {
      const a = w.p[i - 1],
        b = w.p[i],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        l = Math.hypot(dx, dz) || 1;
      if (w.crossing)
        for (let d = 0.5; d < l; d += 1.4) {
          const o = box(
            2.8,
            0.015,
            0.58,
            paint,
            city,
            a[0] + (dx * d) / l,
            w.y[i - 1] + ((w.y[i] - w.y[i - 1]) * d) / l + 0.14,
            a[1] + (dz * d) / l,
          );
          o.rotation.y = Math.atan2(dx, dz);
        }
      if (w.bridge) {
        for (const side of [-1, 1])
          tube(
            [
              [
                a[0] + (dz / l) * 1.5 * side,
                w.y[i - 1] + 1.2,
                a[1] - (dx / l) * 1.5 * side,
              ],
              [
                b[0] + (dz / l) * 1.5 * side,
                w.y[i] + 1.2,
                b[1] - (dx / l) * 1.5 * side,
              ],
            ],
            0.055,
            rail,
            city,
          );
        if (w.name === "The Helix" && l > 4) {
          for (const phase of [0, Math.PI]) {
            const pts = [];
            for (let d = 0; d <= l; d += 1) {
              const a2 = (d / 18) * Math.PI * 2 + phase,
                off = Math.cos(a2) * 2.8;
              pts.push([
                a[0] + (dx * d) / l + (dz / l) * off,
                w.y[i - 1] + 1.6 + Math.sin(a2) * 2.8,
                a[1] + (dz * d) / l - (dx / l) * off,
              ]);
            }
            tube(pts, 0.12, rail, city);
          }
        }
      }
    }
  }
  const signals = [],
    red = mat({ color: "#a31d21", emissive: "#fb262c", emissiveIntensity: 2 }),
    amber = mat({
      color: "#a96913",
      emissive: "#ffb52e",
      emissiveIntensity: 2,
    }),
    green = mat({
      color: "#0a6b55",
      emissive: "#12ce90",
      emissiveIntensity: 2,
    }),
    off = mat({ color: "#111b20", roughness: 0.7 });
  for (const [i, [x, z]] of map.signals.entries()) {
    const g = group(city, x, 0, z);
    cyl(0.08, 3.6, p.metal, g, 0, 1.8, 0);
    box(0.38, 1.05, 0.32, p.black, g, 0, 3.2, 0, 0.05);
    const bulbs = [];
    for (let j = 0; j < 3; j++) {
      const o = mesh(
        new T.CircleGeometry(0.11, 12),
        off,
        g,
        0,
        3.54 - j * 0.32,
        0.17,
      );
      bulbs.push(o);
    }
    signals.push({ bulbs, offset: (i % 2) * 11 });
  }
  k.animations.push((t) =>
    signals.forEach(({ bulbs, offset }) => {
      const phase = (t + offset) % 22,
        active = phase < 14 ? 2 : phase < 16 ? 1 : 0;
      bulbs.forEach(
        (b, i) => (b.material = i === active ? [red, amber, green][i] : off),
      );
    }),
  );
  return { ribbon, roadSegments, paving, space };
}
