import test from "node:test";
import assert from "node:assert/strict";
import { handleAndroidWaitlist, normalizeWaitlistEmail, WAITLIST_KEY } from "./android-waitlist.ts";

const env = { KV_REST_API_URL: "https://storage.invalid", KV_REST_API_TOKEN: "test-secret", VERCEL_ENV: "production" };
function request(body = { email: "person@example.com", consent: true, website: "" }, options = {}) {
  return new Request("https://konvoinstall.com/api/android-waitlist", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://konvoinstall.com", "x-forwarded-for": "192.0.2.1", ...options.headers },
    body: options.raw ?? JSON.stringify(body),
  });
}
function storage() {
  const entries = new Map(), limits = new Map(), calls = [];
  async function fetcher(_url, init) {
    const command = JSON.parse(init.body);
    calls.push(command);
    if (command[0] === "EVAL") {
      const count = (limits.get(command[3]) ?? 0) + 1;
      limits.set(command[3], count);
      return Response.json({ result: count });
    }
    const [, key, field, value] = command;
    const id = `${key}:${field}`;
    const existed = entries.has(id);
    if (!existed) entries.set(id, value);
    return Response.json({ result: existed ? 0 : 1 });
  }
  return { entries, limits, calls, fetcher };
}

test("normalizes ordinary addresses without merging distinct plus-tag addresses", () => {
  assert.equal(normalizeWaitlistEmail(" Person+Android@Example.COM "), "person+android@example.com");
  for (const value of [null, 123, "", "person", "p@@example.com", "p@example", "a b@example.com", "a\n@example.com", "..a@example.com", "a.@example.com", "a@-example.com", "a@example..com", `${"a".repeat(65)}@example.com`]) {
    assert.equal(normalizeWaitlistEmail(value), null, String(value));
  }
});

test("saves consent and deduplicates normalized addresses without overwriting the first signup", async () => {
  const db = storage();
  const first = await handleAndroidWaitlist(request({ email: " Person@Example.COM ", consent: true, website: "" }), { env, fetcher: db.fetcher });
  assert.equal(first.status, 200);
  const original = [...db.entries.values()][0];
  const saved = JSON.parse(original);
  assert.equal(saved.email, "person@example.com");
  assert.equal(saved.platform, "android");
  assert.ok(saved.consentVersion && saved.joinedAt);
  assert.equal(saved.ip, undefined);
  const second = await handleAndroidWaitlist(request(), { env, fetcher: db.fetcher });
  assert.deepEqual(await first.json(), await second.json());
  assert.equal(db.entries.size, 1);
  assert.equal([...db.entries.values()][0], original);
  assert.ok(!JSON.stringify(db.calls).includes("192.0.2.1"));
  assert.equal(first.headers.get("cache-control"), "no-store");
});

test("bad input, missing consent, and honeypot submissions never reach storage", async () => {
  const db = storage();
  for (const body of [null, [], {}, { email: "bad", consent: true }, { email: "person@example.com" }, { email: "person@example.com", consent: "true" }, { email: "person@example.com", consent: true, website: "spam" }]) {
    const result = await handleAndroidWaitlist(request(body), { env, fetcher: db.fetcher });
    assert.equal(result.status, 400);
  }
  assert.equal((await handleAndroidWaitlist(request({}, { raw: "{" }), { env, fetcher: db.fetcher })).status, 400);
  assert.equal(db.calls.length, 0);
});

test("rejects cross-origin, non-JSON and oversized requests", async () => {
  const db = storage();
  assert.equal((await handleAndroidWaitlist(request(undefined, { headers: { origin: "https://other.example" } }), { env, fetcher: db.fetcher })).status, 403);
  assert.equal((await handleAndroidWaitlist(request(undefined, { headers: { "content-type": "text/plain" } }), { env, fetcher: db.fetcher })).status, 415);
  assert.equal((await handleAndroidWaitlist(request({ email: "a".repeat(2200) }), { env, fetcher: db.fetcher })).status, 413);
  assert.equal(db.calls.length, 0);
});

test("a successful HTTP status from storage is insufficient without a valid save acknowledgement", async () => {
  for (const result of [{ error: "redis failure" }, {}, { result: null }, { result: "OK" }]) {
    let calls = 0;
    const response = await handleAndroidWaitlist(request(), { env, fetcher: async () => Response.json(++calls === 1 ? { result: 1 } : result) });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  }
});

test("missing configuration, network failures and rejected storage return retryable failure", async () => {
  assert.equal((await handleAndroidWaitlist(request(), { env: {} })).status, 503);
  for (const fetcher of [async () => { throw new Error("offline"); }, async () => new Response("unavailable", { status: 503 })]) {
    assert.equal((await handleAndroidWaitlist(request(), { env, fetcher })).status, 503);
  }
});

test("rate-limited requests do not save more addresses", async () => {
  const db = storage();
  for (let index = 0; index < 10; index++) {
    assert.equal((await handleAndroidWaitlist(request({ email: `person${index}@example.com`, consent: true }), { env, fetcher: db.fetcher })).status, 200);
  }
  const limited = await handleAndroidWaitlist(request(), { env, fetcher: db.fetcher });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "3600");
  assert.equal(db.entries.size, 10);
});

test("preview and local signups never enter the production mailing list", async () => {
  for (const stage of ["preview", "development", undefined]) {
    const db = storage();
    await handleAndroidWaitlist(request(), { env: { ...env, VERCEL_ENV: stage }, fetcher: db.fetcher });
    assert.equal(db.calls.at(-1)[1], `${WAITLIST_KEY}:test`);
  }
});
