'use client';

import { useState } from 'react';
import type { WeekPoint } from '@/lib/report';
import { SCORES, type Score } from '@/lib/scores';

type Change = { id: string; effectiveOn: string; summary: string };

// Geometry in viewBox units; the SVG scales to its container width.
const W = 720;
const H = 240;
const PAD = { top: 28, right: 16, bottom: 28, left: 92 };
const WEEK_MS = 7 * 24 * 60 * 60_000;

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' });

export function TrendChart({ points, changes }: { points: WeekPoint[]; changes: Change[] }) {
  const [active, setActive] = useState<number | null>(null);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / points.length;
  const x = (i: number) => PAD.left + step * (i + 0.5);
  const y = (score: number) => PAD.top + ((4 - score) / 3) * innerH;

  const first = new Date(points[0].start).getTime();
  const xForDate = (iso: string) => PAD.left + ((new Date(iso).getTime() - first) / WEEK_MS) * step;
  const visibleChanges = changes
    .map((c, n) => ({ ...c, n: n + 1, cx: xForDate(c.effectiveOn) }))
    .filter((c) => c.cx >= PAD.left && c.cx <= W - PAD.right);

  const rollingPath = points
    .map((p, i) => (p.rolling === null ? null : `${x(i).toFixed(1)},${y(p.rolling).toFixed(1)}`))
    .filter(Boolean)
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt}`)
    .join(' ');

  const activePoint = active === null ? null : points[active];

  return (
    <figure className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-soft" aria-hidden>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8"><line x1="1" y1="4" x2="17" y2="4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" /></svg>
          4-week average
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="var(--color-muted)" /></svg>
          Single week
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="10" height="12"><line x1="5" y1="0" x2="5" y2="12" stroke="var(--color-ink-soft)" strokeWidth="1" /></svg>
          Change we made
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Average review score per week, with a four-week rolling average. Table below."
        onPointerLeave={() => setActive(null)}
      >
        {([1, 2, 3, 4] as Score[]).map((s) => (
          <g key={s}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(s)} y2={y(s)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={PAD.left - 10} y={y(s)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--color-muted)">
              {s} {SCORES[s].label}
            </text>
          </g>
        ))}

        {points.map((p, i) => (i % 2 === 0 || i === points.length - 1) && (
          <text key={p.start} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
            {dateFmt.format(new Date(p.start))}
          </text>
        ))}

        {visibleChanges.map((c) => (
          <g key={c.id}>
            <line x1={c.cx} x2={c.cx} y1={PAD.top - 12} y2={H - PAD.bottom} stroke="var(--color-ink-soft)" strokeWidth="1" />
            <circle cx={c.cx} cy={PAD.top - 16} r="8" fill="var(--color-ink)" />
            <text x={c.cx} y={PAD.top - 16} dy="0.34em" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--color-paper)">
              {c.n}
            </text>
          </g>
        ))}

        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-line-strong)" strokeWidth="1" />
        )}

        {points.map((p, i) => p.average !== null && (
          <circle
            key={p.start}
            cx={x(i)}
            cy={y(p.average)}
            r={active === i ? 5 : 4}
            fill="var(--color-muted)"
            stroke="var(--color-surface)"
            strokeWidth="2"
          />
        ))}

        {rollingPath && (
          <path d={rollingPath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {points.map((p, i) => p.rolling !== null && i === points.length - 1 && (
          <circle key="end" cx={x(i)} cy={y(p.rolling)} r="4.5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
        ))}

        {/* Hit targets: the full column, not the 8px dot. */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.start}`}
            x={PAD.left + step * i}
            y={PAD.top}
            width={step}
            height={innerH}
            fill="transparent"
            onPointerEnter={() => setActive(i)}
            tabIndex={0}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            aria-label={`Week of ${dateFmt.format(new Date(p.start))}`}
          />
        ))}
      </svg>

      {activePoint && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-8 z-10 w-48 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm"
          style={{ left: `${(x(active) / W) * 100}%` }}
        >
          <p className="font-medium text-ink">Week of {dateFmt.format(new Date(activePoint.start))}</p>
          <dl className="mt-1 space-y-0.5 text-ink-soft">
            <Row label="4-week average" value={activePoint.rolling?.toFixed(2) ?? '—'} />
            <Row label="This week" value={activePoint.average?.toFixed(2) ?? 'no reviews'} />
            <Row label="Reviewed" value={`${activePoint.reviews} of ${activePoint.replies}`} />
          </dl>
        </div>
      )}
    </figure>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-mono font-semibold tabular text-ink">{value}</dd>
    </div>
  );
}
