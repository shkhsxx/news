'use strict';

const { getNews } = require('../../lib/news');

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  const { status, body } = await getNews(params, {
    CLIENT_ID: process.env.NAVER_CLIENT_ID,
    CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET,
    USE_MOCK: process.env.MOCK === '1',
  });

  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
};
