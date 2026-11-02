# Reviewed featured evidence

Observation date: 11 October 2026. These are authored, sanitized derivatives of identified archived research. Original reports, source code, market observations and protected ledgers are excluded. Source paths below are provenance labels; every public evidence link points to included content.

No result in this launch set is a certified or live strategy. Research status, numerical repair maturity and reproduction scope remain separate.

## Case decisions and included evidence

### atlas-ssf

[Standalone narrative](../../content/cases/atlas-ssf.md).

- [Accepted Atlas cumulative gate funnel](../tables/atlas-gates.json): `discovery_map_only`; units `cells`. Extraction: Recount recorded accepted-cell fields using frozen gate predicates; gate counts checked against report. Zero formal nominations transcribed from report, because nominations require separate governance.

  Provenance: `docs/discovery/ATLAS_v1_RESULTS.md` (`src-01377cbc2972`), `data/research/atlas_v1/9232e16d-b8de-4039-9c11-31d718eacfb0.jsonl` (`src-3da0d4ccff37`), `config/research/atlas_v1.yaml` (`src-1a618c29038e`).

- [Corrected SSF gross and net excess](../tables/ssf-economics.json): `stand_down`; units `basis points per filled event`. Extraction: Select recorded mean_bps and two_way_t fields; no inferred stress points or break-even extrapolation.

  Provenance: `data/research/atlas_followup/atlas_clv_downside_translation_v1_0_1.json` (`src-2513644cee25`).

- [Corrected SSF capacity conventions](../tables/ssf-capacity.json): `stand_down`; units `INR crore`. Extraction: Select equal-notional median/p10/minimum. Include liquidity-proportional median solely as a labelled non-gate diagnostic.

  Provenance: `data/research/atlas_followup/atlas_clv_downside_translation_v1_0_1.json` (`src-2513644cee25`).



### momentum-v2

[Standalone narrative](../../content/cases/momentum-v2.md).

- [Momentum v2 execution stress mean tests](../tables/momentum-execution.json): `tested_killed`; units `HAC t statistic`. Extraction: Transcribe Phase 0 reported t statistics at exactly the three recorded impact stress points.

  Provenance: `docs/strategies/REPORT_momentum_xs_v2.md` (`src-bc684a860e5e`).

- [Momentum v2 retained factor exposures](../tables/momentum-exposures.json): `tested_killed`; units `factor beta`. Extraction: Transcribe diagnostics; the MKT coefficient comes from the three-factor regression and WML from the four-factor diagnostic.

  Provenance: `docs/strategies/REPORT_momentum_xs_v2.md` (`src-bc684a860e5e`).

- [Momentum v2 return and residual alpha](../tables/momentum-alpha.json): `tested_killed`; units `annual percent`. Extraction: Transcribe raw book annual return and three-factor residual alpha as separately labelled quantities; omit disputed benchmark difference.

  Provenance: `docs/strategies/REPORT_momentum_xs_v2.md` (`src-bc684a860e5e`).



### swing-autopsy

[Standalone narrative](../../content/cases/swing-autopsy.md).

- [Swing gross, net and corrected V2 co-gates](../tables/swing-expectancy.json): `tested_killed`; units `R per filled trade`. Extraction: Select V1 saved gross/net means and corrected V2 year-net and trimmed-10% means. Keep designs and tax conventions in labels.

  Provenance: `screener/validation/outputs/v1_exit_autopsy.json` (`src-18ca4fa1211e`), `screener/validation/outputs/v2_replay_curr_2026-06-05.json` (`src-5a3ae8610009`).

- [Swing excursion versus realized net by exit cause](../tables/swing-excursion.json): `tested_killed`; units `R`. Extraction: Select aggregate MFE and realized net by observed exit cause; group counts retained. MFE is path excursion, not an executable return.

  Provenance: `screener/validation/outputs/v1_exit_autopsy.json` (`src-18ca4fa1211e`).

- [Fourteen whole-book exit policies — in-sample diagnostic](../tables/swing-policies.json): `tested_killed`; units `net R per filled trade`. Extraction: Select P0–P13 from all-book aggregate; P0 is baseline, 13 are alternatives. Exclude CEILING_exit_at_peak and subset searches. No row-level trade records read or exported.

  Provenance: `screener/validation/outputs/v1_exit_autopsy.json` (`src-18ca4fa1211e`).



### trend-quality

[Standalone narrative](../../content/cases/trend-quality.md).

- [Trend quality historical CAGR with comparable-risk controls](../tables/trend-controls.json): `tested_killed`; units `annual percent`. Extraction: Select S0, unfiltered EMA20/50, V5 and buy-and-hold. Multiply fractional rates/exposures by 100; retain Sharpe and recorded CAGR scaled to EMA risk as additional fields. No synthetic NAV.

  Provenance: `data/research/trend_quality_immediate_entry_v1/strategy_comparison.csv` (`src-23f0e40c4c44`).

- [Trend quality familywise selection adjustment](../tables/trend-selection.json): `tested_killed`; units `p-value`. Extraction: Select recorded familywise max-t and raw bootstrap p for V1–V5, no new inference. Familywise pass threshold 0.05.

  Provenance: `data/research/trend_quality_immediate_entry_v1/selection_adjustment.csv` (`src-6d49d801b740`).

- [V5 and binding EMA control across complete and partial folds](../tables/trend-folds.json): `tested_killed`; units `Sharpe ratio`. Extraction: Select recorded fold Sharpe for V5 and unfiltered EMA. Preserve complete flag and V5 conjunctive gate. Do not count partial fold as a fifth complete fold.

  Provenance: `data/research/trend_quality_immediate_entry_v1/walk_forward.csv` (`src-2adacd9e9309`).



### delivery-insider

[Standalone narrative](../../content/cases/delivery-insider.md).

- [Validated delivery/insider primary cash forward excess](../tables/delivery-cash.json): `tested_killed`; units `basis points over 10 sessions`. Extraction: Transcribe validated primary-cell cash h=10 excess and reported fill counts. No contaminated recomputation or favorable post-hoc threshold.

  Provenance: `docs/postmortems/POSTMORTEM_delivery_x_insider_B8.md` (`src-30e89f2139b6`).

- [Validated delivery/insider SSF settle-proxy forward excess](../tables/delivery-ssf.json): `tested_killed`; units `basis points over 10 sessions`. Extraction: Transcribe primary-cell SSF h=10 excess and t. Execution limitation comes from build_ssf_price_pivots in the source driver; no future-open execution claim.

  Provenance: `docs/postmortems/POSTMORTEM_delivery_x_insider_B8.md` (`src-30e89f2139b6`), `scripts/discovery/discovery_0a_delivery_x_insider.py` (`src-6fcaa7ff17d2`).

- [Incremental effect of surge-preceded insider disclosure](../tables/delivery-interaction.json): `tested_killed`; units `basis points over 10 sessions`. Extraction: Transcribe reported surge/non-surge means and regression beta; beta -0.0029 fractional return ×10,000 = -29 bps. Association enrichment is separately identified, never plotted on this return axis.

  Provenance: `docs/postmortems/POSTMORTEM_delivery_x_insider_B8.md` (`src-30e89f2139b6`).



### price-bridge

[Standalone narrative](../../content/cases/price-bridge.md).

- [Price bridge invalidity before and after repair](../tables/bridge-invalid.json): `research_infrastructure`; units `observed rows`. Extraction: Select recorded before/after invalid_bridge_rows; do not export exception row identities, symbol/date ranges or raw IDs.

  Provenance: `data/research/trend_following_price_bridge_certification_v1_1/before_after_validation_summary.json` (`src-3f6afd0415da`).

- [Price bridge completeness and exact linkage](../tables/bridge-linkage.json): `research_infrastructure`; units `observed rows`. Extraction: Select total observed rows, finite-positive bridges and exact raw-linked count from complete after audit; counts overlap and must not be summed.

  Provenance: `data/research/trend_following_price_bridge_certification_v1_1/before_after_validation_summary.json` (`src-3f6afd0415da`).

- [Technical and source-rights certifications](../tables/bridge-certification.json): `blocked_before_returns`; units `certification flag (1=true, 0=false)`. Extraction: Boolean flags are encoded explicitly 1=true,0=false solely for chart display; they are not performance scores. Preserve source boolean as additional value.

  Provenance: `data/research/trend_following_price_bridge_certification_v1_1/before_after_validation_summary.json` (`src-3f6afd0415da`), `data/research/trend_following_price_bridge_certification_v1_1/source_provenance_reconciliation.json` (`src-a34cf0eda79c`).



## Exact transformations and decision safeguards

- Atlas gate figures recount only recorded aggregate cell fields under the frozen predicates. Null regime means cannot pass sign agreement. Reported formal nominations remain zero; cell statistics cannot supply a governance nomination.

- SSF economics and capacity use execution-QA v1.0.1. Equal-notional capacity is binding; the higher liquidity-proportional ADV sum is diagnostic.

- Momentum figures are identified report transcriptions. The inconsistent benchmark arithmetic and unsupported regression interval are omitted.

- Swing uses aggregate JSON, including exact P0–P13 whole-book means and corrected constant-risk V2 accounting. Hindsight ceilings, selected subsets and row-level CSVs are omitted. Null bear metrics stay null.

- Trend fractional returns/exposure/volatility are multiplied by 100 for percentage display. Four complete folds and a separately labelled partial fold are preserved. Familywise p-values and gate outcomes are saved values, not new tests.

- Delivery/insider figures use the validated primary set. Association enrichment is distinct from predictive t; SSF settle proxy and ever-in-F&O universe are disclosed. Beta −0.0029 is converted to −29 bps using ×10,000.

- Bridge counts use the later complete certification. Boolean flags are encoded explicitly for charts, and technical success cannot override false rights certification. No restricted price observations or exception identities are included.

## Reproduction and publication boundary

`archived_result` means included saved aggregates can be inspected and their display transformations repeated. `report_transcription` means values were explicitly transcribed from a named report without a complete underlying result artifact in this handoff. Full historical study replication is `private_inputs_required`. Selected synthetic code examples elsewhere in the handoff are `executable_example`, not market evidence.

Publication review is derivative-specific: the authorized task permits these newly authored summaries and narrowly selected descriptive research outcomes for a portable handoff. No blanket ownership or licence grant over original research, code, datasets or source receipts is inferred. Public release and any market-data reuse remain separate decisions.

[Machine-readable claim registry](../claims.json) supplies values, units, source pointers, reproduction levels and material caveats. Per-table linked claim IDs cover every numerical field selected for display. Source byte hashes and derivative hashes are carried in the handoff manifest; private source inventory remains outside the allowlisted handoff.

## Accessible numerical equivalents

All values below come from the linked reviewed table and its claim IDs. Missing means unavailable; it never becomes zero. Rates carry explicit percent/basis-point/R units.

### Accepted Atlas cumulative gate funnel

[Reviewed table](../tables/atlas-gates.json). Status: `discovery_map_only`.

| Observation | Value (cells) |
| --- | --- |
| Accepted cells | 1,264 |
| Absolute two-way t gate | 312 |
| Plus BH q gate | 312 |
| Plus regime-sign agreement | 294 |
| Plus concentration limits | 293 |
| Plus fillable sample requirement | 293 |
| Formal nominations | 0 |

### Corrected SSF gross and net excess

[Reviewed table](../tables/ssf-economics.json). Status: `stand_down`.

| Observation | Value (basis points per filled event) | two way t (t statistic) |
| --- | --- | --- |
| Gross excess | 6.8536806 | 3.6638343 |
| Dated statutory-only | 5.1071294 | 2.7298935 |
| Net 0.5× impact | 2.1819435 | 1.1642447 |
| Net 1× impact | -0.7432423 | -0.39556944 |
| Net 2× impact | -6.593614 | -3.4833746 |
| Current statutory-only counterfactual | 1.1982006 | 0.64053296 |

### Corrected SSF capacity conventions

[Reviewed table](../tables/ssf-capacity.json). Status: `stand_down`.

| Observation | Value (INR crore) |
| --- | --- |
| Equal-notional median daily | 43.91485 |
| Equal-notional 10th-percentile daily | 14.083595 |
| Equal-notional minimum daily | 1.407285 |
| ADV-sum median — diagnostic only | 233.2858 |

### Momentum v2 execution stress mean tests

[Reviewed table](../tables/momentum-execution.json). Status: `tested_killed`.

| Observation | Value (HAC t statistic) |
| --- | --- |
| 0.5× impact | 2.64 |
| 1× impact | 2.46 |
| 2× impact | 2.09 |

### Momentum v2 retained factor exposures

[Reviewed table](../tables/momentum-exposures.json). Status: `tested_killed`.

| Observation | Value (factor beta) | reported t (t statistic) |
| --- | --- | --- |
| MKT_ew — three-factor | 0.48 | 6.41 |
| WML — four-factor diagnostic | 0.82 | unavailable |

### Momentum v2 return and residual alpha

[Reviewed table](../tables/momentum-alpha.json). Status: `tested_killed`.

| Observation | Value (annual percent) | reported hac t (HAC t statistic) |
| --- | --- | --- |
| Raw book diagnostic | 9.11 | unavailable |
| Three-factor residual alpha | -6.1 | -0.98 |

### Swing gross, net and corrected V2 co-gates

[Reviewed table](../tables/swing-expectancy.json). Status: `tested_killed`.

| Observation | Value (R per filled trade) |
| --- | --- |
| V1 gross | 0.1374 |
| V1 net — per-win tax | -0.1313 |
| V2 corrected year-net | 0.1762 |
| V2 trimmed-10% co-gate | -0.1258 |

### Swing excursion versus realized net by exit cause

[Reviewed table](../tables/swing-excursion.json). Status: `tested_killed`.

| Observation | Value (R) | filled trades (trades) |
| --- | --- | --- |
| Stop — maximum favorable excursion | 1.0943 | 124 |
| Stop — realized net | -1.1876 | unavailable |
| Target — maximum favorable excursion | 3.9707 | 26 |
| Target — realized net | 2.815 | unavailable |
| Time exit — maximum favorable excursion | 1.7305 | 78 |
| Time exit — realized net | 0.5658 | unavailable |

### Fourteen whole-book exit policies — in-sample diagnostic

[Reviewed table](../tables/swing-policies.json). Status: `tested_killed`.

| Observation | Value (net R per filled trade) |
| --- | --- |
| P0 baseline replayed | -0.1313 |
| P1 bank at 1R | -0.0852 |
| P2 bank at 1.5R | -0.1122 |
| P3 bank at 2R | -0.1426 |
| P4 partial50 at 1.5R then BE | -0.1 |
| P5 BE after 1R | -0.0434 |
| P6 trail 1.5R after 1R | -0.0754 |
| P7 time10 only | -0.1397 |
| P8 stall close below 5d low | -0.1402 |
| P9 widestop 2x same target | -0.0987 |
| P10 widestop 2x bank 1R | -0.0826 |
| P11 widestop 2x BE1R bank 2R | -0.0867 |
| P12 widestop 1.5x bank 1R time10 | -0.0939 |
| P13 bank 1R time10 | -0.1218 |

### Trend quality historical CAGR with comparable-risk controls

[Reviewed table](../tables/trend-controls.json). Status: `tested_killed`.

| Observation | Value (annual percent) | sharpe (ratio) | maximum drawdown (percent) | market exposure (percent) | annualized volatility (percent) | vol matched cagr to EMA20 50 UNFILTERED (percent) |
| --- | --- | --- | --- | --- | --- | --- |
| S0_UNFILTERED | 2.2159925 | 0.4590352 | -14.909037 | 20.889778 | 5.0532227 | 2.2083056 |
| EMA20_50_UNFILTERED | 2.4668525 | 0.5092011 | -10.360827 | 20.777371 | 5.0348134 | 2.4668525 |
| V5_S0_Q67_DIVERSIFIED | 4.3032826 | 0.81018722 | -9.5490385 | 20.717354 | 5.3797773 | 4.0309677 |
| NIFTYBEES_BH | 10.963633 | 0.7540248 | -36.336262 | 99.998961 | 15.375954 | 3.7373438 |

### Trend quality familywise selection adjustment

[Reviewed table](../tables/trend-selection.json). Status: `tested_killed`.

| Observation | Value (p-value) | raw bootstrap p (p-value) |
| --- | --- | --- |
| V1_S0_Q80 | 0.89471053 | 0.60773923 |
| V2_S0_Q90 | 0.74432557 | 0.42705729 |
| V3_S0_Q67_DUAL | 0.58024198 | 0.27257274 |
| V4_S0_COMPOSITE | 0.48665133 | 0.22707729 |
| V5_S0_Q67_DIVERSIFIED | 0.26357364 | 0.084591541 |

### V5 and binding EMA control across complete and partial folds

[Reviewed table](../tables/trend-folds.json). Status: `tested_killed`.

| Observation | Value (Sharpe ratio) | complete (boolean) | conjunctive fold pass (boolean) |
| --- | --- | --- | --- |
| wf1 — complete / V5_S0_Q67_DIVERSIFIED | -0.18952895 | true | false |
| wf2 — complete / V5_S0_Q67_DIVERSIFIED | 1.6662677 | true | false |
| wf3 — complete / V5_S0_Q67_DIVERSIFIED | 1.4572 | true | true |
| wf4 — complete / V5_S0_Q67_DIVERSIFIED | 0.19514952 | true | true |
| wf5_partial — PARTIAL, excluded / V5_S0_Q67_DIVERSIFIED | 0.55549423 | false | false |
| wf1 — complete / EMA20_50_UNFILTERED | -0.89231039 | true | unavailable |
| wf2 — complete / EMA20_50_UNFILTERED | 1.7029694 | true | unavailable |
| wf3 — complete / EMA20_50_UNFILTERED | 0.4218085 | true | unavailable |
| wf4 — complete / EMA20_50_UNFILTERED | 0.15281484 | true | unavailable |
| wf5_partial — PARTIAL, excluded / EMA20_50_UNFILTERED | 0.59402844 | false | unavailable |

### Validated delivery/insider primary cash forward excess

[Reviewed table](../tables/delivery-cash.json). Status: `tested_killed`.

| Observation | Value (basis points over 10 sessions) | reported cash t (t statistic) | fillable n (events) |
| --- | --- | --- | --- |
| Insider parent | 24 | 1.56 | 1,679 |
| Delivery parent | -8 | -1.3 | 13,549 |
| Joint primary | 1 | 0.04 | 328 |

### Validated delivery/insider SSF settle-proxy forward excess

[Reviewed table](../tables/delivery-ssf.json). Status: `tested_killed`.

| Observation | Value (basis points over 10 sessions) | reported ssf t (t statistic) |
| --- | --- | --- |
| Insider parent | 22 | 1.19 |
| Delivery parent | -1 | -0.11 |
| Joint primary | 16 | 0.39 |

### Incremental effect of surge-preceded insider disclosure

[Reviewed table](../tables/delivery-interaction.json). Status: `tested_killed`.

| Observation | Value (basis points over 10 sessions) | reported clustered t (t statistic) |
| --- | --- | --- |
| Surge-preceded mean | 1 | unavailable |
| No-surge mean | 30 | unavailable |
| Interaction beta | -29 | -0.76 |

### Price bridge invalidity before and after repair

[Reviewed table](../tables/bridge-invalid.json). Status: `research_infrastructure`.

| Observation | Value (observed rows) |
| --- | --- |
| Before invalid bridges | 1,158 |
| After invalid bridges | 0 |

### Price bridge completeness and exact linkage

[Reviewed table](../tables/bridge-linkage.json). Status: `research_infrastructure`.

| Observation | Value (observed rows) |
| --- | --- |
| Observed panel rows | 4,721,129 |
| Finite positive bridge rows | 4,721,129 |
| Exact frozen raw linkage rows | 4,721,129 |

### Technical and source-rights certifications

[Reviewed table](../tables/bridge-certification.json). Status: `blocked_before_returns`.

| Observation | Value (certification flag (1=true, 0=false)) | source boolean (boolean) |
| --- | --- | --- |
| Technical bridge certified | 1 | true |
| Source rights certified | 0 | false |

