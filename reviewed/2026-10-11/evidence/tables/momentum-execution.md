# Momentum v2 execution stress mean tests

Units: HAC t statistic. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id |
| --- | --- | --- |
| 0.5× impact | 2.64 | momentum-execution-01 |
| 1× impact | 2.46 | momentum-execution-02 |
| 2× impact | 2.09 | momentum-execution-03 |

Extraction: Transcribe Phase 0 reported t statistics at exactly the three recorded impact stress points.

Caveats:

- Report reconstructed 2026-07-04 from prior commits and session memory; complete historical return/regression artifacts are not bundled.
- Monthly spread significance and daily residual-alpha regression answer different questions.
- Reported book-versus-WML difference has an arithmetic inconsistency and is omitted.
- No invented confidence intervals or unseen OOS performance.
