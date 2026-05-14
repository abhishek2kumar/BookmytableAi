import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { useRestaurants } from '../hooks/useFirebase';
import { Restaurant } from '../types';
import { RestaurantCard } from './RestaurantCard';
import { useMasterData } from './MasterDataContext';
import { useAuth } from './AuthProvider';
import { Star, MapPin, Search, Filter, Navigation, Zap, ChevronRight, ChevronLeft, TrendingUp, Percent, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, getRestaurantUrl } from '../lib/utils';
import { useLocationContext } from './LocationContext';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CityView() {
  const { cityId } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { cities, cuisines, loading: masterDataLoading } = useMasterData();
  const { restaurants, loading: restaurantsLoading } = useRestaurants();

  const loading = restaurantsLoading || masterDataLoading;
  const { coords: userCoords, city: contextCity } = useLocationContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bookmytable_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading recent searches', e);
    }
  }, []);

  const saveRecentSearch = (item: any) => {
    try {
      const updated = [item, ...recentSearches.filter(s => s.id !== item.id)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('bookmytable_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving recent search', e);
    }
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    cuisines: [] as string[],
    minRating: 0,
    onlyWithOffers: false
  });

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
    return cityRestaurants.filter(res => {
      // Search matches
      const matchesSearch = 
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        res.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (res.address && res.address.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch && searchQuery.length > 0) return false;

      // Filter matches
      const matchesCuisine = activeFilters.cuisines.length === 0 || activeFilters.cuisines.includes(res.cuisine);
      const matchesRating = res.rating >= activeFilters.minRating;
      const matchesOffers = !activeFilters.onlyWithOffers || (res.offers && res.offers.length > 0);

      return matchesCuisine && matchesRating && matchesOffers;
    }).sort((a, b) => {
      if ((cityName === 'Nearby You' || cityName === 'Nearby') && a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return a.name.localeCompare(b.name);
    });
  }, [cityRestaurants, searchQuery, cityName, activeFilters]);

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const findAndSetPortal = () => {
      const el = document.getElementById('navbar-search-portal');
      if (el) {
        setPortalTarget(el);
        if (timer) clearInterval(timer);
      }
    };
    
    findAndSetPortal();
    timer = setInterval(findAndSetPortal, 100);
    
    return () => clearInterval(timer);
  }, []);

  const searchSuggestions = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return cityRestaurants.filter(res => 
      res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6);
  }, [cityRestaurants, searchQuery]);

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

  const currentCity = useMemo(() =>
    cities.find(c => c.name.toLowerCase() === cityName?.toLowerCase()),
  [cities, cityName]);

  const welcomeText = authLoading ? '' : user ? `Hi ${profile?.displayName?.split(' ')[0] || 'User'}, What's on your mind?` : `Hey ${cityName}, What's on your mind?`;

  return (
    <div className="pb-20 bg-vibrant-bg min-h-screen">
      {portalTarget && createPortal(
         <div className="w-full flex justify-end md:block">
           <div className="hidden md:block relative w-full group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vibrant-gray group-hover:text-brand transition-colors" size={18} />
             <input 
               type="text" 
               readOnly
               onClick={() => setIsSearchOverlayOpen(true)}
               placeholder="Search for restaurant"
               className="w-full pl-12 pr-6 py-2.5 bg-slate-50 border border-transparent hover:bg-white hover:border-brand/20 cursor-pointer rounded-xl font-medium shadow-sm transition-all text-sm outline-none text-slate-800"
               value={searchQuery}
             />
           </div>
           
           <button 
             className="md:hidden p-2 text-vibrant-gray hover:text-brand transition-colors"
             onClick={() => setIsSearchOverlayOpen(true)}
           >
             <Search size={22} className="stroke-[2.5]" />
           </button>
         </div>,
         portalTarget
      )}

      {/* Categories & Cuisines */}
      <section className="relative bg-white pt-4 pb-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          {/* Welcome Banner */}
          <div className="relative mb-6 md:rounded-2xl overflow-hidden h-[120px] md:h-36 w-[calc(100%+32px)] -mx-4 md:w-full md:mx-0 flex items-center bg-slate-100">
             {loading || authLoading ? (
               <div className="absolute inset-0 bg-slate-200 animate-pulse" />
             ) : (
               <>
                 <img src={currentCity?.bannerImage || "https://i.pinimg.com/736x/3b/ae/79/3bae79a6ae0f44e1ed07bba4f8a13b69.jpg"} alt="Welcome Banner" className="absolute inset-0 w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                 <h2 className="relative z-10 text-xl sm:text-2xl md:text-3xl font-display font-black text-white px-6 md:px-10 w-full md:max-w-2xl leading-tight">
                   {welcomeText}
                 </h2>
               </>
             )}
          </div>

          {/* Cuisine Circle Carousel */}
          <div>
            <div className="flex items-start gap-4 md:gap-10 overflow-x-auto pb-4 scrollbar-none snap-x -mx-4 px-4 md:mx-0 md:px-0">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 md:gap-3 shrink-0 snap-start animate-pulse">
                    <div className="w-16 md:w-32 h-16 md:h-32 rounded-full bg-slate-200" />
                    <div className="h-3 md:h-4 w-12 md:w-20 bg-slate-200 rounded" />
                  </div>
                ))
              ) : (
                cuisines.map((cuisine) => (
                  <Link 
                    key={cuisine.id}
                  to={`/cuisine/${cuisine.id || cuisine.name.toLowerCase().replace(/ /g, '-')}`}
                  className="flex flex-col items-center gap-2 md:gap-3 shrink-0 snap-start group"
                >
                  <div className="w-16 md:w-32 h-16 md:h-32 rounded-full overflow-hidden shadow-vibrant group-hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-1 relative ring-4 ring-transparent group-hover:ring-brand/10">
                    <img 
                      src={cuisine.image || RESTAURANT_IMAGE_FALLBACK} 
                      alt={cuisine.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[10px] md:text-base font-bold text-vibrant-dark group-hover:text-brand transition-colors text-center max-w-[80px] md:max-w-[120px]">
                    {cuisine.name}
                  </span>
                </Link>
              )))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 mt-8 md:mt-12 space-y-12 md:space-y-20">
        
        {/* Featured Section */}
        {(loading || featuredRestaurants.length > 0) && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-display font-black text-vibrant-dark">Featured Restaurants</h2>
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
            
            <div ref={featuredRef} className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-4 px-4 md:mx-0 md:px-0">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start animate-pulse">
                    <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                ))
              ) : (
                featuredRestaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start" />
                ))
              )}
            </div>
          </section>
        )}

        {/* Top Discount Section */}
        {(loading || discountedRestaurants.length > 0) && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-display font-black text-vibrant-dark">Top Discounts in {cityName}</h2>
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
            
            <div ref={discountRef} className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-4 px-4 md:mx-0 md:px-0">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start animate-pulse">
                    <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                ))
              ) : (
                discountedRestaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start" showFullOffer />
                ))
              )}
            </div>
          </section>
        )}

        {/* Nearby Section */}
        {(loading || nearbyRestaurants.length > 0) && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-display font-black text-vibrant-dark">Restaurants Near You</h2>
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
            
            <div ref={nearbyRef} className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-4 px-4 md:mx-0 md:px-0">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start animate-pulse">
                    <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                    <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                ))
              ) : (
                nearbyRestaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start" />
                ))
              )}
            </div>
          </section>
        )}

        {/* Main Listing Section */}
        <section id="all-restaurants" className="pt-8 md:pt-12 border-t border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-black text-vibrant-dark">
              {searchQuery ? `Search results for "${searchQuery}"` : `Explore All in ${cityName}`}
            </h2>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsFilterOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                  activeFilters.cuisines.length > 0 || activeFilters.minRating > 0 || activeFilters.onlyWithOffers
                    ? "bg-brand text-white border-brand border" 
                    : "bg-white border-gray-200 text-vibrant-dark border hover:border-brand shadow-sm"
                )}
              >
                <Filter size={16} />
                Filters
                {(activeFilters.cuisines.length > 0 || activeFilters.minRating > 0 || activeFilters.onlyWithOffers) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px] leading-tight">
                    {(activeFilters.cuisines.length > 0 ? 1 : 0) + (activeFilters.minRating > 0 ? 1 : 0) + (activeFilters.onlyWithOffers ? 1 : 0)}
                  </span>
                )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 gap-y-8 sm:gap-8 md:gap-x-10 md:gap-y-16">
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

      {/* Filter Drawer */}
      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[200] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 md:p-6 border-b flex items-center gap-3 max-w-4xl mx-auto w-full">
              <button 
                onClick={() => setIsSearchOverlayOpen(false)}
                className="p-2 -ml-2 text-vibrant-dark hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={18} />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Where would you like to eat?"
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 md:py-4 md:text-base text-sm font-bold focus:ring-2 focus:ring-brand"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Viewport content */}
            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto">
              {searchQuery.length > 0 ? (
                <div className="p-4 md:p-6 divide-y divide-gray-100">
                  {searchSuggestions.length > 0 ? (
                    <>
                      <div className="pb-3 pt-1">
                        <span className="text-[10px] md:text-xs font-black text-vibrant-gray uppercase tracking-[0.15em]">Restaurants</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchSuggestions.map(res => (
                          <Link 
                            key={res.id} 
                            to={getRestaurantUrl(res)}
                            onClick={() => {
                              setIsSearchOverlayOpen(false);
                              saveRecentSearch({
                                type: 'restaurant',
                                id: `res-${res.id}`,
                                name: res.name,
                                image: res.image || '',
                                city: res.city || res.location,
                                restaurantId: res.id,
                                subtitle: 'Restaurant'
                              });
                            }}
                            className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100"
                          >
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                              <img src={res.image} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-vibrant-dark md:text-lg truncate">{res.name}</h4>
                              <p className="text-xs md:text-sm text-vibrant-gray font-medium text-ellipsis overflow-hidden line-clamp-1">{res.cuisine} • {res.location}</p>
                              <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                                <div className="flex">
                                  {[1,2,3,4,5].map(i => (
                                    <Star key={i} size={10} fill={i <= res.rating ? "#FF4D00" : "none"} stroke={i <= res.rating ? "#FF4D00" : "#CBD5E1"} />
                                  ))}
                                </div>
                                <span className="text-[10px] md:text-xs font-bold text-brand ml-1">{res.rating}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <button 
                        onClick={() => setIsSearchOverlayOpen(false)}
                        className="w-full mt-6 py-4 bg-brand/5 text-brand font-black text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-brand/10 transition-colors"
                      >
                        SEE ALL RESULTS <ArrowRight size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Search size={32} className="md:w-10 md:h-10" />
                      </div>
                      <p className="text-vibrant-gray font-bold md:text-lg">No results found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 md:p-6">
                  {recentSearches.length > 0 && (
                    <div className="mb-10 md:mb-16">
                      <h4 className="text-xs md:text-sm font-black text-vibrant-gray uppercase tracking-widest mb-6">Recent Searches</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recentSearches.map(res => (
                          <div 
                            key={`rs-${res.id}`} 
                            onClick={() => {
                              setIsSearchOverlayOpen(false);
                              if (res.type === 'city') {
                                navigate(`/city/${res.name.toLowerCase()}`);
                              } else if (res.type === 'restaurant') {
                                navigate(`/restaurant/${res.restaurantId || res.id.replace('res-', '')}`);
                              }
                            }}
                            className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 text-left cursor-pointer"
                          >
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-slate-100">
                              {res.image ? (
                                <img src={res.image} alt={res.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  {res.type === 'city' ? <MapPin size={24} /> : <Search size={24} />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-vibrant-dark md:text-lg truncate">{res.name}</h4>
                              <p className="text-xs md:text-sm text-vibrant-gray font-medium text-ellipsis overflow-hidden line-clamp-1">{res.subtitle} {res.city ? `• ${res.city}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {cuisines.slice(0, 8).map(cuisine => (
                      <button
                        key={cuisine.id}
                        onClick={() => {
                          setSearchQuery(cuisine.name);
                        }}
                        className="flex items-center gap-3 p-3 md:p-4 bg-slate-50 rounded-2xl hover:bg-brand/5 active:scale-95 transition-all text-left group"
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shrink-0 border border-white group-hover:shadow-md transition-shadow">
                          <img src={cuisine.image} alt={cuisine.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-sm md:text-base text-vibrant-dark group-hover:text-brand transition-colors truncate">{cuisine.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-10 md:mt-16">
                    <h4 className="text-xs md:text-sm font-black text-vibrant-gray uppercase tracking-widest mb-6">Trending Near {cityName}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {featuredRestaurants.slice(0, 4).map(res => (
                        <div key={res.id} onClick={() => { 
                          setIsSearchOverlayOpen(false); 
                          saveRecentSearch({
                            type: 'restaurant',
                            id: `res-${res.id}`,
                            name: res.name,
                            image: res.image || '',
                            city: res.city || res.location,
                            restaurantId: res.id,
                            subtitle: 'Restaurant'
                          });
                          navigate(`/restaurant/${res.id}`); 
                        }} className="flex items-center gap-3 md:gap-4 cursor-pointer group p-3 md:p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                           <TrendingUp size={16} className="text-brand shrink-0" />
                           <span className="text-sm md:text-base font-bold text-vibrant-dark group-hover:text-brand transition-colors truncate">{res.name}</span>
                           <span className="text-[10px] md:text-xs bg-slate-100 text-vibrant-gray px-2 py-1 rounded font-black ml-auto whitespace-nowrap">{res.cuisine}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFilterOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-xl font-display font-black text-vibrant-dark">Filters</h3>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-10">
                {/* Cuisines */}
                <section>
                  <h4 className="text-sm font-black text-vibrant-gray uppercase tracking-widest mb-4">Cuisines</h4>
                  <div className="flex flex-wrap gap-2">
                    {cuisines.map(c => {
                      const isSelected = activeFilters.cuisines.includes(c.name);
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActiveFilters(prev => ({
                              ...prev,
                              cuisines: isSelected 
                                ? prev.cuisines.filter(name => name !== c.name)
                                : [...prev.cuisines, c.name]
                            }))
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all border-2",
                            isSelected 
                              ? "bg-brand/10 border-brand text-brand" 
                              : "bg-white border-gray-100 text-vibrant-dark hover:border-gray-300"
                          )}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Rating */}
                <section>
                  <h4 className="text-sm font-black text-vibrant-gray uppercase tracking-widest mb-4">Minimum Rating</h4>
                  <div className="flex gap-2">
                    {[0, 3, 3.5, 4, 4.5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => setActiveFilters(prev => ({ ...prev, minRating: rating }))}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2 flex flex-col items-center gap-1",
                          activeFilters.minRating === rating
                            ? "bg-brand/10 border-brand text-brand"
                            : "bg-white border-gray-100 text-vibrant-dark hover:border-gray-200"
                        )}
                      >
                        {rating === 0 ? 'Any' : (
                          <>
                            <div className="flex items-center gap-1">
                              {rating} <Star size={12} fill="currentColor" />
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Offers */}
                <section>
                  <h4 className="text-sm font-black text-vibrant-gray uppercase tracking-widest mb-4">Offers & Deals</h4>
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-slate-200 cursor-pointer transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <Percent size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-vibrant-dark">Exclusive Offers</p>
                        <p className="text-xs text-vibrant-gray font-medium">Show only restaurants with active deals</p>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-6 h-6 rounded-lg text-brand focus:ring-brand accent-brand border-gray-300"
                      checked={activeFilters.onlyWithOffers}
                      onChange={(e) => setActiveFilters(prev => ({ ...prev, onlyWithOffers: e.target.checked }))}
                    />
                  </label>
                </section>
              </div>

              <div className="p-6 border-t bg-slate-50 flex items-center gap-4">
                <button 
                  onClick={() => {
                    setActiveFilters({ cuisines: [], minRating: 0, onlyWithOffers: false });
                  }}
                  className="flex-1 py-4 text-sm font-black text-vibrant-gray hover:text-vibrant-dark transition-colors"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-[2] py-4 bg-vibrant-dark text-white rounded-2xl font-black text-sm shadow-xl hover:-translate-y-1 transition-all active:translate-y-0"
                >
                  Show Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
