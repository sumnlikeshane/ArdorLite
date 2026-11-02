# Swing excursion versus realized net by exit cause

Units: R. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id | filled_trades | additional_claim_ids |
| --- | --- | --- | --- | --- |
| Stop — maximum favorable excursion | 1.0943 | swing-excursion-01 | 124 | {'filled_trades': 'swing-excursion-01-filled-trades'} |
| Stop — realized net | -1.1876 | swing-excursion-02 | unavailable | unavailable |
| Target — maximum favorable excursion | 3.9707 | swing-excursion-03 | 26 | {'filled_trades': 'swing-excursion-03-filled-trades'} |
| Target — realized net | 2.815 | swing-excursion-04 | unavailable | unavailable |
| Time exit — maximum favorable excursion | 1.7305 | swing-excursion-05 | 78 | {'filled_trades': 'swing-excursion-05-filled-trades'} |
| Time exit — realized net | 0.5658 | swing-excursion-06 | unavailable | unavailable |

Extraction: Select aggregate MFE and realized net by observed exit cause; group counts retained. MFE is path excursion, not an executable return.

Caveats:

- R is trade P&L divided by initial planned trade risk; R is not a percentage return.
- V1 and V2 are different designs and tax lines, not an isolated causal comparison.
- Current-only membership and single 2026 adjusted-price vintage limit historical PIT claims.
- The historical window is spent development data; V2 replay was kill-only and cannot pass the hypothesis.
- V2 bear-regime expectancy and no_regime_half_sign_flip metric are null; a passing mechanical check does not establish bear evidence.
- Grouping by realized exit cause is descriptive; it does not identify causal management value.
