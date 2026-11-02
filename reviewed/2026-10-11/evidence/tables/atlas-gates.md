# Accepted Atlas cumulative gate funnel

Units: cells. Outcome: `discovery_map_only`. Values are archived analytical summaries.

| label | value | claim_id |
| --- | --- | --- |
| Accepted cells | 1264 | atlas-gates-01 |
| Absolute two-way t gate | 312 | atlas-gates-02 |
| Plus BH q gate | 312 | atlas-gates-03 |
| Plus regime-sign agreement | 294 | atlas-gates-04 |
| Plus concentration limits | 293 | atlas-gates-05 |
| Plus fillable sample requirement | 293 | atlas-gates-06 |
| Formal nominations | 0 | atlas-gates-07 |

Extraction: Recount recorded accepted-cell fields using frozen gate predicates; gate counts checked against report. Gate 3 requires finite, non-null mean_excess in every declared regime, with mean_excess * full-cell excess_mean > 0; null or unavailable regime fails rather than being skipped or converted to zero. Gate 4 requires max_date_share <= 0.10 and max_symbol_share <= 0.05; gate 5 requires fillable_count >= required_sample_size. Zero formal nominations transcribed from report, because nominations require separate governance.

Caveats:

- Cells overlap across states and horizons; counts are not independent alpha discoveries.
- Gates 6–7 (actual-instrument costs/translation and mechanism) were not automated.
- Formal nominations are a report transcription, not inferred from cell statistics.
- Unopened holdout is Atlas-specific; the calendar dates were used by other research families.
