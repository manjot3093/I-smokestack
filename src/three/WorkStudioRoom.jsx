import React, { useEffect, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';

function GlbRoom({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

/**
 * Interactive 3D Work Studio inspired by antonioscirica.com:
 * Warm plaster & walnut studio palette, optional drop-in Blender baked .glb
 * (/models/work-studio.glb), clickable physical objects, and Lights On/Off toggle.
 */
export function WorkStudioRoom({ lightsOff, onToggleLights, activeHotspot, onSelectHotspot, isVisible }) {
  const [hovered, setHovered] = useState(null);
  const [hasCustomGlb, setHasCustomGlb] = useState(false);

  useEffect(() => {
    fetch('/models/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((m) => {
        if (m?.workStudio) setHasCustomGlb(true);
      })
      .catch(() => {});
  }, []);

  const showLabels = isVisible && !activeHotspot;
  const wallColor = lightsOff ? '#141312' : '#262320';
  const floorColor = lightsOff ? '#0c0b0a' : '#1b1815';
  const woodColor = lightsOff ? '#1c1814' : '#3b2c20';

  return (
    <group position={[0, 0, -30]}>
      {/* Warm Tungsten Studio Lighting */}
      <pointLight
        position={[0, 3.8, 0.8]}
        intensity={lightsOff ? 2.5 : 22}
        distance={14}
        color={lightsOff ? '#e8b48a' : '#fff0d6'}
      />
      <pointLight position={[-2.4, 2.3, -1.6]} intensity={lightsOff ? 8 : 5} distance={9} color="#e8b48a" />
      <pointLight position={[2.2, 2.2, -1.2]} intensity={lightsOff ? 7 : 4} distance={9} color="#c2410c" />

      {hasCustomGlb ? (
        <React.Suspense fallback={null}>
          <GlbRoom url="/models/work-studio.glb" />
        </React.Suspense>
      ) : (
        <>
          {/* Warm Oak Floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[11, 9]} />
            <meshStandardMaterial color={floorColor} roughness={0.78} metalness={0.08} />
          </mesh>
          {/* Architectural Plaster Walls */}
          <mesh position={[0, 2.5, -3.3]}>
            <boxGeometry args={[11, 5, 0.16]} />
            <meshStandardMaterial color={wallColor} roughness={0.92} />
          </mesh>
          <mesh position={[-5.1, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[7.5, 5, 0.16]} />
            <meshStandardMaterial color={wallColor} roughness={0.92} />
          </mesh>

          {/* Walnut Creator Desk */}
          <group position={[0, 0, -1.4]}>
            <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
              <boxGeometry args={[3.7, 0.09, 1.55]} />
              <meshStandardMaterial color={woodColor} roughness={0.62} metalness={0.08} />
            </mesh>
            {[-1.65, 1.65].map((x) =>
              [-0.6, 0.6].map((z) => (
                <mesh key={`${x}-${z}`} position={[x, 0.45, z]}>
                  <boxGeometry args={[0.07, 0.9, 0.07]} />
                  <meshStandardMaterial color="#18181b" metalness={0.4} roughness={0.45} />
                </mesh>
              ))
            )}

            {/* Studio Monitor (Clickable Hotspot 1: Active Leadership) */}
            <group
              position={[-0.05, 0.95, -0.1]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectHotspot('laptop');
              }}
              onPointerOver={() => setHovered('laptop')}
              onPointerOut={() => setHovered(null)}
              scale={hovered === 'laptop' || activeHotspot === 'laptop' ? 1.04 : 1}
            >
              <mesh position={[0, 0.02, 0]}>
                <boxGeometry args={[0.38, 0.03, 0.28]} />
                <meshStandardMaterial color="#52525b" metalness={0.75} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0.22, -0.05]}>
                <boxGeometry args={[0.08, 0.36, 0.04]} />
                <meshStandardMaterial color="#71717a" metalness={0.75} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0.5, -0.02]}>
                <boxGeometry args={[1.28, 0.74, 0.04]} />
                <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.5, 0.005]}>
                <planeGeometry args={[1.2, 0.66]} />
                <meshStandardMaterial
                  color="#1c1917"
                  emissive="#e8b48a"
                  emissiveIntensity={lightsOff ? 0.85 : 0.45}
                />
              </mesh>
              {showLabels && (
                <Html position={[0, 0.96, 0]} center distanceFactor={7}>
                  <button
                    onClick={() => onSelectHotspot('laptop')}
                    className="hud-glass px-3 py-1 rounded-full text-[11px] font-medium text-[#f5f1e6] whitespace-nowrap hover:bg-[#c2410c] transition-colors"
                  >
                    Studio Display · Leadership
                  </button>
                </Html>
              )}
            </group>

            {/* Brass Desk Lamp (Lights Off Toggle) */}
            <group
              position={[1.22, 0.95, -0.25]}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLights();
              }}
              onPointerOver={() => setHovered('lamp')}
              onPointerOut={() => setHovered(null)}
            >
              <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.15, 0.18, 0.05, 24]} />
                <meshStandardMaterial color="#b45309" metalness={0.75} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0.35, 0]} rotation={[0, 0, 0.18]}>
                <cylinderGeometry args={[0.018, 0.018, 0.64, 12]} />
                <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.25} />
              </mesh>
              <mesh position={[-0.1, 0.64, 0]} rotation={[0, 0, -0.45]}>
                <coneGeometry args={[0.17, 0.22, 24]} />
                <meshStandardMaterial
                  color="#d97706"
                  emissive={lightsOff ? '#c2410c' : '#ffd9b8'}
                  emissiveIntensity={lightsOff ? 0.6 : 1.4}
                />
              </mesh>
            </group>
          </group>

          {/* Wall Gallery Frame (Hotspot 2: Sonia Specialist) */}
          <group
            position={[-1.8, 2.15, -3.14]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectHotspot('wallframe');
            }}
            onPointerOver={() => setHovered('wallframe')}
            onPointerOut={() => setHovered(null)}
            scale={hovered === 'wallframe' || activeHotspot === 'wallframe' ? 1.04 : 1}
          >
            <mesh>
              <boxGeometry args={[1.5, 1.05, 0.07]} />
              <meshStandardMaterial color="#27201a" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <planeGeometry args={[1.32, 0.88]} />
              <meshStandardMaterial color="#e7dfd3" emissive="#e8b48a" emissiveIntensity={lightsOff ? 0.3 : 0.15} />
            </mesh>
            {showLabels && (
              <Html position={[0, 0.72, 0.1]} center distanceFactor={8}>
                <button
                  onClick={() => onSelectHotspot('wallframe')}
                  className="hud-glass px-3 py-1 rounded-full text-[11px] font-medium text-[#f5f1e6] whitespace-nowrap hover:bg-[#c2410c] transition-colors"
                >
                  Gallery · Sonia Specialist
                </button>
              </Html>
            )}
          </group>

          {/* Architectural Strategy Board (Hotspot 3: Clarity OS) */}
          <group
            position={[1.8, 2.1, -2.8]}
            rotation={[0, -0.25, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectHotspot('whiteboard');
            }}
            onPointerOver={() => setHovered('whiteboard')}
            onPointerOut={() => setHovered(null)}
            scale={hovered === 'whiteboard' || activeHotspot === 'whiteboard' ? 1.04 : 1}
          >
            <mesh>
              <boxGeometry args={[1.45, 1.08, 0.05]} />
              <meshStandardMaterial color="#27272a" roughness={0.35} metalness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[1.32, 0.94]} />
              <meshStandardMaterial color="#f5f1e6" emissive="#ffd9b8" emissiveIntensity={lightsOff ? 0.25 : 0.1} />
            </mesh>
            {showLabels && (
              <Html position={[0, 0.72, 0.1]} center distanceFactor={8}>
                <button
                  onClick={() => onSelectHotspot('whiteboard')}
                  className="hud-glass px-3 py-1 rounded-full text-[11px] font-medium text-[#f5f1e6] whitespace-nowrap hover:bg-[#c2410c] transition-colors"
                >
                  Board · Clarity OS
                </button>
              </Html>
            )}
          </group>
        </>
      )}
    </group>
  );
}
