import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useBookings, useFavoriteRestaurants } from '../hooks/useFirebase';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { formatDate, formatTime, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';
import { Calendar, Clock, Users, MapPin, ChevronRight, Utensils, XCircle, Loader2, Heart, Search, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import AppIcon from './AppIcon';

export default function DashboardView() {
  const { user, profile } = useAuth();
  const { bookings, loading: bookingsLoading } = useBookings(user?.uid, profile?.role);
  const { favorites, loading: favoritesLoading } = useFavoriteRestaurants(profile?.favorites);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'favorites'>('bookings');

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    
    setCancellingId(bookingId);
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await updateDoc(docRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-white p-10 rounded-2xl text-center max-w-md shadow-vibrant border border-gray-200">
          <AppIcon className="mx-auto grayscale opacity-20 mb-6" size={80} />
          <h2 className="text-2xl font-display font-bold text-vibrant-dark mb-4">Your Bookings</h2>
          <p className="text-vibrant-gray mb-8">Please sign in to view and manage your table reservations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-display font-black text-vibrant-dark mb-2 tracking-tight">Your Dashboard</h1>
          <p className="text-vibrant-gray font-bold opacity-60 uppercase text-[10px] tracking-[0.2em]">Manage your dining life</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('bookings')}
            className={cn(
              "px-8 py-3 rounded-xl text-sm font-black transition-all",
              activeTab === 'bookings' ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Reservations
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={cn(
              "px-8 py-3 rounded-xl text-sm font-black transition-all",
              activeTab === 'favorites' ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Favorites
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'bookings' ? (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {bookingsLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 animate-pulse h-40 shadow-sm" />
                ))}
              </div>
            ) : bookings.length > 0 ? (
              <div className="grid gap-6">
                {bookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-vibrant overflow-hidden hover:shadow-xl transition-all group"
                  >
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-64 h-48 md:h-auto shrink-0 relative overflow-hidden">
                        <img 
                          src={booking.restaurantImage || RESTAURANT_IMAGE_FALLBACK} 
                          alt={booking.restaurantName}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                        <div className={cn(
                          "absolute top-4 left-4 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm",
                          booking.status === 'confirmed' ? "bg-emerald-500 text-white" :
                          booking.status === 'cancelled' ? "bg-red-500 text-white" :
                          "bg-amber-500 text-white"
                        )}>
                          {booking.status}
                        </div>
                      </div>

                      <div className="flex-grow p-6 md:p-10 flex flex-col">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                          <div>
                            <h3 className="text-2xl font-display font-black text-vibrant-dark mb-1 group-hover:text-brand transition-colors">
                              {booking.restaurantName}
                            </h3>
                            <p className="text-[10px] text-vibrant-gray font-black uppercase tracking-widest opacity-40">
                              Ref: {booking.id.slice(-8).toUpperCase()}
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                              <Calendar className="text-brand shrink-0" size={16} />
                              <span className="text-sm font-black text-slate-700">{formatDate(booking.dateTime)}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                              <Clock className="text-brand shrink-0" size={16} />
                              <span className="text-sm font-black text-slate-700">{formatTime(booking.dateTime)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-8 pt-6 border-t border-dashed border-gray-100 mt-auto">
                          <div className="flex items-center gap-2 text-slate-500 font-bold">
                            <Users size={18} className="text-brand" />
                            <span className="text-sm">{booking.guests} Guests</span>
                          </div>
                          <Link 
                            to={`/restaurant/${booking.restaurantId}`}
                            className="flex items-center gap-2 text-slate-500 hover:text-brand transition-all text-sm font-black uppercase tracking-tighter"
                          >
                            <MapPin size={16} className="text-brand" />
                            Directions
                          </Link>

                          {booking.status === 'pending' && (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              disabled={cancellingId === booking.id}
                              className="ml-auto flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors text-sm font-black uppercase tracking-widest"
                            >
                              {cancellingId === booking.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <XCircle size={16} />
                              )}
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                  <Calendar size={40} />
                </div>
                <h3 className="text-2xl font-display font-black text-vibrant-dark mb-2">No active bookings</h3>
                <p className="text-vibrant-gray font-bold opacity-60 mb-8 max-w-sm">You haven't made any reservations yet. Start exploring the best tables in town!</p>
                <Link 
                  to="/" 
                  className="bg-brand text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  Find a Restaurant
                </Link>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="favorites"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {favoritesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="aspect-[4/5] bg-white rounded-3xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {favorites.map((res, index) => (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Link to={`/restaurant/${res.id}`} className="block bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
                      <div className="aspect-[4/5] relative overflow-hidden">
                        <img 
                          src={res.image || RESTAURANT_IMAGE_FALLBACK} 
                          alt={res.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                        
                        <div className="absolute top-6 right-6">
                           <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-white">
                              <Heart size={20} className="fill-red-500 text-red-500" />
                           </div>
                        </div>

                        <div className="absolute bottom-6 left-6 right-6 text-white">
                          <div className="flex items-center gap-1.5 mb-2">
                             <div className="bg-emerald-500 px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1">
                                {res.rating} <Star size={10} className="fill-white" />
                             </div>
                             <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">{res.cuisine}</span>
                          </div>
                          <h3 className="text-2xl font-display font-black leading-tight mb-1">{res.name}</h3>
                          <p className="text-xs font-medium opacity-70 flex items-center gap-1">
                            <MapPin size={12} /> {res.location}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                  <Heart size={40} />
                </div>
                <h3 className="text-2xl font-display font-black text-vibrant-dark mb-2">No favorites yet</h3>
                <p className="text-vibrant-gray font-bold opacity-60 mb-8 max-w-sm">Tap the heart icon on any restaurant to save it here for quick access.</p>
                <Link 
                  to="/" 
                  className="bg-brand text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  Go Exploring
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

