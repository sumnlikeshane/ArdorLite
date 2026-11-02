"""Loopback-only, read-only preview of exact static bytes, including licence files.

This verification server is never deployed. Render receives only dist/. Unlike
Astro's development preview it serves extensionless public licence files, rejects
symlinks/traversal, has no listing/write endpoint, and returns the built 404 page.
"""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
from pipeline_common import ROOT, guard


def resolve_file(root: Path, path: str):
    path = unquote(path)
    if not path.startswith('/') or '\\' in path or any(ord(c) < 32 for c in path):
        return None
    relative = PurePosixPath(path.lstrip('/'))
    if any(part in {'.', '..'} or part.startswith('.') for part in relative.parts):
        return None
    candidate = root.joinpath(*relative.parts)
    if candidate.is_dir():
        candidate /= 'index.html'
    parts = candidate.relative_to(root).parts
    within = [root, *(root.joinpath(*parts[:index]) for index in range(1, len(parts) + 1))]
    if any(p.is_symlink() for p in within):
        return None
    return candidate if candidate.is_file() and candidate.resolve().is_relative_to(root.resolve()) else None


def main():
    guard()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4321)
    parser.add_argument('--host', choices=['127.0.0.1'], default='127.0.0.1')
    parser.add_argument('--ignore-lock', action='store_true', help='Compatibility flag; this server always stays in the foreground')
    args = parser.parse_args()
    dist = ROOT / 'dist'
    if not (dist / 'index.html').is_file():
        raise SystemExit('Build the static publication first')

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.serve(True)

        def do_HEAD(self):
            self.serve(False)

        def serve(self, body):
            requested = urlsplit(self.path)
            file = resolve_file(dist, requested.path)
            status = 200 if file else 404
            if file and file.name == 'index.html' and requested.path != '/' and not requested.path.endswith(('/', '/index.html')):
                self.send_response(308)
                self.send_header('Location', requested.path + '/' + ('?' + requested.query if requested.query else ''))
                self.end_headers()
                return
            file = file or dist / '404.html'
            data = file.read_bytes() if file.is_file() else b'Not found\n'
            self.send_response(status)
            self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            if body:
                self.wfile.write(data)

        def log_message(self, *_):
            pass

    print(f'Exact static preview: http://{args.host}:{args.port}/ (read-only; no deployment)', flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
