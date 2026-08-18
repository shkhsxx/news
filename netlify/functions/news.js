'use strict';

const { getNews } = require('../../lib/news');

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  const { status, body } = await getNews(params, {
    CLIENT_ID: process.env['NCP-APIGW-API-KEY-ID'],
    CLIENT_SECRET: process.env['NCP-APIGW-API-KEY'],
    USE_MOCK: process.env.MOCK === '1',
  });

  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
};
