"""SYNTHETIC bps and initial-risk accounting, independently authored.

No fee schedule, tax rule, statutory rate or market data is encoded here.
Attribution and changes: methods/ATTRIBUTION.json. All rights reserved.
"""

from math import isfinite


def _number(value):
    try:
        result = float(value)
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError("finite numerical input required") from exc
    if not isfinite(result):
        raise ValueError("finite numerical input required")
    return result


def net_bps(gross_bps, round_trip_cost_bps):
    """Return gross minus non-negative complete round-trip cost, in basis points."""
    gross, cost = _number(gross_bps), _number(round_trip_cost_bps)
    if cost < 0:
        raise ValueError("round-trip cost cannot be negative")
    return gross - cost


def bps_to_fraction(basis_points):
    """One basis point is 0.0001 of a return fraction (0.01 percent)."""
    return _number(basis_points) / 10_000


def trade_r(entry, exit_price, initial_stop, cost_per_share=0, side=1):
    """Compute signed P&L in initial R for side=1 (long) or side=-1 (short).

R is the positive initial entry-to-stop distance, without costs. The denominator
is fixed at entry; realized loss and net P&L can exceed -1R. Explicit per-share
cost is the complete round trip and is deducted once from signed gross P&L.
"""
    entry, exit_price, stop, cost = map(_number, (entry, exit_price, initial_stop, cost_per_share))
    if side not in (1, -1) or min(entry, exit_price, stop) <= 0 or cost < 0:
        raise ValueError("positive prices, non-negative cost and side +/-1 required")
    risk = side * (entry - stop)
    if risk <= 0:
        raise ValueError("the initial stop must define positive signed risk")
    gross = side * (exit_price - entry)
    return {"risk_per_share": risk, "gross_r": gross / risk, "net_r": (gross - cost) / risk}
