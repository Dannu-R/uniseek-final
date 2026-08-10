// @ts-nocheck
"use client";

// A friendly 3D student for the dashboard welcome card — built from primitives rather
// than loaded from an OBJ, so it ships as code and can be recoloured from the theme.
//
// The style is the soft brand-character look: a slightly oversized head, matte clay
// surfaces, no hard edges, minimal face. The figure is framed so the hair crown sits
// above the card's top edge and the torso runs past the bottom, where the card's own
// clipping cuts it off.

import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Component, Suspense, useEffect, useState } from "react";

// A few degrees off head-on, turned toward the viewer's left. Negative rotation about
// Y swings the figure's front (+Z) toward -X, which is the left of the screen.
const TURN = -0.3;

// Where the eyes sit. Both are derived from the head geometry, not taste — see the
// eye block. They move together: bringing the eyes inward puts them on a fatter part
// of the head, so the surface there sits further forward and EYE_Z has to follow.
const EYE_X = 0.25;
const EYE_Z = 0.79;

const SKIN = "#f0b58a";
const HAIR = "#3d2c2a";
const GOWN = "#16161f";
const COLLAR = "#262633";
const TASSEL = "#e8b53a";
const EYE = "#241d33";

function Student() {
  return (
    <group>
      {/* Torso — a capsule, so the shoulders round off on their own. It runs well
          below the framing; the card edge is what ends it. */}
      <mesh position={[0, -2.95, 0]}>
        <capsuleGeometry args={[0.92, 1.6, 8, 32]} />
        <meshStandardMaterial color={GOWN} roughness={0.62} metalness={0.04} />
      </mesh>

      {/* Arms, angled just off the body. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 1.02, -2.5, 0.06]}
          rotation={[0, 0, side * -0.13]}
        >
          <capsuleGeometry args={[0.29, 1.0, 6, 20]} />
          <meshStandardMaterial color={GOWN} roughness={0.62} metalness={0.04} />
        </mesh>
      ))}

      {/* Collar */}
      <mesh position={[0, -1.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.1, 12, 28]} />
        <meshStandardMaterial color={COLLAR} roughness={0.6} metalness={0.04} />
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

      {/* Eyes — a rounded white with the pupil riding on its front. Two parts rather
          than one dark dot: the white is what makes it read as an eye rather than a
          hole punched in the head.

          EYE_Z is the one number here that isn't taste. The head is an ellipsoid of
          radii (0.82, 0.853, 0.787), so its surface at the eye's x/y sits at z 0.734
          and the surface drops another 0.10 across the eye's own width. Set the white
          any shallower than its rim needs and the head swallows the outer edge — the
          white comes out cut off with a straight side rather than round, worst on the
          far eye where the view is most oblique. 0.78 clears the whole rim while the
          back of the white still sits inside the face, so it reads as set into the
          head rather than stuck on it. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * EYE_X, -0.13, EYE_Z]} rotation={[0, -TURN / 2, 0]}>
          {/* Flattened to a lens — a full sphere this far forward bulges, which is
              most of what made him look googly. Emissive so the shaded half still
              reads as white; lit normally only the key-lit side looked white and the
              pupil appeared to sit in a crescent rather than a disk. */}
          <mesh scale={[1, 1, 0.55]}>
            <sphereGeometry args={[0.115, 24, 20]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.38}
              roughness={0.45}
              metalness={0}
            />
          </mesh>
          {/* Dead centre on its own white, and the gaze comes entirely from the group
              rotation the two eyes share. Anything mirrored here — an outward nudge,
              say — aims the two pupils away from each other, and a split gaze is what
              reads as looking two different ways. Whatever aims the eyes has to be
              the same for both of them, never a function of `side`. */}
          <mesh position={[0, 0, 0.048]}>
            <sphereGeometry args={[0.05, 20, 16]} />
            <meshStandardMaterial color={EYE} roughness={0.3} metalness={0} />
          </mesh>
        </group>
      ))}

      {/* Smile — a half torus, flipped so the arc bows downward. */}
      <mesh position={[0, -0.42, 0.655]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.17, 0.033, 10, 22, Math.PI]} />
        <meshStandardMaterial color={EYE} roughness={0.5} metalness={0} />
      </mesh>

      {/* Graduation cap. The dome stops well above the hairline so the hair still
          shows beneath it, and the board is turned 45 degrees so a corner points at
          the viewer — that's the silhouette that reads as a mortarboard head-on. */}
      <group position={[0, 0.05, 0]} rotation={[-0.08, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.88, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.37]} />
          <meshStandardMaterial color={GOWN} roughness={0.58} metalness={0.05} />
        </mesh>

        <mesh position={[0, 0.92, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[1.36, 0.08, 1.36]} />
          <meshStandardMaterial color={GOWN} roughness={0.55} metalness={0.05} />
        </mesh>

        {/* Button at the centre of the board */}
        <mesh position={[0, 0.99, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.06, 16]} />
          <meshStandardMaterial color={TASSEL} roughness={0.45} metalness={0.15} />
        </mesh>

        {/* Tassel, hanging off the corner nearest the viewer's right */}
        <mesh position={[0.82, 0.93, 0]}>
          <sphereGeometry args={[0.075, 16, 12]} />
          <meshStandardMaterial color={TASSEL} roughness={0.45} metalness={0.15} />
        </mesh>
        <mesh position={[0.82, 0.69, 0]}>
          <capsuleGeometry args={[0.072, 0.26, 6, 16]} />
          <meshStandardMaterial color={TASSEL} roughness={0.5} metalness={0.1} />
        </mesh>
      </group>
    </group>
  );
}

// Framing. SCALE crops the torso — the band between the card's top and bottom edges
// is fixed, so a larger figure spends more of it on the head and less on the body.
// LIFT then puts the cap back where it belongs against the card's top edge.
const SCALE = 1.25;
const LIFT = 0.42;
function StudentRig() {
  return (
    <group rotation={[0, TURN, 0]} scale={SCALE}>
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
        frameloop="demand"
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 4, 5]} intensity={1.5} />
        <directionalLight position={[-4, 1, 2]} intensity={1.0} color="#b9a3ff" />
        <directionalLight position={[0, -3, 3]} intensity={0.4} color="#9ecbff" />
        {/* Rim from behind — black on navy needs an edge to read against. */}
        <directionalLight position={[-2, 2, -4]} intensity={1.1} color="#cfd8ff" />

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
