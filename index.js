// ====== CONFIG ======
const WEATHER_API_KEY = 'd268b2c2d8da44c7a10105058243101'; // ✅ Your WeatherAPI key
const WEATHER_FORECAST = 'https://api.weatherapi.com/v1/forecast.json';

// ====== ELEMENTS ======
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locBtn = document.getElementById('locBtn');
const unitToggle = document.getElementById('unitToggle');
const recentSelect = document.getElementById('recentSelect');
const locationName = document.getElementById('locationName');
const todayDesc = document.getElementById('todayDesc');
const todayTemp = document.getElementById('todayTemp');
const feelsLike = document.getElementById('feelsLike');
const todayExtra = document.getElementById('todayExtra');
const todayIcon = document.getElementById('todayIcon');
const forecastContainer = document.getElementById('forecast');
const errorBox = document.getElementById('errorBox');
const alertsBox = document.getElementById('alerts');
const toast = document.getElementById('toast');

// ====== STATE ======
let unit = 'C';
let recentCities = JSON.parse(localStorage.getItem('zephyr.recent')) || [];

// ====== HELPERS ======
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
  setTimeout(() => errorBox.classList.add('hidden'), 4000);
}

function showToast(msg) {
  toast.querySelector('div').textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

function saveRecent(city) {
  city = city.trim();
  if (!city) return;
  recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
  recentCities.unshift(city);
  if (recentCities.length > 8) recentCities.pop();
  localStorage.setItem('zephyr.recent', JSON.stringify(recentCities));
  renderRecentDropdown();
}

function renderRecentDropdown() {
  recentSelect.innerHTML = '';
  if (!recentCities.length) {
    recentSelect.innerHTML = '<option value="">-- none yet --</option>';
    return;
  }
  const placeholder = document.createElement('option');
  placeholder.textContent = 'Select recent city';
  placeholder.value = '';
  recentSelect.appendChild(placeholder);
  recentCities.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    recentSelect.appendChild(opt);
  });
}

function applyConditionStyling(condition) {
  const card = document.getElementById('todayCard');
  if (condition.toLowerCase().includes('rain')) {
    card.classList.add('rainy');
    document.body.classList.add('rainy');
  } else {
    card.classList.remove('rainy');
    document.body.classList.remove('rainy');
  }
}

// ====== FETCH WEATHER ======
async function fetchWeather(query) {
  if (!query || !query.trim()) {
    showError('Please enter a valid city name.');
    return;
  }

  try {
    clearUI();
    const url = `${WEATHER_FORECAST}?key=${WEATHER_API_KEY}&q=${encodeURIComponent(query)}&days=7&aqi=yes&alerts=yes`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      showError('City not found — please try again.');
      return;
    }

    renderWeather(data);
    saveRecent(data.location.name);
  } catch (err) {
    console.error(err);
    showError('Unable to fetch weather data. Please check your internet or API key.');
  }
}

async function fetchWeatherByCoords(lat, lon) {
  const query = `${lat},${lon}`;
  fetchWeather(query);
}

// ====== RENDER ======
function clearUI() {
  locationName.textContent = 'Loading...';
  todayTemp.textContent = '--°';
  forecastContainer.innerHTML = '';
  todayIcon.innerHTML = '';
  alertsBox.classList.add('hidden');
}

function renderWeather(data) {
  const loc = data.location;
  const current = data.current;

  locationName.textContent = `${loc.name}, ${loc.country}`;
  todayDesc.textContent = current.condition.text;

  const temp = unit === 'C' ? current.temp_c : current.temp_f;
  const feels = unit === 'C' ? current.feelslike_c : current.feelslike_f;

  todayTemp.textContent = `${Math.round(temp)}°${unit}`;
  feelsLike.textContent = `Feels like ${Math.round(feels)}°${unit}`;
  todayExtra.innerHTML = `Humidity: ${current.humidity}%<br>Wind: ${current.wind_kph} kph`;
  todayIcon.innerHTML = `<img src="https:${current.condition.icon}" width="80" alt="icon">`;

  applyConditionStyling(current.condition.text);

  // Alerts
  if (current.temp_c > 40) {
    alertsBox.classList.remove('hidden');
    alertsBox.innerHTML = `<strong>Heat Alert:</strong> Temperature above 40°C — stay hydrated!`;
  } else if (current.temp_c < -10) {
    alertsBox.classList.remove('hidden');
    alertsBox.innerHTML = `<strong>Cold Alert:</strong> Temperature below -10°C — keep warm!`;
  }

  // Forecast
  forecastContainer.innerHTML = '';
  data.forecast.forecastday.forEach(day => {
    const d = new Date(day.date);
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    const div = document.createElement('div');
    div.className = 'p-4 rounded-xl shadow card text-center';
    div.innerHTML = `
      <img src="https:${day.day.condition.icon}" width="64" alt="">
      <div class="font-medium mt-1">${dayName}</div>
      <div>Temp: ${Math.round(day.day.avgtemp_c)}°C</div>
      <div class="text-sm">Wind: ${Math.round(day.day.maxwind_kph)} kph</div>
      <div class="text-sm">Humidity: ${day.day.avghumidity}%</div>
    `;
    forecastContainer.appendChild(div);
  });

  showToast('Forecast loaded successfully 🌍');
}

// ====== EVENTS ======
searchBtn.addEventListener('click', () => {
  const city = cityInput.value;
  fetchWeather(city);
});

cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    fetchWeather(cityInput.value);
  }
});

locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) return showError('Geolocation not supported.');
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showError('Location access denied.')
  );
});

unitToggle.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  unitToggle.textContent = `°${unit}`;
  const city = locationName.textContent.split(',')[0];
  if (city && city !== 'Search a city or use location') fetchWeather(city);
});

recentSelect.addEventListener('change', e => {
  if (e.target.value) fetchWeather(e.target.value);
});

// ====== AUTO DETECT ON START ======
window.addEventListener('load', () => {
  renderRecentDropdown();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => showError('Location access denied. Please search a city.')
    );
  } else {
    showError('Geolocation not supported. Please search manually.');
  }
});
