import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCookieName, verifySessionCookie } from "../../../lib/auth";
import { getSupabaseForStorage } from "../../../lib/panel-data";

const BUCKET = "panel-uploads";

async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionCookie(cookieStore.get(getCookieName())?.value);
}

export async function POST(request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const input = await request.json();
    const match = String(input.dataUrl || "").match(/^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/i);
    if (!match) {
      return NextResponse.json({ error: "图片格式不支持" }, { status: 400 });
    }

    const ext = match[2].toLowerCase().replace("jpeg", "jpg");
    const image = Buffer.from(match[3], "base64");
    if (image.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "图片太大" }, { status: 413 });
    }

    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const supabase = getSupabaseForStorage();
    const { error } = await supabase.storage.from(BUCKET).upload(filename, image, {
      contentType: match[1],
      upsert: false
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return NextResponse.json({ url: data.publicUrl });
  } catch {
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
