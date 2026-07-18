"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

const THICKNESS = 0.4;
const PANEL_DEPTH = 0.1; // how deep each face's panel is recessed
const FACE = THICKNESS / 2; // the "bucket line" — nothing rises above this
const FLOOR = FACE - PANEL_DEPTH; // recessed panel floor

// coin body vs. the darker-yellow accents ($ and the base-level ring).
// fully matte: no metalness, max roughness (pure diffuse, no reflections)
const GOLD = { color: "#f4c73f", metalness: 0, roughness: 1 };
const DARK_GOLD = { color: "#a9781a", metalness: 0, roughness: 1 };

// One bowl of the S: a ~270° torus arc with rounded sphere caps on its two
// open ends, so the curve reads as rounded rather than cut off.
function Bowl() {
  return (
    <group>
      <mesh>
        <torusGeometry args={[0.3, 0.08, 20, 48, Math.PI * 1.5]} />
        <meshStandardMaterial {...DARK_GOLD} />
      </mesh>
      {/* caps at the arc's start (angle 0) and end (angle 270°) */}
      <mesh position={[0.3, 0, 0]}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshStandardMaterial {...DARK_GOLD} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshStandardMaterial {...DARK_GOLD} />
      </mesh>
    </group>
  );
}

// Raised "$" — a capsule bar plus two interlocking bowls (darker gold).
function DollarSign() {
  return (
    <group scale={0.8}>
      <mesh>
        <capsuleGeometry args={[0.075, 1.34, 10, 24]} />
        <meshStandardMaterial {...DARK_GOLD} />
      </mesh>
      <group position={[0, 0.28, 0]}>
        <Bowl />
      </group>
      <group position={[0, -0.28, 0]} rotation={[0, 0, Math.PI]}>
        <Bowl />
      </group>
    </group>
  );
}

function CoinBody() {
  return (
    <>
      {/* core disc — its ±Z faces are the recessed panel floors */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, THICKNESS - 2 * PANEL_DEPTH, 96]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* rounded raised rim on each face — top = bucket line */}
      <mesh position={[0, 0, FLOOR]}>
        <torusGeometry args={[0.9, PANEL_DEPTH, 24, 120]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>
      <mesh position={[0, 0, -FLOOR]}>
        <torusGeometry args={[0.9, PANEL_DEPTH, 24, 120]} />
        <meshStandardMaterial {...GOLD} />
      </mesh>

      {/* darker ring sitting at the base (floor) level, around the panel */}
      <mesh position={[0, 0, FLOOR]}>
        <torusGeometry args={[0.8, 0.032, 16, 120]} />
        <meshStandardMaterial {...DARK_GOLD} />
      </mesh>
      <mesh position={[0, 0, -FLOOR]}>
        <torusGeometry args={[0.8, 0.032, 16, 120]} />
        <meshStandardMaterial {...DARK_GOLD} />
      </mesh>

      {/* "$" grown from each recessed floor */}
      <group position={[0, 0, FLOOR]}>
        <DollarSign />
      </group>
      <group position={[0, 0, -FLOOR]} rotation={[0, Math.PI, 0]}>
        <DollarSign />
      </group>
    </>
  );
}

const INTRO = 1.4; // seconds for the fly-up-spin-and-grow entrance
const START_Y = -3.2; // starts below the frame (bottom of the card)
const AMP = 0.18; // bob amplitude
const FLOAT_SPEED = 1.7;
const FINAL_ROT = [-0.55, -0.28, -0.3]; // resting tilt: face up + slight turns
const SPIN_TURNS = 2; // full spins as it flies in

function Coin() {
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
      el.scale.setScalar(1);
      tg.rotation.set(FINAL_ROT[0], FINAL_ROT[1], FINAL_ROT[2]);
      return;
    }

    tRef.current += Math.min(delta, 0.05);
    const t = tRef.current;

    if (t < INTRO) {
      // fly up to the peak of the bob, growing and spinning into place
      const p = t / INTRO;
      // easeOutCubic — eases into the peak without crawling to a near-stop
      // (a stronger ease made it look like it paused at the top too long)
      const e = 1 - Math.pow(1 - p, 3);
      el.position.y = START_Y + (AMP - START_Y) * e; // ends at the peak (+AMP)
      el.scale.setScalar(0.15 + 0.85 * e);
      // spin around Y, decelerating into the resting tilt
      tg.rotation.set(
        FINAL_ROT[0],
        FINAL_ROT[1] + SPIN_TURNS * Math.PI * 2 * (1 - e),
        FINAL_ROT[2]
      );
    } else {
      // loop the bob starting from the peak (cos → velocity 0), so the
      // handoff from the intro is seamless
      el.scale.setScalar(1);
      el.position.y = AMP * Math.cos((t - INTRO) * FLOAT_SPEED);
      tg.rotation.set(FINAL_ROT[0], FINAL_ROT[1], FINAL_ROT[2]);
    }
  });

  return (
    <group ref={root} position={[0, START_Y, 0]} scale={0.15}>
      {/* tilt group — spins during the intro, then rests at FINAL_ROT
          (face up/north, slight Y turn, a bit clockwise on Z) */}
      <group ref={tilt} rotation={FINAL_ROT}>
        <CoinBody />
      </group>
    </group>
  );
}

export default function CoinScene() {
  // render WebGL only after mount (avoids SSR window access)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="why__coin" aria-hidden="true" />;

  return (
    <div className="why__coin" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 5, 5]} intensity={1.6} color="#fff4d6" />
        <directionalLight position={[-4, -2, 2]} intensity={1} color="#ffdca0" />

        {/* self-contained studio env (no HDR file) so the gold reflects */}
        <Environment resolution={256}>
          <Lightformer
            form="rect"
            intensity={2.4}
            position={[3, 3, 4]}
            scale={7}
            color="#fff7e0"
          />
          <Lightformer
            form="rect"
            intensity={1.4}
            position={[-4, 1, 2]}
            scale={6}
            color="#ffd27a"
          />
          <Lightformer
            form="circle"
            intensity={1.6}
            position={[0, -3, 3]}
            scale={5}
            color="#ffffff"
          />
        </Environment>

        <Coin />
      </Canvas>
    </div>
  );
}
