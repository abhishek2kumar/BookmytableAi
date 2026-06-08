import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Zap, ArrowRight } from 'lucide-react';
import { Restaurant } from '../types';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, getRestaurantUrl, getRestaurantStatus, getRatingColor } from '../lib/utils';

interface RestaurantCardProps {
  restaurant: Restaurant & { distance?: number | null };
  className?: string;
  showFullOffer?: boolean;
}

export function RestaurantCard({ restaurant, className, showFullOffer }: RestaurantCardProps) {
  const status = getRestaurantStatus(restaurant);
  const ratingBg = getRatingColor(restaurant.rating || 0);

  return (
    <Link to={getRestaurantUrl(restaurant)} className={cn("group flex flex-col h-full bg-white rounded-lg shadow-vibrant hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-300 hover:-translate-y-2", className)}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={restaurant.image || RESTAURANT_IMAGE_FALLBACK} 
          alt={restaurant.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
           <div className={cn(
             "w-2 h-2 rounded-full",
             status.isOpen ? "bg-vibrant-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"
           )} />
           <span className={cn("text-[10px] font-black uppercase tracking-wider", status.color)}>
             {status.isOpen ? 'Open Now' : 'Closed'}
           </span>
        </div>

        {/* Offer Ribbon */}
        {restaurant.offers && restaurant.offers.length > 0 && (
          <div className="absolute bottom-4 left-0 right-0 px-4 pointer-events-none">
            <div className="bg-brand/90 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg border border-white/20 w-fit max-w-[95%]">
              <Zap size={14} className="text-white fill-white" />
              <span className="text-[10px] md:text-xs font-normal leading-[1.2] text-white tracking-tight truncate leading-none uppercase">
                {restaurant.offers[0].title}
              </span>
            </div>
          </div>
        )}

        <div className={cn("absolute top-4 right-4 backdrop-blur-md px-2 py-1 rounded-xl flex items-center gap-1 shadow-md", ratingBg)}>
           <span className="text-xs font-black">{restaurant.rating}</span>
           <Star size={10} className="fill-current" />
        </div>
      </div>
      
      <div className="p-4 md:p-5 flex flex-col flex-grow gap-1.5 md:gap-2">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-base md:text-lg group-hover:text-brand transition-colors line-clamp-1 flex-1 text-[#363636] font-normal leading-[1.2]">
            {restaurant.name}
          </h3>
          {restaurant.distance !== undefined && restaurant.distance !== null && (
            <span className="shrink-0 text-[10px] font-normal leading-[1.2] text-brand bg-brand/5 px-2 py-1 rounded-lg">
              {restaurant.distance} km
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center text-slate-500 font-medium text-[10px] md:text-[11px]">
          <span className="uppercase tracking-widest opacity-60 line-clamp-1">
            {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine}
          </span>
          <span className="text-[#363636] shrink-0 ml-2">₹{restaurant.avgPrice} for 2</span>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
          <div className="flex items-center gap-1 truncate text-slate-400 font-medium">
            <MapPin size={12} className="shrink-0" />
            <span className="text-[11px] truncate">{restaurant.location}</span>
          </div>
          <ArrowRight size={16} className="text-brand opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
