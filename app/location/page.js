"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

export default function LocationPopup() {
  const [showPopup, setShowPopup] = useState(false); // Initially false
  const [location, setLocation] = useState("");
  const [locationSelected, setLocationSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  // Check for saved location in localStorage or Supabase
  useEffect(() => {
    const checkLocation = async () => {
      // First, check localStorage
      const savedLocation = localStorage.getItem("userLocation");
      if (savedLocation) {
        try {
          const parsedLocation = JSON.parse(savedLocation);
          setLocation(parsedLocation.address);
          setLocationSelected(true);
          setShowPopup(false); // Close popup if location exists in localStorage
          return;
        } catch (err) {
          console.error("Error parsing saved location:", err);
          localStorage.removeItem("userLocation"); // Clear invalid data
        }
      }

      // Check Supabase for logged-in user's address
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: addresses, error } = await supabase
            .from("addresses")
            .select("*")
            .eq("user_id", user.id);
          if (error) throw error;
          const lastUsedAddress = addresses.find((addr) => addr.is_last_used) || addresses[0];
          if (lastUsedAddress && lastUsedAddress.full_address) {
            setLocation(lastUsedAddress.full_address);
            setLocationSelected(true);
            localStorage.setItem("userLocation", JSON.stringify({ address: lastUsedAddress.full_address }));
            setShowPopup(false); // Close popup if address exists in Supabase
          } else {
            setShowPopup(true); // Show popup if no address in Supabase
          }
        } else {
          setShowPopup(true); // Show popup if not logged in
        }
      } catch (err) {
        console.error("Error fetching addresses from Supabase:", err);
        setShowPopup(true); // Show popup on error to allow manual input
      }
    };

    checkLocation();
  }, []);

  // Detect location handler (Geolocation + Google Maps Geocoding)
  const handleDetectLocation = async () => {
    setLoading(true);
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const data = await res.json();
          if (data.status === "OK" && data.results && data.results.length > 0) {
            const address = data.results[0].formatted_address;
            setLocation(address);
            setLocationSelected(true);
            localStorage.setItem("userLocation", JSON.stringify({ address }));
            // Save to Supabase if user is logged in
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              try {
                // Set is_last_used to false for other addresses
                await supabase
                  .from("addresses")
                  .update({ is_last_used: false })
                  .eq("user_id", user.id);
                // Insert new address
                const { error } = await supabase
                  .from("addresses")
                  .insert({
                    user_id: user.id,
                    full_address: address,
                    is_last_used: true,
                  });
                if (error) throw error;
              } catch (err) {
                console.error("Error saving address to Supabase:", err);
                setError("Failed to save address to database.");
              }
            }
          } else {
            setError("Unable to detect address from coordinates.");
          }
        } catch (err) {
          setError("Failed to fetch address.");
        }
        setLoading(false);
      },
      (err) => {
        setError("Failed to get your location: " + err.message);
        setLoading(false);
      }
    );
  };

  // Manual location input handler
  const handleManualLocation = (e) => {
    setLocation(e.target.value);
    setLocationSelected(false);
    setError("");
  };

  // Submit location (on Enter or button)
  const handleSubmitLocation = async () => {
    if (!location) {
      setError("Please enter a location.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const address = data.results[0].formatted_address;
        setLocation(address);
        setLocationSelected(true);
        localStorage.setItem("userLocation", JSON.stringify({ address }));
        // Save to Supabase if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            // Set is_last_used to false for other addresses
            await supabase
              .from("addresses")
              .update({ is_last_used: false })
              .eq("user_id", user.id);
            // Insert new address
            const { error } = await supabase
              .from("addresses")
              .insert({
                user_id: user.id,
                full_address: address,
                is_last_used: true,
              });
            if (error) throw error;
          } catch (err) {
            console.error("Error saving address to Supabase:", err);
            setError("Failed to save address to database.");
          }
        }
        setShowPopup(false); // Close popup after successful submission
      } else {
        setError("Could not find location. Please try again.");
      }
    } catch (err) {
      setError("Failed to fetch location.");
    }
    setLoading(false);
  };

  // Enter key handler
  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSubmitLocation();
  };

  if (!showPopup) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backdropFilter: "blur(12px)",
        background: "rgba(255,255,255,0.35)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "background 0.3s",
      }}
    >
      <div className="bg-white/90 rounded-3xl overflow-hidden w-full max-w-3xl min-h-[480px] flex flex-col md:flex-row shadow-2xl border border-gray-200">
        {/* Illustration */}
        <div className="bg-gradient-to-br from-blue-100 to-teal-100 p-8 w-full md:w-1/2 flex items-center justify-center">
          <div className="border-2 border-blue-300 p-4 rounded-2xl shadow-lg flex items-center justify-center">
            <Image
              src="/illustration-person-map.jpg"
              alt="Location detection illustration"
              width={260}
              height={260}
              className="object-contain rounded-xl shadow"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Cpath d='M150,50 C150,50 200,100 200,150 C200,200 150,250 150,250 C150,250 100,200 100,150 C100,100 150,50 150,50 Z' fill='%23e0e0e0'/%3E%3Ccircle cx='150' cy='150' r='10' fill='%23666'/%3E%3C/svg%3E";
              }}
            />
          </div>
        </div>
        {/* Form */}
        <div className="bg-white/95 text-gray-900 p-8 w-full md:w-1/2 flex flex-col justify-center min-h-[480px]">
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-teal-900">Welcome!</h2>
          <p className="text-teal-700 text-lg md:text-xl font-medium mb-8">
            Where should we deliver your order?
          </p>
          <div className="flex flex-col space-y-5">
            <button
              onClick={handleDetectLocation}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-400 to-green-300 rounded-xl py-3 px-6 text-teal-900 font-semibold text-lg shadow hover:scale-105 transition-transform"
              disabled={loading || !GOOGLE_MAPS_API_KEY}
            >
              {loading ? (
                <span className="animate-pulse">Detecting...</span>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Detect My Location</span>
                </>
              )}
            </button>
            {locationSelected && location && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-900 text-center font-medium">
                <span>Selected Location:</span>
                <div className="mt-1 text-green-700 text-base">{location}</div>
              </div>
            )}
            <input
              type="text"
              placeholder="Or enter your location manually..."
              className="w-full py-3 px-5 rounded-xl border border-gray-300 text-gray-900 focus:outline-none text-lg shadow-sm bg-gray-50"
              value={location}
              onChange={handleManualLocation}
              onKeyPress={handleKeyPress}
              disabled={loading || !GOOGLE_MAPS_API_KEY}
            />
            <button
              onClick={handleSubmitLocation}
              className="mt-2 bg-gradient-to-r from-green-400 to-teal-400 hover:from-green-500 hover:to-teal-500 text-white rounded-xl py-3 font-bold transition text-lg shadow disabled:opacity-60"
              disabled={!location || loading || !GOOGLE_MAPS_API_KEY}
            >
              {loading ? "Processing..." : "Confirm Location"}
            </button>
          </div>
          {error && (
            <p className="text-red-500 text-base mt-4 text-center">{error}</p>
          )}
          <p className="text-teal-600 text-base mt-6 text-center">
            {!locationSelected ? "No location selected yet." : `Location selected: ${location}`}
          </p>
        </div>
      </div>
    </div>
  );
}