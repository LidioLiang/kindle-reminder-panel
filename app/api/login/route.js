import { NextResponse } from "next/server";
import { createSessionCookie, getCookieName, getCookieOptions, isValidAdminPassword } from "../../../lib/auth";

export async function POST(request) {
  const input = await request.json().catch(() => ({}));
  if (!isValidAdminPassword(input.password)) {
    return NextResponse.json({ error: "密码不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getCookieName(), createSessionCookie(), getCookieOptions());
  return response;
}
