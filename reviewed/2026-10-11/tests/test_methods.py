"""Meaningful checks of independently authored SYNTHETIC methods examples."""

import math
import statistics
import unittest
from decimal import Decimal

from methods.bridge import positive_bridge, repair_from_explicit_factors
from methods.cluster_mean import cluster_mean
from methods.lagged_quality import QualityObservation, calibrate_fold, lagged_log_time_r2
from methods.multiple_testing import fdr_adjust
from methods.units import bps_to_fraction, net_bps, trade_r


class TestMultipleTesting(unittest.TestCase):
    def test_hand_computed_family_and_input_order(self):
        actual = fdr_adjust([0.01, 0.04, 0.03, 0.002])
        for value, expected in zip(actual, [0.02, 0.04, 0.04, 0.008]):
            self.assertAlmostEqual(value, expected)

    def test_by_hand_computed_harmonic_factor(self):
        # H_4 = 25/12. These low p-values do not require clipping.
        actual = fdr_adjust([0.01, 0.04, 0.03, 0.002], "BY")
        for value, expected in zip(actual, [1 / 24, 1 / 12, 1 / 12, 1 / 60]):
            self.assertAlmostEqual(value, expected)

    def test_ties_monotonicity_and_by_is_no_less_conservative(self):
        values = [0, 0.01, 0.01, 0.3, 1]
        bh, by = fdr_adjust(values), fdr_adjust(values, "BY")
        self.assertEqual(bh[1], bh[2])
        self.assertEqual(bh, sorted(bh))
        self.assertEqual(bh[0], 0)
        self.assertEqual(by[-1], 1)
        self.assertTrue(all(a <= b for a, b in zip(bh, by)))

    def test_rejects_invalid_or_missing_p_instead_of_shrinking_family(self):
        for invalid in (None, math.nan, math.inf, -0.1, 1.01):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                fdr_adjust([0.01, invalid, 0.05])
        with self.assertRaises(ValueError):
            fdr_adjust([0.01], "UNKNOWN")

    def test_empty_and_singleton(self):
        self.assertEqual(fdr_adjust([]), [])
        self.assertEqual(fdr_adjust([0.7], "BY"), [0.7])


class TestUnits(unittest.TestCase):
    def test_basis_points_and_percent_are_distinct(self):
        self.assertAlmostEqual(bps_to_fraction(100), 0.01)
        self.assertAlmostEqual(net_bps(12, 15), -3)

    def test_long_and_short_use_signed_initial_risk_and_cost_once(self):
        for side, exit_price, stop in ((1, 110, 95), (-1, 90, 105)):
            result = trade_r(100, exit_price, stop, 1, side)
            self.assertEqual(result, {"risk_per_share": 5, "gross_r": 2, "net_r": 1.8})

    def test_net_loss_can_exceed_one_r(self):
        result = trade_r(100, 90, 95, 1)
        self.assertAlmostEqual(result["net_r"], -2.2)

    def test_scaling_prices_and_cost_preserves_r(self):
        small, large = trade_r(100, 110, 95, 1), trade_r(1000, 1100, 950, 10)
        self.assertEqual(small["gross_r"], large["gross_r"])
        self.assertEqual(small["net_r"], large["net_r"])

    def test_invalid_risk_cost_and_units_fail_explicitly(self):
        for args in ((100, 101, 100), (100, 101, 105), (100, 101, 95, -1), (100, math.inf, 95)):
            with self.subTest(args=args), self.assertRaises(ValueError):
                trade_r(*args)
        with self.assertRaises(ValueError):
            net_bps(1, -1)
        with self.assertRaises(ValueError):
            bps_to_fraction(None)


class TestClusterMean(unittest.TestCase):
    def test_unique_clusters_equal_sample_mean_standard_error(self):
        values = [1, 2, 4, 7]
        result = cluster_mean(values, range(4))
        self.assertAlmostEqual(result["mean"], statistics.mean(values))
        self.assertAlmostEqual(result["se"], statistics.stdev(values) / math.sqrt(4))

    def test_exact_dependent_pair_example_and_replication_invariance(self):
        result = cluster_mean([1, 1, 3, 3], ["A", "A", "B", "B"])
        self.assertEqual(result, {"mean": 2, "se": 1, "n": 4, "clusters": 2})
        duplicated = cluster_mean([1] * 20 + [3] * 20, ["A"] * 20 + ["B"] * 20)
        self.assertEqual(duplicated["se"], result["se"])
        naive = statistics.stdev([1, 1, 3, 3]) / math.sqrt(4)
        self.assertGreater(result["se"], naive)

    def test_empty_and_one_cluster_keep_undefined_uncertainty(self):
        self.assertEqual(cluster_mean([], []), {"mean": None, "se": None, "n": 0, "clusters": 0})
        self.assertIsNone(cluster_mean([1, 3], ["A", "A"])["se"])

    def test_missing_and_bad_pairing_rejected(self):
        for values, groups in (([1], []), ([math.nan], ["A"]), ([1], [None])):
            with self.subTest(values=values), self.assertRaises(ValueError):
                cluster_mean(values, groups)


class TestBridge(unittest.TestCase):
    def test_undefined_nonpositive_nonfinite_and_overflow_ratios(self):
        for adjusted, total in ((None, 1), (0, 1), (-1, 1), (1, 0), (math.inf, 1),
                                (1, math.nan), (1e-308, 1e308), (1e308, 1e-308)):
            with self.subTest(adjusted=adjusted, total=total):
                self.assertIsNone(positive_bridge(adjusted, total))

    def test_rounding_failure_repaired_only_from_explicit_unrounded_inputs(self):
        raw, split_factor, tr_factor = "0.04", "100", "1.02"
        repaired = repair_from_explicit_factors(raw, split_factor, tr_factor)
        split, total = Decimal(repaired["split_adjusted"]), Decimal(repaired["total_return_adjusted"])
        self.assertEqual(split, Decimal("0.0004"))
        self.assertEqual(total, Decimal("0.000408"))
        self.assertEqual(split * Decimal(split_factor), Decimal(raw))
        self.assertIsNone(positive_bridge(split.quantize(Decimal("0.01")), total.quantize(Decimal("0.01"))))
        self.assertAlmostEqual(positive_bridge(split, total), 1.02)
        self.assertEqual(Decimal(repaired["bridge"]), Decimal(tr_factor))

    def test_repair_rejects_float_zero_missing_or_infinite_factors(self):
        for args in ((0.04, "100", "1.02"), ("0.04", "0", "1.02"),
                     ("0.04", "100", "NaN"), ("0.04", "100", "Infinity"),
                     ("invalid", "100", "1.02")):
            with self.subTest(args=args), self.assertRaises(ValueError):
                repair_from_explicit_factors(*args)


class TestLaggedQuality(unittest.TestCase):
    def test_log_linear_path_has_one_r2_and_no_initial_values(self):
        actual = lagged_log_time_r2([math.exp(i / 10) for i in range(8)], 3)
        self.assertEqual(actual[:3], [None, None, None])
        for value in actual[3:]:
            self.assertAlmostEqual(value, 1)

    def test_current_and_future_price_changes_do_not_change_prior_feature(self):
        prices = [1, 2, 4, 8, 16, 32, 64, 128]
        changed = prices[:5] + [1e12, 0, None]
        baseline = lagged_log_time_r2(prices, 3)
        mutated = lagged_log_time_r2(changed, 3)
        self.assertEqual(mutated[:6], baseline[:6])

    def test_flat_and_missing_windows_are_undefined(self):
        for price in (0.0004, 10, 1e100):
            for window in (3, 7, 11):
                with self.subTest(price=price, window=window):
                    self.assertEqual(lagged_log_time_r2([price] * (window + 2), window), [None] * (window + 2))
        self.assertIsNone(lagged_log_time_r2([1, None, 3, 4], 3)[3])
        with self.assertRaises(ValueError):
            lagged_log_time_r2([1, 2, 3], 2)

    def test_hand_calibrated_training_only_terciles_and_counted_missing(self):
        rows = [QualityObservation(1, 0, 0.1), QualityObservation(2, 1, 0.2),
                QualityObservation(3, 2, 0.9), QualityObservation(4, 3, None),
                QualityObservation(2, 1, 1, onset=False), QualityObservation(8, 7, 0)]
        result = calibrate_fold(rows, 1, 4, 5)
        self.assertEqual(result["training_events"], 3)
        self.assertEqual(result["missing_training_events"], 1)
        self.assertAlmostEqual(result["q33"], 1 / 6)
        self.assertAlmostEqual(result["q67"], 13 / 30)
        self.assertEqual(result, calibrate_fold(rows[:-1] + [QualityObservation(8, 7, 1)], 1, 4, 5))

    def test_fold_overlap_unavailable_features_and_insufficient_sample_fail(self):
        rows = [QualityObservation(1, 0, 0.1), QualityObservation(2, 1, 0.2), QualityObservation(3, 2, 0.9)]
        with self.assertRaises(ValueError):
            calibrate_fold(rows, 1, 3, 3)
        with self.assertRaises(ValueError):
            calibrate_fold(rows + [QualityObservation(2, 2, 0.5)], 1, 3, 4)
        with self.assertRaises(ValueError):
            calibrate_fold(rows[:2], 1, 3, 4)

    def test_zero_training_variance_keeps_undefined_standardization(self):
        rows = [QualityObservation(i, i - 1, 0.5) for i in (1, 2, 3)]
        self.assertIsNone(calibrate_fold(rows, 1, 3, 4)["sample_std"])


if __name__ == "__main__":
    unittest.main()
