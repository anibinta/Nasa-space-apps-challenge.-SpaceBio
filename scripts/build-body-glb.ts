import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Minimal polyfill for GLTFExporter binary export in Node.js
if (typeof globalThis.FileReader === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).FileReader = class {
    onloadend: (() => void) | null = null;
    result: ArrayBuffer | null = null;
    readAsArrayBuffer(blob: Blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.();
      });
    }
  };
}

function normalizeGeo(geo: THREE.BufferGeometry, matrix?: THREE.Matrix4): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (matrix) g.applyMatrix4(matrix);
  if (!g.attributes.normal) g.computeVertexNormals();
  for (const key of Object.keys(g.attributes)) {
    if (key !== 'position' && key !== 'normal') {
      g.deleteAttribute(key);
    }
  }
  return g;
}

function makePart(
  geo: THREE.BufferGeometry,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1]
): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  m.compose(new THREE.Vector3(...pos), q, new THREE.Vector3(...scale));
  return normalizeGeo(geo, m);
}

function buildGroup(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'SpaceBioHuman';

  // 1. head
  const headParts = [
    makePart(new THREE.SphereGeometry(0.112, 24, 18), [0, 1.67, 0.01], [0, 0, 0], [0.92, 1.12, 1.0]),
    makePart(new THREE.SphereGeometry(0.072, 16, 12), [0, 1.60, 0.042], [0, 0, 0], [0.84, 0.72, 0.8]),
  ];
  const headMesh = new THREE.Mesh(
    mergeGeometries(headParts),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.42, metalness: 0.15 })
  );
  headMesh.name = 'head';
  root.add(headMesh);

  // 2. neck
  const neckParts = [
    makePart(new THREE.CylinderGeometry(0.054, 0.066, 0.12, 18), [0, 1.525, -0.004]),
  ];
  const neckMesh = new THREE.Mesh(
    mergeGeometries(neckParts),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.44, metalness: 0.14 })
  );
  neckMesh.name = 'neck';
  root.add(neckMesh);

  // 3. chest
  const chestProfile = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.145, 0.02),
    new THREE.Vector2(0.17, 0.14),
    new THREE.Vector2(0.195, 0.28),
    new THREE.Vector2(0.15, 0.36),
    new THREE.Vector2(0.065, 0.39),
    new THREE.Vector2(0.01, 0.395),
  ];
  const chestParts = [
    makePart(new THREE.LatheGeometry(chestProfile, 24), [0, 1.11, 0], [0, 0, 0], [1.14, 1, 0.72]),
    makePart(new THREE.SphereGeometry(0.075, 16, 12), [-0.215, 1.41, 0], [0, 0, 0], [1, 0.9, 0.9]),
    makePart(new THREE.SphereGeometry(0.075, 16, 12), [0.215, 1.41, 0], [0, 0, 0], [1, 0.9, 0.9]),
  ];
  const chestMesh = new THREE.Mesh(
    mergeGeometries(chestParts),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.4, metalness: 0.18 })
  );
  chestMesh.name = 'chest';
  root.add(chestMesh);

  // 4. abdomen
  const abProfile = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.155, 0.02),
    new THREE.Vector2(0.148, 0.12),
    new THREE.Vector2(0.156, 0.22),
    new THREE.Vector2(0.01, 0.23),
  ];
  const abdomenParts = [
    makePart(new THREE.LatheGeometry(abProfile, 24), [0, 0.91, 0], [0, 0, 0], [1.10, 1, 0.72]),
  ];
  const abdomenMesh = new THREE.Mesh(
    mergeGeometries(abdomenParts),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.48, metalness: 0.12 })
  );
  abdomenMesh.name = 'abdomen';
  root.add(abdomenMesh);

  // 5. pelvis
  const pelvisProfile = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.152, 0.03),
    new THREE.Vector2(0.172, 0.09),
    new THREE.Vector2(0.158, 0.14),
    new THREE.Vector2(0.01, 0.15),
  ];
  const pelvisParts = [
    makePart(new THREE.LatheGeometry(pelvisProfile, 24), [0, 0.77, 0], [0, 0, 0], [1.14, 1, 0.74]),
  ];
  const pelvisMesh = new THREE.Mesh(
    mergeGeometries(pelvisParts),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.46, metalness: 0.14 })
  );
  pelvisMesh.name = 'pelvis';
  root.add(pelvisMesh);

  // 6 & 7. leftArm (anatomical left = +X) and rightArm (anatomical right = -X)
  const buildArm = (side: 1 | -1, name: 'leftArm' | 'rightArm') => {
    const parts = [
      makePart(new THREE.CapsuleGeometry(0.048, 0.23, 8, 16), [side * 0.245, 1.24, 0], [0, 0, side * -0.1]),
      makePart(new THREE.SphereGeometry(0.044, 14, 12), [side * 0.265, 1.09, 0]),
      makePart(new THREE.CapsuleGeometry(0.039, 0.22, 8, 16), [side * 0.285, 0.94, 0.02], [-0.12, 0, side * -0.06]),
      makePart(new THREE.SphereGeometry(0.042, 14, 12), [side * 0.30, 0.77, 0.045], [0, 0, 0], [0.72, 1.25, 0.55]),
    ];
    const mesh = new THREE.Mesh(
      mergeGeometries(parts),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.45, metalness: 0.14 })
    );
    mesh.name = name;
    return mesh;
  };
  root.add(buildArm(1, 'leftArm'));
  root.add(buildArm(-1, 'rightArm'));

  // 8 & 9. leftLeg (anatomical left = +X) and rightLeg (anatomical right = -X)
  const buildLeg = (side: 1 | -1, name: 'leftLeg' | 'rightLeg') => {
    const parts = [
      makePart(new THREE.SphereGeometry(0.072, 16, 12), [side * 0.102, 0.78, 0]),
      makePart(new THREE.CapsuleGeometry(0.068, 0.32, 8, 16), [side * 0.108, 0.57, 0], [0, 0, side * 0.03]),
      makePart(new THREE.SphereGeometry(0.055, 14, 12), [side * 0.114, 0.38, 0.008]),
      makePart(new THREE.CapsuleGeometry(0.048, 0.30, 8, 16), [side * 0.115, 0.20, -0.005]),
      makePart(new THREE.BoxGeometry(0.088, 0.045, 0.19), [side * 0.115, 0.023, 0.045]),
    ];
    const mesh = new THREE.Mesh(
      mergeGeometries(parts),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.46, metalness: 0.14 })
    );
    mesh.name = name;
    return mesh;
  };
  root.add(buildLeg(1, 'leftLeg'));
  root.add(buildLeg(-1, 'rightLeg'));

  // 10. spine
  const spineParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const y = 0.86 + t * 0.63;
    const z = -0.065 + Math.sin(t * Math.PI * 1.6) * 0.018;
    const r = 0.027 - t * 0.008;
    spineParts.push(makePart(new THREE.CylinderGeometry(r, r * 1.05, 0.026, 12), [0, y, z]));
  }
  const spineMesh = new THREE.Mesh(
    mergeGeometries(spineParts),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.25 })
  );
  spineMesh.name = 'spine';
  root.add(spineMesh);

  // 11. skeleton overlay (hidden by default in viewer until bone markers selected)
  const skelParts: THREE.BufferGeometry[] = [];
  for (let r = 0; r < 6; r++) {
    const y = 1.18 + r * 0.042;
    const radius = 0.115 + Math.sin((r / 5) * Math.PI) * 0.025;
    skelParts.push(
      makePart(new THREE.TorusGeometry(radius, 0.008, 8, 22), [0, y, 0.0], [Math.PI / 2, 0, 0], [1.05, 0.65, 1])
    );
  }
  skelParts.push(makePart(new THREE.CylinderGeometry(0.011, 0.009, 0.22, 8), [0, 1.31, 0.088]));
  skelParts.push(makePart(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 8), [0, 1.43, 0.035], [0, 0, Math.PI / 2]));
  skelParts.push(makePart(new THREE.TorusGeometry(0.115, 0.014, 10, 20), [0, 0.83, 0], [Math.PI / 2, 0, 0], [1.1, 0.68, 1]));
  for (const side of [-1, 1]) {
    skelParts.push(
      makePart(new THREE.CylinderGeometry(0.016, 0.014, 0.38, 10), [side * 0.108, 0.58, 0]),
      makePart(new THREE.CylinderGeometry(0.014, 0.011, 0.34, 10), [side * 0.114, 0.21, 0]),
      makePart(new THREE.CylinderGeometry(0.012, 0.010, 0.26, 10), [side * 0.245, 1.24, 0], [0, 0, side * -0.1]),
      makePart(new THREE.CylinderGeometry(0.010, 0.008, 0.24, 10), [side * 0.285, 0.94, 0.02], [-0.12, 0, side * -0.06])
    );
  }
  const skeletonMesh = new THREE.Mesh(
    mergeGeometries(skelParts),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.32, metalness: 0.22 })
  );
  skeletonMesh.name = 'skeleton';
  root.add(skeletonMesh);

  return root;
}

async function run() {
  const group = buildGroup();
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(group, { binary: true });
  const outDir = path.resolve(process.cwd(), 'public/models');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'body.glb');
  fs.writeFileSync(outPath, Buffer.from(glb as ArrayBuffer));
  const stats = fs.statSync(outPath);
  console.log(`Generated ${outPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
