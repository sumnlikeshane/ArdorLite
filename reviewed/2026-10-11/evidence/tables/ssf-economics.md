# Corrected SSF gross and net excess

Units: basis points per filled event. Outcome: `stand_down`. Values are archived analytical summaries.

| label | value | claim_id | two_way_t | additional_claim_ids |
| --- | --- | --- | --- | --- |
| Gross excess | 6.8536805696552765 | ssf-economics-01 | 3.6638342917297955 | {'two_way_t': 'ssf-economics-01-two-way-t'} |
| Dated statutory-only | 5.107129388579944 | ssf-economics-02 | 2.7298935133817857 | {'two_way_t': 'ssf-economics-02-two-way-t'} |
| Net 0.5× impact | 2.1819435418020667 | ssf-economics-03 | 1.1642446672256552 | {'two_way_t': 'ssf-economics-03-two-way-t'} |
| Net 1× impact | -0.7432423049758089 | ssf-economics-04 | -0.3955694373967101 | {'two_way_t': 'ssf-economics-04-two-way-t'} |
| Net 2× impact | -6.593613998531564 | ssf-economics-05 | -3.483374630654273 | {'two_way_t': 'ssf-economics-05-two-way-t'} |
| Current statutory-only counterfactual | 1.1982005696552784 | ssf-economics-06 | 0.6405329648583244 | {'two_way_t': 'ssf-economics-06-two-way-t'} |

Extraction: Select recorded mean_bps and two_way_t fields; no inferred stress points or break-even extrapolation.

Caveats:

- Execution-QA v1.0.1 supersedes the earlier fill and capacity figures.
- Frozen impact curve depends on ADV rather than direct order size.
- Gross significance does not override fillability, interaction, capacity, regime or net-return failures.
- The current statutory-only row is a dated counterfactual, not a present-day cost quotation.
