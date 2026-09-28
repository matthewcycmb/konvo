# Android waitlist

The homepage has an expandable email signup below the download buttons, on mobile and desktop. It does not send an email immediately or promise a release date.

`POST /api/android-waitlist` saves into the existing Upstash Redis database configured on Vercel. A success response requires an acknowledged database write (or an existing signup). Emails are normalized and deduplicated with `HSETNX`; repeat signups keep the original consent timestamp and receive the same response.

- Production hash: `waitlist:android:v1`.
- Preview/development hash: `waitlist:android:v1:test`, excluded from the launch list.
- Fields: SHA-256 of normalized email. Values: JSON containing email, joinedAt, source, platform and consentVersion.
- Count: `HLEN waitlist:android:v1` in the Upstash console.
- Read/export: `HVALS waitlist:android:v1` in the authenticated Upstash console. Keep the resulting email list private.
- Removal: normalize the address, compute its SHA-256 field, then `HDEL` that one field. Do not delete the whole hash.
- No public read/export endpoint exists.

IP-based request limits use a keyed hash and expire after one hour. Raw IP addresses are not stored in waitlist records. The form has a honeypot, validates email on both sides, and preserves entered text on failure.

PostHog events `android_waitlist_opened` and `android_waitlist_submitted` contain placement/platform, never the typed email. These are interaction counts; use the database count for unique signups. Saving does not depend on analytics being enabled.

Before emailing users about Android availability, export the production list through authenticated tooling, exclude any smoke-test record, and honor removal requests. No mailing service or automated campaign was enabled by this change.

Validation: `node --test lib/android-waitlist.test.mjs`; lint the component/route/helper; production Next.js build; browser mobile/desktop signup checks. Preview smoke tests use reserved `example.com` addresses and go into the separate test hash.

## Verified September 28, 2026

- Eight backend tests pass, plus TypeScript and lint (only existing image warnings in the landing page).
- Preview and production builds succeeded. Production deployment: `dpl_7GCgGqzKHQ3oCKj4KdjJWEcn3NA7`, aliased to `https://konvoinstall.com`.
- Real preview signup received database acknowledgement and showed confirmation. Repeating the test address also succeeded. Test data remains isolated in `waitlist:android:v1:test`.
- Browser validation blocks malformed email. A simulated 503 preserves the input, shows an error, and allows a successful retry against real preview storage.
- Desktop at 1440px and mobile at 390px/320px show no horizontal overflow; the mobile form stacks its input and button.
- Live homepage displays and expands the form; the production endpoint rejects invalid input with 400. No test email was inserted into the production list.
- No production credentials were exported and no email was sent.
