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

const OBJ_URL = "/models/book.obj";

const getC = (attr, i, axis) =>
  axis === 0 ? attr.getX(i) : axis === 1 ? attr.getY(i) : attr.getZ(i);

// Splits each book's triangles into cover vs. pages: a triangle is "pages" if
// it faces sideways (normal not along the thin/thickness axis) AND sits in the
// middle thickness band between the two covers. Cover → pink/purple, pages → white.
function paintBook(mesh, coverMat, pagesMat) {
  const geo = mesh.geometry;
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const size = bb.getSize(new THREE.Vector3());
  const sArr = [size.x, size.y, size.z];
  const thin = sArr.indexOf(Math.min(...sArr)); // thickness axis
  const tmin = [bb.min.x, bb.min.y, bb.min.z][thin];
  const tspan = sArr[thin] || 1;

  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const tris = pos.count / 3;
  const cls = new Array(tris);
  for (let i = 0; i < tris; i++) {
    let tc = 0;
    let nThin = 0;
    for (let k = 0; k < 3; k++) {
      const idx = i * 3 + k;
      tc += getC(pos, idx, thin);
      nThin += Math.abs(getC(nor, idx, thin));
    }
    tc /= 3;
    nThin /= 3;
    const t = (tc - tmin) / tspan;
    // 1 = pages (nearly flat side-facing + central band), 0 = cover.
    // Strict thin-axis normal cutoff keeps the rounded cover edges (which
    // angle up/down) from being mistaken for pages.
    cls[i] = nThin < 0.22 && t > 0.28 && t < 0.72 ? 1 : 0;
  }

  geo.clearGroups();
  let start = 0;
  let cur = cls[0];
  for (let i = 1; i <= tris; i++) {
    const m = i < tris ? cls[i] : -1;
    if (m !== cur) {
      geo.addGroup(start * 3, (i - start) * 3, cur);
      start = i;
      cur = m;
    }
  }
  mesh.material = [coverMat, pagesMat]; // group index 0 → cover, 1 → pages
}

// Loads the OBJ (no MTL), paints covers pink/purple + pages white, then
// centers + normalizes to ~2 units.
function Model() {
  const obj = useLoader(OBJLoader, OBJ_URL);

  const normalized = useMemo(() => {
    const clone = obj.clone(true);

    const pages = new THREE.MeshStandardMaterial({
      color: "#f3efe6",
      roughness: 0.85,
      metalness: 0,
    });
    const pink = new THREE.MeshStandardMaterial({
      color: "#e35aa2",
      roughness: 0.5,
      metalness: 0.05,
    });
    const purple = new THREE.MeshStandardMaterial({
      color: "#7c4dd0",
      roughness: 0.5,
      metalness: 0.05,
    });

    clone.traverse((child) => {
      if (!child.isMesh) return;
      const name = (child.name || "").toLowerCase();
      paintBook(child, name.includes("brown") ? purple : pink, pages);
    });

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

// entrance rig — matches the coin/glasses
const INTRO = 1.4;
const START_Y = -3.2;
const AMP = 0.18;
const FLOAT_SPEED = 1.7;
const SPIN_TURNS = 2;
// tune these once you see the model on screen
const FINAL_ROT = [0.1, -0.5, 0];
const MODEL_SCALE = 1.3;

function BookRig() {
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

class HideOnError extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function BookScene() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="why__book" aria-hidden="true" />;

  return (
    <div className="why__book" aria-hidden="true">
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
            <BookRig />
          </Suspense>
        </HideOnError>
      </Canvas>
    </div>
  );
}
