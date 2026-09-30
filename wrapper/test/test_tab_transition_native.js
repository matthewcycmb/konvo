// Compile and exercise the shipped UIKit transition with local synthetic pages.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{execFileSync}=require('child_process');
const sim=process.env.KONVO_TEST_SIMULATOR;if(!sim)throw Error('Set KONVO_TEST_SIMULATOR to a booted simulator');
const native=fs.readFileSync(path.join(__dirname,'../src-tauri/gen/apple/Sources/instamessages-wrapper/KonvoStore.swift'),'utf8');
const section=native.split('// TAB_TRANSITION_BEGIN')[1].split('// TAB_TRANSITION_END')[0];
const dir=fs.mkdtempSync('/tmp/konvo-tab-transition-'),app=path.join(dir,'KonvoTabProbe.app'),id='com.matthewchan.konvo.tab-probe';fs.mkdirSync(app);
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',timeout:90000});
const source=`import UIKit
import WebKit
class KonvoStore {
 static var swiping=false
 ${section}
}
class Probe:UIViewController,WKNavigationDelegate {
 let web=WKWebView(frame:.zero)
 var result:[String:Double]=[:]
 var started=false
 override func viewDidLoad(){
  super.viewDidLoad();view.backgroundColor = .black
  web.frame=CGRect(x:0,y:60,width:view.bounds.width,height:view.bounds.height-100)
  web.navigationDelegate=self;view.addSubview(web)
  web.loadHTMLString("<meta name='viewport' content='width=device-width'><body style='background:#101318;color:white;font:30px system-ui'>Messages<div style='position:fixed;bottom:0;height:64px'>Fixed tabs</div></body>",baseURL:nil)
 }
 func later(_ seconds:Double,_ work:@escaping()->Void){DispatchQueue.main.asyncAfter(deadline:.now()+seconds,execute:work)}
 func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!){
  guard !started else{return};started=true
  later(0.4){self.checkForward()}
 }
 func checkForward(){
  KonvoStore.prepareTabTransition(web)
  result["coverPresent"] = view.subviews.count==2 ? 1:0
  result["barUncovered"] = view.subviews.last?.frame.maxY == web.frame.maxY-64 ? 1:0
  web.evaluateJavaScript("document.body.style.background='#123f60'"){_,_ in
   self.later(0.08){
    KonvoStore.finishTabTransition(self.web,forward:true)
    self.result["slideDuration"] = self.view.subviews.last?.subviews.last?.layer.animation(forKey:"transform")?.duration ?? -1
    self.later(0.06){self.result["forwardX"] = Double(self.view.subviews.last?.subviews.last?.layer.presentation()?.transform.m41 ?? 0)}
    self.later(0.3){
     self.result["forwardClean"] = self.view.subviews.count==1 ? 1:0
     self.result["webStayedFixed"] = self.web.transform == .identity ? 1:0
     self.checkBack()
    }
   }
  }
 }
 func checkBack(){
  KonvoStore.prepareTabTransition(web)
  // Slow only the test's presentation layer to sample an in-flight slide
  // deterministically; the shipped animation duration remains unchanged.
  view.subviews.last?.layer.speed = 0.25
  KonvoStore.finishTabTransition(web,forward:false)
  web.evaluateJavaScript("document.body.style.background='#00ff00'; document.body.style.margin='0'",completionHandler:nil)
  later(0.25){
   self.result["backX"] = Double(self.view.subviews.last?.subviews.last?.layer.presentation()?.transform.m41 ?? 0)
   // Newly exposed pixels must reflect a destination update made AFTER the
   // slide started. A frozen incoming snapshot still shows the old blue here.
   let format=UIGraphicsImageRendererFormat();format.scale=1
   let image=UIGraphicsImageRenderer(size:self.view.bounds.size,format:format).image{_ in
    self.view.drawHierarchy(in:self.view.bounds,afterScreenUpdates:false)
   }
   var rgba=[UInt8](repeating:0,count:4)
   let context=CGContext(data:&rgba,width:1,height:1,bitsPerComponent:8,bytesPerRow:4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
   let sample=CGRect(x:10,y:self.web.frame.minY+140,width:1,height:1)
   context.draw(image.cgImage!.cropping(to:sample)!,in:CGRect(x:0,y:0,width:1,height:1))
   self.result["liveDestinationVisible"] = rgba[1]>200 && rgba[0]<40 && rgba[2]<40 ? 1:0
   self.result["sampleRed"] = Double(rgba[0]);self.result["sampleGreen"] = Double(rgba[1]);self.result["sampleBlue"] = Double(rgba[2])
  }
  later(0.9){
   self.result["backClean"] = self.view.subviews.count==1 ? 1:0
   KonvoStore.prepareTabTransition(self.web)
   KonvoStore.cancelTabTransition()
   self.result["cancelClean"] = self.view.subviews.count==1 ? 1:0
   KonvoStore.prepareTabTransition(self.web)
   self.later(1.8){
    self.result["timeoutClean"] = self.view.subviews.count==1 ? 1:0
    let url=FileManager.default.urls(for:.documentDirectory,in:.userDomainMask)[0].appendingPathComponent("result.json")
    try! JSONSerialization.data(withJSONObject:self.result).write(to:url)
   }
  }
 }
}
@main class AppDelegate:UIResponder,UIApplicationDelegate {
 var window:UIWindow?
 func application(_ application:UIApplication,didFinishLaunchingWithOptions launchOptions:[UIApplication.LaunchOptionsKey:Any]?)->Bool{
  window=UIWindow(frame:UIScreen.main.bounds);window!.rootViewController=Probe();window!.makeKeyAndVisible();return true
 }
}`;
(async()=>{try{
 fs.writeFileSync(path.join(dir,'main.swift'),source);
 const sdk=run('xcrun',['--sdk','iphonesimulator','--show-sdk-path']).trim();
 run('xcrun',['swiftc','-parse-as-library','-sdk',sdk,'-target','arm64-apple-ios15.0-simulator','-module-cache-path','/tmp/konvo-tab-module-cache',path.join(dir,'main.swift'),'-o',path.join(app,'KonvoTabProbe')]);
 fs.writeFileSync(path.join(app,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>KonvoTabProbe</string><key>CFBundleIdentifier</key><string>${id}</string><key>CFBundleName</key><string>Tab Probe</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>1</string><key>CFBundleShortVersionString</key><string>1.0</string><key>MinimumOSVersion</key><string>15.0</string><key>LSRequiresIPhoneOS</key><true/><key>UIDeviceFamily</key><array><integer>1</integer></array><key>UILaunchScreen</key><dict/></dict></plist>`);
 run('codesign',['--force','--sign','-',app]);run('xcrun',['simctl','install',sim,app]);
 const container=run('xcrun',['simctl','get_app_container',sim,id,'data']).trim(),result=path.join(container,'Documents/result.json');
 run('xcrun',['simctl','launch','--terminate-running-process',sim,id]);
 for(let i=0;i<400&&!fs.existsSync(result);i++)await new Promise(r=>setTimeout(r,100));
 assert(fs.existsSync(result),'UIKit probe did not finish');
 const v=JSON.parse(fs.readFileSync(result));console.log(JSON.stringify(v));
 for(const key of ['coverPresent','barUncovered','forwardClean','backClean','cancelClean','timeoutClean','webStayedFixed','liveDestinationVisible'])assert.equal(v[key],1,key);
 assert(v.slideDuration>0 && v.slideDuration<=0.17,'A short native slide: '+v.slideDuration);
 assert(v.forwardX< -10,'Outgoing page slides left going forward');assert(v.backX>10,'Outgoing page slides right going back');
 console.log('NATIVE TAB TRANSITION PASSED: live destination updates during slide, both directions, stationary tab bar/webview, cancellation and timeout cleanup.');
}finally{try{run('xcrun',['simctl','uninstall',sim,id])}catch{}fs.rmSync(dir,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
