# Momentum v2 retained factor exposures

Units: factor beta. Outcome: `tested_killed`. Values are archived analytical summaries.

| label | value | claim_id | reported_t | additional_claim_ids |
| --- | --- | --- | --- | --- |
| MKT_ew — three-factor | 0.48 | momentum-exposures-01 | 6.41 | {'reported_t': 'momentum-exposures-01-reported-t'} |
| WML — four-factor diagnostic | 0.82 | momentum-exposures-02 | unavailable | unavailable |

Extraction: Transcribe diagnostics; the MKT coefficient comes from the three-factor regression and WML from the four-factor diagnostic.

Caveats:

- Report reconstructed 2026-07-04 from prior commits and session memory; complete historical return/regression artifacts are not bundled.
- Monthly spread significance and daily residual-alpha regression answer different questions.
- Reported book-versus-WML difference has an arithmetic inconsistency and is omitted.
- No invented confidence intervals or unseen OOS performance.
