// app/page.js (Server Component)
import ShopContent from "./ShopContent";

export const revalidate = 600; // Revalidate every 1 hour for Incremental Static Regeneration (ISR)

export default async function HomePage() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const res = await fetch(`${base}/api/stores`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  
  if (!res.ok) {
    console.error("Failed to fetch stores");
    return <div>Error loading stores</div>;
  }

  const stores = await res.json();

  return <ShopContent stores={stores} />;
}