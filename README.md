# 오늘의 할 일

파스텔 스타일의 할 일 앱입니다. 추가·완료·삭제와 브라우저 자동 저장을 지원합니다.
Supabase 이메일 회원가입·로그인은 CDN으로 불러온 supabase-js v2를 사용합니다.

## Vercel 설정

GitHub 저장소를 Vercel에 연결하고 Framework Preset을 `Other`로 사용합니다.
별도의 빌드 명령이나 패키지 설치가 필요하지 않습니다. 루트의 `index.html`과
Vercel Function인 `api/config.js`가 함께 배포되어야 합니다.

Vercel에 연결된 Supabase 환경 변수 중 다음 조합을 자동으로 읽습니다.

환경 변수가 모두 없으면 소유자가 제공한 Supabase 프로젝트 주소와 publishable 공개 키를
기본값으로 사용합니다. 다른 프로젝트로 변경할 때는 주소와 공개 키를 함께 설정하세요.

- 주소: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `VITE_SUPABASE_URL` 순서
- 공개 키: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY` 순서

브라우저에는 주소와 publishable/anon 키만 전달합니다. service-role 키나 secret 키,
데이터베이스 비밀번호를 공개 키 변수에 넣지 마세요. 환경 변수 변경 후에는 재배포가 필요합니다.

Supabase Authentication의 이메일 제공자를 활성화하고 URL Configuration의 Site URL을
실제 앱 주소로 지정하세요. Redirect URLs에도 앱의 루트 주소를 허용해야 인증 메일에서
앱으로 돌아올 수 있습니다. 이메일 인증이 켜져 있으면 가입 후 인증 메일을 확인해야 합니다.

로그인은 Vercel 주소에서 사용합니다. HTML 파일을 직접 열면 할 일 기능만 사용할 수 있습니다.
할 일은 현재 브라우저에 저장되며, 계정별 분리나 클라우드 동기화는 제공하지 않습니다.

## 검증

Node.js에서 `node --test tests/auth.test.cjs`로 인증 UI 흐름과 공개 설정 API를 검증합니다.
실제 이메일 발송 및 로그인은 연결된 Supabase 프로젝트에서 별도로 확인해야 합니다.
