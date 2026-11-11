# 04. 백엔드 및 API 구현 지침

## 1. 백엔드 원칙
Node.js 기반 Vercel Functions를 사용한다. 외부 공급자 연결과 OpenAI 호출은 서버에서만 실행한다. 모든 API는 JSON을 반환하고 적절한 HTTP 상태 코드를 사용한다.

## 2. API 계약
### `POST /api/search`
요청:
```json
{
  "date": "YYYY-MM-DD",
  "origin": {
    "address": "optional string",
    "latitude": 37.0,
    "longitude": 127.0
  }
}
```
- `date`는 필수이며 실제 달력 날짜인지 검증한다.
- 날짜는 과거가 아니어야 한다.
- 위도 범위 -90~90, 경도 범위 -180~180 검증.
- 출발 위치 전체가 없어도 검색 가능.
- 요청 크기와 문자열 길이를 제한한다.

응답(개념):
```json
{
  "date": "2026-11-20",
  "courses": [],
  "recommendations": [],
  "meta": {
    "isSample": false,
    "checkedAt": "2026-11-11T04:00:00.000Z",
    "partialErrors": []
  }
}
```

### `POST /api/recommendations` (선택 분리)
검색 API에서 추천까지 함께 반환하는 편이 단순하면 별도 엔드포인트를 만들지 않는다. 분리하는 경우 검색 결과 ID 목록과 출발 좌표를 받아 기존 검증된 결과 안에서만 추천한다.

## 3. 표준 응답 모델
- `availability`: `available | unavailable | unknown`.
- `price.status`: `confirmed | indicative | unknown`.
- `teeTimes`: 공급자가 확인한 시간 문자열 배열. 미확인 시 빈 배열.
- `weather.status`: `available | unavailable | out_of_range`.
- `precipitationProbability`: 0~100 정수 또는 null.
- `checkedAt`: 실제 확인 시각 또는 null.
- `source`: 공급자 식별자.
- `isSample`: 데모 데이터 여부.

`available`은 공급자가 명시적으로 예약 가능하다고 반환한 경우에만 사용한다. 단순히 골프장 레코드가 있다는 이유로 예약 가능으로 처리하지 않는다.

## 4. 공급자 어댑터 계약
예시 인터페이스:
```js
// 각 공급자는 이 내부 형태로 변환해 반환한다.
async function getWeather({ latitude, longitude, date }) {
  return {
    status: "available",
    summary: null,
    temperatureC: null,
    precipitationProbability: null,
    source: "weather-provider"
  };
}
```
실제 구현 시 공급자 공식 문서의 필드·단위·요청 제한·상업적 이용 조건을 확인한다. 공급자 이름이나 API 엔드포인트를 추측해 구현하지 않는다.

## 5. 오류 응답
표준 형식:
```json
{
  "error": {
    "code": "INVALID_DATE",
    "message": "날짜를 다시 확인해 주세요."
  }
}
```
권장 코드: `INVALID_DATE`, `INVALID_ORIGIN`, `RATE_LIMITED`, `DATA_PROVIDER_UNAVAILABLE`, `INTERNAL_ERROR`.
- 400: 입력값 오류
- 429: 요청 제한
- 500: 내부 오류
- 502/503: 외부 공급자 장애
부분 오류는 정상 응답의 `meta.partialErrors`에 표시할 수 있다.

## 6. 병렬 조회와 성능
골프장 기본 정보 조회, 날씨 조회, 예약 데이터 조회는 독립성이 있으면 병렬 처리한다. 각 외부 요청에 타임아웃을 적용하고, 한 공급자 장애가 전체 응답을 무조건 실패시키지 않도록 한다. Vercel 실행 시간과 공급자 호출 제한을 고려한다.

## 7. OpenAI 사용 규칙
- API 키는 `OPENAI_API_KEY` 환경변수로만 읽는다.
- AI에게 티타임·가격·날씨·예약 가능 여부를 생성하게 하지 않는다.
- 서버가 계산한 추천 후보와 근거만 전달하고, AI는 그 근거를 짧은 한국어 설명으로 바꾼다.
- 모델 출력은 JSON 스키마 또는 엄격한 파싱으로 검증한다.
- 파싱 실패/타임아웃/할당량 초과 시 템플릿 기반 설명으로 대체한다.
- 사용자 자유 입력을 시스템 지시처럼 취급하지 않도록 프롬프트를 분리하고 입력 길이를 제한한다.

## 8. 예약 기능 제한
예약 API 라우트, 결제 처리, 예약 DB 쓰기를 만들지 않는다. 프론트엔드 버튼은 안내 메시지만 띄운다. 예약 미지원 안내가 백엔드 응답에 의존할 필요는 없다.
