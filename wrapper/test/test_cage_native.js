// Run the shipped migration/apply/clear and extension callback code with an
// isolated preferences suite and a fake OS store. Never change macOS Screen Time.
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
const {spawnSync}=require('child_process');
const native=fs.readFileSync(path.join(__dirname,'../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift'),'utf8');
let helpers=native.slice(native.indexOf('    @available(iOS 16.0, *)\n    private static var cageStore'),native.indexOf('    private static func dayStamp()'));
helpers=helpers.replace(/private /g,'').replace(/UserDefaults\.standard/g,'testDefaults');
const monitor=fs.readFileSync(path.join(__dirname,'../src-tauri/gen/apple/ActivityMonitor/KonvoActivityMonitor.swift'),'utf8').replace(/^import .*\n/gm,'').replace(/private /g,'');
const policy=fs.readFileSync(path.join(__dirname,'../src-tauri/gen/apple/Shared/PassPolicy.swift'),'utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'konvo-cage-native-'));
const source=`import Foundation
${policy}
let suite = "konvo-regression-" + UUID().uuidString
let testDefaults = UserDefaults(suiteName: suite)!
defer { testDefaults.removePersistentDomain(forName: suite) }
struct FamilyActivitySelection: Codable { var applicationTokens:Set<Int>; var categoryTokens:Set<Int>; var webDomainTokens:Set<Int> }
class Shield { var applications:Set<Int>?; var applicationCategories:Set<Int>?; var webDomains:Set<Int>?; var webDomainCategories:Set<Int>? }
class ManagedSettingsStore {
 struct Name { let value:String; init(_ value:String) { self.value=value } }
 static let sharedShield=Shield()
 var shield:Shield { Self.sharedShield }
 init(named:Name) {}
 func clearAllSettings(){shield.applications=nil;shield.applicationCategories=nil;shield.webDomains=nil;shield.webDomainCategories=nil}
}
struct DeviceActivityName { let rawValue:String; init(_ value:String){rawValue=value} }
struct DeviceActivityEvent { struct Name{} }
class DeviceActivityMonitor {
 func intervalDidStart(for activity:DeviceActivityName){}
 func intervalWillEndWarning(for activity:DeviceActivityName){}
 func eventDidReachThreshold(_ event:DeviceActivityEvent.Name, activity:DeviceActivityName){}
 func intervalDidEnd(for activity:DeviceActivityName){}
}
struct DeviceActivityCenter {
 static var stopped:[String]=[]
 func stopMonitoring(_ names:[DeviceActivityName]) {
  assert(testDefaults.string(forKey:KonvoShared.keyPassName)=="disabled", "Invalidate callbacks before asking OS to stop")
  Self.stopped=names.map{$0.rawValue}
 }
}
enum KonvoShared {
 static var groupDefaults:UserDefaults? {testDefaults}
 static let keySelection="selection",keyPassName="passName",keyPassActive="passActive",cageStoreName="test-store"
 static var events:[String]=[]
 static func capture(_ event:String,_ props:[String:Any]){events.append(event)}
}
enum Subject {
 static let cageSelectionKey=KonvoShared.keySelection,cageActiveKey="active"
 static var cageDefaults:UserDefaults {testDefaults}
 ${helpers}
}
${monitor}
func seed(_ apps:Set<Int>,_ categories:Set<Int>,_ domains:Set<Int>) {
 let selection=FamilyActivitySelection(applicationTokens:apps,categoryTokens:categories,webDomainTokens:domains)
 testDefaults.set(try! JSONEncoder().encode(selection),forKey:KonvoShared.keySelection)
}
let store=ManagedSettingsStore(named:.init("test-store"))
seed([1],[2],[3]);store.shield.applicationCategories=[2];store.shield.webDomains=[3];store.shield.applications=[1]
Subject.migrateCageSelection()
assert(Subject.storedCageSelection()==nil,"Unsafe saved selections must require a new explicit app pick")
assert(store.shield.applications==nil && store.shield.applicationCategories==nil && store.shield.webDomains==nil)
assert(!Subject.cageApply(),"Missing selection cannot activate a shield")
store.shield.applications=[1];Subject.migrateCageSelection();assert(store.shield.applications==nil,"Missing or corrupt selection cannot leave an orphaned shield")
seed([1],[],[]);assert(Subject.cageApply());assert(store.shield.applications==[1])
assert(store.shield.applicationCategories==nil && store.shield.webDomains==nil && store.shield.webDomainCategories==nil)
assert(testDefaults.bool(forKey:Subject.cageActiveKey))
Subject.migrateCageSelection();assert(store.shield.applications==[1],"Valid existing app restriction is preserved")
let monitor=KonvoActivityMonitor()
testDefaults.set("konvoPass1",forKey:KonvoShared.keyPassName);testDefaults.set(true,forKey:KonvoShared.keyPassActive)
store.clearAllSettings();monitor.intervalWillEndWarning(for:.init("konvoPass1"));assert(store.shield.applications==[1],"Valid pass relocks the explicit app")
Subject.cageClear();monitor.intervalWillEndWarning(for:.init("konvoPass1"));assert(store.shield.applications==nil,"Late callback cannot re-enable a disabled restriction")
assert(!testDefaults.bool(forKey:Subject.cageActiveKey));assert(DeviceActivityCenter.stopped==PassPolicy.allActivityNames)
for selection in [FamilyActivitySelection(applicationTokens:[1],categoryTokens:[2],webDomainTokens:[]),FamilyActivitySelection(applicationTokens:[1],categoryTokens:[],webDomainTokens:[3]),FamilyActivitySelection(applicationTokens:[1,2],categoryTokens:[],webDomainTokens:[])] {
 testDefaults.set(try! JSONEncoder().encode(selection),forKey:KonvoShared.keySelection)
 assert(!Subject.cageApply(),"Broad selections must never apply")
 testDefaults.set("konvoPass2",forKey:KonvoShared.keyPassName);testDefaults.set(true,forKey:KonvoShared.keyPassActive)
 monitor.intervalWillEndWarning(for:.init("konvoPass2"));assert(store.shield.applications==nil && store.shield.applicationCategories==nil && store.shield.webDomains==nil,"Extension must reject the same unsafe selection")
}
print("NATIVE CAGE PASSED: migration, valid app-only apply, broad selection rejection, normal relock and stale callback after disable")
`;
try {
 fs.writeFileSync(path.join(dir,'main.swift'),source);
 for(const [cmd,args] of [['xcrun',['swiftc','-module-cache-path','/tmp/konvo-login-module-cache',path.join(dir,'main.swift'),'-o',path.join(dir,'test')]],[path.join(dir,'test'),[]]]){
  const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stderr);process.stdout.write(r.stdout||'');
 }
} finally {fs.rmSync(dir,{recursive:true,force:true})}
