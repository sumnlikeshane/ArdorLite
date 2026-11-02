"""SYNTHETIC intercept-only CR1 arithmetic; independently authored.

Attribution and assumptions: methods/ATTRIBUTION.json and docs/METHODS.md.
All rights reserved. This example computes no p-value or strategy verdict.
"""

from collections import defaultdict
from math import fsum, isfinite, sqrt


def cluster_mean(values, groups):
    """Compute the mean and one-way CR1 standard error for declared clusters.

One cluster has an observed mean but an undefined cluster standard error (None).
Reject non-finite observations and missing cluster labels; do not silently drop
them. Dependence between clusters is outside this simple example's assumptions.
"""
    values, groups = list(values), list(groups)
    if len(values) != len(groups):
        raise ValueError("one cluster label per observation is required")
    try:
        numbers = [float(value) for value in values]
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError("finite observations required") from exc
    if any(not isfinite(value) for value in numbers) or any(group is None for group in groups):
        raise ValueError("finite observations and non-missing cluster labels required")
    count = len(numbers)
    if not count:
        return {"mean": None, "se": None, "n": 0, "clusters": 0}
    mean = fsum(numbers) / count
    residuals = defaultdict(list)
    for value, group in zip(numbers, groups):
        residuals[group].append(value - mean)
    cluster_count = len(residuals)
    if cluster_count < 2:
        se = None
    else:
        meat = fsum(fsum(errors) ** 2 for errors in residuals.values())
        se = sqrt(cluster_count / (cluster_count - 1) * meat) / count
    return {"mean": mean, "se": se, "n": count, "clusters": cluster_count}
