import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// mathjs is loaded globally via a classic <script> tag in index.html
const math = window.math;

// ---- categorical palette (fixed order, never cycled/reassigned) ----
const isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
const CATEGORICAL = isDark
  ? ["#3987e5", "#008300", "#d55181", "#c98500", "#199e70", "#d95926", "#9085e9", "#e66767"]
  : ["#2a78d6", "#008300", "#e87ba4", "#eda100", "#1baf7a", "#eb6834", "#4a3aa7", "#e34948"];

const FUNC_NAMES = ["asin", "acos", "atan", "sinh", "cosh", "tanh", "sin", "cos", "tan", "sqrt", "log", "ln", "exp", "abs", "sec", "csc", "cot"];

// ---------- expression preprocessing ----------
// Turns "cosA", "sinB", "2A", "AB", "(A+B)(A-B)" into valid mathjs syntax.
function preprocess(raw) {
  let expr = raw.trim();
  if (!expr) return expr;

  // 1. bare function calls without parens: cosA -> cos(A), sinB -> sin(B)
  const funcAlt = FUNC_NAMES.join("|");
  const bareFuncRe = new RegExp(`\\b(${funcAlt})([AB])\\b`, "g");
  expr = expr.replace(bareFuncRe, "$1($2)");

  // 2. implicit multiplication: digit directly followed by a letter or "("
  expr = expr.replace(/(\d)\s*([A-Za-z(])/g, "$1*$2");

  // 3. implicit multiplication: ")" directly followed by "(", a letter or a digit
  expr = expr.replace(/\)\s*([A-Za-z0-9(])/g, ")*$1");

  // 4. implicit multiplication: bare variable A/B directly followed by "(", a digit, or another A/B
  expr = expr.replace(/\b([AB])(?=[A-Za-z0-9(])/g, "$1*");

  return expr;
}

function compileExpression(raw) {
  const processed = preprocess(raw);
  const node = math.parse(processed);
  const compiled = node.compile();
  // sanity check it actually evaluates with A/B in scope
  compiled.evaluate({ A: 0, B: 0, ln: Math.log });
  return compiled;
}

// ---------- three.js scene setup ----------
const viewport = document.getElementById("viewport");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
viewport.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.left = "0";
labelRenderer.domElement.style.pointerEvents = "none";
viewport.appendChild(labelRenderer.domElement);

function syncBackground() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--page").trim() || "#0d0d0d";
  scene.background = new THREE.Color(bg);
}
syncBackground();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

function defaultCameraPosition(range, clamp) {
  const d = Math.max(range, clamp) * 2.2 + 4;
  camera.position.set(d, d * 0.7, d);
  controls.target.set(0, 0, 0);
  controls.update();
}

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);
const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
dirLight2.position.set(-6, -4, -8);
scene.add(dirLight2);

function resize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  labelRenderer.setSize(w, h);
}
new ResizeObserver(resize).observe(viewport);
window.addEventListener("resize", resize);

// ---------- axes / grid ----------
let axesGroup = new THREE.Group();
scene.add(axesGroup);

function makeLabel(text, cls = "axis-label") {
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = text;
  return new CSS2DObject(div);
}

function rebuildAxes(range, clampVal) {
  axesGroup.clear(); // fires "removed" on each child so CSS2DObject labels drop their DOM element
  scene.remove(axesGroup);
  axesGroup = new THREE.Group();

  const gridDivisions = Math.max(4, Math.round(range / (Math.PI / 2)) * 4);
  const grid = new THREE.GridHelper(range * 2, gridDivisions, 0x898781, 0x898781);
  grid.material.opacity = 0.25;
  grid.material.transparent = true;
  axesGroup.add(grid);

  const axisMat = new THREE.LineBasicMaterial({ color: 0x898781 });
  const mkAxis = (from, to) => {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    return new THREE.Line(geo, axisMat);
  };

  axesGroup.add(mkAxis(new THREE.Vector3(-range * 1.05, 0, 0), new THREE.Vector3(range * 1.05, 0, 0)));
  axesGroup.add(mkAxis(new THREE.Vector3(0, 0, -range * 1.05), new THREE.Vector3(0, 0, range * 1.05)));
  axesGroup.add(mkAxis(new THREE.Vector3(0, -clampVal * 1.05, 0), new THREE.Vector3(0, clampVal * 1.05, 0)));

  const labelA = makeLabel("A");
  labelA.position.set(range * 1.12, 0, 0);
  axesGroup.add(labelA);

  const labelB = makeLabel("B");
  labelB.position.set(0, 0, range * 1.12);
  axesGroup.add(labelB);

  const labelF = makeLabel("f(A, B)");
  labelF.position.set(0, clampVal * 1.12, 0);
  axesGroup.add(labelF);

  // pi-multiple tick labels on A and B axes
  const maxK = Math.floor(range / Math.PI);
  for (let k = -maxK; k <= maxK; k++) {
    if (k === 0) continue;
    const text = k === 1 ? "π" : k === -1 ? "-π" : `${k}π`;
    const tA = makeLabel(text, "axis-label tick");
    tA.position.set(k * Math.PI, 0, 0);
    axesGroup.add(tA);
    const tB = makeLabel(text, "axis-label tick");
    tB.position.set(0, 0, k * Math.PI);
    axesGroup.add(tB);
  }

  scene.add(axesGroup);
}

// ---------- surface geometry ----------
function buildSurfaceGeometry(compiled, range, resolution, clampVal) {
  const verticesPerRow = resolution + 1;
  const positions = new Float32Array(verticesPerRow * verticesPerRow * 3);
  const step = (2 * range) / resolution;

  let idx = 0;
  for (let i = 0; i <= resolution; i++) {
    const B = -range + i * step;
    for (let j = 0; j <= resolution; j++) {
      const A = -range + j * step;
      let val;
      try {
        val = compiled.evaluate({ A, B, ln: Math.log });
      } catch (e) {
        val = 0;
      }
      if (typeof val !== "number" || Number.isNaN(val)) {
        val = 0;
      } else if (!Number.isFinite(val)) {
        val = val > 0 ? clampVal : -clampVal;
      } else {
        val = Math.max(-clampVal, Math.min(clampVal, val));
      }
      positions[idx++] = A;
      positions[idx++] = val;
      positions[idx++] = B;
    }
  }

  const indices = [];
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const a = i * verticesPerRow + j;
      const b = a + 1;
      const c = a + verticesPerRow;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ---------- equation state ----------
let equations = []; // { id, exprRaw, color, visible, mesh, wireMesh, rowEl }
let nextColorIndex = 0;
let idCounter = 0;

const equationListEl = document.getElementById("equation-list");

function nextColor() {
  const c = CATEGORICAL[nextColorIndex % CATEGORICAL.length];
  nextColorIndex++;
  return c;
}

function disposeMesh(mesh) {
  if (!mesh) return;
  scene.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
}

function rebuildEquationMesh(eq, range, resolution, clampVal, showWireframe) {
  disposeMesh(eq.mesh);
  disposeMesh(eq.wireMesh);
  eq.mesh = null;
  eq.wireMesh = null;

  if (!eq.visible || !eq.compiled) return;

  const geometry = buildSurfaceGeometry(eq.compiled, range, resolution, clampVal);
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(eq.color),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.82,
    shininess: 25,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  eq.mesh = mesh;

  if (showWireframe) {
    const wireGeo = new THREE.WireframeGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({ color: new THREE.Color(eq.color), transparent: true, opacity: 0.35 });
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    scene.add(wireMesh);
    eq.wireMesh = wireMesh;
  }
}

function setRowError(eq, message) {
  eq.rowEl.classList.toggle("error", !!message);
  let msgEl = eq.rowEl.nextElementSibling;
  if (msgEl && msgEl.classList.contains("eq-error-msg")) {
    if (!message) {
      msgEl.remove();
    } else {
      msgEl.textContent = message;
    }
    return;
  }
  if (message) {
    msgEl = document.createElement("div");
    msgEl.className = "eq-error-msg";
    msgEl.textContent = message;
    eq.rowEl.after(msgEl);
  }
}

function recompileEquation(eq) {
  if (!eq.exprRaw.trim()) {
    eq.compiled = null;
    setRowError(eq, null);
    return;
  }
  try {
    eq.compiled = compileExpression(eq.exprRaw);
    setRowError(eq, null);
  } catch (e) {
    eq.compiled = null;
    setRowError(eq, e.message.length > 60 ? "Invalid expression" : e.message);
  }
}

function createEquationRow(eq) {
  const row = document.createElement("div");
  row.className = "eq-row";

  const swatch = document.createElement("div");
  swatch.className = "eq-swatch" + (eq.visible ? "" : " off");
  swatch.style.background = eq.color;
  swatch.title = "Toggle visibility";
  swatch.addEventListener("click", () => {
    eq.visible = !eq.visible;
    swatch.classList.toggle("off", !eq.visible);
    rebuildAll();
  });

  const input = document.createElement("input");
  input.className = "eq-input";
  input.type = "text";
  input.value = eq.exprRaw;
  input.placeholder = "e.g. sin(2A+B)";
  input.spellcheck = false;
  let debounceTimer = null;
  input.addEventListener("input", () => {
    eq.exprRaw = input.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      recompileEquation(eq);
      rebuildAll();
    }, 250);
  });

  const remove = document.createElement("button");
  remove.className = "eq-remove";
  remove.textContent = "✕";
  remove.title = "Remove equation";
  remove.addEventListener("click", () => {
    disposeMesh(eq.mesh);
    disposeMesh(eq.wireMesh);
    setRowError(eq, null);
    row.remove();
    equations = equations.filter((e) => e.id !== eq.id);
  });

  row.appendChild(swatch);
  row.appendChild(input);
  row.appendChild(remove);
  equationListEl.appendChild(row);
  eq.rowEl = row;
}

function addEquation(exprRaw, visible) {
  const eq = {
    id: idCounter++,
    exprRaw,
    color: nextColor(),
    visible,
    compiled: null,
    mesh: null,
    wireMesh: null,
    rowEl: null,
  };
  equations.push(eq);
  createEquationRow(eq);
  recompileEquation(eq);
  return eq;
}

// ---------- controls ----------
const rangeSlider = document.getElementById("range-slider");
const rangeVal = document.getElementById("range-val");
const resSlider = document.getElementById("res-slider");
const resVal = document.getElementById("res-val");
const clampToggle = document.getElementById("clamp-toggle");
const clampSlider = document.getElementById("clamp-slider");
const clampVal = document.getElementById("clamp-val");
const wireframeToggle = document.getElementById("wireframe-toggle");

function currentRange() {
  return parseFloat(rangeSlider.value);
}
function currentResolution() {
  return parseInt(resSlider.value, 10);
}
function currentClamp() {
  return clampToggle.checked ? parseFloat(clampSlider.value) : 1000;
}

function rebuildAll() {
  const range = currentRange();
  const resolution = currentResolution();
  const clamp = currentClamp();
  const showWireframe = wireframeToggle.checked;

  rebuildAxes(range, clampToggle.checked ? parseFloat(clampSlider.value) : Math.max(10, parseFloat(clampSlider.value)));

  for (const eq of equations) {
    rebuildEquationMesh(eq, range, resolution, clamp, showWireframe);
  }
}

rangeSlider.addEventListener("input", () => {
  rangeVal.textContent = currentRange().toFixed(2);
  rebuildAll();
});
resSlider.addEventListener("input", () => {
  resVal.textContent = currentResolution();
  rebuildAll();
});
clampSlider.addEventListener("input", () => {
  clampVal.textContent = clampSlider.value;
  rebuildAll();
});
clampToggle.addEventListener("change", rebuildAll);
wireframeToggle.addEventListener("change", rebuildAll);

document.getElementById("add-eq").addEventListener("click", () => {
  addEquation("", true);
});
document.getElementById("reset-view").addEventListener("click", () => {
  defaultCameraPosition(currentRange(), currentClamp());
});

// ---------- init ----------
addEquation("sin(A+B)", true);
addEquation("cos(A+B)", true);
addEquation("tan(A+B)", false);
addEquation("tan(cosA+sinB)", false);

resize();
defaultCameraPosition(currentRange(), currentClamp());
rebuildAll();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
