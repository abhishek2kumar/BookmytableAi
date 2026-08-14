import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { QRCodeCanvas } from 'qrcode.react';
import { db, storage } from '../lib/firebase';
import AppIcon from './AppIcon';
import { ConfirmModal } from './ConfirmModal';
import { Restaurant, LiveMenuItem, Offer } from '../types';
import { Loader2, ImagePlus, UtensilsCrossed, LogOut, Store, MapPin, Image as ImageIcon, ChevronRight, ChevronDown, Info, Clock, Utensils, Tag, Save, Eye, Plus, X, Star, Calendar, Users, Trash2, ShoppingBag, CheckCircle, AlertCircle, UploadCloud, Megaphone, Upload, Video, BarChart3, MessageSquare, LayoutDashboard, SlidersHorizontal, MoreVertical, Search, Printer, QrCode } from 'lucide-react';
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
      { id: 'orders', label: 'Takeaway Orders', icon: ShoppingBag },
      { id: 'bookings', label: 'Table Bookings', icon: Calendar },
    ]
  },
  {
    title: 'Menu & Content',
    tabs: [
      { id: 'menu', label: 'Live Menu', icon: Utensils },
      { id: 'qr-codes', label: 'QR Codes', icon: QrCode },
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
      { id: 'staff', label: 'Staff Access', icon: Users },
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
const FieldLabel = ({ label, tooltip }: { label: string, tooltip?: string }) => (
  <label className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
    {label}
    {tooltip && (
      <div className="relative group inline-block ml-1.5 cursor-help">
        <Info size={14} className="text-slate-400 hover:text-blue-500 transition-colors" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-56 p-2.5 bg-slate-800 text-white text-xs font-medium normal-case rounded-lg shadow-xl z-50 whitespace-normal text-center leading-relaxed">
          {tooltip}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-slate-800"></div>
        </div>
      </div>
    )}
  </label>
);

const InputText = ({ label, value, onChange, placeholder = '', disabled = false, tooltip = '' }: any) => (
  <div>
    <FieldLabel label={label} tooltip={tooltip} />
    <input type="text" disabled={disabled} value={value || ''} onChange={e => !disabled && onChange(e.target.value)} placeholder={placeholder} className={cn("w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all shadow-sm", disabled && "opacity-50 cursor-not-allowed")} />
  </div>
);

const ImageUploadInput = ({ label, value, onChange, placeholder = '', tooltip = '', onError }: any) => {
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
          if (onError) onError("Image upload failed");
          else alert("Image upload failed");
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
      {label && <FieldLabel label={label} tooltip={tooltip} />}
      <div className="flex flex-col gap-3">
        <div className="relative w-full shrink-0">
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
        <div className="text-center shrink-0 -my-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">OR Provide URL</span>
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

const TextArea = ({ label, value, onChange, placeholder = '', tooltip = '' }: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div>
      <FieldLabel label={label} tooltip={tooltip} />
      <textarea 
        ref={textareaRef}
        value={value || ''} 
        onChange={e => {
          onChange(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }} 
        placeholder={placeholder} 
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all resize-none shadow-sm overflow-hidden min-h-[120px]" 
      />
    </div>
  );
};

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
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [staffFormError, setStaffFormError] = useState<string | null>(null);
  const [newStaffForm, setNewStaffForm] = useState({ name: '', email: '', password: '' });
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [takeawayOrders, setTakeawayOrders] = useState<any[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'today' | 'upcoming' | 'previous'>('today');
  const [pageViews, setPageViews] = useState<any[]>([]);

  const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
  const unreadConfirmedBookingsCount = bookings.filter(b => b.status === 'confirmed' && !b.ownerViewed).length;
  const pendingOrdersCount = takeawayOrders.filter(o => o.type !== 'dine_in' && !['Completed', 'Cancelled'].includes(o.status)).length;
  const totalBookingsBadge = pendingBookingsCount + unreadConfirmedBookingsCount;

  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [addImageModal, setAddImageModal] = useState<{ field: string, label: string, isStringArrayOnly: boolean, catIdx?: number } | null>(null);
  const [newImageForm, setNewImageForm] = useState({ url: '', category: '' });
  
  const [addMenuCategoryModal, setAddMenuCategoryModal] = useState(false);
  const [newMenuCategoryName, setNewMenuCategoryName] = useState('');
  
  const [addSignatureDishModal, setAddSignatureDishModal] = useState(false);
  const [newSignatureDish, setNewSignatureDish] = useState({ name: '', price: 0, description: '' });
  
  const [addOfferModal, setAddOfferModal] = useState(false);
  const [addAdModal, setAddAdModal] = useState(false);
  const [newAdForm, setNewAdForm] = useState({ title: '', description: '', image: '', validFrom: '' });
  const [newOffer, setNewOffer] = useState({ title: '', description: '', validFrom: '', validUntil: '' });
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
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [adUploadIndex, setAdUploadIndex] = useState<number | null>(null);
  const adFileInputRef = useRef<HTMLInputElement>(null);

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
        updateDoc(doc(db, 'bookings', b.id), { ownerViewed: true, updatedAt: serverTimestamp() }).catch(e => console.error("Failed to mark viewed", e));
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
        [feature]: value,
        updatedAt: serverTimestamp()
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

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffFormError(null);
    if (!newStaffForm.email || !newStaffForm.password || !selectedRes) return;
    
    setCreatingStaff(true);
    try {
      let secondaryApp;
      try {
        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp_" + Date.now());
      } catch (e: any) {
        if (e.code === 'app/duplicate-app') {
          const { getApp } = await import('firebase/app');
          secondaryApp = getApp("SecondaryApp_" + Date.now());
        } else {
          throw e;
        }
      }
      
      const { setPersistence, inMemoryPersistence } = await import('firebase/auth');
      const secondaryAuth = getAuth(secondaryApp);
      await setPersistence(secondaryAuth, inMemoryPersistence);
      
      let newUserId = '';
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, newStaffForm.email, newStaffForm.password);
        newUserId = cred.user.uid;
      } catch (e: any) {
        if (e.code === 'auth/email-already-in-use') {
          setStaffFormError('User email already exists. To link them to this restaurant, please ask the admin to edit this restaurant and add their email manually.');
          setCreatingStaff(false);
          return;
        } else {
          throw e;
        }
      } finally {
        await secondaryAuth.signOut();
      }

      // Add to users collection
      if (newUserId) {
        await updateDoc(doc(db, 'restaurants', selectedRes.id), {
          partnerEmails: [...(selectedRes.partnerEmails || []), newStaffForm.email],
          updatedAt: serverTimestamp()
        });
      }

      setNotification({ type: 'success', message: 'Staff account created successfully.' });
      setIsAddingStaff(false);
      setNewStaffForm({ name: '', email: '', password: '' });
    } catch (err: any) {
      console.error(err);
      setStaffFormError(err.message);
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleRemoveStaff = async (emailToRemove: string) => {
    if (!selectedRes) return;
    const confirm = window.confirm(`Remove access for ${emailToRemove}?`);
    if (!confirm) return;
    
    const newEmails = (selectedRes.partnerEmails || []).filter(e => e !== emailToRemove);
    try {
      await updateDoc(doc(db, 'restaurants', selectedRes.id), {
        partnerEmails: newEmails,
        updatedAt: serverTimestamp()
      });
      setNotification({ type: 'success', message: 'Staff access removed.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Error removing staff' });
    }
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
    
    const allowedKeys = [
      'name', 'description', 'cuisine', 'avgPrice', 'image', 'location', 'city', 'contactNumber',
      'isOpen', 'aiSummary', 'aiSummaryUpdatedAt', 'facilities', 
      'offers', 'signatureDishes', 'menuImages', 'openingHours', 'secondaryImages', 'updatedAt',
      'dailyTimings', 'isBookingEnabled', 'bookingSlots', 'instantBookingLimit', 
      'blackoutDates', 'slotCategories', 'lastModifiedBy', 'lastModifiedByType', 'menuCategories',
      'address', 'lat', 'lng', 'liveMenu', 'isQrMenuEnabled', 'partnerEmails', 'advertisements',
      'email', 'floor', 'shopNo', 'area', 'landmark', 'state', 'pincode', 'rating', 'reviewsCount', 
      'foodImages', 'ambienceImages', 'collections', 'mallName', 'isTakeawayEnabled', 
      'autoApprovalThresholds', 'blackoutSlots'
    ];
    
    const finalData: any = {};
    for (const key of allowedKeys) {
      if (cleanData[key] !== undefined) {
        finalData[key] = cleanData[key];
      }
    }
    finalData.updatedAt = serverTimestamp();

    try {
      const docRef = doc(db, 'restaurants', selectedRes.id);
      await updateDoc(docRef, finalData);
      
      // Update local state
      const updatedRes = { ...selectedRes, ...finalData } as Restaurant;
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

  const handleDeleteImage = async (field: 'secondaryImages' | 'foodImages' | 'ambienceImages', imgIdx: number, imgUrl: string, label: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Image',
      message: `Do you want to delete this image from ${label}?`,
      onConfirm: async () => {
        const arr = [...(formData[field] || [])];
        arr.splice(imgIdx, 1);
        updateForm(field, arr);
        if (selectedRes?.id) {
          try {
            const docRef = doc(db, 'restaurants', selectedRes.id);
            await updateDoc(docRef, { [field]: arr, updatedAt: serverTimestamp() });
            if (imgUrl && imgUrl.includes('firebasestorage.googleapis.com')) {
              const storageRef = ref(storage, imgUrl);
              await deleteObject(storageRef);
            }
          } catch (error) {
            console.error("Failed to delete image:", error);
          }
        }
      }
    });
  };

  const renderImageInputList = (label: string, field: 'secondaryImages' | 'foodImages' | 'ambienceImages', tooltip?: string) => {
    const isStringArrayOnly = field === 'foodImages' || field === 'ambienceImages';
    return (
    <div className="py-8 border-b border-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-4">
        <div>
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">{label}</h3>
           {tooltip && <p className="text-sm text-slate-500 mt-1">{tooltip}</p>}
        </div>
        <button onClick={() => {
          setNewImageForm({ url: '', category: '' });
          setAddImageModal({ field, label, isStringArrayOnly });
        }} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-all w-full sm:w-auto shadow-sm shadow-blue-100">
          <Plus size={16} /> Add Image
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {(!formData[field] || formData[field].length === 0) ? (
           <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
               <ImageIcon size={24} />
             </div>
             <p>No images added yet.</p>
           </div>
        ) : formData[field].map((item: any, idx: number) => {
          const urlStr = typeof item === 'string' ? item : item.url;
          const categoryStr = typeof item === 'string' ? '' : (item.category || '');

          return (
          <div key={idx} className="group relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
             <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteImage(field, idx, urlStr, label); }} className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                <Trash2 size={16} />
             </button>
             {urlStr ? (
               <img src={urlStr} alt={`Preview ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                 <ImageIcon size={28} />
                 <span className="text-xs font-medium">Empty</span>
               </div>
             )}
             {!isStringArrayOnly && (
               <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <input
                    type="text"
                    placeholder="Set category..."
                    value={categoryStr}
                    onChange={(e) => {
                      const arr = [...formData[field]!];
                      arr[idx] = { url: urlStr, category: e.target.value };
                      updateForm(field, arr as any);
                    }}
                    className="w-full px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-xs font-medium backdrop-blur-md"
                  />
               </div>
             )}
             {!isStringArrayOnly && categoryStr && (
               <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity duration-300">
                  <span className="text-xs font-bold text-white drop-shadow-sm truncate">{categoryStr}</span>
               </div>
             )}
          </div>
        )})}
      </div>
    </div>
  );
  };

  const handleDeleteCategoryImage = async (catIdx: number, imgIdx: number, imgUrl: string, catName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Image',
      message: `Do you want to delete this image from ${catName || 'this category'}?`,
      onConfirm: async () => {
        const arr = [...(formData.menuCategories || [])];
        const imgs = [...arr[catIdx].images];
        imgs.splice(imgIdx, 1);
        arr[catIdx] = { ...arr[catIdx], images: imgs };
        updateForm('menuCategories', arr);
        if (selectedRes?.id) {
          try {
            const docRef = doc(db, 'restaurants', selectedRes.id);
            await updateDoc(docRef, { menuCategories: arr, updatedAt: serverTimestamp() });
            if (imgUrl && imgUrl.includes('firebasestorage.googleapis.com')) {
              const storageRef = ref(storage, imgUrl);
              await deleteObject(storageRef);
            }
          } catch (error) {
            console.error("Failed to delete image:", error);
          }
        }
      }
    });
  };

  const renderMenuCategories = () => (
    <div className="py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-4">
        <div>
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Menu Images</h3>
           <p className="text-sm text-slate-500 mt-1">Organize your menu images into categories like 'Starters', 'Main Course', 'Desserts', etc.</p>
        </div>
        <button onClick={() => {
          setNewMenuCategoryName('');
          setAddMenuCategoryModal(true);
        }} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm transition-all w-full sm:w-auto shadow-sm shadow-blue-100">
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="space-y-8">
        {(!formData.menuCategories || formData.menuCategories.length === 0) ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
               <ImageIcon size={24} />
             </div>
             <p>No menu categories added yet.</p>
          </div>
        ) : formData.menuCategories.map((cat, catIdx) => (
          <div key={cat.id || catIdx} className="bg-slate-50/50 border border-slate-200 rounded-3xl p-6 relative group transition-all hover:shadow-sm">
             <button onClick={() => {
                const arr = [...formData.menuCategories!];
                arr.splice(catIdx, 1);
                updateForm('menuCategories', arr);
             }} className="absolute top-6 right-6 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                <Trash2 size={16} />
             </button>
             
             <div className="mb-6 pr-12">
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
                  className="w-full lg:w-1/2 px-4 py-3 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium bg-white"
                />
             </div>
             
             <div className="flex items-center justify-between mb-4 border-t border-slate-200 pt-6">
               <h4 className="text-sm font-bold text-slate-700"></h4>
               <button onClick={() => {
                  setNewImageForm({ url: '', category: '' });
                  setAddImageModal({ field: 'menuCategories', label: 'Image for ' + cat.name, isStringArrayOnly: true, catIdx: catIdx } as any);
               }} className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm shadow-blue-100">
                  <Plus size={14} /> Add Image
               </button>
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {(!cat.images || cat.images.length === 0) ? (
                   <div className="col-span-full py-8 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 font-medium text-xs">
                     No images in this category.
                   </div>
                ) : cat.images.map((imgUrl, imgIdx) => (
                  <div key={imgIdx} className="group/img relative aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
                     <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteCategoryImage(catIdx, imgIdx, imgUrl, cat.name); }} className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm opacity-0 group-hover/img:opacity-100 scale-90 group-hover/img:scale-100">
                        <Trash2 size={16} />
                     </button>
                     {imgUrl ? (
                       <img src={imgUrl} alt={`Preview ${imgIdx}`} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                     ) : (
                       <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                         <ImageIcon size={24} />
                         <span className="text-xs font-medium">Empty</span>
                       </div>
                     )}
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
      return new Date(0);
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
        await updateDoc(doc(db, 'bookings', bookingId), { status: newStatus, updatedAt: serverTimestamp() });
      } catch (err) {
        console.error("Failed to update status", err);
      }
    };

    let displayBookings = todayBookings;
    if (bookingFilter === 'upcoming') displayBookings = upcomingBookings;
    if (bookingFilter === 'previous') displayBookings = previousBookings;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden gap-6 md:gap-4">
           <div>
             <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Table Reservations</h2>
             <p className="text-slate-500 text-xs font-semibold mt-1">Manage all your table bookings.</p>
           </div>
           <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-center gap-2 mr-0 md:mr-4 border-r-0 md:border-r border-slate-200 pr-0 md:pr-4">
               <span className="text-sm font-bold text-slate-700">Accepting Bookings</span>
               <button 
                 onClick={() => toggleFeature('isBookingEnabled', !selectedRes?.isBookingEnabled)}
                 className={cn("w-12 h-6 rounded-full transition-colors relative", selectedRes?.isBookingEnabled ? "bg-green-500" : "bg-slate-300")}
               >
                 <div className={cn("w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm", selectedRes?.isBookingEnabled ? "left-[26px]" : "left-[2px]")} />
               </button>
             </div>
             <button onClick={() => setShowNewBookingModal(true)} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-auto md:ml-0">
                <Plus size={18} />
                New Booking
             </button>
           </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
           <button onClick={() => setBookingFilter('today')} className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap", bookingFilter === 'today' ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Today's Bookings ({todayBookings.length})</button>
           <button onClick={() => setBookingFilter('upcoming')} className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap", bookingFilter === 'upcoming' ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Upcoming ({upcomingBookings.length})</button>
           <button onClick={() => setBookingFilter('previous')} className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap", bookingFilter === 'previous' ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50")}>Previous ({previousBookings.length})</button>
        </div>

        <div>
          {displayBookings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
               <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
               <p className="text-sm font-bold text-slate-600">No {bookingFilter} bookings found.</p>
            </div>
          ) : (
            displayBookings.map(b => <BookingCard key={b.id} b={b} updateBookingStatus={updateBookingStatus} />)
          )}
        </div>
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

  const printBill = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const orderDate = (() => {
      const d = order.createdAt?.toDate ? order.createdAt.toDate() : (order.createdAt ? new Date(order.createdAt) : new Date());
      if (isNaN(d.getTime())) return '';
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day} ${month} ${year}, ${time}`;
    })();

    const html = `
      <html>
        <head>
          <title>Order Receipt - ${order.orderId}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; padding: 20px; max-width: 300px; margin: 0 auto; color: #000; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .header h2 { margin: 0 0 5px 0; font-size: 18px; font-weight: bold; }
            .header p { margin: 2px 0; font-size: 12px; }
            .order-info { margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; font-size: 12px; }
            .order-info p { margin: 2px 0; }
            .items table { width: 100%; font-size: 12px; margin-bottom: 10px; border-collapse: collapse; }
            .items th { text-align: left; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .items td { padding: 5px 0; vertical-align: top; }
            .items .price { text-align: right; white-space: nowrap; }
            .totals { margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px; font-size: 12px; }
            .totals .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .totals .row.bold { font-weight: bold; font-size: 14px; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; border-top: 1px dashed #000; padding-top: 10px; }
            .customizations { font-size: 10px; color: #333; padding-left: 10px; margin-top: 2px; }
            @media print {
              @page { margin: 0; }
              body { padding: 5px; max-width: 100%; width: 100%; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${selectedRes?.name || 'Restaurant'}</h2>
            ${selectedRes?.address ? `<p>${selectedRes.address.replace(/,\s*India/gi, '')}</p>` : (selectedRes?.area ? `<p>${selectedRes.area.replace(/,\s*India/gi, '')}</p>` : '')}
            <p>Receipt / Bill</p>
          </div>
          
          <div class="order-info">
            <p><strong>Order ID:</strong> ${order.orderId}</p>
            <p><strong>Date:</strong> ${orderDate}</p>
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Phone:</strong> ${order.customerPhone}</p>
            <p><strong>Type:</strong> ${order.type === 'dine_in' ? 'Dine In' : 'Takeaway'}</p>
            <p><strong>Payment:</strong> ${order.paymentMethod === 'online' ? (order.paymentStatus === 'Success' ? 'Paid Online' : 'Payment Pending') : 'Pay at Restaurant'}</p>
          </div>

          <div class="items">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="price">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${order.items?.map((item: any) => `
                  <tr>
                    <td>
                      ${item.quantity} x ${item.name}
                      ${item.customizations?.length > 0 ? `
                        <div class="customizations">
                          ${item.customizations.map((c: any) => c.optionName).join(', ')}
                        </div>
                      ` : ''}
                    </td>
                    <td class="price">Rs. ${item.price * item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="row">
              <span>Item Total</span>
              <span>Rs. ${order.itemTotal || order.items?.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 0}</span>
            </div>
            <div class="row">
              <span>Taxes</span>
              <span>Rs. ${order.taxes !== undefined ? order.taxes : Math.round(((selectedRes?.gstPercentage || 5) / 100) * (order.items?.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) || 0))}</span>
            </div>
            <div class="row">
              <span>Packaging</span>
              <span>Rs. ${order.packaging !== undefined ? order.packaging : 20}</span>
            </div>
            <div class="row bold">
              <span>Total Bill</span>
              <span>Rs. ${order.totalPrice}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your order!</p>
            <p>Powered by BookMyTable</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
            const validTakeaway = takeawayOrders.filter((o:any) => o.type !== 'dine_in');
            const count = status === 'All' 
              ? validTakeaway.length 
              : validTakeaway.filter(o => o.status === status || (!o.status && status === 'Received')).length;
              
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
              const ordersInStatus = takeawayOrders.filter((o:any) => o.type !== 'dine_in')
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
                           <div className="flex items-center gap-3">
                             <button
                               onClick={() => printBill(order)}
                               className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center"
                               title="Print Bill"
                             >
                               <Printer size={18} />
                             </button>
                             <div className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                                {order.paymentMethod === 'online' ? (order.paymentStatus === 'Success' ? 'Paid Online' : 'Payment Pending') : 'Pay at Restaurant'}
                             </div>
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


  const handleGenerateQRAsset = async (action: 'download' | 'print', type: 'table' | 'profile' = 'table') => {
    const canvasId = type === 'profile' ? 'qr-profile-canvas' : 'qr-canvas-element';
    const qrCanvas = document.getElementById(canvasId) as HTMLCanvasElement;
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

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let fileName = '';

    if (type === 'table') {
      // Table Number Text
      ctx.font = '600 40px sans-serif';
      ctx.fillText("Table Number", width / 2, 80);

      ctx.font = '900 340px sans-serif';
      const tableName = qrTableTarget ? qrTableTarget : '1';
      ctx.fillText(tableName, width / 2, 300);
      fileName = `table-${tableName}-qr.png`;
    } else {
      ctx.font = '600 40px sans-serif';
      ctx.fillText("Welcome to", width / 2, 100);

      const resName = selectedRes?.name || 'Our Restaurant';
      let fontSize = 100;
      ctx.font = `800 ${fontSize}px sans-serif`;
      let textWidth = ctx.measureText(resName).width;
      while (textWidth > width - 80 && fontSize > 30) {
        fontSize -= 2;
        ctx.font = `800 ${fontSize}px sans-serif`;
        textWidth = ctx.measureText(resName).width;
      }
      ctx.fillText(resName, width / 2, 240, width - 80);
      
      ctx.font = '600 30px sans-serif';
      ctx.fillText("Scan to view menu & order", width / 2, 360);
      fileName = `restaurant-qr.png`;
    }

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
    ctx.fillText("Powered by Bookmytable", width / 2, height - 60);

    const dataUrl = canvas.toDataURL("image/png");

    if (action === 'download') {
      const a = document.createElement("a");
      a.download = fileName;
      a.href = dataUrl;
      a.click();
    } else {
      const printWin = window.open('', '', 'width=600,height=800');
      if (printWin) {
        printWin.document.write(`
          <html>
            <head>
              <title>Print QR - ${type === 'table' ? 'Table ' + (qrTableTarget || '1') : 'Restaurant'}</title>
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
      const today = new Date().toISOString().split('T')[0];
      let newDate = today;
      let counter = 1;
      while(blackoutSlots.some((s:any) => s.date === newDate)) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + counter);
        newDate = nextDate.toISOString().split('T')[0];
        counter++;
      }
      setFormData({ ...formData, blackoutSlots: [...blackoutSlots, { date: newDate, categories: [] }] });
      setHasChanges(true);
    };
    const updateBlackoutSlot = (index: number, key: string, value: any) => {
      if (key === 'date' && blackoutSlots.some((s:any, i:number) => s.date === value && i !== index)) {
        setToastMessage({ message: 'This date is already added as a blackout date.', type: 'error' });
        return;
      }
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
      setConfirmModal({
        isOpen: true,
        title: 'Remove Blackout Date',
        message: 'Are you sure you want to remove this blackout date?',
        onConfirm: () => {
          const newSlots = blackoutSlots.filter((_: any, i: number) => i !== index);
          setFormData({ ...formData, blackoutSlots: newSlots });
          setHasChanges(true);
        }
      });
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
                  <div className="w-full lg:w-auto shrink-0 flex items-center gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Date</label>
                      <input 
                        type="date"
                        value={slot.date}
                        onChange={(e) => updateBlackoutSlot(idx, 'date', e.target.value)}
                        className="bg-white border border-slate-300 focus:border-blue-600/20 px-3 py-2 rounded-lg font-bold outline-none text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input 
                        type="checkbox"
                        id={`full-day-${idx}`}
                        checked={(slot.categories || []).length === CATEGORIES.length}
                        onChange={(e) => {
                          updateBlackoutSlot(idx, 'categories', e.target.checked ? CATEGORIES : []);
                        }}
                        className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`full-day-${idx}`} className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                        Full Day
                      </label>
                    </div>
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
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-0 lg:h-screen lg:flex lg:flex-col lg:overflow-hidden">
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

      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-[60] h-16 shrink-0 transition-all duration-300">
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
                  <p className="text-sm font-normal text-[#363636] leading-[1.2]">{user?.displayName || user?.email}</p>
                </div>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border-2 border-slate-300" />
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-slate-300 bg-brand text-white flex items-center justify-center text-xs font-bold uppercase">
                    {(user?.displayName || user?.email || 'U').charAt(0)}
                  </div>
                )}
                <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors" title="Logout">
                  <LogOut size={14} />
                </button>
              </div>
           </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6 lg:overflow-y-auto lg:[&::-webkit-scrollbar]:hidden lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:pb-8">
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
              {SIDEBAR_GROUPS.map((group, groupIndex) => {
                const visibleTabs = group.tabs;
                if (visibleTabs.length === 0) return null;
                
                return (
                  <div key={groupIndex}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">{group.title}</p>
                    <div className="space-y-1">
                      {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            document.getElementById('right-content-area')?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
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
                );
              })}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div id="right-content-area" className="flex-1 bg-white border border-slate-300 rounded-xl p-6 md:p-8 shadow-sm lg:overflow-y-auto lg:[&::-webkit-scrollbar]:hidden lg:[-ms-overflow-style:none] lg:[scrollbar-width:none]">
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
                       <InputText label="Restaurant Name *" tooltip="The official name of your restaurant as it appears to customers." value={formData.name} onChange={(v:any) => updateForm('name', v)} disabled={true} />
                       <InputText label="Contact Number *" tooltip="Primary phone number for customer inquiries and reservations." value={formData.contactNumber} onChange={(v:any) => updateForm('contactNumber', v)} />
                       <InputText label="Contact Email (Receive order notification)" tooltip="Email address where you will receive notifications for new orders and bookings." value={(formData as any).email} onChange={(v:any) => updateForm('email', v)} />
                       <InputText label="Login Emails (Comma Separated)" tooltip="Email addresses that have access to this partner dashboard. Multiple emails can be separated by commas." value={Array.isArray(formData.partnerEmails) ? formData.partnerEmails.join(', ') : ''} onChange={(v:any) => updateForm('partnerEmails', v.split(',').map((s:any)=>s.trim()).filter(Boolean))} />
                       <InputText label="Average Price for two (₹)" tooltip="Estimated cost for a meal for two people, used for filtering by price." value={formData.avgPrice?.toString()} onChange={(v:any) => updateForm('avgPrice', parseInt(v) || 0)} />
                     </div>
                     <TextArea label={`About ${formData.name || 'Restaurant'} (Brand Description / Story)`} tooltip="A detailed description of your restaurant, its story, and what makes it special." value={formData.description} onChange={(v:any) => updateForm('description', v)} />
                   </div>

                   {/* Address Details */}
                   <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm mt-8">
                     <div className="mb-6 pb-4 border-b border-slate-100">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Address Details</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div className="md:col-span-2">
                         <div><FieldLabel label="Mall / Food Court Name (Optional - Only for outlets)" tooltip="If your restaurant is inside a mall or food court, select it here." /><select value={formData.mallName || ''} onChange={(e) => updateForm('mallName', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all shadow-sm appearance-none"><option value="">None (Standalone Outlet)</option>{malls.filter((m: any) => !formData.city || m.city?.toLowerCase() === formData.city?.toLowerCase()).sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")).map((m: any) => (<option key={m.id} value={m.name}>{m.name}</option>))}</select></div>
                       </div>
                       <InputText label="Floor / Tower" tooltip="Which floor or tower the restaurant is located in." value={formData.floor} onChange={(v:any) => updateForm('floor', v)} />
                       <InputText label="Shop / Building No." tooltip="Specific shop or building number." value={formData.shopNo} onChange={(v:any) => updateForm('shopNo', v)} />
                       <InputText label="Area / Locality *" tooltip="The general neighborhood or locality." value={formData.area} onChange={(v:any) => updateForm('area', v)} />
                       <InputText label="Landmark (Optional)" tooltip="A nearby famous landmark to help customers find you." value={formData.landmark} onChange={(v:any) => updateForm('landmark', v)} />
                       <div><FieldLabel label="City *" tooltip="The city your restaurant operates in." /><select value={formData.city || ''} onChange={(e) => updateForm('city', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all shadow-sm"><option value="" disabled>Select City</option>{cities.map((city: any, i: number) => (<option key={city.id || i} value={city.name}>{city.name}</option>))}</select></div>
                       <InputText label="State *" tooltip="State or province." value={formData.state} onChange={(v:any) => updateForm('state', v)} />
                       <InputText label="Pincode *" tooltip="Postal code or pincode." value={formData.pincode} onChange={(v:any) => updateForm('pincode', v)} />
                     </div>
                     
                     <div className="pt-8 mt-8 border-t border-slate-100">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                         <h4 className="text-sm font-bold text-slate-700">GPS Coordinates</h4>
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
                         <InputText label="Latitude" tooltip="GPS coordinates for the exact location on the map." value={formData.lat} onChange={(v:any) => updateForm('lat', v)} />
                         <InputText label="Longitude" tooltip="GPS coordinates for the exact location on the map." value={formData.lng} onChange={(v:any) => updateForm('lng', v)} />
                       </div>
                     </div>
                   </div>

                   {/* Cuisines & Facilities */}
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-300">
                     <h3 className="text-sm uppercase tracking-widest mb-4 text-[#363636] font-normal leading-[1.2]">Cuisines & Facilities</h3>
                     
                     <div className="mb-6">
                       <FieldLabel label="Select Cuisines" tooltip="The types of cuisine your restaurant offers. Select all that apply." />
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
                       <FieldLabel label="Other Cuisine" tooltip="If your cuisine is not listed above, you can add it manually here." />
                       <input 
                         type="text" 
                         placeholder="+ Add custom cuisine (Press Enter)" 
                         className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all text-sm mb-2"
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
                       <FieldLabel label="Facilities" tooltip="Amenities available at your restaurant. Select all that apply." />
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
                       <div className="mt-4">
                         <FieldLabel label="Other Facility" tooltip="If a facility is not listed above, you can add it manually here." />
                         <input 
                           type="text" 
                           placeholder="+ Add custom facility (Press Enter)" 
                           className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-blue-600/50 focus:bg-white rounded-xl font-normal text-[#363636] leading-[1.2] outline-none transition-all text-sm mb-2"
                           onKeyDown={e => {
                             if (e.key === 'Enter') {
                               e.preventDefault();
                               const input = e.target as HTMLInputElement;
                               const val = input.value.trim();
                               const facilitiesArray = Array.isArray(formData.facilities) ? formData.facilities : typeof formData.facilities === 'string' ? (formData.facilities as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                               if (val && !facilitiesArray.includes(val)) {
                                 updateForm('facilities', [...facilitiesArray, val]);
                                 input.value = '';
                               }
                             }
                           }}
                         />
                         {(() => {
                           const defaultFacilities = [
                             'WiFi', 'AC', 'Parking', 'Valet Parking', 'Outdoor Seating', 
                             'Live Music', 'Bar', 'Vegetarian Friendly', 'Home Delivery',
                             'Takeaway', 'Card Payment', 'Digital Wallet', 'Kid Friendly',
                             'Smoking Area', 'Rooftop', 'Private Dining'
                           ];
                           const facilitiesArray = Array.isArray(formData.facilities) ? formData.facilities : typeof formData.facilities === 'string' ? (formData.facilities as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                           return facilitiesArray.filter((x:any) => !defaultFacilities.includes(x)).length > 0 && (
                           <div className="flex flex-wrap gap-2 mt-2">
                             {facilitiesArray.filter((x:any) => !defaultFacilities.includes(x)).map((custom: any, cIdx: number) => (
                               <span key={`${custom}-${cIdx}`} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-300">
                                 {custom}
                                 <button 
                                   type="button" 
                                   onClick={() => updateForm('facilities', facilitiesArray.filter((item:any) => item !== custom))}
                                   className="text-slate-400 hover:text-red-500"
                                 >
                                   <X size={12} />
                                 </button>
                               </span>
                             ))}
                           </div>
                         )})()}
                       </div>
                     </div>

                     <div className="mt-8">
                       <FieldLabel label="Associate Collections (Optional)" tooltip="Select curated collections that your restaurant should be part of (e.g., 'Best Cafes', 'Romantic Dining')." />
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
                     <FieldLabel label="Daily Timings" tooltip="Set the opening and closing hours for each day of the week. You can add multiple shifts (e.g., lunch and dinner) per day." />
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
                                   setConfirmModal({ isOpen: true, title: 'Copy Timings', message: `Copy ${day}'s timings to all other days?`, onConfirm: () => {
                                     const newTimings = { ...(formData.dailyTimings || {}) };
                                     DAYS.forEach(d => {
                                       newTimings[d] = {
                                         ...newTimings[d],
                                         closed: timing.closed,
                                         ranges: JSON.parse(JSON.stringify(ranges)),
                                       };
                                     });
                                     updateForm('dailyTimings', newTimings);
                                   }});
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
                 </div>
               )}

               {activeTab === 'staff' && (
                 <div className="space-y-6">
                   <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden">
                     <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                       <div>
                         <h3 className="text-xl font-bold text-slate-800">Staff Access</h3>
                         <p className="text-slate-500 text-sm mt-1">Manage who has access to this restaurant's dashboard.</p>
                       </div>
                       <button
                         onClick={() => {
                           setStaffFormError(null);
                           setIsAddingStaff(true);
                         }}
                         className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                       >
                         <Plus size={16} /> Add Staff
                       </button>
                     </div>
                     
                     <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                       {(selectedRes?.partnerEmails || []).length === 0 ? (
                         <div className="p-8 text-center text-slate-400 text-sm">No staff members found.</div>
                       ) : (
                         <ul className="divide-y divide-slate-100">
                           {(selectedRes?.partnerEmails || []).map((email, idx) => (
                             <li key={idx} className="flex items-center justify-between p-4 hover:bg-white transition-colors">
                               <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold uppercase">
                                   {email[0]}
                                 </div>
                                 <div>
                                   <div className="font-bold text-slate-800 text-sm">{email}</div>
                                   <div className="text-xs text-slate-500">Authorized Partner</div>
                                 </div>
                               </div>
                               <button 
                                 type="button"
                                 onClick={() => handleRemoveStaff(email)}
                                 className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </li>
                           ))}
                         </ul>
                       )}
                     </div>
                   </div>
                 </div>
               )}
               {activeTab === 'stories' && selectedRes && (
                 <StoryManager restaurant={selectedRes} />
               )}

               {activeTab === 'media' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                   
                   <div className="pb-8 border-b border-slate-100">
                     <div className="mb-6">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Primary Cover Image</h3>
                       <p className="text-sm text-slate-500 mt-1">The main cover photo displayed on your restaurant's profile and in search results.</p>
                     </div>
                     <div className="flex flex-col lg:flex-row gap-8">
                       <div className="w-full lg:w-1/2">
                         {formData.image ? (
                           <div className="relative group rounded-3xl overflow-hidden shadow-md aspect-video border border-slate-200">
                             <button onClick={() => {
                               setConfirmModal({
                                 isOpen: true,
                                 title: 'Remove Cover Image',
                                 message: 'Are you sure you want to remove the primary cover image?',
                                 onConfirm: () => {
                                   updateForm('image', '');
                                   setConfirmModal(null);
                                 }
                               });
                             }} className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-full hover:bg-red-50 transition-all z-10 shadow-sm opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                               <X size={16} />
                             </button>
                             <img src={formData.image} alt="Primary Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           </div>
                         ) : (
                           <div className="w-full aspect-video bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-3">
                             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                               <ImageIcon size={24} />
                             </div>
                             <p className="font-medium text-sm">No cover image set.</p>
                           </div>
                         )}
                       </div>
                       <div className="w-full lg:w-1/2 flex flex-col justify-center">
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                           <ImageUploadInput onError={(msg: string) => showToast(msg, 'error')} label="Upload New Cover Image" value={formData.image} onChange={(v:any) => updateForm('image', v)} />
                         </div>
                       </div>
                     </div>
                   </div>

                   {renderImageInputList("Secondary Images", 'secondaryImages', "Additional photos highlighting special features, exterior, or events to give customers a complete feel.")}
                   {renderImageInputList("Food Images", 'foodImages', "Photos of your signature dishes.")}
                   {renderImageInputList("Ambience Images", 'ambienceImages', "Photos showing the interior, seating, and general atmosphere of your restaurant.")}
                   {renderMenuCategories()}
                 </div>
               )}

               {activeTab === 'qr-codes' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">QR Code Management</h3>
                        <p className="text-xs text-slate-500 mt-1">Download or print QR codes for your restaurant and tables.</p>
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
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Restaurant Profile QR */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-sm relative">
                        <h4 className="text-lg font-bold text-[#363636] w-full text-left">Restaurant Profile QR</h4>
                        <p className="text-sm text-slate-500 max-w-sm text-left w-full">
                          Scan this to visit your main restaurant page, view menu, and book tables.
                        </p>
                        <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm mt-2">
                          <QRCodeCanvas id="qr-profile-canvas" 
                            value={`${window.location.origin}/restaurant/${selectedRes?.id}`} 
                            size={400}
                            style={{ width: 120, height: 120 }}
                            level="H"
                            includeMargin={false}
                            fgColor="#0f172a"
                            imageSettings={{
                              src: '/logo.png',
                              x: undefined,
                              y: undefined,
                              height: 96,
                              width: 96,
                              excavate: true,
                            }}
                          />
                        </div>
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 w-full mt-2">
                          <a 
                            href={`/restaurant/${selectedRes?.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-4 py-2 bg-slate-800 text-white rounded-full text-xs font-bold shadow-sm hover:bg-slate-700 active:scale-95 transition-all flex-1"
                          >
                            Visit Page
                          </a>
                          <button
                            onClick={() => { handleGenerateQRAsset('download', 'profile'); }}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all border border-slate-200 flex-1"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => { handleGenerateQRAsset('print', 'profile'); }}
                            className="px-4 py-2 bg-white border border-slate-300 text-[#363636] rounded-full flex items-center justify-center gap-2 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm flex-1"
                          >
                            Print
                          </button>
                        </div>
                      </div>

                      {/* Table QR Menu */}
                      <div className={`bg-white border-2 rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-sm overflow-hidden relative ${formData.isQrMenuEnabled ? 'border-blue-600/20' : 'border-slate-200 opacity-60'}`}>
                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                          <ShoppingBag size={120} />
                        </div>
                        <h4 className="text-lg font-bold text-[#363636] w-full text-left relative z-10">Digital QR Menu (Table Ordering)</h4>
                        <p className="text-sm text-slate-500 max-w-sm text-left w-full relative z-10">
                          {formData.isQrMenuEnabled ? 'Generate this QR code per table by entering the table number below.' : 'Enable QR Menu Ordering above to generate table QR codes.'}
                        </p>
                        
                        {formData.isQrMenuEnabled && (
                          <>
                            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm relative z-10 mt-2">
                              <QRCodeCanvas id="qr-canvas-element" 
                                value={`${window.location.origin}/qr-menu/${selectedRes?.id}?table=${encodeURIComponent(qrTableTarget || '1')}`} 
                                size={400}
                                style={{ width: 120, height: 120 }}
                                level="H"
                                includeMargin={false}
                                fgColor="#0f172a"
                                imageSettings={{
                                  src: '/logo.png',
                                  x: undefined,
                                  y: undefined,
                                  height: 96,
                                  width: 96,
                                  excavate: true,
                                }}
                              />
                            </div>
                            
                            <div className="w-full relative z-10">
                              <input 
                                type="text" 
                                value={qrTableTarget} 
                                onChange={(e) => setQrTableTarget(e.target.value)} 
                                placeholder="Enter Table Number (e.g. 5, A2) defaults to 1" 
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all outline-none"
                              />
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-center gap-2 w-full relative z-10">
                              <a 
                                href={`/qr-menu/${selectedRes?.id}?table=${encodeURIComponent(qrTableTarget || '1')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm hover:shadow active:scale-95 transition-all flex-1"
                              >
                                Open Link
                              </a>
                              <button
                                onClick={() => { handleGenerateQRAsset('download', 'table'); }}
                                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all border border-slate-200 flex-1"
                              >
                                Download
                              </button>
                              <button
                                onClick={() => { handleGenerateQRAsset('print', 'table'); }}
                                className="px-4 py-2 bg-white border border-slate-300 text-[#363636] rounded-full flex items-center justify-center gap-2 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm flex-1"
                              >
                                Print
                              </button>
                            </div>
                          </>
                        )}
                      </div>
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
                        <button onClick={() => {
                          setNewItemData({ name: '', price: '', description: '', isAvailable: true, category: '', isVeg: true, image: '' });
                          setIsAddItemModalOpen(true);
                        }} className="flex items-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs transition-colors">
                          <Plus size={14} /> Add Item
                        </button>
                      </div>
                    </div>

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
                                      {item.image ? <img src={item.image} className="w-full h-full object-cover" alt={item.name || ""} /> : <Utensils size={20} className="text-slate-300" />}
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Signature Dishes</h3>
                        <p className="text-xs text-slate-500 mt-1">Highlight your best dishes to attract diners</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => {
                          setNewSignatureDish({ name: '', price: 0, description: '' });
                          setAddSignatureDishModal(true);
                        }} className="flex items-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs transition-colors">
                          <Plus size={14} /> Add Signature
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(!formData.signatureDishes || formData.signatureDishes.length === 0) ? (
                        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
                            <UtensilsCrossed size={24} />
                          </div>
                          <p>No signature dishes configured.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {formData.signatureDishes.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl relative group hover:shadow-md transition-all">
                              <button onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Remove Signature Dish',
                                  message: 'Are you sure you want to remove this signature dish?',
                                  onConfirm: () => {
                                    const newSig = [...formData.signatureDishes!];
                                    newSig.splice(idx, 1);
                                    updateForm('signatureDishes', newSig);
                                  }
                                });
                              }} className="absolute top-3 right-3 p-2 bg-white text-red-500 rounded-full hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10">
                                <Trash2 size={16} />
                              </button>
                              <div className="space-y-4 pr-10">
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dish Name</label>
                                    <input type="text" placeholder="e.g. Truffle Mushroom Risotto" value={item.name} onChange={e => {
                                      const newSig = [...formData.signatureDishes!];
                                      newSig[idx].name = e.target.value;
                                      updateForm('signatureDishes', newSig);
                                    }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                                  </div>
                                  <div className="w-32">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Price (₹)</label>
                                    <input type="number" placeholder="0" value={item.price} onChange={e => {
                                        const newSig = [...formData.signatureDishes!];
                                        newSig[idx].price = parseInt(e.target.value) || 0;
                                        updateForm('signatureDishes', newSig);
                                      }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                                  <textarea placeholder="Describe the dish, its ingredients and what makes it special..." value={item.description || ''} onChange={e => {
                                    const newSig = [...formData.signatureDishes!];
                                    newSig[idx].description = e.target.value;
                                    updateForm('signatureDishes', newSig);
                                  }} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm resize-none" rows={2} />
                                </div>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Ongoing Offers</h3>
                        <p className="text-xs text-slate-500 mt-1">Manage discounts and seasonal promotions</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => {
                          setNewOffer({ title: '', description: '', validFrom: '', validUntil: '' });
                          setAddOfferModal(true);
                        }} className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 px-4 py-2 rounded-xl font-bold text-xs transition-colors">
                          <Plus size={14} /> Add Offer
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(!formData.offers || formData.offers.length === 0) ? (
                        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
                            <Tag size={24} />
                          </div>
                          <p>No active offers configured.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {formData.offers.map((item, idx) => (
                            <div key={idx} className="bg-amber-50/50 border border-amber-200 p-5 rounded-2xl relative group hover:shadow-md transition-all">
                              <button onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Remove Offer',
                                  message: 'Are you sure you want to remove this offer?',
                                  onConfirm: () => {
                                    const newOffers = [...formData.offers!];
                                    newOffers.splice(idx, 1);
                                    updateForm('offers', newOffers);
                                  }
                                });
                              }} className="absolute top-3 right-3 p-2 bg-white text-red-500 rounded-full hover:bg-red-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10">
                                <Trash2 size={16} />
                              </button>
                              <div className="space-y-4 pr-10">
                                <div>
                                  <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Offer Title</label>
                                  <input type="text" placeholder="e.g. 20% Off Weekend" value={item.title} onChange={e => {
                                    const newOffers = [...formData.offers!];
                                    newOffers[idx].title = e.target.value;
                                    updateForm('offers', newOffers);
                                  }} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm" />
                                </div>
                                
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Valid From</label>
                                    <input type="date" value={item.validFrom} onChange={e => {
                                      const newOffers = [...formData.offers!];
                                      newOffers[idx].validFrom = e.target.value;
                                      updateForm('offers', newOffers);
                                    }} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Valid Until</label>
                                    <input type="date" value={item.validUntil} onChange={e => {
                                      const newOffers = [...formData.offers!];
                                      newOffers[idx].validUntil = e.target.value;
                                      updateForm('offers', newOffers);
                                    }} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm" />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="text-[10px] font-black text-amber-700/60 uppercase tracking-widest block mb-1">Description</label>
                                  <textarea placeholder="e.g. 20% off on bills above ₹1000" value={item.description || ''} onChange={e => {
                                    const newOffers = [...formData.offers!];
                                    newOffers[idx].description = e.target.value;
                                    updateForm('offers', newOffers);
                                  }} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-medium text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-sm resize-none" rows={2} />
                                </div>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Advertisement Campaigns</h3>
                        <p className="text-xs text-slate-500 mt-1">Manage visual ads and video promos</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => {
                          setNewAdForm({ title: '', description: '', image: '', validFrom: new Date().toISOString().split('T')[0] });
                          setAddAdModal(true);
                        }} className="flex items-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs transition-colors">
                          <Plus size={14} /> Create New Ad
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(!formData.advertisements || formData.advertisements.length === 0) ? (
                        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 font-medium text-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-300">
                            <Megaphone size={24} />
                          </div>
                          <p>No active advertisements.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">
                          {formData.advertisements.map((ad, idx) => (
                            <div key={`${ad.id || 'ad'}-${idx}`} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6 hover:shadow-md transition-all group">
                              <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                                <div className="space-y-6 flex-grow text-left w-full md:w-auto">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className={cn("w-3 h-3 rounded-full animate-pulse", ad.active ? "bg-green-500" : "bg-slate-300")} />
                                      <h4 className="text-sm font-bold text-slate-700">Ad Slot #{idx + 1}</h4>
                                    </div>
                                    <button type="button" onClick={() => {
                                      const newAds = [...formData.advertisements!];
                                      newAds[idx].active = !ad.active;
                                      updateForm('advertisements', newAds);
                                    }} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", ad.active ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-500")}>
                                      {ad.active ? "Active" : "Paused"}
                                    </button>
                                  </div>

                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Campaign Title</label>
                                      <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" value={ad.title} onChange={(e) => {
                                        const newAds = [...formData.advertisements!];
                                        newAds[idx].title = e.target.value;
                                        updateForm('advertisements', newAds);
                                      }} placeholder="Monsoon Special Ad..." />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ad Description / Target URL</label>
                                      <input className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-sm" value={ad.description} onChange={(e) => {
                                        const newAds = [...formData.advertisements!];
                                        newAds[idx].description = e.target.value;
                                        updateForm('advertisements', newAds);
                                      }} placeholder="https://..." />
                                    </div>
                                  </div>
                                </div>
                                <div className="w-full md:w-56 h-40 bg-white rounded-2xl border border-slate-200 overflow-hidden shrink-0 relative group/img shadow-sm flex-shrink-0">
                                  {ad.image ? (
                                    <img src={ad.image} alt="Ad" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                      <ImagePlus size={32} className="mb-2" />
                                      <span className="text-[10px] uppercase tracking-widest font-black">No Image</span>
                                    </div>
                                  )}
                                  <button onClick={() => {
                                    setAdUploadIndex(idx);
                                    if (adFileInputRef.current) {
                                      adFileInputRef.current.click();
                                    }
                                  }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm text-white flex-col items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all flex">
                                    <Upload size={24} className="mb-2" />
                                    <span className="text-xs font-bold">Change Image</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-6 border-t border-slate-200 gap-4">
                                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                  <div className="flex-1 sm:flex-none">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
                                    <input type="date" value={ad.validFrom} onChange={(e) => {
                                      const newAds = [...formData.advertisements!];
                                      newAds[idx].validFrom = e.target.value;
                                      updateForm('advertisements', newAds);
                                    }} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none shadow-sm" />
                                  </div>
                                  <div className="flex-1 sm:flex-none">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                                    <input type="date" value={ad.validUntil} onChange={(e) => {
                                      const newAds = [...formData.advertisements!];
                                      newAds[idx].validUntil = e.target.value;
                                      updateForm('advertisements', newAds);
                                    }} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none shadow-sm" />
                                  </div>
                                </div>
                                <button type="button" onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: 'Remove Advertisement',
                                    message: 'Are you sure you want to remove this advertisement?',
                                    onConfirm: () => {
                                      const newAds = [...formData.advertisements!];
                                      newAds.splice(idx, 1);
                                      updateForm('advertisements', newAds);
                                    }
                                  });
                                }} className="flex items-center justify-center p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors self-end sm:self-auto w-full sm:w-auto shadow-sm sm:shadow-none bg-white sm:bg-transparent border border-red-100 sm:border-none">
                                  <Trash2 size={18} />
                                  <span className="ml-2 text-sm font-bold sm:hidden">Remove Ad</span>
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
                   <ImageUploadInput onError={(msg: string) => showToast(msg, 'error')} label="Dish Image (Optional)" value={newItemData.image} onChange={(v:any) => setNewItemData({...newItemData, image: v})} />
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
              <AnimatePresence>
        {isAddingStaff && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-normal text-[#363636] leading-[1.2]">Add Staff Account</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Create Dashboard Access</p>
                </div>
                <button type="button" onClick={() => setIsAddingStaff(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddStaffSubmit} className="p-6 md:p-8 space-y-6">
                {staffFormError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium leading-relaxed">{staffFormError}</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Staff Name</label>
                  <input 
                    type="text" 
                    value={newStaffForm.name} 
                    onChange={e => setNewStaffForm({ ...newStaffForm, name: e.target.value })} 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-[#363636] focus:ring-2 focus:ring-blue-600 outline-none" 
                    placeholder="e.g. John Doe"
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={newStaffForm.email} 
                    onChange={e => setNewStaffForm({ ...newStaffForm, email: e.target.value })} 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-[#363636] focus:ring-2 focus:ring-blue-600 outline-none" 
                    placeholder="e.g. staff@example.com"
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Password</label>
                  <input 
                    type="text" 
                    value={newStaffForm.password} 
                    onChange={e => setNewStaffForm({ ...newStaffForm, password: e.target.value })} 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-[#363636] focus:ring-2 focus:ring-blue-600 outline-none" 
                    placeholder="Minimum 6 characters"
                    required 
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddingStaff(false)} className="px-6 py-3.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={creatingStaff} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 flex items-center gap-2">
                    {creatingStaff ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {creatingStaff ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Image Modal */}
      {addImageModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-300 flex justify-between items-center shrink-0">
               <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">Add {addImageModal.label}</h3>
               <button onClick={() => setAddImageModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                 <X size={20} />
               </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              {!addImageModal.isStringArrayOnly && (
                <InputText 
                  label="Category (e.g. Food, Ambience)" 
                  value={newImageForm.category} 
                  onChange={(v: string) => setNewImageForm({...newImageForm, category: v})} 
                />
              )}
              <ImageUploadInput 
                label="Select Image or URL" 
                value={newImageForm.url} 
                onChange={(v: string) => setNewImageForm({...newImageForm, url: v})} 
                onError={(msg: string) => showToast(msg, 'error')}
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-300 flex justify-end gap-3 shrink-0">
              <button onClick={() => setAddImageModal(null)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                if (addImageModal.field === 'menuCategories') {
                  const arr = [...(formData.menuCategories || [])];
                  const catIdx = (addImageModal as any).catIdx;
                  const imgs = [...(arr[catIdx].images || [])];
                  imgs.push(newImageForm.url);
                  arr[catIdx] = { ...arr[catIdx], images: imgs };
                  updateForm('menuCategories', arr);
                } else {
                  const arr = [...(formData[addImageModal.field] || [])];
                  if (addImageModal.isStringArrayOnly) {
                    arr.push(newImageForm.url);
                  } else {
                    arr.push({ url: newImageForm.url, category: newImageForm.category });
                  }
                  updateForm(addImageModal.field, arr as any);
                }
                setAddImageModal(null);
              }} disabled={!newImageForm.url} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Add
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Menu Category Modal */}
      {addMenuCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-300 flex justify-between items-center shrink-0">
               <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">Add Menu Category</h3>
               <button onClick={() => setAddMenuCategoryModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                 <X size={20} />
               </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <InputText 
                label="Category Name (e.g. Starters, Main Course)" 
                value={newMenuCategoryName} 
                onChange={(v: string) => setNewMenuCategoryName(v)} 
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-300 flex justify-end gap-3 shrink-0">
              <button onClick={() => setAddMenuCategoryModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                const arr = [...(formData.menuCategories || [])];
                arr.push({ id: Math.random().toString(36).substr(2, 9), name: newMenuCategoryName, images: [] });
                updateForm('menuCategories', arr);
                setAddMenuCategoryModal(false);
              }} disabled={!newMenuCategoryName.trim()} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Add
              </button>
            </div>
          </motion.div>
        </div>
      )}

              {/* Add Signature Dish Modal */}
      {addSignatureDishModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-300 flex justify-between items-center shrink-0">
               <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">Add Signature Dish</h3>
               <button onClick={() => setAddSignatureDishModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                 <X size={20} />
               </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <InputText 
                label="Dish Name *" 
                value={newSignatureDish.name} 
                onChange={(v: string) => setNewSignatureDish({...newSignatureDish, name: v})} 
              />
              <InputText 
                label="Price (₹)" 
                value={newSignatureDish.price.toString()} 
                onChange={(v: string) => setNewSignatureDish({...newSignatureDish, price: parseInt(v) || 0})} 
              />
              <TextArea 
                label="Description" 
                value={newSignatureDish.description} 
                onChange={(v: string) => setNewSignatureDish({...newSignatureDish, description: v})} 
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-300 flex justify-end gap-3 shrink-0">
              <button onClick={() => setAddSignatureDishModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                const arr = [...(formData.signatureDishes || [])];
                arr.push(newSignatureDish);
                updateForm('signatureDishes', arr);
                setAddSignatureDishModal(false);
              }} disabled={!newSignatureDish.name.trim()} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Add
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Offer Modal */}
      {addOfferModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-300 flex justify-between items-center shrink-0">
               <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">Add Offer</h3>
               <button onClick={() => setAddOfferModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                 <X size={20} />
               </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <InputText 
                label="Offer Title *" 
                value={newOffer.title} 
                onChange={(v: string) => setNewOffer({...newOffer, title: v})} 
              />
              <TextArea 
                label="Description" 
                value={newOffer.description} 
                onChange={(v: string) => setNewOffer({...newOffer, description: v})} 
              />
              <InputText 
                label="Valid From (YYYY-MM-DD)" 
                value={newOffer.validFrom} 
                onChange={(v: string) => setNewOffer({...newOffer, validFrom: v})} 
              />
              <InputText 
                label="Valid Until (YYYY-MM-DD)" 
                value={newOffer.validUntil} 
                onChange={(v: string) => setNewOffer({...newOffer, validUntil: v})} 
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-300 flex justify-end gap-3 shrink-0">
              <button onClick={() => setAddOfferModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                const arr = [...(formData.offers || [])];
                arr.push({ ...newOffer, id: Math.random().toString(36).substr(2, 9) });
                updateForm('offers', arr);
                setAddOfferModal(false);
              }} disabled={!newOffer.title.trim()} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Add
              </button>
            </div>
          </motion.div>
        </div>
      )}

              {/* Create Ad Modal */}
      {addAdModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-300 flex justify-between items-center shrink-0">
               <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">Create New Ad</h3>
               <button onClick={() => setAddAdModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                 <X size={20} />
               </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              <InputText 
                label="Ad Title *" 
                value={newAdForm.title} 
                onChange={(v: string) => setNewAdForm({...newAdForm, title: v})} 
              />
              <TextArea 
                label="Description" 
                value={newAdForm.description} 
                onChange={(v: string) => setNewAdForm({...newAdForm, description: v})} 
              />
              <ImageUploadInput 
                label="Banner Image URL" 
                value={newAdForm.image} 
                onChange={(v: string) => setNewAdForm({...newAdForm, image: v})} 
                onError={(msg: string) => showToast(msg, 'error')}
              />
              <InputText 
                label="Valid From (YYYY-MM-DD)" 
                value={newAdForm.validFrom} 
                onChange={(v: string) => setNewAdForm({...newAdForm, validFrom: v})} 
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-300 flex justify-end gap-3 shrink-0">
              <button onClick={() => setAddAdModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                const newAd = [{ 
                  id: Math.random().toString(36).substr(2, 9),
                  title: newAdForm.title, 
                  description: newAdForm.description, 
                  image: newAdForm.image,
                  active: true,
                  validFrom: newAdForm.validFrom || new Date().toISOString().split('T')[0]
                }, ...(formData.advertisements || [])];
                updateForm('advertisements', newAd);
                setAddAdModal(false);
              }} disabled={!newAdForm.title.trim()} className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Create
              </button>
            </div>
          </motion.div>
        </div>
      )}

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


      

      

      <ConfirmModal
        isOpen={confirmModal?.isOpen || false}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        onConfirm={() => {
          if (confirmModal?.onConfirm) confirmModal.onConfirm();
          setConfirmModal(null);
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
