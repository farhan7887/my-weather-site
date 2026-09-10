import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  MapPin,
} from "lucide-react";

import { cities, getCityBySlug } from "@/data/cities";
import WeatherCityClient from "@/components/WeatherCityClient";
// Simple concurrency limiter
let activeRequests = 0;
const MAX_CONCURRENT = 3;

async function waitForSlot() {
  while (activeRequests >= MAX_CONCURRENT) {
    await new Promise((r) => setTimeout(r, 200));
  }
  activeRequests++;
}

type PageProps = {
  params: Promise<{
    city: string;
  }>;
};

type WeatherResponse = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };

  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };

  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
};

export const revalidate = 3600;

export function generateStaticParams() {
  return cities.slice(0, 10).map((city) => ({
    city: city.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { city: citySlug } = await params;

  const city = getCityBySlug(citySlug);

  if (!city) {
    return {
      title: "Weather Forecast | SkyCast",
      description: "Live weather forecasts and conditions across Pakistan.",
    };
  }

  return {
    title: `${city.name} Weather Today - Live Forecast, Temperature & Humidity`,

    description: `Get accurate live weather updates for ${city.name}, ${city.province}, including hourly forecast, 7-day forecast, temperature, humidity and wind speed.`,

    keywords: [
      `${city.name} weather`,
      `${city.name} weather today`,
      `${city.name} temperature`,
      `${city.name} forecast`,
      `${city.name} humidity`,
      `${city.name} weather forecast`,
    ],

    alternates: {
      canonical: `/weather/${city.slug}`,
    },

    openGraph: {
      title: `${city.name} Weather Today | SkyCast`,
      description: `Live weather forecast for ${city.name} including temperature, humidity, wind and a 7-day forecast.`,
      type: "website",
      url: `/weather/${city.slug}`,
      siteName: "SkyCast",
    },

    twitter: {
      card: "summary_large_image",
      title: `${city.name} Weather Today | SkyCast`,
      description: `Check the latest weather conditions and forecast for ${city.name}.`,
    },
  };
}


  async function getWeather(
  latitude: number,
  longitude: number,
  retries = 3
): Promise<WeatherResponse> {
  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
    `&forecast_days=7` +
    `&timezone=auto`;

  await waitForSlot();

  try {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(20000),
        });

        if (!response.ok) {
          throw new Error(`Open-Meteo returned ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    throw new Error("Unreachable");
  } finally {
    activeRequests--;
  }
}

  

export default async function WeatherCityPage({
  params,
}: PageProps) {
  const { city: citySlug } = await params;

  const city = getCityBySlug(citySlug);

  if (!city) {
    notFound();
  }

  let weather: WeatherResponse;

  try {
  weather = await getWeather(city.latitude, city.longitude);
} catch (err) {
  console.error(`Weather fetch failed for ${city.slug}:`, err);
  throw new Error("Unable to load weather data.");
}
  /*
   * JSON-LD structured data.
   *
   * This gives search engines structured information about
   * the weather page.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WeatherForecast",

    name: `${city.name} Weather Forecast`,

    description: `Current weather and 7-day weather forecast for ${city.name}, ${city.province}, Pakistan.`,

    url: `https://knowaboutweather.vercel.app/weather/${city.slug}`,

    spatialCoverage: {
      "@type": "Place",
      name: city.name,

      geo: {
        "@type": "GeoCoordinates",
        latitude: city.latitude,
        longitude: city.longitude,
      },
    },

    dateModified: weather.current.time,

    temperature: {
      "@type": "QuantitativeValue",
      value: weather.current.temperature_2m,
      unitCode: "CEL",
    },
  };

  /*
   * Select the next 24 hours from Open-Meteo hourly data.
   */
  const currentTime = new Date(weather.current.time).getTime();

  const hourlyForecast = weather.hourly.time
    .map((time, index) => ({
      time,
      temperature: weather.hourly.temperature_2m[index],
      humidity: weather.hourly.relative_humidity_2m[index],
      precipitationProbability:
        weather.hourly.precipitation_probability[index],
      weatherCode: weather.hourly.weather_code[index],
    }))
    .filter((item) => {
      const itemTime = new Date(item.time).getTime();

      return (
        itemTime >= currentTime &&
        itemTime <= currentTime + 24 * 60 * 60 * 1000
      );
    })
    .slice(0, 24);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <main className="min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white">
        {/* Background decoration */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full bg-blue-500/10 blur-[120px]" />

          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[140px]" />

          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          {/* Header */}
          <header className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl">
                <CloudSun className="h-6 w-6" />
              </div>

              <div>
                <div className="text-lg font-bold tracking-tight">
                  SkyCast
                </div>

                <div className="hidden text-xs text-white/45 sm:block">
                  Modern weather intelligence
                </div>
              </div>
            </Link>

            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-xl transition hover:bg-white/15"
            >
              Search another city
            </Link>
          </header>

          {/* City Hero */}
          <section className="mx-auto max-w-5xl pb-10 pt-16 text-center sm:pt-20">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur-xl">
              <MapPin className="h-4 w-4" />
              {city.province}, Pakistan
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
              {city.name} Weather
              <span className="block bg-gradient-to-r from-white via-cyan-100 to-blue-300 bg-clip-text text-transparent">
                Today & 7-Day Forecast
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
              Get the latest weather conditions in {city.name}, including
              temperature, humidity, wind speed, hourly weather and the
              upcoming 7-day forecast.
            </p>
          </section>

          {/* Animated weather UI */}
          <WeatherCityClient
            city={city}
            weather={weather}
            hourlyForecast={hourlyForecast}
          />

          {/* Nearby Cities */}
          <section className="mx-auto mt-16 max-w-5xl pb-16">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                Nearby Cities
              </h2>

              <p className="mt-1 text-sm text-white/50">
                Explore weather forecasts for other cities in Pakistan.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {cities
                .filter((item) => item.slug !== city.slug)
                .sort(() => 0.5 - Math.random())
                .slice(0, 6)
                .map((nearbyCity) => (
                  <Link
                    key={nearbyCity.slug}
                    href={`/weather/${nearbyCity.slug}`}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
                  >
                    <MapPin className="mb-3 h-5 w-5 text-white/50 transition group-hover:text-white" />

                    <p className="font-semibold">
                      {nearbyCity.name}
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      {nearbyCity.province}
                    </p>
                  </Link>
                ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-white/10 py-6 text-center text-sm text-white/35">
            Weather data provided by Open-Meteo. Forecasts are updated
            periodically.
          </footer>
        </div>
      </main>
    </>
  );
}