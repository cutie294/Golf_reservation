# ⛳ 티업스팟 (TeeUpSpot) - 골프장 탐색 & AI 맞춤 추천 웹 서비스

> **"오늘 말고, 라운딩할 날을 골라봐요!"**  
> 여러 사이트를 오갈 필요 없이, 희망 날짜를 선택하면 **골프장 정보, 가격, 티타임, 날씨(강수확률)**를 한 화면에서 비교하고 **AI 맞춤 추천 코스 TOP 3**를 제공하는 모던 웹 애플리케이션입니다.

---

## 📸 프로젝트 미리보기 & 주요 화면 구성

- **어두운 배경 + 볼드하고 둥근 팝 컬러(노랑·보라·핑크) 패널 디자인**으로 직관적이고 친근한 사용자 경험을 제공합니다.
- **모바일, 태블릿, 데스크톱** 모든 기기를 완벽히 지원하는 반응형 웹(Vanilla JS / CSS Grid & Flexbox)입니다.

```text
┌────────────────────────────────────────────────────────┐
│  ⛳ TeeUpSpot                                          │
│                                                        │
│  [📅 검색 패널 (노랑)]                                │
│   - 라운딩 희망 날짜 선택 (과거 날짜 차단)              │
│   - 출발 위치 입력 및 [📍 내 위치 사용] GPS 버튼       │
│                                                        │
│  [✨ AI 맞춤 추천 TOP 3 패널 (보라)]                  │
│   - 날씨(강수확률) 및 이동 거리(직선거리) 기반 추천    │
│   - OpenAI 기반 자연스러운 1~2문장 추천 사유 요약      │
│                                                        │
│  [🏌️ 전체 골프장 상세 카드 목록 (크림/핑크)]           │
│   - 그린피 요금 / 잔여 티타임 / 일자별 날씨 예보       │
│   - [예약하기] 클릭 시 공식 채널 안내 모달 팝업        │
└────────────────────────────────────────────────────────┘
```

---

## 🌟 핵심 기능 및 특징

1. **날짜 중심의 골프장 탐색 (FR-01, FR-02)**
   - 한국 표준시(KST) 기준 달력 날짜 검증 및 과거 날짜 자동 차단
   - 골프장 기본 정보(이름, 주소, 전화번호, 홈페이지 링크) 제공
   - 그린피(요금), 확인된 잔여 티타임 칩 표시 (미확인 시 '정보 없음' 표기)

2. **일자별 날씨 & 강수확률 예보 (FR-03)**
   - 골프장 GPS 좌표를 기반으로 해당 일자의 기온, 하늘 상태(맑음, 구름많음, 비 등), 강수확률(%) 표시
   - 단기예보 제공 기간(14일 초과)을 벗어난 경우 '예보 제공 기간 아님'으로 안전하게 처리

3. **신뢰할 수 있는 규칙 기반 AI 맞춤 추천 (FR-04)**
   - **서버 결정론적 알고리즘:** 날씨(맑고 비 안 올수록 높은 점수)와 거리(가까울수록 높은 점수)를 서버에서 엄격히 점수화하여 TOP 3 선정
   - **OpenAI 자연어 요약:** 인공지능이 임의로 가짜 데이터를 지어내지 않고, 서버가 계산한 실제 수치만을 바탕으로 친절한 한국어 추천 사유 생성

4. **예약 기능 미지원 안내 모달 (FR-05)**
   - 실제 예약/결제 연동 대신, `예약하기` 버튼 클릭 시 사용자에게 공식 홈페이지 및 예약 채널 이용을 유도하는 접근성 모달 다이얼로그 표시

5. **외부 API 미연동 시에도 완벽 작동하는 더미/안전망 아키텍처**
   - 상용 날씨 API나 골프장 제휴 API 키가 없어도 시스템 전체를 시연하고 테스트할 수 있는 **결정론적 더미 데이터 공급자(Provider)** 내장

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 스택 | 설명 |
|---|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES Modules) | 가볍고 빠른 순수 웹 표준 기술 구현 |
| **Backend** | Node.js, Vercel Serverless Functions | 확장성 높은 서버리스 아키텍처 |
| **Database** | Supabase (PostgreSQL) | RLS 보안 정책이 적용된 클라우드 DB |
| **AI** | OpenAI API (`gpt-4o-mini`) | 맞춤 추천 사유 요약 생성 |
| **Deployment**| Vercel | 글로벌 CDN 및 서버리스 배포 |
| **Testing** | Node.js Built-in Test Runner (`node --test`) | 무설치 고속 단위/통합 테스트 (11개 항목) |

---

## 🚀 로컬 실행 방법 (Local Development)

### 1. 저장소 클론 및 패키지 설치
```bash
git clone https://github.com/cutie294/Golf_reservation.git
cd Golf_reservation
npm install
```

### 2. 환경 변수 설정
프로젝트 루트 경로에 `.env` 파일을 생성하고 발급받으신 키를 입력합니다:
```dotenv
# 1. Supabase 데이터베이스 설정 (필수)
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key_here

# 2. OpenAI API 설정 (선택/필수)
OPENAI_API_KEY=your_openai_api_key_here

# 3. 날씨 및 골프장 데이터 (더미 모드 기본 활성화)
WEATHER_API_KEY=
USE_MOCK_WEATHER=true
COURSE_DATA_API_KEY=
USE_MOCK_COURSE_DATA=true
```

### 3. Supabase 데이터베이스 초기화
Supabase 대시보드의 **SQL Editor**에서 아래 파일의 내용을 복사하여 실행합니다:
👉 [`supabase/migrations/000_init_database_all_in_one.sql`](supabase/migrations/000_init_database_all_in_one.sql)

### 4. 로컬 개발 서버 실행
```bash
npm start
```
웹 브라우저를 열고 `http://localhost:3000`에 접속합니다.

---

## 🧪 자동화 테스트 실행

작성된 입력 검증, 거리 계산, 날씨/골프장 공급자, 백엔드 API 통합 테스트를 실행합니다:
```bash
npm test
```
```text
✔ 1. 날짜 및 출발지 검증 테스트 (Validation)
✔ 2. 날씨 더미 공급자 테스트 (WeatherProvider)
✔ 3. 골프장 티타임/가격 더미 공급자 테스트 (CourseDataProvider)
✔ 4. /api/search 백엔드 핸들러 통합 테스트

ℹ tests 11 / suites 4 / pass 11 / fail 0
```

---

## 🔒 보안 및 개인정보 보호 지침

- **비밀 키 보호:** `OPENAI_API_KEY` 및 Supabase `service_role` 키는 프론트엔드 브라우저에 절대 노출되지 않으며, 서버리스 백엔드에서만 사용됩니다.
- **Git 보호:** `.env` 파일은 `.gitignore`에 등록되어 GitHub에 커밋되지 않습니다.
- **사용자 위치 정보:** 사용자가 직접 '내 위치 사용' 버튼을 클릭한 경우에만 일시적으로 거리 계산에 사용하며, 서버 DB나 로그에 위치 정보를 영구 저장하지 않습니다.

---

## 📄 라이선스

이 프로젝트는 교육 및 포트폴리오 목적으로 제작되었습니다.

