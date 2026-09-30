// Compile the actual bridge status method against a tiny RevenueCat fixture.
const fs=require('fs'),os=require('os'),path=require('path'),{spawnSync}=require('child_process');
const src=fs.readFileSync(path.join(__dirname,'../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift'),'utf8');
const method=src.split('// ACCESS_STATUS_BEGIN')[1].split('// ACCESS_STATUS_END')[0];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'konvo-access-test-'));
const swift=`import Foundation
 enum Period {case trial,normal}
 struct Entitlement {var expirationDate:Date?;var periodType:Period}
 struct Entitlements {var active:[String:Entitlement]=[:];var all:[String:Entitlement]=[:]}
 struct CustomerInfo {var entitlements=Entitlements()}
 class Purchases {static let shared=Purchases();var info=CustomerInfo();var fails=false
 func customerInfo() async throws -> CustomerInfo {if fails {throw NSError(domain:"fixture",code:1)};return info}}
 enum Store {static let configureOnce=true
 ${method}
 }
 @main struct Main {static func main() async {
  let ended=Entitlement(expirationDate:Date(timeIntervalSinceNow:-10),periodType:.trial)
  let future=Entitlement(expirationDate:Date(timeIntervalSinceNow:3600),periodType:.trial)
  var r=await Store.accessStatus();assert(r["accessState"] as? String == "none")
  Purchases.shared.info.entitlements.all=["Pro":ended]
  r=await Store.accessStatus();assert(r["accessState"] as? String == "expired_trial" && r["entitled"] as? Bool == false)
  Purchases.shared.info.entitlements.all=["Pro":Entitlement(expirationDate:Date(timeIntervalSinceNow:-10),periodType:.normal)]
  r=await Store.accessStatus();assert(r["accessState"] as? String == "expired_subscription")
  // Active membership wins over date, covering billing grace and cancelled renewal.
  Purchases.shared.info.entitlements.active=["Pro":ended]
  r=await Store.accessStatus();assert(r["accessState"] as? String == "active" && r["entitled"] as? Bool == true)
  Purchases.shared.info.entitlements.active=["Pro":future]
  r=await Store.accessStatus();assert(r["accessState"] as? String == "active")
  Purchases.shared.fails=true
  r=await Store.accessStatus();assert(r["accessState"] as? String == "unknown" && r["entitled"] == nil)
  print("NATIVE ACCESS STATUS PASSED: active, grace, expired trial/subscription, no history, offline")
 }}
`;
const file=path.join(dir,'main.swift'),binary=path.join(dir,'test');fs.writeFileSync(file,swift);
let r=spawnSync('xcrun',['swiftc','-parse-as-library','-module-cache-path',path.join(dir,'cache'),file,'-o',binary],{encoding:'utf8'});
if(r.status!==0){process.stderr.write(r.stderr||String(r.error));process.exit(1)}
r=spawnSync(binary,[],{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);process.exitCode=r.status;
