import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "suftty_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export function getAuthConfigurationError() {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 32) {
    return "ADMIN_PASSWORD must contain at least 32 characters.";
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return "SESSION_SECRET must contain at least 32 characters.";
  }
  return null;
}

function sign(payload) {
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

export function createSessionCookie() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${expiresAt}.${randomBytes(16).toString("base64url")}`;
  const signature = sign(payload);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function isAuthenticated(req) {
  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!cookie || getAuthConfigurationError()) {
    return false;
  }

  const value = cookie.slice(COOKIE_NAME.length + 1);
  const lastDot = value.lastIndexOf(".");
  if (lastDot < 1) {
    return false;
  }

  const payload = value.slice(0, lastDot);
  const suppliedSignature = value.slice(lastDot + 1);
  const expectedSignature = sign(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return false;
  }

  const expiresAt = Number(payload.split(".", 1)[0]);
  return Number.isSafeInteger(expiresAt) && expiresAt > Date.now() / 1000;
}

export function verifyPassword(password) {
  const expected = Buffer.from(process.env.ADMIN_PASSWORD || "");
  const supplied = Buffer.from(typeof password === "string" ? password : "");
  return (
    supplied.length === expected.length &&
    expected.length > 0 &&
    timingSafeEqual(supplied, expected)
  );
}

export function hasSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (typeof origin !== "string" || typeof host !== "string") {
    return false;
  }
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
