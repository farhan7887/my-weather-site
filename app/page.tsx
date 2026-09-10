"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  Navigation,
  Loader2,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog,
  Moon,
  Sunrise,
  Sunset,
} from "lucide-react";
import LocationWeatherCard from "@/components/LocationWeatherCard";

type WeatherData = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    time: string;
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    time: string[];
  };
};

type LocationResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
};

type WeatherInfo = {
  label: string;
  icon: React.ReactNode;
  type: "sunny" | "rainy" | "cloudy" | "snowy" | "storm" | "fog" | "night";
};

const getWeatherInfo = (code: number, isNight = false): WeatherInfo => {
  if (isNight && code === 0) {
    return {
      label: "Clear Night",
      icon: <Moon className="h-20 w-20" />,
      type: "night",
    };
  }

  if (code === 0) {
    return {
      label: "Clear Sky",
      icon: <Sun className="h-20 w-20" />,
      type: "sunny",
    };
  }

  if (code === 1 || code === 2) {
    return {
      label: "Partly Cloudy",
      icon: <CloudSun className="h-20 w-20" />,
      type: "cloudy",
    };
  }

  if (code === 3) {
    return {
      label: "Overcast",
      icon: <Cloud className="h-20 w-20" />,
      type: "cloudy",
    };
  }

  if ([45, 48].includes(code)) {
    return {
      label: "Foggy",
      icon: <CloudFog className="h-20 w-20" />,
      type: "fog",
    };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return {
      label: "Drizzle",
      icon: <CloudRain className="h-20 w-20" />,
      type: "rainy",
    };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return {
      label: "Rainy",
      icon: <CloudRain className="h-20 w-20" />,
      type: "rainy",
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      label: "Snowy",
      icon: <Snowflake className="h-20 w-20" />,
      type: "snowy",
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      label: "Thunderstorm",
      icon: <CloudLightning className="h-20 w-20" />,
      type: "storm",
    };
  }

  return {
    label: "Unknown",
    icon: <Cloud className="h-20 w-20" />,
    type: "cloudy",
  };
};

const getBackground = (type: WeatherInfo["type"]) => {
  switch (type) {
    case "sunny":
      return "from-orange-400 via-amber-500 to-yellow-600";

    case "rainy":
      return "from-slate-700 via-blue-800 to-slate-900";

    case "storm":
      return "from-slate-900 via-indigo-950 to-purple-950";

    case "snowy":
      return "from-sky-300 via-blue-400 to-indigo-500";

    case "fog":
      return "from-slate-400 via-slate-500 to-gray-700";

    case "night":
      return "from-slate-950 via-indigo-950 to-black";

    default:
      return "from-sky-400 via-blue-600 to-indigo-700";
  }
};

const formatDate = (date: string) => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
};

const formatTime = (date: string) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
};

export default function Home() {
  const [city, setCity] = useState("");
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isNight = useMemo(() => {
    if (!weather?.current.time) return false;

    const hour = new Date(weather.current.time).getHours();

    return hour < 6 || hour >= 19;
  }, [weather]);

  const weatherInfo = useMemo(() => {
    if (!weather) return null;

    return getWeatherInfo(weather.current.weather_code, isNight);
  }, [weather, isNight]);

  const background = weatherInfo
    ? getBackground(weatherInfo.type)
    : "from-slate-950 via-blue-950 to-indigo-950";

  const searchWeather = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const searchCity = city.trim();

    if (!searchCity) {
      setError("Please enter a city name.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      setWeather(null);
      setLocation(null);

      // 1. Find city coordinates
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchCity
        )}&count=1&language=en&format=json`
      );

      if (!geoResponse.ok) {
        throw new Error("Unable to find the location.");
      }

      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(
          `No location found for "${searchCity}". Please try another city.`
        );
      }

      const result: LocationResult = geoData.results[0];

      setLocation(result);

      // 2. Fetch weather using latitude/longitude
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${result.latitude}&longitude=${result.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`
      );

      if (!weatherResponse.ok) {
        throw new Error("Unable to fetch weather data.");
      }

      const weatherData: WeatherData = await weatherResponse.json();

      setWeather(weatherData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className={`min-h-screen bg-gradient-to-br ${background} text-white transition-all duration-1000`}
    >
      {/* Background decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 80, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, -70, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-40 -right-40 h-[30rem] w-[30rem] rounded-full bg-cyan-300/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
              <Sun className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                SkyCast
              </h1>
              <p className="hidden text-xs text-white/60 sm:block">
                Modern weather intelligence
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-xl sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live weather
          </div>
        </motion.header>

        {/* Hero */}
        <section className="mx-auto flex max-w-4xl flex-col items-center pb-12 pt-20 text-center sm:pt-28">
          <AnimatePresence mode="wait">
            {!weather && !loading && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="w-full"
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-xl">
                  <MapPin className="h-4 w-4" />
                  Real-time weather worldwide
                </div>

                <h2 className="text-5xl font-black tracking-tight sm:text-7xl">
                  Weather,
                  <br />
                  <span className="bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
                    beautifully simple.
                  </span>
                </h2>

                <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                  Search any city and get accurate current conditions,
                  temperature, humidity, wind speed, and a simple forecast.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-10"
              >
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-white" />

                <p className="mt-5 text-lg text-white/80">
                  Looking outside for you...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search */}
          <motion.form
            onSubmit={searchWeather}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-10 w-full max-w-2xl"
          >
            <div className="group flex items-center rounded-3xl border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-2xl transition-all duration-300 focus-within:border-white/40 focus-within:bg-white/15">
              <MapPin className="ml-4 h-5 w-5 shrink-0 text-white/60" />

              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Search for a city..."
                className="w-full bg-transparent px-4 py-4 text-base text-white outline-none placeholder:text-white/45"
                type="text"
              />

              <button
                disabled={loading}
                type="submit"
                className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-5 font-semibold text-slate-900 transition-all duration-300 hover:scale-[1.03] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span className="hidden sm:inline">Search</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 px-5 py-3 text-sm text-red-100 backdrop-blur-xl"
            >
              {error}
            </motion.div>
          )}

          {!weather && !loading && (
            <LocationWeatherCard />
          )}
        </section>

        {/* Weather result */}
        <AnimatePresence>
          {weather && location && weatherInfo && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                ease: "easeOut",
              }}
              className="mx-auto max-w-5xl pb-20"
            >
              {/* Location */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-5 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-white/70" />

                    <h3 className="text-2xl font-bold">
                      {location.name}
                    </h3>
                  </div>

                  <p className="ml-7 mt-1 text-sm text-white/60">
                    {[location.admin1, location.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                <div className="hidden text-right sm:block">
                  <p className="text-sm text-white/50">Local time</p>
                  <p className="font-medium">
                    {formatTime(weather.current.time)}
                  </p>
                </div>
              </motion.div>

              {/* Main weather card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-2xl"
              >
                <div className="grid md:grid-cols-[1.2fr_0.8fr]">
                  {/* Temperature */}
                  <div className="relative p-7 sm:p-10">
                    <div className="absolute right-5 top-5 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
                      Current weather
                    </p>

                    <div className="mt-8 flex items-center gap-5">
                      <motion.div
                        animate={{
                          y: [0, -8, 0],
                          rotate:
                            weatherInfo.type === "sunny"
                              ? [0, 8, -8, 0]
                              : 0,
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 shadow-xl"
                      >
                        {weatherInfo.icon}
                      </motion.div>

                      <div>
                        <div className="flex items-start">
                          <span className="text-7xl font-black tracking-tighter sm:text-8xl">
                            {Math.round(weather.current.temperature_2m)}
                          </span>

                          <span className="mt-2 text-3xl font-medium text-white/70">
                            °C
                          </span>
                        </div>

                        <p className="mt-1 text-xl font-medium text-white/90">
                          {weatherInfo.label}
                        </p>
                      </div>
                    </div>

                    <div className="mt-10 flex flex-wrap gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <Thermometer className="h-4 w-4" />
                          Feels like
                        </div>

                        <p className="mt-1 font-semibold">
                          {Math.round(weather.current.temperature_2m)}°C
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <Navigation className="h-4 w-4" />
                          Coordinates
                        </div>

                        <p className="mt-1 font-semibold">
                          {location.latitude.toFixed(2)},{" "}
                          {location.longitude.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 border-t border-white/10 md:border-l md:border-t-0">
                    <WeatherStat
                      icon={<Droplets className="h-6 w-6" />}
                      label="Humidity"
                      value={`${weather.current.relative_humidity_2m}%`}
                      delay={0.2}
                    />

                    <WeatherStat
                      icon={<Wind className="h-6 w-6" />}
                      label="Wind speed"
                      value={`${Math.round(
                        weather.current.wind_speed_10m
                      )} km/h`}
                      delay={0.3}
                    />

                    <WeatherStat
                      icon={<Thermometer className="h-6 w-6" />}
                      label="High"
                      value={`${Math.round(
                        weather.daily.temperature_2m_max[0]
                      )}°C`}
                      delay={0.4}
                    />

                    <WeatherStat
                      icon={<CloudSun className="h-6 w-6" />}
                      label="Low"
                      value={`${Math.round(
                        weather.daily.temperature_2m_min[0]
                      )}°C`}
                      delay={0.5}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Forecast */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mt-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">7-day outlook</h3>
                    <p className="mt-1 text-sm text-white/50">
                      A quick look at the days ahead
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {weather.daily.time.slice(0, 7).map((date, index) => {
                    const forecastInfo = getWeatherInfo(
                      weather.daily.weather_code[index]
                    );

                    return (
                      <motion.div
                        key={date}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.4 + index * 0.07,
                        }}
                        whileHover={{
                          y: -5,
                          scale: 1.02,
                        }}
                        className="rounded-3xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur-xl"
                      >
                        <p className="text-xs font-medium text-white/50">
                          {index === 0 ? "Today" : formatDate(date)}
                        </p>

                        <motion.div
                          animate={{
                            y: [0, -3, 0],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            delay: index * 0.15,
                          }}
                          className="my-4 flex justify-center"
                        >
                          {forecastInfo.icon}
                        </motion.div>

                        <p className="text-sm font-medium">
                          {forecastInfo.label}
                        </p>

                        <div className="mt-3 flex justify-center gap-2 text-sm">
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

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-xl"
              >
                <p className="text-sm text-white/60">
                  Weather data provided by Open-Meteo. Temperatures are shown
                  in Celsius and wind speed in km/h.
                </p>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Empty-state features */}
        {!weather && !loading && !error && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mx-auto grid max-w-4xl gap-4 pb-20 sm:grid-cols-3"
          >
            <FeatureCard
              icon={<Navigation className="h-6 w-6" />}
              title="Worldwide"
              description="Search cities anywhere around the globe."
            />

            <FeatureCard
              icon={<Wind className="h-6 w-6" />}
              title="Live Conditions"
              description="Get current temperature, humidity and wind."
            />

            <FeatureCard
              icon={<Sunrise className="h-6 w-6" />}
              title="Simple Forecast"
              description="See a clean 7-day weather outlook."
            />
          </motion.section>
        )}

        {/* Footer */}
        <footer className="border-t border-white/10 py-6 text-center text-sm text-white/40">
          Made by farri student of comsats university Islamabad. All weather data is provided securely
          All rights reserved. &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}

function WeatherStat({
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
      className="flex min-h-[160px] flex-col justify-center border-white/10 p-6 first:border-r last:border-l even:border-l md:min-h-0"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white/80">
        {icon}
      </div>

      <p className="mt-5 text-xs uppercase tracking-wider text-white/45">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">{value}</p>
    </motion.div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
        {icon}
      </div>

      <h3 className="mt-5 font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-white/50">
        {description}
      </p>
    </motion.div>
  );
}