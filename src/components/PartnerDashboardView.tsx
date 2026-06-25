import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { QRCodeCanvas } from 'qrcode.react';
import { db, storage } from '../lib/firebase';
import AppIcon from './AppIcon';
import { Restaurant, LiveMenuItem, Offer } from '../types';
import { Loader2, LogOut, Store, MapPin, Image as ImageIcon, ChevronRight, ChevronDown, Info, Clock, Utensils, Tag, Save, Eye, Plus, X, Star, Calendar, Users, Trash2, ShoppingBag, CheckCircle, AlertCircle, UploadCloud, Megaphone, Upload, Video, BarChart3, MessageSquare, LayoutDashboard, SlidersHorizontal, MoreVertical, Search } from 'lucide-react';
import StoryManager from './StoryManager';
import { cn, convertTo12Hour, convertTo24Hour, generateSeoFriendlyFileName, getCroppedImg } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { useMalls } from '../hooks/useFirebase';

import { useMasterData } from './MasterDataContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const SIDEBAR_GROUPS = [
  {
    title: 'Operations',
    tabs: [
      { id: 'overview', label: 'Operations Center', icon: LayoutDashboard },
      { id: 'orders', label: 'Live Orders', icon: ShoppingBag },
      { id: 'bookings', label: 'Table Bookings', icon: Calendar },
    ]
  },
  {
    title: 'Menu & Content',
    tabs: [
      { id: 'menu', label: 'Live Menu', icon: Utensils },
      { id: 'specialties', label: 'Signature Dishes', icon: Star },
      { id: 'media', label: 'Media & Images', icon: ImageIcon },
      { id: 'stories', label: 'Stories', icon: Store },
    ]
  },
  {
    title: 'Settings',
    tabs: [
      { id: 'general', label: 'General Info', icon: Info },
      { id: 'status', label: 'Operational Hours', icon: Clock },
      { id: 'bookingSettings', label: 'Booking Settings', icon: Calendar },
    ]
  },
  {
    title: 'Growth & Ads',
    tabs: [
      { id: 'offers', label: 'Offers & Promos', icon: Tag },
      { id: 'ads', label: 'Ads', icon: Megaphone },
    ]
  }
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
                 <Users size={14} className="text-blue-600" /> {b.guestsLabel || b.guests} Guests
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
                         showCancelConfirm ? (
                           <div className="flex gap-1 items-center">
                             <button
                               onClick={() => {
                                 setShowCancelConfirm(false);
                                 updateBookingStatus?.(b.id, 'cancelled');
                               }}
                               className="text-[10px] bg-red-600 text-white hover:bg-red-700 rounded-lg px-2 py-1.5 font-bold outline-none cursor-pointer transition-colors"
                             >
                               Yes, Cancel
                             </button>
                             <button
                               onClick={() => setShowCancelConfirm(false)}
                               className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 rounded-lg px-2 py-1.5 font-bold outline-none cursor-pointer transition-colors"
                             >
                               Keep
                             </button>
                           </div>
                         ) : (
                           <button
                             onClick={() => setShowCancelConfirm(true)}
                             className="text-[10px] bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-lg px-3 py-1.5 font-bold outline-none cursor-pointer transition-colors"
                           >
                             Cancel
                           </button>
                         )
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
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    setOriginalFile(file);
    setCropModalOpen(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    
    if (e.target) e.target.value = '';
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropAndUpload = async () => {
    if (!imageSrc || !croppedAreaPixels || !originalFile) return;
    setUploading(true);
    setCropModalOpen(false);
    
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 600);
      if (!croppedBlob) throw new Error("Could not crop image");
      
      const originalName = originalFile.name || 'image.jpg';
      const seoFileName = generateSeoFriendlyFileName(originalName, 'banner', label || 'upload');
      const finalFileName = seoFileName.replace(/\.[^/.]+$/, "") + ".jpg";
      
      const storageRef = ref(storage, `restaurant_images/${finalFileName}`);
      const uploadTask = uploadBytesResumable(storageRef, croppedBlob, { contentType: 'image/jpeg' });
      
      uploadTask.on('state_changed', 
        () => {},
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
    } catch (e) {
      console.error(e);
      setUploading(false);
    }
  };

  const handleCancelCrop = () => {
    setCropModalOpen(false);
    setImageSrc(null);
    setOriginalFile(null);
  };

  return (
    <div>
      {label && <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:w-1/3 shrink-0">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
            disabled={uploading}
          />
          <button type="button" disabled={uploading} className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 h-[40px] px-4 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shadow-sm font-semibold text-xs gap-2">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
          </button>
        </div>
        <div className="text-center shrink-0 -my-0.5 sm:my-0">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">OR<span className="sm:hidden"> Provide URL</span></span>
        </div>
        <div className="w-full flex-1">
          <input 
            type="text" 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder || "Provide Image URL..."} 
            className="w-full h-[40px] px-3 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl text-xs font-medium text-slate-700 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <AnimatePresence>
        {cropModalOpen && imageSrc && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative"
            >
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Crop Image</h3>
                  <p className="text-sm text-slate-500 mt-1">Adjust image to fit a 1:1 aspect ratio</p>
                </div>
                <button onClick={handleCancelCrop} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="relative w-full h-[60vh] max-h-[500px] bg-black">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={true}
                />
              </div>

              <div className="p-6 bg-slate-50 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-500">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => {
                      setZoom(Number(e.target.value))
                    }}
                    className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                
                <div className="flex gap-3 justify-end mt-2">
                  <button onClick={handleCancelCrop} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleCropAndUpload} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                    Crop & Upload
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
  const { cuisines, cities, diningCollections } = useMasterData();
  const { malls } = useMalls();
  const sortedCollections = React.useMemo(() => [...diningCollections].filter(c => c.isActive).sort((a, b) => a.name.localeCompare(b.name)), [diningCollections]);
  const sortedCuisines = React.useMemo(() => [...cuisines].sort((a, b) => a.name.localeCompare(b.name)), [cuisines]);
  const navigate = useNavigate();
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRes, setSelectedRes] = useState<Restaurant | null>(null);
  const [isResDropdownOpen, setIsResDropdownOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [activeOrderFilter, setActiveOrderFilter] = useState('All');
  const [activeMenuCategory, setActiveMenuCategory] = useState('All');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [overviewYear, setOverviewYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState<Partial<Restaurant>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [takeawayOrders, setTakeawayOrders] = useState<any[]>([]);
  const [pageViews, setPageViews] = useState<any[]>([]);

  const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
  const unreadConfirmedBookingsCount = bookings.filter(b => b.status === 'confirmed' && !b.ownerViewed).length;
  const pendingOrdersCount = takeawayOrders.filter(o => !['Completed', 'Cancelled'].includes(o.status)).length;
  const totalBookingsBadge = pendingBookingsCount + unreadConfirmedBookingsCount;

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

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [openMenuDropdown, setOpenMenuDropdown] = useState<number | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingCustomizationsForItem, setEditingCustomizationsForItem] = useState<number | null>(null);
  const [newItemData, setNewItemData] = useState<any>({ name: '', price: 0, description: '', isAvailable: true, category: '', isVeg: true, image: '' });

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
    
    const playNotificationSound = () => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.error("Audio auto-play blocked", e));
      } catch (e) {
        console.error("Audio play failed", e);
      }
    };

    let isFirstSnapshotBookings = true;
    const q = query(
      collection(db, 'bookings'),
      where('restaurantId', '==', selectedRes.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const addedDocs = snapshot.docChanges().filter(change => change.type === 'added').map(c => c.doc.data());
      const hasNewConfirmed = addedDocs.some(b => b.status === 'confirmed');
      if (!isFirstSnapshotBookings && hasNewConfirmed) {
        playNotificationSound();
      }
      isFirstSnapshotBookings = false;
      setBookings(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    let isFirstSnapshotOrders = true;
    const qOrders = query(
      collection(db, 'orders'),
      where('restaurantId', '==', selectedRes.id)
    );
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const hasNew = snapshot.docChanges().some(change => change.type === 'added');
      if (!isFirstSnapshotOrders && hasNew) {
        playNotificationSound();
      }
      isFirstSnapshotOrders = false;
      setTakeawayOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); // Re-using state for unified orders
    });
    const qViews = query(
      collection(db, 'page_views'),
      where('restaurantId', '==', selectedRes.id)
    );
    const unsubViews = onSnapshot(qViews, (snapshot) => {
      setPageViews(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubscribe();
      unsubOrders();
      unsubViews();
    };
  }, [selectedRes]);

  // Mark confirmed bookings as viewed when the bookings tab is opened
  useEffect(() => {
    if (activeTab === 'bookings') {
      const unread = bookings.filter(b => b.status === 'confirmed' && !b.ownerViewed);
      unread.forEach(b => {
        updateDoc(doc(db, 'bookings', b.id), { ownerViewed: true }).catch(e => console.error("Failed to mark viewed", e));
      });
    }
  }, [activeTab, bookings]);

  // Play alarm sound if there are pending bookings
  useEffect(() => {
    let interval: any;
    if (pendingBookingsCount > 0) {
      const playAlarm = () => {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
          audio.play().catch(e => console.error("Alarm auto-play blocked", e));
        } catch (e) {
          console.error("Alarm play failed", e);
        }
      };
      
      playAlarm();
      interval = setInterval(playAlarm, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pendingBookingsCount]);

  const handleLogout = async () => {
    await signOut();
    navigate('/partners/login');
  };

  const toggleFeature = async (feature: 'isBookingEnabled' | 'isTakeawayEnabled', value: boolean) => {
    if (!selectedRes) return;
    try {
      await updateDoc(doc(db, 'restaurants', selectedRes.id), {
        [feature]: value
      });
      const updatedRes = { ...selectedRes, [feature]: value };
      setSelectedRes(updatedRes);
      setFormData(updatedRes);
      showToast(`${feature === 'isBookingEnabled' ? 'Table Bookings' : 'Live Orders'} ${value ? 'enabled' : 'disabled'}.`, "success");
    } catch (e) {
      console.error(e);
      showToast(`Failed to update feature`, "error");
    }
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

  const handleSave = async (dataToSave?: any) => {
    if (!selectedRes) return;
    setSaving(true);

    const isEvent = dataToSave && typeof dataToSave.preventDefault === 'function';
    const data = (dataToSave && !isEvent) ? dataToSave : formData;

    let hasInvalidTimings = false;
    if (data.dailyTimings) {
      const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      DAYS.forEach(day => {
        const timing = (data.dailyTimings as any)[day];
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

    const stripUndefined = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(stripUndefined);
      }
      if (typeof obj === 'object') {
        if (obj instanceof Date) return obj;
        if (Object.prototype.toString.call(obj) !== '[object Object]') return obj; // Prevent circular on non-plain objects
        
        const result: any = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (obj[key] !== undefined) {
              result[key] = stripUndefined(obj[key]);
            }
          }
        }
        return result;
      }
      return obj;
    };

    const cleanData = stripUndefined(data);

    try {
      const docRef = doc(db, 'restaurants', selectedRes.id);
      await updateDoc(docRef, cleanData);
      
      // Update local state
      const updatedRes = { ...selectedRes, ...cleanData } as Restaurant;
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
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 mr-4 border-r border-slate-200 pr-4">
               <span className="text-sm font-bold text-slate-700">Accepting Bookings</span>
               <button 
                 onClick={() => toggleFeature('isBookingEnabled', !selectedRes?.isBookingEnabled)}
                 className={cn("w-12 h-6 rounded-full transition-colors relative", selectedRes?.isBookingEnabled ? "bg-green-500" : "bg-slate-300")}
               >
                 <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm", selectedRes?.isBookingEnabled ? "left-[26px]" : "left-[2px]")} />
               </button>
             </div>
             <button onClick={() => setShowNewBookingModal(true)} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Plus size={18} />
                New Booking
             </button>
           </div>
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
    const STATUSES = ['All', 'Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
            <div>
             <h2 className="text-2xl text-[#363636] font-normal leading-[1.2]">Live Orders</h2>
             <p className="text-slate-500 text-xs font-semibold mt-1">Manage Table and Takeaway orders.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700">Accepting Orders</span>
              <button 
                onClick={() => toggleFeature('isTakeawayEnabled', !selectedRes?.isTakeawayEnabled)}
                className={cn("w-12 h-6 rounded-full transition-colors relative", selectedRes?.isTakeawayEnabled ? "bg-green-500" : "bg-slate-300")}
              >
                <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm", selectedRes?.isTakeawayEnabled ? "left-[26px]" : "left-[2px]")} />
              </button>
            </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {STATUSES.map(status => {
            const count = status === 'All' 
              ? takeawayOrders.length 
              : takeawayOrders.filter(o => o.status === status || (!o.status && status === 'Received')).length;
              
            return (
              <button
                key={status}
                onClick={() => setActiveOrderFilter(status)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2",
                  activeOrderFilter === status 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                )}
              >
                {status}
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  activeOrderFilter === status ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
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
          <div className="space-y-8">
            {['Received', 'Preparing', 'Ready', 'Completed', 'Cancelled'].filter(s => activeOrderFilter === 'All' || activeOrderFilter === s).map(status => {
              const getOrderTime = (o: any) => o.createdAt?.toDate ? o.createdAt.toDate().getTime() : (o.createdAt ? new Date(o.createdAt).getTime() : 0);
              const ordersInStatus = takeawayOrders
                .filter(o => o.status === status || (!o.status && status === 'Received'))
                .sort((a,b) => getOrderTime(b) - getOrderTime(a));
              
              if (ordersInStatus.length === 0 && activeOrderFilter !== 'All') {
                 return (
                   <div key={status} className="bg-white rounded-3xl p-12 text-center border border-slate-200">
                     <h3 className="text-lg mb-1 text-[#363636] font-normal leading-[1.2]">No {status} Orders</h3>
                   </div>
                 );
              }
              if (ordersInStatus.length === 0) return null;
              
              return (
                <div key={status} className="animate-in fade-in">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-bold text-slate-800">{status} Orders</h3>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-xs font-black">{ordersInStatus.length}</span>
                  </div>
                  <div className="grid gap-4">
                    {ordersInStatus.map(order => (
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
                               {order.tokenNumber && (
                                 <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest bg-yellow-100 text-yellow-700">
                                   Token: {order.tokenNumber}
                                 </span>
                               )}
                               <span className="text-xs font-bold text-slate-400">ID: {order.orderId}</span>
                             </div>
                             <div className="text-lg text-[#363636] font-normal leading-[1.2]">{order.customerName}</div>
                             <div className="text-xs font-semibold text-slate-500">{order.customerPhone}</div>
                           </div>
                           <div className="text-right">
                              <div className="font-normal leading-[1.2] text-blue-600 text-lg">₹{order.totalPrice}</div>
                              <div className="text-xs font-bold text-slate-500">
                                {(() => {
                                  const d = order.createdAt?.toDate ? order.createdAt.toDate() : (order.createdAt ? new Date(order.createdAt) : new Date());
                                  return isNaN(d.getTime()) ? '' : d.toLocaleString();
                                })()}
                              </div>
                           </div>
                        </div>
      
                        <div className="mb-4 bg-slate-50 p-4 rounded-xl">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Items</div>
                           {order.items?.map((item: any, idx: number) => (
                             <div key={idx} className="flex justify-between items-start text-sm mb-1">
                               <div className="flex flex-col">
                                 <span className="font-semibold text-slate-700">{item.quantity}x {item.name}</span>
                                 {item.customizations?.length > 0 && (
                                   <div className="text-xs text-slate-500 mt-0.5 ml-4">
                                     {item.customizations.map((c:any) => c.optionName).join(', ')}
                                   </div>
                                 )}
                               </div>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };


  const handleGenerateQRAsset = async (action: 'download' | 'print') => {
    const qrCanvas = document.getElementById('qr-canvas-element') as HTMLCanvasElement;
    if (!qrCanvas) return;

    const width = 800;
    const height = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Background
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, width, height);

    // Table Number Text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.font = '600 40px sans-serif';
    ctx.fillText("Table Number", width / 2, 80);

    ctx.font = '900 340px sans-serif';
    const tableName = qrTableTarget ? qrTableTarget : '1';
    ctx.fillText(tableName, width / 2, 300);

    // White middle container behind QR (rounded rect effect)
    const boxSize = 440;
    const boxX = (width - boxSize) / 2;
    const boxY = 460;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const r = 40;
    ctx.moveTo(boxX + r, boxY);
    ctx.arcTo(boxX + boxSize, boxY, boxX + boxSize, boxY + boxSize, r);
    ctx.arcTo(boxX + boxSize, boxY + boxSize, boxX, boxY + boxSize, r);
    ctx.arcTo(boxX, boxY + boxSize, boxX, boxY, r);
    ctx.arcTo(boxX, boxY, boxX + boxSize, boxY, r);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Draw QR
    const qrSize = 360;
    ctx.drawImage(qrCanvas, (width - qrSize) / 2, boxY + 40, qrSize, qrSize);

    // Bottom dark Section
    ctx.fillStyle = '#1e3a8a'; 
    ctx.fillRect(0, height - 200, width, 200);

    // Footer Text
    const addressParts = [selectedRes?.name || 'Restaurant', selectedRes?.location, selectedRes?.city].filter(Boolean);
    const resAddressStr = addressParts.join(', ');
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.font = '600 18px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(resAddressStr, width / 2, height - 110);
    
    ctx.font = '800 26px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText("POWERED BY Bookmytable", width / 2, height - 60);

    const dataUrl = canvas.toDataURL("image/png");

    if (action === 'download') {
      const a = document.createElement("a");
      a.download = `table-${tableName}-qr.png`;
      a.href = dataUrl;
      a.click();
    } else {
      const printWin = window.open('', '', 'width=600,height=800');
      if (printWin) {
        printWin.document.write(`
          <html>
            <head>
              <title>Print QR - Table ${tableName}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; height: 100vh; overflow: hidden; }
                @media print {
                  @page { margin: 0; size: auto; }
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; overflow: hidden; height: 100vh; }
                  img { max-height: 98vh; max-width: 98vw; object-fit: contain; }
                }
                img { max-width: 100%; height: auto; border: none; }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" onload="setTimeout(() => { window.print(); window.close(); }, 500);" />
            </body>
          </html>
        `);
        printWin.document.close();
      }
    }
  };

  const renderBookingSettingsTab = () => {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const CATEGORIES = ['Breakfast', 'Lunch', 'Dinner'];

    const getThresholdsForDay = (day: string) => {
      const thresholds = formData.autoApprovalThresholds || [];
      return thresholds.find((t: any) => t.day === day)?.thresholds || { Breakfast: 10, Lunch: 10, Dinner: 10 };
    };

    const updateThreshold = (day: string, category: string, value: number) => {
      const newThresholds = [...(formData.autoApprovalThresholds || [])];
      const dayIndex = newThresholds.findIndex((t: any) => t.day === day);
      if (dayIndex >= 0) {
        newThresholds[dayIndex] = {
          ...newThresholds[dayIndex],
          thresholds: { ...newThresholds[dayIndex].thresholds, [category]: value }
        };
      } else {
        const newDayThreshold = { day, thresholds: { Breakfast: 10, Lunch: 10, Dinner: 10, [category]: value } };
        newThresholds.push(newDayThreshold);
      }
      setFormData({ ...formData, autoApprovalThresholds: newThresholds });
      setHasChanges(true);
    };

    const blackoutSlots = formData.blackoutSlots || [];
    const addBlackoutSlot = () => {
      setFormData({ ...formData, blackoutSlots: [...blackoutSlots, { date: new Date().toISOString().split('T')[0], categories: [] }] });
      setHasChanges(true);
    };
    const updateBlackoutSlot = (index: number, key: string, value: any) => {
      const newSlots = [...blackoutSlots];
      newSlots[index] = { ...newSlots[index], [key]: value };
      setFormData({ ...formData, blackoutSlots: newSlots });
      setHasChanges(true);
    };
    const toggleBlackoutCategory = (index: number, cat: string) => {
      const newSlots = [...blackoutSlots];
      const categories = newSlots[index].categories || [];
      if (categories.includes(cat)) {
        newSlots[index].categories = categories.filter((c: string) => c !== cat);
      } else {
        newSlots[index].categories = [...categories, cat];
      }
      setFormData({ ...formData, blackoutSlots: newSlots });
      setHasChanges(true);
    };
    const removeBlackoutSlot = (index: number) => {
      const newSlots = blackoutSlots.filter((_: any, i: number) => i !== index);
      setFormData({ ...formData, blackoutSlots: newSlots });
      setHasChanges(true);
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-2xl text-[#363636] font-normal leading-[1.2]">Booking Settings</h2>
          <p className="text-slate-500 text-xs font-semibold mt-1">Manage auto-approvals and blackout dates.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Auto Table Booking Thresholds</h3>
            <p className="text-sm text-slate-500 mb-6">Set the guest count threshold for auto-approving table bookings per day and per meal category. Any booking with guests exceeding this limit will require manual approval. If not set, defaults to 10.</p>
            
            <div className="space-y-4">
              {DAYS.map(day => {
                const thresholds = getThresholdsForDay(day);
                return (
                  <div key={day} className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                    <div className="font-bold text-[#363636] w-32 shrink-0">{day}</div>
                    <div className="flex flex-wrap gap-4 w-full">
                      {CATEGORIES.map(cat => (
                        <div key={cat} className="flex-1 min-w-[120px]">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">{cat}</label>
                          <input 
                            type="number" 
                            min="1"
                            value={thresholds[cat] || 10} 
                            onChange={(e) => updateThreshold(day, cat, parseInt(e.target.value) || 10)}
                            className="w-full bg-white border border-slate-300 focus:border-blue-600/20 px-3 py-2 rounded-lg font-bold outline-none text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Blackout Dates & Times</h3>
              <p className="text-sm text-slate-500">Disable table bookings for specific dates and meal times.</p>
            </div>
            <button onClick={addBlackoutSlot} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all">
              <Plus size={16} /> Add Blackout
            </button>
          </div>

          <div className="space-y-4">
            {blackoutSlots.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No blackout dates configured.</div>
            ) : (
              blackoutSlots.map((slot: any, idx: number) => (
                <div key={idx} className="flex flex-col lg:flex-row items-start lg:items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div className="w-full lg:w-auto shrink-0">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Date</label>
                    <input 
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateBlackoutSlot(idx, 'date', e.target.value)}
                      className="bg-white border border-slate-300 focus:border-blue-600/20 px-3 py-2 rounded-lg font-bold outline-none text-sm"
                    />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Categories to Disable</label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const isActive = (slot.categories || []).includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleBlackoutCategory(idx, cat)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                              isActive ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                            )}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => removeBlackoutSlot(idx)} className="text-slate-400 hover:text-red-500 transition-colors p-2 shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const allMenuCategories = Array.from(new Set((formData.liveMenu || []).map((item: any) => item.category?.trim()).filter(Boolean)));

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
            <div className="space-y-6">
              {SIDEBAR_GROUPS.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">{group.title}</p>
                  <div className="space-y-1">
                    {group.tabs.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold text-left text-sm relative",
                            activeTab === tab.id 
                              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                              : "bg-transparent text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon size={16} />
                            {tab.label}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {tab.id === 'orders' && pendingOrdersCount > 0 && (
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black",
                                activeTab === tab.id ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                              )}>
                                {pendingOrdersCount}
                              </span>
                            )}
                            {tab.id === 'bookings' && totalBookingsBadge > 0 && (
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black",
                                activeTab === tab.id ? "bg-white text-blue-600" : "bg-blue-600 text-white"
                              )}>
                                {totalBookingsBadge}
                              </span>
                            )}
                            {activeTab === tab.id && <ChevronRight size={16} opacity={0.6} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
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
               
               {activeTab === 'overview' && (() => {
                 const processData = (year: number) => {
                   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                   const currentMonthIndex = new Date().getMonth();
                   const currentYear = new Date().getFullYear();
                   const todayStr = new Date().toDateString();

                   const salesMap: any = {};
                   months.forEach((m, index) => salesMap[m] = { month: m, orders: 0, bookings: 0, revenue: 0, views: 0, _index: index });
                   
                   let monthToDateRevenue = 0;
                   let todayRevenue = 0;
                   let todayOrders = 0;
                   let pendingOrders = 0;
                   let todayBookings = 0;
                   let todayViews = 0;
                   
                   const itemCounts: any = {};

                   takeawayOrders.forEach(o => {
                     let d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
                     if(isNaN(d.getTime())) return;
                     
                     const orderTotal = Number(o.totalPrice) || Number(o.totalAmount) || (o.items?.reduce((acc: number, item: any) => acc + (Number(item.price) * Number(item.quantity) || 1), 0) || 0);

                     if (d.toDateString() === todayStr) {
                        todayRevenue += orderTotal;
                        todayOrders += 1;
                     }
                     if (o.status === 'pending' || o.status === 'preparing') {
                        pendingOrders += 1;
                     }

                     if (d.getFullYear() === year) {
                       const m = months[d.getMonth()];
                       salesMap[m].orders += 1;
                       salesMap[m].revenue += orderTotal;

                       // Accumulate item counts for top items (showing for this year)
                       if (o.items) {
                          o.items.forEach((item: any) => {
                            if(!itemCounts[item.name]) itemCounts[item.name] = { name: item.name, qty: 0, rev: 0 };
                            itemCounts[item.name].qty += (Number(item.quantity) || 1);
                            itemCounts[item.name].rev += (Number(item.price) * (Number(item.quantity) || 1));
                          });
                       }
                     }
                     if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIndex) {
                       monthToDateRevenue += orderTotal;
                     }
                   });

                   bookings.forEach(b => {
                     let d = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || b.date); 
                     if(isNaN(d.getTime())) return;
                     
                     const isToday = b.date ? new Date(b.date).toDateString() === todayStr : d.toDateString() === todayStr;
                     if (isToday) {
                        todayBookings += 1;
                     }

                     if (d.getFullYear() === year) {
                       const m = months[d.getMonth()];
                       salesMap[m].bookings += (Number(b.guests) || 1); // Assuming guests count or just 1
                     }
                   });

                   pageViews.forEach(v => {
                     let d = v.timestamp?.toDate ? v.timestamp.toDate() : (v.timestamp ? new Date(v.timestamp) : new Date());
                     if(isNaN(d.getTime())) return;
                     
                     if (d.toDateString() === todayStr) {
                        todayViews += 1;
                     }

                     if (d.getFullYear() === year) {
                       const m = months[d.getMonth()];
                       salesMap[m].views += 1;
                     }
                   });

                   const salesData = Object.values(salesMap);
                   
                   const sortedItems = Object.values(itemCounts).sort((a: any, b: any) => b.qty - a.qty).slice(0, 5) as any[];
                   const topItemQty = sortedItems.length > 0 ? sortedItems[0].qty : 1;
                   const topItems = sortedItems.map(item => ({
                     ...item,
                     width: `${Math.max((item.qty / topItemQty) * 100, 5)}%` // min width 5%
                   }));

                   return { salesData, topItems, monthToDateRevenue, todayRevenue, todayOrders, pendingOrders, todayBookings, todayViews };
                 };

                 const { salesData, topItems, monthToDateRevenue, todayRevenue, todayOrders, pendingOrders, todayBookings, todayViews } = processData(overviewYear);

                 return (
                   <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                     <div className="flex items-center justify-between mb-2">
                       <div>
                         <h3 className="text-xl font-bold text-slate-800">Business Overview</h3>
                         <p className="text-sm font-medium text-slate-500 mt-1">Review your restaurant's performance</p>
                       </div>
                       <select value={overviewYear} onChange={(e) => setOverviewYear(parseInt(e.target.value))} className="bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 shadow-sm">
                         <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                         <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                         <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
                       </select>
                     </div>

                     {/* Operations Center */}
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                       <div className="bg-blue-600 p-6 rounded-2xl border border-blue-700 shadow-sm shadow-blue-500/20">
                         <p className="text-blue-200 text-xs font-black uppercase tracking-widest mb-1.5">Today's Sales</p>
                         <p className="text-3xl font-black text-white leading-none">₹ {todayRevenue.toLocaleString()}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                         <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1.5">Today's Orders</p>
                         <p className="text-3xl font-black text-[#363636] leading-none">{todayOrders}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                         <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1.5">Pending Orders</p>
                         <p className="text-3xl font-black text-[#363636] leading-none">{pendingOrders}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                         <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1.5">Today's Bookings</p>
                         <p className="text-3xl font-black text-[#363636] leading-none">{todayBookings}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                         <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1.5">Today's Visitors</p>
                         <p className="text-3xl font-black text-[#363636] leading-none">{todayViews}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                         <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1.5">M-TD Revenue</p>
                         <p className="text-3xl font-black text-[#363636] leading-none">₹ {monthToDateRevenue >= 100000 ? (monthToDateRevenue / 100000).toFixed(2) + 'L' : monthToDateRevenue.toLocaleString()}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                         <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1.5">Reviews Count</p>
                         <p className="text-3xl font-black text-[#363636] leading-none">{(formData as any).reviewsCount || 0}</p>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                         <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1.5">Menu Items</p>
                         <p className="text-3xl font-black text-[#363636] leading-none">{formData.liveMenu?.length || 0}</p>
                       </div>
                     </div>

                     {/* Charts Section */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       {/* Revenue Overview */}
                       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                         <div className="mb-6">
                           <h4 className="text-lg font-bold text-slate-800">Monthly Revenue</h4>
                           <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">Across {overviewYear}</p>
                         </div>
                         <div className="h-[300px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <defs>
                                 <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                   <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                 </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                               <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={(val) => `₹${val >= 1000 ? val/1000 + 'k' : val}`} />
                               <RechartsTooltip 
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                  itemStyle={{ fontWeight: 700 }}
                                  formatter={(value: any) => [`₹${parseInt(value).toLocaleString()}`, 'Revenue']}
                               />
                               <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                             </AreaChart>
                           </ResponsiveContainer>
                         </div>
                       </div>
                       
                       {/* Page Views Overview */}
                       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                         <div className="mb-6">
                           <h4 className="text-lg font-bold text-slate-800">Store Page Views</h4>
                           <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">Across {overviewYear}</p>
                         </div>
                         <div className="h-[250px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <defs>
                                 <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                   <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                 </linearGradient>
                               </defs>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                               <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={(val) => `${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`} />
                               <RechartsTooltip 
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                  itemStyle={{ fontWeight: 700 }}
                                  formatter={(value: any) => [parseInt(value).toLocaleString(), 'Views']}
                               />
                               <Area type="monotone" dataKey="views" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                             </AreaChart>
                           </ResponsiveContainer>
                         </div>
                       </div>

                       {/* Bookings Vs Orders */}
                       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                         <div className="mb-6">
                           <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Order vs Bookings Vol.</h4>
                           <p className="text-xs font-semibold text-slate-500 mt-1">Comparison across {overviewYear}</p>
                         </div>
                         <div className="h-[250px] w-full">
                           <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={salesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                               <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                               <RechartsTooltip 
                                  cursor={{fill: '#f8fafc'}}
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                               />
                               <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} iconType="circle" />
                               <Bar dataKey="orders" name="Takeaway Orders" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
                               <Bar dataKey="bookings" name="Dine-in Bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                             </BarChart>
                           </ResponsiveContainer>
                         </div>
                       </div>

                       {/* Top Items */}
                       <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                         <div className="mb-6">
                           <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Top Selling Items</h4>
                           <p className="text-xs font-semibold text-slate-500 mt-1">Highest order volume in {overviewYear}</p>
                         </div>
                         <div className="flex-1 flex flex-col gap-4 justify-center">
                           {topItems.length > 0 ? topItems.map((item, i) => (
                             <div key={i}>
                               <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                                 <span>{item.name} <span className="text-slate-400 font-semibold ml-1">({item.qty} served)</span></span>
                                 <span className="text-[#363636]">₹{(item.rev >= 1000 ? (item.rev/1000).toFixed(1) + 'k' : item.rev)}</span>
                               </div>
                               <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-600 rounded-full" style={{ width: item.width }}></div>
                               </div>
                             </div>
                           )) : (
                             <div className="text-center text-slate-400 font-medium py-8 text-sm">
                               No order data for {overviewYear} yet
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                     <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
                       <div className="mb-6">
                         <h4 className="text-lg font-bold text-slate-800">Recent Store Visitors</h4>
                         <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-widest">Latest 10 unique views</p>
                       </div>
                       {pageViews.length > 0 ? (
                         <div className="divide-y divide-slate-100">
                           {[...pageViews]
                             .sort((a, b) => {
                               const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : Date.now());
                               const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : Date.now());
                               return timeB - timeA;
                             })
                             .slice(0, 10)
                             .map((view, i) => (
                             <div key={i} className="py-3 flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase text-sm">
                                   {view.userName ? view.userName.charAt(0) : '?'}
                                 </div>
                                 <div>
                                   <p className="text-sm font-bold text-slate-800">{view.userId ? view.userName : 'Guest User'}</p>
                                   <p className="text-xs font-medium text-slate-500">{view.userId ? 'Registered User' : 'Unregistered Visitor'}</p>
                                 </div>
                               </div>
                               <div className="text-right">
                                 <p className="text-xs font-bold text-slate-600">
                                   {(() => {
                                      const viewDate = view.timestamp?.toDate ? view.timestamp.toDate() : (view.timestamp ? new Date(view.timestamp) : new Date());
                                      return isNaN(viewDate.getTime()) ? 'Just now' : viewDate.toLocaleDateString();
                                   })()}
                                 </p>
                                 <p className="text-[10px] font-semibold text-slate-400">
                                   {(() => {
                                      const viewDate = view.timestamp?.toDate ? view.timestamp.toDate() : (view.timestamp ? new Date(view.timestamp) : new Date());
                                      return isNaN(viewDate.getTime()) ? '' : viewDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                   })()}
                                 </p>
                               </div>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center text-slate-400 font-medium py-8 text-sm">
                           No recorded visitors yet
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })()}

               {activeTab === 'analytics' && (
                 <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                     <BarChart3 size={32} className="text-blue-600" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">Deep Analytics Coming Soon</h3>
                   <p className="text-slate-500 max-w-md">We are building an advanced analytics dashboard with hourly trends, conversion rates, and deeper insights.</p>
                 </div>
               )}
               
               {activeTab === 'reviews' && (
                 <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                     <MessageSquare size={32} className="text-blue-600" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">Review Management Coming Soon</h3>
                   <p className="text-slate-500 max-w-md">Soon you will be able to read, reply to, and analyze customer reviews directly from this dashboard.</p>
                 </div>
               )}
               
               {activeTab === 'bookingSettings' && renderBookingSettingsTab()}
               
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
                       <div className="md:col-span-2">
                         <div><label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Mall / Food Court Name (Optional - Only for outlets)</label><select value={formData.mallName || ''} onChange={(e) => updateForm('mallName', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all shadow-sm appearance-none"><option value="">None (Standalone Outlet)</option>{malls.filter((m: any) => !formData.city || m.city?.toLowerCase() === formData.city?.toLowerCase()).sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")).map((m: any) => (<option key={m.id} value={m.name}>{m.name}</option>))}</select></div>
                       </div>
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
                           {cuisineArray.filter((x:any) => !sortedCuisines.find(c => c.name === x)).map((custom: any, cIdx: number) => (
                             <span key={`${custom}-${cIdx}`} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-300">
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

                     <div>
                       <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Associate Collections (Optional)</label>
                       <div className="flex flex-wrap gap-2 mb-4">
                         {sortedCollections.map(c => {
                           const collectionArray = Array.isArray(formData.collections) ? formData.collections : typeof formData.collections === 'string' ? (formData.collections as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                           const isSelected = collectionArray.includes(c.slug);
                           return (
                             <button
                               key={c.slug}
                               type="button"
                               onClick={() => {
                                 if (isSelected) updateForm('collections', collectionArray.filter((x:any) => x !== c.slug));
                                 else updateForm('collections', [...collectionArray, c.slug]);
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
                        <div className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded-xl">
                          <Toggle 
                            label="QR Menu Ordering"
                            checked={formData.isQrMenuEnabled}
                            onChange={async (newVal: boolean) => {
                              updateForm('isQrMenuEnabled', newVal);
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
                          />
                        </div>
                        <button onClick={() => {
                          setNewItemData({ name: '', price: '', description: '', isAvailable: true, category: '', isVeg: true, image: '' });
                          setIsAddItemModalOpen(true);
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
                            value={`${window.location.origin}/qr-menu/${selectedRes?.id}?table=${encodeURIComponent(qrTableTarget || '1')}`} 
                            size={400}
                            style={{ width: 120, height: 120 }}
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
                              placeholder="Enter Table Number (e.g. 5, A2) defaults to 1" 
                              className="w-full max-w-[240px] px-4 py-2 border border-slate-200 rounded-xl text-sm mb-2 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <a 
                              href={`/qr-menu/${selectedRes?.id}?table=${encodeURIComponent(qrTableTarget || '1')}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="px-5 py-2 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm hover:shadow active:scale-95 transition-all w-fit"
                            >
                              Open {qrTableTarget ? 'Table '+qrTableTarget+' ' : 'Table 1 '}Menu Link
                            </a>
                            <button
                              onClick={() => { handleGenerateQRAsset('download'); }}
                              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all w-fit border border-slate-200"
                            >
                              Download QR (PNG)
                            </button>
                            <button
                              onClick={() => { handleGenerateQRAsset('print'); }}
                              className="px-5 py-2 bg-white border border-slate-300 text-[#363636] rounded-full flex items-center gap-2 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm shrink-0"
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
                        <>
                          <div className="flex flex-col gap-4">
                            <div className="relative w-full">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <Search size={18} />
                              </span>
                              <input 
                                type="text" 
                                placeholder="Search menu by name or ID..." 
                                value={menuSearchQuery} 
                                onChange={e => setMenuSearchQuery(e.target.value)} 
                                className="w-full bg-white border border-slate-200 focus:border-blue-600 pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 outline-none shadow-sm transition-colors"
                              />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                              {['All', ...Array.from(new Set(formData.liveMenu.map(item => item.category?.trim() || 'Uncategorized')))].map(cat => (
                                <button
                                  key={cat}
                                  onClick={() => setActiveMenuCategory(cat)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap border",
                                    activeMenuCategory === cat 
                                      ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm" 
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  )}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {formData.liveMenu.map((item, idx) => ({ item, idx }))
                              .filter(({ item }) => activeMenuCategory === 'All' || (item.category?.trim() || 'Uncategorized') === activeMenuCategory)
                              .filter(({ item }) => {
                                if (!menuSearchQuery) return true;
                                const q = menuSearchQuery.toLowerCase();
                                return item.name?.toLowerCase().includes(q) || item.id?.toString().toLowerCase().includes(q);
                              })
                              .map(({ item, idx }) => (
                                <div key={`${item.id}-${idx}`} className="bg-white border border-slate-200 p-3 rounded-xl relative flex items-center gap-4 shadow-sm hover:border-slate-300 transition-colors group">
                                   <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                      {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <Utensils size={20} className="text-slate-300" />}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2">
                                          <div className="w-3.5 h-3.5 border border-slate-200 rounded-sm flex items-center justify-center shrink-0 bg-white">
                                            {item.isVeg !== false ? <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div> : <div className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-b-[6px] border-solid border-transparent border-b-red-600"></div>}
                                          </div>
                                          <span className="font-bold text-[#363636] truncate">{item.name}</span>
                                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">ID: {item.id}</span>
                                       </div>
                                       <div className="text-xs font-bold text-slate-500 mt-1 truncate">
                                          ₹{item.price} {item.category ? `• ${item.category}` : ''}
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-4 shrink-0">
                                       <div className="flex items-center gap-2">
                                         <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hidden sm:block">{item.isAvailable !== false ? 'In Stock' : 'Out of Stock'}</span>
                                         <label className="relative inline-flex items-center cursor-pointer">
                                           <input type="checkbox" className="sr-only peer" checked={item.isAvailable !== false} onChange={async (e) => {
                                             const newMenu = [...formData.liveMenu!]; newMenu[idx].isAvailable = e.target.checked; updateForm('liveMenu', newMenu); await handleSave({ ...formData, liveMenu: newMenu });
                                           }} />
                                           <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                                         </label>
                                       </div>
                                       
                                       <div className="relative">
                                          <button 
                                            onClick={() => setOpenMenuDropdown(openMenuDropdown === idx ? null : idx)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                          >
                                            <MoreVertical size={18} />
                                          </button>
                                          {openMenuDropdown === idx && (
                                            <>
                                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuDropdown(null)}></div>
                                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden py-1">
                                                <button 
                                                  onClick={() => {
                                                    setEditingItemIndex(idx);
                                                    setNewItemData({...item});
                                                    setIsAddItemModalOpen(true);
                                                    setOpenMenuDropdown(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                  <SlidersHorizontal size={14} className="text-slate-400" />
                                                  Manage Details
                                                </button>
                                                <button 
                                                  onClick={() => {
                                                    setEditingCustomizationsForItem(idx);
                                                    setOpenMenuDropdown(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                  <SlidersHorizontal size={14} className="text-slate-400" />
                                                  Manage Customizations
                                                </button>
                                                <div className="h-px bg-slate-100 my-1"></div>
                                                <button 
                                                  onClick={() => {
                                                    setItemToDelete(idx);
                                                    setOpenMenuDropdown(null);
                                                  }}
                                                  className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                >
                                                  <Trash2 size={14} />
                                                  Remove Item
                                                </button>
                                              </div>
                                            </>
                                          )}
                                       </div>
                                   </div>
                                </div>
                              ))}
                          </div>
                        </>
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
                            <div key={`${ad.id || 'ad'}-${idx}`} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
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

      {/* Delete Item Confirm Modal */}
      {itemToDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Remove Item</h3>
            <p className="text-slate-600 mb-6">Are you sure you want to remove this item from your menu? This action cannot be undone.</p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setItemToDelete(null)} 
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  const newMenu = [...formData.liveMenu!];
                  newMenu.splice(itemToDelete, 1);
                  updateForm('liveMenu', newMenu);
                  setItemToDelete(null);
                  await handleSave({ ...formData, liveMenu: newMenu });
                }} 
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                disabled={saving}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Remove
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white md:rounded-[32px] shadow-2xl w-full h-full md:w-[95vw] md:h-[95vh] md:max-w-none overflow-hidden relative flex flex-col">
            <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-300 flex justify-between items-center relative overflow-hidden shrink-0">
               <div className="relative z-10">
                 <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">{editingItemIndex !== null ? 'Manage Menu Item' : 'Add Menu Item'}</h2>
                 <p className="text-slate-500 font-semibold text-xs mt-1">{editingItemIndex !== null ? 'Update details for this item' : 'Create a new dish for your menu'}</p>
               </div>
               <button onClick={() => { setIsAddItemModalOpen(false); setEditingItemIndex(null); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm relative z-10 transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8">
               <div className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1 space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Item Name *</label>
                         <input required type="text" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/50 px-4 py-3 rounded-xl font-bold text-[#363636] outline-none transition-all shadow-sm" value={newItemData.name} onChange={e => setNewItemData({...newItemData, name: e.target.value})} placeholder="Gourmet Burger" />
                       </div>
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                         <input type="text" list="add-item-category-list" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/50 px-4 py-3 rounded-xl font-bold text-[#363636] outline-none transition-all shadow-sm" value={newItemData.category} onChange={e => setNewItemData({...newItemData, category: e.target.value})} placeholder="e.g. Starters" />
                         <datalist id="add-item-category-list">
                           {allMenuCategories.map((c: any) => <option key={c} value={c} />)}
                         </datalist>
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                       <div>
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Price (₹) *</label>
                         <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                           <input required type="number" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/50 pl-8 pr-4 py-3 rounded-xl font-bold text-[#363636] outline-none transition-all shadow-sm" value={newItemData.price} onChange={e => setNewItemData({...newItemData, price: e.target.value})} placeholder="0" />
                         </div>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 sm:opacity-0 sm:block hidden">Type</label>
                          <div className="flex h-[46px] sm:mt-0 mt-2 items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                             <button 
                               className={`flex-1 h-full text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${newItemData.isVeg !== false ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' : 'text-slate-500 hover:bg-white border border-transparent'}`}
                               onClick={() => setNewItemData({...newItemData, isVeg: true})}
                             >
                               <div className="w-3.5 h-3.5 border-2 border-green-600 rounded-sm flex items-center justify-center shrink-0 bg-white"><div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div></div>
                               Veg
                             </button>
                             <button 
                               className={`flex-1 h-full text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${newItemData.isVeg === false ? 'bg-red-100 text-red-700 shadow-sm border border-red-200' : 'text-slate-500 hover:bg-white border border-transparent'}`}
                               onClick={() => setNewItemData({...newItemData, isVeg: false})}
                             >
                               <div className="w-3.5 h-3.5 border-2 border-red-600 rounded-sm flex items-center justify-center shrink-0 bg-white"><div className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-b-[6px] border-solid border-transparent border-b-red-600"></div></div>
                               Non-Veg
                             </button>
                          </div>
                       </div>
                       <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 sm:opacity-0 sm:block hidden">Stock</label>
                          <div className="flex h-[46px] sm:mt-0 mt-2 items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">In Stock</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={newItemData.isAvailable} onChange={e => setNewItemData({...newItemData, isAvailable: e.target.checked})} />
                              <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                       </div>
                     </div>
                   </div>
                   
                   {newItemData.image && (
                     <div className="w-full md:w-32 lg:w-40 h-40 md:h-auto shrink-0 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative">
                        <img src={newItemData.image} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                     </div>
                   )}
                 </div>

                 <div>
                   <div className="flex justify-between items-center mb-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Description</label>
                     <span className="text-[10px] font-black text-slate-400 tracking-widest">{newItemData.description?.length || 0}/200</span>
                   </div>
                   <textarea className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600/50 px-4 py-3 rounded-xl font-medium text-slate-600 outline-none transition-all shadow-sm resize-none" rows={2} maxLength={200} value={newItemData.description} onChange={e => setNewItemData({...newItemData, description: e.target.value})} placeholder="Describe the item..." />
                 </div>

                 <div>
                   <ImageUploadInput label="Dish Image (Optional)" value={newItemData.image} onChange={(v:any) => setNewItemData({...newItemData, image: v})} />
                 </div>
               </div>
               
               <button onClick={async () => {
                 if (!newItemData.name || !newItemData.price) {
                   showToast("Please provide item name and price.", "error");
                   return;
                 }
                 let newMenu = [...(formData.liveMenu || [])];
                 if (editingItemIndex !== null) {
                    newMenu[editingItemIndex] = { ...newMenu[editingItemIndex], name: newItemData.name, price: parseInt(newItemData.price) || 0, description: newItemData.description, isAvailable: newItemData.isAvailable, category: newItemData.category, isVeg: newItemData.isVeg, image: newItemData.image };
                 } else {
                    let newId = Math.floor(1000 + Math.random() * 9000).toString();
                    while (newMenu.some(item => item.id === newId)) {
                      newId = Math.floor(1000 + Math.random() * 9000).toString();
                    }
                    newMenu.push({ id: newId, name: newItemData.name, price: parseInt(newItemData.price) || 0, description: newItemData.description, isAvailable: newItemData.isAvailable, category: newItemData.category, isVeg: newItemData.isVeg, image: newItemData.image });
                 }
                 const newData = { ...formData, liveMenu: newMenu };
                 updateForm('liveMenu', newMenu);
                 setIsAddItemModalOpen(false);
                 setEditingItemIndex(null);
                 await handleSave(newData);
               }} disabled={saving} className="w-full py-4 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 mt-8 shrink-0">
                 {saving ? <Loader2 size={20} className="animate-spin" /> : (editingItemIndex !== null ? <Save size={20} /> : <Plus size={20} />)}
                 {editingItemIndex !== null ? 'Update Item Details' : 'Add Item to Menu'}
               </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Customizations Modal */}
      {editingCustomizationsForItem !== null && formData.liveMenu && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-300 flex justify-between items-center relative overflow-hidden shrink-0">
               <div className="relative z-10">
                 <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Manage Customizations</h2>
                 <p className="text-sm font-semibold text-slate-500 mt-1">Configure addons and options for {formData.liveMenu[editingCustomizationsForItem]?.name}</p>
               </div>
               <button onClick={() => setEditingCustomizationsForItem(null)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative z-10">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
               {(() => {
                 const item = formData.liveMenu[editingCustomizationsForItem];
                 const customCats = item.customizations || [];

                 return (
                   <div className="space-y-8">
                     {customCats.map((cat, catIdx) => (
                       <div key={cat.id || catIdx} className="border border-slate-200 rounded-2xl p-6 relative bg-white shadow-sm">
                         <button 
                           onClick={() => {
                             const newMenu = [...formData.liveMenu!];
                             const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                             updatedItem.customizations = [...(updatedItem.customizations || [])];
                             updatedItem.customizations.splice(catIdx, 1);
                             newMenu[editingCustomizationsForItem] = updatedItem;
                             updateForm('liveMenu', newMenu);
                           }}
                           className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                         >
                           <Trash2 size={16} />
                         </button>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pr-10">
                           <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category Name</label>
                             <input type="text" list="menu-categories-list" value={cat.name} onChange={(e) => {
                               const val = e.target.value;
                               const newMenu = [...formData.liveMenu!];
                               const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                               updatedItem.customizations = [...(updatedItem.customizations || [])];
                               
                               let newOptions = [...(updatedItem.customizations[catIdx].options || [])];
                               const itemsInCategory = formData.liveMenu!.filter(m => (m.category?.trim() || 'Uncategorized') === val.trim());
                               
                               if (itemsInCategory.length > 0 && (newOptions.length === 0 || (newOptions.length === 1 && !newOptions[0].name))) {
                                 newOptions = itemsInCategory.map(item => ({
                                   name: item.name,
                                   price: item.price || 0,
                                   isVeg: item.isVeg !== false,
                                   isAvailable: item.isAvailable !== false
                                 }));
                               }

                               updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], name: val, options: newOptions };
                               newMenu[editingCustomizationsForItem] = updatedItem;
                               updateForm('liveMenu', newMenu);
                             }} placeholder="e.g. Choose Size, Addons" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 px-4 py-2 rounded-xl font-medium text-slate-600 outline-none" />
                             <datalist id="menu-categories-list">
                               {allMenuCategories.map(c => <option key={c} value={c} />)}
                             </datalist>
                           </div>
                           <div className="flex gap-4">
                             <div className="flex-1">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Required?</label>
                               <select value={cat.required ? "yes" : "no"} onChange={(e) => {
                                 const newMenu = [...formData.liveMenu!];
                                 const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                                 updatedItem.customizations = [...(updatedItem.customizations || [])];
                                 updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], required: e.target.value === 'yes' };
                                 newMenu[editingCustomizationsForItem] = updatedItem;
                                 updateForm('liveMenu', newMenu);
                               }} className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 px-4 py-2 rounded-xl font-medium text-slate-600 outline-none">
                                 <option value="yes">Yes (Must pick)</option>
                                 <option value="no">No (Optional)</option>
                               </select>
                             </div>
                             <div className="w-20">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Max Select</label>
                               <input type="number" min="1" value={cat.maxSelections || ''} onChange={(e) => {
                                 const newMenu = [...formData.liveMenu!];
                                 const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                                 updatedItem.customizations = [...(updatedItem.customizations || [])];
                                 updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], maxSelections: parseInt(e.target.value) || undefined };
                                 newMenu[editingCustomizationsForItem] = updatedItem;
                                 updateForm('liveMenu', newMenu);
                               }} placeholder="1" className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 px-4 py-2 rounded-xl font-medium text-slate-600 outline-none text-center" />
                             </div>
                           </div>
                         </div>

                         <div className="space-y-3">
                           <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Options</h4>
                           {cat.options.map((opt, optIdx) => (
                             <div key={optIdx} className="flex items-center gap-3 bg-slate-50 p-2 pl-4 rounded-xl border border-slate-200">
                               <select value={opt.name || ""} onChange={(e) => {
                                 const selectedItemName = e.target.value;
                                 const selectedItem = formData.liveMenu?.find((m: any) => m.name === selectedItemName);
                                 
                                 const newMenu = [...formData.liveMenu!];
                                 const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                                 updatedItem.customizations = [...(updatedItem.customizations || [])];
                                 const newOptions = [...updatedItem.customizations[catIdx].options];
                                 
                                 newOptions[optIdx] = { 
                                   ...newOptions[optIdx], 
                                   name: selectedItemName,
                                   price: selectedItem ? selectedItem.price : newOptions[optIdx].price,
                                   isVeg: selectedItem ? selectedItem.isVeg : newOptions[optIdx].isVeg
                                 };
                                 
                                 updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], options: newOptions };
                                 newMenu[editingCustomizationsForItem] = updatedItem;
                                 updateForm('liveMenu', newMenu);
                               }} className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 outline-none focus:ring-0 cursor-pointer appearance-none truncate pr-4">
                                 <option value="" disabled>Select from menu...</option>
                                 {formData.liveMenu?.map((m: any, mIdx: number) => (
                                   <option key={`${m.id || m.name}-${mIdx}`} value={m.name}>{m.name} {m.category ? `(${m.category})` : ''}</option>
                                 ))}
                               </select>
                               
                               <div className="relative w-24">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                 <input type="number" value={opt.price} onChange={(e) => {
                                   const newMenu = [...formData.liveMenu!];
                                   const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                                   updatedItem.customizations = [...(updatedItem.customizations || [])];
                                   const newOptions = [...updatedItem.customizations[catIdx].options];
                                   newOptions[optIdx] = { ...newOptions[optIdx], price: parseInt(e.target.value) || 0 };
                                   updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], options: newOptions };
                                   newMenu[editingCustomizationsForItem] = updatedItem;
                                   updateForm('liveMenu', newMenu);
                                 }} placeholder="0" className="w-full bg-white border border-slate-300 focus:border-blue-600 pl-6 pr-2 py-1.5 rounded-lg text-sm font-bold text-slate-700 outline-none" />
                               </div>

                               <button 
                                 onClick={() => {
                                   const newMenu = [...formData.liveMenu!];
                                   const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                                   updatedItem.customizations = [...(updatedItem.customizations || [])];
                                   const newOptions = [...updatedItem.customizations[catIdx].options];
                                   newOptions[optIdx] = { ...newOptions[optIdx], isVeg: opt.isVeg === false ? true : false };
                                   updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], options: newOptions };
                                   newMenu[editingCustomizationsForItem] = updatedItem;
                                   updateForm('liveMenu', newMenu);
                                 }}
                                 className="w-8 h-8 flex items-center justify-center shrink-0 border border-slate-200 bg-white rounded-lg hover:bg-slate-100"
                                 title={opt.isVeg === false ? "Currently Non-Veg, click to change to Veg" : "Currently Veg, click to change to Non-Veg"}
                               >
                                 {opt.isVeg === false ? (
                                   <div className="w-3.5 h-3.5 border-2 border-red-600 rounded-sm flex items-center justify-center shrink-0 bg-white"><div className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-b-[6px] border-solid border-transparent border-b-red-600"></div></div>
                                 ) : (
                                   <div className="w-3.5 h-3.5 border-2 border-green-600 rounded-sm flex items-center justify-center shrink-0 bg-white"><div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div></div>
                                 )}
                               </button>

                               <button 
                                 onClick={() => {
                                   const newMenu = [...formData.liveMenu!];
                                   const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                                   updatedItem.customizations = [...(updatedItem.customizations || [])];
                                   const newOptions = [...updatedItem.customizations[catIdx].options];
                                   newOptions[optIdx] = { ...newOptions[optIdx], isAvailable: opt.isAvailable === false ? true : false };
                                   updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], options: newOptions };
                                   newMenu[editingCustomizationsForItem] = updatedItem;
                                   updateForm('liveMenu', newMenu);
                                 }}
                                 className={`w-8 h-8 flex items-center justify-center shrink-0 border rounded-lg transition-colors ${opt.isAvailable === false ? 'border-red-200 bg-red-50 text-red-500' : 'border-green-200 bg-green-50 text-green-600'}`}
                                 title={opt.isAvailable === false ? "Currently Out of Stock, click to mark In Stock" : "Currently In Stock, click to mark Out of Stock"}
                               >
                                 {opt.isAvailable === false ? <X size={16} /> : <CheckCircle size={16} />}
                               </button>

                               <button onClick={() => {
                                 const newMenu = [...formData.liveMenu!];
                                 const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                                 updatedItem.customizations = [...(updatedItem.customizations || [])];
                                 const newOptions = [...updatedItem.customizations[catIdx].options];
                                 newOptions.splice(optIdx, 1);
                                 updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], options: newOptions };
                                 newMenu[editingCustomizationsForItem] = updatedItem;
                                 updateForm('liveMenu', newMenu);
                               }} className="w-8 h-8 flex items-center justify-center shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                 <X size={16} />
                               </button>
                             </div>
                           ))}

                           <button onClick={() => {
                             const newMenu = [...formData.liveMenu!];
                             const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                             updatedItem.customizations = [...(updatedItem.customizations || [])];
                             const newOptions = [...updatedItem.customizations[catIdx].options, { name: '', price: 0, isVeg: true }];
                             updatedItem.customizations[catIdx] = { ...updatedItem.customizations[catIdx], options: newOptions };
                             newMenu[editingCustomizationsForItem] = updatedItem;
                             updateForm('liveMenu', newMenu);
                           }} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2">
                             <Plus size={14} /> Add Option
                           </button>
                         </div>
                       </div>
                     ))}

                     <button onClick={() => {
                       const newMenu = [...formData.liveMenu!];
                       const updatedItem = { ...newMenu[editingCustomizationsForItem] };
                       updatedItem.customizations = [...(updatedItem.customizations || []), { id: Date.now().toString(), name: '', options: [{ name: '', price: 0, isVeg: true }], required: false, maxSelections: 1 }];
                       newMenu[editingCustomizationsForItem] = updatedItem;
                       updateForm('liveMenu', newMenu);
                     }} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-bold hover:border-blue-600 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                       <Plus size={18} />
                       Add Customization Category
                     </button>
                   </div>
                 );
               })()}
            </div>
            
            <div className="p-6 md:p-8 border-t border-slate-200 bg-slate-50 shrink-0">
               <button 
                 onClick={async () => {
                   setEditingCustomizationsForItem(null);
                   await handleSave();
                 }}
                 disabled={saving}
                 className="w-full bg-[#363636] hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
               >
                 {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                 Save Customizations
               </button>
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
