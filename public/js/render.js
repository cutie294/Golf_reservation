/**
 * public/js/render.js
 * 설명: 서버에서 전달받은 검색 결과를 안전하게 화면(DOM)에 그려주는 렌더링 모듈
 * 
 * [초보자를 위한 가이드]
 * - 보안 원칙(XSS 방지): 사용자의 입력이나 서버의 데이터를 innerHTML로 직접 합치지 않고,
 *   document.createElement()와 textContent를 사용하여 안전하게 브라우저에 표시합니다.
 */

/**
 * 금액을 한국 원화(KRW) 형식의 문자열로 변환합니다. (예: 180000 -> "180,000원")
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '정보 없음';
  }
  return `${Number(amount).toLocaleString('ko-KR')}원`;
}

/**
 * AI 맞춤 추천 골프장 카드 목록을 렌더링합니다.
 * 
 * @param {HTMLElement} container 추천 카드가 삽입될 부모 엘리먼트
 * @param {Array} recommendations 추천 데이터 배열 (최대 3개)
 */
export function renderRecommendations(container, recommendations) {
  container.innerHTML = '';

  if (!recommendations || recommendations.length === 0) {
    return;
  }

  recommendations.forEach(item => {
    const card = document.createElement('article');
    card.className = 'rec-card';

    // 상단 (순위 뱃지 + 거리)
    const topRow = document.createElement('div');
    topRow.className = 'rec-card-top';

    const rankBadge = document.createElement('span');
    rankBadge.className = 'rec-rank-badge';
    rankBadge.textContent = `TOP ${item.rank}`;

    topRow.appendChild(rankBadge);

    if (item.distance && item.distance.formatted) {
      const distBadge = document.createElement('span');
      distBadge.className = 'rec-distance-badge';
      distBadge.textContent = item.distance.formatted;
      topRow.appendChild(distBadge);
    }

    card.appendChild(topRow);

    // 골프장 이름
    const courseName = document.createElement('h3');
    courseName.className = 'rec-course-name';
    courseName.textContent = item.courseName;
    card.appendChild(courseName);

    // AI 맞춤 추천 사유 박스
    const reasonBox = document.createElement('div');
    reasonBox.className = 'rec-reason-box';
    reasonBox.textContent = `💡 ${item.recommendationReason}`;
    card.appendChild(reasonBox);

    // 하단 주요 정보 요약 태그
    const metricsRow = document.createElement('div');
    metricsRow.className = 'rec-metrics';

    // 날씨 요약 태그
    if (item.weather && item.weather.status === 'available') {
      const weatherTag = document.createElement('span');
      weatherTag.className = 'metric-item';
      const rainText = item.weather.precipitationProbability !== null 
        ? `강수확률 ${item.weather.precipitationProbability}%` 
        : '강수확률 —';
      weatherTag.textContent = `🌤️ ${item.weather.summary || ''} (${rainText})`;
      metricsRow.appendChild(weatherTag);
    }

    // 가격 요약 태그
    if (item.price && item.price.amount) {
      const priceTag = document.createElement('span');
      priceTag.className = 'metric-item';
      priceTag.textContent = `💵 ${formatCurrency(item.price.amount)}`;
      metricsRow.appendChild(priceTag);
    }

    card.appendChild(metricsRow);
    container.appendChild(card);
  });
}

/**
 * 전체 골프장 목록 상세 카드를 렌더링합니다.
 * 
 * @param {HTMLElement} container 결과 카드가 삽입될 부모 엘리먼트
 * @param {Array} coursesWithData 전체 골프장 데이터 배열
 * @param {Function} onBookClick '예약하기' 버튼 클릭 시 실행할 콜백 함수
 */
export function renderCourseList(container, coursesWithData, onBookClick) {
  container.innerHTML = '';

  if (!coursesWithData || coursesWithData.length === 0) {
    return;
  }

  coursesWithData.forEach(item => {
    const card = document.createElement('article');
    card.className = 'course-card';

    // 1. 카드 헤더 (골프장 이름, 샘플 뱃지, 주소)
    const cardHeader = document.createElement('div');
    cardHeader.className = 'course-card-header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'course-title-wrap';

    const name = document.createElement('h3');
    name.className = 'course-name';
    name.textContent = item.course.name;
    titleWrap.appendChild(name);

    if (item.course.is_sample) {
      const sampleBadge = document.createElement('span');
      sampleBadge.className = 'sample-badge';
      sampleBadge.textContent = '샘플 데이터';
      titleWrap.appendChild(sampleBadge);
    }

    cardHeader.appendChild(titleWrap);

    const address = document.createElement('p');
    address.className = 'course-address';
    address.textContent = `📍 ${item.course.address}`;
    cardHeader.appendChild(address);

    card.appendChild(cardHeader);

    // 2. 카드 내부 그리드 (가격, 티타임, 날씨)
    const infoGrid = document.createElement('div');
    infoGrid.className = 'course-info-grid';

    // 2-A. 가격 정보 블록
    const priceBlock = document.createElement('div');
    priceBlock.className = 'info-block';
    
    const priceLabel = document.createElement('span');
    priceLabel.className = 'info-label';
    priceLabel.textContent = '그린피 (요금)';
    priceBlock.appendChild(priceLabel);

    if (item.price && item.price.amount) {
      const priceVal = document.createElement('span');
      priceVal.className = 'price-value';
      priceVal.textContent = formatCurrency(item.price.amount);
      priceBlock.appendChild(priceVal);

      if (item.price.basis) {
        const basis = document.createElement('span');
        basis.className = 'price-basis';
        basis.textContent = item.price.basis;
        priceBlock.appendChild(basis);
      }
    } else {
      const emptyPrice = document.createElement('span');
      emptyPrice.className = 'empty-value';
      emptyPrice.textContent = '요금 정보 없음';
      priceBlock.appendChild(emptyPrice);
    }
    infoGrid.appendChild(priceBlock);

    // 2-B. 티타임 정보 블록
    const teeTimeBlock = document.createElement('div');
    teeTimeBlock.className = 'info-block';

    const teeTimeLabel = document.createElement('span');
    teeTimeLabel.className = 'info-label';
    teeTimeLabel.textContent = '확인된 티타임';
    teeTimeBlock.appendChild(teeTimeLabel);

    if (item.teeTimes && item.teeTimes.length > 0) {
      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'teetime-chips';
      item.teeTimes.forEach(time => {
        const chip = document.createElement('span');
        chip.className = 'teetime-chip';
        chip.textContent = time;
        chipsWrap.appendChild(chip);
      });
      teeTimeBlock.appendChild(chipsWrap);
    } else {
      const emptyTeeTime = document.createElement('span');
      emptyTeeTime.className = 'empty-value';
      emptyTeeTime.textContent = '잔여 티타임 없음';
      teeTimeBlock.appendChild(emptyTeeTime);
    }
    infoGrid.appendChild(teeTimeBlock);

    // 2-C. 날씨 정보 블록
    const weatherBlock = document.createElement('div');
    weatherBlock.className = 'info-block';

    const weatherLabel = document.createElement('span');
    weatherLabel.className = 'info-label';
    weatherLabel.textContent = '해당일 날씨 예보';
    weatherBlock.appendChild(weatherLabel);

    if (item.weather && item.weather.status === 'available') {
      const weatherContent = document.createElement('div');
      weatherContent.className = 'weather-block-content';

      if (item.weather.temperatureC !== null) {
        const temp = document.createElement('span');
        temp.className = 'weather-temp';
        temp.textContent = `${item.weather.temperatureC}℃`;
        weatherContent.appendChild(temp);
      }

      const desc = document.createElement('span');
      desc.className = 'weather-desc';
      desc.textContent = item.weather.summary || '';
      weatherContent.appendChild(desc);

      const rainProb = document.createElement('span');
      rainProb.className = 'rain-prob-badge';
      // PRD 요구사항: 강수확률 null이면 — 표시, 숫자면 % 표시
      rainProb.textContent = item.weather.precipitationProbability !== null 
        ? `강수 ${item.weather.precipitationProbability}%` 
        : '강수 —';
      weatherContent.appendChild(rainProb);

      weatherBlock.appendChild(weatherContent);
    } else if (item.weather && item.weather.status === 'out_of_range') {
      const outRange = document.createElement('span');
      outRange.className = 'empty-value';
      outRange.textContent = '예보 제공 기간 아님';
      weatherBlock.appendChild(outRange);
    } else {
      const emptyWeather = document.createElement('span');
      emptyWeather.className = 'empty-value';
      emptyWeather.textContent = '날씨 정보 없음';
      weatherBlock.appendChild(emptyWeather);
    }
    infoGrid.appendChild(weatherBlock);

    card.appendChild(infoGrid);

    // 3. 카드 하단 (데이터 출처 및 예약하기 버튼)
    const cardFooter = document.createElement('div');
    cardFooter.className = 'course-card-footer';

    const sourceMeta = document.createElement('span');
    sourceMeta.className = 'source-meta';
    sourceMeta.textContent = `출처: ${item.course.data_source || '시스템 등록'}`;
    cardFooter.appendChild(sourceMeta);

    const btnBook = document.createElement('button');
    btnBook.type = 'button';
    btnBook.className = 'btn btn-book';
    btnBook.textContent = '예약하기';
    btnBook.addEventListener('click', () => {
      onBookClick(item.course);
    });
    cardFooter.appendChild(btnBook);

    card.appendChild(cardFooter);
    container.appendChild(card);
  });
}

