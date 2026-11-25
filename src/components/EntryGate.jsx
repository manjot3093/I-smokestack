import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import storyData from '../data/storyContent.json';

export function EntryGate({ onEnter }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0e0e0e] px-6 text-center text-[#f5f1e6]">
      <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#e8b48a] mb-5">
        Sonia · Interactive Archive & Studio
      </span>

      <h1 className="font-serif italic text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-[#f5f1e6] max-w-3xl leading-[1.06] mb-6">
        “{storyData.subject.heroQuote}”
      </h1>

      <p className="text-xs sm:text-sm font-normal text-[#f5f1e6]/60 max-w-md mb-10 leading-relaxed">
        Step inside Sonia’s study—inspect the desk to uncover her journey, then pull up a chair in the podcast room to speak or write with her AI twin.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => onEnter(true)}
          className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#c2410c] hover:bg-[#d9520f] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#f5f1e6] transition-colors"
        >
          <Volume2 className="h-4 w-4" />
          Enter Studio with Voice
        </button>

        <button
          onClick={() => onEnter(false)}
          className="hud-glass inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium uppercase tracking-[0.12em] text-[#f5f1e6]/80 hover:text-[#f5f1e6] transition-colors"
        >
          <VolumeX className="h-4 w-4" />
          Enter Silently
        </button>
      </div>
    </div>
  );
}
