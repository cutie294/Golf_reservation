/**
 * recommendationService.js
 * 설명: 거리와 날씨 데이터를 기반으로 상위 골프장을 선정하고, OpenAI를 통해 추천 사유를 요약하는 서비스 모듈
 * 
 * [초보자를 위한 가이드]
 * 1. 신뢰성 원칙: 추천 후보 선정과 점수 계산은 인공지능이 아닌 '서버의 명확한 수학적 규칙'으로 먼저 결정합니다.
 * 2. AI의 역할: OpenAI는 서버가 선정한 TOP 3 골프장의 실제 조건(거리, 강수확률 등)을 읽고,
 *    사람이 읽기 편한 친절한 1~2문장의 추천 사유 문장을 작성해 주는 역할만 수행합니다.
 * 3. 안전망(Fallback): 만약 OpenAI 키가 없거나 호출 오류가 발생해도, 템플릿 기반의 깔끔한 설명으로
 *    서비스가 중단 없이 완벽하게 작동합니다.
 */

/**
 * 골프장 목록과 날씨, 거리 정보를 종합하여 최대 3곳의 추천 골프장을 선정하고 추천 사유를 생성합니다.
 * 
 * @param {object} params
 * @param {Array} params.coursesWithData 골프장 정보 + 날씨 + 티타임이 결합된 배열
 * @param {boolean} params.hasOrigin 사용자가 출발 위치를 입력했는지 여부
 * @returns {Promise<Array>} 추천 골프장 배열 (최대 3개)
 */
export async function getTopRecommendations({ coursesWithData, hasOrigin }) {
  if (!coursesWithData || coursesWithData.length === 0) {
    return [];
  }

  // 1. 각 골프장별 규칙 기반 점수 계산
  const scoredCourses = coursesWithData.map(item => {
    let distanceScore = 50; // 기본 점수
    let weatherScore = 50;  // 기본 점수
    const criteriaUsed = [];

    // [거리 점수 계산]: 거리가 가까울수록 높은 점수 부여 (0km ~ 150km 기준)
    if (hasOrigin && item.distance && typeof item.distance.distanceKm === 'number') {
      const d = item.distance.distanceKm;
      // 20km 이내면 50점 만점, 120km 이상이면 최소 10점
      distanceScore = Math.max(10, Math.min(50, Math.round(50 - (d * 0.35))));
      criteriaUsed.push(`직선거리 ${d}km 반영`);
    }

    // [날씨 점수 계산]: 강수확률이 낮고 날씨가 맑을수록 높은 점수 부여
    if (item.weather && item.weather.status === 'available') {
      const rainProb = item.weather.precipitationProbability;
      if (typeof rainProb === 'number') {
        // 강수확률 0%면 50점 만점, 100%면 5점
        weatherScore = Math.max(5, Math.round(50 - (rainProb * 0.45)));
        criteriaUsed.push(`강수확률 ${rainProb}% 반영`);
      } else {
        weatherScore = 35; // 강수확률 미제공 시 중립 점수
      }
    }

    // 출발 위치가 없을 때 가중치 재정규화 (날씨 비중 100%)
    let totalScore = 0;
    if (hasOrigin) {
      totalScore = distanceScore + weatherScore;
    } else {
      totalScore = weatherScore * 2; // 날씨 100%
      criteriaUsed.push('거리 미입력 (날씨 우선 평가)');
    }

    return {
      ...item,
      score: totalScore,
      criteriaUsed: criteriaUsed
    };
  });

  // 2. 점수 높은 순으로 정렬 후 상위 최대 3개 선정 (PRD 규칙: 3개 미만이면 존재하는 만큼만)
  scoredCourses.sort((a, b) => b.score - a.score);
  const topCandidates = scoredCourses.slice(0, 3);

  // 3. OpenAI를 이용한 자연어 추천 사유 생성 (실패 시 템플릿 사유 자동 적용)
  const recommendationsWithAiReasons = await generateAiRecommendationsReasons(topCandidates, hasOrigin);

  return recommendationsWithAiReasons;
}

/**
 * OpenAI API를 호출하여 추천 사유를 생성하거나, 템플릿 기반 사유를 생성합니다.
 */
async function generateAiRecommendationsReasons(candidates, hasOrigin) {
  const apiKey = process.env.OPENAI_API_KEY;

  // OpenAI 키가 없거나 플레이스홀더인 경우 기본 템플릿 사유 즉시 생성
  if (!apiKey || apiKey.includes('your_openai')) {
    return candidates.map((item, index) => ({
      rank: index + 1,
      courseId: item.course.id,
      courseName: item.course.name,
      distance: item.distance,
      weather: item.weather,
      price: item.price,
      recommendationReason: generateTemplateReason(item, hasOrigin, index + 1)
    }));
  }

  try {
    // OpenAI 프롬프트 구성 (사실 데이터만 전달하고 요약 요청)
    const promptData = candidates.map((c, i) => ({
      rank: i + 1,
      name: c.course.name,
      distance: c.distance?.formatted || '거리 정보 없음',
      weatherSummary: c.weather?.summary || '정보 없음',
      rainProbability: c.weather?.precipitationProbability !== null ? `${c.weather.precipitationProbability}%` : '정보 없음',
      temp: c.weather?.temperatureC !== null ? `${c.weather.temperatureC}℃` : '정보 없음'
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 친절한 골프 코스 추천 비서입니다. 
제공된 골프장의 사실 데이터(거리, 날씨, 강수확률)만을 바탕으로 각 골프장별 추천 사유를 1~2문장(60자~80자 내외)의 자연스러운 한국어로 작성해 주세요.
수치를 임의로 지어내거나 변경하지 마시고, 누락된 수치는 언급하지 마세요.
반드시 아래와 같은 JSON 배열 형식으로만 응답하세요:
[{"rank": 1, "reason": "추천 사유 문장..."}, {"rank": 2, "reason": "..."}]`
          },
          {
            role: 'user',
            content: JSON.stringify(promptData)
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      console.warn('[OpenAI API 응답 실패]: HTTP', response.status);
      return fallbackToTemplateReasons(candidates, hasOrigin);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content?.trim();

    // JSON 파싱 (코드 블록 방어)
    const cleanJson = content.replace(/^```json\s*|```$/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return candidates.map((item, index) => {
      const aiItem = Array.isArray(parsed) ? parsed.find(p => p.rank === index + 1) : null;
      return {
        rank: index + 1,
        courseId: item.course.id,
        courseName: item.course.name,
        distance: item.distance,
        weather: item.weather,
        price: item.price,
        recommendationReason: aiItem?.reason || generateTemplateReason(item, hasOrigin, index + 1)
      };
    });

  } catch (err) {
    console.error('[OpenAI 호출/파싱 중 예외]:', err.message);
    return fallbackToTemplateReasons(candidates, hasOrigin);
  }
}

/**
 * OpenAI 키가 없거나 실패했을 때 사용하는 안전한 한글 템플릿 추천 사유 생성 함수
 */
function generateTemplateReason(item, hasOrigin, rank) {
  const parts = [];

  // 날씨 평가
  if (item.weather && item.weather.status === 'available') {
    const rain = item.weather.precipitationProbability;
    if (rain !== null && rain <= 20) {
      parts.push(`강수확률이 ${rain}%로 쾌적하고 맑은 라운딩이 예상됩니다.`);
    } else if (rain !== null && rain <= 40) {
      parts.push(`비 예보 가능성이 ${rain}%로 비교적 무난한 기상 조건입니다.`);
    } else if (item.weather.summary) {
      parts.push(`${item.weather.summary} 날씨 예보를 보입니다.`);
    }
  }

  // 거리 평가
  if (hasOrigin && item.distance && item.distance.distanceKm) {
    parts.push(`출발지에서 ${item.distance.formatted} 거리에 위치하여 이동 접근성이 좋습니다.`);
  } else if (!hasOrigin) {
    parts.push(`날씨 및 코스 조건을 종합 평가하여 ${rank}위로 추천되었습니다.`);
  }

  return parts.length > 0 ? parts.join(' ') : '라운딩 조건과 코스 환경이 우수하여 추천드립니다.';
}

function fallbackToTemplateReasons(candidates, hasOrigin) {
  return candidates.map((item, index) => ({
    rank: index + 1,
    courseId: item.course.id,
    courseName: item.course.name,
    distance: item.distance,
    weather: item.weather,
    price: item.price,
    recommendationReason: generateTemplateReason(item, hasOrigin, index + 1)
  }));
}

