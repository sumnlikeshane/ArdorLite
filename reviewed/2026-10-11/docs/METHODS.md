# Reviewed methods collection

Prepared 11 October 2026. These five small Python examples are **SYNTHETIC SOFTWARE DEMONSTRATIONS — NOT MARKET EVIDENCE**. They demonstrate mathematical and timing contracts. They do not replicate an Ardor study, evaluate a strategy, reopen a holdout, or provide trading signals. Their reproduction level is `executable_example`; historical research retains its separate archived/transcription/private-input labels.

Run from the handoff root with Python 3.10 or newer:

```sh
python3 -B -E -m unittest discover -s tests -p test_methods.py -v
python3 -B -E -m methods.demo
```

The examples use only Python's standard library. No installation, network, warehouse, market files, broker account or Ardor import is required. `methods/validation.json` records the actual checks. `content/methods.json` supplies the website inventory. `methods/ATTRIBUTION.json` records reviewed source paths, actual current-byte hashes and the changes in treatment.

The source project declares `Proprietary` licensing and identifies TradeX ports. The handoff therefore contains independently authored demonstrations of public mathematical methods instead of historical implementation excerpts. The original modules and third-party assets are excluded. **All rights reserved; this handoff grants no open-source licence.** A receiving agent must preserve this notice and obtain an actual release instruction before publishing.

## Executable synthetic examples

### Multiple testing

[`multiple_testing.py`](../methods/multiple_testing.py) implements BH/BY adjusted p-values for a complete declared family. Sort p-values as `p_(i)`, with family size `m`; BH uses `min(1, min_(j≥i)(m*p_(j)/j))`. BY multiplies by `H_m = sum_(k=1..m)(1/k)` before the same backward minimum. Results return to input order, including ties.

BH's guarantees depend on appropriate dependence assumptions; BY supplies the conservative arbitrary-dependence correction for valid marginal p-values. Neither fixes invalid underlying tests, selective reporting, an incorrectly declared family, or reused development history. See the original [Benjamini–Hochberg paper](https://rss.onlinelibrary.wiley.com/doi/10.1111/j.2517-6161.1995.tb02031.x) and [Benjamini–Yekutieli paper](https://doi.org/10.1214/aos/1013699998).

The synthetic input `[0.01, 0.04, 0.03, 0.002]` produces BH `[0.02, 0.04, 0.04, 0.008]`. BY uses `H_4 = 25/12`. Checks compare those hand-computed values, ties, order and clipping. Missing/non-finite/out-of-range p-values are rejected; the family never silently shrinks. This deliberately differs from the source array helper's invalid-entry policy. No missing source metric becomes a zero p-value.

### Gross/net bps and fixed initial R

[`units.py`](../methods/units.py) keeps return fractions, basis points and risk units explicit: `1 bp = 0.0001` of a return fraction. `net_bps = gross_bps - complete_round_trip_cost_bps`. The caller supplies costs; no real fee, tax or statutory assumptions are embedded.

For a synthetic long entered at 100, stopped initially at 95 and exited at 110, initial risk is 5 per share. A complete round-trip cost of 1 per share gives `gross = 2R` and `net = 1.8R`. Shorts use signed P&L and a stop above entry. R's denominator stays fixed at initial price risk, excluding cost; an actual net loss may exceed `-1R`. This differs from a target net-risk/reward ratio and is not the source screener's tax-aware model.

Checks verify long/short accounting, a loss beyond the stop, cost subtraction once, unit conversion and scale invariance. This module makes no historical expectancy or cost-impact claim.

### Dependence-aware uncertainty arithmetic

[`cluster_mean.py`](../methods/cluster_mean.py) computes one-way CR1 uncertainty for an intercept-only mean. For `n` observations, mean `xbar`, `G` declared clusters and each cluster's residual sum `S_g`, `SE = sqrt((G/(G-1))*sum(S_g²))/n`. The intercept-only degrees-of-freedom term `(n-1)/(n-k)` is one because `k=1`.

Within-cluster dependence is allowed, with independent clusters required for the usual asymptotic interpretation. Few clusters, serial overlap across labels or misspecified clustering need separate treatment. The example does not supply a p-value, confidence interval, two-way covariance estimator, bootstrap, or study-specific inference. See [Cameron and Miller's practitioner guide](https://escholarship.org/uc/item/1jq5d0pq).

Synthetic values `[1,1,3,3]` grouped as `[A,A,B,B]` give mean 2 and cluster SE 1. Replicating rows within the same homogeneous clusters preserves that SE instead of manufacturing independent observations. Unique labels reproduce the usual sample-mean SE. Empty samples and one-cluster uncertainty use `None`, rendered as JSON `null`, and never a fabricated zero.

### Finite positive bridge and explicit-input repair

[`bridge.py`](../methods/bridge.py) validates `total_return_adjusted / split_adjusted` as finite and strictly positive. Missing, zero, negative or non-finite prices, and ratio overflow/underflow, produce an undefined bridge (`None`). Finite positive endpoints alone are insufficient if the division is unrepresentable.

The labelled synthetic repair supplies **unrounded inputs explicitly**: raw close `0.04`, split factor `100` and total-return factor `1.02`. Decimal arithmetic gives split-adjusted close `0.0004` and total-return-adjusted close `0.000408`, hence bridge `1.02`. Rounding both adjusted prices to two decimals destroys them as `0.00` and yields no valid bridge. The repair restarts from the supplied unrounded raw value and factors; it cannot infer a lost value from two rounded zeros. Its 50-digit Decimal working precision is finite, not an arbitrary exact-arithmetic promise.

Checks verify exact linkage for these synthetic terminating-decimal inputs, the rounded failure, the rebuilt ratio, invalid factors and binary-float overflow. The example does not discover corporate actions, export raw observations, reproduce the historical warehouse repair, or establish data source rights. Technical bridge validity and rights certification remain separate.

### Lagged quality and training-only fold calibration

[`lagged_quality.py`](../methods/lagged_quality.py) computes log-price/time R² directly with centred sums. At synthetic session `t`, it uses exactly `prices[t-window:t]`, ending at `t-1`. Missing/non-positive/non-finite windows and constant-price windows have undefined R² (`None`). Minimum lookback is three prior sessions.

Fold calibration accepts explicit event and availability session indices. Training ends strictly before validation starts. Only training onset events whose quality was available by the prior session enter the sample. It learns linear-interpolated terciles, the sample mean and sample standard deviation; missing events are excluded and counted. Zero training variance leaves standardization undefined. This small teaching contract adds explicit availability checks; it does not reproduce the vectorized source engines, manifests, actual fold schedules, event generation, source vintages or historical results.

Checks mutate current/future prices and validation observations to prove that prior features and training thresholds stay fixed, verify hand-calculated terciles, and reject overlapping folds, unavailable features and insufficient samples. Synthetic consecutive row positions are not an exchange calendar. A caller's availability label remains a contract to verify against real source vintages in a separate research task.

## Source capability inventory

| Capability | Observed source maturity | Handoff treatment |
| --- | --- | --- |
| Shared metrics and screener cost accounting | Implemented source functions | Independent bps/R demonstration; no source cost schedule, tax model or TradeX-derived excerpt |
| BH/BY family corrections | Implemented source functions | Independent strict-input demonstration; no archived inference rerun |
| Event-study returns, fillability and clustered uncertainty | Implemented source tool | Independent one-way mean SE only; no panel, database or per-event ledger |
| Lagged quality and fold calibration | Implemented source helpers | Independent synthetic lag/calibration contract; no claim of current-code parity with sealed historical studies |
| Bridge audit and corporate-action adjustment | Implemented source tools | Tiny explicit-factor synthetic example; no row-level exceptions, raw prices or factor inference |
| Experiment tracking, feasibility checks and ledger-integrity functions | Implemented source modules inspected | Descriptive inventory only; protected registries, hashes of their rows and operational configuration excluded |
| Generic backtest engine | Specification only/deferred | Planned capability; no executable public engine |
| Concrete broker adapters | Protocol/scaffold; adapters deferred | Planned capability; no broker integration or operational sample |
| CPCV/PBO | Unfinished/planned in the preparation plan | Planned capability; no implementation claim or verification |

Source code presence and these synthetic checks do not establish a certified strategy. In particular, ledger-integrity functions being implemented does not resolve the separately reported historical seal discrepancies.

The source project declares optional dependency groups for database access, ingestion, research, process tracking, alerts, development, brokers and the screener. For example, statsmodels/matplotlib/Plotly/JupyterLab are declared research extras and MLflow/APScheduler process extras. Declaration is not evidence of installation, execution or completed capability. None is a dependency of these five examples. See the inspected source `pyproject.toml` hash in the attribution record.

## Receiving-agent rules

Keep the synthetic label visible beside demonstrations and downloads. Use archived study evidence for research figures and these examples for method teaching. Preserve undefined values as null, the separate strategy verdicts and reproduction levels, and the all-rights-reserved notice. Do not describe these files as untouched historical implementations or historical replication. New market experiments and expanded implementations remain outside the preparation scope.
