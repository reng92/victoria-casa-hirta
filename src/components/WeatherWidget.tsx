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

// Previsioni di 3bmeteo: pagina oraria della città, oggi (/meteo/<città>) e i
// 7 giorni successivi (/meteo/<città>/<n>), una riga per ogni ora.
const CITY_SLUGS: Record<string, string> = {
  "cancello scalo": "san+felice+a+cancello",
};

function citySlug(city: string) {
  const key = city.trim().toLowerCase();
  return CITY_SLUGS[key] ?? key.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/'/g, "").replace(/\s+/g, "+");
}

/** Giorni di calendario tra oggi (ora di Roma) e la data della partita. */
function daysFromToday(matchDate: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
  return Math.round((Date.parse(matchDate.slice(0, 10)) - Date.parse(today)) / 86_400_000);
}

const cellText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const firstInt = (text: string | undefined) => {
  const m = text?.match(/-?\d+/);
  return m ? parseInt(m[0]) : 0;
};

/**
 * Previsioni per il giorno e l'ora della partita. match_date è salvato con
 * l'orario locale scritto come UTC (14:30 → 14:30Z), quindi si leggono le
 * parti UTC; anche 3bmeteo usa l'ora italiana.
 * Null se la partita è oltre i giorni coperti o la pagina non si legge.
 */
async function getForecast(city: string, matchDate: string): Promise<WeatherData | null> {
  try {
    const days = daysFromToday(matchDate);
    if (days < 0 || days > 7) return null;
    const res = await fetch(
      `https://www.3bmeteo.com/meteo/${citySlug(city)}${days > 0 ? `/${days}` : ""}`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const html = await res.text();

    const rows = html
      .split("forecast-table-exp__hour-cell")
      .slice(1)
      .map((chunk) => {
        const row = chunk.split("</tr>")[0];
        const time = row.match(/lead-time">(\d{1,2}):(\d{2})/);
        const icon = row.match(/set_icone\/\d+\/(\w+)\.svg"\s+alt="([^"]*)"/);
        // Il pezzo parte dentro la cella dell'ora, quindi le <td> complete sono:
        // tempo, temp, precipitazioni, probabilità, vento, raffica, UR, pressione, T.perc.
        const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => cellText(m[1]));
        if (!time || cells.length < 9) return null;
        return {
          minutes: Number(time[1]) * 60 + Number(time[2]),
          night: icon?.[1]?.endsWith("n") ?? false,
          description: cells[0] || icon?.[2] || "",
          temperature: firstInt(cells[1]),
          precipitation: cells[2],
          rainChance: firstInt(cells[3]),
          wind: firstInt(cells[4]),
          humidity: firstInt(cells[6]),
          feelsLike: firstInt(cells[8]),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (!rows.length) return null;

    const match = new Date(matchDate);
    const minutes = match.getUTCHours() * 60 + match.getUTCMinutes();
    const hour = rows.reduce((best, r) => (Math.abs(r.minutes - minutes) < Math.abs(best.minutes - minutes) ? r : best));

    const desc = hour.description.toLowerCase();
    const wet = /pioggia|piogge|pioviggin|rovesc|acquazz|temporal/.test(desc);
    return {
      temperature: hour.temperature,
      feelsLike: hour.feelsLike,
      description: hour.description.charAt(0).toUpperCase() + hour.description.slice(1),
      icon: getWeatherEmoji(desc, hour.night),
      rain: wet || (!!hour.precipitation && !/assent/i.test(hour.precipitation) && /\d/.test(hour.precipitation)),
      rainChance: hour.rainChance,
      humidity: hour.humidity,
      wind: hour.wind,
    };
  } catch {
    return null;
  }
}

function getWeatherEmoji(desc: string, night: boolean): string {
  if (/temporal/.test(desc)) return "⛈️";
  if (/neve|nevischio/.test(desc)) return "❄️";
  if (/pioggia|piogge|pioviggin|rovesc|acquazz/.test(desc)) return "🌧️";
  if (/nebbi|foschi/.test(desc)) return "🌫️";
  if (/sereno|soleggiato|limpido/.test(desc)) return night ? "🌙" : "☀️";
  if (/poco nuvoloso|nubi sparse|parz|velat/.test(desc)) return night ? "☁️" : "⛅";
  if (/nuvol|copert/.test(desc)) return "☁️";
  return night ? "🌙" : "🌤️";
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
        Le previsioni per la partita compaiono una settimana prima.
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
