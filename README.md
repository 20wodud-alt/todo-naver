# 열매담 카페 · 투두 앱

네이버 카페 게시판을 참고한 로컬 실행 Next.js 풀스택 할 일 앱입니다. Supabase 연결을 지원하며, 연결 설정 전에는 기존 JSON 파일 저장 방식을 사용합니다. 배포는 필요하지 않습니다.

## 배포 주소

[열매담 카페](https://todo-naver.vercel.app)

Vercel CLI로 배포되어 있습니다. 현재 배포 환경은 Supabase 연결 전이므로 화면을 확인할 수 있으며, 할 일 조회·저장은 데이터베이스 환경 변수 설정 후 사용할 수 있습니다. Vercel에서는 로컬 JSON 파일 저장으로 자동 전환하지 않습니다.

## 실행

Node.js 20.9 이상에서 실행하세요.

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 여세요.

```bash
npm run typecheck
npm run build
npm start
```

브라우저 통합 테스트는 `npm run test:e2e`로 실행합니다. Windows에 설치된 Chrome을 우선 사용하며, 다른 환경에서는 먼저 `npx playwright install chromium`을 실행하세요. 테스트는 할 일 작성·수정·완료·새로고침 후 유지·삭제, 모바일 메뉴 및 서버 입력 검증을 확인합니다.

## 기능

- 할 일 등록, 제목 클릭 후 상세 확인·수정·삭제
- 카페 스타일 전체 화면 글쓰기, 본문 서식·인용구·목록·링크·표 편집
- 브라우저 임시저장과 불러오기 (새 글과 각 수정 글별로 1개씩 보관)
- 업무·개인·공부·일상 분류, 중요도, 마감일, 메모
- 진행 중/완료 전환, 별표로 상단 고정, 선택 일괄 삭제
- 전체·오늘·중요·완료 게시판, 실시간 검색, 정렬, 페이지 이동
- 한국 시간 기준 오늘의 할 일·달성률, 모바일 화면 대응

## 저장 방식

Supabase URL과 서버 키가 설정되면 Next.js Route Handler가 Supabase의 `03_todo_naver_todos` 테이블을 읽고 씁니다. 각 생성·수정·삭제는 해당 행에만 적용됩니다. 연결 오류가 발생해도 로컬 파일로 자동 전환하지 않아 저장소가 갈라지는 것을 방지합니다.

연결 설정이 전혀 없을 때에는 `data/todos.json` 파일을 읽고 씁니다. 처음 실행 시 예시 데이터 12개가 생성됩니다. 삭제하면 예시 데이터가 다시 생성되지 않습니다. 서버를 재시작해도 데이터는 유지되며, `data/` 폴더는 Git에서 제외됩니다. 파일 변경 작업은 한 프로세스 안에서 순차 처리하며 임시 파일을 작성한 뒤 교체합니다. 파일 저장 모드에서 같은 폴더를 대상으로 여러 서버 프로세스를 동시에 실행하지 마세요.

## Supabase 연결

1. Supabase에 새 프로젝트 `03_todo_naver`를 만듭니다.
2. 새 프로젝트의 SQL Editor에서 `supabase/migrations/202610230001_create_project_todos.sql`을 실행합니다. 테이블명에는 프로젝트명을 접두사로 사용합니다.
3. `.env.example`을 `.env.local`로 복사하고 `SUPABASE_URL`과 `SUPABASE_SECRET_KEY`를 설정합니다. 기존 `service_role` 키는 `SUPABASE_SERVICE_ROLE_KEY` 변수로도 사용할 수 있습니다.
4. `npm run db:import`로 기존 파일 데이터를 이전합니다. 원본은 보존하고 `data/backups/`에 추가 백업합니다. UUID를 그대로 사용하며 재실행해도 기존 Supabase 데이터를 덮어쓰지 않습니다.
5. 실행 중인 서버를 재시작합니다. 앱에서 새 글을 등록하고 Supabase Table Editor의 `03_todo_naver_todos`에서 확인합니다.

서버 전용 키는 `.env.local`에만 저장하며 브라우저로 전달하지 않습니다. 테이블은 RLS를 활성화하고 `anon`과 `authenticated`의 직접 접근을 차단합니다. 이 앱은 로그인 없는 개인용 로컬 앱이므로 외부에 공개하려면 별도의 사용자 인증과 권한 설계가 필요합니다.

프로젝트 생성, SQL 적용, 환경 변수 설정이 실제로 끝나야 데이터베이스 연결이 완료됩니다. 코드와 SQL 파일만으로 원격 프로젝트가 자동 생성되지는 않습니다.

개인용 로컬 앱이므로 로그인 기능은 없습니다. 서버는 `127.0.0.1`로 실행됩니다. 데이터 백업은 `data/todos.json`을 복사하면 됩니다. 처음 상태로 초기화하려면 서버를 종료한 후 해당 파일을 별도로 백업하고 삭제하세요.

글꼴은 Google Fonts의 Noto Sans KR을 사용하며, 인터넷이 없으면 시스템 글꼴로 표시됩니다.

서식 있는 본문도 JSON 파일에 함께 저장됩니다. 기존의 일반 텍스트 메모는 그대로 불러올 수 있습니다. 임시저장한 글은 현재 브라우저에만 보관되며, 등록 또는 수정 저장에 성공하면 해당 임시 글은 삭제됩니다.

구현 참고: [Next.js Route Handlers 공식 문서](https://nextjs.org/docs/app/getting-started/route-handlers)
