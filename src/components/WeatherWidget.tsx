import { CloudRain, Droplets, Wind } from "lucide-react";

interface WeatherData {
  temperature: number;
  rain: boolean;
  rainChance: number;
  description: string;
  icon: string;
  humidity: number;
  wind: number;
  feelsLike: number;
}

interface Props {
  matchDate: string;
  city: string;
  /** "chip" = riga compatta per l'hero; "card" = blocco completo. */
  variant?: "chip" | "card";
}

// wttr.in dà le previsioni per oggi e i due giorni successivi, a fasce di 3 ore
interface WttrHour {
  time: string;
  tempC: string;
  FeelsLikeC: string;
  humidity: string;
  windspeedKmph: string;
  chanceofrain: string;
  weatherCode: string;
  lang_it?: { value: string }[];
  weatherDesc?: { value: string }[];
}

/**
 * Previsioni per il giorno e l'ora della partita. match_date è salvato con
 * l'orario locale scritto come UTC (14:30 → 14:30Z), quindi si leggono le
 * parti UTC; anche wttr.in usa l'ora locale della città.
 * Null se la partita è oltre i giorni coperti dalle previsioni.
 */
async function getForecast(city: string, matchDate: string): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=it`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const day = (data.weather as { date: string; hourly: WttrHour[] }[] | undefined)?.find(
      (d) => d.date === matchDate.slice(0, 10)
    );
    if (!day?.hourly?.length) return null;

    const match = new Date(matchDate);
    const minutes = match.getUTCHours() * 60 + match.getUTCMinutes();
    const hour = day.hourly.reduce((best, h) => {
      const diff = (h: WttrHour) => Math.abs(Math.floor(Number(h.time) / 100) * 60 - minutes);
      return diff(h) < diff(best) ? h : best;
    });

    const code = parseInt(hour.weatherCode);
    return {
      temperature: parseInt(hour.tempC),
      feelsLike: parseInt(hour.FeelsLikeC),
      // Con lang=it wttr.in mette la descrizione tradotta in lang_it
      description: (hour.lang_it?.[0]?.value ?? hour.weatherDesc?.[0]?.value ?? "").trim(),
      icon: getWeatherEmoji(code),
      rain: RAIN_CODES.includes(code) || STORM_CODES.includes(code),
      rainChance: parseInt(hour.chanceofrain) || 0,
      humidity: parseInt(hour.humidity),
      wind: parseInt(hour.windspeedKmph),
    };
  } catch {
    return null;
  }
}

const RAIN_CODES = [176, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 353, 356, 359, 362, 365, 374, 377];
const STORM_CODES = [200, 386, 389, 392];

function getWeatherEmoji(code: number): string {
  if (code === 113) return "☀️";
  if (code === 116) return "⛅";
  if (code === 119 || code === 122) return "☁️";
  if ([143, 248, 260].includes(code)) return "🌫️";
  if (RAIN_CODES.includes(code)) return "🌧️";
  if ([179, 182, 185, 227, 230, 323, 326, 329, 332, 335, 338, 350, 368, 371, 395].includes(code)) return "❄️";
  if (STORM_CODES.includes(code)) return "⛈️";
  return "🌤️";
}

function getMatchDayAdvice(weather: WeatherData): string {
  if (weather.temperature < 5) return "Freddo intenso, scaldate bene!";
  if (weather.temperature > 32) return "Caldo estremo, idratarsi molto!";
  if (weather.wind > 40) return "Vento forte, attenzione ai cross!";
  if (weather.rain || weather.rainChance >= 60) return "Campo potenzialmente pesante";
  if (weather.temperature >= 15 && weather.temperature <= 22) return "Condizioni ideali per giocare!";
  return "Condizioni nella norma";
}

/** "oggi", "domani" o il giorno della settimana, confrontando le date di calendario. */
function dayLabel(matchDate: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
  const days = Math.round((Date.parse(matchDate.slice(0, 10)) - Date.parse(today)) / 86_400_000);
  if (days === 0) return "oggi";
  if (days === 1) return "domani";
  return new Date(matchDate).toLocaleDateString("it-IT", { weekday: "long", timeZone: "UTC" });
}

export default async function WeatherWidget({ matchDate, city, variant = "card" }: Props) {
  const weather = await getForecast(city, matchDate);
  const when = `${dayLabel(matchDate)} alle ${new Date(matchDate).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}`;

  if (!weather) {
    if (variant === "chip") return null;
    return (
      <div className="bento-card p-5 text-sm text-muted">
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1">Meteo a {city}</p>
        Le previsioni per la partita compaiono due giorni prima.
      </div>
    );
  }

  const advice = getMatchDayAdvice(weather);

  if (variant === "chip") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 backdrop-blur px-3 py-1.5 text-xs text-white/90">
        <span aria-hidden>{weather.icon}</span>
        <span className="font-semibold tabular">{weather.temperature}°</span>
        <span className="text-white/60">·</span>
        <span className="text-white/80 truncate max-w-[160px]">{weather.description || advice}</span>
      </div>
    );
  }

  return (
    <div className="bento-card p-5 bg-gradient-to-br from-brand to-surface text-text">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Previsioni per la partita</p>
          <p className="text-xs text-muted mt-0.5">{city} · {when}</p>
        </div>
        <span className="text-4xl" aria-hidden>{weather.icon}</span>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className="font-display text-5xl font-bold tabular leading-none">{weather.temperature}°</span>
        <div className="pb-0.5">
          <p className="text-sm font-medium">{weather.description}</p>
          <p className="text-xs text-muted">Percepita {weather.feelsLike}°</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1"><CloudRain className="w-3.5 h-3.5" aria-hidden />{weather.rainChance}% pioggia</span>
        <span className="inline-flex items-center gap-1"><Droplets className="w-3.5 h-3.5" aria-hidden />{weather.humidity}% umidità</span>
        <span className="inline-flex items-center gap-1"><Wind className="w-3.5 h-3.5" aria-hidden />{weather.wind} km/h</span>
      </div>

      <div className="rounded-xl bg-surface-2/70 border border-border px-4 py-2 text-sm font-semibold">
        {advice}
      </div>
    </div>
  );
}
