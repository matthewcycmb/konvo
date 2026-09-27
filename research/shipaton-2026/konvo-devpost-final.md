## Inspiration

[ REVENUECAT SHIPATON 2026: NEXT GEN SUBMISSION ]

Have you ever opened Instagram to reply to one message, but end up scrolling 36 minutes later?

I'm 16, and for the past 2 years, I've been constantly trying to end my screen time addiction. I've tried dozens of screen time apps, but I kept running into the same problem:

Whether I unlocked Instagram for 5, 15, or 30 minutes to reply to someone, Reels was still right there. And Instagram is so freaking addictive.

So on July 1st, 2026, I made a promise to myself to delete Instagram completely for 2 weeks.

2 weeks later, I redownloaded Instagram and realised I didn't have the urge to scroll anymore. But when I opened my messages, I saw 15+ unread messages from friends asking to hang out, call, or get advice.

I had just ghosted all of them and left them on delivered. Which didn't feel good, because you know I love all my friends.

At my school, we don't really ask for each other's phone numbers anymore. We ask, "yo whats your insta", and talk & message from there.

So I thought, what if I could keep my Instagram messages without the feed, Explore, and Reels pages?

Maybe like a WhatsApp for "Instagram messages"?

## What it does

So that's why I built Konvo: DM's Only.

You sign in on Instagram's own login page inside the app, and it opens straight to your inbox. Your password and message contents aren't sent to Konvo's servers.

Your DMs, group chats, story replies, profiles, and notifications still work. The feed, Explore, and Reels pages are hidden. Individual posts or reels shared in a conversation can still open.

There's also the option to lock the real Instagram app with Screen Time, with 2 short passes a day to post a story or call someone.

## How we built it

I initially tried the official Instagram API, but the restrictions didn't work for what I wanted to build, especially normal conversations and group chats. So I pivoted after 2 days.

Then I tried loading instagram.com in a web view and injecting a script before Instagram's own code runs. And it worked! I could hide the distracting pages and add my own buttons.

URL rules send the feed pages back to the inbox, and CSS hides the buttons that lead to them. When Instagram changes its layout, I can update those rules through a JSON file on my site without waiting for an app update.

I built Konvo on my MacBook first, saw it worked like really well, then moved it to iPhone. Tauri + Rust for the app, Swift for RevenueCat, Screen Time, and notifications.

Most of Konvo was built in the back row of 3-hour lectures at a 2-week high school business program in Hong Kong, and in my bedroom over the summer.

## How Konvo uses RevenueCat

RevenueCat handles Konvo's monthly and annual subscriptions. The paywall loads the actual prices in your currency from its offering, checks whether you're eligible for the annual plan's 7-day trial, and uses the Pro entitlement to unlock access. It also restores purchases, so someone who's already paid doesn't have to pay again. The trial gives people time to see whether Konvo helps them stop scrolling while keeping their messages. I also send RevenueCat's subscription events to PostHog through webhooks. Seeing people cancel in the first few minutes helped me improve the trial explanation and what happens after purchase.

## Challenges we ran into

App Store review took multiple attempts, including fixes to description details & getting Apple's testers access to the verification code for my test Instagram account.

Then the paywall broke when I launched it on LinkedIn.

My LinkedIn app launch post reached 210,000+ impressions, but people who downloaded Konvo were getting stuck on "Loading your plans". 10 people messaged me and one emailed.

The cause was: my paywall waited for 3 products from RevenueCat, and the 3rd, a lifetime purchase, was never approved in App Store Connect. So the real store never sent it. My phone had a local StoreKit file that still had it, which is why I never saw the problem.

I fixed it in build 82 by only waiting for the products I was actually selling, submitted it through Apple's expedited review & got accepted.

## Accomplishments that we're proud of

Konvo is published on the App Store. By September 21st, 2026:

- 1,500+ downloads
- $1,066 in revenue
- 300,000+ combined views and impressions across my social posts

The demo shows an earlier build. On September 25th, I submitted v1.9.0, build 130, for App Store review. The matching source and version notes are linked at the top of my [public repository](https://github.com/matthewcycmb/konvo).

This is my first time building an app, and my first time making money online. It has been an unbelievable experience, and I would like to thank my parents for supporting me :)

## What we learned

I thought modifying Instagram's UI was too ambitious. But I was like, freak it, why don't I give it a shot anyway, and that's how Konvo started.

Building something for myself also meant I knew exactly what wasn't working. Deleting Instagram stopped the scrolling, but I couldn't keep it deleted because of my messages & friends.

And the launch-day bug taught me that working on my phone doesn't mean it works for someone downloading it from the App Store. My test setup had hidden the exact problem real users ran into.

## What's next for Konvo: DM's Only

Number 1 priority: BRING KONVO TO ANDROID, GOOGLE PLAY STORE.

I got 100+ requests and DMs from LinkedIn asking for an Android version, and that is exactly what's next for Konvo.

MARKETING!!!!

I'll keep sharing my own journey on LinkedIn, Instagram, and TikTok, testing video formats, and collecting user feedback. My next goal is 1M+ combined views and impressions across my posts.

So fixing bugs is one thing I have to do, but getting Konvo in front of more people is another :)
