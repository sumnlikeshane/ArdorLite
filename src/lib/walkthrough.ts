/**
 * Synthetic teaching example — not market evidence.
 * A bounded TypeScript adaptation of the cited Ardor signal and opening guards.
 * This does not execute the Python strategy, replay trades, or calculate returns.
 * All prices and security names below are invented. Reserved rights.
 */
export const PRIOR_COUNT = 260;
export const LOOKBACK_DAYS = 252;
export const SKIP_DAYS = 21;
export const N_BUCKETS = 5;
export const scenarioIds = ['baseline', 'reversal', 'banned', 'missing-history'] as const;
export type ScenarioId = typeof scenarioIds[number];
export const scenarioLabels: Record<ScenarioId, string> = {
  baseline: 'A clean synthetic universe',
  reversal: 'A reversal inside the skipped month',
  banned: 'The weakest name is banned',
  'missing-history': 'One name lacks enough history',
};
export type SyntheticStock = {
  symbol: string;
  label: string;
  /** Ordered closes strictly before the decision. Today is intentionally separate. */
  prices: number[];
  currentPrice: number;
  /** Supplied execution eligibility, not an inferred historical universe. */
  eligible: boolean;
  banned: boolean;
  previouslyForceCovered: boolean;
};
export type WalkthroughRow = SyntheticStock & {
  priorCount: number;
  backIndex: number | null;
  skipIndex: number | null;
  pBack: number | null;
  pSkip: number | null;
  momentum: number | null;
  rank: number | null;
  bucket: number | null;
  selection: 'long' | 'short' | 'middle' | 'blocked' | 'excluded';
  reason: string;
};

const names = ['Aster', 'Birch', 'Cedar', 'Dahlia', 'Elm', 'Fern', 'Grove', 'Hazel', 'Iris', 'Juniper'];
const signals = [-0.32, -0.24, -0.16, -0.08, -0.02, 0.05, 0.12, 0.2, 0.3, 0.42];

export function createScenario(id: ScenarioId): SyntheticStock[] {
  if (!scenarioIds.includes(id)) throw new Error('Unknown synthetic scenario');
  return names.map((label, i) => {
    const back = PRIOR_COUNT - LOOKBACK_DAYS;
    const skip = PRIOR_COUNT - SKIP_DAYS;
    const base = 80 + i * 7;
    const slope = Math.log(1 + signals[i]!) / (skip - back);
    const prices = Array.from({ length: PRIOR_COUNT }, (_, day) => {
      // A small ripple is exactly zero at both sampled endpoints.
      const ripple = Math.sin(Math.PI * (day - back) / (skip - back) * 6) * 0.018;
      return base * Math.exp(slope * (day - back) + ripple);
    });
    // The last 20 prior observations occur after the sampled -21 endpoint.
    // Changing them changes the picture, not the 12-1 signal.
    if (id === 'reversal' && i === 9) {
      for (let day = skip + 1; day < PRIOR_COUNT; day++) {
        prices[day] = prices[skip]! * (1 - 0.45 * (day - skip) / (PRIOR_COUNT - 1 - skip));
      }
    }
    const currentPrice = prices.at(-1)! * 1.015;
    return {
      symbol: label.toUpperCase(), label,
      prices: id === 'missing-history' && i === 0 ? prices.slice(-180) : prices,
      currentPrice, eligible: true,
      banned: id === 'banned' && i === 0,
      previouslyForceCovered: id === 'banned' && i === 0,
    };
  });
}

export function calculateMomentum(universe: readonly SyntheticStock[]): WalkthroughRow[] {
  if (new Set(universe.map(stock => stock.symbol)).size !== universe.length) {
    throw new Error('Synthetic symbols must be unique');
  }
  const rows: WalkthroughRow[] = universe.map(stock => {
    const priorCount = stock.prices.length;
    const hasHistory = priorCount >= LOOKBACK_DAYS;
    const backIndex = hasHistory ? priorCount - LOOKBACK_DAYS : null;
    const skipIndex = hasHistory ? priorCount - SKIP_DAYS : null;
    const pBack = backIndex === null ? null : stock.prices[backIndex]!;
    const pSkip = skipIndex === null ? null : stock.prices[skipIndex]!;
    // Explicit finite/positive validation is a teaching-layer guard. It is not
    // claimed as identical behavior to Python on malformed market inputs.
    const valid = pBack !== null && pSkip !== null && Number.isFinite(pBack)
      && Number.isFinite(pSkip) && pBack > 0 && pSkip > 0;
    return { ...stock, priorCount, backIndex, skipIndex,
      pBack: valid ? pBack : null, pSkip: valid ? pSkip : null,
      momentum: valid ? pSkip / pBack - 1 : null, rank: null, bucket: null,
      selection: 'excluded', reason: hasHistory ? 'Invalid sampled price; signal unavailable.' : `${priorCount} prior sessions; at least ${LOOKBACK_DAYS} required.`,
    };
  });
  // Rank all valid signals before applying the separate short execution guard.
  // Equal values retain supplied order here; the built-in examples have no ties.
  const ordered = rows.filter(row => row.momentum !== null).sort((a, b) => a.momentum! - b.momentum!);
  ordered.forEach((row, index) => {
    row.rank = index + 1;
    row.bucket = Math.min(Math.floor(index / ordered.length * N_BUCKETS), N_BUCKETS - 1) + 1;
    if (row.bucket === N_BUCKETS) {
      row.selection = 'long';
      row.reason = 'Top quintile: a cash long candidate, before full execution checks.';
    } else if (row.bucket === 1) {
      if (!row.eligible) {
        row.selection = 'blocked';
        row.reason = 'Bottom quintile, but the supplied short execution eligibility is false.';
      } else if (row.banned) {
        row.selection = 'blocked';
        row.reason = row.previouslyForceCovered
          ? 'Banned at open and previously force-covered: both opening guards exclude this short.'
          : 'Banned at open: no new short position.';
      } else {
        row.selection = 'short';
        row.reason = 'Bottom quintile and opening guard clear: an SSF short candidate.';
      }
    } else {
      row.selection = 'middle';
      row.reason = 'Middle quintile: outside the two candidate baskets.';
    }
  });
  return rows;
}
