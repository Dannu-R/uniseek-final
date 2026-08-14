// @ts-nocheck
"use client";

// A still 3D campus building for "Student life" — chunky, matte, self-lit, in the
// section's blue. Renders once and holds (frameloop="demand").

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";

const mat = (color, roughness = 0.85, metalness = 0) => ({ color, roughness, metalness });
const BLUE = mat("#2f6bed");
const BLUE_DK = mat("#1c46b0");
const WIN = mat("#dce9ff", 0.6);
const DOOR = mat("#16307a");
const GOLD = mat("#f4c73f", 0.5, 0.1);
const VIOLET = mat("#7c4ff0", 0.7);

function Windows() {
  const cols = [-0.32, 0, 0.32];
  const rows = [0.42, 0.02];
  const out = [];
  rows.forEach((y, ri) =>
    cols.forEach((x, ci) =>
      out.push(
        <mesh key={`${ri}-${ci}`} position={[x, y, 0.64]}>
          <boxGeometry args={[0.22, 0.26, 0.05]} />
          <meshStandardMaterial {...WIN} />
        </mesh>
      )
    )
  );
  return <>{out}</>;
}

function BuildingModel() {
  return (
    <group rotation={[-0.06, -0.5, 0]} position={[0, -0.05, 0]}>
      {/* body */}
      <mesh>
        <boxGeometry args={[1.25, 1.7, 1.25]} />
        <meshStandardMaterial {...BLUE} />
      </mesh>
      {/* roof slab + base */}
      <mesh position={[0, 0.93, 0]}>
        <boxGeometry args={[1.42, 0.18, 1.42]} />
        <meshStandardMaterial {...BLUE_DK} />
      </mesh>
      <mesh position={[0, -0.9, 0]}>
        <boxGeometry args={[1.42, 0.16, 1.42]} />
        <meshStandardMaterial {...BLUE_DK} />
      </mesh>
      <Windows />
      {/* door */}
      <mesh position={[0, -0.56, 0.64]}>
        <boxGeometry args={[0.3, 0.46, 0.06]} />
        <meshStandardMaterial {...DOOR} />
      </mesh>
      {/* flagpole + flag on the roof */}
      <mesh position={[0.42, 1.4, 0.2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.72, 12]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0.57, 1.56, 0.2]}>
        <boxGeometry args={[0.3, 0.2, 0.02]} />
        <meshStandardMaterial {...VIOLET} />
      </mesh>
    </group>
  );
}

export default function BuildingScene({ className = "ex-3d" }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 42 }}
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 5]} intensity={1.7} color="#fff" />
        <directionalLight position={[-4, -1, 2]} intensity={0.7} color="#bcd4ff" />
        {/* rim light from behind for a bright edge */}
        <directionalLight position={[-2, 4, -5]} intensity={1.1} color="#9ec2ff" />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[3, 3, 4]} scale={7} color="#ffffff" />
          <Lightformer form="rect" intensity={1.2} position={[-4, 1, 2]} scale={6} color="#cfe0ff" />
          <Lightformer form="circle" intensity={1.4} position={[0, -3, 3]} scale={5} color="#ffffff" />
        </Environment>
        <ContactShadows position={[0, -1.05, 0]} opacity={0.4} scale={6} blur={2.4} far={3} color="#0c1f52" />
        <BuildingModel />
      </Canvas>
    </div>
  );
}
