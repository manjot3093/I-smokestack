import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../api';
import { Mic, MicOff, Send, Volume2, VolumeX, ArrowLeft, MessageSquarePlus, Play, X } from 'lucide-react';
import storyData from '../data/storyContent.json';

/**
 * Splits a spoken answer into crisp 1-to-2-line cinema subtitle chunks (~12 words each).
 */
function buildSubtitleChunks(text = '') {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const chunks = [];
  let current = [];
  for (const w of words) {
    current.push(w);
    const endsSentence = /[.!?]$/.test(w);
    if (current.length >= 12 || (endsSentence && current.length >= 5)) {
      chunks.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current.join(' '));
  return chunks;
}

/**
 * Pure antonioscirica.com-style bottom .pzui capsule + Smooth Cinema Subtitles:
 * - Zero floating 3D bubble boxes!
 * - Subtitles appear ONLY while user or Sonia AI is actively speaking, then fade away cleanly.
 */
export function PodcastConsole({
  voiceEngine,
  soundEnabled,
  onToggleSound,
  trackEvent,
  onBackToStudio,
  onMicSound,
  onClickSound,
  onEnsureVoiceActive,
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [activeReply, setActiveReply] = useState('');
  const [chunkIdx, setChunkIdx] = useState(0);
  const [history, setHistory] = useState([]);
  const [recentIds, setRecentIds] = useState([]);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [connectStatus, setConnectStatus] = useState('');

  const replyChunks = useMemo(() => buildSubtitleChunks(activeReply), [activeReply]);

  // Step smoothly through Sonia's subtitle chunks while she is speaking
  useEffect(() => {
    if (!voiceEngine.isSpeaking || replyChunks.length === 0) {
      setChunkIdx(0);
      return undefined;
    }
    setChunkIdx(0);
    if (replyChunks.length === 1) return undefined;

    const wordsTotal = activeReply.split(/\s+/).length;
    const approxDurationMs = Math.max(3500, wordsTotal * 390);
    const stepMs = Math.max(1800, Math.floor(approxDurationMs / replyChunks.length));

    const interval = setInterval(() => {
      setChunkIdx((prev) => (prev < replyChunks.length - 1 ? prev + 1 : prev));
    }, stepMs);

    return () => clearInterval(interval);
  }, [voiceEngine.isSpeaking, activeReply, replyChunks.length]);

  const askSonia = async (questionText, via = 'text') => {
    const clean = questionText.trim();
    if (!clean || loading) return;

    if (voiceEngine.isListening) {
      voiceEngine.stopListening(true);
    }

    setInput('');
    setShowSuggestions(false);
    setLoading(true);
    onClickSound?.();
    onEnsureVoiceActive?.();
    voiceEngine.unlockPlayback?.();
    trackEvent('podcast_question', { via, question: clean });

    try {
      const res = await fetch(`${API_BASE_URL}/api/podcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: clean, history, recentIds }),
      });
      const data = await res.json();
      const reply = data.answer || 'Let us connect directly so I can share more.';
      setHistory((prev) => [...prev.slice(-6), { role: 'user', content: clean }, { role: 'assistant', content: reply }]);
      if (data.topicId) {
        setRecentIds((prev) => [...prev.slice(-6), data.topicId]);
      }
      setActiveReply(reply);
      voiceEngine.speak(reply, true);
    } catch {
      const fallback =
        'Ask me about Ryan & Vidya Mandir, MDU engineering, Bosch & IIM Bangalore, Appirio, or i-SmokeStack.';
      setActiveReply(fallback);
      voiceEngine.speak(fallback, true);
    } finally {
      setLoading(false);
    }
  };

  const handleMicToggle = () => {
    onMicSound?.();
    onEnsureVoiceActive?.();
    voiceEngine.unlockPlayback?.();
    if (voiceEngine.isListening) {
      voiceEngine.stopListening(false);
    } else {
      voiceEngine.startListening(
        (spoken) => askSonia(spoken, 'voice'),
        (interim) => setInput(interim)
      );
    }
  };

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!guestName.trim() || !guestNote.trim()) return;
    setConnectStatus('sending');
    try {
      const res = await fetch(`${API_BASE_URL}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: guestName,
          email: guestEmail,
          note: guestNote,
          hasAudio: Boolean(voiceEngine.recordedAudioUrl),
        }),
      });
      if (res.ok) {
        setConnectStatus('sent');
        setGuestName('');
        setGuestEmail('');
        setGuestNote('');
        trackEvent('guest_connect', { sent: true });
      } else {
        setConnectStatus('error');
      }
    } catch {
      setConnectStatus('error');
    }
  };

  const playLastRecording = () => {
    if (!voiceEngine.recordedAudioUrl) return;
    const clip = new Audio(voiceEngine.recordedAudioUrl);
    clip.play().catch(() => {});
  };

  // Cinema Subtitle visible ONLY when user is speaking OR Sonia AI is speaking
  const showUserSubtitle = voiceEngine.isListening;
  const showAiSubtitle = !voiceEngine.isListening && voiceEngine.isSpeaking && replyChunks.length > 0;
  const activeSubtitle = showUserSubtitle
    ? { speaker: 'You', text: voiceEngine.transcript || 'Listening...' }
    : showAiSubtitle
      ? { speaker: 'Sonia', text: replyChunks[chunkIdx] || replyChunks[0] }
      : null;

  return (
    <>
      {noteOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <form onSubmit={handleConnectSubmit} className="hud-glass-dense rounded-2xl p-6 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="font-serif italic text-xl text-[#f5f1e6]">Leave a Note for Sonia</span>
              <button type="button" onClick={() => setNoteOpen(false)} className="text-[#f5f1e6]/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your Name"
              className="w-full h-9 rounded-xl bg-black/40 border border-white/15 px-3 text-xs text-[#f5f1e6] focus:outline-none focus:border-[#e8b48a]"
            />
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Email or LinkedIn (optional)"
              className="w-full h-9 rounded-xl bg-black/40 border border-white/15 px-3 text-xs text-[#f5f1e6] focus:outline-none focus:border-[#e8b48a]"
            />
            <textarea
              required
              rows={3}
              value={guestNote}
              onChange={(e) => setGuestNote(e.target.value)}
              placeholder="Write your note after sitting in the studio..."
              className="w-full rounded-xl bg-black/40 border border-white/15 p-3 text-xs text-[#f5f1e6] focus:outline-none focus:border-[#e8b48a]"
            />
            {voiceEngine.recordedAudioUrl && (
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px] text-[#ffd9b8]">
                <span>Voice clip recorded</span>
                <button
                  type="button"
                  onClick={playLastRecording}
                  className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20"
                >
                  <Play className="h-3 w-3" /> Play
                </button>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#e8b48a]">
                {connectStatus === 'sent' && 'Saved to studio guestbook.'}
                {connectStatus === 'error' && 'Backend unavailable.'}
              </span>
              <button
                type="submit"
                className="rounded-full bg-[#c2410c] hover:bg-[#d9520f] px-5 py-2 text-xs font-semibold text-[#f5f1e6]"
              >
                {connectStatus === 'sending' ? 'Saving...' : 'Send Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Smooth Cinema Subtitles & Mic Notices stacked cleanly above the .pzui capsule */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94vw] max-w-2xl pointer-events-auto flex flex-col items-center gap-2.5">
        {activeSubtitle && (
          <div className="w-fit max-w-[90vw] sm:max-w-xl rounded-2xl bg-black/70 backdrop-blur-md px-4 py-2 text-center shadow-lg border border-white/10 pointer-events-none transition-all duration-300">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e8b48a] mr-2">
              {activeSubtitle.speaker}
            </span>
            <span className="text-xs sm:text-sm font-medium text-[#f5f1e6] leading-relaxed">
              {activeSubtitle.text}
            </span>
          </div>
        )}

        {voiceEngine.micError && (
          <div className="hud-glass rounded-full px-3.5 py-1 text-[11px] text-[#ffd9b8] text-center">
            {voiceEngine.micError}
          </div>
        )}

        {showSuggestions && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {storyData.podcast.quickPrompts.slice(0, 3).map((q) => (
              <button
                key={q}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  askSonia(q, 'chip');
                }}
                className="hud-glass rounded-full px-3 py-1 text-[11px] text-[#f5f1e6]/85 hover:bg-[#c2410c] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            askSonia(input, 'text');
          }}
          className="hud-glass rounded-full h-[52px] w-full px-2 flex items-center gap-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.75)]"
        >
          <button
            type="button"
            onClick={onBackToStudio}
            className="shrink-0 h-9 rounded-full px-3 text-xs font-semibold text-[#f5f1e6]/85 hover:text-white hover:bg-white/10 inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Desk</span>
          </button>

          <div className="h-5 w-px bg-white/15 shrink-0" />

          {voiceEngine.supported && (
            <button
              type="button"
              onClick={handleMicToggle}
              className={`shrink-0 h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                voiceEngine.isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-white/10 text-[#ffd9b8] hover:bg-white/15'
              }`}
              title={voiceEngine.isListening ? 'Click to stop & send' : 'Click to speak'}
            >
              {voiceEngine.isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{voiceEngine.isListening ? 'Listening' : 'Speak'}</span>
            </button>
          )}

          <input
            type="text"
            value={input}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              loading
                ? 'Sonia is answering...'
                : voiceEngine.isListening
                  ? 'Speak now (auto-sends after pause)...'
                  : 'Write to ask Sonia...'
            }
            className="flex-1 min-w-0 h-9 bg-transparent px-2 text-xs sm:text-sm text-[#f5f1e6] placeholder:text-[#f5f1e6]/45 focus:outline-none"
          />

          {voiceEngine.recordedAudioUrl && !voiceEngine.isListening && (
            <button
              type="button"
              onClick={playLastRecording}
              className="shrink-0 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-[#ffd9b8] flex items-center justify-center transition-colors"
              title="Play your recorded voice"
              aria-label="Play recorded voice"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 h-9 w-9 rounded-full bg-[#c2410c] hover:bg-[#d9520f] text-[#f5f1e6] flex items-center justify-center disabled:opacity-40 transition-colors"
            aria-label="Ask Sonia"
          >
            <Send className="h-3.5 w-3.5" />
          </button>

          <div className="h-5 w-px bg-white/15 shrink-0" />

          <button
            type="button"
            onClick={() => {
              onClickSound?.();
              setNoteOpen(true);
            }}
            className="shrink-0 h-9 w-9 rounded-full hover:bg-white/10 text-[#f5f1e6]/80 hover:text-white flex items-center justify-center transition-colors"
            title="Leave a guest note"
            aria-label="Leave a guest note"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className="shrink-0 h-9 w-9 rounded-full hover:bg-white/10 text-[#f5f1e6]/80 hover:text-white flex items-center justify-center transition-colors"
            title={soundEnabled ? 'Mute sound & voice' : 'Enable sound & voice'}
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-[#e8b48a]" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </>
  );
}
