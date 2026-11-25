import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

function mapMeshToHotspot(name = '') {
  if (name.startsWith('globe_') || name.startsWith('book_8') || name.startsWith('book_9')) {
    return { id: 'globe', label: 'Brass Globe & Volumes — Origins & Education' };
  }
  if (
    name.startsWith('blotter_') ||
    name.startsWith('ink') ||
    name.startsWith('drawer_') ||
    name.startsWith('pull_') ||
    name.startsWith('keyboard_') ||
    name.startsWith('mouse_')
  ) {
    return { id: 'ledger', label: 'Leather Blotter — Career Ledger' };
  }
  if (name.startsWith('monitor_')) {
    return { id: 'monitors', label: 'Studio Displays — Present Leadership' };
  }
  if (
    name.startsWith('frame_') ||
    name.startsWith('poster_') ||
    name.startsWith('mat_') ||
    name.startsWith('painting_')
  ) {
    return { id: 'frame', label: 'Gallery Frame — Clarity Philosophy' };
  }
  if (
    name.startsWith('lamp_') ||
    name.startsWith('lampshade_') ||
    name.startsWith('bulb_') ||
    name.startsWith('banker')
  ) {
    return { id: 'lamp', label: 'Brass Lamp — Toggle Lights' };
  }
  return null;
}

/**
 * Pure architectural Old-Money Studio Desk (.glb) with ZERO floating circle pins.
 * Just like antonioscirica.com: direct 3D mesh raycasting highlights the hovered
 * object subtly and shows a single cursor-following tooltip in the HUD.
 */
export function OldMoneyDeskRoom({
  lightsOff,
  onToggleLights,
  onSelectHotspot,
  hoveredLabel,
  onHoverObject,
}) {
  const { scene } = useGLTF('/models/old-money-studio-desk.glb');

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

  const handlePointerMove = (e) => {
    const hit = mapMeshToHotspot(e.object?.name);
    if (hit) {
      e.stopPropagation();
      if (hoveredLabel !== hit.label) {
        onHoverObject?.(hit);
      }
    } else if (hoveredLabel) {
      onHoverObject?.(null);
    }
  };

  const handleClick = (e) => {
    const hit = mapMeshToHotspot(e.object?.name);
    if (!hit) return;
    e.stopPropagation();
    if (hit.id === 'lamp') {
      onToggleLights();
    } else {
      onSelectHotspot(hit.id);
    }
  };

  return (
    <group>
      {/* Architectural Sconce & Desk Lamp Lighting aligned to real GLB fixtures */}
      <ambientLight intensity={lightsOff ? 0.03 : 0.42} color="#ffeedb" />
      <pointLight position={[1.2, 2.05, 0.28]} intensity={lightsOff ? 1.8 : 6.5} distance={lightsOff ? 4.2 : 7} color="#ffcf96" />
      <pointLight position={[3.1, 2.05, 0.28]} intensity={lightsOff ? 1.8 : 6.5} distance={lightsOff ? 4.2 : 7} color="#ffcf96" />
      <pointLight position={[1.59, 1.25, 0.65]} intensity={lightsOff ? 5.2 : 5.5} distance={4.2} color="#ffd8a8" />
      <pointLight position={[3.28, 1.0, 0.72]} intensity={lightsOff ? 4.8 : 4.2} distance={3.8} color="#ffc98a" />
      <directionalLight position={[3.8, 3.4, 3.6]} intensity={lightsOff ? 0.04 : 1.05} color="#fff5e6" castShadow />

      <primitive
        object={clonedScene}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOut={() => onHoverObject?.(null)}
      />
    </group>
  );
}

useGLTF.preload('/models/old-money-studio-desk.glb');
