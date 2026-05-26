// config.js에서 주입된 API 키 (Git에 노출되지 않도록 별도 파일로 분리)
const API_KEY = CONFIG.API_KEY;

// OpenWeatherMap API의 두 가지 엔드포인트
const BASE_URL = 'https://api.openweathermap.org/data/2.5'; // 현재 날씨 & 예보
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct'; // 도시명 → 좌표 변환

// ── DOM refs ──
// 검색 UI
const cityInput = document.getElementById('cityInput');   // 도시명 입력 필드
const searchBtn = document.getElementById('searchBtn');   // 검색 버튼

// 상태별 화면 섹션 (한 번에 하나만 표시됨)
const resultSection = document.getElementById('resultSection');   // 날씨 결과
const loadingSection = document.getElementById('loadingSection'); // 로딩 스피너
const errorSection = document.getElementById('errorSection');     // 오류 메시지
const emptyState = document.getElementById('emptyState');         // 초기 안내 화면

// 즐겨찾기 관련 요소
const favBtn = document.getElementById('favBtn');           // 별표(★/☆) 토글 버튼
const favoritesList = document.getElementById('favoritesList'); // 즐겨찾기 목록 <ul>
const forecastList = document.getElementById('forecastList');   // 5일 예보 목록

// 현재 표시 중인 도시 이름 (즐겨찾기 추가/제거에 사용)
let currentCity = null;

// 즐겨찾기 목록 — 새로고침 후에도 유지되도록 localStorage에서 불러옴
let favorites = JSON.parse(localStorage.getItem('weather_favorites') || '[]');


// ── Fetch ──

/**
 * 도시명(한국어 포함)을 위도·경도로 변환한다.
 * OpenWeatherMap Geocoding API는 한글 도시명을 그대로 받아 처리할 수 있다.
 * encodeURIComponent로 URL 인코딩해야 특수문자·한글이 올바르게 전송된다.
 *
 * @param {string} city - 사용자가 입력한 도시명
 * @returns {{ lat: number, lon: number, name: string }} 좌표와 한국어 도시명
 */
async function geocode(city) {
  const res = await fetch(
    // limit=5: 여러 후보를 받아 가장 정확히 일치하는 도시를 직접 선택
    `${GEO_URL}?q=${encodeURIComponent(city)}&limit=5&appid=${API_KEY}`
  );
  if (!res.ok) throwApiError(res.status);
  const results = await res.json();

  // 검색 결과가 없으면 사용자에게 친절한 메시지 표시
  if (results.length === 0) throw new Error('도시를 찾을 수 없습니다. 다른 이름으로 검색해보세요.');

  const q = city.trim().toLowerCase();

  // 1순위: 영문 name 정확 일치 (예: "osaka" → "Osaka")
  // 2순위: 한국어 local_names.ko 정확 일치 (예: "오사카" → "오사카")
  // 3순위: 영문 local_names.en 정확 일치
  // 4순위: 첫 번째 결과로 폴백
  const match =
    results.find((r) => r.name.toLowerCase() === q) ||
    results.find((r) => r.local_names?.ko === city.trim()) ||
    results.find((r) => r.local_names?.en?.toLowerCase() === q) ||
    results[0];

  return {
    lat: match.lat,
    lon: match.lon,
    // local_names.ko가 있으면 한국어 표기를 우선 사용, 없으면 영어명 사용
    name: match.local_names?.ko || match.name,
  };
}

/**
 * 현재 날씨 정보를 가져온다.
 * units=metric: 온도를 섭씨(°C)로 반환
 * lang=kr: 날씨 설명을 한국어로 반환 (예: "맑음", "흐림")
 *
 * @param {{ lat: number, lon: number }} 좌표
 * @returns {Promise<Object>} OpenWeatherMap /weather 응답 JSON
 */
async function fetchWeather({ lat, lon }) {
  const res = await fetch(
    `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`
  );
  if (!res.ok) throwApiError(res.status);
  return res.json();
}

/**
 * 5일간 3시간 간격 예보 데이터를 가져온다.
 * 응답에는 40개(5일 × 8슬롯)의 예보 항목이 포함된다.
 *
 * @param {{ lat: number, lon: number }} 좌표
 * @returns {Promise<Object>} OpenWeatherMap /forecast 응답 JSON
 */
async function fetchForecast({ lat, lon }) {
  const res = await fetch(
    `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`
  );
  if (!res.ok) throwApiError(res.status);
  return res.json();
}

/**
 * HTTP 상태 코드에 따라 적절한 오류 메시지를 throw한다.
 * 401은 API 키 문제이므로 별도 메시지로 구분한다.
 *
 * @param {number} status - HTTP 응답 상태 코드
 */
function throwApiError(status) {
  if (status === 401) throw new Error('API 키가 유효하지 않습니다.');
  throw new Error('날씨 정보를 불러오는데 실패했습니다.');
}


// ── Render current weather ──

/**
 * 현재 날씨 데이터를 DOM에 렌더링한다.
 * API 응답의 각 필드를 해당 id를 가진 요소에 채워 넣는다.
 *
 * @param {Object} data - fetchWeather()가 반환한 OpenWeatherMap /weather JSON
 */
function renderWeather(data) {
  // 도시명 및 국가 코드 (예: "Seoul", "KR")
  document.getElementById('resultCity').textContent = data.name;
  document.getElementById('resultCountry').textContent = data.sys.country;

  // 날씨 설명 및 아이콘 (lang=kr 덕분에 "맑음" 등 한국어로 표시됨)
  document.getElementById('weatherDesc').textContent = data.weather[0].description;
  document.getElementById('weatherIcon').src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`; // @2x: 고해상도 아이콘


  // 온도 관련 수치 (소수점 제거를 위해 Math.round 사용)
  document.getElementById('tempMain').textContent = Math.round(data.main.temp);
  document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°C`;
  document.getElementById('tempRange').textContent =
    `${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°`;

  // 기상 세부 정보
  document.getElementById('humidity').textContent = `${data.main.humidity}%`;
  document.getElementById('windSpeed').textContent = `${data.wind.speed} m/s`;
  // visibility는 미터(m) 단위이므로 1000으로 나눠 km로 변환, 데이터 없을 때 '-' 표시
  document.getElementById('visibility').textContent =
    data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : '-';
  document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

  /**
   * Unix 타임스탬프(초)를 해당 도시의 현지 시각(HH:MM)으로 변환한다.
   * data.timezone은 UTC 기준 오프셋(초 단위)이다.
   * new Date()는 밀리초를 받으므로 × 1000 필요.
   * toUTCString() 결과에서 slice(17, 22)로 "HH:MM" 부분만 추출한다.
   * (예: "Mon, 26 May 2026 09:30:00 GMT" → "09:30")
   */
  const toLocalTime = (unix) => {
    const date = new Date((unix + data.timezone) * 1000);
    return date.toUTCString().slice(17, 22);
  };
  document.getElementById('sunrise').textContent = toLocalTime(data.sys.sunrise);
  document.getElementById('sunset').textContent = toLocalTime(data.sys.sunset);

  // 마지막 API 호출 시각을 한국어 형식으로 표시 (예: "오전 10:30")
  document.getElementById('updatedAt').textContent =
    `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;

  // 현재 도시를 전역 변수에 저장해 즐겨찾기 토글에서 참조할 수 있게 함
  currentCity = data.name;
  updateFavBtn(); // 즐겨찾기 버튼 상태 갱신
}


// ── Render 5-day forecast ──

// Date.getDay()가 반환하는 0~6 인덱스를 한국어 요일로 매핑 (0=일요일)
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 5일 예보 데이터를 날짜별로 그룹화해 DOM에 렌더링한다.
 * /forecast API는 3시간 간격으로 40개 슬롯을 반환하므로,
 * 날짜별로 묶은 뒤 각 날의 대표값(12시 슬롯)과 최저·최고 기온을 계산한다.
 *
 * @param {Object} data - fetchForecast()가 반환한 OpenWeatherMap /forecast JSON
 */
function renderForecast(data) {
  // data.list의 각 항목을 날짜 문자열("YYYY-MM-DD")을 키로 하는 객체로 분류
  const byDay = {};
  data.list.forEach((item) => {
    const date = item.dt_txt.slice(0, 10); // "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DD"
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(item);
  });

  // 오늘 날짜를 ISO 형식으로 구해 예보 목록에서 제외 (오늘은 현재 날씨 카드로 표시)
  const today = new Date().toISOString().slice(0, 10);
  const days = Object.keys(byDay)
    .filter((d) => d !== today)
    .slice(0, 5); // 최대 5일치만 표시

  forecastList.innerHTML = days
    .map((date) => {
      const slots = byDay[date]; // 해당 날짜의 모든 3시간 슬롯 배열

      // 낮 12시 데이터가 하루를 대표하기에 가장 적합하다.
      // 12시 슬롯이 없는 경우(데이터 수집 시작 시점 등) 배열 중간 인덱스로 대체한다.
      const rep =
        slots.find((s) => s.dt_txt.includes('12:00:00')) ||
        slots[Math.floor(slots.length / 2)];

      // 하루 전체 슬롯에서 최저·최고 기온 계산 (temp_min/temp_max는 슬롯 단위 값)
      const minTemp = Math.round(Math.min(...slots.map((s) => s.main.temp_min)));
      const maxTemp = Math.round(Math.max(...slots.map((s) => s.main.temp_max)));

      // 대표 슬롯의 날씨 아이콘과 설명
      const icon = rep.weather[0].icon;
      const desc = rep.weather[0].description;

      // 날짜 문자열을 Date 객체로 변환해 요일과 월/일 표기 생성
      const dateObj = new Date(date);
      const dayLabel = DAY_KO[dateObj.getDay()]; // 예: "월"
      const mmdd = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`; // 예: "5/27"

      // 각 3시간 슬롯을 시각·아이콘·기온이 담긴 작은 카드로 변환
      const slotBars = slots
        .map((s) => {
          const hour = s.dt_txt.slice(11, 16); // "HH:MM"
          const t = Math.round(s.main.temp);
          const ic = s.weather[0].icon;
          return `
            <div class="slot">
              <span class="slot-time">${hour}</span>
              <img class="slot-icon" src="https://openweathermap.org/img/wn/${ic}.png" alt="" />
              <span class="slot-temp">${t}°</span>
            </div>`;
        })
        .join('');

      // 하루 예보 카드: 헤더(요일·요약·온도 범위) + 시간별 슬롯 바
      return `
        <div class="forecast-day">
          <div class="forecast-day-header">
            <div class="forecast-day-label">
              <span class="forecast-dow">${dayLabel}요일</span>
              <span class="forecast-date">${mmdd}</span>
            </div>
            <div class="forecast-day-summary">
              <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${desc}" />
              <span class="forecast-desc">${desc}</span>
            </div>
            <div class="forecast-range">
              <span class="forecast-min">${minTemp}°</span>
              <span class="forecast-range-sep">/</span>
              <span class="forecast-max">${maxTemp}°</span>
            </div>
          </div>
          <div class="slot-list">${slotBars}</div>
        </div>`;
    })
    .join('');
}


// ── Show/hide sections ──

/**
 * 네 가지 상태 섹션(결과·로딩·오류·초기화면) 중 하나만 보이도록 전환한다.
 * 모두 hidden 처리 후 지정한 섹션의 hidden만 제거하는 방식으로 상태를 관리한다.
 *
 * @param {HTMLElement} section - 표시할 섹션 요소
 */
function showSection(section) {
  [resultSection, loadingSection, errorSection, emptyState].forEach((el) =>
    el.classList.add('hidden')
  );
  section.classList.remove('hidden');
}

/**
 * 오류 메시지를 설정하고 오류 섹션을 화면에 표시한다.
 *
 * @param {string} message - 사용자에게 표시할 오류 메시지
 */
function showError(message) {
  document.getElementById('errorText').textContent = message;
  showSection(errorSection);
}


// ── Search handler ──

/**
 * 검색 버튼 클릭 또는 Enter 키 입력 시 실행되는 메인 핸들러.
 * geocode → fetchWeather/fetchForecast(병렬) → render 순서로 처리한다.
 * 각 단계에서 발생한 오류는 catch에서 모아 오류 섹션에 표시한다.
 */
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return; // 입력값이 없으면 아무것도 하지 않음

  showSection(loadingSection); // 요청 시작 전 로딩 화면으로 전환

  try {
    // 1단계: 도시명을 위도·경도로 변환
    const coords = await geocode(city);

    // 2단계: 현재 날씨와 예보를 동시에 요청 (Promise.all로 병렬 처리해 대기 시간 단축)
    const [weatherData, forecastData] = await Promise.all([
      fetchWeather(coords),
      fetchForecast(coords),
    ]);

    // 3단계: 데이터를 DOM에 반영하고 결과 섹션 표시
    renderWeather(weatherData);
    renderForecast(forecastData);
    showSection(resultSection);
  } catch (err) {
    // geocode/fetch 어느 단계에서든 throw된 오류를 여기서 처리
    showError(err.message);
  }
}


// ── Favorites ──

/**
 * 현재 도시가 즐겨찾기에 포함돼 있는지 확인해 별표 버튼 상태를 갱신한다.
 * ★ (채워진 별) = 즐겨찾기 등록됨, ☆ (빈 별) = 미등록
 */
function updateFavBtn() {
  const isFav = favorites.includes(currentCity);
  favBtn.textContent = isFav ? '★' : '☆';
  favBtn.classList.toggle('active', isFav); // CSS .active 클래스로 색상 변경
}

/**
 * 즐겨찾기 목록을 사이드바에 렌더링한다.
 * 목록이 비어 있으면 안내 문구를 대신 표시한다.
 * 각 항목을 클릭하면 해당 도시를 바로 검색하고,
 * ✕ 버튼 클릭 시에는 즐겨찾기에서만 제거한다(검색은 실행하지 않음).
 */
function renderFavorites() {
  favoritesList.innerHTML = ''; // 기존 목록 초기화

  if (favorites.length === 0) {
    favoritesList.innerHTML =
      '<li class="nav-item empty-hint">도시를 즐겨찾기에 추가하세요</li>';
    return;
  }

  favorites.forEach((city) => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    li.innerHTML = `
      <span>🌍</span>
      <span class="nav-city">${city}</span>
      <span class="nav-remove" data-city="${city}" title="제거">✕</span>
    `;

    // 항목 클릭: ✕ 버튼이 아닌 곳을 클릭했을 때만 해당 도시 검색
    // 모바일에서는 드로어를 닫은 뒤 검색 실행
    li.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-remove')) return; // ✕는 별도 처리
      cityInput.value = city;
      closeSidebar();
      handleSearch();
    });

    // ✕ 버튼 클릭: 목록에서만 제거 (검색 실행 없음)
    li.querySelector('.nav-remove').addEventListener('click', () => removeFavorite(city));

    favoritesList.appendChild(li);
  });
}

/**
 * 현재 도시를 즐겨찾기에 추가하거나 제거한다(토글).
 * 변경된 목록은 localStorage에 저장해 새로고침 후에도 유지한다.
 */
function toggleFavorite() {
  if (!currentCity) return; // 검색 결과가 없으면 동작하지 않음

  const idx = favorites.indexOf(currentCity);
  if (idx === -1) {
    favorites.push(currentCity); // 미등록 → 추가
  } else {
    favorites.splice(idx, 1);   // 등록됨 → 제거
  }

  localStorage.setItem('weather_favorites', JSON.stringify(favorites));
  updateFavBtn();      // 별표 버튼 상태 갱신
  renderFavorites();   // 사이드바 목록 갱신
}

/**
 * 즐겨찾기 목록에서 특정 도시를 제거한다.
 * 현재 표시 중인 도시가 제거 대상이면 별표 버튼도 함께 갱신한다.
 *
 * @param {string} city - 제거할 도시 이름
 */
function removeFavorite(city) {
  favorites = favorites.filter((c) => c !== city);
  localStorage.setItem('weather_favorites', JSON.stringify(favorites));

  // 현재 보고 있는 도시가 제거된 경우 별표 버튼을 ☆로 되돌림
  if (currentCity === city) updateFavBtn();

  renderFavorites();
}


// ── Event listeners ──
searchBtn.addEventListener('click', handleSearch);
// Enter 키로도 검색할 수 있도록 keydown 이벤트 등록
cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
favBtn.addEventListener('click', toggleFavorite);


// ── Mobile sidebar drawer ──
const menuToggle = document.getElementById('menuToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebar = document.querySelector('.sidebar');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
}

menuToggle.addEventListener('click', openSidebar);
// 오버레이 클릭 시 드로어 닫기
sidebarOverlay.addEventListener('click', closeSidebar);


// ── Init ──
// 페이지 로드 시 localStorage에 저장된 즐겨찾기 목록을 사이드바에 표시
renderFavorites();
