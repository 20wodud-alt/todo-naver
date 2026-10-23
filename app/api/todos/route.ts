import { randomUUID } from 'node:crypto';
import { withTodos } from '@/lib/store';
import { categories, type Todo } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validate(body: Record<string, unknown>, partial = false) {
  const output: Partial<Todo> = {};
  if (!partial || 'title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120) throw new Error('제목은 1~120자로 입력해 주세요.');
    output.title = body.title.trim();
  }
  if (!partial || 'description' in body) {
    if (typeof body.description !== 'string' || body.description.length > 5000) throw new Error('메모는 5,000자 이내로 입력해 주세요.');
    output.description = body.description;
  }
  if (!partial || 'category' in body) {
    if (!categories.includes(body.category as Todo['category'])) throw new Error('분류를 선택해 주세요.');
    output.category = body.category as Todo['category'];
  }
  if (!partial || 'priority' in body) {
    if (!['높음', '보통', '낮음'].includes(body.priority as string)) throw new Error('중요도를 선택해 주세요.');
    output.priority = body.priority as Todo['priority'];
  }
  if (!partial || 'dueDate' in body) {
    if (typeof body.dueDate !== 'string' || (body.dueDate !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || Number.isNaN(Date.parse(body.dueDate)) || new Date(body.dueDate).toISOString().slice(0, 10) !== body.dueDate))) throw new Error('올바른 마감일을 입력해 주세요.');
    output.dueDate = body.dueDate;
  }
  for (const key of ['completed', 'pinned'] as const) if (key in body) {
    if (typeof body[key] !== 'boolean') throw new Error('잘못된 상태 값입니다.');
    output[key] = body[key];
  }
  return output;
}

export async function GET() {
  try { return Response.json(await withTodos(todos => todos)); }
  catch { return Response.json({ error: '할 일을 불러오지 못했습니다.' }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const values = validate(body);
    const todo = { completed: false, pinned: false, ...values, id: randomUUID(), createdAt: new Date().toISOString() } as Todo;
    await withTodos(todos => { todos.unshift(todo); }, true);
    return Response.json(todo, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '저장에 실패했습니다.' }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const values = validate(body, true);
    const result = await withTodos(todos => {
      const todo = todos.find(t => t.id === body.id);
      if (!todo) return null;
      Object.assign(todo, values);
      return todo;
    }, true);
    return result ? Response.json(result) : Response.json({ error: '할 일을 찾을 수 없습니다.' }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '수정에 실패했습니다.' }, { status: 400 }); }
}
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.ids) || !body.ids.length || !body.ids.every((id: unknown) => typeof id === 'string')) return Response.json({ error: '삭제할 할 일을 선택해 주세요.' }, { status: 400 });
    await withTodos(todos => {
      for (let i = todos.length - 1; i >= 0; i--) if (body.ids.includes(todos[i].id)) todos.splice(i, 1);
    }, true);
    return Response.json({ success: true });
  } catch { return Response.json({ error: '삭제하지 못했습니다.' }, { status: 500 }); }
}
