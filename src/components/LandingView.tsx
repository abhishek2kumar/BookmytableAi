import React, { useState, useEffect } from 'react';
import { useRestaurants } from '../hooks/useFirebase';
import { CUISINES, Restaurant } from '../types';
import { Star, MapPin, Search, Filter, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatDate, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';

import { useLocationContext } from './LocationContext';

export default function LandingView() {
  const { restaurants, loading } = useRestaurants();
  const { coords: userCoords, city: locationName, detectLocation, isDetecting } = useLocationContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);

  // Haversine formula for distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const filteredRestaurants = restaurants
    .map(res => ({
      ...res,
      distance: userCoords && res.lat && res.lng 
        ? parseFloat(calculateDistance(userCoords.lat, userCoords.lng, res.lat, res.lng))
        : null
    }))
    .filter(res => {
      const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           res.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           res.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCuisine = !selectedCuisine || res.cuisine === selectedCuisine;
      
      // Strict city filtering
      const matchesCity = locationName === 'Nearby You' 
        ? true // When in "Nearby You" mode, we show everything but sort by distance (fallback to all if no coords)
        : res.location.toLowerCase().includes(locationName.toLowerCase());
      
      return matchesSearch && matchesCuisine && matchesCity;
    })
    .sort((a, b) => {
      // If we have distance, always sort by it first
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      // Secondary sort by rating
      return b.rating - a.rating;
    });

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
            <img 
              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2000" 
              alt="Hero Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold text-white mb-6 leading-tight"
          >
            Find the perfect table in <span className="text-brand">{locationName === 'Nearby You' ? 'your area' : locationName}</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-200 mb-8 max-w-2xl mx-auto"
          >
            Experience the finest dining with instant bookings at the best restaurants in town.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto bg-white p-2 rounded-xl border border-gray-300 shadow-vibrant flex items-center gap-2"
          >
            <div className="flex-grow flex items-center gap-3 px-4">
              <Search className="text-vibrant-gray" size={20} />
              <input 
                type="text" 
                placeholder="Search for restaurants or cuisines..."
                className="w-full py-3 text-vibrant-dark placeholder:text-vibrant-gray focus:outline-none font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="bg-brand text-white px-8 py-3 rounded-lg font-bold hover:bg-brand-dark transition-colors shrink-0">
              Search
            </button>
          </motion.div>
        </div>
      </section>

      {/* Filters & Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <h2 className="text-2xl font-display font-bold text-vibrant-dark">
            {selectedCuisine ? `${selectedCuisine} Restaurants` : `Top Restaurants in ${locationName}`}
          </h2>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            <button 
              onClick={() => setSelectedCuisine(null)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                !selectedCuisine 
                  ? "bg-brand-light border-brand text-brand shadow-sm" 
                  : "bg-white border-gray-200 text-vibrant-gray hover:border-brand hover:text-brand"
              )}
            >
              All
            </button>
            {CUISINES.slice(0, 8).map(cuisine => (
              <button 
                key={cuisine}
                onClick={() => setSelectedCuisine(cuisine)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold border transition-all",
                  selectedCuisine === cuisine 
                    ? "bg-brand-light border-brand text-brand shadow-sm" 
                    : "bg-white border-gray-200 text-vibrant-gray hover:border-brand hover:text-brand"
                )}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredRestaurants.map((restaurant, index) => (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/restaurant/${restaurant.id}`} className="group block bg-white p-4 rounded-2xl shadow-vibrant hover:shadow-xl transition-all duration-300">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-4 group-hover:shadow-sm transition-all duration-300">
                    <img 
                      src={restaurant.image || RESTAURANT_IMAGE_FALLBACK} 
                      alt={restaurant.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                    />
                    <div className="absolute top-4 right-4 bg-vibrant-success px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                      <Star size={12} className="fill-white text-white" />
                      <span className="text-xs font-bold text-white">{restaurant.rating}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-display font-bold text-vibrant-dark group-hover:text-brand transition-colors">
                    {restaurant.name}
                  </h3>
                  <div className="flex items-center gap-2 text-vibrant-gray text-sm mt-1">
                    <span>{restaurant.cuisine}</span>
                    <span>•</span>
                    <span>₹{restaurant.avgPrice} for two</span>
                  </div>
                  <div className="flex items-center gap-1 text-vibrant-gray opacity-60 text-xs mt-2">
                    <MapPin size={12} />
                    <span className="truncate">{restaurant.location}</span>
                    {restaurant.distance !== null && (
                      <span className="ml-auto font-bold text-brand">{restaurant.distance} km</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
            <div className="text-slate-300 mb-4 flex justify-center">
              <UtensilsCrossed size={64} />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">
              No restaurants found {locationName !== 'Nearby You' ? `in ${locationName}` : 'nearby'}
            </h3>
            <p className="text-slate-500 max-w-md mx-auto">
              We couldn't find any results matching your filters. Try selecting another city or clearing your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-using icon for empty state
function UtensilsCrossed({ size }: { size: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m3 21 2-2m4.6-4.6L13 11l4 4-2.4 2.4-4-4L9 15l2 2-2 2-7-1"/>
      <path d="M15 3h6v1c0 2.8-2.2 5-5 5h-1V3Z"/>
      <path d="M15 9v12"/><path d="M11 3v5c0 1.1-.9 2-2 2s-2-.9-2-2V3"/>
    </svg>
  );
}
