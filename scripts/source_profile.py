"""Required public-site metadata/omission contract; original audit stays external.

No fallback reads private inputs. Build success never supplies release authority.
"""
import hashlib
import json
from pathlib import Path
import re


def public_profile(root: Path):
    path = root / 'config/source-profile.json'
    if (root / 'config').is_symlink() or not path.is_file() or path.is_symlink():
        raise ValueError('Missing or symlink public-site input contract')
    data = json.loads(path.read_text())
    if set(data) != {'schemaVersion', 'profile', 'metadata', 'omittedPrivateInputs', 'originalInputVerification', 'reviewAcceptance'} or data.get('schemaVersion') != 2 or data.get('profile') != 'public-site' or data.get('originalInputVerification') != 'absent-not-verified':
        raise ValueError('Invalid public-site input contract')
    for relative, digest in data['metadata'].items():
        file = root / relative
        if relative not in {'src/content/public-provenance.json', 'config/omitted-content-signatures.json'} or any(p.is_symlink() for p in [file,*file.parents] if p.is_relative_to(root)) or hashlib.sha256(file.read_bytes()).hexdigest() != digest:
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
        relative_path = Path(relative)
        if relative_path.is_absolute() or '..' in relative_path.parts or '\\' in relative:
            raise ValueError('Unsafe private omission path')
        path = root / relative
        if path.exists() or any(p.is_symlink() for p in [path, *path.parents] if p.is_relative_to(root)):
            raise ValueError(f'Private input present in public source: {relative}')
    if json.loads((root / 'config/release.json').read_text()).get('mode') != 'public':
        raise ValueError('Public source must build the public edition')
    return data


def capture_manifest(root, path):
    public_profile(root)
    data = json.loads((root / 'src/content/public-provenance.json').read_text())
    return data['walkthrough'] if path == 'src/content/walkthrough-source.json' else data['manifests'][path]


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
