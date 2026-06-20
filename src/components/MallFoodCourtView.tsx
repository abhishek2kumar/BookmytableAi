import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Store } from 'lucide-react';
import { useRestaurants, useMalls } from '../hooks/useFirebase';
import { cn, getRestaurantStatus } from '../lib/utils';
import { RestaurantCard } from './RestaurantCard';

export default function MallFoodCourtView() {
  const { city, mallSlug } = useParams();
  const navigate = useNavigate();
  const { restaurants, loading } = useRestaurants(true);
  const { malls } = useMalls();

  const { mallName, location, outlets, mallImage } = useMemo(() => {
    if (!mallSlug) return { mallName: '', location: '', outlets: [], mallImage: '' };

    // Group all by mallName + location slug
    const groups: { [slug: string]: { mallName: string, location: string, outlets: any[] } } = {};
    
    restaurants.forEach(r => {
      if (r.mallName) {
        let loc = (r.location || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (r.mallName.includes("Phoenix Avenue") && loc.includes("nagar-road")) {
           loc = "viman-nagar";
        }
        const slug = r.mallName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + 
                     "-" + loc;
                     
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

    const parsedGroup = groups[mallSlug] || { mallName: '', location: '', outlets: [] };

    // Find custom mall from db
    const predefinedMall = malls.find(m => {
      let loc = (m.location || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      if (m.name.includes("Phoenix Avenue") && loc.includes("nagar-road")) {
         loc = "viman-nagar";
      }
      const mSlug = (m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + loc);
      return mSlug === mallSlug || m.name.toLowerCase().trim() === parsedGroup.mallName.toLowerCase().trim();
    });

    let displayImage = predefinedMall?.image || parsedGroup.outlets[0]?.image || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop";

    return { 
      mallName: predefinedMall?.name || parsedGroup.mallName, 
      location: predefinedMall?.location || parsedGroup.location, 
      outlets: parsedGroup.outlets, 
      mallImage: displayImage 
    };
  }, [mallSlug, restaurants, malls]);

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
          onClick={() => navigate(city ? `/${city}` : '/')}
          className="px-6 py-2 bg-brand text-white rounded-xl font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="w-full h-48 md:h-64 relative bg-slate-100">
        <img 
          src={mallImage} 
          alt={mallName} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <button
          onClick={() => {
            if (window.history.state && window.history.state.idx > 0) {
              navigate(-1);
            } else {
              navigate(city ? `/${city}` : '/');
            }
          }}
          className="absolute top-4 left-4 md:top-6 md:left-6 z-20 w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center hover:bg-white/50 transition-colors shrink-0 border border-white/40 shadow-sm"
        >
          <ArrowLeft size={20} className="text-white drop-shadow-md" />
        </button>
        <div className="absolute bottom-4 left-4 md:left-8 text-white z-10">
          <h2 className="text-3xl font-bold text-white">{mallName}</h2>
          <p className="text-lg opacity-90 text-white flex items-center gap-1">
             <MapPin size={16} /> {location}
          </p>
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
          {outlets.map((restaurant) => {
            const status = getRestaurantStatus(restaurant);
            const isOpen = status.isOpen;

            return (
              <div key={restaurant.id} className={cn("relative group flex flex-col h-full", !isOpen && "opacity-60 grayscale-[50%]")}>
                <div className={cn(!isOpen && "pointer-events-none")}>
                  <RestaurantCard restaurant={restaurant} className="h-auto" hideCost hideLocation />
                </div>
                
                {/* Overlay for quick takeaway action */}
                <div className="mt-auto pt-3">
                  {isOpen ? (
                    <Link 
                      to={`/takeaway/${restaurant.id}`}
                      className="w-full block text-center py-2.5 bg-brand text-white bg-opacity-10 text-brand font-bold rounded-xl border border-brand hover:bg-brand hover:text-white transition-colors"
                    >
                      Order Takeaway
                    </Link>
                  ) : (
                    <button 
                      disabled
                      className="w-full block text-center py-2.5 bg-slate-100 text-slate-400 font-bold rounded-xl border border-slate-200 cursor-not-allowed"
                    >
                      Currently Closed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
