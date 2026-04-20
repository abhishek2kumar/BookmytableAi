import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Restaurant, Booking, CUISINES } from '../types';
import { formatDate, formatTime, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';
import { 
  Store, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Settings,
  Star,
  Image as ImageIcon,
  ChefHat,
  MapPin,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  Tag,
  LayoutDashboard,
  UtensilsCrossed,
  ImagePlus,
  ArrowRight,
  MessageSquare,
  Volume2,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SUPPORTED_CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Jaipur'];
const BANGALORE_COORDS = { lat: 12.9716, lng: 77.5946 };
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_BOOKING_SLOTS = ['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

type TabType = 'overview' | 'info' | 'menu' | 'gallery' | 'promotions' | 'bookings';

export default function OwnerDashboardView() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRestaurant, setIsAddingRestaurant] = useState(false);
  
  const activeTab = (searchParams.get('tab') as TabType) || 'overview';
  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  const [editForm, setEditForm] = useState<Partial<Restaurant>>({});
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const prevPendingCount = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const toggleAlerts = () => {
    if (!alertsEnabled) {
      // Play a silent sound to "unlock" the audio context
      audioRef.current?.play().catch(() => {});
    }
    setAlertsEnabled(!alertsEnabled);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    if (restaurant) {
      setEditForm({ ...restaurant });
    }
  }, [restaurant]);

  const handleUpdateDetails = async () => {
    if (!restaurant) return;
    setIsSaving(true);
    try {
      const allowedKeys = [
        'name', 'description', 'cuisine', 'avgPrice', 'image', 'location', 'city', 
        'isOpen', 'aiSummary', 'aiSummaryUpdatedAt', 'facilities', 
        'offers', 'menu', 'menuImages', 'openingHours', 'secondaryImages', 'rating',
        'dailyTimings', 'isBookingEnabled', 'bookingSlots'
      ];
      
      const updateData: any = {};
      allowedKeys.forEach(key => {
        if (editForm[key as keyof Restaurant] !== undefined) {
          let value = editForm[key as keyof Restaurant];
          
          if ((key === 'facilities' || key === 'offers') && Array.isArray(value)) {
            value = value.filter(s => s && s.trim().length > 0);
          }
          
          updateData[key] = value;
        }
      });
      
      if (updateData.openingHours) {
        updateData.openingHours = {
          open: updateData.openingHours.open || '11:00 AM',
          close: updateData.openingHours.close || '11:00 PM',
          days: updateData.openingHours.days || 'Mon-Sun'
        };
      }
      
      updateData.updatedAt = serverTimestamp();

      await updateDoc(doc(db, 'restaurants', restaurant.id), updateData);
      showNotification('success', 'Changes saved successfully!');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const [newRes, setNewRes] = useState({
    name: '',
    description: '',
    cuisine: CUISINES[0],
    avgPrice: 500,
    image: '',
    location: '',
    city: SUPPORTED_CITIES[0],
    lat: BANGALORE_COORDS.lat,
    lng: BANGALORE_COORDS.lng
  });

  const handleGeocodeAddress = async (target: 'new' | 'edit') => {
    const dataToUse = target === 'new' ? newRes : editForm;
    const address = dataToUse.location;
    const name = dataToUse.name;

    if (!address || address.length < 5) return;
    
    try {
      // Search with both name and address for maximum accuracy
      const query = name ? `${name}, ${address}` : address;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        
        if (target === 'new') {
          setNewRes(prev => ({ ...prev, ...coords }));
        } else {
          setEditForm(prev => ({ ...prev, ...coords }));
        }
      } else if (name) {
        // Fallback to just address if name+address fails
        const fallbackResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          const coords = {
            lat: parseFloat(fallbackData[0].lat),
            lng: parseFloat(fallbackData[0].lon)
          };
          if (target === 'new') {
            setNewRes(prev => ({ ...prev, ...coords }));
          } else {
            setEditForm(prev => ({ ...prev, ...coords }));
          }
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
  };

  useEffect(() => {
    if (!user) return;

    const qRes = query(collection(db, 'restaurants'), where('ownerId', '==', user.uid));
    const unsubRes = onSnapshot(qRes, (snapshot) => {
      if (!snapshot.empty) {
        setRestaurant({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Restaurant);
      } else {
        setRestaurant(null);
      }
    });

    const qBookings = query(collection(db, 'bookings'), where('restaurantOwnerId', '==', user.uid));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      
      // Sort by status (pending first) and then by time (newest first)
      const sortedBookings = docs.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return b.dateTime.toMillis() - a.dateTime.toMillis();
      });
      
      // Play sound for new pending bookings ONLY if alerts are enabled
      const currentPendingCount = docs.filter(b => b.status === 'pending').length;
      if (currentPendingCount > prevPendingCount.current && alertsEnabled) {
        audioRef.current?.play().catch(e => console.log('Audio play failed:', e));
      }
      prevPendingCount.current = currentPendingCount;
      
      setBookings(sortedBookings);
      setLoading(false);
    });

    return () => {
      unsubRes();
      unsubBookings();
    };
  }, [user]);

  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { 
        status,
        updatedAt: serverTimestamp()
      });
      showNotification('success', `Booking ${status} successfully.`);
    } catch (err) {
      showNotification('error', 'Failed to update booking status.');
    }
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'restaurants'), {
        ...newRes,
        ownerId: user.uid,
        rating: 4.5,
        isOpen: true,
        approved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddingRestaurant(false);
      showNotification('success', 'Restaurant registered! Waiting for approval.');
    } catch (err) {
      showNotification('error', 'Failed to register restaurant.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
    </div>
  );

  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Pending Requests', value: bookings.filter(b => b.status === 'pending').length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Confirmed Guests', value: bookings.filter(b => b.status === 'confirmed').reduce((acc, b) => acc + b.guests, 0), icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              <button onClick={() => setNotification(null)} className="ml-4 opacity-50 hover:opacity-100">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-10">
          <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">Manage Your Restaurant</h1>
          <p className="text-slate-500 font-medium mt-2">Control your outlet presence and bookings in real-time.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-72 space-y-2">
            <div className="p-4 mb-4">
               <h1 className="text-2xl font-display font-black text-slate-900 tracking-tight">
                 {restaurant ? restaurant.name : 'Owner Central'}
               </h1>
               <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                 {restaurant ? (
                   <>
                     <MapPin size={14} className="text-brand" />
                     {restaurant.location || restaurant.city}
                   </>
                 ) : (
                   "Powering your culinary dream."
                 )}
               </p>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                { id: 'bookings', label: 'Bookings', icon: Calendar, badge: bookings.filter(b => b.status === 'pending').length },
                { id: 'divider' },
                { id: 'info', label: 'Restaurant Info', icon: Info },
                { id: 'menu', label: 'Menu Builder', icon: UtensilsCrossed },
                { id: 'gallery', label: 'Photo Gallery', icon: ImageIcon },
                { id: 'promotions', label: 'Promotions', icon: Tag },
              ].map((item, idx) => (
                item.id === 'divider' ? <div key={idx} className="h-px bg-slate-200 my-4 mx-4" /> : (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all group",
                      activeTab === item.id 
                        ? "bg-brand text-white shadow-lg shadow-brand/20" 
                        : "text-slate-600 hover:bg-slate-100 active:scale-95"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon && <item.icon size={20} className={cn(activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-brand")} />}
                      <span className="text-sm">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-black",
                        activeTab === item.id ? "bg-white text-brand" : "bg-brand text-white"
                      )}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                )
              ))}
            </nav>

            {restaurant && (
              <div className="space-y-4 mt-8">
                {/* Booking Controls */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      editForm.isBookingEnabled ? "bg-indigo-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Booking Status
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Table Reservations</span>
                    <div 
                      onClick={() => setEditForm({...editForm, isBookingEnabled: !editForm.isBookingEnabled})}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300",
                        editForm.isBookingEnabled ? "bg-indigo-500" : "bg-slate-300"
                      )}
                    >
                      <motion.div 
                        animate={{ x: editForm.isBookingEnabled ? 24 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Online Order Controls */}
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      restaurant.approved ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    )} />
                    <span className="text-xs font-bold tracking-wider text-slate-500">
                      {restaurant.approved ? 'Online Order' : 'Pending Review'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Ordering App</span>
                    <div 
                      onClick={() => setEditForm({...editForm, isOpen: !editForm.isOpen})}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300",
                        editForm.isOpen ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    >
                      <motion.div 
                        animate={{ x: editForm.isOpen ? 24 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="flex-grow">
            {!restaurant && !isAddingRestaurant ? (
              <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-6">
                  <Store className="text-brand" size={40} />
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900 mb-3">Welcome to Zayka Partners</h3>
                <p className="text-slate-500 max-w-sm mx-auto mb-8">Ready to grow your restaurant business? Register now to reach thousands of diners.</p>
                <button 
                  onClick={() => setIsAddingRestaurant(true)}
                  className="bg-brand text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Register My Restaurant
                </button>
              </div>
            ) : isAddingRestaurant ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-xl max-w-2xl"
              >
                <h2 className="text-3xl font-display font-bold mb-8 text-slate-900">Partner Registration</h2>
                <form onSubmit={handleAddRestaurant} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold text-slate-500 tracking-widest mb-2 block">Restaurant Name</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all"
                        value={newRes.name}
                        onChange={e => setNewRes({...newRes, name: e.target.value})}
                        onBlur={() => handleGeocodeAddress('new')}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 tracking-widest mb-2 block">Cuisine Type</label>
                      <select 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all"
                        value={newRes.cuisine}
                        onChange={e => setNewRes({...newRes, cuisine: e.target.value})}
                      >
                        {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 tracking-widest mb-2 block">City</label>
                      <select 
                        required
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all"
                        value={newRes.city}
                        onChange={e => setNewRes({...newRes, city: e.target.value})}
                      >
                        {SUPPORTED_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-slate-500 tracking-widest">Restaurant Location</label>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <Navigation size={10} />
                          Auto-detects coordinates
                        </div>
                      </div>
                      <textarea 
                        required
                        placeholder="Enter full physical address..."
                        rows={3}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none"
                        value={newRes.location}
                        onChange={e => {
                          setNewRes({...newRes, location: e.target.value});
                          // Geocode after short delay or on change if needed, but onBlur is cleaner
                        }}
                        onBlur={() => handleGeocodeAddress('new')}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 block px-1">Latitude</label>
                        <input 
                          type="number"
                          step="any"
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-mono"
                          value={newRes.lat}
                          onChange={e => setNewRes({...newRes, lat: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 block px-1">Longitude</label>
                        <input 
                          type="number"
                          step="any"
                          className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-mono"
                          value={newRes.lng}
                          onChange={e => setNewRes({...newRes, lng: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 tracking-widest mb-2 block">Primary Image URL</label>
                    <input 
                      type="url" 
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all"
                      value={newRes.image}
                      onChange={e => setNewRes({...newRes, image: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 tracking-widest mb-2 block">Full Address</label>
                    <textarea 
                      required
                      rows={3}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none"
                      value={newRes.location}
                      onChange={e => setNewRes({...newRes, location: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="submit"
                      className="flex-grow bg-brand text-white py-5 rounded-2xl font-bold shadow-xl shadow-brand/20 active:scale-95 transition-all text-lg"
                    >
                      Start Partnership
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsAddingRestaurant(false)}
                      className="px-8 bg-slate-100 text-slate-600 py-5 rounded-2xl font-bold hover:bg-slate-200 transition-all font-display"
                    >
                      Back
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <div className="space-y-8">
                {/* Save Changes Floating Status */}
                {JSON.stringify(restaurant) !== JSON.stringify(editForm) && (
                   <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="sticky top-4 z-40 bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl border border-white/10 mx-[-8px]"
                  >
                    <div className="flex items-center gap-3 ml-2">
                       <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
                       <span className="text-sm font-bold">You have unsaved changes</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditForm({...restaurant!})}
                        className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                      >
                        Discard
                      </button>
                      <button 
                        onClick={handleUpdateDetails}
                        disabled={isSaving}
                        className="bg-brand px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? <span className="animate-spin">●</span> : <Save size={16} />}
                        Save Changes
                      </button>
                    </div>
                  </motion.div>
                )}

                <AnimatePresence mode="wait">
                  {activeTab === 'overview' && (
                    <motion.div 
                      key="overview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {stats.map((stat, idx) => (
                          <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm group hover:shadow-md transition-all">
                             <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", stat.bg)}>
                                <stat.icon className={stat.color} size={28} />
                             </div>
                             <p className="text-sm font-bold text-slate-500 mb-1">{stat.label}</p>
                             <p className="text-4xl font-display font-black text-slate-900">{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Welcome Card */}
                      <div className="bg-brand rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
                         <div className="relative z-10">
                            <h2 className="text-3xl font-display font-bold mb-3">Hello, {restaurant?.name}!</h2>
                            <p className="text-white/80 max-w-md font-medium leading-relaxed">
                              Your restaurant is currently {restaurant?.isOpen ? 'online and taking orders' : 'closed'}. Keep your menu and photos updated to attract more customers.
                            </p>
                            <button 
                              onClick={() => setActiveTab('bookings')}
                              className="mt-6 bg-white text-brand px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm"
                            >
                              Check Recent Bookings <ArrowRight size={18} />
                            </button>
                         </div>
                         <div className="relative z-10 w-full md:w-64 aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                            <img 
                              src={restaurant?.image || RESTAURANT_IMAGE_FALLBACK} 
                              className="w-full h-full object-cover" 
                              alt="Storefront"
                              referrerPolicy="no-referrer"
                            />
                         </div>
                         {/* Abstract shapes */}
                         <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl p-20" />
                         <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-black/10 rounded-full blur-2xl" />
                      </div>
                    </motion.div>
                  )}                   {activeTab === 'bookings' && (
                    <motion.div 
                      key="bookings"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm"
                    >
                      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                         <h2 className="text-2xl font-display font-bold text-slate-900">Manage Bookings</h2>
                         <div className="flex items-center gap-3">
                            <button 
                              onClick={toggleAlerts}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                alertsEnabled ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-500"
                              )}
                            >
                              {alertsEnabled ? <Volume2 size={16} /> : <div className="relative"><Volume2 size={16} /><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-0.5 bg-slate-500 rotate-45" /></div>}
                              {alertsEnabled ? "Alerts On" : "Enable Alerts"}
                            </button>
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black tracking-wider">{bookings.filter(b => b.status === 'pending').length} Action required</span>
                         </div>
                      </div>
                      
                      {bookings.length > 0 ? (
                        <div className="divide-y divide-slate-50">
                          {/* Pending Bookings Section */}
                          {bookings.some(b => b.status === 'pending') && (
                            <div className="bg-slate-50/50 px-6 py-2 border-b border-slate-100">
                               <span className="text-[10px] font-black text-slate-400 tracking-widest">Pending approval</span>
                            </div>
                          )}
                          {bookings.filter(b => b.status === 'pending').map((booking) => (
                            <div key={booking.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                               <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                                     <img 
                                      src={`https://ui-avatars.com/api/?name=${booking.userName}&background=random&bold=true`} 
                                      alt="User" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div>
                                     <h4 className="font-bold text-slate-900 text-lg">{booking.userName}</h4>
                                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                           <Users size={14} className="text-slate-400" /> {booking.guests} Guests
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                           <Calendar size={14} className="text-slate-400" /> {formatDate(booking.dateTime)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                           <Clock size={14} className="text-slate-400" /> {formatTime(booking.dateTime)}
                                        </div>
                                     </div>
                                  </div>
                               </div>

                               <div className="flex items-center gap-3 w-full md:w-auto">
                                   <button 
                                      title="Send WhatsApp Confirmation"
                                      onClick={() => {
                                        const text = encodeURIComponent(`Hello ${booking.userName}, this is ${restaurant?.name}. We have received your booking for ${booking.guests} guests on ${formatDate(booking.dateTime)} at ${formatTime(booking.dateTime)}. Would you like to confirm this?`);
                                        window.open(`https://wa.me/${booking.userPhone?.replace(/\D/g, '')}?text=${text}`, '_blank');
                                      }}
                                      className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100"
                                   >
                                      <MessageSquare size={18} />
                                   </button>
                                   <button 
                                      onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                      className="flex-grow md:flex-none px-6 py-3 bg-brand text-white rounded-xl font-bold text-sm shadow-lg shadow-brand/10 hover:scale-105 active:scale-95 transition-all"
                                   >
                                      Accept
                                   </button>
                                   <button 
                                      onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                      className="flex-grow md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                                   >
                                      Decline
                                   </button>
                               </div>
                            </div>
                          ))}

                          {/* Historical Bookings Section */}
                          {bookings.some(b => b.status !== 'pending') && (
                            <div className="bg-slate-50/50 px-6 py-2 border-b border-t border-slate-100">
                               <span className="text-[10px] font-black text-slate-400 tracking-widest">Historical bookings</span>
                            </div>
                          )}
                          {bookings.filter(b => b.status !== 'pending').map((booking) => (
                            <div key={booking.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors opacity-70">
                               <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm grayscale">
                                     <img 
                                      src={`https://ui-avatars.com/api/?name=${booking.userName}&background=random&bold=true`} 
                                      alt="User" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                  <div>
                                     <h4 className="font-bold text-slate-900 text-lg">{booking.userName}</h4>
                                     <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                           <Users size={14} className="text-slate-400" /> {booking.guests} Guests
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                           <Calendar size={14} className="text-slate-400" /> {formatDate(booking.dateTime)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                                           <Clock size={14} className="text-slate-400" /> {formatTime(booking.dateTime)}
                                        </div>
                                     </div>
                                  </div>
                               </div>

                               <div className="flex items-center gap-3 w-full md:w-auto">
                                  <div className={cn(
                                    "px-6 py-2.5 rounded-xl text-xs font-black tracking-widest border-2",
                                    booking.status === 'confirmed' ? "border-emerald-100 text-emerald-600 bg-emerald-50" : "border-red-100 text-red-600 bg-red-50"
                                  )}>
                                    {booking.status}
                                  </div>
                               </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-20 text-center">
                           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                              <Calendar className="text-slate-400" />
                           </div>
                           <p className="text-slate-500 font-medium">No bookings have been made yet.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'info' && (
                    <motion.div 
                      key="info"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-8"
                    >
                      <div className="space-y-6">
                        <h2 className="text-2xl font-display font-bold text-slate-900 border-b border-slate-100 pb-6 uppercase tracking-tight">Basic Information</h2>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">Restaurant Name</label>
                              <input 
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-bold text-slate-800 transition-all"
                                value={editForm.name || ''}
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                                onBlur={() => handleGeocodeAddress('edit')}
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">City</label>
                              <select 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-bold text-slate-800 transition-all appearance-none"
                                value={editForm.city || ''}
                                onChange={e => setEditForm({...editForm, city: e.target.value})}
                              >
                                {SUPPORTED_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">Signature Cuisine</label>
                              <select 
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-bold text-slate-800 transition-all appearance-none"
                                value={editForm.cuisine || ''}
                                onChange={e => setEditForm({...editForm, cuisine: e.target.value})}
                              >
                                {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-2">
                              <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">Description</label>
                              <textarea 
                                rows={4}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-medium text-slate-700 transition-all resize-none leading-relaxed"
                                value={editForm.description || ''}
                                onChange={e => setEditForm({...editForm, description: e.target.value})}
                                placeholder="Describe your restaurant experience..."
                              />
                           </div>
                           <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">Average Cost</label>
                                  <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                    <input 
                                      type="number"
                                      className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-bold text-slate-800 transition-all"
                                      value={editForm.avgPrice || ''}
                                      onChange={e => setEditForm({...editForm, avgPrice: Number(e.target.value)})}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-black text-slate-400 px-1 uppercase tracking-widest">Rating</label>
                                  <div className="relative">
                                    <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={16} />
                                    <input 
                                      type="number"
                                      step="0.1"
                                      min="1"
                                      max="5"
                                      className="w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-bold text-slate-800 transition-all"
                                      value={editForm.rating || ''}
                                      onChange={e => setEditForm({...editForm, rating: Number(e.target.value)})}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-black text-slate-400 px-1 uppercase tracking-widest">General Opening hours</label>
                                  <span className="text-[10px] text-slate-300 font-bold italic">Overrides daily if daily is empty</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                   <input placeholder="Open (e.g. 11:00 AM)" className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-center outline-none focus:border-brand transition-colors" value={editForm.openingHours?.open || ''} onChange={e => setEditForm({...editForm, openingHours: {...(editForm.openingHours || {days: 'Mon-Sun', close: ''}), open: e.target.value}})} />
                                   <input placeholder="Close (e.g. 11:00 PM)" className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-center outline-none focus:border-brand transition-colors" value={editForm.openingHours?.close || ''} onChange={e => setEditForm({...editForm, openingHours: {...(editForm.openingHours || {days: 'Mon-Sun', open: ''}), close: e.target.value}})} />
                                   <input placeholder="Days (e.g. Mon-Sun)" className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-center outline-none focus:border-brand transition-colors" value={editForm.openingHours?.days || ''} onChange={e => setEditForm({...editForm, openingHours: {...(editForm.openingHours || {open: '', close: ''}), days: e.target.value}})} />
                                </div>
                              </div>
                           </div>
                        </div>

                        {/* Daily Timings Section */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                           <div className="flex items-center justify-between">
                              <h3 className="text-xl font-display font-bold text-slate-900 uppercase tracking-tight">Operational Hours (Daily)</h3>
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const timings: any = {};
                                    DAYS_OF_WEEK.forEach(day => {
                                      timings[day] = { open: '11:00 AM', close: '11:00 PM', closed: false };
                                    });
                                    setEditForm({...editForm, dailyTimings: timings});
                                  }}
                                  className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline"
                                >
                                  Apply Defaults
                                </button>
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {DAYS_OF_WEEK.map(day => {
                                const timing = editForm.dailyTimings?.[day] || { open: '', close: '', closed: false };
                                return (
                                  <div key={day} className={cn(
                                    "p-5 rounded-[2rem] border transition-all flex items-center justify-between gap-4",
                                    timing.closed ? "bg-slate-50 border-slate-200 opacity-60" : "bg-white border-slate-100 shadow-sm"
                                  )}>
                                     <div className="flex items-center gap-4">
                                        <div 
                                          onClick={() => {
                                            const next = { ...timing, closed: !timing.closed };
                                            setEditForm({...editForm, dailyTimings: { ...(editForm.dailyTimings || {}), [day]: next }});
                                          }}
                                          className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all",
                                            timing.closed ? "bg-slate-200 text-slate-500" : "bg-brand/10 text-brand"
                                          )}
                                        >
                                          <Clock size={18} />
                                        </div>
                                        <div>
                                          <p className="text-sm font-black text-slate-900">{day}</p>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{timing.closed ? 'Closed' : 'Operational'}</p>
                                        </div>
                                     </div>

                                     {!timing.closed && (
                                       <div className="flex items-center gap-2">
                                          <input 
                                            className="w-20 px-2 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-center outline-none focus:border-brand"
                                            placeholder="11:00 AM"
                                            value={timing.open}
                                            onChange={e => {
                                              const next = { ...timing, open: e.target.value };
                                              setEditForm({...editForm, dailyTimings: { ...(editForm.dailyTimings || {}), [day]: next }});
                                            }}
                                          />
                                          <span className="text-slate-300 font-bold">-</span>
                                          <input 
                                            className="w-20 px-2 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-center outline-none focus:border-brand"
                                            placeholder="11:00 PM"
                                            value={timing.close}
                                            onChange={e => {
                                              const next = { ...timing, close: e.target.value };
                                              setEditForm({...editForm, dailyTimings: { ...(editForm.dailyTimings || {}), [day]: next }});
                                            }}
                                          />
                                       </div>
                                     )}
                                     
                                     {timing.closed && (
                                       <button 
                                          onClick={() => {
                                            const next = { ...timing, closed: false };
                                            setEditForm({...editForm, dailyTimings: { ...(editForm.dailyTimings || {}), [day]: next }});
                                          }}
                                          className="text-[10px] font-black text-brand uppercase tracking-widest"
                                       >
                                          Open
                                       </button>
                                     )}
                                  </div>
                                );
                              })}
                           </div>
                        </div>

                        {/* Booking Controls */}
                        <div className="space-y-6 pt-6 border-t border-slate-100">
                           <div className="flex items-center justify-between px-1">
                              <div>
                                <h3 className="text-xl font-display font-bold text-slate-900 uppercase tracking-tight">Booking Controls</h3>
                                <p className="text-slate-500 text-xs font-medium">Control table reservation availability and slots.</p>
                              </div>
                              <div className="flex items-center gap-4">
                                 <span className="text-xs font-bold text-slate-500">{editForm.isBookingEnabled ? 'Reservations Active' : 'Reservations Disabled'}</span>
                                 <div 
                                    onClick={() => setEditForm({...editForm, isBookingEnabled: !editForm.isBookingEnabled})}
                                    className={cn(
                                      "w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300",
                                      editForm.isBookingEnabled ? "bg-emerald-500" : "bg-slate-300"
                                    )}
                                  >
                                    <motion.div 
                                      animate={{ x: editForm.isBookingEnabled ? 28 : 0 }}
                                      className="w-5 h-5 bg-white rounded-full shadow-lg"
                                    />
                                  </div>
                              </div>
                           </div>

                           {editForm.isBookingEnabled && (
                             <motion.div 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 space-y-6"
                             >
                                <div className="flex items-center justify-between">
                                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Available Booking Slots</label>
                                   <button 
                                      onClick={() => setEditForm({...editForm, bookingSlots: DEFAULT_BOOKING_SLOTS})}
                                      className="text-[10px] font-black text-brand uppercase tracking-widest hover:underline"
                                   >
                                      Use Standard Slots
                                   </button>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                   {(editForm.bookingSlots || []).map((slot, idx) => (
                                      <div key={idx} className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm group">
                                         <span className="text-xs font-black text-slate-700">{slot}</span>
                                         <button 
                                            onClick={() => setEditForm({...editForm, bookingSlots: editForm.bookingSlots?.filter((_, i) => i !== idx)})}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                          >
                                            <X size={14} />
                                         </button>
                                      </div>
                                   ))}
                                   
                                   <div className="flex items-center gap-2">
                                      <input 
                                        type="text"
                                        placeholder="Add Slot (e.g. 15:30)"
                                        className="w-32 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand"
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            const val = e.currentTarget.value.trim();
                                            if (val) {
                                               setEditForm({...editForm, bookingSlots: [...(editForm.bookingSlots || []), val]});
                                               e.currentTarget.value = '';
                                            }
                                          }
                                        }}
                                      />
                                      <div className="text-[10px] text-slate-400 font-bold italic">Press Enter</div>
                                   </div>
                                </div>
                             </motion.div>
                           )}
                        </div>

                        <div className="space-y-4 pt-2">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-xs font-black text-slate-400">Location / Address</label>
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-[0.1em]">
                                <Navigation size={10} />
                                Syncs to Map
                              </div>
                           </div>
                           <div className="relative">
                              <MapPin className="absolute left-6 top-5 text-slate-400" size={20} />
                              <textarea 
                                 rows={2}
                                 className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-medium text-slate-700 transition-all resize-none"
                                 value={editForm.location || ''}
                                 onChange={e => setEditForm({...editForm, location: e.target.value})}
                                 onBlur={() => handleGeocodeAddress('edit')}
                                 placeholder="Enter full physical address..."
                              />
                           </div>
                           
                           <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Latitude</label>
                                 <input 
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 18.5204"
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-mono text-xs font-bold text-slate-600 transition-all"
                                    value={editForm.lat || ''}
                                    onChange={e => setEditForm({...editForm, lat: parseFloat(e.target.value)})}
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Longitude</label>
                                 <input 
                                    type="number"
                                    step="any"
                                    placeholder="e.g. 73.8567"
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-brand/5 focus:border-brand outline-none font-mono text-xs font-bold text-slate-600 transition-all"
                                    value={editForm.lng || ''}
                                    onChange={e => setEditForm({...editForm, lng: parseFloat(e.target.value)})}
                                 />
                              </div>
                           </div>
                        </div>

                        <div className="space-y-2 pt-4">
                           <label className="text-xs font-black text-slate-400 px-1 mb-4 block">Facilities & amenities</label>
                           <div className="flex flex-wrap gap-3">
                              {['WiFi', 'Parking', 'AC', 'Outdoor Seating', 'Live Music', 'Bar', 'Valet', 'Family Friendly', 'Kids Play Area'].map(fac => (
                                <button
                                  key={fac}
                                  type="button"
                                  onClick={() => {
                                    const current = editForm.facilities || [];
                                    const next = current.includes(fac) ? current.filter(f => f !== fac) : [...current, fac];
                                    setEditForm({...editForm, facilities: next});
                                  }}
                                  className={cn(
                                    "px-5 py-2.5 rounded-xl text-sm font-bold border transition-all",
                                    editForm.facilities?.includes(fac) 
                                      ? "bg-brand/10 border-brand text-brand ring-4 ring-brand/5" 
                                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                  )}
                                >
                                  {fac}
                                </button>
                              ))}
                           </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'menu' && (
                    <motion.div 
                      key="menu"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-8"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h2 className="text-2xl font-display font-bold text-slate-900">Culinary Offerings</h2>
                          <p className="text-slate-500 text-sm mt-1 font-medium">Build your digital menu for customers.</p>
                        </div>
                        <button 
                          onClick={() => setEditForm({...editForm, menu: [...(editForm.menu || []), {name: '', price: 0, description: ''}]})}
                          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm shadow-xl shadow-slate-900/10"
                        >
                          <Plus size={18} /> Add Dish
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence initial={false}>
                          {(editForm.menu || []).map((item, i) => (
                            <motion.div 
                              key={i}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col sm:flex-row items-center gap-6 hover:shadow-lg hover:bg-white transition-all hover:border-slate-200"
                            >
                              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 text-slate-300 group-hover:text-brand transition-colors">
                                <ChefHat size={32} />
                              </div>
                              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <input 
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-900 placeholder:text-slate-300"
                                    placeholder="Name of your creation..."
                                    value={item.name}
                                    onChange={e => {
                                      const newMenu = [...(editForm.menu || [])];
                                      newMenu[i].name = e.target.value;
                                      setEditForm({...editForm, menu: newMenu});
                                    }}
                                  />
                                  <input 
                                    className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-slate-400 placeholder:text-slate-300 italic"
                                    placeholder="Brief description of flavors..."
                                    value={item.description}
                                    onChange={e => {
                                      const newMenu = [...(editForm.menu || [])];
                                      newMenu[i].description = e.target.value;
                                      setEditForm({...editForm, menu: newMenu});
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-4">
                                   <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                                      <input 
                                        type="number"
                                        className="w-24 pl-5 pr-2 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black outline-none focus:border-brand transition-colors"
                                        value={item.price}
                                        onChange={e => {
                                          const newMenu = [...(editForm.menu || [])];
                                          newMenu[i].price = Number(e.target.value);
                                          setEditForm({...editForm, menu: newMenu});
                                        }}
                                      />
                                   </div>
                                   <button 
                                      onClick={() => setEditForm({...editForm, menu: editForm.menu?.filter((_, idx) => idx !== i)})}
                                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                      <Trash2 size={20} />
                                    </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {(editForm.menu || []).length === 0 && (
                          <div className="p-16 text-center border-4 border-dashed border-slate-50 rounded-[3rem]">
                             <UtensilsCrossed size={48} className="mx-auto text-slate-200 mb-4" />
                             <p className="text-slate-400 font-bold">Start adding delicious items to your menu.</p>
                          </div>
                        )}
                      </div>

                      <div className="pt-8 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-xl font-display font-bold text-slate-900">Visual Menu (Images)</h3>
                            <p className="text-slate-500 text-sm mt-1 font-medium">Upload photos of your physical menu for diners to browse.</p>
                          </div>
                          <button 
                            onClick={() => setEditForm({...editForm, menuImages: [...(editForm.menuImages || []), '']})}
                            className="text-brand font-bold text-sm flex items-center gap-1 hover:underline"
                          >
                            <Plus size={16} /> Add Image
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {(editForm.menuImages || []).map((img, idx) => (
                            <motion.div 
                              layout
                              key={idx} 
                              className="group relative aspect-[3/4] bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-sm"
                            >
                               {img ? (
                                  <img src={img} className="w-full h-full object-cover" alt={`Menu Image ${idx}`} referrerPolicy="no-referrer" onError={handleImageError} />
                               ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                     <ImageIcon className="text-slate-300 mb-2" size={32} />
                                     <p className="text-[10px] font-bold text-slate-400">Empty View</p>
                                  </div>
                               )}
                               <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-end backdrop-blur-sm">
                                  <input 
                                    className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-[10px] text-white outline-none mb-2 placeholder:text-white/50"
                                    placeholder="Menu Image URL..."
                                    value={img}
                                    onChange={e => {
                                      const next = [...(editForm.menuImages || [])];
                                      next[idx] = e.target.value;
                                      setEditForm({...editForm, menuImages: next});
                                    }}
                                  />
                                  <button 
                                    onClick={() => setEditForm({...editForm, menuImages: editForm.menuImages?.filter((_, i) => i !== idx)})}
                                    className="w-full py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20"
                                  >
                                    Remove
                                  </button>
                               </div>
                            </motion.div>
                          ))}

                          {(editForm.menuImages || []).length === 0 && (
                            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                              <ImagePlus className="mx-auto text-slate-200 mb-2" size={32} />
                              <p className="text-slate-400 text-xs font-bold">Upload menu photos to help customers plan their visit.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'gallery' && (
                   <motion.div 
                    key="gallery"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-8"
                   >
                      <div className="space-y-2">
                        <h2 className="text-2xl font-display font-bold text-slate-900 font-display">Visual Presentation</h2>
                        <p className="text-slate-500 text-sm font-medium">Quality visuals increase bookings by up to 65%.</p>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Main Showpiece Image</label>
                          <div className="relative h-[400px] rounded-[2.5rem] overflow-hidden border border-slate-100 group shadow-inner-sm">
                             <img 
                                src={editForm.image || RESTAURANT_IMAGE_FALLBACK} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                alt="Main"
                                referrerPolicy="no-referrer"
                                onError={handleImageError}
                             />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <div className="w-[80%] max-w-sm">
                                   <input 
                                      className="w-full px-6 py-4 bg-white/90 border border-white/20 rounded-2xl outline-none shadow-2xl text-sm font-bold text-slate-900"
                                      placeholder="Paste new Image URL here..."
                                      value={editForm.image || ''}
                                      onChange={e => setEditForm({...editForm, image: e.target.value})}
                                   />
                                </div>
                             </div>
                             <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold text-slate-900 shadow-lg">
                                Cover Photo
                             </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-4">
                           <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Secondary Gallery</label>
                              <button 
                                onClick={() => setEditForm({...editForm, secondaryImages: [...(editForm.secondaryImages || []), '']})}
                                className="text-brand font-bold text-xs flex items-center gap-1 hover:underline"
                              >
                                <Plus size={14} /> Add View
                              </button>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                              {(editForm.secondaryImages || []).map((img, idx) => (
                                <motion.div 
                                  layout
                                  key={idx} 
                                  className="group relative h-48 bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-sm"
                                >
                                   {img ? (
                                      <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} referrerPolicy="no-referrer" onError={handleImageError} />
                                   ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                                         <ImagePlus className="text-slate-300 mb-2" size={32} />
                                         <p className="text-[10px] font-bold text-slate-400">Empty View</p>
                                      </div>
                                   )}
                                   <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-end backdrop-blur-sm">
                                      <input 
                                        className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-[10px] text-white outline-none mb-2 placeholder:text-white/50"
                                        placeholder="Image URL..."
                                        value={img}
                                        onChange={e => {
                                          const next = [...(editForm.secondaryImages || [])];
                                          next[idx] = e.target.value;
                                          setEditForm({...editForm, secondaryImages: next});
                                        }}
                                      />
                                      <button 
                                        onClick={() => setEditForm({...editForm, secondaryImages: editForm.secondaryImages?.filter((_, i) => i !== idx)})}
                                        className="w-full py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20"
                                      >
                                        Remove
                                      </button>
                                   </div>
                                </motion.div>
                              ))}

                              {(editForm.secondaryImages || []).length === 0 && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                  <ImageIcon className="mx-auto text-slate-200 mb-2" size={32} />
                                  <p className="text-slate-400 text-xs font-bold">Showcase your ambiance through more photos.</p>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                   </motion.div>
                  )}

                  {activeTab === 'promotions' && (
                    <motion.div 
                      key="promotions"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-8"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-display font-bold text-slate-900">Campaigns & Offers</h2>
                          <p className="text-slate-500 text-sm mt-1 font-medium">Drive more traffic with enticing discounts.</p>
                        </div>
                        <button 
                          onClick={() => setEditForm({...editForm, offers: [...(editForm.offers || []), '']})}
                          className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all text-sm shadow-xl shadow-emerald-500/10"
                        >
                          <Plus size={18} /> New Campaign
                        </button>
                      </div>

                      <div className="space-y-4">
                        {(editForm.offers || []).map((offer, i) => (
                           <motion.div 
                            layout
                            key={i} 
                            className="flex gap-4 p-6 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] items-center group relative overflow-hidden"
                          >
                             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100 text-emerald-500 shadow-sm z-10">
                                <Tag size={24} />
                             </div>
                             <input 
                                className="flex-grow bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-800 placeholder:text-emerald-200 z-10"
                                placeholder="E.g. Flat 20% off on all main courses..."
                                value={offer}
                                onChange={e => {
                                  const next = [...(editForm.offers || [])];
                                  next[i] = e.target.value;
                                  setEditForm({...editForm, offers: next});
                                }}
                             />
                             <button 
                                onClick={() => setEditForm({...editForm, offers: editForm.offers?.filter((_, idx) => idx !== i)})}
                                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all z-10"
                              >
                                <Trash2 size={20} />
                              </button>
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-2xl translate-x-12 translate-y-[-12]" />
                           </motion.div>
                        ))}

                        {(editForm.offers || []).length === 0 && (
                          <div className="py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                             <Tag size={48} className="mx-auto text-slate-200 mb-4" />
                             <p className="text-slate-400 font-bold max-w-xs mx-auto">Customers love a good deal. Add your first promotion today!</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                   )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
