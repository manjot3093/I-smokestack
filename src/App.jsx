import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Moon, Sun, Volume2, VolumeX, Radio } from 'lucide-react';
import { EntryGate } from './components/EntryGate';
import { CustomCursor } from './components/CustomCursor';
import { DeskArtifactViewer } from './components/DeskArtifactViewer';
import { PodcastConsole } from './components/PodcastConsole';
import { InsightsModal } from './components/InsightsModal';
import { ExperienceCanvas } from './three/ExperienceCanvas';
import { useVoiceEngine } from './hooks/useVoiceEngine';
import { useSoundFx } from './hooks/useSoundFx';
import { useAnalytics } from './hooks/useAnalytics';

export function App() {
  const [entered, setEntered] = useState(false);
  const [room, setRoom] = useState('desk'); // 'desk' | 'podcast'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lightsOff, setLightsOff] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [hoveredObj, setHoveredObj] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(
    () => new URLSearchParams(window.location.search).get('insights') === '1'
  );

  const scrollProgressRef = useRef(0);
  const lastRoomSwitchRef = useRef(0);

  const voiceEngine = useVoiceEngine({ soundEnabled });
  const {
    playHoverTick,
    playWoodenClick,
    playLampSwitch,
    playTransitionWhoosh,
    playMicCue,
  } = useSoundFx(soundEnabled && entered);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (!entered) return;
    trackEvent('zone_view', { room });
  }, [room, entered, trackEvent]);

  // Smooth wheel scroll choreography: glides across Study Desk -> steps into Podcast Room
  useEffect(() => {
    if (!entered) return undefined;

    const onWheel = (e) => {
      if (activeHotspot || insightsOpen) return;

      const now = Date.now();
      const delta = e.deltaY * 0.0012;

      if (room === 'desk') {
        const next = scrollProgressRef.current + delta;
        if (next > 1.08 && now - lastRoomSwitchRef.current > 900) {
          lastRoomSwitchRef.current = now;
          scrollProgressRef.current = 1;
          setHoveredObj(null);
          playTransitionWhoosh();
          setRoom('podcast');
          return;
        }
        scrollProgressRef.current = Math.max(0, Math.min(1, next));
        window.dispatchEvent(new Event('desk-scroll-glide'));
      } else if (room === 'podcast' && e.deltaY < -28 && now - lastRoomSwitchRef.current > 900) {
        lastRoomSwitchRef.current = now;
        scrollProgressRef.current = 0.75;
        voiceEngine.stopSpeaking();
        playTransitionWhoosh();
        setRoom('desk');
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [entered, room, activeHotspot, insightsOpen, playTransitionWhoosh, voiceEngine]);

  const handleEnter = (withSound) => {
    setSoundEnabled(withSound);
    setEntered(true);
    if (withSound) setTimeout(() => playTransitionWhoosh(), 120);
    trackEvent('experience_enter', { withSound });
  };

  const handleSelectHotspot = (spotId) => {
    setHoveredObj(null);
    setActiveHotspot(spotId);
    if (spotId) {
      playTransitionWhoosh();
      trackEvent('studio_click', { hotspot: spotId });
    } else {
      playWoodenClick();
    }
  };

  const handleHoverObject = (hit) => {
    if (hit?.label !== hoveredObj?.label) {
      setHoveredObj(hit);
      if (hit) playHoverTick();
    }
  };

  const handleToggleLights = () => {
    setLightsOff((prev) => !prev);
    playLampSwitch();
    trackEvent('studio_lights', { lightsOff: !lightsOff });
  };

  const switchRoom = (nextRoom) => {
    if (nextRoom === room) return;
    setActiveHotspot(null);
    setHoveredObj(null);
    if (nextRoom !== 'podcast') voiceEngine.stopSpeaking();
    playTransitionWhoosh();
    setRoom(nextRoom);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0c0b0a] text-[#f5f1e6]">
      <CustomCursor hoverLabel={room === 'desk' && !activeHotspot ? hoveredObj?.label || '' : ''} />

      {!entered && <EntryGate onEnter={handleEnter} />}

      {/* Real Two-Room 3D GLB Stage + Seated Animated Host */}
      <ExperienceCanvas
        room={room}
        lightsOff={lightsOff}
        onToggleLights={handleToggleLights}
        activeHotspot={activeHotspot}
        onSelectHotspot={handleSelectHotspot}
        hoveredLabel={hoveredObj?.label || ''}
        onHoverObject={handleHoverObject}
        scrollProgressRef={scrollProgressRef}
        isSpeaking={voiceEngine.isSpeaking}
        isListening={voiceEngine.isListening}
      />

      {/* Minimalist antonioscirica.com-style corner controls in Study Desk ONLY (zero header in Podcast Room!) */}
      {entered && room === 'desk' && (
        <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 sm:px-7 py-5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2.5">
            <button
              onClick={handleToggleLights}
              className="hud-glass h-11 w-11 rounded-full flex items-center justify-center text-[#f5f1e6] hover:bg-white/15 transition-colors"
              title={lightsOff ? 'Lights on' : 'Lights off'}
              aria-label="Toggle studio lights"
            >
              {lightsOff ? <Sun className="h-4 w-4 text-[#ffd9b8]" /> : <Moon className="h-4 w-4 text-[#e8b48a]" />}
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => switchRoom('podcast')}
              className="hud-glass rounded-full h-10 px-4 text-xs font-semibold text-[#f5f1e6] hover:bg-[#c2410c] inline-flex items-center gap-1.5 transition-colors"
            >
              <Radio className="h-3.5 w-3.5" /> Podcast Room ›
            </button>

            <button
              onClick={() => {
                playWoodenClick();
                setInsightsOpen(true);
              }}
              className="hud-glass rounded-full h-10 w-10 flex items-center justify-center text-[#f5f1e6]/80 hover:text-white transition-colors"
              title="Visitor Engagement Insights"
              aria-label="Open engagement insights"
            >
              <BarChart3 className="h-4 w-4" />
            </button>

            <button
              onClick={() => {
                if (soundEnabled) voiceEngine.stopSpeaking();
                setSoundEnabled((s) => !s);
              }}
              className="hud-glass rounded-full h-10 w-10 flex items-center justify-center text-[#f5f1e6]/80 hover:text-white transition-colors"
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
              aria-label="Toggle sound"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-[#e8b48a]" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Space 1: Education, Experience & Leadership Discovered Through the Desk */}
      {entered && room === 'desk' && (
        <DeskArtifactViewer
          activeHotspot={activeHotspot}
          onSelectHotspot={handleSelectHotspot}
        />
      )}

      {/* Space 2: Pure Podcast Room — only bottom .pzui capsule + speech out of Sonia's mouth */}
      {entered && room === 'podcast' && (
        <PodcastConsole
          voiceEngine={voiceEngine}
          soundEnabled={soundEnabled}
          onToggleSound={() => {
            if (soundEnabled) voiceEngine.stopSpeaking();
            setSoundEnabled((s) => !s);
          }}
          trackEvent={trackEvent}
          onBackToStudio={() => switchRoom('desk')}
          onMicSound={playMicCue}
          onClickSound={playWoodenClick}
          onEnsureVoiceActive={() => {
            if (!soundEnabled) setSoundEnabled(true);
          }}
        />
      )}

      <InsightsModal open={insightsOpen} onClose={() => setInsightsOpen(false)} />
    </div>
  );
}

export default App;
