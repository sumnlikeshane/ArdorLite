"""Preserve exact public files without opening a directory/traversal boundary."""
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from serve_dist import resolve_file


class StaticPreviewTests(unittest.TestCase):
    def test_extensionless_licence_and_directory_route_are_readable(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'notices').mkdir()
            (root / 'notices/LICENSE').write_text('retained exact licence')
            (root / 'case').mkdir()
            (root / 'case/index.html').write_text('static case')
            self.assertEqual(resolve_file(root, '/notices/LICENSE'), root / 'notices/LICENSE')
            self.assertEqual(resolve_file(root, '/case/'), root / 'case/index.html')
            self.assertIsNone(resolve_file(root, '/missing'))

    def test_encoded_traversal_and_symlink_cannot_read_outside_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'dist'
            root.mkdir()
            secret = root.parent / 'private.txt'
            secret.write_text('private fixture')
            (root / 'linked.txt').symlink_to(secret)
            for path in ['/../private.txt', '/%2e%2e/private.txt', '/linked.txt', '/.hidden', '/%5cprivate.txt']:
                self.assertIsNone(resolve_file(root, path))
