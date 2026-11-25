import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';

function GlbPodcastRoom({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

/**
 * Warm Architectural 3D Podcast Studio (z = -50):
 * - Supports drop-in Blender baked room (/models/podcast-room.glb)
 * - Acoustic walnut slats + warm terracotta ON AIR sign + 2 studio chairs
 * - Articulated condenser boom mic + pop filter + headphones + mug + audio bars
 */
export function PodcastStudioRoom({ isSpeaking, isListening, isVisible }) {
  const barsRef = useRef([]);
  const [hasCustomGlb, setHasCustomGlb] = useState(false);

  useEffect(() => {
    fetch('/models/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((m) => {
        if (m?.podcastRoom) setHasCustomGlb(true);
      })
      .catch(() => {});
  }, []);

  const barCount = 14;
  const barOffsets = useMemo(
    () => Array.from({ length: barCount }, (_, i) => (i - (barCount - 1) / 2) * 0.12),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    barsRef.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const activeAmp = isSpeaking ? 0.55 : isListening ? 0.42 : 0.08;
      const speed = isSpeaking ? 11 : isListening ? 8 : 2.2;
      mesh.scale.y = (Math.abs(Math.sin(t * speed + idx * 0.55)) * activeAmp + 0.07) * 3.0;
    });
  });

  return (
    <group position={[0, 0, -50]}>
      {/* Warm Tungsten Studio Key & Rim Lights */}
      <pointLight position={[0, 3.2, 0.6]} intensity={16} distance={14} color="#ffd9b8" />
      <pointLight position={[0, 2.6, -2.5]} intensity={10} distance={10} color="#c2410c" />
      <pointLight position={[-2.8, 2.0, -1]} intensity={6} distance={8} color="#e8b48a" />

      {hasCustomGlb ? (
        <React.Suspense fallback={null}>
          <GlbPodcastRoom url="/models/podcast-room.glb" />
        </React.Suspense>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[10, 9]} />
            <meshStandardMaterial color="#14110f" roughness={0.75} metalness={0.1} />
          </mesh>
          <mesh position={[0, 2.4, -3.4]}>
            <boxGeometry args={[10, 4.8, 0.2]} />
            <meshStandardMaterial color="#181512" roughness={0.92} />
          </mesh>

          {/* Acoustic Walnut Wall Slats */}
          {Array.from({ length: 13 }, (_, i) => (
            <mesh key={i} position={[(i - 6) * 0.65, 2.2, -3.26]}>
              <boxGeometry args={[0.36, 3.1, 0.08]} />
              <meshStandardMaterial color="#2b2119" roughness={0.85} />
            </mesh>
          ))}

          {/* Warm Terracotta ON AIR Sign */}
          <group position={[0, 2.75, -3.18]}>
            <mesh>
              <boxGeometry args={[1.65, 0.44, 0.06]} />
              <meshStandardMaterial color="#111110" />
            </mesh>
            <mesh position={[0, 0, 0.035]}>
              <planeGeometry args={[1.52, 0.3]} />
              <meshStandardMaterial
                color="#7c2d12"
                emissive={isSpeaking || isListening ? '#ea580c' : '#c2410c'}
                emissiveIntensity={isSpeaking || isListening ? 2.2 : 1.0}
              />
            </mesh>
            {isVisible && (
              <Html position={[0, 0, 0.06]} center distanceFactor={7}>
                <div className="px-3 py-0.5 text-[11px] font-bold tracking-[0.28em] text-[#f5f1e6] whitespace-nowrap select-none">
                  {isListening ? 'MIC LIVE' : isSpeaking ? 'ON AIR · SONIA' : 'ON AIR · STUDIO'}
                </div>
              </Html>
            )}
          </group>

          {/* Host Studio Chair */}
          <group position={[0, 0, -1.65]}>
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.6, 12]} />
              <meshStandardMaterial color="#27272a" metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.4, 0.44, 0.05, 24]} />
              <meshStandardMaterial color="#18181b" metalness={0.6} />
            </mesh>
            <mesh position={[0, 0.62, 0]}>
              <boxGeometry args={[0.78, 0.14, 0.72]} />
              <meshStandardMaterial color="#3b2c22" roughness={0.82} />
            </mesh>
            <mesh position={[0, 1.18, -0.3]} rotation={[-0.1, 0, 0]}>
              <boxGeometry args={[0.72, 1.04, 0.12]} />
              <meshStandardMaterial color="#2c2119" roughness={0.82} />
            </mesh>
          </group>

          {/* Guest Chair Hint */}
          <group position={[1.55, 0, 1.15]} rotation={[0, -2.55, 0]}>
            <mesh position={[0, 0.58, 0]}>
              <boxGeometry args={[0.7, 0.12, 0.65]} />
              <meshStandardMaterial color="#3b2c22" roughness={0.82} />
            </mesh>
            <mesh position={[0, 1.05, -0.26]}>
              <boxGeometry args={[0.64, 0.85, 0.1]} />
              <meshStandardMaterial color="#2c2119" roughness={0.82} />
            </mesh>
          </group>

          {/* Matte Walnut Podcast Table */}
          <group position={[0, 0, -0.35]}>
            <mesh position={[0, 0.82, 0]} castShadow receiveShadow>
              <boxGeometry args={[3.2, 0.09, 1.45]} />
              <meshStandardMaterial color="#2a2018" roughness={0.55} metalness={0.1} />
            </mesh>
            {[-1.35, 1.35].map((x) => (
              <mesh key={x} position={[x, 0.4, 0]}>
                <boxGeometry args={[0.1, 0.8, 1.1]} />
                <meshStandardMaterial color="#14110f" metalness={0.35} />
              </mesh>
            ))}

            {/* Boom Condenser Microphone */}
            <group position={[-0.75, 0.87, -0.3]}>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.07, 0.08, 0.08, 16]} />
                <meshStandardMaterial color="#27272a" metalness={0.8} />
              </mesh>
              <mesh position={[0.2, 0.3, 0.12]} rotation={[0.35, 0, -0.58]}>
                <cylinderGeometry args={[0.018, 0.018, 0.68, 10]} />
                <meshStandardMaterial color="#18181b" metalness={0.8} />
              </mesh>
              <mesh position={[0.52, 0.56, 0.25]} rotation={[0.2, 0, -1.1]}>
                <cylinderGeometry args={[0.016, 0.016, 0.52, 10]} />
                <meshStandardMaterial color="#27272a" metalness={0.8} />
              </mesh>
              <group position={[0.72, 0.52, 0.3]}>
                <mesh>
                  <cylinderGeometry args={[0.055, 0.05, 0.2, 20]} />
                  <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.25} />
                </mesh>
                <mesh position={[0, 0.11, 0]}>
                  <sphereGeometry args={[0.056, 16, 16]} />
                  <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.3} wireframe />
                </mesh>
                <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.058, 0.008, 8, 24]} />
                  <meshStandardMaterial
                    color={isListening ? '#ef4444' : '#e8b48a'}
                    emissive={isListening ? '#ef4444' : '#c2410c'}
                    emissiveIntensity={2.0}
                  />
                </mesh>
                <mesh position={[0, 0.05, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.012, 24]} />
                  <meshStandardMaterial color="#09090b" roughness={0.9} transparent opacity={0.85} />
                </mesh>
              </group>
            </group>

            {/* Studio Headphones */}
            <group position={[0.92, 0.89, 0.18]} rotation={[Math.PI / 2, 0, 0.4]}>
              <mesh>
                <torusGeometry args={[0.16, 0.022, 12, 28, Math.PI]} />
                <meshStandardMaterial color="#27272a" metalness={0.7} />
              </mesh>
              <mesh position={[-0.16, -0.02, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
                <meshStandardMaterial color="#18181b" roughness={0.6} />
              </mesh>
              <mesh position={[0.16, -0.02, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
                <meshStandardMaterial color="#18181b" roughness={0.6} />
              </mesh>
            </group>

            {/* Ceramic Mug */}
            <mesh position={[-1.12, 0.94, 0.25]}>
              <cylinderGeometry args={[0.065, 0.055, 0.14, 20]} />
              <meshStandardMaterial color="#f5f1e6" roughness={0.35} />
            </mesh>

            {/* Warm Peach Audio-Reactive Desk Level Bars */}
            <group position={[0, 0.94, 0.15]}>
              {barOffsets.map((x, idx) => (
                <mesh
                  key={idx}
                  ref={(el) => {
                    barsRef.current[idx] = el;
                  }}
                  position={[x, 0.06, 0]}
                >
                  <boxGeometry args={[0.04, 0.16, 0.04]} />
                  <meshStandardMaterial
                    color={isSpeaking ? '#ffd9b8' : '#e8b48a'}
                    emissive={isSpeaking ? '#c2410c' : '#e8b48a'}
                    emissiveIntensity={isSpeaking || isListening ? 1.8 : 0.45}
                  />
                </mesh>
              ))}
            </group>
          </group>
        </>
      )}
    </group>
  );
}
