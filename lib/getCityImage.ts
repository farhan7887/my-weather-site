// lib/getCityImage.ts

interface WikipediaImage {
  source?: string;
}

interface WikipediaResponse {
  thumbnail?: WikipediaImage;
  originalimage?: WikipediaImage;
}

export async function getCityImage(
  cityName: string,
  countryName?: string
): Promise<string | null> {
  try {
    const pageName = countryName
      ? `${cityName}, ${countryName}`
      : cityName;

    const encodedCityName = encodeURIComponent(pageName);

    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedCityName}`,
      {
        next: {
          revalidate: 86400,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: WikipediaResponse = await response.json();

    return (
      data.originalimage?.source ??
      data.thumbnail?.source ??
      null
    );
  } catch {
    return null;
  }
}