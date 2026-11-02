export type ConditionState = 'passed' | 'failed' | 'unavailable' | 'not_applicable' | 'not_evaluated';
export interface FoldInputs {
  role: 'candidate' | 'comparator';
  complete: boolean;
  candidateCagr?: number | string | null;
  s0Cagr?: number | string | null;
  matchedCagr?: number | string | null;
  emaCagr?: number | string | null;
  sharpe?: number | null;
  archived?: boolean;
}
export function inspectFold(inputs: FoldInputs) {
  const decimal = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || typeof value === 'number' && !Number.isFinite(value)) return null;
    const match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
    if (!match) return null;
    const exponent = Number(match[4] ?? 0) - (match[3]?.length ?? 0);
    if (Math.abs(exponent) > 1000) return null;
    return { integer: BigInt((match[1] ?? '') + match[2] + (match[3] ?? '')), exponent };
  };
  const compare = (a: number | string | null | undefined, b: number | string | null | undefined): ConditionState => {
    const left = decimal(a), right = decimal(b);
    if (!left || !right) return 'unavailable';
    const exponent = Math.min(left.exponent,right.exponent);
    return left.integer * 10n ** BigInt(left.exponent-exponent) > right.integer * 10n ** BigInt(right.exponent-exponent) ? 'passed' : 'failed';
  };
  const inactive: ConditionState | null = inputs.role === 'comparator' ? 'not_applicable' : !inputs.complete ? 'not_evaluated' : null;
  const conditions: ConditionState[] = inactive ? [inactive, inactive, inactive] : [
    compare(inputs.candidateCagr, inputs.s0Cagr), compare(inputs.matchedCagr, inputs.emaCagr), compare(inputs.sharpe, 0),
  ];
  const evaluation: ConditionState = inactive ?? (conditions.includes('unavailable') ? 'unavailable'
    : conditions.every(state => state === 'passed') ? 'passed' : 'failed');
  const consistency = evaluation === 'passed' || evaluation === 'failed'
    ? inputs.archived === undefined ? 'unavailable' : inputs.archived === (evaluation === 'passed') ? 'agrees' : 'disagrees'
    : 'unavailable';
  return { conditions, evaluation, consistency, archived: inputs.archived } as const;
}
