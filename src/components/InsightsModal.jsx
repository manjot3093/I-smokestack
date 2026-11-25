import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api';
import { BarChart3, X } from 'lucide-react';

export function InsightsModal({ open, onClose }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!open) return;
    fetch(`${API_BASE_URL}/api/analytics`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="hud-glass-dense rounded-3xl max-w-xl w-full p-6 text-[#f5f1e6]">
        <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-4 w-4 text-[#e8b48a]" />
            <h3 className="font-serif italic text-2xl">Visitor Engagement Telemetry</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-[#f5f1e6]/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!stats ? (
          <p className="text-xs text-[#f5f1e6]/60">Loading telemetry from /api/analytics...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                <div className="font-display text-2xl font-bold text-[#ffd9b8]">{stats.totalEvents}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#f5f1e6]/55">Events</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                <div className="font-display text-2xl font-bold text-[#e8b48a]">{stats.podcastQuestions.length}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#f5f1e6]/55">Podcast Qs</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-3 border border-white/10">
                <div className="font-display text-2xl font-bold text-[#f5f1e6]">{stats.guestNotes.length}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#f5f1e6]/55">Notes</div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#e8b48a] mb-2">Podcast Questions</h4>
              <div className="max-h-28 overflow-y-auto space-y-1.5">
                {stats.podcastQuestions.length === 0 ? (
                  <p className="text-xs text-[#f5f1e6]/45">No questions asked yet.</p>
                ) : (
                  stats.podcastQuestions.slice(-5).reverse().map((q, idx) => (
                    <div key={idx} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs flex justify-between gap-2">
                      <span>“{q.question}”</span>
                      <span className="text-[10px] uppercase text-[#e8b48a]">{q.via}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-[#e8b48a] mb-2">Guestbook Notes</h4>
              <div className="max-h-28 overflow-y-auto space-y-1.5">
                {stats.guestNotes.length === 0 ? (
                  <p className="text-xs text-[#f5f1e6]/45">No guest notes submitted yet.</p>
                ) : (
                  stats.guestNotes.slice(-4).reverse().map((n, idx) => (
                    <div key={idx} className="rounded-lg bg-white/5 px-3 py-2 text-xs">
                      <span className="text-[#ffd9b8] font-semibold">{n.name}: </span>
                      <span>{n.note}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
