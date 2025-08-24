"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";

export default function LocationPopup() {
  const [showPopup, setShowPopup] = useState(true);
  const [location, setLocation] = useState("");
  const [region, setRegion] = useState("");
  const [locationSelected, setLocationSelected] = useState(false);

  // Detect location handler
  const handleDetectLocation = () => {
    setLocation("Current Location");
    setRegion("");
    setLocationSelected(true);
  };

  // Manual location input handler
  const handleManualLocation = (e) => {
    setLocation(e.target.value);
    setRegion("");
    setLocationSelected(false);
  };

  // Dropdown region handler
  const handleRegionChange = (e) => {
    setRegion(e.target.value);
    setLocation(e.target.value);
    setLocationSelected(!!e.target.value);
  };

  // Submit location (on Enter or button)
  const handleSubmitLocation = () => {
    if (location) {
      localStorage.setItem("userLocation", location);
      setShowPopup(false);
    }
  };

  // Enter key handler
  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSubmitLocation();
  };

  // On mount, check for saved location
  useEffect(() => {
    const savedLocation = localStorage.getItem("userLocation");
    if (savedLocation) setShowPopup(false);
  }, []);

  if (!showPopup) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backdropFilter: 'blur(12px)',
        background: 'rgba(255,255,255,0.35)',
        WebkitBackdropFilter: 'blur(12px)',
        transition: 'background 0.3s',
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
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Detect My Location</span>
            </button>
            {/* Dropdown */}
            <select
              className="w-full py-3 px-5 rounded-xl border border-gray-300 text-gray-900 focus:outline-none text-lg shadow-sm bg-gray-50"
              value={region}
              onChange={handleRegionChange}
            >
              <option value="">Select your region...</option>
              <option value="South Tanzania">South Tanzania</option>
              <option value="West Tanzania">West Tanzania</option>
              <option value="East Tanzania">East Tanzania</option>
              <option value="North Tanzania">North Tanzania</option>
            </select>
            {/* Manual input */}
            <input
              type="text"
              placeholder="Or enter your location manually..."
              className="w-full py-3 px-5 rounded-xl border border-gray-300 text-gray-900 focus:outline-none text-lg shadow-sm bg-gray-50"
              value={region ? "" : location}
              onChange={handleManualLocation}
              onKeyPress={handleKeyPress}
              disabled={!!region}
            />
            <button
              onClick={handleSubmitLocation}
              className="mt-2 bg-gradient-to-r from-green-400 to-teal-400 hover:from-green-500 hover:to-teal-500 text-white rounded-xl py-3 font-bold transition text-lg shadow disabled:opacity-60"
              disabled={!location}
            >
              Confirm Location
            </button>
          </div>
          <p className="text-teal-600 text-base mt-6 text-center">
            {!locationSelected
              ? "No location selected yet."
              : `Location selected: ${location}`}
          </p>
        </div>
      </div>
    </div>
  );
}