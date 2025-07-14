  // app/page.js (Server Component)
  import ShopContent from "./ShopContent";

  export const revalidate = 3600; // Revalidate every 1 hour for ISR

  export default async function HomePage() {
    let stores = [];

    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const res = await fetch(`${base}/api/stores`, {
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch stores: ${res.status} ${res.statusText}`);
      }

      stores = await res.json();
    } catch (error) {
      console.error("Error fetching stores:", error.message);
      // Fallback to empty array or static data to allow build to continue
      stores = [];
    }

    return <ShopContent stores={stores} />;
  }