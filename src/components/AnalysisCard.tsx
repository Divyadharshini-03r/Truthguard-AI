import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CategoryResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  icon: React.ReactNode;
  title: string;
  category: CategoryResult;
}

export function AnalysisCard({ icon, title, category }: Props) {
  const [open, setOpen] = useState(false);
  const score = Math.max(0, Math.min(100, Math.round(category.score)));
  const tone = score >= 70 ? "trust-high" : score >= 40 ? "trust-med" : "trust-low";

  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: `var(--color-${tone}-bg)`, color: `var(--color-${tone})` }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{category.summary}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums" style={{ color: `var(--color-${tone})` }}>
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</div>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${score}%`, backgroundColor: `var(--color-${tone})` }}
        />
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-4 flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition"
      >
        <span>{open ? "Hide" : "Show"} detailed analysis</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-foreground/90">
          {category.detail}
        </p>
      )}
    </div>
  );
}
