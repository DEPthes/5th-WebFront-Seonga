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
let favorites = JSON.parse(localStorage.getItem('weather_favorites') || '[]');

// ── Fetch ──

// 도시명(한국어 포함) → { lat, lon } 변환
async function geocode(city) {
  const res = await fetch(
    `${GEO_URL}?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
  );
  if (!res.ok) throwApiError(res.status);
  const results = await res.json();
  if (results.length === 0) throw new Error('도시를 찾을 수 없습니다. 다른 이름으로 검색해보세요.');
  return { lat: results[0].lat, lon: results[0].lon, name: results[0].local_names?.ko || results[0].name };
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

// ── Render current weather ──
function renderWeather(data) {
  document.getElementById('resultCity').textContent = data.name;
  document.getElementById('resultCountry').textContent = data.sys.country;
  document.getElementById('weatherDesc').textContent = data.weather[0].description;
  document.getElementById('tempMain').textContent = Math.round(data.main.temp);
  document.getElementById('feelsLike').textContent = `${Math.round(data.main.feels_like)}°C`;
  document.getElementById('tempRange').textContent =
    `${Math.round(data.main.temp_min)}° / ${Math.round(data.main.temp_max)}°`;
  document.getElementById('humidity').textContent = `${data.main.humidity}%`;
  document.getElementById('windSpeed').textContent = `${data.wind.speed} m/s`;
  document.getElementById('visibility').textContent =
    data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : '-';
  document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
  document.getElementById('weatherIcon').src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  const toLocalTime = (unix) => {
    const date = new Date((unix + data.timezone) * 1000);
    return date.toUTCString().slice(17, 22);
  };
  document.getElementById('sunrise').textContent = toLocalTime(data.sys.sunrise);
  document.getElementById('sunset').textContent = toLocalTime(data.sys.sunset);

  document.getElementById('updatedAt').textContent =
    `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;

  currentCity = data.name;
  updateFavBtn();
}

// ── Render 5-day forecast ──
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function renderForecast(data) {
  // API는 3시간 간격 데이터를 반환 — 날짜별로 묶어 대표값 추출
  const byDay = {};
  data.list.forEach((item) => {
    const date = item.dt_txt.slice(0, 10); // "YYYY-MM-DD"
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(item);
  });

  // 오늘 제외, 최대 5일
  const today = new Date().toISOString().slice(0, 10);
  const days = Object.keys(byDay)
    .filter((d) => d !== today)
    .slice(0, 5);

  forecastList.innerHTML = days
    .map((date) => {
      const slots = byDay[date];

      // 낮 12시 슬롯 우선, 없으면 중간값
      const rep =
        slots.find((s) => s.dt_txt.includes('12:00:00')) ||
        slots[Math.floor(slots.length / 2)];

      const minTemp = Math.round(Math.min(...slots.map((s) => s.main.temp_min)));
      const maxTemp = Math.round(Math.max(...slots.map((s) => s.main.temp_max)));
      const icon = rep.weather[0].icon;
      const desc = rep.weather[0].description;
      const dateObj = new Date(date);
      const dayLabel = DAY_KO[dateObj.getDay()];
      const mmdd = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

      // 3시간 슬롯 바
      const slotBars = slots
        .map((s) => {
          const hour = s.dt_txt.slice(11, 16);
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
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) return;

  showSection(loadingSection);

  try {
    // 한국어 포함 도시명 → 좌표 변환 후 병렬 요청
    const coords = await geocode(city);
    const [weatherData, forecastData] = await Promise.all([
      fetchWeather(coords),
      fetchForecast(coords),
    ]);
    renderWeather(weatherData);
    renderForecast(forecastData);
    showSection(resultSection);
  } catch (err) {
    showError(err.message);
  }
}

// ── Favorites ──
function updateFavBtn() {
  const isFav = favorites.includes(currentCity);
  favBtn.textContent = isFav ? '★' : '☆';
  favBtn.classList.toggle('active', isFav);
}

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
    li.innerHTML = `
      <span>🌍</span>
      <span class="nav-city">${city}</span>
      <span class="nav-remove" data-city="${city}" title="제거">✕</span>
    `;
    li.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-remove')) return;
      cityInput.value = city;
      handleSearch();
    });
    li.querySelector('.nav-remove').addEventListener('click', () => removeFavorite(city));
    favoritesList.appendChild(li);
  });
}

function toggleFavorite() {
  if (!currentCity) return;
  const idx = favorites.indexOf(currentCity);
  if (idx === -1) favorites.push(currentCity);
  else favorites.splice(idx, 1);
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

// ── Init ──
renderFavorites();
