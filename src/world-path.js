import { fromOld } from "./geo.js";
import { ROAD_JOURNEY, ROAD_LENGTH, sampleRoad } from "./journey.js";
import { roadProgressAt } from "./road-motion.js";
import { ROOM_FLOOR } from "./architecture.js";
// One ordered route: sky → street → opening window → right-hand cabinet →
// PC → desk → notebooks → back wall → left side of room → window outlook.
// The lens advances into each subject; it never returns to an earlier waypoint.
export const ROUTE = [
  { q: 0, eye: [-1080, 440, 1320], focus: [10, 100, 840], offset: -0.12 },
  { q: 0.38, eye: [-780, 280, 1100], focus: [30, 95, 890], offset: -0.1 },
  { q: 0.7, eye: [-670, 90, 620], focus: [-525, 12, 300], offset: -0.1 },
  { q: 2, eye: [1.35, 13.65, 5.9], focus: [1.2, 13.3, 0.2], offset: -0.1 },
  {
    q: 2.6,
    eye: [1.35, 13.6, 2.2],
    focus: [1.95, 13.04, -0.65],
    offset: -0.13,
  },
  { q: 3, eye: [1.55, 13.15, 0.4], focus: [1.95, 13.03, -0.65], offset: -0.14 },
  {
    q: 3.6,
    eye: [1.8, 13.05, -0.15],
    focus: [1.95, 13.02, -0.65],
    offset: -0.14,
  },
  { q: 4, eye: [1.3, 13.03, -1.2], focus: [0.85, 12.65, -2.12], offset: 0.14 },
  {
    q: 4.6,
    eye: [0.7, 13.12, -1.4],
    focus: [-0.15, 13.2, -2.08],
    offset: -0.12,
  },
  {
    q: 5,
    eye: [-0.2, 13.25, -1.2],
    focus: [-0.65, 13.23, -2.08],
    offset: -0.15,
  },
  {
    q: 5.65,
    eye: [-0.85, 13.15, -1.35],
    focus: [-1.15, 12.83, -1.8],
    offset: -0.13,
  },
  { q: 6, eye: [-1.1, 13.1, -1.5], focus: [-1.18, 12.83, -1.7], offset: -0.12 },
  {
    q: 6.2,
    eye: [-1.13, 13.02, -1.6],
    focus: [-1.2, 12.83, -1.78],
    offset: -0.1,
  },
  {
    q: 6.4,
    eye: [-1.2, 13.02, -1.73],
    focus: [-1.8, 13.4, -2.6],
    offset: 0.02,
  },
  {
    q: 6.65,
    eye: [-1.35, 13.3, -1.93],
    focus: [-1.85, 14.1, -3.13],
    offset: 0.1,
  },
  { q: 7, eye: [-1.65, 13.8, -2.0], focus: [-1.8, 14.1, -3.13], offset: 0.12 },
  { q: 7.6, eye: [-2.15, 13.8, -1.8], focus: [-2.6, 13.2, -0.5], offset: 0.12 },
  { q: 8, eye: [-2.2, 13.4, -0.9], focus: [-1.5, 12.6, 0.3], offset: 0.12 },
  { q: 8.6, eye: [-1.9, 13.5, 0.7], focus: [-0.7, 13.4, 3.4], offset: -0.06 },
  { q: 9, eye: [-1.2, 13.7, 2], focus: [-2, 14.3, 8], offset: -0.06 },
  { q: 10, eye: [-0.8, 13.8, 2.7], focus: [30, 105, 900], offset: -0.06 },
];
for (const p of ROUTE) {
  if (p.q < 2) {
    p.eye = fromOld(p.eye);
    p.focus = fromOld(p.focus);
  } else {
    p.eye[1] += ROOM_FLOOR - 12;
    p.focus[1] += ROOM_FLOOR - 12;
  }
}
const final = ROUTE[ROUTE.length - 1];
final.focus = fromOld([30, 105, 900]);
const outdoor = ROAD_JOURNEY.filter(
  (p, i) =>
    i === 0 || i === ROAD_JOURNEY.length - 1 || p.s - ROAD_JOURNEY[i - 1].s > 3,
).map((p) => ({
  q: roadProgressAt(p.s),
  eye: [p.p[0], p.p[1] + 8.5, p.p[2]],
  focus: sampleRoad(Math.min(ROAD_LENGTH, p.s + 24)).p.map((v, i) =>
    i === 1 ? v + 2 : v,
  ),
  offset: 0.1,
}));
ROUTE.splice(
  3,
  0,
  ...outdoor,
  {
    q: 1.73,
    eye: [5, ROOM_FLOOR - 18, 24],
    focus: [1.35, ROOM_FLOOR + 1.65, 3.3],
    offset: -0.1,
  },
  {
    q: 1.9,
    eye: [1.35, ROOM_FLOOR + 1.65, 12],
    focus: [1.35, ROOM_FLOOR + 1.65, 3.3],
    offset: -0.1,
  },
);
outdoor[outdoor.length - 1].focus = [1.35, ROOM_FLOOR + 1.65, 3.3];
ROUTE.sort((a, b) => a.q - b.q);
// The last scene opens the other casement. Return by looking into the sky;
// reposition only while the frame contains sky, then tilt down at the start.
export const JOURNEY_END = 13;
const sub = (a, b) => a.map((v, k) => v - b[k]),
  len = (a) => Math.hypot(...a),
  unit = (a) => {
    const n = len(a) || 1;
    return a.map((v) => v / n);
  };
// Non-uniform Hermite interpolation keeps velocity continuous across extra
// turn/approach beats, while limiting overshoot near furniture and the window.
function slope(values, i) {
  const l = Math.max(0, i - 1),
    r = Math.min(values.length - 1, i + 1),
    span = ROUTE[r].q - ROUTE[l].q;
  return sub(values[r], values[l]).map((v) => (v / span) * 0.65);
}
function sample(values, q) {
  q = Math.max(0, Math.min(10, q));
  let i = 0;
  while (i < ROUTE.length - 2 && q > ROUTE[i + 1].q) i++;
  const a = values[i],
    b = values[i + 1],
    d = ROUTE[i + 1].q - ROUTE[i].q,
    t = (q - ROUTE[i].q) / d,
    m = slope(values, i),
    n = slope(values, i + 1),
    t2 = t * t,
    t3 = t2 * t;
  return a.map(
    (v, k) =>
      (2 * t3 - 3 * t2 + 1) * v +
      (t3 - 2 * t2 + t) * m[k] * d +
      (-2 * t3 + 3 * t2) * b[k] +
      (t3 - t2) * n[k] * d,
  );
}
function velocity(values, q) {
  q = Math.max(0, Math.min(10, q));
  let i = 0;
  while (i < ROUTE.length - 2 && q > ROUTE[i + 1].q) i++;
  const d = ROUTE[i + 1].q - ROUTE[i].q,
    t = (q - ROUTE[i].q) / d,
    m = slope(values, i),
    n = slope(values, i + 1),
    a = values[i],
    b = values[i + 1];
  return a.map(
    (v, k) =>
      ((6 * t * t - 6 * t) / d) * v +
      (3 * t * t - 4 * t + 1) * m[k] +
      ((-6 * t * t + 6 * t) / d) * b[k] +
      (3 * t * t - 2 * t) * n[k],
  );
}
const offsets = ROUTE.map((p) => [p.offset]),
  eyes = ROUTE.map((p) => p.eye),
  angles = ROUTE.map((p) => {
    const v = sub(p.focus, p.eye),
      r = len(v);
    return [Math.atan2(v[0], -v[2]), Math.asin(v[1] / r), r];
  });
for (let i = 1; i < angles.length; i++) {
  while (angles[i][0] - angles[i - 1][0] > Math.PI) angles[i][0] -= 2 * Math.PI;
  while (angles[i][0] - angles[i - 1][0] < -Math.PI)
    angles[i][0] += 2 * Math.PI;
}
function sampleStory(q) {
  const eye = sample(eyes, q),
    [yaw, pitch, radius] = sample(angles, q),
    forward = unit(velocity(eyes, q));
  let look = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ];
  const dot = look.reduce((s, v, i) => s + v * forward[i], 0),
    cone = Math.cos(Math.PI * 0.39);
  // Never travel sideways or backwards relative to the lens. During an arc,
  // anticipate the next subject rather than panning over a lateral camera slide.
  if (dot < cone) {
    const side = unit(look.map((v, i) => v - dot * forward[i]));
    look = forward.map(
      (v, i) => v * cone + side[i] * Math.sqrt(1 - cone * cone),
    );
  }
  const r = Math.max(0.75, radius);
  return {
    eye,
    focus: eye.map((v, i) => v + look[i] * r),
    composition: sample(offsets, q)[0],
  };
}

const ease = (t) => {
    t = Math.max(0, Math.min(1, t));
    return t * t * t * (t * (t * 6 - 15) + 10);
  },
  mix = (a, b, t) => a + (b - a) * t,
  lerp = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
// A single departure starts before the old window turn. Match the incoming
// velocity/acceleration, then keep travelling through each visible join.
const first = sampleStory(0),
  EXIT_START = 8.2,
  exitStart = sampleStory(EXIT_START);
const direction = (shot) => {
  const v = sub(shot.focus, shot.eye),
    r = len(v);
  return [Math.atan2(v[0], -v[2]), Math.asin(v[1] / r), r];
};
const derivative = (fn, q, order = 1) => {
  const h = 0.0001,
    a = fn(q),
    b = fn(q - h),
    c = fn(q - 2 * h);
  return a.map((v, i) =>
    order === 1 ? (v - b[i]) / h : (v - 2 * b[i] + c[i]) / (h * h),
  );
};
// Quintic Hermite segments share position, velocity and acceleration.
function blend(a, b, va, vb, aa, ab, t, span) {
  t = Math.max(0, Math.min(1, t));
  return a.map((v, i) => {
    const c1 = va[i] * span,
      c2 = (aa[i] * span * span) / 2,
      d = b[i] - v - c1 - c2,
      e = vb[i] * span - c1 - 2 * c2,
      f = ab[i] * span * span - 2 * c2;
    return (
      v +
      c1 * t +
      c2 * t * t +
      (10 * d - 4 * e + f / 2) * t ** 3 +
      (-15 * d + 7 * e - f) * t ** 4 +
      (6 * d - 3 * e + f / 2) * t ** 5
    );
  });
}
const zero = [0, 0, 0],
  exitKeys = [
    {
      q: EXIT_START,
      p: exitStart.eye,
      v: derivative((q) => sampleStory(q).eye, EXIT_START),
      a: derivative((q) => sampleStory(q).eye, EXIT_START, 2),
    },
    { q: 9.3, p: [-0.95, ROOM_FLOOR + 1.8, 2.45], v: [0.1, 0, 2.4], a: zero },
    { q: 10.4, p: [-0.8, ROOM_FLOOR + 1.8, 6.5], v: [0, 0, 5], a: zero },
    { q: 11.45, p: [-0.8, 400, 20], v: zero, a: zero },
  ];
function exitPosition(q) {
  let i = 0;
  while (i < exitKeys.length - 2 && q > exitKeys[i + 1].q) i++;
  const a = exitKeys[i],
    b = exitKeys[i + 1],
    span = b.q - a.q;
  return blend(a.p, b.p, a.v, b.v, a.a, b.a, (q - a.q) / span, span);
}
const lookStart = direction(exitStart),
  lookVelocity = derivative((q) => direction(sampleStory(q)), EXIT_START),
  lookAcceleration = derivative(
    (q) => direction(sampleStory(q)),
    EXIT_START,
    2,
  ),
  lookEnd = direction(first),
  skyPitch = Math.PI / 2 - 0.018;
const yawJoin = lookStart[0] + 0.02,
  yawOut = yawJoin + (0.15 * (9.7 - 8.35)) / 2;
let endYaw = lookEnd[0];
while (endYaw - yawOut > Math.PI) endYaw -= Math.PI * 2;
while (endYaw - yawOut < -Math.PI) endYaw += Math.PI * 2;
function departureYaw(q) {
  if (q < 8.35)
    return blend(
      [lookStart[0]],
      [yawJoin],
      [lookVelocity[0]],
      [0.15],
      [lookAcceleration[0]],
      [0],
      (q - EXIT_START) / 0.15,
      0.15,
    )[0];
  if (q < 9.7)
    return blend(
      [yawJoin],
      [yawOut],
      [0.15],
      [0],
      [0],
      [0],
      (q - 8.35) / 1.35,
      1.35,
    )[0];
  return mix(yawOut, endYaw, ease((q - 11.1) / 0.8));
}
function departurePitch(q) {
  if (q < 9.05)
    return blend(
      [lookStart[1]],
      [0.06],
      [lookVelocity[1]],
      [0],
      [lookAcceleration[1]],
      [0],
      (q - EXIT_START) / 0.85,
      0.85,
    )[0];
  if (q < 9.95) return 0.06;
  return q < 12
    ? mix(0.06, skyPitch, ease((q - 9.95) / 1.1))
    : mix(skyPitch, lookEnd[1], ease(q - 12));
}
export function sampleShot(q) {
  if (q < EXIT_START) return sampleStory(q);
  q = Math.min(JOURNEY_END, q);
  const eye =
    q < 11.45
      ? exitPosition(q)
      : q < 12
        ? lerp(exitKeys[3].p, first.eye, ease((q - 11.45) / 0.55))
        : [...first.eye];
  const yaw = departureYaw(q),
    pitch = departurePitch(q),
    r = mix(
      lookStart[2],
      lookEnd[2],
      ease((q - EXIT_START) / (JOURNEY_END - EXIT_START)),
    ),
    look = [
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ];
  const composition =
    q < 9.7
      ? mix(exitStart.composition, -0.06, ease((q - EXIT_START) / 1.5))
      : q < 12
        ? mix(-0.06, 0, ease((q - 9.95) / 1.1))
        : mix(0, first.composition, ease(q - 12));
  return {
    eye,
    focus: eye.map((v, i) => v + look[i] * r),
    composition,
    departure: true,
    skyReturn: q > 10,
  };
}
