import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useBookings, useFavoriteRestaurants, useRestaurants } from '../hooks/useFirebase';
import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, query, collection, where, onSnapshot } from 'firebase/firestore';
import { formatDate, formatTime, formatAddress, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, getRestaurantUrl, getRatingColor } from '../lib/utils';
import { Calendar, Clock, Users, MapPin, ChevronRight, Utensils, XCircle, Loader2, Heart, Search, Star, Tag, User, Phone, CornerUpRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import AppIcon from './AppIcon';

export default function DashboardView() {
  const { user, profile } = useAuth();
  const { bookings, loading: bookingsLoading } = useBookings(user?.uid, profile?.role);
  const { favorites, loading: favoritesLoading } = useFavoriteRestaurants(profile?.favorites);
  const { restaurants } = useRestaurants(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [takeawayOrders, setTakeawayOrders] = useState<any[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  useEffect(() => { if(!user) return; const q = query(collection(db, 'orders'), where('userId','==',user.uid)); const un = onSnapshot(q, s => setTakeawayOrders(s.docs.map(d => ({id: d.id, ...d.data()})))); return () => un(); }, [user]);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'bookings' | 'favorites' | 'profile' | 'takeawayOrders') || 'bookings';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await updateDoc(docRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
      setConfirmCancelId(null);
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
          <h2 className="text-2xl mb-4 text-[#363636] font-normal leading-[1.2]">Your Bookings</h2>
          <p className="text-vibrant-gray mb-8">Please sign in to view and manage your table reservations.</p>
        </div>
      </div>
    );
  }

  const filteredBookings = bookings.filter(b => {
    if (bookingFilter === 'cancelled') return b.status === 'cancelled';
    const d = b.dateTime?.toDate ? b.dateTime.toDate() : new Date(b.dateTime);
    if (bookingFilter === 'past') return d < new Date() && b.status !== 'cancelled';
    return d >= new Date() && b.status !== 'cancelled';
  });

  return (
    <div className={cn("max-w-7xl mx-auto pb-32", activeTab === 'profile' ? "px-0 md:px-6 lg:px-8 py-0 md:py-6 lg:py-12" : "px-4 py-12")}>
      {activeTab !== 'profile' && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="flex flex-col">
            <h1 className="text-4xl mb-2 text-[#363636] font-normal leading-[1.2]">
              {activeTab === 'favorites' ? 'Your Favorites' : activeTab === 'takeawayOrders' ? 'Your Food Orders' : 'Your Bookings'}
            </h1>
            <p className="text-vibrant-gray font-bold opacity-60 uppercase text-[10px] tracking-[0.2em]">
              Manage your dining life
            </p>
          </div>
          
          {activeTab === 'bookings' && (
              <div className="flex flex-wrap items-center gap-2 md:gap-4 pb-1">
                <button
                  onClick={() => setBookingFilter('past')}
                  className={`px-5 py-2 md:px-8 md:py-2.5 flex justify-center items-center gap-2 rounded-xl text-[14px] md:text-sm font-medium transition-colors ${bookingFilter === 'past' ? 'bg-brand text-white hover:bg-brand-dark border border-brand' : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'}`}
                >
                  Past
                </button>
                <button
                  onClick={() => setBookingFilter('upcoming')}
                  className={`px-5 py-2 md:px-8 md:py-2.5 flex justify-center items-center gap-2 rounded-xl text-[14px] md:text-sm font-medium transition-colors ${bookingFilter === 'upcoming' ? 'bg-brand text-white hover:bg-brand-dark border border-brand' : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'}`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setBookingFilter('cancelled')}
                  className={`px-5 py-2 md:px-8 md:py-2.5 flex justify-center items-center gap-2 rounded-xl text-[14px] md:text-sm font-medium transition-colors ${bookingFilter === 'cancelled' ? 'bg-brand text-white hover:bg-brand-dark border border-brand' : 'bg-white text-slate-500 border border-slate-300 hover:bg-slate-50'}`}
                >
                  Cancelled
                </button>
              </div>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-2xl mx-auto w-full md:h-auto min-h-screen md:min-h-0"
          >
            <div className="bg-white rounded-none md:rounded-[32px] p-8 md:p-12 md:shadow-vibrant border-0 md:border border-gray-100 flex flex-col items-center text-center overflow-hidden relative min-h-screen md:min-h-0">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-brand/10 to-transparent" />
              <div className="relative z-10 flex flex-col items-center">
                 <img src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=0D8ABC&color=fff`} alt={profile?.displayName || ''} className="w-32 h-32 rounded-full shadow-lg border-4 border-white mb-6" />
                 <h2 className="text-3xl text-[#363636] font-normal leading-[1.2]">{profile?.displayName}</h2>
                 <p className="text-slate-500 font-bold">{user?.email}</p>
                 <p className="text-slate-500 font-bold mb-8">{profile?.phone || 'No phone number added'}</p>
                 
                 <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-300">
                   <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-4 text-left font-normal leading-[1.2]">Account Details</h3>
                   <div className="space-y-4 text-left">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-300">
                        <span className="text-sm font-bold text-slate-500">Phone Number</span>
                        <span className="text-sm font-normal text-[#363636] leading-[1.2]">{profile?.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-slate-300">
                        <span className="text-sm font-bold text-slate-500">Member Since</span>
                        <span className="text-sm font-normal text-[#363636] leading-[1.2]">
                          {profile?.createdAt?.toDate 
                            ? profile.createdAt.toDate().toLocaleDateString()
                            : profile?.createdAt?.seconds 
                            ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() 
                            : (profile?.createdAt && !isNaN(new Date(profile.createdAt).getTime()) 
                                ? new Date(profile.createdAt).toLocaleDateString() 
                                : 'N/A')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-slate-300">
                        <span className="text-sm font-bold text-slate-500">Role</span>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-brand/10 text-brand px-3 py-1 rounded-full">{profile?.role || 'user'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-500">Total Bookings</span>
                        <span className="text-sm font-normal text-[#363636] leading-[1.2]">{bookings.length}</span>
                      </div>
                   </div>
                 </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'bookings' ? (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {bookingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white p-6 rounded-[24px] border border-gray-100 animate-pulse h-40 shadow-sm" />
                ))}
              </div>
            ) : filteredBookings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredBookings.map((booking, index) => {
                  const restaurant = restaurants.find(r => r.id === booking.restaurantId);
                  const bookedOnDate = booking.createdAt?.toDate ? booking.createdAt.toDate().toLocaleDateString() : (booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString() : (booking.createdAt && !isNaN(new Date(booking.createdAt).getTime()) ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'));

                  return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-500 group flex flex-col"
                  >
                    <div className="w-full h-40 md:h-48 relative overflow-hidden shrink-0">
                      <img 
                        src={restaurant?.image || booking.restaurantImage || RESTAURANT_IMAGE_FALLBACK} 
                        alt={booking.restaurantName}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                      />
                      <div className={cn(
                        "absolute top-4 left-4 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm",
                        booking.status === 'confirmed' ? "bg-emerald-500 text-white" :
                        booking.status === 'cancelled' ? "bg-red-500 text-white" :
                        "bg-amber-500 text-white"
                      )}>
                        {booking.status}
                      </div>
                    </div>

                    <div className="p-4 flex-grow flex flex-col">
                      <h3 className="text-[1.6rem] mb-1 group-hover:text-brand transition-colors text-[#363636] font-normal leading-[1.2]">
                        {booking.restaurantName}
                      </h3>
                      <p className="text-slate-500 text-sm font-light mb-5">
                        {formatAddress(restaurant?.address || restaurant?.location) || "Address not available"}
                      </p>
                      
                      <div className="flex flex-col gap-1.5 mb-5 p-2">
                         <div className="flex items-center gap-2 text-slate-600 text-[13px] font-light">
                           <Clock className="text-brand shrink-0" size={14} />
                           <span><span className="font-normal text-[#363636]">Booked on:</span> {bookedOnDate}</span>
                         </div>
                         <div className="flex items-center gap-2 text-slate-600 text-[13px] font-light">
                           <Calendar className="text-brand shrink-0" size={14} />
                           <span><span className="font-normal text-[#363636]">For:</span> {formatDate(booking.date || booking.dateTime)} at {booking.time || formatTime(booking.dateTime)}</span>
                         </div>
                         <div className="flex items-center gap-2 text-slate-600 text-[13px] font-light">
                           <Users className="text-brand shrink-0" size={14} />
                           <span><span className="font-normal text-[#363636]">Guests:</span> {booking.guests} Guests</span>
                         </div>
                      </div>

                      <div className="border-t border-dashed border-slate-200 w-full my-4 flex-grow" />

                      <div className="flex flex-col sm:flex-row gap-2 xl:gap-3 mt-auto">
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant?.address || `${booking.restaurantName}, ${restaurant?.city || ''}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-1 justify-center items-center gap-1.5 rounded-xl border border-brand text-brand hover:bg-brand/5 transition-colors flex text-[13px] md:text-xs lg:text-[13px] font-medium whitespace-nowrap"
                        >
                          <CornerUpRight size={14} className="bg-brand/10 p-0.5 rounded-sm" /> Directions
                        </a>
                        
                        {(restaurant?.contactNumber) ? (
                           <a 
                             href={`tel:${restaurant.contactNumber}`}
                             className="flex-1 py-2 px-1 justify-center items-center gap-1.5 rounded-xl border border-brand text-brand hover:bg-brand/5 transition-colors flex text-[13px] md:text-xs lg:text-[13px] font-medium whitespace-nowrap"
                           >
                             <Phone size={14} /> Call Restaurant
                           </a>
                        ) : booking.status === 'pending' ? (
                           <button
                             onClick={() => setConfirmCancelId(booking.id)}
                             disabled={cancellingId === booking.id}
                             className="flex-1 py-2 px-1 justify-center items-center gap-1.5 rounded-xl border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors flex text-[13px] md:text-xs lg:text-[13px] whitespace-nowrap"
                           >
                             <XCircle size={14} />
                             Cancel
                           </button>
                        ) : null}
                      </div>

                      {((restaurant?.contactNumber) && booking.status === 'pending') && (
                        <button
                          onClick={() => setConfirmCancelId(booking.id)}
                          disabled={cancellingId === booking.id}
                          className="w-full mt-3 py-2 px-1 flex justify-center items-center gap-1.5 rounded-xl border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-[13px] md:text-xs lg:text-[13px] whitespace-nowrap"
                        >
                          <XCircle size={14} />
                          Cancel Booking
                        </button>
                      )}

                      {(() => {
                        const d = booking.dateTime?.toDate ? booking.dateTime.toDate() : new Date(booking.dateTime);
                        if (booking.status === 'confirmed' && d < new Date()) {
                          return (
                            <Link
                              to={`${getRestaurantUrl(restaurant || null, booking.restaurantId, booking.restaurantName)}#review`}
                              className="w-full mt-3 py-2 flex justify-center items-center gap-2 rounded-xl bg-brand text-white font-medium hover:bg-brand-dark transition-colors text-sm"
                            >
                              <Star size={16} />
                              Leave a Review
                            </Link>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-24 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                  <Calendar size={40} />
                </div>
                <h3 className="text-2xl mb-2 text-[#363636] font-normal leading-[1.2]">No {bookingFilter} bookings</h3>
                <p className="font-normal text-[#363636] leading-[1.2] opacity-60 max-w-sm">
                  {bookingFilter === 'upcoming' ? "You don't have any upcoming reservations yet." : "You haven't made any reservations yet. Start exploring the best tables in town!"}
                </p>
              </div>
            )}
          </motion.div>
                ) : activeTab === 'takeawayOrders' ? (
          <motion.div
            key="takeawayOrders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {takeawayOrders.length > 0 ? (
              <div className="grid gap-6">
                {takeawayOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 cursor-pointer hover:border-brand/30 transition-colors"
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  >
                     <div className="flex justify-between items-start mb-6">
                       <div>
                         <div className="flex items-center gap-2 mb-2">
                           <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order #{order.orderId.slice(-8)}</div>
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-widest",
                             order.type === 'dine_in' ? "bg-brand flex text-white" : "bg-blue-600 text-white"
                           )}>
                             {order.type === 'dine_in' ? (order.tableNumber && order.tableNumber !== 'Unknown' ? `DINE IN at Table ${order.tableNumber}` : 'DINE IN') : 'TAKEAWAY'}
                           </span>
                         </div>
                         <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">₹{order.totalPrice} • {order.items?.length || 0} items</h3>
                         <div className="text-xs text-slate-500 font-semibold mt-1">
                           {new Date(order.createdAt).toLocaleString()}
                         </div>
                       </div>
                       <div className={cn(
                          "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm",
                          order.status === 'Completed' ? "bg-emerald-500 text-white" :
                          order.status === 'Cancelled' ? "bg-red-500 text-white" :
                          "bg-amber-500 text-white"
                        )}>
                          {order.status}
                       </div>
                     </div>
                     <div className="space-y-2 bg-slate-50 p-4 rounded-xl mb-4">
                        {order.items?.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                             <span className="text-slate-600 font-medium">{item.quantity}x {item.name}</span>
                             <span className="font-normal text-[#363636] leading-[1.2]">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                     </div>
                     
                     {/* BIFURCATION CARD - SHOWN ONLY WHEN EXPANDED */}
                     {expandedOrderId === order.id && (
                       <motion.div 
                         initial={{ opacity: 0, height: 0 }} 
                         animate={{ opacity: 1, height: 'auto' }} 
                         className="overflow-hidden mt-4 pt-4 border-t border-slate-100 space-y-2 mb-4"
                       >
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Bill Details</h4>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Item Total</span>
                           <span>₹{order.itemTotal || order.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Restaurant Packaging</span>
                           <span>₹{order.packaging !== undefined ? order.packaging : 20}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Taxes</span>
                           <span>₹{order.taxes !== undefined ? order.taxes : Math.round(((5) / 100) * (order.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0))}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Platform Fee</span>
                           <span>₹{order.platformFee || 0}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm text-slate-600">
                           <span>Discount</span>
                           <span>-₹{order.discount || 0}</span>
                         </div>
                         <div className="flex justify-between items-center text-base font-bold text-[#363636] mt-3 pt-3 border-t border-slate-100">
                           <span>Bill Total</span>
                           <span>₹{order.totalPrice}</span>
                         </div>
                       </motion.div>
                     )}

                     <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg w-max" style={{ background: order.paymentMethod === 'online' ? '#eef2ff' : '#fff7ed', color: order.paymentMethod === 'online' ? '#4f46e5' : '#ea580c' }}>
                        {order.paymentMethod === 'online' ? (order.paymentStatus === 'Success' ? 'Paid Online' : 'Payment Pending') : 'Pay at Restaurant'}
                     </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 bg-white rounded-[40px] border-2 border-dashed border-gray-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                  <Utensils size={40} />
                </div>
                <h3 className="text-2xl mb-2 text-[#363636] font-normal leading-[1.2]">No food orders</h3>
                <p className="text-vibrant-gray font-bold opacity-60 mb-8 max-w-sm">You haven't ordered any food yet.</p>
                <Link 
                  to="/" 
                  className="bg-brand text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                >
                  Explore Menus
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-square bg-white rounded-3xl border border-gray-100 animate-pulse" />
                ))}
              </div>
            ) : favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {favorites.map((res, index) => (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Link to={getRestaurantUrl(res)} className="block bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
                      <div className="aspect-square relative overflow-hidden">
                        <img 
                          src={res.image || RESTAURANT_IMAGE_FALLBACK} 
                          alt={res.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />
                        
                        <div className="absolute top-4 right-4">
                           <div className="bg-white/20 backdrop-blur-md rounded-xl p-2 text-white">
                              <Heart size={16} className="fill-red-500 text-red-500" />
                           </div>
                        </div>

                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <div className="flex items-center gap-1.5 mb-2">
                             <div className={cn("px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 bg-white/20 backdrop-blur-md", getRatingColor(res.rating || 0))}>
                                {res.rating} <Star size={10} className="fill-current" />
                             </div>
                             <span className="text-[10px] font-bold uppercase tracking-widest opacity-90 text-white shadow-sm">{res.cuisine}</span>
                          </div>
                          <h3 className="text-xl mb-1 text-white font-normal leading-[1.2]">{res.name}</h3>
                          <p className="text-xs font-medium opacity-90 flex items-center gap-1 text-white shadow-sm">
                            <MapPin size={12} /> {formatAddress(res.address || res.location)}
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
                <h3 className="text-2xl mb-2 text-[#363636] font-normal leading-[1.2]">No favorites yet</h3>
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

      {confirmCancelId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl mb-2 text-[#363636] font-normal leading-[1.2]">Cancel Booking</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to cancel this booking?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCancelId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                disabled={cancellingId !== null}
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (confirmCancelId) handleCancelBooking(confirmCancelId);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                disabled={cancellingId === confirmCancelId}
              >
                {cancellingId === confirmCancelId ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

