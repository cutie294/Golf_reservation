/**
 * api/search.js
 * 설명: 라운딩 희망 날짜와 출발 위치를 받아 골프장 목록, 날씨, 티타임 및 AI 추천 결과를 반환하는 Vercel 서버리스 함수
 * 
 * [초보자를 위한 가이드]
 * - 프론트엔드 브라우저는 이 API 엔드포인트(POST /api/search)로만 통신합니다.
 * - 데이터베이스(Supabase), 날씨 공급자, OpenAI 호출 등 모든 민감한 로직은
 *   이 서버 함수 내부에서만 실행되므로 외부로 비밀 키가 절대 노출되지 않습니다.
 */

import { validateDate, validateOrigin } from './_lib/validation.js';
import { getActiveGolfCourses } from './_lib/repositories/golfCourseRepository.js';
import { getWeather } from './_lib/providers/weatherProvider.js';
import { getCourseDataSnapshot } from './_lib/providers/courseDataProvider.js';
import { calculateStraightDistance } from './_lib/services/distanceService.js';
import { getTopRecommendations } from './_lib/services/recommendationService.js';

export default async function handler(req, res) {
  // 1. HTTP 메서드 확인 (POST 요청만 허용)
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'POST 요청만 지원합니다.'
      }
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { date, origin } = body;

    // 2. 날짜 유효성 검증
    const dateValidation = validateDate(date);
    if (!dateValidation.isValid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE',
          message: dateValidation.error
        }
      });
    }

    // 3. 출발지 위치 좌표 유효성 검증 (선택 항목)
    const originValidation = validateOrigin(origin);
    if (!originValidation.isValid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ORIGIN',
          message: originValidation.error
        }
      });
    }

    const parsedOrigin = originValidation.parsedOrigin;
    const hasOrigin = Boolean(parsedOrigin && parsedOrigin.latitude !== null && parsedOrigin.longitude !== null);

    // 4. 활성화된 골프장 목록 조회 (Supabase 또는 Fallback)
    const { courses, source: dbSource, isFallback } = await getActiveGolfCourses();

    if (!courses || courses.length === 0) {
      return res.status(200).json({
        date: date,
        courses: [],
        recommendations: [],
        meta: {
          isSample: isFallback,
          checkedAt: new Date().toISOString(),
          hasOrigin: hasOrigin,
          partialErrors: []
        }
      });
    }

    const partialErrors = [];

    // 5. 각 골프장별 날씨, 티타임, 거리 정보를 병렬(Promise.all)로 조회
    const courseDetailsPromises = courses.map(async (course) => {
      // 5-1. 거리 계산
      const distance = calculateStraightDistance(parsedOrigin, {
        latitude: course.latitude,
        longitude: course.longitude
      });

      // 5-2. 날씨 정보 조회
      let weather = {
        status: 'unavailable',
        summary: null,
        temperatureC: null,
        precipitationProbability: null,
        source: '날씨 조회 불가'
      };

      try {
        if (course.latitude && course.longitude) {
          weather = await getWeather({
            latitude: course.latitude,
            longitude: course.longitude,
            date: date
          });
        }
      } catch (err) {
        console.warn(`[날씨 조회 실패 - ${course.name}]:`, err.message);
        partialErrors.push(`${course.name}의 날씨 정보를 조회하지 못했습니다.`);
      }

      // 5-3. 티타임 및 가격 스냅샷 조회
      let courseData = {
        price: { amount: null, currency: 'KRW', basis: null, status: 'unknown' },
        teeTimes: [],
        availability: 'unknown',
        source: '예약 데이터 없음',
        isSample: true,
        checkedAt: null
      };

      try {
        courseData = await getCourseDataSnapshot({
          courseId: course.id,
          courseName: course.name,
          date: date
        });
      } catch (err) {
        console.warn(`[티타임 조회 실패 - ${course.name}]:`, err.message);
        partialErrors.push(`${course.name}의 예약 정보를 조회하지 못했습니다.`);
      }

      return {
        course: course,
        price: courseData.price,
        teeTimes: courseData.teeTimes,
        availability: courseData.availability,
        weather: weather,
        distance: distance,
        checkedAt: courseData.checkedAt || new Date().toISOString()
      };
    });

    const coursesWithData = await Promise.all(courseDetailsPromises);

    // 6. 추천 골프장 산출 (규칙 기반 TOP 3 선정 + OpenAI 요약 사유)
    const recommendations = await getTopRecommendations({
      coursesWithData: coursesWithData,
      hasOrigin: hasOrigin
    });

    // 7. 표준 응답 반환
    return res.status(200).json({
      date: date,
      courses: coursesWithData,
      recommendations: recommendations,
      meta: {
        isSample: isFallback || coursesWithData.some(c => c.course.is_sample),
        checkedAt: new Date().toISOString(),
        hasOrigin: hasOrigin,
        originAddress: parsedOrigin?.address || null,
        partialErrors: Array.from(new Set(partialErrors))
      }
    });

  } catch (error) {
    console.error('[서버 내부 오류]:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버 내부에서 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      }
    });
  }
}

