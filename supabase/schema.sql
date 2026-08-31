create table if not exists public.panel_data (
  id text primary key,
  todos_json jsonb not null default '[]'::jsonb,
  whiteboard_html text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.panel_data enable row level security;

revoke all on table public.panel_data from anon;
revoke all on table public.panel_data from authenticated;

insert into public.panel_data (id, todos_json, whiteboard_html)
values (
  'main',
  '[
    {
      "title": "确认 Kindle 云端展示效果",
      "note": "重点看自由白板默认页、点击显示表头和底部切换是否顺手。",
      "done": false
    },
    {
      "title": "整理今天最重要的一件事",
      "note": "只写真正要推进的动作，让提醒面板保持清爽。",
      "done": false
    },
    {
      "title": "晚上复盘一个进展",
      "note": "记录今天已经完成的部分，明天继续迭代。",
      "done": false
    }
  ]'::jsonb,
  '<p><font size="3">今天只看最重要的提醒。</font></p><p><font size="3">保持页面干净，保持行动清楚。</font></p>'
)
on conflict (id) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'panel-uploads',
  'panel-uploads',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
