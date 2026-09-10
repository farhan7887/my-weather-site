"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  ArrowRight,
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  Snowflake,
  CloudLightning,
} from "lucide-react";
import { createCitySlug } from "@/lib/geocoding";

interface GeoCity {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

interface LocationWeatherData {
  city: GeoCity;
  weather: {
    temperature: number;
    weatherCode: number;
    humidity: number;
  };
}

type LocationState = "loading" | "success" | "error";

function getWeatherLabel(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code >= 1 && code <= 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rainy";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snowy";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Cloudy";
}

function WeatherIcon({ code }: { code: number }) {
  const className = "h-9 w-9 text-white/90";

  if (code === 0) return <Sun className={className} />;
  if (code >= 1 && code <= 2) return <CloudSun className={className} />;
  if (code === 3) return <Cloud className={className} />;
  if (code === 45 || code === 48) return <CloudFog className={className} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className={className} />;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return <CloudRain className={className} />;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return <Snowflake className={className} />;
  if (code >= 95 && code <= 99) return <CloudLightning className={className} />;
  return <Cloud className={className} />;
}

export default function LocationWeatherCard() {
  const [state, setState] = useState<LocationState>("loading");
  const [data, setData] = useState<LocationWeatherData | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await fetch(
            `/api/reverse-geocode?lat=${encodeURIComponent(
              latitude
            )}&lon=${encodeURIComponent(longitude)}`
          );

          if (!response.ok) {
            throw new Error("Unable to detect location weather.");
          }

          const result: LocationWeatherData = await response.json();

          if (!result.city || !result.weather) {
            throw new Error("Invalid location response.");
          }

          setData(result);
          setState("success");
        } catch (error) {
          console.error("Location weather fetch failed:", error);
          setState("error");
        }
      },
      (error) => {
        console.log("Geolocation unavailable:", error.message);
        setState("error");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  if (state === "error") {
    return null;
  }

  if (state === "loading") {
    return (
      <div className="mx-auto mt-8 flex max-w-2xl items-center justify-center">
        <div
          className="flex items-center gap-2 text-sm text-white/40"
          aria-live="polite"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          Detecting your location...
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { city, weather } = data;
  const slug = createCitySlug(city.name, city.country);
  const weatherLabel = getWeatherLabel(weather.weatherCode);

  return (
    <div className="mx-auto mt-8 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-blue-950/20 backdrop-blur-xl transition-all duration-500 hover:border-white/20 hover:bg-white/[0.07]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/50">
            <MapPin className="h-4 w-4 text-cyan-300" />
            Your Location
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {city.name}
              </h2>

              <p className="mt-1 text-sm text-white/45">
                {city.admin1
                  ? `${city.admin1}, ${city.country}`
                  : city.country}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <WeatherIcon code={weather.weatherCode} />

              <div>
                <div className="text-4xl font-black tracking-tight text-white">
                  {Math.round(weather.temperature)}°C
                </div>

                <p className="text-sm text-white/50">{weatherLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/40">
              Humidity{" "}
              <span className="font-semibold text-white/70">
                {weather.humidity}%
              </span>
            </p>

            <Link
              href={`/weather/${slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition-all duration-300 hover:bg-white/15 hover:text-white"
            >
              View full forecast
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}