import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, getDocs } from 'firebase/firestore';
import { Restaurant, Booking, UserProfile } from '../types';
import { formatDate, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';
import { CheckCircle, XCircle, ShieldCheck, Users, Store, Calendar, TrendingUp, Sparkles, Loader2, MapPin, X, MoreVertical, Search, Filter, UtensilsCrossed, Settings2, Power, PowerOff } from 'lucide-react';
import { searchRealRestaurants } from '../services/geminiService';
import { useAuth } from './AuthProvider';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboardView() {
  const { user: currentUser } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [importCity, setImportCity] = useState('Bangalore');
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'users' | 'cities' | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [resSearchQuery, setResSearchQuery] = useState('');

  useEffect(() => {
    const unsubRes = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[]);
    });

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    });

    return () => {
      unsubRes();
      unsubBookings();
      unsubUsers();
    };
  }, []);

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'restaurants', id), { approved: !currentStatus });
  };

  const toggleBookingStatus = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'restaurants', id), { isBookingEnabled: !currentStatus });
  };

  const cityStats = useMemo(() => {
    const stats: Record<string, number> = {};
    restaurants.filter(r => r.approved).forEach(r => {
      const city = r.city || 'Unknown';
      stats[city] = (stats[city] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [restaurants]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return users;
    return users.filter(u => 
      u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [users, userSearchQuery]);

  const filteredRestaurants = useMemo(() => {
    if (!resSearchQuery) return restaurants.sort((a, b) => Number(a.approved) - Number(b.approved));
    return restaurants
      .filter(r => 
        r.name.toLowerCase().includes(resSearchQuery.toLowerCase()) || 
        r.city.toLowerCase().includes(resSearchQuery.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(resSearchQuery.toLowerCase())
      )
      .sort((a, b) => Number(a.approved) - Number(b.approved));
  }, [restaurants, resSearchQuery]);

  const handleSeedData = async () => {
    if (!currentUser) return;
    setSeeding(true);
    try {
      const samples = await searchRealRestaurants(importCity);
      if (samples.length === 0) {
        alert("No restaurants found for this area. Try searching for a specific neighborhood!");
        return;
      }

      const existingNames = new Set(restaurants.map(r => r.name.toLowerCase()));
      const newItems = samples.filter(s => s.name && !existingNames.has(s.name.toLowerCase()));

      if (newItems.length === 0) {
        alert("Found restaurants, but they are all already in your list! Try searching a different neighborhood.");
        return;
      }

      const promises = newItems.map(res => 
        addDoc(collection(db, 'restaurants'), {
          ...res,
          ownerId: currentUser.uid,
          isOpen: true,
          approved: true,
          isBookingEnabled: true,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      alert(`Imported ${newItems.length} new restaurants from "${importCity}"!`);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch real data.');
    } finally {
      setSeeding(false);
    }
  };

  const stats = [
    { 
      label: 'Total Users', 
      value: users.length, 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      onClick: () => setActiveModal('users')
    },
    { 
      label: 'Active Restaurants', 
      value: restaurants.filter(r => r.approved).length, 
      icon: Store, 
      color: 'text-green-600', 
      bg: 'bg-green-50',
      onClick: () => setActiveModal('cities')
    },
    { label: 'Total Bookings', value: bookings.length, icon: Calendar, color: 'text-brand', bg: 'bg-brand-light' },
    { 
      label: 'Booking Revenue', 
      value: `₹${bookings.filter(b => b.status === 'confirmed').length * 50}`, // Example logic
      icon: TrendingUp, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-brand animate-spin" />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-vibrant-dark rounded-[1.25rem] flex items-center justify-center text-white shadow-xl rotate-3">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black text-vibrant-dark tracking-tight leading-none">Admin Hub</h1>
            <p className="text-vibrant-gray font-bold text-sm uppercase tracking-widest mt-2 opacity-60">System Core & Control</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-[350px]">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={18} />
            <input 
              type="text" 
              value={importCity}
              onChange={(e) => setImportCity(e.target.value)}
              placeholder="Area, City (e.g. Pune, Mumbai)"
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-[1.25rem] font-bold text-slate-800 shadow-sm focus:ring-4 focus:ring-brand/10 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-[1.25rem] font-black shadow-xl shadow-slate-900/10 hover:bg-brand active:scale-95 transition-all disabled:opacity-50"
          >
            {seeding ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            <span>{seeding ? 'Mining Data...' : 'Import LIVE'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {stats.map((stat) => (
          <motion.button
            key={stat.label}
            whileHover={stat.onClick ? { scale: 1.02 } : {}}
            whileTap={stat.onClick ? { scale: 0.98 } : {}}
            onClick={stat.onClick}
            className={cn(
              "bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-vibrant text-left relative overflow-hidden group transition-all",
              stat.onClick && "cursor-pointer hover:border-brand/30"
            )}
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:-rotate-3 shadow-sm", stat.bg, stat.color)}>
              <stat.icon size={26} />
            </div>
            <p className="text-xs font-black text-vibrant-gray uppercase tracking-widest leading-none mb-2 opacity-50">{stat.label}</p>
            <p className="text-4xl font-display font-black text-vibrant-dark">{stat.value}</p>
            
            {stat.onClick && (
              <div className="absolute top-6 right-6 text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings2 size={16} />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        {/* Left Col: High Level Control */}
        <div className="lg:col-span-3 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-display font-black text-vibrant-dark tracking-tight">Active Fleet Control</h2>
            <div className="flex items-center gap-3">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                 <input 
                   type="text"
                   placeholder="Search fleet..."
                   value={resSearchQuery}
                   onChange={e => setResSearchQuery(e.target.value)}
                   className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-brand/10 outline-none w-full sm:w-48"
                 />
               </div>
               <div className="flex gap-1 shrink-0">
                  <span className="bg-emerald-100/50 text-emerald-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight">
                    {restaurants.filter(r => r.approved).length} ON
                  </span>
                  <span className="bg-amber-100/50 text-amber-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight">
                    {restaurants.filter(r => !r.approved).length} PENDING
                  </span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredRestaurants.map((res) => (
              <div key={res.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 group hover:shadow-xl transition-all">
                <div className="flex items-center gap-5 w-full">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-4 border-slate-50 shadow-inner">
                    <img src={res.image || RESTAURANT_IMAGE_FALLBACK} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                       <h4 className="font-black text-vibrant-dark text-lg group-hover:text-brand transition-colors">{res.name}</h4>
                       {!res.approved && <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-vibrant-gray font-black uppercase tracking-widest opacity-60">
                        <MapPin size={10} /> {res.city}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-vibrant-gray font-black uppercase tracking-widest opacity-60">
                        <UtensilsCrossed size={10} /> {res.cuisine}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Booking Toggle */}
                  <button 
                    onClick={() => toggleBookingStatus(res.id, res.isBookingEnabled ?? false)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black shadow-sm transition-all",
                      res.isBookingEnabled 
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100" 
                        : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
                    )}
                    title={res.isBookingEnabled ? "Booking Enabled" : "Booking Disabled"}
                  >
                    {res.isBookingEnabled ? <Power size={14} /> : <PowerOff size={14} />}
                    <span className="hidden sm:inline">Bookings</span>
                  </button>

                  {/* Approval Toggle */}
                  <button 
                    onClick={() => toggleApproval(res.id, res.approved)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      res.approved 
                        ? "bg-white border border-red-100 text-red-500 hover:bg-red-50" 
                        : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
                    )}
                  >
                    {res.approved ? <XCircle size={14} /> : <CheckCircle size={14} />}
                    {res.approved ? 'Revoke' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Feed & Activity */}
        <div className="lg:col-span-2 space-y-8">
           <h2 className="text-2xl font-display font-black text-vibrant-dark tracking-tight">Live Pulse</h2>
           
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
                 <span className="text-[10px] font-black text-vibrant-gray uppercase tracking-widest opacity-60">Global Reservations</span>
                 <TrendingUp size={16} className="text-brand" />
              </div>

              <div className="divide-y divide-gray-50">
                {bookings.slice(0, 15).map(booking => (
                  <div key={booking.id} className="p-5 hover:bg-brand-light/20 transition-all flex items-start gap-4 group">
                     <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center font-black text-slate-400 text-xs shadow-sm">
                       {booking.userName.charAt(0)}
                     </div>
                     <div className="flex-grow">
                        <div className="flex items-center justify-between">
                           <p className="text-sm font-black text-vibrant-dark">{booking.userName}</p>
                           <p className="text-[10px] font-bold text-slate-400">{formatDate(booking.dateTime)}</p>
                        </div>
                        <p className="text-xs text-brand font-bold mt-0.5">{booking.restaurantName}</p>
                        <div className="flex items-center justify-between mt-2">
                           <div className="flex items-center gap-2">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[9px] font-black text-slate-500">{booking.guests} Guests</span>
                           </div>
                           <span className={cn(
                             "text-[9px] font-black uppercase tracking-widest",
                             booking.status === 'confirmed' ? "text-emerald-500" :
                             booking.status === 'cancelled' ? "text-red-500" : "text-amber-500"
                           )}>{booking.status}</span>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {activeModal === 'users' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-vibrant-dark/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-10 border-b border-gray-100 flex items-center justify-between">
                <div>
                   <h2 className="text-3xl font-display font-black text-vibrant-dark">Member Directory</h2>
                   <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">{users.length} Registered Nodes</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 bg-slate-50">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand/10 font-bold text-slate-800"
                    />
                 </div>
              </div>

              <div className="flex-grow overflow-y-auto px-10 pb-10">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                          <th className="py-4">Profile</th>
                          <th className="py-4">Access Level</th>
                          <th className="py-4">Contact</th>
                          <th className="py-4">Onboarded</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredUsers.map(u => (
                         <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-6">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center overflow-hidden">
                                    {u.photoURL ? (
                                      <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="font-black text-brand">{u.displayName?.charAt(0) || u.email.charAt(0)}</span>
                                    )}
                                  </div>
                                  <span className="font-black text-vibrant-dark text-lg">{u.displayName || 'Anonymous'}</span>
                               </div>
                            </td>
                            <td className="py-6">
                               <span className={cn(
                                 "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                 u.role === 'admin' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                 u.role === 'owner' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-100 text-slate-500 border-slate-200"
                               )}>
                                 {u.role}
                               </span>
                            </td>
                            <td className="py-6">
                               <span className="text-sm font-bold text-slate-500">{u.email}</span>
                            </td>
                            <td className="py-6">
                               <span className="text-xs font-bold text-slate-400">
                                 {u.createdAt?.toDate ? formatDate(u.createdAt) : 'Initial'}
                               </span>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === 'cities' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-vibrant-dark/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-10 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-black text-vibrant-dark">City Deployment</h2>
                  <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">Active nodes by geography</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 rounded-full">
                   <X size={24} />
                </button>
              </div>

              <div className="p-10 space-y-6">
                 {cityStats.map(([city, count]) => (
                   <div key={city} className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 group hover:border-brand transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-brand">
                           <MapPin size={24} />
                        </div>
                        <span className="text-xl font-black text-vibrant-dark">{city}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-display font-black text-brand">{count}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Units</span>
                      </div>
                   </div>
                 ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
