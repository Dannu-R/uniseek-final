// @ts-nocheck
"use client";

// A still 3D magnifying glass for "Things to consider" — the closer look. Gold rim and
// handle, a faint violet lens. Renders once and holds (frameloop="demand").

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";

const mat = (color, roughness = 0.85, metalness = 0) => ({ color, roughness, metalness });
const GOLD = mat("#f4c73f", 0.45, 0.15);
const GOLD_DARK = mat("#a9781a", 0.55, 0.15);

function MagnifierModel() {
  return (
    <group rotation={[-0.1, -0.15, 0.25]} position={[-0.1, 0.15, 0]}>
      {/* rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.1, 20, 56]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {/* lens — faint tinted glass */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.05, 44]} />
        <meshStandardMaterial color="#cfc0ff" roughness={0.2} metalness={0} transparent opacity={0.5} />
      </mesh>
      {/* handle, angled off the lower-right of the rim */}
      <group position={[0.5, -0.5, 0]} rotation={[0, 0, -0.78]}>
        <mesh position={[0, -0.32, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.85, 20]} />
          <meshStandardMaterial {...GOLD_DARK} />
        </mesh>
        <mesh position={[0, -0.8, 0]}>
          <sphereGeometry args={[0.14, 20, 20]} />
          <meshStandardMaterial {...GOLD_DARK} />
        </mesh>
      </group>
    </group>
  );
}

export default function MagnifierScene({ className = "ex-3d" }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.4], fov: 42 }}
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 5]} intensity={1.9} color="#fff6df" />
        <directionalLight position={[-4, -1, 2]} intensity={0.7} color="#ffe6b0" />
        {/* rim light from behind for a bright edge */}
        <directionalLight position={[-2, 4, -5]} intensity={1.2} color="#ffdf9e" />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.2} position={[3, 3, 4]} scale={7} color="#fff7e0" />
          <Lightformer form="rect" intensity={1.3} position={[-4, 1, 2]} scale={6} color="#ffd98a" />
          <Lightformer form="circle" intensity={1.5} position={[0, -3, 3]} scale={5} color="#ffffff" />
        </Environment>
        <ContactShadows position={[0, -1.4, 0]} opacity={0.35} scale={6} blur={2.6} far={3.2} color="#050c1e" />
        <MagnifierModel />
      </Canvas>
    </div>
  );
}
