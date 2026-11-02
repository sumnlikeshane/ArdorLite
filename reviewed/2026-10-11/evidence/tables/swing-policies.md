# Fourteen whole-book exit policies — in-sample diagnostic

Units: net R per filled trade. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id |
| --- | --- | --- |
| P0 baseline replayed | -0.1313 | swing-policies-01 |
| P1 bank at 1R | -0.0852 | swing-policies-02 |
| P2 bank at 1.5R | -0.1122 | swing-policies-03 |
| P3 bank at 2R | -0.1426 | swing-policies-04 |
| P4 partial50 at 1.5R then BE | -0.1 | swing-policies-05 |
| P5 BE after 1R | -0.0434 | swing-policies-06 |
| P6 trail 1.5R after 1R | -0.0754 | swing-policies-07 |
| P7 time10 only | -0.1397 | swing-policies-08 |
| P8 stall close below 5d low | -0.1402 | swing-policies-09 |
| P9 widestop 2x same target | -0.0987 | swing-policies-10 |
| P10 widestop 2x bank 1R | -0.0826 | swing-policies-11 |
| P11 widestop 2x BE1R bank 2R | -0.0867 | swing-policies-12 |
| P12 widestop 1.5x bank 1R time10 | -0.0939 | swing-policies-13 |
| P13 bank 1R time10 | -0.1218 | swing-policies-14 |

Extraction: Select P0–P13 from all-book aggregate; P0 is baseline, 13 are alternatives. Exclude CEILING_exit_at_peak and subset searches. No row-level trade records read or exported.

Caveats:

- R is trade P&L divided by initial planned trade risk; R is not a percentage return.
- V1 and V2 are different designs and tax lines, not an isolated causal comparison.
- Current-only membership and single 2026 adjusted-price vintage limit historical PIT claims.
- The historical window is spent development data; V2 replay was kill-only and cannot pass the hypothesis.
- V2 bear-regime expectancy and no_regime_half_sign_flip metric are null; a passing mechanical check does not establish bear evidence.
- Includes baseline within 14 policy rows; every all-book row remains negative.
- Postmortem range is rounded; exact saved JSON P5=-0.0434R is retained.
- Hindsight peak-exit ceiling and favorable subset maxima are omitted.
