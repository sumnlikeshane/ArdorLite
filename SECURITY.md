# Security and access

This project generates static files with Astro. It has no server adapter, database, CMS, editing endpoint or public admin feature. Search operates in the browser using the generated Pagefind index. Builds do not need financial accounts, provider credentials or private research inputs.

Do not put credentials, deploy hooks, original source captures, private supplement data, workstation logs or operational approval receipts in this repository or a public issue. The owner controls upstream access and deployment independently of public read/clone access. CI uses pinned actions and read-only tokens; pull requests do not receive deployment authority.

Report ordinary reproducible bugs without private information. For a suspected credential exposure, use GitHub private vulnerability reporting if enabled. Do not post the credential publicly. Dependency alerts and a pinned Gitleaks CI job complement review; their success is not a guarantee against every encoded secret or a redistribution-rights decision.
