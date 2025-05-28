"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import NewPage from "./new/page";

// Location Popup Component
const LocationPopup = () => {
  const [showPopup, setShowPopup] = useState(true);
  const [location, setLocation] = useState("");
  const [locationSelected, setLocationSelected] = useState(false);

  const handleDetectLocation = () => {
    // In a real implementation, this would use the browser's geolocation API
    // For demo purposes, we'll just set a placeholder value
    setLocation("Current Location");
    setLocationSelected(true);
  };

  const handleManualLocation = (e) => {
    setLocation(e.target.value);
  };

  const handleSubmitLocation = () => {
    if (location) {
      // Save location to localStorage to persist between sessions
      localStorage.setItem("userLocation", location);
      setShowPopup(false);
    }
  };

  useEffect(() => {
    // Check if user already has a saved location
    const savedLocation = localStorage.getItem("userLocation");
    if (savedLocation) {
      setShowPopup(false);
    }
  }, []);

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-4xl flex">
        {/* Left side with illustration */}
        <div className="bg-white p-6 w-1/2 hidden md:flex items-center justify-center">
          <div className="relative h-80 w-full">
            <Image 
              src="/illustration-person-map.jpg" 
              alt="Location detection illustration" 
              width={300}
              height={300}
              className="object-contain"
              // Fallback in case the image doesn't exist
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f0f0f0'/%3E%3Cpath d='M150,50 C150,50 200,100 200,150 C200,200 150,250 150,250 C150,250 100,200 100,150 C100,100 150,50 150,50 Z' fill='%23e0e0e0'/%3E%3Ccircle cx='150' cy='150' r='10' fill='%23666'/%3E%3C/svg%3E";
              }}
            />
          </div>
        </div>
        
        {/* Right side with form */}
        <div className="bg-teal-900 text-white p-8 w-full md:w-1/2 flex flex-col justify-center">
          <h2 className="text-xl font-semibold mb-2">Before we move forward,</h2>
          <p className="text-green-400 text-xl font-medium mb-6">where exactly are we sending this carrier pigeon?</p>
          
          <div className="flex flex-col space-y-4">
            <button
              onClick={handleDetectLocation}
              className="flex items-center justify-center space-x-2 bg-white bg-opacity-10 hover:bg-opacity-20 border border-white border-opacity-20 rounded py-3 px-4 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Detect my Location</span>
            </button>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Enter your location manually..."
                className="w-full py-3 px-4 rounded text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                value={location}
                onChange={handleManualLocation}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmitLocation()}
              />
              {location && (
                <button 
                  onClick={handleSubmitLocation}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-400 hover:bg-green-500 text-black rounded-full p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <p className="text-gray-300 text-sm mt-4">
            {!locationSelected ? "No Location Selected yet*" : "Location selected: " + location}
          </p>
        </div>
      </div>
    </div>
  );
};

// Consolidated fetch function
async function fetchData(endpoint) {
  const res = await fetch(`/api/${endpoint}`);
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
}

const SkeletonLoader = () => (
  <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-16 animate-pulse">
    {/* Hero Section Skeleton */}
    <div className="bg-[#013033] rounded-xl sm:rounded-2xl h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[calc(100lvh-8rem)] w-[95%] sm:w-[calc(100%-3rem)] mx-auto mt-4 sm:mt-7 flex flex-col lg:flex-row items-center justify-between p-6 sm:px-10 sm:py-20">
      <div className="space-y-4 sm:space-y-6 w-full">
        <div className="h-8 sm:h-10 bg-gray-300 rounded w-3/4"></div>
        <div className="h-8 sm:h-10 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 sm:h-5 bg-gray-300 rounded w-full mt-4 sm:mt-6"></div>
        <div className="h-8 sm:h-10 w-28 sm:w-32 bg-gray-400 rounded"></div>
      </div>
      <div className="hidden lg:block w-full lg:w-[50%] h-60 sm:h-72 bg-gray-300 rounded-xl mt-6 lg:mt-0"></div>
    </div>

    {/* Stores Skeleton */}
    <div className="px-2 sm:px-0">
      <div className="h-7 sm:h-8 w-36 sm:w-48 bg-gray-300 rounded mb-4 sm:mb-6"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {[1, 2, 3, 4].map((_, i) => (
          <div key={i} className="bg-white p-3 sm:p-4 rounded-lg shadow animate-pulse">
            <div className="flex flex-col sm:flex-row">
              <div className="w-full sm:w-2/5 h-40 sm:h-48 bg-gray-200 rounded mb-3 sm:mb-0"></div>
              <div className="w-full sm:w-1/5 flex flex-row sm:flex-col justify-start gap-2 p-1 sm:p-2">
                {[1, 2, 3].map((_, j) => (
                  <div key={j} className="w-12 h-12 bg-gray-200 rounded-md"></div>
                ))}
              </div>
              <div className="w-full sm:w-2/5 bg-gray-200 p-3 sm:p-4 rounded-lg sm:rounded-none">
                <div className="h-5 sm:h-6 bg-gray-300 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-8 bg-gray-400 rounded w-full mt-4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ShopContent = () => {
  const [stores, setStores] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLocationPopup, setShowLocationPopup] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const storesData = await fetchData("stores");
        setStores(storesData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <>
      {/* Location Popup */}
      {showLocationPopup && <LocationPopup />}
      
      {loading ? (
        <SkeletonLoader />
      ) : (
        <div className="w-full">
          {/* HERO SECTION */}
          <div
            className="bg-[#013033] flex flex-col lg:flex-row rounded-xl sm:rounded-2xl h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[calc(100lvh-8rem)] w-[95%] sm:w-[calc(100%-3rem)] mx-auto mt-4 sm:mt-7"
            style={{ borderBottomLeftRadius: "90% 30%", borderBottomRightRadius: "90% 30%" }}
          >
            <div className="w-full sm:w-[calc(100%-3rem)] mx-auto flex flex-col lg:flex-row my-auto justify-between items-center p-6 sm:px-10 sm:py-20">
              <div className="flex flex-col space-y-6 sm:space-y-10 w-full lg:w-[50%] text-center lg:text-left">
                <div className="space-y-2">
                  <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-bold">We Bring The Store To</h1>
                  <h1 className="text-[#BBEB6D] text-3xl sm:text-4xl md:text-5xl font-bold">Your Door</h1>
                </div>
                <div>
                  <p className="text-gray-300 text-base sm:text-lg">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.
                  </p>
                </div>
                <Link href={"/products"}>
                  <div>
                    <button className="bg-[#BBEB6D] text-black px-4 py-2 rounded-lg">Shop Now</button>
                  </div>
                </Link>
              </div>
              <div className="hidden lg:flex w-full lg:w-[50%] justify-center">
                <Image src="/veggies.svg" alt="veggies" width={700} height={700} />
              </div>
            </div>
          </div>

          {/* FEATURED STORES */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-gray-50">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 ml-0 sm:ml-2">Buy From Store</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {stores.slice(0, showAll ? stores.length : 4).map((store) => {
                const storeImages = store.gallery_images && store.gallery_images.length > 0
                  ? [store.main_image, ...store.gallery_images]
                  : [store.main_image, store.main_image, store.main_image];

                return (
                  <Link href={`/store/${store.id}`} key={store.id} className="block">
                    <div className="flex flex-col sm:flex-row bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-full sm:w-2/5 relative">
                        <div className="relative h-48 sm:h-full w-full">
                          <Image
                            src={`/${store.main_image}`}
                            alt={store.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div className="w-full sm:w-1/5 flex flex-row sm:flex-col justify-start p-2 gap-2 bg-white">
                        {storeImages.slice(0, 3).map((img, index) => (
                          <div
                            key={index}
                            className="relative h-14 w-1/3 sm:w-full rounded overflow-hidden border border-gray-200"
                          >
                            <Image
                              src={`/${img}`}
                              alt={`${store.name} thumbnail ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="w-full sm:w-2/5 bg-teal-900 text-white p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="text-lg sm:text-xl font-semibold">{store.name}</h3>
                          <div className="flex items-start mt-3 text-gray-300">
                            <span className="text-red-500 mr-2 mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </span>
                            <p className="text-sm leading-tight">{store.address}</p>
                          </div>
                        </div>
                        <button className="mt-4 w-full bg-green-400 hover:bg-green-500 text-black font-medium py-2 rounded text-center transition-colors">
                          Shop from here
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {stores.length > 4 && (
              <div className="text-center mt-6 sm:mt-10">
                <button
                  className="bg-teal-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-teal-800 transition flex items-center mx-auto"
                  onClick={() => setShowAll(!showAll)}
                >
                  <span>{showAll ? "Show Less" : "View All Stores"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showAll ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <NewPage/>
        </div>
      )}
    </>
  );
};

// Use the dynamic import pattern that was already in your code
const ShopContentExport = dynamic(() => Promise.resolve(ShopContent), {
  loading: () => <SkeletonLoader />,
  ssr: false,
});

export default ShopContentExport;