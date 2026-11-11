/**
 * weatherProvider.js
 * 설명: 날씨 및 강수확률 정보를 조회하는 공급자 어댑터 모듈
 * 
 * [초보자를 위한 가이드]
 * - 실제 상용 날씨 API(기상청, OpenWeatherMap 등)의 키가 없을 때도 시스템이 정상 작동할 수 있도록
 *   자동으로 더미(샘플) 날씨 데이터를 안전하게 제공합니다.
 * - PRD 지침에 따라 임의의 데이터를 실시간 실제 데이터처럼 속이지 않고, 출처(source)와 
 *   샘플 여부(isSample: true)를 투명하게 표시합니다.
 */

/**
 * 특정 날짜와 위치(위도/경도)의 날씨 정보를 조회합니다.
 * 
 * @param {object} params
 * @param {number} params.latitude 위도
 * @param {number} params.longitude 경도
 * @param {string} params.date 조회 희망 날짜 (YYYY-MM-DD)
 * @returns {Promise<{
 *   status: 'available' | 'unavailable' | 'out_of_range',
 *   summary: string | null,
 *   temperatureC: number | null,
 *   precipitationProbability: number | null,
 *   source: string,
 *   isSample: boolean
 * }>}
 */
export async function getWeather({ latitude, longitude, date }) {
  const apiKey = process.env.WEATHER_API_KEY;
  const useMock = process.env.USE_MOCK_WEATHER !== 'false'; // 키가 없거나 USE_MOCK이 true면 더미 사용

  // 1. 날짜 범위 확인: 오늘 기준으로 14일 이후는 기상청/단기예보 제공 기간 밖으로 처리 (PRD 규칙)
  const targetDate = new Date(date);
  const now = new Date();
  const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 14) {
    return {
      status: 'out_of_range',
      summary: '예보 제공 기간 아님 (14일 초과)',
      temperatureC: null,
      precipitationProbability: null,
      source: '기상 예보 시스템',
      isSample: false
    };
  }

  // 2. 실제 API 키가 등록되어 있고 더미 모드가 아닐 때 (추후 연동 시 확장 지점)
  if (apiKey && !useMock) {
    // 실제 외부 날씨 API 호출 로직이 들어가는 영역입니다.
    // 현재는 키가 없으므로 아래의 시뮬레이션 더미 데이터 공급자로 이어집니다.
  }

  // 3. 더미(시뮬레이션) 데이터 공급 로직
  // 테스트 및 학습 시 매번 값이 바뀌어 헷갈리지 않도록, 날짜 문자열과 위경도로 고정된 값을 산출합니다.
  return generateDeterministicMockWeather(latitude, longitude, date);
}

/**
 * 날짜와 좌표를 기반으로 일관성 있는 시뮬레이션 날씨 데이터를 생성합니다.
 * (새로고침을 눌러도 동일 날짜/골프장은 같은 날씨를 유지하여 안정적인 테스트가 가능합니다.)
 */
function generateDeterministicMockWeather(lat, lng, dateStr) {
  // 간단한 숫자 해시값 생성
  const seedString = `${dateStr}_${lat.toFixed(2)}_${lng.toFixed(2)}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  // 시연 및 검증 시나리오 5: "강수확률이 null인 경우 —로 표시한다"를 검증하기 위해 
  // 해시의 특정 패턴(끝자리 9)일 때는 강수확률 null 처리
  if (positiveHash % 10 === 9) {
    return {
      status: 'available',
      summary: '구름 많음',
      temperatureC: 14.5,
      precipitationProbability: null, // PRD 검증 시나리오 5 대응 (null일 때 대시 표시)
      source: '샘플 시뮬레이션 날씨 (강수확률 미제공 케이스)',
      isSample: true
    };
  }

  // 날씨 요약 패턴
  const summaries = ['맑음', '구름 조금', '구름 많음', '흐림', '비'];
  const summaryIndex = positiveHash % summaries.length;
  const summary = summaries[summaryIndex];

  // 기온: 계절에 무관하게 라운딩 가능한 적정 기온 (8℃ ~ 22℃ 사이)
  const temperatureC = 10 + (positiveHash % 12);

  // 강수확률: 날씨 요약에 맞추어 현실적으로 부여 (비: 70~90%, 흐림: 40~60%, 맑음: 0~20%)
  let precipitationProbability = 0;
  if (summary === '비') {
    precipitationProbability = 70 + (positiveHash % 25);
  } else if (summary === '흐림') {
    precipitationProbability = 40 + (positiveHash % 20); // 40% (PRD 시나리오 4 검증용)
  } else if (summary === '구름 많음') {
    precipitationProbability = 20 + (positiveHash % 15);
  } else {
    precipitationProbability = (positiveHash % 10); // 0~10%
  }

  return {
    status: 'available',
    summary: summary,
    temperatureC: temperatureC,
    precipitationProbability: precipitationProbability,
    source: '샘플 시뮬레이션 날씨 (키 미등록 모드)',
    isSample: true
  };
}

