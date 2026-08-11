// @ts-nocheck
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

// Exported for the landing hero's shared scene — see HeroObjects.
export function Glass() {
  const spinner = useRef();

  // spin around its own long axis — the line runs straight down the handle
  useFrame((_, delta) => {
    if (spinner.current) spinner.current.rotation.y += delta * 0.6;
  });

  return (
    // static tilt of the whole tool, leaning left (~23°)
    <group rotation={[0, 0, 0.4]}>
      {/* the spin axis (local Y) passes straight through the handle */}
      <group ref={spinner}>
        {/* recenter vertically so the handle never clips out of frame */}
        <group position={[0, 0.98, 0]}>
          {/* metal rim */}
          <mesh>
            <torusGeometry args={[1, 0.11, 40, 120]} />
            <meshStandardMaterial
              color="#b9a7ff"
              metalness={0.95}
              roughness={0.18}
            />
          </mesh>

          {/* glass lens */}
          <mesh>
            <circleGeometry args={[0.94, 72]} />
            <meshPhysicalMaterial
              color="#ddd6fe"
              transmission={1}
              thickness={0.4}
              roughness={0.04}
              ior={1.45}
              transparent
              opacity={0.55}
              metalness={0}
            />
          </mesh>

          {/* rim → handle connector */}
          <mesh position={[0, -1.28, 0]}>
            <cylinderGeometry args={[0.11, 0.14, 0.42, 32]} />
            <meshStandardMaterial color="#8b5cf6" metalness={0.9} roughness={0.25} />
          </mesh>

          {/* handle */}
          <mesh position={[0, -2.15, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 1.4, 32]} />
            <meshStandardMaterial color="#6d28d9" metalness={0.9} roughness={0.28} />
          </mesh>

          {/* handle end cap */}
          <mesh position={[0, -2.9, 0]}>
            <sphereGeometry args={[0.16, 32, 32]} />
            <meshStandardMaterial color="#7c3aed" metalness={0.9} roughness={0.25} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function MagnifyingGlass() {
  // render the WebGL canvas only after mount (avoids SSR window access)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="magnifier" aria-hidden="true" />;

  return (
    <div className="magnifier" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        {/* soft white key, then Uniseek's colors washing the metal */}
        <directionalLight position={[4, 5, 5]} intensity={1.4} />
        <directionalLight position={[-5, -2, -3]} intensity={2.4} color="#ec4899" />
        <directionalLight position={[-3, 4, -2]} intensity={2} color="#8b5cf6" />
        <directionalLight position={[3, -4, 2]} intensity={1.8} color="#3b82f6" />

        <Float speed={1.6} rotationIntensity={0.15} floatIntensity={0.4}>
          <Glass />
        </Float>
      </Canvas>
    </div>
  );
}
