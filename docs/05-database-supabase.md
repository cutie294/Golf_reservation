# 05. 데이터베이스 및 Supabase 지침

## 1. DB 사용 목적
골프장 기본 정보, 데이터 출처, 검색 결과 캐시(필요한 경우)를 저장한다. 외부 공급자의 실시간 예약 데이터를 직접 확보하지 못하는 경우 DB에 임의의 티타임을 채우지 않는다.

## 2. 권장 테이블
### `golf_courses`
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | 골프장 고유 ID |
| name | text | 골프장명 |
| address | text | 주소 |
| latitude | double precision nullable | 위도 |
| longitude | double precision nullable | 경도 |
| phone | text nullable | 공개 연락처(확인된 경우) |
| website_url | text nullable | 공식 웹사이트(확인된 경우) |
| data_source | text | 데이터 출처 |
| is_active | boolean | 노출 여부 |
| created_at / updated_at | timestamptz | 생성·수정 시각 |

### `course_data_snapshots` (선택)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | 스냅샷 ID |
| course_id | uuid FK | 골프장 ID |
| play_date | date | 라운딩 날짜 |
| price_amount | integer nullable | 금액(원) |
| price_basis | text nullable | 1인/팀 등 기준 |
| tee_times | jsonb | 공급자가 반환한 티타임만 저장 |
| availability | text | available/unavailable/unknown |
| source | text | 데이터 출처 |
| checked_at | timestamptz nullable | 조회 시각 |
| expires_at | timestamptz nullable | 캐시 만료 시각 |

### `weather_snapshots` (선택)
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid PK | 스냅샷 ID |
| course_id | uuid FK | 골프장 ID |
| forecast_date | date | 예보 날짜 |
| summary | text nullable | 날씨 요약 |
| temperature_c | numeric nullable | 기온 |
| precipitation_probability | integer nullable | 강수확률 0~100 |
| source | text | 공급자 |
| fetched_at | timestamptz | 조회 시각 |
| expires_at | timestamptz nullable | 캐시 만료 시각 |

실시간 정보가 짧게 유효하므로 캐시 만료 정책을 정하고, 만료된 데이터를 현재 정보처럼 표시하지 않는다. 캐시를 사용하면 UI에 조회 시각을 표시한다.

## 3. 인덱스와 제약
- `golf_courses(is_active)` 인덱스.
- `course_data_snapshots(course_id, play_date, checked_at desc)` 인덱스.
- `weather_snapshots(course_id, forecast_date, fetched_at desc)` 인덱스.
- 강수확률은 null 또는 0~100만 허용하는 CHECK 제약.
- availability는 허용된 값만 저장.
- 금액은 음수가 될 수 없도록 제약.
- 좌표 범위 제약 적용.

## 4. 보안
- 브라우저에는 Supabase anon/public 키만 노출 가능하며, RLS 정책을 반드시 적용한다.
- `service_role` 키는 서버 환경변수에서만 사용한다.
- 공개 골프장 읽기 정책은 필요한 컬럼/행만 허용한다.
- 캐시 쓰기는 서버에서만 수행한다.
- 사용자 계정 기능이 범위에 없으므로 불필요한 개인정보 테이블을 만들지 않는다.

## 5. 환경변수
`.env.example`에는 이름만 작성하고 실제 값은 넣지 않는다.
```dotenv
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
WEATHER_API_KEY=
COURSE_DATA_API_KEY=
```
실제로 연결하지 않는 공급자의 키는 비워 둔다. `COURSE_DATA_API_KEY`는 실제 공급자가 결정된 후 이름과 구현을 확정한다.

## 6. 마이그레이션 및 검증
- SQL 변경은 `supabase/migrations/`에 버전 파일로 관리한다.
- 개발/운영 프로젝트를 분리한다.
- 샘플 레코드는 `is_sample` 또는 별도 seed 파일로 구분한다.
- RLS 활성화 여부와 익명 접근 권한을 테스트한다.
- 서비스 키가 클라이언트 번들에 포함되지 않았는지 빌드 결과를 확인한다.
