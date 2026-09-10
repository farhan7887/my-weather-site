import Image from "next/image";
import { CloudSun } from "lucide-react";

interface CityHeroImageProps {
  imageUrl: string | null;
  cityName: string;
  priority?: boolean;
}

export default function CityHeroImage({
  imageUrl,
  cityName,
  priority = false,
}: CityHeroImageProps) {
  return (
    <div className="relative w-full h-[300px] sm:h-[350px] lg:h-[400px] overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-indigo-900 to-slate-950">
      {imageUrl ? (
        <>
          <Image
            src={imageUrl}
            alt={`${cityName} city view`}
            fill
            className="object-cover"
            loading={priority ? undefined : "lazy"}
            priority={priority}
            sizes="100vw"
          />

          {/* Gradient overlay for readable text */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        </>
      ) : (
        <>
          {/* Fallback weather-themed background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-indigo-900 to-slate-950" />

          <div className="absolute inset-0 flex items-center justify-center">
            <CloudSun
              className="h-24 w-24 text-blue-200/80 sm:h-32 sm:w-32"
              strokeWidth={1.2}
              aria-hidden="true"
            />
          </div>

          {/* Same overlay style for visual consistency */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        </>
      )}
    </div>
  );
}