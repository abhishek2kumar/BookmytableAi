import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadImageToStorage } from "../lib/storage";
import AppIcon from './AppIcon';
import { Restaurant } from '../types';
import { Loader2, LogOut, Settings, Store, Calendar, Image as ImageIcon, MapPin, Edit3, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from "react-markdown";

export default function PartnerDashboardView() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRes, setSelectedRes] = useState<Restaurant | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // To avoid writing the full edit interface immediately, let's start with a view that maps to the user
  
  useEffect(() => {
    if (!user || !user.email) {
      navigate('/partners/login');
      return;
    }

    const fetchRestaurants = async () => {
      try {
        const q = query(collection(db, 'restaurants'), where('partnerEmails', 'array-contains', user.email));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
        setRestaurants(data);
        if (data.length > 0) setSelectedRes(data[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [user, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/partners/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (!restaurants.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AppIcon />
        <div className="mt-8 bg-white p-8 rounded-3xl shadow-sm max-w-md w-full">
          <Store className="mx-auto text-slate-300 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Restaurants Linked</h2>
          <p className="text-slate-500 mb-6">Your email {user?.email} is not linked to any active restaurants.</p>
          <button onClick={handleLogout} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold transition-colors">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-[60] h-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
           <div className="flex items-center justify-between h-full">
               <div className="flex items-center gap-3">
                 <AppIcon size={44} />
                 <span className="hidden sm:block text-2xl font-display font-black text-vibrant-dark tracking-tighter">
                   Bookmy<span className="text-brand">Table</span>
                 </span>
                 <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest ml-2 hidden sm:block">Partner</span>
               </div>
               
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-slate-800">{user?.displayName}</p>
                </div>
                {user?.photoURL && (
                  <img src={user.photoURL} alt="Profile" className="w-9 h-9 rounded-full border-2 border-slate-100" />
                )}
                <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors" title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {restaurants.map(res => (
            <button
              key={res.id}
              onClick={() => setSelectedRes(res)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-left",
                selectedRes?.id === res.id 
                  ? "bg-brand text-white shadow-md shadow-brand/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-100"
              )}
            >
              <div className="flex items-center gap-3 truncate">
                <Store size={18} />
                <span className="truncate">{res.name}</span>
              </div>
              {selectedRes?.id === res.id && <ChevronRight size={18} />}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-[32px] p-6 md:p-8 shadow-sm">
          {selectedRes && (
            <div className="space-y-8">
               <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                 <div>
                    <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight">{selectedRes.name}</h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2 mt-2">
                      <MapPin size={16} />
                      {selectedRes.location}, {selectedRes.city}
                    </p>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider",
                      selectedRes.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {selectedRes.isOpen ? "Live on Portal" : "Offline"}
                    </span>
                 </div>
               </div>

               {/* Quick Stats overview */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Rating</p>
                    <p className="text-xl font-black text-slate-800">{selectedRes.rating || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Bookings</p>
                    <p className="text-xl font-black text-slate-800">
                       <span className={cn(
                         "inline-flex items-center gap-1.5",
                         selectedRes.isBookingEnabled ? "text-emerald-500" : "text-red-500"
                       )}>
                         <span className={cn("w-2 h-2 rounded-full", selectedRes.isBookingEnabled ? "bg-emerald-500" : "bg-red-500")} />
                         {selectedRes.isBookingEnabled ? "Active" : "Disabled"}
                       </span>
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Takeaway</p>
                    <p className="text-xl font-black text-slate-800">
                      {selectedRes.liveMenu && selectedRes.liveMenu.length > 0 ? "Active" : "Disabled"}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Cuisines</p>
                    <p className="text-xl font-black text-slate-800 truncate">
                      {Array.isArray(selectedRes.cuisine) ? selectedRes.cuisine.length : 1}
                    </p>
                  </div>
               </div>

               <div className="bg-brand/5 border border-brand/10 p-6 rounded-3xl text-brand flex flex-col items-center justify-center text-center">
                 <Settings size={32} className="mb-4 opacity-50" />
                 <h3 className="text-lg font-bold mb-2">Welcome to your dashboard</h3>
                 <p className="font-medium max-w-md mx-auto">This dashboard is currently under active development. In the future, you will be able to manage your menus, accept bookings, and view performance charts directly from here.</p>
                 <p className="mt-4 font-bold text-sm bg-brand/10 px-4 py-2 rounded-xl">To request changes to your restaurant profile, please contact Admin.</p>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
