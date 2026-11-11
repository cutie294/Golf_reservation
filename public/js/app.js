/**
 * public/js/app.js
 * 설명: 티업스팟(TeeUpSpot) 프론트엔드 메인 컨트롤러 모듈
 * 
 * [초보자를 위한 가이드]
 * - 이벤트 리스너(버튼 클릭, 폼 전송)를 등록하고 화면의 상태(로딩, 결과, 에러 등)를 관리합니다.
 */

import { searchGolfCourses } from './api.js';
import { renderRecommendations, renderCourseList } from './render.js';

// 애플리케이션 상태(State) 관리
const state = {
  currentDate: '',
  origin: null,           // { latitude, longitude, address }
  isLoading: false,
  lastSearchData: null
};

// DOM 주요 엘리먼트 참조 캐싱
const elements = {
  searchForm: document.getElementById('searchForm'),
  playDateInput: document.getElementById('playDateInput'),
  originInput: document.getElementById('originInput'),
  btnGetLocation: document.getElementById('btnGetLocation'),
  locationStatus: document.getElementById('locationStatus'),
  btnSubmitSearch: document.getElementById('btnSubmitSearch'),
  searchFormAlert: document.getElementById('searchFormAlert'),

  recommendationSection: document.getElementById('recommendationSection'),
  recommendationCards: document.getElementById('recommendationCards'),
  distanceNoticeBadge: document.getElementById('distanceNoticeBadge'),

  resultSection: document.getElementById('resultSection'),
  selectedDateDisplay: document.getElementById('selectedDateDisplay'),
  resultCountBadge: document.getElementById('resultCountBadge'),
  partialErrorAlert: document.getElementById('partialErrorAlert'),
  courseCardsList: document.getElementById('courseCardsList'),

  // 상태 뷰
  idleStateView: document.getElementById('idleStateView'),
  loadingStateView: document.getElementById('loadingStateView'),
  emptyStateView: document.getElementById('emptyStateView'),
  errorStateView: document.getElementById('errorStateView'),
  errorMessageTitle: document.getElementById('errorMessageTitle'),
  errorMessageDesc: document.getElementById('errorMessageDesc'),
  btnRetrySearch: document.getElementById('btnRetrySearch'),

  // 예약 안내 모달
  bookingNoticeModal: document.getElementById('bookingNoticeModal'),
  modalCourseName: document.getElementById('modalCourseName'),
  btnGoToWebsite: document.getElementById('btnGoToWebsite'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  systemModeText: document.getElementById('systemModeText')
};

/**
 * 한국 시간(KST) 기준 오늘 날짜 문자열(YYYY-MM-DD)을 생성합니다.
 */
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 앱 초기화
 */
function initApp() {
  const today = getTodayString();
  
  // 날짜 입력 필드의 최소값(과거 날짜 차단)과 기본값을 오늘로 설정
  elements.playDateInput.min = today;
  elements.playDateInput.value = today;
  state.currentDate = today;

  // 이벤트 리스너 등록
  elements.searchForm.addEventListener('submit', handleSearchSubmit);
  elements.btnGetLocation.addEventListener('click', handleGetCurrentLocation);
  elements.originInput.addEventListener('input', handleOriginInputChange);
  elements.btnRetrySearch.addEventListener('click', () => {
    executeSearch();
  });

  // 모달 닫기 이벤트 등록
  elements.btnCloseModal.addEventListener('click', () => {
    elements.bookingNoticeModal.close();
  });
}

/**
 * 출발 위치 텍스트 변경 감지
 */
function handleOriginInputChange(e) {
  const text = e.target.value.trim();
  if (!text) {
    state.origin = null;
    elements.locationStatus.textContent = '출발 위치를 입력하시면 골프장까지의 직선거리와 이동 편의성을 추천에 반영합니다.';
    elements.locationStatus.style.color = '';
  } else if (!state.origin || !state.origin.latitude) {
    state.origin = {
      address: text,
      latitude: null,
      longitude: null
    };
  }
}

/**
 * 브라우저 Geolocation API를 통한 GPS 현재 위치 수신
 */
function handleGetCurrentLocation() {
  if (!navigator.geolocation) {
    alert('현재 사용 중인 브라우저가 위치 정보 서비스를 지원하지 않습니다.');
    return;
  }

  elements.locationStatus.textContent = '📍 GPS 위성 위치를 찾는 중입니다...';
  elements.btnGetLocation.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      state.origin = {
        address: elements.originInput.value.trim() || '현재 내 위치(GPS)',
        latitude: lat,
        longitude: lng
      };

      if (!elements.originInput.value.trim()) {
        elements.originInput.value = '내 현재 위치 (GPS 좌표 적용됨)';
      }

      elements.locationStatus.textContent = `✅ 위치 확인 완료 (위도 ${lat.toFixed(2)}, 경도 ${lng.toFixed(2)})`;
      elements.locationStatus.style.color = '#15803d';
      elements.btnGetLocation.disabled = false;
    },
    (error) => {
      console.warn('[위치 권한 오류]:', error);
      let errorMsg = '위치 정보를 가져오지 못했습니다.';
      if (error.code === 1) {
        errorMsg = '위치 정보 접근 권한이 거부되었습니다. 주소를 직접 입력해 주세요.';
      } else if (error.code === 2) {
        errorMsg = '위치 정보를 수신할 수 없습니다.';
      } else if (error.code === 3) {
        errorMsg = '위치 확인 시간이 초과되었습니다.';
      }

      elements.locationStatus.textContent = `⚠️ ${errorMsg}`;
      elements.locationStatus.style.color = '#b91c1c';
      elements.btnGetLocation.disabled = false;
    },
    { timeout: 10000, enableHighAccuracy: false }
  );
}

/**
 * 폼 제출 핸들러
 */
function handleSearchSubmit(e) {
  e.preventDefault();
  executeSearch();
}

/**
 * 검색 실행 함수
 */
async function executeSearch() {
  const selectedDate = elements.playDateInput.value;

  // 1. 클라이언트 측 날짜 검증
  if (!selectedDate) {
    showFormAlert('라운딩 희망 날짜를 선택해 주세요.');
    return;
  }

  const today = getTodayString();
  if (selectedDate < today) {
    showFormAlert('과거 날짜는 선택할 수 없습니다. 오늘 이후의 날짜를 선택해 주세요.');
    return;
  }

  hideFormAlert();
  setLoadingState(true);

  try {
    // 2. 백엔드 API 호출
    const result = await searchGolfCourses({
      date: selectedDate,
      origin: state.origin
    });

    state.lastSearchData = result;
    setLoadingState(false);

    // 3. 응답 결과 렌더링
    renderSearchResults(result);

  } catch (error) {
    setLoadingState(false);
    showErrorState('검색 결과를 불러오지 못했습니다', error.message || '네트워크 연결을 확인해 주세요.');
  }
}

/**
 * 검색 결과 화면 표시 처리
 */
function renderSearchResults(data) {
  const courses = data.courses || [];
  const recommendations = data.recommendations || [];
  const meta = data.meta || {};

  // 결과가 없는 경우
  if (courses.length === 0) {
    showEmptyState();
    return;
  }

  // 상태 뷰 숨김
  hideAllStatusViews();

  // 시스템 모드 뱃지 갱신
  if (meta.isSample) {
    elements.systemModeText.textContent = '데모 샘플 모드 동작 중';
  } else {
    elements.systemModeText.textContent = '실시간 데이터 연결 모드';
  }

  // 1. 추천 패널 렌더링
  if (recommendations.length > 0) {
    elements.recommendationSection.hidden = false;
    
    // 거리 미적용 안내 뱃지
    if (!meta.hasOrigin) {
      elements.distanceNoticeBadge.hidden = false;
    } else {
      elements.distanceNoticeBadge.hidden = true;
    }

    renderRecommendations(elements.recommendationCards, recommendations);
  } else {
    elements.recommendationSection.hidden = true;
  }

  // 2. 전체 결과 목록 렌더링
  elements.resultSection.hidden = false;
  elements.selectedDateDisplay.textContent = data.date;
  elements.resultCountBadge.textContent = `총 ${courses.length}개 골프장`;

  // 부분 오류(날씨 실패 등) 배너 처리
  if (meta.partialErrors && meta.partialErrors.length > 0) {
    elements.partialErrorAlert.hidden = false;
    elements.partialErrorAlert.textContent = `ℹ️ ${meta.partialErrors.join(' / ')}`;
  } else {
    elements.partialErrorAlert.hidden = true;
  }

  renderCourseList(elements.courseCardsList, courses, handleBookCourseClick);

  // 결과 영역으로 부드럽게 스크롤 이동
  elements.recommendationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * '예약하기' 버튼 클릭 핸들러 (PRD 핵심 요구사항)
 * 실제 예약 없이 공식 홈페이지 안내 모달을 띄웁니다.
 */
function handleBookCourseClick(course) {
  elements.modalCourseName.textContent = `[${course.name}]`;

  if (course.website_url) {
    elements.btnGoToWebsite.href = course.website_url;
    elements.btnGoToWebsite.hidden = false;
  } else {
    elements.btnGoToWebsite.hidden = true;
  }

  elements.bookingNoticeModal.showModal();
}

/**
 * UI 상태 제어 헬퍼 함수들
 */
function setLoadingState(loading) {
  state.isLoading = loading;
  elements.btnSubmitSearch.disabled = loading;
  elements.btnSubmitSearch.classList.toggle('is-loading', loading);

  if (loading) {
    hideAllStatusViews();
    elements.loadingStateView.hidden = false;
    elements.recommendationSection.hidden = true;
    elements.resultSection.hidden = true;
  } else {
    elements.loadingStateView.hidden = true;
  }
}

function showEmptyState() {
  hideAllStatusViews();
  elements.emptyStateView.hidden = false;
  elements.recommendationSection.hidden = true;
  elements.resultSection.hidden = true;
}

function showErrorState(title, desc) {
  hideAllStatusViews();
  elements.errorMessageTitle.textContent = title;
  elements.errorMessageDesc.textContent = desc;
  elements.errorStateView.hidden = false;
  elements.recommendationSection.hidden = true;
  elements.resultSection.hidden = true;
}

function hideAllStatusViews() {
  elements.idleStateView.hidden = true;
  elements.loadingStateView.hidden = true;
  elements.emptyStateView.hidden = true;
  elements.errorStateView.hidden = true;
}

function showFormAlert(message) {
  elements.searchFormAlert.textContent = `⚠️ ${message}`;
  elements.searchFormAlert.hidden = false;
}

function hideFormAlert() {
  elements.searchFormAlert.textContent = '';
  elements.searchFormAlert.hidden = true;
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', initApp);

