-- ========================================================
-- 002_seed_sample_courses.sql
-- 설명: 테스트 및 데모용 샘플 골프장 초기 데이터 등록
-- 주의: is_sample 컬럼을 true로 지정하여 데모 데이터임을 명확히 구분합니다.
-- ========================================================

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

