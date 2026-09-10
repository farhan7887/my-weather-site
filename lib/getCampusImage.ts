type WikipediaSummary = {
  thumbnail?: {
    source?: string;
  };
  originalimage?: {
    source?: string;
  };
};

export async function getCampusImage(): Promise<string | null> {
  try {
    const response = await fetch(
      "https://en.wikipedia.org/api/rest_v1/page/summary/COMSATS_University_Islamabad",
      {
        next: {
          revalidate: 604800,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: WikipediaSummary = await response.json();

    // Prefer the original image because it is larger.
    return (
      data.originalimage?.source ??
      data.thumbnail?.source ??
      null
    );
  } catch {
    return null;
  }
}