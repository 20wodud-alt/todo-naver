export const categories = ['업무', '개인', '공부', '일상'] as const;
export type Category = typeof categories[number];
export type Todo = { id: string; title: string; description: string; descriptionHtml?: string; category: Category; priority: '높음' | '보통' | '낮음'; dueDate: string; completed: boolean; pinned: boolean; createdAt: string };
