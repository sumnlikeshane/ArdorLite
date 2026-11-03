"""Meaningful negative checks for the website's public evidence boundary."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

MODULE = Path(__file__).resolve().parents[1] / "scripts/assets_prepare.py"
spec = importlib.util.spec_from_file_location("assets_prepare", MODULE)
assets_prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(assets_prepare)


class ExportBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.snapshot = self.root / "snapshot"
        self.public = self.root / "public"
        (self.snapshot / "evidence").mkdir(parents=True)
        self.public.mkdir()
        (self.snapshot / "NOTICE.md").write_text("Reserved rights\n")
        digest = hashlib.sha256((self.snapshot / "NOTICE.md").read_bytes()).hexdigest()
        (self.snapshot / "evidence/allowlist.json").write_text(json.dumps({"files": [{"path": "NOTICE.md"}]}))
        (self.snapshot / "evidence/manifest.json").write_text(json.dumps({"sources": [], "derivatives": [{"path": "NOTICE.md", "sha256": digest, "source_artifact_ids": [], "publication_review": {"decision": "include"}}]}))
        url = "/downloads/reviewed/2026-10-11/NOTICE.md"
        self.config = {"schemaVersion": 1, "snapshot": "2026-10-11", "baseUrl": "/downloads/reviewed/2026-10-11/", "assets": [{"sourcePath": "NOTICE.md", "sourceSha256": digest, "sourceIds": [], "outputUrl": url, "role": "notice", "notices": [url], "transformation": "byte-preserving reviewed file export"}]}

    def tearDown(self):
        self.temporary.cleanup()

    def validate(self):
        return assets_prepare.validated_assets(self.config, self.snapshot, self.public)

    def test_reviewed_hash_verified_file_can_export(self):
        self.assertEqual(len(self.validate()), 1)

    def test_tampered_reviewed_source_is_rejected(self):
        (self.snapshot / "NOTICE.md").write_text("Changed bytes\n")
        with self.assertRaisesRegex(ValueError, "Changed or unreviewed"):
            self.validate()

    def test_unlisted_original_is_rejected_even_if_it_exists(self):
        (self.snapshot / "private-report.md").write_text("Never export")
        self.config["assets"][0]["sourcePath"] = "private-report.md"
        with self.assertRaisesRegex(ValueError, "not a reviewed derivative"):
            self.validate()

    def test_arbitrary_or_duplicate_output_is_rejected(self):
        self.config["assets"][0]["outputUrl"] = "/elsewhere/NOTICE.md"
        with self.assertRaisesRegex(ValueError, "Unintended"):
            self.validate()
        self.config["assets"][0]["outputUrl"] = self.config["baseUrl"] + "NOTICE.md"
        self.config["assets"].append(copy.deepcopy(self.config["assets"][0]))
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.validate()

    def test_source_and_output_symlinks_are_rejected(self):
        original = self.snapshot / "NOTICE.md"
        original.unlink()
        outside = self.root / "outside.md"
        outside.write_text("Reserved rights\n")
        original.symlink_to(outside)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            self.validate()
        original.unlink()
        original.write_text("Reserved rights\n")
        (self.public / "downloads").symlink_to(self.root)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            self.validate()

    def test_traversal_and_encoded_destinations_are_rejected(self):
        for path in ["../original.md", "/original.md", "a/../../original.md", "a//b", "a/./b", "a/%2e%2e/private", "a\\b", "a?query"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                assets_prepare.safe_path(self.public, path)

    def test_missing_material_notice_is_rejected(self):
        self.config["assets"][0]["notices"] = ["/unapproved-notice.md"]
        with self.assertRaisesRegex(ValueError, "Notice is not an approved"):
            self.validate()


if __name__ == "__main__":
    unittest.main()
