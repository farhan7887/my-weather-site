// lib/geocoding.ts

/**
 * A normalized city/location returned by the geocoding services.
 */
export interface GeoCity {
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

/**
 * Open-Meteo geocoding API response.
 */
interface OpenMeteoGeocodingResponse {
  results?: Array<{
    id: number;
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
}

/**
 * OpenStreetMap Nominatim reverse-geocoding response.
 */
interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
}

/**
 * Search for cities worldwide using the Open-Meteo Geocoding API.
 */
export async function searchCities(query: string): Promise<GeoCity[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(trimmedQuery);

    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodedQuery}&count=8&language=en&format=json`,
      {
        next: {
          revalidate: 86400,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data: OpenMeteoGeocodingResponse = await response.json();

    if (!Array.isArray(data.results)) {
      return [];
    }

    return data.results
      .filter(
        (result) =>
          typeof result.name === "string" &&
          typeof result.country === "string" &&
          typeof result.latitude === "number" &&
          typeof result.longitude === "number"
      )
      .map((result) => ({
        name: result.name,
        country: result.country,
        admin1: result.admin1,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
  } catch {
    return [];
  }
}

/**
 * Find a city from a city--country slug.
 *
 * Slug format: "paris--france", "new-york--united-states"
 * The "--" separates the city name part from the country part,
 * so multi-word names and countries never get mixed up.
 */
export async function getCityBySlug(
  slug: string
): Promise<GeoCity | null> {
  const trimmedSlug = slug.trim();

  if (!trimmedSlug) {
    return null;
  }

  // Split on the double-dash separator.
  const [namePart, countryPart] = trimmedSlug.split("--");

  const nameQuery = (namePart ?? "").replace(/-/g, " ").trim();
  const countryQuery = (countryPart ?? "").replace(/-/g, " ").trim();

  if (!nameQuery) {
    return null;
  }

  // Search using ONLY the city name — this is what the API expects.
  const results = await searchCities(nameQuery);

  if (results.length === 0) {
    return null;
  }

  // If we have a country part, try to find a result whose country matches.
  if (countryQuery) {
    const matched = results.find(
      (result) =>
        result.country.toLowerCase() === countryQuery.toLowerCase()
    );

    if (matched) {
      return matched;
    }
  }

  // Fallback: best/first match from the API.
  return results[0];
}

/**
 * Reverse-geocode coordinates using OpenStreetMap Nominatim.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeoCity | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(
        latitude
      )}&lon=${encodeURIComponent(longitude)}&format=json`,
      {
        headers: {
          "User-Agent": "SkyCast-Weather-App",
        },
        next: {
          revalidate: 86400,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: NominatimResponse = await response.json();

    const address = data.address;

    if (!address) {
      return null;
    }

    const cityName = address.city ?? address.town ?? address.village;

    if (!cityName || !address.country) {
      return null;
    }

    return {
      name: cityName,
      country: address.country,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Create a URL-safe slug from a city and country name.
 *
 * Uses "--" to separate the city-name part from the country part,
 * so they can always be split back apart unambiguously.
 *
 * Examples:
 *   createCitySlug("Paris", "France") -> "paris--france"
 *   createCitySlug("New York", "United States") -> "new-york--united-states"
 */
function slugifyPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createCitySlug(name: string, country: string): string {
  const namePart = slugifyPart(name);
  const countryPart = slugifyPart(country);

  return `${namePart}--${countryPart}`;
}