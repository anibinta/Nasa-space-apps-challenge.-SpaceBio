import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from '../../i18n';
import type { BodyRegionId, BodyRegionInfo, StatusLevel } from '../../types/health';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/input';

const STATUS_HEX: Record<StatusLevel, number> = {
  nominal: 0x10b981,
  watch: 0xf59e0b,
  alert: 0xf43f5e,
};

// Exact whitelisted mesh names from /public/models/body.glb; any other mesh is ignored.
const VALID_REGION_IDS: readonly BodyRegionId[] = [
  'head',
  'neck',
  'chest',
  'abdomen',
  'pelvis',
  'leftArm',
  'rightArm',
  'leftLeg',
  'rightLeg',
  'spine',
  'skeleton',
];

function isValidRegionId(name: string): name is BodyRegionId {
  return (VALID_REGION_IDS as readonly string[]).includes(name);
}

export function detectSoftwareWebGL(): { supported: boolean; isSoftwareGl: boolean } {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return { supported: false, isSoftwareGl: true };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

const StudioEnvironment: React.FC = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = new RoomEnvironment();
    const rt = pmrem.fromScene(env, 0.04);
    scene.environment = rt.texture;
    env.dispose();
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
};

const AstronautBodyModel: React.FC<{
  regions: BodyRegionInfo[];
  selectedRegion: BodyRegionId;
  showSkeletonOverlay: boolean;
  highlightBoneRegions: boolean;
  onSelectRegion: (id: BodyRegionId) => void;
}> = ({
  regions,
  selectedRegion,
  showSkeletonOverlay,
  highlightBoneRegions,
  onSelectRegion,
}) => {
  const { scene } = useGLTF('/models/body.glb');
  const { invalidate } = useThree();
  const [hoveredId, setHoveredId] = useState<BodyRegionId | null>(null);

  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const regionMap = useMemo(() => {
    const map = new Map<BodyRegionId, BodyRegionInfo>();
    regions.forEach((r) => map.set(r.id, r));
    return map;
  }, [regions]);

  useEffect(() => {
    clonedScene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!isValidRegionId(obj.name)) {
        // Ignore any mesh not in the exact whitelisted 10-part + skeleton set
        obj.visible = false;
        return;
      }

      const name = obj.name;
      const info = regionMap.get(name);
      const isSkeletonMesh = name === 'skeleton';
      if (isSkeletonMesh) {
        // Hidden by default; revealed only when bone markers or skeleton overlay is selected
        obj.visible = showSkeletonOverlay || selectedRegion === 'skeleton' || highlightBoneRegions;
      } else {
        obj.visible = true;
      }

      const isSelected = selectedRegion === name;
      const isHovered = hoveredId === name;
      const isBoneFocus = highlightBoneRegions && info?.boneRelated;

      const baseColor = info ? STATUS_HEX[info.status] : 0x38bdf8;
      const xrayMode =
        showSkeletonOverlay ||
        selectedRegion === 'spine' ||
        selectedRegion === 'skeleton' ||
        highlightBoneRegions;
      const isOuterTorso = name === 'chest' || name === 'abdomen' || name === 'pelvis';
      const mat = new THREE.MeshStandardMaterial({
        color: isSkeletonMesh && !isSelected ? 0xe2e8f0 : baseColor,
        roughness: isSkeletonMesh || name === 'spine' ? 0.32 : 0.45,
        metalness: isSkeletonMesh || name === 'spine' ? 0.25 : 0.14,
        transparent: !isSkeletonMesh && xrayMode && (isOuterTorso || name !== 'spine'),
        opacity:
          !isSkeletonMesh && xrayMode && name !== 'spine'
            ? isOuterTorso
              ? 0.42
              : 0.65
            : 1.0,
        emissive: new THREE.Color(isSelected || isBoneFocus ? baseColor : isHovered ? 0x22d3ee : 0x000000),
        emissiveIntensity: isSelected ? 0.55 : isBoneFocus ? 0.3 : isHovered ? 0.22 : 0,
      });

      if (obj.material instanceof THREE.Material) {
        obj.material.dispose();
      }
      obj.material = mat;
    });
    invalidate();
  }, [
    clonedScene,
    regionMap,
    selectedRegion,
    hoveredId,
    showSkeletonOverlay,
    highlightBoneRegions,
    invalidate,
  ]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isValidRegionId(e.object.name)) {
      onSelectRegion(e.object.name);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (isValidRegionId(e.object.name)) {
      setHoveredId(e.object.name);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHoveredId(null);
    document.body.style.cursor = 'auto';
  };

  return (
    <group position={[0, -0.84, 0]}>
      <primitive
        object={clonedScene}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.42, 0.46, 48]} />
        <meshBasicMaterial color={0x06b6d4} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const BodyScene3D: React.FC<{
  regions: BodyRegionInfo[];
  selectedRegion: BodyRegionId;
  showSkeletonOverlay: boolean;
  highlightBoneRegions?: boolean;
  onSelectRegion: (id: BodyRegionId) => void;
  onContextLostFallback: () => void;
  isSoftwareGl: boolean;
}> = ({
  regions,
  selectedRegion,
  showSkeletonOverlay,
  highlightBoneRegions = false,
  onSelectRegion,
  onContextLostFallback,
  isSoftwareGl,
}) => {
  const { t } = useTranslation();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [modelReady, setModelReady] = useState(false);

  const handleResetCamera = () => {
    if (!controlsRef.current) return;
    controlsRef.current.object.position.set(0, 0.14, 3.05);
    controlsRef.current.target.set(0, 0.05, 0);
    controlsRef.current.update();
  };

  return (
    <div
      data-testid="body-3d-viewport"
      className="relative h-[440px] sm:h-[520px] w-full overflow-hidden rounded-xl border border-slate-200/80 bg-[#070d1f] dark:border-slate-800"
    >
      {!modelReady && (
        <div
          aria-label={t('common.loading')}
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#070d1f]/90 p-6"
        >
          <Skeleton className="h-64 w-32 rounded-2xl bg-slate-800" />
          <span className="text-xs font-mono-tabular text-slate-400">
            {t('common.loading')}
          </span>
        </div>
      )}

      <Canvas
        frameloop="demand"
        dpr={isSoftwareGl ? 1 : [1, 2]}
        camera={{ position: [0, 0.14, 3.05], fov: 42, near: 0.1, far: 40 }}
        gl={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        onCreated={({ gl }) => {
          setModelReady(true);
          gl.domElement.addEventListener('webglcontextlost', (ev) => {
            ev.preventDefault();
            onContextLostFallback();
          });
        }}
      >
        <color attach="background" args={['#070d1f']} />
        <fog attach="fog" args={['#070d1f', 6, 16]} />
        {!isSoftwareGl && <StudioEnvironment />}
        <hemisphereLight args={[0xbae6fd, 0x0f172a, isSoftwareGl ? 1.1 : 0.65]} />
        <directionalLight position={[2.5, 4, 3]} intensity={1.35} color={0xfff7ed} />
        <directionalLight position={[-2.5, 2, -2.5]} intensity={0.75} color={0x38bdf8} />

        <Suspense fallback={null}>
          <AstronautBodyModel
            regions={regions}
            selectedRegion={selectedRegion}
            showSkeletonOverlay={showSkeletonOverlay}
            highlightBoneRegions={highlightBoneRegions}
            onSelectRegion={onSelectRegion}
          />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enableDamping={!isSoftwareGl}
          dampingFactor={0.08}
          enablePan={false}
          minDistance={1.3}
          maxDistance={4.2}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI - 0.3}
        />
      </Canvas>

      <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-950/90 px-3 py-2 text-xs text-slate-200">
        <span className="text-slate-300">{t('bodyMap.controls.rotateHint')}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetCamera}
          className="border-slate-700 text-slate-100 hover:bg-slate-800"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('bodyMap.controls.resetView')}</span>
        </Button>
      </div>
    </div>
  );
};

useGLTF.preload('/models/body.glb');
