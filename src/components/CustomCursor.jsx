import React, { useEffect, useRef, useState } from 'react';

/**
 * Custom blend-mode circular cursor + Antonio-style floating hover tooltip (#label).
 * Zero floating pins on the 3D artwork; the object name appears cleanly near the pointer on hover.
 */
export function CustomCursor({ hoverLabel = '' }) {
  const dotRef = useRef(null);
  const labelRef = useRef(null);
  const pointerPosRef = useRef({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  const positionLabel = (x, y) => {
    if (!labelRef.current) return;
    const flipLeft = x > window.innerWidth - 290;
    labelRef.current.style.transform = flipLeft
      ? `translate3d(${x - 16}px, ${y - 14}px, 0) translateX(-100%)`
      : `translate3d(${x + 16}px, ${y - 14}px, 0)`;
  };

  useEffect(() => {
    if (hoverLabel && pointerPosRef.current.x >= 0) {
      positionLabel(pointerPosRef.current.x, pointerPosRef.current.y);
    }
  }, [hoverLabel]);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return undefined;

    document.body.classList.add('custom-cursor-active');

    const onMove = (e) => {
      setVisible(true);
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
      positionLabel(e.clientX, e.clientY);
      const target = e.target;
      const isInteractive = Boolean(
        target?.closest?.('a, button, input, textarea, [role="button"]')
      );
      setHovering(isInteractive);
    };

    const onLeave = () => setVisible(false);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      document.body.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (!visible) return null;

  const isTarget = hovering || Boolean(hoverLabel);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-[100] pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
        style={{ mixBlendMode: isTarget ? 'normal' : 'difference' }}
      >
        <div
          className={`rounded-full transition-all duration-200 ${
            isTarget
              ? 'h-3 w-3 bg-[#e8b48a] ring-4 ring-[#ffd9b8]/30'
              : 'h-5 w-5 bg-white'
          }`}
        />
      </div>

      {hoverLabel && (
        <div
          ref={labelRef}
          className="fixed top-0 left-0 z-[99] pointer-events-none hud-glass rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide text-[#f5f1e6] whitespace-nowrap shadow-lg"
        >
          {hoverLabel}
        </div>
      )}
    </>
  );
}
