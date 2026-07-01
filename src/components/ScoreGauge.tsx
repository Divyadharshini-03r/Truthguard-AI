interface Props {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreGauge({ score, size = 180, label }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const tone = clamped >= 70 ? "trust-high" : clamped >= 40 ? "trust-med" : "trust-low";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`var(--color-${tone})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold tracking-tight" style={{ color: `var(--color-${tone})` }}>
          {clamped}
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
          {label ?? "Trust Score"}
        </div>
      </div>
    </div>
  );
}
