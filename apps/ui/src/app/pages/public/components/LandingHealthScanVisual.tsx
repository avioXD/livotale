const ticks = Array.from({ length: 36 }).map((_, i) => {
  const angle = (i * 10 * Math.PI) / 180;
  const r2 = i % 9 === 0 ? 118 : 124;
  return {
    x1: +(144 + 130 * Math.cos(angle)).toFixed(2),
    y1: +(144 + 130 * Math.sin(angle)).toFixed(2),
    x2: +(144 + r2 * Math.cos(angle)).toFixed(2),
    y2: +(144 + r2 * Math.sin(angle)).toFixed(2),
    accent: i % 9 === 0,
  };
});

export function LandingHealthScanVisual() {
  return (
    <div className="relative flex h-full min-h-[380px] w-full flex-col items-center justify-center">
      <div
        className="pointer-events-none absolute h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #D7316C 0%, #1EABB3 100%)' }}
      />

      <svg className="absolute h-[340px] w-[340px] opacity-10" viewBox="0 0 340 340" aria-hidden>
        <circle cx="170" cy="170" r="166" stroke="#1EABB3" strokeWidth="1" strokeDasharray="6 4" fill="none" />
      </svg>

      <div className="relative h-56 w-56 shrink-0 md:h-64 md:w-64">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 288 288" aria-hidden>
          <circle cx="144" cy="144" r="138" stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />
          <circle cx="144" cy="144" r="108" stroke="rgba(30,171,179,0.12)" strokeWidth="1" fill="none" />
          <line x1="6" y1="144" x2="282" y2="144" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <line x1="144" y1="6" x2="144" y2="282" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.accent ? 'rgba(30,171,179,0.4)' : 'rgba(255,255,255,0.07)'}
              strokeWidth="1"
            />
          ))}
        </svg>

        <svg
          className="landing-scan-rotate absolute inset-0 h-full w-full"
          viewBox="0 0 288 288"
          aria-hidden
        >
          <defs>
            <radialGradient id="landing-sweep">
              <stop offset="0%" stopColor="#1EABB3" stopOpacity="0" />
              <stop offset="80%" stopColor="#1EABB3" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#1EABB3" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M144 144 L144 6 A138 138 0 0 1 238 52 Z" fill="url(#landing-sweep)" />
          <line x1="144" y1="144" x2="144" y2="6" stroke="#1EABB3" strokeWidth="1.5" opacity="0.8" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <div className="landing-pulse-score text-5xl font-black text-livotale-teal md:text-6xl">7.2</div>
          <div className="text-[11px] uppercase tracking-widest text-white/50">kPa Stiffness</div>
          <div
            className="landing-pulse-badge mt-1 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
            style={{
              background: 'rgba(215,49,108,0.12)',
              color: '#D7316C',
              border: '1px solid rgba(215,49,108,0.3)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Stage F1 — Mild Fibrosis
          </div>
        </div>

        <div
          className="landing-pulse-ring absolute inset-0 rounded-full"
          style={{ border: '1px solid #1EABB3' }}
        />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {[
          { label: 'Stiffness', value: '7.2', unit: 'kPa', color: '#1EABB3' },
          { label: 'CAP Fat', value: '248', unit: 'dB/m', color: '#D7316C' },
          { label: 'IQR', value: '18', unit: '%', color: '#1EABB3' },
        ].map((m) => (
          <div
            key={m.label}
            className="flex flex-col items-center gap-0.5 rounded-xl border px-4 py-2.5 backdrop-blur-sm"
            style={{ borderColor: `${m.color}33`, background: `${m.color}0d` }}
          >
            <span className="text-[11px] uppercase tracking-widest text-white/50">{m.label}</span>
            <span className="text-lg font-bold" style={{ color: m.color }}>
              {m.value}
              <span className="ml-0.5 text-[11px] font-normal text-white/30">{m.unit}</span>
            </span>
          </div>
        ))}
      </div>

      <div
        className="landing-pulse-badge mt-4 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-widest text-livotale-teal"
        style={{ borderColor: 'rgba(30,171,179,0.3)', background: 'rgba(30,171,179,0.08)' }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        FIBROSCAN IN PROGRESS
      </div>
    </div>
  );
}
