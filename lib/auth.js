import crypto from "crypto";

const COOKIE_NAME = "kindle_panel_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function getSecret() {
  return process.env.SESSION_SECRET || "local-development-session-secret";
}

function sign(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSessionCookie() {
  const value = `admin.${Date.now()}`;
  return `${value}.${sign(value)}`;
}

export function verifySessionCookie(cookieValue) {
  if (!cookieValue) {
    return false;
  }

  const parts = String(cookieValue).split(".");
  if (parts.length !== 3) {
    return false;
  }

  const value = `${parts[0]}.${parts[1]}`;
  const expected = sign(value);
  try {
    return crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isValidAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || "kindle-admin";
  try {
    return crypto.timingSafeEqual(Buffer.from(String(password || "")), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/"
  };
}
