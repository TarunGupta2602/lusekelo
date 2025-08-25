"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AddressSyncWrapper() {
  const supabase = createClientComponentClient();
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [isSyncing, setIsSyncing] = useState(false); // Lock to prevent concurrent syncs
  const [lastSyncedAddress, setLastSyncedAddress] = useState(null); // Track last synced address

  const syncAddress = async (session) => {
    if (isSyncing) {
      console.log("🔒 Sync already in progress, skipping");
      return;
    }

    setIsSyncing(true);
    console.log("🔄 Starting syncAddress with session:", session);

    try {
      if (!session || !session.user) {
        console.warn("⚠️ No valid session or user, skipping sync");
        return;
      }

      const userId = session.user.id;
      console.log("✅ User ID:", userId);

      // Check if user is email-verified
      if (!session.user.email_confirmed_at) {
        console.warn("⚠️ User email not verified, skipping sync");
        return;
      }

      // Check localStorage for saved location from LocationPopup
      const savedLocation = localStorage.getItem("userLocation");
      let fullAddress;

      if (savedLocation) {
        try {
          const parsedLocation = JSON.parse(savedLocation);
          fullAddress = parsedLocation.address;
          console.log("📍 Using saved location from localStorage:", parsedLocation);
        } catch (err) {
          console.error("❌ Error parsing localStorage:", err.message);
        }
      }

      // If no saved location, use geolocation
      if (!fullAddress) {
        if (!navigator.geolocation) {
          console.error("❌ Geolocation not supported");
          return;
        }
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true,
            });
          });
          const { latitude, longitude } = position.coords;
          console.log("📍 Geolocation:", { latitude, longitude });

          if (!GOOGLE_MAPS_API_KEY) {
            console.error("❌ Google Maps API key missing");
            return;
          }
          const geoRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const geoData = await geoRes.json();
          console.log("🌍 Geocoding API response:", geoData);

          if (geoData.status === "OK" && geoData.results.length > 0) {
            fullAddress = geoData.results[0].formatted_address;
            console.log("📍 Full address:", fullAddress);
          } else {
            console.warn("⚠️ No results from Geocoding API:", geoData.status, geoData.error_message || "No error message");
            return;
          }
        } catch (err) {
          console.error("❌ Geolocation or Geocoding error:", err.message);
          return;
        }
      }

      // Skip sync if the address hasn't changed
      if (fullAddress === lastSyncedAddress) {
        console.log("📍 Address unchanged, skipping sync");
        return;
      }

      // Save address to Supabase, checking for duplicates
      if (fullAddress) {
        // Check if the address already exists for this user
        const { data: existing, error: checkError } = await supabase
          .from("addresses")
          .select("id")
          .eq("user_id", userId)
          .eq("full_address", fullAddress)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          console.error("❌ Error checking existing address:", checkError.message, checkError.details, checkError.hint);
          return;
        }

        if (existing) {
          // Update existing address
          const { data, error } = await supabase
            .from("addresses")
            .update({ is_last_used: true, created_at: new Date().toISOString() })
            .eq("id", existing.id)
            .select();
          if (error) {
            console.error("❌ Address update error:", error.message, error.details, error.hint);
          } else {
            console.log("✅ Updated existing address:", data);
            localStorage.removeItem("userLocation");
            setLastSyncedAddress(fullAddress);
          }
        } else {
          // Insert new address
          const { data, error } = await supabase
            .from("addresses")
            .insert([
              {
                user_id: userId,
                full_address: fullAddress,
                is_last_used: true,
              },
            ])
            .select();
          if (error) {
            console.error("❌ Address insert error:", error.message, error.details, error.hint);
          } else {
            console.log("✅ Address inserted successfully:", data);
            localStorage.removeItem("userLocation");
            setLastSyncedAddress(fullAddress);
          }
        }
      } else {
        console.warn("⚠️ No valid address to insert");
      }
    } catch (err) {
      console.error("❌ Address sync error:", err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    console.log("🔄 Running useEffect for AddressSyncWrapper");

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔐 Auth state change:", event, session);
      if (event === "SIGNED_IN" && session && session.user && session.user.email_confirmed_at) {
        // Delay to ensure session sync
        setTimeout(() => syncAddress(session), 500);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("🔍 Initial session check:", session);
      if (session && session.user && session.user.email_confirmed_at) {
        syncAddress(session);
      }
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []); // Empty dependency array to run only once on mount

  return null;
}