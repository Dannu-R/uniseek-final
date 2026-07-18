// @ts-nocheck
"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

const OBJ_URL = "/models/oculos.obj";
const MTL_URL = "/models/oculos.mtl";

// Loads the OBJ (with its MTL/texture), then centers + normalizes it to ~2
// units so the rig's positions/scale are predictable.
function Model() {
  const materials = useLoader(MTLLoader, MTL_URL);
  const obj = useLoader(OBJLoader, OBJ_URL, (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  const normalized = useMemo(() => {
    const clone = obj.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center); // center the content
    const wrap = new THREE.Group();
    wrap.add(clone);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    wrap.scale.setScalar(2 / maxDim); // normalize to ~2 units
    return wrap;
  }, [obj]);

  return <primitive object={normalized} />;
}

// entrance rig — matches the coin
const INTRO = 1.4;
const START_Y = -3.2;
const AMP = 0.18;
const FLOAT_SPEED = 1.7;
const SPIN_TURNS = 2;
// tune these once you see the model on screen
const FINAL_ROT = [0, -0.5, 0];
const MODEL_SCALE = 1.3;

function GlassesRig() {
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
        <Model />
      </group>
    </group>
  );
}

// If the model files are missing/unreadable, render nothing instead of crashing.
class HideOnError extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function GlassesScene() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="why__glasses" aria-hidden="true" />;

  return (
    <div className="why__glasses" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 5, 5]} intensity={1.5} />
        <directionalLight position={[-4, -2, 2]} intensity={0.9} color="#c9b8ff" />

        <Environment resolution={256}>
          <Lightformer form="rect" intensity={1.8} position={[3, 3, 4]} scale={7} color="#ffffff" />
          <Lightformer form="rect" intensity={1.1} position={[-4, 1, 2]} scale={6} color="#eaf0ff" />
          <Lightformer form="circle" intensity={1.3} position={[0, -3, 3]} scale={5} color="#ffffff" />
        </Environment>

        <HideOnError>
          <Suspense fallback={null}>
            <GlassesRig />
          </Suspense>
        </HideOnError>
      </Canvas>
    </div>
  );
}
