import os, sys, glob, plistlib, zipfile, re, time, brotli
W='/Users/matthewchan/Instamessages/wrapper'
BUILD_START=float(sys.argv[1]) if len(sys.argv)>1 else 0
IPA=sys.argv[2] if len(sys.argv)>2 else W+'/src-tauri/gen/apple/build/arm64/Konvo.ipa'
print('verifying', IPA); fails=[]
def check(ok,m):
    print(('PASS ' if ok else 'FAIL ')+m)
    if not ok: fails.append(m)
st=os.stat(IPA); check(st.st_mtime>BUILD_START,'IPA fresh (%.1f min, %.1f MB)'%((time.time()-st.st_mtime)/60,st.st_size/1e6))
z=zipfile.ZipFile(IPA); names=z.namelist()
app=[n for n in names if re.match(r'Payload/[^/]+\.app/Info\.plist$',n)][0]; appdir=app.rsplit('/',1)[0]
pls=[app]+[n for n in names if re.match(re.escape(appdir)+r'/PlugIns/[^/]+\.appex/Info\.plist$',n)]
check(len(pls)==4,'app + 3 appexes (%d)'%len(pls))
for p in pls:
    d=plistlib.loads(z.read(p)); check(d.get('CFBundleShortVersionString')=='1.6.0' and d.get('CFBundleVersion')=='108','%s %s(%s)'%(p.split('/')[-2],d.get('CFBundleShortVersionString'),d.get('CFBundleVersion')))
binary=z.read(appdir+'/'+plistlib.loads(z.read(app))['CFBundleExecutable'])
def c(x): return binary.count(x.encode())
check(c('phc_')>0,'PostHog key present')
check(c('window.ServiceWorkerRegistration = function')==0,'NO ServiceWorkerRegistration stub (build 91 behavior; the stub broke chat loading)')
check(c('Object.defineProperty(navigator, "serviceWorker"')==0,'navigator.serviceWorker stub is GONE (build 91 thread path restored)')
check(c('function healThread')==0 and c('konvoSPABroken')==0 and c('unhandledrejection')==0,'no self-heal, no rejection hook: cage.js == build 91')
check(c('strip.id = "im-sheet"')>0 and c('ims-host')>0 and c('login_sheet')>0,'sign-in sheet in the cage (build 99)')
check(c('Reset it here, then come back and sign in.')>0 and c('im-reset-bar')>0,'reset route + way back in the cage')
check(c("I don't remember my password")==0 and c('Connect your Instagram')==0 and c("<button data-act='done'>")==0,'no Done, nothing behind the sheet (second build)')
check(c('@keyframes ims-rise')>0 and c('im-rise')>0,'the rise on arrival')
check(c('We want you to try Konvo for free.')>0 and c('function tryPage')>0 and c('function reminderPage')>0 and c('Start your {n}-day FREE <br>trial to continue.')>0 and c('impactPage')==0 and c('function impactRow')==0,'the Cal AI chain: try, reminder, trial timeline; the impact page is gone (Sep 6)')
check(c('position:absolute;top:')>0 and c('top += window.pageYOffset')>0,'key tip anchored to the page')
check(c('Réinitialise-le ici')>0 and c('在這裡重設')>0 and c('여기서 재설정한')>0 and c('Connecte ton Instagram')==0,'sheet strings in fr / zh-Hant / ko, dead ones gone')
check(c('loginSheet(ls);\n      showKeyTip(ls);')>0,'sheet mounts before the key tip measures (reorder landed in this binary)')
check(c("data-act='x'")==0 and c('imp-close inv-x')==0 and c("data-act='inv-go'")==0 and c('function inviteStep')>0 and c('via: "flow"')>0 and c('Send Konvo to 3 friends')>0 and c('Every friend who joins gets 3 days free!')>0 and c('konvoinstall.com/i/')>0,'invite loop: no close on the paywall, the gift is its own page after notifications, 3-day copy (Sep 2)')
check(c('not an ad lol but')>0 and c('3 days free off my link')>0 and c('remember we said we')==0,"the one draft, 3 days, Matthew's words")
check(c('Have an invite?')==0 and c('__konvoNoInvite')>0 and c('"claim"')>0 and c('"inviteStatus"')==0 and c('invite_handle')>0 and c('inv-copy')>0,'no invite link, off switch, handle reports, copy row, no meter command')
check(c('3 jours gratuits')>0 and c('免費 3 天')>0 and c('3일 무료')>0,'invite chrome in fr / zh-Hant / ko')
check(c('purchase_result')>0 and c('"cancelled"')>0 and c('"no_bridge"')>0,'purchase outcome is recorded after the buy tap (1.5.1)')
check(c('Get a heads up')==0 and c('New DMs')==0 and c('Enable notifications for messages?')>0 and c("We'll remind you 2 days before your trial ends.")>0 and c('Would Like to Send You Notifications')>0 and c("data-act='notify-go'")>0 and c('if (finishAfter) finishAfter();\n      });')>0,'the notifications page: question title, no description, reminder line, holds until iOS answers (Sep 2)')
check(c('if (days < 3) return;')==0 and c('konvoReviewAsked')>0,'rating ask without the day gate')
check(c("class='imp-back'")==0 and c("class='imp-skip'")==0 and c('"Skip": "')==0 ,'build 105: no back chevrons, no Skip')
check(c('/^\\/direct\\/(inbox)?\\/?$/')>0 and c('(inbox|requests)')==0,'build 105: Message Requests is not the inbox route, its back arrow stays')
check(c('composer: !!document.querySelector("div[role=\'textbox\']")')>0,'build 105: thread_ready carries the composer field')
check(c('FRAME_IMG')>0 and c("img class='imp-frame'")>0 and c("class='imp-head'")>0 and c('flex:0 1000 100px')>0 and c('--bezel')==0 and c('Try for {price} a month, cancel anytime.')>0 and c('margin-bottom:24px')>0 and c('Your DMs, without the Feed, Explore or Reels.')>0 and c('Charged on {date} unless you cancel before.')>0,'build 107: the iPhone frame, the banner that gives way, the monthly Try title, the one-line timeline')
check(c('changeCount')>0 and c('storekit("claim", "own"')>0 and c('padding:28px 24px 0')>0,'build 108: the claim sheet asks once per clipboard content and never for our own link; the price title sits lower')
check(c('So you can stop getting distracted on your phone.')>0 and c("Pour que tu retrouves ton attention.")>0 and c('讓你找回專注力。')>0 and c('집중력을 되찾을 수 있도록요.')>0 and c('function whyLine')>0,'build 105: the personal offer line in four languages')
dist=open(W+'/dist/index.html').read()
import hashlib
check(hashlib.md5(open(W+'/dist/proof.png','rb').read()).hexdigest()=='b3d125cbc4c3d5e5d2f23543c41582e3','dist/proof.png is the 1000+ image')
check('WE NEVER SEE YOUR DMS' in dist and "YOUR DATA STAYS ON INSTAGRAM'S SERVERS" in dist and 'Before you sign in.' in dist and 'Konvo does not collect your Instagram' in dist and 'id="s10b"' in dist,'two privacy pages: the first as it was, the caps page after it')
hit=None
for a in glob.glob(W+'/src-tauri/target/aarch64-apple-ios/release/build/instamessages*/out/**/*.html*',recursive=True):
    raw=open(a,'rb').read()
    if raw[len(raw)//2:len(raw)//2+48] in binary:
        try:
            if brotli.decompress(raw).decode()==dist: hit=a
        except Exception: pass
check(hit is not None,'embedded index.html == dist/index.html')
check('#s2c .opt.sel' in dist and 'whyOpt.dataset.why' in dist,'build 105: the handoff carries the why answer after the hours')
check(dist.count('Have your Instagram password ready')>=1 and dist.count('Prépare ton mot de passe Instagram')==1,'the caps page carries the password-ready line, translated (1.5.1)')
check('—' not in dist,'no em dashes in rendered funnel')
print('\nRESULT:', 'ALL CHECKS PASS' if not fails else '%d FAILED'%len(fails)); sys.exit(1 if fails else 0)
