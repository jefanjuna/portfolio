import { ROAD_JOURNEY, ROAD_LENGTH, sampleRoad } from "./journey.js";
import { roadDistanceAt, sampleRoadPose } from "./road-motion.js";
export function buildStreetLife(city, k, map, obstacles) {
  const { THREE: T, random, mat, palette: p, group, box, cyl, ball, tube } = k,
    root = group(city);
  root.userData.dynamic = true;
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
    key = (p) => p.map((v) => v.toFixed(2)).join(","),
    people = [],
    vehicles = [];
  const obstacleCells = new Map(),
    obstacleCell = 12;
  for (const o of obstacles) {
    const id =
      Math.floor(o.x / obstacleCell) + "," + Math.floor(o.z / obstacleCell);
    if (!obstacleCells.has(id)) obstacleCells.set(id, []);
    obstacleCells.get(id).push(o);
  }
  function nearby(a, b = a, pad = 4) {
    const found = new Set();
    for (
      let x = Math.floor((Math.min(a[0], b[0]) - pad) / obstacleCell);
      x <= Math.floor((Math.max(a[0], b[0]) + pad) / obstacleCell);
      x++
    )
      for (
        let z = Math.floor((Math.min(a[1], b[1]) - pad) / obstacleCell);
        z <= Math.floor((Math.max(a[1], b[1]) + pad) / obstacleCell);
        z++
      )
        for (const o of obstacleCells.get(x + "," + z) || []) found.add(o);
    return found;
  }
  function detour(a, b, clearance = 0.95) {
    let path = [a, b];
    for (let pass = 0; pass < 3; pass++) {
      const result = [path[0]];
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1],
          b = path[i],
          dx = b[0] - a[0],
          dz = b[1] - a[1],
          ll = dx * dx + dz * dz;
        let hit;
        for (const o of nearby(a, b)) {
          const t = T.MathUtils.clamp(
              ((o.x - a[0]) * dx + (o.z - a[1]) * dz) / (ll || 1),
              0,
              1,
            ),
            x = a[0] + dx * t,
            z = a[1] + dz * t,
            r = o.r + clearance;
          if (Math.hypot(o.x - x, o.z - z) < r) {
            hit = { o, t, r };
            break;
          }
        }
        if (hit) {
          const { o, t, r } = hit,
            l = Math.sqrt(ll) || 1,
            side = dx * (o.z - a[1]) - dz * (o.x - a[0]) > 0 ? -1 : 1;
          for (const offset of [-r - 1, 0, r + 1]) {
            const d = T.MathUtils.clamp(t * l + offset, 0, l);
            result.push([
              a[0] + (dx / l) * d - (dz / l) * (r + 1) * side,
              a[1] + (dz / l) * d + (dx / l) * (r + 1) * side,
            ]);
          }
        }
        result.push(b);
      }
      path = result;
    }
    return path;
  }
  function graph(routes, walk) {
    const nodes = new Map(),
      edges = [];
    const node = (p) => {
      const id = key(p);
      if (!nodes.has(id)) nodes.set(id, { p, next: [] });
      return nodes.get(id);
    };
    for (const r of routes)
      for (let i = 1; i < r.p.length; i++) {
        const a = r.p[i - 1],
          b = r.p[i];
        if (distance(a, b) < 0.15) continue;
        for (let reverse = 0; reverse < (r.oneway ? 1 : 2); reverse++) {
          const start = reverse ? b : a,
            end = reverse ? a : b,
            path = walk ? detour(start, end) : [start, end],
            length = path.reduce(
              (s, p, i) => s + (i ? distance(p, path[i - 1]) : 0),
              0,
            ),
            edge = {
              a: node(start),
              b: node(end),
              path,
              length,
              road: r.id,
              crossing: r.crossing,
              lanes: r.lanes || 1,
              width: r.width || 3.2,
              oneway: r.oneway,
              kind: r.kind,
              y0: r.y?.[reverse ? i : i - 1] || 0,
              y1: r.y?.[reverse ? i - 1 : i] || 0,
              occupants: [],
            };
          edge.a.next.push(edge);
          edges.push(edge);
        }
      }
    return { nodes, edges };
  }
  const driving = graph(
      map.roads.filter((r) => !["service"].includes(r.kind)),
      false,
    ),
    walking = graph(
      map.walks.filter(
        (r) => !r.steps && r.p.some((p) => Math.hypot(...p) < 2500),
      ),
      true,
    );
  function sample(edge, s, lane = 0) {
    const ratio = T.MathUtils.clamp(s / edge.length, 0, 1);
    s = T.MathUtils.clamp(s, 0, edge.length);
    for (let i = 1; i < edge.path.length; i++) {
      const a = edge.path[i - 1],
        b = edge.path[i],
        l = distance(a, b) || 1;
      if (s <= l || i === edge.path.length - 1) {
        const dx = (b[0] - a[0]) / l,
          dz = (b[1] - a[1]) / l;
        return {
          x: a[0] + dx * s + dz * lane,
          y: edge.y0 + (edge.y1 - edge.y0) * ratio,
          z: a[1] + dz * s - dx * lane,
          yaw: Math.atan2(dx, dz),
        };
      }
      s -= l;
    }
  }
  function choose(edge, type, home = false) {
    let next = edge.b.next.filter((e) => e.b !== edge.a);
    if (!next.length) next = edge.b.next;
    if (home) {
      const local = next.filter((e) => nearRoadSet.has(e));
      if (local.length) next = local;
    }
    if (type?.includes("bus")) {
      const major = next.filter((e) => e.lanes > 1 && e.kind !== "residential");
      if (major.length) next = major;
    }
    return next[Math.floor(random() * next.length)] || null;
  }
  const roadNear = (e) =>
      ROAD_JOURNEY.some(
        (v) => Math.hypot(e.a.p[0] - v.p[0], e.a.p[1] - v.p[2]) < 230,
      ),
    nearRoads = driving.edges.filter(roadNear),
    nearWalks = walking.edges.filter((e) =>
      ROAD_JOURNEY.some(
        (v) => Math.hypot(e.a.p[0] - v.p[0], e.a.p[1] - v.p[2]) < 170,
      ),
    );
  const nearRoadSet = new Set(nearRoads),
    trafficFrustum = new T.Frustum(),
    trafficMatrix = new T.Matrix4(),
    trafficSphere = new T.Sphere();
  let hasCamera = false,
    recycled = 0;
  function visibleAt(point, radius = 12) {
    if (!hasCamera) return false;
    trafficSphere.center.set(point.x, point.y, point.z);
    trafficSphere.radius = radius;
    return trafficFrustum.intersectsSphere(trafficSphere);
  }
  function weighted(edges) {
    let total = 0;
    for (const e of edges) total += e.length;
    let n = random() * total;
    for (const e of edges) {
      n -= e.length;
      if (n <= 0) return e;
    }
    return edges[0];
  }
  const paint = [
      "#bec5c8",
      "#264d68",
      "#a97848",
      "#213b46",
      "#8a3434",
      "#cec3af",
      "#c8ac35",
      "#477363",
    ].map((color) => mat({ color, metalness: 0.65, roughness: 0.25 })),
    glass = mat({ color: "#17313f", metalness: 0.8, roughness: 0.12 }),
    rubber = mat({ color: "#10171c", roughness: 0.95 }),
    steel = mat({ color: "#83959c", metalness: 0.85, roughness: 0.25 }),
    tail = mat({
      color: "#a91d25",
      emissive: "#ff282d",
      emissiveIntensity: 1.8,
    }),
    light = mat({
      color: "#d5e6eb",
      emissive: "#d7eeff",
      emissiveIntensity: 2.5,
    }),
    busGreen = mat({ color: "#5f9b31", roughness: 0.38, metalness: 0.35 }),
    white = mat({ color: "#d8d9d4", roughness: 0.45, metalness: 0.3 });
  function wheels(g, width, length, r = 0.32) {
    for (const z of [-length * 0.31, length * 0.31])
      for (const x of [-width * 0.5, width * 0.5]) {
        const o = cyl(r, 0.19, rubber, g, x, r + 0.05, z);
        o.rotation.z = Math.PI / 2;
        const hub = cyl(r * 0.52, 0.2, steel, g, x, r + 0.05, z);
        hub.rotation.z = Math.PI / 2;
      }
  }
  function vehicle(type, index) {
    const g = group(root),
      body =
        paint[type === "taxi" ? (index % 2 ? 1 : 6) : index % paint.length];
    let length = 4.4,
      width = 1.85,
      height = 1.45;
    if (type === "motorcycle") {
      length = 2.1;
      width = 0.7;
      height = 1.7;
      for (const z of [-0.7, 0.7]) {
        const o = cyl(0.34, 0.16, rubber, g, 0, 0.38, z);
        o.rotation.z = Math.PI / 2;
      }
      box(0.35, 0.28, 1.0, body, g, 0, 0.75, 0, 0.08);
      box(0.35, 0.1, 0.7, p.black, g, 0, 0.96, -0.2, 0.04);
      tube(
        [
          [0, 0.45, 0.75],
          [0, 1.04, 0.6],
          [-0.3, 1.12, 0.6],
          [0.3, 1.12, 0.6],
        ],
        0.025,
        steel,
        g,
      );
      box(0.38, 0.5, 0.28, paint[3], g, 0, 1.12, -0.15, 0.06);
      ball(0, 1.53, -0.06, 0.2, p.black, g);
      box(0.17, 0.12, 0.06, light, g, 0, 0.9, 0.93);
      return { g, length, width, height };
    }
    if (type.includes("bus")) {
      length = type === "doublebus" ? 11.8 : 11.2;
      width = 2.5;
      height = type === "doublebus" ? 4.25 : 3.15;
      box(
        width,
        height - 0.65,
        length,
        busGreen,
        g,
        0,
        0.65 + (height - 0.65) / 2,
        0,
        0.15,
      );
      for (const y of type === "doublebus" ? [1.7, 3.25] : [2.1]) {
        box(width + 0.015, 0.92, length * 0.83, glass, g, 0, y, 0);
        for (let z = -length * 0.4; z < length * 0.4; z += 1.35)
          for (const x of [-1.26, 1.26]) box(0.025, 1, 0.07, steel, g, x, y, z);
      }
      box(width + 0.03, 0.18, length * 0.86, busGreen, g, 0, 2.54, 0);
      box(width * 0.88, 1.2, 0.05, glass, g, 0, 1.8, length / 2 + 0.02);
      box(1.2, 0.26, 0.06, p.black, g, 0, height - 0.35, length / 2 + 0.04);
      box(1.1, 0.09, 0.07, p.warm, g, 0, height - 0.35, length / 2 + 0.08);
      for (const z of [2.7, -2.7]) box(0.035, 2, 1.2, glass, g, -1.28, 1.6, z);
      wheels(g, width, length, 0.47);
    } else if (type === "van" || type === "truck") {
      length = type === "truck" ? 6.6 : 5.3;
      width = type === "truck" ? 2.25 : 1.95;
      height = type === "truck" ? 3.3 : 2.6;
      if (type === "truck") {
        box(width, height - 0.5, 4, white, g, 0, 1.9, -1.1, 0.07);
        box(1.95, 1.5, 2.1, body, g, 0, 1.1, 2, 0.15);
        box(1.78, 0.72, 0.08, glass, g, 0, 1.62, 3.07);
        box(1.7, 0.7, 0.06, white, g, 0, 1.14, -3.15);
      } else {
        box(
          width,
          height - 0.5,
          length,
          white,
          g,
          0,
          height / 2 + 0.25,
          0,
          0.17,
        );
        box(width * 0.92, 0.72, 1.3, glass, g, 0, 1.78, 1.5, 0.06);
        box(1.6, 0.6, 0.07, glass, g, 0, 1.8, 2.68);
        for (const x of [-width / 2 - 0.02, width / 2 + 0.02])
          box(0.04, 0.9, 2.4, body, g, x, 1.5, -0.65);
        box(0.035, 1.6, 0.03, steel, g, 0, 1.4, -length / 2 - 0.03);
      }
      wheels(g, width, length, 0.36);
    } else {
      height = type === "suv" ? 1.85 : 1.45;
      length = type === "hatchback" ? 3.85 : 4.45;
      box(width, 0.66, length, body, g, 0, 0.67, 0, 0.15);
      const cabin = group(g, 0, 1.32, -0.2);
      box(
        width * 0.89,
        height - 0.75,
        length * 0.53,
        glass,
        cabin,
        0,
        0,
        0,
        0.1,
      );
      box(
        width * 0.92,
        0.09,
        length * 0.54,
        body,
        cabin,
        0,
        (height - 0.75) / 2,
        0,
      );
      box(0.06, height - 0.7, 0.12, body, cabin, -0.83, 0, 0);
      box(0.06, height - 0.7, 0.12, body, cabin, 0.83, 0, 0);
      if (type === "taxi")
        box(0.52, 0.17, 0.28, p.warm, g, 0, height + 0.12, -0.1);
      wheels(g, width, length, 0.3);
    }
    for (const x of [-width * 0.34, width * 0.34]) {
      box(0.3, 0.16, 0.08, light, g, x, 0.75, length / 2 + 0.02);
      box(0.25, 0.14, 0.08, tail, g, x, 0.73, -length / 2 - 0.02);
    }
    box(width * 0.65, 0.13, 0.08, steel, g, 0, 0.42, length / 2 + 0.05);
    return { g, length, width, height };
  }
  function spawnPose(candidates) {
    const edge = weighted(candidates),
      s = random() * edge.length,
      laneIndex = Math.floor(
        random() *
          Math.max(1, edge.oneway ? edge.lanes : Math.floor(edge.lanes / 2)),
      ),
      lane = edge.oneway
        ? edge.width / 2 - 1.6 - laneIndex * 3.2
        : Math.max(0.8, edge.width / 2 - 1.6 - laneIndex * 3.2);
    return { edge, s, lane };
  }
  const types = [
    "sedan",
    "taxi",
    "hatchback",
    "suv",
    "van",
    "sedan",
    "motorcycle",
    "sedan",
    "truck",
    "motorcycle",
    "sedan",
    "bus",
    "van",
    "doublebus",
    "motorcycle",
    "taxi",
  ];
  for (let i = 0; i < 250; i++) {
    const type = types[i % types.length],
      model = vehicle(type, i),
      candidates = (i < 170 ? nearRoads : driving.edges).filter(
        (e) =>
          !type.includes("bus") || (e.lanes > 1 && e.kind !== "residential"),
      );
    let { edge, s, lane } = spawnPose(candidates);
    for (
      let n = 0;
      n < 30 &&
      vehicles.some(
        (v) =>
          v.edge === edge &&
          Math.abs(v.lane - lane) < 1 &&
          Math.abs(v.s - s) < model.length + 3,
      );
      n++
    ) {
      ({ edge, s, lane } = spawnPose(candidates));
    }
    vehicles.push({
      ...model,
      type,
      edge,
      s,
      lane,
      home: i < 170,
      outside: 0,
      stopped: 0,
      travel: 0,
      speed: 5 + random() * 9,
      cruise: type.includes("bus")
        ? 11 + random() * 4
        : type === "motorcycle"
          ? 18 + random() * 5
          : 13 + random() * 7,
    });
  }
  const shirts = [
      "#bfa57f",
      "#4b7d8f",
      "#8b9569",
      "#755f83",
      "#ccd0c8",
      "#a86d55",
      "#30485b",
      "#b8b6b1",
    ].map((color) => mat({ color, roughness: 0.9 })),
    skins = ["#c49b7b", "#997151", "#d7b599", "#76533e"].map((color) =>
      mat({ color, roughness: 0.9 }),
    ),
    hair = mat({ color: "#1e1b1b", roughness: 1 }),
    bag = mat({ color: "#8a6847", roughness: 0.9 });
  function personFigure(parent, type, index, scale = 1, x = 0) {
    const g = group(parent, x, 0, 0);
    g.scale.setScalar(scale);
    const skin = skins[index % 4],
      shirt = type === "student" ? shirts[4] : shirts[index % 8],
      female = ["mother", "shopper", "stroller"].includes(type),
      limbs = [];
    box(0.38, 0.56, 0.25, shirt, g, 0, 1.12, 0, 0.06);
    ball(0, 1.61, 0, 0.16, skin, g, 1, 1.1, 1);
    ball(0, 1.71, -0.025, 0.165, hair, g, 1, 0.4, 1);
    if (female) ball(0, 1.54, -0.1, 0.14, hair, g, 1, 1.3, 0.6);
    for (const side of [-1, 1]) {
      const leg = group(g, side * 0.11, 0.86, 0);
      box(0.125, 0.72, 0.13, p.black, leg, 0, -0.35, 0, 0.025);
      box(0.14, 0.07, 0.22, p.black, leg, 0, -0.72, 0.035, 0.02);
      limbs.push(leg);
      const arm = group(g, side * 0.25, 1.34, 0);
      box(0.1, 0.56, 0.11, skin, arm, 0, -0.25, 0, 0.025);
      limbs.push(arm);
    }
    if (type === "student") {
      box(0.29, 0.38, 0.15, shirts[6], g, 0, 1.12, -0.21, 0.04);
      for (const x of [-0.16, 0.16])
        box(0.035, 0.45, 0.025, shirts[6], g, x, 1.12, 0.15);
      box(0.18, 0.035, 0.03, shirts[6], g, 0, 1.32, 0.15);
    }
    if (type === "office") {
      box(0.3, 0.25, 0.09, p.black, g, 0.32, 0.62, 0, 0.02);
      tube(
        [
          [0.24, 0.75, 0],
          [0.24, 0.81, 0],
          [0.4, 0.81, 0],
          [0.4, 0.75, 0],
        ],
        0.014,
        p.black,
        g,
      );
      box(0.04, 0.32, 0.025, shirts[6], g, 0, 1.1, 0.14);
    }
    if (type === "shopper") {
      box(0.26, 0.32, 0.18, bag, g, 0.33, 0.66, 0, 0.015);
      tube(
        [
          [0.23, 0.8, 0],
          [0.25, 0.9, 0],
          [0.4, 0.9, 0],
          [0.43, 0.8, 0],
        ],
        0.012,
        bag,
        g,
      );
      for (let j = 0; j < 3; j++)
        ball(0.28 + j * 0.05, 0.87, 0, 0.06, p.leaf, g, 1, 1.3, 1);
    }
    if (type === "runner") {
      box(0.39, 0.26, 0.26, shirts[6], g, 0, 0.81, 0, 0.03);
    }
    return { g, limbs };
  }
  for (let i = 0; i < 320; i++) {
    const type = [
        "walker",
        "office",
        "student",
        "shopper",
        "runner",
        "mother",
        "walker",
        "stroller",
      ][i % 8],
      edge = weighted(i < 210 && nearWalks.length ? nearWalks : walking.edges),
      g = group(root),
      h = 0.88 + random() * 0.18,
      figure = personFigure(g, type, i, h),
      limbs = [...figure.limbs],
      radius = type === "mother" ? 0.95 : type === "stroller" ? 1 : 0.25;
    if (type === "mother") {
      const childScale = 0.65,
        child = personFigure(g, "student", i + 1, childScale, 0.67);
      limbs.push(...child.limbs);
      const handY = 0.98 * h;
      const pose = (model, armIndex, shoulder, elbow, hand, skin) => {
        const arm = model.limbs[armIndex];
        arm.clear();
        arm.userData.fixedPose = true;
        for (const [a, b] of [
          [shoulder, elbow],
          [elbow, hand],
        ]) {
          const av = new T.Vector3(...a),
            bv = new T.Vector3(...b),
            length = av.distanceTo(bv),
            part = meshSafe(
              new T.CylinderGeometry(0.045, 0.048, length, 7),
              skin,
              g,
              ...av.clone().add(bv).multiplyScalar(0.5).toArray(),
            );
          part.quaternion.setFromUnitVectors(
            new T.Vector3(0, 1, 0),
            bv.sub(av).normalize(),
          );
        }
        return ball(...hand, 0.053, skin, g);
      };
      const adultHand = pose(
          figure,
          3,
          [0.25 * h, 1.34 * h, 0],
          [0.34 * h, 1.1 * h, 0.025],
          [0.46, handY, 0.055],
          skins[i % 4],
        ),
        childHand = pose(
          child,
          1,
          [0.67 - 0.25 * childScale, 1.34 * childScale, 0],
          [0.58, 0.72, 0.035],
          [0.49, handY, 0.055],
          skins[(i + 1) % 4],
        );
      g.userData.family = { adultHand, childHand };
    }
    if (type === "stroller") {
      const stroller = group(g, 0, 0, 0.8);
      for (const x of [-0.27, 0.27])
        for (const z of [-0.3, 0.35]) {
          const wheel = cyl(0.14, 0.07, rubber, stroller, x, 0.17, z);
          wheel.rotation.z = Math.PI / 2;
        }
      box(0.48, 0.1, 0.64, p.metal, stroller, 0, 0.35, 0);
      box(0.45, 0.3, 0.6, shirts[6], stroller, 0, 0.51, 0, 0.08);
      const canopy = meshSafe(
        new T.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        shirts[i % 8],
        stroller,
        0,
        0.77,
        -0.1,
      );
      canopy.scale.set(0.8, 1, 1);
      ball(0, 0.66, 0.1, 0.1, skins[i % 4], stroller);
      for (const x of [-0.26, 0.26])
        tube(
          [
            [x, 0.22, 0.32],
            [x, 0.66, -0.1],
            [x, 1.05, -0.65],
          ],
          0.023,
          steel,
          stroller,
        );
      box(0.6, 0.04, 0.04, steel, stroller, 0, 1.05, -0.65);
    }
    people.push({
      g,
      figure,
      limbs,
      edge,
      s: random() * edge.length,
      speed:
        type === "runner"
          ? 2.8 + random()
          : type === "mother" || type === "stroller"
            ? 0.65 + random() * 0.4
            : 0.85 + random() * 0.6,
      wait: random() < 0.18 ? random() * 9 : 0,
      phase: random() * 6,
      radius,
      type,
    });
  }
  function meshSafe(geo, material, parent, x, y, z) {
    const o = new T.Mesh(geo, material);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  // Shared shapes retain different vehicle dimensions and accessories.
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const sz = o.geometry.boundingBox
        .getSize(new T.Vector3())
        .toArray()
        .map((v) => v.toFixed(5))
        .join(","),
      id =
        o.material.uuid +
        o.geometry.type +
        JSON.stringify(o.geometry.parameters) +
        sz;
    if (!buckets.has(id))
      buckets.set(id, {
        geometry: o.geometry,
        material: o.material,
        items: [],
      });
    buckets.get(id).items.push(o);
    o.visible = false;
  });
  const batches = [];
  for (const b of buckets.values()) {
    const inst = new T.InstancedMesh(b.geometry, b.material, b.items.length);
    inst.userData.dynamic = true;
    inst.instanceMatrix.setUsage(T.DynamicDrawUsage);
    inst.frustumCulled = false;
    inst.castShadow = false;
    inst.receiveShadow = true;
    city.add(inst);
    batches.push({ ...b, inst });
  }
  const hero = vehicles.find((v) => v.type === "taxi");
  let previous = 0,
    progress = 0;
  const occupiedEdges = new Set();
  function recycle(v) {
    if (visibleAt(v.g.position, v.length + 8)) return false;
    const candidates = nearRoads.filter(
      (e) =>
        !v.type.includes("bus") || (e.lanes > 1 && e.kind !== "residential"),
    );
    for (let n = 0; n < 48; n++) {
      const edge = weighted(candidates),
        s = random() * edge.length,
        lane = edge.oneway
          ? Math.max(0, edge.width / 2 - 1.6)
          : Math.max(0.8, edge.width / 2 - 1.6),
        point = sample(edge, s, lane);
      if (
        visibleAt(point, v.length + 8) ||
        vehicles.some(
          (other) =>
            other !== v &&
            other.edge === edge &&
            Math.abs(other.lane - lane) < 1.5 &&
            Math.abs(other.s - s) < (other.length + v.length) / 2 + 8,
        )
      )
        continue;
      Object.assign(v, {
        edge,
        s,
        lane,
        outside: 0,
        stopped: 0,
        speed: v.cruise * 0.65,
      });
      recycled++;
      return true;
    }
    return false;
  }
  function advanceTraffic(dt, time) {
    const phase = time % 22,
      following = progress > 0.78 && progress < 1.7;
    for (const e of occupiedEdges) e.occupants.length = 0;
    occupiedEdges.clear();
    for (const v of vehicles) {
      if (v === hero && following) continue;
      v.edge.occupants.push(v);
      occupiedEdges.add(v.edge);
    }
    for (const e of occupiedEdges) e.occupants.sort((a, b) => a.s - b.s);

    for (const v of vehicles) {
      if (v === hero && following) {
        const d = T.MathUtils.clamp(
            roadDistanceAt(progress) + 22,
            0,
            ROAD_LENGTH,
          ),
          s = sampleRoadPose(d);
        v.g.position.set(s.p[0], s.p[1] + 0.14, s.p[2]);
        v.g.rotation.y = s.yaw;
        continue;
      }
      v.outside = v.home && !nearRoadSet.has(v.edge) ? v.outside + dt : 0;
      v.stopped = v.speed < 0.5 ? v.stopped + dt : 0;
      if (v.home && (v.outside > 4 || v.stopped > 55)) recycle(v);
      const ahead = v.edge.occupants.find(
          (o) => o !== v && o.s > v.s && Math.abs(o.lane - v.lane) < 1.5,
        ),
        gap = ahead ? ahead.s - v.s - (ahead.length + v.length) / 2 : Infinity;
      let target = v.cruise;
      if (gap < 4 + v.speed * 1.2) target = Math.max(0, (gap - 3) / 1.2);
      const remaining = v.edge.length - v.s;
      if (v.edge.b.next.length > 2 && phase > 14 && remaining < 24)
        target = Math.min(target, Math.max(0, (remaining - 3) * 0.7));
      v.speed = T.MathUtils.damp(
        v.speed,
        target,
        target < v.speed ? 4 : 1.2,
        dt,
      );
      v.travel += v.speed * dt;
      v.s += v.speed * dt;
      for (let n = 0; v.s > v.edge.length && n < 10; n++) {
        v.s -= v.edge.length;
        const next = choose(v.edge, v.type, v.home);
        if (next) {
          v.edge = next;
          v.lane = T.MathUtils.clamp(
            v.lane,
            -next.width / 2 + 1.4,
            next.width / 2 - 1.4,
          );
        } else {
          v.s = 0;
          break;
        }
      }
      const s = sample(v.edge, v.s, v.lane);
      v.g.position.set(s.x, s.y + 0.14, s.z);
      v.g.rotation.y +=
        (T.MathUtils.euclideanModulo(
          s.yaw - v.g.rotation.y + Math.PI,
          Math.PI * 2,
        ) -
          Math.PI) *
        Math.min(1, dt * 12);
    }
  }
  function update(time) {
    const dt = Math.min(0.05, Math.max(0, time - previous));
    previous = time;
    const phase = time % 22;
    advanceTraffic(dt, time);
    for (const person of people) {
      if (person.wait > 0) {
        person.wait -= dt;
        person.figure.g.rotation.y =
          person.type === "mother"
            ? 0
            : Math.sin(time * 0.5 + person.phase) * 0.1;
      } else if (person.edge.crossing && phase < 15 && person.s < 0.4)
        person.wait = 0.3;
      else {
        person.s += person.speed * dt;
        if (person.s > person.edge.length) {
          person.s -= person.edge.length;
          const next = choose(person.edge);
          if (next) person.edge = next;
          else person.s = 0;
          if (random() < 0.12 && !person.edge.crossing)
            person.wait = 2 + random() * 8;
        }
        person.figure.g.rotation.y = 0;
      }
      const s = sample(person.edge, person.s);
      for (let pass = 0; pass < 12; pass++) {
        let moved = false;
        for (const o of nearby([s.x, s.z])) {
          let dx = s.x - o.x,
            dz = s.z - o.z,
            l = Math.hypot(dx, dz),
            r = o.r + 0.48 + person.radius;
          if (l < r) {
            if (l < 0.001) {
              dx = 1;
              dz = 0;
              l = 1;
            }
            s.x = o.x + (dx / l) * r;
            s.z = o.z + (dz / l) * r;
            moved = true;
          }
        }
        if (!moved) break;
      }
      const blocked = (x, z) =>
        [...nearby([x, z])].some(
          (o) => Math.hypot(x - o.x, z - o.z) < o.r + 0.44 + person.radius,
        );
      if (blocked(s.x, s.z)) {
        if (person.lastSafe && !blocked(person.lastSafe.x, person.lastSafe.z)) {
          Object.assign(s, person.lastSafe);
          person.wait = 0.3;
        } else {
          search: for (let r = 0.5; r <= 8; r += 0.5)
            for (let j = 0; j < 24; j++) {
              const a = (j / 24) * Math.PI * 2,
                x = s.x + Math.cos(a) * r,
                z = s.z + Math.sin(a) * r;
              if (!blocked(x, z)) {
                s.x = x;
                s.z = z;
                break search;
              }
            }
        }
      }
      person.lastSafe = { x: s.x, y: s.y, z: s.z };
      person.g.position.set(s.x, s.y + 0.16, s.z);
      person.g.rotation.y +=
        (T.MathUtils.euclideanModulo(
          s.yaw - person.g.rotation.y + Math.PI,
          Math.PI * 2,
        ) -
          Math.PI) *
        Math.min(1, dt * 7);
      const swing =
        person.wait > 0
          ? 0
          : Math.sin(time * person.speed * 5 + person.phase) *
            (person.type === "runner" ? 0.65 : 0.35);
      person.limbs.forEach((l, i) => {
        if (l.userData.fixedPose || (person.type === "stroller" && i % 2))
          return;
        l.rotation.x = swing * (i % 4 === 0 || i % 4 === 3 ? 1 : -1);
      });
    }
    root.updateMatrixWorld(true);
    for (const b of batches) {
      b.items.forEach((o, i) => b.inst.setMatrixAt(i, o.matrixWorld));
      b.inst.instanceMatrix.needsUpdate = true;
    }
  }
  k.animations.push(update);
  return {
    people,
    vehicles,
    obstacles,
    sample,
    hero,
    driving,
    walking,
    batches,
    nearby,
    advanceTraffic,
    trafficStats() {
      return {
        total: vehicles.length,
        near: vehicles.filter((v) => nearRoadSet.has(v.edge)).length,
        moving: vehicles.filter((v) => v.speed > 0.5).length,
        recycled,
        travel: vehicles.reduce((sum, v) => sum + v.travel, 0),
      };
    },
    setCamera(camera) {
      camera.updateMatrixWorld();
      trafficMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      trafficFrustum.setFromProjectionMatrix(trafficMatrix);
      hasCamera = true;
    },
    setProgress(q) {
      progress = q;
    },
  };
}
