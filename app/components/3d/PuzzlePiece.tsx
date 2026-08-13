// @ts-nocheck
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

// the Uniseek logo mark (same paths as the brand SVG)
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 53.54897 63.90451"><g transform="translate(-206.93265,-157.98483)"><path d="M220.40922,221.88934l-13.47657,-37.2094l27.26349,-9.87434l13.47657,37.2094z"/><path d="M247.36661,212.12256l-4.22689,-11.67064l13.11501,-4.75002l4.22689,11.67064z"/><path d="M238.2259,186.65474l-4.25975,-11.76135l13.11501,-4.75002l4.25975,11.76135z"/><path d="M217.29163,177.1945l-4.91598,-13.57324l15.56242,-5.63643l4.91598,13.57324z"/></g></svg>`;

// Extrudes the logo paths into a deep-blue 3D piece, then centers +
// normalizes it to ~2 units.
function PuzzleModel() {
  const object = useMemo(() => {
    const { paths } = new SVGLoader().parse(SVG);
    const mat = new THREE.MeshStandardMaterial({
      color: "#1e3a8a", // deep blue
      metalness: 0.4,
      roughness: 0.3,
    });

    const g = new THREE.Group();
    paths.forEach((p) => {
      SVGLoader.createShapes(p).forEach((shape) => {
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: 9,
          bevelEnabled: true,
          bevelThickness: 1.4,
          bevelSize: 1.1,
          bevelSegments: 2,
          steps: 1,
        });
        g.add(new THREE.Mesh(geo, mat));
      });
    });
    g.rotation.x = Math.PI; // SVG is y-down → flip upright

    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    g.position.sub(center); // center the content
    const wrap = new THREE.Group();
    wrap.add(g);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    wrap.scale.setScalar(2 / maxDim); // normalize to ~2 units
    return wrap;
  }, []);

  return <primitive object={object} />;
}

// entrance rig — matches the coin/glasses/book
const INTRO = 1.4;
const START_Y = -3.2;
const AMP = 0.18;
const FLOAT_SPEED = 1.7;
const SPIN_TURNS = 2;
const FINAL_ROT = [0.1, -0.5, 0];
const MODEL_SCALE = 1.35;

function PuzzleRig() {
  const root = useRef();
  const tilt = useRef();
  const tRef = useRef(0);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useFrame((_, delta) => {
    const el = root.current;
    const tg = tilt.current;
    if (!el || !tg) return;

    if (reduceRef.current) {
      el.position.y = 0;
      el.scale.setScalar(MODEL_SCALE);
      tg.rotation.set(FINAL_ROT[0], FINAL_ROT[1], FINAL_ROT[2]);
      return;
    }

    tRef.current += Math.min(delta, 0.05);
    const t = tRef.current;

    if (t < INTRO) {
      const p = t / INTRO;
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.position.y = START_Y + (AMP - START_Y) * e; // ends at the peak
      el.scale.setScalar(MODEL_SCALE * (0.15 + 0.85 * e));
      tg.rotation.set(
        FINAL_ROT[0],
        FINAL_ROT[1] + SPIN_TURNS * Math.PI * 2 * (1 - e),
        FINAL_ROT[2]
      );
    } else {
      el.scale.setScalar(MODEL_SCALE);
      el.position.y = AMP * Math.cos((t - INTRO) * FLOAT_SPEED);
      tg.rotation.set(FINAL_ROT[0], FINAL_ROT[1], FINAL_ROT[2]);
    }
  });

  return (
    <group ref={root} position={[0, START_Y, 0]} scale={0.15}>
      <group ref={tilt} rotation={FINAL_ROT}>
        <PuzzleModel />
      </group>
    </group>
  );
}

export default function PuzzleScene() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="why__fit" aria-hidden="true" />;

  return (
    <div className="why__fit" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 5, 5]} intensity={1.5} color="#eaf0ff" />
        <directionalLight position={[-4, -2, 2]} intensity={1} color="#93c5fd" />

        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[3, 3, 4]} scale={7} color="#ffffff" />
          <Lightformer form="rect" intensity={1.3} position={[-4, 1, 2]} scale={6} color="#bfdbfe" />
          <Lightformer form="circle" intensity={1.5} position={[0, -3, 3]} scale={5} color="#ffffff" />
        </Environment>

        <PuzzleRig />
      </Canvas>
    </div>
  );
}
