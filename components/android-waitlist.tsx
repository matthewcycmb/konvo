"use client";

import { useRef, useState, type FormEvent } from "react";
import { track } from "@/lib/analytics";
import styles from "./android-waitlist.module.css";

export function AndroidWaitlist() {
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("saving");
    setError("");
    try {
      const response = await fetch("/api/android-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), website: data.get("website"), consent: true }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || "We couldn’t save your email. Please try again.");
      }
      form.reset();
      setStatus("success");
      track("android_waitlist_submitted", { platform: "android", placement: "homepage" });
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error && cause.name === "Error" ? cause.message : "We couldn’t confirm your signup. Please try again—it won’t add you twice.");
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <details
      id="android-waitlist"
      className={styles.waitlist}
      onToggle={event => {
        if (event.currentTarget.open) track("android_waitlist_opened", { placement: "homepage" });
      }}
    >
      <summary className={styles.trigger}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="m7 5-2-3m12 3 2-3M4 12a8 8 0 0 1 16 0v6H4zM8 18v3m8-3v3M1 12v5m22-5v5" />
          <path d="M8 8h.01M16 8h.01" strokeWidth="2.5" />
        </svg>
        <span>On Android? <strong>Join the waitlist</strong></span>
        <span className={styles.arrow} aria-hidden="true">↗</span>
      </summary>
      <div className={styles.card}>
        {status === "success" ? (
          <div role="status" className={styles.success}>
            <span className={styles.check} aria-hidden="true">✓</span>
            <h2>You’re on the list.</h2>
            <p>We’ll email you when Konvo is ready for Android testing.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="ph-no-capture" aria-busy={status === "saving"}>
            <h2>Your DMs. Your Android.</h2>
            <p>Get an email when Konvo opens for Android testing.</p>
            <label className={styles.label} htmlFor="android-email">Email address</label>
            <div className={styles.fields}>
              <input id="android-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required placeholder="you@example.com" readOnly={status === "saving"} aria-describedby={status === "error" ? "android-error android-consent" : "android-consent"} aria-invalid={status === "error" ? true : undefined} className="ph-no-capture ph-mask" data-private="true" />
              <button type="submit" disabled={status === "saving"}>{status === "saving" ? "Joining…" : "Join waitlist"}</button>
            </div>
            <div className={styles.honeypot} aria-hidden="true" inert>
              <label htmlFor="android-website">Website</label>
              <input id="android-website" name="website" type="text" autoComplete="off" tabIndex={-1} />
            </div>
            {status === "error" && <p id="android-error" role="alert" className={styles.error}>{error}</p>}
            <p id="android-consent" className={styles.consent}>By joining, you agree to an email about Android availability. No spam. <a href="/privacy">Privacy policy</a></p>
          </form>
        )}
      </div>
    </details>
  );
}
