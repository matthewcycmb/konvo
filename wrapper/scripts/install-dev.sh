#!/bin/sh
# install-dev.sh <udid> [--keep]: put the current dev IPA on a phone. Without
# --keep the app is uninstalled first so onboarding, the login and the paywall
# replay. The phone must be on the cable and "available (paired)".
set -eu
usage() {
  echo "Usage: $0 <device-udid> [--keep]" >&2
  echo "Set KONVO_IPA to install a different IPA. --keep preserves the app's data." >&2
}
if [ "${1:-}" = "--help" ]; then usage; exit 0; fi
if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then usage; exit 2; fi
DEV=$1; shift
KEEP=${1:-}
if [ -n "$KEEP" ] && [ "$KEEP" != "--keep" ]; then usage; exit 2; fi
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
IPA=${KONVO_IPA:-$SCRIPT_DIR/../src-tauri/gen/apple/build/arm64/Konvo.ipa}
if [ ! -f "$IPA" ]; then echo "IPA not found: $IPA. Build the iOS app first, or set KONVO_IPA." >&2; exit 1; fi
# Use the actual app id, including when a contributor signs their own fork.
BUNDLE_ID=$(python3 - "$IPA" <<'PY'
import plistlib, re, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as ipa:
    info = next(name for name in ipa.namelist() if re.fullmatch(r'Payload/[^/]+\.app/Info\.plist', name))
    print(plistlib.loads(ipa.read(info))['CFBundleIdentifier'])
PY
)
PAIRED=false
for i in $(seq 1 30); do
  if xcrun devicectl list devices 2>/dev/null | grep -F -- "$DEV" | grep -q 'available (paired)'; then
    PAIRED=true
    break
  fi
  echo "waiting for $DEV to be paired ($i)"; sleep 4
done
if [ "$PAIRED" != true ]; then echo "Device did not become available: $DEV" >&2; exit 1; fi
if [ "$KEEP" != "--keep" ]; then
  # A first install has nothing to uninstall; installation still proceeds.
  xcrun devicectl device uninstall app --device "$DEV" "$BUNDLE_ID" || true
fi
INSTALLED=false
for i in 1 2 3; do
  if xcrun devicectl device install app --device "$DEV" "$IPA"; then
    INSTALLED=true
    break
  fi
  sleep 5
done
if [ "$INSTALLED" != true ]; then echo "App installation failed." >&2; exit 1; fi
xcrun devicectl device info apps --device "$DEV" --bundle-id "$BUNDLE_ID"
exec xcrun devicectl device process launch --device "$DEV" "$BUNDLE_ID"
