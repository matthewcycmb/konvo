import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Konvo",
};

const CONTACT_EMAIL = "jchanh@gmail.com";
const EFFECTIVE_DATE = "September 28, 2026";

// The landing page is hardcoded light (blue on white); this page follows it
// rather than the app's dark-mode tokens, so tapping Privacy from the site
// or the paywall never flips the palette.
const LANDING_THEME = {
  background: "#fff",
  "--ink": "#0f1b33",
  "--muted": "#5a6478",
  "--faint": "#98a1b0",
  "--amber": "#0a5cf0",
} as React.CSSProperties;

export default function PrivacyPage() {
  return (
    <div className="w-full flex-1" style={LANDING_THEME}>
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="mb-8">
        <Link href="/" className="text-sm text-muted transition-colors hover:text-ink">
          ← konvo
        </Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-faint">Effective {EFFECTIVE_DATE}</p>
      </header>

      <div className="space-y-8 text-[15px] leading-relaxed text-muted">
        <Section title="What Konvo is">
          <p>
            Konvo is an app for iPhone and Mac that opens Instagram&rsquo;s own website in
            a focused window showing your messages and friends&rsquo; stories, with the
            feed, Reels, and Explore hidden. There is also a browser extension that
            redirects instagram.com&rsquo;s feed, reels, and profile pages to this site.
            You sign in to Instagram directly with Instagram; Konvo is not affiliated
            with Meta.
          </p>
        </Section>

        <Section title="What we never collect">
          <p>
            <span className="text-ink">
              Your Instagram password, your messages, and your contacts.
            </span>{" "}
            Konvo has no accounts and no login of its own. Your Instagram sign-in happens
            directly between you and instagram.com inside the app, and that session stays on
            your device &mdash; it never passes through or gets stored on our servers, because
            there is no server holding it. You can end it any time from Instagram&rsquo;s own
            &ldquo;Where you&rsquo;re logged in&rdquo; settings. The browser extension
            contains only static redirect rules: it runs no code on any page, and reads and
            transmits no data.
          </p>
        </Section>

        <Section title="What we do collect">
          <p>
            Two things, and neither identifies you to us by name.
          </p>
          <p className="mt-3">
            <span className="text-ink">Anonymous usage events.</span> Which onboarding screen
            you reached, whether sign-in succeeded, and that the app was opened. These carry a
            random identifier generated on your device, not your Instagram username, and never
            the contents of anything you read or write.
          </p>
          <p className="mt-3">
            <span className="text-ink">Your email address, only if you type it in.</span> The
            app asks for one during setup and the step is skippable; if you skip it we have no
            way to contact you and nothing is stored. If you give it, we use it to ask what you
            think of Konvo and to tell you about changes to it. We do not sell it, and you can
            have it deleted by emailing the address at the bottom of this page.
          </p>
          <p className="mt-3">
            <span className="text-ink">Android waitlist.</span> If you join on this website,
            we store your email address, signup date, and consent to receive an email
            about Android availability. Waitlist emails are stored in our server-side
            database with Upstash, not included in the waitlist analytics events. We use
            a temporary, keyed hash of your IP address to limit spam; it expires after
            one hour. You can leave the list or request deletion by emailing the address below.
          </p>
        </Section>

        <Section title="Purchases">
          <p>
            Konvo on iPhone offers auto-renewable subscriptions. Purchases are made
            through Apple and billed to your Apple ID; we never see your payment
            details, and no purchase information reaches us. The app checks your
            subscription status on your device through Apple&rsquo;s StoreKit and stores
            that status only on the device.
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            Both this website and the iPhone app use PostHog to count anonymous visits,
            screens reached and buttons pressed, so we can see where setup breaks. The
            browser extension contains no analytics.
          </p>
        </Section>

        <Section title="Third parties">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-ink">Meta Platforms</span>: your Instagram session inside
              the app is governed by{" "}
              <a
                href="https://www.facebook.com/privacy/policy"
                className="text-amber underline underline-offset-2"
              >
                Meta&rsquo;s privacy policy
              </a>
              .
            </li>
            <li>
              <span className="text-ink">Apple</span>: processes subscription payments
              under{" "}
              <a
                href="https://www.apple.com/legal/privacy/"
                className="text-amber underline underline-offset-2"
              >
                Apple&rsquo;s privacy policy
              </a>
              .
            </li>
            <li>
              <span className="text-ink">PostHog</span>: receives the anonymous usage events
              and, if you gave one, your email address, under{" "}
              <a
                href="https://posthog.com/privacy"
                className="text-amber underline underline-offset-2"
              >
                PostHog&rsquo;s privacy policy
              </a>
              .
            </li>
            <li>
              <span className="text-ink">RevenueCat</span>: checks subscription status under{" "}
              <a
                href="https://www.revenuecat.com/privacy"
                className="text-amber underline underline-offset-2"
              >
                RevenueCat&rsquo;s privacy policy
              </a>
              .
            </li>
            <li>
              <span className="text-ink">Vercel</span>: hosts this website.
            </li>
            <li>
              <span className="text-ink">Upstash</span>: stores Android waitlist signups
              on our behalf.
            </li>
          </ul>
        </Section>

        <Section title="Contact">
          <p>
            Questions or requests:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>
      </div>
    </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
