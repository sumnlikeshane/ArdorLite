# Corrected SSF capacity conventions

Units: INR crore. Outcome: `stand_down`. Values are archived analytical summaries.

| label | value | claim_id |
| --- | --- | --- |
| Equal-notional median daily | 43.91485 | ssf-capacity-01 |
| Equal-notional 10th-percentile daily | 14.083594999999999 | ssf-capacity-02 |
| Equal-notional minimum daily | 1.407285 | ssf-capacity-03 |
| ADV-sum median — diagnostic only | 233.28580499999998 | ssf-capacity-04 |

Extraction: Select equal-notional median/p10/minimum. Include liquidity-proportional median solely as a labelled non-gate diagnostic.

Caveats:

- Execution-QA v1.0.1 supersedes the earlier fill and capacity figures.
- Frozen impact curve depends on ADV rather than direct order size.
- Gross significance does not override fillability, interaction, capacity, regime or net-return failures.
- The current statutory-only row is a dated counterfactual, not a present-day cost quotation.
- Equal-notional event-count × minimum-name capacity is binding; the ADV-sum diagnostic is not capacity for this equal-event book.
