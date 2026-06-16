import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { QRCodeCanvas } from 'qrcode.react';
import { db, storage } from '../lib/firebase';
import AppIcon from './AppIcon';
import { Restaurant, LiveMenuItem, Offer } from '../types';
import { Loader2, LogOut, Store, MapPin, Image as ImageIcon, ChevronRight, ChevronDown, Info, Clock, Utensils, Tag, Save, Eye, Plus, X, Star, Calendar, Users, Trash2, ShoppingBag, CheckCircle, AlertCircle, UploadCloud, Megaphone, Upload, Video } from 'lucide-react';
import StoryManager from './StoryManager';
import { cn, convertTo12Hour, convertTo24Hour, generateSeoFriendlyFileName } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { useMasterData } from './MasterDataContext';

const TABS = [
  { id: 'bookings', label: 'Table Bookings', icon: Calendar },
{ id: 'orders', label: 'Live Orders', icon: ShoppingBag },
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'general', label: 'General Info', icon: Info },
  { id: 'status', label: 'Operational Hours', icon: Clock },
  { id: 'media', label: 'Media & Images', icon: ImageIcon },
  { id: 'menu', label: 'Live Menu', icon: Utensils },
  { id: 'specialties', label: 'Signature Dishes', icon: Star },
  { id: 'stories', label: 'Stories', icon: Store },
  { id: 'offers', label: 'Offers & Promos', icon: Tag },
  { id: 'ads', label: 'Ads', icon: Megaphone },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getBookingDate = (b: any) => {
  if (b.date) return new Date(b.date);
  if (b.dateTime?.seconds) return new Date(b.dateTime.seconds * 1000);
  if (b.dateTime) return new Date(b.dateTime);
  return new Date(0); // fallback
};

const BookingCard = ({ b, updateBookingStatus }: { b: any; updateBookingStatus?: (id: string, st: string) => void }) => {
  const bd = getBookingDate(b);
  const dateStr = (!isNaN(bd.getTime()) && bd.getTime() > 0) ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(bd).replace(/ /g, '-') : '';
  const [userPhoto, setUserPhoto] = useState<string | null>(b.userPhoto || null);

  useEffect(() => {
    if (!userPhoto && b.userId) {
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', b.userId));
          if (userDoc.exists()) {
            setUserPhoto(userDoc.data().photoURL || null);
          }
        } catch (err) {
          console.error("Failed to fetch user photo:", err);
        }
      };
      fetchUser();
    }
  }, [b.userId, userPhoto]);

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 mb-4 group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex flex-wrap items-center gap-x-8 gap-y-3 w-full justify-between">
            <div className="flex flex-col">
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Guest</div>
               <div className="font-normal text-[#363636] leading-[1.2] text-sm flex items-center gap-2">
                 {userPhoto ? (
                   <img src={userPhoto} alt={b.userName || 'Guest'} className="w-6 h-6 rounded-full object-cover" />
                 ) : (
                   <Users size={14} className="text-blue-600" />
                 )}
                 <div className="flex flex-col">
                   <span>{b.userName || 'Guest'}</span>
                   {b.userPhone && <span className="text-[10px] text-slate-500 font-semibold">{b.userPhone}</span>}
                 </div>
               </div>
            </div>
            <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Schedule</div>
               <div className="font-normal text-[#363636] leading-[1.2] text-sm flex items-center gap-2">
                 <Calendar size={14} className="text-blue-600" /> {dateStr} at {b.time}
               </div>
            </div>
            <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Size</div>
               <div className="font-normal text-[#363636] leading-[1.2] text-sm flex items-center gap-2">
                 <Users size={14} className="text-blue-600" /> {b.guests} Guests
               </div>
            </div>
            <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Source</div>
               <div className="font-normal text-[#363636] leading-[1.2] text-sm">
                 {b.source || 'Self'}
               </div>
            </div>
            {b.offer && (
            <div>
               <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Offer</div>
               <div className="font-bold text-blue-600 text-sm max-w-[150px] truncate" title={b.offer.title}>
                 🎁 {b.offer.title}
               </div>
            </div>
            )}
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
                 {(() => {
                   let canCancel = b.status !== 'cancelled';
                   if (canCancel && b.status === 'confirmed') {
                     try {
                       const timeParts = b.time?.split(':') || ['0', '0'];
                       const bookingDateTime = new Date(bd);
                       bookingDateTime.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0, 0);
                       const thirtyMinsAfter = new Date(bookingDateTime.getTime() + 30 * 60000);
                       canCancel = new Date() <= thirtyMinsAfter;
                     } catch(e) { canCancel = false; }
                   }
                   
                   return (
                     <div className="flex gap-2 items-center">
                       {b.status !== 'confirmed' && b.status !== 'cancelled' && (
                         <button
                           onClick={() => updateBookingStatus?.(b.id, 'confirmed')}
                           className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded-lg px-3 py-1.5 font-bold outline-none cursor-pointer transition-colors"
                         >
                           Confirm
                         </button>
                       )}
                       {canCancel && (
                         <button
                           onClick={() => {
                             if (window.confirm('Are you sure you want to cancel this booking?')) {
                               updateBookingStatus?.(b.id, 'cancelled');
                             }
                           }}
                           className="text-[10px] bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg px-3 py-1.5 font-bold outline-none cursor-pointer transition-colors"
                         >
                           Cancel
                         </button>
                       )}
                     </div>
                   );
                 })()}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

// Helper renderers for form
const InputText = ({ label, value, onChange, placeholder = '', disabled = false }: any) => (
  <div>
    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
    <input type="text" disabled={disabled} value={value || ''} onChange={e => !disabled && onChange(e.target.value)} placeholder={placeholder} className={cn("w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all shadow-sm", disabled && "opacity-50 cursor-not-allowed")} />
  </div>
);

const ImageUploadInput = ({ label, value, onChange, placeholder = '' }: any) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const seoFileName = generateSeoFriendlyFileName(file.name, 'banner', label || 'upload');
      const storageRef = ref(storage, `restaurant_images/${seoFileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {},
        (error) => {
          console.error("Upload failed", error);
          alert("Image upload failed");
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onChange(downloadURL);
          setUploading(false);
        }
      );
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  return (
    <div>
      {label && <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>}
      <div className="flex items-center gap-2">
        <input 
          type="text" 
          value={value || ''} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder || "Image URL"} 
          className="flex-1 w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all shadow-sm"
        />
        <div className="relative shrink-0">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={uploading}
          />
          <button type="button" disabled={uploading} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 h-[46px] px-4 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shadow-sm font-semibold text-sm gap-2 whitespace-nowrap">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Upload'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TextArea = ({ label, value, onChange, placeholder = '' }: any) => (
  <div>
    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all resize-none shadow-sm" />
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

export default function PartnerDashboardView() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { cuisines, cities } = useMasterData();
  const sortedCuisines = React.useMemo(() => [...cuisines].sort((a, b) => a.name.localeCompare(b.name)), [cuisines]);
  const navigate = useNavigate();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRes, setSelectedRes] = useState<Restaurant | null>(null);
  const [isResDropdownOpen, setIsResDropdownOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState('bookings');
  const [formData, setFormData] = useState<Partial<Restaurant>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [takeawayOrders, setTakeawayOrders] = useState<any[]>([]);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [newBookingForm, setNewBookingForm] = useState({
    name: '',
    phone: '',
    email: '',
    guests: 2,
    date: new Date().toISOString().split('T')[0],
    time: '19:00'
  });
  const [bookingSubmitLoading, setBookingSubmitLoading] = useState(false);

  const [qrTableTarget, setQrTableTarget] = useState("");
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    const qOrders = query(
      collection(db, 'orders'),
      where('restaurantId', '==', selectedRes.id)
    );
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setTakeawayOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); // Re-using state for unified orders
    });
    return () => {
      unsubscribe();
      unsubOrders();
    };
  }, [selectedRes]);

  const handleLogout = async () => {
    await signOut();
    navigate('/partners/login');
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRes?.id) return;
    setBookingSubmitLoading(true);
    
    try {
      await addDoc(collection(db, "bookings"), {
        restaurantId: selectedRes.id,
        restaurantOwnerId: selectedRes.ownerId || null,
        restaurantName: selectedRes.name,
        userId: null, 
        userPhoto: null,
        userPhone: newBookingForm.phone,
        userName: newBookingForm.name,
        userEmail: newBookingForm.email,
        date: newBookingForm.date,
        time: newBookingForm.time,
        guests: newBookingForm.guests,
        status: "confirmed",
        source: "Restaurant",
        createdAt: serverTimestamp(),
      });
      setShowNewBookingModal(false);
      setNewBookingForm({
        name: '', phone: '', email: '', guests: 2, date: new Date().toISOString().split('T')[0], time: '19:00'
      });
    } catch (err) {
      console.error(err);
      showToast("Failed to create booking.", "error");
    } finally {
      setBookingSubmitLoading(false);
    }
  };

  const updateForm = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedRes) return;
    setSaving(true);

    let hasInvalidTimings = false;
    if (formData.dailyTimings) {
      const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      DAYS.forEach(day => {
        const timing = (formData.dailyTimings as any)[day];
        if (timing && !timing.closed && timing.ranges) {
           timing.ranges.forEach((r: any) => {
             if (!r.open || !r.close) {
               hasInvalidTimings = true;
             }
           });
        }
      });
    }
    if (hasInvalidTimings) {
       showToast("Please ensure all open days have valid opening and closing times set.", "error");
       setSaving(false);
       return;
    }

    try {
      const docRef = doc(db, 'restaurants', selectedRes.id);
      await updateDoc(docRef, formData);
      
      // Update local state
      const updatedRes = { ...selectedRes, ...formData } as Restaurant;
      setSelectedRes(updatedRes);
      setRestaurants(prev => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
      setHasChanges(false);
      showToast('Changes saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save changes. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGeocodeAddress = async () => {
    const { name, area, city, state, pincode } = formData;
    if (!area || !city) {
      showToast('Area and City are required to locate on map.', 'error');
      return;
    }
    
    setIsGeocoding(true);
    try {
      const queryStr = [name, area, city, state, pincode].filter(Boolean).join(', ');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1&countrycodes=in&email=rec.abhishek@gmail.com`,
        { headers: { 'Accept-Language': 'en-US,en;q=0.5' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        updateForm('lat', data[0].lat);
        updateForm('lng', data[0].lon);
      } else {
        showToast('Could not find coordinates for this address.', 'error');
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
      showToast('Failed to fetch coordinates. Please try manually later.', 'error');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleDeleteImage = async (field: 'secondaryImages' | 'menuImages', imgIdx: number, imgUrl: string, label: string) => {
    if (!window.confirm(`Do you want to delete this image from ${label}?`)) {
      return;
    }

    const arr = [...(formData[field] || [])];
    arr.splice(imgIdx, 1);
    updateForm(field, arr);

    if (selectedRes?.id) {
       try {
         const docRef = doc(db, 'restaurants', selectedRes.id);
         await updateDoc(docRef, { [field]: arr });
         
         if (imgUrl && imgUrl.includes('firebasestorage.googleapis.com')) {
           const storageRef = ref(storage, imgUrl);
           await deleteObject(storageRef);
         }
       } catch (error) {
           console.error("Failed to delete image:", error);
       }
    }
  };

  const renderImageInputList = (label: string, field: 'secondaryImages' | 'menuImages') => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">{label}</h3>
        <button onClick={() => {
          const arr = [...(formData[field] || []), { url: '', category: '' }];
          updateForm(field, arr as any);
        }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
          <Plus size={14} /> Add Image
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(!formData[field] || formData[field].length === 0) ? (
           <div className="col-span-full p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm">
             No images added.
           </div>
        ) : formData[field].map((item: any, idx: number) => {
          const urlStr = typeof item === 'string' ? item : item.url;
          const categoryStr = typeof item === 'string' ? '' : (item.category || '');

          return (
          <div key={idx} className="bg-white border border-slate-300 rounded-xl overflow-hidden relative group transition-all shrink-0 flex flex-col">
             <button onClick={() => handleDeleteImage(field, idx, urlStr, label)} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm text-red-500 rounded-lg hover:bg-red-50 transition-colors z-10 shadow-sm opacity-0 group-hover:opacity-100">
                <X size={14} />
             </button>
             <div className="h-32 bg-slate-100 flex items-center justify-center relative shrink-0">
               {urlStr ? (
                 <img src={urlStr} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
               ) : (
                 <ImageIcon className="text-slate-300" size={24} />
               )}
             </div>
             <div className="p-3 bg-slate-50 border-t border-slate-300 space-y-2 flex-grow">
                <input
                  type="text"
                  placeholder="Category (e.g. All)"
                  value={categoryStr}
                  onChange={(e) => {
                    const arr = [...formData[field]!];
                    arr[idx] = { url: urlStr, category: e.target.value };
                    updateForm(field, arr as any);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-medium"
                />
                <ImageUploadInput value={urlStr} onChange={(newUrl: string) => {
                   const arr = [...formData[field]!];
                   arr[idx] = typeof item === 'string' && !categoryStr 
                     ? newUrl 
                     : { url: newUrl, category: categoryStr };
                   updateForm(field, arr as any);
                }} placeholder="Image URL" />
             </div>
          </div>
        )})}
      </div>
    </div>
  );

  const handleDeleteCategoryImage = async (catIdx: number, imgIdx: number, imgUrl: string, catName: string) => {
    if (!window.confirm(`Do you want to delete this image from ${catName || 'this category'}?`)) {
      return;
    }

    const arr = [...(formData.menuCategories || [])];
    const imgs = [...arr[catIdx].images];
    imgs.splice(imgIdx, 1);
    arr[catIdx] = { ...arr[catIdx], images: imgs };
    updateForm('menuCategories', arr);

    if (selectedRes?.id) {
       try {
         const docRef = doc(db, 'restaurants', selectedRes.id);
         await updateDoc(docRef, { menuCategories: arr });
         
         if (imgUrl && imgUrl.includes('firebasestorage.googleapis.com')) {
           const storageRef = ref(storage, imgUrl);
           await deleteObject(storageRef);
         }
       } catch (error) {
           console.error("Failed to delete image:", error);
       }
    }
  };

  const renderMenuCategories = () => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Menu Categories</h3>
        <button onClick={() => {
          const arr = [...(formData.menuCategories || [])];
          arr.push({ id: Math.random().toString(36).substr(2, 9), name: '', images: [] });
          updateForm('menuCategories', arr);
        }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
          <Plus size={14} /> Add Category
        </button>
      </div>

      <div className="space-y-6">
        {(!formData.menuCategories || formData.menuCategories.length === 0) ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm">
            No menu categories added.
          </div>
        ) : formData.menuCategories.map((cat, catIdx) => (
          <div key={cat.id || catIdx} className="bg-white border text-sm font-medium border-slate-300 rounded-2xl p-5 relative group transition-all">
             <button onClick={() => {
                const arr = [...formData.menuCategories!];
                arr.splice(catIdx, 1);
                updateForm('menuCategories', arr);
             }} className="absolute top-4 right-4 p-2 bg-slate-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors z-10 shadow-sm opacity-0 group-hover:opacity-100">
                <X size={16} />
             </button>
             
             <div className="mb-4 pr-12">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunday brunch"
                  value={cat.name}
                  onChange={(e) => {
                    const arr = [...formData.menuCategories!];
                    arr[catIdx] = { ...cat, name: e.target.value };
                    updateForm('menuCategories', arr);
                  }}
                  className="w-full lg:w-1/2 px-4 py-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-medium"
                />
             </div>

             <div className="flex items-center justify-between mb-3">
               <h4 className="text-xs text-slate-500 uppercase tracking-wider font-normal leading-[1.2]">Category Images</h4>
               <button onClick={() => {
                  const arr = [...formData.menuCategories!];
                  const imgs = [...(cat.images || [])];
                  imgs.push('');
                  arr[catIdx] = { ...cat, images: imgs };
                  updateForm('menuCategories', arr);
               }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
                  <Plus size={14} /> Add Image
               </button>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(!cat.images || cat.images.length === 0) ? (
                   <div className="col-span-full p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-xs">
                     No images in this category.
                   </div>
                ) : cat.images.map((imgUrl, imgIdx) => (
                  <div key={imgIdx} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative group/img transition-all shrink-0 flex flex-col">
                     <button onClick={() => handleDeleteCategoryImage(catIdx, imgIdx, imgUrl, cat.name)} className="absolute top-1.5 right-1.5 p-1 bg-white/80 backdrop-blur-sm text-red-500 rounded-md hover:bg-red-50 transition-colors z-10 shadow-sm opacity-0 group-hover/img:opacity-100">
                        <X size={12} />
                     </button>
                     <div className="h-24 bg-slate-100 flex items-center justify-center relative shrink-0">
                       {imgUrl ? (
                         <img src={imgUrl} alt={`Preview ${imgIdx}`} className="w-full h-full object-cover" />
                       ) : (
                         <ImageIcon className="text-slate-300" size={20} />
                       )}
                     </div>
                     <div className="p-2 border-t border-slate-200 space-y-2 flex-grow">
                        <ImageUploadInput value={imgUrl} onChange={(newUrl: string) => {
                           const arr = [...formData.menuCategories!];
                           const imgs = [...cat.images!];
                           imgs[imgIdx] = newUrl;
                           arr[catIdx] = { ...cat, images: imgs };
                           updateForm('menuCategories', arr);
                        }} placeholder="Image URL" />
                     </div>
                  </div>
                ))}
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

    const getBookingDate = (b: any) => {
      if (b.date) return new Date(b.date);
      if (b.dateTime?.seconds) return new Date(b.dateTime.seconds * 1000);
      if (b.dateTime) return new Date(b.dateTime);
      return new Date(0); // fallback
    };

    const sortedBookings = [...bookings].sort((a, b) => {
      const dateA = getBookingDate(a);
      const dateB = getBookingDate(b);
      return dateB.getTime() - dateA.getTime();
    });

    sortedBookings.forEach(booking => {
      const bd = getBookingDate(booking);
      if (!isNaN(bd.getTime()) && bd.getTime() > 0) {
        const bdStr = bd.toISOString().split('T')[0];
        if (bdStr === todayStr) {
          todayBookings.push(booking);
        } else if (bd > new Date(todayStr)) {
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

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex justify-between items-center bg-white p-6 rounded-[24px] border border-slate-300 shadow-sm relative overflow-hidden">
           <div>
             <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Table Reservations</h2>
             <p className="text-slate-500 text-xs font-semibold mt-1">Manage all your table bookings.</p>
           </div>
           <button onClick={() => setShowNewBookingModal(true)} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Plus size={18} />
              New Booking
           </button>
        </div>
        <div>
          <h3 className="text-sm uppercase tracking-widest mb-4 text-[#363636] font-normal leading-[1.2]">Today's Bookings</h3>
          {todayBookings.length === 0 ? <p className="text-sm text-slate-500 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-300">No bookings for today.</p> : todayBookings.map(b => <BookingCard key={b.id} b={b} updateBookingStatus={updateBookingStatus} />)}
        </div>
        
        {upcomingBookings.length > 0 && (
          <div>
            <h3 className="text-sm uppercase tracking-widest mb-4 text-[#363636] font-normal leading-[1.2]">Upcoming Bookings</h3>
            {upcomingBookings.map(b => <BookingCard key={b.id} b={b} updateBookingStatus={updateBookingStatus} />)}
          </div>
        )}

        {previousBookings.length > 0 && (
          <div>
            <h3 className="text-sm uppercase tracking-widest mb-4 text-[#363636] font-normal leading-[1.2]">Previous Bookings</h3>
            {previousBookings.map(b => <BookingCard key={b.id} b={b} updateBookingStatus={updateBookingStatus} />)}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!restaurants.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AppIcon />
        <div className="mt-8 bg-white p-8 rounded-3xl shadow-sm max-w-md w-full">
          <Store className="mx-auto text-slate-300 mb-4" size={48} />
          <h2 className="text-xl mb-2 text-[#363636] font-normal leading-[1.2]">No Restaurants Linked</h2>
          <p className="text-slate-500 mb-6">Your email {user?.email} is not linked to any active restaurants.</p>
          <button onClick={handleLogout} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-xl font-bold transition-colors">
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Navigation inside PartnerDashboardView

    const updateTakeawayOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus
      });
    } catch(e) {
      console.error("Failed to update status", e);
    }
  };

  const renderTakeawayOrdersTab = () => {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
            <div>
             <h2 className="text-2xl text-[#363636] font-normal leading-[1.2]">Live Orders</h2>
             <p className="text-slate-500 text-xs font-semibold mt-1">Manage Table and Takeaway orders.</p>
            </div>
        </div>

        {takeawayOrders.length === 0 ? (
           <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
               <ShoppingBag size={24} />
             </div>
             <h3 className="text-lg mb-1 text-[#363636] font-normal leading-[1.2]">No Orders Yet</h3>
             <p className="text-slate-500 text-sm">When customers place orders, they will appear here.</p>
           </div>
        ) : (
          <div className="grid gap-4">
             {takeawayOrders.sort((a,b) => b.createdAt - a.createdAt).map(order => (
               <div key={order.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest",
                          order.type === 'dine_in' ? "bg-blue-600/10 text-blue-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {order.type === 'dine_in' ? (order.tableNumber && order.tableNumber !== 'Unknown' ? `Table ${order.tableNumber}` : 'Dine In') : 'Takeaway'}
                        </span>
                        <span className="text-xs font-bold text-slate-400">ID: {order.orderId}</span>
                      </div>
                      <div className="text-lg text-[#363636] font-normal leading-[1.2]">{order.customerName}</div>
                      <div className="text-xs font-semibold text-slate-500">{order.customerPhone}</div>
                    </div>
                    <div className="text-right">
                       <div className="font-normal leading-[1.2] text-blue-600 text-lg">₹{order.totalPrice}</div>
                       <div className="text-xs font-bold text-slate-500">
                         {new Date(order.createdAt).toLocaleString()}
                       </div>
                    </div>
                 </div>

                 <div className="mb-4 bg-slate-50 p-4 rounded-xl">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Items</div>
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm mb-1">
                        <span className="font-semibold text-slate-700">{item.quantity}x {item.name}</span>
                        <span className="font-normal text-[#363636] leading-[1.2]">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 mt-2 pt-2 space-y-1">
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Item Total</span>
                        <span>₹{order.itemTotal || order.items?.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Taxes</span>
                        <span>₹{order.taxes !== undefined ? order.taxes : Math.round(((selectedRes?.gstPercentage || 5) / 100) * (order.items?.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 0))}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Restaurant Packaging</span>
                        <span>₹{order.packaging !== undefined ? order.packaging : 20}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold text-[#363636] mt-2 pt-1 border-t border-slate-200">
                        <span>Bill Total</span>
                        <span>₹{order.totalPrice}</span>
                      </div>
                    </div>
                 </div>

                 <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                       <select
                         value={order.status}
                         onChange={(e) => updateTakeawayOrderStatus(order.id, e.target.value)}
                         className="px-3 py-1.5 bg-slate-100 border-none rounded-lg text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
                       >
                         <option value="Received">Received</option>
                         <option value="Preparing">Preparing</option>
                         <option value="Ready">{order.type === 'dine_in' ? 'Ready to Serve' : 'Ready to Pickup'}</option>
                         <option value="Completed">Completed</option>
                         <option value="Cancelled">Cancelled</option>
                       </select>
                    </div>
                    <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                       {order.paymentMethod === 'online' ? (order.paymentStatus === 'Success' ? 'Paid Online' : 'Payment Pending') : 'Pay at Restaurant'}
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[100]"
          >
            <div className={cn(
              "px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 font-semibold",
              toastMessage.type === 'success' ? 'bg-emerald-600 text-white' :
              toastMessage.type === 'error' ? 'bg-red-600 text-white' :
              'bg-blue-600 text-white'
            )}>
              {toastMessage.type === 'success' && <CheckCircle size={20} />}
              {toastMessage.type === 'error' && <AlertCircle size={20} />}
              {toastMessage.type === 'info' && <Info size={20} />}
              <span>{toastMessage.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-[60] h-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
           <div className="flex items-center justify-between h-full">
               <div className="flex items-center gap-3">
                 <AppIcon size={36} />
                 <span className="hidden sm:block text-xl font-normal leading-[1.2] text-[#363636] tracking-tighter">
                   Bookmy<span className="text-blue-600">Table</span>
                 </span>
                 <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-widest ml-2 hidden sm:block">Partner</span>
               </div>
               
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-normal text-[#363636] leading-[1.2]">{user?.displayName}</p>
                </div>
                {user?.photoURL && (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-slate-300" />
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
          <div className="bg-white p-4 rounded-xl border border-slate-300">
             <div className="space-y-1 relative">
              {selectedRes && (
                <div className="w-full relative">
                  <button
                    onClick={() => restaurants.length > 1 && setIsResDropdownOpen(!isResDropdownOpen)}
                    className={cn(
                      "w-full flex items-center justify-between gap-1 p-4 rounded-xl text-left bg-slate-50 border border-slate-200 overflow-hidden",
                       restaurants.length > 1 && "cursor-pointer hover:bg-slate-100 transition-colors"
                    )}
                  >
                    <div className="flex flex-col truncate flex-1 min-w-0 pr-2">
                      <span className="truncate text-base font-bold text-blue-600">{selectedRes.name}</span>
                      <span className="truncate text-[11px] text-slate-500 font-medium uppercase tracking-wide mt-1">
                        {selectedRes.location}, {selectedRes.city}
                      </span>
                      <span className="truncate text-[10px] text-slate-400 font-medium font-mono tracking-wide mt-1.5 opacity-70">
                        ID: {selectedRes.id}
                      </span>
                    </div>
                    {restaurants.length > 1 && (
                       <ChevronDown size={18} className={cn("shrink-0 transition-transform text-slate-400", isResDropdownOpen && "rotate-180")} />
                    )}
                  </button>

                  <AnimatePresence>
                     {isResDropdownOpen && (
                        <motion.div
                           initial={{ opacity: 0, y: 5 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: 5 }}
                           className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 text-sm"
                        >
                           {restaurants.filter(r => r.id !== selectedRes.id).map(r => (
                              <button
                                 key={r.id}
                                 onClick={() => {
                                    setSelectedRes(r);
                                    setIsResDropdownOpen(false);
                                    setHasChanges(false);
                                    setFormData(r);
                                 }}
                                 className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                              >
                                 <div className="font-bold text-[#363636] truncate">{r.name}</div>
                                 <div className="text-[10px] text-slate-500 uppercase tracking-wide truncate mt-0.5">{r.location}, {r.city}</div>
                              </button>
                           ))}
                        </motion.div>
                     )}
                  </AnimatePresence>
                </div>
              )}
             </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-300">
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
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
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
        <div className="flex-1 bg-white border border-slate-300 rounded-xl p-6 md:p-8 shadow-sm">
          {selectedRes && (
            <div className="space-y-8">
               {/* TAB CONTENT */}
               {activeTab === 'bookings' && renderBookingsTab()}
               {activeTab === 'orders' && renderTakeawayOrdersTab()}
               
               {activeTab === 'overview' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-300">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Rating</p>
                        <p className="text-2xl font-normal text-[#363636] leading-[1.2]">{formData.rating || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-300">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Reviews</p>
                        <p className="text-2xl font-normal text-[#363636] leading-[1.2]">{(formData as any).reviewsCount || 0}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-300">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Avg Price</p>
                        <p className="text-2xl font-normal text-[#363636] leading-[1.2]">₹{formData.avgPrice || 0}</p>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-300">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Menu Items</p>
                        <p className="text-2xl font-normal text-[#363636] leading-[1.2]">
                          {formData.liveMenu?.length || 0}
                        </p>
                      </div>
                    </div>
                 </div>
               )}

               {activeTab === 'general' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   {/* Basic Details */}
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300">
                     <h3 className="text-sm uppercase tracking-widest mb-4 text-[#363636] font-normal leading-[1.2]">Basic Details</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <InputText label="Restaurant Name *" value={formData.name} onChange={(v:any) => updateForm('name', v)} disabled={true} />
                       <InputText label="Contact Number *" value={formData.contactNumber} onChange={(v:any) => updateForm('contactNumber', v)} />
                       <InputText label="Contact Email (Receive order notification)" value={(formData as any).email} onChange={(v:any) => updateForm('email', v)} />
                       <InputText label="Login Emails (Comma Separated)" value={Array.isArray(formData.partnerEmails) ? formData.partnerEmails.join(', ') : ''} onChange={(v:any) => updateForm('partnerEmails', v.split(',').map((s:any)=>s.trim()).filter(Boolean))} />
                       <InputText label="Average Price for two (₹)" value={formData.avgPrice?.toString()} onChange={(v:any) => updateForm('avgPrice', parseInt(v) || 0)} />
                     </div>
                     <TextArea label={`About ${formData.name || 'Restaurant'} (Brand Description / Story)`} value={formData.description} onChange={(v:any) => updateForm('description', v)} />
                   </div>

                   {/* Address Details */}
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300">
                     <h3 className="text-sm uppercase tracking-widest mb-4 text-[#363636] font-normal leading-[1.2]">Address Details</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <InputText label="Floor / Tower" value={formData.floor} onChange={(v:any) => updateForm('floor', v)} />
                       <InputText label="Shop / Building No." value={formData.shopNo} onChange={(v:any) => updateForm('shopNo', v)} />
                       <InputText label="Area / Locality *" value={formData.area} onChange={(v:any) => updateForm('area', v)} />
                       <InputText label="Landmark (Optional)" value={formData.landmark} onChange={(v:any) => updateForm('landmark', v)} />
                       <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">City *</label><select value={formData.city || ''} onChange={(e) => updateForm('city', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all shadow-sm"><option value="" disabled>Select City</option>{cities.map((city: any, i: number) => (<option key={city.id || i} value={city.name}>{city.name}</option>))}</select></div>
                       <InputText label="State *" value={formData.state} onChange={(v:any) => updateForm('state', v)} />
                       <InputText label="Pincode *" value={formData.pincode} onChange={(v:any) => updateForm('pincode', v)} />
                     </div>
                     
                     <div className="pt-6 border-t border-slate-300">
                       <div className="flex items-center justify-between mb-4">
                         <h4 className="text-xs uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Coordinates</h4>
                         <button
                           type="button"
                           onClick={handleGeocodeAddress}
                           disabled={isGeocoding}
                           className="flex items-center gap-2 text-[10px] bg-blue-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest hover:bg-blue-600/90 transition-colors disabled:opacity-50"
                         >
                           {isGeocoding ? <Loader2 className="animate-spin" size={14} /> : <MapPin size={14} />}
                           Fetch Lat/Lng
                         </button>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <InputText label="Latitude" value={formData.lat} onChange={(v:any) => updateForm('lat', v)} />
                         <InputText label="Longitude" value={formData.lng} onChange={(v:any) => updateForm('lng', v)} />
                       </div>
                     </div>
                   </div>

                   {/* Cuisines & Facilities */}
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300">
                     <h3 className="text-sm uppercase tracking-widest mb-4 text-[#363636] font-normal leading-[1.2]">Cuisines & Facilities</h3>
                     
                     <div className="mb-6">
                       <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Select Cuisines</label>
                       <div className="flex flex-wrap gap-2 mb-4">
                         {sortedCuisines.map(c => {
                           const cuisineArray = Array.isArray(formData.cuisine) ? formData.cuisine : typeof formData.cuisine === 'string' ? (formData.cuisine as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                           const isSelected = cuisineArray.includes(c.name);
                           return (
                             <button
                               key={c.name}
                               type="button"
                               onClick={() => {
                                 if (isSelected) updateForm('cuisine', cuisineArray.filter((x:any) => x !== c.name));
                                 else updateForm('cuisine', [...cuisineArray, c.name]);
                               }}
                               className={cn(
                                 "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                 isSelected ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-600 border-slate-300 hover:border-blue-600/30"
                               )}
                             >
                               {c.name}
                             </button>
                           );
                         })}
                       </div>
                       <InputText label="Other Cuisine (Type and press Enter to add)" placeholder="+ Add custom cuisine" value="" onChange={(v:any) => {}} />
                       <input 
                         type="text" 
                         placeholder="+ Add custom cuisine (Press Enter)" 
                         className="w-full px-4 py-2.5 bg-white border border-slate-300 focus:border-blue-600 rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all text-sm mb-2"
                         onKeyDown={e => {
                           if (e.key === 'Enter') {
                             e.preventDefault();
                             const input = e.target as HTMLInputElement;
                             const val = input.value.trim();
                             const cuisineArray = Array.isArray(formData.cuisine) ? formData.cuisine : typeof formData.cuisine === 'string' ? (formData.cuisine as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                             if (val && !cuisineArray.includes(val)) {
                               updateForm('cuisine', [...cuisineArray, val]);
                               input.value = '';
                             }
                           }
                         }}
                       />
                       {(() => {
                         const cuisineArray = Array.isArray(formData.cuisine) ? formData.cuisine : typeof formData.cuisine === 'string' ? (formData.cuisine as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                         return cuisineArray.filter((x:any) => !sortedCuisines.find(c => c.name === x)).length > 0 && (
                         <div className="flex flex-wrap gap-2 mt-2">
                           {cuisineArray.filter((x:any) => !sortedCuisines.find(c => c.name === x)).map((custom: any) => (
                             <span key={custom} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-300">
                               {custom}
                               <button 
                                 type="button" 
                                 onClick={() => updateForm('cuisine', cuisineArray.filter((item:any) => item !== custom))}
                                 className="text-slate-400 hover:text-red-500"
                               >
                                 <X size={12} />
                               </button>
                             </span>
                           ))}
                         </div>
                       )})()}
                     </div>

                     <div>
                       <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Facilities</label>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                         {[
                           'WiFi', 'AC', 'Parking', 'Valet Parking', 'Outdoor Seating', 
                           'Live Music', 'Bar', 'Vegetarian Friendly', 'Home Delivery',
                           'Takeaway', 'Card Payment', 'Digital Wallet', 'Kid Friendly',
                           'Smoking Area', 'Rooftop', 'Private Dining'
                         ].map(amenity => {
                           const facilitiesArray = Array.isArray(formData.facilities) ? formData.facilities : typeof formData.facilities === 'string' ? (formData.facilities as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                           const isSelected = facilitiesArray.includes(amenity);
                           return (
                             <button
                               key={amenity}
                               type="button"
                               onClick={() => {
                                 if (isSelected) updateForm('facilities', facilitiesArray.filter((x:any) => x !== amenity));
                                 else updateForm('facilities', [...facilitiesArray, amenity]);
                               }}
                               className={cn(
                                 "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                                 isSelected ? "bg-blue-600/5 border-blue-600 text-blue-600" : "bg-white border-slate-300 text-slate-600 hover:border-blue-600/30"
                               )}
                             >
                               <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0", isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300")}>
                                 {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                               </div>
                               <span className="text-xs font-bold leading-tight">{amenity}</span>
                             </button>
                           );
                         })}
                       </div>
                     </div>

                   </div>
                 </div>
               )}

               {activeTab === 'status' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div>
                     <h3 className="text-sm uppercase tracking-widest mb-4 text-[#363636] font-normal leading-[1.2]">Daily Timings</h3>
                     <div className="space-y-4">
                       {DAYS.map(day => {
                         const timing = (formData.dailyTimings as any)?.[day] || { closed: false };
                         const ranges = timing.ranges || (timing.open && timing.close ? [{ open: timing.open, close: timing.close }] : [{ open: '', close: '' }]);
                         
                         return (
                           <div key={day} className="flex flex-col gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-300">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                               <div className="flex items-center gap-4">
                                 <span className="w-28 font-bold text-slate-700">{day}</span>
                                 <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                                   <input type="checkbox" checked={timing.closed} onChange={e => {
                                     const newTimings = { ...(formData.dailyTimings || {}) };
                                     newTimings[day] = { ...timing, closed: e.target.checked };
                                     updateForm('dailyTimings', newTimings);
                                   }} className="rounded text-blue-600 focus:ring-blue-600 w-4 h-4 cursor-pointer" />
                                   Closed
                                 </label>
                               </div>
                               <button 
                                 type="button"
                                 onClick={() => {
                                   if(window.confirm(`Copy ${day}'s timings to all other days?`)) {
                                     const newTimings = { ...(formData.dailyTimings || {}) };
                                     DAYS.forEach(d => {
                                       newTimings[d] = {
                                         ...newTimings[d],
                                         closed: timing.closed,
                                         ranges: JSON.parse(JSON.stringify(ranges)),
                                         
                                       };
                                     });
                                     updateForm('dailyTimings', newTimings);
                                   }
                                 }}
                                 className="text-[10px] uppercase tracking-widest font-normal leading-[1.2] text-blue-600 hover:underline transition-colors flex items-center justify-center gap-1 sm:w-auto bg-blue-600/5 px-3 py-1.5 rounded-lg border border-blue-600/20"
                               >
                                 Copy to all days
                               </button>
                             </div>
                             
                             {!timing.closed && (
                               <div className="sm:pl-32 space-y-3">
                                 {ranges.map((range: any, rIdx: number) => (
                                   <div key={rIdx} className="flex gap-3 items-center">
                                     <input type="time" value={convertTo24Hour(range.open)} onChange={e => {
                                       const newTimings = { ...(formData.dailyTimings || {}) };
                                       const newRanges = [...ranges];
                                       newRanges[rIdx] = { ...range, open: convertTo12Hour(e.target.value) };
                                       newTimings[day] = { ...timing, ranges: newRanges };
                                       
                                       updateForm('dailyTimings', newTimings);
                                     }} className="w-28 px-4 py-2 bg-white border border-slate-300 focus:border-blue-600/50 rounded-xl font-normal text-[#363636] leading-[1.2] text-sm outline-none transition-all shadow-sm" />
                                     <span className="text-slate-400 font-bold text-sm">to</span>
                                     <input type="time" value={convertTo24Hour(range.close)} onChange={e => {
                                       const newTimings = { ...(formData.dailyTimings || {}) };
                                       const newRanges = [...ranges];
                                       newRanges[rIdx] = { ...range, close: convertTo12Hour(e.target.value) };
                                       newTimings[day] = { ...timing, ranges: newRanges };
                                       
                                       updateForm('dailyTimings', newTimings);
                                     }} className="w-28 px-4 py-2 bg-white border border-slate-300 focus:border-blue-600/50 rounded-xl font-normal text-[#363636] leading-[1.2] text-sm outline-none transition-all shadow-sm" />
                                     {Math.max(ranges.length, 1) > 1 && (
                                       <button type="button" onClick={() => {
                                         const newTimings = { ...(formData.dailyTimings || {}) };
                                         const newRanges = ranges.filter((_:any, i:number) => i !== rIdx);
                                         newTimings[day] = { ...timing, ranges: newRanges };
                                         
                                         updateForm('dailyTimings', newTimings);
                                       }} className="text-red-500 hover:text-red-600 p-2 opacity-50 hover:opacity-100 transition-opacity">
                                         <Trash2 size={16} />
                                       </button>
                                     )}
                                   </div>
                                 ))}
                                 <button type="button" onClick={() => {
                                   const newTimings = { ...(formData.dailyTimings || {}) };
                                   newTimings[day] = { ...timing, ranges: [...ranges, { open: '', close: '' }] };
                                   updateForm('dailyTimings', newTimings);
                                 }} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center gap-1 mt-2">
                                   + Add Shift
                                 </button>
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>

                   <div>
                     <h3 className="text-sm uppercase tracking-widest mb-2 text-[#363636] font-normal leading-[1.2]">Blackout Dates</h3>
                     <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed mb-4">Dates when your restaurant is closed or unable to accept online bookings.</p>
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-300 space-y-4">
                       <div className="flex gap-3 max-w-sm">
                         <input type="date" id="newBlackoutDate" min={new Date().toISOString().split('T')[0]} className="flex-1 px-4 py-2.5 bg-white border border-slate-300 focus:border-blue-600/50 rounded-xl font-normal text-[#363636] leading-[1.2] text-sm outline-none transition-all shadow-sm" />
                         <button type="button" onClick={() => {
                           const el = document.getElementById('newBlackoutDate') as HTMLInputElement;
                           if(el && el.value && !isNaN(new Date(el.value).getTime())) {
                             const dates = formData.blackoutDates || [];
                             if(!dates.includes(el.value)) {
                               updateForm('blackoutDates', [...dates, el.value].sort());
                             }
                             el.value = '';
                           }
                         }} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-opacity-90 transition-all text-sm whitespace-nowrap">
                           Add Date
                         </button>
                       </div>
                       
                       {(formData.blackoutDates || []).length > 0 && (
                         <div className="flex flex-wrap gap-2 pt-2">
                           {(formData.blackoutDates || []).map((date: string) => (
                             <span key={date} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 border border-slate-300 shadow-sm">
                               {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))}
                               <button type="button" onClick={() => {
                                 updateForm('blackoutDates', (formData.blackoutDates || []).filter((d:string) => d !== date));
                               }} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={14}/></button>
                             </span>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               )}

               {activeTab === 'stories' && selectedRes && (
                 <StoryManager restaurant={selectedRes} />
               )}

               {activeTab === 'media' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="p-4 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-100 mb-6">
                     <strong>Tip:</strong> Provide direct, absolute URLs (https://...) pointing to your images, or use the Upload button to upload an image from your device.
                   </div>
                   <ImageUploadInput label="Primary Image URL" value={formData.image} onChange={(v:any) => updateForm('image', v)} />
                   {formData.image && <img src={formData.image} alt="Primary" className="w-full max-w-lg h-64 object-cover rounded-xl border border-slate-300 shadow-sm" />}
                   
                   <div className="pt-4 border-t border-slate-300">
                     {renderImageInputList("Secondary Images", 'secondaryImages')}
                   </div>
                   <div className="pt-4 border-t border-slate-300">
                     {renderMenuCategories()}
                   </div>
                 </div>
               )}

               {activeTab === 'menu' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Live Menu Items</h3>
                        <p className="text-xs text-slate-500 mt-1">Manage items available for digital ordering</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={async () => {
                            const newVal = !formData.isQrMenuEnabled;
                            updateForm('isQrMenuEnabled', newVal);
                            
                            // Immediately update selectedRes so UI feels instant, or we just rely on formData for the UI styling below
                            setSelectedRes((prev: any) => ({ ...prev, isQrMenuEnabled: newVal }));

                            if (selectedRes?.id) {
                              try {
                                await updateDoc(doc(db, 'restaurants', selectedRes.id), {
                                  isQrMenuEnabled: newVal,
                                  updatedAt: serverTimestamp()
                                });
                              } catch (e) {
                                console.error(e);
                              }
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative overflow-hidden",
                            formData.isQrMenuEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-500 border border-slate-200"
                          )}
                        >
                          <div className={cn("w-2 h-2 rounded-full", formData.isQrMenuEnabled ? "bg-emerald-500" : "bg-slate-400")} />
                          {formData.isQrMenuEnabled ? 'QR Menu Active' : 'QR Menu Disabled'}
                        </button>
                        <button onClick={() => {
                          const newMenu = [...(formData.liveMenu || []), { id: Date.now().toString(), name: '', price: 0, description: '', isAvailable: true }];
                          updateForm('liveMenu', newMenu);
                        }} className="flex items-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs transition-colors">
                          <Plus size={14} /> Add Item
                        </button>
                      </div>
                    </div>

                    {formData.isQrMenuEnabled && (
                      <div className="bg-white border-2 border-blue-600/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                          <ShoppingBag size={120} />
                        </div>
                        <div className="shrink-0 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm relative z-10">
                          <QRCodeCanvas id="qr-canvas-element" 
                            value={`${window.location.origin}/qr-menu/${selectedRes?.id}${qrTableTarget ? '?table='+encodeURIComponent(qrTableTarget) : ''}`} 
                            size={120}
                            level="H"
                            includeMargin={false}
                            fgColor="#0f172a"
                          />
                        </div>
                        <div className="flex-1 text-center md:text-left relative z-10">
                          <h4 className="text-lg font-bold text-[#363636] mb-2">Digital QR Menu</h4>
                          <p className="text-sm text-slate-500 mb-3 max-w-sm">
                            Generate this QR code per table by entering the table number below.
                          </p>
                          <div className="mb-4">
                            <input 
                              type="text" 
                              value={qrTableTarget} 
                              onChange={(e) => setQrTableTarget(e.target.value)} 
                              placeholder="Enter Table Number (e.g. 5, A2) or leave blank" 
                              className="w-full max-w-[240px] px-4 py-2 border border-slate-200 rounded-xl text-sm mb-2 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <a 
                              href={`/qr-menu/${selectedRes?.id}${qrTableTarget ? '?table='+encodeURIComponent(qrTableTarget) : ''}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-5 py-2 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm hover:shadow active:scale-95 transition-all w-fit"
                            >
                              Open {qrTableTarget ? 'Table '+qrTableTarget+' ' : 'Generic '}Menu Link
                            </a>
                            <button
                              onClick={() => {
                                const canvas = document.getElementById('qr-canvas-element') as HTMLCanvasElement;
                                if (canvas) {
                                  const a = document.createElement("a");
                                  a.download = `table-${qrTableTarget || 'generic'}-qr.png`;
                                  a.href = canvas.toDataURL("image/png");
                                  a.click();
                                }
                              }}
                              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all w-fit border border-slate-200"
                            >
                              Download QR (PNG)
                            </button>
                            <button
                              onClick={() => {
                                const canvas = document.getElementById('qr-canvas-element') as HTMLCanvasElement;
                                if (canvas) {
                                  const dataUrl = canvas.toDataURL("image/png");
                                  const printWin = window.open('', '', 'width=600,height=600');
                                  if (printWin) {
                                    let tableName = qrTableTarget ? `Table ${qrTableTarget}` : 'Table ____';
                                    const addressParts = [selectedRes?.name || 'Restaurant', selectedRes?.location, selectedRes?.city].filter(Boolean);
                                    const resAddressStr = addressParts.join(', ');
                                    printWin.document.write(`
                                      <html>
                                        <head>
                                          <title>Print QR - ${tableName}</title>
                                          <style>
                                            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                                            h1 { font-size: 24px; margin-bottom: 20px; text-align: center; }
                                            img { width: 300px; height: 300px; border: 2px solid #000; padding: 20px; border-radius: 16px; margin-bottom: 20px; }
                                          </style>
                                        </head>
                                        <body>
                                          <h1>${resAddressStr}</h1>
                                          <h2 style="margin-top: 0;">${tableName}</h2>
                                          <img src="${dataUrl}" onload="window.print(); window.close();" />
                                        </body>
                                      </html>
                                    `);
                                    printWin.document.close();
                                  }
                                }
                              }}
                              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all w-fit border border-slate-200"
                            >
                              Print QR
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {(!formData.liveMenu || formData.liveMenu.length === 0) ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm">
                          No live menu items configured.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.liveMenu.map((item, idx) => (
                            <div key={item.id || idx} className="bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-xl relative group">
                              <button onClick={() => {
                                const newMenu = [...formData.liveMenu!];
                                newMenu.splice(idx, 1);
                                updateForm('liveMenu', newMenu);
                              }} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                <X size={14} />
                              </button>
                              <div className="space-y-2 mt-1 pr-6">
                                <input type="text" placeholder="Item Name" value={item.name} onChange={e => {
                                  const newMenu = [...formData.liveMenu!];
                                  newMenu[idx].name = e.target.value;
                                  updateForm('liveMenu', newMenu);
                                }} className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-bold outline-none" />
                                <div className="flex gap-3">
                                  <input type="text" placeholder="Category (e.g. Starter)" value={item.category || ''} onChange={e => {
                                    const newMenu = [...formData.liveMenu!];
                                    newMenu[idx].category = e.target.value;
                                    updateForm('liveMenu', newMenu);
                                  }} className="flex-1 px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-semibold outline-none" />
                                  <select value={item.isVeg === false ? 'false' : 'true'} onChange={e => {
                                    const newMenu = [...formData.liveMenu!];
                                    newMenu[idx].isVeg = e.target.value === 'true';
                                    updateForm('liveMenu', newMenu);
                                  }} className="px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-semibold outline-none">
                                    <option value="true">Veg</option>
                                    <option value="false">Non-Veg</option>
                                  </select>
                                </div>
                                <div className="flex gap-3">
                                  <input type="number" placeholder="Price (₹)" value={item.price} onChange={e => {
                                    const newMenu = [...formData.liveMenu!];
                                    newMenu[idx].price = parseInt(e.target.value) || 0;
                                    updateForm('liveMenu', newMenu);
                                  }} className="w-24 px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-semibold outline-none" />
                                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-3 border border-slate-300 rounded-lg">
                                    <input type="checkbox" checked={item.isAvailable} onChange={e => {
                                      const newMenu = [...formData.liveMenu!];
                                      newMenu[idx].isAvailable = e.target.checked;
                                      updateForm('liveMenu', newMenu);
                                    }} /> In Stock
                                  </label>
                                </div>
                                <div className="flex gap-3">
                                  {item.image && (
                                    <div className="w-16 h-16 shrink-0 rounded-lg border border-slate-300 overflow-hidden bg-slate-100">
                                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div className="flex-1 space-y-2">
                                    <input type="text" placeholder="Image URL (Optional)" value={item.image || ''} onChange={e => {
                                      const newMenu = [...formData.liveMenu!];
                                      newMenu[idx].image = e.target.value;
                                      updateForm('liveMenu', newMenu);
                                    }} className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-medium outline-none" />
                                    <textarea placeholder="Description" value={item.description || ''} onChange={e => {
                                      const newMenu = [...formData.liveMenu!];
                                      newMenu[idx].description = e.target.value;
                                      updateForm('liveMenu', newMenu);
                                    }} className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-medium outline-none resize-none" rows={2} />
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
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Signature Dishes</h3>
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
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm">
                          No signature dishes configured.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formData.signatureDishes.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-xl relative group">
                              <button onClick={() => {
                                const newSig = [...formData.signatureDishes!];
                                newSig.splice(idx, 1);
                                updateForm('signatureDishes', newSig);
                              }} className="absolute top-2 right-2 p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                <X size={14} />
                              </button>
                              <div className="space-y-2 mt-1 pr-6">
                                <input type="text" placeholder="Dish Name" value={item.name} onChange={e => {
                                  const newSig = [...formData.signatureDishes!];
                                  newSig[idx].name = e.target.value;
                                  updateForm('signatureDishes', newSig);
                                }} className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-bold outline-none" />
                                <input type="number" placeholder="Price (₹)" value={item.price} onChange={e => {
                                    const newSig = [...formData.signatureDishes!];
                                    newSig[idx].price = parseInt(e.target.value) || 0;
                                    updateForm('signatureDishes', newSig);
                                  }} className="w-32 px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-semibold outline-none" />
                                <textarea placeholder="Description" value={item.description || ''} onChange={e => {
                                  const newSig = [...formData.signatureDishes!];
                                  newSig[idx].description = e.target.value;
                                  updateForm('signatureDishes', newSig);
                                }} className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-blue-600 rounded-lg text-sm font-medium outline-none resize-none" rows={2} />
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
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Ongoing Offers</h3>
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
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm">
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
                              <div className="space-y-2 mt-1 pr-6">
                                <input type="text" placeholder="Offer Title" value={item.title} onChange={e => {
                                  const newOffers = [...formData.offers!];
                                  newOffers[idx].title = e.target.value;
                                  updateForm('offers', newOffers);
                                }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-bold outline-none" />
                                
                                <div className="flex gap-3">
                                  <div className="flex-1">
                                    <span className="text-[10px] text-amber-700 font-black mb-1 block uppercase">Valid From</span>
                                    <input type="date" value={item.validFrom} onChange={e => {
                                      const newOffers = [...formData.offers!];
                                      newOffers[idx].validFrom = e.target.value;
                                      updateForm('offers', newOffers);
                                    }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-medium outline-none" />
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-[10px] text-amber-700 font-black mb-1 block uppercase">Valid Until</span>
                                    <input type="date" value={item.validUntil} onChange={e => {
                                      const newOffers = [...formData.offers!];
                                      newOffers[idx].validUntil = e.target.value;
                                      updateForm('offers', newOffers);
                                    }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-medium outline-none" />
                                  </div>
                                </div>
                                <input type="text" placeholder="Terms & Conditions" value={item.terms || ''} onChange={e => {
                                  const newOffers = [...formData.offers!];
                                  newOffers[idx].terms = e.target.value;
                                  updateForm('offers', newOffers);
                                }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-medium outline-none" />
                                <textarea placeholder="Description" value={item.description || ''} onChange={e => {
                                  const newOffers = [...formData.offers!];
                                  newOffers[idx].description = e.target.value;
                                  updateForm('offers', newOffers);
                                }} className="w-full px-3 py-2 bg-white border border-amber-200 focus:border-blue-600 rounded-lg text-sm font-medium outline-none resize-none" rows={2} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                 </div>
               )}

               {activeTab === 'ads' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Advertisement Campaigns</h3>
                        <p className="text-xs text-slate-500 mt-1">Manage visual ads and video promos</p>
                      </div>
                      <button onClick={() => {
                        const newAd = [{ 
                            id: Math.random().toString(36).substr(2, 9),
                            title: '', 
                            description: '', 
                            active: true,
                            validFrom: new Date().toISOString().split('T')[0]
                        }, ...(formData.advertisements || [])];
                        updateForm('advertisements', newAd);
                      }} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                        <Plus size={14} /> Create New Ad
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(!formData.advertisements || formData.advertisements.length === 0) ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-medium text-sm">
                          No active advertisements.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">
                          {formData.advertisements.map((ad, idx) => (
                            <div key={ad.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                              <div className="flex items-start justify-between">
                                <div className="space-y-6 flex-grow mr-6 text-left">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className={cn("w-3 h-3 rounded-full animate-pulse", ad.active ? "bg-green-500" : "bg-slate-300")} />
                                      <h4 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Ad Slot #{idx + 1}</h4>
                                    </div>
                                    <button type="button" onClick={() => {
                                      const newAds = [...formData.advertisements!];
                                      newAds[idx].active = !ad.active;
                                      updateForm('advertisements', newAds);
                                    }} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", ad.active ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-400")}>
                                      {ad.active ? "Active" : "Paused"}
                                    </button>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campaign Title</label>
                                      <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-normal text-[#363636] leading-[1.2] focus:border-blue-600 outline-none" value={ad.title} onChange={(e) => {
                                        const newAds = [...formData.advertisements!];
                                        newAds[idx].title = e.target.value;
                                        updateForm('advertisements', newAds);
                                      }} placeholder="Monsoon Special Ad..." />
                                    </div>

                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description / Hook Line</label>
                                      <textarea className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-[#363636] focus:border-blue-600 outline-none min-h-[80px]" value={ad.description || ""} onChange={(e) => {
                                        const newAds = [...formData.advertisements!];
                                        newAds[idx].description = e.target.value;
                                        updateForm('advertisements', newAds);
                                      }} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Poster Image URL</label>
                                        <div className="flex flex-col gap-2">
                                          {ad.image && ad.image !== "Uploading..." && (
                                            <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                                              <img src={ad.image} className="w-full h-full object-contain" alt="Ad Preview" />
                                            </div>
                                          )}
                                          <div className="flex gap-2">
                                            <input className="flex-grow px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-[#363636] focus:border-blue-600 outline-none" value={ad.image || ""} onChange={(e) => {
                                              const newAds = [...formData.advertisements!];
                                              newAds[idx].image = e.target.value;
                                              updateForm('advertisements', newAds);
                                            }} placeholder="https://..." />
                                            <input type="file" id={`partner-ad-image-upload-${idx}`} className="hidden" accept="image/*" onChange={async (e) => {
                                              const file = e.target.files?.[0];
                                              if (!file) return;
                                              try {
                                                const newAds = [...formData.advertisements!];
                                                newAds[idx].image = "Uploading...";
                                                updateForm('advertisements', newAds);
                                                
                                                const seoFileName = generateSeoFriendlyFileName(file.name, 'spotlight', selectedRes?.name);
                                                const storageRef = ref(storage, `restaurants/${seoFileName}`);
                                                const uploadTask = uploadBytesResumable(storageRef, file);
                                                uploadTask.on('state_changed', null, null, async () => {
                                                  const url = await getDownloadURL(uploadTask.snapshot.ref);
                                                  const updatedAds = [...formData.advertisements!];
                                                  updatedAds[idx].image = url;
                                                  updateForm('advertisements', updatedAds);
                                                });
                                              } catch (err) {
                                                console.error(err);
                                              }
                                            }} />
                                            <button type="button" onClick={() => document.getElementById(`partner-ad-image-upload-${idx}`)?.click()} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 transition-all" title="Upload Image">
                                              <Upload size={18} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">YouTube Video Link</label>
                                        <div className="flex gap-2">
                                          <input className="flex-grow px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-[#363636] focus:border-blue-600 outline-none" value={ad.videoUrl || ""} onChange={(e) => {
                                            const newAds = [...formData.advertisements!];
                                            newAds[idx].videoUrl = e.target.value;
                                            updateForm('advertisements', newAds);
                                          }} placeholder="https://youtube.com/watch?v=..." />
                                          <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400">
                                            <Video size={18} />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valid From</label>
                                        <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-[#363636] focus:border-blue-600 outline-none" value={ad.validFrom || ""} onChange={(e) => {
                                          const newAds = [...formData.advertisements!];
                                          newAds[idx].validFrom = e.target.value;
                                          updateForm('advertisements', newAds);
                                        }} />
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valid Until</label>
                                        <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-[#363636] focus:border-blue-600 outline-none" value={ad.validUntil || ""} onChange={(e) => {
                                          const newAds = [...formData.advertisements!];
                                          newAds[idx].validUntil = e.target.value;
                                          updateForm('advertisements', newAds);
                                        }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <button type="button" onClick={() => {
                                  const newAds = [...formData.advertisements!];
                                  newAds.splice(idx, 1);
                                  updateForm('advertisements', newAds);
                                }} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors">
                                  <Trash2 size={16} />
                                </button>
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

      {/* New Booking Modal */}
      {showNewBookingModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-300 flex justify-between items-center relative overflow-hidden shrink-0">
               <div className="relative z-10">
                 <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">New Booking</h2>
                 <p className="text-slate-500 font-semibold text-xs mt-1">Create booking on behalf of user</p>
               </div>
               <button onClick={() => setShowNewBookingModal(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm relative z-10 transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="overflow-y-auto">
              <form onSubmit={handleCreateBooking} className="p-6 md:p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Name *</label>
                     <input required type="text" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/20 px-4 py-3 rounded-xl font-bold outline-none" value={newBookingForm.name} onChange={e => setNewBookingForm({...newBookingForm, name: e.target.value})} placeholder="Guest Name" />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mobile No *</label>
                     <input required type="tel" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/20 px-4 py-3 rounded-xl font-bold outline-none" value={newBookingForm.phone} onChange={e => setNewBookingForm({...newBookingForm, phone: e.target.value})} placeholder="+91 98765 43210" />
                   </div>
                   <div className="md:col-span-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email <span className="text-slate-300 font-normal">(Optional)</span></label>
                     <input type="email" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/20 px-4 py-3 rounded-xl font-bold outline-none" value={newBookingForm.email} onChange={e => setNewBookingForm({...newBookingForm, email: e.target.value})} placeholder="guest@example.com" />
                   </div>
                   
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Date *</label>
                     <input required type="date" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/20 px-4 py-3 rounded-xl font-bold outline-none" value={newBookingForm.date} onChange={e => setNewBookingForm({...newBookingForm, date: e.target.value})} />
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Time *</label>
                     <input required type="time" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/20 px-4 py-3 rounded-xl font-bold outline-none" value={newBookingForm.time} onChange={e => setNewBookingForm({...newBookingForm, time: e.target.value})} />
                   </div>
                   
                   <div className="md:col-span-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Size (Guests) *</label>
                     <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl">
                        <button type="button" onClick={() => setNewBookingForm({...newBookingForm, guests: Math.max(1, newBookingForm.guests - 1)})} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-normal leading-[1.2] text-blue-600 shadow-sm">-</button>
                        <div className="flex-1 text-center text-lg text-[#363636] font-normal leading-[1.2]">{newBookingForm.guests}</div>
                        <button type="button" onClick={() => setNewBookingForm({...newBookingForm, guests: newBookingForm.guests + 1})} className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-normal leading-[1.2] text-blue-600 shadow-sm">+</button>
                     </div>
                   </div>
                 </div>
                 
                 <button type="submit" disabled={bookingSubmitLoading} className="w-full py-4 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 mt-8 shrink-0">
                   {bookingSubmitLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                   Confirm Booking
                 </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Save Bar */}
      <AnimatePresence>
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-300 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] z-50 transform transition-transform">
             <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                    <Info size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm text-[#363636] font-normal leading-[1.2]">Unsaved Changes</h4>
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
