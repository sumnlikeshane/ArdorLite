"""Select unchanged, checksum-pinned upstream WASM for portable search bytes.

Pagefind 1.5.2 native packages embed different compiled WASM. Both supported host
families use the exact linux-x64 upstream pair. Unknown emitted or changed vendor
bytes fail before mutation; genuine browser/search tests still judge behavior.
"""
import gzip
import hashlib
from pathlib import Path
from pipeline_common import ROOT, read_json

NAMES = {'wasm.en.pagefind', 'wasm.unknown.pagefind'}


def pin(directory: Path, root: Path = ROOT):
    config = read_json(root / 'config/pagefind-wasm.json')
    entry = read_json(directory / 'pagefind-entry.json')
    if config.get('schemaVersion') != 1 or config.get('pagefindVersion') != '1.5.2' or entry.get('version') != '1.5.2':
        raise ValueError('Portable WASM requires Pagefind 1.5.2')
    if set(config['assets']) != NAMES or {p.name for p in directory.glob('wasm.*.pagefind')} != NAMES:
        raise ValueError('Changed Pagefind WASM/language inventory')
    outputs = {}
    for name, asset in config['assets'].items():
        expected = 'vendor/pagefind-1.5.2/' + name
        if asset['path'] != expected:
            raise ValueError('Invalid portable WASM source path')
        source = root / expected
        target = directory / name
        if source.is_symlink() or target.is_symlink():
            raise ValueError('Symlink portable WASM input')
        raw = source.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        payload = gzip.decompress(raw)
        if digest != asset['sha256'] or hashlib.sha256(payload).hexdigest() != asset['inflatedSha256'] or not payload.startswith(b'pagefind_dcd\0asm'):
            raise ValueError('Changed pinned upstream WASM')
        emitted = hashlib.sha256(target.read_bytes()).hexdigest()
        if emitted not in set(asset['allowedEmittedSha256']) | {digest}:
            raise ValueError('Unrecognized emitted Pagefind WASM; inspect upstream package before extending pins')
        outputs[target] = raw
    for target, raw in outputs.items():
        target.write_bytes(raw)
    return {name: config['assets'][name]['sha256'] for name in sorted(NAMES)}


if __name__ == '__main__':
    print('Pinned portable upstream Pagefind WASM:', pin(ROOT / 'dist/pagefind'))
