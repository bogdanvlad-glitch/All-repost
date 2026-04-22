import * as THREE from 'https://unpkg.com/three@0.164.1/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.164.1/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'https://unpkg.com/three@0.164.1/examples/jsm/loaders/RGBELoader.js';

const canvas = document.getElementById('scene');
const loaderEl = document.getElementById('loader');
const featureCards = [...document.querySelectorAll('.feature')];
const stats = [...document.querySelectorAll('.stat__value')];

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x090a0e, 0.022);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(2.5, 1.2, 5.8);

scene.add(new THREE.AmbientLight(0xffffff, 0.24));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 8, 4);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8fa3ff, 0.7);
rimLight.position.set(-5, 3, -3);
scene.add(rimLight);

const redAccent = new THREE.PointLight(0xbf1f30, 3.2, 7);
redAccent.position.set(-2, 0.8, -1.5);
scene.add(redAccent);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(10, 64),
  new THREE.MeshStandardMaterial({ color: 0x0f121a, roughness: 0.8, metalness: 0.15 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.62;
scene.add(floor);

let carRoot = new THREE.Group();
scene.add(carRoot);

function createFallbackCar() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x9ea6b2,
    metalness: 0.85,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08
  });

  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 1.25, 8, 28), bodyMat);
  shell.rotation.z = Math.PI / 2;
  shell.scale.set(1.25, 0.45, 0.72);
  group.add(shell);

  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.56, 32, 24), bodyMat);
  cabin.scale.set(1.1, 0.58, 0.95);
  cabin.position.set(-0.1, 0.38, 0);
  group.add(cabin);

  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.47, 24, 20),
    new THREE.MeshPhysicalMaterial({ color: 0x181c24, transmission: 0.3, roughness: 0.08, metalness: 0.15 })
  );
  glass.scale.set(1.04, 0.48, 0.9);
  glass.position.set(-0.04, 0.43, 0);
  group.add(glass);

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111214, metalness: 0.3, roughness: 0.85 });
  [-0.95, 0.95].forEach((x) => {
    [-0.5, 0.5].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.09, 18, 36), wheelMat);
      wheel.position.set(x, -0.46, z);
      wheel.rotation.y = Math.PI / 2;
      group.add(wheel);
    });
  });

  group.rotation.y = -Math.PI / 6;
  group.position.y = -0.05;
  return group;
}

async function loadSceneModel() {
  try {
    const rgbe = new RGBELoader();
    const env = await rgbe.loadAsync('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr');
    env.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = env;
  } catch {
    // Keep fallback lighting only.
  }

  try {
    const model = await new GLTFLoader().loadAsync('./assets/models/porsche_911.glb');
    carRoot.add(model.scene);
    model.scene.scale.set(1.3, 1.3, 1.3);
  } catch {
    carRoot.add(createFallbackCar());
  }

  loaderEl.classList.add('hidden');
}

const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (event.clientY / window.innerHeight) * 2 - 1;
});

const focusMap = {
  front: { x: 2.25, y: 0.95, z: 4.5 },
  side: { x: 2.9, y: 1.1, z: 5.9 },
  rear: { x: -2.4, y: 1.0, z: 4.7 },
  cockpit: { x: 1.45, y: 1.5, z: 3.7 }
};

let cameraTarget = { ...focusMap.side };
featureCards.forEach((card) => {
  card.addEventListener('mouseenter', () => {
    featureCards.forEach((node) => node.classList.remove('active'));
    card.classList.add('active');
    cameraTarget = focusMap[card.dataset.focus] ?? focusMap.side;
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll('.reveal').forEach((node) => revealObserver.observe(node));

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.done) return;
      entry.target.dataset.done = 'true';
      animateCounter(entry.target);
    });
  },
  { threshold: 0.7 }
);

stats.forEach((stat) => counterObserver.observe(stat));

function animateCounter(node) {
  const target = Number(node.dataset.target);
  const isDecimal = target % 1 !== 0;
  const duration = 1200;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    node.textContent = isDecimal ? value.toFixed(1) : Math.round(value).toString();
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);

function animate() {
  requestAnimationFrame(animate);

  const scrollProgress = Math.min(window.scrollY / window.innerHeight, 1.3);
  const targetY = -0.35 * scrollProgress;
  carRoot.position.y += (targetY - carRoot.position.y) * 0.04;
  carRoot.rotation.y += 0.0035 + mouse.x * 0.0008;

  camera.position.x += (cameraTarget.x + mouse.x * 0.25 - camera.position.x) * 0.04;
  camera.position.y += (cameraTarget.y + -mouse.y * 0.18 - camera.position.y) * 0.04;
  camera.position.z += (cameraTarget.z - camera.position.z) * 0.04;

  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  animate();
} else {
  renderer.render(scene, camera);
  loaderEl.classList.add('hidden');
}

if (!window.WebGLRenderingContext) {
  loaderEl.querySelector('p').textContent = 'WebGL unavailable. Displaying static premium layout.';
  loaderEl.classList.add('hidden');
} else {
  loadSceneModel();
}
