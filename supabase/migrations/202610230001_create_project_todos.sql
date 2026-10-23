-- Project: 03_todo_naver (열매담 카페)
-- Existing tables in other projects are not modified.
create table if not exists public."03_todo_naver_todos" (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  description_html text not null default '' check (char_length(description_html) <= 40000),
  category text not null default '업무' check (category in ('업무', '개인', '공부', '일상')),
  priority text not null default '보통' check (priority in ('높음', '보통', '낮음')),
  due_date date,
  completed boolean not null default false,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists "03_todo_naver_todos_created_at_idx"
  on public."03_todo_naver_todos" (created_at desc, id);

alter table public."03_todo_naver_todos" enable row level security;
-- Personal localhost app: only its server can access the table.
-- No anonymous/authenticated policies or public write access are created.
revoke all on table public."03_todo_naver_todos" from anon, authenticated;
grant select, insert, update, delete on table public."03_todo_naver_todos" to service_role;

comment on table public."03_todo_naver_todos" is '03_todo_naver · 열매담 카페 할 일';
