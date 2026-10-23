# 하루 한 걸음 · 투두 카페

네이버 카페 게시판을 참고한 로컬 전용 Next.js 풀스택 할 일 앱입니다. 별도 데이터베이스, 외부 계정, 배포 설정이 필요하지 않습니다.

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
- 업무·개인·공부·일상 분류, 중요도, 마감일, 메모
- 진행 중/완료 전환, 별표로 상단 고정, 선택 일괄 삭제
- 전체·오늘·중요·완료 게시판, 실시간 검색, 정렬, 페이지 이동
- 한국 시간 기준 오늘의 할 일·달성률, 모바일 화면 대응

## 저장 방식

Next.js Route Handler가 `data/todos.json` 파일을 읽고 씁니다. 처음 실행 시 예시 데이터 12개가 생성됩니다. 삭제하면 예시 데이터가 다시 생성되지 않습니다. 서버를 재시작해도 데이터는 유지되며, `data/` 폴더는 Git에서 제외됩니다. 파일 변경 작업은 한 프로세스 안에서 순차 처리하며 임시 파일을 작성한 뒤 교체합니다. 같은 폴더를 대상으로 여러 서버 프로세스를 동시에 실행하지 마세요.

개인용 로컬 앱이므로 로그인 기능은 없습니다. 서버는 `127.0.0.1`로 실행됩니다. 데이터 백업은 `data/todos.json`을 복사하면 됩니다. 처음 상태로 초기화하려면 서버를 종료한 후 해당 파일을 별도로 백업하고 삭제하세요.

글꼴은 Google Fonts의 Noto Sans KR을 사용하며, 인터넷이 없으면 시스템 글꼴로 표시됩니다.

구현 참고: [Next.js Route Handlers 공식 문서](https://nextjs.org/docs/app/getting-started/route-handlers)
