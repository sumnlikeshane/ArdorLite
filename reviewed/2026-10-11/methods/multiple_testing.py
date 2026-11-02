"""SYNTHETIC demonstration of public BH/BY adjusted-p mathematics.

Independently authored for the handoff; not the historical Ardor implementation.
Attribution, source hashes, changes and limitations: methods/ATTRIBUTION.json.
All rights reserved. No open-source licence is granted by this demonstration.
"""

from math import fsum, isfinite


def fdr_adjust(p_values, correction="BH"):
    """Adjust one declared complete family of finite p-values in [0, 1].

Reject missing/invalid values so the family cannot silently shrink. The empty
family returns []. Output order is the input order; tied p-values agree.
"""
    if correction not in ("BH", "BY"):
        raise ValueError("correction must be BH or BY")
    try:
        values = [float(p) for p in p_values]
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError("a complete numerical p-value family is required") from exc
    if any(not isfinite(p) or not 0 <= p <= 1 for p in values):
        raise ValueError("p-values must be finite and between zero and one")
    size = len(values)
    if not size:
        return []
    multiplier = fsum(1 / rank for rank in range(1, size + 1)) if correction == "BY" else 1
    ordered = sorted(enumerate(values), key=lambda item: item[1])
    result = [0.0] * size
    ceiling = 1.0
    for position in range(size - 1, -1, -1):
        original_index, p_value = ordered[position]
        ceiling = min(ceiling, p_value * size * multiplier / (position + 1))
        result[original_index] = ceiling
    return result
