const fs=require('fs'),assert=require('assert'),{JSDOM}=require('jsdom');
const {spawnSync}=require('child_process');
const HTML=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
const SCRIPTS=[...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const base=fs.readFileSync(__dirname+'/test_onboarding.js','utf8'),open=[];
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
const boot=new Function('JSDOM','HTML','SCRIPTS','IPHONE','open',base.slice(base.indexOf('function boot('),base.indexOf('const settle ='))+';return boot;')(JSDOM,HTML,SCRIPTS,IPHONE,open);
(async()=>{
 try {
  for(const variant of ['test','control']) {
   const d=boot({experiment:{variant,enrolled:true},onboardingPreview:true});
   await new Promise(r=>setTimeout(r,180));
   assert(!d.window.document.documentElement.classList.contains('holding'));
   assert(!d.window.document.documentElement.classList.contains('experiment-new'));
   assert(!d.events.includes('experiment_exposed'));
   assert.equal(d.window.__konvoExperiment.variant,'control');
   const values=[...d.window.document.querySelectorAll('#s3 .opt[data-m]')].map(e=>+e.dataset.m);
   assert.deepEqual(values,[360,270,210,150,90,45,150]);
  }
  const native=fs.readFileSync(__dirname+'/../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift','utf8');
  const property=native.slice(native.indexOf('    private static var experiment: [String: Any] {'),native.indexOf('    private static var experimentTest:')).replace('private ','');
  const select=native.slice(native.indexOf('    private static func selectedOffering()'),native.indexOf('    @MainActor private static func resolveExperiment')).replace('private ','');
  const dir=fs.mkdtempSync('/tmp/konvo-original-test-');
  try {
   fs.writeFileSync(dir+'/main.swift',`import Foundation
struct Offering { let identifier: String }
struct Offerings { let all = ["konvo_ab_control_v1":Offering(identifier:"original")]; let current = Offering(identifier:"wrong-default") }
struct Purchases { static let shared = Purchases(); func offerings() async throws -> Offerings { Offerings() } }
struct Subject {
static var onboardingPreview = true
static let experimentStorage = "unused-fixture"
${property}
static var experimentEnrolled: Bool { experiment["enrolled"] as? Bool == true }
${select}
}
@main struct Test {
 static func main() async throws {
  assert(Subject.experiment["variant"] as? String == "control")
  assert(Subject.experiment["enrolled"] as? Bool == false)
  let offering = try await Subject.selectedOffering()
  assert(offering?.identifier == "original", "Default/previous test offering cannot select the new paywall")
  print("ORIGINAL NATIVE POLICY PASSED")
 }
}`);
   for(const [cmd,args] of [['xcrun',['swiftc','-parse-as-library','-module-cache-path','/tmp/konvo-login-module-cache',dir+'/main.swift','-o',dir+'/test']],[dir+'/test',[]]]) {
    const r=spawnSync(cmd,args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr);process.stdout.write(r.stdout||'');
   }
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
  console.log('ORIGINAL ONLY PASSED: stale test replies, preview flags, ordering, native original offering');
 }finally{open.forEach(d=>d.window.close());}
})().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
