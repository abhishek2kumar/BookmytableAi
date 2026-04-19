import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useBookings } from '../hooks/useFirebase';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { formatDate, formatTime, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';
import { Calendar, Clock, Users, MapPin, ChevronRight, Utensils, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function DashboardView() {
  const { user, profile } = useAuth();
  const { bookings, loading } = useBookings(user?.uid, profile?.role);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
          <Utensils className="mx-auto text-vibrant-gray opacity-20 mb-6" size={64} />
          <h2 className="text-2xl font-display font-bold text-vibrant-dark mb-4">Your Bookings</h2>
          <p className="text-vibrant-gray mb-8">Please sign in to view and manage your table reservations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-vibrant-dark mb-2">My Bookings</h1>
          <p className="text-vibrant-gray">Track and manage your restaurant reservations.</p>
        </div>
        <Link 
          to="/" 
          className="hidden sm:flex items-center gap-2 text-brand font-bold hover:gap-3 transition-all"
        >
          Book more <ChevronRight size={20} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 animate-pulse h-40 shadow-sm" />
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
              className="bg-white rounded-2xl border border-gray-200 shadow-vibrant overflow-hidden hover:shadow-lg transition-shadow group"
            >
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-64 h-48 md:h-auto shrink-0 relative overflow-hidden">
                  <img 
                    src={booking.restaurantImage || RESTAURANT_IMAGE_FALLBACK} 
                    alt={booking.restaurantName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
                  />
                  <div className={cn(
                    "absolute top-4 left-4 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm",
                    booking.status === 'confirmed' ? "bg-vibrant-success text-white" :
                    booking.status === 'cancelled' ? "bg-red-500 text-white" :
                    "bg-brand text-white"
                  )}>
                    {booking.status}
                  </div>
                </div>

                <div className="flex-grow p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-display font-bold text-vibrant-dark mb-1 group-hover:text-brand transition-colors">
                        {booking.restaurantName}
                      </h3>
                      <p className="text-[10px] text-vibrant-gray font-bold uppercase tracking-widest opacity-60">
                        Booking ID: #{booking.id.slice(-6).toUpperCase()}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 bg-brand-light px-4 py-2 rounded-lg border border-brand/10">
                        <Calendar className="text-brand shrink-0" size={16} />
                        <span className="text-sm font-bold text-brand">{formatDate(booking.dateTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-brand-light px-4 py-2 rounded-lg border border-brand/10">
                        <Clock className="text-brand shrink-0" size={16} />
                        <span className="text-sm font-bold text-brand">{formatTime(booking.dateTime)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 py-4 border-t border-dashed border-gray-200 mt-auto">
                    <div className="flex items-center gap-2 text-vibrant-gray font-medium">
                      <Users size={18} />
                      <span className="text-sm">{booking.guests} Guests</span>
                    </div>
                    <Link 
                      to={`/restaurant/${booking.restaurantId}`}
                      className="flex items-center gap-1 text-vibrant-gray hover:text-brand transition-colors text-sm font-bold"
                    >
                      <MapPin size={16} />
                      View Restaurant
                    </Link>

                    {booking.status === 'pending' && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="ml-auto flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors text-sm font-bold"
                      >
                        {cancellingId === booking.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Utensils className="mx-auto text-vibrant-gray opacity-20 mb-6" size={64} />
          <h3 className="text-xl font-display font-bold text-vibrant-dark mb-2">No bookings yet</h3>
          <p className="text-vibrant-gray mb-8">Ready to explore amazing dining experiences?</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 bg-brand text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all"
          >
            Find a Restaurant <Search size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}

function Search({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  );
}
