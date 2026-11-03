"""Adversarial checks that the substantive static-output gate detects defects."""
import importlib.util
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from output_audit import Document, audit, resolve_reference, internal_copy_matches
from pipeline_common import ROOT


class OutputBoundaryTests(unittest.TestCase):
    def test_public_output_audit_enforces_actual_permissions(self):
        # Inject an unresolved actual profile use; never depend on canonical rights
        # remaining unknown after an explicit material-specific declaration.
        import copy, output_audit
        from material_permissions import material_permissions
        from pipeline_common import read_json
        ledger = copy.deepcopy(read_json(ROOT / 'config/material-dispositions.json'))
        ledger['profiles']['reviewed-derivative']['downloadableDerivatives']['state'] = 'unknown'
        permissions = material_permissions(ROOT, ledger)
        original = output_audit.read_json
        def public_read(path):
            data = original(path)
            return {**data, 'mode': 'public'} if path == ROOT / 'config/release.json' else data
        with patch.object(output_audit, 'read_json', side_effect=public_read), patch.object(output_audit, 'material_permissions', return_value=permissions):
            result = audit(write_receipt=False)
        self.assertEqual(result['status'], 'failed')
        self.assertTrue(any('downloadableDerivatives is unknown' in e for e in result['errors']))

    def test_internal_copy_checks_split_text_accessible_names_and_metadata(self):
        for html in [
            '<p>Local <strong>review edition</strong> · 2026</p>',
            '<meta data-pagefind-meta="date[content]" content="Reviewed evidence: 11 October 2026">',
            '<button aria-label="Decision brief · authored reading guide">Open</button>',
        ]:
            doc = Document(html)
            self.assertTrue(internal_copy_matches(doc.text + doc.copy_metadata))
        self.assertFalse(internal_copy_matches([
            'Reused development history; Phase 1 failed. Candidate V5 remained rejected.',
            'Observed 2026-10-11; source date unavailable. Source rights remain restricted.',
            'Independent synthetic example; historical run identity remains unresolved.',
        ]))

    def test_rejects_internal_copy_on_real_page(self):
        text = (ROOT / 'dist/index.html').read_text() + '<p>Local review edition · 2026</p>'
        result = self.altered_output('index.html', text)
        self.assertTrue(any('Internal publication copy in /:' in e for e in result['errors']))

    def test_rejects_internal_copy_in_browser_status_text(self):
        path = next((ROOT / 'dist/_astro').glob('*.js'))
        text = path.read_text() + '\nconst regressionStatus = "Local search could not load. ";'
        result = self.altered_output(str(path.relative_to(ROOT / 'dist')), text)
        self.assertTrue(any('Internal publication copy in browser script' in e for e in result['errors']))

    def test_rejects_internal_copy_in_actual_search_fragment(self):
        import gzip, json
        temporary = tempfile.TemporaryDirectory(prefix='ardor-copy-search-test-')
        self.addCleanup(temporary.cleanup)
        output = Path(temporary.name) / 'dist'
        shutil.copytree(ROOT / 'dist', output)
        path = next((output / 'pagefind/fragment').glob('*.pf_fragment'))
        fragment = json.loads(gzip.decompress(path.read_bytes())[12:])
        fragment['meta']['date'] = 'Reviewed evidence: 11 October 2026'
        path.write_bytes(gzip.compress(b'pagefind_dcd' + json.dumps(fragment).encode()))
        result = audit(output, write_receipt=False)
        self.assertTrue(any('Internal publication copy in search' in e for e in result['errors']))

    def test_duplicate_fragment_and_escaped_text_parsing(self):
        doc = Document('<h2 id="x">A &amp; B</h2><a href="#x">jump</a><p id="x">duplicate</p>')
        self.assertEqual(doc.ids, ["x", "x"])
        self.assertIn("A & B", doc.text)
        self.assertEqual(resolve_reference("/a/b/", "../c/#hello%20world"), ("/a/c/", "hello world"))

    def altered_output(self, relative, text):
        temporary = tempfile.TemporaryDirectory(prefix="ardor-output-test-")
        self.addCleanup(temporary.cleanup)
        output = Path(temporary.name) / "dist"
        shutil.copytree(ROOT / "dist", output)
        path = output / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return audit(output, write_receipt=False)

    def test_rejects_unmapped_download_and_full_archive(self):
        result = self.altered_output("downloads/complete-handoff.zip", "not approved")
        self.assertEqual(result["status"], "failed")
        self.assertTrue(any("Archive or source map" in e for e in result["errors"]))
        self.assertTrue(any("Unclassified output" in e for e in result["errors"]))

    def test_rejects_broken_fragment_on_real_page(self):
        text = (ROOT / "dist" / "index.html").read_text() + '<a href="/evidence/claims/#claim-does-not-exist">broken</a>'
        result = self.altered_output("index.html", text)
        self.assertTrue(any("Broken fragment" in e for e in result["errors"]))

    def test_rejects_changed_reviewed_download(self):
        import json
        mapping = json.loads((ROOT / "config" / "publication-assets.json").read_text())
        path = mapping["assets"][0]["outputUrl"].lstrip("/")
        result = self.altered_output(path, "changed evidence bytes")
        self.assertTrue(any("Public bytes differ from reviewed source" in e for e in result["errors"]))

    def test_rejects_wrong_rendered_evidence_value(self):
        page = ROOT / "dist" / "evidence" / "claims" / "index.html"
        text = page.read_text().replace('<span class="claim-value">1,264</span>', '<span class="claim-value">126,400</span>', 1)
        self.assertNotEqual(text, page.read_text(), "The real claim fixture changed; update the deliberate corruption target.")
        result = self.altered_output("evidence/claims/index.html", text)
        self.assertTrue(any("Claim atlas-gates-01 recorded value" in e for e in result["errors"]))

    def test_rejects_wrong_rendered_supplement_value(self):
        import hashlib, json, output_audit
        from source_profile import signature_errors
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'config').mkdir()
            phrase = 'synthetic restricted fixture with enough words to identify an exposed capture'
            number = '12.3456%'
            (root / 'config/omitted-content-signatures.json').write_text(json.dumps({'phrases': [{'identity': 'fixture', 'words': len(phrase.split()), 'prefixSha256': hashlib.sha256(' '.join(phrase.split()[:2]).encode()).hexdigest(), 'sha256': hashlib.sha256(phrase.encode()).hexdigest()}], 'numbers': [{'identity': 'fixture-rate', 'sha256': hashlib.sha256(number.encode()).hexdigest()}]}))
            with patch.object(output_audit, 'signature_errors', side_effect=lambda _,texts: signature_errors(root,texts)):
                result = self.altered_output('research/cases/trend-quality/index.html', (ROOT / 'dist/research/cases/trend-quality/index.html').read_text() + '<span data-supplement-key="fixture.rate">' + number + '</span>')
            self.assertTrue(any('Restricted omitted' in e for e in result['errors']))
            self.assertTrue(any('Restricted supplement display' in e for e in result['errors']))

    def test_rejects_local_only_source_in_public_browser_chunk(self):
        import hashlib, json, output_audit
        from source_profile import signature_errors
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'config').mkdir()
            phrase = 'synthetic restricted fixture with enough words to identify an exposed capture'
            number = '12.3456%'
            (root / 'config/omitted-content-signatures.json').write_text(json.dumps({'phrases': [{'identity': 'fixture', 'words': len(phrase.split()), 'prefixSha256': hashlib.sha256(' '.join(phrase.split()[:2]).encode()).hexdigest(), 'sha256': hashlib.sha256(phrase.encode()).hexdigest()}], 'numbers': [{'identity': 'fixture-rate', 'sha256': hashlib.sha256(number.encode()).hexdigest()}]}))
            with patch.object(output_audit, 'signature_errors', side_effect=lambda _,texts: signature_errors(root,texts)):
                path = next((ROOT / 'dist/_astro').glob('*.js'))
                result = self.altered_output(str(path.relative_to(ROOT / 'dist')), path.read_text() + '\nconst restrictedFixture = ' + json.dumps(' ' + phrase + ' ') + ';')
            self.assertTrue(any('Restricted omitted' in e for e in result['errors']))

    def test_rejects_finder_metadata_in_generated_output(self):
        result = self.altered_output('.DS_Store', 'local Finder metadata must never be deployed')
        self.assertTrue(any('Unclassified output' in e or 'Hidden directory' in e for e in result['errors']))

    def test_rejects_mutated_search_destination_and_value(self):
        import gzip, json
        temporary = tempfile.TemporaryDirectory(prefix="ardor-search-output-test-")
        self.addCleanup(temporary.cleanup)
        output = Path(temporary.name) / "dist"
        shutil.copytree(ROOT / "dist", output)
        for path in (output / "pagefind/fragment").glob("*.pf_fragment"):
            fragment = json.loads(gzip.decompress(path.read_bytes())[12:])
            if fragment["url"] == "/research/cases/atlas-ssf/#claim-atlas-gates-01":
                fragment["meta"]["summary"] = "126400 cells. Wrong value"
                path.write_bytes(gzip.compress(b"pagefind_dcd" + json.dumps(fragment).encode()))
                break
        else:
            self.fail("Canonical search fixture missing")
        result = audit(output, write_receipt=False)
        self.assertTrue(any("Search claim value/unit differs" in e for e in result["errors"]))
        fragment["url"] = "/evidence/sources/#missing-search-source"
        path.write_bytes(gzip.compress(b"pagefind_dcd" + json.dumps(fragment).encode()))
        result = audit(output, write_receipt=False)
        self.assertTrue(any("Search canonical entity/destination coverage differs" in e for e in result["errors"]))
        self.assertTrue(any("Missing search anchor" in e for e in result["errors"]))


if __name__ == "__main__":
    unittest.main()
