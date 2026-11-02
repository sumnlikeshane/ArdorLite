"""Exhaustive static-output inventory, publication-boundary and link audit."""
from __future__ import annotations

from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
from html.parser import HTMLParser
from html import unescape
import json
import gzip
from pathlib import Path, PurePosixPath
import re
import sys
import xml.etree.ElementTree as ET
from urllib.parse import unquote, urljoin, urlsplit
sys.dont_write_bytecode = True
from pipeline_common import ROOT, SNAPSHOT, artifact_identity, guard, inventory, now, read_json, sha256, write_json
from material_permissions import material_permissions
from publication_policy import authored_routes, publication_readiness
from source_profile import public_profile, signature_errors, capture_manifest

BASE = "https://local.ardor.invalid"
STATIC_ASSETS = {
    "brand/logos/ardor-lite-horizontal-compact-on-light.svg", "brand/favicons/favicon.ico",
    "brand/app-icons/apple-touch-icon.png", "brand/social/og-light.png", "notices/ardor-brand-THIRD-PARTY-NOTICES.txt",
    "favicon.svg", "images/publication-cover.svg", "images/icons/arrow-up-right.svg",
    "images/icons/search.svg", "images/icons/menu.svg", "notices/lucide-LICENSE.txt",
    "notices/inter-LICENSE.txt", "notices/source-serif-4-LICENSE.txt", "notices/jetbrains-mono-LICENSE.txt",
}
SITE_ROUTES = {"/", "/404.html", "/research/", "/research/walkthrough/", "/research/catalog/", "/research/previews/", "/methods/",
               "/about/", "/engineering/", "/evidence/", "/evidence/claims/", "/evidence/sources/", "/publication/", "/release/", "/search/"}


def normalized(text: str) -> str:
    return " ".join(text.split())



def disclosure_variants(text: str) -> list[str]:
    decoded = unescape(text)
    decoded = re.sub(r'\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})', lambda m: chr(int(m.group(1) or m.group(2), 16)), decoded)
    decoded = decoded.replace(r'\n', '\n').replace(r'\r', '\r').replace(r'\t', '\t').replace(r'\"', '"').replace(r"\'", "'")
    return list({normalized(text), normalized(decoded)})


def restricted_public_content_errors(root: Path, texts: list[str]) -> list[str]:
    """Reject actual restricted capture/supplement contents across public files.

    Reference metadata and stable omitted-source anchors remain allowed. Check
    full excerpts, exact serialized copies and meaningful three-line previews;
    source manifests themselves are immutable and are not a deployment allowlist.
    """
    texts = [variant for text in texts for variant in disclosure_variants(text)]
    if public_profile(root):
        return signature_errors(root, texts)
    selected = read_json(root / 'config/experience-sources.json')
    manifests = ['src/content/walkthrough-source.json', *selected['manifests']]
    errors = []
    for manifest in manifests:
        for excerpt in read_json(root / manifest)['excerpts']:
            code = excerpt.get('text', excerpt.get('code', ''))
            candidates = {normalized(code), normalized(json.dumps(code, ensure_ascii=False)[1:-1])}
            lines = code.splitlines()
            candidates.update(normalized(' '.join(lines[i:i+3])) for i in range(max(0, len(lines)-2))
                              if len(normalized(' '.join(lines[i:i+3]))) >= 100)
            if any(candidate and any(candidate in text for text in texts) for candidate in candidates):
                errors.append(f'Restricted local-only source contents exposed: {manifest}/{excerpt["id"]}')
    for descriptor in read_json(root / 'config/evidence-supplements.json')['supplements']:
        supplement = read_json(root / descriptor['path'])
        for row in supplement['rows']:
            for field, raw in row['rates'].items():
                displays = (raw, f'{Decimal(raw) * 100:.4f}%')
                if any(value in text for value in displays for text in texts):
                    errors.append(f'Restricted local-only supplement value exposed: {row["period"]["id"]}.{field}')
    local_context = root / 'src/content/local-publication-context.json'
    if local_context.is_file():
        for key, value in read_json(local_context).items():
            if any(normalized(value) in text for text in texts):
                errors.append(f'Restricted local-only explanation exposed: {key}')
    return errors


# Reader-facing copy only. Historical exports/source notices remain byte-preserved;
# research terms such as development history, study phases and source dates are valid.
INTERNAL_COPY = re.compile(
    r"\b(?:local review edition|reviewed evidence\s*:|reviewed snapshot\s*[·:]|"
    r"reviewed outcome\s*/|decision brief\s*·\s*authored|authored reading guide|"
    r"a guide to the 11 October reviewed evidence|read the complete 11 October narrative|"
    r"current authored context|archived publication metadata|publication state\s*:|"
    r"editorial implementation revision|public origin unset|local readiness|"
    r"reviewed for local use|evidence was reviewed on|local search could not load|"
    r"loading local search|searching local evidence|"
    r"case excerpt capture remains for its milestone|for the implemented milestone|"
    r"confirmed by the user on|detailed upstream/AI credit remain unset)(?=\W|$)",
    re.IGNORECASE,
)


def internal_copy_matches(parts: list[str]) -> list[str]:
    return sorted(set(match.group() for match in INTERNAL_COPY.finditer(normalized(" ".join(parts)))))


class Document(HTMLParser):
    def __init__(self, source: str):
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.refs: list[tuple[str, bool]] = []
        self.text: list[str] = []
        self.copy_metadata: list[str] = []
        self.title: list[str] = []
        self.in_title = False
        self.description = ""
        self.robots = ""
        self.canonicals: list[str] = []
        self.og_urls: list[str] = []
        self.filters: dict[str, list[str]] = {}
        self.claims: list[str] = []
        self.figures: list[str] = []
        self.body_indexed = False
        self.claim_texts: dict[str, list[str]] = {}
        self.claim_values: dict[str, list[str]] = {}
        self.in_claim_value = False
        self.cells: dict[tuple[str, str, str], list[str]] = {}
        self.current_claim = None
        self.current_table = None
        self.current_row = None
        self.current_column = None
        self.supplement_values = {}
        self.supplement_keys = []
        self.current_supplement = None
        self.ignored_tag = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.copy_metadata.extend(a[key] for key in ("aria-label", "alt", "title", "placeholder") if a.get(key))
        if tag == "meta" and a.get("property") == "og:url":
            self.og_urls.append(a.get("content", ""))
        if tag == "meta" and a.get("content"):
            self.copy_metadata.append(a["content"])
        if tag == 'span' and a.get('data-supplement-key'):
            self.current_supplement = a['data-supplement-key']
            self.supplement_keys.append(self.current_supplement)
            self.supplement_values[self.current_supplement] = []
        if a.get("id"):
            self.ids.append(a["id"])
        if a.get("data-claim-id"):
            self.claims.append(a["data-claim-id"])
            self.current_claim = a["data-claim-id"]
            self.claim_texts[self.current_claim] = []
            self.claim_values[self.current_claim] = []
        if tag == "span" and "claim-value" in a.get("class", "").split():
            self.in_claim_value = True
        if a.get("data-evidence-table"):
            self.current_table = a["data-evidence-table"]
        if a.get("data-row-label"):
            self.current_row = a["data-row-label"]
        if a.get("data-column") and self.current_table and self.current_row:
            self.current_column = a["data-column"]
            self.cells[(self.current_table, self.current_row, self.current_column)] = []
        if tag in ("script", "style"):
            self.ignored_tag = tag
        if a.get("data-figure-id"):
            self.figures.append(a["data-figure-id"])
        if "data-pagefind-body" in a:
            self.body_indexed = True
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            if a.get("data-pagefind-filter", "").endswith("[content]"):
                key = a["data-pagefind-filter"].removesuffix("[content]")
                self.filters.setdefault(key, []).append(a.get("content", ""))
            if a.get("name", "").lower() == "description":
                self.description = a.get("content", "")
            if a.get("name", "").lower() == "robots":
                self.robots = a.get("content", "")
            if a.get("property") == "og:image" and a.get("content"):
                self.refs.append((a["content"], True))
        if tag == "link" and "canonical" in a.get("rel", "").split():
            self.canonicals.append(a.get("href", ""))
        for attr in ("href", "src", "poster", "action"):
            if a.get(attr):
                resource = (tag not in ("a", "area") or attr != "href") and not (tag == "link" and "canonical" in a.get("rel", "").split())
                self.refs.append((a[attr], resource))
        for item in a.get("srcset", "").split(","):
            if item.strip():
                self.refs.append((item.strip().split()[0], True))
        for match in re.findall(r"url\(\s*['\"]?([^)'\"]+)", a.get("style", "")):
            self.refs.append((match, True))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "article":
            self.current_claim = None
        if tag == "span":
            self.in_claim_value = False
            self.current_supplement = None
        if tag == "td":
            self.current_column = None
        if tag == "tr":
            self.current_row = None
        if tag == "table":
            self.current_table = None
        if tag == self.ignored_tag:
            self.ignored_tag = None

    def handle_data(self, data):
        if self.ignored_tag:
            return
        self.text.append(data)
        if self.current_supplement:
            self.supplement_values[self.current_supplement].append(data)
        if self.current_claim:
            self.claim_texts[self.current_claim].append(data)
            if self.in_claim_value:
                self.claim_values[self.current_claim].append(data)
        if self.current_table and self.current_row and self.current_column:
            self.cells[(self.current_table, self.current_row, self.current_column)].append(data)
        if self.in_title:
            self.title.append(data)


def route_for(path: str) -> str:
    return "/" + path[:-10] if path.endswith("index.html") else "/" + path


def resolve_reference(source: str, reference: str) -> tuple[str, str] | None:
    if not reference or reference.startswith(("mailto:", "tel:", "data:", "blob:")):
        return None
    parsed = urlsplit(urljoin(BASE + source, reference))
    if parsed.scheme not in ("http", "https") or parsed.netloc != urlsplit(BASE).netloc:
        return None
    path = unquote(parsed.path)
    if "\x00" in path or "\\" in path or any(p == ".." for p in PurePosixPath(path).parts):
        raise ValueError(f"Unsafe URL {reference}")
    return path, unquote(parsed.fragment)


def target_file(path: str, dist: Path) -> Path | None:
    candidate = dist / path.lstrip("/")
    if candidate.is_dir():
        candidate = candidate / "index.html"
    elif not candidate.exists() and not Path(path).suffix:
        candidate = candidate / "index.html"
    return candidate if candidate.is_file() and candidate.resolve().is_relative_to(dist.resolve()) else None


def expected_value(value) -> str:
    """Independent four-decimal evidence contract, with grouping ignored."""
    if value is None:
        return "Unavailable"
    if isinstance(value, bool):
        return str(value).lower()
    if isinstance(value, (int, float)):
        rounded = Decimal(str(value)).quantize(Decimal(".0001"), rounding=ROUND_HALF_UP)
        return format(rounded, "f").rstrip("0").rstrip(".") if "." in format(rounded, "f") else format(rounded, "f")
    if isinstance(value, list):
        return " · ".join(expected_value(v) for v in value)
    if isinstance(value, dict):
        return "; ".join(f"{key}: {expected_value(v)}" for key, v in value.items())
    return str(value)


def audit(dist: Path | None = None, write_receipt: bool = True, clean_local_metadata: bool = False) -> dict:
    dist = dist or ROOT / "dist"
    errors: list[str] = []
    def require(condition, message):
        if not condition:
            errors.append(message)
    require(dist.is_dir(), "dist/ is absent; run the full build first")
    release = read_json(ROOT / "config" / "release.json")
    permissions = material_permissions()
    errors.extend(permissions['errors'])
    if release.get('mode') != 'local':
        errors.extend(permissions.get('selectedPublicBlockers', permissions['publicBlockers']))
        publication = publication_readiness(ROOT)
        errors.extend(publication.get('engineeringBuildBlockers', publication['publicBlockers']) if public_profile(ROOT) else publication.get('launchBlockers', publication['publicBlockers']))
    require(release.get('mode') in {'local', 'public'}, 'Unknown release mode')
    records = read_json(SNAPSHOT / "content" / "research.json")["records"]
    claims = read_json(SNAPSHOT / "evidence" / "claims.json")["claims"]
    methods = read_json(SNAPSHOT / "content" / "methods.json")["examples"]
    cases = sorted({c["case_id"] for c in claims})
    specs = [read_json(p) for p in sorted((SNAPSHOT / "charts" / "specs").glob("*.json"))]
    require(set(read_json(ROOT / "config" / "routes.json")["fixedRoutes"]) | {"/404.html"} == SITE_ROUTES, "Fixed route contract differs from audited publication routes")
    expected_routes = SITE_ROUTES | {f"/research/records/{r['id']}/" for r in records} | {f"/research/cases/{c}/" for c in cases} | {f"/methods/{m['id'].removeprefix('method-')}/" for m in methods}
    try:
        expected_routes |= authored_routes(ROOT)
    except (OSError, ValueError, TypeError, KeyError) as error:
        errors.append(f'Authored route contract failed: {error}')
    publication = read_json(ROOT / "config" / "publication-assets.json")
    actual_exports = read_json(ROOT / "generated" / "publication-assets.json")
    export_rows = actual_exports.get("assets", actual_exports.get("files", [])) if isinstance(actual_exports, dict) else actual_exports
    mapped = {a["outputUrl"].lstrip("/"): a for a in publication["assets"]}
    exported = {a["outputUrl"].lstrip("/"): a for a in export_rows}
    require(len(mapped) == len(publication["assets"]), "Duplicate publication output URL")
    require(set(mapped) == set(exported), "Configured and generated publication exports differ")
    for path, item in mapped.items():
        source = SNAPSHOT / item["sourcePath"]
        require(source.is_file() and source.resolve().is_relative_to(SNAPSHOT.resolve()), f"Unsafe or absent export source: {path}")
        if source.is_file():
            require(sha256(source) == item["sourceSha256"], f"Reviewed export hash mismatch: {path}")
        output = dist / path
        require(output.is_file(), f"Missing export in dist: {path}")
        if output.is_file():
            require(sha256(output) == item["sourceSha256"], f"Public bytes differ from reviewed source: {path}")
            require(exported.get(path, {}).get("outputSha256") == sha256(output), f"Exporter receipt hash mismatch: {path}")
    dependency_manifest = read_json(ROOT / "generated" / "dependency-notices.json")
    dependencies = {a["outputUrl"].lstrip("/"): a for a in dependency_manifest["assets"]}
    allowed_public = set(mapped) | set(dependencies) | STATIC_ASSETS | {"robots.txt"}
    # Finder metadata remains local input only; build strips it from generated
    # output. The output classifier below still rejects any deployed copy.
    actual_public = {p.relative_to(ROOT / "public").as_posix() for p in (ROOT / "public").rglob("*") if p.is_file() and p.name != '.DS_Store'}
    require(actual_public == allowed_public, f"Public source tree differs from explicit exports/assets/notices; missing={sorted(allowed_public-actual_public)}; unexpected={sorted(actual_public-allowed_public)}")
    documents = {}
    if clean_local_metadata:
        if dist.resolve() != (ROOT / 'dist').resolve():
            raise ValueError('Metadata cleanup is limited to generated local dist')
        from clean_output_metadata import clean_local_output_metadata
        print(f'Excluded {clean_local_output_metadata()} Finder metadata files immediately before inventory; public source unchanged.')
    all_files = inventory(dist)
    for entry in all_files:
        path = entry["path"]
        file = dist / path
        require(not file.is_symlink(), f"Symlink in output: {path}")
        require(not re.search(r"\.(zip|tar|gz|tgz|7z|map)$", path, re.I), f"Archive or source map prohibited: {path}")
        require(not any(part.startswith(".") for part in Path(path).parts), f"Hidden directory in output: {path}")
        require(path in mapped or not any(part in {"reviewed", "receipts", "node_modules", "scripts", "tests", "src"} for part in Path(path).parts), f"Private/source directory in output: {path}")
        if path in mapped:
            entry["classification"] = "reviewed-allowlisted-export"
        elif path in dependencies:
            entry["classification"] = "dependency-notice"
            require(entry["sha256"] == dependencies[path]["outputSha256"], f"Dependency notice changed: {path}")
        elif path in STATIC_ASSETS:
            entry["classification"] = "authored-public-asset"
            require((ROOT / "public" / path).is_file() and entry["sha256"] == sha256(ROOT / "public" / path), f"Authored asset mismatch: {path}")
        elif path == "robots.txt":
            entry["classification"] = "robots-policy"
        elif path.startswith("_astro/") and file.suffix in {".js", ".css", ".woff2", ".woff", ".svg", ".png", ".webp"}:
            entry["classification"] = "compiled-static-asset"
        elif path.startswith("pagefind/") and file.suffix in {".js", ".css", ".json", ".wasm", ".pagefind", ".pf_filter", ".pf_meta", ".pf_index", ".pf_fragment"}:
            entry["classification"] = "pagefind-search-asset"
        elif file.suffix == ".html" and route_for(path) in expected_routes:
            entry["classification"] = "publication-html"
        elif release.get("mode") == "public" and path in {"sitemap.xml", "sitemap-index.xml", "sitemap-0.xml"}:
            entry["classification"] = "sitemap"
        else:
            entry["classification"] = "UNAPPROVED"
            errors.append(f"Unclassified output file: {path}")
        if file.suffix in {".html", ".css", ".js", ".json", ".txt", ".svg"}:
            text = file.read_text(encoding="utf-8")
            require(not re.search(r"(?:file://|/Users/|/private/(?:tmp|var)/|[A-Z]:\\Users\\)", text), f"Local filesystem path disclosed: {path}")
            require("sourceMappingURL=" not in text, f"Source map reference in output: {path}")
            if file.suffix == ".js" and path not in mapped:
                require(not internal_copy_matches([text]), f"Internal publication copy in browser script {path}: {internal_copy_matches([text])}")
        if file.suffix == ".html":
            doc = Document(file.read_text(encoding="utf-8"))
            documents[path] = doc
            duplicate_ids = [i for i, n in Counter(doc.ids).items() if n > 1]
            require(not duplicate_ids, f"Duplicate HTML IDs in {path}: {duplicate_ids}")
    actual_routes = {route_for(path) for path in documents if path not in mapped}
    require(actual_routes == expected_routes, f"Route coverage mismatch; missing={sorted(expected_routes-actual_routes)}; extra={sorted(actual_routes-expected_routes)}")
    titles, descriptions = [], []
    references = 0
    for path, doc in documents.items():
        route = route_for(path)
        if path not in mapped:
            require(not internal_copy_matches(doc.text + doc.copy_metadata),
                    f"Internal publication copy in {route}: {internal_copy_matches(doc.text + doc.copy_metadata)}")
            title = normalized(" ".join(doc.title))
            require(bool(title) and bool(doc.description), f"Missing title/description: {route}")
            titles.append(title)
            descriptions.append(doc.description)
            if release.get("mode") == "local":
                require("noindex" in doc.robots.lower(), f"Local page lacks noindex: {route}")
                require(not doc.canonicals, f"Local page invents canonical origin: {route}")
            else:
                origin = release.get("publicOrigin")
                require(bool(origin) and origin.startswith("https://"), "Public mode needs real HTTPS publicOrigin")
                require(doc.canonicals == [str(origin).rstrip("/") + route], f"Canonical mismatch: {route}")
        for ref, resource in doc.refs:
            references += 1
            require(not ref.lower().startswith(("javascript:", "file:")), f"Unsafe link from {route}: {ref}")
            # Absolute origin-bound metadata still resolves to an audited local file.
            # Foreign loaded assets retain the original prohibition.
            origin = str(release.get('publicOrigin') or '').rstrip('/')
            if release.get('mode') == 'public' and origin and ref.startswith(origin + '/'):
                ref = ref[len(origin):]
            if resource:
                require(not ref.startswith(("http://", "https://", "//")), f"Network-loaded resource from {route}: {ref}")
            try:
                resolved = resolve_reference(route, ref)
            except ValueError as error:
                errors.append(str(error)); continue
            if resolved:
                target, fragment = resolved
                destination = target_file(target, dist)
                require(destination is not None, f"Broken internal reference {route} → {ref}")
                if destination and fragment and destination.suffix == ".html":
                    target_doc = documents.get(destination.relative_to(dist).as_posix())
                    require(target_doc is not None and fragment in target_doc.ids, f"Broken fragment {route} → {ref}")
    require(len(set(titles)) == len(titles), "Publication page titles are not unique")
    require(len(set(descriptions)) == len(descriptions), "Publication descriptions are not unique")
    for file in dist.rglob("*.css"):
        for ref in re.findall(r"url\(\s*['\"]?([^)'\"]+)", file.read_text()):
            require(not ref.startswith(("http://", "https://", "//")), f"External CSS asset: {file.name}: {ref}")
            resolved = resolve_reference("/" + file.relative_to(dist).as_posix(), ref)
            if resolved:
                require(target_file(resolved[0], dist) is not None, f"Broken CSS asset: {file.name}: {ref}")
    for r in records:
        doc = documents.get(f"research/records/{r['id']}/index.html")
        if not doc: continue
        text = normalized(" ".join(doc.text))
        require(doc.filters.get("reproduction") == [r["reproduction_level"]], f"Record {r['id']} search reproduction metadata differs from source")
        require(doc.filters.get("status") == [r["status"]], f"Record {r['id']} search outcome metadata differs from source")
        for field in ("status", "final_outcome", "controlling_gates", "reproduction_level"):
            value = r[field]
            if isinstance(value, str):
                displayed = value.replace("_", " ") if field == "reproduction_level" else value
                require(normalized(value) in text or normalized(displayed) in text, f"Record {r['id']} omits source {field}")
        if r["original_verdict"] is not None:
            require(normalized(r["original_verdict"]) in text, f"Record {r['id']} original verdict absent")
        else:
            require("unavailable" in text.lower(), f"Record {r['id']} null original verdict lacks unavailable label")
    record_index = {r["id"]: r for r in records}
    # Material-specific captures must be embedded intact on their declared reading route.
    # They are never additions to the reviewed download map.
    source_approval = read_json(ROOT / "config/experience-sources.json")
    for manifest in source_approval["manifests"]:
        route = source_approval["embeddedRoutes"][manifest]
        source_doc = documents.get(route)
        require(source_doc is not None, f"Source reading route missing: {route}")
        if source_doc:
            source_text = normalized(" ".join(source_doc.text))
            for excerpt in capture_manifest(ROOT, manifest)["excerpts"]:
                require(excerpt["id"] in source_doc.ids, f"Captured source disclosure missing: {excerpt['id']}")
                for field in ("path", "symbol", "sha256", "excerptSha256", "originalHead", "historicalNote", "rightsNote", "capturedAt", "normalization", "historicalRelation"):
                    require(normalized(excerpt[field]) in source_text, f"Source disclosure omits {field}: {excerpt['id']}")
                if release.get('mode') == 'local':
                    require(normalized(excerpt["text"]) in source_text, f"Captured source text differs: {excerpt['id']}")
                else:
                    if "text" in excerpt:
                        require(normalized(excerpt["text"]) not in source_text, f"Restricted source text exposed: {excerpt['id']}")
                    require('not included in the public edition' in source_text, f"Public source-omission notice missing: {excerpt['id']}")
    for case in read_json(ROOT / "src" / "content" / "cases.json"):
        doc = documents.get(f"research/cases/{case['slug']}/index.html")
        if not doc: continue
        levels = {record_index[record_id]["reproduction_level"] for record_id in case["primaryRecordIds"]}
        require(set(doc.filters.get("reproduction", [])) == levels, f"Case {case['id']} search reproduction metadata differs from its primary records: expected {sorted(levels)}")
        require(set(doc.filters.get("status", [])) == set(case["outcomes"]), f"Case {case['id']} search outcome metadata differs from its decisions")
    trend_doc = documents.get('research/cases/trend-quality/index.html')
    for descriptor in ([] if public_profile(ROOT) else read_json(ROOT / 'config/evidence-supplements.json')['supplements']):
        supplement = read_json(ROOT / descriptor['path'])
        expected_supplement = {}
        for row in supplement['rows']:
            period = row['period']
            for field, raw in row['rates'].items():
                expected_supplement[f'{period["id"]}.{field}'] = f'{Decimal(raw) * 100:.4f}%'
            for field in ['train_start', 'train_end', 'test_start', 'test_end']:
                expected_supplement[f'{period["id"]}.{field}'] = period[field]
        if trend_doc and release.get('mode') == 'local':
            require(Counter(trend_doc.supplement_keys) == Counter(expected_supplement.keys()), 'Supplement display coverage/uniqueness differs')
            for key, expected in expected_supplement.items():
                actual = normalized(' '.join(trend_doc.supplement_values.get(key, []))).replace(',', '')
                require(actual == expected, f'Supplement {key} value/date differs from approved source precision/format')
            require(descriptor['sha256'] in normalized(' '.join(trend_doc.text)), 'Rendered supplement identity missing')
    if release.get('mode') == 'public':
        public_texts = [normalized(' '.join(doc.text)) for doc in documents.values()]
        for path in dist.rglob('*'):
            if not path.is_file():
                continue
            if path.suffix in {'.html', '.js', '.json', '.xml', '.txt', '.svg'}:
                public_texts.append(normalized(path.read_text(errors='replace')))
            elif path.suffix == '.pf_fragment':
                public_texts.append(normalized(gzip.decompress(path.read_bytes()).decode('utf8', errors='replace')))
        for error in restricted_public_content_errors(ROOT, public_texts):
            require(False, error)
        require(not any(doc.supplement_keys for doc in documents.values()), 'Restricted supplement display exposed in public output')
    index = documents.get("evidence/claims/index.html")
    for claim in claims:
        for path in ("evidence/claims/index.html", f"research/cases/{claim['case_id']}/index.html"):
            doc = documents.get(path)
            if not doc: continue
            require(f"claim-{claim['id']}" in doc.ids, f"Missing canonical/index claim anchor {claim['id']} in {path}")
            text = normalized(" ".join(doc.text))
            for value in [claim["description"], claim["unit"], claim["reproduction_level"], *claim["caveats"]]:
                require(normalized(value) in text, f"Claim {claim['id']} omits recorded description/unit/caveat/reproduction in {path}")
            claim_value = normalized(" ".join(doc.claim_values.get(claim["id"], []))).replace(",", "")
            require(expected_value(claim["value"]).replace(",", "") == claim_value, f"Claim {claim['id']} recorded value is absent or misformatted in {path}")
    require(index is not None and Counter(index.claims) == Counter(c["id"] for c in claims), "Claim registry does not contain exactly 204 distinct claim entries")
    for spec in specs:
        doc = documents.get(f"research/cases/{spec['case_id']}/index.html")
        require(doc is not None and f"figure-{spec['id']}" in doc.ids, f"Figure missing from case: {spec['id']}")
        if doc:
            table = read_json(SNAPSHOT / spec["input_table"])
            columns = {key for row in table["rows"] for key in row if key not in {"label", "claim_id", "additional_claim_ids"}}
            for row in table["rows"]:
                for column in columns:
                    key = (table["id"], row["label"], column)
                    value = normalized(" ".join(doc.cells.get(key, []))).replace(",", "").removesuffix("Claim ↗").strip()
                    require(value == expected_value(row.get(column)).replace(",", ""), f"Rendered table value mismatch {table['id']} / {row['label']} / {column}: {value!r}")
    require(any(p.startswith("pagefind/") and p.endswith("pagefind.js") for p in (f["path"] for f in all_files)), "Production Pagefind index missing")
    entry_file = dist / "pagefind" / "pagefind-entry.json"
    if entry_file.is_file():
        search_entry = read_json(entry_file)
        page_count = sum(item["page_count"] for item in search_entry.get("languages", {}).values())
        require(page_count == len(expected_routes) - 2 + len(claims) + len(read_json(SNAPSHOT / "evidence/manifest.json")["sources"]) + 17 + 4, f"Pagefind must index all intended pages plus canonical claim/source/directory/preview entities: {page_count}")
        require(len(list((dist / "pagefind" / "fragment").glob("*.pf_fragment"))) == page_count, "Pagefind fragment count differs from indexed pages")
        # Inspect actual compressed index, independently of the generated manifest.
        fragments = []
        for fragment in (dist / "pagefind" / "fragment").glob("*.pf_fragment"):
            try:
                fragments.append(json.loads(gzip.decompress(fragment.read_bytes()).removeprefix(b"pagefind_dcd")))
            except (ValueError, OSError) as error:
                require(False, f"Invalid Pagefind fragment {fragment.name}: {error}")
        indexed_urls = [f.get("url") for f in fragments]
        for fragment in fragments:
            copy = [fragment.get("content", ""), *[str(value) for value in fragment.get("meta", {}).values()]]
            require(not internal_copy_matches(copy),
                    f"Internal publication copy in search {fragment.get('url')}: {internal_copy_matches(copy)}")
        directory_ids = {s["source_id"] for r in records for s in r["source_index_references"]} - {s["id"] for s in read_json(SNAPSHOT / "evidence/manifest.json")["sources"]}
        search_destinations = {f"/research/cases/{c['case_id']}/#claim-{c['id']}" for c in claims}
        search_destinations |= {f"/evidence/sources/#{s['id']}" for s in read_json(SNAPSHOT / "evidence/manifest.json")["sources"]}
        search_destinations |= {f"/evidence/sources/#{id}" for id in directory_ids}
        search_destinations |= {f"/research/previews/#{p['id']}" for p in read_json(SNAPSHOT / "content/previews.json")["records"]}
        search_destinations |= expected_routes - {"/search/", "/404.html"}
        require(set(indexed_urls) == search_destinations, "Search canonical entity/destination coverage differs")
        require(len(indexed_urls) == len(set(indexed_urls)), "Duplicate canonical search destination")
        search_by_url = {f.get("url"): f for f in fragments}
        for claim in claims:
            url = f"/research/cases/{claim['case_id']}/#claim-{claim['id']}"
            f = search_by_url.get(url, {})
            meta = f.get("meta", {})
            value = expected_value(claim["value"]) + " " + claim["unit"] + "."
            require(meta.get("summary", "").replace(",", "").startswith(value.replace(",", "")), f"Search claim value/unit differs: {claim['id']}")
            require(all(c in meta.get("caveat", "") for c in claim["caveats"]), f"Search claim caveats missing: {claim['id']}")
            require(f.get("filters", {}).get("identity") == [claim["id"]], f"Search exact claim identity differs: {claim['id']}")
        for source in read_json(SNAPSHOT / "evidence/manifest.json")["sources"]:
            meta = search_by_url.get(f"/evidence/sources/#{source['id']}", {}).get("meta", {})
            date = f"Observed {source['observation_date']}; source date: {source['source_date'] or 'Unavailable'}. {source['source_date_basis']}"
            require(meta.get("date") == date, f"Search source date/basis differs: {source['id']}")

        for f in fragments:
            resolved = resolve_reference("/search/", f.get("url", ""))
            if resolved:
                target = target_file(resolved[0], dist)
                require(target is not None, f"Missing search destination: {f.get('url')}")
                if target and resolved[1]:
                    relative = target.relative_to(dist).as_posix()
                    require(resolved[1] in documents[relative].ids, f"Missing search anchor: {f.get('url')}")
            require(bool(f.get("meta", {}).get("entity")), f"Search entity identity missing: {f.get('url')}")
            if f.get("url") == "/research/catalog/":
                require("No records match these filters" not in f.get("content", ""), "Catalog empty state leaked into search")
                require("trend_quality_immediate_entry_v1" not in f.get("content", ""), "Duplicate catalog records leaked into search")

    robots = dist / "robots.txt"
    require(robots.is_file(), "robots.txt missing")
    if release.get("mode") == "local" and robots.is_file():
        require("Disallow: /" in robots.read_text(), "Local robots policy must disallow indexing")
        require(not list(dist.glob("sitemap*.xml")), "Local mode must not invent sitemap origin")
    if release.get('mode') == 'public' and robots.is_file():
        origin = (release.get('publicOrigin') or '').rstrip('/')
        require('Allow: /' in robots.read_text() and 'Disallow: /' not in robots.read_text(), 'Public robots policy must permit crawling')
        require(f'Sitemap: {origin}/sitemap.xml' in robots.read_text(), 'Public robots sitemap origin differs')
        sitemap = dist / 'sitemap.xml'
        require(sitemap.is_file(), 'Public sitemap missing')
        if sitemap.is_file():
            try:
                urls = [element.text for element in ET.fromstring(sitemap.read_text()).iter() if element.tag.endswith('}loc')]
                intended = {origin + route for route in expected_routes if route != '/404.html'}
                require(set(urls) == intended and len(urls) == len(intended), 'Public sitemap route/origin coverage differs')
            except ET.ParseError:
                require(False, 'Invalid public sitemap XML')
        for path, document in documents.items():
            if path not in mapped:
                require(document.og_urls == [origin + route_for(path)], f'Public Open Graph URL differs: {path}')
    receipt = {"schemaVersion": 1, "checkedAt": now(), "status": "passed" if not errors else "failed",
               "mode": release.get("mode"), "files": all_files, "artifactIdentity": artifact_identity(all_files),
               "counts": {"files": len(all_files), "htmlPages": len(documents), "publicationPages": len(actual_routes), "records": len(records), "cases": len(cases), "methods": len(methods), "claims": len(claims), "figures": len(specs), "referencesCrawled": references, "reviewedExports": len(mapped)},
               "errors": errors}
    if write_receipt:
        write_json(ROOT / "receipts" / "output-audit.json", receipt)
    return receipt


if __name__ == "__main__":
    guard()
    result = audit(clean_local_metadata='--clean-local-metadata' in sys.argv)
    print(f"Output audit: {result['status']}; {result['counts']}")
    for error in result["errors"]:
        print("  " + error, file=sys.stderr)
    raise SystemExit(0 if result["status"] == "passed" else 1)
