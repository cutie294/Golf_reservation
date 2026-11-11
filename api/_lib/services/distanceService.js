/**
 * distanceService.js
 * 설명: 출발 위치와 골프장 좌표 사이의 직선거리(Haversine 공식)를 계산하는 서비스 모듈
 * 
 * [초보자를 위한 가이드]
 * - 지구는 둥근 구 형태이므로, 단순 평면 피타고라스 정리가 아닌 '하버사인(Haversine) 공식'을 사용하여
 *   두 GPS 좌표(위도, 경도) 사이의 정확한 구면 직선거리를 계산합니다.
 * - PRD 지침에 따라 출발 좌표나 골프장 좌표 중 하나라도 누락되면 억지로 거리를 추측하지 않고
 *   정확하게 `null`을 반환하여 데이터 신뢰도를 높입니다.
 */

// 지구 반지름 (단위: km)
const EARTH_RADIUS_KM = 6371;

/**
 * 도(degree) 단위를 라디안(radian) 단위로 변환합니다.
 * @param {number} deg 각도 (도)
 * @returns {number} 라디안 값
 */
function toRadians(deg) {
  return deg * (Math.PI / 180);
}

/**
 * 두 좌표 사이의 직선거리를 계산합니다.
 * 
 * @param {object} origin 출발 좌표 { latitude, longitude }
 * @param {object} destination 목적지 골프장 좌표 { latitude, longitude }
 * @returns {{ distanceKm: number | null, formatted: string | null }}
 */
export function calculateStraightDistance(origin, destination) {
  // 1. 출발지나 목적지 좌표가 없는 경우 처리
  if (
    !origin ||
    origin.latitude === null || origin.latitude === undefined ||
    origin.longitude === null || origin.longitude === undefined ||
    !destination ||
    destination.latitude === null || destination.latitude === undefined ||
    destination.longitude === null || destination.longitude === undefined
  ) {
    return {
      distanceKm: null,
      formatted: null
    };
  }

  const lat1 = Number(origin.latitude);
  const lon1 = Number(origin.longitude);
  const lat2 = Number(destination.latitude);
  const lon2 = Number(destination.longitude);

  // 유효한 숫자가 아닌 경우
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return { distanceKm: null, formatted: null };
  }

  // 2. 하버사인(Haversine) 공식 적용
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round((EARTH_RADIUS_KM * c) * 10) / 10; // 소수점 첫째자리 반올림

  return {
    distanceKm: distanceKm,
    formatted: `직선거리 약 ${distanceKm}km`
  };
}

