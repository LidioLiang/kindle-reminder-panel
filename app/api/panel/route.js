import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCookieName, verifySessionCookie } from "../../../lib/auth";
import { readPanelData, writePanelData } from "../../../lib/panel-data";

function noStoreJson(body, init = {}) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(getCookieName())?.value);
}

export async function GET() {
  try {
    return noStoreJson(await readPanelData());
  } catch {
    return noStoreJson({ error: "读取失败" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAuthenticated())) {
    return noStoreJson({ error: "未登录" }, { status: 401 });
  }

  try {
    const input = await request.json();
    return noStoreJson(await writePanelData(input));
  } catch {
    return noStoreJson({ error: "保存失败" }, { status: 500 });
  }
}
