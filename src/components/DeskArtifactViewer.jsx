import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import storyData from '../data/storyContent.json';

/**
 * Displays Education, Career Turning Points, Leadership, or Philosophy
 * as a single interactive Desk Artifact (1 story beat at a time—never a resume table).
 */
export function DeskArtifactViewer({ activeHotspot, onSelectHotspot }) {
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    setCardIndex(0);
  }, [activeHotspot]);

  const artifact = activeHotspot ? storyData.deskArtifacts[activeHotspot] : null;
  const cards = artifact?.cards || [];
  const currentCard = cards[cardIndex];

  if (!artifact) {
    // Resting .pzui capsule bar at the desk
    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[94vw]">
        <div className="hud-glass rounded-full h-[50px] px-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {Object.values(storyData.deskArtifacts).map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && <div className="h-5 w-px bg-white/15 shrink-0" />}
              <button
                onClick={() => onSelectHotspot(item.id)}
                className="h-9 rounded-full px-3.5 text-xs font-medium text-[#f5f1e6]/85 hover:text-white hover:bg-white/10 whitespace-nowrap transition-colors shrink-0"
              >
                {item.objectLabel}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Tactile Editorial Folio Card anchored gracefully on the right */}
      <div className="fixed right-5 sm:right-8 top-24 bottom-24 z-20 flex items-center pointer-events-none">
        <div className="pointer-events-auto hud-glass-dense rounded-2xl p-6 sm:p-7 w-[90vw] max-w-md max-h-full overflow-y-auto shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5 mb-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e8b48a] block">
                {artifact.eyebrow}
              </span>
              <h2 className="font-serif italic text-2xl sm:text-3xl text-[#f5f1e6] leading-tight mt-1">
                {artifact.title}
              </h2>
            </div>
            <button
              onClick={() => onSelectHotspot(null)}
              className="p-1.5 rounded-full text-[#f5f1e6]/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close folio"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-[#f5f1e6]/65 leading-relaxed mb-5">{artifact.intro}</p>

          {currentCard && (
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e8b48a]">
                  {currentCard.period}
                </span>
                <span className="font-hand text-lg text-[#ffd9b8]">
                  chapter {cardIndex + 1} of {cards.length}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-[#f5f1e6] mb-2">
                {currentCard.place}
              </h3>
              <p className="text-xs sm:text-sm text-[#f5f1e6]/80 leading-relaxed">
                {currentCard.story}
              </p>
            </div>
          )}

          {/* Subtle Chapter Dots */}
          <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              {cards.map((c, idx) => (
                <button
                  key={c.place}
                  onClick={() => setCardIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === cardIndex ? 'w-6 bg-[#e8b48a]' : 'w-1.5 bg-white/25 hover:bg-white/50'
                  }`}
                  aria-label={`View chapter ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCardIndex((i) => (i - 1 + cards.length) % cards.length)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#f5f1e6]"
                aria-label="Previous story"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCardIndex((i) => (i + 1) % cards.length)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#f5f1e6]"
                aria-label="Next story"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* antonioscirica.com .pzui bottom bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="hud-glass rounded-full h-[50px] px-2.5 flex items-center gap-2">
          <button
            onClick={() => onSelectHotspot(null)}
            className="h-9 rounded-full px-4 text-xs font-semibold text-[#f5f1e6] hover:bg-white/10 transition-colors"
          >
            ← Step Back
          </button>
          <div className="h-5 w-px bg-white/15" />
          <a
            href={storyData.subject.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="h-9 rounded-full bg-[#c2410c] hover:bg-[#d9520f] px-4 text-xs font-semibold text-[#f5f1e6] inline-flex items-center gap-1.5 transition-colors"
          >
            LinkedIn <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </>
  );
}
