import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { yieldTask } from "./yield-task.js";

// Compact the city as it is built. Keep repeated geometry shared and merge
// unique surfaces in small chunks, rather than holding an entire city's Mesh
// hierarchy, transformed copies and expanded non-indexed geometry at once.
export function createStaticBatch(root, cellSize = 384) {
  const entries = new Map(),
    packed = new Map(),
    inverse = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    centre = new THREE.Vector3();
  let finished = false;
  const stats = { sourceMeshes: 0, instances: 0, batches: 0 };
  function signature(geometry) {
    return JSON.stringify([
      Boolean(geometry.index),
      Object.entries(geometry.attributes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, a]) => [
          name,
          a.itemSize,
          a.normalized,
          a.array.constructor.name,
        ]),
    ]);
  }
  function mergeKey(entry) {
    return `${entry.material.uuid}:${entry.castShadow}:${entry.receiveShadow}:${entry.cell}:${signature(entry.geometry)}`;
  }
  function bake(entry, offset) {
    const geometry = entry.geometry.clone();
    geometry.applyMatrix4(local.fromArray(entry.matrices, offset));
    // A baked reflection loses the negative object determinant WebGL uses for
    // front-face culling. Reverse winding while retaining transformed normals.
    if (local.determinant() < 0) {
      if (geometry.index) {
        const index = geometry.index.array;
        for (let j = 0; j < index.length; j += 3)
          [index[j + 1], index[j + 2]] = [index[j + 2], index[j + 1]];
      } else {
        for (const attribute of Object.values(geometry.attributes)) {
          const values = attribute.array,
            size = attribute.itemSize;
          for (let j = 0; j < attribute.count; j += 3)
            for (let component = 0; component < size; component++) {
              const a = (j + 1) * size + component,
                b = (j + 2) * size + component;
              [values[a], values[b]] = [values[b], values[a]];
            }
        }
      }
    }
    return geometry;
  }
  function merge(chunks) {
    const geometry =
      chunks.length === 1 ? chunks[0] : mergeGeometries(chunks, false);
    if (!geometry) throw Error("Incompatible static geometry");
    if (chunks.length > 1) chunks.forEach((g) => g.dispose());
    return geometry;
  }
  function pack(groups) {
    for (const [key, group] of groups) {
      let chunks = [],
        vertices = 0;
      if (!packed.has(key))
        packed.set(key, { ...group[0], matrices: null, chunks: [] });
      const target = packed.get(key);
      function flush() {
        if (chunks.length) target.chunks.push(merge(chunks));
        chunks = [];
        vertices = 0;
      }
      for (const entry of group)
        for (let i = 0; i < entry.matrices.length; i += 16) {
          const size = entry.geometry.attributes.position.count;
          if (vertices + size > 32768) flush();
          chunks.push(bake(entry, i));
          vertices += size;
        }
      flush();
      // Source geometry, parameters and per-object records can now be collected.
      target.geometry = null;
      groups.delete(key);
    }
  }
  function collect() {
    if (finished) return;
    root.updateWorldMatrix(true, true);
    inverse.copy(root.matrixWorld).invert();
    const remove = [],
      unique = new Map();
    function visit(o) {
      if (o.userData.dynamic || o.userData.staticBatch || !o.visible) return;
      if (
        o.isMesh &&
        !o.isInstancedMesh &&
        o.children.length === 0 &&
        !Array.isArray(o.material) &&
        !o.userData.action &&
        o.renderOrder === 0 &&
        !Object.hasOwn(o, "onBeforeRender") &&
        !o.material.transparent &&
        !o.geometry.morphAttributes.position
      ) {
        local.multiplyMatrices(inverse, o.matrixWorld);
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        o.geometry.boundingBox.getCenter(centre).applyMatrix4(local);
        const cell = `${Math.floor(centre.x / cellSize)},${Math.floor(centre.z / cellSize)}`,
          key = `${o.material.uuid}:${o.castShadow}:${o.receiveShadow}:${cell}:${o.geometry.uuid}`;
        // Procedural road/façade/footprint geometry is unique. Compress it each
        // construction step so tens of thousands of Geometry objects never pile
        // up. Kit shapes remain candidates for instancing across all steps.
        const procedural = [
          "BufferGeometry",
          "ShapeGeometry",
          "ExtrudeGeometry",
        ].includes(o.geometry.type);
        let entry = procedural ? null : entries.get(key);
        if (!entry) {
          entry = {
            geometry: o.geometry,
            material: o.material,
            castShadow: o.castShadow,
            receiveShadow: o.receiveShadow,
            cell,
            matrices: [],
            canInstance: true,
          };
          if (!procedural) entries.set(key, entry);
        }
        const e = local.elements,
          dot = (a, b) =>
            e[a] * e[b] + e[a + 1] * e[b + 1] + e[a + 2] * e[b + 2],
          scale = Math.max(
            1,
            Math.sqrt(dot(0, 0) * dot(4, 4)),
            Math.sqrt(dot(0, 0) * dot(8, 8)),
            Math.sqrt(dot(4, 4) * dot(8, 8)),
          );
        // Instance normals support orthogonal positive scales. Bake shear and
        // reflections with the exact normal matrix instead.
        entry.canInstance &&=
          local.determinant() > 0 &&
          Math.max(
            Math.abs(dot(0, 4)),
            Math.abs(dot(0, 8)),
            Math.abs(dot(4, 8)),
          ) <
            scale * 1e-7;
        entry.matrices.push(...e);
        if (procedural) {
          const groupKey = mergeKey(entry);
          if (!unique.has(groupKey)) unique.set(groupKey, []);
          unique.get(groupKey).push(entry);
        }
        remove.push(o);
        stats.sourceMeshes++;
      }
      for (const child of o.children) visit(child);
    }
    for (const child of root.children) visit(child);
    for (const o of remove) o.removeFromParent();
    pack(unique);
  }
  function attach(mesh, entry) {
    mesh.castShadow = entry.castShadow;
    mesh.receiveShadow = entry.receiveShadow;
    mesh.userData.staticBatch = true;
    mesh.matrixAutoUpdate = false;
    mesh.geometry.computeBoundingSphere();
    if (mesh.isInstancedMesh) {
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
    }
    root.add(mesh);
    stats.batches++;
  }
  async function finish() {
    collect();
    finished = true;
    const singles = new Map();
    let nextYield = performance.now() + 8;
    for (const [key, entry] of entries) {
      const count = entry.matrices.length / 16;
      if (count > 1 && entry.canInstance) {
        const mesh = new THREE.InstancedMesh(
          entry.geometry,
          entry.material,
          count,
        );
        mesh.instanceMatrix.array.set(entry.matrices);
        mesh.instanceMatrix.needsUpdate = true;
        attach(mesh, entry);
        stats.instances += count;
      } else {
        const groupKey = mergeKey(entry);
        if (!singles.has(groupKey)) singles.set(groupKey, []);
        singles.get(groupKey).push(entry);
      }
      entries.delete(key);
      if (performance.now() > nextYield) {
        pack(singles);
        await yieldTask();
        nextYield = performance.now() + 8;
      }
    }
    pack(singles);
    for (const [key, entry] of packed) {
      let chunks = [],
        vertices = 0;
      function flush() {
        if (chunks.length)
          attach(new THREE.Mesh(merge(chunks), entry.material), entry);
        chunks = [];
        vertices = 0;
      }
      for (const geometry of entry.chunks) {
        if (vertices + geometry.attributes.position.count > 32768) flush();
        chunks.push(geometry);
        vertices += geometry.attributes.position.count;
      }
      flush();
      packed.delete(key);
      if (performance.now() > nextYield) {
        await yieldTask();
        nextYield = performance.now() + 8;
      }
    }
    return stats;
  }
  return { collect, finish, stats };
}
