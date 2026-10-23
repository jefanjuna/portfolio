// Blend camera poses, never look-at distances: distant focus points otherwise
// make almost all of a return turn happen at the very end of the blend.
export function createCameraView(T, eye, focus) {
  const origin = new T.Vector3(...eye),
    direction = new T.Vector3(...focus).sub(origin).normalize(),
    rig = new T.Camera();
  const baseYaw = Math.atan2(direction.x, -direction.z),
    basePitch = Math.asin(direction.y);
  let active = false,
    mix = 0,
    yaw = 0,
    pitch = 0,
    transition = null;
  function orientation() {
    const a = baseYaw + yaw,
      b = T.MathUtils.clamp(basePitch + pitch, -1.2, 1.2);
    rig.position.copy(origin);
    rig.lookAt(
      origin.x + Math.sin(a) * Math.cos(b),
      origin.y + Math.sin(b),
      origin.z - Math.cos(a) * Math.cos(b),
    );
    return rig.quaternion;
  }
  function begin(on, camera, composition, now, reduced = false) {
    if (on === active) return;
    active = on;
    if (on) {
      yaw = 0;
      pitch = 0;
    }
    transition = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      composition,
      mix,
      started: now,
      duration: reduced ? 0 : 900,
    };
  }
  function sample(now, story) {
    const t = transition
        ? T.MathUtils.clamp(
            (now - transition.started) / Math.max(1, transition.duration),
            0,
            1,
          )
        : 1,
      u = t * t * (3 - 2 * t);
    const targetPosition = active ? origin : story.position,
      targetQuaternion = active ? orientation() : story.quaternion,
      targetComposition = active ? 0 : story.composition;
    const position = targetPosition.clone(),
      quaternion = targetQuaternion.clone();
    let composition = targetComposition;
    if (transition) {
      position.lerpVectors(transition.position, targetPosition, u);
      quaternion.slerpQuaternions(transition.quaternion, targetQuaternion, u);
      composition = T.MathUtils.lerp(
        transition.composition,
        targetComposition,
        u,
      );
      mix = T.MathUtils.lerp(transition.mix, active ? 1 : 0, u);
      if (t === 1) transition = null;
    }
    return {
      position,
      quaternion,
      composition,
      mix,
      transitioning: !!transition,
    };
  }
  return {
    begin,
    sample,
    pan(dx, dy) {
      if (!active) return;
      yaw -= dx * 0.003;
      pitch = T.MathUtils.clamp(pitch + dy * 0.003, -0.8, 0.8);
    },
    get active() {
      return active;
    },
    get transitioning() {
      return !!transition;
    },
  };
}
