import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCookieName, verifySessionCookie } from "../../../lib/auth";
import { publishPanelToGitHub } from "../../../lib/github-sync";
import { readPanelData } from "../../../lib/panel-data";

function noStoreJson(body, init = {}) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(getCookieName())?.value);
}

export async function POST() {
  if (!(await isAuthenticated())) {
    return noStoreJson({ error: "未登录" }, { status: 401 });
  }

  try {
    const panel = await readPanelData();
    return noStoreJson(await publishPanelToGitHub(panel));
  } catch {
    return noStoreJson({ error: "同步失败" }, { status: 500 });
  }
}
