// Compile the shipped checkout recorder/outbox with offline sinks. No purchases
// or production PostHog events are sent by this test.
const fs=require('fs'), os=require('os'), path=require('path'), {spawnSync}=require('child_process');
const native=fs.readFileSync(path.join(__dirname,'../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift'),'utf8');
const block=name=>native.split('// '+name+'_BEGIN')[1].split('// '+name+'_END')[0];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'konvo-checkout-native-'));
const purchaseCase=native.slice(native.indexOf('        case "purchase":'),native.indexOf('        case "restore":'));
const branch=`import Foundation
${block('CHECKOUT_ATTEMPT')}
enum RevenueCat {enum ErrorCode: Error {case purchaseCancelledError, paymentPendingError}}
struct Product {let productIdentifier="konvo.pro.yearly";let price=Decimal(string:"34.99")!;let currencyCode:String?="CAD";let localizedPriceString="CA$34.99"}
struct Package {let identifier="$rc_annual";let storeProduct=Product()}
struct Offering {let identifier="default";let availablePackages=[Package()];var annual:Package?{availablePackages.first}}
struct Entitlement {let productIdentifier="konvo.pro.yearly";let isSandbox=true}
struct Entitlements {var active:[String:Entitlement]=["Pro":Entitlement()]}
struct CustomerInfo {var entitlements=Entitlements()}
struct Result {var userCancelled=false;var customerInfo=CustomerInfo()}
class Purchases {
 static let shared=Purchases(); var failure:Error?, result=Result(), calls=0
 var pause=false, pending:CheckedContinuation<Void,Never>?
 func purchase(package:Package) async throws -> Result {
  calls += 1
  if pause {await withCheckedContinuation{pending=$0}}
  if let failure {throw failure}; return result
 }
}
class KonvoActivationAnalytics {static let shared=KonvoActivationAnalytics();func record(_ e:String,_ p:[String:Any]){}}
class Store {
 static var events:[(String,[String:Any])]=[], offering:Offering?=Offering(), catalogError=false
 static var purchaseInFlight=false, experimentTest=false, specialOfferEligible=false, onboardingPreview=false
 static let specialProductIdentifier="konvo.pro.yearly.special",specialOfferingIdentifier="special"
 static func track(_ e:String,_ p:[String:Any]){events.append((e,p))}
 static func selectedOffering() async throws -> Offering? {if catalogError{throw NSError(domain:"fixture",code:42)};return offering}
 static func specialOfferPackage(regular:Package) async throws -> Package? {nil}
 static func validPersonalizedPackage(_ p:Package)->Bool {true}
 @MainActor static func run(_ cmd:String,_ productId:String,checkout:[String:Any]?=nil) async -> [String:Any] {
 switch cmd {
 ${purchaseCase}
 default:return [:]
 }
 }
}
@main struct Main {
 @MainActor static func main() async {
  let context:[String:Any]=["checkout_attempt_id":"native-case-1","screen_id":"s13_paywall"]
  func run(_ id:String="konvo.pro.yearly") async -> [String:Any] {Store.events=[];return await Store.run("purchase",id,checkout:context)}
  _ = await run()
  assert(Store.events.map{$0.0} == ["checkout_received","checkout_store_requested","checkout_result"])
  assert(Store.events.last!.1["result"] as? String == "purchased")
  assert(Store.events.last!.1["price_amount"] as? NSDecimalNumber == NSDecimalNumber(string:"34.99"))
  Purchases.shared.result.userCancelled=true;_ = await run();assert(Store.events.last!.1["result"] as? String == "cancelled")
  Purchases.shared.result.userCancelled=false
  for (error,outcome) in [(RevenueCat.ErrorCode.purchaseCancelledError,"cancelled"),(.paymentPendingError,"pending")] {
   Purchases.shared.failure=error;_ = await run();assert(Store.events.last!.1["result"] as? String == outcome)
  }
  Purchases.shared.failure=NSError(domain:"fixture",code:33,userInfo:[NSLocalizedDescriptionKey:"private-secret"])
  _ = await run();assert(Store.events.last!.1["failure_stage"] as? String == "store_purchase")
  assert(!String(describing:Store.events).contains("private-secret"));Purchases.shared.failure=nil
  Store.offering=nil;_ = await run();assert(Store.events.map{$0.0} == ["checkout_received","checkout_result"])
  assert(Store.events.last!.1["failure_stage"] as? String == "offering_unavailable")
  Store.offering=Offering();_ = await run("missing");assert(Store.events.last!.1["failure_stage"] as? String == "product_unavailable")
  Store.catalogError=true;_ = await run();assert(Store.events.last!.1["failure_stage"] as? String == "catalog_lookup");Store.catalogError=false
  // Real switch branch remains locked across the suspended SDK call.
  Purchases.shared.pause=true
  let first=Task{@MainActor in await run()}
  while Purchases.shared.pending == nil {await Task.yield()}
  let calls=Purchases.shared.calls
  let duplicate=await Store.run("purchase","konvo.pro.yearly",checkout:["checkout_attempt_id":"native-case-2"])
  assert(duplicate["ok"] as? Bool == false && Purchases.shared.calls == calls)
  Purchases.shared.pending?.resume();_ = await first.value
  assert(!Store.purchaseInFlight)
  print("NATIVE PURCHASE BRANCH PASSED: exact shipped switch, catalog errors, actual package metadata, cancellation/approval/success, concurrent request guard")
 }
}
`;
const swift=`import Foundation
${block('CHECKOUT_ATTEMPT')}
${block('CHECKOUT_OUTBOX')}
var events: [(String,[String:Any])] = []
let attempt = KonvoCheckoutAttempt(productId:"konvo.pro.yearly", context:[
    "checkout_attempt_id":"fixture-123", "screen_id":"s13_paywall", "placement":"onboarding",
    "plan":"annual", "displayed_price":"CA$34.99", "currency":"CAD", "trial_days":7,
    "trial_eligible":true, "password":"private-secret", "url":"private-secret"
]) { events.append(($0,$1)) }
attempt.storeRequested(catalog:["product_id":"konvo.pro.yearly", "offering_id":"default",
    "price_amount":34.99, "currency":"CAD", "localized_price":"CA$34.99", "password":"private-secret"])
_ = attempt.finish(["ok":false,"cancelled":true,"error":"private-secret"])
_ = attempt.finish(["ok":true,"entitled":true])
assert(events.map{$0.0} == ["checkout_received","checkout_store_requested","checkout_result"])
assert(events.allSatisfy{$0.1["checkout_attempt_id"] as? String == "fixture-123"})
assert(events.last!.1["result"] as? String == "cancelled")
assert(events.last!.1["currency"] as? String == "CAD")
assert(events.last!.1["displayed_trial_eligible"] as? Bool == true)
assert(!String(describing:events).contains("private-secret"))
for (reply,outcome) in [(["ok":true,"entitled":true],"purchased"),(["ok":false,"pending":true],"pending"),(["ok":true],"not_entitled"),(["ok":false],"error")] {
    let a = KonvoCheckoutAttempt(productId:"konvo.pro.monthly",context:nil) { events.append(($0,$1)) }
    _ = a.finish(reply,reason:outcome == "error" ? "offering_unavailable" : nil)
    assert(events.last!.1["result"] as? String == outcome)
    assert(events.last!.1["store_requested"] as? Bool == false)
}
// The outbox's scheduler and transport are injectable; transient responses and
// process relaunch are exercised without internet or wall-clock retry delays.
final class Sink {
    let lock=NSLock()
    var data:Data?, calls:[Data]=[], callbacks:[(Int?)->Void]=[], retries:[()->Void]=[]
    func sync<T>(_ f:()->T)->T {lock.lock();defer{lock.unlock()};return f()}
    func make()->KonvoCheckoutOutbox {
        KonvoCheckoutOutbox(load:{self.sync{self.data}},save:{d in self.sync{self.data=d}},
            send:{d,done in self.sync{self.calls.append(d);self.callbacks.append(done)}},
            schedule:{_,work in self.sync{self.retries.append(work)}})
    }
    func reply(_ status:Int?) {let f=sync{callbacks.removeFirst()};f(status)}
    func retry() {let f=sync{retries.removeFirst()};f()}
    var pending:Int {sync{data.flatMap{try? JSONDecoder().decode([Data].self,from:$0)}?.count ?? 0}}
}
func until(_ condition:()->Bool) {for _ in 0..<500 {if condition(){return};Thread.sleep(forTimeInterval:0.01)};fatalError("timed out")}
let sink=Sink(), first=Data("{uuid:one,timestamp:original}".utf8), second=Data("{uuid:two}".utf8)
let outbox=sink.make();outbox.enqueue(first);outbox.enqueue(second)
until{sink.pending == 2 && sink.sync{sink.calls.count} == 1}
sink.reply(nil);until{sink.sync{sink.retries.count} == 1}
assert(sink.pending == 2)
sink.retry();until{sink.sync{sink.calls.count} == 2}
assert(sink.sync{sink.calls[0] == sink.calls[1]},"retry keeps timestamp, identity and UUID")
sink.reply(200);until{sink.sync{sink.calls.count} == 3}
assert(sink.pending == 1)
sink.reply(429);until{sink.sync{sink.retries.count} == 1}
// Relaunch reads the persisted event; success empties it.
let relaunched=sink.make();relaunched.flush();until{sink.sync{sink.calls.count} == 4}
assert(sink.sync{sink.calls.last} == second)
sink.reply(200);until{sink.pending == 0}
let other=Sink(), next=other.make();next.enqueue(first);next.enqueue(second)
until{other.pending == 2 && other.sync{other.calls.count} == 1}
other.reply(400);until{other.sync{other.calls.count} == 2}
assert(other.pending == 1,"a permanent invalid event does not block later events")
other.reply(503);until{other.sync{other.retries.count} == 1};other.retry()
until{other.sync{other.calls.count} == 3};other.reply(204);until{other.pending == 0}
print("NATIVE CHECKOUT PASSED: correlation, native outcomes, privacy, deduplication, offline persistence, retry identity, 429/503 recovery, relaunch, poison-event isolation")
`;
try {
 fs.writeFileSync(path.join(dir,'main.swift'),swift);
 for(const [cmd,args] of [['xcrun',['swiftc','-module-cache-path','/tmp/konvo-checkout-module-cache',path.join(dir,'main.swift'),'-o',path.join(dir,'test')]],[path.join(dir,'test'),[]]]){
   const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
   if(r.error)throw r.error;if(r.status!==0)throw Error(cmd+' failed: '+(r.signal||r.status));
 }
 fs.writeFileSync(path.join(dir,'branch.swift'),branch);
 for(const [cmd,args] of [['xcrun',['swiftc','-parse-as-library','-module-cache-path','/tmp/konvo-checkout-module-cache',path.join(dir,'branch.swift'),'-o',path.join(dir,'branch')]],[path.join(dir,'branch'),[]]]){
   const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
   if(r.error)throw r.error;if(r.status!==0)throw Error(cmd+' failed: '+(r.signal||r.status));
 }
} finally {fs.rmSync(dir,{recursive:true,force:true});}
