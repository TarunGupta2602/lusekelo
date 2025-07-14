import ShopContent from "./ShopContent";

export const revalidate = 3600; // ISR every 1 hour

export default async function HomePage() {
  let stores = [];

  try {
    const baseUrl =
      process.env.VERCEL_URL // Automatically set in Vercel
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/stores`, {
      next: { revalidate: 3600 },
      headers: {
        // Ensure it's treated as a server-side fetch
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch stores: ${res.status} ${res.statusText}`);
    }

    stores = await res.json();
  } catch (error) {
    console.error("Error fetching stores:", error.message);
    stores = [];
  }

  return <ShopContent stores={stores} />;
}
