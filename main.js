// KNOT — a scroll-driven study in tension.
//
// One glass torus knot, a camera that travels through real depth, and five
// short chapters. Three.js r180 (MIT), vendored. No textures, no model files:
// the object, the environment and the backdrop are all generated at runtime.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

// ── post: bloom over the highlights, then tone-map on the way out ──────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.8, 0.7);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ── a procedural environment ───────────────────────────────────────────
// A softbox strip rig painted into an equirectangular canvas, then prefiltered.
// It is the only light source, so the glass has something real to bend.
function makeEnvironment() {
  const w = 1024, h = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');

  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0.00, '#8fa6c8');
  sky.addColorStop(0.30, '#41536f');
  sky.addColorStop(0.55, '#1b2334');
  sky.addColorStop(0.78, '#0d1119');
  sky.addColorStop(1.00, '#070a10');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  const softbox = (x, y, sw, sh, colour, alpha) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, Math.max(sw, sh));
    rg.addColorStop(0, colour);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = alpha;
    g.fillStyle = rg;
    g.save();
    g.translate(x, y);
    g.scale(1, sh / sw);
    g.beginPath();
    g.arc(0, 0, sw, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.globalAlpha = 1;
  };

  // two long cool strips, one warm kick, a dim floor bounce
  softbox(w * 0.18, h * 0.16, 520, 150, '#ffffff', 1.0);
  softbox(w * 0.82, h * 0.12, 420, 120, '#f2f7ff', 1.0);
  softbox(w * 0.52, h * 0.30, 220, 44, '#ffd9b0', 0.6);
  softbox(w * 0.10, h * 0.55, 260, 40, '#9fc4ff', 0.5);
  softbox(w * 0.92, h * 0.60, 220, 36, '#ffc9a0', 0.4);
  softbox(w * 0.45, h * 0.90, 520, 90, '#33415c', 0.7);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = makeEnvironment();
scene.environment = pmrem.fromEquirectangular(envTex).texture;
envTex.dispose();
pmrem.dispose();

// ── backdrop ───────────────────────────────────────────────────────────
// A huge gradient plane far behind, so the glass has a world to refract.
{
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#546a92');
  grad.addColorStop(0.42, '#2b3a56');
  grad.addColorStop(0.75, '#131b29');
  grad.addColorStop(1, '#0a0e16');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 46),
    new THREE.MeshBasicMaterial({ map: tex, depthWrite: false })
  );
  bg.position.set(0, 0, -18);
  scene.add(bg);
}

// ── the knot ───────────────────────────────────────────────────────────
const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1, 0.32, 420, 64, 2, 3),
  new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.07,
    transmission: 0.92,
    thickness: 1.6,
    ior: 1.46,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.75,
    iridescenceIOR: 1.32,
    iridescenceThicknessRange: [120, 420],
    specularIntensity: 1.2,
    attenuationColor: new THREE.Color('#cfe4ff'),
    attenuationDistance: 2.6,
    envMapIntensity: 2.2,
  })
);
scene.add(knot);

// a small bright core, so there is something to look through
const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.42, 3),
  new THREE.MeshStandardMaterial({ color: 0x0a0f18, metalness: 1, roughness: 0.18, envMapIntensity: 1.6 })
);
scene.add(core);

// ── dust ───────────────────────────────────────────────────────────────
const dust = (() => {
  const N = 1100;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 4 + Math.random() * 9;
    const t = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.6;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(t);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x9fc4ff, size: 0.014, sizeAttenuation: true,
    transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const p = new THREE.Points(geo, mat);
  scene.add(p);
  return p;
})();

// a pool of light under the knot, so it sits in a space rather than floating
{
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(130,180,255,0.5)');
  rg.addColorStop(0.45, 'rgba(70,110,190,0.16)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 256, 256);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -1.8;
  scene.add(pool);
}

const key = new THREE.DirectionalLight(0xdfe9ff, 3.2);
key.position.set(3, 4, 5);
scene.add(key);
const rim = new THREE.PointLight(0xffc48a, 40, 40);
scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0d1420, 0.9));
rim.position.set(-4, -2, 3);
scene.add(rim);

// ── scroll + pointer state ─────────────────────────────────────────────
let target = window.scrollY;
let smooth = target;
let dragging = false;
let dragX = 0, dragY = 0;
let spinX = 0, spinY = 0, velX = 0, velY = 0;
let px = 0, py = 0;        // pointer, -1..1
let cpx = 0, cpy = 0;      // eased pointer

addEventListener('scroll', () => { target = window.scrollY; }, { passive: true });

if (!COARSE) {
  addEventListener('pointermove', (e) => {
    px = (e.clientX / innerWidth) * 2 - 1;
    py = (e.clientY / innerHeight) * 2 - 1;
    if (dragging) {
      velY += (e.clientX - dragX) * 0.00035;
      velX += (e.clientY - dragY) * 0.00035;
      dragX = e.clientX; dragY = e.clientY;
    }
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });
  addEventListener('pointerdown', (e) => {
    if (e.target.closest('#top, #hud, #cursor')) return;
    dragging = true; dragX = e.clientX; dragY = e.clientY;
    cursor.classList.add('hot');
  });
  addEventListener('pointerup', () => { dragging = false; cursor.classList.remove('hot'); });
  addEventListener('pointercancel', () => { dragging = false; cursor.classList.remove('hot'); });
}

// ── camera keyframes along the scroll ──────────────────────────────────
const KEYS = [
  { p: 0.00, pos: [0.0, 1.55, 7.6], look: [0, 0, 0] },
  { p: 0.22, pos: [2.9, 0.75, 4.9], look: [0, 0.05, 0] },
  { p: 0.46, pos: [1.5, -0.55, 2.7], look: [0, 0, 0] },
  { p: 0.68, pos: [0.15, 0.15, 1.28], look: [0, 0, 0] },
  { p: 0.84, pos: [-0.5, 0.5, 2.6], look: [0, 0, 0] },
  { p: 1.00, pos: [0.0, 0.0, 6.2], look: [0, 0, 0] },
];

const ease = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function cameraAt(p) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = ease(Math.max(0, Math.min(1, (p - a.p) / (b.p - a.p))));
  return { pos: lerpV(a.pos, b.pos, t), look: lerpV(a.look, b.look, t) };
}

// ── chapters ───────────────────────────────────────────────────────────
const chapters = [...document.querySelectorAll('.chapter')];
chapters.forEach((sec) => {
  sec.querySelectorAll('.line').forEach((line) => {
    const inner = document.createElement('span');
    inner.textContent = line.textContent;
    line.textContent = '';
    line.appendChild(inner);
  });
});
const idxEl = document.getElementById('idx');
const totalEl = document.getElementById('total');
const pctEl = document.getElementById('pct');
const barEl = document.getElementById('bar');
const hintEl = document.getElementById('hint');
totalEl.textContent = String(chapters.length).padStart(2, '0');
let activeChapter = -1;

function setChapter(i) {
  if (i === activeChapter) return;
  activeChapter = i;
  chapters.forEach((c, n) => c.classList.toggle('on', n === i));
  idxEl.textContent = String(i + 1).padStart(2, '0');
}

// ── grain + cursor ─────────────────────────────────────────────────────
const grain = document.getElementById('grain');
const gctx = grain.getContext('2d');
grain.width = 160; grain.height = 90;
let grainAt = 0;
function paintGrain(now) {
  if (now - grainAt < 90) return;
  grainAt = now;
  const img = gctx.createImageData(grain.width, grain.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  gctx.putImageData(img, 0, 0);
}
const cursor = document.getElementById('cursor');
const intro = document.getElementById('intro');
const outro = document.getElementById('outro');

// ── sizing ─────────────────────────────────────────────────────────────
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  composer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  composer.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ── loop ───────────────────────────────────────────────────────────────
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;

  // smooth scroll; under reduced motion, no lag
  const k = REDUCED ? 1 : 1 - Math.exp(-dt * 6.5);
  smooth += (target - smooth) * k;

  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const p = Math.max(0, Math.min(1, smooth / max));

  // camera
  const { pos, look } = cameraAt(p);
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.lookAt(look[0], look[1], look[2]);

  // object: a slow idle turn, plus whatever the visitor throws at it
  if (!REDUCED) {
    velX *= 0.94; velY *= 0.94;
    spinX += velX; spinY += velY;
    knot.rotation.x = spinX + p * 2.4;
    knot.rotation.y = spinY + p * 3.6 + now * 0.00006;
    core.rotation.x = -spinX * 0.4;
    core.rotation.y = -spinY * 0.4;
  } else {
    knot.rotation.x = p * 2.4;
    knot.rotation.y = p * 3.6;
  }
  knot.position.y = Math.sin(p * Math.PI * 2) * 0.08;

  // pointer parallax, eased
  const pk = 1 - Math.exp(-dt * 4);
  cpx += (px - cpx) * pk;
  cpy += (py - cpy) * pk;
  camera.position.x += cpx * 0.22;
  camera.position.y -= cpy * 0.16;

  dust.rotation.y = now * 0.000022 + p * 0.6;
  dust.rotation.x = p * 0.3;

  // the knot opens up as you arrive
  const s = lerp(0.86, 1.16, ease(p));
  knot.scale.setScalar(s);

  setChapter(p < 0.02 ? -1 : Math.min(chapters.length - 1, Math.floor(p * chapters.length)));
  pctEl.textContent = String(Math.round(p * 100)).padStart(3, '0');
  barEl.style.transform = `scaleX(${p})`;
  hintEl.classList.toggle('gone', p > 0.02);
  intro.classList.toggle('gone', p > 0.012);
  outro.classList.toggle('on', p > 0.962);
  document.getElementById('chapters').classList.toggle('dim', p > 0.955 || p < 0.02);

  if (!REDUCED) paintGrain(now);
  composer.render();
}

requestAnimationFrame(frame);
