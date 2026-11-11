# 01. 시스템 구조 및 아키텍처

## 1. 전체 구조
브라우저(HTML/CSS/JavaScript) → Vercel의 Node.js API 함수 → 외부 데이터 공급자 및 Supabase/OpenAI 순서로 동작한다.

```text
[사용자 브라우저]
  ├─ 날짜/출발 위치 입력
  ├─ 골프장 목록·날씨·추천 카드 표시
  └─ 예약하기 클릭 → 예약 미지원 안내만 표시
          │ HTTPS / JSON
          ▼
[Vercel Node.js API]
  ├─ 입력 검증 및 요청 제한
  ├─ GolfCourseRepository → Supabase
  ├─ TeeTimeProvider → 허가된 예약 데이터 공급자(선택)
  ├─ WeatherProvider → 날씨 API
  ├─ DistanceService → 좌표 기반 거리 계산
  └─ RecommendationService → 규칙 기반 선정 + OpenAI 설명
```

## 2. 권장 폴더 구조
```text
/
├─ AGENTS.md
├─ PRD.md
├─ docs/
├─ public/
│  ├─ index.html
│  ├─ css/styles.css
│  ├─ js/app.js
│  ├─ js/api.js
│  └─ assets/
├─ api/
│  ├─ search.js
│  ├─ recommendations.js
│  └─ _lib/
│     ├─ validation.js
│     ├─ providers/
│     ├─ repositories/
│     └─ services/
├─ supabase/
│  └─ migrations/
├─ tests/
├─ .env.example
├─ .gitignore
└─ package.json
```
Vercel Node.js 함수의 파일 경로 규칙은 실제 프로젝트 설정에 맞춰 확인한다. 위 구조는 역할을 설명하는 기준 구조이며, 배포 설정과 충돌하면 Vercel 공식 규칙에 맞게 조정하고 문서를 갱신한다.

## 3. 책임 분리
- 화면: 입력, 결과 렌더링, 로딩/오류 상태. 외부 공급자 API 직접 호출 금지.
- API: 요청 검증, 데이터 조합, 표준 응답 생성.
- Repository: Supabase 읽기/쓰기.
- Provider: 외부 공급자 응답을 내부 표준 형태로 변환.
- Service: 거리 계산, 추천 점수 계산, AI 설명 생성.

## 4. 핵심 표준 데이터 형태
골프장:
```json
{
  "id": "course-uuid",
  "name": "골프장 이름",
  "address": "주소",
  "latitude": 37.0,
  "longitude": 127.0,
  "dataSource": "provider-name",
  "isSample": false
}
```
검색 결과(개념 예시):
```json
{
  "date": "2026-11-20",
  "courses": [{
    "course": {},
    "price": {
      "amount": null,
      "currency": "KRW",
      "basis": null,
      "status": "unknown"
    },
    "teeTimes": [],
    "availability": "unknown",
    "weather": {
      "summary": null,
      "temperatureC": null,
      "precipitationProbability": null,
      "status": "unavailable"
    },
    "checkedAt": null
  }],
  "meta": {
    "isSample": false,
    "partialErrors": []
  }
}
```
실제 응답에서는 `course` 객체를 위 골프장 스키마로 채운다. 값이 확인되지 않으면 `null`, 빈 배열 또는 `unknown`을 사용한다.

## 5. 외부 공급자 어댑터
`WeatherProvider`, `TeeTimeProvider`, `CourseDataProvider` 인터페이스를 먼저 정의하고 공급자별 구현은 별도 파일로 둔다. API 키가 없거나 계약/접근 권한이 없는 경우 `UnavailableProvider`를 사용해 명시적으로 미연동 상태를 반환한다.

## 6. 실패 처리
- 날씨만 실패: 골프장과 예약 관련 정보는 표시하고 날씨 영역에 실패 상태 표시.
- 티타임 공급자 실패: 골프장 정보는 표시하고 예약 상태는 `확인 불가`.
- Supabase 실패: 캐시/샘플 모드가 명시적으로 허용된 경우에만 샘플 표시. 샘플이 아니면 오류 안내.
- OpenAI 실패: 추천 후보는 규칙 기반으로 유지하고 AI 설명 대신 템플릿 설명 표시.
- 모든 오류 응답에서 비밀 키·스택 트레이스·공급자 내부 메시지를 제거한다.
