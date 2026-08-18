'use strict';

// 2026년 이후 신규 발급 키는 개발자센터(openapi.naver.com)가 아닌
// NAVER API HUB(NCP) 경유로 바뀌었다. 엔드포인트/헤더 이름만 다르고
// 응답 필드(title/description/link/originallink/pubDate)는 동일하다.
const NAVER_API_URL = 'https://naverapihub.apigw.ntruss.com/search/v1/news';

const DISPLAY_MIN = 10;
const DISPLAY_MAX = 100;
const START_MAX = 1000; // start 파라미터 최대값

/** 숫자 파라미터를 안전하게 정수로 변환하고 범위를 제한 */
function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** 응답 아이템에서 프론트가 쓰는 필드만 남김 */
function normalizeItem(item) {
  return {
    title: item.title ?? '',
    description: item.description ?? '',
    link: item.link ?? '',
    originallink: item.originallink ?? '',
    pubDate: item.pubDate ?? '',
  };
}

function buildMockResponse({ query, display, sort, page, maxPage }) {
  const total = 1234;
  const items = Array.from({ length: display }, (_, i) => {
    const n = (page - 1) * display + i + 1;
    const date = new Date(Date.UTC(2026, 7, 18, 3, 0, 0) - n * 3600 * 1000);
    return {
      title: `<b>${query}</b> 관련 소식 ${n}번째 기사 제목입니다`,
      description: `이것은 <b>${query}</b> 검색 결과의 ${n}번째 샘플 요약문입니다. 실제 API 키를 넣으면 네이버 뉴스의 실제 기사 내용이 이 자리에 표시됩니다.`,
      link: 'https://n.news.naver.com/mnews/article/000/0000000000',
      originallink: 'https://example.com/news/article',
      pubDate: date.toUTCString(),
    };
  });
  return { query, sort, page, display, maxPage, total, items, mock: true };
}

/**
 * 뉴스 검색을 수행하고 { status, body } 를 반환한다.
 * Express 라우트와 Netlify Function 양쪽에서 공용으로 사용.
 *
 * @param {{query?: string, display?: string, sort?: string, page?: string}} params
 * @param {{CLIENT_ID?: string, CLIENT_SECRET?: string, USE_MOCK?: boolean}} env
 */
async function getNews(params, env) {
  const query = typeof params.query === 'string' ? params.query.trim() : '';
  if (!query) {
    return { status: 400, body: { error: '검색어(query)를 입력해주세요.' } };
  }

  const display = clampInt(params.display, 10, DISPLAY_MIN, DISPLAY_MAX);
  const sort = params.sort === 'date' ? 'date' : 'sim';

  // 프론트에서는 page 로 요청하고, 서버가 네이버의 start 로 변환합니다.
  const maxPage = Math.floor((START_MAX - 1) / display) + 1;
  const page = clampInt(params.page, 1, 1, maxPage);
  const start = (page - 1) * display + 1;

  if (env.USE_MOCK) {
    return { status: 200, body: buildMockResponse({ query, display, sort, page, start, maxPage }) };
  }

  if (!env.CLIENT_ID || !env.CLIENT_SECRET) {
    return {
      status: 500,
      body: {
        error:
          'API 키가 설정되지 않았습니다. .env.local 파일에 NCP-APIGW-API-KEY-ID / NCP-APIGW-API-KEY 를 넣어주세요.',
      },
    };
  }

  const url = `${NAVER_API_URL}?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': env.CLIENT_ID,
        'X-NCP-APIGW-API-KEY': env.CLIENT_SECRET,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const body = await response.text();

    if (!response.ok) {
      let message = `네이버 API 오류 (HTTP ${response.status})`;
      try {
        const parsed = JSON.parse(body);
        if (parsed.errorMessage) message = `${message}: ${parsed.errorMessage}`;
      } catch {
        /* 본문이 JSON이 아니면 기본 메시지 사용 */
      }
      if (response.status === 401) {
        message = 'API 키가 올바르지 않습니다. Client ID / Secret 을 다시 확인해주세요.';
      }
      if (response.status === 429) {
        message = '일일 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
      }
      console.error('[naver-api]', response.status, body.slice(0, 300));
      return { status: response.status === 401 ? 500 : 502, body: { error: message } };
    }

    const data = JSON.parse(body);

    return {
      status: 200,
      body: {
        query,
        sort,
        page,
        display,
        maxPage,
        total: data.total ?? 0,
        items: (data.items ?? []).map(normalizeItem),
      },
    };
  } catch (err) {
    const aborted = err.name === 'AbortError';
    console.error('[naver-api] request failed:', err.message);
    return {
      status: aborted ? 504 : 500,
      body: {
        error: aborted
          ? '네이버 API 응답이 지연되고 있습니다. 다시 시도해주세요.'
          : '뉴스를 불러오는 중 오류가 발생했습니다.',
      },
    };
  }
}

module.exports = { getNews };
