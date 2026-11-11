/**
 * courseDataProvider.js
 * 설명: 골프장의 실시간 티타임, 라운딩 가격, 예약 가능 여부를 조회하는 공급자 어댑터 모듈
 * 
 * [초보자를 위한 가이드]
 * - 외부 골프장 예약 제휴사(예: XGOLF, 골프존 등)의 API 키가 없어도 시스템 전체의 UI/UX와 추천 로직을
 *   정상적으로 개발하고 시연할 수 있도록 데모용 샘플 데이터를 안전하게 제공합니다.
 * - PRD 지침에 따라 실제 예약 가능한 티타임이 아님을 `isSample: true` 및 `[샘플 데모 데이터]`로
 *   명확하게 표기하여 사용자에게 혼란을 주지 않습니다.
 * - PRD 검증 시나리오 3(데이터가 없는 골프장은 '정보 없음'으로 표시)을 검증할 수 있도록 
 *   특정 케이스에는 '정보 없음(unknown)' 상태를 의도적으로 반환합니다.
 */

/**
 * 골프장 ID와 선택 날짜에 대한 티타임 및 가격 스냅샷 데이터를 조회합니다.
 * 
 * @param {object} params
 * @param {string} params.courseId 골프장 고유 식별자
 * @param {string} params.courseName 골프장 이름
 * @param {string} params.date 라운딩 희망 날짜 (YYYY-MM-DD)
 * @returns {Promise<{
 *   price: {
 *     amount: number | null,
 *     currency: string,
 *     basis: string | null,
 *     status: 'confirmed' | 'indicative' | 'unknown'
 *   },
 *   teeTimes: string[],
 *   availability: 'available' | 'unavailable' | 'unknown',
 *   source: string,
 *   isSample: boolean,
 *   checkedAt: string | null
 * }>}
 */
export async function getCourseDataSnapshot({ courseId, courseName, date }) {
  const apiKey = process.env.COURSE_DATA_API_KEY;
  const useMock = process.env.USE_MOCK_COURSE_DATA !== 'false';

  // 1. 실제 상용 API 키가 있을 경우의 처리 (추후 실제 제휴 시 연동)
  if (apiKey && !useMock) {
    // 실제 외부 골프장 예약 API 호출 영역
  }

  // 2. 더미(샘플) 시뮬레이션 데이터 제공
  return generateDeterministicCourseMock(courseId, courseName, date);
}

/**
 * 일관된 데모용 골프장 가격/티타임 데이터를 생성합니다.
 */
function generateDeterministicCourseMock(courseId, courseName, dateStr) {
  // [PRD 검증 시나리오 3 테스트를 위한 특별 케이스]
  // 5번째 샘플 골프장(해운대 CC 등)이나 ID 끝자리가 '5'인 경우 의도적으로 '정보 없음' 반환
  if (courseId && courseId.includes('5555')) {
    return {
      price: {
        amount: null,
        currency: 'KRW',
        basis: null,
        status: 'unknown' // 가격 정보 없음
      },
      teeTimes: [], // 티타임 없음
      availability: 'unknown', // 예약 상태 확인 불가
      source: '공급자 미연동 골프장',
      isSample: true,
      checkedAt: new Date().toISOString()
    };
  }

  // 일관된 난수 생성을 위한 해시 계산
  const seedString = `${courseId}_${dateStr}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  // 티타임 후보 목록
  const candidateTeeTimes = [
    ['06:42', '07:15', '07:58', '11:20'],
    ['07:05', '07:44', '12:10', '13:05'],
    ['06:50', '08:12', '11:45'],
    ['07:30', '12:00']
  ];
  const teeTimes = candidateTeeTimes[positiveHash % candidateTeeTimes.length];

  // 금액 (1인 그린피 기준, 130,000원 ~ 260,000원 사이 만원 단위)
  const priceAmount = 130000 + ((positiveHash % 14) * 10000);

  return {
    price: {
      amount: priceAmount,
      currency: 'KRW',
      basis: '1인 기준 (그린피)',
      status: 'indicative' // 예상/안내 요금
    },
    teeTimes: teeTimes,
    availability: 'available', // 예약 가능 (데모용 안내)
    source: '샘플 데모 공급자 (키 미등록 모드)',
    isSample: true,
    checkedAt: new Date().toISOString()
  };
}

