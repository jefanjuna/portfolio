import { ROOM_FLOOR } from "./architecture.js";
// An imagined bedroom, scaled in metres and placed inside the fifth storey.
// Every object is geometry or a drawing in code. No generated artwork is used.
export function buildRoom(scene, k) {
  const {
    THREE,
    random,
    mat,
    basic,
    palette: p,
    mesh,
    box,
    cyl,
    ball,
    tube,
    texture,
    plane,
    group,
    action,
    contact,
    animations,
  } = k;
  const room = group(scene, 0, ROOM_FLOOR, 0),
    photoFrames = [],
    fanRotors = [],
    curtains = [];
  let sceneProgress = 0;
  const grain = texture(512, 512, (c, w, h) => {
    c.fillStyle = "#654b36";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      c.strokeStyle = `rgba(${random() > 0.5 ? "10,5,0" : "180,150,90"},${random() * 0.15})`;
      c.beginPath();
      const y = random() * h;
      c.moveTo(0, y);
      c.bezierCurveTo(
        120,
        y + Math.sin(i) * 8,
        320,
        y - 3,
        w,
        y + random() * 7,
      );
      c.stroke();
    }
  });
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  const wood = mat({ color: "#9b7854", map: grain, roughness: 0.56 }),
    darkWood = mat({ color: "#473c30", map: grain, roughness: 0.65 });
  const plaster = texture(256, 256, (c, w, h) => {
    c.fillStyle = "#c9c2ac";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      const a = random() * 0.08;
      c.fillStyle = `rgba(${random() > 0.5 ? "255,255,240" : "50,50,40"},${a})`;
      c.fillRect(random() * w, random() * h, 1, 1);
    }
  });
  const wall = mat({ color: "#b5b1a0", map: plaster, roughness: 0.96 }),
    fabricTex = texture(128, 128, (c, w, h) => {
      c.fillStyle = "#959187";
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < w; i += 3) {
        c.strokeStyle = "#c8c3ab28";
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, h);
        c.moveTo(0, i);
        c.lineTo(w, i);
        c.stroke();
      }
    }),
    fabric = mat({ color: "#4c605d", map: fabricTex, roughness: 0.96 });
  const rugMat = mat({ color: "#7b6d52", map: fabricTex, roughness: 1 });
  const floor = box(7.1, 0.08, 6.425, wood, room, 0, 0.02, 0.0875);
  for (let i = 0; i < 25; i++)
    box(0.008, 0.005, 6.375, darkWood, room, -3.4 + i * 0.28, 0.064, 0.0875);
  const windowSkirting = box(7.1, 0.1, 0.022, p.paper, room, 0, 0.11, 3.282);
  windowSkirting.name = "window-skirting";
  box(7.2, 2.92, 0.08, wall, room, 0, 1.5, -3.21);
  for (const x of [-3.55, 3.55]) box(0.06, 2.92, 6.2, wall, room, x, 1.5, 0);
  box(
    7.2,
    0.06,
    6.4,
    mat({ color: "#b6b29f", roughness: 1 }),
    room,
    0,
    2.93,
    0,
  );
  for (const x of [-3.5, 3.5])
    box(0.045, 0.12, 6.2, darkWood, room, x, 0.14, 0);
  box(7.1, 0.12, 0.045, darkWood, room, 0, 0.14, -3.15);
  box(2.6, 0.012, 1.8, rugMat, room, -0.5, 0.072, -0.55);
  contact(room, -0.5, 0.08, -1.5, 3, 2, 0.3);
  // Desk: proper joinery, drawers, feet, monitor stand, individual keys and cables.
  const DESK_TOP = 0.8025,
    desk = group(room, -0.6, 0, -1.85);
  desk.name = "desk";
  box(2.3, 0.065, 0.85, wood, desk, 0, 0.77, 0, 0.018);
  for (const x of [-1.04, 1.04]) {
    box(0.07, 0.72, 0.07, p.black, desk, x, 0.38, -0.3);
    box(0.07, 0.72, 0.07, p.black, desk, x, 0.38, 0.3);
    box(0.09, 0.04, 0.75, p.metal, desk, x, 0.1, 0);
  }
  box(0.52, 0.58, 0.68, darkWood, desk, 0.78, 0.45, 0);
  for (let i = 0; i < 3; i++) {
    box(0.49, 0.16, 0.02, wood, desk, 0.78, 0.25 + i * 0.18, 0.35);
    box(0.19, 0.013, 0.025, p.metal, desk, 0.78, 0.29 + i * 0.18, 0.37);
  }
  const monitor = group(desk, -0.05, 1.22, -0.23);
  box(1, 0.62, 0.045, p.black, monitor, 0, 0, 0, 0.018);
  box(0.045, 0.25, 0.045, p.metal, desk, -0.05, 0.91, -0.27);
  const monitorBase = box(
    0.34,
    0.016,
    0.21,
    p.black,
    desk,
    -0.05,
    0.813,
    -0.24,
    0.012,
  );
  let ember = false;
  const screenTex = texture(1600, 960, () => {}),
    screenCanvas = screenTex.image,
    c = screenCanvas.getContext("2d");
  function drawDesktop() {
    const w = 1600,
      h = 960;
    c.fillStyle = "#0c1820";
    c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(1000, 420, 20, 850, 430, 900);
    g.addColorStop(0, ember ? "#c29469" : "#497b82");
    g.addColorStop(0.5, ember ? "#5e4d46" : "#203f4b");
    g.addColorStop(1, "#0d1924");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    // Sculptural wave contours form a wallpaper, not a biography on a screen.
    for (let row = 0; row < 75; row++) {
      c.beginPath();
      for (let x = 0; x < w; x += 8) {
        const y =
          160 +
          row * 9 +
          Math.sin(x * 0.006 + row * 0.065) * Math.cos(row * 0.04) * 135 +
          Math.exp(-(((x - 1020) / 350) ** 2)) * Math.sin(row * 0.09) * 180;
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.strokeStyle = `rgba(190,216,198,${0.09 + row / 400})`;
      c.lineWidth = 1;
      c.stroke();
    }
    c.fillStyle = "#071019dc";
    c.fillRect(20, 18, w - 40, 44);
    c.font = "19px monospace";
    c.fillStyle = "#b1cbbf";
    c.fillText("01   02   03", 44, 47);
    c.textAlign = "right";
    c.fillText("22:17   ◉   ♬   ▰", w - 46, 47);
    c.textAlign = "left";
    c.fillStyle = "#09131eea";
    c.fillRect(74, 143, 720, 534);
    c.strokeStyle = "#88a8ac55";
    c.strokeRect(74, 143, 720, 534);
    c.fillStyle = "#243c45";
    c.fillRect(74, 143, 720, 45);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = ["#b57863", "#b9a878", "#77a898"][i];
      c.beginPath();
      c.arc(98 + i * 24, 165, 6, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "#b9c9c2";
    c.font = "17px monospace";
    c.fillText("layers.py", 335, 171);
    const code = [
      "import jax",
      "import jax.numpy as jnp",
      "",
      "def forward(params, x):",
      "    for weights, bias in params:",
      "        x = jax.nn.relu(x @ weights + bias)",
      "    return x",
      "",
      "# one layer at a time",
    ];
    code.forEach((line, i) => {
      c.fillStyle = "#4b6673";
      c.fillText(String(i + 1).padStart(2, " "), 96, 233 + i * 43);
      c.fillStyle = i === 8 ? "#739a81" : i < 2 ? "#b6accc" : "#aec4b8";
      c.fillText(line, 141, 233 + i * 43);
    });
    c.fillStyle = "#102630ed";
    c.fillRect(1040, 660, 450, 210);
    c.fillStyle = "#9bb8b1";
    c.font = "16px monospace";
    c.fillText("SYSTEM", 1070, 696);
    for (let i = 0; i < 24; i++) {
      c.fillStyle = i % 4 ? "#4d7980" : "#b6bf9a";
      c.fillRect(
        1070 + i * 15,
        788 - Math.sin(i * 0.5) * 28,
        6,
        35 + Math.sin(i * 0.5) * 28,
      );
    }
    c.font = "14px monospace";
    c.fillText("CPU", 1070, 852);
    c.fillText("MEMORY", 1270, 852);
    c.fillStyle = "#0b1723dd";
    c.fillRect(590, 888, 420, 54);
    for (let i = 0; i < 7; i++) {
      c.strokeStyle = "#aec5bd";
      c.strokeRect(614 + i * 55, 903, 24, 24);
    }
    screenTex.needsUpdate = true;
  }
  drawDesktop();
  const ledMaterial = basic("#94b9a5", { transparent: true, opacity: 0.8 });
  plane(0.008, 0.003, ledMaterial, monitor, 0.43, -0.294, 0.026);
  animations.push(
    (time) => (ledMaterial.opacity = 0.65 + Math.sin(time * 2) * 0.2),
  );
  const screen = action(
    plane(
      0.953,
      0.548,
      basic("#ffffff", { map: screenTex }),
      monitor,
      0,
      0.012,
      0.026,
    ),
    "theme",
  );
  const keyboard = group(desk, -0.07, DESK_TOP + 0.0125, 0.22);
  box(0.48, 0.025, 0.165, p.black, keyboard, 0, 0, 0, 0.009);
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 14; col++) {
      if (row === 4 && col > 3 && col < 10) continue;
      box(
        0.026,
        0.013,
        0.021,
        row === 0 && col === 0 ? p.accent : p.chrome,
        keyboard,
        -0.219 + col * 0.033,
        0.019,
        -0.065 + row * 0.03,
        0.003,
      );
    }
  box(0.19, 0.013, 0.021, p.chrome, keyboard, 0, 0.019, 0.055, 0.003);
  const mousePad = box(
    0.38,
    0.006,
    0.28,
    mat({ color: "#273b3b", roughness: 0.95 }),
    desk,
    0.45,
    DESK_TOP + 0.003,
    0.18,
    0.012,
  );
  // A domed, tapered mouse with separate button seams, a ridged wheel and base.
  const mouse = group(desk, 0.44, DESK_TOP + 0.006, 0.16);
  mouse.name = "desk-mouse";
  const mouseBase = cyl(0.031, 0.006, p.black, mouse, 0, 0.003, 0);
  mouseBase.scale.z *= 1.62;
  const mouseGeo = new THREE.SphereGeometry(
      1,
      40,
      20,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    ),
    mousePos = mouseGeo.attributes.position;
  for (let i = 0; i < mousePos.count; i++) {
    const x = mousePos.getX(i),
      y = mousePos.getY(i),
      z = mousePos.getZ(i);
    mousePos.setXYZ(
      i,
      x * 0.033 * (1 - 0.14 * Math.max(0, -z)),
      0.004 + y * 0.032,
      z * 0.055,
    );
  }
  mouseGeo.computeVertexNormals();
  mesh(
    mouseGeo,
    mat({ color: "#3b4549", roughness: 0.4, metalness: 0.16 }),
    mouse,
  );
  const mouseY = (x, z) =>
    0.004 +
    0.032 * Math.sqrt(Math.max(0, 1 - (x / 0.033) ** 2 - (z / 0.055) ** 2)) +
    0.0007;
  for (const [a, b] of [
    [-0.049, -0.027],
    [-0.009, 0.003],
  ])
    tube(
      Array.from({ length: 12 }, (_, i) => {
        const z = a + ((b - a) * i) / 11;
        return [0, mouseY(0, z), z];
      }),
      0.00065,
      p.black,
      mouse,
    );
  for (const side of [-1, 1])
    tube(
      Array.from({ length: 12 }, (_, i) => {
        const x = side * (0.003 + (i / 11) * 0.027),
          z = -0.003 - (i / 11) * 0.004;
        return [x, mouseY(x, z), z];
      }),
      0.00055,
      p.black,
      mouse,
    );
  const wheel = cyl(0.0065, 0.008, p.black, mouse, 0, 0.034, -0.018);
  wheel.rotation.z = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const ridge = mesh(
      new THREE.TorusGeometry(0.0065, 0.00055, 5, 20),
      p.metal,
      mouse,
      -0.003 + i * 0.0015,
      0.034,
      -0.018,
    );
    ridge.rotation.y = Math.PI / 2;
  }
  const mouseMark = plane(
    0.011,
    0.002,
    p.accent,
    mouse,
    0,
    mouseY(0, 0.028) + 0.0002,
    0.028,
  );
  mouseMark.rotation.x = -Math.PI / 2;
  contact(desk, 0.44, DESK_TOP + 0.0062, 0.16, 0.085, 0.14, 0.2);
  tube(
    [
      [-0.05, 0.9, -0.27],
      [-0.05, 0.7, -0.42],
      [0.45, 0.2, -0.42],
      [1, 0.15, -0.1],
    ],
    0.008,
    p.black,
    desk,
  );
  // Two speakers, a pen pot, a cup, a task lamp and hanging headphones.
  const speakers = [];
  for (const x of [-0.8, 0.65]) {
    speakers.push(box(0.15, 0.23, 0.15, p.black, desk, x, 0.92, -0.24, 0.012));
    const woofer = mesh(
      new THREE.CircleGeometry(0.044, 24),
      p.metal,
      desk,
      x,
      0.91,
      -0.158,
    );
    mesh(new THREE.CircleGeometry(0.018, 20), p.black, desk, x, 1.0, -0.157);
  }
  const cup = group(desk, -0.91, DESK_TOP, 0.2);
  cup.name = "ceramic-mug";
  const ceramic = mat({ color: "#bac3af", roughness: 0.24, metalness: 0.02 }),
    profile = [
      [0, 0],
      [0.031, 0],
      [0.038, 0.003],
      [0.041, 0.075],
      [0.04, 0.085],
      [0.036, 0.086],
      [0.034, 0.081],
      [0.034, 0.013],
      [0.029, 0.008],
      [0, 0.008],
    ].map((v) => new THREE.Vector2(...v));
  mesh(new THREE.LatheGeometry(profile, 48), ceramic, cup);
  const coffee = mesh(
    new THREE.CircleGeometry(0.033, 48),
    mat({ color: "#241c16", roughness: 0.25 }),
    cup,
    0,
    0.071,
    0,
  );
  coffee.rotation.x = -Math.PI / 2;
  const cupHandle = tube(
    [
      [0.034, 0.068, 0],
      [0.055, 0.075, 0],
      [0.072, 0.059, 0],
      [0.072, 0.036, 0],
      [0.052, 0.019, 0],
      [0.034, 0.026, 0],
    ],
    0.005,
    ceramic,
    cup,
  );
  cupHandle.name = "mug-handle";
  const pot = cyl(0.035, 0.085, p.metal, desk, 0.93, 0.85, -0.2);
  for (let i = 0; i < 5; i++)
    box(
      0.004,
      0.12,
      0.004,
      i % 2 ? p.wood : p.chrome,
      desk,
      0.91 + i * 0.009,
      0.92,
      -0.2 + Math.sin(i) * 0.012,
    );
  const lamp = group(desk, -1, 0.81, -0.27);
  cyl(0.09, 0.018, p.black, lamp);
  tube(
    [
      [0, 0, 0],
      [0.05, 0.28, 0],
      [-0.3, 0.46, -0.02],
    ],
    0.012,
    p.metal,
    lamp,
  );
  const shade = mesh(
    new THREE.ConeGeometry(0.13, 0.14, 24, 1, true),
    mat({
      color: "#b9a575",
      metalness: 0.6,
      roughness: 0.35,
      side: THREE.DoubleSide,
    }),
    lamp,
    -0.3,
    0.44,
    -0.02,
  );
  shade.rotation.z = -0.3;
  const taskLight = new THREE.PointLight("#ffd4a0", 4, 3, 2);
  taskLight.position.set(-1.9, 1.25, -2.05);
  room.add(taskLight);
  const headphones = group(desk, -1.13, 0.61, 0.18);
  mesh(
    new THREE.TorusGeometry(0.105, 0.011, 8, 32, Math.PI),
    p.black,
    headphones,
  );
  for (const x of [-0.1, 0.1])
    box(0.042, 0.09, 0.06, p.black, headphones, x, -0.035, 0, 0.02);
  function chair(x, z, angle = 0) {
    const g = group(room, x, 0, z);
    g.rotation.y = angle;
    box(0.52, 0.09, 0.5, fabric, g, 0, 0.48, 0, 0.055);
    box(0.49, 0.52, 0.07, fabric, g, 0, 0.78, 0.22, 0.045);
    cyl(0.027, 0.4, p.chrome, g, 0, 0.27, 0);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      tube(
        [
          [0, 0.1, 0],
          [Math.cos(a) * 0.31, 0.07, Math.sin(a) * 0.31],
        ],
        0.016,
        p.black,
        g,
      );
      cyl(
        0.035,
        0.04,
        p.black,
        g,
        Math.cos(a) * 0.31,
        0.05,
        Math.sin(a) * 0.31,
      );
    }
    for (const x of [-0.27, 0.27]) {
      box(0.025, 0.18, 0.025, p.black, g, x, 0.62, 0.04);
      box(0.05, 0.035, 0.31, p.black, g, x, 0.71, 0.04, 0.015);
    }
    contact(room, x, 0.074, z, 0.9, 0.9, 0.3);
    return g;
  }
  chair(-0.65, -0.75, 0);
  chair(0.65, 0.5, -0.6);
  // Open PC side: motherboard, traces, heatsink, GPU, fans and individually routed cables.
  const pc = group(room, 0.85, 0.42, -2.12);
  const board = mat({ color: "#264c42", roughness: 0.63 }),
    copper = mat({ color: "#9a794a", metalness: 0.78, roughness: 0.3 });
  box(0.36, 0.77, 0.025, p.black, pc, 0, 0, -0.24, 0.008);
  let pcTop;
  for (const y of [-0.38, 0.38]) {
    const surface = box(0.36, 0.025, 0.5, p.black, pc, 0, y, 0, 0.006);
    if (y > 0) pcTop = surface;
  }
  for (const x of [-0.175, 0.175])
    box(0.015, 0.74, 0.5, p.black, pc, x, 0, 0, 0.005);
  box(0.009, 0.67, 0.43, board, pc, 0.185, 0, 0);
  const pane = mat({
    color: "#97b7ba",
    transparent: true,
    opacity: 0.09,
    metalness: 0.15,
    roughness: 0.08,
    side: THREE.DoubleSide,
  });
  box(0.35, 0.72, 0.008, pane, pc, 0, 0, 0.258, 0.005);
  box(0.26, 0.12, 0.34, p.metal, pc, 0, -0.07, 0.045, 0.008);
  for (let i = 0; i < 14; i++)
    box(0.24, 0.007, 0.23, p.chrome, pc, 0, 0.02 + i * 0.008, -0.02);
  for (let i = 0; i < 10; i++)
    box(
      0.003,
      0.03 + random() * 0.22,
      0.002,
      copper,
      pc,
      -0.13 + i * 0.026,
      0.19,
      -0.2,
    );
  for (let i = 0; i < 2; i++) {
    const fan = group(pc, 0, -0.22 + i * 0.43, 0.271);
    fan.userData.dynamic = true;
    mesh(new THREE.TorusGeometry(0.135, 0.008, 6, 36), p.accent, fan);
    for (let j = 0; j < 7; j++) {
      const a = (j / 7) * Math.PI * 2;
      const blade = box(
        0.045,
        0.1,
        0.007,
        p.metal,
        fan,
        Math.sin(a) * 0.065,
        Math.cos(a) * 0.065,
        0,
        0.009,
      );
      blade.rotation.z = -a + 0.5;
    }
    fanRotors.push(fan);
  }
  action(
    box(
      0.34,
      0.72,
      0.018,
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      pc,
      0,
      0,
      0.29,
    ),
    "pyjosh",
  );
  for (let i = 0; i < 4; i++)
    tube(
      [
        [0.1, 0.1, -0.1],
        [0.2, 0.05 - i * 0.02, 0.1],
        [0.12, -0.2, 0.17],
        [-0.05, -0.28, 0.15],
      ],
      0.006,
      i % 2 ? copper : p.black,
      pc,
    );
  animations.push((time) =>
    fanRotors.forEach((f, i) => (f.rotation.z = time * (i ? -8 : 10))),
  );
  // Bed and wardrobe are part of a room, rather than exhibition plinths.
  const bed = group(room, -2.75, 0, 0.1);
  box(1.32, 0.28, 2.2, darkWood, bed, 0, 0.25, 0, 0.03);
  const mattress = box(
    1.28,
    0.19,
    2.14,
    mat({ color: "#b2b4a3", roughness: 1 }),
    bed,
    0,
    0.48,
    0,
    0.07,
  );
  box(1.34, 0.8, 0.08, darkWood, bed, 0, 0.5, -1.11, 0.02);
  box(
    0.8,
    0.12,
    0.4,
    mat({ color: "#bfc4b6", map: fabricTex, roughness: 1 }),
    bed,
    0,
    0.63,
    -0.76,
    0.065,
  );
  const blanketGeo = new THREE.PlaneGeometry(1.35, 1.5, 36, 36);
  const positions = blanketGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i);
    positions.setZ(
      i,
      0.022 * Math.sin(x * 16 + y * 5) + 0.012 * Math.sin(y * 28 + x * 3),
    );
  }
  blanketGeo.computeVertexNormals();
  const blanket = mesh(
    blanketGeo,
    mat({
      color: "#294a51",
      map: fabricTex,
      roughness: 0.96,
      side: THREE.DoubleSide,
    }),
    bed,
    0,
    0.617,
    0.34,
  );
  blanket.name = "waved-blanket";
  blanket.rotation.x = -Math.PI / 2;
  contact(room, -2.75, 0.07, 0.1, 1.8, 2.7, 0.35);
  const wardrobe = group(room, -3, 0, 2.1);
  box(1, 0.0 + 2.25, 0.65, darkWood, wardrobe, 0, 1.18, 0, 0.014);
  for (const x of [-0.255, 0.255]) {
    box(0.47, 2.17, 0.025, wood, wardrobe, x, 1.18, 0.34);
    box(
      0.018,
      0.28,
      0.025,
      p.chrome,
      wardrobe,
      x > 0 ? 0.07 : -0.07,
      1.2,
      0.365,
    );
  }
  // Bookcase, actual book spines, a record sleeve and an analog clock.
  const shelf = group(room, -2.95, 0, -2.75);
  for (const x of [-0.5, 0.5])
    box(0.045, 2.2, 0.42, darkWood, shelf, x, 1.15, 0);
  for (const y of [0.1, 0.66, 1.22, 1.78, 2.28])
    box(1.05, 0.04, 0.45, wood, shelf, 0, y, 0);
  const bookColours = ["#708379", "#a38a64", "#394d5b", "#886657", "#b0b29c"];
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 9; i++) {
      const h = 0.32 + random() * 0.12,
        w = 0.045 + random() * 0.04;
      const b = box(
        w,
        h,
        0.28,
        mat({ color: bookColours[(i + row) % 5], roughness: 0.9 }),
        shelf,
        -0.44 + i * 0.095,
        0.7 + row * 0.56 + h / 2,
        0.02,
        0.002,
      );
      if (i === 7) b.rotation.z = 0.13;
      box(
        w * 0.7,
        0.006,
        0.003,
        p.paper,
        shelf,
        b.position.x,
        b.position.y + 0.07,
        0.163,
      );
    }
  const record = group(shelf, 0, 2.465, 0.08);
  box(0.33, 0.33, 0.025, mat({ color: "#335962", roughness: 0.8 }), record);
  const disc = mesh(
    new THREE.CircleGeometry(0.13, 40),
    p.black,
    record,
    0,
    0,
    0.014,
  );
  mesh(new THREE.CircleGeometry(0.04, 24), p.paper, record, 0, 0, 0.015);
  const clock = group(room, 3.21, 2.52, -3.12);
  clock.name = "wall-clock";
  const face = mesh(new THREE.CircleGeometry(0.18, 40), p.paper, clock);
  mesh(new THREE.TorusGeometry(0.185, 0.012, 8, 40), p.metal, clock);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const mark = box(
      0.008,
      0.025,
      0.002,
      p.black,
      clock,
      Math.sin(a) * 0.15,
      Math.cos(a) * 0.15,
      0.003,
    );
    mark.rotation.z = -a;
  }
  const hand = box(0.01, 0.12, 0.005, p.black, clock, -0.03, 0.04, 0.009);
  hand.rotation.z = 0.9;
  const minute = box(0.008, 0.15, 0.005, p.black, clock, 0.04, 0.045, 0.012);
  minute.rotation.z = -0.7;
  const seconds = box(
    0.004,
    0.21,
    0.003,
    mat({ color: "#a15e44", roughness: 0.5 }),
    clock,
    0,
    0.07,
    0.016,
  );
  animations.push(
    (time) => (seconds.rotation.z = (-Math.floor(time) * Math.PI) / 30),
  );
  // The camera is recognisable equipment: grip, lens glass, focus rings, hotshoe, dial and strap.
  const cabinet = group(room, 2, 0, -0.65);
  box(1.1, 0.85, 0.64, darkWood, cabinet, 0, 0.49, 0, 0.015);
  const cabinetTop = box(1.15, 0.055, 0.7, wood, cabinet, 0, 0.94, 0, 0.012);
  for (let i = 0; i < 3; i++) {
    box(1.03, 0.23, 0.025, wood, cabinet, 0, 0.26 + i * 0.25, 0.333);
    box(0.19, 0.014, 0.025, p.metal, cabinet, 0, 0.27 + i * 0.25, 0.358);
  }
  const camera = group(room, 1.95, 1.0385, -0.65);
  camera.rotation.y = -0.25;
  box(0.22, 0.135, 0.09, p.black, camera, 0, 0, 0, 0.018);
  box(
    0.045,
    0.14,
    0.1,
    mat({ color: "#1b2227", roughness: 0.98 }),
    camera,
    -0.09,
    0,
    0.01,
    0.01,
  );
  box(0.075, 0.03, 0.06, p.metal, camera, 0, 0.08, -0.01, 0.005);
  const lens = cyl(0.053, 0.1, p.black, camera, 0.025, -0.005, 0.08);
  lens.rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++)
    mesh(
      new THREE.TorusGeometry(0.053, 0.003, 5, 32),
      i % 2 ? p.metal : p.black,
      camera,
      0.025,
      -0.005,
      0.05 + i * 0.014,
    );
  action(
    mesh(
      new THREE.CircleGeometry(0.046, 40),
      mat({ color: "#173a4a", metalness: 0.85, roughness: 0.06 }),
      camera,
      0.025,
      -0.005,
      0.133,
    ),
    "viewfinder",
  );
  cyl(0.014, 0.015, p.chrome, camera, 0.072, 0.08, 0);
  box(0.025, 0.01, 0.02, p.chrome, camera, -0.045, 0.075, 0.005);
  const strapPath = new THREE.CurvePath(),
    strapY = 0.9675 - 1.0385 + 0.005;
  const bezier = (points) =>
    strapPath.add(
      new THREE.CubicBezierCurve3(
        ...points.map((v) => new THREE.Vector3(...v)),
      ),
    );
  bezier([
    [-0.112, 0.035, 0.018],
    [-0.21, -0.03, 0.02],
    [-0.24, strapY, 0.1],
    [-0.22, strapY, 0.18],
  ]);
  bezier([
    [-0.22, strapY, 0.18],
    [-0.18, strapY, 0.25],
    [0.04, strapY, 0.25],
    [0.14, strapY, 0.18],
  ]);
  bezier([
    [0.14, strapY, 0.18],
    [0.19, strapY, 0.1],
    [0.16, -0.02, 0.04],
    [0.112, 0.035, 0.018],
  ]);
  const cameraStrap = mesh(
    new THREE.TubeGeometry(strapPath, 72, 0.004, 8, false),
    p.black,
    camera,
  );
  cameraStrap.name = "camera-strap";
  const strapMounts = [-1, 1].map((side) =>
    box(
      0.015,
      0.016,
      0.012,
      p.metal,
      camera,
      side * 0.109,
      0.035,
      0.018,
      0.003,
    ),
  );
  for (let j = 0; j < 2; j++) {
    const spare = cyl(
      0.041,
      0.09,
      p.black,
      cabinet,
      0.31 + j * 0.13,
      1.01,
      -0.08,
    );
    mesh(
      new THREE.TorusGeometry(0.041, 0.003, 6, 24),
      p.chrome,
      cabinet,
      0.31 + j * 0.13,
      1.052,
      -0.08,
    ).rotation.x = Math.PI / 2;
  }
  // Photographic studies show alternate views rendered from this same 3D city.
  const contactBoard = group(room, 2.12, 1.98, -3.15);
  contactBoard.name = "photo-board";
  box(1.6, 1.0, 0.04, mat({ color: "#6a543b", roughness: 1 }), contactBoard);
  for (let j = 0; j < 6; j++) {
    const x = -0.5 + (j % 3) * 0.5,
      y = 0.22 - Math.floor(j / 3) * 0.47;
    const print = box(0.44, 0.4, 0.008, p.paper, contactBoard, x, y, 0.03);
    const photo = plane(
      0.395,
      0.29,
      basic("#244452"),
      contactBoard,
      x,
      y + 0.025,
      0.036,
    );
    photoFrames.push(photo);
    box(
      0.08,
      0.025,
      0.008,
      mat({ color: "#baab8b", transparent: true, opacity: 0.55 }),
      contactBoard,
      x,
      y + 0.19,
      0.043,
    );
  }
  // Project notebooks are tangible, with tabs, elastic bands and diagrammed pages.
  const notes = group(desk, -0.62, DESK_TOP + 0.006, 0.17);
  notes.name = "project-notes";
  notes.rotation.y = 0.06;
  const noteTex = texture(1024, 700, (c, w, h) => {
    c.fillStyle = "#d4cfb9";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#b9b5a24d";
    for (let y = 45; y < h; y += 26) {
      c.beginPath();
      c.moveTo(25, y);
      c.lineTo(w - 25, y);
      c.stroke();
    }
    c.fillStyle = "#314955";
    c.font = "40px serif";
    c.fillText("PyJosh", 55, 75);
    for (let layer = 0; layer < 3; layer++)
      for (let node = 0; node < 4; node++) {
        const x = 120 + layer * 210,
          y = 190 + node * 110;
        if (layer < 2)
          for (let j = 0; j < 4; j++) {
            c.strokeStyle = "#54777977";
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x + 210, 190 + j * 110);
            c.stroke();
          }
        c.fillStyle = "#55756e";
        c.beginPath();
        c.arc(x, y, 14, 0, Math.PI * 2);
        c.fill();
      }
    c.fillStyle = "#6f7767";
    c.font = "20px monospace";
    c.fillText("layers · activations · gradients", 55, 650);
  });
  box(0.36, 0.012, 0.27, mat({ color: "#6e7869", roughness: 0.8 }), notes);
  const page = action(
    plane(0.34, 0.25, basic("#ffffff", { map: noteTex }), notes, 0, 0.0066, 0),
    "pyjosh",
  );
  page.rotation.x = -Math.PI / 2;
  box(0.006, 0.008, 0.24, p.black, notes, 0.12, 0.0108, 0);
  const projectBooks = [],
    bookTitles = [
      ["Sunbrew", "#9e7953", -0.56, -0.26, -0.1],
      ["optialgos", "#4c7275", -0.285, -0.03, 0.05],
    ];
  bookTitles.forEach(([title, color, x, z, yaw]) => {
    const book = group(desk, x, DESK_TOP, z);
    book.name = title + "-notebook";
    book.rotation.y = yaw;
    projectBooks.push(book);
    const coverMaterial = mat({ color, roughness: 0.8 });
    box(0.23, 0.002, 0.16, coverMaterial, book, 0, 0.001, 0);
    box(0.218, 0.018, 0.148, p.paper, book, 0, 0.011, 0);
    box(0.23, 0.002, 0.16, coverMaterial, book, 0, 0.021, 0);
    const t = texture(512, 320, (c, w, h) => {
      c.fillStyle = color;
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#e2d9ba";
      c.font = "42px serif";
      c.fillText(title, 26, 75);
      c.strokeStyle = "#d1c5a5";
      c.strokeRect(25, 150, 60, 60);
      c.beginPath();
      c.moveTo(35, 180);
      c.lineTo(50, 195);
      c.lineTo(75, 160);
      c.stroke();
    });
    const cover = action(
      plane(0.23, 0.16, basic("#ffffff", { map: t }), book, 0, 0.0222, 0),
      title === "Sunbrew" ? "sunbrew" : "optialgos",
    );
    cover.rotation.x = -Math.PI / 2;
  });
  // Framed paper, a double mat, fine engraved borders, a rosette and foil make an
  // achievement read as a certificate. This is a designed representation, not a scan.
  function certificate(x, y, z, title, subtitle, colour, year, wide = 1.13) {
    const frame = group(room, x, y, z),
      gold = mat({ color: colour, metalness: 0.8, roughness: 0.32 });
    box(wide + 0.14, 0.89, 0.065, darkWood, frame);
    box(wide + 0.1, 0.85, 0.012, gold, frame, 0, 0, 0.038);
    box(wide + 0.065, 0.815, 0.014, p.paper, frame, 0, 0, 0.047);
    const tex = texture(1600, 1100, (c, w, h) => {
      c.fillStyle = "#ddd7bf";
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 12000; i++) {
        c.fillStyle = `rgba(80,65,30,${random() * 0.06})`;
        c.fillRect(random() * w, random() * h, 1, 1);
      }
      c.strokeStyle = colour;
      c.lineWidth = 2;
      for (const inset of [39, 51, 66])
        c.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
      for (const x of [65, w - 65])
        for (const y of [65, h - 65]) {
          c.save();
          c.translate(x, y);
          c.rotate(Math.PI / 4);
          c.strokeRect(-13, -13, 26, 26);
          c.restore();
        }
      c.textAlign = "center";
      c.fillStyle = "#4a514a";
      c.font = "30px serif";
      c.fillText(title, w / 2, 150);
      c.fillStyle = "#283d3a";
      c.font = "61px serif";
      c.fillText(subtitle, w / 2, 320);
      c.font = "italic 24px serif";
      c.fillText("Presented to", w / 2, 425);
      c.font = "48px serif";
      c.fillText("Josh Stefan Junarto", w / 2, 515);
      c.strokeStyle = "#a89b73";
      c.beginPath();
      c.moveTo(370, 555);
      c.lineTo(1230, 555);
      c.stroke();
      c.font = "29px serif";
      c.fillStyle = "#4a514a";
      c.fillText(year, w / 2, 635);
      c.font = "18px serif";
      c.fillText("A milestone along the way.", w / 2, 695);
      // Decorative guilloché rosette, deliberately without an institutional seal or signature.
      c.save();
      c.translate(w / 2, 864);
      c.strokeStyle = colour;
      c.lineWidth = 1.2;
      for (let i = 0; i < 48; i++) {
        c.rotate((Math.PI * 2) / 48);
        c.beginPath();
        c.ellipse(0, 0, 91, 39, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = colour;
      c.beginPath();
      c.arc(0, 0, 54, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e5dec4";
      c.font = "19px serif";
      c.fillText(subtitle.includes("Merit") ? "MERIT" : "LEARN", 0, 6);
      c.restore();
      c.fillStyle = "#938b73";
      c.font = "13px monospace";
      c.fillText(
        "DESIGNED AWARD REPRESENTATION / NOT THE ORIGINAL DOCUMENT",
        w / 2,
        1032,
      );
    });
    action(
      plane(wide, 0.76, basic("#ffffff", { map: tex }), frame, 0, 0, 0.058),
      "profile",
    );
    return frame;
  }
  certificate(-1.85, 2.1, -3.13, "IBM", "AI Fundamentals", "#87713d", "");
  certificate(
    -0.38,
    2.13,
    -3.13,
    "CISCO NETWORKING ACADEMY",
    "Python Essentials 1",
    "#4a6971",
    "Completed · 22 February 2026",
    1.1,
  );
  // Plants, curtain folds, pin notes, a switch plate and a ceiling pendant finish the room.
  function plant(x, y, z, size) {
    const g = group(room, x, y, z);
    const terracotta = mat({ color: "#8d6a51", roughness: 0.84 });
    cyl(0.12 * size, 0.24 * size, terracotta, g, 0, 0.12 * size, 0);
    cyl(0.105 * size, 0.008, p.soil, g, 0, 0.244 * size, 0);
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4,
        end = [
          Math.cos(a) * 0.22 * size,
          (0.42 + i * 0.025) * size,
          Math.sin(a) * 0.22 * size,
        ];
      tube([[0, 0.22 * size, 0], end], 0.005 * size, p.leaf, g);
      const leaf = ball(...end, 0.11 * size, p.leaf, g, 0.55, 1.8, 0.13);
      leaf.rotation.z = Math.sin(a) * 0.9;
    }
    return g;
  }
  plant(2.9, 0.07, 2.3, 1.5);
  box(0.45, 0.65, 0.5, darkWood, room, -1.85, 0.425, -0.25, 0.012);
  box(0.48, 0.035, 0.53, wood, room, -1.85, 0.765, -0.25, 0.008);
  plant(-1.85, 0.785, -0.25, 0.55);
  const pcPlant = plant(0.85, 0.8125, -2.12, 0.48);
  pcPlant.name = "pc-plant";
  contact(room, 0.85, 0.8127, -2.12, 0.16, 0.16, 0.24);
  const curtainMat = mat({
    color: "#5e706b",
    map: fabricTex,
    roughness: 0.98,
    side: THREE.DoubleSide,
  });
  for (const [x, w] of [
    [-2.12, 0.65],
    [2.9, 0.6],
  ]) {
    const geo = new THREE.PlaneGeometry(w, 2.65, 24, 32);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setZ(i, Math.sin(pos.getX(i) * 45) * 0.055);
    geo.computeVertexNormals();
    const curtain = mesh(geo, curtainMat, room, x, 1.55, 3.07);
    curtain.castShadow = true;
    curtain.userData.dynamic = true;
    curtains.push(curtain);
  }
  const rail = cyl(0.016, 5.8, p.metal, room, 0.3, 2.9, 3.08);
  rail.rotation.z = Math.PI / 2;
  box(0.065, 0.1, 0.015, p.paper, room, 3.5, 1.1, 1.65).rotation.y =
    -Math.PI / 2;
  const pendant = mesh(
    new THREE.ConeGeometry(0.24, 0.25, 32, 1, true),
    mat({
      color: "#9c8b62",
      metalness: 0.65,
      roughness: 0.35,
      side: THREE.DoubleSide,
    }),
    room,
    0.4,
    2.68,
    -0.2,
  );
  cyl(0.008, 0.19, p.black, room, 0.4, 2.87, -0.2);
  const bulb = ball(0.4, 2.58, -0.2, 0.045, p.warm, room);
  const ceilingLight = new THREE.PointLight("#ffdbab", 50, 8, 2);
  ceilingLight.position.set(0.4, 2.6, -0.2);
  room.add(ceilingLight);
  const windowLight = new THREE.PointLight("#99c3d1", 30, 8, 2);
  windowLight.position.set(1.2, 2.2, 2.7);
  room.add(windowLight);
  // Fine dust catches the light near the window, and curtains respond to the
  // open casement. Keep their movement quieter than the scroll journey.
  const dustGeo = new THREE.BufferGeometry(),
    dustPos = [];
  for (let i = 0; i < 95; i++)
    dustPos.push(-1 + random() * 4, 0.4 + random() * 2.2, random() * 3);
  dustGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(dustPos, 3),
  );
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: "#e6d9b0",
      size: 0.009,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  room.add(dust);
  animations.push((time) => {
    curtains.forEach((curtain, i) => {
      curtain.rotation.y =
        Math.sin(time * 0.6 + i) *
        0.035 *
        Math.min(1, Math.max(0, sceneProgress - 1.8));
    });
    dust.rotation.y = Math.sin(time * 0.09) * 0.08;
    dust.position.y = Math.sin(time * 0.16) * 0.04;
  });
  return {
    room,
    photoFrames,
    props: {
      bed,
      mattress,
      blanket,
      floor,
      windowSkirting,
      screen,
      desk,
      DESK_TOP,
      mouse,
      mousePad,
      notes,
      projectBooks,
      pcPlant,
      pcTop,
      keyboard,
      monitorBase,
      speakers,
      cup,
      cupHandle,
      camera,
      cameraStrap,
      strapMounts,
      cabinetTop,
      clock,
      contactBoard,
    },
    setProgress(q) {
      sceneProgress = q;
      ceilingLight.intensity =
        34 + Math.max(0, Math.min(1, (q - 1.5) / 0.7)) * 12;
      windowLight.intensity = 24;
    },
    setAccent(value) {
      ember = value;
      taskLight.color.set(value ? "#ffd0a6" : "#ffd4a0");
      windowLight.color.set(value ? "#dca592" : "#99c3d1");
      ceilingLight.color.set(value ? "#ffe0b7" : "#ffdbab");
      drawDesktop();
    },
  };
}
