import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar, Clock, ChevronRight, 
  Settings, Save, AlertCircle, CheckCircle2,
  Trash2, Plus, Image as ImageIcon, Search,
  ChefHat, MapPin, Tag, Menu, LayoutDashboard,
  UtensilsCrossed, Star, X, Soup, Wine, IceCream, 
  Car, Wifi, Music, Tv, Baby, Coffee, Info,
  History, Eye, LogOut, Loader2, Globe, Shield,
  ArrowRight, Heart, Share2, MoreVertical, Snowflake, Sun
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { 
  collection, query, where, getDocs, 
  doc, updateDoc, onSnapshot, orderBy,
  limit, serverTimestamp, getDoc
} from 'firebase/firestore';
import { formatDate, formatTime, cn, handleImageError, RESTAURANT_IMAGE_FALLBACK } from '../lib/utils';

interface OwnerDashboardViewProps {
  ownerId?: string;
}

const DEFAULT_BOOKING_SLOTS = [
  "12:00", "12:30", "13:00", "13:30", 
  "19:00", "19:30", "20:00", "20:30"
];

const MEAL_CATEGORIES = [
  { id: 'breakfast', name: 'Breakfast', icon: Coffee },
  { id: 'lunch', name: 'Lunch', icon: UtensilsCrossed },
  { id: 'dinner', name: 'Dinner', icon: Soup },
  { id: 'brunch', name: 'Brunch', icon: Wine }
];

export default function OwnerDashboardView({ ownerId: propOwnerId }: OwnerDashboardViewProps) {
  const currentUserId = auth.currentUser?.uid;
  const ownerId = propOwnerId || currentUserId;
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'management' | 'menu'>('overview');
  const [activeMgmtTab, setActiveMgmtTab] = useState<'general' | 'operational' | 'visuals' | 'reservations'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Edit Form State
  const [editForm, setEditForm] = useState<any>({
    name: '',
    cuisine: '',
    location: '',
    avgPrice: 0,
    image: '',
    secondaryImages: [],
    description: '',
    isBookingEnabled: true,
    bookingSlots: [],
    instantBookingLimit: 4,
    blackoutDates: [],
    slotCategories: [
      { id: 'breakfast', name: 'Breakfast', slots: [] },
      { id: 'lunch', name: 'Lunch', slots: [] },
      { id: 'dinner', name: 'Dinner', slots: [] },
      { id: 'brunch', name: 'Brunch', slots: [] }
    ],
    menuCategories: []
  });

  useEffect(() => {
    if (!ownerId) return;

    // Fetch Restaurant
    const qRest = query(collection(db, 'restaurants'), where('ownerId', '==', ownerId), limit(1));
    const unsubscribeRest = onSnapshot(qRest, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        const fullData = { id: snapshot.docs[0].id, ...data } as any;
        setRestaurant(fullData);
        setEditForm({
          ...fullData,
          slotCategories: fullData.slotCategories || [
            { id: 'breakfast', name: 'Breakfast', slots: [] },
            { id: 'lunch', name: 'Lunch', slots: [] },
            { id: 'dinner', name: 'Dinner', slots: [] },
            { id: 'brunch', name: 'Brunch', slots: [] }
          ],
          menuCategories: fullData.menuCategories || []
        });
      }
      setLoading(false);
    });

    // Fetch Bookings
    const qBook = query(
      collection(db, 'bookings'), 
      where('restaurantOwnerId', '==', ownerId),
      orderBy('dateTime', 'desc'),
      limit(50)
    );
    const unsubscribeBook = onSnapshot(qBook, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
    });

    return () => {
      unsubscribeRest();
      unsubscribeBook();
    };
  }, [ownerId]);

  const handleSave = async () => {
    if (!restaurant?.id) return;
    setSaving(true);
    setSaveStatus('idle');

    const allowedKeys = [
      'name', 'description', 'cuisine', 'avgPrice', 'image', 'location', 'contactNumber',
      'isOpen', 'facilities', 'secondaryImages', 'isBookingEnabled', 'bookingSlots', 
      'instantBookingLimit', 'blackoutDates'
    ];

    const updateData: any = {};
    allowedKeys.forEach(key => {
      if (editForm[key] !== undefined) {
        if (key === 'secondaryImages' || key === 'menuImages') {
          updateData[key] = (editForm[key] || []).filter((url: string) => url.trim() !== '');
        } else {
          updateData[key] = editForm[key];
        }
      }
    });

    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Today\'s Expected', value: bookings.filter(b => formatDate(b.dateTime) === formatDate(new Date())).length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Active Slots', value: editForm.bookingSlots?.length || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  const renderOverviewTab = () => (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white rounded-[2.5rem] p-10 border border-slate-50 shadow-vibrant hover:shadow-2xl transition-all group overflow-hidden relative"
          >
            <div className={cn("inline-flex p-4 rounded-2xl mb-8 transition-transform group-hover:scale-110 duration-500 relative z-10", stat.bg, stat.color)}>
              <stat.icon size={28} />
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-2 relative z-10">{stat.label}</p>
            <h3 className="text-5xl font-display font-black text-slate-900 relative z-10 tracking-tight">{stat.value}</h3>
            <div className={cn("absolute -bottom-4 -right-4 w-32 h-32 rounded-full blur-3xl opacity-20", stat.bg)} />
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-[3.5rem] p-12 border border-slate-50 shadow-vibrant relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Recent Activity</h2>
              <p className="text-slate-400 font-bold mt-1">Incoming reservations status</p>
            </div>
            <button onClick={() => setActiveTab('bookings')} className="p-4 bg-orange-50/50 hover:bg-orange-100/50 rounded-2xl text-orange-600 transition-all flex items-center gap-3 font-bold group">
              View All <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="space-y-4">
            {bookings.length > 0 ? bookings.slice(0, 5).map((booking, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={booking.id}
                className="flex items-center justify-between p-6 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-orange-200/20 border border-transparent hover:border-orange-100 rounded-3xl transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-orange-600 text-lg">
                    {booking.userName?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg leading-none">{booking.userName}</h4>
                    <p className="text-slate-400 text-sm font-bold mt-2 flex items-center gap-4">
                      <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-300" /> {booking.guests} Guests</span>
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-300" /> {booking.time}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{formatDate(booking.dateTime)}</div>
                   <div className={cn(
                     "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                     booking.status === 'confirmed' ? "bg-emerald-100 text-emerald-600" :
                     booking.status === 'cancelled' ? "bg-red-100 text-red-600" :
                     "bg-orange-100 text-orange-600"
                   )}>
                     {booking.status || 'pending'}
                   </div>
                </div>
              </motion.div>
            )) : (
              <div className="py-24 text-center">
                <Calendar size={32} className="mx-auto text-slate-200 mb-6" />
                <p className="text-slate-400 font-bold italic">No reservations yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderBookingsTab = () => (
    <motion.div
      key="bookings"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-[3.5rem] shadow-vibrant border border-slate-50 overflow-hidden"
    >
      <div className="p-10 md:p-12 border-b border-slate-50 bg-orange-50/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h2 className="text-4xl font-display font-black text-slate-900 tracking-tight">Reservations</h2>
            <p className="text-slate-400 font-bold mt-2">Historical view of your guest activity.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white border border-slate-200 rounded-[24px] flex items-center px-6 py-3 shadow-sm focus-within:border-orange-400 transition-all">
              <Search size={18} className="text-slate-300" />
              <input type="text" placeholder="Search guests..." className="bg-transparent border-none outline-none pl-4 font-bold text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-4">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-8">
              <th className="px-8 pb-4">Guest</th>
              <th className="px-8 pb-4">Size</th>
              <th className="px-8 pb-4">Schedule</th>
              <th className="px-8 pb-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="group">
                <td className="bg-slate-50/50 group-hover:bg-orange-50/50 first:rounded-l-[2rem] px-8 py-6 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center font-black text-orange-600">
                      {booking.userName?.charAt(0) || 'G'}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 leading-none mb-1.5">{booking.userName}</div>
                      <div className="text-[10px] font-bold text-slate-400">{booking.userEmail}</div>
                    </div>
                  </div>
                </td>
                <td className="bg-slate-50/50 group-hover:bg-orange-50/50 px-8 py-6 transition-all">
                  <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-100 text-xs font-black text-slate-700 shadow-sm">
                    <Users size={14} className="text-slate-300" /> {booking.guests}
                  </div>
                </td>
                <td className="bg-slate-50/50 group-hover:bg-orange-50/50 px-8 py-6 transition-all">
                  <div className="font-bold text-slate-900 text-sm">{formatDate(booking.dateTime)}</div>
                  <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">{booking.time}</div>
                </td>
                <td className="bg-slate-50/50 group-hover:bg-orange-50/50 last:rounded-r-[2rem] px-8 py-6 text-right transition-all">
                   <div className={cn(
                     "inline-flex px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm",
                     booking.status === 'confirmed' ? "bg-emerald-500 text-white" :
                     booking.status === 'cancelled' ? "bg-red-500 text-white" :
                     "bg-orange-500 text-white"
                   )}>
                     {booking.status || 'pending'}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <div className="py-24 text-center">
             <Calendar size={48} className="mx-auto text-slate-200 mb-6" />
             <p className="text-slate-400 font-bold">Your reservation list is currently empty.</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderMenuTab = () => (
    <motion.div
      key="menu"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-[3.5rem] shadow-vibrant border border-slate-50 overflow-hidden relative"
    >
      <div className="h-40 bg-orange-50 absolute top-0 inset-x-0 -z-0" />
      <div className="p-12 pt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="md:w-1/3">
            <h3 className="text-3xl font-display font-black text-slate-900 tracking-tight leading-none mb-4">Visual Menu</h3>
            <p className="text-slate-400 font-bold leading-relaxed mb-8">Organize your digital presence into categories.</p>
            <button 
              onClick={() => setEditForm({...editForm, menuCategories: [...(editForm.menuCategories || []), { id: Date.now().toString(), name: '', images: [] }]})}
              className="w-full flex items-center justify-center gap-3 bg-orange-500 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Plus size={20} /> Add Category
            </button>
          </div>
          <div className="flex-1 space-y-10">
            {editForm.menuCategories?.map((cat: any, catIdx: number) => (
              <motion.div layout key={cat.id} className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-8">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Category Name</label>
                    <input 
                      type="text"
                      value={cat.name}
                      placeholder="e.g. Starters"
                      onChange={e => {
                        const next = [...editForm.menuCategories];
                        next[catIdx] = { ...next[catIdx], name: e.target.value };
                        setEditForm({...editForm, menuCategories: next});
                      }}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:border-orange-400 shadow-sm"
                    />
                  </div>
                  <button 
                    onClick={() => setEditForm({...editForm, menuCategories: editForm.menuCategories.filter((_:any, i:any) => i !== catIdx)})}
                    className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(cat.images || []).map((img: string, imgIdx: number) => (
                    <div key={imgIdx} className="space-y-3">
                      <div className="aspect-[3/4] bg-white rounded-3xl border border-slate-200 overflow-hidden relative shadow-sm group">
                        <img src={img || RESTAURANT_IMAGE_FALLBACK} className="w-full h-full object-cover" onError={handleImageError} />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            onClick={() => {
                              const next = [...editForm.menuCategories];
                              next[catIdx].images = next[catIdx].images.filter((_:any, i:any) => i !== imgIdx);
                              setEditForm({...editForm, menuCategories: next});
                            }}
                            className="bg-red-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <input 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold outline-none focus:border-orange-400"
                        value={img}
                        onChange={e => {
                          const next = [...editForm.menuCategories];
                          next[catIdx].images[imgIdx] = e.target.value;
                          setEditForm({...editForm, menuCategories: next});
                        }}
                        placeholder="Image URL"
                      />
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const next = [...editForm.menuCategories];
                      next[catIdx].images = [...(next[catIdx].images || []), ''];
                      setEditForm({...editForm, menuCategories: next});
                    }}
                    className="aspect-[3/4] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-orange-400 hover:text-orange-400 transition-all bg-white/50"
                  >
                    <Plus size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Add Page</span>
                  </button>
                </div>
              </motion.div>
            ))}
            {(!editForm.menuCategories || editForm.menuCategories.length === 0) && (
              <div className="py-24 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                 <Menu size={64} className="mx-auto text-slate-200 mb-6" />
                 <p className="text-slate-400 font-bold">Start adding menu items.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderManagementTabs = () => {
    switch(activeMgmtTab) {
      case 'general':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4 border-l-4 border-orange-500 pl-6 mb-8">
               <div>
                  <h4 className="text-2xl font-display font-black text-slate-900">Branding & Identity</h4>
                  <p className="text-slate-400 font-bold text-xs">Configure how {restaurant?.name || 'your restaurant'} appears to diners.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Official Name</label>
                <input 
                  type="text"
                  className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5 transition-all text-lg shadow-sm"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Cuisine Specialty</label>
                <input 
                  type="text"
                  className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5 transition-all text-lg shadow-sm"
                  value={editForm.cuisine}
                  onChange={e => setEditForm({...editForm, cuisine: e.target.value})}
                  placeholder="e.g. Contemporary Indian"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Street Address</label>
                <input 
                  type="text"
                  className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5 transition-all text-lg shadow-sm"
                  value={editForm.location}
                  onChange={e => setEditForm({...editForm, location: e.target.value})}
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Avg Price for Two (₹)</label>
                <input 
                  type="number"
                  className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5 transition-all text-lg shadow-sm"
                  value={editForm.avgPrice || ''}
                  onChange={e => setEditForm({...editForm, avgPrice: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Our Culinary Philosophy</label>
              <textarea 
                rows={6}
                className="w-full px-8 py-6 bg-white border-2 border-slate-100 rounded-[32px] font-bold outline-none focus:border-orange-500 focus:ring-8 focus:ring-orange-500/5 transition-all resize-none text-base shadow-sm"
                value={editForm.description}
                onChange={e => setEditForm({...editForm, description: e.target.value})}
                placeholder="Describe your atmosphere, signature dishes, and story..."
              />
            </div>
          </motion.div>
        );
      case 'operational':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4 border-l-4 border-emerald-500 pl-6 mb-8">
               <div>
                  <h4 className="text-2xl font-display font-black text-slate-900">Operations & Logistics</h4>
                  <p className="text-slate-400 font-bold text-xs">Manage your availability and guest services.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Direct Contact Line</label>
                  <input 
                    type="text"
                    className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 transition-all text-lg shadow-sm"
                    value={editForm.contactNumber || ''}
                    onChange={e => setEditForm({...editForm, contactNumber: e.target.value})}
                    placeholder="+91 98765 43210"
                  />
               </div>
               <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Live Status Control</label>
                  <button
                    type="button"
                    onClick={() => setEditForm({...editForm, isOpen: !editForm.isOpen})}
                    className={cn(
                      "w-full py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] transition-all border-2 flex items-center justify-center gap-3 shadow-md",
                      editForm.isOpen 
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20" 
                        : "bg-white border-red-100 text-red-500"
                    )}
                  >
                    <div className={cn("w-3 h-3 rounded-full", editForm.isOpen ? "bg-white animate-pulse" : "bg-red-500")} />
                    {editForm.isOpen ? 'Restaurant Is Open' : 'Restaurant Is Closed'}
                  </button>
               </div>
            </div>

            <div className="space-y-8">
               <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                 <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Guest Amenities & Facilities</span>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'WiFi', icon: Wifi },
                    { id: 'Parking', icon: Car },
                    { id: 'AC', icon: Snowflake },
                    { id: 'Outdoor', icon: Sun },
                    { id: 'Live Music', icon: Music },
                    { id: 'Bar', icon: Wine },
                    { id: 'Family', icon: Baby },
                    { id: 'Digital Menu', icon: Menu }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        const current = editForm.facilities || [];
                        const next = current.includes(f.id) ? current.filter((i:any) => i !== f.id) : [...current, f.id];
                        setEditForm({...editForm, facilities: next});
                      }}
                      className={cn(
                        "p-6 rounded-[24px] transition-all flex flex-col items-center justify-center gap-3 border-2",
                        (editForm.facilities || []).includes(f.id)
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/10 scale-[1.02]"
                          : "bg-white border-slate-50 text-slate-400 hover:border-emerald-200"
                      )}
                    >
                      {f.icon ? <f.icon size={24} /> : <Info size={24} />}
                      <span className="text-[10px] font-black uppercase tracking-widest">{f.id}</span>
                    </button>
                  ))}
               </div>
            </div>
          </motion.div>
        );
      case 'visuals':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4 border-l-4 border-blue-500 pl-6 mb-8">
               <div>
                  <h4 className="text-2xl font-display font-black text-slate-900">Global Gallery</h4>
                  <p className="text-slate-400 font-bold text-xs">High-quality visuals for your profile page.</p>
               </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Primary Face (Cover URL)</label>
              <div className="relative group">
                <input 
                  type="url"
                  className="w-full pl-16 pr-8 py-6 bg-white border-2 border-slate-100 rounded-[32px] font-bold outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 transition-all text-base shadow-sm"
                  value={editForm.image}
                  onChange={e => setEditForm({...editForm, image: e.target.value})}
                  placeholder="https://images.unsplash.com/..."
                />
                <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400" size={24} />
              </div>
              {editForm.image && (
                <div className="w-full h-96 rounded-[48px] overflow-hidden border-8 border-white shadow-vibrant mt-6">
                  <img src={editForm.image} className="w-full h-full object-cover" alt="Preview" onError={handleImageError} />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Atmosphere & Food Gallery (One URL per line)</label>
              <textarea 
                rows={10}
                className="w-full px-8 py-8 bg-white border-2 border-slate-100 rounded-[40px] font-mono text-xs font-bold outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-500/5 transition-all shadow-inner"
                placeholder="https://images.unsplash.com/photo-1..."
                value={(editForm.secondaryImages || []).join('\n')}
                onChange={e => setEditForm({...editForm, secondaryImages: e.target.value.split('\n')})}
              />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-4 leading-relaxed">
                Add multiple high-resolution images to showcase your space and signature dishes.
              </p>
            </div>
          </motion.div>
        );
      case 'reservations':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4 border-l-4 border-brand pl-6 mb-8">
               <div>
                  <h4 className="text-2xl font-display font-black text-slate-900">Reservation Control Hub</h4>
                  <p className="text-slate-400 font-bold text-xs">Configure how bookings are accepted and confirmed.</p>
               </div>
            </div>

            <div className="flex items-center justify-between p-10 bg-brand/5 rounded-[40px] border border-brand/10">
               <div className="flex items-center gap-6">
                  <div className={cn("w-14 h-14 rounded-[20px] flex items-center justify-center transition-all", editForm.isBookingEnabled ? "bg-brand text-white shadow-lg" : "bg-white text-slate-300")}>
                    <Calendar size={28} />
                  </div>
                  <div>
                    <h4 className="text-xl font-display font-black text-slate-900 leading-tight">Live Booking Engine</h4>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Status: {editForm.isBookingEnabled ? 'ON & Live' : 'OFF & Hidden'}</p>
                  </div>
               </div>
               <button
                 type="button"
                 onClick={() => setEditForm({...editForm, isBookingEnabled: !editForm.isBookingEnabled})}
                 className={cn(
                   "px-10 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95",
                   editForm.isBookingEnabled ? "bg-brand text-white shadow-brand/30" : "bg-white border-2 border-slate-100 text-slate-400 hover:border-brand hover:text-brand"
                 )}
               >
                 {editForm.isBookingEnabled ? 'Engine Active' : 'Activate Engine'}
               </button>
            </div>

            <div className={cn("space-y-8 transition-all duration-700", !editForm.isBookingEnabled && "opacity-30 pointer-events-none grayscale scale-[0.98] blur-[2px]")}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Instant Confirmation Cap (pax)</label>
                    <input 
                      type="number"
                      className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[28px] font-bold outline-none focus:border-brand transition-all text-lg shadow-sm"
                      value={editForm.instantBookingLimit || 1}
                      onChange={e => setEditForm({...editForm, instantBookingLimit: parseInt(e.target.value) || 0})}
                    />
                    <p className="text-[10px] text-slate-400 font-bold px-2 italic">Bookings up to this size are auto-confirmed.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Blackout Dates (Closed for bookings)</label>
                    <div className="flex gap-3">
                       <input 
                         type="date"
                         id="owner-blackout-input"
                         className="flex-grow px-6 py-4 bg-white border-2 border-slate-100 rounded-[24px] font-bold outline-none focus:border-brand"
                       />
                       <button
                         type="button"
                         onClick={() => {
                           const el = document.getElementById('owner-blackout-input') as HTMLInputElement;
                           if (el?.value) {
                             if (!editForm.blackoutDates?.includes(el.value)) {
                               setEditForm({...editForm, blackoutDates: [...(editForm.blackoutDates || []), el.value]});
                             }
                             el.value = '';
                           }
                         }}
                         className="bg-vibrant-dark text-white px-8 rounded-[24px] font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                       >
                         Block
                       </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 min-h-[44px]">
                       {(editForm.blackoutDates || []).map((date: string) => (
                         <div key={date} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 text-[10px] font-black flex items-center gap-2 group shadow-sm transition-all hover:pr-2">
                           {date}
                           <button type="button" onClick={() => setEditForm({...editForm, blackoutDates: editForm.blackoutDates.filter((d:any) => d !== date)})} className="opacity-40 hover:opacity-100"><X size={14} /></button>
                         </div>
                       ))}
                       {(editForm.blackoutDates || []).length === 0 && <p className="text-[10px] text-slate-300 font-bold flex items-center px-2">No dates blocked.</p>}
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Operational Time Slots</label>
                    <span className="text-[10px] font-black text-brand uppercase tracking-widest">{editForm.bookingSlots?.length || 0} Slots Active</span>
                  </div>
                  <div className="bg-slate-50/50 p-10 rounded-[40px] border-2 border-slate-100/50 flex flex-wrap gap-4 shadow-inner">
                     {(editForm.bookingSlots || []).map((slot: string, idx: number) => (
                       <div key={idx} className="bg-white border-2 border-slate-100 px-6 py-4 rounded-[20px] text-base font-black flex items-center gap-4 shadow-sm hover:border-brand hover:text-brand transition-all group">
                         {slot}
                         <button type="button" onClick={() => setEditForm({...editForm, bookingSlots: editForm.bookingSlots.filter((_:any, i:any) => i !== idx)})} className="text-slate-300 hover:text-red-500 transition-colors"><X size={18} /></button>
                       </div>
                     ))}
                     <input 
                       className="w-40 bg-white border-2 border-slate-100 hover:border-brand transition-all rounded-[20px] px-6 py-4 text-base font-black outline-none focus:border-brand shadow-sm text-center"
                       placeholder="HH:MM"
                       onKeyDown={e => {
                         if (e.key === 'Enter') {
                           const val = (e.currentTarget as HTMLInputElement).value.trim();
                           if (val && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val)) {
                             setEditForm({...editForm, bookingSlots: [...(editForm.bookingSlots || []), val].sort()});
                             (e.currentTarget as HTMLInputElement).value = '';
                           }
                         }
                       }}
                     />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold px-4">Press ENTER after typing a time (e.g. 19:30) to add a new slot.</p>
               </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-32">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Controls */}
        <div className="lg:w-80 shrink-0">
          <div className="sticky top-32 space-y-8">
            <div className="bg-white rounded-[3rem] p-8 shadow-vibrant border border-slate-100 overflow-hidden relative">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                    <LayoutDashboard size={32} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-display font-black text-slate-900 leading-tight truncate" title={restaurant?.name}>{restaurant?.name || 'Owner Dashboard'}</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 truncate" title={restaurant?.location}>{restaurant?.location || 'Management Hub'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                    { id: 'bookings', label: 'Bookings List', icon: Calendar },
                    { id: 'management', label: 'Restaurant Setup', icon: Settings },
                    { id: 'menu', label: 'Visual Menu', icon: Menu }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 font-bold text-sm",
                        activeTab === tab.id 
                          ? "bg-brand text-white shadow-lg shadow-brand/20 scale-[1.02]" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-brand"
                      )}
                    >
                      <tab.icon size={20} />
                      {tab.label}
                    </button>
                  ))}
                </div>
                
                {/* Quick Toggles */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Table Bookings</span>
                  <button
                    onClick={async () => {
                        const newVal = !editForm.isBookingEnabled;
                        setEditForm({...editForm, isBookingEnabled: newVal});
                        
                        if (restaurant?.id) {
                          try {
                            await updateDoc(doc(db, 'restaurants', restaurant.id), {
                              isBookingEnabled: newVal,
                              updatedAt: serverTimestamp()
                            });
                          } catch (e) {
                            console.error(e);
                          }
                        }
                    }}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative shrink-0",
                      editForm.isBookingEnabled ? "bg-emerald-500" : "bg-slate-200"
                    )}
                  >
                     <div className={cn(
                       "absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all shadow-sm",
                       editForm.isBookingEnabled ? "left-7" : "left-1"
                     )} />
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full blur-3xl -translate-x-4 translate-y-4" />
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 group",
                saveStatus === 'success' ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                saveStatus === 'error' ? "bg-red-500 text-white shadow-red-500/20" :
                "bg-vibrant-dark text-white hover:bg-black shadow-slate-900/20"
              )}
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 
               saveStatus === 'success' ? <CheckCircle2 size={24} /> :
               saveStatus === 'error' ? <AlertCircle size={24} /> :
               <Save size={24} className="group-hover:rotate-12 transition-transform" />}
              {saving ? 'Synchronizing...' : 
               saveStatus === 'success' ? 'Changes Saved!' :
               saveStatus === 'error' ? 'Failed to Save' :
               'Push Changes Live'}
            </motion.button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'bookings' && renderBookingsTab()}
            {activeTab === 'menu' && renderMenuTab()}
            {activeTab === 'management' && (
              <motion.div
                key="management"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Management Tabs Switcher */}
                <div className="flex flex-wrap gap-4 mb-8">
                  {[
                    { id: 'general', label: 'General', icon: Info },
                    { id: 'operational', label: 'Operations', icon: Settings },
                    { id: 'visuals', label: 'Visuals', icon: ImageIcon },
                    { id: 'reservations', label: 'Bookings', icon: Calendar }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveMgmtTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-3 px-8 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest transition-all",
                        activeMgmtTab === tab.id 
                          ? "bg-vibrant-dark text-white shadow-xl shadow-slate-900/20" 
                          : "bg-white text-slate-400 hover:text-brand hover:bg-slate-50"
                      )}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>
                
                <div className="bg-white rounded-[3.5rem] shadow-vibrant border border-slate-50 p-12 overflow-hidden relative">
                   <div className="h-40 bg-orange-50/20 absolute top-0 inset-x-0 -z-0" />
                   <div className="relative z-10">
                      {renderManagementTabs()}
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
