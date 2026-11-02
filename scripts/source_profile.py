"""Explicit engineering-only public-source profile; never deployment authority.

Private builds keep their original capture/supplement verification. The public
profile verifies an exact metadata projection, omission signatures and the full
unchanged frozen snapshot instead. It cannot attest to absent original inputs.
"""
import hashlib
import json
from pathlib import Path
import re


def public_profile(root: Path):
    path = root / 'config/source-profile.json'
    if not path.exists():
        return None
    if path.is_symlink():
        raise ValueError('Symlink source profile')
    data = json.loads(path.read_text())
    if data.get('schemaVersion') != 1 or data.get('profile') != 'public-source' or data.get('deploymentEligible') is not False:
        raise ValueError('Invalid engineering-only source profile')
    for relative, digest in data['metadata'].items():
        file = root / relative
        if relative not in {'src/content/public-provenance.json', 'config/omitted-content-signatures.json'} or file.is_symlink() or hashlib.sha256(file.read_bytes()).hexdigest() != digest:
            raise ValueError('Changed public provenance/signature projection')
    if set(data['metadata']) != {'src/content/public-provenance.json', 'config/omitted-content-signatures.json'}:
        raise ValueError('Incomplete public-source metadata')
    selected = json.loads((root / 'config/experience-sources.json').read_text())
    supplements = json.loads((root / 'config/evidence-supplements.json').read_text())['supplements']
    required = {'src/content/walkthrough-source.json', 'src/content/local-publication-context.json', 'tests/private-publication-expectations.json', *selected['manifests']}
    required.update(item[key] for item in supplements for key in ('path', 'approvalRecord', 'proposalPath'))
    if set(data['omittedPrivateInputs']) != required:
        raise ValueError('Incomplete private-input omission inventory')
    for relative in required:
        if (root / relative).exists() or (root / relative).is_symlink():
            raise ValueError(f'Private input present in public source: {relative}')
    if json.loads((root / 'config/release.json').read_text()).get('mode') != 'public':
        raise ValueError('Public source must build the public edition')
    return data


def capture_manifest(root, path):
    if public_profile(root):
        data = json.loads((root / 'src/content/public-provenance.json').read_text())
        return data['walkthrough'] if path == 'src/content/walkthrough-source.json' else data['manifests'][path]
    return json.loads((root / path).read_text())


def signature_errors(root, texts):
    """Match bounded token windows/numeric tokens without shipping private text."""
    data = json.loads((root / 'config/omitted-content-signatures.json').read_text())
    signatures = {}
    for item in data['phrases']:
        signatures.setdefault(item['prefixSha256'], []).append(item)
    numbers = {item['sha256']: item['identity'] for item in data['numbers']}
    errors = set()
    for text in texts:
        words = text.split()
        for index in range(len(words) - 1):
            prefix = hashlib.sha256(' '.join(words[index:index+2]).encode()).hexdigest()
            for item in signatures.get(prefix, []):
                phrase = ' '.join(words[index:index+item['words']])
                if hashlib.sha256(phrase.encode()).hexdigest() == item['sha256']:
                    errors.add('Restricted omitted source contents exposed: ' + item['identity'])
        for number in re.findall(r'(?<![\w.])-?\d+\.\d+(?:[eE][+-]?\d+)?%?', text):
            digest = hashlib.sha256(number.encode()).hexdigest()
            if digest in numbers:
                errors.add('Restricted omitted supplement value exposed: ' + numbers[digest])
    return sorted(errors)
