import type { MetadataRoute } from "next";
import { cities } from "@/data/cities";

const BASE_URL = "https://example.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${BASE_URL}/weather/${city.slug}`,
    changeFrequency: "hourly",
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...cityPages,
  ];
}