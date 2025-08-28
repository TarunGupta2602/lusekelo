"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AddressSyncWrapper() {
  const supabase = createClientComponentClient();
  const [isSyncing, setIsSyncing] = useState(false); // Lock to prevent concurrent syncs

  // Normalize address to prevent duplicates due to formatting
  const normalizeAddress = (address) => {
    if (!address) return "";
    return address.trim().toLowerCase().replace(/\s+/g, " ");
  };

  const syncAddress = async (session) => {
    if (isSyncing) {
      console.log("🔒 Sync already in progress, skipping");
      return;
    }

    // Check last sync time to prevent rapid re-syncs
    const lastSyncTime = localStorage.getItem("lastSyncTime");
    const now = Date.now();
    if (lastSyncTime && now - parseInt(lastSyncTime) < 5 * 60 * 1000) { // 5 minutes
      console.log("⏳ Recently synced, skipping");
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
          localStorage.removeItem("userLocation");
          return;
        }
      }

      // If no fullAddress from localStorage, skip sync
      if (!fullAddress) {
        console.log("⚠️ No address in localStorage, skipping sync");
        return;
      }

      // Normalize the address for comparison
      const normalizedAddress = normalizeAddress(fullAddress);

      // Check if the address already exists for this user
      const { data: existingAddresses, error: checkError } = await supabase
        .from("addresses")
        .select("id, full_address, is_last_used")
        .eq("user_id", userId);

      if (checkError) {
        console.error("❌ Error checking existing addresses:", checkError.message, checkError.details, checkError.hint);
        return;
      }

      // Find if the normalized address exists
      const existingAddress = existingAddresses.find(
        (addr) => normalizeAddress(addr.full_address) === normalizedAddress
      );

      if (existingAddress) {
        // Address exists, update it to be last used if not already
        if (!existingAddress.is_last_used) {
          const { data, error } = await supabase
            .from("addresses")
            .update({ is_last_used: true, created_at: new Date().toISOString() })
            .eq("id", existingAddress.id)
            .select();
          if (error) {
            console.error("❌ Address update error:", error.message, error.details, error.hint);
          } else {
            console.log("✅ Updated existing address:", data);
            // Reset other addresses' is_last_used flag
            await supabase
              .from("addresses")
              .update({ is_last_used: false })
              .eq("user_id", userId)
              .neq("id", existingAddress.id);
            localStorage.removeItem("userLocation");
            localStorage.setItem("lastSyncTime", now.toString());
          }
        } else {
          console.log("📍 Address already marked as last used, no update needed");
          localStorage.removeItem("userLocation");
          localStorage.setItem("lastSyncTime", now.toString());
        }
      } else {
        // Reset all existing addresses' is_last_used flag
        const { error: resetError } = await supabase
          .from("addresses")
          .update({ is_last_used: false })
          .eq("user_id", userId);

        if (resetError) {
          console.error("❌ Error resetting last used flags:", resetError.message, resetError.details, resetError.hint);
          return;
        }

        // Insert new address
        const { data, error } = await supabase
          .from("addresses")
          .insert([
            {
              user_id: userId,
              full_address: fullAddress, // Store original address
              is_last_used: true,
            },
          ])
          .select();
        if (error) {
          console.error("❌ Address insert error:", error.message, error.details, error.hint);
        } else {
          console.log("✅ Address inserted successfully:", data);
          localStorage.removeItem("userLocation");
          localStorage.setItem("lastSyncTime", now.toString());
        }
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