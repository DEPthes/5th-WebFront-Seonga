const API_KEY = CONFIG.API_KEY;

const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct';

// ── DOM refs ──
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');

const resultSection = document.getElementById('resultSection');
const loadingSection = document.getElementById('loadingSection');
const errorSection = document.getElementById('errorSection');
const emptyState = document.getElementById('emptyState');

const favBtn = document.getElementById('favBtn');
const favoritesList = document.getElementById('favoritesList');
const forecastList = document.getElementById('forecastList');

let currentCity = null;

// localStorage에서 복원하되, 데이터 손상(JSON 파싱 실패·배열이 아닌 값) 시 빈 배열로 초기화
let favorites = (() => {
  try {
    const parsed = JSON.parse(localStorage.getItem('weather_favorites'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
})();


// ── Fetch ──

/**
 * 도시명을 위도·경도·현지명으로 변환한다.
 * 한국어 이름 → 영문 name → local_names.en 순으로 일치하는 후보를 선택하고, 없으면 첫 번째 결과를 사용한다.
 */
async function geocode(city) {
  const res = await fetch(
    `${GEO_URL}?q=${encodeURIComponent(city)}&limit=5&appid=${API_KEY}`
  );
  if (!res.ok) throwApiError(res.status);
  const results = await res.json();

  if (results.length === 0) throw new Error('도시를 찾을 수 없습니다. 다른 이름으로 검색해보세요.');

  const q = city.trim().toLowerCase();
  const match =
    results.find((r) => r.name.toLowerCase() === q) ||
    results.find((r) => r.local_names?.ko === city.trim()) ||
    results.find((r) => r.local_names?.en?.toLowerCase() === q) ||
    results[0];

  return {
    lat: match.lat,
    lon: match.lon,
    // 한국어 이름이 있으면 우선 사용; renderWeather의 currentCity에도 이 값이 쓰인다
    name: match.local_names?.ko || match.name,
  };
}

async function fetchWeather({ lat, lon }) {
  const res = await fetch(
    `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`
  );
  if (!res.ok) throwApiError(res.status);
  return res.json();
}

async function fetchForecast({ lat, lon }) {
  const res = await fetch(
    `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=kr`
  );
  if (!res.ok) throwApiError(res.status);
  return res.json();
}

function throwApiError(status) {
  if (status === 401) throw new Error('API 키가 유효하지 않습니다.');
  throw new Error('날씨 정보를 불러오는데 실패했습니다.');
}

// innerHTML에 삽입하는 API 문자열의 특수문자를 이스케이프해 XSS를 방지한다
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ── Render current weather ──

/**
 * 현재 날씨 데이터를 DOM에 렌더링한다.
 * @param {Object} data - /weather 응답 JSON
 * @param {string} localName - geocode에서 결정한 현지 도시명 (한국어 우선)
 */
function renderWeather(data, localName) {
  // OWM /weather의 data.name은 항상 영문이므로, geocode에서 결정한 현지명을 우선 사용
  const displayName = localName || data.name;
  document.getElementById('resultCity').textContent = displayName;
  document.getElementById('resultCountry').textContent = data.sys.country;

  document.getElementById('weatherDesc').textContent = data.weather[0].description;
  document.getElementById('weatherIcon').src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  document.getElementById('tempMain').textContent = Math.round(data.main.temp);
  document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°C`;
  document.getElementById('tempRange').textContent =
    `${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°`;

  document.getElementById('humidity').textContent = `${data.main.humidity}%`;
  document.getElementById('windSpeed').textContent = `${data.wind.speed} m/s`;
  // 0(짙은 안개)도 유효한 값이므로 truthiness가 아닌 null 체크로 "데이터 없음"을 판별
  document.getElementById('visibility').textContent =
    data.visibility != null ? `${(data.visibility / 1000).toFixed(1)} km` : '-';
  document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

  // data.timezone은 UTC 오프셋(초 단위); unix 타임스탬프에 오프셋을 더한 뒤
  // toUTCString()의 고정 형식("Ddd, DD Mmm YYYY HH:MM:SS GMT")에서 slice(17,22)로 HH:MM 추출
  const toLocalTime = (unix) => {
    const date = new Date((unix + data.timezone) * 1000);
    return date.toUTCString().slice(17, 22);
  };
  document.getElementById('sunrise').textContent = toLocalTime(data.sys.sunrise);
  document.getElementById('sunset').textContent = toLocalTime(data.sys.sunset);

  document.getElementById('updatedAt').textContent =
    `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;

  // 즐겨찾기 키를 표시 도시명과 일치시키기 위해 geocode 현지명으로 설정
  currentCity = displayName;
  updateFavBtn();
}


// ── Render 5-day forecast ──

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

// dt_txt("YYYY-MM-DD HH:MM:SS", UTC)를 파싱해 도시 UTC 오프셋을 더한 현지 Date 객체를 반환한다
function dtToLocal(dtTxt, offsetSec) {
  const [dp, tp] = dtTxt.split(' ');
  const [y, mo, d] = dp.split('-').map(Number);
  const [h, mi] = tp.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) + offsetSec * 1000);
}

// Date 객체의 UTC 날짜를 "YYYY-MM-DD" 문자열로 변환한다
function toDateStr(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 5일 예보 데이터를 날짜별로 그룹화해 DOM에 렌더링한다.
 * @param {Object} data - /forecast 응답 JSON (data.city.timezone으로 도시 UTC 오프셋 제공)
 */
function renderForecast(data) {
  const cityOffset = data.city.timezone; // UTC 오프셋(초)

  // dt_txt는 UTC 기준이므로 도시 오프셋을 적용한 현지 날짜 기준으로 그룹화
  const byDay = {};
  data.list.forEach((item) => {
    const date = toDateStr(dtToLocal(item.dt_txt, cityOffset));
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(item);
  });

  // 도시 현지 시각 기준의 오늘 날짜를 구해 예보 목록에서 제외 (오늘은 현재 날씨 카드로 표시)
  const today = toDateStr(new Date(Date.now() + cityOffset * 1000));

  const days = Object.keys(byDay)
    .filter((d) => d !== today)
    .slice(0, 5);

  forecastList.innerHTML = days
    .map((date) => {
      const slots = byDay[date];

      // 현지 시간 기준 12시 슬롯을 대표로 선택; 없으면 중간 인덱스로 대체
      const rep =
        slots.find((s) => dtToLocal(s.dt_txt, cityOffset).getUTCHours() === 12) ||
        slots[Math.floor(slots.length / 2)];

      const minTemp = Math.round(Math.min(...slots.map((s) => s.main.temp_min)));
      const maxTemp = Math.round(Math.max(...slots.map((s) => s.main.temp_max)));

      const icon = rep.weather[0].icon;
      // API 응답 문자열을 innerHTML에 삽입하므로 이스케이프
      const desc = escHtml(rep.weather[0].description);

      // date는 이미 도시 현지 날짜 문자열이므로 new Date(y, m-1, d)로 로컬 기준 Date 생성
      const [y, m, d] = date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayLabel = DAY_KO[dateObj.getDay()];
      const mmdd = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

      // dt_txt(UTC)를 도시 현지 시각으로 변환해 슬롯 카드에 표시
      const slotBars = slots
        .map((s) => {
          const local = dtToLocal(s.dt_txt, cityOffset);
          const hour = `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
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

// 네 섹션 중 하나만 보이도록 전환한다
function showSection(section) {
  [resultSection, loadingSection, errorSection, emptyState].forEach((el) =>
    el.classList.add('hidden')
  );
  section.classList.remove('hidden');
}

function showError(message) {
  document.getElementById('errorText').textContent = message;
  showSection(errorSection);
}


// ── Search handler ──

// 검색마다 고유 번호를 부여해, 이전 요청의 응답이 나중에 도착해도 DOM을 덮어쓰지 않도록 한다
let searchSeq = 0;

/**
 * 검색 버튼 또는 Enter 키 입력 시 실행되는 메인 핸들러.
 * geocode → fetchWeather / fetchForecast (병렬) → render 순으로 처리한다.
 * 각 await 이후 더 최신 검색이 시작됐으면 결과를 버려 경쟁 조건을 방지한다.
 */
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return;

  const seq = ++searchSeq;
  searchBtn.disabled = true;
  showSection(loadingSection);

  try {
    const coords = await geocode(city);
    if (seq !== searchSeq) return;

    const [weatherData, forecastData] = await Promise.all([
      fetchWeather(coords),
      fetchForecast(coords),
    ]);
    if (seq !== searchSeq) return;

    renderWeather(weatherData, coords.name);
    renderForecast(forecastData);
    showSection(resultSection);
  } catch (err) {
    if (seq === searchSeq) showError(err.message);
  } finally {
    if (seq === searchSeq) searchBtn.disabled = false;
  }
}


// ── Favorites ──

function updateFavBtn() {
  const isFav = favorites.includes(currentCity);
  favBtn.textContent = isFav ? '★' : '☆';
  favBtn.classList.toggle('active', isFav);
}

/**
 * 즐겨찾기 목록을 사이드바에 렌더링한다.
 * city 이름을 innerHTML에 직접 삽입하지 않고 createElement + textContent를 사용해 XSS를 방지한다.
 */
function renderFavorites() {
  favoritesList.innerHTML = '';

  if (favorites.length === 0) {
    favoritesList.innerHTML =
      '<li class="nav-item empty-hint">도시를 즐겨찾기에 추가하세요</li>';
    return;
  }

  favorites.forEach((city) => {
    const li = document.createElement('li');
    li.className = 'nav-item';

    const globe = document.createElement('span');
    globe.textContent = '🌍';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'nav-city';
    nameSpan.textContent = city;

    const removeSpan = document.createElement('span');
    removeSpan.className = 'nav-remove';
    removeSpan.dataset.city = city;
    removeSpan.title = '제거';
    removeSpan.textContent = '✕';

    li.append(globe, nameSpan, removeSpan);

    // ✕가 아닌 곳 클릭 시 해당 도시 검색
    li.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-remove')) return;
      cityInput.value = city;
      closeSidebar();
      handleSearch();
    });

    removeSpan.addEventListener('click', () => removeFavorite(city));

    favoritesList.appendChild(li);
  });
}

function toggleFavorite() {
  if (!currentCity) return;

  const idx = favorites.indexOf(currentCity);
  if (idx === -1) {
    favorites.push(currentCity);
  } else {
    favorites.splice(idx, 1);
  }

  localStorage.setItem('weather_favorites', JSON.stringify(favorites));
  updateFavBtn();
  renderFavorites();
}

function removeFavorite(city) {
  favorites = favorites.filter((c) => c !== city);
  localStorage.setItem('weather_favorites', JSON.stringify(favorites));
  if (currentCity === city) updateFavBtn();
  renderFavorites();
}


// ── Event listeners ──
searchBtn.addEventListener('click', handleSearch);
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
sidebarOverlay.addEventListener('click', closeSidebar);


// ── Init ──
renderFavorites();
