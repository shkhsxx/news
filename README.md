# 뉴스 검색 사이트

네이버 뉴스 검색 API를 사용한 뉴스 검색 사이트입니다.
Express 서버가 API를 프록시하므로 **Client Secret이 브라우저에 노출되지 않습니다.**

## 실행 방법

### 1. 의존성 설치

```bash
npm install
```

### 2. API 키 설정

`.env.example` 을 복사해서 **`.env.local`** 을 만들고, 발급받은 키를 넣어주세요.

```bash
cp .env.example .env.local
```

```env
NCP_APIGW_API_KEY_ID=발급받은_Key_ID
NCP_APIGW_API_KEY=발급받은_Key
PORT=3000
```

> 2026년 이후 뉴스 검색 API 신규 발급은 개발자센터가 아니라 **NAVER API HUB**
> (네이버 클라우드 플랫폼 산하, [console.ncloud.com](https://console.ncloud.com/))
> 콘솔에서 이뤄집니다. 발급받은 키를 `NCP_APIGW_API_KEY_ID` / `NCP_APIGW_API_KEY`에 넣으면
> 됩니다 (환경변수 이름에는 하이픈을 쓸 수 없는 배포 환경이 많아 언더스코어로 씁니다.
> 실제 API 호출 시 서버가 `X-NCP-APIGW-API-KEY-ID` / `X-NCP-APIGW-API-KEY` 요청
> 헤더로 변환해서 보냅니다).

`.env.local` 은 `.gitignore` 에서 차단되어 있어 커밋되지 않습니다. (자세한 내용은 아래 [키 보호](#키-보호) 참고)

### 3. 키 커밋 차단 훅 활성화 (권장)

```bash
git config core.hooksPath .githooks
```

한 번만 실행하면 됩니다. 실수로 `.env.local` 을 커밋하거나 코드에 키를 하드코딩한 경우
커밋이 자동으로 차단됩니다.

### 4. 서버 실행

```bash
npm start
```

브라우저에서 http://localhost:3000 접속

파일을 고치면서 개발할 때는 `npm run dev` (파일 변경 시 자동 재시작)를 쓰면 편합니다.

### API 키 없이 UI만 확인하고 싶을 때

```bash
MOCK=1 npm start
```

샘플 데이터로 화면이 채워집니다. (화면 상단에 MOCK 모드 안내가 표시됩니다)

## 기능

- **키워드 검색** — 검색어를 입력해 관련 뉴스 조회
- **인기 키워드 칩** — 검색창 아래 칩을 클릭하면 즉시 검색 (목록은 `index.html` 의 `POPULAR_KEYWORDS` 에서 수정)
- **정렬** — 정확도순(`sim`) / 최신순(`date`) 전환
- **페이지네이션** — 페이지 이동, 10 / 20 / 50개씩 보기 선택
- **URL 상태 유지** — 검색 상태가 주소에 저장되어 새로고침·공유해도 결과가 유지됩니다
- **다크 모드 UI** — 반응형(360px~), 로딩 스켈레톤 / 결과 없음 / 에러(+다시 시도) 상태 처리

자세한 요구사항과 화면 상태 정의는 [PRD.md](./PRD.md) 를 참고하세요.

## 키 보호

API 키가 깃허브에 올라가지 않도록 **3중으로 막아뒀습니다.**

**1) 환경변수 분리** — 실제 키는 `.env.local` 에만 두고, 저장소에는 값이 빈 템플릿
`.env.example` 만 커밋합니다. 서버는 `.env.local` 을 먼저 읽고, 없는 값만 `.env` 에서 채웁니다.

**2) `.gitignore` 차단** — 와일드카드로 모든 `.env` 변형을 사전 차단합니다.

```gitignore
.env
.env.*
!.env.example
```

`.env.local`, `.env.production` 처럼 나중에 어떤 이름을 쓰더라도 자동으로 무시되고,
템플릿만 예외로 허용됩니다. `*.pem`, `*.key`, `secrets.json` 등도 함께 막아뒀습니다.

**3) pre-commit 훅** — `.gitignore` 만으로는 `git add -f` 강제 추가나 코드 내 하드코딩을
막을 수 없어서, `.githooks/pre-commit` 이 두 번째 방어선을 맡습니다.

- `.env` 계열 파일이 스테이징되면 커밋 중단 (강제 추가한 경우까지 차단)
- 코드에 `NCP_APIGW_API_KEY_ID` / `NCP_APIGW_API_KEY` 값이 하드코딩되면 커밋 중단
- 차단 시 해결 방법까지 함께 안내

활성화: `git config core.hooksPath .githooks`

> 이미 키를 커밋한 적이 있다면 `.gitignore` 추가만으로는 히스토리에서 사라지지 않습니다.
> 그런 경우엔 **네이버 개발자센터에서 키를 재발급**하는 게 가장 확실합니다.

## 파일 구조

```
.
├── server.js              # Express 서버 (로컬 실행용) — lib/news.js 를 호출
├── lib/
│   └── news.js            # 뉴스 검색 핵심 로직 (서버/Netlify Function 공용)
├── netlify/
│   └── functions/
│       └── news.js        # Netlify Function — 배포 시 lib/news.js 를 호출
├── netlify.toml            # Netlify 빌드/배포 설정
├── public/
│   └── index.html         # 프론트엔드 (HTML + CSS + JS 단일 파일)
├── .githooks/
│   └── pre-commit         # 키 커밋 차단 훅
├── .env.example           # 환경변수 템플릿 (커밋 대상)
├── .env.local             # 실제 키 — 커밋되지 않음
├── .gitignore
├── PRD.md                 # 제품 요구사항 문서
├── README.md
└── package.json
```

## API 명세 (내부용)

### `GET /api/news`

| 파라미터  | 타입   | 기본값 | 설명 |
|-----------|--------|--------|------|
| `query`   | string | (필수) | 검색어 |
| `sort`    | string | `sim`  | `sim`(정확도) 또는 `date`(최신순) |
| `page`    | number | `1`    | 페이지 번호 |
| `display` | number | `10`   | 페이지당 결과 수 (10~100) |

**응답 예시**

```json
{
  "query": "인공지능",
  "sort": "sim",
  "page": 1,
  "display": 10,
  "maxPage": 100,
  "total": 1234,
  "items": [
    {
      "title": "<b>인공지능</b> 관련 기사 제목",
      "description": "기사 요약...",
      "link": "https://n.news.naver.com/...",
      "originallink": "https://...",
      "pubDate": "Mon, 18 Aug 2026 12:00:00 +0900"
    }
  ]
}
```

## 알아두면 좋은 제약사항

네이버 검색 API 자체의 제한입니다.

- **일일 호출 한도 25,000회** (비로그인 오픈 API 기준)
- **`display` 최대 100개**
- **`start` 최대 1000** — 즉 한 검색어로 최대 1,000번째 결과까지만 조회 가능합니다.
  `total`이 100만 건이어도 실제로 넘길 수 있는 페이지는 제한되므로, 서버가 `maxPage`를
  계산해서 내려주고 프론트는 그 범위까지만 페이지 버튼을 그립니다.
- 기사 제목·요약의 검색어는 `<b>` 태그로 감싸져서 옵니다. 프론트에서는 이 문자열을
  `innerHTML`로 넣지 않고 텍스트 노드로 안전하게 조립해서 렌더링합니다(XSS 방지).

## 배포할 때

- 호스팅 환경에서는 `.env.local` 대신 그 플랫폼의 환경변수 설정에 `NCP_APIGW_API_KEY_ID` /
  `NCP_APIGW_API_KEY`를 넣어주세요.
- 공개 사이트로 운영한다면 `/api/news`에 rate limit(예: `express-rate-limit`)을 붙이는 것을
  권장합니다. 그렇지 않으면 다른 사람이 이 엔드포인트로 일일 한도를 소진시킬 수 있습니다.

### Netlify 배포

Netlify는 `server.js`처럼 계속 떠 있는 Express 서버를 실행할 수 없습니다(정적 파일 +
서버리스 Function만 지원). 그래서 `/api/news` 로직을 `netlify/functions/news.js`
Function으로 옮겨뒀고, `netlify.toml`이 `/api/*` 요청을 그 Function으로 연결합니다.

1. Netlify에서 이 GitHub 저장소를 Import
2. 빌드 설정은 `netlify.toml`에 이미 정의되어 있어 그대로 두면 됩니다
   (Publish directory: `public`, Functions directory: `netlify/functions`)
3. Site settings → **Environment variables**에 `NCP_APIGW_API_KEY_ID`, `NCP_APIGW_API_KEY` 등록
   (`.env.local` 파일은 배포되지 않으므로 반드시 Netlify 대시보드에 직접 넣어야 합니다)
4. Deploy 실행 → `https://<사이트이름>.netlify.app` 접속

로컬에서 Netlify 환경까지 그대로 재현해보고 싶다면 `npx netlify-cli dev`를 사용할 수
있습니다 (Netlify CLI 설치 필요, `server.js`의 `npm start`와는 별도 실행 방식입니다).
