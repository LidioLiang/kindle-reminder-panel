import { promises as fsp } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const LOCAL_DATA_FILE = path.join(ROOT, "data", "panel.json");
const PANEL_ID = "main";
const TABLE_NAME = "panel_data";

export const defaultData = {
  todos: [
    {
      title: "确认 Kindle 云端展示效果",
      note: "重点看自由白板默认页、点击显示表头和底部切换是否顺手。",
      done: false
    },
    {
      title: "整理今天最重要的一件事",
      note: "只写真正要推进的动作，让提醒面板保持清爽。",
      done: false
    },
    {
      title: "晚上复盘一个进展",
      note: "记录今天已经完成的部分，明天继续迭代。",
      done: false
    },
    {
      title: "测试 Kindle 刷新",
      note: "部署成功后，在 Kindle 浏览器里刷新查看最新页面。",
      done: false
    },
    {
      title: "决定是否接入云端编辑",
      note: "先确认展示稳定，再考虑加密码和在线后台。",
      done: false
    }
  ],
  whiteboardHtml: "<p><font size=\"3\">今天只看最重要的提醒。</font></p><p><font size=\"3\">保持页面干净，保持行动清楚。</font></p>"
};

function sanitizeRichHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function normalizeData(input) {
  const todos = Array.isArray(input?.todos) ? input.todos : defaultData.todos;
  return {
    todos: todos
      .map((todo) => ({
        title: String(todo?.title || "").trim() || "未命名提醒事项",
        note: String(todo?.note || "").trim(),
        done: Boolean(todo?.done)
      }))
      .slice(0, 50),
    whiteboardHtml: sanitizeRichHtml(input?.whiteboardHtml || defaultData.whiteboardHtml)
  };
}

export function sortTodos(todos) {
  return [...todos].sort((a, b) => Number(a.done) - Number(b.done));
}

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseAdmin() {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function readLocalData() {
  try {
    const raw = await fsp.readFile(LOCAL_DATA_FILE, "utf8");
    return normalizeData(JSON.parse(raw));
  } catch {
    return normalizeData(defaultData);
  }
}

async function writeLocalData(data) {
  await fsp.mkdir(path.dirname(LOCAL_DATA_FILE), { recursive: true });
  await fsp.writeFile(LOCAL_DATA_FILE, JSON.stringify(normalizeData(data), null, 2), "utf8");
}

export async function readPanelData() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return readLocalData();
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("todos_json, whiteboard_html")
    .eq("id", PANEL_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    await writePanelData(defaultData);
    return normalizeData(defaultData);
  }

  return normalizeData({
    todos: data.todos_json,
    whiteboardHtml: data.whiteboard_html
  });
}

export async function writePanelData(input) {
  const data = normalizeData(input);
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    await writeLocalData(data);
    return data;
  }

  const { error } = await supabase.from(TABLE_NAME).upsert({
    id: PANEL_ID,
    todos_json: data.todos,
    whiteboard_html: data.whiteboardHtml,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw error;
  }

  return data;
}

export function getSupabaseForStorage() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase storage is not configured");
  }
  return supabase;
}
