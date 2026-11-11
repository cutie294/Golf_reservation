/**
 * tests/api_search.test.js
 * 설명: POST /api/search 핸들러 통합 테스트
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/search.js';
import { getTodayKSTString } from '../api/_lib/validation.js';

describe('4. /api/search 백엔드 핸들러 통합 테스트', () => {
  it('오늘 날짜로 검색 시 골프장 목록과 추천 TOP 3를 반환해야 한다', async () => {
    const today = getTodayKSTString();

    let responseCode = 200;
    let responseData = null;

    const req = {
      method: 'POST',
      body: {
        date: today,
        origin: {
          address: '서울시 강남구',
          latitude: 37.5172,
          longitude: 127.0473
        }
      }
    };

    const res = {
      setHeader: () => {},
      status: (code) => {
        responseCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        return res;
      }
    };

    await handler(req, res);

    assert.equal(responseCode, 200);
    assert.equal(responseData.date, today);
    assert.ok(Array.isArray(responseData.courses));
    assert.ok(responseData.courses.length > 0);
    assert.ok(Array.isArray(responseData.recommendations));
    assert.ok(responseData.recommendations.length <= 3);

    // 추천 사유가 잘 포함되어 있는지 확인
    const firstRec = responseData.recommendations[0];
    assert.ok(firstRec.recommendationReason);
    assert.equal(firstRec.rank, 1);
  });

  it('과거 날짜로 요청 시 400 에러를 반환해야 한다 (PRD 시나리오 2)', async () => {
    let responseCode = 200;
    let responseData = null;

    const req = {
      method: 'POST',
      body: {
        date: '2020-01-01'
      }
    };

    const res = {
      setHeader: () => {},
      status: (code) => {
        responseCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        return res;
      }
    };

    await handler(req, res);

    assert.equal(responseCode, 400);
    assert.equal(responseData.error.code, 'INVALID_DATE');
  });
});

