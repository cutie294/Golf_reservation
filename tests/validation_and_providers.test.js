/**
 * tests/validation_and_providers.test.js
 * 설명: 입력 검증 및 더미 데이터 공급자 모듈 단위 테스트
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateDate, validateOrigin, getTodayKSTString } from '../api/_lib/validation.js';
import { getWeather } from '../api/_lib/providers/weatherProvider.js';
import { getCourseDataSnapshot } from '../api/_lib/providers/courseDataProvider.js';

describe('1. 날짜 및 출발지 검증 테스트 (Validation)', () => {
  it('오늘 이후의 정상 날짜는 검증에 통과해야 한다', () => {
    const today = getTodayKSTString();
    const result = validateDate(today);
    assert.equal(result.isValid, true);
  });

  it('과거 날짜는 검증에 실패해야 한다 (PRD 시나리오 2)', () => {
    const result = validateDate('2020-01-01');
    assert.equal(result.isValid, false);
    assert.match(result.error, /과거 날짜는 선택할 수 없습니다/);
  });

  it('잘못된 형식이나 존재하지 않는 날짜는 실패해야 한다 (예: 2026-02-30)', () => {
    const formatError = validateDate('2026/11/20');
    assert.equal(formatError.isValid, false);

    const invalidDateError = validateDate('2026-02-30');
    assert.equal(invalidDateError.isValid, false);
    assert.match(invalidDateError.error, /달력에 존재하지 않는/);
  });

  it('출발 좌표가 없는 경우에도 정상 처리되어야 한다 (거리 계산 생략)', () => {
    const emptyOrigin = validateOrigin(null);
    assert.equal(emptyOrigin.isValid, true);
    assert.equal(emptyOrigin.parsedOrigin, null);
  });

  it('위도 또는 경도 범위를 벗어나면 검증에 실패해야 한다', () => {
    const invalidLat = validateOrigin({ latitude: 120, longitude: 127 });
    assert.equal(invalidLat.isValid, false);
    assert.match(invalidLat.error, /위도는 -90도에서 90도/);
  });
});

describe('2. 날씨 더미 공급자 테스트 (WeatherProvider)', () => {
  it('키가 없을 때도 일관된 샘플 날씨 데이터를 반환해야 한다', async () => {
    const weather = await getWeather({
      latitude: 37.2185,
      longitude: 127.5954,
      date: getTodayKSTString()
    });

    assert.equal(weather.isSample, true);
    assert.equal(weather.status, 'available');
    assert.ok(weather.summary);
    assert.equal(typeof weather.temperatureC, 'number');
  });

  it('14일을 초과한 미래 날짜는 out_of_range 상태여야 한다 (PRD 요구사항)', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20);
    const dateStr = futureDate.toISOString().slice(0, 10);

    const weather = await getWeather({
      latitude: 37.2185,
      longitude: 127.5954,
      date: dateStr
    });

    assert.equal(weather.status, 'out_of_range');
    assert.equal(weather.precipitationProbability, null);
  });
});

describe('3. 골프장 티타임/가격 더미 공급자 테스트 (CourseDataProvider)', () => {
  it('일반 골프장은 샘플 가격과 티타임을 반환해야 한다', async () => {
    const data = await getCourseDataSnapshot({
      courseId: 'a1111111-1111-1111-1111-111111111111',
      courseName: '남여주 골프클럽',
      date: getTodayKSTString()
    });

    assert.equal(data.isSample, true);
    assert.equal(data.price.currency, 'KRW');
    assert.ok(data.price.amount > 0);
    assert.ok(Array.isArray(data.teeTimes));
    assert.ok(data.teeTimes.length > 0);
  });

  it('정보 미제공 골프장은 unknown과 빈 목록을 반환해야 한다 (PRD 시나리오 3)', async () => {
    const data = await getCourseDataSnapshot({
      courseId: 'a5555555-5555-5555-5555-555555555555',
      courseName: '해운대 CC',
      date: getTodayKSTString()
    });

    assert.equal(data.price.status, 'unknown');
    assert.equal(data.price.amount, null);
    assert.equal(data.availability, 'unknown');
    assert.deepEqual(data.teeTimes, []);
  });
});

