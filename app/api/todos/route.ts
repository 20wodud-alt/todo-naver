import { randomUUID } from 'node:crypto';
import { createTodo, deleteTodos, listTodos, StorageError, updateTodo } from '@/lib/todo-repository';
import { categories, type Todo } from '@/lib/types';
import sanitizeHtml from 'sanitize-html';

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
  if ('descriptionHtml' in body) {
    if (typeof body.descriptionHtml !== 'string' || body.descriptionHtml.length > 40000) throw new Error('본문이 너무 깁니다. 내용을 줄여 주세요.');
    output.descriptionHtml = sanitizeHtml(body.descriptionHtml, {
      allowedTags: ['p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'span', 'font', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'hr', 'a', 'table', 'tbody', 'tr', 'td', 'th'],
      allowedAttributes: { '*': ['style'], a: ['href'], font: ['size', 'face', 'color'] },
      allowedStyles: { '*': { 'text-align': [/^(left|center|right)$/], 'font-weight': [/^(bold|[1-9]00)$/], 'font-style': [/^italic$/], 'text-decoration': [/^(underline|line-through)$/], 'color': [/^#[0-9a-f]{3,6}$/i], 'font-size': [/^\d{1,2}px$/], 'font-family': [/^(Arial|Georgia|sans-serif|serif)$/] } },
      allowedSchemes: ['https', 'http', 'mailto'], allowProtocolRelative: false,
    });
  } else if ('description' in body) output.descriptionHtml = '';
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
  try { return Response.json(await listTodos()); }
  catch (error) { return Response.json({ error: error instanceof StorageError ? error.message : '할 일을 불러오지 못했습니다.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const values = validate(body);
    const todo = { completed: false, pinned: false, ...values, id: randomUUID(), createdAt: new Date().toISOString() } as Todo;
    return Response.json(await createTodo(todo), { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '저장에 실패했습니다.' }, { status: error instanceof StorageError ? 503 : 400 }); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const values = validate(body, true);
    if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) throw new Error('올바른 할 일을 선택해 주세요.');
    const result = await updateTodo(body.id, values);
    return result ? Response.json(result) : Response.json({ error: '할 일을 찾을 수 없습니다.' }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '수정에 실패했습니다.' }, { status: error instanceof StorageError ? 503 : 400 }); }
}
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.ids) || !body.ids.length || !body.ids.every((id: unknown) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return Response.json({ error: '삭제할 할 일을 선택해 주세요.' }, { status: 400 });
    await deleteTodos(body.ids);
    return Response.json({ success: true });
  } catch (error) { return Response.json({ error: error instanceof StorageError ? error.message : '삭제하지 못했습니다.' }, { status: 503 }); }
}
