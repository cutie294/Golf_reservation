-- ========================================================
-- [티업스팟] 000_init_database_all_in_one.sql
-- 목적: Supabase 데이터베이스 초기화 및 테이블/보안/샘플 데이터 일괄 생성
-- 사용법: Supabase 대시보드 -> SQL Editor에 전체 복사 후 [RUN] 클릭
-- ========================================================

-- [1단계] UUID 고유 식별자 생성을 위한 확장 도구 활성화
-- 설명: 각 골프장과 데이터마다 중복되지 않는 고유 ID(예: 123e4567-e89b-12d3-a456-426614174000)를 자동 생성해 줍니다.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- [2단계] golf_courses (골프장 기본 정보 테이블 생성)
-- 설명: 전국 골프장의 이름, 주소, 위치(위도/경도), 전화번호, 홈페이지 등을 안전하게 보관합니다.
CREATE TABLE IF NOT EXISTS public.golf_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),                       -- 골프장 고유 번호 (PK)
    name TEXT NOT NULL,                                                   -- 골프장 이름 (예: 남여주 골프클럽)
    address TEXT NOT NULL,                                                -- 골프장 도로명/지번 주소
    latitude DOUBLE PRECISION,                                            -- 위도 (-90 ~ 90, 거리 계산용)
    longitude DOUBLE PRECISION,                                           -- 경도 (-180 ~ 180, 거리 계산용)
    phone TEXT,                                                           -- 공개 대표 전화번호
    website_url TEXT,                                                     -- 공식 홈페이지 웹사이트 링크
    data_source TEXT NOT NULL DEFAULT 'manual_entry',                     -- 데이터 출처
    is_active BOOLEAN NOT NULL DEFAULT true,                              -- 화면 노출 여부 (true: 노출, false: 숨김)
    is_sample BOOLEAN NOT NULL DEFAULT false,                             -- 데모/테스트용 샘플 데이터 여부
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- 생성 시각
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- 수정 시각

    -- 좌표 데이터가 올바른 지구 좌표계 범위 내에 있는지 안전하게 검사하는 제약조건
    CONSTRAINT chk_latitude CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    CONSTRAINT chk_longitude CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);

-- 골프장 목록 검색 속도를 빠르게 하기 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_golf_courses_is_active ON public.golf_courses(is_active);


-- [3단계] course_data_snapshots (티타임 및 가격 스냅샷 캐시 테이블)
-- 설명: 특정 날짜별 예약 가능 티타임, 요금(그린피) 정보 등을 임시 보관하여 외부 API 부하를 줄입니다.
CREATE TABLE IF NOT EXISTS public.course_data_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),                       -- 스냅샷 고유 번호
    course_id UUID NOT NULL REFERENCES public.golf_courses(id) ON DELETE CASCADE, -- 해당 골프장 외래키(연결고리)
    play_date DATE NOT NULL,                                              -- 라운딩 희망 날짜 (YYYY-MM-DD)
    price_amount INTEGER,                                                 -- 그린피 금액 (원화, 0원 이상)
    price_basis TEXT,                                                     -- 금액 기준 (예: 1인 기준, 팀 기준)
    price_status TEXT NOT NULL DEFAULT 'unknown',                         -- 요금 확인 상태 (confirmed/indicative/unknown)
    tee_times JSONB NOT NULL DEFAULT '[]'::jsonb,                         -- 확인된 티타임 목록 (예: ["07:15", "07:58"])
    availability TEXT NOT NULL DEFAULT 'unknown',                         -- 예약 가능 여부 (available/unavailable/unknown)
    source TEXT NOT NULL DEFAULT 'unknown',                               -- 데이터 제공 출처
    checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- 조회 시각
    expires_at TIMESTAMPTZ,                                               -- 캐시 유효 만료 시각

    -- 데이터 무결성 검증 제약 조건
    CONSTRAINT chk_price_amount CHECK (price_amount IS NULL OR price_amount >= 0),
    CONSTRAINT chk_availability CHECK (availability IN ('available', 'unavailable', 'unknown')),
    CONSTRAINT chk_price_status CHECK (price_status IN ('confirmed', 'indicative', 'unknown'))
);

-- 특정 날짜와 골프장의 스냅샷을 빠르게 찾기 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_course_data_snapshots_lookup 
ON public.course_data_snapshots(course_id, play_date, checked_at DESC);


-- [4단계] weather_snapshots (골프장 위치별 날씨 예보 캐시 테이블)
-- 설명: 각 골프장의 특정 날짜 날씨 상태(맑음, 비 등), 기온, 강수확률을 보관합니다.
CREATE TABLE IF NOT EXISTS public.weather_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),                       -- 날씨 스냅샷 번호
    course_id UUID NOT NULL REFERENCES public.golf_courses(id) ON DELETE CASCADE, -- 해당 골프장 외래키
    forecast_date DATE NOT NULL,                                          -- 날씨 예보 대상 날짜
    summary TEXT,                                                         -- 날씨 요약 (맑음, 구름많음, 비 등)
    temperature_c NUMERIC(4, 1),                                         -- 기온 (섭씨 ℃, 예: 15.5)
    precipitation_probability INTEGER,                                   -- 강수확률 (0% ~ 100%)
    status TEXT NOT NULL DEFAULT 'available',                             -- 상태 (available/unavailable/out_of_range)
    source TEXT NOT NULL DEFAULT 'weather_service',                       -- 날씨 데이터 출처
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- 수집 시각
    expires_at TIMESTAMPTZ,                                               -- 만료 시각

    -- 강수확률 범위(0~100) 및 상태 검증 제약 조건
    CONSTRAINT chk_precipitation_probability CHECK (
        precipitation_probability IS NULL OR 
        (precipitation_probability >= 0 AND precipitation_probability <= 100)
    ),
    CONSTRAINT chk_weather_status CHECK (status IN ('available', 'unavailable', 'out_of_range'))
);

-- 날씨 빠른 조회를 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_weather_snapshots_lookup 
ON public.weather_snapshots(course_id, forecast_date, fetched_at DESC);


-- [5단계] Row Level Security (RLS) 보안 정책 활성화
-- 보안 원칙: 외부 사용자는 활성화된 골프장 정보만 안전하게 '조회(SELECT)'만 할 수 있도록 제한합니다.
-- 데이터를 등록하거나 수정, 삭제하는 작업은 오직 서버의 비밀키(service_role)로만 허용됩니다.
ALTER TABLE public.golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_data_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_snapshots ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있다면 충돌 방지를 위해 삭제 후 재생성
DROP POLICY IF EXISTS "골프장 공개 조회 정책" ON public.golf_courses;
DROP POLICY IF EXISTS "가격 및 티타임 스냅샷 공개 조회 정책" ON public.course_data_snapshots;
DROP POLICY IF EXISTS "날씨 스냅샷 공개 조회 정책" ON public.weather_snapshots;

-- 공개 읽기(SELECT) 허용 정책 부여
CREATE POLICY "골프장 공개 조회 정책" 
ON public.golf_courses FOR SELECT 
TO public 
USING (is_active = true);

CREATE POLICY "가격 및 티타임 스냅샷 공개 조회 정책" 
ON public.course_data_snapshots FOR SELECT 
TO public 
USING (true);

CREATE POLICY "날씨 스냅샷 공개 조회 정책" 
ON public.weather_snapshots FOR SELECT 
TO public 
USING (true);


-- [6단계] 테스트 및 즉시 시연이 가능한 초기 샘플 골프장 5곳 등록
-- 설명: 수도권 및 주요 지역의 실제 골프장 명칭과 정확한 GPS 좌표를 등록합니다.
-- 주의: PRD 규정에 따라 'is_sample = true'로 설정하여 데모용 데이터임을 명확히 구분합니다.
INSERT INTO public.golf_courses (id, name, address, latitude, longitude, phone, website_url, data_source, is_active, is_sample)
VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    '남여주 골프클럽 (샘플)',
    '경기도 여주시 가남읍 여주남로 752',
    37.2185,
    127.5954,
    '031-880-6700',
    'https://www.namyeoju.co.kr',
    'sample_seed',
    true,
    true
),
(
    'a2222222-2222-2222-2222-222222222222',
    '스카이72 CC (샘플)',
    '인천광역시 중구 공항동로 135',
    37.4916,
    126.4988,
    '1661-7272',
    'https://www.sky72.com',
    'sample_seed',
    true,
    true
),
(
    'a3333333-3333-3333-3333-333333333333',
    '레이크사이드 CC (샘플)',
    '경기도 용인시 처인구 모현읍 능원로 181',
    37.3324,
    127.1852,
    '031-334-2111',
    'https://www.lakeside.kr',
    'sample_seed',
    true,
    true
),
(
    'a4444444-4444-4444-4444-444444444444',
    '안양 베네스트 GC (샘플)',
    '경기도 군포시 군포로 364',
    37.3541,
    126.9458,
    '031-460-3301',
    'https://www.golfsamsung.com',
    'sample_seed',
    true,
    true
),
(
    'a5555555-5555-5555-5555-555555555555',
    '해운대 CC (샘플)',
    '부산광역시 기장군 정관읍 두명서로 86',
    35.3402,
    129.1764,
    '051-726-8000',
    'https://www.haeundaecc.co.kr',
    'sample_seed',
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

