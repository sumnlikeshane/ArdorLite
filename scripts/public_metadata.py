"""Generate origin-bound public crawler files after the canonical Astro render."""
from urllib.parse import urlsplit
from xml.sax.saxutils import escape
from pipeline_common import ROOT, guard, read_json


def prepare():
    release = read_json(ROOT / 'config/release.json')
    dist = ROOT / 'dist'
    sitemap = dist / 'sitemap.xml'
    if release['mode'] == 'local':
        sitemap.unlink(missing_ok=True)
        (dist / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        return
    origin = release.get('publicOrigin', '').rstrip('/')
    url = urlsplit(origin)
    if url.scheme != 'https' or not url.hostname or url.path or url.query or url.fragment or url.username or url.password:
        raise ValueError('Actual canonical HTTPS origin required')
    exported = {a['outputUrl'].lstrip('/') for a in read_json(ROOT / 'config/publication-assets.json')['assets']}
    routes = []
    for file in sorted(dist.rglob('*.html')):
        path = file.relative_to(dist).as_posix()
        if path in exported or path == '404.html':
            continue
        routes.append('/' + path.removesuffix('index.html'))
    body = ''.join(f'<url><loc>{escape(origin + route)}</loc></url>' for route in routes)
    sitemap.write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + body + '</urlset>\n')
    (dist / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {origin}/sitemap.xml\n')
    print(f'Public crawler metadata: {len(routes)} canonical routes at {origin}')


if __name__ == '__main__':
    guard()
    prepare()
