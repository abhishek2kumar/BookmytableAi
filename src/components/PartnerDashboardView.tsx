import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import AppIcon from './AppIcon';
import { Restaurant, LiveMenuItem, Offer } from '../types';
import { Loader2, LogOut, Store, MapPin, Image as ImageIcon, ChevronRight, Info, Clock, Utensils, Tag, Save, Eye, Plus, X, Star, Calendar, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence } from 'motion/react';

const TABS = [
  { id: 'bookings', label: 'Table Bookings', icon: Calendar },
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'general', label: 'General Info', icon: Info },
  { id: 'status', label: 'Status & Times', icon: Clock },
  { id: 'media', label: 'Media & Images', icon: ImageIcon },
  { id: 'menu', label: 'Live Menu', icon: Utensils },
  { id: 'specialties', label: 'Signature Dishes', icon: Star },
  { id: 'offers', label: 'Offers & Promos', icon: Tag },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function PartnerDashboardView() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRes, setSelectedRes] = useState<Restaurant | null>(null);
  
  const [activeTab, setActiveTab] = useState('bookings');
  const [formData, setFormData] = useState<Partial<Restaurant>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || !user.email) {
      navigate('/partners/login');
      return;
    }

    const fetchRestaurants = async () => {
      try {
        const q = query(collection(db, 'restaurants'), where('partnerEmails', 'array-contains', user.email!));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
        setRestaurants(data);
        if (data.length > 0) {
          setSelectedRes(data[0]);
          setFormData(data[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (selectedRes) {
      setFormData(selectedRes);
      setHasChanges(false);
    }
  }, [selectedRes]);

  useEffect(() => {
    if (!selectedRes) return;
    const q = query(
      collection(db, 'bookings'),
      where('restaurantId', '==', selectedRes.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [selectedRes]);

  const handleLogout = async () => {
    await signOut();
    navigate('/partners/login');
  };

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedRes) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'restaurants', selectedRes.id);
      await updateDoc(docRef, formData);
      
      // Update local state
      const updatedRes = { ...selectedRes, ...formData } as Restaurant;
      setSelectedRes(updatedRes);
      setRestaurants(prev => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
      setHasChanges(false);
      alert('Changes saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderImageInputList = (label: string, field: 'secondaryImages' | 'menuImages') => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{label}</h3>
        <button onClick={() => {
          const arr = [...(formData[field] || []), ''];
          updateForm(field, arr);
        }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
          <Plus size={14} /> Add Image
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(!formData[field] || formData[field].length === 0) ? (
           <div className="col-span-full p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium text-sm">
             No images added.
           </div>
        ) : formData[field].map((url, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden relative group transition-all shrink-0">
             <button onClick={() => {
                const arr = [...formData[field]!];
                arr.splice(idx, 1);
                updateForm(field, arr);
             }} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm text-red-500 rounded-lg hover:bg-red-50 transition-colors z-10 shadow-sm opacity-0 group-hover:opacity-100">
                <X size={14} />
             </button>
             <div className="h-32 bg-slate-100 flex items-center justify-center relative">
               {url ? (
                 <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
               ) : (
                 <ImageIcon className="text-slate-300" size={24} />
               )}
             </div>
             <div className="p-3 bg-slate-50 border-t border-slate-100">
                <input type="text" placeholder="Image URL" value={url} onChange={e => {
                   const arr = [...formData[field]!];
                   arr[idx] = e.target.value;
                   updateForm(field, arr);
                }} className="w-full px-2 py-1.5 bg-white border border-slate-200 focus:border-brand rounded-lg text-xs font-semibold outline-none" />
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBookingsTab = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayBookings: any[] = [];
    const upcomingBookings: any[] = [];
    const previousBookings: any[] = [];

    const sortedBookings = [...bookings].sort((a, b) => {
      const dateA = a.dateTime?.seconds ? new Date(a.dateTime.seconds * 1000) : new Date(a.dateTime);
      const dateB = b.dateTime?.seconds ? new Date(b.dateTime.seconds * 1000) : new Date(b.dateTime);
      return dateB.getTime() - dateA.getTime();
    });

    sortedBookings.forEach(booking => {
      const bd = booking.dateTime?.seconds ? new Date(booking.dateTime.seconds * 1000) : new Date(booking.dateTime);
      if (!isNaN(bd.getTime())) {
        const bdStr = bd.toISOString().split('T')[0];
        if (bdStr === todayStr) {
          todayBookings.push(booking);
        } else if (bd > new Date()) {
          upcomingBookings.push(booking);
        } else {
          previousBookings.push(booking);
        }
      }
    });

    const updateBookingStatus = async (bookingId: string, newStatus: string) => {
      try {
        await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus });
      } catch (err) {
        console.error("Failed to update status", err);
      }
    };

    const BookingCard = ({ b }: { b: any }) => {
      const bd = b.dateTime?.seconds ? new Date(b.dateTime.seconds * 1000) : new Date(b.dateTime);
      const dateStr = !isNaN(bd.getTime()) ? bd.toLocaleDateString() : '';
      return (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4 group">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center font-black text-brand text-lg">
                 {b.userName?.charAt(0) || 'G'}
               </div>
               <div>
                 <h4 className="font-bold text-slate-800 text-lg leading-tight">{b.userName}</h4>
                 <div className="text-xs font-semibold text-slate-500 mt-1">{b.userPhone || b.userEmail || 'No contact'}</div>
               </div>
             </div>
             
             <div className="flex flex-wrap items-center gap-x-8 gap-y-3 md:justify-end">
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Schedule</div>
                   <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                     <Calendar size={14} className="text-brand" /> {dateStr} at {b.time}
                   </div>
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Size</div>
                   <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                     <Users size={14} className="text-brand" /> {b.guests} Guests
                   </div>
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</div>
                   <div className="flex items-center gap-2">
                     <div className={cn(
                       "inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm",
                       b.status === 'confirmed' ? "bg-emerald-100 text-emerald-700" :
                       b.status === 'cancelled' ? "bg-red-100 text-red-700" :
                       "bg-amber-100 text-amber-700"
                     )}>
                       {b.status || 'pending'}
                     </div>
                     {b.status !== 'confirmed' && b.status !== 'cancelled' && (
                       <select 
                         className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold outline-none cursor-pointer focus:border-brand"
                         onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                         value={b.status || 'pending'}
                       >
                         <option value="pending" disabled>Pending</option>
                         <option value="confirmed">Confirm</option>
                         <option value="cancelled">Cancel</option>
                       </select>
                     )}
                   </div>
                </div>
             </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Today's Bookings</h3>
          {todayBookings.length === 0 ? <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">No bookings for today.</p> : todayBookings.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
        
        {upcomingBookings.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Upcoming Bookings</h3>
            {upcomingBookings.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}

        {previousBookings.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Previous Bookings</h3>
            {previousBookings.map(b => <BookingCard key={b.id} b={b} />)}
          </div>
        )}
      </div>
    );
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

  // Helper renderers for form
  const InputText = ({ label, value, onChange, placeholder = '' }: any) => (
    <div>
      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 bg-slate-50 border border-transparent focus:border-brand/20 focus:bg-white rounded-xl font-semibold text-slate-800 outline-none transition-all" />
    </div>
  );

  const TextArea = ({ label, value, onChange, placeholder = '' }: any) => (
    <div>
      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} className="w-full px-4 py-2.5 bg-slate-50 border border-transparent focus:border-brand/20 focus:bg-white rounded-xl font-semibold text-slate-800 outline-none transition-all resize-none" />
    </div>
  );

  const Toggle = ({ label, checked, onChange }: any) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={cn("w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out", checked ? "bg-emerald-500" : "bg-slate-200")}>
        <div className={cn("bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300", checked ? "translate-x-6" : "translate-x-0")} />
      </div>
      <span className="font-bold text-slate-700">{label}</span>
      <input type="checkbox" className="hidden" checked={checked || false} onChange={e => onChange(e.target.checked)} />
    </label>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-[60] h-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
           <div className="flex items-center justify-between h-full">
               <div className="flex items-center gap-3">
                 <AppIcon size={36} />
                 <span className="hidden sm:block text-xl font-display font-black text-vibrant-dark tracking-tighter">
                   Bookmy<span className="text-brand">Table</span>
                 </span>
                 <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest ml-2 hidden sm:block">Partner</span>
               </div>
               
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-slate-800">{user?.displayName}</p>
                </div>
                {user?.photoURL && (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-slate-100" />
                )}
                <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors" title="Logout">
                  <LogOut size={14} />
                </button>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
             <div className="space-y-1">
              {restaurants.map(res => (
                <div
                  key={res.id}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left",
                    selectedRes?.id === res.id 
                      ? "bg-slate-100 text-brand"
                      : "text-slate-600"
                  )}
                >
                  <Store size={16} className="shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="truncate text-sm font-bold">{res.name}</span>
                    <span className="truncate text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                      {res.location}, {res.city}
                    </span>
                  </div>
                </div>
              ))}
             </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">Dashboard Menu</p>
            <div className="space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold text-left text-sm",
                      activeTab === tab.id 
                        ? "bg-brand text-white shadow-md shadow-brand/20"
                        : "bg-transparent text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} />
                      {tab.label}
                    </div>
                    {activeTab === tab.id && <ChevronRight size={16} opacity={0.6} />}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-sm">
          {selectedRes && (
            <div className="space-y-8">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-6 gap-4">
                 <div>
                    <h1 className="text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight">{selectedRes.name}</h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2 mt-2 text-sm">
                      <MapPin size={14} />
                      {formData.location || selectedRes.location}, {formData.city || selectedRes.city}
                    </p>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider",
                      formData.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {formData.isOpen ? "Open" : "Closed"}
                    </span>
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider",
                      formData.isBookingEnabled ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {formData.isBookingEnabled ? "Bookings On" : "Bookings Off"}
                    </span>
                 </div>
               </div>

               {/* TAB CONTENT */}
               {activeTab === 'bookings' && renderBookingsTab()}
               
               {activeTab === 'overview' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Rating</p>
                        <p className="text-2xl font-black text-slate-800">{formData.rating || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Reviews</p>
                        <p className="text-2xl font-black text-slate-800">{formData.reviewsCount || 0}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Avg Price</p>
                        <p className="text-2xl font-black text-slate-800">₹{formData.avgPrice || 0}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Menu Items</p>
                        <p className="text-2xl font-black text-slate-800">
                          {formData.liveMenu?.length || 0}
                        </p>
                      </div>
                    </div>
                 </div>
               )}

               {activeTab === 'general' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <InputText label="Restaurant Name" value={formData.name} onChange={(v:any) => updateForm('name', v)} />
                     <InputText label="Contact Number" value={formData.contactNumber} onChange={(v:any) => updateForm('contactNumber', v)} />
                     <InputText label="City" value={formData.city} onChange={(v:any) => updateForm('city', v)} />
                     <InputText label="Location / Area" value={formData.location} onChange={(v:any) => updateForm('location', v)} />
                     <InputText label="Full Address" value={formData.address} onChange={(v:any) => updateForm('address', v)} />
                     <InputText label="Pincode" value={formData.pincode} onChange={(v:any) => updateForm('pincode', v)} />
                     <InputText label="Average Price (for 2)" value={formData.avgPrice?.toString()} onChange={(v:any) => updateForm('avgPrice', parseInt(v) || 0)} />
                     <InputText label="Cuisine Type (Comma separated)" value={Array.isArray(formData.cuisine) ? formData.cuisine.join(', ') : formData.cuisine} onChange={(v:any) => updateForm('cuisine', v.split(',').map((s:any)=>s.trim()).filter(Boolean))} />
                   </div>
                   <TextArea label="Description (SEO / Highlights)" value={formData.description} onChange={(v:any) => updateForm('description', v)} />
                   <TextArea label="Facilities (Comma separated)" value={Array.isArray(formData.facilities) ? formData.facilities.join(', ') : ''} onChange={(v:any) => updateForm('facilities', v.split(',').map((s:any)=>s.trim()).filter(Boolean))} />
                 </div>
               )}

               {activeTab === 'status' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-8">
                     <Toggle label="Open for Business" checked={formData.isOpen} onChange={(v:any) => updateForm('isOpen', v)} />
                     <Toggle label="Accepting Bookings" checked={formData.isBookingEnabled} onChange={(v:any) => updateForm('isBookingEnabled', v)} />
                   </div>
                   
                   <div>
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Daily Timings</h3>
                     <div className="space-y-3">
                       {DAYS.map(day => {
                         const timing = (formData.dailyTimings as any)?.[day] || { open: '', close: '', closed: false };
                         return (
                           <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                             <span className="w-28 font-bold text-slate-700">{day}</span>
                             <div className="flex-1 flex gap-3">
                               <input type="text" placeholder="12:00 PM" disabled={timing.closed} value={timing.open} onChange={e => {
                                 const newTimings = { ...(formData.dailyTimings || {}) };
                                 newTimings[day] = { ...timing, open: e.target.value };
                                 updateForm('dailyTimings', newTimings);
                               }} className="flex-1 w-full px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-semibold disabled:opacity-50 outline-none" />
                               <input type="text" placeholder="11:00 PM" disabled={timing.closed} value={timing.close} onChange={e => {
                                 const newTimings = { ...(formData.dailyTimings || {}) };
                                 newTimings[day] = { ...timing, close: e.target.value };
                                 updateForm('dailyTimings', newTimings);
                               }} className="flex-1 w-full px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-semibold disabled:opacity-50 outline-none" />
                             </div>
                             <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                               <input type="checkbox" checked={timing.closed} onChange={e => {
                                 const newTimings = { ...(formData.dailyTimings || {}) };
                                 newTimings[day] = { ...timing, closed: e.target.checked };
                                 updateForm('dailyTimings', newTimings);
                               }} className="rounded text-brand focus:ring-brand" />
                               Mark Closed
                             </label>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               )}

               {activeTab === 'media' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-100 mb-6">
                     <strong>Tip:</strong> Provide direct, absolute URLs (https://...) pointing to your images. Check with admin for cloud storage access updates if uploads fail.
                   </div>
                   <InputText label="Primary Image URL" value={formData.image} onChange={(v:any) => updateForm('image', v)} />
                   {formData.image && <img src={formData.image} alt="Primary" className="w-full max-w-sm h-48 object-cover rounded-xl border border-slate-200" />}
                   
                   <div className="pt-4 border-t border-slate-100">
                     {renderImageInputList("Secondary Images", 'secondaryImages')}
                   </div>
                   <div className="pt-4 border-t border-slate-100">
                     {renderImageInputList("Menu Images", 'menuImages')}
                   </div>
                 </div>
               )}

               {activeTab === 'menu' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Live Menu Items</h3>
                        <p className="text-xs text-slate-500 mt-1">Manage items available for digital ordering</p>
                      </div>
                      <button onClick={() => {
                        const newMenu = [...(formData.liveMenu || []), { id: Date.now().toString(), name: '', price: 0, description: '', isAvailable: true }];
                        updateForm('liveMenu', newMenu);
                      }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                        <Plus size={14} /> Add Item
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(!formData.liveMenu || formData.liveMenu.length === 0) ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium text-sm">
                          No live menu items configured.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.liveMenu.map((item, idx) => (
                            <div key={item.id || idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group">
                              <button onClick={() => {
                                const newMenu = [...formData.liveMenu!];
                                newMenu.splice(idx, 1);
                                updateForm('liveMenu', newMenu);
                              }} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                <X size={14} />
                              </button>
                              <div className="space-y-3 mt-2 pr-6">
                                <input type="text" placeholder="Item Name" value={item.name} onChange={e => {
                                  const newMenu = [...formData.liveMenu!];
                                  newMenu[idx].name = e.target.value;
                                  updateForm('liveMenu', newMenu);
                                }} className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-bold outline-none" />
                                <div className="flex gap-3">
                                  <input type="number" placeholder="Price (₹)" value={item.price} onChange={e => {
                                    const newMenu = [...formData.liveMenu!];
                                    newMenu[idx].price = parseInt(e.target.value) || 0;
                                    updateForm('liveMenu', newMenu);
                                  }} className="w-24 px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-semibold outline-none" />
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 border border-slate-200 rounded-lg">
                                    <input type="checkbox" checked={item.isAvailable} onChange={e => {
                                      const newMenu = [...formData.liveMenu!];
                                      newMenu[idx].isAvailable = e.target.checked;
                                      updateForm('liveMenu', newMenu);
                                    }} /> In Stock
                                  </label>
                                </div>
                                <div className="flex gap-3">
                                  {item.image && (
                                    <div className="w-16 h-16 shrink-0 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div className="flex-1 space-y-2">
                                    <input type="text" placeholder="Image URL (Optional)" value={item.image || ''} onChange={e => {
                                      const newMenu = [...formData.liveMenu!];
                                      newMenu[idx].image = e.target.value;
                                      updateForm('liveMenu', newMenu);
                                    }} className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-medium outline-none" />
                                    <textarea placeholder="Description" value={item.description || ''} onChange={e => {
                                      const newMenu = [...formData.liveMenu!];
                                      newMenu[idx].description = e.target.value;
                                      updateForm('liveMenu', newMenu);
                                    }} className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-medium outline-none resize-none" rows={2} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>
               )}

               {activeTab === 'specialties' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Signature Dishes</h3>
                        <p className="text-xs text-slate-500 mt-1">Highlight your best dishes to attract diners</p>
                      </div>
                      <button onClick={() => {
                        const newSig = [...(formData.signatureDishes || []), { name: '', price: 0, description: '' }];
                        updateForm('signatureDishes', newSig);
                      }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                        <Plus size={14} /> Add Signature
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(!formData.signatureDishes || formData.signatureDishes.length === 0) ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium text-sm">
                          No signature dishes configured.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.signatureDishes.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative group">
                              <button onClick={() => {
                                const newSig = [...formData.signatureDishes!];
                                newSig.splice(idx, 1);
                                updateForm('signatureDishes', newSig);
                              }} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                <X size={14} />
                              </button>
                              <div className="space-y-3 mt-2 pr-6">
                                <input type="text" placeholder="Dish Name" value={item.name} onChange={e => {
                                  const newSig = [...formData.signatureDishes!];
                                  newSig[idx].name = e.target.value;
                                  updateForm('signatureDishes', newSig);
                                }} className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-bold outline-none" />
                                <input type="number" placeholder="Price (₹)" value={item.price} onChange={e => {
                                    const newSig = [...formData.signatureDishes!];
                                    newSig[idx].price = parseInt(e.target.value) || 0;
                                    updateForm('signatureDishes', newSig);
                                  }} className="w-32 px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-semibold outline-none" />
                                <textarea placeholder="Description" value={item.description || ''} onChange={e => {
                                  const newSig = [...formData.signatureDishes!];
                                  newSig[idx].description = e.target.value;
                                  updateForm('signatureDishes', newSig);
                                }} className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-brand rounded-lg text-sm font-medium outline-none resize-none" rows={2} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>
               )}

               {activeTab === 'offers' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Ongoing Offers</h3>
                        <p className="text-xs text-slate-500 mt-1">Manage discounts and seasonal promotions</p>
                      </div>
                      <button onClick={() => {
                        const newOffer = [...(formData.offers || []), { title: '', description: '', validFrom: '', validUntil: '' }];
                        updateForm('offers', newOffer);
                      }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                        <Plus size={14} /> Add Offer
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(!formData.offers || formData.offers.length === 0) ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 font-medium text-sm">
                          No active offers.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.offers.map((item, idx) => (
                            <div key={idx} className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl relative group">
                              <button onClick={() => {
                                const newOffers = [...formData.offers!];
                                newOffers.splice(idx, 1);
                                updateForm('offers', newOffers);
                              }} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                <X size={14} />
                              </button>
                              <div className="space-y-3 mt-2 pr-6">
                                <input type="text" placeholder="Offer Title" value={item.title} onChange={e => {
                                  const newOffers = [...formData.offers!];
                                  newOffers[idx].title = e.target.value;
                                  updateForm('offers', newOffers);
                                }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-brand rounded-lg text-sm font-bold outline-none" />
                                
                                <div className="flex gap-3">
                                  <div className="flex-1">
                                    <span className="text-[10px] text-amber-700 font-black mb-1 block uppercase">Valid From</span>
                                    <input type="date" value={item.validFrom} onChange={e => {
                                      const newOffers = [...formData.offers!];
                                      newOffers[idx].validFrom = e.target.value;
                                      updateForm('offers', newOffers);
                                    }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-brand rounded-lg text-sm font-medium outline-none" />
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-[10px] text-amber-700 font-black mb-1 block uppercase">Valid Until</span>
                                    <input type="date" value={item.validUntil} onChange={e => {
                                      const newOffers = [...formData.offers!];
                                      newOffers[idx].validUntil = e.target.value;
                                      updateForm('offers', newOffers);
                                    }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-brand rounded-lg text-sm font-medium outline-none" />
                                  </div>
                                </div>
                                <input type="text" placeholder="Terms & Conditions" value={item.terms || ''} onChange={e => {
                                  const newOffers = [...formData.offers!];
                                  newOffers[idx].terms = e.target.value;
                                  updateForm('offers', newOffers);
                                }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-brand rounded-lg text-sm font-medium outline-none" />
                                <textarea placeholder="Description" value={item.description || ''} onChange={e => {
                                  const newOffers = [...formData.offers!];
                                  newOffers[idx].description = e.target.value;
                                  updateForm('offers', newOffers);
                                }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-brand rounded-lg text-sm font-medium outline-none resize-none" rows={2} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>
               )}

            </div>
          )}
        </div>
      </main>

      {/* Floating Save Bar */}
      <AnimatePresence>
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] z-50 transform transition-transform">
             <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                    <Info size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Unsaved Changes</h4>
                    <p className="text-xs text-slate-500 font-medium">You have modified your restaurant information.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => { setFormData(selectedRes || {}); setHasChanges(false); }} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                     Discard
                   </button>
                   <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl font-black text-sm text-white bg-vibrant-dark hover:bg-black shadow-lg shadow-black/10 transition-colors flex items-center gap-2">
                     {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Save Updates
                   </button>
                </div>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
