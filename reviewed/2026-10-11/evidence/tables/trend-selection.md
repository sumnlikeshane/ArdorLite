# Trend quality familywise selection adjustment

Units: p-value. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id | raw_bootstrap_p | additional_claim_ids |
| --- | --- | --- | --- | --- |
| V1_S0_Q80 | 0.8947105289471053 | trend-selection-01 | 0.6077392260773923 | {'raw_bootstrap_p': 'trend-selection-01-raw-bootstrap-p'} |
| V2_S0_Q90 | 0.7443255674432556 | trend-selection-02 | 0.42705729427057293 | {'raw_bootstrap_p': 'trend-selection-02-raw-bootstrap-p'} |
| V3_S0_Q67_DUAL | 0.5802419758024198 | trend-selection-03 | 0.2725727427257274 | {'raw_bootstrap_p': 'trend-selection-03-raw-bootstrap-p'} |
| V4_S0_COMPOSITE | 0.48665133486651335 | trend-selection-04 | 0.22707729227077292 | {'raw_bootstrap_p': 'trend-selection-04-raw-bootstrap-p'} |
| V5_S0_Q67_DIVERSIFIED | 0.2635736426357364 | trend-selection-05 | 0.08459154084591541 | {'raw_bootstrap_p': 'trend-selection-05-raw-bootstrap-p'} |

Extraction: Select recorded familywise max-t and raw bootstrap p for V1–V5, no new inference. Familywise pass threshold 0.05.

Caveats:

- Post-hoc historical development; no live/shadow authorization.
- V0 already-observed reference and EMA quality-filter diagnostic are not selectable variants or binding controls.
- Only wf1–wf4 count as complete folds; wf5_partial is excluded from the fold gate.
- Full-capital NIFTYBEES CAGR has materially greater exposure and volatility; compare risks before interpreting returns.
- Daily NAV was not persisted; no equity, underwater or rolling-Sharpe curves can be reconstructed from summary metrics.
- Archived TSS diagnosis seal points to an engine whose bytes later changed; current-code parity is not promised.
- Moving blocks and HAC lag are each 63 sessions; 10,000 archived resamples.
