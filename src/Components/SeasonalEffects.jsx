import React, { useMemo } from 'react';

// Lightweight seasonal effects: snowfall and holiday wishes on Dec 24-25.
// Renders absolutely positioned snowflake elements and a small greeting overlay.
const SeasonalEffects = ({ enabled = true }) => {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed (11 == December)
  const date = now.getDate();

  const isDecember = month === 11;
  const showWish = isDecember && (date === 24 || date === 25);

  // Generate a collection of snowflakes with randomized properties
  const flakes = useMemo(() => {
    // fewer flakes on small screens
    const count = Math.min(80, Math.max(20, Math.floor(window.innerWidth / 12)));
    return Array.from({ length: count }).map((_, i) => {
      const size = Math.random() * 8 + 6; // 6 - 14px
      const left = Math.random() * 100; // percent
      const delay = Math.random() * 8; // seconds
      const duration = 6 + Math.random() * 10; // 6 - 16s
      const opacity = 0.6 + Math.random() * 0.4;
      const sway = Math.random() * 40 + 10; // px horizontal sway
      return { id: i, size, left, delay, duration, opacity, sway };
    });
  }, []);

  if (!enabled || !isDecember) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none">
      {/* Snow container */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, overflow: 'hidden' }}>
        <style>{`
          @keyframes fallDown {
            0% { transform: translateY(-10vh) translateX(0) rotate(0deg); }
            100% { transform: translateY(110vh) translateX(var(--sway)) rotate(360deg); }
          }
        `}</style>
        {flakes.map(f => (
          <div
            key={f.id}
            style={{
              position: 'absolute',
              left: `${f.left}%`,
              top: `-5vh`,
              width: f.size,
              height: f.size,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 0 6px rgba(255,255,255,0.6)',
              opacity: f.opacity,
              transform: 'translateY(-10vh)',
              animationName: 'fallDown',
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              // CSS variable for sway distance
              '--sway': `${(Math.random() > 0.5 ? 1 : -1) * f.sway}px`,
            }}
          />
        ))}
      </div>

      {/* Wish overlay on Dec 24 and 25 */}
      {showWish && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}>
          <div style={{ marginTop: 72, background: 'rgba(255,255,255,0.9)', color: '#1f2937', padding: '8px 14px', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.12)', fontWeight: 600 }}>
            {date === 24 ? 'Warm wishes — Happy Christmas Eve! 🎄' : 'Merry Christmas! 🎅 Enjoy the holidays!'}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonalEffects;
