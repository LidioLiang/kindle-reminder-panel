# Kindle Reminder Panel

一个给 Kindle Paperwhite 展示用的极简提醒面板。新版使用 Vercel 托管网页和接口，使用 Supabase 保存数据。

## 页面

- Kindle 展示页：`/`
- 电脑编辑页：`/admin`
- 数据接口：`/api/panel`
- 图片上传：`/api/upload`

Kindle 展示页默认打开自由白板，隐藏表头和底部切换；点击屏幕后显示表头和切换按钮。

## Supabase 设置

1. 新建 Supabase 项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 在 Storage 里新建公开 bucket：`panel-uploads`。
4. 从 Project Settings 复制：
   - Project URL
   - service_role key

`service_role` 只能放在 Vercel 环境变量里，不能放进浏览器代码。

## Vercel 环境变量

部署前在 Vercel 项目里设置：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

本地开发可以复制 `.env.example` 为 `.env.local` 后填写。

## 本地开发

```sh
npm run dev
```

然后打开：

- 展示页：`http://localhost:3000/`
- 编辑页：`http://localhost:3000/admin`

如果没有配置 Supabase，本地开发会临时读取和保存 `data/panel.json`，方便先看页面效果。
