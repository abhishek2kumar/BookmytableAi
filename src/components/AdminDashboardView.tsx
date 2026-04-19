import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Restaurant, Booking, UserProfile } from '../types';
import { formatDate, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';
import { CheckCircle, XCircle, ShieldCheck, Users, Store, Calendar, TrendingUp, Sparkles, Loader2, MapPin } from 'lucide-react';
import { searchRealRestaurants } from '../services/geminiService';
import { useAuth } from './AuthProvider';

export default function AdminDashboardView() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [importCity, setImportCity] = useState('Bangalore');

  useEffect(() => {
    const unsubRes = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[]);
    });

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
      setLoading(false);
    });

    return () => {
      unsubRes();
      unsubBookings();
    };
  }, []);

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'restaurants', id), { approved: !currentStatus });
  };

  const handleSeedData = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const samples = await searchRealRestaurants(importCity);
      if (samples.length === 0) {
        alert("No restaurants found for this area. Try searching for a specific neighborhood!");
        return;
      }

      // Quick duplicate check against current state
      const existingNames = new Set(restaurants.map(r => r.name.toLowerCase()));
      const newItems = samples.filter(s => s.name && !existingNames.has(s.name.toLowerCase()));

      if (newItems.length === 0) {
        alert("Found restaurants, but they are all already in your list! Try searching a different neighborhood.");
        return;
      }

      const promises = newItems.map(res => 
        addDoc(collection(db, 'restaurants'), {
          ...res,
          ownerId: user.uid,
          isOpen: true,
          approved: true,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      alert(`Imported ${newItems.length} new restaurants from "${importCity}"! Total in list: ${restaurants.length + newItems.length}`);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch real data. Please try again.');
    } finally {
      setSeeding(false);
    }
  };

  const stats = [
    { label: 'Total Users', value: '1.2k', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Restaurants', value: restaurants.filter(r => r.approved).length, icon: Store, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Bookings', value: bookings.length, icon: Calendar, color: 'text-brand', bg: 'bg-brand-light' },
    { label: 'Revenue (est)', value: '₹45k', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  if (loading) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between gap-3 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-vibrant-dark rounded-2xl flex items-center justify-center text-white shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-vibrant-dark tracking-tight">Admin Portal</h1>
            <p className="text-vibrant-gray font-medium">Platform overview and management.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-vibrant-gray opacity-40" size={16} />
            <input 
              type="text" 
              value={importCity}
              onChange={(e) => setImportCity(e.target.value)}
              placeholder="Area, City (e.g. Viman Nagar, Pune)"
              className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all placeholder:font-normal w-full sm:w-[350px]"
            />
          </div>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="flex items-center gap-2 bg-gradient-to-r from-brand to-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-brand/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 whitespace-nowrap"
          >
            {seeding ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            {seeding ? 'Searching Live...' : 'Import Real Restaurants'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-vibrant">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bg, stat.color)}>
              <stat.icon size={22} />
            </div>
            <p className="text-[10px] font-bold text-vibrant-gray uppercase tracking-widest leading-none mb-1 opacity-60">{stat.label}</p>
            <p className="text-2xl font-display font-bold text-vibrant-dark">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Restaurant Approval Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-bold text-vibrant-dark">Restaurant Approvals</h2>
            <span className="bg-brand-light text-brand px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-brand/20">
              {restaurants.filter(r => !r.approved).length} Pending
            </span>
          </div>

          <div className="space-y-4">
            {restaurants.map((res) => (
              <div key={res.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-vibrant flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                    <img src={res.image || RESTAURANT_IMAGE_FALLBACK} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" onError={handleImageError} />
                  </div>
                  <div>
                    <h4 className="font-bold text-vibrant-dark group-hover:text-brand transition-colors">{res.name}</h4>
                    <p className="text-[10px] text-vibrant-gray font-bold uppercase tracking-widest opacity-60">{res.location}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleApproval(res.id, res.approved)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    res.approved 
                      ? "bg-white border border-red-200 text-red-600 hover:bg-red-50" 
                      : "bg-vibrant-success text-white shadow-lg shadow-green-500/20 hover:brightness-110"
                  )}
                >
                  {res.approved ? <XCircle size={14} /> : <CheckCircle size={14} />}
                  {res.approved ? 'Revoke' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Global Bookings Log */}
        <section>
          <h2 className="text-xl font-display font-bold text-vibrant-dark mb-6">Recent Activity</h2>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-vibrant">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-vibrant-bg">
                    <th className="px-6 py-4 text-[10px] font-bold text-vibrant-gray uppercase tracking-widest opacity-60">User</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-vibrant-gray uppercase tracking-widest opacity-60">Restaurant</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-vibrant-gray uppercase tracking-widest opacity-60">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-vibrant-gray uppercase tracking-widest opacity-60">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.slice(0, 10).map((booking) => (
                    <tr key={booking.id} className="hover:bg-brand-light/20 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-vibrant-dark">{booking.userName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-vibrant-gray font-medium group-hover:text-brand transition-colors">{booking.restaurantName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-vibrant-gray opacity-60">{formatDate(booking.dateTime)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                          booking.status === 'confirmed' ? "border-green-100 bg-green-50 text-vibrant-success" :
                          booking.status === 'cancelled' ? "border-red-100 bg-red-50 text-red-600" : "border-brand/20 bg-brand-light text-brand"
                        )}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
