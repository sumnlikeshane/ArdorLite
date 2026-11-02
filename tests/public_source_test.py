"""Adverse engineering-profile checks, using temporary copies only."""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from source_profile import public_profile, signature_errors
from pipeline_common import ROOT


class PublicSourceTests(unittest.TestCase):
    def test_profile_requires_exact_metadata_and_absence(self):
        if not (ROOT / 'config/source-profile.json').exists():
            self.assertIsNone(public_profile(ROOT))
            return
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for path in ['config/source-profile.json', 'config/release.json', 'config/experience-sources.json',
                         'config/evidence-supplements.json', 'config/omitted-content-signatures.json', 'src/content/public-provenance.json']:
                file = root / path
                file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / path, file)
            profile = public_profile(root)
            private = root / profile['omittedPrivateInputs'][0]
            private.parent.mkdir(parents=True, exist_ok=True)
            private.write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Private input present'):
                public_profile(root)
            private.unlink()
            (root / 'src/content/public-provenance.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Changed public provenance'):
                public_profile(root)

    def test_hashed_omission_signature_detects_a_real_token_window(self):
        import hashlib
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'config').mkdir()
            phrase = 'synthetic private fixture with enough words for an exact regression'
            data = {'phrases': [{'words': len(phrase.split()), 'prefixSha256': hashlib.sha256(' '.join(phrase.split()[:2]).encode()).hexdigest(), 'sha256': hashlib.sha256(phrase.encode()).hexdigest(), 'identity': 'fixture'}],
                    'numbers': [{'sha256': hashlib.sha256(b'12.3456%').hexdigest(), 'identity': 'fixture-rate'}]}
            (root / 'config/omitted-content-signatures.json').write_text(json.dumps(data))
            self.assertEqual(len(signature_errors(root, ['prefix ' + phrase + ' suffix 12.3456%'])), 2)
            self.assertEqual(signature_errors(root, ['source provenance remains available']), [])
