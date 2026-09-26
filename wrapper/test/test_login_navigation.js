// Compile the shipped native diagnostic handlers with an offline event sink.
// Exercise Objective-C dispatch to verify existing WebKit callbacks survive.
const fs = require('fs'), os = require('os'), path = require('path');
const {spawnSync} = require('child_process');
if (process.platform !== 'darwin') throw new Error('Native login diagnostics require macOS with Xcode');
const native = fs.readFileSync(path.join(__dirname, '../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift'), 'utf8');
const helpers = native.split('// LOGIN_DIAGNOSTICS_BEGIN')[1].split('\n').slice(1).join('\n').split('// LOGIN_DIAGNOSTICS_END')[0].replace(/private /g, '');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'konvo-login-native-'));
const source = `import Foundation
import WebKit
import ObjectiveC
class KonvoStore: NSObject {
    static var events: [(String, [String: Any])] = []
    static func track(_ name: String, _ props: [String: Any]) { events.append((name, props)) }
${helpers}
}
class BaseDelegate: NSObject, WKNavigationDelegate {
    var starts = 0, finishes = 0, provisional = 0, committed = 0
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { starts += 1 }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { finishes += 1 }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { provisional += 1 }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { committed += 1 }
}
class InheritedDelegate: BaseDelegate {}
class EmptyDelegate: NSObject, WKNavigationDelegate {}
let config = WKWebViewConfiguration()
config.websiteDataStore = .nonPersistent()
let webView = WKWebView(frame: .zero, configuration: config)
let delegate = InheritedDelegate()
webView.navigationDelegate = delegate
KonvoStore.installLoginNavigationDiagnostics(webView)
KonvoStore.installLoginNavigationDiagnostics(webView) // Must not wrap a second time.
assert(webView.navigationDelegate === delegate)
KonvoStore.loginDiagnosticWebView = webView
KonvoStore.loginDiagnosticActive = true
let dispatch: WKNavigationDelegate = delegate
let cancelled = NSError(domain: NSURLErrorDomain, code: NSURLErrorCancelled)
let failed = NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet, userInfo: [
    NSURLErrorFailingURLErrorKey: URL(string: "https://www.instagram.com/accounts/login/?username=private-value#private-value")!,
    NSLocalizedDescriptionKey: "private-value"
])
dispatch.webView?(webView, didStartProvisionalNavigation: nil)
dispatch.webView?(webView, didFinish: nil)
dispatch.webView?(webView, didFailProvisionalNavigation: nil, withError: cancelled)
dispatch.webView?(webView, didFail: nil, withError: failed)
assert(delegate.starts == 1 && delegate.finishes == 1 && delegate.provisional == 1 && delegate.committed == 1)
assert(KonvoStore.events.map { $0.0 } == ["login_navigation_started", "login_navigation_finished", "login_navigation_cancelled", "login_navigation_failed"])
assert(KonvoStore.events.last!.1["stage"] as? String == "login")
assert(KonvoStore.events.last!.1["error_domain"] as? String == "url")
assert(!String(describing: KonvoStore.events).contains("private-value"))
KonvoStore.events.removeAll()
let base: WKNavigationDelegate = BaseDelegate()
base.webView?(webView, didFinish: nil)
assert(KonvoStore.events.isEmpty, "Hooking a subclass must not mutate the superclass")
let otherWebView = WKWebView(frame: .zero, configuration: config)
dispatch.webView?(otherWebView, didFinish: nil)
assert(KonvoStore.events.isEmpty, "Only the active login webview is observed")
KonvoStore.loginDiagnosticActive = false
dispatch.webView?(webView, didFinish: nil)
assert(KonvoStore.events.isEmpty, "Ordinary authenticated navigation is not login diagnostics")
assert(delegate.finishes == 3, "Original callbacks still run when diagnostics are inactive")
let empty = EmptyDelegate()
otherWebView.navigationDelegate = empty
KonvoStore.installLoginNavigationDiagnostics(otherWebView)
KonvoStore.loginDiagnosticWebView = otherWebView
KonvoStore.loginDiagnosticActive = true
let emptyDispatch: WKNavigationDelegate = empty
emptyDispatch.webView?(otherWebView, didFailProvisionalNavigation: nil, withError: failed)
assert(KonvoStore.events.count == 1 && KonvoStore.events[0].0 == "login_navigation_failed", "Missing optional callbacks must be installed")
KonvoStore.events.removeAll()
KonvoStore.beginLoginNavigationDiagnostics(webView, url: URL(string: "https://www.instagram.com/direct/inbox/")!)
dispatch.webView?(webView, didStartProvisionalNavigation: nil)
assert(KonvoStore.events.isEmpty, "Ordinary inbox launch must not start a login diagnostic window")
KonvoStore.beginLoginNavigationDiagnostics(webView, url: URL(string: "https://www.instagram.com/direct/inbox/#konvo=15,distracted")!)
dispatch.webView?(webView, didStartProvisionalNavigation: nil)
assert(KonvoStore.events.map { $0.0 } == ["login_handoff_started", "login_navigation_started"])
assert(!String(describing: KonvoStore.events).contains("distracted"))
print("NATIVE LOGIN PASSED: callback preservation, idempotence, inherited methods, error/cancellation separation, privacy, active-view scoping")
`;
try {
  fs.writeFileSync(path.join(dir, 'main.swift'), source);
  for (const [cmd, args] of [
    ['xcrun', ['swiftc', '-module-cache-path', '/tmp/konvo-login-module-cache', path.join(dir, 'main.swift'), '-o', path.join(dir, 'test')]],
    [path.join(dir, 'test'), []]
  ]) {
    const result = spawnSync(cmd, args, {encoding: 'utf8', timeout: 60000});
    process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(cmd + ' failed: ' + (result.signal || result.status));
  }
} finally {fs.rmSync(dir, {recursive: true, force: true});}
