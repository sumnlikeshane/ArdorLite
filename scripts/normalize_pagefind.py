"""Canonicalize Pagefind 1.5.2's unordered filter tables for repeatable builds.

Pinned upstream schemas (not a replacement search index):
https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind/src/index/index_filter.rs
https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind/src/index/index_metadata.rs
The upstream index/mod.rs TODO at the filter encoder documents unstable HashMap
order. Only unordered filter/value and sort-key lists are reordered. Page IDs,
posting lists, fragments, word indexes and search metadata values are unchanged.
"""
from __future__ import annotations

import binascii
import gzip
import hashlib
import json
from pathlib import Path
import re
import struct
import sys

sys.dont_write_bytecode = True
VERSION = '1.5.2'
MAGIC = b'pagefind_dcd'
NAME = re.compile(r'[A-Za-z0-9_-]+\Z')


def decode_cbor(data: bytes):
    """Read only the definite integer/text/array subset in the pinned schemas."""
    offset = 0

    def take(length):
        nonlocal offset
        end = offset + length
        if end > len(data):
            raise ValueError('Truncated Pagefind CBOR')
        value, offset = data[offset:end], end
        return value

    def read(depth=0):
        if depth > 32:
            raise ValueError('Excessive Pagefind CBOR nesting')
        initial = take(1)[0]
        major, length = initial >> 5, initial & 31
        if length in (24, 25, 26, 27):
            length = int.from_bytes(take(1 << (length - 24)), 'big')
        elif length >= 28:
            raise ValueError('Unsupported Pagefind CBOR length')
        if major == 0:
            return length
        if major == 1:
            return -1 - length
        if major == 3:
            return take(length).decode('utf-8', errors='strict')
        if major == 4:
            if length > len(data) - offset:
                raise ValueError('Impossible Pagefind CBOR array length')
            return [read(depth + 1) for _ in range(length)]
        raise ValueError(f'Unsupported Pagefind CBOR type: {major}')

    result = read()
    if offset != len(data):
        raise ValueError('Trailing Pagefind CBOR bytes')
    if encode_cbor(result) != data:
        raise ValueError('Noncanonical or changed Pagefind CBOR encoding')
    return result


def encode_cbor(value) -> bytes:
    def head(major, length):
        if length < 24:
            return bytes([(major << 5) | length])
        for marker, width in ((24, 1), (25, 2), (26, 4), (27, 8)):
            if length < 1 << (width * 8):
                return bytes([(major << 5) | marker]) + length.to_bytes(width, 'big')
        raise ValueError('Pagefind CBOR integer is too large')

    if type(value) is int:
        return head(0, value) if value >= 0 else head(1, -1 - value)
    if isinstance(value, str):
        text = value.encode('utf-8')
        return head(3, len(text)) + text
    if isinstance(value, list):
        return head(4, len(value)) + b''.join(encode_cbor(item) for item in value)
    raise ValueError('Unsupported Pagefind CBOR value')


def stable_gzip(data: bytes) -> bytes:
    """Stored DEFLATE blocks avoid compressor/version/platform differences.

    These small filter/meta files total about 31 KiB on the existing publication.
    Fragments and word indexes retain Pagefind's ordinary compressed output.
    """
    blocks = []
    chunks = [data[start:start + 65535] for start in range(0, len(data), 65535)] or [b'']
    for index, chunk in enumerate(chunks):
        length = len(chunk)
        blocks.append(bytes([int(index == len(chunks) - 1)]) + struct.pack('<HH', length, length ^ 0xffff) + chunk)
    return b'\x1f\x8b\x08\x00\x00\x00\x00\x00\x00\xff' + b''.join(blocks) + struct.pack('<II', binascii.crc32(data), len(data) & 0xffffffff)


def upstream_hash(data: bytes) -> str:
    # utils.rs deliberately formats each SHA-1 byte without zero-padding.
    return ''.join(format(byte, 'x') for byte in hashlib.sha1(data).digest())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def normalize(directory: Path) -> dict:
    directory = Path(directory)
    require(not directory.is_symlink() and not (directory / 'filter').is_symlink(), 'Symlink Pagefind directory')
    entry_path = directory / 'pagefind-entry.json'
    require(not entry_path.is_symlink(), 'Symlink Pagefind entry')
    entry = json.loads(entry_path.read_text())
    require(entry.get('version') == VERSION, 'Pagefind normalizer requires version 1.5.2')
    require(isinstance(entry.get('languages'), dict) and entry['languages'], 'Missing Pagefind languages')
    outputs, old_paths = {}, set()
    filter_count = 0

    def file_path(name, suffix, folder=''):
        require(isinstance(name, str) and bool(NAME.fullmatch(name)), 'Unsafe Pagefind hash/name')
        path = directory / folder / (name + suffix)
        require(path.is_file() and not path.is_symlink(), f'Missing/symlink Pagefind file: {path.name}')
        old_paths.add(path)
        return path

    def unpack(path):
        raw = gzip.decompress(path.read_bytes())
        require(raw.startswith(MAGIC), 'Invalid Pagefind payload prefix')
        return decode_cbor(raw[len(MAGIC):])

    def output(path, value):
        data = stable_gzip(MAGIC + encode_cbor(value))
        require(path not in outputs or outputs[path] == data, 'Pagefind hash collision')
        require(not path.is_symlink(), 'Symlink Pagefind output')
        outputs[path] = data

    for language, details in sorted(entry['languages'].items()):
        require(bool(NAME.fullmatch(language)), 'Unsafe Pagefind language')
        require(isinstance(details, dict), 'Invalid Pagefind language entry')
        # The dot in the fixed filename prefix is not an arbitrary input name.
        name = details.get('hash')
        require(isinstance(name, str) and bool(NAME.fullmatch(name)), 'Unsafe Pagefind metadata hash')
        old_meta = directory / f'pagefind.{name}.pf_meta'
        require(old_meta.is_file() and not old_meta.is_symlink(), 'Missing/symlink Pagefind metadata')
        old_paths.add(old_meta)
        meta = unpack(old_meta)
        require(isinstance(meta, list) and len(meta) == 6 and meta[0] == VERSION, 'Changed Pagefind metadata schema')
        require(all(isinstance(meta[i], list) for i in range(1, 6)), 'Invalid Pagefind metadata arrays')
        count = details.get('page_count')
        require(type(count) is int and count == len(meta[1]), 'Pagefind page-count mismatch')
        require(all(isinstance(row, list) and len(row) == 2 and isinstance(row[0], str) and type(row[1]) is int and row[1] >= 0 for row in meta[1]), 'Invalid Pagefind page references')
        filters = set()
        for pair in meta[3]:
            require(isinstance(pair, list) and len(pair) == 2 and isinstance(pair[0], str) and pair[0] not in filters, 'Invalid/duplicate Pagefind filter')
            filters.add(pair[0])
            data = unpack(file_path(pair[1], '.pf_filter', 'filter'))
            require(isinstance(data, list) and len(data) == 2 and data[0] == pair[0] and isinstance(data[1], list), 'Changed Pagefind filter schema')
            values = set()
            for row in data[1]:
                require(isinstance(row, list) and len(row) == 2 and isinstance(row[0], str) and row[0] not in values and isinstance(row[1], list), 'Invalid/duplicate Pagefind filter value')
                values.add(row[0])
                require(all(type(page) is int and 0 <= page < count for page in row[1]), 'Invalid Pagefind filter page ID')
            data[1].sort(key=lambda row: row[0])
            name = language + '_' + upstream_hash(encode_cbor(data))
            output(directory / 'filter' / (name + '.pf_filter'), data)
            pair[1] = name
            filter_count += 1
        for row in meta[4]:
            require(isinstance(row, list) and len(row) == 2 and isinstance(row[0], str) and isinstance(row[1], list) and all(type(page) is int and 0 <= page < count for page in row[1]), 'Invalid Pagefind sort')
        require(len({row[0] for row in meta[4]}) == len(meta[4]), 'Duplicate Pagefind sort')
        meta[3].sort(key=lambda row: row[0])
        meta[4].sort(key=lambda row: row[0])
        name = language + '_' + upstream_hash(encode_cbor(meta))
        output(directory / f'pagefind.{name}.pf_meta', meta)
        details['hash'] = name
    expected_old = set(directory.glob('*.pf_meta')) | set((directory / 'filter').glob('*.pf_filter'))
    require(expected_old == old_paths, 'Unreferenced or missing Pagefind filter/metadata files')
    # Validate every input before mutating any generated file. Remove only old
    # referenced files whose new content-addressed destinations differ.
    for path, data in outputs.items():
        path.write_bytes(data)
    for path in old_paths - outputs.keys():
        path.unlink()
    entry_path.write_text(json.dumps(entry, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n')
    return {'version': VERSION, 'languages': len(entry['languages']), 'filters': filter_count}


if __name__ == '__main__':
    if sys.version_info[:2] != (3, 12) or sys.flags.optimize:
        raise SystemExit('Ordinary, nonoptimized Python 3.12 is required')
    result = normalize(Path(sys.argv[1]) if len(sys.argv) == 2 else Path('dist/pagefind'))
    print(f'Canonical Pagefind {result["version"]}: {result["languages"]} languages, {result["filters"]} filters; posting lists and fragments preserved.')
