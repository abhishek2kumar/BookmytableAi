import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRestaurants } from '../hooks/useFirebase';
import { useMasterData } from './MasterDataContext';
import { Star, MapPin, ChevronLeft, Zap, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';
import { useLocationContext } from './LocationContext';

export default function CuisineView() {
  const { cuisineId } = useParams();
  const navigate = useNavigate();
  const { cuisines } = useMasterData();
  const { restaurants, loading } = useRestaurants();
  const { coords: userCoords, city: selectedCity } = useLocationContext();
  const [visibleCount, setVisibleCount] = useState(8);

  const cuisineInfo = cuisines.find(c => c.id === cuisineId || c.name.toLowerCase().replace(/ /g, '-') === cuisineId);
  const cuisineName = cuisineInfo?.name || cuisineId?.replace(/-/g, ' ');

  // Distance calculator
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
  };

  const filteredRestaurants = restaurants
    .filter(res => {
        const matchesCuisine = res.cuisine?.toLowerCase() === cuisineName?.toLowerCase();
        
        // Normalize city names for comparison
        const resCityNorm = res.city ? res.city.toLowerCase() : '';
        const selectedCityNorm = selectedCity.toLowerCase();
        
        // Match by city field or location string containing the city name
        const matchesCity = resCityNorm === selectedCityNorm || 
                          (res.location && res.location.toLowerCase().includes(selectedCityNorm));
        
        return matchesCuisine && matchesCity;
    })
    .map(res => ({
      ...res,
      distance: userCoords && res.lat && res.lng 
        ? calculateDistance(userCoords.lat, userCoords.lng, res.lat, res.lng)
        : null
    }))
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      return b.rating - a.rating;
    });

  // Infinite scroll logic
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 100 >=
        document.documentElement.offsetHeight
      ) {
        if (visibleCount < filteredRestaurants.length) {
          setVisibleCount(prev => prev + 4);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredRestaurants.length]);

  if (!cuisineInfo && !loading && restaurants.length > 0) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
             <Info size={48} className="text-slate-300 mb-4" />
             <h2 className="text-xl font-bold">Cuisine not found</h2>
             <button onClick={() => navigate('/')} className="mt-4 text-brand font-bold">Back to Home</button>
        </div>
     )
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Immersive Header Section */}
      <div className="relative h-[350px] md:h-[450px] flex items-center justify-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={cuisineInfo?.image} 
            alt={cuisineName || 'Cuisine'} 
            className="w-full h-full object-cover scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-6"
          >
            <Link to="/" className="text-xs font-black text-white hover:text-brand transition-colors uppercase tracking-widest flex items-center gap-1">
               <ChevronLeft size={12} /> Back to explore
            </Link>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-display font-bold text-white mb-6 tracking-tight drop-shadow-2xl"
          >
            {cuisineName}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white font-bold text-lg md:text-2xl max-w-2xl mx-auto drop-shadow-lg mb-8"
          >
            {cuisineInfo?.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex bg-brand px-8 py-3 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-brand/20 border border-white/20"
          >
            {filteredRestaurants.length} Restaurants to explore
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 md:mt-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredRestaurants.slice(0, visibleCount).map((restaurant, index) => (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index % 4) * 0.1 }}
              >
                <Link to={`/restaurant/${restaurant.id}`} className="group flex flex-col h-full bg-white rounded-2xl shadow-vibrant hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-100 hover:-translate-y-1">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img 
                      src={restaurant.image || RESTAURANT_IMAGE_FALLBACK} 
                      alt={restaurant.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      onError={handleImageError}
                    />
                    {restaurant.offers && restaurant.offers.length > 0 && (
                      <div className="absolute bottom-3 left-0 right-0 px-3 pointer-events-none">
                        <div className="bg-brand/90 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg border border-white/20 w-fit max-w-[90%]">
                          <Zap size={14} className="text-white fill-white" />
                          <span className="text-[10px] font-black text-white tracking-tight truncate leading-none">
                            {restaurant.offers[0]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow gap-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="text-lg font-display font-bold text-slate-900 group-hover:text-brand transition-colors line-clamp-1 flex-1 leading-tight">
                        {restaurant.name}
                      </h3>
                      <div className="shrink-0 bg-vibrant-success px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm border border-white/10">
                        <span className="text-xs font-black text-white">{restaurant.rating}</span>
                        <Star size={10} className="fill-white text-white" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-slate-500 font-medium">
                      <span className="text-xs truncate max-w-[60%]">{restaurant.cuisine}</span>
                      <span className="text-xs shrink-0 font-bold text-slate-700">₹{restaurant.avgPrice} for two</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400 mt-1">
                      <div className="flex items-center gap-1 truncate flex-1">
                        <MapPin size={12} className="shrink-0" />
                        <span className="text-[11px] truncate font-medium">
                          {restaurant.location}
                        </span>
                      </div>
                      {restaurant.distance !== null && (
                        <span className="shrink-0 text-[11px] font-black text-brand ml-2 bg-brand/5 px-2 py-0.5 rounded-full">
                          {restaurant.distance} km
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No {cuisineName} restaurants yet</h3>
            <p className="text-slate-500">We couldn't find any results in this category.</p>
          </div>
        )}
        
        {visibleCount < filteredRestaurants.length && (
           <div className="mt-12 flex justify-center">
             <div className="animate-bounce text-brand">
               <div className="w-2 h-2 bg-brand rounded-full mb-1"></div>
               <div className="w-2 h-2 bg-brand/60 rounded-full mb-1"></div>
               <div className="w-2 h-2 bg-brand/20 rounded-full"></div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
