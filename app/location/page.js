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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-5xl min-h-[520px] flex shadow-2xl">
        {/* Illustration */}
        <div className="bg-white p-8 w-1/2 hidden md:flex items-center justify-center">
          <div className="border-2 border-blue-400 p-4 rounded-xl flex items-center justify-center">
            <Image
              src="/illustration-person-map.jpg"
              alt="Location detection illustration"
              width={350}
              height={350}
              className="object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Cpath d='M150,50 C150,50 200,100 200,150 C200,200 150,250 150,250 C150,250 100,200 100,150 C100,100 150,50 150,50 Z' fill='%23e0e0e0'/%3E%3Ccircle cx='150' cy='150' r='10' fill='%23666'/%3E%3C/svg%3E";
              }}
            />
          </div>
        </div>
        {/* Form */}
        <div className="bg-teal-900 text-white p-12 w-full md:w-1/2 flex flex-col justify-center min-h-[520px]">
          <h2 className="text-2xl font-semibold mb-2">Before we move forward,</h2>
          <p className="text-green-300 text-2xl font-medium mb-8">
            where exactly are we sending this carrier pigeon?
          </p>
          <div className="flex flex-col space-y-6">
            <button
              onClick={handleDetectLocation}
              className="flex items-center justify-center space-x-2 bg-white rounded-lg py-3 px-6 text-teal-900 font-medium text-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Detect my Location</span>
            </button>
            {/* Dropdown */}
            <select
              className="w-full py-3 px-5 rounded-lg text-gray-800 focus:outline-none text-lg"
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
              placeholder="Enter your location manually..."
              className="w-full py-3 px-5 rounded-lg text-gray-800 focus:outline-none text-lg"
              value={region ? "" : location}
              onChange={handleManualLocation}
              onKeyPress={handleKeyPress}
              disabled={!!region}
            />
            <button
              onClick={handleSubmitLocation}
              className="mt-2 bg-green-400 hover:bg-green-500 text-black rounded-lg py-3 font-semibold transition text-lg"
              disabled={!location}
            >
              Confirm Location
            </button>
          </div>
          <p className="text-gray-300 text-base mt-6">
            {!locationSelected
              ? "No Location Selected yet*"
              : "Location selected: " + location}
          </p>
        </div>
      </div>
    </div>
  );
}