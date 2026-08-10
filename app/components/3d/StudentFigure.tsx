// @ts-nocheck
"use client";

// A friendly 3D student for the dashboard welcome card — built from primitives rather
// than loaded from an OBJ, so it ships as code and can be recoloured from the theme.
//
// The style is the soft brand-character look: a slightly oversized head, matte clay
// surfaces, no hard edges, minimal face. The figure is framed so the hair crown sits
// above the card's top edge and the torso runs past the bottom, where the card's own
// clipping cuts it off.

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Component, Suspense, useEffect, useRef, useState } from "react";

const SKIN = "#f0b58a";
const HAIR = "#3d2c2a";
const SHIRT = "#7c53ff";
const COLLAR = "#5b2ee5";
const EYE = "#241d33";

function Student() {
  return (
    <group>
      {/* Torso — a capsule, so the shoulders round off on their own. It runs well
          below the framing; the card edge is what ends it. */}
      <mesh position={[0, -2.95, 0]}>
        <capsuleGeometry args={[0.92, 1.6, 8, 32]} />
        <meshStandardMaterial color={SHIRT} roughness={0.82} metalness={0} />
      </mesh>

      {/* Arms, angled just off the body. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 1.02, -2.5, 0.06]}
          rotation={[0, 0, side * -0.13]}
        >
          <capsuleGeometry args={[0.29, 1.0, 6, 20]} />
          <meshStandardMaterial color={SHIRT} roughness={0.82} metalness={0} />
        </mesh>
      ))}

      {/* Collar */}
      <mesh position={[0, -1.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.1, 12, 28]} />
        <meshStandardMaterial color={COLLAR} roughness={0.75} metalness={0} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.95, 0]}>
        <cylinderGeometry args={[0.26, 0.3, 0.6, 24]} />
        <meshStandardMaterial color={SKIN} roughness={0.9} metalness={0} />
      </mesh>

      {/* Head — deliberately a touch oversized; that's what makes it read as a
          character rather than a person. */}
      <mesh position={[0, 0, 0]} scale={[1, 1.04, 0.96]}>
        <sphereGeometry args={[0.82, 48, 40]} />
        <meshStandardMaterial color={SKIN} roughness={0.9} metalness={0} />
      </mesh>

      {/* Ears */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.8, -0.04, 0]} scale={[0.7, 1, 0.8]}>
          <sphereGeometry args={[0.15, 20, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.9} metalness={0} />
        </mesh>
      ))}

      {/* Hair — a cap sphere over the crown, tipped back a few degrees so it reads
          as hair sitting on the head rather than a helmet. */}
      <mesh position={[0, 0.04, -0.02]} rotation={[-0.12, 0, 0]} scale={[1.02, 1, 1.03]}>
        <sphereGeometry args={[0.86, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={HAIR} roughness={0.78} metalness={0} />
      </mesh>

      {/* Eyes */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.27, -0.13, 0.7]}>
          <sphereGeometry args={[0.09, 20, 16]} />
          <meshStandardMaterial color={EYE} roughness={0.4} metalness={0} />
        </mesh>
      ))}

      {/* Smile — a half torus, flipped so the arc bows downward. */}
      <mesh position={[0, -0.42, 0.655]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.17, 0.033, 10, 22, Math.PI]} />
        <meshStandardMaterial color={EYE} roughness={0.5} metalness={0} />
      </mesh>
    </group>
  );
}

// Rises into frame once, then breathes. Deliberately calmer than the landing-page
// rigs — a person that spins reads as a toy.
const INTRO = 0.9;
const START_Y = -1.4;
const AMP = 0.055;
const FLOAT_SPEED = 1.1;
const SWAY = 0.12;
// Raises the figure in frame so the crown clears the top of the card.
const LIFT = 1.05;

function StudentRig() {
  const root = useRef();
  const tRef = useRef(0);
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useFrame((_, delta) => {
    const el = root.current;
    if (!el) return;

    if (reduceRef.current) {
      el.position.y = 0;
      el.rotation.y = 0;
      el.scale.setScalar(1);
      return;
    }

    tRef.current += Math.min(delta, 0.05);
    const t = tRef.current;

    if (t < INTRO) {
      const p = t / INTRO;
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.position.y = START_Y * (1 - e);
      el.scale.setScalar(0.86 + 0.14 * e);
      el.rotation.y = -0.5 * (1 - e);
    } else {
      const s = t - INTRO;
      el.scale.setScalar(1);
      el.position.y = AMP * Math.sin(s * FLOAT_SPEED);
      el.rotation.y = SWAY * Math.sin(s * 0.55);
    }
  });

  return (
    <group ref={root} position={[0, START_Y, 0]} scale={0.86}>
      {/* Framing lives on this inner group, not the root — the rig writes to the
          root's position every frame and would overwrite it. */}
      <group position={[0, LIFT, 0]}>
        <Student />
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

// The CSS hides the figure below this width; matching it here means narrow screens
// never spin up a WebGL context they'd only paint off-screen.
const WIDE = "(min-width: 1181px)";

export default function StudentFigure() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(WIDE);
    const sync = () => setShow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!show) return <div className="welcome__avatar" aria-hidden="true" />;

  return (
    <div className="welcome__avatar" aria-hidden="true">
      <Canvas
        camera={{ position: [0, -1.05, 8.6], fov: 26 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 4, 5]} intensity={1.5} />
        <directionalLight position={[-4, 1, 2]} intensity={0.7} color="#b9a3ff" />
        <directionalLight position={[0, -3, 3]} intensity={0.35} color="#9ecbff" />

        <Environment resolution={128}>
          <Lightformer form="rect" intensity={1.5} position={[3, 3, 4]} scale={7} color="#ffffff" />
          <Lightformer form="rect" intensity={0.9} position={[-4, 1, 3]} scale={6} color="#dfe6ff" />
        </Environment>

        <HideOnError>
          <Suspense fallback={null}>
            <StudentRig />
          </Suspense>
        </HideOnError>
      </Canvas>
    </div>
  );
}
