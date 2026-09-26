// Compile and execute the actual Swift response guard used by resolveExperiment.
// A v2 response must reach offering validation for both arms. No live events,
// RevenueCat calls, or assignment persistence are performed by this harness.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const source = fs.readFileSync(path.join(__dirname,
  '../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift'), 'utf8');
const start = source.indexOf('guard (response as? HTTPURLResponse)?.statusCode == 200,');
const end = source.indexOf('// Both offerings must work before either arm enrolls', start);
assert(start >= 0 && end > start, 'Find the real native flag-response validation');
const guard = source.slice(start, end);
const key = 'konvo-onboarding-annual-v1';
const response = (variant, extra = {}) => ({
  errorsWhileComputingFlags: false,
  flags: { [key]: { key, enabled: true, variant, ...extra } },
});
const cases = [
  { name: 'v2 control', body: response('control'), expected: 'control' },
  { name: 'v2 test', body: response('test'), expected: 'test' },
  { name: 'disabled flag', body: response('test', { enabled: false }) },
  { name: 'missing enabled', body: response('test', { enabled: null }) },
  { name: 'unknown arm', body: response('third-arm') },
  { name: 'boolean flag', body: response(true) },
  { name: 'missing variant', body: response(null) },
  { name: 'missing flag', body: { flags: {} } },
  { name: 'evaluation error', body: { ...response('test'), errorsWhileComputingFlags: true } },
  { name: 'quota limited', body: { flags: {}, quotaLimited: ['feature_flags'] } },
  { name: 'HTTP error', body: response('test'), status: 503 },
  { name: 'legacy response on v2 endpoint', body: { featureFlags: { [key]: 'test' } } },
];
if (process.argv[2]) {
  const body = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  assert(['control', 'test'].includes(body.flags?.[key]?.variant));
  cases.push({ name: 'captured live v2 response', body, expected: body.flags[key].variant });
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'konvo-experiment-flags-'));
try {
  fs.writeFileSync(path.join(dir, 'cases.json'), JSON.stringify(cases));
  fs.writeFileSync(path.join(dir, 'main.swift'), `
import Foundation
let experimentKey = "${key}"
var diagnostics: [String] = []
func track(_ event: String, _ props: [String: Any]) { diagnostics.append(event) }
func resolve(_ body: [String: Any], _ status: Int) throws -> [String: Any] {
    let value: [String: Any] = ["variant": "control", "enrolled": false]
    let data = try JSONSerialization.data(withJSONObject: body)
    let response: URLResponse = HTTPURLResponse(url: URL(string: "https://example.invalid/flags/?v=2")!,
        statusCode: status, httpVersion: nil, headerFields: nil)!
    ${guard}
    return ["variant": variant, "enrolled": true]
}
let cases = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))) as! [[String: Any]]
for item in cases {
    diagnostics.removeAll()
    let result = try resolve(item["body"] as! [String: Any], item["status"] as? Int ?? 200)
    let expected = item["expected"] as? String
    let enrolled = result["enrolled"] as? Bool == true
    guard enrolled == (expected != nil), result["variant"] as? String == (expected ?? "control") else {
        print("FAIL: \\(item["name"]!): expected \\(expected ?? "unenrolled fallback"), got \\(result)")
        exit(1)
    }
    guard enrolled ? diagnostics.isEmpty : diagnostics == ["experiment_ineligible"] else {
        print("FAIL: \\(item["name"]!): rejected responses must emit an enrollment diagnostic")
        exit(1)
    }
    // Accepted flags proceed to the production offering checks, rejected flags stay OG.
    print("PASS: \\(item["name"]!)")
}
`);
  const result = spawnSync('xcrun', ['swift', '-module-cache-path',
    path.join(os.tmpdir(), 'konvo-swift-test-module-cache'),
    path.join(dir, 'main.swift'), path.join(dir, 'cases.json')], { encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'Native PostHog v2 enrollment regression');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
