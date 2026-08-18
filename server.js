'use strict';

const path = require('path');

// .env.local 을 먼저 읽고, 없는 값만 .env 에서 채웁니다.
// (dotenv 는 이미 정의된 변수를 덮어쓰지 않으므로 .env.local 이 우선됩니다)
// 실제 키는 .env.local 에 넣어주세요 — .gitignore 에서 차단됩니다.
require('dotenv').config({ path: path.join(__dirname, '.env.local'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const express = require('express');
const { getNews } = require('./lib/news');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const CLIENT_ID = process.env.NCP_APIGW_API_KEY_ID;
const CLIENT_SECRET = process.env.NCP_APIGW_API_KEY;

// 키 없이 UI를 확인해보고 싶을 때 MOCK=1 로 실행하면 샘플 데이터가 내려옵니다.
const USE_MOCK = process.env.MOCK === '1';

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/news', async (req, res) => {
  const { status, body } = await getNews(req.query, { CLIENT_ID, CLIENT_SECRET, USE_MOCK });
  res.status(status).json(body);
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`\n  뉴스 검색 사이트가 실행되었습니다 → http://localhost:${PORT}`);
  if (USE_MOCK) {
    console.log('  [MOCK 모드] 샘플 데이터를 사용합니다. 실제 검색은 .env.local 설정 후 MOCK 없이 실행하세요.');
  } else if (!CLIENT_ID || !CLIENT_SECRET) {
    console.log('  ⚠  .env.local 에 NCP_APIGW_API_KEY_ID / NCP_APIGW_API_KEY 가 없습니다.');
    console.log('     cp .env.example .env.local  후 키를 입력해주세요.');
  }
  console.log('');
});
