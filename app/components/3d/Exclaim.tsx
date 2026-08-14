// @ts-nocheck
"use client";

// A still 3D exclamation mark for "Things to consider" — a heads-up. Amber, grounded with
// a contact shadow and lit with key + fill + rim. Renders once and holds.

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";

const mat = (color, roughness = 0.4, metalness = 0.15) => ({ color, roughness, metalness });
const AMBER = mat("#f6b83d", 0.38, 0.18);

function ExclaimModel() {
  return (
    <group rotation={[-0.08, -0.22, 0.06]} position={[0, 0.05, 0]}>
      {/* stem — a tapered bar, rounded at the top */}
      <mesh position={[0, 0.42, 0]}>
        <capsuleGeometry args={[0.18, 0.82, 14, 28]} />
        <meshStandardMaterial {...AMBER} />
      </mesh>
      {/* dot */}
      <mesh position={[0, -0.62, 0]}>
        <sphereGeometry args={[0.2, 28, 28]} />
        <meshStandardMaterial {...AMBER} />
      </mesh>
    </group>
  );
}

export default function ExclaimScene({ className = "ex-3d" }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 4.4], fov: 42 }} dpr={[1, 2]} frameloop="demand" gl={{ antialias: true, alpha: true }}>
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
        <ContactShadows position={[0, -1.15, 0]} opacity={0.36} scale={5.5} blur={2.6} far={3} color="#050c1e" />
        <ExclaimModel />
      </Canvas>
    </div>
  );
}
