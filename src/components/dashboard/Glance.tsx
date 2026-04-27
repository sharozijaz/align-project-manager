import { Cloud, CloudRain, CloudSun, Sun } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";

interface WeatherState {
  temperature?: number;
  label: string;
  icon: "sun" | "cloud-sun" | "cloud" | "rain";
}

const defaultCoords = { latitude: 24.8607, longitude: 67.0011 };

function weatherLabel(code: number): WeatherState {
  if (code === 0) return { label: "Clear", icon: "sun" };
  if ([1, 2].includes(code)) return { label: "Partly cloudy", icon: "cloud-sun" };
  if ([3, 45, 48].includes(code)) return { label: "Cloudy", icon: "cloud" };
  if (code >= 51 && code <= 99) return { label: "Rain", icon: "rain" };
  return { label: "Live weather", icon: "cloud-sun" };
}

function WeatherIcon({ icon }: { icon: WeatherState["icon"] }) {
  if (icon === "rain") return <CloudRain size={18} />;
  if (icon === "cloud") return <Cloud size={18} />;
  if (icon === "cloud-sun") return <CloudSun size={18} />;
  return <Sun size={18} />;
}

async function fetchWeather(latitude: number, longitude: number): Promise<WeatherState> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error("Weather request failed");
  const data = (await response.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const code = data.current?.weather_code ?? 1;
  return { ...weatherLabel(code), temperature: data.current?.temperature_2m };
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      maximumAge: 1000 * 60 * 20,
      timeout: 8000,
    });
  });
}

export function Glance() {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<WeatherState>({ label: "Loading weather", icon: "cloud-sun" });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const updateWeather = async () => {
      try {
        const position = await getPosition().catch(() => null);
        const coords = position
          ? { latitude: position.coords.latitude, longitude: position.coords.longitude }
          : defaultCoords;
        const liveWeather = await fetchWeather(coords.latitude, coords.longitude);
        if (mounted) setWeather(liveWeather);
      } catch {
        if (mounted) setWeather({ label: "Weather unavailable", icon: "cloud" });
      }
    };

    updateWeather();
    const timer = window.setInterval(updateWeather, 1000 * 60 * 10);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-3 text-right text-xl font-medium">
      <p>{format(now, "h:mma")}</p>
      <p>{format(now, "d MMMM yyyy")}</p>
      <p className="inline-flex items-center justify-end gap-2">
        {typeof weather.temperature === "number" ? `${Math.round(weather.temperature)}C` : weather.label}
        <WeatherIcon icon={weather.icon} />
      </p>
      {typeof weather.temperature === "number" ? <p className="text-sm text-white/70">{weather.label}</p> : null}
    </div>
  );
}
