import { useCallback, useEffect, useRef } from 'react';

/**
 * Tactile Web Audio sound engine inspired by antonioscirica.com:
 * - Soft ambient room warmth (filtered pink-like noise)
 * - Mechanical/brass lamp switch click
 * - Smooth air whoosh on camera glides & room transitions
 * - Subtle hover tick & studio mic cue
 */
export function useSoundFx(enabled) {
  const ctxRef = useRef(null);
  const ambientGainRef = useRef(null);

  const ensureCtx = useCallback(() => {
    if (!enabled) return null;
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current && ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, [enabled]);

  // Subtle ambient studio room tone
  useEffect(() => {
    if (!enabled) {
      if (ambientGainRef.current && ctxRef.current) {
        ambientGainRef.current.gain.setTargetAtTime(0.0001, ctxRef.current.currentTime, 0.25);
      }
      return undefined;
    }

    const ctx = ensureCtx();
    if (!ctx || ambientGainRef.current) {
      if (ambientGainRef.current && ctx) {
        ambientGainRef.current.gain.setTargetAtTime(0.012, ctx.currentTime, 0.4);
      }
      return undefined;
    }

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;

    const gain = ctx.createGain();
    gain.gain.value = 0.012;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    ambientGainRef.current = gain;

    return undefined;
  }, [enabled, ensureCtx]);

  const playHoverTick = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.022);
    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }, [ensureCtx]);

  const playWoodenClick = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(75, ctx.currentTime + 0.055);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }, [ensureCtx]);

  const playLampSwitch = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    // Crisp brass pull-chain double click
    [0, 0.038].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(i === 0 ? 1450 : 1850, ctx.currentTime + offset);
      gain.gain.setValueAtTime(0.028, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.018);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.022);
    });
  }, [ensureCtx]);

  const playTransitionWhoosh = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * 0.45);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(240, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.18);
    filter.frequency.exponentialRampToValueAtTime(210, ctx.currentTime + 0.44);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.44);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }, [ensureCtx]);

  const playMicCue = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    [523.25, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.032, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.18);
    });
  }, [ensureCtx]);

  return {
    playHoverTick,
    playWoodenClick,
    playLampSwitch,
    playTransitionWhoosh,
    playMicCue,
  };
}
