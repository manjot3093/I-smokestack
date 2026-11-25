import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reliable Voice & Audio Engine (Windows Chrome/Edge safe):
 * - Runs SpeechRecognition (en-IN, continuous=true) WITHOUT competing getUserMedia locks.
 * - Auto-submits spoken query after 1.3s of silence OR on recognition.onend flush,
 *   guaranteeing a spoken question ALWAYS triggers Sonia's AI response.
 * - Synthesizes natural Indian English female neural speech via /api/tts (en-IN-NeerjaNeural).
 */
export function useVoiceEngine({ soundEnabled }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [micError, setMicError] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const playbackAudioRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const speakFallbackTimerRef = useRef(null);
  const finalSentRef = useRef(false);
  const latestTranscriptRef = useRef('');
  const callbackRef = useRef(null);

  const unlockedAudioRef = useRef(null);

  // Call synchronously inside click/submit handlers so async TTS playback is never blocked
  const unlockPlayback = useCallback(() => {
    if (!unlockedAudioRef.current) {
      unlockedAudioRef.current = new Audio();
    }
    const el = unlockedAudioRef.current;
    el.muted = true;
    el.src =
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    el.play().then(() => {
      el.pause();
      el.muted = false;
    }).catch(() => {
      el.muted = false;
    });
  }, []);

  useEffect(() => {
    const hasRec = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    const hasMic = Boolean(navigator.mediaDevices?.getUserMedia);
    setSupported(hasRec || hasMic);
  }, []);

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (speakFallbackTimerRef.current) {
      clearTimeout(speakFallbackTimerRef.current);
      speakFallbackTimerRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    clearTimers();
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.currentTime = 0;
      playbackAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [clearTimers]);

  const fallbackBrowserSpeak = useCallback((text) => {
    if (!text) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 0.98;
      utterance.pitch = 1.03;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /en-IN/i.test(v.lang) && /neerja|heera|female|google|natural/i.test(v.name)) ||
        voices.find((v) => /en-IN/i.test(v.lang)) ||
        voices.find((v) => /en/i.test(v.lang));
      if (preferred) utterance.voice = preferred;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      // Timed subtitle window even if browser has no TTS
      const words = text.split(/\s+/).length;
      setIsSpeaking(true);
      speakFallbackTimerRef.current = setTimeout(() => setIsSpeaking(false), Math.max(3000, words * 380));
    }
  }, []);

  const speak = useCallback(
    async (text, forceSpeak = false) => {
      if ((!soundEnabled && !forceSpeak) || !text) return;
      stopSpeaking();

      try {
        setIsSpeaking(true);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error('TTS request failed');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = unlockedAudioRef.current || new Audio();
        audio.muted = false;
        audio.src = url;
        playbackAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (playbackAudioRef.current === audio) playbackAudioRef.current = null;
          setIsSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setIsSpeaking(false);
          fallbackBrowserSpeak(text);
        };

        await audio.play();
      } catch {
        setIsSpeaking(false);
        fallbackBrowserSpeak(text);
      }
    },
    [soundEnabled, stopSpeaking, fallbackBrowserSpeak]
  );

  const releaseRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const flushPendingTranscript = useCallback(() => {
    const pending = latestTranscriptRef.current.trim();
    if (pending && !finalSentRef.current && callbackRef.current) {
      finalSentRef.current = true;
      callbackRef.current(pending);
    }
  }, []);

  const stopListening = useCallback(
    (skipSubmit = false) => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
      releaseRecorder();
      setIsListening(false);
      if (!skipSubmit) {
        flushPendingTranscript();
      }
    },
    [releaseRecorder, flushPendingTranscript]
  );

  const startFallbackRecorder = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicError('Voice recognition requires Chrome or Edge — type your question below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          setRecordedAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };
      recorder.start(200);
      setIsListening(true);
      setMicError('Recording audio clip (live speech-to-text requires Chrome/Edge — type below anytime).');
    } catch {
      setIsListening(false);
      setMicError('Microphone permission denied — allow mic access or type below.');
    }
  }, []);

  const startListening = useCallback(
    (onFinalTranscript, onInterimTranscript) => {
      setMicError('');
      stopSpeaking();
      releaseRecorder();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      finalSentRef.current = false;
      latestTranscriptRef.current = '';
      callbackRef.current = onFinalTranscript;
      setTranscript('');

      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRec) {
        startFallbackRecorder();
        return;
      }

      const recognition = new SpeechRec();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognitionRef.current = recognition;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i += 1) {
          combined += `${event.results[i][0].transcript} `;
        }
        const clean = combined.trim();
        latestTranscriptRef.current = clean;
        setTranscript(clean);
        onInterimTranscript?.(clean);

        // Auto-submit smoothly after 1.3s pause once user finishes speaking
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (clean) {
          silenceTimerRef.current = setTimeout(() => {
            stopListening(false);
          }, 1300);
        }
      };

      recognition.onerror = (ev) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setIsListening(false);
        recognitionRef.current = null;

        if (latestTranscriptRef.current.trim()) {
          flushPendingTranscript();
          return;
        }
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          setMicError('Mic blocked — allow microphone access in browser settings, or type below.');
        } else if (ev.error === 'audio-capture') {
          setMicError('No microphone detected or mic in use by another app — type below anytime.');
        } else if (ev.error === 'network') {
          setMicError('Browser speech service unreachable — type below or use audio clip.');
          startFallbackRecorder();
        } else if (ev.error === 'no-speech') {
          setMicError('No speech heard — click Speak and talk clearly, or type below.');
        } else if (ev.error !== 'aborted') {
          setMicError(`Mic error (${ev.error}) — you can type your question below.`);
        }
      };

      recognition.onend = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setIsListening(false);
        recognitionRef.current = null;
        // Flush whatever was captured even if browser ended before silence timer
        flushPendingTranscript();
      };

      try {
        recognition.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
        startFallbackRecorder();
      }
    },
    [stopSpeaking, releaseRecorder, startFallbackRecorder, stopListening, flushPendingTranscript]
  );

  return {
    supported,
    isListening,
    isSpeaking,
    transcript,
    micError,
    recordedAudioUrl,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    unlockPlayback,
  };
}
