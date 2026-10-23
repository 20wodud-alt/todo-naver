import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import nextEnv from '@next/env';
import sanitizeHtml from 'sanitize-html';

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_TODOS_TABLE || '03_todo_naver_todos';
  if (!url || !key) throw new Error('먼저 .env.local에 Supabase URL과 서버 전용 키를 설정해 주세요.');
  if (!/^[a-z0-9_]+$/.test(table)) throw new Error('테이블 이름이 올바르지 않습니다.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: connectionError } = await client.from(table).select('id').limit(1);
  if (connectionError) throw new Error('Supabase 연결 또는 테이블을 확인해 주세요. SQL 마이그레이션을 먼저 적용해야 합니다.');
  const raw = await readFile('data/todos.json', 'utf8');
  const todos = JSON.parse(raw);
  if (!Array.isArray(todos)) throw new Error('로컬 할 일 파일 형식이 올바르지 않습니다.');
  await mkdir('data/backups', { recursive: true });
  const backup = `data/backups/todos-before-supabase-${Date.now()}.json`;
  await writeFile(backup, raw, { flag: 'wx' });
  for (let offset = 0; offset < todos.length; offset += 200) {
    const rows = todos.slice(offset, offset + 200).map(todo => ({
      id: todo.id, title: todo.title, description: todo.description || '',
      description_html: sanitizeHtml(todo.descriptionHtml || '', {
        allowedTags: ['p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'span', 'font', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'hr', 'a', 'table', 'tbody', 'tr', 'td', 'th'],
        allowedAttributes: { '*': ['style'], a: ['href'], font: ['size', 'face', 'color'] },
        allowedStyles: { '*': { 'text-align': [/^(left|center|right)$/], 'font-weight': [/^(bold|[1-9]00)$/], 'font-style': [/^italic$/], 'text-decoration': [/^(underline|line-through)$/], 'color': [/^#[0-9a-f]{3,6}$/i], 'font-size': [/^\d{1,2}px$/], 'font-family': [/^(Arial|Georgia|sans-serif|serif)$/] } },
        allowedSchemes: ['https', 'http', 'mailto'], allowProtocolRelative: false,
      }),
      category: todo.category, priority: todo.priority, due_date: todo.dueDate || null,
      completed: todo.completed, pinned: todo.pinned, created_at: todo.createdAt,
    }));
    // Re-running the import never overwrites edits made in Supabase.
    const { error } = await client.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error('할 일 이전에 실패했습니다. 원본과 백업은 유지됩니다. 연결과 데이터 형식을 확인해 주세요.');
    const { data, error: verifyError } = await client.from(table).select('id').in('id', rows.map(row => row.id));
    if (verifyError || data.length !== rows.length) throw new Error('이전한 데이터의 확인에 실패했습니다. 원본은 유지됩니다.');
  }
  console.log(`${todos.length}개 할 일 확인 완료 → ${table}`);
  console.log(`원본 유지 / 백업: ${backup}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
