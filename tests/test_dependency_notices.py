"""A dirty pnpm store must not alter the locked publication's notices."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import dependency_notices


class DependencyNoticeTests(unittest.TestCase):
    def test_orphan_store_versions_do_not_enter_public_notice_inventory(self):
        with tempfile.TemporaryDirectory(prefix="ardor-notices-test-") as temporary:
            root = Path(temporary)
            (root / "pnpm-lock.yaml").write_text("lockfileVersion: '9.0'\n\npackages:\n\n  keep@1.0.0:\n    resolution: {}\n\nsnapshots:\n\n  keep@1.0.0: {}\n")
            for name, version in [("keep", "1.0.0"), ("keep", "2.0.0"), ("orphan", "1.0.0")]:
                directory = root / "node_modules" / ".pnpm" / f"{name}@{version}" / "node_modules" / name
                directory.mkdir(parents=True)
                (directory / "package.json").write_text(json.dumps({"name": name, "version": version, "license": "MIT"}))
                (directory / "LICENSE").write_text(f"Original notice for {name} {version}\n")
            with patch.object(dependency_notices, "ROOT", root):
                manifest = dependency_notices.prepare()
            output = json.loads((root / "public/notices/dependencies.json").read_text())
            self.assertEqual([(p["name"], p["version"]) for p in output["packages"]], [("keep", "1.0.0")])
            self.assertEqual(manifest["packages"], 1)
            self.assertEqual((root / "public/notices/packages/keep_1.0.0/LICENSE").read_text(), "Original notice for keep 1.0.0\n")

    def test_unknown_lock_schema_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix="ardor-lock-test-") as temporary:
            path = Path(temporary) / "pnpm-lock.yaml"
            path.write_text("lockfileVersion: '10.0'\npackages: {}\n")
            with self.assertRaises(ValueError):
                dependency_notices.locked_packages(path)
