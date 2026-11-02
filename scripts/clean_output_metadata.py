"""Keep local Finder metadata out of generated output; preserve inspection copies."""
import sys
sys.dont_write_bytecode = True
import shutil
from pipeline_common import ROOT, guard

def clean_local_output_metadata():
    output = ROOT / 'dist'
    if output.is_symlink():
        raise SystemExit('Refusing symlinked output tree')
    items = list(output.rglob('.DS_Store'))
    for path in items:
        if path.is_symlink() or not path.resolve().is_relative_to(output.resolve()):
            raise SystemExit('Refusing unexpected metadata path')
        target = ROOT / 'generated' / 'local-output-metadata' / path.relative_to(output)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        path.unlink()
    return len(items)

if __name__ == '__main__':
    guard()
    print(f'Excluded {clean_local_output_metadata()} Finder metadata files from generated output; public source unchanged.')
