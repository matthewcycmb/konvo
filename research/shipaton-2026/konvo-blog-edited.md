# I’m 16, and this is my first time building an app and launching it on the App Store

It’s called Konvo: DM’s Only. I built it because I wanted to check my Instagram messages without ending up scrolling through Reels.

**What Konvo does**

Konvo is essentially Instagram’s webpage built into an app, where I injected a script to hide the feed, Explore, and Reels buttons while keeping access to DMs. There are also rules that send you back to your inbox if you try to open one of those pages.

You sign in through Instagram’s own login page, and your DMs, group chats, and story replies still work. Individual posts or reels shared in a conversation can still open. Your password and message contents aren’t sent to Konvo’s servers.

The idea itself wasn’t too complicated, but building it was very complicated.

**Why existing screen time apps didn’t work for me**

When I used the screen time apps on the App Store, I realised that I always JUST wanted to check my messages, but ended up scrolling. The ones I tried followed the same idea: you block Instagram, wait 10 to 20 seconds if you want to unlock it, use it for 5 or 15 minutes, and then Instagram gets blocked again.

I hated this because all I wanted to do was check my Instagram messages!! As soon as I unlocked it, Reels was still right there.

At my school, we don’t really ask for each other’s phone numbers anymore. We ask, “yo whats your insta”, and talk & message from there. So deleting Instagram completely meant missing messages from my friends too.

That’s why I couldn’t take it anymore and built Konvo.

Fun fact, after getting the first version of Konvo on my phone, I deleted Instagram, and I’ve been using Konvo ever since lol.

**Getting through 6 App Store rejections**

Konvo got rejected 6 times before it was accepted. I really believed in the idea, so I kept going back and fixing what Apple asked me to change.

Some of it came down to these nitty-gritty details, like adding a Terms of Service link to the subscription screen. I also had to give the Apple reviewer access to both an Instagram test account AND its Gmail account, so they could log in to Instagram AND get the verification code from the email.

I added the missing link, made sure the reviewer could actually get into the account, and kept working through the feedback. Eventually, when everything was fixed, the app was finally accepted!

It taught me that getting the app to work was only part of it. I also had to make sure someone reviewing it could actually get in and test it.

**What changed across the first 73 builds**

A lot of those first 73 builds involved adding, changing, or removing pages from the onboarding. I probably spent 60% of my time trying to make the user journey feel as personal as possible.

I wanted people to see their real Instagram inbox with no feed, Explore, or Reels buttons and get that “WOW” moment. Like, this is actually my inbox, and I can still talk to everyone.

Apart from that, it was fixing these annoying bugs I kept finding while testing Konvo over and over again on TestFlight.

**What my friends noticed that I didn’t**

I gave Konvo to 10 of my friends, and I remember 1 asking me to make the interface feel as close to the real Instagram app as possible.

I took his feedback and added these “SWIPE” animations. You know how you can swipe back out of a chat in Instagram? I wanted Konvo to feel like that too.

I was really surprised by this feedback because I’d never thought of it. While building Konvo, I didn’t have Instagram on my phone at all, so I’d stopped noticing how the original app felt.

**How Konvo makes money and uses RevenueCat**

Konvo uses a hard paywall. I read RevenueCat’s report covering 115,000+ apps and saw that apps with hard paywalls had around 5x the median rate of downloads turning into paying users within 35 days compared with freemium apps. That made me want to try it for Konvo. [RevenueCat’s State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps)

Right now, Konvo costs $24.99 USD a year or $7.99 USD a month, with local prices in other countries. Eligible users can try the yearly plan free for 7 days. After that, it renews at the yearly price unless they cancel. There isn’t a permanent free plan.

RevenueCat loads the current subscription prices, checks trial eligibility, unlocks access, and restores purchases for people who have already paid. I also send its subscription events to PostHog. Seeing people cancel in the first few minutes helped me improve the trial explanation and what happens after purchase.

This was my first time EVER charging for a product, and I’m proud to say it’s been a bit successful so far!

**Then my paywall broke on launch day**

I publicly launched Konvo on September 1st. My LinkedIn launch post reached 210,000+ impressions, but people downloading the app were getting stuck on “Loading your plans”. 10 people messaged me and one emailed.

The problem was that my paywall waited for 3 products from RevenueCat, but the 3rd, a lifetime purchase, had never been approved in App Store Connect. So the real store never sent it. My phone had a local StoreKit test file that still included that product, which is why I never saw the problem myself.

I fixed it in build 82 by only waiting for the products I was actually selling, submitted it through Apple’s expedited review & got accepted.

That taught me that working on my phone doesn’t mean it works for someone downloading it from the App Store. My own test setup had hidden the exact problem real users ran into.

**Where Konvo is now**

By September 21st, 2026, Konvo had:

- 1,500+ downloads
- $1,066 in gross revenue
- 300,000+ combined views and impressions across my social posts

I’ve also had 20 people help me test the app.

I’m entering Konvo in the Next Gen category of RevenueCat’s Shipaton 2026. This is my first app and my first time making money online, and it started because I just wanted to reply to my friends without scrolling :)

#shipaton #iloverevenuecat #Ilovehackernoon
