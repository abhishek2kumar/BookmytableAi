import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Zap, ArrowRight, Heart } from 'lucide-react';
import { Restaurant } from '../types';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, getRestaurantUrl, getRestaurantStatus, getRatingColor } from '../lib/utils';
import { useAuth } from './AuthProvider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RestaurantCardProps {
  restaurant: Restaurant & { distance?: number | null };
  className?: string;
  showFullOffer?: boolean;
  hideCost?: boolean;
  hideLocation?: boolean;
}

export function RestaurantCard({ restaurant, className, showFullOffer, hideCost, hideLocation }: RestaurantCardProps) {
  const { user, profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const status = getRestaurantStatus(restaurant);
  const ratingBg = getRatingColor(restaurant.rating || 0);

  const initialFavorite = profile?.favorites?.includes(typeof restaurant.id === 'string' ? restaurant.id : String(restaurant.id)) || false;
  const [isFavoriteLocal, setIsFavoriteLocal] = useState(initialFavorite);

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setIsFavoriteLocal(initialFavorite);
  }, [initialFavorite]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !profile || isUpdating) return;
    
    // Optimistic update
    const previousState = isFavoriteLocal;
    setIsFavoriteLocal(!previousState);
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const currentFavorites = profile.favorites || [];
      const resId = typeof restaurant.id === 'string' ? restaurant.id : String(restaurant.id);
      
      let newFavorites;
      if (previousState) {
        newFavorites = currentFavorites.filter((favId: string) => favId !== resId);
      } else {
        newFavorites = [...currentFavorites, resId];
      }

      await updateDoc(userRef, {
        favorites: newFavorites,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Revert on error
      setIsFavoriteLocal(previousState);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Link to={getRestaurantUrl(restaurant)} className={cn("group flex flex-col h-full bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 hover:-translate-y-1 relative", className)}>
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img 
          src={restaurant.image || RESTAURANT_IMAGE_FALLBACK} 
          alt={restaurant.name}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          referrerPolicy="no-referrer"
          onError={(e) => {
            handleImageError(e);
            setImageLoaded(true);
          }}
        />
        
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
        
        {/* Top Right Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button 
            onClick={handleFavorite}
            className={cn(
              "p-1.5 transition-all drop-shadow-md",
              isFavoriteLocal 
                ? "text-red-500 scale-110" 
                : "text-white hover:text-red-500 hover:scale-110"
            )}
          >
            <Heart size={20} strokeWidth={2.5} className={isFavoriteLocal ? "fill-current" : ""} />
          </button>
        </div>

        {/* Floating Rating Badge */}
        <div className={cn("absolute top-3 left-3 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm", ratingBg, "text-white")}>
           <span className="text-[13px] font-bold">{restaurant.rating}</span>
           <Star size={12} className="fill-current" />
        </div>

        {/* Discount Ribbon */}
        {restaurant.offers && restaurant.offers.length > 0 && (
          <div className="absolute bottom-0 left-0 w-full pointer-events-none">
            <div className="bg-gradient-to-r from-brand via-brand/90 to-transparent text-white px-3 py-2 flex items-center gap-1.5">
              <Zap size={14} className="fill-current flex-shrink-0" />
              <span className="text-xs md:text-sm font-bold truncate tracking-wide">
                {restaurant.offers[0].title}
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-grow gap-1.5">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-base md:text-lg group-hover:text-brand transition-colors line-clamp-1 flex-1 text-[#363636] font-bold leading-tight">
            {restaurant.name}
          </h3>
          {restaurant.distance !== undefined && restaurant.distance !== null && (
            <span className="shrink-0 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {restaurant.distance} km
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center text-slate-500">
          <span className="text-xs md:text-[13px] truncate pr-2">
            {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine}
          </span>
          {!hideCost && <span className="text-[#363636] text-[13px] font-medium shrink-0">₹{restaurant.avgPrice} for 2</span>}
        </div>

        {!hideLocation && (
          <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-1.5 truncate text-slate-500">
              <MapPin size={14} className="shrink-0 text-brand" />
              <span className="text-xs truncate">{restaurant.location}</span>
            </div>
            {status.isOpen ? (
              <ArrowRight size={16} className="text-brand opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            ) : (
              <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Closed</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
