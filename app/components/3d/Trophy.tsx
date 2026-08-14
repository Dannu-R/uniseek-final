// @ts-nocheck
"use client";

// A still 3D trophy for "Extracurricular fit" — achievements. Gold cup on a dark plinth,
// grounded with a contact shadow and lit with a key + fill + rim for real form.

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";

const mat = (color, roughness = 0.4, metalness = 0.25) => ({ color, roughness, metalness });
const GOLD = mat("#f4c73f", 0.35, 0.35);
const GOLD_DARK = mat("#a9781a", 0.5, 0.3);
const PLINTH = mat("#241452", 0.7, 0);

function TrophyModel() {
  return (
    <group rotation={[-0.04, -0.15, 0]} position={[0, -0.15, 0]}>
      {/* cup bowl — a frustum, wider at the top */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.36, 0.85, 44]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {/* rim */}
      <mesh position={[0, 1.14, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.6, 0.06, 18, 48]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {/* handles */}
      <mesh position={[-0.63, 0.86, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.24, 0.055, 14, 32, Math.PI]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0.63, 0.86, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <torusGeometry args={[0.24, 0.055, 14, 32, Math.PI]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      {/* stem */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 0.36, 20]} />
        <meshStandardMaterial {...GOLD_DARK} />
      </mesh>
      {/* plinth */}
      <mesh position={[0, -0.12, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.14, 32]} />
        <meshStandardMaterial {...PLINTH} />
      </mesh>
      <mesh position={[0, -0.26, 0]} castShadow>
        <boxGeometry args={[0.72, 0.16, 0.72]} />
        <meshStandardMaterial {...PLINTH} />
      </mesh>
      {/* a little "1" plate on the cup */}
      <mesh position={[0, 0.72, 0.46]}>
        <boxGeometry args={[0.34, 0.24, 0.03]} />
        <meshStandardMaterial {...GOLD_DARK} />
      </mesh>
    </group>
  );
}

export default function TrophyScene({ className = "ex-3d" }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 4.6], fov: 42 }} dpr={[1, 2]} frameloop="demand" gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 5]} intensity={1.8} color="#fff6df" />
        <directionalLight position={[-4, -1, 2]} intensity={0.7} color="#ffe6b0" />
        {/* rim light from behind for a bright edge */}
        <directionalLight position={[-2, 4, -5]} intensity={1.2} color="#cbb6ff" />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.4} position={[3, 3, 4]} scale={7} color="#fff7e0" />
          <Lightformer form="rect" intensity={1.4} position={[-4, 1, 2]} scale={6} color="#ffd98a" />
          <Lightformer form="circle" intensity={1.6} position={[0, -3, 3]} scale={5} color="#ffffff" />
        </Environment>
        <ContactShadows position={[0, -1.35, 0]} opacity={0.42} scale={6} blur={2.6} far={3.2} color="#160a34" />
        <TrophyModel />
      </Canvas>
    </div>
  );
}
