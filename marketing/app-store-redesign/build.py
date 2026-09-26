"""Build a portable, dependency-free review file from existing Konvo assets."""
import base64
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent


def data_uri(path):
    suffix = path.suffix.lower()
    mime = {'.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg'}[suffix]
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()


assets = {
    'icon': data_uri(ROOT / 'public/icon-512.png'),
    'inbox': data_uri(ROOT / 'wrapper/dist/phone-mockup.webp'),
    'thread': data_uri(ROOT / 'public/phone-thread.webp'),
    'hand': data_uri(ROOT / 'wrapper/dist/phone-hero.png'),
    'pass': data_uri(ROOT / 'wrapper/dist/pass-hero.png'),
    'privacy': data_uri(HERE / 'references/konvo-4.png'),
}
for name in ['konvo', 'opal', 'calai']:
    ext = 'png' if name == 'calai' else 'jpg'
    assets[name] = [data_uri(HERE / f'references/{name}-{i}-thumb.{ext}') for i in range(1, 5)]

template = (HERE / 'gallery.template.html').read_text()
output = HERE / 'index.html'
output.write_text(template.replace('__ASSET_DATA__', json.dumps(assets)))
print(f'Built {output} ({output.stat().st_size / 1024 / 1024:.1f} MB)')
