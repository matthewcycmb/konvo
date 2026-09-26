"""Validate onboarding metadata, exact embedded source and distribution mode."""
import argparse
import json
import plistlib
import re
import sys
import zipfile
from pathlib import Path

import brotli

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('ipa')
parser.add_argument('--production', action='store_true')
args = parser.parse_args()
config = json.loads((root / 'src-tauri/tauri.conf.json').read_text())
with zipfile.ZipFile(args.ipa) as z:
    entries = z.namelist()
    app_info = next(p for p in entries if re.fullmatch(r'Payload/[^/]+\.app/Info.plist', p))
    app = app_info.rsplit('/', 1)[0]
    plists = [app_info] + [p for p in entries if re.fullmatch(re.escape(app) + r'/PlugIns/[^/]+\.appex/Info.plist', p)]
    assert len(plists) == 4, 'Missing Screen Time extension'
    for p in plists:
        info = plistlib.loads(z.read(p))
        assert info['CFBundleVersion'] == config['bundle']['iOS']['bundleVersion'], p
        assert info['CFBundleShortVersionString'] == config['version'], p
    info = plistlib.loads(z.read(app_info))
    assert info['CFBundleIdentifier'] == 'com.matthewchan.konvo'
    binary = z.read(app + '/' + info['CFBundleExecutable'])
    for filename in ['onboarding-views.js', 'onboarding-experiment.js', 'cage.js']:
        source = (root / 'src-tauri/src' / filename).read_bytes()
        assert source in binary, 'Embedded source differs: ' + filename
    if args.production:
        assert b'window.__konvoOnboardingPreview=true;' not in binary, 'QA preview override present in production'
    else:
        assert b'window.__konvoOnboardingPreview=true;' in binary, 'Missing preview override'
    for marker in [b'konvo_ab_annual_no_trial_v1', b'konvo_ab_control_v1', b'onboarding_preview']:
        assert marker in binary, 'Missing preview/experiment code: ' + repr(marker)
    assert b'window.__konvoBeta=true;' not in binary
    assert b'window.__konvoFree=true;' not in binary
    expected = (root / 'dist/index.html').read_bytes()
    found = False
    for p in (root / 'src-tauri/target/aarch64-apple-ios/release/build').glob('instamessages*/out/**/*.html*'):
        raw = p.read_bytes()
        try:
            if brotli.decompress(raw) == expected and raw in binary:
                found = True
        except brotli.error:
            pass
    assert found, 'Current bundled onboarding not found in binary'
print('PASS: version/build, four bundles, exact OG/new onboarding source, ' +
      ('production (preview disabled)' if args.production else 'preview enabled') + ', no free-access feature.')
