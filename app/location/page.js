"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";

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

  // This function would be used in a real implementation
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmitLocation();
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
      <div className="bg-white rounded-lg overflow-hidden w-full max-w-3xl flex">
        {/* Left side with illustration */}
        <div className="bg-white p-6 w-1/2 hidden md:flex items-center justify-center">
          <div className="border-2 border-blue-400 p-2 rounded-md flex items-center justify-center">
            <Image 
              src="/illustration-person-map.jpg" 
              alt="Location detection illustration" 
              width={250}
              height={250}
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
          <h2 className="text-xl font-semibold mb-1">Before we move forward,</h2>
          <p className="text-green-300 text-xl font-medium mb-6">where exactly are we sending this carrier pigeon?</p>
          
          <div className="flex flex-col space-y-4">
            <button
              onClick={handleDetectLocation}
              className="flex items-center justify-center space-x-2 bg-white rounded py-2 px-4 text-teal-900 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Detect my Location</span>
            </button>

            {/* Dropdown menu for location selection */}
            <select
              className="w-full py-2 px-4 rounded text-gray-800 focus:outline-none"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setLocationSelected(true);
              }}
            >
              <option value="">Select your region...</option>
              <option value="South Tanzania">South Tanzania</option>
              <option value="West Tanzania">West Tanzania</option>
              <option value="East Tanzania">East Tanzania</option>
              <option value="North Tanzania">North Tanzania</option>
            </select>

            <input
              type="text"
              placeholder="Enter your location manually..."
              className="w-full py-2 px-4 rounded text-gray-800 focus:outline-none"
              value={location}
              onChange={handleManualLocation}
              onKeyPress={handleKeyPress}
            />
          </div>
          
          <p className="text-gray-300 text-sm mt-4">
            {!locationSelected ? "No Location Selected yet*" : "Location selected: " + location}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationPopup;

// "use client";
// import { useState, useEffect } from 'react';

// export default function HeroTimeline() {
//   const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  
//   useEffect(() => {
//     const handleResize = () => {
//       setWindowWidth(window.innerWidth);
//     };
    
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);
  
//   const isMobile = windowWidth < 768;
  
//   const steps = [
//     { 
//       number: 1, 
//       dark: false
//     },
//     { 
//       number: 2, 
//       dark: true
//     },
//     { 
//       number: 3, 
//       dark: false
//     },
//     { 
//       number: 4, 
//       dark: true
//     },
//     { 
//       number: 5, 
//       dark: false
//     },
//   ];
  
//   if (isMobile) {
//     return (
//       <section className="w-full bg-white mt-19 py-12 px-4">
//         <div className="max-w-md mx-auto relative">
//           {/* Vertical timeline line */}
//           <div className="absolute left-6 top-0 bottom-0 w-1 bg-green-300 z-0"></div>
          
//           {/* Timeline items */}
//           <div className="relative z-10">
//             {steps.map((step, index) => (
//               <div key={step.number} className="flex mb-12 last:mb-0">
//                 <div className={`w-12 h-12 rounded-md flex-shrink-0 flex items-center justify-center text-white text-lg font-bold z-10 ${
//                   step.dark ? "bg-green-700" : "bg-green-200"
//                 }`}>
//                   {step.number}
//                 </div>
//                 <div className="ml-6 pt-1">
//                   <h4 className="font-semibold text-base mb-2">Consultation</h4>
//                   <p className="text-sm text-gray-600">
//                     We discuss your needs, objectives, and brand voice to align our strategy effectively.
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>
//     );
//   }

//   return (
//     <section className="w-full bg-white py-12 px-4 mt-19 md:px-8 lg:px-16 overflow-x-hidden">
//       <div className="relative w-full max-w-6xl mx-auto">
//         {/* Central timeline bar with alternating colors */}
//         <div className="absolute top-1/2 left-0 w-full h-3 bg-green-200 z-0 transform -translate-y-1/2"></div>
        
//         {/* Dark green sections */}
//         <div className="absolute top-1/2 left-[25%] w-[25%] h-3 bg-green-700 z-0 transform -translate-y-1/2"></div>
//         <div className="absolute top-1/2 left-[75%] w-[25%] h-3 bg-green-700 z-0 transform -translate-y-1/2"></div>
        
//         {/* Timeline items */}
//         <div className="flex justify-between items-stretch relative z-10">
//           {steps.map((step, index) => {
//             const isTop = index % 2 === 0;
            
//             return (
//               <div key={step.number} className="relative flex flex-col items-center" style={{width: '20%'}}>
//                 {isTop ? (
//                   <>
//                     {/* Top positioned items */}
//                     <div className={`w-16 h-16 rounded-md flex items-center justify-center text-white text-2xl font-bold ${
//                       step.dark ? "bg-green-700" : "bg-green-200"
//                     }`}>
//                       {step.number}
//                     </div>
                    
//                     {/* Stem connecting to timeline */}
//                     <div className="w-1 h-32 bg-green-700 mt-0"></div>
                    
//                     {/* Text content */}
//                     <div className="text-center mt-28 max-w-[180px] px-2">
//                       <h4 className="font-semibold text-base mb-2">Consultation</h4>
//                       <p className="text-sm text-gray-600">
//                         We discuss your needs, objectives, and brand voice to align our strategy effectively.
//                       </p>
//                     </div>
//                   </>
//                 ) : (
//                   <>
//                     {/* Bottom positioned items */}                    
//                     {/* Text content */}
//                     <div className="text-center mb-28 max-w-[180px] px-2 mt-20">
//                       <h4 className="font-semibold text-base mb-2">Consultation</h4>
//                       <p className="text-sm text-gray-600">
//                         We discuss your needs, objectives, and brand voice to align our strategy effectively.
//                       </p>
//                     </div>
                    
//                     {/* Stem connecting to timeline */}
//                     <div className="w-1 h-32 bg-green-700 mb-0"></div>
                    
//                     <div className={`w-16 h-16 rounded-md flex items-center justify-center text-white text-2xl font-bold ${
//                       step.dark ? "bg-green-700" : "bg-green-200"
//                     }`}>
//                       {step.number}
//                     </div>
//                   </>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </section>
//   );
// }