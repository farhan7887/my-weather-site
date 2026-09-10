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
 * Find a city from a city--country slug, optionally with
 * embedded coordinates: "name--country@lat,lon".
 *
 * If coordinates are embedded in the slug, they are used directly
 * and NO search call is made — this avoids 404s for small localities
 * (e.g. "Chak Shahzad") that exist in Nominatim's reverse-geocode
 * results but are not present in Open-Meteo's geocoding database.
 *
 * If no coordinates are embedded (older/manual slugs, e.g. the
 * "popular cities" links), it falls back to the original
 * name-search behavior.
 */
export async function getCityBySlug(
  slug: string
): Promise<GeoCity | null> {
  const trimmedSlug = slug.trim();

  if (!trimmedSlug) {
    return null;
  }

  // Split off any embedded coordinates first: "name--country@lat,lon"
  const [mainPart, coordPart] = trimmedSlug.split("@");

  const [namePart, countryPart] = mainPart.split("--");

  const nameQuery = (namePart ?? "").replace(/-/g, " ").trim();
  const countryQuery = (countryPart ?? "").replace(/-/g, " ").trim();

  if (!nameQuery) {
    return null;
  }

  // Fast path: coordinates are embedded in the slug — use them directly.
  if (coordPart) {
    const [latStr, lonStr] = coordPart.split(",");
    const latitude = Number(latStr);
    const longitude = Number(lonStr);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return {
        name: toTitleCase(nameQuery),
        country: toTitleCase(countryQuery),
        latitude,
        longitude,
      };
    }
  }

  // Fallback: no usable coordinates in the slug — search by name.
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
      )}&lon=${encodeURIComponent(longitude)}&format=json&accept-language=en`,
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
 * Create a URL-safe slug from a city and country name, with
 * optional embedded coordinates: "name--country@lat,lon".
 *
 * Passing latitude/longitude makes the resulting weather page
 * resolve the city directly from the slug, without needing to
 * re-search it against Open-Meteo's geocoding database (which
 * doesn't cover small localities). This is what reverse-geocoded
 * "your location" links should always use.
 *
 * Omitting latitude/longitude keeps the old behavior, used for
 * manually curated links (e.g. "Popular Searches") where the
 * exact coordinates aren't known ahead of time.
 *
 * Examples:
 *   createCitySlug("Paris", "France") -> "paris--france"
 *   createCitySlug("Chak Shahzad", "Pakistan", 33.6844, 73.0479)
 *     -> "chak-shahzad--pakistan@33.6844,73.0479"
 */
function slugifyPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function createCitySlug(
  name: string,
  country: string,
  latitude?: number,
  longitude?: number
): string {
  const namePart = slugifyPart(name);
  const countryPart = slugifyPart(country);

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return `${namePart}--${countryPart}`;
  }

  return `${namePart}--${countryPart}@${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}