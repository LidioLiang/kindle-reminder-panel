const crypto = require("crypto");
const { execFile } = require("child_process");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DATA_FILE = path.join(DATA_DIR, "panel.json");
const STATIC_DATA_FILE = path.join(ROOT, "panel.json");
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

const defaultData = {
  todos: [
    {
      title: "上午完成 Kindle 提醒面板新版预览",
      note: "先确认底部切换和两个界面的整体感觉。",
      done: false
    },
    {
      title: "整理今天真正重要的三件事",
      note: "只留下必须推进的动作，让面板足够清楚。",
      done: false
    },
    {
      title: "晚上复盘一个进展和一个卡点",
      note: "明天继续做，不追求复杂，追求稳定推进。",
      done: false
    },
    {
      title: "确认 Kindle 上的显示尺寸",
      note: "重点看字号、按钮位置和刷新后的阅读感。",
      done: false
    },
    {
      title: "保留一句今天最想看到的话",
      note: "让白板像桌面便签一样，简单但有用。",
      done: false
    }
  ],
  whiteboardHtml: "<p>把这里当成一张白纸。</p><p>可以写一句提醒、列一个临时想法，也可以插入一张图片做视觉提示。</p>"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeRichHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function normalizeData(input) {
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

function sortTodos(todos) {
  return [...todos].sort((a, b) => Number(a.done) - Number(b.done));
}

function prepareStaticData(data) {
  const normalized = normalizeData(data);
  return {
    ...normalized,
    whiteboardHtml: normalized.whiteboardHtml.replace(/(["'(])\/uploads\//g, "$1uploads/")
  };
}

function getReferencedUploadFiles(html) {
  const files = new Set();
  const pattern = /(?:src|href)=["'](?:\/?uploads\/)([^"']+)["']/gi;
  let match;

  while ((match = pattern.exec(html))) {
    const filename = decodeURIComponent(match[1]).replace(/^\/+/, "");
    const filePath = path.normalize(path.join(UPLOAD_DIR, filename));
    if (filePath.startsWith(UPLOAD_DIR)) {
      files.add(filePath);
    }
  }

  return [...files];
}

function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: ROOT }, (error, stdout, stderr) => {
      if (error) {
        error.output = `${stdout || ""}${stderr || ""}`.trim();
        reject(error);
        return;
      }
      resolve(`${stdout || ""}${stderr || ""}`.trim());
    });
  });
}

function hasStagedGitChanges() {
  return new Promise((resolve, reject) => {
    execFile("git", ["diff", "--cached", "--quiet"], { cwd: ROOT }, (error) => {
      if (!error) {
        resolve(false);
        return;
      }
      if (error.code === 1) {
        resolve(true);
        return;
      }
      reject(error);
    });
  });
}

async function publishToGitHubPages() {
  const data = prepareStaticData(await readData());
  await fsp.writeFile(STATIC_DATA_FILE, JSON.stringify(data, null, 2), "utf8");

  const uploadFiles = [];
  for (const filePath of getReferencedUploadFiles(data.whiteboardHtml)) {
    try {
      await fsp.access(filePath, fs.constants.R_OK);
      uploadFiles.push(path.relative(ROOT, filePath));
    } catch {
      // Missing uploads are skipped so text changes can still publish.
    }
  }

  await runGit(["add", "panel.json"]);
  if (uploadFiles.length > 0) {
    await runGit(["add", "-f", ...uploadFiles]);
  }

  if (!(await hasStagedGitChanges())) {
    return {
      changed: false,
      url: "https://lidioliang.github.io/kindle-reminder-panel/"
    };
  }

  const now = new Date();
  const stamp = now.toISOString().replace("T", " ").slice(0, 16);
  await runGit(["commit", "-m", `Update panel content ${stamp}`]);
  await runGit(["push"]);

  return {
    changed: true,
    url: "https://lidioliang.github.io/kindle-reminder-panel/"
  };
}

async function ensureStorage() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await fsp.access(DATA_FILE);
  } catch {
    await writeData(defaultData);
  }
}

async function readData() {
  await ensureStorage();
  try {
    const raw = await fsp.readFile(DATA_FILE, "utf8");
    return normalizeData(JSON.parse(raw));
  } catch {
    return normalizeData(defaultData);
  }
}

async function writeData(data) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(DATA_FILE, JSON.stringify(normalizeData(data), null, 2), "utf8");
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(body);
}

function sendJson(res, status, body) {
  send(res, status, JSON.stringify(body), {
    "Content-Type": "application/json; charset=utf-8"
  });
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function renderDateMarkup() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `
    <strong id="today-date">${month}月${day}日</strong>
    <span id="today-week">${weekdays[now.getDay()]} · <span id="lunar-date">农历</span></span>
  `;
}

function renderTodoItems(todos, editable) {
  return sortTodos(todos)
    .map((todo) => {
      const done = todo.done ? " done" : "";
      const checked = todo.done ? "true" : "false";
      const editableAttrs = editable ? ' contenteditable="true" spellcheck="false"' : "";
      const actions = editable
        ? `
          <div class="todo-actions" aria-label="事项操作">
            <button class="todo-action todo-drag" type="button" data-action="drag" aria-label="拖拽排序" draggable="true">↕</button>
            <button class="todo-action" type="button" data-action="done" aria-label="完成">✓</button>
            <button class="todo-action" type="button" data-action="delete" aria-label="删除">×</button>
            <button class="todo-action" type="button" data-action="add" aria-label="添加">+</button>
          </div>
        `
        : "";
      return `
        <li class="todo-item${done}">
          <button class="todo-check" type="button" aria-label="标记完成" aria-checked="${checked}"${editable ? "" : " disabled"}></button>
          <div>
            <p class="todo-text"${editableAttrs}>${escapeHtml(todo.title)}</p>
            <p class="todo-note"${editableAttrs}>${escapeHtml(todo.note)}</p>
          </div>
          ${actions}
        </li>
      `;
    })
    .join("");
}

function renderShell({ title, mode, body, extraControls = "" }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body class="${escapeHtml(mode)}">
  <div class="page">
    <header class="masthead">
      <div>
        <p class="eyebrow">Kindle Reminder Board</p>
        <div class="title-row">
          <h1 id="page-title">自由白板</h1>
          ${extraControls}
        </div>
      </div>
      <div class="date-card" aria-label="今天日期">
        ${renderDateMarkup()}
      </div>
    </header>

    ${body}
  </div>
  <script src="/assets/lunar.js"></script>
  ${mode === "admin-mode" ? '<script src="/assets/admin.js"></script>' : '<script src="/assets/display.js"></script>'}
</body>
</html>`;
}

function renderViews(data, editable) {
  return `
    <main class="views">
      <section class="view todo-panel" id="todo-view" aria-labelledby="page-title">
        <div class="todo-summary" id="todo-summary">${data.todos.length} 件提醒</div>
        <ul class="todo-list" data-panel="todos">
          ${renderTodoItems(data.todos, editable)}
        </ul>
      </section>

      <section class="view board-panel active" id="board-view" aria-labelledby="page-title">
        ${
          editable
            ? `<div class="tools" aria-label="白板编辑工具">
          <select class="tool-select" id="format-select" aria-label="段落格式">
            <option value="p">正文</option>
            <option value="h1">大标题</option>
            <option value="h2">小标题</option>
            <option value="h3">重点</option>
          </select>
          <select class="tool-select" id="size-select" aria-label="字体大小">
            <option value="3">小字</option>
            <option value="4" selected>正常</option>
            <option value="5">大字</option>
            <option value="7">特大</option>
          </select>
          <div class="tool-group" aria-label="文字样式">
            <button class="tool-button" type="button" data-command="bold">加粗</button>
            <button class="tool-button" type="button" data-command="italic">斜体</button>
            <button class="tool-button" type="button" data-command="underline">下划线</button>
          </div>
          <div class="tool-group" aria-label="对齐方式">
            <button class="tool-button" type="button" data-command="justifyLeft">左对齐</button>
            <button class="tool-button" type="button" data-command="justifyCenter">居中</button>
            <button class="tool-button" type="button" data-command="justifyRight">右对齐</button>
          </div>
          <div class="tool-group" aria-label="列表">
            <button class="tool-button" type="button" data-command="insertUnorderedList">无序列表</button>
            <button class="tool-button" type="button" data-command="insertOrderedList">编号列表</button>
          </div>
          <button class="tool-button" type="button" data-command="removeFormat">清除格式</button>
          <label class="image-button">
            插入图片
            <input type="file" id="image-input" accept="image/*">
          </label>
        </div>`
            : ""
        }
        <div class="board-shell">
          <div class="whiteboard" id="whiteboard" data-panel="whiteboard" contenteditable="false" spellcheck="false" aria-label="自由白板">
            ${sanitizeRichHtml(data.whiteboardHtml)}
          </div>
        </div>
      </section>
    </main>

    <nav class="tabbar" aria-label="面板切换">
      <button class="tab-button active" type="button" data-target="board-view" data-title="自由白板">自由白板</button>
      <button class="tab-button" type="button" data-target="todo-view" data-title="今日重要事项">重要事项</button>
    </nav>
  `;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const isUpload = url.pathname.startsWith("/uploads/");
  const base = isUpload ? UPLOAD_DIR : PUBLIC_DIR;
  const prefix = isUpload ? "/uploads/" : "/assets/";
  const relative = decodeURIComponent(url.pathname.slice(prefix.length));
  const filePath = path.normalize(path.join(base, relative));
  if (!filePath.startsWith(base)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return true;
  }

  try {
    const file = await fsp.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp"
    };
    send(res, 200, file, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": isUpload ? "public, max-age=31536000" : "no-store"
    });
  } catch {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }
  return true;
}

async function handleUpload(req, res) {
  const raw = await readBody(req, 12 * 1024 * 1024);
  const input = JSON.parse(raw || "{}");
  const match = String(input.dataUrl || "").match(/^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/i);
  if (!match) {
    sendJson(res, 400, { error: "Unsupported image data" });
    return;
  }

  const ext = match[2].toLowerCase().replace("jpeg", "jpg");
  const image = Buffer.from(match[3], "base64");
  if (image.length > 8 * 1024 * 1024) {
    sendJson(res, 413, { error: "Image too large" });
    return;
  }

  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  const hash = crypto.randomBytes(8).toString("hex");
  const filename = `${Date.now()}-${hash}.${ext}`;
  await fsp.writeFile(path.join(UPLOAD_DIR, filename), image);
  sendJson(res, 200, { url: `/uploads/${filename}` });
}

async function route(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/uploads/")) {
    await serveStatic(req, res);
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/") {
    const data = await readData();
    send(res, 200, renderShell({
      title: "Kindle 提醒面板",
      mode: "display-mode",
      body: renderViews(data, false)
    }));
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/admin") {
    const data = await readData();
    send(res, 200, renderShell({
      title: "电脑编辑 - Kindle 提醒面板",
      mode: "admin-mode",
      extraControls: '<button class="edit-toggle visible" id="edit-toggle" type="button" aria-label="编辑白板" title="编辑白板">⚙</button><button class="publish-button" id="publish-button" type="button">同步云端</button><span class="save-status" id="save-status">已保存</span><span class="publish-status" id="publish-status"></span>',
      body: renderViews(data, true)
    }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/panel") {
    sendJson(res, 200, await readData());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/panel") {
    const raw = await readBody(req);
    const data = normalizeData(JSON.parse(raw || "{}"));
    await writeData(data);
    sendJson(res, 200, data);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/upload") {
    await handleUpload(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/publish") {
    sendJson(res, 200, await publishToGitHubPages());
    return;
  }

  send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
}

ensureStorage()
  .then(() => {
    const server = http.createServer((req, res) => {
      route(req, res).catch((error) => {
        console.error(error);
        sendJson(res, 500, { error: "Internal server error" });
      });
    });

    server.listen(PORT, HOST, () => {
      console.log(`Kindle reminder board is running:`);
      console.log(`- Kindle display: http://localhost:${PORT}/`);
      console.log(`- Computer editor: http://localhost:${PORT}/admin`);
      console.log(`- Listening on: ${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
