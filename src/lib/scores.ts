export type Score = 1 | 2 | 3 | 4;
export type Severity = 'critical' | 'major' | 'minor';

// The words matter more than the numbers: two leads should land on the same
// score for the same reply. Each level says what it means for the customer.
export const SCORES: Record<Score, { label: string; meaning: string }> = {
  1: { label: 'Poor', meaning: 'Wrong or harmful. Could cost us the account.' },
  2: { label: 'Needs work', meaning: 'The customer will have to write in again.' },
  3: { label: 'Good', meaning: 'Resolves it, in the brand’s voice.' },
  4: { label: 'Excellent', meaning: 'Show this to a new joiner.' },
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Risks the account',
  major: 'Customer writes back',
  minor: 'Polish',
};

// Full class strings so Tailwind can see them.
export const SCORE_TONE: Record<Score, { solid: string; soft: string; text: string }> = {
  1: { solid: 'bg-score-1 text-white', soft: 'bg-score-1-soft text-score-1', text: 'text-score-1' },
  2: { solid: 'bg-score-2 text-white', soft: 'bg-score-2-soft text-score-2', text: 'text-score-2' },
  3: { solid: 'bg-score-3 text-white', soft: 'bg-score-3-soft text-score-3', text: 'text-score-3' },
  4: { solid: 'bg-score-4 text-white', soft: 'bg-score-4-soft text-score-4', text: 'text-score-4' },
};

export const SEVERITY_TONE: Record<Severity, string> = {
  critical: 'bg-score-1-soft text-score-1',
  major: 'bg-score-2-soft text-score-2',
  minor: 'bg-sunken text-ink-soft',
};

export function isScore(value: number): value is Score {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/** Nearest score band for an average, for colouring only. */
export function bandFor(average: number): Score {
  return Math.min(4, Math.max(1, Math.round(average))) as Score;
}
