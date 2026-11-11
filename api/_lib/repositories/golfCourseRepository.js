/**
 * golfCourseRepository.js
 * 설명: Supabase 데이터베이스와 통신하여 골프장 기본 정보를 조회하는 저장소(Repository) 모듈
 * 
 * [초보자를 위한 가이드]
 * - 데이터베이스 연결 작업은 항상 예외(오류)가 발생할 수 있습니다.
 * - Supabase 연결 정보가 올바르게 설정되어 있으면 데이터베이스의 실제 테이블에서 골프장을 조회하고,
 *   만약 키가 아직 등록되지 않았거나 일시적 오류가 발생하면 서비스가 멈추지 않도록
 *   안전한 기본 데모 골프장 목록을 대신 제공(Fallback)합니다.
 */

import { createClient } from '@supabase/supabase-js';

// 기본 데모 골프장 데이터 (Supabase 연결 불가 또는 초기 시연 시 안전망 역할)
const FALLBACK_COURSES = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: '남여주 골프클럽 (샘플)',
    address: '경기도 여주시 가남읍 여주남로 752',
    latitude: 37.2185,
    longitude: 127.5954,
    phone: '031-880-6700',
    website_url: 'https://www.namyeoju.co.kr',
    data_source: 'fallback_seed',
    is_sample: true
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    name: '스카이72 CC (샘플)',
    address: '인천광역시 중구 공항동로 135',
    latitude: 37.4916,
    longitude: 126.4988,
    phone: '1661-7272',
    website_url: 'https://www.sky72.com',
    data_source: 'fallback_seed',
    is_sample: true
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    name: '레이크사이드 CC (샘플)',
    address: '경기도 용인시 처인구 모현읍 능원로 181',
    latitude: 37.3324,
    longitude: 127.1852,
    phone: '031-334-2111',
    website_url: 'https://www.lakeside.kr',
    data_source: 'fallback_seed',
    is_sample: true
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    name: '안양 베네스트 GC (샘플)',
    address: '경기도 군포시 군포로 364',
    latitude: 37.3541,
    longitude: 126.9458,
    phone: '031-460-3301',
    website_url: 'https://www.golfsamsung.com',
    data_source: 'fallback_seed',
    is_sample: true
  },
  {
    id: 'a5555555-5555-5555-5555-555555555555',
    name: '해운대 CC (샘플)',
    address: '부산광역시 기장군 정관읍 두명서로 86',
    latitude: 35.3402,
    longitude: 129.1764,
    phone: '051-726-8000',
    website_url: 'https://www.haeundaecc.co.kr',
    data_source: 'fallback_seed',
    is_sample: true
  }
];

/**
 * Supabase 클라이언트를 생성합니다.
 * 보안 원칙: 서버에서는 SUPABASE_SERVICE_ROLE_KEY를 우선 사용하고, 없을 경우 SUPABASE_ANON_KEY를 사용합니다.
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase')) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.error('[Supabase 클라이언트 생성 실패]:', err.message);
    return null;
  }
}

/**
 * 활성화된(is_active = true) 골프장 목록을 데이터베이스에서 조회합니다.
 * @returns {Promise<{ courses: Array, source: string, isFallback: boolean }>}
 */
export async function getActiveGolfCourses() {
  const supabase = getSupabaseClient();

  // Supabase 설정이 없거나 올바르지 않은 경우 기본 데모 데이터 반환
  if (!supabase) {
    return {
      courses: FALLBACK_COURSES,
      source: '로컬 안전망 데모 데이터 (Supabase 미연결 상태)',
      isFallback: true
    };
  }

  try {
    const { data, error } = await supabase
      .from('golf_courses')
      .select('id, name, address, latitude, longitude, phone, website_url, data_source, is_sample')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Supabase 테이블 조회 경고]:', error.message);
      // 테이블이 아직 없거나 쿼리 실패 시 사용자 서비스 중단을 막기 위해 데모 데이터 반환
      return {
        courses: FALLBACK_COURSES,
        source: '로컬 안전망 데모 데이터 (DB 쿼리 예외 발생)',
        isFallback: true
      };
    }

    if (!data || data.length === 0) {
      return {
        courses: FALLBACK_COURSES,
        source: '로컬 안전망 데모 데이터 (DB 데이터 비어있음)',
        isFallback: true
      };
    }

    // Supabase에서 정상 조회된 경우
    const formatted = data.map(course => ({
      id: course.id,
      name: course.name,
      address: course.address,
      latitude: course.latitude,
      longitude: course.longitude,
      phone: course.phone,
      website_url: course.website_url,
      data_source: course.data_source || 'supabase',
      is_sample: Boolean(course.is_sample)
    }));

    return {
      courses: formatted,
      source: 'Supabase PostgreSQL DB',
      isFallback: false
    };

  } catch (err) {
    console.error('[Supabase 조회 중 예외 발생]:', err.message);
    return {
      courses: FALLBACK_COURSES,
      source: '로컬 안전망 데모 데이터 (통신 장애)',
      isFallback: true
    };
  }
}

