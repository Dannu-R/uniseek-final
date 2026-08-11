// @ts-nocheck
"use client";

// The hero's "clouds": Uniseek's own objects drifting around the headline.
//
// One Canvas for all of them, not one per object. Each 3D component in this project owns
// its own Canvas, which is right when it's the only thing on screen — but five of those
// here would mean five WebGL contexts, five render loops and five copies of the lighting
// rig for a piece of decoration. The bodies are imported and composed into a single
// scene instead.
//
// Everything sits on the outer thirds. The middle of the hero belongs to the headline
// and the product shot, so the objects frame that column rather than crossing it.

import { Canvas } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import { CoinBody } from "../3d/Coin";
import { Glass } from "../3d/MagnifyingGlass";
import { PuzzleModel } from "../3d/PuzzlePiece";

// A mortarboard, written here rather than pulled out of StudentFigure: the figure's cap
// is sized and tilted to sit on a head, and what this needs is the object on its own.
function Mortarboard() {
  const CLOTH = "#241a3f";
  const TASSEL = "#e8b53a";
  return (
    <group rotation={[0.35, 0.5, 0.12]}>
      {/* crown */}
      <mesh position={[0, -0.28, 0]}>
        <sphereGeometry args={[0.62, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
        <meshStandardMaterial color={CLOTH} roughness={0.55} metalness={0.08} />
      </mesh>
      {/* board, turned 45° so a corner leads */}
      <mesh position={[0, 0.12, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1.5, 0.09, 1.5]} />
        <meshStandardMaterial color={CLOTH} roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.07, 16]} />
        <meshStandardMaterial color={TASSEL} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* tassel, hanging off the near corner */}
      <mesh position={[0.86, 0.14, 0]}>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshStandardMaterial color={TASSEL} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0.86, -0.12, 0]}>
        <capsuleGeometry args={[0.075, 0.3, 6, 16]} />
        <meshStandardMaterial color={TASSEL} roughness={0.45} metalness={0.15} />
      </mesh>
    </group>
  );
}

// Position, scale and drift per object. Kept as data so the arrangement can be read at a
// glance — this is a composition, and it's easier to judge as a list than as JSX.
// The canvas is a wide, short band across the headline, so there's a lot of horizontal
// room and very little vertical. x must stay past ±6.5 — inside that the objects start
// crowding the words.
const OBJECTS = [
  { key: "cap", node: <Mortarboard />, pos: [-8.3, 1.7, 0], scale: 0.72, speed: 1.1, rot: 0.35 },
  { key: "puzzle", node: <PuzzleModel />, pos: [8.4, 2.0, -1], scale: 0.55, speed: 1.4, rot: 0.5 },
  { key: "coin", node: <CoinBody />, pos: [-10.4, -1.7, -1.5], scale: 0.6, speed: 1.6, rot: 0.4 },
  { key: "glass", node: <Glass />, pos: [10.2, -1.5, -0.5], scale: 0.42, speed: 1.2, rot: 0.3 },
];

export default function HeroObjects() {
  // WebGL only after mount (no SSR window access), and never for a visitor who has asked
  // for less motion — this whole layer is movement and nothing else.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShow(!reduced);
  }, []);

  if (!show) return <div className="hx-objects" aria-hidden="true" />;

  return (
    <div className="hx-objects" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 12], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[5, 6, 6]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-6, 2, 3]} intensity={1.1} color="#c9b6ff" />
        <directionalLight position={[2, -5, 4]} intensity={0.8} color="#ffd9a8" />

        {/* The coin is metal and reads as a flat disc without something to reflect. */}
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={2} position={[4, 4, 5]} scale={8} color="#fff6e4" />
          <Lightformer form="rect" intensity={1.2} position={[-5, 1, 3]} scale={6} color="#e9e2ff" />
        </Environment>

        <Suspense fallback={null}>
          {OBJECTS.map((o) => (
            <group key={o.key} position={o.pos} scale={o.scale}>
              <Float speed={o.speed} rotationIntensity={o.rot} floatIntensity={0.9}>
                {o.node}
              </Float>
            </group>
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}
