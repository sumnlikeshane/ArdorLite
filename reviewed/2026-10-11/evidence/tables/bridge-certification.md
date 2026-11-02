# Technical and source-rights certifications

Units: certification flag (1=true, 0=false). Outcome: `blocked_before_returns`. Values are archived analytical summaries.

| label | value | claim_id | source_boolean | additional_claim_ids |
| --- | --- | --- | --- | --- |
| Technical bridge certified | 1 | bridge-certification-01 | True | {'source_boolean': 'bridge-certification-01-source-boolean'} |
| Source rights certified | 0 | bridge-certification-02 | False | {'source_boolean': 'bridge-certification-02-source-boolean'} |

Extraction: Boolean flags are encoded explicitly 1=true,0=false solely for chart display; they are not performance scores. Preserve source boolean as additional value.

Caveats:

- Technical certification and source-rights certification are independent.
- Source-rights status is the archived governance decision for these rows; no present-day legal assessment is made.
- Exact raw linkage proves origin, not automation, retention or derived-use permission.
- Invalid/absent marks remain fail-closed. Zero invalid observed bridges does not mean zero missing exact-session observations.
- No strategy performance, Sharpe, CAGR or P&L was computed.
