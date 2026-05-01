import React, { useState, useEffect, useMemo } from 'react';
import AppIcon from './AppIcon';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, addDoc, getDocs } from 'firebase/firestore';
import { Restaurant, Booking, UserProfile } from '../types';
import { formatDate, formatTime, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';
import { Star, CheckCircle, XCircle, AlertCircle, ShieldCheck, Users, Store, Calendar, Clock, History, TrendingUp, Sparkles, Loader2, MapPin, X, MoreVertical, Search, Filter, UtensilsCrossed, Settings2, Power, PowerOff, Plus, Globe, Soup, ChevronRight, Trash2, Edit2, Database, Save, ChefHat } from 'lucide-react';
import { searchRealRestaurants } from '../services/geminiService';
import { useAuth } from './AuthProvider';
import { useMasterData } from './MasterDataContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface City {
  id?: string;
  name: string;
  image: string;
  lat: number;
  lng: number;
  isPopular?: boolean;
  isKnown?: boolean;
}

interface Cuisine {
  id?: string;
  name: string;
  image: string;
  description: string;
}

export default function AdminDashboardView() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { seedData, loading: masterLoading } = useMasterData();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [importCity, setImportCity] = useState('Bangalore');
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'users' | 'cities' | 'cuisines' | 'addCity' | 'addCuisine' | null>(null);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingCuisine, setEditingCuisine] = useState<Cuisine | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [isSavingRestaurant, setIsSavingRestaurant] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [resSearchQuery, setResSearchQuery] = useState('');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'today' | 'upcoming'>('all');
  const [pulseCityFilter, setPulseCityFilter] = useState('all');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [cuisineSearchQuery, setCuisineSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'fleet' | 'pulse' | 'inventory'>('fleet');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');

  useEffect(() => {
    const unsubRes = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Restaurant[]);
    });

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[]);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    const unsubCities = onSnapshot(collection(db, 'cities'), (snapshot) => {
      setCities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as City[]);
    });

    const unsubCuisines = onSnapshot(collection(db, 'cuisines'), (snapshot) => {
      setCuisines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cuisine[]);
      setLoading(false);
    });

    return () => {
      unsubRes();
      unsubBookings();
      unsubUsers();
      unsubCities();
      unsubCuisines();
    };
  }, []);

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'restaurants', id), { 
      approved: !currentStatus,
      lastModifiedBy: currentUser?.email || 'admin',
      lastModifiedByType: 'admin',
      updatedAt: serverTimestamp()
    });
  };

  const toggleBookingStatus = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'restaurants', id), { 
      isBookingEnabled: !currentStatus,
      lastModifiedBy: currentUser?.email || 'admin',
      lastModifiedByType: 'admin',
      updatedAt: serverTimestamp()
    });
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
    let list = [...restaurants];
    
    // Status Filter
    if (statusFilter === 'approved') list = list.filter(r => r.approved);
    if (statusFilter === 'pending') list = list.filter(r => !r.approved);

    if (resSearchQuery) {
      const query = resSearchQuery.toLowerCase();
      list = list.filter(r => 
        (r.name?.toLowerCase() || '').includes(query) || 
        (r.city?.toLowerCase() || '').includes(query) ||
        (r.cuisine?.toLowerCase() || '').includes(query) ||
        (r.location?.toLowerCase() || '').includes(query) ||
        (r.lastModifiedBy?.toLowerCase() || '').includes(query)
      );
    }
    // Alphabetical sort (A-Z)
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [restaurants, resSearchQuery, statusFilter]);

  const [editingRatingRes, setEditingRatingRes] = useState<{id: string, rating: number} | null>(null);

  const updateRating = async () => {
    if (!editingRatingRes) return;
    try {
      await updateDoc(doc(db, 'restaurants', editingRatingRes.id), { 
        rating: editingRatingRes.rating,
        lastModifiedBy: currentUser?.email || 'admin',
        lastModifiedByType: 'admin',
        updatedAt: serverTimestamp()
      });
      setEditingRatingRes(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant || !currentUser) return;
    setIsSavingRestaurant(true);
    try {
      const { id, ...data } = editingRestaurant;
      const cleanData = {
        ...data,
        lastModifiedBy: currentUser.email || 'admin',
        lastModifiedByType: 'admin',
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'restaurants', id), cleanData);
      setNotification({ type: 'success', message: 'Restaurant updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
      setEditingRestaurant(null);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Failed to update restaurant.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSavingRestaurant(false);
    }
  };

  const handleSeedData = async () => {
    if (!currentUser) return;
    setSeeding(true);
    try {
      const samples = await searchRealRestaurants(importCity);
      if (samples.length === 0) {
        alert("No restaurants found for this area. Try searching for a specific neighborhood!");
        return;
      }

      // Exact check for Duplicate: Name + Location/City
      const existingKey = (r: any) => `${r.name.toLowerCase()}|${(r.location || r.city).toLowerCase()}`;
      const existingKeys = new Set(restaurants.map(existingKey));
      
      const newItems = samples.filter(s => s.name && !existingKeys.has(existingKey(s)));

      if (newItems.length === 0) {
        alert("Found restaurants, but they are all already in your list!");
        return;
      }

      const promises = newItems.map(res => 
        addDoc(collection(db, 'restaurants'), {
          ...res,
          ownerId: currentUser.uid,
          isOpen: true,
          rating: 4.0, // Default for imported
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

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity) return;

    // Check for duplicate name if new city
    if (!editingCity.id) {
      const exists = cities.some(c => c.name.toLowerCase() === editingCity.name.toLowerCase());
      if (exists) {
        setNotification({ type: 'error', message: 'This city already exists in the system.' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    try {
      if (editingCity.id) {
        await updateDoc(doc(db, 'cities', editingCity.id), { ...editingCity });
      } else {
        await addDoc(collection(db, 'cities'), { ...editingCity, createdAt: serverTimestamp() });
      }
      setActiveModal('cities');
      setEditingCity(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCuisine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCuisine) return;

    // Check for duplicate name if new cuisine
    if (!editingCuisine.id) {
      const exists = cuisines.some(c => c.name.toLowerCase() === editingCuisine.name.toLowerCase());
      if (exists) {
        setNotification({ type: 'error', message: 'This cuisine already exists in the system.' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    try {
      if (editingCuisine.id) {
        await updateDoc(doc(db, 'cuisines', editingCuisine.id), { ...editingCuisine });
      } else {
        await addDoc(collection(db, 'cuisines'), { ...editingCuisine, createdAt: serverTimestamp() });
      }
      setActiveModal('cuisines');
      setEditingCuisine(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this city?')) return;
    try {
      await updateDoc(doc(db, 'cities', id), { isKnown: false, isPopular: false }); // Or actually delete? Better to delete if requested
      // Actually the rules allow delete? Let's check. 
      // await deleteDoc(doc(db, 'cities', id)); // Need to import deleteDoc
    } catch (err) {
      console.error(err);
    }
  };

  const usersWithBiz = useMemo(() => {
    return filteredUsers.map(u => {
      const biz = restaurants.find(r => r.ownerId === u.uid);
      return { ...u, bizName: biz?.name, bizCity: biz?.city };
    });
  }, [filteredUsers, restaurants]);

  const filteredBookings = useMemo(() => {
    let list = [...bookings];
    
    // Search
    if (bookingSearchQuery) {
      const q = bookingSearchQuery.toLowerCase();
      list = list.filter(b => 
        b.userName.toLowerCase().includes(q) || 
        b.restaurantName.toLowerCase().includes(q) ||
        (b as any).userEmail?.toLowerCase().includes(q)
      );
    }

    // City Filter
    if (pulseCityFilter !== 'all') {
      // We need to link booking to restaurant city
      list = list.filter(b => {
        const res = restaurants.find(r => r.name === b.restaurantName); // fallback if city not in booking
        return (b as any).city === pulseCityFilter || res?.city === pulseCityFilter;
      });
    }

    // Time Filter
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    const todayEnd = new Date(now.setHours(23,59,59,999));

    if (bookingFilter === 'today') {
      list = list.filter(b => {
        const d = new Date(b.dateTime);
        return d >= todayStart && d <= todayEnd;
      });
    } else if (bookingFilter === 'upcoming') {
      list = list.filter(b => new Date(b.dateTime) > todayEnd);
    }

    return list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [bookings, bookingSearchQuery, bookingFilter, pulseCityFilter, restaurants]);

  const sortedCities = useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name)), [cities]);
  const sortedCuisines = useMemo(() => [...cuisines].sort((a, b) => a.name.localeCompare(b.name)), [cuisines]);

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
      label: 'Cities', 
      value: cities.length, 
      icon: Globe, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      onClick: () => setActiveModal('cities')
    },
    { 
      label: 'Cuisines', 
      value: cuisines.length, 
      icon: Soup, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50',
      onClick: () => setActiveModal('cuisines')
    },
    { 
      label: 'Total Bookings', 
      value: bookings.length, 
      icon: Calendar, 
      color: 'text-brand', 
      bg: 'bg-brand-light' 
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
          <AppIcon size={64} className="shadow-xl rotate-3" />
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
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-slate-800 shadow-sm focus:ring-4 focus:ring-brand/10 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-slate-900/10 hover:bg-brand active:scale-95 transition-all disabled:opacity-50"
          >
            {seeding ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            <span>{seeding ? 'Mining Data...' : 'Import LIVE'}</span>
          </button>
          
          <button
            onClick={() => navigate('/admin/onboard')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={20} />
            <span>New Restaurant</span>
          </button>
          
          <button
            onClick={async () => {
              if(confirm('This will seed initial cities and cuisines if they are missing. Continue?')) {
                await seedData();
                alert('Seed process completed.');
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
          >
            <Database size={20} />
            <span>Seed Data</span>
          </button>
        </div>
      </div>

      {/* Total Value / Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {stats.map((stat) => (
          <motion.button
            key={stat.label}
            whileHover={stat.onClick ? { scale: 1.02 } : {}}
            whileTap={stat.onClick ? { scale: 0.98 } : {}}
            onClick={stat.onClick}
            className={cn(
              "bg-white p-8 rounded-3xl border border-gray-100 shadow-vibrant text-left relative overflow-hidden group transition-all",
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

      {/* Quick Access System Management */}
      <div className="mb-16">
        <h2 className="text-2xl font-display font-black text-vibrant-dark mb-6 flex items-center gap-2">
          <Settings2 className="text-brand" /> System Architecture
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={() => setActiveModal('cities')}
            className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-vibrant hover:-translate-y-1 transition-all group"
          >
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Globe size={24} />
               </div>
               <div className="text-left">
                  <p className="text-sm font-black text-vibrant-dark">Manage Cities</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expansion Control</p>
               </div>
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-brand transition-colors" />
          </button>

          <button 
            onClick={() => setActiveModal('cuisines')}
            className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-vibrant hover:-translate-y-1 transition-all group"
          >
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Soup size={24} />
               </div>
               <div className="text-left">
                  <p className="text-sm font-black text-vibrant-dark">Manage Cuisines</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Taxonomy</p>
               </div>
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-brand transition-colors" />
          </button>

          <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={24} />
               </div>
               <div className="text-left">
                  <p className="text-sm font-black text-slate-500">Security Layers</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active & Hardened</p>
               </div>
            </div>
            <CheckCircle className="text-emerald-500" size={20} />
          </div>
        </div>
      </div>

      {/* Main Content Area with Tabs */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm w-fit mb-12">
          {[
            { id: 'fleet', label: 'Fleet Control', icon: Store },
            { id: 'pulse', label: 'Live Pulse', icon: TrendingUp },
            { id: 'inventory', label: 'System Master', icon: Database },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'fleet' && (
            <motion.div
              key="fleet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-display font-black text-vibrant-dark tracking-tighter">Active Fleet Control</h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Manage global restaurant network</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                   <div className="flex bg-slate-100 p-1 rounded-xl">
                      {[
                        { id: 'all', label: 'ALL' },
                        { id: 'approved', label: 'APPROVED' },
                        { id: 'pending', label: 'PENDING' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setStatusFilter(f.id as any)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-black transition-all",
                            statusFilter === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                   </div>

                   <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                     <input 
                       type="text"
                       placeholder="Search name, city, cuisine..."
                       value={resSearchQuery}
                       onChange={e => setResSearchQuery(e.target.value)}
                       className="pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-brand/10 outline-none w-full sm:w-64"
                     />
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {filteredRestaurants.map((res) => (
                  <div key={res.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 group hover:shadow-2xl hover:border-brand/20 transition-all duration-500">
                    <div className="flex items-center gap-6 w-full">
                      <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0 border-4 border-slate-50 shadow-inner group-hover:scale-105 transition-transform">
                        <img src={res.image || RESTAURANT_IMAGE_FALLBACK} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                           <h4 className="font-display font-black text-vibrant-dark text-xl group-hover:text-brand transition-colors">{res.name}</h4>
                           {!res.approved && (
                             <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">Pending Review</span>
                           )}
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-3 gap-x-6">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                             <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-brand">
                                <MapPin size={12} />
                             </div>
                             <span className="truncate">{res.location}, {res.city}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                             <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-brand">
                                <UtensilsCrossed size={12} />
                             </div>
                             <span>{res.cuisine}</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                             <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-amber-500" onClick={() => setEditingRatingRes({id: res.id, rating: res.rating})}>
                                <Star size={12} className="fill-amber-500" />
                             </div>
                             <span>{res.rating || 0} Rating</span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                             <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-indigo-500">
                                <Users size={12} />
                             </div>
                             <span>{res.ownerId.slice(-6).toUpperCase()} Owner</span>
                          </div>
                        </div>

                        {res.lastModifiedBy && (
                          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-lg">
                              <History size={10} />
                              <span>Last Modified: {res.lastModifiedBy} at {res.updatedAt ? formatDate(res.updatedAt) : 'N/A'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Edit Button */}
                      <button 
                        onClick={() => setEditingRestaurant(res)}
                        className="p-4 bg-white border border-slate-100 text-slate-400 hover:text-brand hover:border-brand rounded-2xl transition-all shadow-sm hover:shadow-md"
                        title="Edit Full Details"
                      >
                        <Edit2 size={18} />
                      </button>

                      {/* Booking Toggle */}
                      <button 
                        onClick={() => toggleBookingStatus(res.id, res.isBookingEnabled ?? false)}
                        className={cn(
                          "flex items-center gap-2 px-6 py-4 rounded-2xl text-xs font-black shadow-sm transition-all border",
                          res.isBookingEnabled 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" 
                            : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                        )}
                      >
                        {res.isBookingEnabled ? <Power size={16} /> : <PowerOff size={16} />}
                        <span className="hidden lg:inline">Bookings</span>
                      </button>

                      {/* Approval Toggle */}
                      <button 
                        onClick={() => toggleApproval(res.id, res.approved)}
                        className={cn(
                          "flex items-center gap-2 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                          res.approved 
                            ? "bg-white border border-red-100 text-red-500 hover:bg-red-50" 
                            : "bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-brand"
                        )}
                      >
                        {res.approved ? <XCircle size={16} /> : <CheckCircle size={16} />}
                        {res.approved ? 'Revoke' : 'Approve'}
                      </button>
                    </div>
                  </div>
                ))}
                
                {filteredRestaurants.length === 0 && (
                  <div className="py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                     <Store size={48} className="mx-auto text-slate-100 mb-4" />
                     <p className="text-slate-400 font-bold">No restaurants found matching your criteria.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'pulse' && (
            <motion.div
              key="pulse"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-display font-black text-vibrant-dark tracking-tighter">Live Business Pulse</h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Real-time global reservation stream</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text"
                      placeholder="Search bookings..."
                      value={bookingSearchQuery}
                      onChange={e => setBookingSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold min-w-[200px]"
                    />
                  </div>

                  {/* Date Filter */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: 'today', label: 'Today' },
                      { id: 'upcoming', label: 'Upcoming' },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setBookingFilter(f.id as any)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-black transition-all",
                          bookingFilter === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* City Select */}
                  <select 
                    value={pulseCityFilter}
                    onChange={e => setPulseCityFilter(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-600 outline-none focus:ring-4 focus:ring-brand/10"
                  >
                    <option value="all">All Cities</option>
                    {sortedCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

               <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
                     <div className="flex items-center gap-4">
                        <TrendingUp size={24} className="text-brand" />
                        <span className="text-xs font-black text-vibrant-gray uppercase tracking-widest">Global Activity Stream</span>
                     </div>
                     <span className="bg-brand/10 text-brand px-4 py-1 rounded-full text-[10px] font-black">{filteredBookings.length} Events Total</span>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {filteredBookings.slice(0, 50).map(booking => (
                      <div key={booking.id} className="p-8 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center gap-8 group">
                         <div className="flex items-center gap-6 flex-grow">
                            <div className="w-16 h-16 rounded-3xl bg-slate-100 flex-shrink-0 flex items-center justify-center font-black text-slate-400 text-xl shadow-inner group-hover:bg-brand group-hover:text-white transition-all">
                              {booking.userName.charAt(0)}
                            </div>
                            <div className="flex-grow">
                               <div className="flex items-center justify-between mb-1">
                                  <p className="text-xl font-display font-black text-vibrant-dark">{booking.userName}</p>
                                  <div className="flex items-center gap-2 text-slate-400">
                                     <Clock size={12} />
                                     <p className="text-xs font-bold uppercase tracking-tighter">{formatDate(booking.dateTime)} at {formatTime(booking.dateTime)}</p>
                                  </div>
                               </div>
                               <div className="flex flex-wrap items-center gap-4">
                                  <p className="text-sm text-brand font-black bg-brand/5 px-3 py-1 rounded-lg">Reserved: {booking.restaurantName}</p>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                     <Users size={14} className="text-slate-300" />
                                     <span>{booking.guests} Guests</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-4 shrink-0 sm:self-end md:self-auto">
                            <span className={cn(
                              "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border",
                              booking.status === 'confirmed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              booking.status === 'cancelled' ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                              {booking.status}
                            </span>
                         </div>
                      </div>
                    ))}
                    
                    {bookings.length === 0 && (
                      <div className="py-24 text-center">
                         <Calendar size={48} className="mx-auto text-slate-100 mb-4" />
                         <p className="text-slate-400 font-bold">No reservations found in the stream.</p>
                      </div>
                    )}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {stats.map((stat) => (
                    <motion.button
                      key={stat.label}
                      whileHover={stat.onClick ? { scale: 1.02, y: -4 } : {}}
                      onClick={stat.onClick}
                      className={cn(
                        "bg-white p-10 rounded-[40px] border border-slate-100 shadow-vibrant text-left relative overflow-hidden group transition-all",
                        stat.onClick && "cursor-pointer hover:border-brand/30"
                      )}
                    >
                      <div className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center mb-8 transition-transform group-hover:scale-110 group-hover:-rotate-3 shadow-sm", stat.bg, stat.color)}>
                        <stat.icon size={32} />
                      </div>
                      <p className="text-[10px] font-black text-vibrant-gray uppercase tracking-widest leading-none mb-3 opacity-50">{stat.label}</p>
                      <p className="text-5xl font-display font-black text-vibrant-dark tracking-tighter">{stat.value}</p>
                    </motion.button>
                  ))}
               </div>

               <div>
                 <h2 className="text-2xl font-display font-black text-vibrant-dark mb-8 flex items-center gap-2">
                    <Database className="text-brand" /> Core Master Data Control
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <button 
                     onClick={() => setActiveModal('cities')}
                     className="flex items-center justify-between p-10 bg-white rounded-[40px] border border-slate-100 shadow-vibrant hover:-translate-y-2 transition-all duration-500 group"
                   >
                     <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[30px] flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
                           <Globe size={36} />
                        </div>
                        <div className="text-left">
                           <p className="text-2xl font-display font-black text-vibrant-dark">City Fleet</p>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Expansion Geography Control</p>
                        </div>
                     </div>
                     <ChevronRight size={32} className="text-slate-100 group-hover:text-brand group-hover:translate-x-2 transition-all" />
                   </button>

                   <button 
                     onClick={() => setActiveModal('cuisines')}
                     className="flex items-center justify-between p-10 bg-white rounded-[40px] border border-slate-100 shadow-vibrant hover:-translate-y-2 transition-all duration-500 group"
                   >
                     <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-[30px] flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-500 shadow-inner">
                           <Soup size={36} />
                        </div>
                        <div className="text-left">
                           <p className="text-2xl font-display font-black text-vibrant-dark">Cuisine Master</p>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Menu Taxonomy Management</p>
                        </div>
                     </div>
                     <ChevronRight size={32} className="text-slate-100 group-hover:text-brand group-hover:translate-x-2 transition-all" />
                   </button>
                 </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {activeModal === 'users' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-vibrant-dark/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full h-full relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-10 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                <div>
                   <h2 className="text-3xl font-display font-black text-vibrant-dark">Member Directory</h2>
                   <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">{users.length} Registered Nodes</p>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-brand transition-all flex items-center gap-2 font-black shadow-xl">
                  <X size={20} />
                  <span>Close Directory</span>
                </button>
              </div>

              <div className="p-10 bg-slate-50 border-b border-gray-100">
                 <div className="max-w-4xl mx-auto relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text"
                      placeholder="Search users by name, email, or restaurant..."
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      className="w-full pl-16 pr-8 py-6 bg-white border border-slate-200 rounded-[32px] outline-none focus:ring-8 focus:ring-brand/5 font-bold text-xl text-slate-800 shadow-sm"
                    />
                 </div>
              </div>

              <div className="flex-grow overflow-y-auto px-10 pb-20">
                 <div className="max-w-7xl mx-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                             <th className="py-8">Profile & Identity</th>
                             <th className="py-8">Business & Location</th>
                             <th className="py-8">Access Level</th>
                             <th className="py-8">Contact</th>
                             <th className="py-8">Onboarded</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {usersWithBiz.map(u => (
                            <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors">
                               <td className="py-8">
                                  <div className="flex items-center gap-6">
                                     <div className="w-14 h-14 rounded-[20px] bg-brand/10 border border-brand/20 flex items-center justify-center overflow-hidden shrink-0">
                                       {u.photoURL ? (
                                         <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                                       ) : (
                                         <span className="font-black text-brand text-lg">{u.displayName?.charAt(0) || u.email.charAt(0)}</span>
                                       )}
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="font-black text-vibrant-dark text-xl leading-tight">{u.displayName || 'Anonymous'}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">UID: {u.uid.slice(-8).toUpperCase()}</span>
                                     </div>
                                  </div>
                               </td>
                               <td className="py-8">
                                  {u.bizName ? (
                                    <div className="flex flex-col">
                                       <span className="text-sm font-black text-brand">{u.bizName}</span>
                                       <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mt-1">
                                          <MapPin size={10} />
                                          {u.bizCity}
                                       </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-300 italic">No business linked</span>
                                  )}
                               </td>
                               <td className="py-8">
                                  <span className={cn(
                                    "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                                    u.role === 'admin' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                    u.role === 'owner' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-100 text-slate-500 border-slate-200"
                                  )}>
                                    {u.role}
                                  </span>
                               </td>
                               <td className="py-8">
                                  <span className="text-sm font-bold text-slate-500">{u.email}</span>
                               </td>
                               <td className="py-8">
                                  <span className="text-xs font-bold text-slate-400">
                                    {u.createdAt?.toDate ? formatDate(u.createdAt) : 'Initial Onboarding'}
                                  </span>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
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
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-10 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0">
                <div>
                  <h2 className="text-3xl font-display font-black text-vibrant-dark">City Fleet</h2>
                  <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">Manage geography and market expansion</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search cities..."
                      value={citySearchQuery}
                      onChange={e => setCitySearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-brand/10 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setEditingCity({ name: '', image: '', lat: 0, lng: 0, isPopular: true, isKnown: true });
                        setCitySearchQuery('');
                        setActiveModal('addCity');
                      }}
                      className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-brand/20 hover:scale-105 transition-all"
                    >
                      <Plus size={18} />
                      <span>Add City</span>
                    </button>
                    <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 rounded-full shrink-0">
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-10 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow content-start min-h-0">
                 {cities
                  .filter(c => c.name.toLowerCase().includes(citySearchQuery.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((city) => (
                   <div key={city.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-brand transition-all shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm bg-white">
                           <img src={city.image || RESTAURANT_IMAGE_FALLBACK} alt={city.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="text-xl font-black text-vibrant-dark block">{city.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            {city.isPopular && <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Popular</span>}
                            {city.isKnown && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Known</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingCity(city);
                            setActiveModal('addCity');
                          }}
                          className="p-2 bg-white text-slate-400 hover:text-brand rounded-lg transition-colors border border-slate-100"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                   </div>
                 ))}
                 
                 {cities.length === 0 && (
                   <div className="col-span-full py-20 text-center">
                      <Globe size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold">No cities deployed yet.</p>
                   </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Add/Edit City Modal */}
        {(activeModal === 'addCity' && editingCity) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal('cities')}
              className="absolute inset-0 bg-vibrant-dark/90 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden relative z-10 shadow-2xl"
            >
              <form onSubmit={handleSaveCity} className="p-10 space-y-6">
                <h3 className="text-3xl font-display font-black text-slate-900 mb-8">{editingCity.id ? 'Refine City' : 'Deploy New City'}</h3>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">City Name</label>
                    <input 
                      type="text"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-brand rounded-2xl font-bold outline-none transition-all"
                      placeholder="e.g. Pune"
                      value={editingCity.name}
                      onChange={e => setEditingCity({...editingCity, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Image URL</label>
                    <input 
                      type="url"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-brand rounded-2xl font-bold outline-none transition-all"
                      placeholder="https://..."
                      value={editingCity.image}
                      onChange={e => setEditingCity({...editingCity, image: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Latitude</label>
                      <input 
                        type="number"
                        step="any"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-brand rounded-2xl font-bold outline-none transition-all"
                        value={editingCity.lat}
                        onChange={e => setEditingCity({...editingCity, lat: parseFloat(e.target.value)})}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Longitude</label>
                      <input 
                        type="number"
                        step="any"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-brand rounded-2xl font-bold outline-none transition-all"
                        value={editingCity.lng}
                        onChange={e => setEditingCity({...editingCity, lng: parseFloat(e.target.value)})}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <label className="flex-grow flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer">
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Popular</span>
                      <input 
                        type="checkbox"
                        className="w-5 h-5 accent-brand"
                        checked={editingCity.isPopular}
                        onChange={e => setEditingCity({...editingCity, isPopular: e.target.checked})}
                      />
                    </label>
                    <label className="flex-grow flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer">
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Known</span>
                      <input 
                        type="checkbox"
                        className="w-5 h-5 accent-brand"
                        checked={editingCity.isKnown}
                        onChange={e => setEditingCity({...editingCity, isKnown: e.target.checked})}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                   <button type="submit" className="flex-grow bg-brand text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-brand/20 active:scale-95 transition-all">
                     {editingCity.id ? 'Save Changes' : 'Deploy City'}
                   </button>
                   <button type="button" onClick={() => setActiveModal('cities')} className="px-8 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm">
                     Cancel
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Cuisines Modal */}
        {activeModal === 'cuisines' && (
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
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-10 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0">
                <div>
                  <h2 className="text-3xl font-display font-black text-vibrant-dark">Cuisine Menu</h2>
                  <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">Manage flavors and category tags</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search cuisines..."
                      value={cuisineSearchQuery}
                      onChange={e => setCuisineSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-brand/10 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setEditingCuisine({ name: '', image: '', description: '' });
                        setCuisineSearchQuery('');
                        setActiveModal('addCuisine');
                      }}
                      className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
                    >
                      <Plus size={18} />
                      <span>Add Cuisine</span>
                    </button>
                    <button onClick={() => setActiveModal(null)} className="p-3 bg-slate-100 rounded-full shrink-0">
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-10 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow content-start min-h-0">
                 {cuisines
                  .filter(c => c.name.toLowerCase().includes(cuisineSearchQuery.toLowerCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((cuisine) => (
                   <div key={cuisine.id} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden group hover:border-amber-500 transition-all flex flex-col shadow-sm shrink-0">
                      <div className="h-48 relative">
                         <img src={cuisine.image || RESTAURANT_IMAGE_FALLBACK} alt={cuisine.name} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                         <h4 className="absolute bottom-4 left-6 text-white font-black text-xl">{cuisine.name}</h4>
                      </div>
                      <div className="p-6 flex-grow flex flex-col justify-between">
                         <p className="text-xs text-slate-500 font-bold leading-relaxed">{cuisine.description}</p>
                         <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200/50">
                            <button 
                              onClick={() => {
                                setEditingCuisine(cuisine);
                                setActiveModal('addCuisine');
                              }}
                              className="flex-grow flex items-center justify-center gap-2 bg-white text-slate-600 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:border-amber-500 hover:text-amber-500 transition-all"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                         </div>
                      </div>
                   </div>
                 ))}
                 
                 {cuisines.length === 0 && (
                   <div className="col-span-full py-20 text-center">
                      <Soup size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold">No cuisines added yet.</p>
                   </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Add/Edit Cuisine Modal */}
        {(activeModal === 'addCuisine' && editingCuisine) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal('cuisines')}
              className="absolute inset-0 bg-vibrant-dark/90 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden relative z-10 shadow-2xl"
            >
              <form onSubmit={handleSaveCuisine} className="p-10 space-y-6">
                <h3 className="text-3xl font-display font-black text-slate-900 mb-8">{editingCuisine.id ? 'Refine Flavor' : 'Add New Flavor'}</h3>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cuisine Name</label>
                    <input 
                      type="text"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-2xl font-bold outline-none transition-all"
                      placeholder="e.g. Italian"
                      value={editingCuisine.name}
                      onChange={e => setEditingCuisine({...editingCuisine, name: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Image URL</label>
                    <input 
                      type="url"
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-2xl font-bold outline-none transition-all"
                      placeholder="https://..."
                      value={editingCuisine.image}
                      onChange={e => setEditingCuisine({...editingCuisine, image: e.target.value})}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 rounded-2xl font-bold outline-none transition-all min-h-[100px] resize-none"
                      placeholder="Briefly describe this cuisine..."
                      value={editingCuisine.description}
                      onChange={e => setEditingCuisine({...editingCuisine, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                   <button type="submit" className="flex-grow bg-amber-500 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
                     {editingCuisine.id ? 'Save Changes' : 'Add Cuisine'}
                   </button>
                   <button type="button" onClick={() => setActiveModal('cuisines')} className="px-8 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm">
                     Cancel
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingRatingRes && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRatingRes(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden relative z-10 shadow-2xl p-8"
            >
               <h3 className="text-xl font-display font-black text-slate-900 mb-6 tracking-tight">Adjust Restaurant Rating</h3>
               <div className="space-y-6">
                  <div className="flex justify-center items-center gap-4 text-4xl font-black text-amber-500 bg-amber-50 py-8 rounded-[24px]">
                    <Star size={32} className="fill-amber-500" />
                    <span>{editingRatingRes.rating}</span>
                  </div>

                  <div className="space-y-4">
                    <input 
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand"
                      value={editingRatingRes.rating}
                      onChange={e => setEditingRatingRes({...editingRatingRes, rating: parseFloat(e.target.value)})}
                    />
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <span>1.0</span>
                      <span>5.0</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                     <button 
                      onClick={updateRating}
                      className="flex-grow bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                     >
                       Update Rating
                     </button>
                     <button 
                      onClick={() => setEditingRatingRes(null)}
                      className="px-6 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all font-display"
                     >
                       Cancel
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}

        {editingRestaurant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingRestaurant(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-7xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <ChefHat size={24} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-black text-slate-900 leading-none">Master Edit</h2>
                    <p className="text-slate-500 font-bold mt-1.5 uppercase text-[10px] tracking-[0.2em]">{editingRestaurant.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingRestaurant(null)} 
                  className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-12 custom-scrollbar">
                <form id="master-edit-form" onSubmit={handleSaveRestaurant} className="space-y-12">
                   {/* Section: Basic Details */}
                   <div className="space-y-8">
                     <div className="flex items-center gap-3 border-l-4 border-brand pl-4">
                       <span className="text-xs font-black text-brand uppercase tracking-widest">Base Details</span>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Restaurant Name</label>
                         <input 
                           type="text"
                           className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-brand/10 transition-all"
                           value={editingRestaurant.name}
                           onChange={e => setEditingRestaurant({...editingRestaurant, name: e.target.value})}
                           required
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                         <input 
                           type="text"
                           className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-brand/10 transition-all"
                           value={editingRestaurant.contactNumber || ''}
                           onChange={e => setEditingRestaurant({...editingRestaurant, contactNumber: e.target.value})}
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cuisine Type</label>
                         <select 
                           className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-brand/10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xlmns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m2%205%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_1.5rem_center] bg-no-repeat"
                           value={editingRestaurant.cuisine}
                           onChange={e => setEditingRestaurant({...editingRestaurant, cuisine: e.target.value})}
                         >
                           <option value="">Select Cuisine</option>
                           {sortedCuisines.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                         </select>
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                         <select 
                           className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-brand/10 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xlmns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m2%205%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_1.5rem_center] bg-no-repeat"
                           value={editingRestaurant.city}
                           onChange={e => setEditingRestaurant({...editingRestaurant, city: e.target.value})}
                         >
                           <option value="">Select City</option>
                           {sortedCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                         </select>
                       </div>
                     </div>

                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Location Address</label>
                       <textarea 
                         rows={2}
                         className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-brand/10 transition-all resize-none"
                         value={editingRestaurant.location}
                         onChange={e => setEditingRestaurant({...editingRestaurant, location: e.target.value})}
                       />
                     </div>

                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                       <textarea 
                         rows={4}
                         className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-brand/10 transition-all"
                         value={editingRestaurant.description}
                         onChange={e => setEditingRestaurant({...editingRestaurant, description: e.target.value})}
                       />
                     </div>
                   </div>

                   {/* Section: Pricing & Rating */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-50">
                     <div className="space-y-6">
                       <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4">
                         <span className="text-xs font-black text-amber-500 uppercase tracking-widest">Market Context</span>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Avg Price (₹)</label>
                           <input 
                             type="number"
                             className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-amber-500/10"
                             value={editingRestaurant.avgPrice}
                             onChange={e => setEditingRestaurant({...editingRestaurant, avgPrice: parseInt(e.target.value)})}
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rating</label>
                           <input 
                             type="number"
                             step="0.1"
                             min="1"
                             max="5"
                             className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-amber-500/10"
                             value={editingRestaurant.rating}
                             onChange={e => setEditingRestaurant({...editingRestaurant, rating: parseFloat(e.target.value)})}
                           />
                         </div>
                       </div>
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                          <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Operational Status</span>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <label className="flex items-center justify-between p-6 bg-slate-50 rounded-[24px] cursor-pointer group hover:bg-emerald-50 transition-colors">
                              <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-emerald-600">Open Now</span>
                              <input 
                                type="checkbox"
                                className="w-6 h-6 accent-emerald-500"
                                checked={editingRestaurant.isOpen}
                                onChange={e => setEditingRestaurant({...editingRestaurant, isOpen: e.target.checked})}
                              />
                           </label>
                           <label className="flex items-center justify-between p-6 bg-slate-50 rounded-[24px] cursor-pointer group hover:bg-emerald-50 transition-colors">
                              <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-emerald-600">Approved</span>
                              <input 
                                type="checkbox"
                                className="w-6 h-6 accent-emerald-500"
                                checked={editingRestaurant.approved}
                                onChange={e => setEditingRestaurant({...editingRestaurant, approved: e.target.checked})}
                              />
                           </label>
                        </div>
                     </div>
                   </div>

        {/* Section: Images & Visual Assets */}
                   <div className="space-y-8 pt-8 border-t border-slate-50">
                     <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-4">
                       <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Visual Assets Gallery</span>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Poster Image URL</label>
                         <input 
                           type="url"
                           className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
                           value={editingRestaurant.image}
                           onChange={e => setEditingRestaurant({...editingRestaurant, image: e.target.value})}
                         />
                         {editingRestaurant.image && (
                           <div className="w-full h-48 rounded-[24px] overflow-hidden border-4 border-slate-50">
                             <img src={editingRestaurant.image} className="w-full h-full object-cover" alt="Preview" />
                           </div>
                         )}
                       </div>

                       <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secondary Gallery Images (URLs, one per line)</label>
                         <textarea 
                           rows={8}
                           className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono text-xs shadow-inner"
                           placeholder="https://example.com/img1.jpg&#10;https://example.com/img2.jpg"
                           value={(editingRestaurant.secondaryImages || []).join('\n')}
                           onChange={e => setEditingRestaurant({...editingRestaurant, secondaryImages: e.target.value.split('\n').filter(l => l.trim())})}
                         />
                       </div>
                     </div>

                     <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Menu Card Images (URLs, one per line)</label>
                       <textarea 
                         rows={4}
                         className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono text-xs shadow-inner"
                         placeholder="https://example.com/menu1.jpg&#10;https://example.com/menu2.jpg"
                         value={(editingRestaurant.menuImages || []).join('\n')}
                         onChange={e => setEditingRestaurant({...editingRestaurant, menuImages: e.target.value.split('\n').filter(l => l.trim())})}
                       />
                     </div>
                   </div>

                   {/* Section: Exclusive Offers & Amenities */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-50">
                     <div className="space-y-6">
                       <div className="flex items-center gap-3 border-l-4 border-rose-500 pl-4">
                         <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Exclusive Offers</span>
                       </div>
                       <div className="space-y-4">
                          <textarea 
                            rows={5}
                            className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] font-bold outline-none focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner"
                            placeholder="20% OFF on bill payment&#10;1+1 on Drinks"
                            value={(editingRestaurant.offers || []).join('\n')}
                            onChange={e => setEditingRestaurant({...editingRestaurant, offers: e.target.value.split('\n').filter(l => l.trim())})}
                          />
                          <p className="text-[10px] font-bold text-slate-400 ml-2 italic">Enter each offer on a new line</p>
                       </div>
                     </div>

                     <div className="space-y-6">
                       <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4">
                         <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Amenities & Facilities</span>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {['WiFi', 'Parking', 'AC', 'Outdoor Seating', 'Live Music', 'Bar', 'Valet', 'Family Friendly', 'Kids Play Area', 'TV'].map(facility => (
                            <button
                              key={facility}
                              type="button"
                              onClick={() => {
                                const current = editingRestaurant.facilities || [];
                                const next = current.includes(facility) 
                                  ? current.filter(f => f !== facility)
                                  : [...current, facility];
                                setEditingRestaurant({...editingRestaurant, facilities: next});
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight border transition-all",
                                (editingRestaurant.facilities || []).includes(facility)
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                                  : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"
                              )}
                            >
                              {facility}
                            </button>
                          ))}
                       </div>
                     </div>
                   </div>

                   {/* Section: Menu Management */}
                   <div className="space-y-8 pt-8 border-t border-slate-50">
                     <div className="flex items-center justify-between border-l-4 border-brand pl-4">
                       <span className="text-xs font-black text-brand uppercase tracking-widest">Popular Dishes & Digital Menu</span>
                       <button 
                         type="button"
                         onClick={() => {
                           const current = editingRestaurant.menu || [];
                           setEditingRestaurant({
                             ...editingRestaurant, 
                             menu: [...current, { name: '', price: 0, description: '' }]
                           });
                         }}
                         className="bg-brand/10 text-brand px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand hover:text-white transition-all flex items-center gap-2"
                       >
                         <Plus size={14} /> Add Item
                       </button>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {(editingRestaurant.menu || []).map((item, idx) => (
                         <div key={idx} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 relative group animate-in fade-in slide-in-from-bottom-2 shadow-inner">
                           <button 
                             type="button"
                             onClick={() => {
                               const next = [...(editingRestaurant.menu || [])];
                               next.splice(idx, 1);
                               setEditingRestaurant({...editingRestaurant, menu: next});
                             }}
                             className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 rounded-full flex items-center justify-center shadow-lg transition-all opacity-0 group-hover:opacity-100"
                           >
                             <X size={14} />
                           </button>
                           <div className="space-y-4">
                              <input 
                                placeholder="Item Name"
                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl font-bold text-sm outline-none"
                                value={item.name}
                                onChange={e => {
                                  const next = [...(editingRestaurant.menu || [])];
                                  next[idx].name = e.target.value;
                                  setEditingRestaurant({...editingRestaurant, menu: next});
                                }}
                              />
                              <input 
                                type="number"
                                placeholder="Price"
                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl font-bold text-sm outline-none"
                                value={item.price}
                                onChange={e => {
                                  const next = [...(editingRestaurant.menu || [])];
                                  next[idx].price = parseInt(e.target.value) || 0;
                                  setEditingRestaurant({...editingRestaurant, menu: next});
                                }}
                              />
                              <textarea 
                                placeholder="Short description..."
                                rows={2}
                                className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl font-medium text-[11px] outline-none resize-none"
                                value={item.description}
                                onChange={e => {
                                  const next = [...(editingRestaurant.menu || [])];
                                  next[idx].description = e.target.value;
                                  setEditingRestaurant({...editingRestaurant, menu: next});
                                }}
                              />
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Section: Opening Hours Detailed */}
                   <div className="space-y-8 pt-8 border-t border-slate-50">
                      <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4">
                       <span className="text-xs font-black text-amber-500 uppercase tracking-widest">Detailed Operating Hours</span>
                     </div>
                     
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <div key={day} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day.substring(0, 3)}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  const currentTimings = editingRestaurant.dailyTimings || {};
                                  const currentDay = currentTimings[day] || { open: '11:00 AM', close: '11:00 PM', closed: false };
                                  setEditingRestaurant({
                                    ...editingRestaurant,
                                    dailyTimings: {
                                      ...currentTimings,
                                      [day]: { ...currentDay, closed: !currentDay.closed }
                                    }
                                  });
                                }}
                                className={cn(
                                  "w-full py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                                  (editingRestaurant.dailyTimings?.[day]?.closed) 
                                    ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200" 
                                    : "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-100"
                                )}
                              >
                                {(editingRestaurant.dailyTimings?.[day]?.closed) ? 'Closed' : 'Open'}
                              </button>
                            </div>

                            {!(editingRestaurant.dailyTimings?.[day]?.closed) && (
                              <div className="space-y-2 pt-1 border-t border-slate-200/50">
                                <input 
                                  className="w-full bg-white border border-slate-100 rounded-lg py-1 px-1 text-[10px] font-black text-center text-slate-800 outline-none"
                                  value={editingRestaurant.dailyTimings?.[day]?.open || '11:00 AM'}
                                  onChange={e => {
                                    const current = editingRestaurant.dailyTimings || {};
                                    setEditingRestaurant({
                                      ...editingRestaurant,
                                      dailyTimings: {
                                        ...current,
                                        [day]: { ...(current[day] || {open: '', close: '', closed: false}), open: e.target.value }
                                      }
                                    });
                                  }}
                                />
                                <div className="text-[8px] font-black text-slate-300 text-center uppercase tracking-widest leading-none">To</div>
                                <input 
                                  className="w-full bg-white border border-slate-100 rounded-lg py-1 px-1 text-[10px] font-black text-center text-slate-800 outline-none"
                                  value={editingRestaurant.dailyTimings?.[day]?.close || '11:00 PM'}
                                  onChange={e => {
                                    const current = editingRestaurant.dailyTimings || {};
                                    setEditingRestaurant({
                                      ...editingRestaurant,
                                      dailyTimings: {
                                        ...current,
                                        [day]: { ...(current[day] || {open: '', close: '', closed: false}), close: e.target.value }
                                      }
                                    });
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                     </div>
                   </div>

                   {/* Modification Trace */}
                   {editingRestaurant.lastModifiedBy && (
                     <div className="p-8 bg-slate-900 rounded-[32px] text-slate-400 flex items-center justify-between shadow-2xl">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white">
                              <History size={24} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trace Logs</p>
                              <p className="text-sm font-bold text-slate-200 mt-1">
                                Last modification performed by <span className="text-brand">{editingRestaurant.lastModifiedBy} ({editingRestaurant.lastModifiedByType})</span>
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Timestamp</p>
                           <p className="text-sm font-bold text-slate-200 mt-1">
                             {editingRestaurant.updatedAt?.toDate ? formatDate(editingRestaurant.updatedAt) : 'Initial Upload'}
                           </p>
                        </div>
                     </div>
                   )}
                </form>
              </div>

              <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <button 
                  type="submit" 
                  form="master-edit-form"
                  disabled={isSavingRestaurant}
                  className="flex-grow bg-vibrant-dark text-white py-4 rounded-[20px] font-black shadow-xl shadow-vibrant-dark/20 flex items-center justify-center gap-3 active:scale-95 transition-all text-base disabled:opacity-50"
                >
                  {isSavingRestaurant ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  <span>Commit All Changes</span>
                </button>
                <button 
                  onClick={() => setEditingRestaurant(null)}
                  className="px-10 bg-white border border-slate-200 text-slate-600 py-4 rounded-[20px] font-black shadow-sm hover:bg-slate-100 transition-all font-display text-base"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-xl",
              notification.type === 'success' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            )}
          >
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-black text-sm tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
