import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionCookie,
  getAuthConfigurationError,
  hasSameOrigin,
  isAuthenticated,
  verifyPassword,
} from "../lib/auth.js";
import adminConfigHandler from "../api/admin/config.js";
import developerHandler from "../api/developer.js";

const originalEnv = {
  adminPassword: process.env.ADMIN_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET,
  nodeEnv: process.env.NODE_ENV,
};

test.before(() => {
  process.env.ADMIN_PASSWORD = "random-admin-password-with-more-than-32-characters";
  process.env.SESSION_SECRET = "random-session-secret-with-more-than-32-characters";
  process.env.NODE_ENV = "test";
});

test.after(() => {
  if (originalEnv.adminPassword === undefined) {
    delete process.env.ADMIN_PASSWORD;
  } else {
    process.env.ADMIN_PASSWORD = originalEnv.adminPassword;
  }
  if (originalEnv.sessionSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalEnv.sessionSecret;
  }
  if (originalEnv.nodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalEnv.nodeEnv;
  }
});

test("valid session is accepted and a modified session is rejected", () => {
  const cookie = createSessionCookie().split(";")[0];
  assert.equal(isAuthenticated({ headers: { cookie } }), true);
  assert.equal(
    isAuthenticated({ headers: { cookie: `${cookie}tampered` } }),
    false,
  );
});

test("password verification and configuration strength are enforced", () => {
  const validPassword = process.env.ADMIN_PASSWORD;
  assert.equal(getAuthConfigurationError(), null);
  assert.equal(verifyPassword(validPassword), true);
  assert.equal(verifyPassword("incorrect"), false);
  process.env.ADMIN_PASSWORD = "too-short";
  assert.match(getAuthConfigurationError(), /at least 32 characters/);
  process.env.ADMIN_PASSWORD = validPassword;
});

test("mutating requests require a same-origin request", () => {
  assert.equal(
    hasSameOrigin({
      headers: { origin: "https://example.com", host: "example.com" },
    }),
    true,
  );
  assert.equal(
    hasSameOrigin({
      headers: { origin: "https://attacker.example", host: "example.com" },
    }),
    false,
  );
});

test("developer settings are served only for an authenticated session", async () => {
  function createResponse() {
    return {
      headers: {},
      statusCode: 200,
      body: "",
      setHeader(name, value) {
        this.headers[name] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(body) {
        this.body = body;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
  }

  const publicResponse = createResponse();
  developerHandler({ method: "GET", headers: {} }, publicResponse);
  assert.equal(publicResponse.statusCode, 200);
  assert.match(publicResponse.body, /id="login-form"/);
  assert.doesNotMatch(publicResponse.body, /id="ca-input"/);

  const cookie = createSessionCookie().split(";")[0];
  const adminResponse = createResponse();
  developerHandler(
    { method: "GET", headers: { cookie } },
    adminResponse,
  );
  assert.match(adminResponse.body, /id="ca-input"/);

  const apiResponse = createResponse();
  await adminConfigHandler(
    { method: "GET", headers: {} },
    apiResponse,
  );
  assert.equal(apiResponse.statusCode, 401);
});
