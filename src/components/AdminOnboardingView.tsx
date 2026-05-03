import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Restaurant } from '../types';
import { useMasterData } from './MasterDataContext';
import { cn } from '../lib/utils';
import { 
  Store, 
  MapPin, 
  Clock, 
  Save, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Navigation,
  ChevronLeft,
  User,
  IndianRupee,
  Utensils,
  Image as ImageIcon,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const BANGALORE_COORDS = { lat: 12.9716, lng: 77.5946 };
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminOnboardingView() {
  const navigate = useNavigate();
  const { cities, cuisines } = useMasterData();
  const sortedCities = React.useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name)), [cities]);
  const sortedCuisines = React.useMemo(() => [...cuisines].sort((a, b) => a.name.localeCompare(b.name)), [cuisines]);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [form, setForm] = useState<Partial<Restaurant>>({
    name: '',
    description: '',
    cuisine: 'North Indian',
    avgPrice: 500,
    contactNumber: '',
    image: '',
    location: '',
    city: 'Bangalore',
    lat: BANGALORE_COORDS.lat,
    lng: BANGALORE_COORDS.lng,
    ownerId: '',
    isOpen: true,
    rating: 4.0, // Default base rating for new restaurants
    approved: true, // Admin onboarding is pre-approved
    openingHours: {
      open: '11:00 AM',
      close: '11:00 PM',
      days: 'Mon-Sun'
    },
    dailyTimings: DAYS_OF_WEEK.reduce((acc, day) => {
      acc[day] = { open: '11:00 AM', close: '11:00 PM', closed: false };
      return acc;
    }, {} as any)
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleGeocodeAddress = async () => {
    const { name, location } = form;
    if (!location || location.length < 5) return;
    
    try {
      const queryStr = name ? `${name}, ${location}` : location;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        setForm(prev => ({ 
          ...prev, 
          lat: parseFloat(data[0].lat), 
          lng: parseFloat(data[0].lon) 
        }));
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Duplicate Check: Name + Location (Case-insensitive & Trimmed)
      const normalizedName = form.name?.trim().toLowerCase();
      const normalizedLocation = form.location?.trim().toLowerCase();
      
      const duplicateQuery = query(
        collection(db, 'restaurants'), 
        where('name', '==', form.name?.trim()), // Firestore is case-sensitive, so we check exact trim
        where('location', '==', form.location?.trim())
      );
      
      const duplicateSnap = await getDocs(duplicateQuery);
      if (!duplicateSnap.empty) {
        showNotification('error', 'A restaurant with this name and location already exists!');
        setIsSaving(false);
        return;
      }

      const resData = {
        ...form,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reviewsCount: 0,
        facilities: [],
        offers: [],
        menu: [],
        secondaryImages: [],
        isBookingEnabled: true,
        instantBookingLimit: 10,
        slotCategories: [
          { id: 'breakfast', name: 'Breakfast', slots: ['08:00', '08:30', '09:00', '09:30'] },
          { id: 'lunch', name: 'Lunch', slots: ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30'] },
          { id: 'dinner', name: 'Dinner', slots: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'] }
        ],
        bookingSlots: ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00']
      };

      await addDoc(collection(db, 'restaurants'), resData);
      showNotification('success', 'Restaurant onboarded successfully!');
      setTimeout(() => navigate('/admin'), 2000);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to onboard restaurant.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Notifications */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                "fixed top-24 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md",
                notification.type === 'success' 
                  ? "bg-emerald-500/90 border-emerald-500/20 text-white" 
                  : "bg-red-500/90 border-red-500/20 text-white"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="font-bold text-sm">{notification.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => navigate('/admin')}
          className="mb-8 flex items-center gap-2 text-slate-500 font-bold hover:text-brand transition-colors"
        >
          <ChevronLeft size={20} /> Back to Dashboard
        </button>

        <div className="mb-10">
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">Onboard New Restaurant</h1>
          <p className="text-slate-500 font-medium mt-2">Add a new culinary partner to the platform instantly.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section: Identity */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                <Utensils className="text-brand" size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Identity & Category</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Restaurant Name</label>
                <input 
                  required
                  placeholder="e.g. The Coastal Kitchen"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Contact Number</label>
                <input 
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold"
                  value={form.contactNumber}
                  onChange={e => setForm({...form, contactNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Cuisine Type</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold"
                  value={form.cuisine}
                  onChange={e => setForm({...form, cuisine: e.target.value})}
                >
                  <option value="">Select Cuisine</option>
                  {sortedCuisines.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  {sortedCuisines.length === 0 && <option value="North Indian">North Indian</option>}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Avg Price (For Two)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><IndianRupee size={16} /></span>
                  <input 
                    type="number"
                    required
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold"
                    value={form.avgPrice}
                    onChange={e => setForm({...form, avgPrice: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Base Rating (Admin Only)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500"><Star size={16} className="fill-amber-500" /></span>
                  <input 
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    required
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold"
                    value={form.rating}
                    onChange={e => setForm({...form, rating: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Owner User ID (UID)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><User size={16} /></span>
                  <input 
                    placeholder="Optional - Assign later"
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-xs"
                    value={form.ownerId}
                    onChange={e => setForm({...form, ownerId: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
              <textarea 
                rows={4}
                placeholder="Briefly describe the restaurant's legacy and specialty..."
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none font-medium"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
              />
            </div>
          </section>

          {/* Section: Location */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <MapPin className="text-blue-500" size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Location Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">City</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold"
                  value={form.city}
                  onChange={e => setForm({...form, city: e.target.value})}
                >
                  <option value="">Select City</option>
                  {sortedCities.filter(c => c.lat !== 0).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  {sortedCities.length === 0 && <option value="Bangalore">Bangalore</option>}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Primary Image URL</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"><ImageIcon size={16} /></span>
                  <input 
                    type="url"
                    required
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all text-sm"
                    value={form.image}
                    onChange={e => setForm({...form, image: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Full Address</label>
              <textarea 
                required
                rows={3}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none font-medium"
                value={form.location}
                onChange={e => setForm({...form, location: e.target.value})}
                onBlur={handleGeocodeAddress}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">Latitude</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300" />
                   <input 
                    type="number"
                    step="any"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-mono"
                    value={form.lat}
                    onChange={e => setForm({...form, lat: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">Longitude</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-300" />
                   <input 
                    type="number"
                    step="any"
                    className="w-full pl-8 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-mono"
                    value={form.lng}
                    onChange={e => setForm({...form, lng: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50/50 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold text-blue-600">
              <Navigation size={16} />
              Coordinates are automatically detected based on the address.
            </div>
          </section>

          {/* Section: Operating Hours */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="text-amber-500" size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Operating Hours</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {DAYS_OF_WEEK.map(day => (
                 <div key={day} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{day}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const current = form.dailyTimings![day];
                          setForm({
                            ...form,
                            dailyTimings: {
                              ...form.dailyTimings,
                              [day]: { ...current, closed: !current.closed }
                            }
                          });
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-all",
                          form.dailyTimings![day].closed ? "bg-red-500 text-white" : "bg-slate-200 text-slate-500"
                        )}
                      >
                        {form.dailyTimings![day].closed ? 'Closed' : 'Open'}
                      </button>
                    </div>
                    
                    {!form.dailyTimings![day].closed && (
                      <div className="flex items-center gap-2">
                        <input 
                          placeholder="Open"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center"
                          value={form.dailyTimings![day].open}
                          onChange={e => {
                            const newTimings = { ...form.dailyTimings };
                            newTimings[day].open = e.target.value;
                            setForm({...form, dailyTimings: newTimings});
                          }}
                        />
                        <span className="text-slate-300 font-bold">to</span>
                        <input 
                          placeholder="Close"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center"
                          value={form.dailyTimings![day].close}
                          onChange={e => {
                            const newTimings = { ...form.dailyTimings };
                            newTimings[day].close = e.target.value;
                            setForm({...form, dailyTimings: newTimings});
                          }}
                        />
                      </div>
                    )}
                 </div>
               ))}
            </div>
          </section>

          <footer className="flex gap-4">
             <button 
              type="submit"
              disabled={isSaving}
              className="flex-grow bg-brand text-white py-6 rounded-[24px] font-black text-xl shadow-2xl shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
             >
               {isSaving ? <Store className="animate-bounce" /> : <Save size={24} />}
               Onboard Restaurant
             </button>
             <button 
              type="button"
              onClick={() => navigate('/admin')}
              className="px-10 bg-slate-200 text-slate-600 rounded-[24px] font-black text-xl hover:bg-slate-300 transition-all"
             >
               Discard
             </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
