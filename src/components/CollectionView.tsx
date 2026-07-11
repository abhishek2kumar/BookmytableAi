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

export default function CollectionView() {
  const { collectionSlug, city: paramsCity } = useParams();
  const navigate = useNavigate();
  const { diningCollections } = useMasterData();
  const { restaurants, loading } = useRestaurants(true);
  const { coords: userCoords, city: selectedCity } = useLocationContext();
  const [visibleCount, setVisibleCount] = useState(8);

  const cityToUse = paramsCity || selectedCity;

  const collectionInfo = diningCollections.find(c => c.slug === collectionSlug);
  const collectionName = collectionInfo?.name || collectionSlug?.replace(/-/g, ' ');

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
        const resCityNorm = res.city ? res.city.toLowerCase() : '';
        const selectedCityNorm = cityToUse.toLowerCase();
        
        const matchesCity = resCityNorm === selectedCityNorm || 
                          (res.location && res.location.toLowerCase().includes(selectedCityNorm));
        
        const hasExplicitCollections = Array.isArray(res.collections) && res.collections.length > 0;
        let matchesCollection = false;
        
        if (hasExplicitCollections && collectionSlug) {
           matchesCollection = res.collections!.includes(collectionSlug);
        } else if (!hasExplicitCollections) {
          matchesCollection = false; 
          // Old mock filtering logic
          if (collectionSlug === 'pure-veg') {
             matchesCollection = Array.isArray(res.cuisine) && (res.cuisine.includes('South Indian') || res.cuisine.includes('North Indian') || res.cuisine.includes('Vegetarian'));
          } else if (collectionSlug === 'cafe') {
             matchesCollection = Array.isArray(res.cuisine) && (res.cuisine.includes('Cafe') || res.cuisine.includes('Desserts') || res.cuisine.includes('Healthy Food'));
          } else if (collectionSlug === 'live-music' || collectionSlug === 'microbrewery') {
             matchesCollection = Array.isArray(res.cuisine) && (res.cuisine.includes('Continental') || res.cuisine.includes('Italian') || res.cuisine.includes('Bar Food'));
          }
        }
        
        return matchesCity && matchesCollection;
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

  if (!collectionInfo && !loading && restaurants.length > 0) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
             <Info size={48} className="text-slate-300 mb-4" />
             <h2 className="text-xl font-normal leading-[1.2]">Collection not found</h2>
             <button onClick={() => navigate('/')} className="mt-4 text-brand font-bold">Back to Home</button>
        </div>
     )
  }

  
  const getSeoData = () => {
    let locName = collectionName || collectionSlug || 'Collection';
    let url = `https://www.bookmytable.co.in/${cityToUse}/collections/${collectionSlug}`;
    let title = `${locName} Restaurants, ${cityToUse} - Bookmytable`;
    let description = `Explore ${locName} restaurants in ${cityToUse} and book table instantly with discounts on Bookmytable...`;
    let keywords = `book table online, resturants in ${cityToUse}, restaurants in ${locName}, online table booking, bookmytable, booking, hotel, resturant`;
    
    const itemListElement = filteredRestaurants.slice(0, 15).map((r, index) => {
      const seoCity = r.city ? r.city.toLowerCase().replace(/[^a-z0-9]+/g, '-') : "ind";
      const seoName = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const seoLoc = r.location ? r.location.toLowerCase().replace(/[^a-z0-9]+/g, '-') : "";
      const combined = seoLoc ? `${seoName}-${seoLoc}` : seoName;
      return {
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "FoodEstablishment",
          "name": r.name,
          "url": `https://www.bookmytable.co.in/${seoCity}/restaurant/${combined}`
        }
      };
    });

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": itemListElement
    };

    return { title, url, description, keywords, locName, jsonLd };
  };

  const seoData = getSeoData();

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <Helmet>
        <title>{seoData.title}</title>
        <link rel="alternate" hrefLang="en" href={seoData.url} /> 
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta property="og:title" content={`${seoData.locName} Restaurants, ${cityToUse} - Bookmytable India`} />
        <meta property="og:description" content={seoData.description} />
        <script type="application/ld+json">
          {JSON.stringify(seoData.jsonLd)}
        </script>
      </Helmet>
      {/* Immersive Header Section */}
      <div className="relative h-[350px] md:h-[450px] flex items-center justify-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={collectionInfo?.image} 
            alt={collectionName || 'Collection'} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-6"
          >
            <Link to={`/${cityToUse}`} className="text-xs font-normal leading-[1.2] text-white hover:text-brand transition-colors uppercase tracking-widest flex items-center gap-1">
               <ChevronLeft size={12} /> Back to explore
            </Link>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-normal leading-[1.2] text-white mb-6 tracking-tight drop-shadow-2xl"
          >
            {collectionName}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white font-bold text-lg md:text-2xl max-w-2xl mx-auto drop-shadow-lg mb-8"
          >
            {collectionInfo?.description}
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
            <h3 className="text-xl mb-2 text-[#363636] font-normal leading-[1.2]">No {collectionName} restaurants yet</h3>
            <p className="text-slate-500">We couldn't find any results in this collection.</p>
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
