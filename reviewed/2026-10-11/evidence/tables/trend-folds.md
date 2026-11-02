# V5 and binding EMA control across complete and partial folds

Units: Sharpe ratio. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id | complete | conjunctive_fold_pass | additional_claim_ids |
| --- | --- | --- | --- | --- | --- |
| wf1 — complete / V5_S0_Q67_DIVERSIFIED | -0.18952895348791093 | trend-folds-01 | True | False | {'complete': 'trend-folds-01-complete', 'conjunctive_fold_pass': 'trend-folds-01-conjunctive-fold-pass'} |
| wf2 — complete / V5_S0_Q67_DIVERSIFIED | 1.6662676606770865 | trend-folds-02 | True | False | {'complete': 'trend-folds-02-complete', 'conjunctive_fold_pass': 'trend-folds-02-conjunctive-fold-pass'} |
| wf3 — complete / V5_S0_Q67_DIVERSIFIED | 1.4572000390811082 | trend-folds-03 | True | True | {'complete': 'trend-folds-03-complete', 'conjunctive_fold_pass': 'trend-folds-03-conjunctive-fold-pass'} |
| wf4 — complete / V5_S0_Q67_DIVERSIFIED | 0.19514951787333418 | trend-folds-04 | True | True | {'complete': 'trend-folds-04-complete', 'conjunctive_fold_pass': 'trend-folds-04-conjunctive-fold-pass'} |
| wf5_partial — PARTIAL, excluded / V5_S0_Q67_DIVERSIFIED | 0.5554942315381268 | trend-folds-05 | False | False | {'complete': 'trend-folds-05-complete', 'conjunctive_fold_pass': 'trend-folds-05-conjunctive-fold-pass'} |
| wf1 — complete / EMA20_50_UNFILTERED | -0.8923103922669947 | trend-folds-06 | True | unavailable | {'complete': 'trend-folds-06-complete'} |
| wf2 — complete / EMA20_50_UNFILTERED | 1.7029693547207652 | trend-folds-07 | True | unavailable | {'complete': 'trend-folds-07-complete'} |
| wf3 — complete / EMA20_50_UNFILTERED | 0.42180850071863546 | trend-folds-08 | True | unavailable | {'complete': 'trend-folds-08-complete'} |
| wf4 — complete / EMA20_50_UNFILTERED | 0.15281484282110147 | trend-folds-09 | True | unavailable | {'complete': 'trend-folds-09-complete'} |
| wf5_partial — PARTIAL, excluded / EMA20_50_UNFILTERED | 0.5940284439096707 | trend-folds-10 | False | unavailable | {'complete': 'trend-folds-10-complete'} |

Extraction: Select recorded fold Sharpe for V5 and unfiltered EMA. Preserve complete flag and V5 conjunctive gate. Do not count partial fold as a fifth complete fold.

Caveats:

- Post-hoc historical development; no live/shadow authorization.
- V0 already-observed reference and EMA quality-filter diagnostic are not selectable variants or binding controls.
- Only wf1–wf4 count as complete folds; wf5_partial is excluded from the fold gate.
- Full-capital NIFTYBEES CAGR has materially greater exposure and volatility; compare risks before interpreting returns.
- Daily NAV was not persisted; no equity, underwater or rolling-Sharpe curves can be reconstructed from summary metrics.
- Archived TSS diagnosis seal points to an engine whose bytes later changed; current-code parity is not promised.
