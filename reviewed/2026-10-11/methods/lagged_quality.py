"""SYNTHETIC lagged R² and fold-only calibration; independently authored.

No historical engine parity or new trading inference is asserted.
Attribution and changes: methods/ATTRIBUTION.json. All rights reserved.
"""

from dataclasses import dataclass
from math import fsum, isfinite, log
from statistics import mean, stdev


def lagged_log_time_r2(prices, window):
    """At t use prices[t-window:t]; missing/flat windows produce None.

Rows are synthetic consecutive sessions, supplied in chronological order. Real
exchange calendars, adjustment rights and point-in-time vintages are out of scope.
"""
    if type(window) is not int or window < 3:
        raise ValueError("at least three prior sessions are required")
    observed = list(prices)
    result = [None] * len(observed)
    time_mean = (window - 1) / 2
    time_variance = fsum((position - time_mean) ** 2 for position in range(window))
    for session in range(window, len(observed)):
        try:
            sample = [float(price) for price in observed[session - window:session]]
        except (TypeError, ValueError, OverflowError):
            continue
        if any(not isfinite(price) or price <= 0 for price in sample):
            continue
        if min(sample) == max(sample):
            continue
        logged = [log(price) for price in sample]
        log_mean = fsum(logged) / window
        centered = [value - log_mean for value in logged]
        log_variance = fsum(value ** 2 for value in centered)
        if log_variance == 0:
            continue
        covariance = fsum((position - time_mean) * value for position, value in enumerate(centered))
        result[session] = min(1.0, max(0.0, covariance ** 2 / (time_variance * log_variance)))
    return result


@dataclass(frozen=True)
class QualityObservation:
    session: int
    available_session: int
    value: float | None
    onset: bool = True


def _linear_quantile(sample, probability):
    position = (len(sample) - 1) * probability
    lower = int(position)
    upper = min(lower + 1, len(sample) - 1)
    return sample[lower] + (sample[upper] - sample[lower]) * (position - lower)


def calibrate_fold(observations, train_start, train_end, validation_start, minimum_events=3):
    """Learn terciles/moments from finite training onset values available at t-1.

Training must end before validation. Later data never enters this fold's sample.
Caller-supplied availability clocks are checked; a feature labelled as arriving
at or after its onset is rejected. Missing feature values remain excluded and counted.
"""
    if not train_start <= train_end < validation_start or minimum_events < 2:
        raise ValueError("ordered separated folds and minimum_events >= 2 required")
    sample = []
    missing = 0
    for observation in observations:
        if not observation.onset or not train_start <= observation.session <= train_end:
            continue
        if observation.available_session >= observation.session:
            raise ValueError("training feature was unavailable at its prior-session cutoff")
        if observation.value is None:
            missing += 1
            continue
        value = float(observation.value)
        if not isfinite(value) or not 0 <= value <= 1:
            raise ValueError("quality R² must be finite and in [0, 1]")
        sample.append(value)
    if len(sample) < minimum_events:
        raise ValueError("insufficient finite training onset observations")
    sample.sort()
    standard_deviation = stdev(sample)
    return {"training_events": len(sample), "missing_training_events": missing,
            "q33": _linear_quantile(sample, 1 / 3), "q67": _linear_quantile(sample, 2 / 3),
            "mean": mean(sample), "sample_std": standard_deviation or None,
            "train_start": train_start, "train_end": train_end,
            "validation_start": validation_start}
