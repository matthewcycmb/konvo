import { createHash, createHmac } from "node:crypto";

export const WAITLIST_KEY = "waitlist:android:v1";
const CONSENT_VERSION = "android-beta-2026-09-28";
const RATE_WINDOW_SECONDS = 3600;
const RATE_LIMIT = 10;
const RATE_SCRIPT = `local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n`;

export function normalizeWaitlistEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || /[\s\x00-\x1f\x7f]/.test(email)) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return null;
  const labels = domain.split(".");
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  return email;
}

function reply(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/** Server-only: submissions are durable even if browser analytics is blocked. */
export async function handleAndroidWaitlist(
  request: Request,
  { env = process.env, fetcher = fetch }: {
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
  } = {},
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return reply({ ok: false, error: "Please sign up from the Konvo website." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ ok: false, error: "Please submit the email form." }, 415);
  }
  if (Number(request.headers.get("content-length")) > 2048) {
    return reply({ ok: false, error: "Please enter only your email address." }, 413);
  }
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2048) return reply({ ok: false, error: "Please enter only your email address." }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid body");
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ ok: false, error: "Please enter a valid email address." }, 400);
  }
  const email = normalizeWaitlistEmail(body.email);
  if (!email || body.consent !== true || (body.website !== undefined && body.website !== "")) {
    return reply({ ok: false, error: "Please enter a valid email address and join using the form." }, 400);
  }

  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  if (!url || !token) return reply({ ok: false, error: "The waitlist is temporarily unavailable. Please try again shortly." }, 503);
  // Preview/development submissions never enter the launch mailing list.
  const namespace = env.VERCEL_ENV === "production" ? WAITLIST_KEY : `${WAITLIST_KEY}:test`;
  async function command(...args: (string | number)[]) {
    const response = await fetcher(url!, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("storage unavailable");
    const result = await response.json() as { result?: unknown; error?: unknown };
    if (result.error || !("result" in result)) throw new Error("storage rejected command");
    return result.result;
  }

  try {
    // Vercel sets x-forwarded-for. Keep only a keyed hash, with a one-hour TTL.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const rateId = createHmac("sha256", token).update(ip).digest("hex");
    const attempts = await command("EVAL", RATE_SCRIPT, 1, `${namespace}:rate:${rateId}`, RATE_WINDOW_SECONDS);
    if (typeof attempts !== "number" || !Number.isInteger(attempts) || attempts < 1) throw new Error("invalid rate result");
    if (attempts > RATE_LIMIT) return reply({ ok: false, error: "Too many attempts. Please try again in an hour." }, 429, { "Retry-After": String(RATE_WINDOW_SECONDS) });

    const emailId = createHash("sha256").update(email).digest("hex");
    const inserted = await command("HSETNX", namespace, emailId, JSON.stringify({
      email,
      joinedAt: new Date().toISOString(),
      source: "konvoinstall.com",
      platform: "android",
      consentVersion: CONSENT_VERSION,
    }));
    if (inserted !== 0 && inserted !== 1) throw new Error("save not acknowledged");
    // Identical responses for new and existing addresses avoid disclosing membership.
    return reply({ ok: true });
  } catch {
    // Never log request bodies, email addresses, tokens, or upstream error details.
    return reply({ ok: false, error: "We couldn’t save your email. Please try again." }, 503);
  }
}
