import assert from "node:assert/strict";
import * as T from "three";
import { createStaticBatch } from "../src/static-batch.js";

function shape(indexed = true) {
  const g = new T.BufferGeometry();
  g.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [-0.5, -0.25, 0, 0.75, -0.25, 0, 0.75, 0.5, 0, -0.5, 0.5, 0],
      3,
    ),
  );
  g.setAttribute(
    "normal",
    new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
  );
  g.setAttribute(
    "uv",
    new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
  );
  g.setAttribute(
    "color",
    new T.Uint8BufferAttribute(
      [255, 16, 0, 64, 255, 2, 8, 48, 255, 255, 255, 32],
      3,
      true,
    ),
  );
  g.setAttribute(
    "sample",
    new T.Float32BufferAttribute([0.25, 0.5, 0.75, 1], 1),
  );
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return indexed ? g : g.toNonIndexed();
}

function snapshot(root) {
  root.updateWorldMatrix(true, true);
  const triangles = [],
    local = new T.Matrix4(),
    matrix = new T.Matrix4();
  function append(o, transform) {
    const geometry = o.geometry.clone().applyMatrix4(transform);
    const attributes = Object.entries(geometry.attributes).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const schema = attributes.map(([name, a]) => [
      name,
      a.itemSize,
      a.normalized,
      a.array.constructor.name,
    ]);
    const count = geometry.index?.count || geometry.attributes.position.count;
    for (let n = 0; n < count; n += 3) {
      const order = transform.determinant() < 0 ? [0, 2, 1] : [0, 1, 2];
      const vertices = order.map((offset) => {
        const i = geometry.index ? geometry.index.getX(n + offset) : n + offset;
        return attributes.flatMap(([name, a]) =>
          Array.from(
            { length: a.itemSize },
            (_, component) => a.array[i * a.itemSize + component],
          ),
        );
      });
      // Cyclic permutations are the same oriented triangle; a reversal is not.
      const key = (v) => v.map((n) => Math.round(n * 1000)).join(",");
      const first = vertices
        .map((v, i) => ({ key: key(v), i }))
        .sort((a, b) => a.key.localeCompare(b.key))[0].i;
      const canonical = [
        ...vertices.slice(first),
        ...vertices.slice(0, first),
      ].flat();
      triangles.push({
        schema,
        material: o.material.uuid,
        cast: o.castShadow,
        receive: o.receiveShadow,
        values: canonical,
      });
    }
    geometry.dispose();
  }
  function visit(o) {
    if (!o.visible) return;
    if (o.isMesh) {
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, local);
          matrix.multiplyMatrices(o.matrixWorld, local);
          append(o, matrix);
        }
      } else append(o, o.matrixWorld);
    }
    o.children.forEach(visit);
  }
  visit(root);
  const key = (t) =>
    [
      t.material,
      t.cast,
      t.receive,
      ...t.values.map((n) => Math.round(n * 1000)),
    ].join(",");
  triangles.sort((a, b) => key(a).localeCompare(key(b)));
  return triangles;
}

function equivalent(before, after, label) {
  assert.equal(after.length, before.length, `${label}: triangle count`);
  for (let i = 0; i < before.length; i++) {
    const a = before[i],
      b = after[i];
    assert.deepEqual(
      b.schema,
      a.schema,
      `${label}: attributes/normalization/types`,
    );
    assert.equal(b.material, a.material, `${label}: material`);
    assert.equal(b.cast, a.cast, `${label}: cast shadow`);
    assert.equal(b.receive, a.receive, `${label}: receive shadow`);
    assert.equal(b.values.length, a.values.length);
    for (let j = 0; j < a.values.length; j++)
      assert.ok(
        Math.abs(a.values[j] - b.values[j]) < 0.0002,
        `${label}: triangle ${i}, component ${j}: ${a.values[j]} vs ${b.values[j]}`,
      );
  }
}

const cases = [];
for (const indexed of [true, false]) {
  for (const transform of [
    "positive",
    "mirrored",
    "sheared",
    "mirrored-sheared",
  ]) {
    const root = new T.Group(),
      nested = new T.Group(),
      geometry = shape(indexed),
      material = new T.MeshStandardMaterial();
    root.position.set(7, -3, 2);
    root.rotation.set(0.1, 0.25, -0.2);
    root.scale.set(1.1, 0.9, 1.2);
    root.add(nested);
    nested.position.set(2, 3, 5);
    if (transform.includes("sheared")) nested.scale.set(1.4, 0.7, 1.2);
    for (let i = 0; i < 4; i++) {
      const o = new T.Mesh(geometry, material);
      o.position.set(4 * i + 1, i + 2, 3 * i + 1);
      o.rotation.set(0.15 * i, 0.2, 0.1);
      o.scale.set(transform.includes("mirrored") ? -1.2 : 1.2, 0.8, 1.5);
      o.castShadow = o.receiveShadow = true;
      nested.add(o);
    }
    const before = snapshot(root),
      batch = createStaticBatch(root);
    batch.collect();
    const added = new T.Mesh(shape(indexed), material);
    added.position.set(22, 14, 1);
    added.castShadow = added.receiveShadow = true;
    root.add(added);
    const extra = snapshot(added);
    const expected = [...before, ...extra].sort((a, b) =>
      [
        a.material,
        a.cast,
        a.receive,
        ...a.values.map((n) => Math.round(n * 1000)),
      ]
        .join(",")
        .localeCompare(
          [
            b.material,
            b.cast,
            b.receive,
            ...b.values.map((n) => Math.round(n * 1000)),
          ].join(","),
        ),
    );
    const stats = await batch.finish();
    equivalent(
      expected,
      snapshot(root),
      `${indexed ? "indexed" : "nonindexed"}/${transform}`,
    );
    assert.equal(stats.sourceMeshes, 5);
    // Procedural BufferGeometry can be packed at each collection step. The
    // actual triangle/attribute result matters regardless of output mesh type.
    cases.push({ indexed, transform, ...stats });
  }
}

{
  const root = new T.Group(),
    geometry = new T.BoxGeometry(0.75, 1.25, 0.5),
    material = new T.MeshStandardMaterial();
  for (let i = 0; i < 4; i++) {
    const o = new T.Mesh(geometry, material);
    o.position.set(i * 3, 2, 7);
    o.rotation.set(0.1, i * 0.2, 0.3);
    o.scale.set(1.1, 0.9, 0.75);
    root.add(o);
  }
  const before = snapshot(root),
    batch = createStaticBatch(root);
  batch.collect();
  const stats = await batch.finish();
  equivalent(before, snapshot(root), "shared-BoxGeometry-instancing");
  assert.equal(
    stats.instances,
    4,
    "shared orthogonal kit geometry should stay instanced",
  );
  cases.push({ sharedBoxGeometry: true, ...stats });
}

const root = new T.Group(),
  material = new T.MeshBasicMaterial();
const exclusions = [];
function excluded(name, configure) {
  const o = new T.Mesh(shape(), material);
  o.name = name;
  root.add(o);
  configure(o);
  exclusions.push(o);
}
excluded("action", (o) => (o.userData.action = "camera"));
excluded("dynamic", (o) => (o.userData.dynamic = true));
excluded("invisible", (o) => (o.visible = false));
excluded(
  "transparent",
  (o) => (o.material = new T.MeshBasicMaterial({ transparent: true })),
);
excluded("renderOrder", (o) => (o.renderOrder = 3));
excluded("onBeforeRender", (o) => (o.onBeforeRender = () => {}));
excluded("multipleMaterial", (o) => (o.material = [material]));
excluded(
  "morphTarget",
  (o) =>
    (o.geometry.morphAttributes.position = [
      o.geometry.attributes.position.clone(),
    ]),
);
excluded("existingBatch", (o) => (o.userData.staticBatch = true));
const dynamicGroup = new T.Group();
dynamicGroup.userData.dynamic = true;
root.add(dynamicGroup);
const movingChild = new T.Mesh(shape(), material);
dynamicGroup.add(movingChild);
const stats = await createStaticBatch(root).finish();
assert.equal(stats.sourceMeshes, 0);
assert.ok(exclusions.every((o) => o.parent === root));
assert.equal(movingChild.parent, dynamicGroup);
assert.equal(dynamicGroup.parent, root);
const meshParent = new T.Mesh(shape(), material),
  dynamicChild = new T.Mesh(shape(), material);
dynamicChild.userData.dynamic = true;
meshParent.add(dynamicChild);
const hierarchy = new T.Group();
hierarchy.add(meshParent);
const hierarchyBefore = snapshot(hierarchy);
await createStaticBatch(hierarchy).finish();
assert.equal(
  hierarchy.getObjectById(dynamicChild.id),
  dynamicChild,
  "collecting a mesh must not detach its excluded descendant",
);
equivalent(
  hierarchyBefore,
  snapshot(hierarchy),
  "mesh-parent-with-dynamic-child",
);
console.log(
  JSON.stringify(
    {
      result: "PASS",
      cases,
      exclusions: exclusions.map((o) => o.name),
      dynamicSubtree: true,
    },
    null,
    2,
  ),
);
