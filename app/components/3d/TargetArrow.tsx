// @ts-nocheck
"use client";

// A still 3D archery target — the visual thesis of "Why this fits you": hitting the mark.
// Built from r3f primitives, matte and self-lit like the Coin. Renders once and holds
// (frameloop="demand"), so it sits still and costs nothing after the first frame.

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";

const mat = (color, roughness = 0.85, metalness = 0) => ({ color, roughness, metalness });
const V_DEEP = mat("#4a24c4");
const V_MID = mat("#7c4ff0");
const LAV = mat("#efe9ff", 0.9);
const PINK = mat("#e8407f", 0.7);
const GOLD_DARK = mat("#a9781a", 0.6, 0.1);

// Concentric rings, largest → bullseye. Each sits a touch further forward so the board
// reads as raised bands rather than a flat print.
const RINGS = [
  [1.0, 0.0, V_DEEP],
  [0.8, 0.05, LAV],
  [0.6, 0.1, V_MID],
  [0.4, 0.15, LAV],
  [0.22, 0.2, PINK],
];

function Board() {
  return (
    <group rotation={[-0.18, -0.45, 0]}>
      {RINGS.map(([r, z, m], i) => (
        <mesh key={i} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r, r, 0.12, 64]} />
          <meshStandardMaterial {...m} />
        </mesh>
      ))}
    </group>
  );
}

// Rendered client-only by the caller (dynamic import, ssr: false), so no mount gate is
// needed — this only ever runs in the browser.
export default function TargetScene({ className = "ex-3d" }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.3], fov: 42 }}
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 5, 5]} intensity={1.7} color="#fff" />
        <directionalLight position={[-4, -1, 2]} intensity={0.7} color="#d9c8ff" />
        {/* rim light from behind for a bright edge */}
        <directionalLight position={[-2, 4, -5]} intensity={1.2} color="#c9b3ff" />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[3, 3, 4]} scale={7} color="#ffffff" />
          <Lightformer form="rect" intensity={1.2} position={[-4, 1, 2]} scale={6} color="#e8dcff" />
          <Lightformer form="circle" intensity={1.4} position={[0, -3, 3]} scale={5} color="#ffffff" />
        </Environment>
        <ContactShadows position={[0, -1.5, 0]} opacity={0.38} scale={6} blur={2.6} far={3.2} color="#160a34" />
        <Board />
      </Canvas>
    </div>
  );
}
