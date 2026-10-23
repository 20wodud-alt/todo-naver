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
    await editor.getByLabel('할 일').fill(title);
    await editor.getByLabel('메모').fill('실제 브라우저에서 작성한 테스트 메모');
    await editor.getByLabel('카테고리').selectOption('개인');
    await editor.getByRole('button', { name: '할 일 등록' }).click();
    await expect(editor).not.toBeVisible();
    const todos = await (await request.get('/api/todos')).json();
    id = todos.find((t: { title: string }) => t.title === title).id;
    await page.reload();
    await page.getByLabel('할 일 검색', { exact: true }).fill(title);
    await page.getByRole('button', { name: title, exact: true }).click();
    await expect(editor.getByLabel('메모')).toHaveValue('실제 브라우저에서 작성한 테스트 메모');
    await editor.getByLabel('할 일').fill(renamed);
    await editor.getByRole('button', { name: '수정 저장' }).click();
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
