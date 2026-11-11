/**
 * validation.js
 * 설명: 사용자 입력값(날짜, 출발 좌표 등)의 유효성을 검증하는 공통 유틸리티 함수 모음
 * 초보자를 위한 안내: 외부에서 들어오는 데이터는 보안과 정상 작동을 위해 항상 검증을 거쳐야 합니다.
 */

/**
 * 한국 시간(KST) 기준 오늘의 YYYY-MM-DD 문자열을 반환합니다.
 * @returns {string} 오늘 날짜 문자열 (예: "2026-11-11")
 */
export function getTodayKSTString() {
  const now = new Date();
  // 한국 표준시 (UTC+9) 계산
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstTime = new Date(utc + (9 * 60 * 60000));
  
  const year = kstTime.getFullYear();
  const month = String(kstTime.getMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 라운딩 날짜의 유효성을 검사합니다.
 * 조건 1: YYYY-MM-DD 형식이어야 함
 * 조건 2: 실제로 달력에 존재하는 날짜여야 함 (예: 2월 30일 등 방지)
 * 조건 3: 과거 날짜가 아니어야 함 (오늘 이후여야 함)
 * 
 * @param {string} dateString 검사할 날짜 문자열
 * @returns {{ isValid: boolean, error?: string }} 검증 결과 객체
 */
export function validateDate(dateString) {
  // 1. 문자열 존재 여부 확인
  if (!dateString || typeof dateString !== 'string') {
    return {
      isValid: false,
      error: '날짜가 입력되지 않았거나 올바르지 않은 형식입니다.'
    };
  }

  // 2. 정규표현식을 이용한 YYYY-MM-DD 형식 확인
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return {
      isValid: false,
      error: '날짜는 YYYY-MM-DD 형식이어야 합니다. (예: 2026-11-20)'
    };
  }

  // 3. 실제 달력 날짜 검증 (자바스크립트 Date 객체 활용)
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return {
      isValid: false,
      error: '달력에 존재하지 않는 잘못된 날짜입니다.'
    };
  }

  // 4. 과거 날짜인지 확인 (오늘 날짜와 비교)
  const todayStr = getTodayKSTString();
  if (dateString < todayStr) {
    return {
      isValid: false,
      error: '과거 날짜는 선택할 수 없습니다. 오늘 이후의 날짜를 선택해 주세요.'
    };
  }

  // 모든 검증을 통과한 경우
  return { isValid: true };
}

/**
 * 출발 위치(위도, 경도)의 유효성을 검사합니다.
 * 출발 위치는 선택사항이므로, 값이 주어지지 않은 경우는 유효(isValid: true)로 처리합니다.
 * 값이 전달된 경우에는 유효한 숫자인지 및 좌표 범위(-90~90, -180~180)를 검증합니다.
 * 
 * @param {object|null|undefined} origin 출발 위치 객체 ({ latitude, longitude, address })
 * @returns {{ isValid: boolean, error?: string, parsedOrigin?: { latitude: number, longitude: number, address?: string } | null }}
 */
export function validateOrigin(origin) {
  // 출발 위치가 제공되지 않은 경우 (정상 - 거리 계산 생략)
  if (!origin || (origin.latitude === undefined && origin.longitude === undefined)) {
    return { isValid: true, parsedOrigin: null };
  }

  const lat = Number(origin.latitude);
  const lng = Number(origin.longitude);

  // 숫자가 아니거나 범위를 벗어난 경우 확인
  if (isNaN(lat) || lat < -90 || lat > 90) {
    return {
      isValid: false,
      error: '위도는 -90도에서 90도 사이의 올바른 숫자여야 합니다.'
    };
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    return {
      isValid: false,
      error: '경도는 -180도에서 180도 사이의 올바른 숫자여야 합니다.'
    };
  }

  return {
    isValid: true,
    parsedOrigin: {
      latitude: lat,
      longitude: lng,
      address: typeof origin.address === 'string' ? origin.address.slice(0, 100) : ''
    }
  };
}

