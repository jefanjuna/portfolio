// The same height-aware carriageway test governs paving and street furniture.
export function makeStreetSpace(map) {
  const cells = new Map(),
    size = 32,
    segments = [];
  for (const road of map.roads)
    for (let i = 1; i < road.p.length; i++) {
      const a = road.p[i - 1],
        b = road.p[i],
        width = road.width || Math.max(3.4, road.lanes * 3.2),
        o = {
          a,
          b,
          width,
          y0: road.y?.[i - 1] || 0,
          y1: road.y?.[i] || 0,
          id: road.id,
        };
      segments.push(o);
      for (
        let x = Math.floor((Math.min(a[0], b[0]) - width / 2 - 5) / size);
        x <= Math.floor((Math.max(a[0], b[0]) + width / 2 + 5) / size);
        x++
      )
        for (
          let z = Math.floor((Math.min(a[1], b[1]) - width / 2 - 5) / size);
          z <= Math.floor((Math.max(a[1], b[1]) + width / 2 + 5) / size);
          z++
        ) {
          const key = x + "," + z;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(o);
        }
    }
  function onRoad(x, z, y = 0, pad = 0) {
    for (const o of cells.get(
      Math.floor(x / size) + "," + Math.floor(z / size),
    ) || []) {
      const dx = o.b[0] - o.a[0],
        dz = o.b[1] - o.a[1],
        t = Math.max(
          0,
          Math.min(
            1,
            ((x - o.a[0]) * dx + (z - o.a[1]) * dz) / (dx * dx + dz * dz || 1),
          ),
        );
      if (
        Math.abs(y - o.y0 - (o.y1 - o.y0) * t) < 1.5 &&
        Math.hypot(x - o.a[0] - dx * t, z - o.a[1] - dz * t) < o.width / 2 + pad
      )
        return true;
    }
    return false;
  }
  function rectangleClear(x, z, y, width, depth, yaw = 0, pad = 0.35) {
    const c = Math.cos(yaw),
      s = Math.sin(yaw);
    for (
      let u = -width / 2;
      u <= width / 2 + 0.001;
      u += Math.min(0.35, width / 2)
    )
      for (
        let v = -depth / 2;
        v <= depth / 2 + 0.001;
        v += Math.min(0.35, depth / 2)
      )
        if (onRoad(x + c * u + s * v, z - s * u + c * v, y, pad)) return false;
    return true;
  }
  return { onRoad, rectangleClear, segments };
}
