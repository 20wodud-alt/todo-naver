import { expect, test } from '@playwright/test';

test('할 일 작성, 영구 저장, 수정, 완료 및 선택 삭제', async ({ page, request }) => {
  const title = `브라우저 검증 ${Date.now()}`;
  const renamed = `${title} 수정`;
  let id = '';
  try {
    await page.setViewportSize({ width: 1440, height: 1080 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '전체 할 일' })).toBeVisible();
    await expect(page.getByText('할 일을 불러오고 있어요.')).not.toBeVisible();
    await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
    await page.getByRole('button', { name: '할 일 쓰기', exact: true }).first().click();
    const editor = page.locator('dialog.editor-dialog');
    await editor.getByLabel('할 일', { exact: true }).fill(title);
    await editor.getByLabel('메모').fill('실제 브라우저에서 작성한 테스트 메모');
    await editor.getByLabel('카테고리').selectOption('개인');
    await editor.getByRole('button', { name: '할 일 등록' }).click();
    await expect(editor).not.toBeVisible();
    const todos = await (await request.get('/api/todos')).json();
    id = todos.find((t: { title: string }) => t.title === title).id;
    await page.reload();
    await page.getByLabel('할 일 검색', { exact: true }).fill(title);
    await page.getByRole('button', { name: title, exact: true }).click();
    await expect(editor.getByLabel('메모')).toHaveText('실제 브라우저에서 작성한 테스트 메모');
    await editor.getByLabel('할 일', { exact: true }).fill(renamed);
    await editor.getByRole('button', { name: '수정 저장' }).first().click();
    await expect(editor).not.toBeVisible();
    await page.getByRole('button', { name: `${renamed} 완료로 변경`, exact: true }).click();
    await expect(page.locator('tr').filter({ hasText: renamed }).getByText('완료', { exact: true })).toBeVisible();
    await page.reload();
    await page.getByLabel('할 일 검색', { exact: true }).fill(renamed);
    await expect(page.locator('tr').filter({ hasText: renamed }).getByText('완료', { exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: `${renamed} 선택`, exact: true }).check();
    await page.getByRole('button', { name: '선택 삭제 (1)', exact: true }).click();
    await page.getByRole('button', { name: '삭제하기', exact: true }).click();
    await expect(page.getByText('검색 결과가 없어요')).toBeVisible();
    expect((await (await request.get('/api/todos')).json()).some((t: { id: string }) => t.id === id)).toBe(false);
  } finally { if (id) await request.delete('/api/todos', { data: { ids: [id] } }); }
});

test('카페 편집기 서식 저장과 임시저장 불러오기', async ({ page, request }) => {
  const title = `카페 서식 검증 ${Date.now()}`;
  let id = '';
  try {
    await page.setViewportSize({ width: 1500, height: 1000 });
    await page.goto('/');
    await page.getByRole('button', { name: '할 일 쓰기', exact: true }).first().click();
    const editor = page.locator('dialog.editor-dialog');
    await expect(editor.getByRole('heading', { name: '카페 글쓰기' })).toBeVisible();
    await editor.getByLabel('할 일', { exact: true }).fill(title);
    await editor.getByRole('textbox', { name: '메모', exact: true }).fill('오늘의 작은 실천');
    await page.evaluate(() => {
      const body = document.querySelector('.compose-body')!;
      const range = document.createRange();
      range.selectNodeContents(body);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await editor.getByRole('button', { name: '굵게', exact: true }).click();
    await expect(editor.locator('.compose-body b, .compose-body strong')).toHaveText('오늘의 작은 실천');
    await editor.getByRole('button', { name: '임시저장', exact: true }).click();
    await expect(editor.getByText('작성 중인 글을 임시저장했어요.')).toBeVisible();
    await editor.getByRole('button', { name: '닫기', exact: true }).click();
    await page.getByRole('button', { name: '할 일 쓰기', exact: true }).first().click();
    await editor.getByRole('button', { name: '임시저장 목록' }).click();
    await editor.getByRole('button', { name: '불러오기' }).click();
    await expect(editor.getByLabel('할 일', { exact: true })).toHaveValue(title);
    await expect(editor.locator('.compose-body b, .compose-body strong')).toHaveText('오늘의 작은 실천');
    await page.screenshot({ path: 'test-results/cafe-editor-desktop.png' });
    await editor.getByRole('button', { name: '할 일 등록', exact: true }).click();
    await expect(editor).not.toBeVisible();
    const todos = await (await request.get('/api/todos')).json();
    const saved = todos.find((todo: { title: string }) => todo.title === title);
    id = saved.id;
    expect(saved.descriptionHtml).toMatch(/<(b|strong)>/);
    await page.reload();
    await page.getByLabel('할 일 검색', { exact: true }).fill(title);
    await page.getByRole('button', { name: title, exact: true }).click();
    await expect(editor.locator('.compose-body b, .compose-body strong')).toHaveText('오늘의 작은 실천');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await editor.evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true);
    await editor.evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: 'test-results/cafe-editor-mobile.png' });
  } finally { if (id) await request.delete('/api/todos', { data: { ids: [id] } }); }
});

test('본문의 위험한 HTML과 링크를 서버에서 제거', async ({ request }) => {
  let id = '';
  try {
    const response = await request.post('/api/todos', { data: { title: 'HTML 검증', description: '본문', descriptionHtml: '<b>본문</b><script>alert(1)</script><a href="javascript:alert(1)" onclick="alert(1)">링크</a><img src=x onerror=alert(1)>', category: '업무', priority: '보통', dueDate: '' } });
    expect(response.status()).toBe(201);
    const saved = await response.json(); id = saved.id;
    expect(saved.descriptionHtml).toContain('<b>본문</b>');
    expect(saved.descriptionHtml).not.toMatch(/script|javascript|onclick|onerror|<img/i);
  } finally { if (id) await request.delete('/api/todos', { data: { ids: [id] } }); }
});

test('모바일 메뉴와 화면 너비, 서버 입력 검증', async ({ page, request }) => {
  const response = await request.post('/api/todos', { data: { title: ' ' } });
  expect(response.status()).toBe(400);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('할 일을 불러오고 있어요.')).not.toBeVisible();
  await page.getByRole('button', { name: '게시판 메뉴' }).click();
  await page.getByRole('navigation', { name: '카테고리', exact: true }).getByRole('button', { name: /^공부/ }).click();
  await expect(page.getByRole('heading', { name: '공부', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
