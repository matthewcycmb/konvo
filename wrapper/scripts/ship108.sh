#!/bin/sh
# ship108.sh (from ship.sh): store export of the verified archive, upload, poll VALID, beta
# review, External Friends. STOPS there: 86 is the App Review build for 1.5.0
# and must not be expired before Matthew pulls 1.5.0 from review; finish108.sh
# does the attach + expiries after his click.
set -e
SP=$(cd "$(dirname "$0")" && pwd)
W=/Users/matthewchan/Instamessages/wrapper
ARCHIVE=$W/src-tauri/gen/apple/build/instamessages-wrapper_iOS.xcarchive
OUT=$SP/store108
rm -rf "$OUT"; mkdir -p "$OUT"
echo "== export (app-store-connect) =="
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist "$SP/ExportOptions-appstore.plist" \
  -exportPath "$OUT" -allowProvisioningUpdates \
  -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_F9Z3VFTX73.p8" \
  -authenticationKeyID F9Z3VFTX73 -authenticationKeyIssuerID fadfc58a-8c12-4d69-8483-600d0aaec371 2>&1 | tail -3
IPA=$(ls "$OUT"/*.ipa | head -1)
echo "== verify store IPA =="
python3 "$SP/verify-ipa.py" 0 "$IPA" | tail -2
echo "== upload =="
xcrun altool --upload-app -t ios -f "$IPA" --apiKey F9Z3VFTX73 --apiIssuer fadfc58a-8c12-4d69-8483-600d0aaec371 2>&1 | tail -3
echo "== poll VALID =="
for i in $(seq 1 40); do
  R=$("$SP/asc.sh" GET "builds?filter[app]=6794756261&filter[version]=108&fields[builds]=processingState,version,uploadedDate&limit=3")
  STATE=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['attributes']['processingState'] if d else 'NONE')")
  BID=$(echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id'] if d else '')")
  echo "$(date +%H:%M:%S) build 108: $STATE $BID"
  [ "$STATE" = "VALID" ] && break
  [ "$STATE" = "INVALID" ] && exit 1
  sleep 30
done
echo "$BID" > "$SP/build108.id"
echo "== beta review =="
"$SP/asc.sh" POST betaAppReviewSubmissions "{\"data\":{\"type\":\"betaAppReviewSubmissions\",\"relationships\":{\"build\":{\"data\":{\"type\":\"builds\",\"id\":\"$BID\"}}}}}" | head -c 300; echo
echo "== External Friends =="
for i in $(seq 1 30); do
  R=$("$SP/asc.sh" POST betaGroups/1673c812-ba61-4c14-a8e4-0e61673c470a/relationships/builds "{\"data\":[{\"type\":\"builds\",\"id\":\"$BID\"}]}")
  if [ -z "$R" ] || ! echo "$R" | grep -q '"errors"'; then echo "attached"; break; fi
  echo "$(date +%H:%M:%S) attach retry: $(echo "$R" | head -c 120)"; sleep 60
done
echo "DONE: build 108 = $BID (86 untouched; run finish108.sh after Matthew pulls 1.5.0 from review)"
