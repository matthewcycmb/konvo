// The bridge contract. This table is the protocol's home: every command
// the page may post to KonvoStore, what rides in the universal productId
// slot, and the reply keys the page may read. The checks below fail the
// moment the cage script, the onboarding page, the native store, or the
// suite's own mocks disagree with the table - which turns "renamed a
// command" or "changed a reply key" from a dead button on a tester's
// phone into a red test on this machine. The pass sheet shipped dead in
// exactly that gap once (Aug 17); this file is the door closing.
//
// productId is the bridge's single argument slot; `arg` documents what
// each command actually carries in it. Replies arrive through
// window.__konvoStoreReply(id, {...}); `replies` lists every key a
// handler may answer with. Fire-and-forget commands reply with nothing.
const TABLE = {
  track:         { arg: 'unused (event and props ride the message body)', replies: [] },
  route:         { arg: 'route name, plus the "-settled" suffix variant', replies: [] },
  nav:           { arg: 'swipe direction for the native transition', replies: [] },
  bg:            { arg: 'CSS color for the native letterbox', replies: [] },
  haptic:        { arg: 'haptic kind', replies: [] },
  open:          { arg: 'external URL for the system browser', replies: [] },
  appearance:    { arg: '"light" | "dark" | "blue" | "black" (sign-in sheet band, Sep 1) | "auto"', replies: [] },
  go:            { arg: 'in-app URL navigated natively (universal-link trap)', replies: [] },
  review:        { arg: 'unused (the system rating sheet; iOS decides if it shows)', replies: [] },
  feedback:      { arg: 'unused (the UserJot board as a native sheet)', replies: ['ok'] },
  cookieSave:    { arg: 'unused', replies: ['ok', 'n'] },
  cookieRestore: { arg: 'unused', replies: ['restored', 'n'] },
  cageStatus:    { arg: 'unused', replies: ['supported', 'authorized', 'picked',
                                            'active', 'passAvailable', 'passMins',
                                            'passesLeft'] },
  cagePass:      { arg: 'unused', replies: ['granted', 'why'] },
  cageAuthorize: { arg: 'unused', replies: ['authorized'] },
  cagePick:      { arg: 'unused', replies: ['count'] },
  cageOn:        { arg: 'unused', replies: ['active'] },
  cageOff:       { arg: 'unused', replies: ['active'] },
  entitlements:  { arg: 'unused', replies: ['entitled'] },
  products:      { arg: 'unused', replies: ['ok', 'error', 'yearly', 'monthly',
                                            'lifetime'] },
  purchase:      { arg: 'product identifier', replies: ['ok', 'error', 'entitled',
                                                        'cancelled', 'pending'] },
  restore:       { arg: 'unused', replies: ['ok', 'entitled'] },
  paywall:       { arg: 'placement name', replies: ['ok', 'entitled'] },
  rcPaywall:     { arg: 'unused (RevenueCat paywall on the current offering, Sep 1)',
                   replies: ['ok', 'result', 'entitled', 'productId'] },
  notify:        { arg: 'trial length in days (schedules the reminder); empty = permission only',
                   replies: ['ok', 'granted'] },
  invite:        { arg: 'JSON {handle, text, url, draft}: the share sheet (Sep 1); nothing granted for sending (Sep 2)',
                   replies: ['ok', 'sent', 'expires'] },
  claim:         { arg: '"auto" (the claim sheet only if the clipboard holds a link the sheet has not seen) | "ask" (always) | "own" (the copy row: this clipboard content is ours, never ask)',
                   replies: ['ok', 'shown', 'entitled', 'expires', 'method'] },
};

const fs = require('fs');
const assert = require('assert');

const CAGE = fs.readFileSync(__dirname + '/../src-tauri/src/cage.js', 'utf8');
const DIST = fs.readFileSync(__dirname + '/../dist/index.html', 'utf8');
const SWIFT = fs.readFileSync(__dirname +
  '/../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift', 'utf8');
const MOCKS = fs.readFileSync(__dirname + '/test_cage.js', 'utf8');

const tabled = new Set(Object.keys(TABLE));

// 1. Every command the page sends is in the table, and vice versa.
const sent = new Set([...(CAGE + DIST).matchAll(
  /cmd: ?"([a-zA-Z]+)"|storekit\("([a-zA-Z]+)"/g)]
  .map(m => m[1] || m[2]));
assert.deepStrictEqual([...sent].sort(), [...tabled].sort(),
  'the commands the page sends must equal the table exactly');

// 2. Every command the native store handles is in the table, and vice
//    versa. Handlers live in two dispatch sites (the webView-needing
//    if-chain and the run() switch); both spellings are matched.
const handled = new Set([...SWIFT.matchAll(
  /case "([a-zA-Z]+)":|cmd == "([a-zA-Z]+)"/g)]
  .map(m => m[1] || m[2]));
assert.deepStrictEqual([...handled].sort(), [...tabled].sort(),
  'the commands the native store handles must equal the table exactly');

// 2b. track() must configure RevenueCat before it reads Purchases.shared
//     (its distinct_id): build 88 tracked from didFinishLaunching and
//     RevenueCat's fatalError killed the app on every open (Sep 1).
assert(/static func track\(_ event: String, _ props: \[String: Any\]\) \{[^}]*?_ = configureOnce[^}]*?Purchases\.shared\.appUserID/s.test(SWIFT),
  'track() must run configureOnce before touching Purchases.shared');

// 3. Every reply key the table promises exists somewhere in the store's
//    source as a quoted key, so a Swift-side rename cannot hide.
for (const [cmd, spec] of Object.entries(TABLE)) {
  for (const key of spec.replies) {
    assert(SWIFT.includes(`"${key}"`),
      `reply key "${key}" (${cmd}) must exist in the native store`);
  }
}

// 4. The suite's bridge mocks may only fabricate reply keys the table
//    allows for that command - the mock is a stand-in, never a fiction.
for (const m of MOCKS.matchAll(/(?:^|[{,]\s*)([a-zA-Z]+): \{ ([^{}]*) \}/gm)) {
  const cmd = m[1];
  if (!tabled.has(cmd) || !TABLE[cmd].replies.length) continue;
  for (const k of m[2].matchAll(/([a-zA-Z]+):/g)) {
    assert(TABLE[cmd].replies.includes(k[1]),
      `mock for "${cmd}" fabricates reply key "${k[1]}" the table does not allow`);
  }
}

console.log('BRIDGE CONTRACT HOLDS');
