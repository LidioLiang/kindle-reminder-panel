# Kindle Reminder Panel

一个给 Kindle Paperwhite 展示用的极简提醒面板。

## GitHub Pages 展示

静态展示页入口是 `index.html`，页面会读取同目录下的 `panel.json`。

需要上传到 GitHub Pages 的核心文件：

- `index.html`
- `panel.json`
- `public/`
- `uploads/`

## 本地编辑

如需在电脑上继续使用编辑后台，可以运行：

```sh
npm run start
```

然后打开：

- 展示页：`http://localhost:3000/`
- 编辑页：`http://localhost:3000/admin`

本地服务保存的数据在 `data/panel.json`。要更新 GitHub Pages 展示内容时，把 `data/panel.json` 同步到根目录的 `panel.json` 后重新提交。

现在电脑编辑页里有「同步云端」按钮。点击后会自动：

1. 保存当前编辑内容到 `data/panel.json`
2. 更新 GitHub Pages 使用的 `panel.json`
3. 提交并推送到 GitHub

GitHub Pages 发布后，Kindle 刷新即可看到最新内容。
