# Validated delivery/insider SSF settle-proxy forward excess

Units: basis points over 10 sessions. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id | reported_ssf_t | additional_claim_ids |
| --- | --- | --- | --- | --- |
| Insider parent | 22 | delivery-ssf-01 | 1.19 | {'reported_ssf_t': 'delivery-ssf-01-reported-ssf-t'} |
| Delivery parent | -1 | delivery-ssf-02 | -0.11 | {'reported_ssf_t': 'delivery-ssf-02-reported-ssf-t'} |
| Joint primary | 16 | delivery-ssf-03 | 0.39 | {'reported_ssf_t': 'delivery-ssf-03-reported-ssf-t'} |

Extraction: Transcribe primary-cell SSF h=10 excess and t. Execution limitation comes from build_ssf_price_pivots in the source driver; no future-open execution claim.

Caveats:

- Validated primary event set only: absolute lift floor and 32-calendar-day refractory; contaminated inline recomputation excluded.
- 39.9-sigma enrichment describes co-occurrence, not predictive significance.
- Reported bps and t values are rounded report transcriptions.
- SSF settle proxy and ever-in-F&O universe limit claims of executable or PIT SSF translation.
- Post-hoc threshold and prior-return subsets are not passing candidates.
