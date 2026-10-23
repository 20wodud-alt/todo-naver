import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Todo } from './types';

const directory = path.join(process.cwd(), 'data');
const file = path.join(directory, 'todos.json');
const globalStore = globalThis as typeof globalThis & { todoQueue?: Promise<unknown> };

function initialTodos(): Todo[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const entries: [string, Todo['category'], Todo['priority'], boolean, boolean][] = [
    ['이번 주에 꼭 이루고 싶은 목표 정리하기', '개인', '높음', false, true],
    ['새로운 프로젝트 기획안 초안 작성하기', '업무', '높음', false, false],
    ['오전 10시 팀 미팅 준비하기', '업무', '높음', false, false],
    ['Next.js 강의 2강 듣고 실습하기', '공부', '보통', false, false],
    ['책 20페이지 읽고 인상 깊은 문장 기록하기', '개인', '보통', false, false],
    ['저녁 먹고 동네 한 바퀴 산책하기', '일상', '낮음', false, false],
    ['이번 달 지출 내역 정리하기', '개인', '보통', false, false],
    ['포트폴리오 레퍼런스 3개 찾아보기', '공부', '보통', false, false],
    ['거래처에 수정된 제안서 보내기', '업무', '높음', true, false],
    ['아침 스트레칭 10분 하기', '일상', '낮음', true, false],
    ['책상 정리하고 기분 좋게 하루 시작하기', '일상', '낮음', true, false],
    ['영어 단어 20개 복습하기', '공부', '보통', true, false],
  ];
  return entries.map(([title, category, priority, completed, pinned], i) => ({ id: randomUUID(), title, description: i === 0 ? '크지 않아도 괜찮아요. 이번 주 나에게 중요한 일 세 가지를 적어 보세요.' : '', category, priority, completed, pinned, dueDate: today, createdAt: new Date(Date.now() - i * 3600000).toISOString() }));
}

async function read(): Promise<Todo[]> {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const todos = initialTodos();
    await save(todos);
    return todos;
  }
}
async function save(todos: Todo[]) {
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `todos-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(todos, null, 2), 'utf8');
  await rename(temporary, file);
}
export function withTodos<T>(action: (todos: Todo[]) => Promise<T> | T, write = false): Promise<T> {
  const next = (globalStore.todoQueue ?? Promise.resolve()).then(async () => {
    const todos = await read();
    const result = await action(todos);
    if (write) await save(todos);
    return result;
  });
  globalStore.todoQueue = next.catch(() => {});
  return next;
}
