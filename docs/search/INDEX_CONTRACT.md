# S5 search contract — 2 November 2026

Established before tuning under the approved S5 programme/light-first amendment. [28 judged tasks](JUDGED_QUERIES.json) define destinations and required context. These are source-backed implementer judgments, not a human relevance study. Exact record/claim/source IDs must rank first; topical tasks must rank within three; no duplicate canonical entity in the first ten; no-match must return zero. A topical investigation result may expose useful existing heading subresults. A preview task must reach its exact existing lane anchor.

## Entity and destination boundaries

| Entity | Canonical search destination | Required context |
| --- | --- | --- |
| Six investigations | Existing `/research/cases/{slug}/` | Question, bounded decision, historical evidence versus later explanation |
| 114 reference records | Existing `/research/records/{id}/` | Distinct version/ID, actual family, outcome, known maturity/reproduction; nulls retained |
| 204 claims | Existing case `#claim-{id}` | Readable metric title, exact identity/value/unit, study qualification and source |
| 201 file sources | Existing `/evidence/sources/#{id}` | Filename/path, supported context, observed date versus actual source date, excluded original and independent rights |
| 17 directory references | Existing source anchor | Directory label; no file hash or inferred date |
| Five methods | Existing method route | Synthetic executable illustration; not historical replay |
| Four other directions | Existing `/research/previews/#{id}` | Actual mixed maturity, what exists and what remains |
| Publication/collection/engineering/walkthrough | Existing route; useful heading anchors | Policy versus historical/current-source/synthetic explanation explicitly distinguished |

One entity has one searchable body. Related records are distinct entities, never collapsed. Registry copies, catalog renderings, raw ID-only linked dumps, repeated rights text and empty/loading controls stay visible but do not compete with their canonical entity. Full original references remain in HTML/no-JS/print. No original source content is added and no downloadable artifact or permission changes.

First test heading subresults, with heading IDs transferred only in an isolated index experiment (old canonical URLs remain unchanged). Test weighting/exclusion against the predefined tasks. Only if document-granularity results cannot give exact claim/source first-place independent destinations may Pagefind custom records be added at existing anchors. Record the experiment and reasons in the S5 receipt. Do not create new public entity pages.

Readable type, populated investigation/family, actual maturity/reproduction and evidence-role facets use known mappings only. Evidence observation 11 October 2026 is never substituted for an unknown source date, historical run or authored revision. Search query/facets are URL state with validated values, reload/back/forward restoration, keyboard form controls, explicit loading/empty/failure recovery and browse links. Results cannot imply research quality ranking or public clearance. Automated rendered checks are separate from scientific, unfamiliar-human, assistive, device and genuine zoom acceptance.

## Experiment and adopted policy

The unweighted experiment and narrower weighted/excluded heading experiment are preserved under `../planning/2026-11-02/s5/heading-experiment*/results.json`. Heading IDs were transferred only in those temporary index inputs; no canonical DOM ID moved. The weighted experiment recovers the tested claim/source subanchors, but still returns case/source-registry documents with page-level metadata. It cannot independently filter 204 claims, 201 sources or 17 directory labels or supply each source's date/caveat, and grouped preview headings can select the preceding lane. Custom records are therefore limited to those anchored entities plus four existing preview lanes: **426**. Ordinary HTML pages keep useful heading subresults. No custom case/record/method page or new public route is created.

The production index has **138 ordinary HTML documents + 426 anchored documents = 564**. `addDirectory` reports 141 scanned HTML files; that includes excluded search/error/archive inputs and is not the searchable-page count. `generated/search-inventory.json` reports actual `pagefind-entry.json` cardinality. The independent output audit decompresses every real fragment, checks the complete URL set/uniqueness/resolving anchors, exact claim values/units/caveats, actual source-date bases and empty/catalog exclusion. Adverse tests deliberately corrupt a search value and destination.

Pagefind's default metadata boosts caused repeated caveats and short claim/source titles to displace broad investigations. Global ranking uses `termFrequency: 0`, `pageLength: 0`; result-context fields have zero scoring weight, while the `discovery` field for investigations, other directions and the rights policy has weight 10. This is one class-based discovery policy, with no query-specific destination overrides. All related versions remain independently discoverable.

Every record/claim/source/directory/preview has an exact identity facet, built from the canonical identity. A known exact ID runs a Pagefind filter-only request intersected with user-selected facets; a conflicting filter correctly yields no match. ID-shaped unknown strings (hyphen, underscore or digit in one token) use Pagefind's literal phrase mode to prevent unrelated prefix expansion. Other topical queries retain Pagefind text search. No second engine or client-side evidence corpus is shipped. Identity is an internal lookup facet, not an enormous visible select.

The negative fixture was corrected during diagnostics: `zzqv-no-match-84729` contains ordinary words; `zzqvnothing84729` can expand to the stored `z` term under prefix/metadata matching. The established historical negative phrase `xyz-nonexistent-linguistic-result` is the final negative task and is treated literally under the general ID-shaped query policy. The other 27 destination judgments were unchanged. The fixture correction and all failed ranking observations remain archived; no failing topical expectation was removed.

Native labelled controls retain URL `q/type/investigation/family/maturity/reproduction/role`; unsupported/repeated values recover to the first bounded query and valid facets, retaining unrelated parameters. Filter counts refer to currently matching documents; a selected zero-count facet stays visible for clearing. Empty/nonapplicable facets are disabled. Result title, identity/type, summary, dated role and controlling caveat are rendered once from verified metadata; links and text are DOM-created, never injected HTML. The form keeps its geometry during loading. Debounced queries cancel obsolete rendering; pagination, retry, empty, no-JS and browse paths are explicit.
