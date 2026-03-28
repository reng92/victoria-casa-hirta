interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  wind: number;
  feelsLike: number;
}

interface Props {
  matchDate: string;
  city: string;
}

async function getWeather(city: string): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return null;

    return {
      temperature: parseInt(current.temp_C),
      feelsLike: parseInt(current.FeelsLikeC),
      description: current.weatherDesc?.[0]?.value ?? "",
      icon: getWeatherEmoji(parseInt(current.weatherCode)),
      humidity: parseInt(current.humidity),
      wind: parseInt(current.windspeedKmph),
    };
  } catch {
    return null;
  }
}

function getWeatherEmoji(code: number): string {
  if (code === 113) return "☀️";
  if (code === 116) return "⛅";
  if (code === 119 || code === 122) return "☁️";
  if ([143, 248, 260].includes(code)) return "🌫️";
  if ([176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 353, 356, 359, 362, 365, 374, 377].includes(code)) return "🌧️";
  if ([179, 182, 185, 227, 230, 323, 326, 329, 332, 335, 338, 350, 368, 371, 395].includes(code)) return "❄️";
  if ([200, 386, 389, 392].includes(code)) return "⛈️";
  return "🌤️";
}

function getMatchDayAdvice(weather: WeatherData): string {
  if (weather.temperature < 5) return "🧤 Freddo intenso, scaldate bene!";
  if (weather.temperature > 32) return "🥵 Caldo estremo, idratarsi molto!";
  if (weather.wind > 40) return "💨 Vento forte, attenzione ai cross!";
  if (weather.description.toLowerCase().includes("rain") || weather.description.toLowerCase().includes("rain")) return "🌧️ Campo potenzialmente pesante";
  if (weather.temperature >= 15 && weather.temperature <= 22) return "✅ Condizioni ideali per giocare!";
  return "⚽ Condizioni nella norma";
}

export default async function WeatherWidget({ matchDate, city }: Props) {
  const weather = await getWeather(city);
  if (!weather) return null;

  const matchDateObj = new Date(matchDate);
  const isToday = new Date().toDateString() === matchDateObj.toDateString();
  const advice = getMatchDayAdvice(weather);

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            {isToday ? "Meteo oggi" : "Meteo a " + city}
          </p>
          <p className="text-xs text-white/50 mt-0.5">{city}</p>
        </div>
        <span className="text-5xl">{weather.icon}</span>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className="text-5xl font-extrabold">{weather.temperature}°</span>
        <div className="pb-1">
          <p className="text-sm font-medium text-white/90">{weather.description}</p>
          <p className="text-xs text-white/60">Percepita {weather.feelsLike}°</p>
        </div>
      </div>

      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-1 text-xs text-white/80">
          <span>💧</span>
          <span>{weather.humidity}% umidità</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/80">
          <span>💨</span>
          <span>{weather.wind} km/h</span>
        </div>
      </div>

      <div className="bg-white/20 rounded-xl px-4 py-2 text-sm font-semibold">
        {advice}
      </div>
    </div>
  );
}
