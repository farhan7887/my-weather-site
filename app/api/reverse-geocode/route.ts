import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocoding";

interface WeatherResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    if (!latParam || !lonParam) {
      return NextResponse.json(
        { error: "Latitude and longitude are required." },
        { status: 400 }
      );
    }

    const latitude = Number(latParam);
    const longitude = Number(lonParam);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude." },
        { status: 400 }
      );
    }

    // Reverse-geocode the user's coordinates.
    const city = await reverseGeocode(latitude, longitude);

    if (!city) {
      console.error(
        "reverseGeocode returned null for:",
        latitude,
        longitude
      );

      return NextResponse.json(
        { error: "Unable to determine your city." },
        { status: 404 }
      );
    }

    // Fetch current weather for the detected location.
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${encodeURIComponent(latitude)}` +
      `&longitude=${encodeURIComponent(longitude)}` +
      `&current=temperature_2m,weather_code,relative_humidity_2m` +
      `&timezone=auto`;

    let weatherResponse: Response;

    try {
      weatherResponse = await fetch(weatherUrl, {
        next: {
          revalidate: 3600,
        },
      });
    } catch (fetchErr) {
      console.error("Open-Meteo fetch threw an error:", fetchErr);

      return NextResponse.json(
        { error: "Unable to reach weather service." },
        { status: 502 }
      );
    }

    if (!weatherResponse.ok) {
      const errorBody = await weatherResponse.text().catch(() => "");
      console.error(
        "Open-Meteo weather fetch failed:",
        weatherResponse.status,
        errorBody
      );

      return NextResponse.json(
        { error: "Unable to fetch current weather." },
        { status: 502 }
      );
    }

    const weatherData: WeatherResponse =
      await weatherResponse.json();

    const current = weatherData.current;

    if (
      !current ||
      typeof current.temperature_2m !== "number" ||
      typeof current.weather_code !== "number" ||
      typeof current.relative_humidity_2m !== "number"
    ) {
      console.error(
        "Invalid weather data shape received:",
        JSON.stringify(weatherData)
      );

      return NextResponse.json(
        { error: "Invalid weather data received." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      city,
      weather: {
        temperature: current.temperature_2m,
        weatherCode: current.weather_code,
        humidity: current.relative_humidity_2m,
      },
    });
  } catch (error) {
    console.error("Reverse geocode API error:", error);

    return NextResponse.json(
      { error: "Unable to detect weather for your location." },
      { status: 500 }
    );
  }
}