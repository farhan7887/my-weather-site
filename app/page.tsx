import HomeClient from "@/components/HomeClient";
import { getCampusImage } from "@/lib/getCampusImage";

export default async function Home() {
  const campusImageUrl = await getCampusImage();

  return <HomeClient campusImageUrl={campusImageUrl} />;
}