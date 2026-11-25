import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { OldMoneyDeskRoom } from './OldMoneyDeskRoom';
import { OldMoneyPodcastRoom } from './OldMoneyPodcastRoom';

const DESK_VIEWS = {
  globe: { pos: [3.42, 1.28, 1.85], target: [3.0, 0.98, 1.06] },
  ledger: { pos: [2.32, 1.28, 1.88], target: [2.25, 0.78, 1.0] },
  monitors: { pos: [2.3, 1.24, 1.56], target: [2.3, 1.08, 0.62] },
  frame: { pos: [1.55, 1.72, 2.08], target: [0.06, 1.65, 2.0] },
};

const PODCAST_VIEW = {
  pos: [2.56, 1.38, 3.92],
  target: [2.72, 1.18, 1.42],
};

function CameraController({ room, activeHotspot, scrollProgressRef, controlsRef }) {
  const desiredPos = useRef(new THREE.Vector3(3.65, 1.65, 3.85));
  const desiredTarget = useRef(new THREE.Vector3(2.35, 1.0, 0.85));
  const animatingRef = useRef(false);
  const lastHotspotRef = useRef(null);
  const lastRoomRef = useRef(room);

  useEffect(() => {
    if (lastRoomRef.current !== room || lastHotspotRef.current !== activeHotspot) {
      lastRoomRef.current = room;
      lastHotspotRef.current = activeHotspot;
      animatingRef.current = true;
    }
  }, [room, activeHotspot]);

  useFrame((state, delta) => {
    const damp = 1 - Math.exp(-delta * 4.5);

    if (room === 'podcast') {
      desiredPos.current.set(...PODCAST_VIEW.pos);
      desiredTarget.current.set(...PODCAST_VIEW.target);
      if (animatingRef.current) {
        state.camera.position.lerp(desiredPos.current, damp);
        if (controlsRef.current) {
          controlsRef.current.target.lerp(desiredTarget.current, damp);
          controlsRef.current.update();
        }
        if (state.camera.position.distanceTo(desiredPos.current) < 0.02) {
          animatingRef.current = false;
        }
      }
      return;
    }

    if (activeHotspot && DESK_VIEWS[activeHotspot]) {
      const view = DESK_VIEWS[activeHotspot];
      desiredPos.current.set(...view.pos);
      desiredTarget.current.set(...view.target);
      if (animatingRef.current) {
        state.camera.position.lerp(desiredPos.current, damp);
        if (controlsRef.current) {
          controlsRef.current.target.lerp(desiredTarget.current, damp);
          controlsRef.current.update();
        }
        if (state.camera.position.distanceTo(desiredPos.current) < 0.02) {
          animatingRef.current = false;
        }
      }
      return;
    }

    // Smooth wheel-scroll glide across the Study Desk (0..1 -> wide studio to desk centerpiece)
    const p = THREE.MathUtils.clamp(scrollProgressRef.current, 0, 1);
    const startPos = new THREE.Vector3(3.75, 1.68, 3.92);
    const endPos = new THREE.Vector3(2.42, 1.34, 2.28);
    const startTarget = new THREE.Vector3(2.38, 1.02, 0.85);
    const endTarget = new THREE.Vector3(2.3, 0.96, 0.78);

    desiredPos.current.lerpVectors(startPos, endPos, p);
    desiredTarget.current.lerpVectors(startTarget, endTarget, p);

    // Only drive camera during scroll or room return; let OrbitControls handle free drag otherwise
    if (animatingRef.current) {
      state.camera.position.lerp(desiredPos.current, damp);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(desiredTarget.current, damp);
        controlsRef.current.update();
      }
      if (state.camera.position.distanceTo(desiredPos.current) < 0.02) {
        animatingRef.current = false;
      }
    }
  });

  // Listen for programmatic scroll updates to re-enable smooth camera glide
  useEffect(() => {
    const onScrollGlide = () => {
      if (!activeHotspot && room === 'desk') {
        animatingRef.current = true;
      }
    };
    window.addEventListener('desk-scroll-glide', onScrollGlide);
    return () => window.removeEventListener('desk-scroll-glide', onScrollGlide);
  }, [activeHotspot, room]);

  return null;
}

export function ExperienceCanvas({
  room,
  lightsOff,
  onToggleLights,
  activeHotspot,
  onSelectHotspot,
  hoveredLabel,
  onHoverObject,
  scrollProgressRef,
  isSpeaking,
  isListening,
}) {
  const controlsRef = useRef(null);

  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [3.75, 1.68, 3.92], fov: 50, near: 0.08, far: 40 }}
        onCreated={({ scene }) => {
          scene.background = new THREE.Color('#0c0b0a');
        }}
      >
        <Suspense fallback={null}>
          {room === 'desk' ? (
            <OldMoneyDeskRoom
              lightsOff={lightsOff}
              onToggleLights={onToggleLights}
              activeHotspot={activeHotspot}
              onSelectHotspot={onSelectHotspot}
              hoveredLabel={hoveredLabel}
              onHoverObject={onHoverObject}
            />
          ) : (
            <OldMoneyPodcastRoom
              isSpeaking={isSpeaking}
              isListening={isListening}
            />
          )}
        </Suspense>

        {/* enableZoom={false} prevents awkward mouse-wheel zoom in/out! */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.07}
          enableZoom={false}
          enablePan={false}
          minAzimuthAngle={room === 'desk' ? -0.45 : -0.45}
          maxAzimuthAngle={room === 'desk' ? 1.15 : 0.45}
          minPolarAngle={0.8}
          maxPolarAngle={1.65}
          target={[2.38, 1.02, 0.85]}
        />

        <CameraController
          room={room}
          activeHotspot={activeHotspot}
          scrollProgressRef={scrollProgressRef}
          controlsRef={controlsRef}
        />
      </Canvas>
    </div>
  );
}
