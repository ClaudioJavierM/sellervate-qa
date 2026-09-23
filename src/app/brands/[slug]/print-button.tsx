'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-line-strong hover:text-ink print:hidden"
      title="Prints the report without internal sections (per-specialist scores, forms)"
    >
      Print for the client
    </button>
  );
}
