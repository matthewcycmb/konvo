// Run the shipped UIKit transition and navigation dispatch in an iOS simulator.
// Uses a synthetic local WKWebView, never an Instagram account or conversation.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {execFileSync}=require('child_process');
const sim=process.env.KONVO_TEST_SIMULATOR;
if(!sim)throw Error('Set KONVO_TEST_SIMULATOR to a booted iOS simulator UDID');
const native=fs.readFileSync(process.env.KONVO_NATIVE_SOURCE || path.join(__dirname,'../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift'),'utf8');
const preparation=native.split('// CHAT_PREPARATION_BEGIN')[1]?.split('// CHAT_PREPARATION_END')[0] || '';
const animation=native.slice(native.indexOf('    fileprivate static func pushIntoThread('),native.indexOf('    private final class KonvoGestures:'));
const dispatch=native.slice(native.indexOf('        if cmd == "nav" {'),native.indexOf('        // The native app\'s little tap when a message sends.',native.indexOf('        if cmd == "nav" {')));
const dir=fs.mkdtempSync('/tmp/konvo-chat-transition-'),app=path.join(dir,'KonvoTransitionProbe.app');fs.mkdirSync(app);
const id='com.matthewchan.konvo.transition-probe';
const source=`import UIKit
import WebKit
class KonvoStore {
 static var route="thread",swiping=false
 static var swipeSettleUntil=Date.distantPast
 static var snapStack:[UIView]=[]
 static var settledSnap:UIView?
 static var tapSnapAt=Date.distantPast
 static var firstNavDone=false
 ${preparation}
 ${animation}
 static func nav(_ productId:String,_ webView:WKWebView) {
  let cmd="nav"
  ${dispatch}
 }
}
class Probe:UIViewController,WKNavigationDelegate {
 let web=WKWebView(frame:.zero)
 var samples:[String:Double]=[:]
 var phase=0
 override func viewDidLoad(){
  super.viewDidLoad();view.backgroundColor = .black
  web.frame=CGRect(x:0,y:60,width:view.bounds.width,height:view.bounds.height-100)
  web.navigationDelegate=self;view.addSubview(web)
  web.loadHTMLString("<meta name='viewport' content='width=device-width'><body style='background:#101318;color:white;font:30px system-ui'>Messages<div style='margin-top:90px'>Synthetic conversation</div></body>",baseURL:nil)
 }
 func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){
  guard phase==0 else{return};phase=1
  DispatchQueue.main.asyncAfter(deadline:.now()+0.25){self.run()}
 }
 func screenshot(_ name:String){
  let renderer=UIGraphicsImageRenderer(bounds:view.bounds)
  let image=renderer.image{ _ in view.drawHierarchy(in:view.bounds,afterScreenUpdates:false) }
  let url=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent(name+".png")
  try! image.pngData()!.write(to:url)
 }
 func position()->Double{Double(web.layer.presentation()?.transform.m41 ?? 0)}
 func later(_ seconds:Double,_ work:@escaping()->Void){DispatchQueue.main.asyncAfter(deadline:.now()+seconds,execute:work)}
 func run(){
  KonvoStore.settledSnap=web.snapshotView(afterScreenUpdates:false)
  KonvoStore.tapSnapAt=Date()
  let original=web.frame
  // Reproduce Instagram clearing the old DOM before its chat is usable.
  KonvoStore.prepareChat(web)
  let outgoing = KonvoStore.preparedChat
  web.evaluateJavaScript("document.body.innerHTML='<main>Partial loading frame</main>';document.body.style.background='#ffffff'",completionHandler:nil)
  later(0.15){
   self.samples["outgoingHeld"] = (outgoing != nil && outgoing?.superview === self.view && self.view.subviews.last === outgoing) ? 1:0
   self.samples["heldX"] = self.position()
   self.screenshot("held")
  }
  later(0.35){
   self.web.evaluateJavaScript("document.body.innerHTML='<main>Ready conversation<div role=textbox></div></main>';document.body.style.background='#101318'",completionHandler:nil)
   self.later(0.04){self.slide(original)}
  }
 }
 func slide(_ original:CGRect){
  KonvoStore.nav("push",web)
  later(0.08){self.samples["x80"]=self.position()}
  later(0.18){self.samples["x180"]=self.position()}
  later(0.30){self.samples["x300"]=self.position()}
  later(0.55){
   self.samples["x550"]=self.position()
   self.screenshot("settled")
   self.samples["stackAfterPush"]=Double(KonvoStore.snapStack.count)
   self.samples["framePreserved"]=self.web.frame==original ? 1:0
   self.samples["transientViewsRemoved"]=self.view.subviews.count==1 ? 1:0
   // The back gesture owns its own animation; its echoed navigation must
   // not start a second slide or add another snapshot.
   KonvoStore.swipeSettleUntil=Date().addingTimeInterval(1)
   KonvoStore.nav("push",self.web)
   self.later(0.08){
    self.samples["echoX"]=self.position()
    self.samples["stackAfterEcho"]=Double(KonvoStore.snapStack.count)
    // Bottom tabs intentionally remain a direct navigation.
    KonvoStore.nav("push-silent",self.web)
    self.later(0.08){
     self.samples["tabX"]=self.position()
     let url=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("result.json")
     try! JSONSerialization.data(withJSONObject:self.samples,options:.prettyPrinted).write(to:url)
    }
   }
  }
 }
}
@main class AppDelegate:UIResponder,UIApplicationDelegate {
 var window:UIWindow?
 func application(_ application:UIApplication,didFinishLaunchingWithOptions launchOptions:[UIApplication.LaunchOptionsKey:Any]?)->Bool{
  window=UIWindow(frame:UIScreen.main.bounds);window!.rootViewController=Probe();window!.makeKeyAndVisible();return true
 }
}
`;
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',timeout:90000});
(async()=>{
 try{
  fs.writeFileSync(path.join(dir,'main.swift'),source);
  const sdk=run('xcrun',['--sdk','iphonesimulator','--show-sdk-path']).trim();
  run('xcrun',['swiftc','-parse-as-library','-sdk',sdk,'-target','arm64-apple-ios15.0-simulator','-module-cache-path','/tmp/konvo-transition-module-cache',path.join(dir,'main.swift'),'-o',path.join(app,'KonvoTransitionProbe')]);
  fs.writeFileSync(path.join(app,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>KonvoTransitionProbe</string><key>CFBundleIdentifier</key><string>${id}</string><key>CFBundleName</key><string>Transition Probe</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>MinimumOSVersion</key><string>15.0</string><key>LSRequiresIPhoneOS</key><true/><key>UIDeviceFamily</key><array><integer>1</integer></array><key>UILaunchScreen</key><dict/></dict></plist>`);
  run('codesign',['--force','--sign','-',app]);run('xcrun',['simctl','install',sim,app]);
  const container=run('xcrun',['simctl','get_app_container',sim,id,'data']).trim(),result=path.join(container,'Documents/result.json');
  if(fs.existsSync(result))fs.unlinkSync(result);
  run('xcrun',['simctl','launch','--terminate-running-process',sim,id]);
  for(let i=0;i<600&&!fs.existsSync(result);i++)await new Promise(r=>setTimeout(r,100));
  assert(fs.existsSync(result),'Simulator did not finish the UIKit probe');
  for(const name of ['held','settled'])fs.copyFileSync(path.join(container,'Documents',name+'.png'),'/tmp/konvo129-transition-'+name+'.png');
  const v=JSON.parse(fs.readFileSync(result));console.log(JSON.stringify(v));
  assert.equal(v.outgoingHeld,1,'Outgoing inbox must cover the live WebKit loading frame');
  assert.equal(v.heldX,0);assert(Math.abs(v.x300)<1,'The faster chat slide must finish within 300 ms');
  assert(v.x80>10,'Opening a thread must visibly slide in, not jump directly to x=0');
  assert(v.x180>0&&v.x180<v.x80,'Chat must move continuously toward the resting position');
  assert(Math.abs(v.x550)<1&&v.framePreserved===1,'Chat must settle without changing viewport/frame');
  assert.equal(v.stackAfterPush,1);assert.equal(v.transientViewsRemoved,1);
  assert.equal(v.echoX,0);assert.equal(v.stackAfterEcho,1);assert.equal(v.tabX,0);
  console.log('NATIVE CHAT TRANSITION PASSED: real UIKit motion, settled frame, snapshot cleanup, gesture echo suppression and direct bottom tabs');
 }finally{
  try{run('xcrun',['simctl','uninstall',sim,id])}catch{}
  fs.rmSync(dir,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1});
