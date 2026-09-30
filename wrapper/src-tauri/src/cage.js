
(function () {
  // Only cage the main Instagram web app. Auth / new-device verification
  // surfaces (accountscenter.instagram.com, and Meta's own login pages on
  // meta.com / facebook.com) must load completely untouched — running the
  // cage there called window.stop() and blanked the login flow.
  var H = location.hostname;
  if (H !== "instagram.com" && H !== "www.instagram.com") return;
  // Top frame only. Instagram loads its verification/challenge UI in
  // same-host iframes; the cage running inside one window.stop()s and
  // route-bounces the challenge content, leaving an empty lock modal.
  // Everything the cage does is a top-frame concern, and the Swift bridge
  // already refuses subframes.
  try { if (window.self !== window.top) return; } catch (e) { return; }

  // Analytics go native: Instagram's CSP blocks a page-side call to
  // PostHog. Defined here rather than inside the paywall block because the
  // route watcher needs it too. Event names and screen ids only, never
  // content, never a thread id.
  var experimentContext = null;
  function track(event, props) {
    try {
      var p = props || {};
      // In the experiment, count a control paywall only when live prices paint.
      if (event === "paywall_viewed" && experimentContext && experimentContext.enrolled && experimentContext.variant === "control" && !p.actual_price_visible) return;
      // The variant rides on every event (the native side adds the build
      // number): konvo-free has no paywall to see, and funnels that could
      // not tell variants apart have already lied twice.
      p.variant = window.__konvoBeta ? "beta"
        : window.__konvoFree ? "free" : "default";
      p.lang = navigator.language;
      window.webkit.messageHandlers.konvoStore.postMessage(
        { cmd: "track", id: 0, event: event, props: p });
    } catch (e) {}
  }

  // The sequence speaks the phone's language (Aug 31): fr, zh (any
  // script, rendered Traditional), ko, else English. Same shape as
  // dist/index.html's table, its own keys: the English copy, so a missing
  // entry can only ever show English. Money lines say exactly what the
  // English says, never more. The Screen Time replica mirrors Apple's own
  // dialog wording in each language, which is why it alone says "vous".
  var LANG = (function () {
    var l = String((navigator.languages && navigator.languages[0]) ||
      navigator.language || "").toLowerCase();
    return /^fr/.test(l) ? "fr" : /^zh/.test(l) ? "zh" : /^ko/.test(l) ? "ko" : "en";
  })();
  var I18N = {
    fr: {
      "Waiting for Apple approval. You can restore your purchase after approval.": "En attente de l’approbation Apple. Tu pourras restaurer ton achat après approbation.",
      "No active subscription was found. Try Restore or choose a plan.": "Aucun abonnement actif trouvé. Essaie Restaurer ou choisis une formule.",
      "Your purchase could not be completed. Please try again.": "Ton achat n’a pas pu être finalisé. Réessaie.",
      "Help": "Aide",
      "Sign-in help": "Aide à la connexion",
      "Use your existing Instagram account.": "Utilise ton compte Instagram habituel.",
      "You can check Passwords, Notes or email, then return here to continue.": "Tu peux consulter Mots de passe, Notes ou tes e-mails, puis revenir ici pour continuer.",
      "Reset Instagram password": "Réinitialiser le mot de passe Instagram",
      "Close help": "Fermer l’aide",
      "{price} charged today. One-time purchase.": "{price} facturés aujourd’hui. Achat unique.",
      "{price} charged today.": "{price} facturés aujourd’hui.",
      "{price}/year starting {date}": "{price}/an à partir du {date}",
      "{price}/month starting {date}": "{price}/mois à partir du {date}",
      "Renews at {price}/year unless cancelled.": "Renouvellement à {price}/an, sauf annulation.",
      "Renews at {price}/month unless cancelled.": "Renouvellement à {price}/mois, sauf annulation.",
      "{price} billed annually": "{price} facturés par an",
      "Cancel anytime · How to cancel": "Annule quand tu veux · Comment annuler",
      "Settings → your name → Subscriptions → Konvo → Cancel.": "Réglages → ton nom → Abonnements → Konvo → Annuler.",
      "Cancel at least 24 hours before your trial ends to avoid being charged.": "Annule au moins 24 heures avant la fin de l’essai pour éviter la facturation.",
      "Instagram connected.": "Instagram connecté.",
      "Your DMs and Stories are ready.": "Tes DM et tes stories sont prêts.",
      "Setting up your Konvo": "Préparation de ton Konvo",
      "Feed hidden": "Fil masqué",
      "Reels hidden": "Reels masqués",
      "Explore hidden": "Explorer masqué",
      "Messages kept": "Messages conservés",
      "Friends' stories kept": "Stories de tes amis conservées",
      "Continue": "Continuer",
      "Loading your plans&hellip;": "Chargement de tes formules&hellip;",
      "Prices show in your local currency.": "Les prix s'affichent dans ta devise.",
      "Try again": "Réessayer",
      "No commitment, cancel anytime": "Sans engagement, annule quand tu veux",
      "Today": "Aujourd'hui",
      "In {n} days": "Dans {n} jours",
      "Try for {price} a month, cancel anytime.": "Essaie pour {price} par mois, annulable à tout moment.",
      "Continue with Monthly": "Continuer en mensuel",
      "Unlock your DMs and Stories in Konvo. Pay {price}.": "Débloque tes DM et stories dans Konvo. Tu paies {price}.",
      "Every month": "Chaque mois",
      "Renews at {price}, <b>cancel anytime</b>.": "Renouvelé à {price}, <b>annulable à tout moment</b>.",
      "{price} once. Lifetime access.": "{price} une seule fois. Accès à vie.",
      "Get Lifetime access": "Obtenir l'accès à vie",
      "Pay once. No subscription.": "Un seul paiement. Pas d'abonnement.",
      "Pay {price} once. That's it.": "Tu paies {price} une fois. C'est tout.",
      "{price} a year ({m}/month).": "{price} par an ({m}/mois).",
      "Continue with Yearly": "Continuer en annuel",
      "Unlock your DMs and Stories in Konvo.": "Débloque tes DM et stories dans Konvo.",
      "In 12 months": "Dans 12 mois",
      "Renews at {price}, <b>cancel anytime</b> before.": "Renouvelé à {price}, <b>annulable à tout moment</b> avant.",
      "Your plan ended.": "Ta formule est terminée.",
      "Your trial has ended.": "Ton essai est terminé.",
      "Don't lose your inbox": "Ne perds pas ta messagerie",
      "Your Instagram inbox": "Ta messagerie Instagram",
      "Your messages stay on Instagram.": "Tes messages restent sur Instagram.",
      "Billed annually": "Facturé annuellement",
      "Billed monthly": "Facturé mensuellement",
      "Continue with Konvo": "Continuer avec Konvo",
      "{price} billed annually. Renews unless cancelled.": "{price} facturés par an. Renouvellement sauf résiliation.",
      "{price} billed monthly. Renews unless cancelled.": "{price} facturés par mois. Renouvellement sauf résiliation.",
      "We want you to try Konvo for free.": "On veut que tu essaies Konvo gratuitement.",
      "No Payment Due Now": "Aucun paiement maintenant",
      "We offer {days} so <i>everyone</i> can try Konvo.": "On offre {days} pour que <i>tout le monde</i> puisse essayer Konvo.",
      "So you can stop getting distracted on your phone.": "Pour que tu arrêtes d'être distrait par ton téléphone.",
      "So you can get your attention span back.": "Pour que tu retrouves ton attention.",
      "So you can stop comparing yourself to everyone.": "Pour que tu arrêtes de te comparer à tout le monde.",
      "So you can focus for longer.": "Pour que tu puisses te concentrer plus longtemps.",
      "So you can be more present with friends and family.": "Pour que tu sois plus présent avec tes amis et ta famille.",
      "{n} days free": "{n} jours gratuits",
      "You'll get a reminder {days} before your trial ends.": "Tu recevras un rappel {days} avant la fin de ton essai.",
      "2 days": "2 jours",
      "Start your {n}-day FREE <br>trial to continue.": "Commence ton essai GRATUIT de {n} jours pour continuer.",
      "Your DMs, without the Feed, Explore or Reels.": "Tes DM, sans le fil, Explorer ni Reels.",
      "In 1 Day - Reminder": "Dans 1 jour : rappel",
      "In {n} Days - Reminder": "Dans {n} jours : rappel",
      "We'll remind you before your trial ends.": "On te préviendra avant la fin de ton essai.",
      "In {n} Days - Billing Starts": "Dans {n} jours : début de la facturation",
      "Charged on {date} unless you cancel before.": "Débité le {date} sauf si tu annules avant.",
      "{n} DAYS FREE": "{n} JOURS GRATUITS",
      "Yearly": "Annuel",
      "Monthly": "Mensuel",
      "{price}/mo": "{price}/mois",
      "Start My {n}-Day Free Trial": "Commencer mes {n} jours gratuits",
      "{n} days free, then {price} per year ({m}/mo)": "{n} jours gratuits, puis {price} par an ({m}/mois)",
      "{n} days free, then {price} per year": "{n} jours gratuits, puis {price} par an",
      "{n} days free, then {price} per month": "{n} jours gratuits, puis {price} par mois",
      "Instagram is unblocked until you pick a plan. ": "Instagram est débloqué jusqu'à ce que tu choisisses une formule. ",
      "SAVE {n}%": "-{n} %",
      "Terms of Use": "Conditions d'utilisation",
      "Privacy Policy": "Confidentialité",
      "Restore": "Restaurer",
      "Free during beta": "Gratuit pendant la bêta",
      "Connect Konvo to Screen Time, securely.": "Connecte Konvo à Temps d'écran, en toute sécurité.",
      "To block Instagram on this iPhone, Konvo will need your permission.": "Pour bloquer Instagram sur cet iPhone, Konvo a besoin de ta permission.",
      "&ldquo;Konvo&rdquo; Would Like to Access Screen Time": "« Konvo » souhaite accéder à Temps d'écran",
      "Providing &ldquo;Konvo&rdquo; access to Screen Time may allow it to see your activity data, restrict content, and limit the usage of apps and websites.": "Autoriser « Konvo » à accéder à Temps d'écran peut lui permettre de voir vos données d'activité, de restreindre du contenu et de limiter l'utilisation des apps et des sites web.",
      "Don&rsquo;t Allow": "Ne pas autoriser",
      "Your information is protected by Apple and stays 100% on your phone.": "Tes informations sont protégées par Apple et restent à 100 % sur ton téléphone.",
      "Give permission": "Donner la permission",
      "Instagram connected": "Instagram connecté",
      "Your DMs are still here.": "Tes DM sont toujours là.",
      "Feed, Reels and Explore are now hidden. Stories, profiles and notifications still work.": "Fil, Reels et Explorer sont maintenant masqués. Stories, profils et notifications marchent toujours.",
      "Keep Instagram like this": "Garder Instagram comme ça",
      "Choose a plan next": "Ensuite, choisis une formule",
      "Your messages are waiting.": "Tes messages t'attendent.",
      "You're protected.": "Protection activée.",
      "Instagram is blocked. Your DMs remain available through Konvo.": "Instagram est bloqué. Tes DM restent accessibles dans Konvo.",
      "Lifetime access active.": "Accès à vie activé.",
      "Free until {date}.": "Gratuit jusqu'au {date}.",
      "You're in.": "C'est parti.",
      "Open my messages": "Ouvrir mes messages",
      "Ready to lock the Instagram app?": "On verrouille l'app Instagram ?",
      "Konvo keeps your DMs. Two 5 minute passes a day.": "Konvo garde tes DM. Deux passes de 5 minutes par jour.",
      "Block Instagram": "Bloquer Instagram",
      "We'll remind you 2 days before it ends.": "On te préviendra 2 jours avant la fin.",
      "Your trial ends in {n} days.": "Ton essai se termine dans {n} jours.",
      "Your trial ends tomorrow.": "Ton essai se termine demain.",
      "Keep your hours, or cancel anytime in Settings.": "Garde tes heures, ou annule quand tu veux dans Réglages.",
      "OK": "OK",
      "Same account. Different app.": "Même compte. Autre appli.",
      "Instagram": "Instagram",
      "KONVO": "KONVO",
      "Every DM, request and Story": "Chaque DM, demande et Story",
      "Opens on your messages, not the feed": "S'ouvre sur tes messages, pas sur le fil",
      "No feed. Ever.": "Pas de fil. Jamais.",
      "No Reels, no Explore": "Pas de Reels, pas d'Explorer",
      "No ads, no suggested posts": "Pas de pubs, pas de posts suggérés",
      "Lock the Instagram app when you're ready": "Verrouille l'appli Instagram quand tu es prêt",
      "Two 5 minute passes a day. No snooze.": "Deux pauses de 5 minutes par jour. Pas de report.",
      "Your hours back, every week": "Tes heures, de retour chaque semaine",
      "No commitment. Cancel anytime.": "Sans engagement. Annule quand tu veux.",
      "Free. Nothing to cancel.": "Gratuit. Rien à annuler.",
      "Not now": "Pas maintenant",
      "Reload": "Recharger",
      "Instagram's own page": "La page d'Instagram",
      "Konvo never reads your password": "Konvo ne lit jamais ton mot de passe",
      "Reset it here, then come back and sign in.": "Réinitialise-le ici, puis reviens te connecter.",
      "Reset done?": "Mot de passe réinitialisé ?",
      "Sign in": "Me connecter",
      "Link sent.": "Lien envoyé.",
      "Send to another friend": "Envoyer à un autre ami",
      "Your 3 free days are on.": "Tes 3 jours gratuits ont commencé.",
      "Ends {date}. Nothing to cancel, nothing charges.": "Se termine le {date}. Rien à annuler, rien à payer.",
      "Send Konvo to 3 friends": "Envoie Konvo à 3 amis",
      "Every friend who joins gets 3 days free!": "Chaque ami qui s'inscrit a 3 jours gratuits !",
      "Enable notifications for messages?": "Activer les notifications pour tes messages ?",
      "We'll remind you 2 days before your trial ends.": "On te préviendra 2 jours avant la fin de ton essai.",
      "&ldquo;Konvo&rdquo; Would Like to Send You Notifications": "« Konvo » souhaite vous envoyer des notifications",
      "Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.": "Les notifications peuvent inclure des alertes, des sons et des pastilles d'icône. Vous pouvez les configurer dans Réglages.",
      "Allow": "Autoriser",
      "Turn on notifications": "Activer les notifications",
      "You can change this any time in Settings.": "Tu peux changer ça à tout moment dans Réglages.",
      "Copy link": "Copier le lien",
      "Copied": "Copié",
      "Send to 3 friends": "Envoyer à 3 amis",
      "Loading your username": "Chargement de ton nom d'utilisateur",
      "Could not open the share sheet. Try again.": "Impossible d'ouvrir le partage. Réessaie."
    },
    zh: {
      "Waiting for Apple approval. You can restore your purchase after approval.": "正在等待 Apple 核准。核准後，你可以恢復購買。",
      "No active subscription was found. Try Restore or choose a plan.": "找不到有效訂閱。請嘗試恢復購買或選擇方案。",
      "Your purchase could not be completed. Please try again.": "無法完成購買。請再試一次。",
      "Help": "說明",
      "Sign-in help": "登入說明",
      "Use your existing Instagram account.": "請使用你現有的 Instagram 帳號。",
      "You can check Passwords, Notes or email, then return here to continue.": "你可以查看「密碼」、備忘錄或電子郵件，再回到這裡繼續。",
      "Reset Instagram password": "重設 Instagram 密碼",
      "Close help": "關閉說明",
      "{price} charged today. One-time purchase.": "今天收取 {price}。一次性購買。",
      "{price} charged today.": "今天收取 {price}。",
      "{price}/year starting {date}": "從 {date} 起，每年 {price}",
      "{price}/month starting {date}": "從 {date} 起，每月 {price}",
      "Renews at {price}/year unless cancelled.": "除非取消，否則每年以 {price} 續訂。",
      "Renews at {price}/month unless cancelled.": "除非取消，否則每月以 {price} 續訂。",
      "{price} billed annually": "每年收取 {price}",
      "Cancel anytime · How to cancel": "隨時取消 · 取消方式",
      "Settings → your name → Subscriptions → Konvo → Cancel.": "設定 → 你的姓名 → 訂閱項目 → Konvo → 取消。",
      "Cancel at least 24 hours before your trial ends to avoid being charged.": "請至少在試用結束前 24 小時取消，以避免收費。",
      "Instagram connected.": "Instagram 已連結。",
      "Your DMs and Stories are ready.": "你的私訊和限時動態準備好了。",
      "Setting up your Konvo": "正在設定你的 Konvo",
      "Feed hidden": "已隱藏動態",
      "Reels hidden": "已隱藏 Reels",
      "Explore hidden": "已隱藏探索",
      "Messages kept": "保留訊息",
      "Friends' stories kept": "保留朋友的限時動態",
      "Continue": "繼續",
      "Loading your plans&hellip;": "正在載入方案&hellip;",
      "Prices show in your local currency.": "價格以你的當地貨幣顯示。",
      "Try again": "再試一次",
      "No commitment, cancel anytime": "無綁約，隨時取消",
      "Today": "今天",
      "In {n} days": "{n} 天後",
      "Try for {price} a month, cancel anytime.": "以每月 {price} 試試，隨時取消。",
      "Continue with Monthly": "選擇月付",
      "Unlock your DMs and Stories in Konvo. Pay {price}.": "在 Konvo 解鎖私訊和限時動態。支付 {price}。",
      "Every month": "每個月",
      "Renews at {price}, <b>cancel anytime</b>.": "以 {price} 續訂，<b>隨時可取消</b>。",
      "{price} once. Lifetime access.": "一次付 {price}。終身使用。",
      "Get Lifetime access": "取得終身使用權",
      "Pay once. No subscription.": "只付一次。沒有訂閱。",
      "Pay {price} once. That's it.": "付 {price} 一次。就這樣。",
      "{price} a year ({m}/month).": "每年 {price}（每月 {m}）。",
      "Continue with Yearly": "選擇年付",
      "Unlock your DMs and Stories in Konvo.": "在 Konvo 解鎖私訊和限時動態。",
      "In 12 months": "12 個月後",
      "Renews at {price}, <b>cancel anytime</b> before.": "以 {price} 續訂，之前<b>隨時可取消</b>。",
      "Your plan ended.": "你的方案已結束。",
      "Your trial has ended.": "你的試用已結束。",
      "Don't lose your inbox": "別失去你的收件匣",
      "Your Instagram inbox": "你的 Instagram 收件匣",
      "Your messages stay on Instagram.": "你的訊息仍保留在 Instagram。",
      "Billed annually": "按年計費",
      "Billed monthly": "按月計費",
      "Continue with Konvo": "繼續使用 Konvo",
      "{price} billed annually. Renews unless cancelled.": "每年收費 {price}。除非取消，否則自動續訂。",
      "{price} billed monthly. Renews unless cancelled.": "每月收費 {price}。除非取消，否則自動續訂。",
      "We want you to try Konvo for free.": "我們想讓你免費試試 Konvo。",
      "No Payment Due Now": "現在不用付款",
      "We offer {days} so <i>everyone</i> can try Konvo.": "我們提供{days}，讓<i>每個人</i>都能試試 Konvo。",
      "So you can stop getting distracted on your phone.": "讓你不再被手機分心。",
      "So you can get your attention span back.": "讓你找回專注力。",
      "So you can stop comparing yourself to everyone.": "讓你不再跟所有人比較。",
      "So you can focus for longer.": "讓你能專注得更久。",
      "So you can be more present with friends and family.": "讓你更能陪伴朋友和家人。",
      "{n} days free": "{n} 天免費",
      "You'll get a reminder {days} before your trial ends.": "試用結束前 {days} 會提醒你。",
      "2 days": "2 天",
      "Start your {n}-day FREE <br>trial to continue.": "開始 {n} 天免費試用以繼續。",
      "Your DMs, without the Feed, Explore or Reels.": "只有你的私訊，沒有動態、探索和 Reels。",
      "In 1 Day - Reminder": "1 天後：提醒",
      "In {n} Days - Reminder": "{n} 天後：提醒",
      "We'll remind you before your trial ends.": "我們會在試用結束前提醒你。",
      "In {n} Days - Billing Starts": "{n} 天後：開始扣款",
      "Charged on {date} unless you cancel before.": "除非你提前取消，否則將於 {date} 扣款。",
      "{n} DAYS FREE": "{n} 天免費",
      "Yearly": "年繳",
      "Monthly": "月繳",
      "{price}/mo": "{price}/月",
      "Start My {n}-Day Free Trial": "開始我的 {n} 天免費試用",
      "{n} days free, then {price} per year ({m}/mo)": "{n} 天免費，之後每年 {price}（每月 {m}）",
      "{n} days free, then {price} per year": "{n} 天免費，之後每年 {price}",
      "{n} days free, then {price} per month": "{n} 天免費，之後每月 {price}",
      "Instagram is unblocked until you pick a plan. ": "在你選擇方案之前，Instagram 不會被封鎖。",
      "SAVE {n}%": "省 {n}%",
      "Terms of Use": "使用條款",
      "Privacy Policy": "隱私權政策",
      "Restore": "恢復購買",
      "Free during beta": "測試期間免費",
      "Connect Konvo to Screen Time, securely.": "安全地將 Konvo 連結到「螢幕使用時間」。",
      "To block Instagram on this iPhone, Konvo will need your permission.": "要在這支 iPhone 封鎖 Instagram，Konvo 需要你的許可。",
      "&ldquo;Konvo&rdquo; Would Like to Access Screen Time": "「Konvo」想要取用「螢幕使用時間」",
      "Providing &ldquo;Konvo&rdquo; access to Screen Time may allow it to see your activity data, restrict content, and limit the usage of apps and websites.": "允許「Konvo」取用「螢幕使用時間」可能讓它查看你的活動資料、限制內容，以及限制 App 和網站的使用。",
      "Don&rsquo;t Allow": "不允許",
      "Your information is protected by Apple and stays 100% on your phone.": "你的資料由 Apple 保護，100% 留在你的手機上。",
      "Give permission": "授予許可",
      "Instagram connected": "Instagram 已連結",
      "Your DMs are still here.": "你的私訊都還在。",
      "Feed, Reels and Explore are now hidden. Stories, profiles and notifications still work.": "動態、Reels 和探索已隱藏。限時動態、個人檔案和通知照常使用。",
      "Keep Instagram like this": "就讓 Instagram 保持這樣",
      "Choose a plan next": "接著選擇方案",
      "Your messages are waiting.": "你的訊息在等你。",
      "You're protected.": "保護已啟用。",
      "Instagram is blocked. Your DMs remain available through Konvo.": "Instagram 已封鎖。你的私訊仍可透過 Konvo 使用。",
      "Lifetime access active.": "終身使用已啟用。",
      "Free until {date}.": "{date} 前免費。",
      "You're in.": "搞定。",
      "Open my messages": "打開我的訊息",
      "Ready to lock the Instagram app?": "要鎖住 Instagram App 了嗎？",
      "Konvo keeps your DMs. Two 5 minute passes a day.": "Konvo 保留你的私訊。每天兩張 5 分鐘通行證。",
      "Block Instagram": "封鎖 Instagram",
      "We'll remind you 2 days before it ends.": "結束前 2 天我們會提醒你。",
      "Your trial ends in {n} days.": "你的試用還有 {n} 天結束。",
      "Your trial ends tomorrow.": "你的試用明天結束。",
      "Keep your hours, or cancel anytime in Settings.": "留住你的時間，或隨時在「設定」取消。",
      "OK": "好",
      "Same account. Different app.": "同一個帳號。不一樣的 app。",
      "Instagram": "Instagram",
      "KONVO": "KONVO",
      "Every DM, request and Story": "每則訊息、邀請和限時動態",
      "Opens on your messages, not the feed": "打開就是訊息，不是動態",
      "No feed. Ever.": "沒有動態。永遠沒有。",
      "No Reels, no Explore": "沒有 Reels，沒有探索",
      "No ads, no suggested posts": "沒有廣告，沒有推薦貼文",
      "Lock the Instagram app when you're ready": "準備好時鎖住 Instagram app",
      "Two 5 minute passes a day. No snooze.": "每天兩次 5 分鐘通行。不能拖延。",
      "Your hours back, every week": "每週都拿回你的時間",
      "No commitment. Cancel anytime.": "不綁約，隨時取消。",
      "Free. Nothing to cancel.": "免費。不用取消。",
      "Not now": "先不要",
      "Reload": "重新載入",
      "Instagram's own page": "Instagram 官方頁面",
      "Konvo never reads your password": "Konvo 絕不會讀取你的密碼",
      "Reset it here, then come back and sign in.": "在這裡重設，然後回來登入。",
      "Reset done?": "重設好了？",
      "Sign in": "登入",
      "Link sent.": "連結已送出。",
      "Send to another friend": "再傳給另一個朋友",
      "Your 3 free days are on.": "你的免費 3 天開始了。",
      "Ends {date}. Nothing to cancel, nothing charges.": "{date} 結束。不用取消，不會扣款。",
      "Send Konvo to 3 friends": "把 Konvo 傳給 3 個朋友",
      "Every friend who joins gets 3 days free!": "每個加入的朋友都免費 3 天！",
      "Enable notifications for messages?": "要開啟訊息通知嗎？",
      "We'll remind you 2 days before your trial ends.": "試用結束前 2 天我們會提醒你。",
      "&ldquo;Konvo&rdquo; Would Like to Send You Notifications": "「Konvo」想要傳送通知給你",
      "Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.": "通知可能包含提示、聲音和圖像標記。你可以在「設定」中設定這些項目。",
      "Allow": "允許",
      "Turn on notifications": "開啟通知",
      "You can change this any time in Settings.": "你隨時可以在「設定」中更改。",
      "Copy link": "複製連結",
      "Copied": "已複製",
      "Send to 3 friends": "傳給 3 個朋友",
      "Loading your username": "正在讀取你的帳號名稱",
      "Could not open the share sheet. Try again.": "無法打開分享選單，再試一次。"
    },
    ko: {
      "Waiting for Apple approval. You can restore your purchase after approval.": "Apple 승인을 기다리고 있어요. 승인 후 구매를 복원할 수 있어요.",
      "No active subscription was found. Try Restore or choose a plan.": "활성 구독을 찾을 수 없어요. 구매를 복원하거나 요금제를 선택하세요.",
      "Your purchase could not be completed. Please try again.": "구매를 완료하지 못했어요. 다시 시도하세요.",
      "Help": "도움말",
      "Sign-in help": "로그인 도움말",
      "Use your existing Instagram account.": "기존 Instagram 계정을 사용하세요.",
      "You can check Passwords, Notes or email, then return here to continue.": "암호, 메모 또는 이메일을 확인한 뒤 여기로 돌아와 계속할 수 있어요.",
      "Reset Instagram password": "Instagram 비밀번호 재설정",
      "Close help": "도움말 닫기",
      "{price} charged today. One-time purchase.": "오늘 {price} 결제. 일회성 구매입니다.",
      "{price} charged today.": "오늘 {price} 결제.",
      "{price}/year starting {date}": "{date}부터 연 {price}",
      "{price}/month starting {date}": "{date}부터 월 {price}",
      "Renews at {price}/year unless cancelled.": "취소하지 않으면 연 {price}로 갱신됩니다.",
      "Renews at {price}/month unless cancelled.": "취소하지 않으면 월 {price}로 갱신됩니다.",
      "{price} billed annually": "매년 {price} 청구",
      "Cancel anytime · How to cancel": "언제든 취소 · 취소 방법",
      "Settings → your name → Subscriptions → Konvo → Cancel.": "설정 → 사용자 이름 → 구독 → Konvo → 취소.",
      "Cancel at least 24 hours before your trial ends to avoid being charged.": "요금이 청구되지 않으려면 체험 종료 최소 24시간 전에 취소하세요.",
      "Instagram connected.": "인스타그램 연결 완료.",
      "Your DMs and Stories are ready.": "DM과 스토리가 준비됐어요.",
      "Setting up your Konvo": "Konvo 설정 중",
      "Feed hidden": "피드 숨김",
      "Reels hidden": "릴스 숨김",
      "Explore hidden": "탐색 탭 숨김",
      "Messages kept": "메시지 유지",
      "Friends' stories kept": "친구 스토리 유지",
      "Continue": "계속",
      "Loading your plans&hellip;": "플랜 불러오는 중&hellip;",
      "Prices show in your local currency.": "가격은 현지 통화로 표시돼요.",
      "Try again": "다시 시도",
      "No commitment, cancel anytime": "약정 없음, 언제든 해지",
      "Today": "오늘",
      "In {n} days": "{n}일 후",
      "Try for {price} a month, cancel anytime.": "월 {price}로 써보세요, 언제든 해지.",
      "Continue with Monthly": "월간 플랜으로 계속",
      "Unlock your DMs and Stories in Konvo. Pay {price}.": "Konvo에서 DM과 스토리 잠금 해제. {price} 결제.",
      "Every month": "매달",
      "Renews at {price}, <b>cancel anytime</b>.": "{price}로 갱신, <b>언제든 해지</b>.",
      "{price} once. Lifetime access.": "{price} 한 번. 평생 이용.",
      "Get Lifetime access": "평생 이용권 받기",
      "Pay once. No subscription.": "한 번만 결제. 구독 없음.",
      "Pay {price} once. That's it.": "{price} 한 번 결제. 끝이에요.",
      "{price} a year ({m}/month).": "연 {price} (월 {m}).",
      "Continue with Yearly": "연간 플랜으로 계속",
      "Unlock your DMs and Stories in Konvo.": "Konvo에서 DM과 스토리 잠금 해제.",
      "In 12 months": "12개월 후",
      "Renews at {price}, <b>cancel anytime</b> before.": "{price}로 갱신, 그 전에 <b>언제든 해지</b>.",
      "Your plan ended.": "플랜이 종료됐어요.",
      "Your trial has ended.": "무료 체험이 종료됐어요.",
      "Don't lose your inbox": "메시지함을 놓치지 마세요",
      "Your Instagram inbox": "내 Instagram 메시지함",
      "Your messages stay on Instagram.": "메시지는 Instagram에 그대로 있어요.",
      "Billed annually": "매년 결제",
      "Billed monthly": "매월 결제",
      "Continue with Konvo": "Konvo 계속 이용하기",
      "{price} billed annually. Renews unless cancelled.": "매년 {price} 결제. 취소하지 않으면 자동 갱신됩니다.",
      "{price} billed monthly. Renews unless cancelled.": "매월 {price} 결제. 취소하지 않으면 자동 갱신됩니다.",
      "We want you to try Konvo for free.": "Konvo를 무료로 써보세요.",
      "No Payment Due Now": "지금은 결제 없음",
      "We offer {days} so <i>everyone</i> can try Konvo.": "<i>누구나</i> Konvo를 써볼 수 있도록 {days}을 드려요.",
      "So you can stop getting distracted on your phone.": "폰 때문에 산만해지지 않도록요.",
      "So you can get your attention span back.": "집중력을 되찾을 수 있도록요.",
      "So you can stop comparing yourself to everyone.": "남들과 비교하지 않도록요.",
      "So you can focus for longer.": "더 오래 집중할 수 있도록요.",
      "So you can be more present with friends and family.": "친구, 가족과 더 함께할 수 있도록요.",
      "{n} days free": "{n}일 무료",
      "You'll get a reminder {days} before your trial ends.": "체험 종료 {days} 전에 알려드릴게요.",
      "2 days": "2일",
      "Start your {n}-day FREE <br>trial to continue.": "계속하려면 {n}일 무료 체험을 시작하세요.",
      "Your DMs, without the Feed, Explore or Reels.": "피드, 탐색, 릴스 없이 DM만.",
      "In 1 Day - Reminder": "1일 후: 알림",
      "In {n} Days - Reminder": "{n}일 후: 알림",
      "We'll remind you before your trial ends.": "체험이 끝나기 전에 알려드릴게요.",
      "In {n} Days - Billing Starts": "{n}일 후: 결제 시작",
      "Charged on {date} unless you cancel before.": "{date}에 결제됩니다. 그 전에 취소할 수 있어요.",
      "{n} DAYS FREE": "{n}일 무료",
      "Yearly": "연간",
      "Monthly": "월간",
      "{price}/mo": "{price}/월",
      "Start My {n}-Day Free Trial": "{n}일 무료 체험 시작",
      "{n} days free, then {price} per year ({m}/mo)": "{n}일 무료, 이후 연 {price} ({m}/월)",
      "{n} days free, then {price} per year": "{n}일 무료, 이후 연 {price}",
      "{n} days free, then {price} per month": "{n}일 무료, 이후 월 {price}",
      "Instagram is unblocked until you pick a plan. ": "플랜을 고르기 전까지 인스타그램 차단이 풀려 있어요. ",
      "SAVE {n}%": "{n}% 절약",
      "Terms of Use": "이용약관",
      "Privacy Policy": "개인정보 처리방침",
      "Restore": "복원",
      "Free during beta": "베타 기간 무료",
      "Connect Konvo to Screen Time, securely.": "Konvo를 스크린 타임에 안전하게 연결해요.",
      "To block Instagram on this iPhone, Konvo will need your permission.": "이 iPhone에서 인스타그램을 차단하려면 권한이 필요해요.",
      "&ldquo;Konvo&rdquo; Would Like to Access Screen Time": "‘Konvo’이(가) 스크린 타임에 접근하려고 합니다",
      "Providing &ldquo;Konvo&rdquo; access to Screen Time may allow it to see your activity data, restrict content, and limit the usage of apps and websites.": "‘Konvo’에 스크린 타임 접근을 허용하면 활동 데이터를 보고, 콘텐츠를 제한하고, 앱 및 웹 사이트 사용을 제한할 수 있습니다.",
      "Don&rsquo;t Allow": "허용 안 함",
      "Your information is protected by Apple and stays 100% on your phone.": "정보는 Apple이 보호하며 100% 이 폰에만 남아요.",
      "Give permission": "권한 허용하기",
      "Instagram connected": "인스타그램 연결됨",
      "Your DMs are still here.": "DM은 그대로 여기 있어요.",
      "Feed, Reels and Explore are now hidden. Stories, profiles and notifications still work.": "피드, 릴스, 탐색은 이제 숨겨졌어요. 스토리, 프로필, 알림은 그대로 써요.",
      "Keep Instagram like this": "인스타그램 이대로 유지",
      "Choose a plan next": "다음은 플랜 선택",
      "Your messages are waiting.": "메시지가 기다리고 있어요.",
      "You're protected.": "보호 중이에요.",
      "Instagram is blocked. Your DMs remain available through Konvo.": "인스타그램은 차단됐어요. DM은 Konvo에서 계속 볼 수 있어요.",
      "Lifetime access active.": "평생 이용 활성화.",
      "Free until {date}.": "{date}까지 무료.",
      "You're in.": "준비 끝.",
      "Open my messages": "내 메시지 열기",
      "Ready to lock the Instagram app?": "인스타그램 앱을 잠글까요?",
      "Konvo keeps your DMs. Two 5 minute passes a day.": "DM은 Konvo에 남아요. 하루 5분 패스 2번.",
      "Block Instagram": "인스타그램 차단",
      "We'll remind you 2 days before it ends.": "종료 2일 전에 미리 알려드릴게요.",
      "Your trial ends in {n} days.": "체험이 {n}일 후에 끝나요.",
      "Your trial ends tomorrow.": "체험이 내일 끝나요.",
      "Keep your hours, or cancel anytime in Settings.": "시간을 지키거나, 설정에서 언제든 취소할 수 있어요.",
      "OK": "확인",
      "Same account. Different app.": "같은 계정. 다른 앱.",
      "Instagram": "Instagram",
      "KONVO": "KONVO",
      "Every DM, request and Story": "모든 DM, 요청, 스토리",
      "Opens on your messages, not the feed": "피드 대신 메시지에서 열려요",
      "No feed. Ever.": "피드 없음. 영원히.",
      "No Reels, no Explore": "릴스 없음, 탐색 없음",
      "No ads, no suggested posts": "광고 없음, 추천 게시물 없음",
      "Lock the Instagram app when you're ready": "준비되면 Instagram 앱 잠그기",
      "Two 5 minute passes a day. No snooze.": "하루 5분 패스 두 번. 미루기 없음.",
      "Your hours back, every week": "매주 시간을 되찾아요",
      "No commitment. Cancel anytime.": "약정 없음. 언제든 취소.",
      "Free. Nothing to cancel.": "무료. 취소할 것도 없어요.",
      "Not now": "나중에",
      "Reload": "새로고침",
      "Instagram's own page": "인스타그램 공식 페이지",
      "Konvo never reads your password": "Konvo는 비밀번호를 절대 읽지 않아요",
      "Reset it here, then come back and sign in.": "여기서 재설정한 뒤 돌아와서 로그인해요.",
      "Reset done?": "재설정 끝났어요?",
      "Sign in": "로그인",
      "Link sent.": "링크를 보냈어요.",
      "Send to another friend": "다른 친구에게 보내기",
      "Your 3 free days are on.": "무료 3일이 시작됐어요.",
      "Ends {date}. Nothing to cancel, nothing charges.": "{date}에 끝나요. 취소할 것도, 결제될 것도 없어요.",
      "Send Konvo to 3 friends": "친구 3명에게 Konvo 보내기",
      "Every friend who joins gets 3 days free!": "가입하는 친구마다 3일 무료예요!",
      "Enable notifications for messages?": "메시지 알림을 켤까요?",
      "We'll remind you 2 days before your trial ends.": "체험 종료 2일 전에 미리 알려드릴게요.",
      "&ldquo;Konvo&rdquo; Would Like to Send You Notifications": "‘Konvo’에서 알림을 보내고자 합니다",
      "Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.": "알림에는 경고, 사운드 및 아이콘 배지가 포함될 수 있습니다. 설정에서 구성할 수 있습니다.",
      "Allow": "허용",
      "Turn on notifications": "알림 켜기",
      "You can change this any time in Settings.": "설정에서 언제든지 바꿀 수 있어요.",
      "Copy link": "링크 복사",
      "Copied": "복사됨",
      "Send to 3 friends": "친구 3명에게 보내기",
      "Loading your username": "사용자 이름을 불러오는 중",
      "Could not open the share sheet. Try again.": "공유 시트를 열 수 없어요. 다시 시도해요."
    }
  };
  function T(s, v) {
    var r = (I18N[LANG] || {})[s] || s;
    if (v) for (var k in v) r = r.split("{" + k + "}").join(v[k]);
    return r;
  }

  // The onboarding quiz's motive + weekly hours arrive in the URL fragment
  // (dist/index.html sets it at the login handoff; localStorage does not
  // cross the tauri -> instagram origin boundary). Persist into this origin
  // and strip the hash so it survives login, reloads, and relaunches.
  if ((location.hash || "").indexOf('#konvo=') === 0) {
    try { localStorage.konvoQuiz = location.hash.slice(7); } catch (e) {}
    // An explicit onboarding handoff can reuse an existing Instagram session.
    // Count that connection once even if a previous install already logged in.
    try {
      sessionStorage.konvoLoginHandoff = "1";
      sessionStorage.removeItem("konvoLoginInteractive");
    } catch (e) {}
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (e) {}
  }

  // First launch on a fresh install has no cache and no session, so
  // instagram.com takes 10-15s to paint and the window sits empty the whole
  // time. Warm launches are instant, but the cold one is the first thing a
  // new tester ever sees, and a blank window reads as a broken app. Show a
  // spinner until the page paints over it.
  var loginDocumentStartedAt = Date.now();
  var clearBootOverlay = function () {};
  (function boot() {
    // Once per app launch, never between screens. This overlay exists for
    // the cold start where instagram.com takes 10-15s to paint; showing it
    // again on an in-app navigation just reads as the app hanging.
    // sessionStorage dies with the webview session, so a relaunch shows it
    // again and a navigation does not.
    try {
      if (sessionStorage.konvoBooted) return;
      sessionStorage.konvoBooted = "1";
    } catch (e) {}
    // Konvo's whole funnel is the light design - the quiz, Instagram's
    // login, and the paywall all render while the app is pinned Light
    // (lib.rs). The paywall block below hands appearance to the phone only
    // once the wall is out of the way, so the first thing that ever renders
    // dark is the chat itself.
    var b = document.createElement("div");
    b.id = "im-boot";
    b.style.cssText = "position:fixed;inset:0;z-index:2147483646;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center";
    // Icon + wordmark, not a bare spinner. The wait is Instagram's bundle over
    // the network and is not ours to shorten, but a logo reads as an app
    // starting where a lone spinner on black reads as a page that has hung.
    // SVG attributes use single quotes on purpose: a double quote immediately
    // followed by a hash closes the Rust raw string this whole script lives in.
    b.innerHTML =
      "<svg width='62' height='62' viewBox='0 0 512 512' aria-hidden='true'>" +
        "<rect width='512' height='512' rx='116' fill='#0a84ff'/>" +
        "<g transform='translate(70,70) scale(15.5)' fill='none' stroke='#fff'" +
        " stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
        "<path d='M7.9 20A9 9 0 1 0 4 16.1L2 22Z'/></g></svg>" +
      "<div id='im-boot-w' style='position:absolute;bottom:56px;font:500 15px " +
        "-apple-system,system-ui,sans-serif;letter-spacing:-0.01em;opacity:.55'>" +
        "Konvo</div>";
    (document.body || document.documentElement).appendChild(b);
    // Painted as a function of the current scheme, and repainted if the
    // scheme flips while the overlay is up - which is exactly what the
    // appearance message above causes on a dark phone.
    function paintBoot() {
      var dark = !/iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
      b.style.background = dark ? '#000' : '#fff';
      var w = document.getElementById("im-boot-w");
      if (w) w.style.color = dark ? '#f5f5f7' : '#141d33';
    }
    paintBoot();
    if (window.matchMedia) {
      try {
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paintBoot);
      } catch (e) {}
    }
    // Fade, never cut: Instagram's own launch dissolves into the app, and
    // a hard removal here read as a flicker between two screens.
    function clear(reason) {
      var el = document.getElementById("im-boot");
      if (!el || el.dataset.going) return;
      el.dataset.going = "1";
      // Release hit testing immediately, including during the fade.
      el.style.pointerEvents = "none";
      el.style.transition = "opacity .32s ease";
      el.style.opacity = "0";
      if (loginStage() && !signedIn()) track("login_overlay_cleared", {
        stage: loginStage(), reason: reason, ms: Date.now() - loginDocumentStartedAt
      });
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 340);
    }
    clearBootOverlay = clear;
    window.addEventListener("load", function () { clear("page_load"); }, { once: true });
    if (document.readyState === "complete") clear("already_loaded");
    // Never let the overlay trap someone if load never fires (offline, a
    // redirect chain, a stalled request).
    setTimeout(function () { clear("overlay_fallback"); }, 20000);
  })();

  // Only the algorithm's surfaces bounce. Single-media permalinks — /p/, /tv/,
  // /reel/<code> — are conversation material: a post opened from a profile
  // grid or shared in a DM is one person's post, and there is no /p/ feed to
  // leak into. The desktop's next/prev arrows on a post walk that same
  // person's grid, which is browsing a friend, not a feed.
  // Profiles themselves are deliberately open: finding someone you just met
  // and hitting Message is the whole point of a DM app. What stays shut is
  // everything you can watch - including a profile's own reels tab, which the
  // leading-slash patterns below would otherwise sail straight past.
  //
  // One deliberate exemption: /reel/<code>/, the permalink for the single reel
  // somebody sent you. Watching what a friend sent is part of the conversation;
  // the reels *feed* at /reels/ is not, and stays caged. The two differ by one
  // letter, so the pattern below is plural ON PURPOSE - restoring the old
  // "reels?" re-cages shared reels, and dropping to "reel" opens the feed.
  // Swiping out of that one reel into the next is shut off separately, below.
  //
  // Story permalinks remain open. Home is only reachable through the explicit
  // Stories tab below, behind a document-start mask that exposes no feed DOM.
  var FEED = [
    /^\/$/, /^\/reels(\/|$)/, /^\/reel\/?$/, /^\/explore(\/|$)/,
    /^\/[A-Za-z0-9._]+\/(reels|tagged|saved)(\/|$)/
  ];
  function blocked(p) {
    if (p === "/" && storiesHome()) return false;
    return FEED.some(function (r) { return r.test(p); });
  }

  // Stories are read from Instagram's own tray, not a second API/session.
  // Keep the actual horizontal tray in place: no cloned avatars, replacement
  // grid, headings or buttons. Reveal only verified native Story controls and
  // the native player; the remaining home content stays masked.
  var storiesAccess = function () {
    if (window.__konvoOnboardingPreview) return false;
    try { return !!(localStorage.konvoPaid || localStorage.konvoWelcomed || localStorage.konvoBetaFree); }
    catch (e) { return false; }
  };
  var storiesStyle = null, storiesObserver = null, storiesActive = false;
  var storiesTimer = 0, storiesStarted = 0, storiesReported = {slow:false,ready:false};
  var storiesNodes = new Set(), storiesPlayers = new Set(), storiesEditor = null;
  var acknowledgedStoryNotices = new WeakSet();
  var retiredStories = new Map(), retiredStoriesObserver = null;
  var storyPull = null, storyRefreshUI = null, storyRefreshBusy = false, storyRefreshTimer = 0;
  var STORIES_HOME = "/?konvo_stories=1";
  var STORY_CLOSE = 'svg:has(polyline[points="20.643 3.357 12 12 3.353 20.647"])';
  function storiesIntent(value) {
    var uid = (document.cookie.match(/(?:^|; )ds_user_id=([0-9]+)/) || [])[1];
    try {
      if (value === false) sessionStorage.removeItem("konvoStoriesAccount");
      else if (value === true && uid) sessionStorage.konvoStoriesAccount = uid;
      return !!uid && sessionStorage.konvoStoriesAccount === uid;
    } catch (e) { return false; }
  }
  function storiesHome() {
    return location.pathname === "/" && signedIn() &&
      (new URLSearchParams(location.search).get("konvo_stories") === "1" || storiesIntent());
  }
  function storyCreationRoute() { return /^\/create\/story\/?$/.test(location.pathname); }
  function storiesGuardRoute() {
    // Mask ALL home routes, including a rejected one, before its first paint.
    // A Story opened from a DM/profile keeps Instagram's existing viewer.
    var home = location.pathname === "/";
    if (!home) resetStoryPull();
    if (home && storiesHome()) storiesIntent(true);
    var creating = storyCreationRoute();
    if (!home && !creating && !/^\/stories\//.test(location.pathname)) storiesIntent(false);
    var guarded = home || ((creating || /^\/stories\//.test(location.pathname)) && storiesIntent());
    document.documentElement.classList.toggle("im-stories-guard", guarded);
    document.documentElement.classList.toggle("im-stories-home", home && storiesHome());
    document.documentElement.classList.toggle("im-stories-watching", guarded && !home && !creating);
    document.documentElement.classList.toggle("im-stories-creating", guarded && creating);
    if (home && storiesHome()) clearRetiredStories();
    if (guarded && !storiesStyle) {
      storiesStyle = document.createElement("style");
      storiesStyle.textContent =
        'html.im-stories-guard{background:#fff!important;overflow:hidden!important}' +
        'html.im-stories-guard body{overflow:hidden!important}' +
        // Instagram's two-class mobile overflow rule outvotes the generic
        // guard after a modal closes. Keep Stories home horizontal-only.
        'html.im-stories-guard.im-stories-home body{overflow:hidden!important;overscroll-behavior-y:none!important}' +
        'html.im-stories-home{overscroll-behavior-y:none!important}' +
        // The fixed tab bar needs no body scroll space on this horizontal-only page.
        'html.im-stories-home body{padding-bottom:0!important}' +
        'html.im-stories-home,html.im-stories-home body{scrollbar-width:none!important}' +
        'html.im-stories-home::-webkit-scrollbar:vertical,html.im-stories-home body::-webkit-scrollbar:vertical{display:none!important;width:0!important}' +
        'html.im-stories-guard body *{visibility:hidden!important}' +
        'html.im-stories-guard #im-tabs,html.im-stories-guard #im-tabs *,' +
        'html.im-stories-guard #im-pay,html.im-stories-guard #im-pay *,' +
        'html.im-stories-guard #im-pass-sheet,html.im-stories-guard #im-pass-sheet *{visibility:visible!important}' +
        'html.im-stories-home #im-stories-refresh,html.im-stories-home #im-stories-refresh *{visibility:visible!important}' +
        '#im-stories-refresh{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147482999;' +
        'display:flex;align-items:center;gap:8px;padding:9px 13px;border-radius:24px;background:#fff;color:#626873;' +
        'box-shadow:0 3px 16px #0002;font:500 12px -apple-system,system-ui,sans-serif;white-space:nowrap}' +
        '#im-stories-refresh[hidden]{display:none}' +
        '#im-stories-refresh .im-refresh-ring{width:18px;height:18px;border:2px solid #8e8e9338;' +
        'border-top-color:#0a84ff;border-radius:50%;box-sizing:border-box}' +
        '#im-stories-refresh[aria-busy=true] .im-refresh-ring{animation:im-refresh-spin .7s linear infinite}' +
        '@keyframes im-refresh-spin{to{transform:rotate(360deg)}}' +
        '@media(prefers-color-scheme:dark){#im-stories-refresh{background:#25282e;color:#e5e5ea}}' +
        '@media(prefers-reduced-motion:reduce){#im-stories-refresh .im-refresh-ring{animation:none!important}}' +
        'html.im-stories-home .im-stories-tray,html.im-stories-home .im-stories-scroll,' +
        'html.im-stories-home .im-story-native,html.im-stories-home .im-story-native *{visibility:visible!important}' +
        'html.im-stories-watching{background:#000!important}' +
        'html.im-stories-watching .im-stories-player,html.im-stories-watching .im-stories-player *{visibility:visible!important}' +
        'html.im-stories-creating{background:#000!important}' +
        'html.im-stories-creating .im-stories-editor,html.im-stories-creating .im-stories-editor *,' +
        'html.im-stories-creating .im-story-dialog,html.im-stories-creating .im-story-dialog *{visibility:visible!important}' +
        'html .im-stories-retired,html .im-stories-retired *{visibility:hidden!important}' +
        '@media(prefers-color-scheme:dark){html.im-stories-home{background:#0c1013!important}}';
      (document.head || document.documentElement).appendChild(storiesStyle);
    }
    return guarded;
  }
  // Runs synchronously both at document start and after every history change.
  storiesGuardRoute();

  function clearRetiredStories() {
    if (retiredStoriesObserver) { retiredStoriesObserver.disconnect(); retiredStoriesObserver = null; }
    retiredStories.forEach(function (_, root) { root.classList.remove("im-stories-retired"); });
    retiredStories.clear();
  }
  function retireStoriesHome() {
    // React may keep home's old MAIN mounted after the route changes. Keep
    // that exact content hidden until it is removed, instead of throwing
    // away the whole document (and Instagram's loaded router/cache).
    document.querySelectorAll("main").forEach(function (root) {
      // React retains hidden responsive/previous trees. They cannot flash
      // and must not keep a cleanup observer alive for the rest of the app.
      for (var parent = root; parent && parent !== document.body; parent = parent.parentElement) {
        if (getComputedStyle(parent).display === "none") return;
      }
      var markers = Array.prototype.slice.call(root.querySelectorAll("article"));
      storiesNodes.forEach(function (node) {
        if (root.contains(node) && node.classList.contains("im-story-native")) markers.push(node);
      });
      if (!markers.length) return;
      root.classList.add("im-stories-retired"); retiredStories.set(root, markers);
    });
    if (!retiredStories.size || retiredStoriesObserver) return;
    retiredStoriesObserver = new MutationObserver(function () {
      retiredStories.forEach(function (markers, root) {
        if (!root.isConnected || !markers.some(function (node) { return root.contains(node); })) {
          root.classList.remove("im-stories-retired"); retiredStories.delete(root);
        }
      });
      if (!retiredStories.size) clearRetiredStories();
    });
    retiredStoriesObserver.observe(document.documentElement, {childList:true,subtree:true});
  }

  function instagramNavigate(href) {
    var target = new URL(href, location.href);
    if (target.origin !== new URL(location.href).origin) return false;
    // Existing links own Instagram's event handling and take precedence.
    var links = document.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) {
      if (links[i].closest("#im-tabs")) continue;
      if (links[i].origin === target.origin && links[i].pathname === target.pathname && links[i].search === target.search) {
        links[i].click(); return true;
      }
    }
    // The mobile inbox renders no links for the other tabs. Use the SAME
    // initialized router Instagram uses for its own Story editor/navigation,
    // verified on iPhone, instead of fabricating history.pushState entries.
    // This is a compatibility adapter: a changed/missing module falls back
    // to an ordinary load. No background pages or private API requests.
    try {
      if (typeof window.require !== "function") return false;
      var navigation = window.require("browserHistory_DO_NOT_USE");
      var dispatcher = navigation && typeof navigation.getCometRouterDispatcher === "function" && navigation.getCometRouterDispatcher();
      if (!dispatcher || typeof dispatcher.withContext !== "function" ||
          !navigation.browserHistory || typeof navigation.browserHistory.push !== "function") return false;
      navigation.browserHistory.push(target.pathname + target.search + target.hash);
      return true;
    } catch (e) { return false; }
  }

  function openStories(e) {
    if (e) e.preventDefault();
    if (!signedIn() || !storiesAccess() || document.getElementById("im-pay")) return;
    if (storiesHome()) return;
    storiesIntent(true);
    ownButtonAt = Date.now();
    track("stories_tab_opened");
    if (!instagramNavigate(STORIES_HOME)) location.assign(STORIES_HOME);
  }
  function tapHaptic() {
    try { window.webkit.messageHandlers.konvoStore.postMessage({cmd:"haptic",id:0,productId:""}); }
    catch (e) {}
  }
  function nativeModalOpen() {
    return Array.prototype.some.call(document.querySelectorAll('[role="dialog"]'), function (dialog) {
      var rect = dialog.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !dialog.closest('[hidden],[aria-hidden="true"]');
    });
  }
  function canRefreshStories() {
    return storiesHome() && storiesAccess() && !document.hidden &&
      !document.querySelector("#im-pay,#im-sheet,#im-pass-sheet") && !nativeReplyOverlayOpen() &&
      !nativeModalOpen();
  }
  function resetStoryPull() {
    storyPull = null; storyRefreshBusy = false;
    clearTimeout(storyRefreshTimer); storyRefreshTimer = 0;
    if (storyRefreshUI) { storyRefreshUI.hidden = true; storyRefreshUI.removeAttribute("aria-busy"); }
  }
  function showStoryRefresh(label, busy, distance) {
    if (!storyRefreshUI) {
      storyRefreshUI = document.createElement("div");
      storyRefreshUI.id = "im-stories-refresh";
      storyRefreshUI.setAttribute("role", "status");
      storyRefreshUI.setAttribute("aria-live", "polite");
      storyRefreshUI.innerHTML = '<span class="im-refresh-ring" aria-hidden="true"></span><span></span>';
      (document.body || document.documentElement).appendChild(storyRefreshUI);
    }
    storyRefreshUI.hidden = false;
    storyRefreshUI.setAttribute("aria-busy", busy ? "true" : "false");
    if (storyRefreshUI.lastChild.textContent !== label) storyRefreshUI.lastChild.textContent = label;
    storyRefreshUI.firstChild.style.transform = "rotate(" + Math.min(distance || 0, 160) * 2 + "deg)";
  }
  function reloadStoriesFromPull() {
    if (storyRefreshBusy || !canRefreshStories()) { resetStoryPull(); return; }
    storyPull = null;
    if (navigator.onLine === false) {
      showStoryRefresh("You're offline. Try again.", false);
      storyRefreshTimer = setTimeout(resetStoryPull, 2500);
      return;
    }
    storyRefreshBusy = true;
    showStoryRefresh("Refreshing Stories…", true);
    tapHaptic();
    // A deliberate user refresh loads Instagram's latest home data using the
    // existing session. Keep the document-start feed mask and account intent.
    // There is no private API, timed reload or fabricated watched-state change.
    storiesIntent(true);
    storyRefreshTimer = setTimeout(resetStoryPull, 12000);
    location.reload();
  }
  document.addEventListener("touchstart", function (e) {
    storyPull = null;
    if (storyRefreshBusy || !canRefreshStories() || e.touches.length !== 1 ||
        (document.scrollingElement && document.scrollingElement.scrollTop > 0) ||
        (e.target.closest && e.target.closest('#im-tabs,#im-stories-refresh,input,textarea,[contenteditable="true"]'))) return;
    clearTimeout(storyRefreshTimer); storyRefreshTimer = 0;
    var touch = e.touches[0];
    storyPull = {x:touch.clientX,y:touch.clientY,vertical:false,distance:0};
  }, {capture:true,passive:true});
  document.addEventListener("touchmove", function (e) {
    if (!storyPull) return;
    if (e.touches.length !== 1 || !canRefreshStories()) { resetStoryPull(); return; }
    var dx = e.touches[0].clientX - storyPull.x, dy = e.touches[0].clientY - storyPull.y;
    if (!storyPull.vertical) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
      // Give horizontal/diagonal drags entirely to Instagram's carousel.
      if (dy <= 0 || Math.abs(dx) >= dy * .75) { resetStoryPull(); return; }
      storyPull.vertical = true;
    }
    storyPull.distance = Math.max(0, dy);
    if (e.cancelable) e.preventDefault();
    showStoryRefresh(dy >= 100 ? "Release to refresh" : "Pull to refresh", false, dy);
  }, {capture:true,passive:false});
  document.addEventListener("touchend", function (e) {
    if (!storyPull) return;
    var refresh = storyPull.vertical && storyPull.distance >= 100;
    // A vertical pull beginning on a circle must not become a Story tap.
    if (storyPull.vertical && e.cancelable) e.preventDefault();
    if (refresh) reloadStoriesFromPull(); else resetStoryPull();
  }, {capture:true,passive:false});
  document.addEventListener("touchcancel", resetStoryPull, {capture:true,passive:true});
  document.addEventListener("visibilitychange", function () { if (document.hidden) resetStoryPull(); });
  function storyControls() {
    // Instagram uses UL/LI on desktop and direct DIV children in the iPhone
    // carousel (verified over USB). Identify the native Story button itself,
    // not one platform's container. Article avatars are never sources.
    var candidates = Array.prototype.filter.call(document.querySelectorAll(
      'main [role="button"],main button'), function (el) {
      return !el.closest("article") && el.querySelectorAll("img").length === 1;
    });
    function ring(el) { return el.querySelectorAll("canvas").length === 1; }
    var controls = candidates.filter(function (el) {
      // iPhone's own circle has no aria-label or ring when no Story is active.
      // Its native file input and plus glyph distinguish it from feed creation.
      var ownPicker = el.querySelector('form input[type="file"][accept*="image/"]') &&
        (ring(el) || (el.querySelector('svg line[x1="12"][x2="12"][y1="3"][y2="21"]') &&
        el.querySelector('svg line[x1="21"][x2="3"][y1="12"][y2="12"]')));
      return ownPicker || (ring(el) && el.hasAttribute("aria-label") &&
        /^[A-Za-z0-9._]{1,30}$/.test(el.textContent.trim()));
    });
    // An active own Story may use a localized "Your story" caption. Keep the
    // first ring in an already verified tray without depending on English.
    controls.slice().forEach(function (control) {
      var first = control.closest("ul") ? control.closest("ul").firstElementChild : control.parentElement.firstElementChild;
      var own = candidates.find(function (el) { return (el === first || first.contains(el)) && ring(el); });
      if (own && controls.indexOf(own) === -1) controls.unshift(own);
    });
    return controls;
  }
  function nativeStoryEditor() {
    if (!storyCreationRoute()) return null;
    // Actual iPhone editor: a full-screen SECTION with direct canvas layers,
    // a toolbar HEADER and a share FOOTER. Never reveal a feed ancestor.
    return Array.prototype.find.call(document.querySelectorAll("section"), function (el) {
      return !el.closest("main,article") && !el.querySelector("main,article") &&
        el.querySelector(":scope > canvas") && el.querySelector(":scope > header button") &&
        el.querySelector(':scope > footer [role="button"],:scope > footer button');
    }) || null;
  }
  function nativeStoryPlayers() {
    var players = new Set();
    if (!/^\/stories\//.test(location.pathname)) return players;
    function liveBoundary(el) {
      if (!el || !el.isConnected || el.closest("main,article") || el.querySelector("main,article")) return false;
      for (var parent = el; parent && parent !== document.body; parent = parent.parentElement) {
        if (parent.hidden || parent.getAttribute("aria-hidden") === "true" || getComputedStyle(parent).display === "none") return false;
      }
      return true;
    }
    // Instagram replaces the photo/video between Story taps while retaining
    // its player shell. A temporary absence of media is not a closed player.
    // Keep that already verified boundary (and its controls) visible until
    // Instagram removes/hides it or navigation leaves the Story route.
    storiesPlayers.forEach(function (player) {
      if (liveBoundary(player) && player.querySelector(STORY_CLOSE)) players.add(player);
    });
    // The iPhone viewer is a DIV portal, while desktop uses a SECTION.
    // Instagram can retain an earlier Close icon in the hidden home tree.
    // Find the smallest boundary containing a Close control and Story media,
    // never a boundary containing the feed or just the header's tiny avatar.
    var closes = document.querySelectorAll(STORY_CLOSE);
    for (var i = 0; i < closes.length; i++) {
      if (!liveBoundary(closes[i])) continue;
      for (var el = closes[i].parentElement; el && el !== document.body; el = el.parentElement) {
        if (el.matches("main,article") || el.querySelector("main,article") || getComputedStyle(el).display === "none") break;
        if (el.querySelector("video") || Array.prototype.some.call(el.querySelectorAll("img"), function (img) {
          return img.getBoundingClientRect().height > 100;
        })) { players.add(el); break; }
      }
    }
    return players;
  }
  function refreshStorySurface() {
    var players = nativeStoryPlayers();
    // Instagram's cube transition renders outgoing and incoming Story panes
    // together. Reveal each verified native pane, leaving their animation and
    // stacking to Instagram; selecting only the first Close hides the next one.
    storiesPlayers.forEach(function (player) {
      if (!players.has(player)) player.classList.remove("im-stories-player");
    });
    players.forEach(function (player) { player.classList.add("im-stories-player"); });
    storiesPlayers = players;
    return players;
  }
  function dismissStoriesAnnouncement() {
    if (!storiesHome() || !storiesAccess()) return;
    document.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach(function (dialog) {
      if (acknowledgedStoryNotices.has(dialog) || dialog.closest("main,article") ||
          dialog.querySelector('form,input,textarea,select,a[href],[contenteditable="true"]')) return;
      var buttons = dialog.querySelectorAll('button,[role="button"]');
      if (buttons.length !== 1 || buttons[0].disabled || buttons[0].getAttribute("aria-disabled") === "true") return;
      // This exact celebratory inbox sprite identifies Instagram's "messaging
      // tab has a new look" notice across languages (inspected on iPhone).
      // Require both exact English sentences if Instagram changes the sprite.
      // Never blanket-click OK or remove modal DOM: its own callback must
      // release Instagram's focus/scroll lock and record acknowledgement.
      var knownIcon = Array.prototype.some.call(dialog.querySelectorAll('i[role="img"][data-visualcompletion="css-img"]'), function (icon) {
        return /\/rsrc\.php\/y0\/r\/r-Dq8k6uHHA\.webp(?:["')?]|$)/.test(icon.style.backgroundImage);
      });
      var text = Array.prototype.map.call(dialog.querySelectorAll("span"), function (el) { return el.textContent.trim(); });
      var knownCopy = text.indexOf("The messaging tab has a new look") !== -1 &&
        text.indexOf("You can now go to your inbox by tapping this icon.") !== -1;
      if (!knownIcon && !knownCopy) return;
      acknowledgedStoryNotices.add(dialog);
      buttons[0].click();
    });
  }
  function refreshStories() {
    if (!storiesGuardRoute()) { stopStories(); return; }
    if (!storiesHome() && !storiesIntent()) return;
    if (!storiesAccess()) { location.replace("/direct/inbox/"); return; }
    if (!document.body) return;
    dismissStoriesAnnouncement();
    if (!storiesActive) {
      storiesActive = true;
      storiesStarted = Date.now(); storiesReported = {slow:false,ready:false};
    }
    // The feed stays hidden even while React leaves its old tree mounted.
    refreshStorySurface();
    Array.prototype.forEach.call(document.querySelectorAll("video,audio"), function (media) {
      if (!media.closest(".im-stories-player") && !media.paused) media.pause();
    });
    var editor = nativeStoryEditor();
    if (storiesEditor !== editor) {
      if (storiesEditor) storiesEditor.classList.remove("im-stories-editor");
      storiesEditor = editor;
      if (editor) editor.classList.add("im-stories-editor");
    }
    var controls = storiesHome() ? storyControls() : [], nodes = new Set(), lists = new Set(), scrollers = new Set();
    // Native discard/keep and editor dialogs are rendered outside the canvas.
    if (editor) Array.prototype.forEach.call(document.querySelectorAll('[role="dialog"]'), function (dialog) {
      if (!dialog.closest("main,article") && !dialog.querySelector("main,article")) nodes.add(dialog);
    });
    controls.forEach(function (control) {
      nodes.add(control); lists.add(control.closest("ul") || control.parentElement);
    });
    lists.forEach(function (list) {
      nodes.add(list);
      // Visible children of a visibility:hidden overflow container can be
      // tapped and moved with scrollLeft, but cannot be finger-scrolled.
      // Reveal only the native horizontal scroller itself, never its subtree.
      for (var scroll = list, level = 0; scroll && level < 5; level++, scroll = scroll.parentElement) {
        if (scroll.matches("main,article") || scroll.querySelector("article")) break;
        if (scroll.clientWidth > 0 && scroll.scrollWidth > scroll.clientWidth &&
            /^(auto|scroll)$/.test(getComputedStyle(scroll).overflowX)) {
          nodes.add(scroll); scrollers.add(scroll); break;
        }
      }
      // Keep Instagram's own carousel arrows, including translated buttons.
      // Never reveal their parent container: it may also contain feed content.
      var container = list.parentElement;
      for (var depth = 0; container && depth < 4; depth++, container = container.parentElement) {
        if (container.querySelector("article")) break;
        Array.prototype.forEach.call(container.querySelectorAll(
          'button[aria-label="Next"],button[aria-label="Previous"],button:has(svg[aria-label="Next"]),' +
          'button:has(svg[aria-label="Previous"]),button[aria-label][tabindex="-1"]'), function (button) {
          if (button.closest("li,article")) return;
          var r = button.getBoundingClientRect(), tray = list.getBoundingClientRect();
          if (/^(Next|Previous)$/.test(button.getAttribute("aria-label")) ||
              button.querySelector('svg[aria-label="Next"],svg[aria-label="Previous"]') ||
              (r.width > 0 && r.bottom > tray.top && r.top < tray.bottom &&
                (r.left > tray.left + tray.width / 2 || r.right < tray.left + tray.width / 2))) nodes.add(button);
        });
      }
    });
    storiesNodes.forEach(function (el) {
      if (!nodes.has(el)) el.classList.remove("im-story-native", "im-stories-tray", "im-stories-scroll", "im-story-dialog");
    });
    nodes.forEach(function (el) { el.classList.add(scrollers.has(el) ? "im-stories-scroll" : lists.has(el) ? "im-stories-tray" : el.getAttribute("role") === "dialog" ? "im-story-dialog" : "im-story-native"); });
    storiesNodes = nodes;
    if (!storiesHome()) return;
    if (!controls.length && Date.now() - storiesStarted > 12000 && !storiesReported.slow) {
      storiesReported.slow = true; track("stories_loading_slow");
    }
    if (controls.length && !storiesReported.ready) {
      storiesReported.ready = true;
      track("stories_ready", {count:new Set(controls.map(function (el) { return el.textContent.trim(); })).size,ms:Date.now()-storiesStarted});
    }
  }
  // Observe native taps without replacing Instagram's handler or DOM nodes.
  document.addEventListener("click", function (e) {
    var control = e.target.closest && e.target.closest(".im-story-native");
    if (storiesHome() && control && control.querySelector("canvas") && !document.getElementById("im-pay")) {
      storiesStarted = Date.now(); track("story_open_tapped");
    }
  }, true);
  function stopStories() {
    if (storiesObserver) { storiesObserver.disconnect(); storiesObserver = null; }
    clearTimeout(storiesTimer); storiesTimer = 0;
    storiesPlayers.forEach(function (player) { player.classList.remove("im-stories-player"); });
    storiesPlayers.clear();
    if (storiesEditor) { storiesEditor.classList.remove("im-stories-editor"); storiesEditor = null; }
    storiesNodes.forEach(function (el) { el.classList.remove("im-story-native", "im-stories-tray", "im-stories-scroll", "im-story-dialog"); });
    storiesNodes.clear(); storiesActive = false;
  }
  function syncStories() {
    if (!storiesGuardRoute()) { stopStories(); return; }
    refreshStories();
    if (!storiesObserver) {
      storiesObserver = new MutationObserver(function () {
        // Reveal the native player in the mutation microtask, before paint.
        // The tray/feed scan can wait; holding a mounted player hidden for
        // its old 100ms debounce produced a visible black flash on iPhone.
        if (document && document.documentElement && storiesIntent() && /^\/stories\//.test(location.pathname)) {
          refreshStorySurface();
          return;
        }
        if (storiesTimer) return;
        storiesTimer = setTimeout(function () { storiesTimer = 0; refreshStories(); }, 100);
      });
      storiesObserver.observe(document.documentElement, {childList:true,subtree:true});
    }
  }
  document.addEventListener("play", function (e) {
    // play can arrive before the DOM observer tags the newly mounted viewer.
    if (!document.documentElement.classList.contains("im-stories-guard")) return;
    var allowed = false;
    refreshStorySurface().forEach(function (player) { if (player.contains(e.target)) allowed = true; });
    if (!allowed) e.target.pause();
  }, true);
  // The inbox proper only. Message Requests (/direct/requests/) is a pushed
  // page like a thread: its back arrow returns to the inbox, and counting
  // it as the inbox hid that arrow (user report, Sep 5).
  function atInbox() {
    return /^\/direct\/(inbox)?\/?$/.test(location.pathname);
  }
  // This is Instagram's mobile account switcher: a heading inside a
  // button with the down-chevron icon. Scope to the inbox; notification
  // headings and conversation participants are never account identities.
  function rememberInboxAccount() {
    if (!atInbox()) return "";
    var uid = (document.cookie.match(/(?:^|; )ds_user_id=([0-9]+)/) || [])[1];
    if (!uid) return "";
    var headings = document.querySelectorAll('[role="button"] h1,[role="button"] h2,button h1,button h2');
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i], button = h.closest('[role="button"],button');
      var arrow = button && button.querySelector('svg path[d^="M12 17.502"]');
      var name = (h.textContent || "").trim(), r = h.getBoundingClientRect();
      if (!arrow || !/^[A-Za-z0-9._]{1,30}$/.test(name) || r.width === 0 || r.top < 0 || r.top > 130) continue;
      try { localStorage.konvoHandle = name; localStorage.konvoHandleUid = uid; localStorage.removeItem("konvoMe"); } catch (e) {}
      return name;
    }
    return "";
  }
  // Keep Instagram's own viewport sizing. Scaling a thread also scales a
  // fullscreen reel opened in place and can crop its right edge.
  // The inbox title (your username + chevron) renders smaller and sits
  // further left than the native app's. No CSS selector for it survives
  // Instagram's class churn, so find it the way findMe() does - the
  // username-shaped leaf in the top strip - and style that element.
  // ponytail: measured 18% short of native; re-measure if their header
  // changes shape.
  // Runs ONCE per arrival at the inbox, never on the tick: this is a
  // whole-document scan plus getBoundingClientRect (forced layout), and on
  // an 800ms timer it was a guaranteed hitch while scrolling.
  var titleSized = false, titleEl = null, titleMo = null;
  function sizeInboxTitle() {
    if (titleSized || !atInbox()) return;
    var els = document.querySelectorAll("span,h1,div");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.childElementCount || el.dataset.imTitle) continue;
      var t = (el.textContent || "").trim();
      if (!/^[A-Za-z0-9._]{2,30}$/.test(t)) continue;
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.top < 0 || r.top > 120) continue;
      // Latched only on a match (Sep 2): an early sweep on an inbox that
      // had not painted its header yet used to give up for good, and the
      // handle (the invite code) never arrived.
      titleSized = true;
      el.dataset.imTitle = "1";
      el.style.fontSize = "23px";
      el.style.fontWeight = "700";
      el.style.letterSpacing = "-0.02em";
      titleEl = el;
      // Watch the row it lives in: Instagram rebuilds this header when you
      // come back from a chat, and a rebuilt element carries none of our
      // styling, so the name flashed at its original size first.
      if (titleMo) titleMo.disconnect();
      var host = el.parentElement && el.parentElement.parentElement;
      if (host && window.MutationObserver) {
        titleMo = new MutationObserver(function () {
          if (titleEl && titleEl.isConnected) return;
          titleSized = false;
          sizeInboxTitle();
        });
        titleMo.observe(host, { childList: true, subtree: true });
      }
      return;
    }
  }

  function sizeViewport() {
    // Shared media opens over a thread without changing its URL. Zooming the
    // root clips 100vw players and resizes the page during chat navigation.
    if (document.documentElement.style.zoom) document.documentElement.style.zoom = "";
  }

  // Bridge to KonvoStore.swift. Fire-and-forget postMessage with a numbered
  // callback; Swift replies through __konvoStoreReply. A build without the
  // Swift class (or the tests) has no handler - the catch answers null and
  // everything degrades to "no verdict, keep the cache". Hoisted to the
  // top level Aug 17: the session rescue in enforce() needs it too, not
  // just the wall.
  var pending = {}, seq = 0;
  window.__konvoStoreReply = function (id, res) {
    var cb = pending[id];
    delete pending[id];
    if (cb) cb(res || null);
  };
  function storekit(cmd, productId, cb, checkout) {
    seq++;
    pending[seq] = cb;
    if(cmd === "products") {
      (function(id){setTimeout(function(){if(pending[id])pending[id]({ok:false,reason:"products_timeout"});},20000);})(seq);
    }
    try {
      window.webkit.messageHandlers.konvoStore.postMessage(
        { cmd: cmd, id: seq, productId: productId || "", checkout: checkout || undefined });
    } catch (e) { delete pending[seq]; cb(null); }
  }

  // One settle for every "report when the page finishes rendering" need.
  // Owns its observer, its tick, and a completion latch; the latch, not
  // clearInterval, is what guarantees one report - a field device fired a
  // completion branch every 92ms for 17 seconds with clearInterval doing
  // nothing (Aug 17, TestFlight 52). Starting a settle cancels the one
  // before it, so a crossing mid-settle reports nothing for the abandoned
  // page. `ready` gates completion (a quiet skeleton is not ready); the
  // cap reports regardless so a stuck page is visible, not silent.
  var activeSettle = null;
  function settle(ready, capMs, done) {
    if (activeSettle) activeSettle();
    if (!window.MutationObserver) return;
    var mo = null, tick = null, finished = false;
    var last = Date.now(), t0 = last;
    var stop = activeSettle = function () {
      finished = true;
      if (tick) clearInterval(tick);
      if (mo) { mo.disconnect(); mo = null; }
    };
    try {
      mo = new MutationObserver(function () { last = Date.now(); });
      mo.observe(document.body || document.documentElement,
        { childList: true, subtree: true });
      tick = setInterval(function () {
        if (finished) return;
        var now = Date.now();
        if ((ready() && now - last > 180) || now - t0 > capMs) {
          stop();
          done(now - t0);
        }
      }, 90);
    } catch (e) { stop(); }
  }

  // Login drop-off detail (Aug 23): what people DO on Instagram's own
  // pages before they vanish. Taps by button label, submits, the error
  // Instagram shows (classified into an enum, never quoted), and the
  // moment the app goes to the background with a login page up. Stage
  // names and enums only; nothing typed is ever read, and a "Continue as
  // <name>" button loses its name.
  var loginWatched = false, loginSubmits = 0, loginT0 = Date.now(), lastSubmitAt = 0;
  // React can submit without a form event. Recognize the action itself;
  // showing a password or dismissing a dialog is not a submission. Never
  // inspect field values to infer intent. The form listener covers other
  // languages and keyboard submission; duplicate events are coalesced.
  function noteSubmit(st) {
    if (Date.now() - lastSubmitAt < 800) return;
    lastSubmitAt = Date.now();
    loginSubmits++;
    dropKeyTip();
    track("login_submitted", { stage: st, attempt: loginSubmits });
  }
  var loginErrorsSeen = {};
  // The signed-out chain on instagram.com. reset and signup joined Sep 1
  // for the sheet; their login_step / login_left rows are the reset
  // route's own measure.
  function loginStage() {
    var p = location.pathname;
    return p.indexOf("/challenge") !== -1 ? "challenge"
      : p.indexOf("two_factor") !== -1 ? "two_factor"
      : p.indexOf("/accounts/password/reset") === 0 ? "reset"
      : p.indexOf("/accounts/emailsignup") === 0 ? "signup"
      : p.indexOf("/accounts/login") === 0 ? "login" : null;
  }
  function signedIn() { return /(?:^|; )ds_user_id=\d/.test(document.cookie); }
  // Passive diagnostics. No inactivity timeout, field values, URLs, or page
  // text. Foreground time excludes time spent in Passwords/another app.
  var loginReadyStages = {}, loginDetectedStages = {}, loginSlowStages = {}, loginStageForegroundStart = {};
  var loginReadinessStage = null, resetState = null;
  var loginForegroundMs = 0, loginForegroundAt = Date.now(), loginHiddenAt = 0;
  function loginForegroundTime() {
    return loginForegroundMs + (document.visibilityState === "hidden" ? 0 : Date.now() - loginForegroundAt);
  }
  function visibleLoginField(el) {
    if (el.disabled || el.readOnly) return false;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom <= 0 || r.top >= window.innerHeight ||
        r.right <= 0 || r.left >= window.innerWidth) return false;
    for (var p = el; p && p.nodeType === 1; p = p.parentElement) {
      var css = getComputedStyle(p);
      if (p.hidden || css.display === "none" || css.visibility === "hidden" ||
          css.visibility === "collapse" || css.opacity === "0") return false;
    }
    return true;
  }
  function loginFields(st) {
    // Recovery accepts email, phone OR username. Its field name is not the
    // same as the sign-in page's. Scope the broader selector to recovery.
    return document.querySelectorAll(st === "reset"
      ? 'input:not([type]),input[type=text],input[type=email],input[type=tel],input[type=password],input[autocomplete=one-time-code]'
      : 'input[name=username],input[name=email],input[type=password],input[autocomplete=one-time-code],input[name*=verification i],input[name*=code i]');
  }
  function checkLoginReadiness(st) {
    if (document.visibilityState === "hidden") return;
    if (loginReadinessStage !== st) {
      loginReadinessStage = st;
      delete loginReadyStages[st]; delete loginDetectedStages[st]; delete loginSlowStages[st];
      loginStageForegroundStart[st] = loginForegroundTime(); resetState = null;
    }
    if (loginReadyStages[st] && st !== "reset") return;
    if (loginStageForegroundStart[st] === undefined) loginStageForegroundStart[st] = loginForegroundTime();
    var stageForegroundMs = loginForegroundTime() - loginStageForegroundStart[st];
    var fields = loginFields(st), visibleField = false;
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (!visibleLoginField(field)) continue;
      visibleField = true;
      if (!loginDetectedStages[st]) {
        loginDetectedStages[st] = true;
        track("login_form_detected", { stage: st, ms: Date.now() - loginDocumentStartedAt });
      }
      clearBootOverlay("form_visible");
      // A cookie prompt or another page overlay may still cover the field.
      // Only report ready once an input can actually receive a tap.
      var r = field.getBoundingClientRect();
      var x = Math.max(0, Math.min(window.innerWidth - 1, r.left + r.width / 2));
      var y = Math.max(0, Math.min(window.innerHeight - 1, r.top + r.height / 2));
      var hit = document.elementFromPoint && document.elementFromPoint(x, y);
      if (hit !== field) continue;
      if (!loginReadyStages[st]) {
        loginReadyStages[st] = true;
        track("login_form_ready", { stage: st, ms: Date.now() - loginDocumentStartedAt,
          foreground_ms: stageForegroundMs, load_state: document.readyState });
      }
      if (st === "reset" && resetState !== "form_ready") {
        resetState = "form_ready";
        track("login_reset_state", { stage: st, state: resetState, foreground_ms: stageForegroundMs });
      }
      return;
    }
    // After requesting a link Instagram can show instructions with no input.
    // We cannot distinguish that from an unrecognized/loading page without
    // reading private content. Report an ambiguous state, never a false stall
    // or reset-success claim. No timers navigate, refocus, or clear fields.
    if (st === "reset" && !visibleField) {
      if (stageForegroundMs >= 8000 && resetState !== "no_input") {
        resetState = "no_input";
        track("login_reset_state", { stage: st, state: resetState, foreground_ms: stageForegroundMs });
      }
      return;
    }
    if (!loginSlowStages[st] && stageForegroundMs >= 8000) {
      loginSlowStages[st] = true;
      track("login_loading_slow", { stage: st, foreground_ms: stageForegroundMs,
        form_detected: !!loginDetectedStages[st] });
    }
  }
  function classifyLoginError(t) {
    t = t.toLowerCase();
    if (/password was incorrect|incorrect password/.test(t)) return "wrong_password";
    if (/doesn.t belong to an account|username you entered|can.t find an account/.test(t)) return "no_account";
    if (/security code|check the code|code you entered|code is incorrect/.test(t)) return "two_factor_code";
    if (/wait a few minutes|try again later|too many|limit/.test(t)) return "rate_limited";
    if (/suspicious|confirm it.s you|unusual|verify/.test(t)) return "challenge";
    if (/went wrong|error occurred|try again/.test(t)) return "generic";
    return "other";
  }
  function watchLogin() {
    if (loginWatched) return;
    loginWatched = true;
    document.addEventListener("click", function (e) {
      var st = loginStage();
      var b = e.target && e.target.closest && e.target.closest("button,[role=button],a");
      if (!st || !b) return;
      // The sheet's own buttons report as login_sheet, not as taps on
      // Instagram's page.
      if (b.closest("#im-sheet,#im-reset-bar,#im-login-help")) return;
      var label = (b.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!label) return;
      label = label.replace(/^(continue|log in) as .*$/, "$1 as").slice(0, 24);
      track("login_tap", { stage: st, label: label });
      var submitAction = st === "login"
        ? /^(log in|login|sign in|continue as|log in as|se connecter|connexion|登入|登录|로그인)$/.test(label)
        : st === "reset"
          ? /^(send login link|reset password|envoyer.*lien|réinitialiser.*|傳送登入連結|发送登录链接|비밀번호 재설정)$/.test(label)
          : /^(confirm|verify|submit|confirmer|確認|确认|확인)$/.test(label);
      if (b.tagName !== "A" && !b.disabled &&
          (submitAction || (b.type === "submit" && b.form))) noteSubmit(st);
    }, true);
    // The keyboard's Passwords key is the whole trick and nobody looks
    // for it: say so once, the first time a login field takes focus, and
    // take it down on submit. Plain words, no promise the phone may not
    // keep (a phone with nothing saved still sees the key).
    // The fields must be named BEFORE iOS reads them, which happens at
    // focus: the 800ms sweep alone lost the race to a quick tap (build
    // 61 showed the key, 62 did not). So: the moment inputs appear, and
    // once more inside the focus event, which runs before WebKit reports
    // the focused field to the keyboard.
    try {
      new MutationObserver(function () {
        var st = loginStage();
        if (st) hintLoginFields(st);
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    document.addEventListener("focusin", function () {
      var st = loginStage();
      if (st) hintLoginFields(st);
    }, true);
    document.addEventListener("submit", function () {
      var st = loginStage();
      if (st) noteSubmit(st);
    }, true);
    document.addEventListener("visibilitychange", function () {
      var st = loginStage();
      if (document.visibilityState === "hidden") {
        if (loginHiddenAt) return;
        loginForegroundMs += Date.now() - loginForegroundAt;
        loginHiddenAt = Date.now();
        if (st) track("login_left", { stage: st, submits: loginSubmits,
          seconds: Math.round((Date.now() - loginT0) / 1000), reason: "page_hidden",
          form_ready: !!loginReadyStages[st], form_detected: !!loginDetectedStages[st] });
      } else {
        loginForegroundAt = Date.now();
        if (st && loginHiddenAt) track("login_resumed", { stage: st,
          away_ms: Date.now() - loginHiddenAt, form_ready: !!loginReadyStages[st] });
        loginHiddenAt = 0;
        // Observe only. Do not reload, clear inputs, or move focus on return.
        if (st) checkLoginReadiness(st);
      }
    });
  }
  // Keychain AutoFill (Aug 23): Instagram's phone login page marks its
  // fields autocomplete="on" and keeps them outside any form, which tells
  // iOS nothing. WebKit in a third-party webview hands the keyboard a
  // content type only from the autocomplete token (Safari has its own
  // form analysis), so the saved password never surfaced. Naming the
  // fields makes the suggestion appear: one tap, Face ID, both filled.
  // The two-factor code field gets one-time-code, so the SMS code is
  // offered above the keyboard as well. Reapplied every sweep because a
  // React re-render can put the old attribute back.
  function hintLoginFields(st) {
    var i, els;
    if (st === "two_factor") {
      els = document.querySelectorAll("input[name*=code i],input[name*=verification i],input[inputmode=numeric]");
      for (i = 0; i < els.length; i++) {
        if (els[i].getAttribute("autocomplete") !== "one-time-code")
          els[i].setAttribute("autocomplete", "one-time-code");
      }
      return;
    }
    els = document.querySelectorAll("input[name=username],input[name=email]");
    for (i = 0; i < els.length; i++) {
      if (els[i].getAttribute("autocomplete") !== "username")
        els[i].setAttribute("autocomplete", "username");
    }
    els = document.querySelectorAll("input[type=password]");
    for (i = 0; i < els.length; i++) {
      var token = st === "reset" || els[i].getAttribute("autocomplete") === "new-password"
        ? "new-password" : "current-password";
      if (els[i].getAttribute("autocomplete") !== token)
        els[i].setAttribute("autocomplete", token);
    }
  }
  // The hint shows the moment the sign-in form is on screen (Aug 23), not
  // on the first tap: the sweep calls this until the form exists.
  var hintShown = false, hintTries = 0;
  function showKeyTip(st) {
    // The Passwords key is an iOS keyboard affordance; a Mac has no key
    // bar above the keyboard, so the tip is iPhone-only (1.3.0 pulled it
    // from the Mac build, where it read as nonsense over the login form).
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
    if (hintShown || st !== "login") return;
    if (!document.querySelector("input[name=username],input[name=email],input[type=password]")) return;
    // Under Instagram's logo. The logo image lays out a beat after the
    // inputs, so wait for it to have a size (TestFlight 66 pinned the tip
    // to the top edge by racing it); after ~4s of sweeps, top edge it is.
    var top = 14, pinned = false;
    var logo = document.querySelector("img[alt*='Instagram' i],[aria-label='Instagram'],svg[aria-label*='Instagram' i]");
    if (logo && logo.getBoundingClientRect) {
      var r = logo.getBoundingClientRect();
      if (r.height > 0 && r.bottom < window.innerHeight / 2) {
        top = Math.round(r.bottom + 14);
        pinned = true;
      }
    }
    if (!pinned && hintTries++ < 5) return;
    hintShown = true;
    var tip = document.createElement("div");
    tip.id = "im-keytip";
    // Anchored to the page, not the viewport (Sep 1, build 99 on device):
    // the keyboard scrolls the form up and a fixed tip stayed over it.
    top += window.pageYOffset || 0;
    tip.setAttribute("style", "position:absolute;top:" + top + "px;left:16px;right:16px;" +
      "z-index:2147483646;padding:12px 18px;border-radius:18px;" +
      "background:rgba(18,22,30,.94);color:#f2f3f7;font:600 14px/1.35 -apple-system,system-ui,sans-serif;" +
      "box-shadow:0 4px 18px rgba(0,0,0,.3);text-align:center;pointer-events:none");
    tip.textContent = "Press \u201CPasswords\u201D above your keyboard and search Instagram to find your account.";
    (document.body || document.documentElement).appendChild(tip);
    track("login_keytip_shown", { stage: st });
  }
  function dropKeyTip() {
    var t = document.getElementById("im-keytip");
    if (t && t.parentNode) t.parentNode.removeChild(t);
  }
  function pollLoginErrors(st) {
    // Errors on the phone page arrive as a dialog ("Incorrect password",
    // Try again / Forgot password?), not an alert: the taps on "try again"
    // were the only witness until Sep 1. Dialogs also greet the page
    // (cookie consent fired login_error {other, submits: 0} within 4s on
    // the very first device, same day), so a dialog or live region only
    // counts once something has been submitted; the alert shapes are
    // error-only markup and always count. Stage and enum only, never text.
    var els = document.querySelectorAll("[role=alert],[id$=ErrorAlert],[data-testid*=error]" +
      (loginSubmits > 0 ? ",[role=dialog],[aria-live]" : ""));
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || "").trim();
      if (t.length < 8 || loginErrorsSeen[t]) continue;
      loginErrorsSeen[t] = 1;
      track("login_error", { stage: st, error: classifyLoginError(t), submits: loginSubmits });
    }
  }

  // The sign-in sheet (Sep 1): Instagram's login page framed the way
  // Safari's in-app sheet frames a page - the lock, the real address,
  // reload, and a footer naming whose page it is - so signing in feels
  // like signing in on Instagram, because it is. Drawn by the cage inside
  // the one webview, never a real Safari controller: that one keeps its
  // own cookies and consumer Instagram has no way to hand the session
  // back. The strip reads location, so it cannot lie. Up on every
  // signed-out page of the chain, down the moment the session cookie
  // exists; iPhone only, the Mac has a window. No Done: there is nothing
  // behind the sheet to go back to (the onboarding bounces straight here
  // once finished), and the Konvo page that stood in for it read as a
  // stray screen on the phone (Matthew, build 99). Instagram's own
  // "Forgot password?" is the reset route; the sheet gives that page its
  // own footer line and a way back when the app returns from the email.
  // The sheet rises once, on first arrival, like a presented sheet; the
  // band above it is native (appearance "black") and goes with the sheet.
  // Half of the people lost at login never touched the page (95 of 193
  // in the week before this); the sheet is for them.
  var resetBarShown = false, footLine = "", pageAppearance = "", helpStage = null;
  function closeLoginHelp() {
    var panel = document.getElementById("im-login-help");
    if (panel) panel.remove();
    var toggle = document.querySelector("#im-sheet [data-act=login_help]");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }
  function showLoginHelp() {
    if (document.getElementById("im-login-help")) { closeLoginHelp(); return; }
    var panel = document.createElement("section");
    panel.id = "im-login-help";
    panel.setAttribute("aria-label", T("Sign-in help"));
    panel.innerHTML = "<b>" + T("Use your existing Instagram account.") + "</b><p>" +
      T("You can check Passwords, Notes or email, then return here to continue.") + "</p>" +
      (loginStage() === "login" ? "<button type='button' data-act='login_reset'>" + T("Reset Instagram password") + "</button>" : "") +
      "<button type='button' data-act='help_close'>" + T("Close help") + "</button>";
    panel.addEventListener("click", sheetAct);
    document.body.appendChild(panel);
    document.querySelector("#im-sheet [data-act=login_help]").setAttribute("aria-expanded", "true");
  }
  var LOCK = "<svg width='11' height='13' viewBox='0 0 11 13' aria-hidden='true'>" +
    "<path d='M2 5V4a3.5 3.5 0 0 1 7 0v1h.5A1.5 1.5 0 0 1 11 6.5v5A1.5 1.5 0 0 1 9.5 13h-8" +
    "A1.5 1.5 0 0 1 0 11.5v-5A1.5 1.5 0 0 1 1.5 5H2zm1.5 0h4V4a2 2 0 0 0-4 0v1z' fill='currentColor'/></svg>";
  function sheetLook(mode) {
    if (pageAppearance === mode) return;
    pageAppearance = mode;
    try {
      window.webkit.messageHandlers.konvoStore.postMessage(
        { cmd: "appearance", id: 0, productId: mode });
    } catch (e) {}
  }
  function sheetAct(e) {
    var t = e.target.closest && e.target.closest("[data-act]");
    if (!t) return;
    var act = t.getAttribute("data-act");
    track("login_sheet", { act: act, stage: loginStage() });
    if (act === "reset_return") location.assign("/accounts/login/");
    else if (act === "login_help") showLoginHelp();
    else if (act === "help_close") { closeLoginHelp(); document.querySelector("#im-sheet [data-act=login_help]").focus(); }
    else if (act === "login_reset" && loginStage() === "login") {
      closeLoginHelp(); location.assign("/accounts/password/reset/");
    }
    else if (act === "reload") location.reload();
  }
  function loginSheet(st) {
    // Waits for the body: the strip and footer live inside it, and the
    // rise must start with something to show.
    if (!/iPhone|iPad|iPod/.test(navigator.userAgent) || !document.body) return;
    if (helpStage !== st) { closeLoginHelp(); helpStage = st; }
    if (st !== "reset") {
      var oldResetBar = document.getElementById("im-reset-bar");
      if (oldResetBar) oldResetBar.remove();
      resetBarShown = false;
    } else if (document.getElementById("im-reset-bar")) {
      // Instagram may mount its recovery form after returning from email.
      // Withdraw our earlier prompt as soon as the live form appears.
      var recoveryFields = loginFields("reset");
      for (var rf = 0; rf < recoveryFields.length; rf++) if (visibleLoginField(recoveryFields[rf])) {
        document.getElementById("im-reset-bar").remove(); resetBarShown = false; break;
      }
    }
    var strip = document.getElementById("im-sheet"), foot;
    if (!strip) {
      var css = document.createElement("style");
      css.textContent =
        "#im-sheet,#im-sheet-foot,#im-reset-bar{display:none;font-family:-apple-system,system-ui,sans-serif;-webkit-user-select:none}" +
        "html.im-sheet{background:#000 !important}" +
        // ponytail: body padding is the push; the live page (build 99 on
        // device) obeys the top and keeps its own 100vh below, so the foot
        // of Instagram's page scrolls out from under the footer.
        "html.im-sheet body{padding-top:70px !important;padding-bottom:38px !important;box-sizing:border-box}" +
        // The rise: the whole document (page, strip, footer) slides up as
        // one sheet over the black canvas, once, on first arrival.
        "html.im-sheet.im-rise{animation:ims-rise .5s cubic-bezier(.32,.72,0,1) both}" +
        "@keyframes ims-rise{from{transform:translateY(100%)}to{transform:none}}" +
        "@media (prefers-reduced-motion:reduce){html.im-sheet.im-rise{animation:none}}" +
        "html.im-sheet #im-sheet{display:block;position:fixed;top:0;left:0;right:0;z-index:2147483646;padding-top:8px;background:#000}" +
        "#im-sheet .ims-card{background:#f7f7f7;border-radius:12px 12px 0 0;border-bottom:1px solid #d9d9de}" +
        "#im-sheet .ims-grab{width:36px;height:5px;border-radius:3px;background:#c7c7cc;margin:6px auto 0}" +
        "#im-sheet .ims-bar{display:grid;grid-template-columns:64px 1fr 64px;align-items:center;height:46px;padding:0 10px}" +
        "#im-sheet button{border:0;background:none;color:#0a84ff;font:400 21px/1 -apple-system,system-ui,sans-serif;padding:8px 6px;margin:0;text-align:right;min-height:44px}" +
        "#im-sheet [data-act=login_help]{font-size:14px;text-align:left}" +
        "#im-login-help{position:fixed;top:70px;left:12px;right:12px;z-index:2147483647;max-height:55vh;overflow-y:auto;" +
        "padding:16px;border:1px solid #d9d9de;border-radius:16px;background:#f7f7f7;color:#1c1c1e;font:14px/1.45 -apple-system,system-ui,sans-serif;box-shadow:0 6px 24px #0003}" +
        "#im-login-help b{color:#1c1c1e}#im-login-help p{margin:8px 0 12px;color:#3c3c43}" +
        "#im-login-help button{display:block;width:100%;min-height:44px;margin-top:6px;border:0;border-radius:10px;background:#0a5cf0;color:#fff;font:600 14px/1.3 -apple-system,system-ui,sans-serif}" +
        "#im-login-help [data-act=help_close]{background:#e8e8ed;color:#1c1c1e}" +
        "#im-sheet .ims-url{display:flex;align-items:center;justify-content:center;gap:5px;font-size:15px;color:#1c1c1e;white-space:nowrap;overflow:hidden}" +
        "#im-sheet .ims-url svg{color:#3c3c43;flex:none}" +
        "#im-sheet .ims-path{color:#8e8e93;overflow:hidden;text-overflow:ellipsis}" +
        "html.im-sheet #im-sheet-foot{display:flex;position:fixed;left:0;right:0;bottom:0;height:38px;z-index:2147483646;" +
        "align-items:center;justify-content:center;gap:6px;font-size:12px;color:#6b6b70;background:#f7f7f7;border-top:1px solid #d9d9de}" +
        "html.im-sheet #im-reset-bar{display:flex;position:fixed;left:16px;right:16px;bottom:50px;z-index:2147483646;align-items:center;" +
        "justify-content:space-between;gap:12px;padding:8px 8px 8px 18px;border-radius:18px;background:rgba(18,22,30,.94);color:#f2f3f7;" +
        "font:600 14px/1.35 -apple-system,system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.3)}" +
        "#im-reset-bar button{border:0;border-radius:12px;background:#0a84ff;color:#fff;font:600 15px/1 -apple-system,system-ui,sans-serif;padding:11px 16px}";
      document.head.appendChild(css);
      strip = document.createElement("div");
      strip.id = "im-sheet";
      strip.innerHTML = "<div class='ims-card'><div class='ims-grab'></div><div class='ims-bar'>" +
        "<button type='button' data-act='login_help' aria-expanded='false' aria-controls='im-login-help'>" + T("Help") + "</button>" +
        "<div class='ims-url'>" + LOCK + "<span class='ims-host'></span><span class='ims-path'></span></div>" +
        "<button data-act='reload' aria-label='" + T("Reload") + "'>↻</button></div></div>";
      strip.addEventListener("click", sheetAct);
      foot = document.createElement("div");
      foot.id = "im-sheet-foot";
      document.body.appendChild(strip);
      document.body.appendChild(foot);
      document.addEventListener("focusin", function (e) {
        if (e.target && e.target.matches("input,textarea")) closeLoginHelp();
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLoginHelp(); });
      // Back from the email with the reset page still up: one way back.
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState !== "visible" || loginStage() !== "reset" || resetBarShown) return;
        // Returning from Notes/Passwords does not mean a reset is complete.
        // Keep the recovery form unobstructed while it still has usable inputs.
        var fields = loginFields("reset");
        for (var i = 0; i < fields.length; i++) if (visibleLoginField(fields[i])) return;
        resetBarShown = true;
        var bar = document.createElement("div");
        bar.id = "im-reset-bar";
        bar.innerHTML = "<span>" + T("Reset done?") + "</span>" +
          "<button data-act='reset_return'>" + T("Sign in") + "</button>";
        bar.addEventListener("click", sheetAct);
        document.body.appendChild(bar);
      });
      // The first document of the chain rises; the pages after it (the
      // reset page, a challenge) are the same sheet, already up.
      var rise = true;
      try { rise = !sessionStorage.konvoSheet; sessionStorage.konvoSheet = "1"; } catch (e) {}
      if (rise) {
        document.documentElement.classList.add("im-rise");
        setTimeout(function () { document.documentElement.classList.remove("im-rise"); }, 700);
      }
      sheetLook("black");
    }
    foot = document.getElementById("im-sheet-foot");
    strip.querySelector(".ims-host").textContent = location.hostname.replace(/^www\./, "");
    strip.querySelector(".ims-path").textContent = location.pathname;
    var line = st === "reset" ? T("Reset it here, then come back and sign in.")
      : LOCK + "<span>" + T("Instagram's own page") + " · " + T("Konvo never reads your password") + "</span>";
    if (footLine !== line) { footLine = line; foot.innerHTML = line; }
    document.documentElement.classList.add("im-sheet");
  }
  // The session is here (this document or the one before it): the sheet
  // and its band go, and the look is the phone's again.
  function dropLoginSheet() {
    closeLoginHelp(); helpStage = null;
    var ids = ["im-sheet", "im-sheet-foot", "im-reset-bar"], had = false;
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.parentNode) { el.parentNode.removeChild(el); had = true; }
    }
    document.documentElement.classList.remove("im-sheet");
    try {
      if (sessionStorage.konvoSheet) { had = true; sessionStorage.removeItem("konvoSheet"); }
    } catch (e) {}
    if (had || !pageAppearance || pageAppearance === "black") sheetLook("auto");
  }

  // Cage exceptions were invisible until the stuck-chat hunt; three per
  // session, message only, nothing from the page's content.
  window.addEventListener("error", function (e) {
    try {
      var n = +(sessionStorage.konvoErrs || 0);
      if (n >= 3) return;
      sessionStorage.konvoErrs = n + 1;
      track("cage_error", { msg: String((e && e.message) || "").slice(0, 120) });
    } catch (x) {}
  });

  // The rating ask (moved here Aug 27, App Review 5.6.3): asked once, on
  // the third distinct day the inbox settles - by then the person has
  // signed in, come back twice, and knows what the app is. Never while
  // the wall is up (rating a paywall is not a moment), and iOS still
  // decides whether a sheet actually appears.
  // The moment within that day (Sep 1): not the inbox loading, but the
  // return to it after reading a chat - a finished task, the app having
  // just done its job. The day gate is Apple's; the moment is ours.
  var threadsThisSession = 0;
  // Distinct days the inbox settled, counted once per day. Shared by the
  // rating ask (day 3) and the block nudge (day 2).
  function useDays() {
    try {
      var today = new Date().toDateString();
      if (localStorage.konvoLastDay !== today) {
        localStorage.konvoLastDay = today;
        localStorage.konvoUseDays =
          (parseInt(localStorage.konvoUseDays, 10) || 0) + 1;
      }
      return parseInt(localStorage.konvoUseDays, 10) || 0;
    } catch (e) { return 0; }
  }
  // Assigned by the pass-button block below; false until then.
  var nudgeBlock = function (days) { return false; };
  // The reminder promise, kept without a notification permission (Sep 1):
  // from two days before the trial ends, once a day, a sheet in the inbox.
  // The push (KonvoStore "notify") is the other half; this one needs
  // nothing granted. Never under a wall.
  function trialBar() {
    var end, today;
    try {
      end = parseInt(localStorage.konvoTrialEnd, 10);
      today = new Date().toDateString();
      if (!end || document.getElementById("im-pay")) return false;
      if (localStorage.konvoTrialBarDay === today) return false;
    } catch (e) { return false; }
    var left = Math.ceil((end - Date.now()) / 86400000);
    if (left < 1 || left > 2) return false;
    try { localStorage.konvoTrialBarDay = today; } catch (e) {}
    track("trial_bar_shown", { days_left: left });
    var sheet = document.createElement("div");
    sheet.id = "im-pass-sheet";
    sheet.innerHTML = "<div id='im-pass-card'><h3>" +
      (left === 1 ? T("Your trial ends tomorrow.") : T("Your trial ends in {n} days.", { n: left })) +
      "</h3><p>" + T("Keep your hours, or cancel anytime in Settings.") + "</p>" +
      "<button class='im-x'>" + T("OK") + "</button></div>";
    sheet.addEventListener("click", function (e) {
      if (!e.target.closest(".im-x") && e.target !== sheet) return;
      if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    });
    (document.body || document.documentElement).appendChild(sheet);
    return true;
  }
  // The moment (Sep 2, Matthew): the person is in (paid, on a trial, or a
  // friend's days), has read a chat, and is back at the inbox. The day
  // gate is gone; the once-per-install flag and "never under a wall" stay.
  function maybeAskReview(days) {
    try {
      if (localStorage.konvoReviewAsked) return;
      if (!localStorage.konvoPaid && !localStorage.konvoDone) return;
      if (!threadsThisSession) return;
      if (document.getElementById("im-pay")) return;
      localStorage.konvoReviewAsked = "1";
      track("review_asked", {});
      storekit("review", null, function () {});
    } catch (e) {}
  }

  var profileRouteReady = function () {};
  function enforce() {
    if (!location.hostname.endsWith("instagram.com")) return;
    syncStories();
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) sizeViewport();
    if (atInbox()) sweepKeepBack();
    if (blocked(location.pathname)) {
      try { window.stop(); } catch (e) {}
      location.replace("/direct/inbox/");
    }
    // The 35% who start login and never arrive die somewhere in here, and
    // these routes are the only witnesses. The challenge page is the
    // emailed verification code - the wall that stopped App Review twice.
    // Stage names only, never anything from the page.
    var ls = loginStage();
    if (ls && ls !== lastLoginStage) {
      lastLoginStage = ls;
      // A signed-in visit to these routes is not login friction.
      if (!signedIn()) track("login_step", { stage: ls });
    }
    if (ls && !signedIn()) {
      try { sessionStorage.konvoLoginInteractive = "1"; } catch (e) {}
      watchLogin();
      hintLoginFields(ls);
      // The sheet pushes the page down; the key tip measures the logo
      // after that, not before, or it lands on the logo (render, Sep 1).
      loginSheet(ls);
      checkLoginReadiness(ls);
      showKeyTip(ls);
      pollLoginErrors(ls);
    } else if (signedIn()) {
      dropLoginSheet();
    }
    // Session rescue: landing on the login page with no session cookie
    // means WebKit lost the cookies (lazy disk flush plus a force-quit;
    // a tester relogged every launch, Aug 17). Native keeps a snapshot
    // from the last settled inbox; restore it once and go back. A real
    // logout restores cookies Instagram already killed server-side,
    // lands here again, and the once-flag stops the loop. Challenge and
    // 2FA pages are mid-flow and must not be interrupted.
    if (ls === "login" && !cookieRestoreTried &&
        !/(?:^|; )ds_user_id=\d/.test(document.cookie)) {
      cookieRestoreTried = true;
      storekit("cookieRestore", null, function (res) {
        if (res && res.restored) {
          track("session_restored");
          location.replace("/direct/inbox/");
        }
      });
    }
    // Route flag so CSS can hide the inbox's back-to-feed arrow while
    // keeping the thread view's back-to-inbox arrow.
    var ib = atInbox();
    document.documentElement.classList.toggle("im-inbox", ib);
    document.documentElement.classList.toggle("im-thread", /^\/direct\/t\//.test(location.pathname));
    updateBottomTabs();
    if (ib) profileRouteReady();
    // Tell the native side when the route crosses the inbox boundary: the
    // back-swipe keeps an inbox snapshot to reveal under the drag, because
    // Instagram takes ~300ms to render history.back() and the live page
    // mid-render is the glitch every naive swipe shows.
    var r = ib ? "inbox"
      : location.pathname.indexOf("/direct/t/") === 0 ? "thread" : "other";
    // Instagram ships the DM composer (a role=textbox contenteditable)
    // without autocorrect, so typing gets no correction bar. In a
    // messaging app that is a bug, not a preference. Re-asserted on the
    // tick because Instagram rebuilds the composer per thread and per
    // send; the attribute guard keeps the tick from touching a composer
    // that is already fixed. Set before focus on purpose: iOS reads
    // keyboard traits at focus time and ignores changes made after.
    if (r === "thread") {
      var tb = document.querySelector('div[role="textbox"]');
      if (tb && tb.getAttribute("autocorrect") !== "on") {
        tb.setAttribute("autocorrect", "on");
        tb.setAttribute("autocapitalize", "sentences");
        tb.setAttribute("spellcheck", "true");
      }
    }
    if (r !== lastRoute) {
      lastRoute = r;
      // Reading a conversation is the product working. Launch counts alone
      // cannot tell an open that led to a chat from one that bounced.
      // The route watcher crosses once per navigation, so no extra guard:
      // the app always loads the inbox, so the first crossing is never a
      // thread, and if it ever were, that would be a thread open too.
      if (r === "thread") {
        threadsThisSession++;
        track("thread_opened");
        // How slow switching into a chat FEELS ("way slower to text and
        // switch between ppl", Aug 17). Ready means real message rows:
        // the placeholder renders instantly, goes quiet, and fills only
        // when the fetch lands - quiet alone once reported 181ms "ready"
        // on a stuck skeleton. rows 0 at the cap IS the stuck-chat signal.
        var threadRows = function () {
          // div[role='group'] is a message bubble in Instagram's CURRENT
          // thread markup - verified against the live DOM on device (Aug
          // 31, Web Inspector probe: 9 groups on a 9-bubble chat, zero
          // role='row' anywhere). The old row selector never matched in
          // production and pinned every thread_ready at the cap with
          // rows 0 - see the konvo-dead-thread-probe memory. If rows
          // flatlines at 0 across all builds again, the markup moved
          // again: re-probe on device before trusting any thread metric.
          return document.querySelectorAll("div[role='group']").length;
        };
        // composer (Sep 7): Instagram's message box, the live-DOM selector
        // from build 94. An empty conversation has zero bubbles too, so
        // rows 0 alone cannot tell "empty and rendered" from "stuck".
        settle(function () { return threadRows() > 0; }, 10000, function (ms) {
          track("thread_ready", { ms: ms, rows: threadRows(),
            composer: !!document.querySelector("div[role='textbox']") });
        });
      }
      titleSized = false;
      if (r !== "inbox" && titleMo) { titleMo.disconnect(); titleMo = null; }
      if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
        try {
          window.webkit.messageHandlers.konvoStore.postMessage(
            { cmd: "route", id: 0, productId: r });
        } catch (e) {}
        // Arriving at the inbox: report when it FINISHES rendering - DOM
        // mutations quiet for a beat, capped hard - so the back-swipe
        // holds its snapshot until the crossfade can land on a finished
        // inbox instead of a mid-render skeleton.
        if (r === "inbox") {
          settle(function () { return true; }, 2000, function (ms) {
            sizeInboxTitle();
            // What a connected user actually finds: 20 of the first 28
            // sign-ins never opened a thread. Thread count and time to
            // a settled inbox are the two numbers that can say why.
            var rp = {
              threads: document.querySelectorAll(
                'a[href^="/direct/t/"]').length,
              ms: ms };
            // Identity for the roster, decided Aug 14: ds_user_id is
            // the stable Instagram id, titleEl (found by
            // sizeInboxTitle above) is the handle. Retries each settle
            // until a handle is captured, then never again. Threads
            // and message content stay untouched.
            try {
              var idm = document.cookie.match(/(?:^|; )ds_user_id=(\d+)/);
              // The handle is also the invite code (Sep 1): kept on every
              // settle so the invite page can build the link.
              rememberInboxAccount();
              if (idm && !localStorage.konvoIdentified) {
                // The Instagram id only (Sep 3). The username is the
                // invite code and stays in localStorage.konvoHandle; it
                // never goes to PostHog.
                rp.$set = { ig_user_id: idm[1] };
                localStorage.konvoIdentified = "1";
              }
            } catch (e) {}
            track("inbox_ready", rp);
            var days = useDays();
            if (!trialBar() && !nudgeBlock(days)) maybeAskReview(days);
            // A settled inbox is proof these cookies are the good
            // ones: snapshot them natively so a force-quit cannot
            // lose the session (see the login rescue above).
            storekit("cookieSave", null, function () {});
            try {
              window.webkit.messageHandlers.konvoStore.postMessage(
                { cmd: "route", id: 0, productId: r + "-settled" });
              // The letterbox above and below the webview is native and
              // CSS cannot reach it. Hand it the page's own background
              // so the app reads as one surface instead of a page with
              // black bars around it.
              window.webkit.messageHandlers.konvoStore.postMessage(
                { cmd: "bg", id: 0,
                  productId: getComputedStyle(document.body).backgroundColor });
            } catch (e) {}
          });
        }
      }
    }
  }
  var lastRoute = null, lastLoginStage = null;
  var cookieRestoreTried = false;
  // Every screen change gets the same push, wherever it goes - a DM, a
  // profile from a DM, a profile from search. pushState is Instagram's
  // forward navigation and popstate is a back; the native side owns the
  // animation, so this only has to say which way. Full page loads (not
  // SPA) fire neither and simply do not animate.
  // Search mode is a route the URL never changes for, so the class carries
  // it: focusing a search box unhides Instagram's own way back out.
  // Search mode outlives the keyboard, and the arrow is display:none by
  // the time we look (our own back-button CSS hides it), so its bounding
  // box is zeros and no geometry can find it - which is why the tag never
  // landed (Aug 24, device). Structure instead of geometry: the arrow that
  // belongs to search lives in the same small subtree as the search
  // input, so walk up a few levels from every text input and tag any Back
  // arrow found there. The header's escape arrow sits in another subtree
  // and stays hidden. Re-tagged every sweep because re-renders replace
  // the node; a tagged node that leaves the DOM needs no untagging.
  function sweepKeepBack() {
    var inputs = document.querySelectorAll("input[type=text],input:not([type])");
    for (var i = 0; i < inputs.length; i++) {
      var node = inputs[i];
      for (var up = 0; up < 4 && node; up++) {
        node = node.parentElement;
        if (!node || node === document.body) break;
        var arrows = node.querySelectorAll(
          "a:has(svg[aria-label='Back']),[role='button']:has(svg[aria-label='Back'])," +
          "a:has(" + BACK + "),[role='button']:has(" + BACK + ")");
        if (arrows.length) {
          for (var j = 0; j < arrows.length; j++) arrows[j].classList.add("im-keep-back");
          break;
        }
      }
    }
  }
  document.addEventListener("focusin", function (e) {
    var t = e.target;
    // Inbox only, and real inputs only: Instagram's message composer is a
    // role=textbox, so this used to fire on every tap into a chat and run
    // three document-wide :has() scans while the keyboard animated.
    if (!t || t.tagName !== "INPUT" || !atInbox()) return;
    // Instagram renders the search-mode back arrow a beat after focus, and
    // sometimes re-renders it again; one shot missed it.
    [60, 250, 600].forEach(function (ms) {
      setTimeout(sweepKeepBack, ms);
    });
  }, true);

  var isPhone = /iPhone|iPad|iPod/.test(navigator.userAgent);

  // Which destinations are worth a slide: a conversation, and a person's
  // profile. Settings, Edit profile, activity, posts - those are places a
  // button opens, not screens you walk into, and animating everything made
  // the app feel like it was constantly sliding.
  // Trailing slash OPTIONAL: Instagram pushes a profile as "/name/" from
  // some controls and "/name" from others (measured on device), and
  // requiring the slash silently dropped half the profile taps into the
  // no-animation path.
  function worthSliding(p) {
    if (/^\/direct\/t\//.test(p)) return true;
    return /^\/[A-Za-z0-9._]+\/?$/.test(p) &&
      !/^\/(accounts|explore|direct|p|reel|reels|stories|about|legal|challenge|notifications)(\/|$)/
        .test(p);
  }
  // A tap on a back arrow always pops (right to left), whatever Instagram's
  // router calls it - their Message button replays as a back, and a back
  // arrow sometimes replays as a push.
  var lastBackTap = 0, ownButtonAt = 0;
  // The tap must land ON the arrow, not merely inside something that
  // contains one: Instagram's thread header puts the back arrow and the
  // friend's name in the same control, so a "contains" test counted
  // opening their profile as pressing back and slid the wrong way.
  document.addEventListener("click", function (e) {
    var svg = e.target.closest && e.target.closest("svg");
    if (svg && svg.getAttribute("aria-label") === "Back") {
      lastBackTap = Date.now();
    }
  }, true);
  function navFor(dir) {
    var p = location.pathname;
    // Konvo's own buttons: open, do not travel.
    if (Date.now() - ownButtonAt < 800) { ownButtonAt = 0; return "push-silent"; }
    if (Date.now() - lastBackTap < 800) { lastBackTap = 0; return "pop"; }
    // A conversation and a profile are both places you go INTO, whatever
    // Instagram's router replays them as - opening someone's profile from
    // the top of a chat came through as a back and slid the wrong way.
    if (/^\/direct\/t\//.test(p) || worthSliding(p)) return "push";
    return "push-silent";
  }

  var navSuppress = 0, navPath = "", pendingChat = null;
  var pendingTabSwitch = null, tabSwipeUntil = 0, tabSwipeClick = false, lastNativeTabRoot = null;
  function nativeNav(cmd, value) {
    try { window.webkit.messageHandlers.konvoStore.postMessage({cmd:cmd,id:0,productId:value || ""}); } catch (e) {}
  }
  function cancelChatHandoff() {
    if (!pendingChat) return;
    pendingChat.cancel(); pendingChat = null;
    nativeNav("nav-cancel");
  }
  function prepareChat() { if (isPhone) nativeNav("nav-prepare"); }
  // Capture phase precedes Instagram's click handler. The live mobile inbox
  // uses full-width role=button rows, not anchors (verified on iPhone).
  document.addEventListener("click", function (e) {
    if (!isPhone || !atInbox()) return;
    var el = e.target.closest && e.target.closest("a[href], [role=button]");
    if (!el || el.closest("#im-tabs,#im-pay")) return;
    var r = el.getBoundingClientRect();
    if ((el.pathname && /^\/direct\/t\//.test(el.pathname)) ||
        (el.querySelector("img") && r.width > innerWidth * .65 && r.height >= 45 && r.height <= 120)) prepareChat();
  }, true);
  function nav(dir) {
    if (!isPhone) return;
    if (pendingTabSwitch) { pendingTabSwitch.check(); return; }
    if (navSuppress && Date.now() - navSuppress < 400 && location.pathname === navPath) return;
    navSuppress = Date.now(); navPath = location.pathname;
    cancelChatHandoff();
    if (dir !== "push" || !/^\/direct\/t\//.test(location.pathname)) { nativeNav("nav", dir); return; }
    // Keep the outgoing screen in place while Instagram replaces the DOM.
    // A composer (including an empty conversation) is the usable shell.
    var path = location.pathname, observer, timer, frame, ready = false, finished = false;
    function cancel() { finished = true; if(observer)observer.disconnect(); clearTimeout(timer); cancelAnimationFrame(frame); }
    function reveal() {
      if (finished) return;
      if (location.pathname !== path || document.hidden) { cancelChatHandoff(); return; }
      cancel(); pendingChat = null; nativeNav("nav", "push");
    }
    function check() {
      if (location.pathname !== path) { cancelChatHandoff(); return; }
      if (ready || !document.querySelector('div[role="textbox"],textarea')) return;
      ready = true;
      frame = requestAnimationFrame(function () { frame = requestAnimationFrame(reveal); });
    }
    pendingChat = {cancel:cancel};
    observer = new MutationObserver(check); observer.observe(document.body,{childList:true,subtree:true});
    timer = setTimeout(reveal, 650); // Broken/changed Instagram markup must never freeze navigation.
    check();
  }
  document.addEventListener("visibilitychange", function () { if(document.hidden)cancelChatHandoff(); });
  var push = history.pushState.bind(history);
  history.pushState = function () {
    try {
      var next = new URL(arguments[2], location.href).pathname;
      if (next !== location.pathname && /^\/direct\/t\//.test(next)) { cancelChatHandoff(); prepareChat(); }
    } catch (e) {}
    push.apply(null, arguments);
    storiesGuardRoute();
    setTimeout(function () {
      // Opening a post is not a screen you walk into sideways - the photo
      // belongs to the profile behind it, so no slide. It still has to be
      // STACKED though: without a picture of the profile underneath it,
      // swiping back out of a post revealed whatever was one level deeper
      // and stuttered while the real page caught up.
      // Report the destination route before the native navigation handler
      // chooses whether to animate it.
      enforce();
      nav(navFor("push"));
    }, 0);
  };
  var replace = history.replaceState.bind(history);
  history.replaceState = function () { replace.apply(null, arguments); storiesGuardRoute(); setTimeout(enforce, 0); };
  window.addEventListener("popstate", function () {
    // Direction follows what the user did, not what Instagram's router
    // did. Opening a conversation from a profile's Message button is a
    // step INTO something even though their router replays it as a back,
    // and animating that leftwards feels like the app went backwards.
    enforce();
    setTimeout(function () { nav(navFor("pop")); }, 0);
  });
  document.addEventListener("DOMContentLoaded", enforce);
  setInterval(enforce, 800); // SPA belt-and-braces: some route changes skip history APIs

  // The native app's little tap when a message sends. The selector is a
  // guess at Instagram's send control, patchable as sendSel in the
  // cage-patch; a miss costs the buzz and nothing else.
  var SEND_SEL = "div[role=button][aria-label*='Send' i],button[aria-label*='Send' i]";
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest(SEND_SEL);
      if (!t) return;
      try {
        window.webkit.messageHandlers.konvoStore.postMessage(
          { cmd: "haptic", id: 0, productId: "" });
      } catch (err) {}
    }, true);
  }

  // Remote hotfix channel - config, NOT code. Instagram ships DOM changes on
  // its schedule and App Review takes days; a static JSON on konvoinstall.com
  // closes that gap: extra hide-selectors, extra CSS, extra bounce patterns,
  // live one git push after Meta breaks something. Strictly additive - the
  // baseline cage in this binary always applies - and remote JS is
  // deliberately NOT supported: selectors and regexes are data, downloadable
  // code is an App Review 2.5.2 rejection. Last good patch is cached so an
  // offline launch keeps yesterday's fix; a failed fetch changes nothing.
  function applyPatch(p) {
    if (!p) return;
    try {
      var extra = "";
      if (p.hide && p.hide.length) extra += p.hide.join(",") + "{display:none !important;}";
      if (p.css) extra += p.css;
      if (extra) {
        var st = document.createElement("style");
        st.textContent = extra;
        (document.head || document.documentElement).appendChild(st);
      }
      (p.block || []).forEach(function (s) { FEED.push(new RegExp(s)); });
      // {"superwall": true} switches the paywall from the injected wall to
      // the native Superwall placement (KonvoStore). Off until campaigns
      // exist in the Superwall dashboard; flipping it back off is the
      // kill switch if a remote paywall misbehaves.
      if (p.superwall) window.__konvoSW = true;
      // {"rcPaywall": true} (Sep 1) puts RevenueCat's remotely designed
      // paywall on the price step; the injected price screen stays the
      // floor. Off until the paywall exists in RevenueCat's dashboard;
      // flipping it off is the kill switch.
      if (p.rcPaywall) window.__konvoRC = true;
      // {"betaFree": false} withdraws the free-during-beta button
      // from tester builds without shipping anything.
      if (p.betaFree === false) window.__konvoNoFree = true;
      if (p.sendSel) SEND_SEL = p.sendSel;
      enforce();
    } catch (e) {}
  }
  try { applyPatch(JSON.parse(localStorage.konvoPatch || "null")); } catch (e) {}
  fetch("https://konvoinstall.com/cage-patch.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (p) {
      if (!p) return;
      try { localStorage.konvoPatch = JSON.stringify(p); } catch (e) {}
      applyPatch(p);
    })
    .catch(function () {});

  // Sleep/wake, desktop only: after the machine sleeps, Instagram's live
  // connection is dead but the page still looks fine, so the inbox silently
  // stops updating and the app feels hung. Timers do not fire while asleep, so
  // a gap between ticks is the signal - more reliable than visibilitychange,
  // which does not fire consistently across sleep on macOS.
  //
  // Must NOT run on iOS. iOS suspends timers every time the app is
  // backgrounded, so the same check fires on any return after five minutes and
  // reloads instagram.com from scratch - a 5-10s wait every single time you
  // open the app. iOS already evicts and reloads the webview on its own when it
  // needs to, so there is nothing here for us to fix.
  // ponytail: full reload, which drops an unsent draft. Reconnecting instead
  // would mean driving Instagram's own minified socket code.
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    var tick = Date.now();
    setInterval(function () {
      var now = Date.now();
      if (now - tick > 300000) location.reload(); // 5 min of missing ticks
      tick = now;
    }, 30000);

    // Real-time unread notifications. The Mac app keeps running while hidden,
    // so this keeps ticking after the window is closed. Polls the same badge
    // endpoint Instagram's own web client polls for its tab badge - same
    // origin, same session, same fingerprint, so nothing about it looks
    // foreign. Notify only on an increase and only while the window is not
    // being looked at; reading threads lowers the count and resets the
    // baseline by itself. The invoke is a no-op unless the notification
    // capability granted it (macOS only), and any failure stays silent.
    // ponytail: a 30s poll, not Instagram's realtime socket - worst case a
    // message is 30s late. Driving their minified MQTT code is not worth it.
    var lastBadge = null;
    setInterval(function () {
      fetch("/api/v1/direct_v2/get_badge_count/", {
        headers: { "X-IG-App-ID": "936619743392459" }
      }).then(function (r) { return r.json(); }).then(function (d) {
        var n = d && typeof d.badge_count === "number" ? d.badge_count : null;
        if (n === null) return;
        if (lastBadge !== null && n > lastBadge && window.__TAURI_INTERNALS__ &&
            (document.hidden || !document.hasFocus())) {
          window.__TAURI_INTERNALS__.invoke("plugin:notification|notify", {
            options: {
              title: "Konvo",
              body: n === 1 ? "1 unread conversation" : n + " unread conversations"
            }
          }).catch(function () {});
        }
        lastBadge = n;
      }).catch(function () {});
    }, 30000);
  }

  // Hide every navigation doorway. Desktop: the left rail. Mobile web: the
  // bottom tab bar (same aria-labels, different containers) plus the
  // "open the app" upsells and the inbox back arrow.
  // Instagram localizes every aria-label (French phone, live DOM, Aug 31:
  // "Précédent", "Options", "Parcourir"), so a door keyed on English text
  // stays open abroad. Hrefs and SVG geometry do not translate: the back
  // chevron is this polyline in every locale, verified on that DOM.
  var BACK = 'polyline[points="9.276 4.726 2.001 12.004 9.276 19.274"]';
  var css = [
    'a:has(svg[aria-label="Home"])',
    'a[href="/"]',
    'a:has(svg[aria-label="Explore"])',
    'a[href="/explore/"]',
    'a:has(svg[aria-label="Reels"])',
    'a[href^="/reels/"]',
    '[role="link"]:has(svg[aria-label="Search"])',
    'a:has(svg[aria-label="Search"])',
    'div[role="button"]:has(svg[aria-label="Search"])',
    // The notifications heart is phone-only, pushed on below.
    'a:has(svg[aria-label="Profile"])',
    // The Messages nav entry stays. It used to be redundant - every screen was
    // already a DM screen - but profiles and notifications are reachable now,
    // and it is the only way back to the inbox from either.
    // the hamburger "More" / Settings at the bottom
    'svg[aria-label="Settings"]',
    'a:has(svg[aria-label="Settings"])',
    'div[role="button"]:has(svg[aria-label="Settings"])',
    // The gear is "Options" in French; its href does not translate.
    'a[href^="/accounts/settings"]',
    'div[role="button"]:has(svg[aria-label="More"])',
    'a:has(svg[aria-label="More"])',
    // Threads + the "Also from Meta" app-switcher grid
    'a[aria-label="Threads"]',
    'a:has(svg[aria-label="Threads"])',
    'div[role="button"]:has(svg[aria-label="Threads"])',
    '[aria-label="Also from Meta"]',
    'div[role="button"]:has(svg[aria-label="Also from Meta"])',
    // The Threads link carries no label at all on a French phone; this
    // is the href the live DOM showed (threads.com), nothing guessed.
    'a[href*="threads.com"]',
    // Mobile web: "use the app" upsells and store badges
    'a[href*="itunes.apple.com"]',
    'a[href*="apps.apple.com"]',
    'a[href*="play.google.com"]',
    'a[href*="app.link"]',
    '[aria-label="Open app"]',
    // Mobile web: the inbox back arrow escapes to the feed; the thread view
    // arrow (same label) must survive, hence the route-scoped class.
    // The inbox back arrow escapes to the feed, so it goes. Search mode
    // renders a SECOND, identical-looking arrow beside the search field
    // which is the way out of search; the focus handler tags that one
    // .im-keep-back by its row, and only it survives.
    'html.im-inbox a:has(svg[aria-label="Back"]):not(.im-keep-back)',
    'html.im-inbox div[role="button"]:has(svg[aria-label="Back"]):not(.im-keep-back)',
    'html.im-inbox [role="button"]:has(svg[aria-label="Back"]):not(.im-keep-back)',
    'html.im-inbox a:has(' + BACK + '):not(.im-keep-back)',
    'html.im-inbox div[role="button"]:has(' + BACK + '):not(.im-keep-back)',
    'html.im-inbox [role="button"]:has(' + BACK + '):not(.im-keep-back)',
    // Message Requests tab in the inbox header
    'a[href="/direct/requests/"]',
    'a[href^="/direct/requests"]',
    // Keep general feed-post creation hidden. The own-Story circle has its
    // own native photo input/plus glyph and is exposed only in Stories.
    '[role="link"]:has(svg[aria-label="New post"])',
    'div[role="button"]:has(svg[aria-label="New post"])',
    'a:has(svg[aria-label="New post"])',
    'div[role="button"]:has(svg[aria-label="Create"])'
  ];
  // The Notifications heart stays on both platforms. This flip-flopped:
  // shipped on desktop 2026-07-30 (build 25), reverted the same afternoon
  // ("it's triggering smth in me"), re-added by explicit request 2026-07-31.
  // The wall behind it holds either way — likes tapped in the drawer land on
  // /p/, follows land on profiles, both deliberately open now.
  var style = document.createElement("style");
  // Avatars are never a doorway, but they are also not clutter: hiding the
  // link took the picture with it and left a hole in the profile header. Inert
  // rather than gone - the face still shows, the tap goes nowhere, and
  // profiles stay something you reach through a deliberate "View profile".
  style.textContent = css.join(',') + '{display:none !important;}' +
    // The rule that made every avatar inert is GONE: it dated from when
    // profiles were unreachable, and profiles are a deliberate doorway now.
    // It was also killing taps on the notes tray, which is built out of
    // avatars - so liking a friend's note did nothing.
    // Two lines that stop the app reading as a web page: the grey flash
    // WebKit paints under every tap is the loudest browser tell there is,
    // and manipulation drops the wait-for-double-tap-zoom delay so taps
    // land immediately. Pinch zoom on photos still works.
    "*{-webkit-tap-highlight-color:transparent}" +
    "html{touch-action:manipulation}" +
    // No browser callout menus on app chrome: long-pressing an avatar or
    // a button in a native app does not offer Save Image or Copy Link.
    // Message TEXT is deliberately untouched - codes and addresses have to
    // stay selectable.
    "img,svg,[role='button'],[role='link'],a{-webkit-touch-callout:none}" +
    "svg,[role='button']{-webkit-user-select:none}";
  (document.head || document.documentElement).appendChild(style);

  function nativeReplyOverlayOpen() {
    // Notes opens a fixed presentation portal without leaving /direct/inbox/.
    // Hide navigation before the field receives focus, not just after the
    // keyboard appears. Ignore retained hidden portals; never inspect drafts.
    var fields = document.querySelectorAll(
      '[role="presentation"] [role="textbox"][contenteditable="true"],' +
      '[role="dialog"] [role="textbox"][contenteditable="true"],[role="dialog"] textarea');
    for (var i = 0; i < fields.length; i++) {
      if (!fields[i].closest("#im-pay,#im-sheet") && visibleLoginField(fields[i])) return true;
    }
    return false;
  }
  function updateBottomTabs() {
    if (!document || !document.documentElement) return;
    var root = document.documentElement, bar = document.getElementById("im-tabs");
    if (!bar) return;
    var p = location.pathname;
    var profile = /^\/[A-Za-z0-9._]+\/?$/.test(p) && worthSliding(p);
    var visible = signedIn() && (atInbox() || storiesHome() || profile || /^\/(notifications|accounts\/(activity|edit))\/?$/.test(p));
    var hasTabs = !!visible && !watchingReel();
    // A reply covers the tabs without changing the underlying page layout.
    // Removing its spacer clamps a scrolled inbox and makes the screen jump.
    root.classList.toggle("im-tabs-layout", hasTabs);
    root.classList.toggle("im-tabs-visible", hasTabs && !nativeReplyOverlayOpen());
    var tabRoot = hasTabs && mainTabIndex() >= 0;
    if (tabRoot !== lastNativeTabRoot) {
      lastNativeTabRoot = tabRoot; nativeNav("tab-root", tabRoot ? "1" : "0");
    }
    var current = atInbox() ? "im-messages" : storiesHome() ? "im-stories" : profile || p === "/accounts/edit/" ? "im-me" : "im-heart";
    Array.prototype.forEach.call(bar.querySelectorAll("a"), function (el) {
      if (el.id === current) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
  }

  function mainTabIndex() {
    if (!signedIn()) return -1;
    if (atInbox()) return 0;
    if (storiesHome()) return 1;
    if (/^\/(notifications|accounts\/activity)\/?$/.test(location.pathname)) return 2;
    // A friend's profile is a pushed page, not the user's Profile tab.
    try {
      var uid = (document.cookie.match(/(?:^|; )ds_user_id=(\d+)/) || [])[1];
      var handle = localStorage.konvoHandle || "";
      if (uid && localStorage.konvoHandleUid === uid && /^[A-Za-z0-9._]{1,30}$/.test(handle) &&
          location.pathname.replace(/\/$/, "").toLowerCase() === "/" + handle.toLowerCase()) return 3;
    } catch (e) {}
    return -1;
  }
  function cancelTabSwitch() {
    if (pendingTabSwitch) { pendingTabSwitch.cancel(); pendingTabSwitch = null; }
    nativeNav("tab-cancel");
    tabSwipeUntil = 0;
  }
  function switchTabFromSwipe(index) {
    var ids = ["im-messages", "im-stories", "im-heart", "im-me"], button = document.getElementById(ids[index]);
    if (!button || pendingTabSwitch || index < 0 || index >= ids.length) return;
    var fromIndex = mainTabIndex();
    if (fromIndex < 0 || Math.abs(index - fromIndex) !== 1) return;
    var forward = index > fromIndex;
    var observer, limit, frame, finished = false, source = location.pathname;
    // Instagram commits the URL before replacing its React page. Remember
    // rendered source content, not just the route, so we never slide a second
    // copy of the old page and then jump to the destination at completion.
    function laidOut(el) { return el.isConnected && el.getClientRects().length > 0; }
    function inViewport(el) {
      var r = el.getBoundingClientRect();
      return laidOut(el) && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight &&
        r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== "hidden";
    }
    var mains = Array.from(document.querySelectorAll('main,[role="main"]'));
    // Stories masks its main while explicitly revealing only the story tray.
    // That laid-out tree still identifies the route being departed.
    var sourceMain = mains.find(inViewport) || mains.find(laidOut);
    var contentSelector = 'img,button,[role="button"],h1,h2,header,a';
    function nativeContent(el) { return !el.closest('[id^="im-"],[id^="konvo-"]') && inViewport(el); }
    if (!sourceMain && fromIndex === 0) {
      // The mobile inbox can be a div-only React tree, without either main
      // landmark. Its root can also use display:contents. Find that tree by
      // its rendered native content; never treat our tab bar as the source.
      sourceMain = Array.from(document.body.children).find(function(el) {
        return !/^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) && !el.closest('[id^="im-"],[id^="konvo-"]') &&
          Array.from(el.querySelectorAll(contentSelector)).some(nativeContent);
      });
    }
    var sourceNodes = sourceMain ? Array.from(sourceMain.querySelectorAll(contentSelector)).filter(nativeContent).slice(0,40) : [];
    if (sourceMain && !sourceNodes.length) {
      sourceNodes = Array.from(sourceMain.querySelectorAll('*')).filter(function(el){return !el.children.length && inViewport(el);}).slice(0,40);
    }
    var sourceChildren = sourceMain ? Array.from(sourceMain.childNodes) : [];
    function destinationReady() {
      if (mainTabIndex() !== index || button.getAttribute("aria-current") !== "page") return false;
      if (!sourceMain) return false; // Unknown markup: bounded cancellation, never a stale slide.
      // A display:contents root has no layout box even while its old children
      // are visible. Wait for those children to retire, not for a root box.
      if (!sourceMain.isConnected || (!laidOut(sourceMain) && !sourceNodes.some(laidOut))) return true;
      // visibility:hidden is also used by our feed guard before React commits;
      // it must not count as the source page having been replaced.
      if (sourceNodes.length) return sourceNodes.filter(function(el){return !laidOut(el);}).length >= Math.ceil(sourceNodes.length * .75);
      return sourceChildren.some(function(node){return !node.isConnected;}) || sourceMain.childNodes.length !== sourceChildren.length;
    }
    function cleanup() { finished = true; if(observer)observer.disconnect(); clearTimeout(limit); cancelAnimationFrame(frame); }
    function reveal() {
      frame = 0;
      if (finished) return;
      if (document.hidden || mainTabIndex() !== index) { cancelTabSwitch(); return; }
      if (!destinationReady()) return;
      cleanup(); pendingTabSwitch = null;
      navSuppress = Date.now(); navPath = location.pathname; ownButtonAt = 0;
      tabSwipeUntil = Date.now() + 180;
      nativeNav("tab-reveal", forward ? "next" : "previous");
    }
    function check() {
      if (finished) return;
      if (document.hidden || (location.pathname !== source && mainTabIndex() !== index)) { cancelTabSwitch(); return; }
      if (!destinationReady() || frame) return;
      // Give the destination a paint, without waiting for all Instagram DOM
      // updates to stop. Notes, badges and images can keep changing after the
      // page is usable; restarting a quiet timer made swipes feel unresponsive.
      frame = requestAnimationFrame(function () { frame = requestAnimationFrame(reveal); });
    }
    pendingTabSwitch = {check:check,cancel:cleanup};
    nativeNav("tab-prepare");
    observer = new MutationObserver(check); observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["style","hidden","aria-current"]});
    limit = setTimeout(cancelTabSwitch, 900); // A slow/changed Instagram page cannot trap a snapshot.
    tabSwipeClick = true;
    try { button.click(); } finally { tabSwipeClick = false; }
    check();
  }
  // TAB_SWIPE_BEGIN
  // Disabled for release: Instagram's destination loading makes these main-tab
  // gestures feel uneven. Keep tab taps and pushed-page/chat navigation intact.
  var mainTabSwipesEnabled = false;
  if (isPhone && mainTabSwipesEnabled) {
    var tabTouch = null;
    function tabGestureAllowed() {
      return mainTabIndex() >= 0 && !document.hidden && !pendingTabSwitch && Date.now() >= tabSwipeUntil &&
        document.documentElement.classList.contains("im-tabs-visible") &&
        !document.querySelector("#im-pay,#im-sheet,#im-pass-sheet") && !nativeModalOpen() &&
        !nativeReplyOverlayOpen() && !storyRefreshBusy &&
        !(document.activeElement && document.activeElement.matches('input,textarea,select,[contenteditable="true"],[role="textbox"]'));
    }
    document.addEventListener("touchstart", function (e) {
      tabTouch = null;
      if (e.touches.length !== 1 || !tabGestureAllowed()) return;
      var target = e.target;
      if (target.closest && target.closest('#im-tabs,.im-stories-tray,.im-stories-scroll,.im-story-native,article,[role="tablist"],[role="slider"],input,textarea,select,[contenteditable="true"],video,canvas')) return;
      for (var el = target; el && el !== document.body; el = el.parentElement) {
        // Notes and carousels retain the entire gesture, even at their ends.
        if (el.scrollWidth > el.clientWidth + 4 && /^(auto|scroll|hidden)$/.test(getComputedStyle(el).overflowX)) return;
      }
      var t = e.touches[0];
      tabTouch = {x:t.clientX,y:t.clientY,index:mainTabIndex(),path:location.pathname,dx:0,horizontal:false};
    }, {capture:true,passive:true});
    document.addEventListener("touchmove", function (e) {
      if (!tabTouch) return;
      if (e.touches.length !== 1 || !tabGestureAllowed() || location.pathname !== tabTouch.path) { tabTouch = null; return; }
      var dx = e.touches[0].clientX - tabTouch.x, dy = e.touches[0].clientY - tabTouch.y;
      if (!tabTouch.horizontal) {
        if (Math.max(Math.abs(dx),Math.abs(dy)) < 12) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.35) { tabTouch = null; return; }
        // Lock the initial horizontal direction. At either end, leave the
        // gesture alone instead of wrapping around or animating a dead end.
        tabTouch.step = dx < 0 ? 1 : -1;
        var targetIndex = tabTouch.index + tabTouch.step;
        if (targetIndex < 0 || targetIndex > 3) { tabTouch = null; return; }
        tabTouch.horizontal = true;
      }
      tabTouch.dx = dx;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }, {capture:true,passive:false});
    document.addEventListener("touchend", function (e) {
      var gesture = tabTouch; tabTouch = null;
      if (!gesture || !gesture.horizontal) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      if (!tabGestureAllowed() || location.pathname !== gesture.path || -gesture.step * gesture.dx < Math.max(64,innerWidth * .22)) return;
      switchTabFromSwipe(gesture.index + gesture.step);
    }, {capture:true,passive:false});
    document.addEventListener("touchcancel", function () { tabTouch = null; }, {capture:true,passive:true});
    document.addEventListener("visibilitychange", function () { if(document.hidden){tabTouch=null;cancelTabSwitch();} });
    window.addEventListener("pagehide", cancelTabSwitch);
  }
  // TAB_SWIPE_END

  // One stable phone navigation bar across inbox, notifications and profiles.
  // Hide it inside conversations so Instagram keeps the full composer area.
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    var tabs = document.createElement("nav");
    tabs.id = "im-tabs";
    tabs.setAttribute("aria-label", "Konvo navigation");
    (document.body || document.documentElement).appendChild(tabs);
    // Confirm a committed selection, not touch-down: dragging away, disabled
    // controls and tapping the already-selected tab should not vibrate.
    tabs.addEventListener("click", function (e) {
      if (!tabSwipeClick) cancelTabSwitch();
      var button = e.target.closest && e.target.closest("a,button");
      if (!button || button.parentElement !== tabs || button.disabled ||
          button.getAttribute("aria-current") === "page" || button.getAttribute("aria-busy") === "true") return;
      tapHaptic();
    }, true);
    // Native reply sheets can mount/unmount or be retained and hidden with no
    // URL change. Mutation delivery happens before paint, avoiding a frame of
    // Konvo tabs covering the composer. This does not move or replace it.
    new MutationObserver(updateBottomTabs).observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["style", "hidden", "aria-hidden"]
    });
    // Single-quoted on purpose: starting a double-quoted string with a hash
    // would put quote-then-hash in the source, which closes the Rust raw
    // string this script lives in.
    style.textContent +=
      '#im-heart{display:none;position:fixed;right:16px;bottom:24px;width:44px;height:44px;' +
      'border-radius:50%;background:rgba(38,38,38,.92);color:#f5f5f7;z-index:2147483000;' +
      'align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.4)}' +
      'html.im-inbox #im-heart{display:flex}' +
      '#im-me{display:none;position:fixed;right:16px;bottom:80px;width:44px;height:44px;' +
      'border-radius:50%;background:rgba(38,38,38,.92);color:#f5f5f7;z-index:2147483000;' +
      'align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,.4)}' +
      'html.im-inbox #im-me{display:flex}' +
      '#im-tabs{display:none;position:fixed;left:0;right:0;bottom:0;height:64px;' +
      'padding:4px 12px;box-sizing:border-box;align-items:center;justify-content:space-around;' +
      'z-index:2147483000;background:#101318;border-top:1px solid rgba(128,128,128,.22)}' +
      'html.im-tabs-visible #im-tabs{display:flex}' +
      '#im-tabs a,#im-tabs #im-pass{position:static!important;display:flex!important;flex:1;' +
      'height:52px!important;width:auto!important;margin:0;padding:0;border:0;box-shadow:none!important;' +
      'border-radius:12px;background:transparent!important;color:#a5aab4;align-items:center;' +
      'justify-content:center;text-decoration:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;' +
      'transition:transform .24s cubic-bezier(.2,.9,.3,1.3),background-color .16s ease,color .16s ease}' +
      '#im-tabs svg{transition:transform .24s cubic-bezier(.2,.9,.3,1.3);transform-origin:center}' +
      '#im-tabs a:active,#im-tabs #im-pass:not(:disabled):active{transform:scale(.94);transition-duration:.07s;' +
      'background:rgba(128,128,128,.12)!important}' +
      '#im-tabs a:active svg,#im-tabs #im-pass:not(:disabled):active svg{transform:scale(.9);transition-duration:.07s}' +
      '#im-tabs a[aria-current=page]{color:#fff;background:rgba(255,255,255,.09)!important;' +
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.07)!important}' +
      '#im-tabs a:focus-visible,#im-tabs #im-pass:focus-visible{outline:2px solid #0a84ff;outline-offset:-3px}' +
      'html.im-tabs-layout body{padding-bottom:64px;box-sizing:border-box}' +
      '#im-tabs #im-pass:disabled{opacity:.35}' +
      '@media(prefers-color-scheme:light){#im-tabs{background:#fff}' +
      '#im-tabs a,#im-tabs #im-pass{color:#626873}' +
      '#im-tabs a[aria-current=page]{color:#0a5cf0;background:#eef3ff!important;box-shadow:inset 0 1px 0 #ffffffd9!important}}' +
      '@media(prefers-reduced-motion:reduce){#im-tabs a,#im-tabs #im-pass,#im-tabs svg{transition:none!important;transform:none!important}}' +
      'body:has(#im-pay) #im-tabs{display:none!important}' +
      // Hide only duplicate navigation links, never message buttons on profiles.
      'html.im-tabs-layout a[href="/direct/inbox/"]:not(#im-messages),' +
      'html.im-tabs-layout a[href="/notifications/"]:not(#im-heart){display:none!important}';
    // Delegate to an existing Instagram link so its router owns navigation
    // and inbox refreshes. A normal navigation is the fallback when absent.
    function spaGo(href, e) {
      e.preventDefault();
      var target = new URL(href, location.href);
      if (target.pathname.replace(/\/$/, "") === location.pathname.replace(/\/$/, "") && target.search === location.search) return;
      ownButtonAt = Date.now();
      if (document.documentElement.classList.contains("im-stories-guard")) {
        if (storiesHome()) retireStoriesHome();
        else { storiesIntent(false); location.assign(target.href); return; }
        storiesIntent(false);
      }
      // Let Instagram keep its router state and normal inbox refresh/read flow.
      // Fabricating an empty history entry bypasses that state and a 500ms
      // text comparison can reload a perfectly healthy, slower navigation.
      if (!instagramNavigate(target.href)) location.assign(target.href);
    }
    var messages = document.createElement("a");
    messages.id = "im-messages"; messages.href = "/direct/inbox/";
    messages.setAttribute("aria-label", "Messages");
    messages.innerHTML = "<svg width='23' height='23' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z'/></svg>";
    messages.addEventListener("click", function(e) { spaGo(messages.href, e); });
    tabs.appendChild(messages);
    var stories = document.createElement("a");
    stories.id = "im-stories"; stories.href = STORIES_HOME;
    stories.setAttribute("aria-label", "Friends’ Stories");
    stories.title = "Stories";
    stories.innerHTML = "<svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='12' r='9' stroke-dasharray='13 5.85' stroke-linecap='round'/><circle cx='12' cy='12' r='5'/></svg>";
    stories.addEventListener("click", openStories);
    tabs.appendChild(stories);
    var heart = document.createElement("a");
    heart.id = "im-heart";
    // /notifications/ is the phone route; /accounts/activity/ is desktop.
    heart.href = /iPhone|iPad|iPod/.test(navigator.userAgent)
      ? "/notifications/" : "/accounts/activity/";
    heart.setAttribute("aria-label", "Notifications");
    heart.addEventListener("click", function (e) { spaGo(heart.href, e); });
    heart.innerHTML =
      "<svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor'" +
      " stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0" +
      "-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'/></svg>";
    tabs.appendChild(heart);

    // Profile uses the signed-in account identity, not a heading such as
    // "Notifications" that also happens to match username syntax.
    function findMe() {
      var current = rememberInboxAccount();
      if (current) return current;
      var uid = (document.cookie.match(/(?:^|; )ds_user_id=(\d+)/) || [])[1];
      try {
        var handle = localStorage.konvoHandle || "";
        if (uid && localStorage.konvoHandleUid === uid && /^[A-Za-z0-9._]{1,30}$/.test(handle)) return handle;
      } catch (e) {}
      return "";
    }
    var profileLookup = null, profileLookupCleanup = null;
    function resolveProfile() {
      var known = findMe();
      if (known) return Promise.resolve(known);
      if (!atInbox()) return Promise.resolve("");
      if (profileLookup) return profileLookup;
      profileLookup = new Promise(function (resolve) {
        var observer, timer;
        function finish(name) { observer.disconnect(); clearTimeout(timer); profileLookup = null; profileLookupCleanup = null; resolve(name); }
        profileLookupCleanup = finish;
        observer = new MutationObserver(function () {
          if (typeof document === "undefined") { finish(""); return; }
          var name = findMe(); if(name)finish(name);
        });
        observer.observe(document.body,{childList:true,subtree:true});
        timer = setTimeout(function () { finish(findMe()); },3500);
      });
      return profileLookup;
    }
    function pendingProfile() {
      try {
        var request = JSON.parse(sessionStorage.konvoPendingProfile || "null");
        var uid = (document.cookie.match(/(?:^|; )ds_user_id=([0-9]+)/) || [])[1];
        return request && request.uid === uid && Date.now() - request.at < 5000;
      } catch (e) { return false; }
    }
    function openResolvedProfile(name) {
      if (!name || !atInbox() || !pendingProfile()) return;
      try { sessionStorage.removeItem("konvoPendingProfile"); } catch (e) {}
      me.href = "/" + name + "/";
      spaGo(me.href, {preventDefault:function(){}});
    }
    var me = document.createElement("a");
    me.id = "im-me";
    me.href = "/accounts/edit/";
    me.setAttribute("aria-label", "Your profile");
    me.innerHTML =
      "<svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor'" +
      " stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/>" +
      "<circle cx='12' cy='7' r='4'/></svg>";
    me.addEventListener("click", function (e) {
      e.preventDefault();
      var u = findMe();
      if (u) { if(profileLookupCleanup)profileLookupCleanup(u); me.href = "/" + u + "/"; spaGo(me.href, e); return; }
      if (me.getAttribute("aria-busy") === "true") return;
      me.setAttribute("aria-busy", "true");
      try { sessionStorage.konvoPendingProfile = JSON.stringify({uid:(document.cookie.match(/(?:^|; )ds_user_id=([0-9]+)/)||[])[1],at:Date.now()}); } catch (e) {}
      if (!atInbox()) {
        me.removeAttribute("aria-busy");
        spaGo("/direct/inbox/",e);
        // The route watcher resumes this intent after an SPA return.
        return;
      }
      resolveProfile().then(function (name) { me.removeAttribute("aria-busy"); openResolvedProfile(name); });
    });
    profileRouteReady = function () { if(pendingProfile())resolveProfile().then(openResolvedProfile); };
    window.addEventListener("pagehide",function(){if(profileLookupCleanup)profileLookupCleanup("");});
    if (signedIn()) resolveProfile().then(openResolvedProfile);
    tabs.appendChild(me);
    updateBottomTabs();
  }


  // The inbox notes/stories tray stays visible alongside the Stories tab.
  //
  // The Requests tab is hidden by its href in the css list above; the old
  // English text scan ("Requests (2)") died on the French walk of Aug 31,
  // where the tab reads "Demandes" and the href rule matched anyway.
  // The iPhone tap-swallower that used to live here is gone. Its entire job was
  // to stop shared media being watched - it killed the tap on a media bubble
  // because the fullscreen viewer it opens never changes the URL, so the path
  // cage above could not see it. Watching what someone sent you is now the
  // point, so there is nothing left for it to do.
  //
  // It took the "View profile" href bail-out and the inbox-avatar carve-out with
  // it; both existed only to stop the swallower being over-broad. If a reason to
  // block media taps ever comes back, those two go back with it.

  // NB: only attribute writes belong in here. This runs from a MutationObserver
  // watching childList, so anything that adds or removes nodes (textContent
  // included) retriggers it and spins until the page hangs.
  // The nav's Profile entry, which draws itself as your own avatar rather than
  // a labelled icon. It is not inside a <nav>, carries no aria-label, and is
  // an <a> shaped exactly like the avatar links we want to keep - what
  // separates it is position: chrome sits outside <main>, content inside it.
  // The profile header and every face in a thread are inside <main>.
  function hideProfileLink() {
    // Start from the handful of profile-picture images, not from every
    // anchor on the page: same result, ~50x fewer nodes walked.
    var pics = document.querySelectorAll("img[alt$='profile picture']");
    for (var i = 0; i < pics.length; i++) {
      var a = pics[i].closest("a[href]");
      if (a && !a.closest("main") && !/^\/stories\//.test(a.pathname)) a.style.display = "none";
    }
  }
  // A link someone sends in a DM opens nowhere: Instagram marks it
  // target="_blank", and a webview has no tabs, so window.open is a silent
  // no-op. Hand it to the real browser instead - inside the cage there is no
  // back button and no reason to render someone else's site.
  //
  // Deliberately not done by cancelling the navigation in Rust: the login
  // chain hops across Meta domains and out to reCAPTCHA, and a host allow-list
  // there strands it on a blank page. A click on an anchor is the one signal
  // that separates "the user asked for this" from "Instagram is redirecting".
  // What counts as "leaves the app": any http(s) URL that is not Instagram's.
  // l.instagram.com is Meta's linkshim - every external link in a DM or a
  // story sticker is wrapped in it - so it unwraps to its ?u= destination
  // rather than being treated as Instagram's own.
  function externalize(href) {
    try {
      var u = new URL(href, location.href);
      if (!/^https?:$/.test(u.protocol)) return null;
      if (u.hostname === "l.instagram.com") {
        var real = u.searchParams.get("u");
        if (real) return externalize(real) || real;
      }
      if (/(^|\.)instagram\.com$/.test(u.hostname)) return null;
      return u.href;
    } catch (e) { return null; }
  }
  // One tap can reach the browser twice - the anchor handler fires AND
  // Instagram's own handler calls window.open on the same URL - so identical
  // opens within a beat collapse to one Safari tab.
  var lastOpen = "", lastOpenAt = 0;
  function openExternal(url) {
    var now = Date.now();
    if (url === lastOpen && now - lastOpenAt < 1500) return;
    lastOpen = url; lastOpenAt = now;
    // iPhone: the in-app Safari sheet, like Instagram's own browser -
    // swipe it away and the chat is still underneath. The Mac has no
    // sheet and no konvoStore handler; it keeps the real browser.
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      try {
        window.webkit.messageHandlers.konvoStore.postMessage(
          { cmd: "open", id: 0, productId: url });
        return;
      } catch (e) {}
    }
    if (window.__TAURI_INTERNALS__) {
      window.__TAURI_INTERNALS__
        .invoke("plugin:opener|open_url", { url: url })
        .catch(function () {});
    }
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var ext = externalize(a.href);
    if (!ext) return;
    e.preventDefault();
    openExternal(ext);
  }, true);
  // The anchor handler only sees real <a> taps. Mobile DM bubbles and story
  // link stickers open through window.open instead, which is a silent no-op
  // in a webview - the tap just dies. Route it like a click: external to the
  // real browser, Instagram's own "new tab" navigates in place (the cage
  // rules on the destination still apply). Returning null is what a blocked
  // popup returns, which every site already handles.
  window.open = function (href) {
    var ext = href && externalize(href);
    if (ext) openExternal(ext);
    else if (href) location.href = href;
    return null;
  };

  // The only reel you may watch is the one that was sent to you, so the way
  // out of it has to be shut: Instagram advances to the next reel on a vertical
  // drag, a wheel tick, or the arrow/page keys. Kill all three, on the reel
  // permalink only, so threads and the inbox keep scrolling normally.
  // Deliberately gesture-level rather than selector-level: it does not care what
  // Instagram calls its containers this week, which every hide() in this file
  // does. Space is left alone - it pauses the video.
  // Two shapes to cover, confirmed on device: the Mac opens the reel at
  // /reel/<code>/, the phone opens a fullscreen player in place and never
  // touches the URL. So a path test alone misses the phone entirely - hence the
  // second test. A <video> filling the viewport is the player; a video bubble
  // inside a thread is not, so threads keep scrolling normally.
  // Answered ONCE per gesture, at touchstart, and reused for every move in
  // that drag. It used to run per move event - a querySelectorAll plus a
  // getBoundingClientRect per video, sixty times a second, on every scroll
  // in the app - which is the most expensive thing a finger could trigger.
  var reeling = false, reelKnown = false;
  function watchingReel() {
    if (/^\/stories\//.test(location.pathname) || storiesHome()) return false;
    if (/^\/reel\//.test(location.pathname)) return true;
    // A post page is not the reel player, however tall its video renders:
    // locking gestures there kills comment scrolling and the desktop's
    // next/prev arrows through a profile's grid.
    if (/^\/p\//.test(location.pathname)) return false;
    var v = document.querySelectorAll("video");
    for (var i = 0; i < v.length; i++) {
      if (v[i].getBoundingClientRect().height > innerHeight * 0.8) return true;
    }
    return false;
  }
  // preventDefault is not enough: Instagram advances to the next reel from its
  // OWN touch handlers, so suppressing the browser's default scroll leaves the
  // swipe working. The event has to never reach them, which is what capture +
  // stopImmediatePropagation does.
  // pointermove is gone on purpose: iOS fires it alongside touchmove, so
  // it doubled the work for nothing.
  document.addEventListener("touchstart", function () {
    reeling = watchingReel();
    reelKnown = true;
  }, { capture: true, passive: true });
  document.addEventListener("touchend", function () {
    reelKnown = false;
  }, { capture: true, passive: true });
  ["wheel", "touchmove"].forEach(function (t) {
    document.addEventListener(t, function (e) {
      // A real drag always opens with touchstart, so the answer is already
      // cached; anything arriving without one (wheel, synthetic events)
      // still gets the real check rather than a stale false.
      if (!(t === "touchmove" && reelKnown ? reeling : watchingReel())) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, { capture: true, passive: false });
  });
  document.addEventListener("keydown", function (e) {
    // Key test FIRST: watchingReel() forces layout, and this fires on
    // every character typed into a message.
    if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End)$/.test(e.key) && watchingReel()) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  // Instagram ships its web player muted. A once-per-element unmute was not
  // enough on device, which rules out "it just starts muted" and leaves two
  // live causes: the player re-mutes on re-render, and the audio can sit on a
  // different element from the picture. So unmute every media element, every
  // time one starts, rather than once per <video>.
  // WebKit permits this without a gesture: wry already sets
  // mediaTypesRequiringUserActionForPlayback to None.
  // volumechange is deliberately NOT a trigger - it would fight you muting it
  // by hand, and it re-enters through the write below.
  function unmute() {
    if (!watchingReel()) return;
    var m = document.querySelectorAll("video,audio");
    for (var i = 0; i < m.length; i++) {
      var e = m[i], h = e.getBoundingClientRect().height;
      // The picture fills the screen; a separate audio stream has no box at all
      // (an <audio>, or a zero-height <video> carrying only sound). A small box
      // is a clip sitting in the thread behind the player - leave it muted, or
      // the conversation plays over the reel.
      if (e.tagName === "AUDIO" || h === 0 || h > innerHeight * 0.8) {
        if (e.muted || !e.volume) { e.muted = false; e.volume = 1; }
      }
    }
  }
  // Driven by media events, not by sweep: sweep runs on every DOM mutation and
  // would undo you muting the thing by hand a moment later. Instagram re-mutes
  // when it re-renders, and a re-render restarts playback, so the events cover
  // it. They do not bubble but they do capture - hence the third argument.
  ["play", "playing", "loadedmetadata", "canplay"].forEach(function (t) {
    document.addEventListener(t, unmute, true);
  });

  // The paywall, phone only. Konvo is a paid app on iOS: an iPhone at the
  // inbox without an active subscription gets the two-page paywall (S11
  // value -> S12 price), with the decline path (S13 counter-offer -> S14
  // hard stop) behind the close button. The Mac stays free - S11 promises
  // "the Mac app is included", so the gate must never appear there.
  //
  // Money truth lives in StoreKit (Transaction.currentEntitlements via
  // KonvoStore.swift), not in this cache. localStorage.konvoPaid exists so a
  // paying user coming back offline, or before the bridge answers, never
  // sees a paywall flash; every launch re-verifies and the verdict wins,
  // both directions. There is no "onboarded" flag on this origin on purpose:
  // on iOS the bundled onboarding page gates every path to the inbox, so
  // "at the inbox on an iPhone" already means onboarding is done.
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) (function () {
    // Has this install already been through the welcome sequence? Any of
    // the three markers counts, whichever build wrote it. They used to be
    // read per-variant, so updating between build modes replayed the whole
    // sequence: konvoWelcomed was invisible to a beta build and
    // konvoBetaFree was invisible to a free one. The sequence is a
    // once-per-install thing, not a once-per-variant thing.
    var experimentReady = false, experimentalView = null;
    function newOnboarding() { return false; } // Personalized experiment retired.
    function stopExperimentView() { if (experimentalView) { experimentalView.destroy(); experimentalView = null; } }
    function openExperiment(initial) {
      if (!wall) return;
      unmock(); stopExperimentView(); appearance("onboarding-inbox");
      wall.style.removeProperty("background");
      wall.innerHTML = "<div id='konvo-new-onboarding' style='height:100%;width:100%'></div>";
      learnHandle();
      experimentalView = window.KonvoOnboardingExperiment.mount(wall.firstChild, {
        initial: initial || "progress", answers: experimentContext.answers,
        handle: function () { var h=handle(); var uid=(document.cookie.match(/(?:^|; )ds_user_id=(\d+)/)||[])[1]; try { if(localStorage.konvoHandleUid!==uid)return ""; }catch(e){return "";} return /^[A-Za-z0-9._]{1,30}$/.test(h)?h:""; },
        track: track, appearance: appearance, products: function () { return P; },
        refresh: function (done) { storekit("products", null, function (r) { P=r||{ok:false,reason:"products_timeout"};done(r); }); },
        impression: function (id) { track("paywall_presented", {placement:lapsedWall?"lapsed":"onboarding",paywall_id:id});storekit("paywallImpression", id, function(){}); },
        back: function () { stopExperimentView();setPage(revealPage());showInboxReveal(); },
        open: function (url) { storekit("open",url,function(){}); },
        restore: function (done) { storekit("restore",null,function(r){done(r);track("restore_result",{entitled:!!(r&&r.entitled)});if(r&&r.entitled){setCache(true);finish("new_paywall");}}); },
        buy: function (id, done, context) {
          var plan=P&&P.weekly&&P.weekly.productId===id?"weekly":"annual";
          var props=Object.assign({plan:plan,product_id:id,screen_id:"new_paywall",paywall_id:"inbox_annual_weekly_v3",offering_id:P&&P.offeringId},context||{});
          track("purchase_started",props);
          storekit("purchase",id,function(r){track("purchase_result",Object.assign({},props,{result:r&&r.entitled?"purchased":r&&r.cancelled?"cancelled":r&&r.pending?"pending":"error"}));done(r);
            if(r&&r.ok&&r.entitled){lastBuy=id;setCache(true);finish("new_paywall");}
          });
        }
      });
    }
    function seenSequence() {
      if (window.__konvoOnboardingPreview) return false;
      try {
        return !!(localStorage.getItem("konvoWelcomed") ||
          localStorage.getItem("konvoBetaFree") ||
          localStorage.getItem("konvoPaid"));
      } catch (e) { return false; }
    }
    function cached() {
      if (window.__konvoOnboardingPreview) return false;
      try {
        if (localStorage.getItem("konvoPaid")) return true;
        // Granted by a beta build and NEVER touched by the entitlement
        // sync below, which legitimately reports "not entitled" and would
        // otherwise replay the whole paywall sequence on every launch.
        return !!(window.__konvoBeta && !window.__konvoNoFree &&
          localStorage.getItem("konvoBetaFree"));
      } catch (e) { return false; }
    }
    storiesAccess = function () { return cached() || seenSequence(); };
    function grantBeta() {
      try { localStorage.setItem("konvoBetaFree", "1"); } catch (e) {}
    }
    function setCache(v) {
      try {
        if (v) localStorage.setItem("konvoPaid", "1");
        else localStorage.removeItem("konvoPaid");
      } catch (e) {}
    }
    var accessState = "unknown";
    function expiredAccess() {
      return accessState === "expired_trial" || accessState === "expired_subscription";
    }
    function currentPaywallId() {
      return lapsedWall && expiredAccess() ? "expired_inbox_v1" : "original";
    }

    // ---- v3 paywall (grilled Aug 3): S12 connected -> S12b loader -> perks
    // -> S13 three-package paywall (annual/monthly/lifetime) -> S14
    // activation. There is no dismissal unpaid: the x concedes into the
    // Monthly story. Money truth lives in RevenueCat behind the bridge.
    // Every visible word is Matthew's - do not edit copy here.
    //
    // Chat message weight only. Inbox weight belongs to Instagram's read
    // state; overriding it makes read conversations look unread.
    style.textContent +=
      "html.im-thread div[role='row'] div[dir='auto']{font-weight:500;}";
    // Friends' stories are kept, and the inbox story rings are the only way
    // in - three testers asked for a feature that was already there. Louder
    // rings, no new UI: Instagram draws them as a canvas behind the avatar.
    // ponytail: a selector guess like the rest; corrections ride cage-patch.
    // Scoped to the inbox route: an unscoped div:has(...) makes the engine
    // test every div in the document on every DOM change.
    // Scale only, no filter: a filter on every ring is a repaint through
    // the filter pipeline on each frame of an inbox scroll, and scrolling
    // is exactly where "less smooth than Instagram" gets noticed.
    // Plain selector, no :has(): the subject there was bare `div`, so the
    // engine re-tested every div in the document on each mutation. The
    // only canvases on the inbox ARE the story rings.
    style.textContent += "html.im-inbox canvas{transform:scale(1.06)}";
    style.textContent +=
      '#im-pay{--bg:#fff;--ink:#141d33;--mut:#5d6478;--line:#d9d9de;' +
      '--chip:#f2f2f4;--icbg:#eef3ff;--accent:#0a5cf0;--sheet:rgba(242,242,244,.9)}' +
      // System appearance (Aug 16): the wall follows the phone like the
      // rest of onboarding. Same palette as dist/index.html's dark block;
      // pure black --bg meets the native letterbox with no seam. The
      // doubled id outranks every later light rule regardless of source
      // order (the first cut lost the cascade and the annual card stayed
      // white with dark-scheme text).
      '@media (prefers-color-scheme: dark){' +
      '#im-pay#im-pay{--bg:#000;--ink:#f2f3f7;--mut:#9aa0ae;--line:#2a2d36;--sheet:rgba(24,27,35,.82);' +
      '--chip:#1c1f27;--icbg:#101c33;--accent:#0a84ff}' +
      '#im-pay#im-pay .imp-pk.on{background:#101c33}' +
      // The timeline stem was near-black on black; a visible blue.
      '#im-pay#im-pay .imp-stem{background:rgba(10,132,255,.45)}}' +
      '#im-pay{position:fixed;inset:0;z-index:2147483645;background:var(--bg);color:var(--ink);' +
      'display:flex;flex-direction:column;font-family:-apple-system,system-ui,sans-serif;' +
      '-webkit-font-smoothing:antialiased}' +
      '#im-pay .imp-page{flex:1;display:flex;flex-direction:column;min-height:0;' +
      'animation:im-payfade .45s ease}' +
      '@keyframes im-payfade{from{opacity:0}}' +
      '#im-pay h2{margin:0;font-weight:700;letter-spacing:-0.035em;line-height:1.2;' +
      'color:inherit;text-wrap:balance}' +
      // The wall lives inside Instagram's document, and their global
      // element rules beat inheritance - headings silently took THEIR
      // text color. Invisible on the light wall (their ink matched ours),
      // exposed by dark mode as charcoal-on-black (device, Aug 16).
      '#im-pay h1,#im-pay h3,#im-pay h4,#im-pay h5,#im-pay h6,' +
      '#im-pay b,#im-pay u,#im-pay i{color:inherit}' +
      '#im-pay p{margin:0}' +
      '#im-pay .imp-mid{flex:1;display:flex;flex-direction:column;justify-content:center;' +
      'padding:0 24px;overflow-y:auto;overscroll-behavior:none}' +
      '#im-pay .imp-foot{flex:none;padding:0 20px 34px}' +
      '#im-pay .imp-btn[disabled]{opacity:.5}' +
      // The reveal (Aug 22): the wall goes clear over the real inbox, a
      // pill up top, a sheet at the foot. The button inverts the scheme
      // so it reads against whatever the inbox is showing.
      '#im-pay{transition:background .5s ease}' +
      '#im-pay#im-pay.im-new{--bg:#fff;--ink:#141d33;--mut:#5d6478;--line:#d9d9de;--sheet:rgba(242,242,244,.94);--chip:#f2f2f4;--icbg:#eef3ff;--accent:#0a5cf0;color-scheme:light}' +
      '#im-pay#im-pay.im-new:not(.im-reveal){background:#fff}' +
      '#im-pay.im-reveal{background:transparent}' +
      '#im-pay#im-pay.im-new.im-reveal{--bg:#000;--ink:#f2f3f7;--mut:#aeb4c2;--line:#2a2d36;--sheet:rgba(24,27,35,.96);--chip:#1c1f27;--icbg:#101c33;color-scheme:dark}' +
      '#im-pay.im-new.im-reveal .imp-btn{background:#0a5cf0;color:#fff}' +
      // The reveal's choreography (Aug 23): the pill drops in with a
      // spring as the wall clears, its check draws itself, a green ring
      // breathes out once; the sheet slides up a beat later, translucent
      // over the inbox and a third shorter than the first cut, so the
      // inbox is the picture and the sheet the caption.
      '#im-pay .imp-pill{position:absolute;top:14px;left:50%;transform:translateX(-50%);' +
      'display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:999px;' +
      'background:rgba(18,22,30,.92);color:#5ee0a5;font-size:14px;font-weight:600;' +
      'white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.3);z-index:2;' +
      'animation:im-pilldrop .7s cubic-bezier(.34,1.56,.64,1) .15s both,' +
      'im-pillring 1.3s ease-out .7s both}' +
      '@keyframes im-pilldrop{from{transform:translate(-50%,-36px) scale(.8);opacity:0}}' +
      '@keyframes im-pillring{0%{box-shadow:0 4px 18px rgba(0,0,0,.3),0 0 0 0 rgba(94,224,165,.6)}' +
      '100%{box-shadow:0 4px 18px rgba(0,0,0,.3),0 0 0 22px rgba(94,224,165,0)}}' +
      '#im-pay .imp-pill path{stroke-dasharray:24;stroke-dashoffset:24;' +
      'animation:im-draw .45s ease-out .55s forwards}' +
      '#im-pay .imp-sheet{position:absolute;left:0;right:0;bottom:0;padding:8px 22px 22px;' +
      'border-radius:24px 24px 0 0;background:var(--sheet);text-align:center;' +
      '-webkit-backdrop-filter:saturate(1.4) blur(22px);backdrop-filter:saturate(1.4) blur(22px);' +
      'box-shadow:0 -10px 36px rgba(0,0,0,.3);' +
      'animation:im-sheetup .65s cubic-bezier(.32,.72,0,1) .45s both}' +
      '@keyframes im-sheetup{from{transform:translateY(110%)}}' +
      '#im-pay .imp-sheet h2{font-size:22px}' +
      '#im-pay .imp-sheet p{font-size:13.5px;line-height:1.45;color:var(--mut);margin-top:6px}' +
      '#im-pay .imp-grab{width:34px;height:4px;border-radius:999px;background:var(--line);' +
      'margin:0 auto 12px}' +
      '#im-pay .imp-sheet .imp-btn{background:var(--ink);color:var(--bg);box-shadow:none;' +
      'margin-top:14px;min-height:48px;font-size:16px}' +
      '#im-pay .imp-sheet .imp-next{font-size:13px;color:var(--mut);margin-top:10px}' +
      '#im-pay .imp-btn{width:100%;min-height:56px;border:0;border-radius:14px;' +
      'background:var(--accent);color:#fff;font-family:inherit;font-size:17px;font-weight:600;' +
      'letter-spacing:-0.012em;box-shadow:0 8px 18px rgba(10,92,240,.24)}' +
      '#im-pay .imp-btn[disabled]{opacity:.5}' +
      '#im-pay .imp-ghost{text-align:center;font-size:15px;color:var(--mut);padding:16px 0 2px}' +
      // The close on the Screen Time page (Sep 1): the page is opened by
      // the user from the inbox now, so it needs a way back.
      '#im-pay .imp-close{position:absolute;top:14px;right:16px;width:34px;height:34px;' +
      'border-radius:50%;background:var(--chip);color:var(--mut);display:flex;' +
      'align-items:center;justify-content:center;z-index:3}' +
      '#im-pay .imp-links{display:flex;justify-content:center;gap:18px;margin-top:10px;' +
      'font-size:13.5px;color:var(--mut)}' +
      '#im-pay .imp-links span{text-decoration:underline}' +
      '#im-pay .imp-row{display:flex;align-items:center;gap:12px;font-size:17px;' +
      'opacity:.35;transition:opacity .5s ease}' +
      '#im-pay .imp-row.done{opacity:1}' +
      '#im-pay .imp-ck{width:20px;height:20px;flex:none;border-radius:50%;' +
      'background:rgba(20,29,51,.1);display:inline-flex;align-items:center;' +
      'justify-content:center}' +
      '#im-pay .imp-row.done .imp-ck{background:var(--accent)}' +
      '#im-pay .imp-row .imp-ck svg{display:none}' +
      '#im-pay .imp-row.done .imp-ck svg{display:block}' +
      '#im-pay .imp-spin{width:20px;height:20px;border:2px solid var(--line);' +
      'border-top-color:var(--accent);border-radius:50%;' +
      'animation:im-spin .8s linear infinite}' +
      // The keyframes were simply missing since day one: the ring
      // rendered but never turned. Caught on device Aug 16.
      '@keyframes im-spin{to{transform:rotate(360deg)}}' +
      // The S14 checkmark draws itself: dashoffset runs the stroke tip
      // along the path while im-pop scales the whole mark in.
      '@keyframes im-draw{to{stroke-dashoffset:0}}' +
      // The blue banner is back (Matthew, Sep 6 evening). It gives way
      // first when the page is tall (the French title runs three lines):
      // 116px with room, down to 60px, and the tile scales with it. The
      // shrink weight dwarfs the mid's so the banner shrinks before the
      // mid scrolls; the price page gives its mid a content basis so the
      // deficit is visible to flex at all.
      '#im-pay .imp-head{flex:0 1000 100px;min-height:60px;position:relative;' +
      'background:linear-gradient(180deg,#1a6bf2 0%,#0a5cf0 100%)}' +
      '@keyframes im-pop{from{transform:scale(.4);opacity:0}}' +
      '#im-pay .imp-pk{flex:1;border-radius:14px;box-shadow:inset 0 0 0 1.2px var(--line);' +
      'padding:18px 6px 12px;text-align:center;position:relative}' +
      '#im-pay .imp-pk.on{box-shadow:inset 0 0 0 2px var(--accent);background:#f6f9ff}' +
      '#im-pay .imp-pk b{display:block;font-size:13.5px;letter-spacing:-0.01em}' +
      '#im-pay .imp-pk i{display:block;font-style:normal;font-size:15px;font-weight:700;' +
      'margin-top:4px}' +
      '#im-pay .imp-pk u{display:block;text-decoration:none;font-size:10.5px;' +
      'color:var(--mut);margin-top:3px;line-height:1.3}' +
      // The badge sits on the card's top edge with a ring of page colour
      // around it, so it reads as a tag on the card, not a line in it.
      '#im-pay .imp-rec{position:absolute;top:-11px;left:50%;transform:translateX(-50%);' +
      'white-space:nowrap;background:var(--accent);color:#fff;font-size:10px;' +
      'font-weight:700;letter-spacing:0.06em;padding:4px 10px;border-radius:999px;' +
      'box-shadow:0 0 0 3px var(--bg)}' +
      '#im-pay .imp-tl{display:flex;gap:14px}' +
      '#im-pay .imp-tl h4{margin:0;font-size:16px;font-weight:700}' +
      '#im-pay .imp-tl p{font-size:14px;line-height:1.4;color:var(--mut);margin-top:3px}' +
      '#im-pay .imp-tl p b{color:var(--ink);font-weight:600}' +
      '#im-pay .imp-dot{flex:none;width:36px;display:flex;flex-direction:column;' +
      'align-items:center}' +
      '#im-pay .imp-dot i{flex:none;width:36px;height:36px;border-radius:50%;' +
      'background:var(--accent);display:inline-flex;align-items:center;' +
      'justify-content:center}' +
      '#im-pay .imp-pk u.imp-save{margin-top:5px;font-size:11.5px;font-weight:700;' +
      'letter-spacing:.02em;color:var(--accent)}' +
      '#im-pay .imp-stem{flex:1;width:6px;border-radius:999px;' +
      'background:rgba(10,92,240,.15);margin-top:0}' +
      // The Cal AI chain (Sep 6): a phone-shaped window onto the live
      // inbox, painted by its own spread shadow; plan cards with a radio
      // and a grey final timeline dot. No back chevron and no Skip on any
      // page (Matthew, Sep 6 device walk): one button, Continue.
      // The window is the frame image's screen (641x1375 of a 717x1446
      // bezel, transparent), so the image sits at those ratios around it
      // and the hole's radius stays under the screen's corners. The foot
      // paints over the phone's bottom, Cal AI style (Matthew, Sep 6).
      '#im-pay .imp-win{position:relative;width:196px;height:420px;border-radius:18px;margin:44px auto 0;flex:none;' +
      'box-shadow:0 0 0 200vmax var(--bg)}' +
      '#im-pay .imp-frame{position:absolute;left:-11.6px;top:-10.7px;width:219.2px;height:441.7px;' +
      'max-width:none}' +
      '#im-pay .imp-plan{display:flex;justify-content:space-between;align-items:center;' +
      'text-align:left;padding:16px 14px 14px;border-radius:16px}' +
      '#im-pay .imp-plan b{font-size:14px;font-weight:600}' +
      '#im-pay .imp-plan i{font-size:16px;font-weight:800;margin-top:3px}' +
      '#im-pay .imp-plan-billing{display:block;font-size:11px;color:var(--mut);margin-top:4px;line-height:1.3}' +
      '#im-pay .imp-checkout-summary{text-align:center;margin:10px 0 0;line-height:1.4}' +
      '#im-pay .imp-checkout-summary strong{display:block;font-size:14px;font-weight:650;color:var(--ink)}' +
      '#im-pay .imp-checkout-summary span{display:block;font-size:12px;color:var(--mut);margin-top:2px}' +
      '#im-pay .imp-cancel-help{text-align:center;font-size:12px;color:var(--mut);margin-top:4px}' +
      '#im-pay .imp-cancel-help summary{min-height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:underline;list-style:none}' +
      '#im-pay .imp-cancel-help summary::-webkit-details-marker{display:none}' +
      '#im-pay .imp-cancel-help p{line-height:1.4;padding:0 6px 8px;max-height:100px;overflow-y:auto}' +
      '#im-pay .imp-checkout-status{font-size:13px;line-height:1.4;color:var(--ink);text-align:center;padding:8px;margin-bottom:8px;background:var(--icbg);border-radius:8px}' +
      '#im-pay .imp-checkout-plans{display:flex;gap:10px;margin:0 0 12px;padding-top:12px}' +
      '@media(max-height:700px){#im-pay .imp-checkout-head{display:none}' +
      '#im-pay .imp-checkout-mid{padding-top:12px!important}' +
      '#im-pay .imp-checkout-mid h2{font-size:23px!important;margin-bottom:12px!important}' +
      '#im-pay .imp-checkout-mid .imp-tl h4{font-size:14px}' +
      '#im-pay .imp-checkout-mid .imp-tl p{font-size:12px}' +
      '#im-pay .imp-checkout-mid .imp-tl>div:last-child{padding-top:2px!important;padding-bottom:8px!important}}' +
      '#im-pay .imp-radio{width:22px;height:22px;border-radius:50%;flex:none;' +
      'box-shadow:inset 0 0 0 2px var(--line);display:inline-flex;align-items:center;justify-content:center}' +
      '#im-pay .imp-pk.on .imp-radio{background:var(--accent);box-shadow:none}' +
      '#im-pay .imp-dot i.imp-last{background:#9aa0ae}' +
      '#im-pay .imp-acc{color:var(--accent);white-space:nowrap}';

    // Funnel events, fire-and-forget through the bridge (Instagram's CSP
    // blocks page-side analytics). Lean payloads by decision: names and
    // screen ids only. Silent no-op without the bridge (tests, Mac).
    var CHECK =
      "<svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='#fff'" +
      " stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'>" +
      "<path d='M20 6 9 17l-5-5'/></svg>";
    function loaderRow(label) {
      return "<div class='imp-row'><span class='imp-ck'>" + CHECK + "</span>" +
        "<span>" + label + "</span></div>";
    }
    var PAGES = {
      connected:
        "<div class='imp-mid' style='align-items:center;text-align:center'>" +
        "<span style='width:56px;height:56px;border-radius:50%;background:var(--icbg);" +
        "display:inline-flex;align-items:center;justify-content:center;color:var(--accent);" +
        "margin-bottom:24px;animation:im-pop .7s cubic-bezier(0.34,1.56,0.64,1) both'>" +
        "<svg width='26' height='26' viewBox='0 0 24 24' fill='none'" +
        " stroke='currentColor' stroke-width='2.4' stroke-linecap='round'" +
        " stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg></span>" +
        "<h2 style='font-size:28px'>" + T("Instagram connected.") + "</h2>" +
        "<p style='font-size:17px;line-height:1.5;color:var(--mut);margin-top:12px'>" +
        T("Your DMs and Stories are ready.") + "</p></div>"
    };

    // Being at /direct/inbox/ is not proof of a session: Instagram renders
    // that route for a beat before bouncing a signed-out visitor to the
    // login page, and a wall raised in that window is a trap - login looks
    // skipped, the user pays, and dismissing reveals no messages. Proof is
    // the ds_user_id cookie: set at login, cleared at logout, readable from
    // this origin (verified on device). The current_user endpoint cannot
    // gate here - it answers 400 "useragent mismatch" to this webview's UA
    // with every app id, desktop, mobile, or none (measured Aug 3, 2026) -
    // so the loader greeting goes without a username until a reliable
    // source shows up; igUser stays for that day.
    // ponytail: a session revoked server-side leaves the cookie behind and
    // the wall could rise over a dying page; Instagram bounces it to login
    // moments later and the flow recovers there.
    var igUser = "", authed = false;
    function checkAuth() {
      if (/(?:^|; )ds_user_id=\d/.test(document.cookie)) authed = true;
    }
    function loaderPage() {
      return "<div class='imp-mid' style='padding:0 24px'>" +
        "<span class='imp-spin'></span>" +
        "<h2 style='font-size:26px;margin:24px 0 26px'>" + T("Setting up your Konvo") +
        (igUser ? ", " + igUser : "") + "</h2>" +
        "<div style='display:flex;flex-direction:column;gap:14px'>" +
        loaderRow(T("Feed hidden")) + loaderRow(T("Reels hidden")) +
        loaderRow(T("Explore hidden")) + loaderRow(T("Messages kept")) +
        loaderRow(T("Friends' stories kept")) + "</div></div>";
    }

    // Live localized RevenueCat values (locked decision: never hardcode
    // money in shipping paths). These stand-ins render only when the bridge
    // is absent (tests, builds without the Swift class).
    var FALLBACK = { yearly: { price: '$19.99', perWeek: '$0.38',
                               perMonth: '$1.67', savePct: 76, trialDays: 7 },
                     monthly: { price: '$6.99' },
                     lifetime: { price: '$19.99' } };
    var P = null;
    // Assigned at wall mount; "Try again" on the pending page re-kicks it.
    var fetchProducts = function () {};
    // Ready means the two products the wall sells. Lifetime is not on the
    // wall (Aug 21) and konvo.pro.lifetime sits in App Store Connect as
    // MISSING_METADATA, so the store never returns it to a real user:
    // requiring it kept every store user of 1.3.0 on "Loading your
    // plans" and painted 1.2.0's stand-in prices (Sep 1, 46 of 46).
    function prod() {
      return P && P.yearly && (newOnboarding() || P.monthly) ? P : FALLBACK;
    }
    function pricesReady() {
      return !!(P && P.yearly && (newOnboarding() || P.monthly));
    }
    // No stand-in money on a purchasable screen, ever (Aug 31): a
    // fallback price painted while Apple's sheet charges the user's real
    // localized one is exactly the mismatch a checkout caught on device.
    // Until RevenueCat answers with the storefront's own prices, the
    // paywall is this page - nothing quotable, nothing buyable - and the
    // retry loop repaints it the moment prices land, in the user's own
    // currency because that is the only kind of price that ever renders.
    function pricePendingPage() {
      return "<div class='imp-mid' id='im-pricewait' style='align-items:center;" +
        "text-align:center;padding:0 34px'>" +
        "<h2 style='font-size:24px'>" + T("Loading your plans&hellip;") + "</h2>" +
        "<p style='font-size:14.5px;line-height:1.5;color:var(--mut);margin-top:10px'>" +
        T("Prices show in your local currency.") + "</p>" +
        "</div><div class='imp-foot'>" +
        "<div class='imp-ghost' data-act='pay'>" + T("Try again") + "</div></div>";
    }

    // The S2 motive + computed weekly hours, carried across origins in the
    // #konvo= fragment persisted at document-start above. Missing or
    // malformed: the paywall simply omits the line.

    var MOON = "<svg width='15' height='15' viewBox='0 0 24 24' fill='none'" +
      " stroke='currentColor' stroke-width='2.2' stroke-linecap='round'" +
      " stroke-linejoin='round'><path d='M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z'/></svg>";
    var SHIELD = "<svg width='15' height='15' viewBox='0 0 24 24' fill='none'" +
      " stroke='currentColor' stroke-width='2.2' stroke-linecap='round'" +
      " stroke-linejoin='round'><path d='M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z'/></svg>";
    var CHAT = "<svg width='15' height='15' viewBox='0 0 24 24' fill='none'" +
      " stroke='currentColor' stroke-width='2.2' stroke-linejoin='round'>" +
      "<path d='M12 4c-4.4 0-8 3-8 6.8 0 2.1 1.1 4 2.9 5.2v3.2l3.6-1.7c.5.1 1 .1 1.5.1 4.4 0 8-3 8-6.8S16.4 4 12 4Z'/></svg>";

    var LOCK = "<svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='#fff'" +
      " stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<rect x='4' y='10.5' width='16' height='10.5' rx='3'/>" +
      "<path d='M8.5 10.5V8a3.5 3.5 0 0 1 7 0'/></svg>";
    var GLASS = "<svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='#fff'" +
      " stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<path d='M6 3h12M6 21h12M8 3v3l4 4 4-4V3M8 21v-3l4-4 4 4v3'/></svg>";
    var BELL = "<svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='#fff'" +
      " stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<path d='M18 8.5a6 6 0 0 0-12 0c0 6-2 7-2 7h16s-2-1-2-7'/>" +
      "<path d='M10.4 20.5a2 2 0 0 0 3.2 0'/></svg>";
    var STAR = "<svg width='19' height='19' viewBox='0 0 24 24' fill='none' stroke='#fff'" +
      " stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>" +
      "<path d='m12 3 2.9 5.9 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.9l1.2-6.5-4.8-4.6 " +
      "6.6-.9Z'/></svg>";
    function node(icon, title, body, stem, last) {
      return "<div class='imp-tl'><div class='imp-dot'><i" + (last ? " class='imp-last'" : "") + ">" + icon + "</i>" +
        (stem ? "<span class='imp-stem'></span>" : "") +
        "</div><div style='padding:4px 0 " + (stem ? "16px" : "0") + "'>" +
        "<h4>" + title + "</h4><p>" + body + "</p></div></div>";
    }
    function dateIn(days) {
      var d = new Date(Date.now() + days * 86400000);
      // French abbreviates months with their own period ("7 sept.") and
      // the sentence adds another; the long month reads cleanly.
      try {
        return d.toLocaleDateString(undefined,
          { month: LANG === "fr" ? "long" : "short", day: "numeric" });
      } catch (e) { return ""; }
    }
    function pkCard(act, on, badge, name, price, sub, save) {
      // `save` is the accent line below the price. The trial is not on
      // the card: the headline and the CTA state it for the chosen plan.
      return "<div class='imp-pk" + (on ? " on" : "") + "' data-act='" + act + "'>" +
        (badge ? "<span class='imp-rec'>" + badge + "</span>" : "") +
        "<b>" + name + "</b>" +
        "<i>" + price + "</i><u>" + sub + "</u>" +
        (save ? "<u class='imp-save'>" + save + "</u>" : "") + "</div>";
    }
    // S13. plan: 'y' | 'm' | 'l'. The Annual state renders the trial only
    // when RevenueCat says this user is eligible - the timeline never
    // describes a trial that will not happen. Lifetime is a one-time
    // purchase: one-step story, "Lifetime access", never "forever".
    // The three pages before the money (Sep 6, Matthew, after Cal AI):
    // the live inbox inside a phone, the reminder promise, then the trial
    // timeline with the prices at the bottom. "Try 7 days for free and
    // reclaim N hours" is gone. Copy is Matthew's; prices come from the
    // store, so the zero is spelled the way this storefront spells money.
    function okRow() {
      return "<div style='display:flex;align-items:center;justify-content:center;gap:8px;" +
        "padding-bottom:12px;font-size:15px;font-weight:700'>" +
        "<span style='width:18px;height:18px;border-radius:50%;background:var(--accent);" +
        "display:inline-flex;align-items:center;justify-content:center;flex:none'>" + CHECK +
        "</span>" + T("No Payment Due Now") + "</div>";
    }
    function fine(text) {
      return "<p style='font-size:13px;color:var(--mut);margin-top:8px;text-align:center'>" + text + "</p>";
    }
    // Page 1: the wall goes clear again and the person's own inbox shows
    // through a phone-shaped window (mockInbox scales Instagram's page to
    // fit it). Everything outside the window is painted by the window's
    // own spread shadow, page colour.
    function tryPage() {
      // min-height:0 lets the mid shrink to the room it has, so the phone
      // runs under the foot instead of pushing the button off the wall.
      return "<div class='imp-mid' style='justify-content:flex-start;padding:64px 24px 0;" +
        "align-items:center;text-align:center;overflow:visible;min-height:0'>" +
        "<h2 style='font-size:27px;font-weight:700;position:relative;z-index:1'>" + T("We want you to try Konvo for free.") + "</h2>" +
        "<div class='imp-win'><img class='imp-frame' src='" + FRAME_IMG + "' alt=''></div></div>" +
        "<div class='imp-foot' style='padding:0 24px 28px;position:relative;z-index:1;background:var(--bg)'>" + okRow() +
        "<button class='imp-btn' data-act='try-go'>" + T("Continue") + "</button></div>";
    }
    // Matthew's iPhone frame (Sep 6): his image, transparent screen, 720px,
    // 64 colours.
    var FRAME_IMG = "data:image/png;base64,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";
    // Matthew's bell (Sep 6): his image, badge included, transparent, 320px.
    var BELL_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAEsCAYAAACypmqLAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAABQKADAAQAAAABAAABLAAAAAA+nb24AABAAElEQVR4Aey9Cbhl11UeeM6dXlWppFJZliyPGrDAtmwL2UJu2ww2ppndiRnM1DROJ4bY/YUpfOQLcTfq0HR/hI90gGZIN5Bu83UHsPMRoAkmSSMDxhOSNVilwbKk0mxLsktDqaree/fe0/+w1j7nvirNVdKTvPd79+y91/rXsNc9a91z7j333KaprUagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBGoEagRqBG4LkZgfa5uay6quMdgUsvvXRy5pln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";
    // The person's own reason from the quiz (s2c data-why), carried after
    // the hours in the #konvo= fragment (Sep 7). Unknown or missing: no line.
    var WHY = {
      distracted: "So you can stop getting distracted on your phone.",
      attention: "So you can get your attention span back.",
      compare: "So you can stop comparing yourself to everyone.",
      focus: "So you can focus for longer.",
      present: "So you can be more present with friends and family."
    };
    function whyLine() {
      var q = "";
      try { q = localStorage.konvoQuiz || ""; } catch (e) {}
      var k = q.split(",")[1];
      return WHY[k] ? "<p style='font-size:17px;line-height:1.4;color:var(--mut);margin-top:14px'>" +
        T(WHY[k]) + "</p>" : "";
    }
    // Page 2: the offer, after the reference (Sep 6): text only, mid-screen.
    function offerPage() {
      var td = prod().yearly.trialDays || 7;
      return "<div class='imp-mid' style='align-items:center;text-align:center;padding:0 34px'>" +
        "<h2 style='font-size:27px;font-weight:700;line-height:1.3'>" +
        T("We offer {days} so <i>everyone</i> can try Konvo.", { days: "<span class='imp-acc'>" + T("{n} days free", { n: td }) + "</span>" }) +
        "</h2>" + whyLine() + "</div>" +
        "<div class='imp-foot' style='padding:0 24px 28px'>" + okRow() +
        "<button class='imp-btn' data-act='offer-go'>" + T("Continue") + "</button></div>";
    }
    // Page 3: the reminder promise, after the reference (Sep 6): the block
    // sits mid-screen, the "2 days" in the accent, the bell beneath.
    function reminderPage() {
      return "<div class='imp-mid' style='align-items:center;text-align:center;padding:0 34px'>" +
        "<h2 style='font-size:27px;font-weight:700;line-height:1.3'>" +
        T("You'll get a reminder {days} before your trial ends.", { days: "<span class='imp-acc'>" + T("2 days") + "</span>" }) + "</h2>" +
        "<img src='" + BELL_IMG + "' alt='' width='190' height='178' style='display:block;margin:52px auto 0'></div>" +
        "<div class='imp-foot' style='padding:0 24px 28px'>" + okRow() +
        "<button class='imp-btn' data-act='pay'>" + T("Continue") + "</button></div>";
    }
    function mockInbox() {
      if (!wall) return;
      wall.classList.add("im-reveal");
      var win = wall.querySelector(".imp-win");
      var r = win && win.getBoundingClientRect();
      var s = r && r.width && window.innerWidth ? r.width / window.innerWidth : 0.55;
      var top = r && r.top ? Math.round(r.top) : 150;
      document.documentElement.classList.add("im-mock");
      var kids = document.body.children;
      for (var i = 0; i < kids.length; i++) {
        if (kids[i] === wall || kids[i].tagName === "SCRIPT" || kids[i].tagName === "STYLE") continue;
        kids[i].style.transformOrigin = "50% 0";
        kids[i].style.transform = "translateY(" + top + "px) scale(" + s.toFixed(3) + ")";
        kids[i].setAttribute("data-im-mock", "1");
      }
    }
    function unmock() {
      document.documentElement.classList.remove("im-mock");
      var els = document.querySelectorAll("[data-im-mock]");
      for (var i = 0; i < els.length; i++) {
        els[i].style.transform = ""; els[i].style.transformOrigin = "";
        els[i].removeAttribute("data-im-mock");
      }
      if (wall) wall.classList.remove("im-reveal");
    }
    // A plan card, Cal AI style: name and monthly price on the left, a
    // radio on the right, the trial badge on the card's top edge.
    function planCard(act, on, badge, name, price, save, billing) {
      return "<div class='imp-pk imp-plan" + (on ? " on" : "") + "' data-act='" + act + "'>" +
        (badge ? "<span class='imp-rec'>" + badge + "</span>" : "") +
        "<div><b>" + name + "</b><i>" + price + "</i>" +
        (billing ? "<small class='imp-plan-billing'>" + billing + "</small>" : "") +
        (save ? "<u class='imp-save'>" + save + "</u>" : "") + "</div>" +
        "<span class='imp-radio'>" + (on ? CHECK : "") + "</span></div>";
    }
    function trialTimeline(n) {
      var rem = Math.max(1, n - 2);
      return node(LOCK, T("Today"), T("Your DMs, without the Feed, Explore or Reels."), true) +
        node(BELL, rem === 1 ? T("In 1 Day - Reminder") : T("In {n} Days - Reminder", { n: rem }),
          T("We'll remind you before your trial ends."), true) +
        node(STAR, T("In {n} Days - Billing Starts", { n: n }),
          T("Charged on {date} unless you cancel before.", { date: dateIn(n) }), false, true);
    }
    // Only the selected, StoreKit-priced plan supplies these terms. No extra
    // screen or checkout delay; cancellation help expands in the same footer.
    function checkoutSummary(plan) {
      var product = prod()[plan === "m" ? "monthly" : plan === "l" ? "lifetime" : "yearly"];
      var trial = product.trialDays || 0, annual = plan === "y", lifetime = plan === "l";
      var main = lifetime ? T("{price} charged today. One-time purchase.", {price:product.price})
        : trial ? T(annual ? "{price}/year starting {date}" : "{price}/month starting {date}", {price:product.price,date:dateIn(trial)})
        : T("{price} charged today.", {price:product.price});
      var renewal = lifetime ? T("Pay once. No subscription.")
        : T(annual ? "Renews at {price}/year unless cancelled." : "Renews at {price}/month unless cancelled.", {price:product.price});
      return "<div class='imp-checkout-summary' data-checkout-copy='clarity_v1'><strong>" + main +
        "</strong>" + (trial ? "" : "<span>" + renewal + "</span>") + "</div>";
    }
    function cancelHelp(plan) {
      if (plan === "l") return "";
      var product = prod()[plan === "m" ? "monthly" : "yearly"];
      return "<details class='imp-cancel-help'><summary>" + T("Cancel anytime · How to cancel") +
        "</summary><p>" + T("Settings → your name → Subscriptions → Konvo → Cancel.") +
        (product.trialDays ? "<br>" + T("Cancel at least 24 hours before your trial ends to avoid being charged.") : "") +
        "</p></details>";
    }
    // S13. plan: 'y' | 'm' | 'l'. The Annual state renders the trial only
    // when RevenueCat says this user is eligible - the timeline never
    // describes a trial that will not happen. Lifetime is a one-time
    // purchase: one-step story, "Lifetime access", never "forever".
    function pay(plan) {
      if (!pricesReady()) return pricePendingPage();
      if (lapsedWall && expiredAccess()) return expiredPaywall(plan);
      var pr = prod(), y = pr.yearly, m = pr.monthly, l = pr.lifetime;
      var td = plan === "y" ? (y.trialDays || 0) : 0;
      var mtd = plan === "m" ? (m.trialDays || 0) : 0;
      var sp = y.savePct || 0;
      var perMo = y.perMonth || y.perWeek || y.price;
      var head, cta, act, tl;
      if (mtd) {
        head = T("Start your {n}-day FREE <br>trial to continue.", { n: mtd });
        cta = T("Start My {n}-Day Free Trial", { n: mtd });
        act = "buy-m";
        tl = trialTimeline(mtd);
      } else if (plan === "m") {
        head = T("Try for {price} a month, cancel anytime.", { price: m.price });
        cta = T("Continue with Monthly");
        act = "buy-m";
        tl = node(LOCK, T("Today"), T("Unlock your DMs and Stories in Konvo. Pay {price}.",
               { price: m.price }), true) +
             node(STAR, T("Every month"), T("Renews at {price}, <b>cancel anytime</b>.",
               { price: m.price }), false, true);
      } else if (plan === "l") {
        head = T("{price} once. Lifetime access.", { price: l.price });
        cta = T("Get Lifetime access");
        act = "buy-l";
        tl = node(LOCK, T("Today"), T("Pay {price} once. That's it.", { price: l.price }), false, true);
      } else if (td) {
        head = T("Start your {n}-day FREE <br>trial to continue.", { n: td });
        cta = T("Start My {n}-Day Free Trial", { n: td });
        act = "buy-y";
        tl = trialTimeline(td);
      } else {
        head = T("{price} a year ({m}/month).", { price: y.price, m: perMo });
        cta = T("Continue with Yearly");
        act = "buy-y";
        tl = node(LOCK, T("Today"), T("Unlock your DMs and Stories in Konvo."), true) +
             node(STAR, T("In 12 months"), T("Renews at {price}, <b>cancel anytime</b> before.",
               { price: y.price }), false, true);
      }
      return "<div class='imp-head imp-checkout-head'>" +
        "<div style='position:absolute;inset:0;background:radial-gradient(circle at 50% 30%," +
        "rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 60%)'></div>" +
        "<div style='position:absolute;left:34px;top:20%;width:74px;height:22px;" +
        "border-radius:7px;background:rgba(255,255,255,.16);transform:rotate(-8deg);" +
        "display:flex;align-items:center;justify-content:center;font-size:9px;" +
        "font-weight:700;color:rgba(255,255,255,.55)'>FEED</div>" +
        "<div style='position:absolute;right:30px;top:54%;width:62px;height:22px;" +
        "border-radius:7px;background:rgba(255,255,255,.14);transform:rotate(7deg);" +
        "display:flex;align-items:center;justify-content:center;font-size:9px;" +
        "font-weight:700;color:rgba(255,255,255,.5)'>REELS</div>" +
        "<div style='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
        "height:min(64px,78%);aspect-ratio:1;border-radius:18px;background:#fff;display:flex;" +
        "align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(4,30,80,.35)'>" +
        "<svg width='34' height='34' viewBox='0 0 24 24' fill='none' stroke='#0a5cf0'" +
        " stroke-width='2.2' stroke-linejoin='round'><path d='M12 4c-4.4 0-8 3-8 6.8 " +
        "0 2.1 1.1 4 2.9 5.2v3.2l3.6-1.7c.5.1 1 .1 1.5.1 4.4 0 8-3 8-6.8S16.4 4 12 4Z'/>" +
        "</svg></div></div>" +
        "<div class='imp-mid imp-checkout-mid' style='justify-content:flex-start;padding:28px 24px 0;flex:1 1 auto;min-height:0'>" +
        "<h2 style='font-size:26px;font-weight:700;text-align:center;margin-bottom:24px'>" +
        (lapsedWall ? T("Continue with Konvo") : head) + "</h2>" +
        (lapsedWall ? "<p style='font-size:15px;color:var(--ink);margin:-12px 0 18px;text-align:center'>" +
          T("Instagram is unblocked until you pick a plan. ") + head + "</p>" : "") +
        tl + "</div><div class='imp-foot' style='padding:6px 24px 22px'>" +
        // Yearly stays on the left and preselected (Matthew, Sep 6); its
        // badge is the free days when this user is eligible, else the
        // live saving.
        "<div class='imp-checkout-plans'>" +
        planCard("pk-y", plan === "y",
          y.trialDays ? T("{n} DAYS FREE", { n: y.trialDays }) : "",
          T("Yearly"), T("{price}/mo", { price: perMo }), sp ? T("SAVE {n}%", { n: sp }) : "", T("{price} billed annually", {price:y.price})) +
        planCard("pk-m", plan === "m", "", T("Monthly"), T("{price}/mo", { price: m.price })) +
        "</div>" +
        (td || mtd ? okRow() : "") +
        "<button class='imp-btn' data-act='" + act + "'>" + cta + "</button>" +
        checkoutSummary(plan) +
        cancelHelp(plan) +
        // Restore lives in the footer row: the four-node trial timeline
        // pushed a centered one below the fold, and App Review needs it
        // findable without scrolling.
        betaFreeRow() +
        "<div class='imp-links'><span data-act='terms'>" + T("Terms of Use") + "</span>" +
        "<span data-act='privacy'>" + T("Privacy Policy") + "</span>" +
        "<span data-act='restore'>" + T("Restore") + "</span></div></div>";
    }

    // Returning subscribers see their inbox, while first-time trial education
    // keeps its existing timeline. Only the native receipt selects this layout.
    style.textContent +=
      '#im-pay .imp-return{display:flex;flex-direction:column;flex:1;min-height:0;overflow-y:auto}' +
      '#im-pay .imp-return-title{text-align:center;padding:22px 22px 14px;flex:none}' +
      '#im-pay .imp-return-title p{color:var(--mut);font-size:14px;margin:0 0 7px}' +
      '#im-pay .imp-return-title h2{font-size:32px}' +
      '#im-pay .imp-return-preview{position:relative;flex:1;min-height:160px;overflow:hidden}' +
      '#im-pay .imp-return-device{position:relative;width:min(72vw,274px);aspect-ratio:720/1452;margin:0 auto}' +
      '#im-pay .imp-return-device>img{position:absolute;inset:0;width:100%;height:100%;z-index:2}' +
      '#im-pay .imp-return-screen{position:absolute;inset:2.5% 4.5%;border-radius:32px;overflow:hidden;background:#0c1013;color:#f5f5f5;color-scheme:dark}' +
      '#im-pay .imp-return-fallback{padding:35px 18px;text-align:center;font-size:15px;line-height:1.5}' +
      '#im-pay .imp-return-fallback b{display:block;font-size:21px;margin-bottom:18px}' +
      '#im-pay .imp-return-preview:after{content:"";position:absolute;inset:auto 0 0;height:64px;background:linear-gradient(transparent,var(--bg));z-index:3}' +
      '#im-pay .imp-return-plans{display:flex;gap:10px;margin:12px 24px 8px;flex:none}' +
      '#im-pay .imp-return-plans .imp-plan{flex:1;min-width:0;cursor:pointer;appearance:none;-webkit-appearance:none;' +
      'background:var(--bg);color:var(--ink);font-family:inherit;text-align:left;border:1px solid var(--line)}' +
      '#im-pay .imp-return-plans .imp-plan.on{border:2px solid var(--accent);background:var(--icbg)}' +
      '#im-pay .imp-return-plans .imp-plan i{font-size:20px}' +
      '#im-pay .imp-return-plans .imp-plan small{display:block;font-size:11px;color:var(--mut);margin-top:4px;line-height:1.3}' +
      '#im-pay .imp-return .imp-foot{flex:none;padding:6px 24px max(18px,env(safe-area-inset-bottom))}' +
      '@media(max-height:650px){#im-pay .imp-return-title{padding-top:14px}#im-pay .imp-return-title h2{font-size:28px}' +
      '#im-pay .imp-return-device{width:235px}#im-pay .imp-return-plans{margin-top:6px}}';
    function expiredPaywall(plan) {
      var pr = prod(), yearly = plan !== "m", selected = yearly ? pr.yearly : pr.monthly;
      function card(key, title, product, detail) {
        var on = (key === "y") === yearly;
        return "<button type='button' class='imp-pk imp-plan" + (on ? " on" : "") +
          "' data-act='pk-" + key + "' aria-pressed='" + on + "'><div><b>" + title +
          "</b><i>" + product.price + "</i><small>" + detail + "</small></div>" +
          "<span class='imp-radio'>" + (on ? CHECK : "") + "</span></button>";
      }
      var billing = yearly ? T("{price} billed annually. Renews unless cancelled.", {price:selected.price})
        : T("{price} billed monthly. Renews unless cancelled.", {price:selected.price});
      // Respect any real offer supplied by the store, even for a former subscriber.
      if (selected.trialDays) billing = yearly
        ? T("{n} days free, then {price} per year", {n:selected.trialDays,price:selected.price})
        : T("{n} days free, then {price} per month", {n:selected.trialDays,price:selected.price});
      return "<div class='imp-return' data-paywall-id='expired_inbox_v1'>" +
        "<header class='imp-return-title'><p>" + T(accessState === "expired_trial" ? "Your trial has ended." : "Your plan ended.") +
        "</p><h2>" + T("Don't lose your inbox") + "</h2></header>" +
        "<div class='imp-return-preview' role='img' aria-label='" + T("Your Instagram inbox") + "'>" +
        "<div class='imp-return-device' inert aria-hidden='true'><div class='imp-return-screen'>" +
        "<div class='imp-return-fallback'><b>" + T("Your Instagram inbox") + "</b>" +
        T("Your messages stay on Instagram.") + "</div></div><img src='" + FRAME_IMG + "' alt=''></div></div>" +
        "<div class='imp-return-plans'>" +
        card("y", T("Yearly"), pr.yearly, T("Billed annually")) +
        card("m", T("Monthly"), pr.monthly, T("Billed monthly")) + "</div>" +
        "<div class='imp-foot'><button class='imp-btn' data-act='buy-" + (yearly ? "y" : "m") + "'>" +
        T("Continue with Konvo") + "</button>" + fine(billing) +
        "<div class='imp-links'><span data-act='terms'>" + T("Terms of Use") + "</span>" +
        "<span data-act='privacy'>" + T("Privacy Policy") + "</span>" +
        "<span data-act='restore'>" + T("Restore") + "</span></div></div></div>";
    }
    var returnPreviewTimer = null, returnPreviewResize = null, returnPreviewSnapshot = null;
    function stopReturnPreview(clearSnapshot) {
      clearTimeout(returnPreviewTimer);
      if (returnPreviewResize) returnPreviewResize.disconnect();
      returnPreviewResize = null;
      if (clearSnapshot) returnPreviewSnapshot = null;
    }
    function showReturnPreview() {
      stopReturnPreview(false);
      var host = wall && wall.querySelector(".imp-return-screen");
      if (!host) return;
      var tries = 0;
      function capture() {
        if (!host.isConnected || !wall) return;
        var api = window.KonvoOnboardingExperiment;
        if (!returnPreviewSnapshot && api && api.captureInbox) {
          // Wait for actual conversation rows rather than capturing a loading header.
          var root = api.inboxRoot();
          if (root && root.querySelector('a[href*="/direct/t/"],[role=row],[role=listitem],img')) {
            returnPreviewSnapshot = api.captureInbox();
          }
        }
        if (!returnPreviewSnapshot) {
          if (++tries < 16) returnPreviewTimer = setTimeout(capture, 750);
          return;
        }
        var shadow = host.attachShadow({mode:"open"});
        var snapshot = returnPreviewSnapshot.cloneNode(true);
        host.replaceChildren();
        shadow.appendChild(snapshot);
        snapshot.style.transformOrigin = "0 0";
        function fit() {
          var width = parseFloat(snapshot.style.width) || window.innerWidth;
          snapshot.style.transform = "scale(" + (host.clientWidth / width) + ")";
        }
        fit();
        if (window.ResizeObserver) { returnPreviewResize = new ResizeObserver(fit); returnPreviewResize.observe(host); }
      }
      capture();
    }

    // Beta testers see the real price and the real screen, then take this
    // way past it. Present only in builds compiled with konvo-beta, and
    // withdrawable remotely; a store build has neither the markup nor the
    // handler.
    // The price step, from the reminder page, or straight from perks when
    // the store says this person has no trial (the try and reminder pages
    // would promise one).
    function trialOffered() {
      var pr = prod();
      return !!((pr.yearly && pr.yearly.trialDays) || (pr.monthly && pr.monthly.trialDays));
    }
    function goPay() {
      if (newOnboarding()) { openExperiment("paywall"); return; }
      unmock();
    // {"rcPaywall": true} (Sep 1): the price step is RevenueCat's
    // remotely designed paywall, presented natively over the wall,
    // so copy and layout change without a build and RevenueCat can
    // run experiments on it. The injected price screen stays the
    // floor: it paints when the offering has no paywall, when the
    // bridge fails, or when the sheet ends without an entitlement.
    // One attempt per session.
    if (window.__konvoRC && !(experimentContext && experimentContext.enrolled) && !rcTried) {
      rcTried = true;
      track("paywall_viewed", { variant: "rc", screen_id: "s13_rc" });
      storekit("rcPaywall", null, function (res) {
        track("rc_paywall", { result: res && res.result ? res.result : "bridge_failed" });
        if (res && res.entitled) {
          if (res.productId) lastBuy = res.productId;
          setCache(true); finish("s13_paywall"); return;
        }
        track("paywall_viewed", { variant: "default", screen_id: "s13_paywall" });
        if (!pricesReady()) fetchProducts();
        swap(pay("y"));
        claimAuto();
      });
      return;
    }
    track("paywall_viewed", { variant: "default", screen_id: "s13_paywall" });
    if (!pricesReady()) fetchProducts();
    swap(pay("y"));
    claimAuto();
    }
    function betaFreeRow() {
      if (!window.__konvoBeta || window.__konvoNoFree) return "";
      return "<div class='imp-ghost' data-act='betafree' " +
        "style='padding-top:14px;font-weight:600;color:var(--accent)'>" +
        T("Free during beta") + "</div>";
    }

    // S12c: delete Instagram. Konvo does not sit alongside Instagram, it
    // takes its place - and a phone with both installed just relapses to the
    // feed. Instructions only: no app can delete another, and pretending
    // otherwise would be a button that lies.
    // ── The block (Aug 16, v2) ──────────────────────────────────────────
    // Screen Time setup is the onboarding's main road, BEFORE the paywall:
    // permission first, sell second, the order Opal proved. The old
    // delete-Instagram ask is gone; blocking while keeping the app
    // installed IS the product now. konvo-free, iOS 15, and macOS skip
    // from the loader straight to perks and never see any of it.
    // The Screen Time connect page, modeled on the pattern Opal proved
    // (Aug 16): a replica of Apple's dialog shown BEFORE the real one, so
    // nothing arrives cold, plus a trust list of what Konvo cannot see.
    // Every claim in that list is structural fact, not copy: the tokens
    // are opaque, there is no DeviceActivity monitor, and there is no
    // Konvo server. The real chain starts only on the button.
    function cageIntroPage() {
      // The Opal pattern, replicated Aug 16: the page is an exact echo of
      // the system dialog about to appear, ringed in accent with an arrow
      // at its Continue, so when the real one lands over this page it
      // reads as expected rather than alarming. The footer claim is
      // structural fact: the selection never leaves the device.
      return "<div class='imp-close' data-act='cage-close' aria-label='Close'>" +
        "<svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor'" +
        " stroke-width='2.4' stroke-linecap='round'><path d='M18 6 6 18M6 6l12 12'/></svg></div>" +
        "<div class='imp-mid' style='padding:24px'>" +
        "<h2 style='font-size:26px;text-align:center'>" +
        T("Connect Konvo to Screen Time, securely.") + "</h2>" +
        "<p style='font-size:15px;line-height:1.5;color:var(--mut);margin-top:8px;" +
        "text-align:center'>" +
        T("To block Instagram on this iPhone, Konvo will need your permission.") + "</p>" +
        "<div style='border:2px solid var(--accent);border-radius:20px;padding:7px;" +
        "margin:22px auto 0;max-width:300px;width:100%'>" +
        "<div style='background:var(--icbg);border-radius:14px;padding:14px 12px 0;" +
        "text-align:center'>" +
        "<b style='font-size:14px;display:block'>" +
        T("&ldquo;Konvo&rdquo; Would Like to Access Screen Time") + "</b>" +
        "<p style='font-size:11.5px;line-height:1.4;color:var(--mut);margin-top:5px'>" +
        T("Providing &ldquo;Konvo&rdquo; access to Screen Time may allow it to see " +
          "your activity data, restrict content, and limit the usage of apps " +
          "and websites.") + "</p>" +
        "<div style='display:flex;border-top:1px solid rgba(120,120,128,.25);" +
        "margin-top:12px'>" +
        "<span style='flex:1;padding:11px 0;color:var(--accent);font-weight:700;" +
        "font-size:15.5px;border-right:1px solid rgba(120,120,128,.25)'>" + T("Continue") + "</span>" +
        "<span style='flex:1;padding:11px 0;color:var(--accent);font-size:15.5px'>" +
        T("Don&rsquo;t Allow") + "</span></div></div></div>" +
        "<svg width='34' height='40' viewBox='0 0 34 40' fill='none' " +
        "stroke='var(--accent)' stroke-width='3' stroke-linecap='round' " +
        "stroke-linejoin='round' style='margin:10px 0 0 22%'>" +
        "<path d='M10 36 C 8 22, 12 12, 20 5'/>" +
        "<path d='M12 7 L20 5 L21 13'/></svg>" +
        "<p style='text-align:center;font-size:13.5px;line-height:1.5;" +
        "color:var(--mut);margin-top:14px'>" +
        T("Your information is protected by Apple and stays 100% on your phone.") + "</p>" +
        "</div><div class='imp-foot'>" +
        // No "Not now" since Aug 25: everyone who reaches this page has
        // paid (or holds a grant), and the shield is what they paid for.
        // The only way past is the system dialog itself - denying it still
        // proceeds, because an app cannot trap someone on an OS permission.
        "<button class='imp-btn' data-act='cage-setup-go'>" + T("Give permission") + "</button></div>";
    }
    // The notifications page (Sep 2, Matthew): the Screen Time page's
    // pattern for the one permission every buyer is asked, so the system
    // dialog lands as expected. iOS asks once per install, so the page shows
    // once (konvoNotifyAsked); the reminder it promises is the anti-forget
    // tool against the first-hour trial cancel.
    function notifyPage(td) {
      return "<div class='imp-mid' style='padding:24px'>" +
        "<h2 style='font-size:26px;text-align:center'>" + T("Enable notifications for messages?") + "</h2>" +
        "<div style='border:2px solid var(--accent);border-radius:20px;padding:7px;" +
        "margin:22px auto 0;max-width:300px;width:100%'>" +
        "<div style='background:var(--icbg);border-radius:14px;padding:14px 12px 0;text-align:center'>" +
        "<b style='font-size:14px;display:block'>" + T("&ldquo;Konvo&rdquo; Would Like to Send You Notifications") + "</b>" +
        "<p style='font-size:11.5px;line-height:1.4;color:var(--mut);margin-top:5px'>" +
        T("Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.") + "</p>" +
        "<div style='display:flex;border-top:1px solid rgba(120,120,128,.25);margin-top:12px'>" +
        "<span style='flex:1;padding:11px 0;color:var(--accent);font-size:15.5px;" +
        "border-right:1px solid rgba(120,120,128,.25)'>" + T("Don&rsquo;t Allow") + "</span>" +
        "<span style='flex:1;padding:11px 0;color:var(--accent);font-weight:700;font-size:15.5px'>" + T("Allow") + "</span>" +
        "</div></div></div>" +
        "<svg width='34' height='40' viewBox='0 0 34 40' fill='none' stroke='var(--accent)' stroke-width='3'" +
        " stroke-linecap='round' stroke-linejoin='round' style='margin:10px 0 0 62%'>" +
        "<path d='M24 36 C 26 22, 22 12, 14 5'/><path d='M22 7 L14 5 L13 13'/></svg>" +
        "<p style='text-align:center;font-size:13.5px;line-height:1.5;color:var(--mut);margin-top:14px'>" +
        // The reminder promise sits here for a trial (Sep 2, Matthew): the
        // page has no description, so this line is the only mention of it.
        (td ? T("We'll remind you 2 days before your trial ends.") : T("You can change this any time in Settings.")) + "</p>" +
        "</div><div class='imp-foot'>" +
        "<button class='imp-btn' data-act='notify-go'>" + T("Turn on notifications") + "</button>" +
        "<div class='imp-links'><span data-act='notify-skip'>" + T("Not now") + "</span></div></div>";
    }
    // S12d (Aug 22): between "Ready to block" and the perks, the wall
    // clears and the user's own inbox shows through - the thing they came
    // for, recognisable, no mockup. The copy states only what the cage
    // already does in this webview, shield or not.
    function showInboxReveal() {
      if(!wall)return;
      wall.style.removeProperty("background");
      wall.classList.add("im-reveal");
      if(!newOnboarding())return;
      appearance("inbox-reveal");
      var status=document.createElement("div");
      status.style.cssText="position:absolute;top:35%;left:24px;right:24px;text-align:center;color:#fff;background:#000;padding:18px;border-radius:16px";
      status.setAttribute("role","status");status.textContent="Loading your Instagram inbox…";
      wall.appendChild(status);
      var started=Date.now(),slow=false;
      function ready(){
        if(!status.isConnected||!wall||!wall.classList.contains("im-reveal"))return;
        if(window.KonvoOnboardingExperiment.inboxRoot()){status.remove();return;}
        if(!slow&&Date.now()-started>=15000){
          slow=true;
          status.textContent="Instagram is taking longer to load your inbox. ";
          var retry=document.createElement("button");retry.textContent="Reload inbox";
          retry.style.cssText="display:block;margin:12px auto 0;padding:10px 18px;border:0;border-radius:10px;background:#0a5cf0;color:white";
          retry.onclick=function(){location.reload();};status.appendChild(retry);
        }
        // A timeout is a recovery hint, not the end of detection. A late
        // response must clear it without requiring another reload.
        setTimeout(ready,500);
      }
      ready();
    }
    function revealPage() {
      return "<div class='imp-pill'><svg width='14' height='14' viewBox='0 0 24 24'" +
        " fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round'" +
        " stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg>" + T("Instagram connected") + "</div>" +
        "<div class='imp-sheet'><div class='imp-grab'></div>" +
        "<h2>" + T("Your DMs are still here.") + "</h2>" +
        "<p>" + T("Feed, Reels and Explore are now hidden. Stories, profiles and " +
          "notifications still work.") + "</p>" +
        "<button class='imp-btn' data-act='keep'>" + T("Keep Instagram like this") + "</button>" +
        (window.__konvoFree ? "" : "<p class='imp-next'>" + T("Choose a plan next") + "</p>") +
        "</div>";
    }
    // The comparison page is back (Sep 1, Matthew: eight rows, plain and
    // direct). Label | Instagram | Konvo; the Konvo column a tinted strip.
    // Row one is checked on BOTH sides on purpose: Instagram does give you
    // the messages; the difference is everything else. Every row is a true
    // claim about what the cage does today.
    var CKBLUE = "<span style='width:22px;height:22px;border-radius:50%;" +
      "background:var(--accent);display:inline-flex;align-items:center;" +
      "justify-content:center'>" + CHECK + "</span>";
    var CKGREY = "<span style='width:22px;height:22px;border-radius:50%;" +
      "background:#dfe3ea;display:inline-flex;align-items:center;" +
      "justify-content:center'><svg width='11' height='11' viewBox='0 0 24 24'" +
      " fill='none' stroke='#8a92a2' stroke-width='3.4' stroke-linecap='round'" +
      " stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg></span>";
    var XMARK = "<svg width='16' height='16' viewBox='0 0 24 24' fill='none'" +
      " stroke='#b0b6c3' stroke-width='2.6' stroke-linecap='round'>" +
      "<path d='M6 6l12 12M18 6 6 18'/></svg>";
    function perkRow(label, both, last) {
      return "<div style='display:flex;align-items:stretch;border-top:1px solid var(--line)'>" +
        "<span style='flex:1;display:flex;align-items:center;padding:11px 8px 11px 0;" +
        "font-size:15px;line-height:1.3'>" + label + "</span>" +
        "<span style='width:70px;flex:none;display:flex;align-items:center;" +
        "justify-content:center'>" + (both ? CKGREY : XMARK) + "</span>" +
        "<span style='width:70px;flex:none;display:flex;align-items:center;" +
        "justify-content:center;background:var(--icbg)" +
        (last ? ";border-radius:0 0 12px 12px" : "") + "'>" + CKBLUE + "</span></div>";
    }
    function perksPage() {
      return "<div class='imp-mid' style='padding:22px 20px 0'>" +
        "<h2 style='font-size:26px'>" + T("Same account. Different app.") + "</h2>" +
        "<div style='display:flex;align-items:flex-end;margin-top:22px'>" +
        "<span style='flex:1'></span>" +
        "<span style='width:70px;flex:none;text-align:center;font-size:12px;" +
        "font-weight:700;letter-spacing:0.02em;white-space:nowrap;" +
        "color:var(--mut);padding-bottom:10px'>" + T("Instagram") + "</span>" +
        "<span style='width:70px;flex:none;display:flex;justify-content:center;" +
        "padding:9px 0;background:var(--icbg);border-radius:12px 12px 0 0'>" +
        "<span style='background:var(--accent);color:#fff;font-size:10px;" +
        "font-weight:700;letter-spacing:0.06em;padding:4px 9px;border-radius:999px'>" +
        T("KONVO") + "</span></span></div>" +
        perkRow(T("Every DM, request and Story"), true, false) +
        perkRow(T("Opens on your messages, not the feed"), false, false) +
        perkRow(T("No feed. Ever."), false, false) +
        perkRow(T("No Reels, no Explore"), false, false) +
        perkRow(T("No ads, no suggested posts"), false, false) +
        perkRow(T("Lock the Instagram app when you're ready"), false, false) +
        perkRow(T("Two 5 minute passes a day. No snooze."), false, false) +
        perkRow(T("Your hours back, every week"), false, true) +
        "</div>" +
        "<div class='imp-foot' style='padding:14px 24px 30px'>" +
        "<div style='display:flex;align-items:center;justify-content:center;gap:8px;" +
        "padding-bottom:12px;font-size:14px;color:var(--mut)'>" +
        "<span style='width:18px;height:18px;border-radius:50%;background:var(--accent);" +
        "display:inline-flex;align-items:center;justify-content:center'>" + CHECK +
        "</span>" + (window.__konvoFree
          ? T("Free. Nothing to cancel.")
          : T("No commitment. Cancel anytime.")) + "</div>" +
        "<button class='imp-btn' data-act='" +
        (window.__konvoFree ? "welcomed" : "try") +
        "'>" + T("Continue") + "</button></div>";
    }
    // S14: post-purchase activation. Trial buyers get the recap and the
    // reminder promise (Matthew's words, Sep 1); every buyer gets the
    // notification ask on the button tap (unread alerts for all, the
    // "ends in 2 days" reminder scheduled only on grant and only with a
    // trial). Lifetime gets its own recap line.
    // The drawn check: scales in (im-pop) while the stroke runs tip to
    // tail (im-draw). Shared by the paid confirmation and the free
    // build's reveal.
    function drawnCheck(head, sub) {
      return "<svg width='118' height='118' viewBox='0 0 24 24' fill='none' stroke='currentColor'" +
        " stroke-width='2' stroke-linecap='round' stroke-linejoin='round'" +
        " style='margin-bottom:38px;color:var(--accent);" +
        "animation:im-pop .5s ease-out both'>" +
        "<path d='M20 6 9 17l-5-5' stroke-dasharray='24' stroke-dashoffset='24'" +
        " style='animation:im-draw .6s ease-out .3s forwards'/></svg>" +
        "<div style='font-size:44px;font-weight:700;letter-spacing:-0.05em;line-height:1;" +
        "text-align:center'>" + head + "</div>" +
        "<p style='font-size:17px;line-height:1.5;color:var(--mut);margin-top:16px;" +
        "text-align:center'>" + (sub || T("Your messages are waiting.")) + "</p>";
    }

    // The last page (Aug 22): shown only once the shield is up. The check
    // draws, a beat, then the wall fades into the inbox on its own.
    function protectedPage() {
      return "<div class='imp-mid' style='align-items:center;padding:0 34px'>" +
        drawnCheck(T("You're protected."),
          T("Instagram is blocked. Your DMs remain available through Konvo.")) +
        "</div>";
    }

    // Existing invite recipients can still redeem links. The sender's
    // referral page is no longer part of either onboarding flow.
    var claimAsked = false, inviteExpires = 0;
    function handle() { try { return localStorage.konvoHandle || ""; } catch (e) { return ""; } }
    // Confirmation for an existing referral link redeemed by a friend.
    function daysOn(head) {
      var days = inviteExpires ? Math.max(1, Math.round((inviteExpires - Date.now()) / 86400000)) : 3;
      return "<div class='imp-mid' style='align-items:center;padding:0 34px'>" +
        drawnCheck(head, T("Ends {date}. Nothing to cancel, nothing charges.",
          { date: "<b style='color:var(--ink);font-weight:600'>" + dateIn(days) + "</b>" })) + "</div>" +
        "<div class='imp-foot' style='padding:0 28px 40px'>" +
        "<button class='imp-btn' data-act='inv-open'>" + T("Open my messages") + "</button></div>";
    }
    // Personalization uses Instagram's account endpoints, with the
    // signed-in account ID as a fallback. Only the username is cached.
    var handleAsked = false;
    function igGet(path) {
      var csrf = (document.cookie.match(/(?:^|; )csrftoken=([^;]+)/) || [])[1] || "";
      return fetch(path, { credentials: "include", headers: {
        "X-IG-App-ID": "936619743392459", "X-ASBD-ID": "129477", "X-IG-WWW-Claim": "0",
        "X-CSRFToken": csrf, "X-Requested-With": "XMLHttpRequest", "Accept": "*/*" } })
        .then(function (r) {
          return r.json().then(function (j) { return { status: r.status, json: j }; },
            function () { return { status: r.status, json: null }; });
        });
    }
    function learnHandle() {
      if (handleAsked || !window.fetch) return;
      handleAsked = true;
      var uid = (document.cookie.match(/(?:^|; )ds_user_id=(\d+)/) || [])[1];
      var tries = [["current_user", "/api/v1/accounts/current_user/?edit=true"]];
      if (uid) tries.push(["user_info", "/api/v1/users/" + uid + "/info/"]);
      (function next(i) {
        if (i >= tries.length) return;
        igGet(tries[i][1]).then(function (r) {
          var u = r.json && r.json.user && r.json.user.username;
          var ok = !!(u && /^[A-Za-z0-9._]{1,30}$/.test(u));
          track("invite_handle", { source: tries[i][0], status: r.status, found: ok });
          if (ok) { try { localStorage.konvoHandle = u; localStorage.konvoHandleUid = uid || ""; } catch (e) {} } else next(i + 1);
        }, function () {
          track("invite_handle", { source: tries[i][0], status: 0, found: false });
          next(i + 1);
        });
      })(0);
    }
    // The friend's side: an entitled answer from the claim sheet ends the
    // sequence the way a purchase does.
    function claimCb(res) {
      if (!res || !res.entitled) return;
      track("invite_claimed", { method: res.method || "clipboard", screen_id: "s13_paywall" });
      inviteExpires = +res.expires || 0;
      setCache(true);
      swap(daysOn(T("Your 3 free days are on.")));
    }
    // Once per session, at the first price paint: if the clipboard holds
    // a web link, the native claim sheet comes up instead of the cards.
    function claimAuto() {
      if (claimAsked) return;
      claimAsked = true;
      storekit("claim", "auto", claimCb);
    }

    function successPage(pid) {
      var pr = prod();
      var td = pid === "konvo.pro.yearly" ? (pr.yearly.trialDays || 0)
             : pid === "konvo.pro.monthly" ? (pr.monthly.trialDays || 0) : 0;
      var recap = "";
      if (pid === "konvo.pro.lifetime") recap = T("Lifetime access active.");
      else if (td) recap = T("Free until {date}.", { date: dateIn(td) });
      return "<div class='imp-mid' style='align-items:center;padding:0 34px'>" +
        drawnCheck(T("You're in.")) +
        (recap ? "<p style='font-size:15px;font-weight:600;margin-top:14px;" +
          "text-align:center'>" + recap + "</p>" : "") +
        (td ? "<p style='font-size:15px;color:var(--mut);margin-top:6px;" +
          "text-align:center'>" + T("We'll remind you 2 days before it ends.") + "</p>" : "") +
        "</div>" +
        "<div class='imp-foot' style='padding:0 28px 40px'>" +
        "<button class='imp-btn' data-act='done'>" + T("Open my messages") + "</button>" +
        "</div>";
    }

    // The shield is armed only at a successful end of the sequence: a
    // purchase or trial on paid builds, the beta grant, the free build's
    // end. A user who connects Screen Time and then declines the price
    // must walk away with Instagram exactly as it was (Aug 21; before
    // this, the block went up at the connect page, before the paywall).
    var cagePending = false;
    // Setup-only mode (Aug 21): a paying user with no shield - a reinstall
    // or a new phone - gets the Screen Time step alone, then "You're all
    // set", then the inbox. Before this the inbox opened unblocked.
    var setupOnly = false, setupVia;
    // How the Screen Time step ends, wherever it ran: done arms the shield
    // and shows "You're protected"; skipped, denied or nothing picked goes
    // to the inbox as it is.
    function cageExit(done) {
      setupOnly = false;
      if (!done) { dismiss(); return; }
      armCage(function () {
        swap(protectedPage());
        setTimeout(dismiss, 2400);
      });
    }
    // The tail of every successful sequence (Aug 22): purchase, trial,
    // restore, beta grant or the free build's end lead HERE, and only now
    // does the Screen Time step run - the shield goes up after the money,
    // never before. A shield already authorised and picked (a lapsed
    // subscriber coming back) is simply re-armed. Without iOS 16 there is
    // no shield to set up, so the plain confirmation stands in.
    // A lapsed subscriber's wall says why it is there (Aug 23): the plan
    // ended and the shield is down until they pick one. Cleared by finish.
    var lapsedWall = false;
    function finish(screen) {
      if (window.__konvoOnboardingPreview) {
        window.__konvoOnboardingPreview = false;
        try { sessionStorage.konvoPreviewCompleted = "1"; } catch (e) {}
      }
      stopExperimentView();
      lapsedWall = false;
      track("onboarding_completed", { screen_id: screen });
      try { localStorage.konvoDone = "1"; } catch (e) {}
      var td = lastBuy === "konvo.pro.yearly" ? (prod().yearly.trialDays || 0)
             : lastBuy === "konvo.pro.monthly" ? (prod().monthly.trialDays || 0) : 0;
      // Every buyer is asked (Sep 1): the permission now also carries the
      // unread-message alerts (KonvoStore.checkUnread). With a trial length
      // the native side schedules the "ends in 2 days" reminder; the
      // in-inbox bar (trialBar) keeps the promise when the prompt is
      // declined. iOS prompts only if never asked.
      if (td) { try { localStorage.konvoTrialEnd = String(Date.now() + td * 86400000); } catch (e) {} }
      finishTd = td;
      finishAfter = landing;
      // The notifications page first (Sep 2), once per install; iOS only
      // ever prompts once, so a second time through goes straight on.
      if (notifyAsked()) { askNotify(); return; }
      swap(notifyPage(td));
    }
    var finishTd = 0, finishAfter = null;
    function notifyAsked() { try { return !!localStorage.konvoNotifyAsked; } catch (e) { return true; } }
    // The page holds still under the system prompt (Sep 2, device: it
    // moved on to the next page while the prompt was still up); the
    // sequence continues only when iOS answers.
    function askNotify() {
      try { localStorage.konvoNotifyAsked = "1"; } catch (e) {}
      var b = wall && wall.querySelector("[data-act='notify-go']");
      if (b) b.disabled = true;
      storekit("notify", String(finishTd), function (r) {
        track("notify_answered", { granted: !!(r && r.granted), trial: !!finishTd });
        if (finishAfter) finishAfter();
      });
    }
    function skipNotify() {
      try { localStorage.konvoNotifyAsked = "1"; } catch (e) {}
      track("notify_answered", { granted: false, trial: !!finishTd, skipped: true });
      if (finishAfter) finishAfter();
    }
    function landing() {
      var moved = false;
      var fallback = setTimeout(function () {
        moved = true;
        swap(successPage(lastBuy));
      }, 900);
      storekit("cageStatus", null, function (s) {
        if (moved) return;
        clearTimeout(fallback);
        // A shield this install already picked (a lapsed subscriber back)
        // is simply re-armed. Nobody is asked here any more (Sep 1): of 17
        // trials whose block went live at purchase, 13 cancelled within
        // the hour and none paid, while every payer so far never had it.
        // The block is offered from the inbox instead: the lock button,
        // and one nudge on a later day (nudgeBlock).
        if (s && s.supported && s.authorized && s.picked) { cagePending = true; cageExit(true); return; }
        swap(successPage(lastBuy));
      });
    }
    function armCage(then) {
      if (!cagePending) { if (then) then(); return; }
      cagePending = false;
      storekit("cageOn", null, function (res) {
        if (res && res.active) track("cage_enabled", {});
        markCaged();
        if (then) then();
      });
    }

    var wall = null;
    var lastBuy = "";
    // The whole funnel up to and including the paywall is the light design;
    // the phone's appearance takes over only when the wall is out of the
    // way. Native launched pinned Light (lib.rs) - this asks KonvoStore to
    // unpin, flipping the letterbox, the status bar, and Instagram's own
    // prefers-color-scheme in one move. No reply comes back, and without
    // the bridge (tests, old builds) it is a silent no-op.
    function appearance(mode) { sheetLook(mode); }
    function goAuto() { appearance(newOnboarding() ? "inbox-dark" : "auto"); }
    // The wall leaves slowly: appearance flips to the phone first, then the
    // wall fades off the now-correct chat over .8s. The reveal IS the
    // payoff moment - an instant removal read as a glitch.
    function dismiss() {
      stopReturnPreview(true);
      stopExperimentView();
      if (!wall) return;
      if (wall.querySelector("[data-act^='buy-']")) track("paywall_exited", {});
      var w = wall;
      wall = null;
      goAuto();
      w.style.transition = "opacity .8s ease";
      w.style.opacity = "0";
      setTimeout(function () {
        if (w.parentNode) w.parentNode.removeChild(w);
      }, 850);
    }
    var purchaseBusy = false;
    function buy(btn, productId) {
      if (purchaseBusy) return;
      var previousStatus = wall && wall.querySelector(".imp-checkout-status");
      if (previousStatus) previousStatus.remove();
      // Beta builds cannot complete a purchase - App Store products do not
      // load until the Paid Apps agreement is active - so the main CTA
      // would spin and strand the tester on the wall. Let it through to
      // the inbox instead, and record WHICH plan they chose: that tap is
      // the pricing signal the whole exercise exists for.
      if (window.__konvoBeta && !window.__konvoNoFree) {
        track("beta_free_taken", {
          plan: productId.indexOf("yearly") > 0 ? "annual"
            : productId.indexOf("monthly") > 0 ? "monthly" : "lifetime",
          via: "cta",
          screen_id: "s13_paywall",
        });
        grantBeta();
        finish("s13_paywall");
        return;
      }
      purchaseBusy = true;
      btn.disabled = true;
      var plan = productId.indexOf("yearly") > 0 ? "annual"
        : productId.indexOf("monthly") > 0 ? "monthly" : "lifetime";
      var product = P && P[plan === "annual" ? "yearly" : plan] || {};
      var attempt = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID()
        : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
      var started = Date.now();
      var props = { checkout_attempt_id: attempt, checkout_tracking_version: 1,
        checkout_copy_version: currentPaywallId() === "original" ? "clarity_v1" : "expired_inbox_v1",
        plan: plan, product_id: productId, screen_id: "s13_paywall", paywall_id: currentPaywallId(),
        placement: lapsedWall ? "lapsed" : "onboarding", offering_id: P && P.offeringId || "",
        displayed_price: product.price || "", currency: product.currency || "",
        trial_days: product.trialDays || 0, trial_eligible: !!product.trialDays };
      if (typeof product.amount === "number" && isFinite(product.amount)) props.price_amount = product.amount;
      track("purchase_started", Object.assign({}, props));
      storekit("purchase", productId, function (res) {
        purchaseBusy = false;
        btn.disabled = false;
        // What happened after the buy tap (Sep 2): Apple's sheet closed,
        // a StoreKit error, a pending approval, or a purchase. Until now
        // 84 people who compared plans and walked were indistinguishable
        // from a broken sheet. Enum only, never the error text.
        track("purchase_result", Object.assign({}, props, {
          elapsed_ms: Date.now() - started,
          result: !res ? "no_bridge" : (res.ok && res.entitled) ? "purchased"
            : res.cancelled ? "cancelled" : res.pending ? "pending"
            : res.ok ? "not_entitled" : "error",
        }));
        if (btn.isConnected && !(res && res.cancelled) && !(res && res.ok && res.entitled)) {
          var status = document.createElement("p");
          status.className = "imp-checkout-status";
          status.setAttribute("role", "status");
          status.textContent = res && res.pending
            ? T("Waiting for Apple approval. You can restore your purchase after approval.")
            : res && res.ok ? T("No active subscription was found. Try Restore or choose a plan.")
            : T("Your purchase could not be completed. Please try again.");
          btn.parentNode.insertBefore(status, btn);
        }
        if (res && res.ok && res.entitled) {
          setCache(true);
          lastBuy = productId;
          finish("s13_paywall");
        }
      }, props);
    }
    function tickRows() {
      var rows = wall.querySelectorAll(".imp-row");
      for (var i = 0; i < rows.length; i++) {
        (function (el, delay) { setTimeout(function () {
          if (wall) el.classList.add("done");
        }, delay); })(rows[i], 400 + i * 650);
      }
    }
    // Page changes inside the wall crossfade instead of cutting. The fade
    // lives on an INNER page wrapper: the wall itself keeps its opaque
    // background the whole time, or the live inbox behind it peeks through
    // for the length of the fade.
    function setPage(html, still) {
      stopReturnPreview(false);
      var wasPaywall = !!wall.querySelector("[data-act^='buy-']");
      var previousPaywallId = wall.querySelector("[data-paywall-id]");
      previousPaywallId = previousPaywallId ? previousPaywallId.getAttribute("data-paywall-id") : "original";
      // still: repaint without the entrance fade - the package cards
      // replace the same page and must not flash.
      wall.innerHTML = "<div class='imp-page'" +
        (still ? " style='animation:none'" : "") + ">" + html + "</div>";
      var isPaywall = !!wall.querySelector("[data-act^='buy-']");
      // Actual price paint, not an attempted native presentation or price loader.
      // Repainting prices / switching cards is the same paywall impression.
      if (isPaywall && (!wasPaywall || previousPaywallId !== currentPaywallId())) {
        if (experimentContext && experimentContext.enrolled) track("paywall_viewed", {screen_id:"s13_paywall",actual_price_visible:true,offering_id:P&&P.offeringId});
        track("paywall_presented", { placement: lapsedWall ? "lapsed" : "onboarding", paywall_id: currentPaywallId(),
          checkout_copy_version: currentPaywallId() === "original" ? "clarity_v1" : "expired_inbox_v1" });
        storekit("paywallImpression", currentPaywallId(), function(){});
      } else if (wasPaywall && !isPaywall) {
        track("paywall_exited", {});
      }
      if (isPaywall) showReturnPreview();
    }
    function swap(html, then) {
      if (!wall) return;
      var pg = wall.firstChild;
      if (pg) { pg.style.transition = "opacity .28s ease"; pg.style.opacity = "0"; }
      setTimeout(function () {
        if (!wall) return;
        setPage(html);
        if (then) then();
      }, 300);
    }
    var swPending = false, swTried = false, rcTried = false, entitlementKnown = false;
    var skipTracked = false;
    function ensure() {
      if (wall || !atInbox()) return;
      // The login conversion is a fact about the session, not the wall
      // (Aug 31): an entitled restorer is dismissed before the wall ever
      // mounts, and the old wall-mount tracking missed every one of them
      // - six silent sign-ins on build 60 alone, person-matched. Counted
      // here, ahead of every early return. An explicit onboarding handoff
      // also records an existing session, without counting ordinary relaunches.
      try {
        var returningUser = !!localStorage.konvoLoginTracked;
        var loginHandoff = !!sessionStorage.konvoLoginHandoff;
        if ((!returningUser || loginHandoff) &&
            /(?:^|; )ds_user_id=\d/.test(document.cookie)) {
          var connectionType = sessionStorage.konvoLoginInteractive ? "interactive_login"
            : returningUser ? "existing_session" : "session_present";
          localStorage.konvoLoginTracked = "1";
          sessionStorage.removeItem("konvoLoginHandoff");
          sessionStorage.removeItem("konvoLoginInteractive");
          track("login_succeeded", { screen_id: "s12_connected",
            connection_type: connectionType, returning_user: returningUser });
        }
      } catch (e) {}
      if (!setupOnly && (cached() || (!expiredAccess() && seenSequence()))) {
        // Returning users (paid cache, or a finished/granted sequence) fire
        // login and inbox events but never remount the wall. Say so once
        // per session, or funnels read them as a post-login drop-off - the
        // Aug 25 analysis lost a day to exactly that.
        if (!skipTracked) {
          skipTracked = true;
          track("sequence_skipped", { reason: cached() ? "entitled" : "seen" });
        }
        return;
      }
      // A paying customer must never see a frame of this. On a fresh
      // install there is no cache yet, so without waiting for the receipt
      // the sequence starts underneath them and only vanishes once
      // RevenueCat answers. Hold until the verdict lands, or until the
      // timeout gives up on it.
      if (!entitlementKnown || !experimentReady) return;
      // Verified session first, always. The check is synchronous, so the
      // wall rises in the same tick the cookie appears.
      if (!authed) { checkAuth(); if (!authed) return; }
      // Superwall experiment layer, on only when the cage-patch says
      // {"superwall": true}: the native placement presents Superwall's
      // remotely-designed paywall over the webview instead of the injected
      // wall below. The injected wall stays the enforcement floor - it
      // rises the moment Superwall's sheet ends without an entitlement, so
      // a closed sheet never leaves the inbox open. One attempt per
      // session; after that the floor rules.
      if (!setupOnly && !expiredAccess() && window.__konvoSW && !(experimentContext && experimentContext.enrolled) && !swTried) {
        if (!swPending) {
          swPending = true;
          storekit("paywall", null, function (res) {
            swPending = false;
            swTried = true;
            if (res && res.entitled) { setCache(true); dismiss(); }
            else ensure();
          });
        }
        return;
      }
      // The wall is light-only design: re-pin Light for the rare case of a
      // lapsed subscription raising it over an already-dark app.
      // The wall follows the system now (Aug 16); the pin only matters
      // for the lapsed-subscription case where it rises over a live app.
      appearance(newOnboarding() ? "onboarding-inbox" : "auto");
      wall = document.createElement("div");
      wall.id = "im-pay";
      if(newOnboarding())wall.classList.add("im-new");
      // A lapsed subscriber on an install that already finished the
      // sequence sees the price and nothing else (Aug 22): the pitch is
      // not replayed at someone who has heard it.
      var lapsed = false;
      try { lapsed = !!localStorage.konvoDone; } catch (e) {}
      if (expiredAccess()) lapsed = true;
      // A payer opening the Screen Time step from the inbox has konvoDone
      // set and is not lapsed: without this the price fetch below painted
      // the paywall over the setup page (Sep 1, caught by the suite).
      if (setupOnly) lapsed = false;
      lapsedWall = lapsed;
      if (setupOnly) track("cage_pitch_viewed", { screen_id: "s12f_cage", via: setupVia });
      setPage(setupOnly ? cageIntroPage() : lapsed ? "" : PAGES.connected);
      wall.addEventListener("click", function (e) {
        var t = e.target.closest("[data-act]");
        if (!t || !wall) return;
        var act = t.getAttribute("data-act");
        if (purchaseBusy) return;
        if (act === "pk-y" || act === "pk-m" || act === "pk-l") {
          var plan = act.slice(3);
          track("plan_selected", { plan: plan === "y" ? "annual"
            : plan === "m" ? "monthly" : "lifetime", screen_id: "s13_paywall" });
          setPage(pay(plan), true);
        } else if (act === "keep") {
          if (newOnboarding()) { openExperiment("progress"); return; }
          wall.classList.remove("im-reveal");
          track("perks_viewed", { screen_id: "s12d_perks" });
          swap(perksPage());
        } else if (act === "try") {
          if (pricesReady() && !trialOffered()) { goPay(); return; }
          track("try_viewed", { screen_id: "s12e_try" });
          swap(tryPage(), mockInbox);
        } else if (act === "try-go") {
          if (pricesReady() && !trialOffered()) { goPay(); return; }
          unmock();
          track("offer_viewed", { screen_id: "s12f_offer" });
          swap(offerPage());
        } else if (act === "offer-go") {
          if (pricesReady() && !trialOffered()) { goPay(); return; }
          track("reminder_viewed", { screen_id: "s12g_reminder" });
          swap(reminderPage());
        } else if (act === "welcomed") {
          // Free build: the sequence is done, and it does not come back.
          try { localStorage.setItem("konvoWelcomed", "1"); } catch (e) {}
          finish("s12c_delete");
        } else if (act === "cage-close") {
          // Back to the inbox exactly as it was; the lock button stays.
          track("cage_setup_closed", { via: setupVia });
          cageExit(false);
        } else if (act === "cage-setup-go") {
          // One flight at a time: Apple's consent dialog sits over the
          // page and a user who keeps tapping the button underneath
          // fired this chain eleven times in a row (field report,
          // Aug 17). Re-armed when the chain resolves either way.
          if (window.__konvoCageBusy) return;
          window.__konvoCageBusy = true;
          // Apple's Screen Time sheet takes its time to appear; the tap is
          // acknowledged at once so nobody taps twice or wonders.
          t.disabled = true;
          storekit("cageAuthorize", null, function (a) {
            track("cage_authorized", { granted: !!(a && a.authorized) });
            window.__konvoCageBusy = false;
            if (!a || !a.authorized) { cageExit(false); return; }
            storekit("cagePick", null, function (p) {
              var n = (p && p.count) || 0;
              track("cage_picked", { count: n });
              if (!n) { cageExit(false); return; }
              // Picked, not armed: the shield waits for the sequence to
              // end well (see armCage). The selection is stored natively.
              cagePending = true;
              storekit("notify", null, function () { cageExit(true); });
            });
          });
        } else if (act === "pay") {
          goPay();
        } else if (act === "betafree") {
          // Beta only: unlock without charging, and record that the price
          // was seen and declined - which is the whole point of showing it.
          track("beta_free_taken", { via: "escape", screen_id: "s13_paywall" });
          grantBeta();
          finish("s13_paywall");
        } else if (act === "buy-y") {
          buy(t, "konvo.pro.yearly");
        } else if (act === "buy-m") {
          buy(t, "konvo.pro.monthly");
        } else if (act === "buy-l") {
          buy(t, "konvo.pro.lifetime");
        } else if (act === "notify-go") {
          askNotify();
        } else if (act === "notify-skip") {
          skipNotify();
        } else if (act === "inv-open") {
          // A friend ending their claim finishes the sequence here (with
          // the notifications page once); a payer from "You're in" already did.
          var fresh = false;
          try {
            if (!localStorage.konvoDone) {
              fresh = true;
              track("onboarding_completed", { screen_id: "s15_invite" });
              localStorage.konvoDone = "1";
            }
          } catch (e) {}
          var toInbox = function () { if (!atInbox()) location.assign("/direct/inbox/"); dismiss(); };
          if (fresh && !notifyAsked()) { finishTd = 0; finishAfter = toInbox; swap(notifyPage(0)); return; }
          toInbox();
        } else if (act === "restore") {
          // Sync then re-read entitlements; unlocking straight to the
          // inbox - a restorer is returning, not starting a trial.
          // A restorer is returning, not starting a trial - but on this
          // phone the shield may not exist yet, so the tail still runs.
          storekit("restore", null, function (res) {
            if (res && res.entitled) { setCache(true); finish("s13_paywall"); }
          });
        } else if (act === "done") {
          track("onboarding_completed", { screen_id: "s14_success" });
          // Land in messages, never wherever the page happened to drift to.
          if (!atInbox()) location.assign("/direct/inbox/");
          dismiss();
        } else if (act === "terms") {
          openExternal("https://konvoinstall.com/terms");
        } else if (act === "privacy") {
          openExternal("https://konvoinstall.com/privacy");
        }
      });
      // The wall eases on rather than slamming over the fresh login: a
      // short fade so "Instagram connected." arrives, not appears.
      wall.style.opacity = "0";
      (document.body || document.documentElement).appendChild(wall);
      requestAnimationFrame(function () {
        var w = wall;
        if (!w) return;
        w.style.transition = "opacity .35s ease";
        w.style.opacity = "1";
      });
      // Live prices arrive while the connected/loader beat plays; the S13
      // render reads whatever answered by then. The cadence is deliberately
      // slow: ~1.8s on connected, ~4.4s of rows ticking, crossfades between.
      var payShown = false;
      var showPay = function () {
        if (payShown || !wall) return;
        payShown = true;
        if (newOnboarding()) { openExperiment("paywall"); return; }
        track("paywall_viewed", { variant: "default", screen_id: "s13_paywall", via: "lapsed" });
        setPage(pay("y"));
        claimAuto();
      };
      var priceTries = 0;
      fetchProducts = function () {
        storekit("products", null, function (res) {
          if (res && res.ok) {
            P = res;
            // A pending paywall repaints itself with the real localized
            // prices the moment they exist.
            if (wall && document.getElementById("im-pricewait")) setPage(pay("y"), true);
            if (lapsed) showPay();
            return;
          }
          P = res || {ok:false,reason:"products_timeout"};
          if (lapsed) showPay();
          if (priceTries++ < 40 && wall) setTimeout(fetchProducts, 2500);
        });
      };
      // The setup-only wall sells nothing: no price fetch, no retries.
      if (setupOnly) return;
      fetchProducts();
      // Live prices first when they arrive in time; the stand-ins after.
      if (lapsed) { setTimeout(showPay, 1500); return; }
      setTimeout(function () {
        if (lapsedWall) return;
        swap(loaderPage(), tickRows);
      }, 1800);
      setTimeout(function () {
        if (lapsedWall) return;
        // Screen Time setup before the sell (Aug 16): a supported build
        // goes loader -> connect -> perks. konvo-free included since
        // Aug 17 - the block ships free in v1.0 (pricing deferred, so a
        // free TestFlight and App Store build still carries the
        // centerpiece). iOS 15 and a bridge that never answers land on
        // perks; the timeout is the hung-bridge fallback, and a MISSING
        // bridge (macOS) answers null instantly through storekit's catch.
        // The reveal (Aug 22): straight from the loader, the wall clears
        // over the user's own inbox. The Screen Time step moved to the
        // tail of the sequence (finish), after the money.
        track("inbox_reveal_viewed", { screen_id: "s12d_reveal" });
        swap(revealPage(), showInboxReveal);
      }, 6200);
    }

    // ── The five-minute pass (locked Aug 16) ────────────────────────────
    // Once a day, reason first, and it relocks itself: DeviceActivity
    // counts five minutes of Instagram use and the monitor extension
    // re-raises the shield with Konvo dead. Bounded autonomy is what
    // keeps the block installed past the first story someone needs to
    // post. The reason is a category enum and never free text; it is the
    // only payload the event carries.
    // markCaged flips the button on: called at boot when the cage is
    // already active, and directly after setup succeeds - the first
    // session bug (Aug 16) was relying on boot alone, which had already
    // answered "no cage" before onboarding enabled it, and the SPA never
    // loads another document to ask again.
    var passAvail = false;
    // What the sheet shows comes from cageStatus (PassPolicy is the one
    // source of truth); these are only the bridge-absent defaults.
    var passMins = 5, passLeft = 2;
    var markCaged = function () {};
    if (isPhone) {
      var passStyle = document.createElement("style");
      // Light by default, dark under the media query: the sheet shipped
      // hardcoded dark and looked wrong on a light-mode phone (field
      // report, Aug 17). Blue button and the grays read fine on both.
      passStyle.textContent =
        '#im-pass{display:none;position:fixed;right:16px;bottom:136px;width:44px;' +
        'height:44px;border-radius:50%;background:rgba(255,255,255,.94);color:#1c1c1e;' +
        'z-index:2147483000;align-items:center;justify-content:center;border:0;' +
        'box-shadow:0 2px 10px rgba(0,0,0,.18)}' +
        'html.im-inbox.im-caged #im-pass{display:flex}' +
        // No shield yet: the same button offers the block (Sep 1), never
        // while any wall is up.
        'html.im-inbox.im-lockable #im-pass{display:flex}' +
        'body:has(#im-pay) #im-pass{display:none !important}' +
        '#im-pass-sheet{position:fixed;inset:0;z-index:2147483200;display:flex;' +
        'align-items:flex-end;background:rgba(0,0,0,.45)}' +
        '#im-pass-card{width:100%;background:rgba(242,242,247,.98);color:#1c1c1e;' +
        'border-radius:20px 20px 0 0;padding:22px 20px 34px;' +
        'font-family:-apple-system,system-ui,sans-serif}' +
        '#im-pass-card h3{margin:0;font-size:19px;font-weight:700;' +
        'line-height:1.35;letter-spacing:-0.01em;color:inherit}' +
        '#im-pass-card .im-pr{display:block;width:100%;text-align:left;margin-top:10px;' +
        'padding:14px 16px;border:0;border-radius:14px;background:rgba(120,120,128,.12);' +
        'color:#1c1c1e;font-size:16px;font-family:inherit}' +
        '#im-pass-card .im-pr.on{box-shadow:inset 0 0 0 2px rgba(10,132,255,1)}' +
        '#im-pass-card .im-go{display:block;width:100%;margin-top:16px;padding:15px 0;' +
        'border:0;border-radius:999px;background:rgba(10,132,255,1);color:#fff;' +
        'font-size:16.5px;font-weight:700;font-family:inherit}' +
        '#im-pass-card .im-go[disabled]{opacity:.4}' +
        '#im-pass-card .im-fb{display:block;width:100%;margin:6px 0 0;background:none;border:0;padding:8px;font:500 14px -apple-system,system-ui,sans-serif;color:#0a84ff}' +
        '#im-pass-card .im-x{display:block;width:100%;margin-top:10px;padding:10px 0;' +
        'border:0;background:none;color:rgba(142,142,147,1);font-size:15px;' +
        'font-family:inherit}' +
        '#im-pass-card p{margin:8px 0 0;font-size:13.5px;' +
        'color:rgba(142,142,147,1);line-height:1.4}' +
        '@media (prefers-color-scheme: dark){' +
        '#im-pass{background:rgba(38,38,38,.92);color:#f5f5f7;' +
        'box-shadow:0 2px 10px rgba(0,0,0,.4)}' +
        '#im-pass-card{background:rgba(28,28,30,.98);color:#f5f5f7}' +
        '#im-pass-card .im-pr{background:rgba(255,255,255,.08);color:#f5f5f7}' +
        '}';
      (document.head || document.documentElement).appendChild(passStyle);
      var passBtn = document.createElement("button");
      passBtn.id = "im-pass";
      passBtn.setAttribute("aria-label", "Instagram lock unavailable");
      passBtn.disabled = true;
      passBtn.innerHTML =
        "<svg width='22' height='22' viewBox='0 0 24 24' fill='none'" +
        " stroke='currentColor' stroke-width='2' stroke-linecap='round'" +
        " stroke-linejoin='round'>" +
        "<circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 3'/></svg>";
      (document.getElementById("im-tabs") || document.body || document.documentElement).appendChild(passBtn);
      var CLOCK = passBtn.innerHTML;
      var LOCKICON = "<svg width='22' height='22' viewBox='0 0 24 24' fill='none'" +
        " stroke='currentColor' stroke-width='2' stroke-linecap='round'" +
        " stroke-linejoin='round'><rect x='4' y='10.5' width='16' height='10.5' rx='3'/>" +
        "<path d='M8.5 10.5V8a3.5 3.5 0 0 1 7 0'/></svg>";
      // Lockable = Screen Time is available and no shield exists: the
      // button is the way into the block, the user's own decision (Sep 1).
      var lockable = false;
      function setLockable(on) {
        lockable = on;
        passBtn.disabled = false;
        document.documentElement.classList.toggle("im-lockable", on);
        passBtn.setAttribute("aria-label", on ? "Block Instagram" : "Five minute pass");
        passBtn.innerHTML = on ? LOCKICON : CLOCK;
      }
      markCaged = function () {
        document.documentElement.classList.add("im-caged");
        setLockable(false);
        passAvail = true;
        passLeft = 2;
      };
      window.addEventListener("konvo-cage-paused", function () {
        passAvail = false;
        document.documentElement.classList.remove("im-caged");
        var sheet = document.getElementById("im-pass-sheet");
        if (sheet) sheet.remove();
        setLockable(true);
      });
      storekit("cageStatus", null, function (s) {
        if (s && s.active) {
          markCaged();
          passAvail = !!s.passAvailable;
          passMins = s.passMins || 5;
          passLeft = s.passesLeft != null ? s.passesLeft : (passAvail ? 2 : 0);
        } else if (s && s.supported) {
          setLockable(true);
        }
      });
      // One nudge, once, on a later day, on the first return from a chat:
      // the app has just done its job. Never the first day, never under a
      // wall, never once a shield exists.
      nudgeBlock = function (days) {
        try {
          if (!lockable || document.getElementById("im-pay")) return false;
          if (localStorage.konvoBlockNudged) return false;
          if (days < 2) return false;
          if (!threadsThisSession) return false;
          localStorage.konvoBlockNudged = "1";
        } catch (e) { return false; }
        track("block_nudge_shown", {});
        var sheet = document.createElement("div");
        sheet.id = "im-pass-sheet";
        sheet.innerHTML = "<div id='im-pass-card'><h3>" + T("Ready to lock the Instagram app?") +
          "</h3><p>" + T("Konvo keeps your DMs. Two 5 minute passes a day.") + "</p>" +
          "<button class='im-go im-block'>" + T("Block Instagram") + "</button>" +
          "<button class='im-x'>" + T("Not now") + "</button></div>";
        sheet.addEventListener("click", function (e) {
          var go = e.target.closest(".im-block");
          if (!go && !e.target.closest(".im-x") && e.target !== sheet) return;
          if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
          track("block_nudge", { choice: go ? "block" : "later" });
          if (go) { setupVia = "nudge"; setupOnly = true; ensure(); }
        });
        (document.body || document.documentElement).appendChild(sheet);
        return true;
      };
      passBtn.addEventListener("click", function () {
        if (lockable) {
          track("block_button_tapped", {});
          setupVia = "button"; setupOnly = true; ensure();
          return;
        }
        // "Reply to someone" was a reason in the first cut and made no
        // sense - replies live in Konvo. Calls do not (documented trade),
        // so calling is exactly what the pass is for.
        var REASONS = [["story", "Post a story"], ["call", "Call someone"],
          ["post", "Post a picture or Reel"], ["other", "Something else"]];
        var opts = "";
        for (var i = 0; i < REASONS.length; i++) {
          opts += "<button class='im-pr' data-r='" + REASONS[i][0] + "'>" +
            REASONS[i][1] + "</button>";
        }
        var sheet = document.createElement("div");
        sheet.id = "im-pass-sheet";
        sheet.innerHTML = "<div id='im-pass-card'>" + (passAvail
          ? "<h3>Why do you want to unlock Instagram?</h3>" + opts +
            "<button class='im-go' disabled>Unlock for " + passMins +
            " mins</button>" +
            "<p>Unlocks left: " + passLeft + " (" + passMins +
            (passLeft > 1 ? " mins each)" : " mins)") + "</p>"
          : "<h3>No pass left today</h3>" +
            "<p>They come back tomorrow.</p>") +
          // The one Konvo-owned surface in daily use, so feedback lives
          // here (Sep 1). ponytail: English like the rest of the card;
          // translate the card as a whole when the pass sheet is localized.
          "<button class='im-fb'>Send feedback</button>" +
          "<button class='im-x'>Close</button></div>";
        var reason = "";
        sheet.addEventListener("click", function (e) {
          if (e.target.closest(".im-fb")) {
            track("feedback_opened", {});
            storekit("feedback", null, function () {});
            if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
            return;
          }
          var r = e.target.closest(".im-pr");
          if (r) {
            reason = r.dataset.r;
            var rs = sheet.querySelectorAll(".im-pr");
            for (var j = 0; j < rs.length; j++) rs[j].classList.remove("on");
            r.classList.add("on");
            var go = sheet.querySelector(".im-go");
            if (go) go.disabled = false;
            return;
          }
          var go2 = e.target.closest(".im-go");
          if (go2 && !go2.disabled && reason) {
            storekit("cagePass", null, function (res) {
              if (res && res.granted) {
                track("pass_used", { reason: reason, mins: passMins });
                // cageStatus corrects this on the next launch either way.
                passLeft = Math.max(passLeft - 1, 0);
                passAvail = passLeft > 0;
              }
              if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
            });
            return;
          }
          if (e.target.closest(".im-x") || e.target === sheet) {
            if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
          }
        });
        (document.body || document.documentElement).appendChild(sheet);
      });
    }

    // Verify at every launch; the verdict beats the cache in both
    // directions. No reply (bridge missing, StoreKit unreachable offline)
    // changes nothing - the cache carries a paying user through airplane
    // mode, and a fresh user has no cache to be wrongly unlocked by.
    // The verdict gates the sequence (see ensure). A missing bridge answers
    // null immediately; a bridge that never replies is covered by the
    // timeout, so a hung StoreKit cannot lock a new user out of onboarding.
    storekit("onboardingContext", null, function (res) {
      if (experimentReady) return;
      experimentContext = {variant:"control",enrolled:false,retired:true}; experimentReady = true; ensure();
    });
    setTimeout(function(){ if(!experimentReady){experimentReady=true;ensure();} },2500);
    storekit("entitlements", null, function (res) {
      entitlementKnown = true;
      // Preview the purchase flow even on an already-entitled tester install.
      // Do not erase its paid cache or change its existing Screen Time shields.
      if (window.__konvoOnboardingPreview) return;
      if (!res || typeof res.entitled !== "boolean") return;
      accessState = res.accessState || (res.entitled ? "active" : "unknown");
      setCache(!!res.entitled);
      if (res.entitled) {
        dismiss();
        // No Screen Time step on launch (Sep 1): a payer without a shield
        // has the lock button in the inbox and decides for themselves.
      } else {
        if (expiredAccess() && wall && !setupOnly) {
          lapsedWall = true;
          unmock();
          setPage(pay("y"));
        }
        // A lapsed subscription must not hold Instagram hostage: lift the
        // cage unless beta access still covers it. cageOff is a no-op when
        // no cage was ever set.
        try {
          if (!localStorage.konvoBetaFree) storekit("cageOff", null, function () {});
        } catch (e) {}
      }
    });
    setTimeout(function () { entitlementKnown = true; }, 2500);
    // Retention: fired once per launch, never per navigation.
    // sessionStorage dies with the webview session, so a relaunch counts and
    // moving between screens does not.
    try {
      if (!sessionStorage.konvoOpened) {
        sessionStorage.konvoOpened = "1";
        track("app_opened");
      }
    } catch (e) {}

    // A paying user never sees a wall, so the phone rules immediately.
    if (cached()) goAuto();
    // Same belt-and-braces cadence as enforce(): the inbox is reached by SPA
    // navigation after login, which fires no event this script can hook.
    setInterval(ensure, 800);
    ensure();
  })();

  // Both sweeps are whole-document scans (one of them reads textContent off
  // every span/div/a), and Instagram mutates the DOM on every keystroke,
  // scroll tick and presence ping. Running them per mutation was free on a
  // fast phone and visible jank on an older one, so mutations only ever
  // SCHEDULE a sweep: at most one per frame, and never more than one per
  // 400ms. The CSS rules hide the same doorways instantly anyway; these
  // scans are the fallback for markup the selectors miss.
  var sweepPending = false, sweptAt = 0;
  function sweep() { hideProfileLink(); }
  function scheduleSweep() {
    if (sweepPending) return;
    sweepPending = true;
    var wait = Math.max(0, 400 - (Date.now() - sweptAt));
    setTimeout(function () {
      // Idle time when the engine offers it: a scan that lands mid-scroll
      // or mid-keystroke is exactly the frame the user feels. The timeout
      // guarantees it still runs on a busy page.
      var run = function () {
        sweepPending = false;
        sweptAt = Date.now();
        sweep();
      };
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 1200 });
      else requestAnimationFrame(run);
    }, wait);
  }
  new MutationObserver(scheduleSweep)
    .observe(document.documentElement, { childList: true, subtree: true });
  sweep();
})();
