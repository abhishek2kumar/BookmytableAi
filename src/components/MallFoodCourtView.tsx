import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Store } from 'lucide-react';
import { useRestaurants } from '../hooks/useFirebase';
import { cn } from '../lib/utils';
import { RestaurantCard } from './RestaurantCard';

export default function MallFoodCourtView() {
  const { mallSlug } = useParams();
  const navigate = useNavigate();
  const { restaurants, loading } = useRestaurants(true);

  const { mallName, location, outlets } = useMemo(() => {
    if (!mallSlug) return { mallName: '', location: '', outlets: [] };

    // Group all by mallName + location slug
    const groups: { [slug: string]: { mallName: string, location: string, outlets: any[] } } = {};
    
    restaurants.forEach(r => {
      if (r.mallName) {
        const slug = r.mallName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + 
                     "-" + 
                     (r.location || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                     
        if (!groups[slug]) {
          groups[slug] = {
            mallName: r.mallName,
            location: r.location || '',
            outlets: []
          };
        }
        groups[slug].outlets.push(r);
      }
    });

    return groups[mallSlug] || { mallName: '', location: '', outlets: [] };
  }, [mallSlug, restaurants]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  if (!mallName || outlets.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h2 className="text-xl text-[#363636] font-normal mb-4">Mall or Food Court not found</h2>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-brand text-white rounded-xl font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-16 md:pt-20">
      {/* Header */}
      <div className="bg-white sticky top-16 md:top-20 z-40 shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
          >
            <ArrowLeft size={20} className="text-[#363636]" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#363636] leading-tight">
              Food Court @ {mallName}
            </h1>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <MapPin size={14} /> {location}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg md:text-xl font-bold text-[#363636] flex items-center gap-2">
            <Store size={20} className="text-brand" /> {outlets.length} Outlets inside
          </h2>
          <p className="text-sm font-medium text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
            Skip The Queue
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {outlets.map((restaurant) => (
            <div key={restaurant.id} className="relative group">
              <RestaurantCard restaurant={restaurant} />
              
              {/* Overlay for quick takeaway action */}
              <div className="mt-3">
                <Link 
                  to={`/takeaway/${restaurant.id}`}
                  className="w-full block text-center py-2.5 bg-brand text-white bg-opacity-10 text-brand font-bold rounded-xl border border-brand hover:bg-brand hover:text-white transition-colors"
                >
                  Order Takeaway
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
