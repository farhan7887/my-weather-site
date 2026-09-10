"use client";

import { motion } from "framer-motion";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind,
} from "lucide-react";

import type { GeoCity } from "@/lib/geocoding";

type WeatherResponse = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };

  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
};

type HourlyForecast = {
  time: string;
  temperature: number;
  humidity: number;
  precipitationProbability: number;
  weatherCode: number;
};

type Props = {
  city: GeoCity;
  weather: WeatherResponse;
  hourlyForecast: HourlyForecast[];
};

function getWeather(code: number) {
  if (code === 0) {
    return {
      label: "Clear Sky",
      icon: <Sun className="h-20 w-20" />,
    };
  }

  if ([1, 2].includes(code)) {
    return {
      label: "Partly Cloudy",
      icon: <CloudSun className="h-20 w-20" />,
    };
  }

  if (code === 3) {
    return {
      label: "Overcast",
      icon: <Cloud className="h-20 w-20" />,
    };
  }

  if ([45, 48].includes(code)) {
    return {
      label: "Foggy",
      icon: <CloudFog className="h-20 w-20" />,
    };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return {
      label: "Drizzle",
      icon: <CloudDrizzle className="h-20 w-20" />,
    };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return {
      label: "Rainy",
      icon: <CloudRain className="h-20 w-20" />,
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      label: "Snowy",
      icon: <CloudSnow className="h-20 w-20" />,
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      label: "Thunderstorm",
      icon: <CloudLightning className="h-20 w-20" />,
    };
  }

  return {
    label: "Cloudy",
    icon: <Cloud className="h-20 w-20" />,
  };
}

function formatHour(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
  }).format(new Date(date));
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));
}

export default function WeatherCityClient({
  city,
  weather,
  hourlyForecast,
}: Props) {
  const current = weather.current;

  const weatherInfo = getWeather(current.weather_code);

  return (
    <motion.section
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="mx-auto max-w-5xl"
    >
      {/* Main weather card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-2xl"
      >
        <div className="grid md:grid-cols-[1.2fr_0.8fr]">
          {/* Main temperature */}
          <div className="p-7 sm:p-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
              Current conditions
            </p>

            <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <motion.div
                animate={{
                  y: [0, -8, 0],
                  rotate: [0, 4, -4, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 bg-white/10"
              >
                {weatherInfo.icon}
              </motion.div>

              <div>
                <div className="flex items-start">
                  <span className="text-7xl font-black tracking-tighter sm:text-8xl">
                    {Math.round(current.temperature_2m)}
                  </span>

                  <span className="mt-2 text-3xl text-white/50">
                    °C
                  </span>
                </div>

                <p className="mt-1 text-xl font-semibold">
                  {weatherInfo.label}
                </p>

                <p className="mt-1 text-sm text-white/40">
                  Updated {formatHour(current.time)}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 border-t border-white/10 md:border-l md:border-t-0">
            <Stat
              icon={<Droplets className="h-5 w-5" />}
              label="Humidity"
              value={`${current.relative_humidity_2m}%`}
              delay={0.2}
            />

            <Stat
              icon={<Wind className="h-5 w-5" />}
              label="Wind Speed"
              value={`${Math.round(current.wind_speed_10m)} km/h`}
              delay={0.3}
            />

            <Stat
              icon={<CloudSun className="h-5 w-5" />}
              label="Latitude"
              value={city.latitude.toFixed(2)}
              delay={0.4}
            />

            <Stat
              icon={<CloudSun className="h-5 w-5" />}
              label="Longitude"
              value={city.longitude.toFixed(2)}
              delay={0.5}
            />
          </div>
        </div>
      </motion.div>

      {/* Hourly Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8"
      >
        <h2 className="mb-4 text-2xl font-bold">
          Next 24 Hours
        </h2>

        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-3">
            {hourlyForecast.map((hour, index) => {
              const info = getWeather(hour.weatherCode);

              return (
                <motion.div
                  key={hour.time}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.35 + index * 0.025,
                  }}
                  whileHover={{
                    y: -5,
                  }}
                  className="w-[120px] rounded-3xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl"
                >
                  <p className="text-xs text-white/45">
                    {index === 0
                      ? "Now"
                      : formatHour(hour.time)}
                  </p>

                  <div className="my-4 flex justify-center">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: index * 0.05,
                      }}
                    >
                      {info.icon}
                    </motion.div>
                  </div>

                  <p className="text-xl font-bold">
                    {Math.round(hour.temperature)}°
                  </p>

                  <div className="mt-3 flex items-center justify-center gap-1 text-xs text-white/45">
                    <Droplets className="h-3 w-3" />
                    {hour.humidity}%
                  </div>

                  <p className="mt-2 text-xs text-cyan-200/70">
                    {hour.precipitationProbability}% rain
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 7 Day Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-10"
      >
        <h2 className="mb-4 text-2xl font-bold">
          7-Day Forecast
        </h2>

        <div className="space-y-3">
          {weather.daily.time.map((date, index) => {
            const info = getWeather(
              weather.daily.weather_code[index]
            );

            return (
              <motion.div
                key={date}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.55 + index * 0.07,
                }}
                className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl transition hover:bg-white/10 sm:p-5"
              >
                <div className="w-20 font-semibold">
                  {index === 0 ? "Today" : formatDay(date)}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center">
                    {info.icon}
                  </div>

                  <span className="hidden text-sm text-white/50 sm:inline">
                    {info.label}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold">
                    {Math.round(
                      weather.daily.temperature_2m_max[index]
                    )}
                    °
                  </span>

                  <span className="text-white/40">
                    {Math.round(
                      weather.daily.temperature_2m_min[index]
                    )}
                    °
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.section>
  );
}

function Stat({
  icon,
  label,
  value,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="border-white/10 p-6"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        {icon}
      </div>

      <p className="mt-4 text-xs uppercase tracking-wider text-white/40">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </motion.div>
  );
}