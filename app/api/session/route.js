import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCookieName, verifySessionCookie } from "../../../lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({
    authenticated: verifySessionCookie(cookieStore.get(getCookieName())?.value)
  });
}
