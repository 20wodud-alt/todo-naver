import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: '하루 한 걸음 · 투두 카페', description: '작은 실천이 모여 만드는 나의 하루. 네이버 카페 스타일의 할 일 게시판.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
