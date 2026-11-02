# Reproduction boundaries

Supported baseline: Python 3.12. All validation, content inspection and independent synthetic examples run offline with the standard library:

```sh
python3 scripts/validate.py
python3 -m unittest discover -s tests -v
```

Optional figure regeneration uses Matplotlib 3.10.9:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-charts.txt
.venv/bin/python scripts/generate_charts.py
```

Rendered SVG/PNG and accessible tables are already bundled. Regeneration reads only evidence/tables JSON. It never opens source paths or fetches inputs. Fonts are Matplotlib's default DejaVu Sans; numerical bar lengths and labels come from the recorded values. SVG/PNG bytes can vary with runtime/platform; after a regeneration, review the figures and deliberately refresh the allowlist/manifest before claiming hash validation of a changed package.

Archived aggregate results permit reproducing display transformations, not historical strategy returns. Report transcriptions identify the report and exact table/section. Return replication remains private_inputs_required because raw prices, event rows, execution snapshots and protected holdouts are omitted. Synthetic examples have meaningful local tests but no market-evidence status.

No daily trend NAV, rolling Sharpe, equity curve or invented uncertainty interval is included. Sorting the offline chart explorer changes display order only. It cannot select a new strategy or calculate a new result.
