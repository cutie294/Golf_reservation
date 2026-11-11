/**
 * public/js/api.js
 * 설명: 백엔드 검색 API(POST /api/search)와 통신하는 프론트엔드 네트워크 모듈
 */

/**
 * 백엔드 서버에 골프장 및 날씨 검색을 요청합니다.
 * 
 * @param {object} params
 * @param {string} params.date 라운딩 희망 날짜 (YYYY-MM-DD)
 * @param {object|null} params.origin 사용자 출발 위치 ({ address, latitude, longitude })
 * @returns {Promise<object>} 서버 검색 응답 데이터
 */
export async function searchGolfCourses({ date, origin }) {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: date,
        origin: origin
      })
    });

    const data = await response.json();

    // 서버가 200 OK가 아닌 오류(400, 500 등)를 반환한 경우 처리
    if (!response.ok) {
      const errorMessage = data?.error?.message || '검색 요청 처리 중 오류가 발생했습니다.';
      throw new Error(errorMessage);
    }

    return data;

  } catch (error) {
    console.error('[API 통신 오류]:', error);
    throw error;
  }
}

