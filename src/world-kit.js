import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export function makeKit(renderer) {
  let seed = 81279;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const textures = [],
    interactive = [],
    accentMaterials = [],
    animations = [];
  const mat = (o) => new THREE.MeshStandardMaterial(o),
    basic = (color, extra = {}) =>
      new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
  const palette = {
    wall: mat({ color: "#aaa798", roughness: 0.94 }),
    concrete: mat({ color: "#54565a", roughness: 0.9 }),
    metal: mat({ color: "#293944", roughness: 0.38, metalness: 0.8 }),
    black: mat({ color: "#10151b", roughness: 0.54 }),
    chrome: mat({ color: "#9ca7a7", metalness: 0.86, roughness: 0.2 }),
    wood: mat({ color: "#593e2b", roughness: 0.66 }),
    paper: mat({ color: "#ded8c5", roughness: 0.95 }),
    leaf: mat({ color: "#275442", roughness: 0.85 }),
    soil: mat({ color: "#201b18", roughness: 1 }),
    warm: basic("#f6c18b"),
    ice: basic("#9bbcc6"),
    accent: mat({
      color: "#83b3bc",
      emissive: "#83b3bc",
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.35,
    }),
  };
  accentMaterials.push(palette.accent);
  const cube = new THREE.BoxGeometry(1, 1, 1),
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 12),
    sphere = new THREE.IcosahedronGeometry(1, 1),
    roundedBoxes = new Map(),
    tubes = new Map(),
    planes = new Map();
  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geometry, material);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function box(w, h, d, material, parent, x = 0, y = 0, z = 0, r = 0) {
    let geometry = cube;
    if (r) {
      const radius = Math.min(r, w / 3, h / 3, d / 3),
        key = JSON.stringify([w, h, d, radius]);
      geometry = roundedBoxes.get(key);
      if (!geometry) {
        geometry = new RoundedBoxGeometry(w, h, d, 2, radius);
        roundedBoxes.set(key, geometry);
      }
    }
    const o = mesh(geometry, material, parent, x, y, z);
    if (!r) o.scale.set(w, h, d);
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  }
  function cyl(radius, height, material, parent, x = 0, y = 0, z = 0) {
    const o = mesh(cylinder, material, parent, x, y, z);
    o.scale.set(radius, height, radius);
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  }
  function ball(x, y, z, r, material, parent, sx = 1, sy = 1, sz = 1) {
    const o = mesh(sphere, material, parent, x, y, z);
    o.scale.set(r * sx, r * sy, r * sz);
    o.castShadow = true;
    return o;
  }
  function tube(points, r, material, parent) {
    const key = JSON.stringify([points, r]);
    let geometry = tubes.get(key);
    if (!geometry) {
      geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        24,
        r,
        6,
        false,
      );
      tubes.set(key, geometry);
    }
    return mesh(geometry, material, parent);
  }
  function texture(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(t);
    return t;
  }
  function plane(w, h, material, parent, x, y, z) {
    const key = JSON.stringify([w, h]);
    let geometry = planes.get(key);
    if (!geometry) {
      geometry = new THREE.PlaneGeometry(w, h);
      planes.set(key, geometry);
    }
    return mesh(geometry, material, parent, x, y, z);
  }
  function releaseGeometryCaches() {
    // Construction is complete; the scene owns the shared geometry lifetimes.
    roundedBoxes.clear();
    tubes.clear();
    planes.clear();
  }
  function action(o, name) {
    o.userData.action = name;
    interactive.push(o);
    return o;
  }
  function group(parent, x = 0, y = 0, z = 0) {
    const o = new THREE.Group();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function contact(parent, x, y, z, w, d, opacity = 0.28) {
    const t = texture(128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, `rgba(0,0,0,${opacity})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    });
    const p = plane(
      w,
      d,
      new THREE.MeshBasicMaterial({
        map: t,
        transparent: true,
        depthWrite: false,
      }),
      parent,
      x,
      y,
      z,
    );
    p.rotation.x = -Math.PI / 2;
    return p;
  }
  return {
    THREE,
    random,
    textures,
    interactive,
    accentMaterials,
    animations,
    mat,
    basic,
    palette,
    mesh,
    box,
    cyl,
    ball,
    tube,
    texture,
    plane,
    action,
    group,
    contact,
    releaseGeometryCaches,
  };
}
