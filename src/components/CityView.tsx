import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useRestaurants } from '../hooks/useFirebase';
import { Restaurant } from '../types';
import { RestaurantCard } from './RestaurantCard';
import { useMasterData } from './MasterDataContext';
import { Star, MapPin, Search, Filter, Navigation, Zap, ChevronRight, ChevronLeft, TrendingUp, Percent, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';
import { useLocationContext } from './LocationContext';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CityView() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { cities, cuisines } = useMasterData();
  const { restaurants, loading } = useRestaurants();
  const { coords: userCoords, city: contextCity } = useLocationContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(8);

  // Validate cityId on mount
  useEffect(() => {
    if (cityId && cities.length > 0) {
      const isNearby = cityId.toLowerCase() === 'nearby';
      const isSupported = cities.some(c => c.name.toLowerCase() === cityId.toLowerCase() && c.lat !== 0);
      
      if (!isNearby && !isSupported) {
        const isKnown = cities.some(c => c.name.toLowerCase() === cityId.toLowerCase() && c.isKnown);
        if (isKnown) {
          navigate(`/error?city=${encodeURIComponent(cityId)}&type=unsupported`);
        } else {
          navigate(`/error?city=${encodeURIComponent(cityId)}&type=invalid`);
        }
      }
    }
  }, [cityId, navigate, cities]);

  const featuredRef = useRef<HTMLDivElement>(null);
  const discountRef = useRef<HTMLDivElement>(null);
  const nearbyRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const cityName = useMemo(() => {
    if (!cityId || cityId.toLowerCase() === 'nearby') {
      // If it's the raw detected city name, try to find a match in our cities list for formatting
      const match = cities.find(c => c.name.toLowerCase() === contextCity.toLowerCase());
      return match ? match.name : contextCity;
    }
    
    // Check if it matches any known city for proper capitalization
    const knownCity = cities.find(c => c.name.toLowerCase() === cityId.toLowerCase());
    return knownCity ? knownCity.name : cityId.charAt(0).toUpperCase() + cityId.slice(1);
  }, [cityId, contextCity, cities]);

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
    return parseFloat((R * c).toFixed(1));
  };

  const cityRestaurants = useMemo(() => {
    return restaurants
      .filter(res => {
        // Normalize city names for comparison
        const resCityNorm = res.city ? res.city.toLowerCase() : '';
        const currentCityNorm = cityName.toLowerCase();

        // If Nearby You is selected, and we have user coords, we show restaurants within a reasonable distance (e.g. 50km for strictly "near")
        if (currentCityNorm === 'nearby you' || currentCityNorm === 'nearby') {
          if (!userCoords) return true; 
          
          if (res.lat && res.lng) {
            const dist = calculateDistance(userCoords.lat, userCoords.lng, res.lat, res.lng);
            return dist <= 50; 
          }
          return contextCity && resCityNorm === contextCity.toLowerCase();
        }

        // Strict match by city field or valid location string
        const matchesCity = resCityNorm === currentCityNorm;
        return matchesCity;
      })
      .map(res => ({
        ...res,
        distance: userCoords && res.lat && res.lng 
          ? calculateDistance(userCoords.lat, userCoords.lng, res.lat, res.lng)
          : null
      }));
  }, [restaurants, cityName, userCoords, contextCity]);

  const featuredRestaurants = useMemo(() => {
    return [...cityRestaurants].sort((a, b) => b.rating - a.rating).slice(0, 5);
  }, [cityRestaurants]);

  const nearbyRestaurants = useMemo(() => {
    return [...cityRestaurants].filter(r => r.distance !== null).sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 5);
  }, [cityRestaurants]);

  const discountedRestaurants = useMemo(() => {
    return [...cityRestaurants].filter(r => r.offers && r.offers.length > 0).slice(0, 5);
  }, [cityRestaurants]);

  const filteredListing = useMemo(() => {
    return cityRestaurants.filter(res => 
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      res.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.location.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      if ((cityName === 'Nearby You' || cityName === 'Nearby') && a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return a.name.localeCompare(b.name);
    });
  }, [cityRestaurants, searchQuery, cityName]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop + 100 >= document.documentElement.offsetHeight) {
        if (visibleCount < filteredListing.length) {
          setVisibleCount(prev => prev + 4);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredListing.length]);

  return (
    <div className="pb-20 bg-vibrant-bg min-h-screen">
      {/* Hero Header */}
      <section className="relative bg-white pt-8 pb-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-brand font-black text-xs uppercase tracking-[0.2em] mb-3">
                <MapPin size={14} />
                <span>Dining in {cityName}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-black text-vibrant-dark mb-4 leading-tight">
                Book the finest tables in <span className="text-brand">{cityName}</span>
              </h1>
              <p className="text-vibrant-gray font-medium text-lg max-w-2xl">
                Discover the most exclusive dining spots and reserve your gourmet experience instantly.
              </p>
            </div>
            
            <div className="relative w-full md:w-[400px] group">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-vibrant-gray group-focus-within:text-brand transition-colors" size={20} />
               <input 
                 type="text" 
                 placeholder="Search restaurants, cuisines..."
                 className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand rounded-2xl font-bold shadow-sm transition-all"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
          </div>

          {/* Cuisine Circle Carousel */}
          <div>
            <h2 className="text-xl font-display font-black text-vibrant-dark mb-8 flex items-center gap-3">
              What's on your mind?
            </h2>
            <div className="flex items-start gap-6 md:gap-10 overflow-x-auto pb-4 scrollbar-none snap-x">
              {cuisines.map((cuisine) => (
                <Link 
                  key={cuisine.id}
                  to={`/cuisine/${cuisine.id || cuisine.name.toLowerCase().replace(/ /g, '-')}`}
                  className="flex flex-col items-center gap-3 shrink-0 snap-start group"
                >
                  <div className="w-20 md:w-32 h-20 md:h-32 rounded-full overflow-hidden shadow-vibrant group-hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-1 relative ring-4 ring-transparent group-hover:ring-brand/10">
                    <img 
                      src={cuisine.image || RESTAURANT_IMAGE_FALLBACK} 
                      alt={cuisine.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-sm md:text-base font-bold text-vibrant-dark group-hover:text-brand transition-colors text-center max-w-[80px] md:max-w-[120px]">
                    {cuisine.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 mt-12 space-y-20">
        
        {/* Featured Section */}
        {featuredRestaurants.length > 0 && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-black text-vibrant-dark">Featured Restaurants</h2>
                <p className="text-vibrant-gray font-medium text-sm">Handpicked selections by our food experts</p>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="text-brand" size={24} />
                <div className="hidden md:flex gap-2">
                   <button 
                     onClick={() => scroll(featuredRef, 'left')} 
                     className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                   >
                     <ChevronLeft size={20} className="text-vibrant-dark" />
                   </button>
                   <button 
                     onClick={() => scroll(featuredRef, 'right')} 
                     className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                   >
                     <ChevronRight size={20} className="text-vibrant-dark" />
                   </button>
                </div>
              </div>
            </div>
            
            <div ref={featuredRef} className="flex gap-8 overflow-x-auto pb-6 scrollbar-none snap-x">
              {featuredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} className="w-[280px] md:w-[320px] shrink-0 snap-start" />
              ))}
            </div>
          </section>
        )}

        {/* Top Discount Section */}
        {discountedRestaurants.length > 0 && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-black text-vibrant-dark">Top Discounts in {cityName}</h2>
                <p className="text-vibrant-gray font-medium text-sm">Save big on your next meal</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full font-black text-xs flex items-center gap-1">
                  <Percent size={14} />
                  LTD TIME
                </div>
                <div className="hidden md:flex gap-2">
                   <button 
                     onClick={() => scroll(discountRef, 'left')} 
                     className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                   >
                     <ChevronLeft size={20} className="text-vibrant-dark" />
                   </button>
                   <button 
                     onClick={() => scroll(discountRef, 'right')} 
                     className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                   >
                     <ChevronRight size={20} className="text-vibrant-dark" />
                   </button>
                </div>
              </div>
            </div>
            
            <div ref={discountRef} className="flex gap-8 overflow-x-auto pb-6 scrollbar-none snap-x">
              {discountedRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} className="w-[280px] md:w-[320px] shrink-0 snap-start" showFullOffer />
              ))}
            </div>
          </section>
        )}

        {/* Nearby Section */}
        {nearbyRestaurants.length > 0 && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-display font-black text-vibrant-dark">Restaurants Near You</h2>
                <p className="text-vibrant-gray font-medium text-sm">Quick dining options in your immediate vicinity</p>
              </div>
              <div className="flex items-center gap-4">
                <Navigation className="text-brand" size={24} />
                <div className="hidden md:flex gap-2">
                   <button 
                     onClick={() => scroll(nearbyRef, 'left')} 
                     className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                   >
                     <ChevronLeft size={20} className="text-vibrant-dark" />
                   </button>
                   <button 
                     onClick={() => scroll(nearbyRef, 'right')} 
                     className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                   >
                     <ChevronRight size={20} className="text-vibrant-dark" />
                   </button>
                </div>
              </div>
            </div>
            
            <div ref={nearbyRef} className="flex gap-8 overflow-x-auto pb-6 scrollbar-none snap-x">
              {nearbyRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} className="w-[280px] md:w-[320px] shrink-0 snap-start" />
              ))}
            </div>
          </section>
        )}

        {/* Main Listing Section */}
        <section id="all-restaurants" className="pt-12 border-t border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <h2 className="text-3xl font-display font-black text-vibrant-dark">
              {searchQuery ? `Search results for "${searchQuery}"` : `Explore All in ${cityName}`}
            </h2>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-vibrant-dark hover:border-brand transition-all">
                <Filter size={16} />
                Filters
              </button>
            </div>
          </div>

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
          ) : filteredListing.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-x-10 md:gap-y-16">
              {filteredListing.slice(0, visibleCount).map((restaurant, index) => (
                <motion.div
                  key={restaurant.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <RestaurantCard restaurant={restaurant} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
               <h3 className="text-2xl font-display font-black text-slate-400">No restaurants matching your search</h3>
            </div>
          )}

          {visibleCount < filteredListing.length && (
             <div className="mt-20 flex justify-center">
                <div className="flex flex-col items-center gap-4">
                   <p className="text-sm font-bold text-vibrant-gray">Scroll for more</p>
                   <div className="animate-bounce">
                      <div className="w-1.5 h-1.5 bg-brand rounded-full mb-1"></div>
                      <div className="w-1.5 h-1.5 bg-brand/50 rounded-full mb-1"></div>
                      <div className="w-1.5 h-1.5 bg-brand/20 rounded-full"></div>
                   </div>
                </div>
             </div>
          )}
        </section>
      </div>
    </div>
  );
}
