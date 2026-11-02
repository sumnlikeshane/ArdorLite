# Validated delivery/insider primary cash forward excess

Units: basis points over 10 sessions. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id | reported_cash_t | fillable_n | additional_claim_ids |
| --- | --- | --- | --- | --- | --- |
| Insider parent | 24 | delivery-cash-01 | 1.56 | 1679 | {'reported_cash_t': 'delivery-cash-01-reported-cash-t', 'fillable_n': 'delivery-cash-01-fillable-n'} |
| Delivery parent | -8 | delivery-cash-02 | -1.3 | 13549 | {'reported_cash_t': 'delivery-cash-02-reported-cash-t', 'fillable_n': 'delivery-cash-02-fillable-n'} |
| Joint primary | 1 | delivery-cash-03 | 0.04 | 328 | {'reported_cash_t': 'delivery-cash-03-reported-cash-t', 'fillable_n': 'delivery-cash-03-fillable-n'} |

Extraction: Transcribe validated primary-cell cash h=10 excess and reported fill counts. No contaminated recomputation or favorable post-hoc threshold.

Caveats:

- Validated primary event set only: absolute lift floor and 32-calendar-day refractory; contaminated inline recomputation excluded.
- 39.9-sigma enrichment describes co-occurrence, not predictive significance.
- Reported bps and t values are rounded report transcriptions.
- SSF settle proxy and ever-in-F&O universe limit claims of executable or PIT SSF translation.
- Post-hoc threshold and prior-return subsets are not passing candidates.
