import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../next.config";

test("applies baseline browser-security headers to every route", async () => {
  assert.equal(typeof config.headers, "function");

  const rules = await config.headers?.();
  const globalRule = rules?.find((rule) => rule.source === "/:path*");
  const headers = new Map(globalRule?.headers.map((header) => [header.key, header.value]));

  assert.equal(headers.get("Content-Security-Policy"), "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
});
