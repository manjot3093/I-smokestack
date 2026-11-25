import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Loads the CC0 rigged character (/models/sonia-host.glb),
 * seats her bone hierarchy naturally inside chair_122 ([2.75, 0.47, 1.35]),
 * and drives live breathing, head nods, and arm gestures from speech state.
 * Zero 3D floating text box — speech renders via smooth cinema subtitles!
 */
function RiggedSeatedSonia({ isSpeaking, isListening }) {
  const { scene } = useGLTF('/models/sonia-host.glb');
  const bonesRef = useRef({});
  const restRef = useRef({});
  const tmpQuat = useRef(new THREE.Quaternion());
  const tmpEuler = useRef(new THREE.Euler());

  const cloned = useMemo(() => {
    const copy = cloneSkinned(scene);
    bonesRef.current = {};
    restRef.current = {};
    copy.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
      }
      if (obj.isBone) {
        bonesRef.current[obj.name] = obj;
        restRef.current[obj.name] = {
          pos: obj.position.clone(),
          quat: obj.quaternion.clone(),
        };
      }
    });
    return copy;
  }, [scene]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const b = bonesRef.current;
    const r = restRef.current;

    const applyOffset = (name, rx, ry, rz) => {
      if (!b[name] || !r[name]) return;
      tmpEuler.current.set(rx, ry, rz, 'XYZ');
      tmpQuat.current.setFromEuler(tmpEuler.current);
      b[name].quaternion.copy(r[name].quat).multiply(tmpQuat.current);
    };

    if (b.Hips && r.Hips) {
      b.Hips.position.y = r.Hips.pos.y - 34;
      b.Hips.position.z = r.Hips.pos.z - 4;
      applyOffset('Hips', 0.08, 0, 0);
    }

    applyOffset('LeftUpLeg', -1.48, 0, 0.08);
    applyOffset('RightUpLeg', -1.48, 0, -0.08);
    applyOffset('LeftLeg', 1.45, 0, 0);
    applyOffset('RightLeg', 1.45, 0, 0);

    const breath = Math.sin(t * 2.1) * 0.02;
    applyOffset('Spine', (isListening ? 0.06 : 0.02) + breath, 0, 0);
    applyOffset('Spine01', breath * 0.7, 0, 0);
    applyOffset('Spine02', isSpeaking ? Math.sin(t * 2.5) * 0.03 : 0, 0, 0);

    const headNod = isSpeaking
      ? Math.sin(t * 4.2) * 0.08
      : isListening
        ? 0.08
        : Math.sin(t * 1.1) * 0.025;
    const headTurn = isSpeaking
      ? Math.sin(t * 1.9) * 0.1
      : isListening
        ? -0.09
        : Math.sin(t * 0.7) * 0.05;
    applyOffset('Head', headNod, headTurn, isListening ? 0.06 : 0);

    const gesture = isSpeaking ? Math.sin(t * 3.8) * 0.12 : Math.sin(t * 1.2) * 0.02;
    applyOffset('LeftArm', -0.48, 0, 0.48);
    applyOffset('LeftForeArm', -0.68, 0, 0.22);
    applyOffset('RightArm', -0.48 - gesture * 0.5, 0, -0.48);
    applyOffset('RightForeArm', -0.72 - gesture, 0, -0.22);
  });

  return <primitive object={cloned} position={[2.75, 0.0, 1.38]} scale={0.96} />;
}

export function SeatedHostCharacter({ isSpeaking, isListening }) {
  const [hasCustomGlb, setHasCustomGlb] = useState(true);

  useEffect(() => {
    fetch('/models/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((m) => {
        if (m && m.soniaHost === false) setHasCustomGlb(false);
      })
      .catch(() => {});
  }, []);

  if (!hasCustomGlb) return null;

  return (
    <React.Suspense fallback={null}>
      <RiggedSeatedSonia isSpeaking={isSpeaking} isListening={isListening} />
    </React.Suspense>
  );
}

useGLTF.preload('/models/sonia-host.glb');
