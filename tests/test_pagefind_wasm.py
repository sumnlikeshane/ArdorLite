"""Unknown or tampered WASM must never become a normalized release pass."""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from pin_pagefind_wasm import pin, NAMES
from pipeline_common import ROOT


class PortableWasmTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        shutil.copytree(ROOT / 'vendor', self.root / 'vendor')
        (self.root / 'config').mkdir()
        shutil.copy2(ROOT / 'config/pagefind-wasm.json', self.root / 'config/pagefind-wasm.json')
        self.output = self.root / 'dist/pagefind'
        self.output.mkdir(parents=True)
        (self.output / 'pagefind-entry.json').write_text(json.dumps({'version': '1.5.2'}))
        for name in NAMES:
            shutil.copy2(self.root / 'vendor/pagefind-1.5.2' / name, self.output / name)

    def tearDown(self):
        self.temporary.cleanup()

    def test_exact_upstream_pair_is_idempotent(self):
        before = {p.name: p.read_bytes() for p in self.output.iterdir()}
        pin(self.output, self.root)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.output.iterdir()})

    def test_unknown_emission_fails_before_any_write(self):
        (self.output / 'wasm.en.pagefind').write_bytes(b'unknown executable')
        before = {p.name: p.read_bytes() for p in self.output.iterdir()}
        with self.assertRaisesRegex(ValueError, 'Unrecognized emitted'):
            pin(self.output, self.root)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.output.iterdir()})

    def test_tampered_vendor_or_extra_language_fails(self):
        source = self.root / 'vendor/pagefind-1.5.2/wasm.en.pagefind'
        source.write_bytes(source.read_bytes() + b'changed')
        with self.assertRaises((ValueError, OSError)):
            pin(self.output, self.root)
        shutil.copy2(ROOT / 'vendor/pagefind-1.5.2/wasm.en.pagefind', source)
        (self.output / 'wasm.new.pagefind').write_bytes(b'new language')
        with self.assertRaisesRegex(ValueError, 'inventory'):
            pin(self.output, self.root)
