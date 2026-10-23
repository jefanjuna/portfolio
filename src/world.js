import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createStaticBatch } from "./static-batch.js";
import { yieldTask } from "./yield-task.js";
import { ROOM_FLOOR } from "./architecture.js";
import { fromOld } from "./geo.js";
import { makeKit } from "./world-kit.js";
import { buildCity } from "./city.js";
import { buildRoom } from "./room.js";
import { sampleShot, JOURNEY_END } from "./world-path.js";
import { createCameraView } from "./camera-view.js";

export async function createWorld(container) {
  let renderer,
    composer,
    k,
    city,
    environment,
    frame = 0,
    disposed = false,
    contextLost = false,
    artworkVersion = 0;
  const targets = [],
    cleanup = [];
  const mobile = innerWidth < 700 || matchMedia("(pointer: coarse)").matches,
    scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b1b26");
  scene.fog = new THREE.FogExp2("#102334", 0.00025);
  function dispose() {
    if (disposed) return;
    disposed = true;
    artworkVersion++;
    cancelAnimationFrame(frame);
    cleanup.forEach((fn) => fn());
    city?.dispose();
    const geometries = new Set(),
      materials = new Set();
    scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      if (o.isInstancedMesh) o.dispose();
      o.shadow?.dispose();
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    k?.textures.forEach((t) => t.dispose());
    k?.releaseGeometryCaches();
    if (k) {
      k.animations.length = 0;
      k.interactive.length = 0;
    }
    targets.forEach((t) => t.dispose());
    environment?.dispose();
    composer?.passes.forEach((pass) => pass.dispose?.());
    composer?.dispose();
    renderer?.dispose();
    renderer?.domElement.remove();
    scene.clear();
  }
  try {
    renderer = new THREE.WebGLRenderer({
      // The scene renders into the composer's texture. Multisampling the final
      // full-screen output quad adds memory without smoothing scene geometry.
      antialias: false,
      logarithmicDepthBuffer: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.2 : 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.append(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(
      46,
      innerWidth / innerHeight,
      0.018,
      30000,
    );
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(innerWidth, innerHeight),
      0.3,
      0.5,
      0.85,
    );
    // Bloom only draws full-screen quads; its intermediate targets need no
    // depth attachments. Keep depth on the main scene/composer targets.
    [
      bloom.renderTargetBright,
      ...bloom.renderTargetsHorizontal,
      ...bloom.renderTargetsVertical,
    ].forEach((target) => {
      target.depthBuffer = false;
    });
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const ambient = new THREE.HemisphereLight("#7b9dc8", "#101820", 0.34);
    scene.add(ambient);
    const moon = new THREE.DirectionalLight("#b2c9ee", 0.8);
    moon.position.set(-24, ROOM_FLOOR + 56, 32);
    moon.castShadow = !mobile;
    moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, {
      left: -22,
      right: 22,
      top: 30,
      bottom: -25,
      near: 0.5,
      far: 110,
    });
    moon.shadow.bias = -0.0003;
    moon.shadow.normalBias = 0.025;
    moon.target.position.set(0, ROOM_FLOOR, 0);
    scene.add(moon, moon.target);
    const cityMoon = new THREE.DirectionalLight("#9bb9e5", 1.1);
    cityMoon.position.set(1700, 2200, -1900);
    cityMoon.target.position.set(300, 0, 600);
    cityMoon.castShadow = !mobile;
    cityMoon.shadow.mapSize.set(2048, 2048);
    Object.assign(cityMoon.shadow.camera, {
      left: -1800,
      right: 1800,
      top: 1800,
      bottom: -1800,
      near: 1,
      far: 6000,
    });
    cityMoon.shadow.normalBias = 0.35;
    cityMoon.shadow.bias = -0.00002;
    scene.add(cityMoon, cityMoon.target);
    k = makeKit(renderer);
    k.facadeResolution = mobile ? 128 : 512;
    await yieldTask();
    city = await buildCity(scene, k);
    await yieldTask();
    const interior = buildRoom(scene, k);
    city.setProgress(0);
    k.animations.forEach((fn) => fn(0));
    await createStaticBatch(interior.room).finish();
    k.releaseGeometryCaches();
    // These coordinate frames never move. Keep their matrices fixed so they do
    // not force every static batch to recompute its world transform each frame.
    // Animated children still update their own local and world matrices.
    [scene, city.city, interior.room].forEach((root) => {
      root.updateMatrix();
      root.matrixAutoUpdate = false;
    });
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    // Six photographic compositions come from the real geometry of this world.
    // Render once; they are not AI artwork or represented as Josh's actual photos.
    const studyCamera = new THREE.PerspectiveCamera(46, 1.35, 0.1, 10000),
      studies = [
        [
          [-450, 12, 480],
          [40, 110, 900],
        ],
        [
          [-600, 5, 340],
          [-760, 24, 560],
        ],
        [
          [-270, 8, 600],
          [-150, 25, 850],
        ],
        [
          [-200, 18, 400],
          [-510, 20, 195],
        ],
        [
          [0, 8, 350],
          [40, 130, 900],
        ],
        [
          [-1000, 330, 1200],
          [100, 80, 650],
        ],
      ];
    async function refreshArtwork() {
      const version = ++artworkVersion;
      await yieldTask();
      if (disposed || contextLost || version !== artworkVersion) return;
      // Render targets lose their pixels on context loss. Recreate the environment
      // and repaint the six photographs before exposing the recovered canvas.
      const pmrem = new THREE.PMREMGenerator(renderer),
        envScene = new THREE.Scene();
      envScene.add(city.sky.dome.clone(), city.sky.moon.clone());
      try {
        const next = pmrem.fromScene(envScene, 0.04, 0.1, 20000);
        environment?.dispose();
        environment = next;
        scene.environment = next.texture;
        scene.environmentIntensity = 1.15;
      } finally {
        pmrem.dispose();
      }
      // Repaint one photograph per task. The moving world becomes usable first,
      // instead of forcing twelve full-city render passes into startup.
      for (let i = 0; i < interior.photoFrames.length; i++) {
        await yieldTask();
        if (disposed || contextLost || version !== artworkVersion) return;
        const photo = interior.photoFrames[i],
          previousTarget = renderer.getRenderTarget(),
          exposure = renderer.toneMappingExposure,
          visible = interior.room.visible;
        interior.room.visible = false;
        renderer.toneMappingExposure = 1.65;
        try {
          const rt =
            targets[i] ||
            (targets[i] = new THREE.WebGLRenderTarget(
              mobile ? 256 : 512,
              mobile ? 192 : 384,
            ));
          studyCamera.position.fromArray(fromOld(studies[i][0]));
          studyCamera.lookAt(new THREE.Vector3(...fromOld(studies[i][1])));
          renderer.setRenderTarget(rt);
          renderer.render(scene, studyCamera);
          photo.material.map = rt.texture;
          photo.material.color.setScalar(2.4);
          photo.material.needsUpdate = true;
        } finally {
          renderer.setRenderTarget(previousTarget);
          renderer.toneMappingExposure = exposure;
          interior.room.visible = visible;
        }
        request();
      }
      renderer.shadowMap.needsUpdate = true;
    }
    // The async job yields immediately and is cancelled by dispose/context loss.
    refreshArtwork().catch((error) =>
      console.warn("Photograph rendering failed", error),
    );
    let desired = 0,
      current = 0,
      reduced = false,
      animate = true,
      rendered = false,
      last = 0,
      time = 0,
      viewfinder = false,
      viewMix = 0,
      composition = 0,
      hovered = null;
    const cameraView = createCameraView(
        THREE,
        [1.2, ROOM_FLOOR + 1.65, 6.5],
        fromOld([40, 115, 900]),
      ),
      storyRig = new THREE.Camera();
    const pointer = new THREE.Vector2(),
      ray = new THREE.Raycaster(),
      mouse = new THREE.Vector2(),
      eye = new THREE.Vector3(),
      focus = new THREE.Vector3();
    function render(stamp) {
      frame = 0;
      if (disposed || contextLost || document.hidden) return;
      const dt = last ? Math.min((stamp - last) / 1000, 0.06) : 0.016;
      last = stamp;
      if (animate) time += dt;
      current = reduced
        ? desired
        : THREE.MathUtils.damp(current, desired, 3.4, dt);
      const progress = THREE.MathUtils.euclideanModulo(current, JOURNEY_END);
      const shot = sampleShot(progress);
      city.setProgress(progress, shot.eye);
      interior.setProgress(progress, time);
      eye.fromArray(shot.eye);
      focus.fromArray(shot.focus);
      // Small screens widen the lens rather than move the lens through walls.

      if (
        animate &&
        !reduced &&
        !viewfinder &&
        !cameraView.transitioning &&
        !shot.departure
      ) {
        const sway =
          Math.min(0.045, eye.distanceTo(focus) * 0.008) *
          (1 - THREE.MathUtils.smoothstep(progress, 8, 8.2));
        eye.x += pointer.x * sway;
        eye.y += pointer.y * sway * 0.5;
      }
      storyRig.position.copy(eye);
      storyRig.lookAt(focus);
      const pose = cameraView.sample(stamp, {
        position: eye,
        quaternion: storyRig.quaternion,
        composition: shot.composition,
      });
      viewMix = pose.mix;
      composition = pose.composition;
      camera.position.copy(pose.position);
      camera.quaternion.copy(pose.quaternion);
      camera.setViewOffset(
        innerWidth,
        innerHeight,
        innerWidth * (innerWidth < 700 ? 0 : composition),
        innerWidth < 700 ? -innerHeight * 0.015 : 0,
        innerWidth,
        innerHeight,
      );
      city.life.setCamera(camera);
      k.animations.forEach((fn) => fn(time));
      composer.render();
      rendered = true;
      if (
        animate ||
        cameraView.transitioning ||
        (!reduced && Math.abs(current - desired) > 0.001)
      )
        frame = requestAnimationFrame(render);
    }
    function request() {
      if (!frame && !disposed && !contextLost && !document.hidden)
        frame = requestAnimationFrame(render);
    }
    function resize() {
      renderer.setSize(innerWidth, innerHeight);
      composer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.fov = innerWidth < 700 ? 61 : 46;
      camera.updateProjectionMatrix();
      request();
    }
    function move(e) {
      pointer.set(
        (e.clientX / innerWidth) * 2 - 1,
        1 - (e.clientY / innerHeight) * 2,
      );
    }
    function visibility() {
      last = 0;
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else request();
    }
    function hit(x, y) {
      mouse.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
      ray.setFromCamera(mouse, camera);
      return ray.intersectObjects(k.interactive, false)[0]?.object || null;
    }
    addEventListener("resize", resize);
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    resize();
    function contextLostEvent(event) {
      event.preventDefault();
      contextLost = true;
      artworkVersion++;
      cancelAnimationFrame(frame);
      frame = 0;
      container.classList.remove("ready");
      document.documentElement.classList.remove("webgl");
      document.documentElement.classList.add("no-webgl");
    }
    async function contextRestored() {
      if (disposed) return;
      try {
        contextLost = false;
        renderer.shadowMap.needsUpdate = true;
        const artwork = refreshArtwork(),
          version = artworkVersion;
        await artwork;
        if (disposed || contextLost || version !== artworkVersion) return;
        renderer.shadowMap.needsUpdate = true;
        last = 0;
        container.classList.add("ready");
        document.documentElement.classList.remove("no-webgl");
        document.documentElement.classList.add("webgl");
        request();
      } catch {
        contextLost = true;
      }
    }
    renderer.domElement.addEventListener("webglcontextlost", contextLostEvent);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      contextRestored,
    );
    cleanup.push(() => {
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        contextLostEvent,
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        contextRestored,
      );
    });
    return {
      shiftProgress(delta) {
        current += delta;
        desired += delta;
        request();
      },
      setProgress(q, lessMotion) {
        desired = THREE.MathUtils.clamp(q, 0, JOURNEY_END);
        if (!rendered) current = desired;
        reduced = lessMotion;
        request();
      },
      setMotion(on) {
        animate = on;
        container.dataset.motion = on ? "running" : "paused";
        request();
      },
      setViewfinder(on) {
        if (!rendered) {
          cancelAnimationFrame(frame);
          frame = 0;
          render(performance.now());
        }
        cameraView.begin(on, camera, composition, performance.now(), reduced);
        viewfinder = on;
        request();
      },
      panView(dx, dy) {
        cameraView.pan(dx, dy);
        request();
      },
      setAccent(value) {
        if (hovered) {
          hovered.material.color.copy(hovered.userData.originalColour);
          hovered = null;
        }
        scene.background.set(value ? "#201321" : "#0b1b26");
        scene.fog.color.set(value ? "#281b2a" : "#102334");
        ambient.color.set(value ? "#c1a2bc" : "#7b9dc8");
        ambient.groundColor.set(value ? "#251719" : "#101820");
        moon.color.set(value ? "#e3bdaf" : "#b2c9ee");
        cityMoon.color.set(value ? "#c7a5b7" : "#9bb9e5");
        interior.setAccent(value);
        k.accentMaterials.forEach((m) => {
          m.color.set(value ? "#d6b184" : "#83b3bc");
          m.emissive?.set(value ? "#d6b184" : "#83b3bc");
        });
        request();
      },
      pick(x, y) {
        return hit(x, y)?.userData.action || null;
      },
      hover(x, y, blocked = false) {
        const next = blocked ? null : hit(x, y);
        if (next !== hovered) {
          if (hovered)
            hovered.material.color.copy(hovered.userData.originalColour);
          hovered = next;
          if (next) {
            next.userData.originalColour = next.material.color.clone();
            next.material.color.multiplyScalar(1.18);
          }
          request();
        }
        return next?.userData.action || null;
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
