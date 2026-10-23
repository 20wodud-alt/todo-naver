import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { withTodos } from './store';
import type { Todo } from './types';

export class StorageError extends Error {}

type TodoRow = {
  id: string; title: string; description: string; description_html: string;
  category: Todo['category']; priority: Todo['priority']; due_date: string | null;
  completed: boolean; pinned: boolean; created_at: string;
};

function connection() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url && !key && process.env.TODO_STORAGE !== 'supabase') {
    if (process.env.VERCEL) throw new StorageError('데이터베이스 연결을 준비 중입니다. Supabase 연결 후 할 일을 사용할 수 있습니다.');
    return null;
  }
  if (!url || !key) throw new StorageError('Supabase 연결 설정이 필요합니다. 서버 환경 변수를 확인해 주세요.');
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error();
  } catch { throw new StorageError('Supabase URL 설정을 확인해 주세요.'); }
  if (key.startsWith('sb_publishable_')) throw new StorageError('Supabase 서버 전용 키를 설정해 주세요.');
  const table = process.env.SUPABASE_TODOS_TABLE || '03_todo_naver_todos';
  if (!/^[a-z0-9_]+$/.test(table)) throw new StorageError('Supabase 테이블 이름을 확인해 주세요.');
  return { client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }), table };
}

function fromRow(row: TodoRow): Todo {
  return { id: row.id, title: row.title, description: row.description, descriptionHtml: row.description_html,
    category: row.category, priority: row.priority, dueDate: row.due_date || '',
    completed: row.completed, pinned: row.pinned, createdAt: row.created_at };
}

function toRow(todo: Partial<Todo>): Partial<TodoRow> {
  const row: Partial<TodoRow> = {};
  for (const key of ['id', 'title', 'description', 'category', 'priority', 'completed', 'pinned'] as const) {
    if (todo[key] !== undefined) Object.assign(row, { [key]: todo[key] });
  }
  if (todo.descriptionHtml !== undefined) row.description_html = todo.descriptionHtml;
  if (todo.dueDate !== undefined) row.due_date = todo.dueDate || null;
  if (todo.createdAt !== undefined) row.created_at = todo.createdAt;
  return row;
}

export async function listTodos(): Promise<Todo[]> {
  const db = connection();
  if (!db) return withTodos(todos => todos);
  // Fetch all pages so the app's search and totals also include lists over 1,000 rows.
  const result: Todo[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.client.from(db.table).select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
    if (error) throw new StorageError('Supabase에서 할 일을 불러오지 못했습니다. 연결과 테이블 설정을 확인해 주세요.');
    result.push(...(data as TodoRow[]).map(fromRow));
    if (data.length < 1000) break;
  }
  return result;
}

export async function createTodo(todo: Todo): Promise<Todo> {
  const db = connection();
  if (!db) { await withTodos(todos => { todos.unshift(todo); }, true); return todo; }
  const { data, error } = await db.client.from(db.table).insert(toRow(todo)).select('*').single();
  if (error) throw new StorageError('Supabase에 할 일을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return fromRow(data as TodoRow);
}

export async function updateTodo(id: string, values: Partial<Todo>): Promise<Todo | null> {
  const db = connection();
  if (!db) return withTodos(todos => {
    const todo = todos.find(item => item.id === id);
    if (!todo) return null;
    Object.assign(todo, values); return todo;
  }, true);
  const { data, error } = await db.client.from(db.table).update(toRow(values)).eq('id', id).select('*').maybeSingle();
  if (error) throw new StorageError('Supabase의 할 일을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  return data ? fromRow(data as TodoRow) : null;
}

export async function deleteTodos(ids: string[]): Promise<void> {
  const db = connection();
  if (!db) { await withTodos(todos => {
    for (let index = todos.length - 1; index >= 0; index--) if (ids.includes(todos[index].id)) todos.splice(index, 1);
  }, true); return; }
  const { error } = await db.client.from(db.table).delete().in('id', ids);
  if (error) throw new StorageError('Supabase의 할 일을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
