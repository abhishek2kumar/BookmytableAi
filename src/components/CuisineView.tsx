import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRestaurants } from '../hooks/useFirebase';
import { useMasterData } from './MasterDataContext';
import { Star, MapPin, ChevronLeft, Zap, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, getRestaurantUrl, getRatingColor } from '../lib/utils';
import { RestaurantCard } from './RestaurantCard';
import { useLocationContext } from './LocationContext';

export default function CuisineView() {
  const { city, cuisineId } = useParams();
  const navigate = useNavigate();
  const { cuisines } = useMasterData();
  const { restaurants, loading } = useRestaurants(true);
  const { coords: userCoords, city: selectedCity } = useLocationContext();
  const currentCityName = city ? city.charAt(0).toUpperCase() + city.slice(1) : selectedCity;
  const [visibleCount, setVisibleCount] = useState(8);

  const cuisineInfo = cuisines.find(c => c.id === cuisineId || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === cuisineId);
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
        const matchesCuisine = Array.isArray(res.cuisine) 
          ? res.cuisine.some((c: string) => c.toLowerCase() === cuisineName?.toLowerCase())
          : (res.cuisine as unknown as string)?.toLowerCase() === cuisineName?.toLowerCase();
        
        // Normalize city names for comparison
        const resCityNorm = res.city ? res.city.toLowerCase() : '';
        const selectedCityNorm = currentCityName.toLowerCase();
        
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
             <h2 className="text-xl font-normal leading-[1.2]">Cuisine not found</h2>
             <button onClick={() => navigate('/')} className="mt-4 text-brand font-bold">Back to Home</button>
        </div>
     )
  }

  
  const getSeoData = () => {
    let locName = cuisineName || cuisineId || 'Cuisine';
    let url = `https://www.bookmytable.co.in/${currentCityName.toLowerCase()}/cuisine/${cuisineId}`;
    let title = `Explore Best ${locName} Restaurants in ${currentCityName} - Bookmytable`;
    let description = `Explore ${locName} restaurants in ${currentCityName} and book table instantly with discounts on Bookmytable...`;
    let keywords = `best ${locName} restaurant in ${currentCityName}, book table online, resturants in ${currentCityName}, restaurants in ${locName}, online table booking, bookmytable, booking, hotel, resturant`;

    // Generate JSON-LD Schema for the list of restaurants
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": filteredRestaurants.slice(0, 10).map((res, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Restaurant",
          "name": res.name,
          "image": res.images?.[0] || RESTAURANT_IMAGE_FALLBACK,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": currentCityName,
            "addressRegion": res.location,
            "addressCountry": "IN"
          },
          "servesCuisine": locName,
          "url": `https://www.bookmytable.co.in${getRestaurantUrl(res)}`
        }
      }))
    };

    return { title, url, description, keywords, locName, schemaData };
  };

  const seoData = getSeoData();

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <Helmet>
        <title>{seoData.title}</title>
        <link rel="alternate" hrefLang="en" href={seoData.url} /> 
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta name="url" content={seoData.url} />
        <meta name="twitter:app:name:iphone" content="Bookmytable" />
        <meta name="twitter:app:name:ipad" content="Bookmytable" />
        <meta name="twitter:app:country" content="in" />
        <meta property="og:title" content={seoData.title} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoData.url} />
        <meta property="og:site_name" content="Bookmytable" />
        <meta property="og:description" content={seoData.description} />
        <script type="application/ld+json">
          {JSON.stringify(seoData.schemaData)}
        </script>
      </Helmet>
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
            <Link to={`/${(selectedCity || "bangalore").toLowerCase()}`} className="text-xs font-normal leading-[1.2] text-white hover:text-brand transition-colors uppercase tracking-widest flex items-center gap-1">
               <ChevronLeft size={12} /> Back to explore
            </Link>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-normal leading-[1.2] text-white mb-6 tracking-tight drop-shadow-2xl"
          >
            Best {cuisineName} Restaurants in {currentCityName}
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
                <RestaurantCard restaurant={restaurant as any} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <h3 className="text-xl mb-2 text-[#363636] font-normal leading-[1.2]">No {cuisineName} restaurants yet</h3>
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
