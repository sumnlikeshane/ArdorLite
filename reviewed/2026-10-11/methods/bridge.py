"""SYNTHETIC positive-bridge detection and explicit-factor repair.

Independently authored; not historical adjustment or certification code.
No factor is estimated or inferred. Source rights are not certified here.
Attribution and changes: methods/ATTRIBUTION.json. All rights reserved.
"""

from decimal import Decimal, InvalidOperation, localcontext
from math import isfinite


def positive_bridge(split_adjusted, total_return_adjusted):
    """Return a finite positive binary-float ratio, otherwise None (undefined)."""
    try:
        split, total = float(split_adjusted), float(total_return_adjusted)
    except (TypeError, ValueError, OverflowError):
        return None
    if not all(isfinite(value) and value > 0 for value in (split, total)):
        return None
    ratio = total / split
    return ratio if isfinite(ratio) and ratio > 0 else None


def repair_from_explicit_factors(raw_close, split_factor, total_return_factor):
    """Rebuild synthetic prices from supplied positive decimal strings.

`split_adjusted = raw_close / split_factor`; `total_return_adjusted =
split_adjusted * total_return_factor`. Inputs must describe already known
factors: this function does not discover corporate actions or reconstruct a
price lost to rounding. Return decimal strings without two-decimal rounding.
"""
    if not all(isinstance(value, str) for value in (raw_close, split_factor, total_return_factor)):
        raise ValueError("explicit unrounded decimal strings are required")
    try:
        raw, split, total = map(Decimal, (raw_close, split_factor, total_return_factor))
    except InvalidOperation as exc:
        raise ValueError("positive finite decimal inputs required") from exc
    if not all(value.is_finite() and value > 0 for value in (raw, split, total)):
        raise ValueError("positive finite decimal inputs required")
    with localcontext() as context:
        context.prec = 50
        adjusted = raw / split
        tr_adjusted = adjusted * total
        if not all(value.is_finite() and value > 0 for value in (adjusted, tr_adjusted)):
            raise ValueError("unrepresentable synthetic adjustment")
        return {"split_adjusted": str(adjusted), "total_return_adjusted": str(tr_adjusted),
                "bridge": str(tr_adjusted / adjusted)}
