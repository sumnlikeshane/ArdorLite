"""Reproducible pinned Pagefind tables without changing search semantics."""
import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from normalize_pagefind import MAGIC, decode_cbor, encode_cbor, normalize, stable_gzip


def inventory(root):
    return {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob('*') if p.is_file()}


def fixture(root, reverse=False):
    (root / 'filter').mkdir(parents=True)
    (root / 'fragment').mkdir()
    (root / 'index').mkdir()
    (root / 'fragment/en_fragment.pf_fragment').write_bytes(b'exact original fragment bytes')
    (root / 'index/en_words.pf_index').write_bytes(b'exact original word/posting bytes')
    filters = [['type', 'en_types'], ['identity', 'en_ids']]
    sorts = [['title', [1, 0]], ['date', [0, 1]]]
    values = {'en_types': ['type', [['case', [0]], ['claim', [1]]]],
              'en_ids': ['identity', [['claim-one', [1]], ['case-one', [0]]]]}
    if reverse:
        filters.reverse()
        sorts.reverse()
        for data in values.values():
            data[1].reverse()
    for name, data in values.items():
        (root / 'filter' / (name + '.pf_filter')).write_bytes(gzip.compress(MAGIC + encode_cbor(data), mtime=123 if reverse else 0))
    meta = ['1.5.2', [['en_fragment', 7], ['en_fragment', 9]], [['a', 'z', 'en_words']], filters, sorts, ['title', 'summary']]
    (root / 'pagefind.en_meta.pf_meta').write_bytes(gzip.compress(MAGIC + encode_cbor(meta), mtime=2 if reverse else 0))
    (root / 'pagefind-entry.json').write_text(json.dumps({'version': '1.5.2', 'languages': {'en': {'hash': 'en_meta', 'wasm': 'en', 'page_count': 2}}, 'include_characters': '_-'}))


class PagefindNormalizationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def test_order_and_gzip_timestamps_cannot_change_output(self):
        first, second = self.root / 'first', self.root / 'second'
        fixture(first)
        fixture(second, reverse=True)
        original_fragment = (first / 'fragment/en_fragment.pf_fragment').read_bytes()
        original_words = (first / 'index/en_words.pf_index').read_bytes()
        normalize(first)
        normalize(second)
        self.assertEqual(inventory(first), inventory(second))
        self.assertEqual((first / 'fragment/en_fragment.pf_fragment').read_bytes(), original_fragment)
        self.assertEqual((first / 'index/en_words.pf_index').read_bytes(), original_words)
        entry = json.loads((first / 'pagefind-entry.json').read_text())
        meta = decode_cbor(gzip.decompress((first / ('pagefind.' + entry['languages']['en']['hash'] + '.pf_meta')).read_bytes())[len(MAGIC):])
        self.assertEqual(meta[1], [['en_fragment', 7], ['en_fragment', 9]])
        self.assertEqual(meta[2], [['a', 'z', 'en_words']])
        self.assertEqual(meta[4], [['date', [0, 1]], ['title', [1, 0]]])
        semantics = {}
        for name, hashed in meta[3]:
            data = decode_cbor(gzip.decompress((first / 'filter' / (hashed + '.pf_filter')).read_bytes())[len(MAGIC):])
            semantics[name] = dict(data[1])
        self.assertEqual(semantics, {'type': {'case': [0], 'claim': [1]}, 'identity': {'case-one': [0], 'claim-one': [1]}})
        before = inventory(first)
        normalize(first)
        self.assertEqual(inventory(first), before)

    def test_schema_drift_and_bad_references_fail_before_mutation(self):
        for change in ('version', 'page-count', 'unsafe-hash', 'orphan', 'bad-page'):
            with self.subTest(change=change):
                root = self.root / change
                fixture(root)
                entry_path = root / 'pagefind-entry.json'
                entry = json.loads(entry_path.read_text())
                if change == 'version':
                    entry['version'] = '9.0.0'
                elif change == 'page-count':
                    entry['languages']['en']['page_count'] = 3
                elif change == 'unsafe-hash':
                    entry['languages']['en']['hash'] = '../../private'
                elif change == 'orphan':
                    (root / 'filter/en_orphan.pf_filter').write_bytes(b'orphan')
                elif change == 'bad-page':
                    (root / 'filter/en_ids.pf_filter').write_bytes(gzip.compress(MAGIC + encode_cbor(['identity', [['claim-one', [500]]]])))
                entry_path.write_text(json.dumps(entry))
                before = inventory(root)
                with self.assertRaises(ValueError):
                    normalize(root)
                self.assertEqual(inventory(root), before)

    def test_unknown_or_noncanonical_cbor_fails_closed(self):
        for value in (b'\x18\x01', b'\x9f\xff', b'\xa0', b'\x81', b'\x60\x00', b'\x63x', b'\x18', b'\xf6'):
            with self.subTest(value=value), self.assertRaises(ValueError):
                decode_cbor(value)

    def test_stored_gzip_is_portable_and_supports_empty_and_large_payloads(self):
        for data in (b'', b'one', b'test' * 40000):
            result = stable_gzip(data)
            self.assertEqual(gzip.decompress(result), data)
            self.assertEqual(result[3:10], b'\x00\x00\x00\x00\x00\x00\xff')
            self.assertEqual(result, stable_gzip(data))

    def test_symlinks_are_rejected_without_mutation(self):
        root = self.root / 'site'
        fixture(root)
        victim = root / 'pagefind.en_meta.pf_meta'
        real = self.root / 'private'
        real.write_bytes(victim.read_bytes())
        victim.unlink()
        victim.symlink_to(real)
        before = real.read_bytes()
        with self.assertRaises(ValueError):
            normalize(root)
        self.assertEqual(real.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
