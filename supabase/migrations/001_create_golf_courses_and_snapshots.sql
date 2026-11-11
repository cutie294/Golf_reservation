-- ========================================================
-- 001_create_golf_courses_and_snapshots.sql
-- 설명: 골프장 기본 정보 테이블 및 날씨/가격/티타임 스냅샷 캐시 테이블 생성
-- 작성일: 2026-11-11
-- ========================================================

-- 1. uuid 확장 기능 활성화 (UUID 고유 식별자 생성을 위해 필요)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. golf_courses (골프장 기본 정보 테이블)
CREATE TABLE IF NOT EXISTS public.golf_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),         -- 골프장 고유 식별자 (PK)
    name TEXT NOT NULL,                                     -- 골프장 이름
    address TEXT NOT NULL,                                  -- 골프장 위치/주소
    latitude DOUBLE PRECISION,                              -- 위도 (-90 ~ 90)
    longitude DOUBLE PRECISION,                             -- 경도 (-180 ~ 180)
    phone TEXT,                                             -- 공개 연락처 (확인된 경우)
    website_url TEXT,                                       -- 공식 웹사이트 URL
    data_source TEXT NOT NULL DEFAULT 'manual_entry',       -- 데이터 출처
    is_active BOOLEAN NOT NULL DEFAULT true,                -- 서비스 노출 여부
    is_sample BOOLEAN NOT NULL DEFAULT false,               -- 데모용 샘플 데이터 여부
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- 생성 시각
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- 수정 시각

    -- 좌표 유효성 제약 조건
    CONSTRAINT chk_latitude CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    CONSTRAINT chk_longitude CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);

-- 검색 성능 향상을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_golf_courses_is_active ON public.golf_courses(is_active);

-- 3. course_data_snapshots (티타임 및 가격 스냅샷 캐시 테이블)
CREATE TABLE IF NOT EXISTS public.course_data_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),         -- 스냅샷 고유 식별자
    course_id UUID NOT NULL REFERENCES public.golf_courses(id) ON DELETE CASCADE, -- 골프장 외래키
    play_date DATE NOT NULL,                                -- 라운딩 희망 날짜
    price_amount INTEGER,                                   -- 금액 (원화, 0 이상)
    price_basis TEXT,                                       -- 금액 기준 (예: 1인 기준, 팀 기준)
    price_status TEXT NOT NULL DEFAULT 'unknown',           -- confirmed / indicative / unknown
    tee_times JSONB NOT NULL DEFAULT '[]'::jsonb,           -- 공급자가 반환한 실제 티타임 목록 (문자열 배열)
    availability TEXT NOT NULL DEFAULT 'unknown',           -- available / unavailable / unknown
    source TEXT NOT NULL DEFAULT 'unknown',                 -- 데이터 수집 출처
    checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- 조회 시각
    expires_at TIMESTAMPTZ,                                 -- 캐시 만료 시각

    -- 유효성 제약 조건
    CONSTRAINT chk_price_amount CHECK (price_amount IS NULL OR price_amount >= 0),
    CONSTRAINT chk_availability CHECK (availability IN ('available', 'unavailable', 'unknown')),
    CONSTRAINT chk_price_status CHECK (price_status IN ('confirmed', 'indicative', 'unknown'))
);

-- 스냅샷 빠른 조회를 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_course_data_snapshots_lookup 
ON public.course_data_snapshots(course_id, play_date, checked_at DESC);

-- 4. weather_snapshots (골프장별 일자별 날씨 스냅샷 캐시 테이블)
CREATE TABLE IF NOT EXISTS public.weather_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),         -- 날씨 스냅샷 식별자
    course_id UUID NOT NULL REFERENCES public.golf_courses(id) ON DELETE CASCADE, -- 골프장 외래키
    forecast_date DATE NOT NULL,                            -- 예보 대상 날짜
    summary TEXT,                                           -- 날씨 요약 (예: 맑음, 구름많음, 비 등)
    temperature_c NUMERIC(4, 1),                           -- 기온 (섭씨 ℃)
    precipitation_probability INTEGER,                     -- 강수확률 (0 ~ 100%)
    status TEXT NOT NULL DEFAULT 'available',               -- available / unavailable / out_of_range
    source TEXT NOT NULL DEFAULT 'kma_or_openweather',      -- 날씨 공급자
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()), -- 조회 시각
    expires_at TIMESTAMPTZ,                                 -- 캐시 만료 시각

    -- 강수확률은 0% 이상 100% 이하 또는 NULL만 허용
    CONSTRAINT chk_precipitation_probability CHECK (
        precipitation_probability IS NULL OR 
        (precipitation_probability >= 0 AND precipitation_probability <= 100)
    ),
    CONSTRAINT chk_weather_status CHECK (status IN ('available', 'unavailable', 'out_of_range'))
);

-- 날씨 캐시 조회를 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_weather_snapshots_lookup 
ON public.weather_snapshots(course_id, forecast_date, fetched_at DESC);

-- 5. Row Level Security (RLS) 보안 정책 설정
-- 공용 웹 서비스이므로 활성화된 골프장 정보는 누구나(익명 포함) 읽을 수 있도록 허용합니다.
-- 쓰기/수정/삭제 권한은 서비스 롤(service_role) 키를 통해서만 가능합니다.
ALTER TABLE public.golf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_data_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_snapshots ENABLE ROW LEVEL SECURITY;

-- 읽기 정책 (SELECT): 누구나 활성화된 골프장 조회 가능
CREATE POLICY "골프장 공개 조회 정책" 
ON public.golf_courses FOR SELECT 
TO public 
USING (is_active = true);

-- 스냅샷 읽기 정책: 누구나 확인 가능
CREATE POLICY "가격 및 티타임 스냅샷 공개 조회 정책" 
ON public.course_data_snapshots FOR SELECT 
TO public 
USING (true);

CREATE POLICY "날씨 스냅샷 공개 조회 정책" 
ON public.weather_snapshots FOR SELECT 
TO public 
USING (true);

