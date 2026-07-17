import { AIWovenHome } from "@/components/marketing/AIWovenHome";
import { getPublicImpactStats } from "@/lib/analytics/publicStats";

export const revalidate = 300;

export default async function Home() {
  const stats = await getPublicImpactStats();
  return <AIWovenHome stats={stats} />;
}
