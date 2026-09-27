# I’m 16, and this is my first time building an app and launching it on the App Store

I always JUST wanted to check my Instagram messages, but ended up scrolling.

I tried the screen time apps on the App Store, but kept running into the same problem. The ones I used would block Instagram, make me wait 10 to 20 seconds to unlock it, then give me 5 or 15 minutes before blocking it again. I hated this because all I wanted to do was check my Instagram messages!! As soon as I unlocked it, Reels was still right there.

So I tried deleting Instagram completely. That helped with the scrolling, but then I started missing messages from my friends.

At my school, we don’t really ask for each other’s phone numbers anymore. We ask, “yo whats your insta”, and talk & message from there. I wanted to keep that part.

That’s why I couldn’t take it anymore and built Konvo: DM’s Only.

## Getting Konvo onto my phone

The idea itself wasn’t too complicated, but building it was very complicated.

I initially tried the official Instagram API, but the restrictions didn’t work for normal conversations and group chats. So after 2 days, I tried loading Instagram’s webpage inside an app and changing what was visible.

On iPhone, Konvo uses WKWebView, Apple’s component for showing webpages inside an app. Tauri and Rust handle the app around it, and Swift connects features like RevenueCat and Screen Time.

I inject a script when the page starts loading. It uses CSS rules to find and hide the feed, Explore, and Reels buttons by their links and labels. For example, a link pointing to `/explore/` gets hidden, and there are also rules for icons labelled “Home”, “Explore”, or “Reels”. Checking the links matters because those labels can change depending on the language someone uses.

Then the script checks which Instagram page you’re on. If it’s the home feed, Explore, or the Reels feed, it sends you back to `/direct/inbox/`. Your DMs and group chats stay accessible. A single post or reel someone sends you can still open, because that’s part of the conversation.

Instagram also changes its interface, so I put a JSON file on my website that Konvo checks when a page loads. I can add updated hiding rules and blocked paths there, and the app saves the last copy it successfully loaded. That lets me fix some layout changes without waiting for an App Store update. It doesn’t cover everything though. If Instagram’s page security rules block that file from loading, or the change needs more than updated rules, I still need to release an app update.

Fun fact, after getting the first version of Konvo on my phone, I deleted Instagram, and I’ve been using Konvo ever since lol.

A lot of the first 73 builds went into adding, changing, or removing pages from the onboarding. I probably spent 60% of my time trying to make the user journey feel as personal as possible. I wanted people to see their real Instagram inbox with no feed, Explore, or Reels buttons and get that “WOW” moment.

Apart from that, it was fixing these annoying bugs I kept finding while testing Konvo over and over again on TestFlight.

I gave Konvo to 10 of my friends, and I remember 1 asking me to make it feel as close to the real Instagram app as possible. I took his feedback and added these “SWIPE” animations. You know how you can swipe back out of a chat in Instagram? I wanted Konvo to feel like that too.

I was really surprised because I’d never thought of it. While building Konvo, I didn’t have Instagram on my phone at all, so I’d stopped noticing how the original app felt.

## Getting it onto the App Store

I also had to figure out how to charge for it. This was my first time EVER charging for a product.

I read [RevenueCat’s State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps), which covers 115,000+ apps. It reports a median download-to-paid conversion rate by Day 35 of 10.7% for hard-paywall apps, compared with 2.1% for freemium apps. That’s roughly 5x the conversion rate. It made me want to try a hard paywall for Konvo, although those figures don’t tell me what my own app will earn.

Right now, Konvo costs $24.99 USD a year or $7.99 USD a month, with local prices in other countries. Eligible users can try the yearly plan free for 7 days. After that, it renews at the yearly price unless they cancel. There isn’t a permanent free plan.

RevenueCat loads the current subscription prices, checks trial eligibility, unlocks access, and restores purchases for people who have already paid. The trial gives people time to see whether Konvo helps them stop scrolling while keeping their messages.

Getting all of this accepted took 6 App Store rejections. Some of the fixes were these nitty-gritty details, like adding a Terms of Service link to the subscription screen. I also had to give the Apple reviewer access to both an Instagram test account AND its Gmail account, so they could log in AND get the verification code from the email.

I kept fixing what Apple asked me to change, and eventually, when everything was fixed, the app was finally accepted!

## Then real people started downloading it

I publicly launched Konvo on September 1st. But when people started downloading it from my LinkedIn launch post, they were getting stuck on “Loading your plans”. 10 people messaged me and one emailed.

My paywall was waiting for 3 products from RevenueCat, but the 3rd, a lifetime purchase, had never been approved in App Store Connect. So the real store never sent it. My phone had a local StoreKit test file that still included that product, which is why I never saw the problem myself.

I fixed it in build 82 by only waiting for the products I was actually selling, submitted it through Apple’s expedited review & got accepted.

That taught me that working on my phone doesn’t mean it works for someone downloading it from the App Store. My own test setup had hidden the exact problem real users ran into.

After launch, I also started using RevenueCat’s subscription events in PostHog to understand when people cancelled. Seeing cancellations in the first few minutes helped me improve the trial explanation and what happens after purchase.

By September 21st, 2026, Konvo had 1,500+ downloads, and my RevenueCat dashboard showed $1,066 in gross revenue with its “Last 28 days” filter selected. My LinkedIn launch post had also reached more than 210,000 impressions. Those are LinkedIn impressions, not video views or a count of different people.

*[Insert the original App Store Connect download screenshot here, with the reporting dates visible.]*

*[Insert the original RevenueCat revenue screenshot here, showing $1,066, the reporting dates, and the dashboard currency.]*

*[Insert the LinkedIn launch-post analytics screenshot here, with the post and reporting dates visible.]*

I’ve also had 20 people help me test the app. It still feels a little crazy that something I made for myself ended up being something other people wanted to use and pay for.

I’m entering Konvo in the Next Gen category of RevenueCat’s Shipaton 2026, and the [source is public](https://github.com/matthewcycmb/konvo/tree/shipaton-2026-v1.9.0). This is my first app and my first time making money online. It started because I just wanted to reply to my friends without scrolling :)

#shipaton #iloverevenuecat #Ilovehackernoon
