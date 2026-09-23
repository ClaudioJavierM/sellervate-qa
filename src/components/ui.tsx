import Link from 'next/link';
import { SCORES, SCORE_TONE, SEVERITY_TONE, type Score, type Severity } from '@/lib/scores';

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{eyebrow}</p>}
      <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-ink-soft">{children}</div>}
    </header>
  );
}

export function ScoreBadge({ score, size = 'md' }: { score: Score; size?: 'sm' | 'md' }) {
  return (
    <span
      title={`${score} · ${SCORES[score].label}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${SCORE_TONE[score].soft} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      <span className="font-mono tabular font-semibold">{score}</span>
      {SCORES[score].label}
    </span>
  );
}

export function IssueChip({ label, severity }: { label: string; severity: Severity }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_TONE[severity]}`}>
      {label}
    </span>
  );
}

/** What a specialist wrote to a customer: set in the reading face, never truncated. */
export function ReplyText({ children }: { children: string }) {
  return <div className="whitespace-pre-line font-serif text-md text-ink">{children}</div>;
}

export function EmptyState({ title, children, action }: {
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && (
        <Link href={action.href} className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover">
          {action.label} →
        </Link>
      )}
    </div>
  );
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-card border border-line bg-surface ${className}`}>{children}</section>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-sunken ${className}`} />;
}
