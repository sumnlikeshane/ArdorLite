# Ardor lite setup and build plan

Date: 11 October 2026  
Status: Phases 0–3 complete; portable handoff prepared; destination and website pending  
Source project: Ardor  
Build destination: A separate Ardor lite repository  
Audience: Quant recruiters and researchers  
Public scope: Research summaries, selected charts and reviewed code  
Excluded material: Raw data and private details

Ardor lite will present Ardor's market research, quantitative methods and engineering through a website and a curated repository. Indian-equity research will lead. Long-term company research, portfolio analysis, hybrid AI and Solana work will appear as smaller previews with explicit maturity labels.

The first release must help a researcher understand a hypothesis, inspect the method and evidence, see why the result passed an intermediate gate or failed, and identify the reusable contribution. The current evidence supports zero certified/live strategies. Failed, invalid and blocked research remains valuable when its outcome is accurately presented.

The build will use a portable set of reviewed material. It must work without access to Ardor, its database, broker credentials, private datasets, protected holdouts or this conversation. This portable copy accompanies completed evidence preparation. Repository installation, site implementation and deployment remain later execution steps.

## 1 Working boundaries

Treat the current Ardor working tree as the source of evidence. Much of the later work is modified or untracked, so Git HEAD alone does not identify the bytes supporting the showcase.

Preparation reads source files and creates new materials in an isolated private staging directory. The website and public materials belong in the new repository. Do not copy Ardor's Git history or turn Ardor itself into the website project.

Do not modify, repair, restore or reseal research registries, grade ledgers, snapshots or historical results as part of showcase preparation. Existing integrity incidents belong in an evidence limitation record. Fixing them is a separate research-governance task.

The first release uses archived evidence. Market-data collection, signal recomputation, backtests, attribution reruns, new hypothesis searches, broker integration and operational trading systems are outside this build.

Only explicitly selected files or derived summaries enter the public export. An aggregate is not automatically publishable because it contains fewer rows; review ownership, attribution and applicable source-use restrictions for the material actually selected. An unresolved item can be omitted without stopping unrelated work.

## 2 Visitor experience

The website will support a short overview and a deeper technical reading path:

1. Understand Ardor's scope, research approach and present outcome.
2. Browse six featured studies with a visible verdict and research question.
3. Open a case to inspect methods, charts, results, limitations and evidence.
4. Explore the broader archive by family, status, instrument and method.
5. Inspect reviewed methods and the associated repository material.
6. Read clearly labelled previews of less mature lanes.
7. Find the author's verified contribution, repository and contact links.

Use a restrained research-publication style with legible figures, generous space and concise explanations. Tables and charts carry the substance. Avoid decorative trading terminals, invented live prices, animated profit counters, fabricated testimonials or claims of successful alpha discovery.

## 3 Deliverables

| Deliverable | Required contents |
| --- | --- |
| Source inventory | Selected source paths, dates, versions, actual file hashes, canonical/superseded status and evidence gaps |
| Research catalog | Complete identifiable research paths, original verdicts, normalized statuses, methods, outcomes and source references |
| Six case studies | Hypothesis, design, execution/inference, evidence, controlling decision, lessons and limitations |
| Chart collection | Selected static and interactive charts using reviewed saved values, plus accessible tables and exportable figures |
| Methods collection | Small reviewed examples with local dependencies, attribution, explanations and meaningful verification |
| Publication inventory | Explicit include/exclude decisions, provenance, redaction or aggregation rules and ownership/source-use review |
| Portable handoff | Reviewed content, evidence summaries, charts, code, manifests, instructions and a receiving-agent brief |
| New repository | Curated content and code, independent website build, clean documentation and automated validation |
| Website | Overview, featured cases, archive, methods, previews and author information |
| Release receipt | Build/check results, evidence version, commit and deployment state when release is requested |

Each deliverable will record its actual completion state. Do not mark a task complete because its specification or filename exists.

## 4 Evidence model

Use one catalog as the content source for both the website and repository. Author narrative separately from numerical evidence, but connect both through stable research and claim identifiers.

Each research record requires:

| Field group | Required information |
| --- | --- |
| Identity | Stable ID, title, family, asset class, instrument, record kind and parent/version relationships |
| Research question | Hypothesis, proposed mechanism and intended observable information |
| Timing | Observation/publication clock, decision clock, entry convention, horizon and research dates |
| Design | Universe, sample, study window, benchmark, costs, execution rules and inference method |
| Decision | Original source verdict, normalized status, controlling gates and final outcome |
| Evidence | Canonical metrics, units, source references, extraction method and artifact hashes |
| Limitations | Development-history reuse, data/execution gaps, invalidations, uncertainty and missing outputs |
| Reproduction | What can run publicly, what is archived inspection and what requires unavailable private inputs |
| Publication | Included/omitted state, attribution and material-specific review result |

Use these normalized statuses while preserving the source verdict verbatim:

- tested_killed
- structural_kill_before_returns
- invalid_experiment
- blocked_before_returns
- stand_down
- active_unresolved
- superseded_before_data
- discovery_map_only
- design_only
- research_infrastructure

Keep evidence maturity separate from strategy status. An implemented tool can have synthetic verification while the associated strategy remains invalid or untested.

Use explicit reproduction levels:

- executable_example: a self-contained method/example whose documented checks run from the new repository.
- archived_result: saved outputs can be inspected and their display transformations reproduced.
- report_transcription: displayed values are transcribed from an identified report; no complete underlying result artifact is supplied.
- private_inputs_required: historical return replication needs unavailable or excluded data.

Null means unavailable or undefined. It must not become zero, a failed score or an empty successful sample.

### Census definitions

Reconcile these different counts instead of adding them:

| Count | Meaning and boundary |
| --- | --- |
| 49 archive records | Structured records in the 26 August Vantage archive; includes strategies, diagnostics, invalid runs and scoped designs |
| 27 implemented family names | Frozen July census; multiple legs or versions can belong to one family |
| 26 main registration rows | Components and versions, with a historical seal discrepancy |
| 2,716 main trial rows | 188 pre-Atlas rows plus 2,528 Atlas rows; not independent strategy experiments |
| 1,264 accepted Atlas cells | One accepted discovery run; overlapping states and horizons |
| Zero certified/live strategies | No contrary certified result identified in the source audit |

Capture counts again during evidence preparation and attach the observation date. Treat a changed count as a reconciliation question, not permission to rewrite history. Solana registrations and later design work use separate scope definitions.

## 5 Featured research

The following six studies form the launch set. Other completed families remain searchable in the archive.

| Case | Required story and result | Evidence starting point |
| --- | --- | --- |
| Atlas and SSF translation | Controlled discovery found measurable base rates; the separately frozen executable follow-up stood down after fillability, costs and capacity. Atlas itself has zero formal nominations. | [Atlas results](../content/cases/atlas-ssf.md), [corrected SSF report](../content/cases/atlas-ssf.md) |
| Momentum v2 | Initial execution gate passed, but factor attribution rejected independent residual alpha. | [Momentum report](../content/cases/momentum-v2.md), [postmortem](../content/cases/momentum-v2.md) |
| Swing exit autopsy | Giveback and execution drag were real; post-hoc management alternatives did not establish a robust edge. | [V1 report](../content/cases/swing-autopsy.md), [autopsy](../content/cases/swing-autopsy.md), [corrected V2 report](../content/cases/swing-autopsy.md) |
| Trend quality | Positive selected historical metrics failed incremental-information and familywise robustness requirements. | [Immediate-entry report](../content/cases/trend-quality.md), [TSS diagnosis](../content/cases/trend-quality.md) |
| Delivery and insider interaction | Extremely non-random co-occurrence did not produce predictive forward returns; validated event construction mattered. | [B8 postmortem](../content/cases/delivery-insider.md) |
| Price bridge repair | An adjustment/rounding failure was diagnosed and numerically repaired; technical success did not resolve source rights. | [Original diagnosis](../content/cases/price-bridge.md), [latest certification](../content/cases/price-bridge.md) |

### Required facts and qualifications

- Atlas: 1,264 accepted cells; 293 through the first five gates; zero formal nominations. Preserve the invalidated predecessor separately in the narrative.
- Corrected SSF follow-up: 23,270 signals, 20,217 fills; gross excess 6.85 bps, central-impact net -0.74 bps, stressed net -6.59 bps; stand_down. Use v1.0.1, not the earlier fill/capacity figures.
- Momentum v2: execution t values 2.64/2.46/2.09 across its impact sweep; residual annual alpha -6.10%, HAC t=-0.98. Omit the report's disputed benchmark-return difference until independently reconciled.
- Swing v1: 479 events, 228 fills, net expectancy -0.1313R; interval includes zero. The saved 14-policy comparison includes P0 baseline plus 13 alternatives; all are in-sample diagnostics. V2 remains killed despite its corrected positive mean.
- Trend quality: V5 historical CAGR 4.30%, Sharpe 0.81, maximum drawdown -9.55%; familywise max-t p=0.264. Show the family verdict, exposure and comparable-risk controls beside attractive metrics.
- Delivery and insider: 39.9 sigma co-occurrence enrichment is an association statistic; the forward-return interaction t=-0.76 is a different test and remains null.
- Bridge repair: the invalid-bridge count fell from 1,158 to zero; 4,721,129 observed rows have finite positive bridges and exact raw linkage. Technical certification passed; source-rights certification failed. This case has no strategy-performance claim.

Verify these rounded facts against the exact canonical sources when creating the claim records. Preserve study-specific windows, units and inference methods; do not imply that every study has the same data or confirmation status.

Each case should contain a short conclusion, the original hypothesis, an explanation of implementation, two or three useful figures, the controlling decision, limitations and a reusable method. Expand only where a detail affects interpretation.

## 6 Chart specifications

No exported quant charts or notebooks were found in the project sweep. The charts below are planned transformations of existing evidence. They are not existing images or new research experiments.

| Case | Planned figures | Exact input candidates relative to Ardor root | Extraction boundary |
| --- | --- | --- | --- |
| Atlas | Gate funnel; selected state/horizon heatmap; regime or fillability detail | data/research/atlas_v1/9232e16d-b8de-4039-9c11-31d718eacfb0.jsonl; docs/discovery/ATLAS_v1_RESULTS.md | Retain selected aggregate cell fields and the complete reviewed catalog necessary for any advertised filters. Gate-count transcription is identified. No claims of independent alphas. |
| SSF follow-up | Gross/net stress comparison; signal-to-fill funnel; capacity comparison | data/research/atlas_followup/atlas_clv_downside_translation_v1_0_1.json | Extract aggregate outcomes, gates and capacity definitions. Keep equal-notional capacity separate from diagnostic ADV sums. |
| Momentum v2 | Execution stress results; factor exposures and residual-alpha result | docs/strategies/REPORT_momentum_xs_v2.md | Report transcription. No invented regression interval, return series or disputed arithmetic. |
| Swing autopsy | Gross/net expectancy; MFE versus realized R by exit cause; 14-policy comparison | screener/validation/outputs/v1_exit_autopsy.json; screener/validation/outputs/v1_replay_curr_2026-06-05.json; screener/validation/outputs/v1_counterfactual_per_trade.csv; screener/validation/outputs/v1_trades_full.csv | Prefer aggregate JSON. Any additional CSV aggregation happens privately and records its fill/filter rule. Public output excludes row identities, dates and prices unless separately reviewed. |
| Trend quality | Fold/variant heatmap; slippage sensitivity; gate matrix or selection adjustment | data/research/trend_quality_immediate_entry_v1/walk_forward.csv; data/research/trend_quality_immediate_entry_v1/slippage_stress.csv; data/research/trend_quality_immediate_entry_v1/strategy_comparison.csv; data/research/trend_quality_immediate_entry_v1/selection_adjustment.csv; data/research/trend_quality_immediate_entry_v1/gate_matrix.csv | Use recorded aggregate values. Separate four complete folds from the partial fold and distinguish reference/control rows from selectable variants. |
| Trend supporting detail | Quality coefficient by horizon; concentration or threshold stability | data/research/trend_quality_immediate_entry_v1/direct_quality_regression.csv; data/research/trend_quality_immediate_entry_v1/concentration_and_anti_hindsight.csv; data/research/trend_quality_immediate_entry_v1/quality_boundaries.csv; data/research/trend_quality_immediate_entry_v1/boundary_stability.csv | Include only reviewed numerical fields. Label any derived approximate coefficient interval with its formula; omit it if its interpretation is uncertain. |
| Delivery and insider | Parent/joint forward-excess comparison; distinct association and prediction panels | docs/postmortems/POSTMORTEM_delivery_x_insider_B8.md | Transcribe the validated primary-event results. Never substitute the contaminated recomputation or select a favorable post-hoc threshold. |
| Bridge repair | Before/after validity and linkage; technical/rights result; root-cause diagram | data/research/trend_following_price_bridge_certification_v1_1/before_after_validation_summary.json; data/research/trend_following_price_bridge_certification_v1_1/source_provenance_reconciliation.json; data/research/trend_following_price_bridge_certification_v1_1/bridge_failure_taxonomy.csv; docs/strategies/REPORT_trend_following_price_bridge_certification_v1_1.md | Export aggregate counts and a reviewed explanatory diagram. Exclude the row-level exception receipt, raw IDs and symbol/date ranges. |

Choose a focused subset for each case. A chart inventory is a menu; completing every possible figure is not a launch requirement.

For every figure, store:

- Chart ID, linked claim IDs, source artifact IDs and source/export hashes.
- Extraction/filter/aggregation rule and numerical units.
- Study window, benchmark, sample, gross/net distinction and cost assumption where relevant.
- Source verdict, evidence maturity and material caveats.
- Displayed values in a machine-readable table and a readable accessible equivalent.
- Display rounding, missing-value behavior and any illustrative element.

Chart rules:

- Keep horizons and units explicit; percentage points, percent returns, basis points and R are distinct.
- Show the case verdict near performance figures.
- Display uncertainty only when available or derived from an explicitly documented valid method.
- Connect only recorded cost-stress points. Do not invent intermediate observations or extrapolated break-even levels.
- Describe concentration ablations using their saved definition; do not present them as full alternate backtests.
- Keep cumulative threshold percentages distinct from exclusive histogram bins.
- Separate hindsight ceilings from executable policies, or omit them.
- Preserve out-of-sample, development, partial-fold and reused-history distinctions.
- An unopened Atlas holdout is study-specific; other Ardor studies consumed some of the same calendar dates.
- Daily trend NAV/returns were not persisted in the inspected output directories. Equity curves, underwater charts and rolling Sharpe are deferred until genuine series are supplied under a separately scoped task.

Generate publication figures with standard plotting tools and save SVG/PNG plus the reviewed data table. Optional browser interaction must use the same exported values. Tooltips, sorting and filters must not perform strategy optimization or create research results.

## 7 Code and methods

Review source dependencies and attribution before selecting code. A file's presence in Ardor does not establish that all of its dependencies or upstream licences are suitable for public release.

Start with a small methods collection:

| Method candidate | Source starting point | Public treatment |
| --- | --- | --- |
| Performance and risk units | ardor/metrics/core.py; screener/costs.py; swing diagnostic accounting | Small pure functions or reviewed excerpts with clear gross/net and R definitions |
| Dependence-aware inference | ardor/research/event_study.py; momentum attribution methods | Focused explanation/example with synthetic inputs; no source database imports |
| Multiple testing | ardor/research/multiple_testing.py | Self-contained reviewed BH/BY example with meaningful checks |
| Lagged quality and fold calibration | ardor/strategies/tss_failure_diagnosis_v1/engine.py; ardor/strategies/trend_quality_immediate_entry_v1/engine.py | Extract the relevant pure method and required helpers, preserving availability timing |
| Finite positive adjustment bridge | ardor/strategies/trend_following_price_bridge_remediation/audit.py; ardor/data/adjust.py | Tiny clearly labelled synthetic example of failure detection and repair logic |
| Provenance and experiment contracts | ardor/process; saved manifests | Reviewed schema/examples, excluding protected ledger contents and operational configuration |

Do not copy whole engines merely to expose one function. Each exported example must resolve its imports inside the new repository, declare its dependencies and preserve attribution.

Label synthetic examples visibly. They demonstrate software behavior and cannot be used as market evidence. Code adapted for publication records its source hash and changes; it is not an untouched historical implementation.

TradingView scripts are optional later assets. The structure trade card declares CC BY-NC-SA attribution, and the V5 script is a single-symbol proxy with material portfolio/execution differences. Include either only with its correct licence and limitations.

## 8 Archive and previews

Use the [Vantage archive](../evidence/summaries/source-index.md#src-298365cf15ec) as an index, then resolve records against their canonical reports and outputs. Cover the historical price-action, derivatives, structural-event, insider/delivery, momentum, trend and screener families. Include invalid runs and blocked designs with their own status.

Also inventory scoped, parked and superseded research paths from the [edge-discovery master plan](../evidence/summaries/source-index.md#src-a38a4793e94a), [run-order roadmap](../evidence/summaries/source-index.md#src-3131aecbed39), [July census reconciliation](../evidence/summaries/source-index.md#src-7113beab4a6f) and [candidate tournament](../evidence/summaries/source-index.md#src-f534dc55e818). These paths extend beyond the 49 archive records. Preserve proposal/version relationships and label unexecuted paths as design_only or blocked according to their source; do not count them as tested strategies.

Summarize reusable data, inference, risk, governance and audit tools in a methods inventory. Separate implemented functions, saved demonstrations, declared optional dependencies and planned capabilities.

Keep preview lanes compact:

- Long-term research: implemented offline company framework, incomplete live prerequisites, no completed multibagger shortlist.
- Portfolio research: dated screening and underwriting; historical diversification comparisons have their actual assumptions, while bear/base/bull numbers are forecasts.
- Hybrid AI: the 10 October feasibility/literature design, with no newly implemented autonomous trader or predictive model.
- Solana: certification rights-blocked; the capped exploratory manifest is frozen, while its acquisition guard, dataset acquisition and return tests have not started.

Source references:

- [Long-term framework](../evidence/summaries/source-index.md#src-110c7569aa45)
- [Portfolio market scan](../evidence/summaries/source-index.md#src-83084f0bb17e)
- [Portfolio risk review](../evidence/summaries/source-index.md#src-f1897a51c3dd)
- [Hybrid AI review](../evidence/summaries/source-index.md#src-b38e42c4b964)
- [Solana plan](../evidence/summaries/source-index.md#src-81e65d638f28)

## 9 Separate repository layout

The following is the proposed destination layout. This handoff contains reviewed content and tools; the destination website repository is not yet installed:

~~~
ardor-lite/
  README.md
  AGENTS.md
  LICENSE                         chosen after ownership review
  NOTICE.md                       retained upstream attribution
  .gitignore
  docs/
    PLAN_ardor_lite.md             portable copy of this plan
    HANDOFF.md
    EVIDENCE_POLICY.md
    REPRODUCIBILITY.md
    VALIDATION.md
  content/
    project.json
    research.json
    methods.json
    previews.json
    cases/
      atlas-ssf.md
      momentum-v2.md
      swing-autopsy.md
      trend-quality.md
      delivery-insider.md
      price-bridge.md
  evidence/
    manifest.json
    claims.json
    summaries/
    tables/
  methods/
    selected pure examples
  charts/
    specs/
    generated/
  site/
    templates/
    styles/
    scripts/
    assets/
  scripts/
    build and verification tools
  tests/
    evidence, methods and site checks
  dist/                           generated deployable site
~~~

Place raw/private provenance and source staging outside the public checkout. The new repository's ignore rules exclude secrets, private staging, caches and local runtime data.

Use buildless semantic HTML/CSS/JavaScript with local content and browser-side filtering as the default website architecture. A small documented generator may produce repeated case/archive pages from the catalog. A server, user accounts, database and live financial-data connection are not launch requirements.

Pin any introduced third-party dependency and its supported runtime. Document the clean-checkout setup and actual build/validation commands once implemented; do not copy Ardor's full optional dependency set.

Site routes should provide an overview, research index, six cases, methods, previews and author/evidence information. Public source links resolve to included material or valid published URLs. Local source paths are provenance labels, not broken filesystem hyperlinks.

If Sites hosting is selected during the build task, use its static workflow with dist as the published directory. Retain project identity and the source/package/deployment receipts. Do not register or deploy a Site while executing this planning task.

## 10 Portable export

Build the private staging set first, then emit the reviewed public handoff through an explicit allowlist. Neither a recursive copy nor git archive captures the intended public boundary or the current working-tree evidence.

For every selected source, privately record source-root location, repository HEAD/branch, selected-file working-tree state, size and SHA-256. Hash the actual file bytes. Do not use the HEAD blob hash for a modified or untracked file.

For each public derivative, record a stable source ID, source-relative path, original hash, derivative hash, extraction method, changes/redactions, case/claim links, evidence status and publication review result. Do not publish absolute workstation paths, personal Git remote details or private decision receipts.

Default exclusions:

- .env files, tokens, credentials, account identifiers and logs.
- Raw/vendor data, database dumps, market-data caches and full price panels.
- Protected hypothesis/trial/grade ledgers and their recovery copies.
- Row-level trading/exception records, event checkpoints and private snapshots.
- Personal portfolio amounts, personal trade plans, holdings and identifying notes.
- Complete internal decision packets and unrelated project files.
- Unreviewed third-party code, images and datasets.

A public evidence reference should point to an included reviewed summary/table, not require the visitor to obtain a restricted original. Preserve the distinction between original evidence and a sanitized derivative.

When copying this plan into the destination, rewrite its Ardor documentation links to included reviewed material. If an original is excluded, retain its source ID/path as a provenance label and link to the corresponding included summary. Verify the copied plan's links from the destination checkout.

The handoff contains the complete research catalog, six narratives, reviewed summaries and chart inputs, generated assets, selected methods, licences/attribution, manifests and build instructions. Include any unresolved gaps and the final preparation check receipt.

A receiving agent must be able to explain every featured conclusion from this handoff. It must not need the original source paths to render pages, validate displayed numbers or run public examples.

## 11 Execution sequence

Phases 0–3 are complete in this handoff. Phase 4 handoff creation and isolated validation are complete; destination installation remains pending. Phases 5–7 are pending.

### Phase 0 Source and publication inventory

- [x] Create isolated private staging with no public remote.
- [x] Record the source working-tree boundary and hashes of selected material.
- [x] Identify canonical/superseded outputs and record integrity incidents.
- [x] Classify selected content/code/assets for publication; omit unresolved material where possible.
- [x] Create the allowlist and exclusion receipt.

Exit condition: selected evidence is identifiable, source modifications are not required, and restricted inputs cannot enter the public export through a blanket copy.

### Phase 1 Canonical catalog

- [x] Reconcile the archive with the master plan, roadmap, census, tournament and later trend, portfolio, AI and Solana work.
- [x] Create research records, original/normalized statuses and version relationships.
- [x] Define all displayed counts and date them.
- [x] Create claim records with exact values, units, caveats and source pointers.
- [x] Record reproduction levels and missing outputs.

Exit condition: every launch claim and archive record has a traceable classification; unsupported fields stay absent or null.

### Phase 2 Featured writing

- [x] Draft the six narratives using the shared case structure.
- [x] Write the project overview, methods inventory and short preview lanes.
- [x] Link attractive metrics to the controlling failed/blocked gates.
- [x] Review publication wording, author attribution and private details.

Exit condition: a researcher can understand the outcome and the method without opening the original repository.

### Phase 3 Charts and methods

- [x] Extract or transcribe the selected reviewed summaries with documented rules.
- [x] Build figures and accessible numerical tables from those values.
- [x] Verify counts, signs, units, filters, rounding and partial-fold treatment.
- [x] Curate a small set of independent method examples with attribution.
- [x] Run meaningful checks on examples and evidence transformations.

Exit condition: figures match their included inputs, examples resolve locally, and no new strategy inference has been substituted for archived evidence.

Chart preparation and independent method curation can run in parallel after their evidence/publication inputs are resolved.

### Phase 4 Handoff and new repository setup

- [x] Create the self-contained public handoff and its file manifest.
- [x] Verify it from a temporary location without resolving Ardor paths.
- [ ] Open or create the separate destination checkout when its location is available.
- [ ] Inspect destination instructions and existing contents before adding files.
- [ ] Install the reviewed handoff, plan, AGENTS instructions and documentation.
- [ ] Configure the independent build, ignores, dependency pins and checks.

Exit condition: the destination has everything needed for the website and public examples. Original source access is optional for future archival research, not a build dependency.

### Phase 5 Website implementation

- [ ] Build one complete representative case and overview before multiplying templates.
- [ ] Implement the catalog, case routes, methods and previews.
- [ ] Add only useful research filters, chart details and source navigation.
- [ ] Validate responsive reading, keyboard navigation and accessible chart alternatives.
- [ ] Keep the website and repository content generated from the same reviewed evidence.

Exit condition: the complete visitor journey works locally with bundled content and no market-data/network dependency.

### Phase 6 Release validation

- [ ] Run a clean-checkout build and the selected public-example checks.
- [ ] Validate claims, provenance hashes, chart values and status consistency.
- [ ] Check internal links, assets, downloads, routes and error/empty states.
- [ ] Check the public export for secrets, absolute private paths and excluded datasets.
- [ ] Inspect representative pages in the browser at mobile and desktop widths.
- [ ] Record actual commands/results and any verification limit.

Exit condition: the acceptance criteria below pass, or an affected feature is removed and the remaining limitation is explicitly recorded.

### Phase 7 Publication when requested

- [ ] Resolve the actual Git remote and hosting destination.
- [ ] Use the established publication boundary and chosen hosting workflow.
- [ ] Keep initial hosted access private unless a public audience is requested.
- [ ] Verify the saved/deployed version and return its literal URL and repository reference.
- [ ] Record release version, evidence date and any excluded material.

Public release is a later action. The user's content choices establish what may be considered for release; this plan does not create a remote, change sharing or publish now.

## 12 Acceptance criteria

| Requirement | Verification |
| --- | --- |
| Independent build | Clean checkout builds/runs without Ardor, DB access, private snapshots, credentials or absolute source paths |
| Traceable claims | Every displayed numerical/research claim resolves to included reviewed evidence and metadata |
| Correct outcomes | No killed, invalid, blocked or discovery-only result appears as a certified successful strategy |
| Accurate charts | Displayed values match the included source table and documented transformations within rounding tolerance |
| Honest reproduction | Executable examples, archived inspection, report transcription and private-input replication are distinguished |
| Privacy boundary | Allowlist export and public-output scan exclude the listed private/raw material |
| Attribution | Exported code and assets carry reviewed ownership/licence/NOTICE treatment |
| Usable site | Links/assets work; mobile reading and keyboard navigation are checked; charts have readable data equivalents |
| Complete handoff | A new agent can continue using the repository plan, instructions, catalog and evidence without this chat |
| Scope fidelity | Indian equities lead; other lanes retain their maturity and forecast/development labels |

Document validation uses link/path and content checks. Run tests for evidence conversion, substantive numerical methods and site behavior where they verify a real requirement. A plan-only edit does not require rerunning the trading research suite.

## 13 Known gaps and their treatment

| Gap | Launch treatment |
| --- | --- |
| Central hypothesis/trial/grade seal discrepancies | Describe them; exclude protected row contents; do not present those files as current certification authority |
| Earlier bridge receipt missing | Use the later complete certification for numerical evidence; retain earlier diagnosis as authored historical context |
| TSS diagnosis seal references changed engine | Do not promise current-code parity for the archived diagnostic |
| Momentum report benchmark arithmetic inconsistency | Omit the disputed difference; retain separately supported alpha and exposure findings |
| Missing daily trend NAV | Omit equity/underwater/rolling-Sharpe graphics |
| Unusable price-source rights in bridge certification | Keep technical and rights outcomes separate; omit restricted data |
| Incomplete historical/PIT inputs | Preserve the affected study's scope and limitations; no fresh replication promise |
| No useful forward grader/paper sample | Present the workflow as implemented but its claimed edge as unresolved |
| Generic engine/broker and CPCV/PBO unfinished | Classify as planned capabilities, not implemented tools |
| Solana data/simulator and hybrid AI models not built | Preview their design/governance work without performance graphics |

References: [governance boundary](../evidence/summaries/source-index.md#src-d1258334caab), [reconciliation](../evidence/summaries/source-index.md#src-7113beab4a6f), [October review](../evidence/summaries/source-index.md#src-b38e42c4b964).

These gaps do not require a repair project before launch. Reproduction or publication is withheld only for the affected claim, data or feature.

## 14 Responsibilities and later inputs

Codex owns evidence extraction, classification, writing, chart construction, code curation, portable packaging, repository setup, site implementation and verification within the authorized scope.

The user's remaining inputs are narrow:

| Input | Needed when | Default while absent |
| --- | --- | --- |
| Separate repository path or access | Installing the handoff / starting the destination build | Continue private preparation; do not invent a destination or create an unrelated remote |
| Author biography and contribution statement | Finalizing About content | Omit unsupported biography claims |
| Contact, repository and optional domain links | Wiring real outward links / release | Omit inactive buttons and placeholders |
| Additional outputs outside Ardor | Closing an affected evidence gap | Use the verified local evidence; keep the missing-output limitation |
| Publication-sensitive ownership/source decision | Including that particular code, asset or data derivative | Omit the affected material and continue |
| Historical context for an unresolved discrepancy | If it changes a selected claim | Preserve the uncertainty; do not repair history silently |

No recurring confirmation is needed for routine extraction, drafting, chart formatting or implementation choices within scope. Surface concrete review choices when they affect the story, attribution or publication boundary.

## 15 Instructions for the receiving agent

Copy this plan into the new repository with the portable handoff. At the start of a build session, the receiving agent should:

1. Read destination AGENTS instructions, this plan and HANDOFF.
2. Inspect the actual catalog, evidence/publication manifests and validation receipt.
3. Locate the first incomplete phase; verify completed outputs before continuing.
4. Preserve original verdicts, units, dates, caveats and reproduction labels.
5. Build from bundled reviewed content; do not fetch live market data or contact brokers.
6. Keep absent outputs explicit and avoid inventing studies, biographies, charts or performance.
7. Implement and check the complete local visitor experience.
8. Publish only under the active task's release instruction and actual account capabilities.

Suggested opening request for that session:

> Build Ardor lite from docs/PLAN_ardor_lite.md and docs/HANDOFF.md in this repository. Follow the evidence and publication manifests. Continue from the first incomplete phase, keep Indian equities central, and use only bundled reviewed evidence. Preserve failed, invalid, blocked and proposed statuses. Complete the website and its checks before any release action; this request is for local preparation and implementation unless I separately request publication.

If the destination contains the plan alone, complete the evidence handoff first. The plan names source inputs; it does not claim those inputs, charts or code examples have already been exported.


Portable-copy note: documentation links now resolve to reviewed included summaries. Original paths remain provenance labels in the source inventory; complete originals are excluded. Consult HANDOFF and VALIDATION for actual preparation results.
