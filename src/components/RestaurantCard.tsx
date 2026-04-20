import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MapPin, Zap, ArrowRight } from 'lucide-react';
import { Restaurant } from '../types';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';

interface RestaurantCardProps {
  restaurant: Restaurant & { distance?: number | null };
  className?: string;
  showFullOffer?: boolean;
}

export function RestaurantCard({ restaurant, className, showFullOffer }: RestaurantCardProps) {
  return (
    <Link to={`/restaurant/${restaurant.id}`} className={cn("group flex flex-col h-full bg-white rounded-[2.5rem] shadow-vibrant hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-100 hover:-translate-y-2", className)}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={restaurant.image || RESTAURANT_IMAGE_FALLBACK} 
          alt={restaurant.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
        
        {/* Offer Ribbon */}
        {restaurant.offers && restaurant.offers.length > 0 && (
          <div className="absolute bottom-4 left-0 right-0 px-4 pointer-events-none">
            <div className="bg-brand/90 backdrop-blur-md px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg border border-white/20 w-fit max-w-[95%]">
              <Zap size={14} className="text-white fill-white" />
              <span className="text-[10px] md:text-xs font-black text-white tracking-tight truncate leading-none uppercase">
                {restaurant.offers[0]}
              </span>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl flex items-center gap-1 shadow-md">
           <span className="text-xs font-black text-brand">{restaurant.rating}</span>
           <Star size={10} className="fill-brand text-brand" />
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow gap-2">
        <div className="flex justify-between items-start gap-4">
          <h3 className="text-xl font-display font-black text-slate-900 group-hover:text-brand transition-colors line-clamp-1 flex-1 leading-tight">
            {restaurant.name}
          </h3>
          {restaurant.distance !== undefined && restaurant.distance !== null && (
            <span className="shrink-0 text-[10px] font-black text-brand bg-brand/5 px-2 py-1 rounded-lg">
              {restaurant.distance} km
            </span>
          )}
        </div>
        
        <div className="flex justify-between items-center text-slate-500 font-bold text-xs">
          <span className="uppercase tracking-widest opacity-60">{restaurant.cuisine}</span>
          <span className="text-slate-800">₹{restaurant.avgPrice} for 2</span>
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
