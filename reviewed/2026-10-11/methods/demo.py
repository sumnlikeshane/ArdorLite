"""Run labelled SYNTHETIC software examples; no market evidence or strategy inference."""

import json

from .bridge import positive_bridge, repair_from_explicit_factors
from .cluster_mean import cluster_mean
from .lagged_quality import QualityObservation, calibrate_fold, lagged_log_time_r2
from .multiple_testing import fdr_adjust
from .units import bps_to_fraction, net_bps, trade_r


def main():
    repaired = repair_from_explicit_factors("0.04", "100", "1.02")
    rows = [QualityObservation(i, i - 1, quality) for i, quality in enumerate((0.1, 0.2, 0.9), 1)]
    demonstration = {
        "label": "SYNTHETIC SOFTWARE EXAMPLES — NOT MARKET EVIDENCE",
        "reproduction_level": "executable_example",
        "bh": fdr_adjust([0.01, 0.04, 0.03, 0.002]),
        "by": fdr_adjust([0.01, 0.04, 0.03, 0.002], "BY"),
        "units": {"100_bps_as_return_fraction": bps_to_fraction(100),
                  "synthetic_net_bps": net_bps(12, 15), "synthetic_trade": trade_r(100, 110, 95, 1)},
        "cluster_mean": cluster_mean([1, 1, 3, 3], ["A", "A", "B", "B"]),
        "bridge": {"rounded_bridge": positive_bridge(0, 0), "explicit_factor_repair": repaired},
        "lagged_quality": {"synthetic_log_linear_path_r2": lagged_log_time_r2([1, 2, 4, 8, 16], 3),
                           "synthetic_fold": calibrate_fold(rows, 1, 3, 4)},
    }
    print(json.dumps(demonstration, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
