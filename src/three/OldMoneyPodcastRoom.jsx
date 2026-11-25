import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { SeatedHostCharacter } from './SeatedHostCharacter';

/**
 * Upgraded Old-Money Podcast Studio v2 (.glb) featuring mixing console,
 * VU meter, carafe, rose bud vase, turntable, pendant lamps, and seated Sonia.
 */
export function OldMoneyPodcastRoom({ isSpeaking, isListening }) {
  const { scene } = useGLTF('/models/podcast-studio-v2-static.glb');
  const signLightRef = useRef();

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useFrame((state) => {
    if (!signLightRef.current) return;
    const t = state.clock.elapsedTime;
    const base = isSpeaking ? 5.5 : isListening ? 4.8 : 2.2;
    const pulse = isSpeaking ? Math.sin(t * 9) * 1.4 : isListening ? Math.sin(t * 6) * 1.0 : 0;
    signLightRef.current.intensity = base + pulse;
  });

  return (
    <group>
      <ambientLight intensity={0.42} color="#ffeed8" />
      {/* Pendant Dome Bulbs above the Podcast Table */}
      <pointLight position={[2.05, 1.62, 2.3]} intensity={7} distance={7} color="#ffd5a4" />
      <pointLight position={[3.15, 1.62, 2.3]} intensity={7} distance={7} color="#ffd5a4" />
      {/* Warm key light illuminating Sonia, Mixer & Carafe */}
      <directionalLight position={[3.6, 2.7, 3.8]} intensity={1.05} color="#fff2e2" castShadow />

      {/* Audio-reactive glow in front of the real ON AIR sign */}
      <pointLight
        ref={signLightRef}
        position={[2.6, 1.95, 0.45]}
        intensity={2.2}
        distance={4.5}
        color={isListening ? '#ef4444' : '#ea580c'}
      />

      <primitive object={clonedScene} />

      {/* Animated Seated Sonia Character (zero floating speech box!) */}
      <SeatedHostCharacter isSpeaking={isSpeaking} isListening={isListening} />
    </group>
  );
}

useGLTF.preload('/models/podcast-studio-v2-static.glb');
