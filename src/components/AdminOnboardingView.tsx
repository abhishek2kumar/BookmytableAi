import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Restaurant } from '../types';
import { useMasterData } from './MasterDataContext';
import { cn, convertTo12Hour, convertTo24Hour } from '../lib/utils';
import { INDIAN_STATES } from '../constants';
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
  ImageIcon,
  Star,
  Loader2,
  ChevronRight,
  Globe,
  UtensilsCrossed,
  Plus,
  Trash2,
  ShieldCheck,
  Search,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { uploadImageToStorage } from '../lib/storage';
import { useMalls } from '../hooks/useFirebase';


const BANGALORE_COORDS = { lat: 12.9716, lng: 77.5946 };
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminOnboardingView() {
  const navigate = useNavigate();

  const { cities, cuisines, diningCollections } = useMasterData();
  const { malls } = useMalls();
  const sortedCities = React.useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name)), [cities]);
  const sortedCuisines = React.useMemo(() => [...cuisines].sort((a, b) => a.name.localeCompare(b.name)), [cuisines]);
  const sortedCollections = React.useMemo(() => [...diningCollections].filter(c => c.isActive).sort((a, b) => a.name.localeCompare(b.name)), [diningCollections]);
  const [step, setStep] = useState(1);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isCoordsValid, setIsCoordsValid] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState<Partial<Restaurant>>({
    name: '',
    description: '',
    cuisine: [],
    collections: [],
    avgPrice: 500,
    contactNumber: '',
    contactEmail: '',
    image: '',
    shopNo: '',
    floor: '',
    area: '',
    landmark: '',
    state: '',
    pincode: '',
    country: 'India',
    location: '',
    address: '',
    city: 'Bangalore',
    mallName: '',
    lat: 0,
    lng: 0,
    ownerId: '',
    isOpen: true,
    rating: 4.0, 
    approved: false, // Default to false for manual onboarding
    openingHours: {
      open: '11:00 AM',
      close: '11:00 PM',
      days: 'Mon-Sun'
    },
    signatureDishes: [{ name: '', price: 0, description: '' }],
    menuCategories: [],
    facilities: [],
    secondaryImages: [], // General
    foodImages: [],
    ambienceImages: [],
    dailyTimings: DAYS_OF_WEEK.reduce((acc, day) => {
      acc[day] = { ranges: [{ open: '11:00 AM', close: '11:00 PM' }], closed: false };
      return acc;
    }, {} as any)
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const updateLocationField = (field: string, value: string) => {
    const nextForm = { ...form, [field]: value };
    const fullAddress = [nextForm.shopNo, nextForm.floor, nextForm.area, nextForm.city, nextForm.state, nextForm.pincode, nextForm.country, nextForm.landmark]
      .filter(Boolean)
      .join(', ');
    setForm({ ...nextForm, address: fullAddress, location: nextForm.area || '' });
  };

  const handleGeocodeAddress = async (silent = false) => {
    const { name, area, city, state, pincode } = form;
    if (!area || !city) {
      if (!silent) showNotification('error', 'Area and City are required to locate on map.');
      return;
    }
    
    setIsGeocoding(true);
    try {
      const queryStr = [name, area, city, state, pincode].filter(Boolean).join(', ');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1&countrycodes=in&email=rec.abhishek@gmail.com`,
        {
          headers: {
            'Accept-Language': 'en-US,en;q=0.5'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          setForm(prev => ({ ...prev, lat, lng: lon }));
          setIsCoordsValid(true);
          if (!silent) showNotification('success', 'Exact coordinates detected!');
        }
      } else {
        // Fallback search with fewer details if the specific one fails
        const fallbackQuery = [area, city, state].filter(Boolean).join(', ');
        const fallbackResp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1&countrycodes=in&email=rec.abhishek@gmail.com`,
          {
            headers: {
              'Accept-Language': 'en-US,en;q=0.5'
            }
          }
        );
        const fallbackData = await fallbackResp.json();
        if (fallbackData && fallbackData.length > 0) {
          const fLat = parseFloat(fallbackData[0].lat);
          const fLon = parseFloat(fallbackData[0].lon);
          if (!isNaN(fLat) && !isNaN(fLon)) {
            setForm(prev => ({ ...prev, lat: fLat, lng: fLon }));
            setIsCoordsValid(true);
            if (!silent) showNotification('success', 'Coordinates detected (using area/city).');
          }
        } else {
          setIsCoordsValid(false);
          if (!silent) showNotification('error', 'Could not detect coordinates automatically. Please enter them manually.');
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      if (!silent) showNotification('error', 'Error connecting to search service.');
      setIsCoordsValid(false);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Auto-detect coordinates when identity fields are filled
  React.useEffect(() => {
    const { name, area, city, state } = form;
    if (name && name.length > 3 && area && area.length > 3 && city && state && !isCoordsValid && !isGeocoding) {
      const timer = setTimeout(() => {
        handleGeocodeAddress(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [form.name, form.area, form.city, form.state]);

  const validateContact = () => {
    // Only allow numeric value of length 10 digit.
    const phoneRegex = /^[0-9]{10}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const newErrors: Record<string, boolean> = {};
    let hasError = false;

    if (!form.contactNumber || !phoneRegex.test(form.contactNumber)) {
      newErrors.contactNumber = true;
      hasError = true;
    }
    if (!form.contactEmail || !emailRegex.test(form.contactEmail)) {
      newErrors.contactEmail = true;
      hasError = true;
    }

    if (hasError) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      showNotification('error', 'Please enter a valid 10-digit number and email.');
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    const newErrors: Record<string, boolean> = {};

    if (step === 1) {
      if (!form.name) newErrors.name = true;
      if (!form.area) newErrors.area = true;
      if (!form.city) newErrors.city = true;
      if (!form.state) newErrors.state = true;
      if (!form.pincode) newErrors.pincode = true;
      if (!form.lat) newErrors.lat = true;
      if (!form.lng) newErrors.lng = true;

      if (Object.keys(newErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...newErrors }));
        
        if (newErrors.lat || newErrors.lng) {
          showNotification('error', 'Coordinate is still 0. Please click on "Detect Coordinate" button or enter manually.');
        } else {
          showNotification('error', 'Please fill all required identity and coordinate fields.');
        }
        return;
      }
      
      setIsSaving(true);
      try {
        // Duplicate check before allowing to proceed
        const q = query(
          collection(db, 'restaurants'),
          where('city', '==', form.city)
        );
        const snap = await getDocs(q);
        const nameToMatch = form.name?.trim().toLowerCase();
        const areaToMatch = form.area?.trim().toLowerCase();
        
        const duplicate = snap.docs.find((doc) => {
          const data = doc.data();
          const qName = data.name?.trim().toLowerCase();
          const qArea = data.area?.trim().toLowerCase();
          return qName === nameToMatch && qArea === areaToMatch;
        });
        
        if (duplicate) {
          showNotification('error', 'A restaurant with this name already exists in this area!');
          setIsSaving(false);
          return;
        }

        setStep(2);
      } catch (err) {
        console.error(err);
        showNotification('error', 'Failed to verify restaurant uniqueness.');
      } finally {
        setIsSaving(false);
      }
    } else if (step < 6) {
      if (step === 2 && !validateContact()) {
        return;
      }
      if (step === 3 && !form.image) {
        showNotification('error', 'Restaurant image is mandatory.');
        return;
      }
      if (step === 4 && (!form.cuisine || form.cuisine.length === 0)) {
        showNotification('error', 'Please select at least 1 cuisine.');
        return;
      }
      if (step === 4 && form.cuisine!.length > 8) {
        showNotification('error', 'Select up to 8 cuisines only.');
        return;
      }

      setStep(step + 1);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    try {
      const finalData: any = {
        ...form,
        status: 'Active',
        approved: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Strip undefined properties to prevent Firestore SDK errors
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === undefined) delete finalData[key];
      });

      const docRef = await addDoc(collection(db, 'restaurants'), finalData);
      setRestaurantId(docRef.id);
      setStep(7); // Confirmation screen
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to submit application.');
    } finally {
      setIsSaving(false);
    }
  };

  const addTimingSlot = (day: string) => {
    const nextTimings = { ...form.dailyTimings };
    nextTimings[day].ranges.push({ open: '11:00 AM', close: '11:00 PM' });
    setForm({ ...form, dailyTimings: nextTimings });
  };

  const copyTimingsToAll = (sourceDay: string) => {
    const sourceData = JSON.parse(JSON.stringify(form.dailyTimings![sourceDay]));
    const nextTimings = { ...form.dailyTimings };
    DAYS_OF_WEEK.forEach(day => {
      nextTimings[day] = JSON.parse(JSON.stringify(sourceData));
    });
    setForm({ ...form, dailyTimings: nextTimings });
    showNotification('success', `Copied ${sourceDay} timings to all days!`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showNotification('error', 'File size exceeds 5MB limit.');
      return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      showNotification('error', 'Invalid file type. Use JPEG, JPG or PNG.');
      return;
    }

    const upload = async () => {
      try {
        setIsUploading(true);
        const url = await uploadImageToStorage(file, 'restaurants');
        setForm({ ...form, image: url });
        showNotification('success', 'Image uploaded successfully!');
      } catch (err) {
        showNotification('error', 'Failed to upload image.');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
    upload();
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl text-[#363636] font-normal leading-[1.2]">Onboard New Restaurant</h1>
            {step <= 6 && (
              <div className="bg-brand/10 text-brand px-4 py-2 rounded-2xl font-black text-sm">
                Step {step} of 6
              </div>
            )}
          </div>
          {step <= 6 && (
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-8">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(step / 6) * 100}%` }}
                className="h-full bg-brand"
              />
            </div>
          )}
        </div>

        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.section 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                    <Utensils className="text-brand" size={20} />
                  </div>
                  <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Restaurant Identity</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Restaurant Name *</label>
                    <input 
                      required
                      placeholder="e.g. The Coastal Kitchen"
                      className={cn(
                        "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold",
                        errors.name ? "border-red-500 bg-red-50/10" : "border-slate-300"
                      )}
                      value={form.name}
                      onChange={e => {
                        setForm({...form, name: e.target.value});
                        if (errors.name) setErrors(prev => ({ ...prev, name: false }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Restaurant Rating *</label>
                    <div className="flex bg-slate-50 border border-slate-300 rounded-2xl p-1 gap-1">
                      {[1, 2, 3, 4, 5].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm({...form, rating: r})}
                          className={cn(
                            "flex-1 py-3 rounded-xl flex items-center justify-center gap-1 transition-all",
                            form.rating === r ? "bg-brand text-white shadow-lg shadow-brand/20" : "hover:bg-brand/5 text-slate-400"
                          )}
                        >
                          <span className="font-bold text-sm">{r}</span>
                          <Star size={14} className={cn(form.rating === r ? "fill-white" : "fill-transparent")} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Shop No. / Building No. (Optional)</label>
                    <input 
                      placeholder="e.g. Shop 42, Phoenix Mall"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                      value={form.shopNo}
                      onChange={e => updateLocationField('shopNo', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Floor / Tower (Optional)</label>
                    <input 
                      placeholder="e.g. 2nd Floor, Wing A"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                      value={form.floor}
                      onChange={e => updateLocationField('floor', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Mall / Food Court Name (Optional)</label>
                    <select
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium appearance-none"
                      value={form.mallName || ''}
                      onChange={e => setForm({ ...form, mallName: e.target.value })}
                    >
                      <option value="">None (Standalone Outlet)</option>
                      {malls
                        .filter(m => !form.city || m.city?.toLowerCase() === form.city?.toLowerCase())
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                        .map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 px-2 mt-1">If specified, this outlet will appear grouped under this food court in the city view.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Area / Sector / Locality *</label>
                    <input 
                      required
                      placeholder="e.g. Viman Nagar"
                      className={cn(
                        "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium",
                        errors.area ? "border-red-500 bg-red-50/10" : "border-slate-300"
                      )}
                      value={form.area}
                      onChange={e => {
                        updateLocationField('area', e.target.value);
                        if (errors.area) setErrors(prev => ({ ...prev, area: false }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">City *</label>
                    <select 
                      required
                      className={cn(
                        "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-sm",
                        errors.city ? "border-red-500 bg-red-50/10" : "border-slate-300"
                      )}
                      value={form.city}
                      onChange={e => {
                        updateLocationField('city', e.target.value);
                        if (errors.city) setErrors(prev => ({ ...prev, city: false }));
                      }}
                    >
                      <option value="">Select City</option>
                      {sortedCities.filter(c => c.lat !== 0).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      {sortedCities.length === 0 && <option value="Bangalore">Bangalore</option>}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">State *</label>
                    <select 
                      required
                      className={cn(
                        "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold text-sm",
                        errors.state ? "border-red-500 bg-red-50/10" : "border-slate-300"
                      )}
                      value={form.state}
                      onChange={e => {
                        updateLocationField('state', e.target.value);
                        if (errors.state) setErrors(prev => ({ ...prev, state: false }));
                      }}
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Pincode *</label>
                    <input 
                      required
                      placeholder="e.g. 560001"
                      className={cn(
                        "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium",
                        errors.pincode ? "border-red-500 bg-red-50/10" : "border-slate-300"
                      )}
                      value={form.pincode}
                      onChange={e => {
                        updateLocationField('pincode', e.target.value);
                        if (errors.pincode) setErrors(prev => ({ ...prev, pincode: false }));
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Landmark (Optional)</label>
                  <input 
                    placeholder="e.g. Near HDFC Bank"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                    value={form.landmark}
                    onChange={e => updateLocationField('landmark', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Brand Description / Story (Optional)</label>
                  <textarea 
                    placeholder="Share the story behind your restaurant or what makes it unique..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium min-h-[120px] resize-none"
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                  />
                </div>

                <div className="pt-6 border-t border-slate-300">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                        <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Pin Coordinates</h3>
                        <button 
                          type="button"
                          onClick={() => handleGeocodeAddress(false)}
                          disabled={isGeocoding}
                          className="bg-brand/10 text-brand px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all flex items-center gap-1.5"
                        >
                          {isGeocoding ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />} 
                          Detect Coordinates
                        </button>
                     </div>
                     {isCoordsValid && (
                       <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                          <Check size={12} /> Successfully Detected
                       </div>
                     )}
                     {!isCoordsValid && form.lat && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                          Manual override
                       </div>
                     )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[32px] border border-slate-300">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Latitude</label>
                      <div className="relative">
                        <input 
                          type="number"
                          step="any"
                          placeholder="0.0000"
                          className={cn(
                            "w-full px-5 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-mono font-bold",
                            isCoordsValid ? "border-emerald-500/30" : 
                            (errors.lat || (!isCoordsValid && !form.lat && !isGeocoding)) ? "border-red-500 bg-red-50/5" : "border-slate-300"
                          )}
                          value={form.lat || ''}
                          onChange={e => {
                            setForm({...form, lat: parseFloat(e.target.value)});
                            setIsCoordsValid(false);
                            if (errors.lat) setErrors(prev => ({ ...prev, lat: false }));
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">LAT</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Longitude</label>
                      <div className="relative">
                        <input 
                          type="number"
                          step="any"
                          placeholder="0.0000"
                          className={cn(
                            "w-full px-5 py-4 bg-white border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-mono font-bold",
                            isCoordsValid ? "border-emerald-500/30" : 
                            (errors.lng || (!isCoordsValid && !form.lng && !isGeocoding)) ? "border-red-500 bg-red-50/5" : "border-slate-300"
                          )}
                          value={form.lng || ''}
                          onChange={e => {
                            setForm({...form, lng: parseFloat(e.target.value)});
                            setIsCoordsValid(false);
                            if (errors.lng) setErrors(prev => ({ ...prev, lng: false }));
                          }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black">LNG</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="bg-brand text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <span>Next Section</span>}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.section>
            )}

            {step === 2 && (
              <motion.section 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <User className="text-blue-500" size={20} />
                  </div>
                  <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Contact Information</h2>
                </div>
                
                <p className="text-slate-400 text-sm font-medium">These details are required to receive booking information and system updates.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Contact Number *</label>
                    <input 
                      required
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      className={cn(
                        "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold",
                        errors.contactNumber ? "border-red-500 bg-red-50/10" : "border-slate-300"
                      )}
                      value={form.contactNumber}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setForm({...form, contactNumber: val});
                        if (errors.contactNumber) setErrors(prev => ({ ...prev, contactNumber: false }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Email Address *</label>
                    <input 
                      type="email"
                      required
                      placeholder="e.g. contact@thecoastalkitchen.com"
                      className={cn(
                        "w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold",
                        errors.contactEmail ? "border-red-500 bg-red-50/10" : "border-slate-300"
                      )}
                      value={form.contactEmail}
                      onChange={e => {
                        setForm({...form, contactEmail: e.target.value});
                        if (errors.contactEmail) setErrors(prev => ({ ...prev, contactEmail: false }));
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-8">
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="bg-brand text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <span>Next Section</span>}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.section>
            )}

            {step === 3 && (
              <motion.section 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <ImageIcon className="text-amber-500" size={20} />
                  </div>
                  <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Restaurant Image</h2>
                </div>

                <p className="text-slate-400 text-sm font-medium">Upload a high-quality cover image or provided a URL (Max 5MB). Mandatory for visibility.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-6">
                    <div className="relative p-8 border-4 border-dashed border-slate-300 rounded-[40px] flex flex-col items-center justify-center text-center group hover:border-brand/30 transition-all bg-slate-50/50">
                       <input 
                        type="file" 
                        accept=".jpeg,.jpg,.png"
                        className="hidden" 
                        id="imageUpload"
                        disabled={isUploading}
                        onChange={handleFileUpload}
                       />
                       <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center gap-4">
                          <div className={cn("w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center text-slate-300 group-hover:text-brand transition-colors", isUploading && "animate-pulse")}>
                             <ImageIcon size={32} />
                          </div>
                          <div>
                             <p className="font-normal text-[#363636] leading-[1.2] uppercase tracking-widest text-xs">
                                {isUploading ? 'Uploading...' : 'Upload Cover Image'}
                             </p>
                             <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">JPEG, PNG up to 5MB</p>
                          </div>
                       </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">... or paste Cover Image URL</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-5 flex items-center text-slate-400">
                          <Globe size={18} />
                        </div>
                        <input 
                          type="url"
                          placeholder="https://example.com/cover.jpg"
                          className="w-full pl-14 pr-5 py-5 bg-slate-50 border border-slate-300 rounded-3xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium text-sm"
                          value={form.image || ''}
                          onChange={e => setForm({...form, image: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cover Preview</label>
                    <div className="aspect-[4/3] w-full rounded-[40px] overflow-hidden bg-slate-50 border-4 border-white shadow-2xl relative group">
                      {form.image ? (
                        <img 
                          src={form.image} 
                          alt="Preview" 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                           <ImageIcon size={64} strokeWidth={1} />
                           <p className="font-black uppercase tracking-widest text-xs mt-4">No image selected</p>
                        </div>
                      )}
                      {form.image && (
                        <button 
                          onClick={() => setForm({...form, image: ''})}
                          className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-xl shadow-xl hover:scale-110 active:scale-95 transition-all"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-slate-300 space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                       <h3 className="text-sm uppercase tracking-widest text-[#363636] font-normal leading-[1.2]">Additional Images (Optional)</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Add photos of food, ambience or exterior</p>
                     </div>
                  </div>

                  <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-300 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Category</label>
                        <div className="flex gap-2">
                           {['Food', 'Ambience', 'Exterior', 'Other'].map(cat => (
                             <button
                                key={cat}
                                type="button"
                                onClick={() => (window as any)._imgCat = cat}
                                className={cn(
                                  "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                  (window as any)._imgCat === cat ? "bg-brand text-white border-brand" : "bg-white text-slate-400 border-slate-300 hover:border-brand/30"
                                )}
                                ref={el => { if (el && !(window as any)._imgCat) (window as any)._imgCat = 'Food' }}
                             >
                               {cat}
                             </button>
                           ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Add Image</label>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            className="flex-1 relative h-12 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all flex items-center justify-center gap-1.5"
                          >
                            <Plus size={14} /> Upload
                            <input 
                              type="file" 
                              accept=".jpeg,.jpg,.png" 
                              className="absolute inset-0 opacity-0 cursor-pointer" 
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const cat = (window as any)._imgCat || 'Food';
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const field = cat === 'Food' ? 'foodImages' : cat === 'Ambience' ? 'ambienceImages' : 'secondaryImages';
                                  setForm({ ...form, [field]: [...(form[field as keyof Restaurant] as string[] || []), reader.result as string] });
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </button>
                          <div className="flex-[2] relative">
                            <input 
                              id="additionalImgUrl"
                              placeholder="Paste Image URL & press Enter"
                              className="w-full h-12 px-4 bg-white border border-slate-300 rounded-2xl text-[10px] font-bold outline-none focus:border-brand transition-all"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const url = (e.target as HTMLInputElement).value.trim();
                                  if (url) {
                                    const cat = (window as any)._imgCat || 'Food';
                                    const field = cat === 'Food' ? 'foodImages' : cat === 'Ambience' ? 'ambienceImages' : 'secondaryImages';
                                    setForm({ ...form, [field]: [...(form[field as keyof Restaurant] as string[] || []), url] });
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {['Food', 'Ambience', 'Exterior'].map(cat => {
                        const field = cat === 'Food' ? 'foodImages' : cat === 'Ambience' ? 'ambienceImages' : 'secondaryImages';
                        const images = form[field as keyof Restaurant] as string[] || [];
                        if (images.length === 0) return null;
                        return (
                          <div key={cat} className="space-y-3">
                            <h4 className="text-[10px] text-brand uppercase tracking-widest flex items-center gap-2 font-normal leading-[1.2]">
                              {cat} <span className="h-px flex-grow bg-brand/10"></span>
                            </h4>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                               {images.map((img, idx) => (
                                 <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-sm group bg-white">
                                    <img src={img} alt={cat} className="w-full h-full object-cover" />
                                    <button 
                                      onClick={() => {
                                        const next = [...images];
                                        next.splice(idx, 1);
                                        setForm({ ...form, [field]: next });
                                      }}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                 </div>
                               ))}
                            </div>
                          </div>
                        );
                      })}
                      {(!form.foodImages?.length && !form.ambienceImages?.length && !form.secondaryImages?.length) && (
                        <div className="py-8 bg-white/50 border-2 border-dashed border-slate-300 rounded-[32px] flex flex-col items-center justify-center text-slate-300">
                           <ImageIcon size={32} strokeWidth={1} />
                           <p className="text-[8px] font-black uppercase tracking-widest mt-2">No additional images added yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-8">
                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="bg-brand text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <span>Next Section</span>}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.section>
            )}

            {step === 4 && (
              <motion.section 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm space-y-8"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <UtensilsCrossed className="text-emerald-500" size={20} />
                  </div>
                  <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Menu & Cuisines (Optional)</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Select Cuisines * (Min 1, Max 8)</label>
                       <span className="text-[10px] font-bold text-slate-400">Selected: {form.cuisine?.length || 0}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 p-5 bg-slate-50 rounded-3xl border border-slate-300 max-h-[250px] overflow-y-auto">
                      {sortedCuisines.map(c => {
                        const isSelected = form.cuisine?.includes(c.name);
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              const current = form.cuisine || [];
                              if (current.includes(c.name)) {
                                setForm({...form, cuisine: current.filter(item => item !== c.name)});
                              } else {
                                if (current.length >= 8) {
                                   showNotification('error', 'Maximum 8 cuisines allowed.');
                                   return;
                                }
                                setForm({...form, cuisine: [...current, c.name]});
                              }
                            }}
                            className={cn(
                              "px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold transition-all hover:border-brand/40",
                              isSelected ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" : "text-slate-600"
                            )}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Associate Collections (Optional)</label>
                       <span className="text-[10px] font-bold text-slate-400">Selected: {form.collections?.length || 0}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 p-5 bg-slate-50 rounded-3xl border border-slate-300 max-h-[250px] overflow-y-auto">
                      {sortedCollections.map(c => {
                        const isSelected = form.collections?.includes(c.slug);
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            onClick={() => {
                              const current = form.collections || [];
                              if (current.includes(c.slug)) {
                                setForm({...form, collections: current.filter(item => item !== c.slug)});
                              } else {
                                setForm({...form, collections: [...current, c.slug]});
                              }
                            }}
                            className={cn(
                              "px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold transition-all hover:border-brand/40",
                              isSelected ? "bg-brand text-white border-brand shadow-lg shadow-brand/20" : "text-slate-600"
                            )}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Popular Dishes</label>
                      <button 
                        type="button"
                        onClick={() => {
                          const next = [...(form.signatureDishes || [])];
                          next.push({ name: '', price: 0, description: '' });
                          setForm({...form, signatureDishes: next});
                        }}
                        className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Dish
                      </button>
                    </div>
                    <div className="space-y-3">
                       {form.signatureDishes?.map((dish, idx) => (
                         <div key={idx} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-300">
                            <div className="flex-grow space-y-3">
                              <input 
                                placeholder="Dish Name"
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:border-brand outline-none transition-all font-bold text-sm"
                                value={dish.name}
                                onChange={e => {
                                  const next = [...(form.signatureDishes || [])];
                                  next[idx].name = e.target.value;
                                  setForm({...form, signatureDishes: next});
                                }}
                              />
                              <input 
                                placeholder="Short description"
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:border-brand outline-none transition-all font-medium text-xs"
                                value={dish.description}
                                onChange={e => {
                                  const next = [...(form.signatureDishes || [])];
                                  next[idx].description = e.target.value;
                                  setForm({...form, signatureDishes: next});
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                               <input 
                                  type="number"
                                  placeholder="Price"
                                  className="w-24 px-4 py-2 bg-white border border-slate-300 rounded-xl focus:border-brand outline-none transition-all font-bold text-sm"
                                  value={dish.price || ''}
                                  onChange={e => {
                                    const next = [...(form.signatureDishes || [])];
                                    next[idx].price = parseInt(e.target.value) || 0;
                                    setForm({...form, signatureDishes: next});
                                  }}
                               />
                               {form.signatureDishes!.length > 1 && (
                                 <button 
                                  type="button"
                                  onClick={() => {
                                    const next = [...(form.signatureDishes || [])];
                                    next.splice(idx, 1);
                                    setForm({...form, signatureDishes: next});
                                  }}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                 >
                                   <Trash2 size={18} />
                                 </button>
                               )}
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-300 space-y-6">
                    <div className="flex items-center justify-between">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Menu Categories (e.g. Food, Drinks)</label>
                       <button 
                        type="button"
                        onClick={() => {
                          const next = [...(form.menuCategories || [])];
                          next.push({ id: Math.random().toString(36).substr(2, 9), name: 'New Category', images: [] });
                          setForm({...form, menuCategories: next});
                        }}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all flex items-center gap-1.5"
                       >
                         <Plus size={14} /> Add Category
                       </button>
                    </div>

                    <div className="space-y-4">
                       {form.menuCategories?.map((cat, catIdx) => (
                         <div key={cat.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-300 space-y-4">
                            <div className="flex items-center gap-4">
                               <input 
                                  className="flex-grow bg-white px-4 py-2 border border-slate-300 rounded-xl text-sm font-bold uppercase tracking-tight"
                                  value={cat.name}
                                  placeholder="Category Name"
                                  onChange={e => {
                                    const next = [...(form.menuCategories || [])];
                                    next[catIdx].name = e.target.value;
                                    setForm({...form, menuCategories: next});
                                  }}
                               />
                               <button 
                                 type="button"
                                 onClick={() => {
                                    const next = [...(form.menuCategories || [])];
                                    next.splice(catIdx, 1);
                                    setForm({...form, menuCategories: next});
                                 }}
                                 className="p-2 text-red-500 bg-white border border-slate-300 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                               {cat.images.map((img, imgIdx) => (
                                 <div key={imgIdx} className="relative aspect-[3/4] bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm group">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button 
                                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        const next = [...(form.menuCategories || [])];
                                        next[catIdx].images.splice(imgIdx, 1);
                                        setForm({...form, menuCategories: next});
                                      }}
                                    >
                                      <X size={10} />
                                    </button>
                                 </div>
                               ))}
                               <div className="relative aspect-[3/4] bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-300 hover:border-brand hover:text-brand transition-all overflow-hidden">
                                  <Plus size={24} />
                                  <p className="text-[8px] font-black uppercase mt-1">Upload File</p>
                                  <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer" 
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        const next = [...(form.menuCategories || [])];
                                        next[catIdx].images.push(reader.result as string);
                                        setForm({...form, menuCategories: next});
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                  />
                                </div>

                               <div className="relative aspect-[3/4] group/paste">
                                 <div 
                                   className="w-full h-full bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-300 hover:border-brand hover:text-brand transition-all cursor-pointer overflow-hidden"
                                 >
                                    <Globe size={24} />
                                    <p className="text-[8px] font-black uppercase mt-1">Paste URL</p>
                                 </div>
                                 <div className="absolute inset-0 opacity-0 group-hover/paste:opacity-100 transition-opacity bg-white/95 backdrop-blur p-2 flex flex-col items-center justify-center gap-2 rounded-xl">
                                    <input 
                                      type="url"
                                      placeholder="Paste Image URL"
                                      className="w-full px-2 py-1.5 text-[8px] border border-slate-300 rounded-lg outline-none focus:border-brand font-bold"
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          const url = (e.target as HTMLInputElement).value;
                                          if (url) {
                                            const next = [...(form.menuCategories || [])];
                                            next[catIdx] = {
                                              ...next[catIdx],
                                              images: [...next[catIdx].images, url]
                                            };
                                            setForm({...form, menuCategories: next});
                                            (e.target as HTMLInputElement).value = '';
                                          }
                                        }
                                      }}
                                    />
                                    <p className="text-[7px] font-black uppercase text-slate-400">Press Enter</p>
                                 </div>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-8">
                  <button 
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="bg-brand text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <span>Next Section</span>}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.section>
            )}

            {step === 5 && (
              <motion.section 
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm space-y-6"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Clock className="text-amber-500" size={20} />
                  </div>
                  <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Dining Timings</h2>
                </div>

                <div className="space-y-4">
                   {DAYS_OF_WEEK.map(day => (
                     <div key={day} className="p-6 bg-slate-50 rounded-3xl border border-slate-300 space-y-4">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <span className="font-normal text-[#363636] leading-[1.2] tracking-wider uppercase text-xs min-w-[80px]">{day}</span>
                              <div className="flex bg-white rounded-lg border border-slate-300 p-0.5">
                                 <button 
                                    type="button"
                                    onClick={() => {
                                       const next = { ...form.dailyTimings };
                                       next[day].closed = false;
                                       setForm({...form, dailyTimings: next});
                                    }}
                                    className={cn(
                                       "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                                       !form.dailyTimings![day].closed ? "bg-emerald-500 text-white" : "text-slate-400 hover:bg-slate-50"
                                    )}
                                 >Open</button>
                                 <button 
                                    type="button"
                                    onClick={() => {
                                       const next = { ...form.dailyTimings };
                                       next[day].closed = true;
                                       setForm({...form, dailyTimings: next});
                                    }}
                                    className={cn(
                                       "px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all",
                                       form.dailyTimings![day].closed ? "bg-red-500 text-white" : "text-slate-400 hover:bg-slate-50"
                                    )}
                                 >Closed</button>
                              </div>
                           </div>
                           {!form.dailyTimings![day].closed && (
                              <button 
                                 type="button"
                                 onClick={() => copyTimingsToAll(day)}
                                 className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                              >
                                 Copy to all days
                              </button>
                           )}
                        </div>

                        {!form.dailyTimings![day].closed && (
                           <div className="space-y-3">
                              {form.dailyTimings![day].ranges.map((range, ride) => (
                                <div key={ride} className="flex items-center gap-3">
                                   <input 
                                      type="time" 
                                      className="flex-grow px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                                      value={convertTo24Hour(range.open)}
                                      onChange={e => {
                                         const next = { ...form.dailyTimings };
                                         next[day].ranges[ride].open = convertTo12Hour(e.target.value);
                                         setForm({...form, dailyTimings: next});
                                      }}
                                   />
                                   <span className="text-slate-300 font-bold text-xs uppercase tracking-widest">to</span>
                                   <input 
                                      type="time" 
                                      className="flex-grow px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                                      value={convertTo24Hour(range.close)}
                                      onChange={e => {
                                         const next = { ...form.dailyTimings };
                                         next[day].ranges[ride].close = convertTo12Hour(e.target.value);
                                         setForm({...form, dailyTimings: next});
                                      }}
                                   />
                                   {ride > 0 && (
                                     <button 
                                      onClick={() => {
                                        const next = { ...form.dailyTimings };
                                        next[day].ranges.splice(ride, 1);
                                        setForm({...form, dailyTimings: next});
                                      }}
                                      className="p-2 text-red-500"
                                     >
                                       <X size={16} />
                                     </button>
                                   )}
                                </div>
                              ))}
                              <button 
                                type="button"
                                onClick={() => addTimingSlot(day)}
                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-all"
                              >
                                + Add Time Slot
                              </button>
                           </div>
                        )}
                        {form.dailyTimings![day].closed && (
                           <div className="py-4 text-center">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Restaurant is mark closed on this day</p>
                           </div>
                        )}
                     </div>
                   ))}
                </div>

                <div className="flex justify-between pt-8">
                  <button 
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handleNext}
                    disabled={isSaving}
                    className="bg-slate-900 text-white px-12 py-5 rounded-[24px] font-black text-xl shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <ChevronRight size={24} />}
                    Next: Amenities
                  </button>
                </div>
              </motion.section>
            )}

            {step === 6 && (
              <motion.section 
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl p-8 border border-slate-300 shadow-sm space-y-8"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="text-emerald-500" size={20} />
                  </div>
                  <h2 className="text-xl text-[#363636] font-normal leading-[1.2]">Amenities & Facilities</h2>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      'WiFi', 'AC', 'Parking', 'Valet Parking', 'Outdoor Seating', 
                      'Live Music', 'Bar', 'Vegetarian Friendly', 'Home Delivery',
                      'Takeaway', 'Card Payment', 'Digital Wallet', 'Kid Friendly',
                      'Smoking Area', 'Rooftop', 'Private Dining'
                    ].map(amenity => {
                      const facilitiesArray = Array.isArray(form.facilities) ? form.facilities : typeof form.facilities === 'string' ? (form.facilities as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                      const isSelected = facilitiesArray.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setForm({...form, facilities: facilitiesArray.filter((a:any) => a !== amenity)});
                            } else {
                              setForm({...form, facilities: [...facilitiesArray, amenity]});
                            }
                          }}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                            isSelected 
                              ? "bg-brand/5 border-brand ring-1 ring-brand/50 shadow-sm" 
                              : "bg-slate-50 border-slate-300 hover:border-slate-300"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                            isSelected ? "bg-brand text-white" : "bg-white border border-slate-300 text-slate-200 group-hover:border-brand/30"
                          )}>
                            {isSelected && <Check size={14} />}
                          </div>
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            isSelected ? "text-brand" : "text-slate-500"
                          )}>{amenity}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-300">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Other Amenities</label>
                    </div>
                    <div className="flex gap-3">
                      <input 
                        id="newAmenity"
                        placeholder="e.g. Pet Friendly, Poolside"
                        className="flex-grow px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-bold"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val && !form.facilities?.includes(val)) {
                              setForm({...form, facilities: [...(form.facilities || []), val]});
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('newAmenity') as HTMLInputElement;
                          const val = input.value.trim();
                          if (val && !form.facilities?.includes(val)) {
                            setForm({...form, facilities: [...(form.facilities || []), val]});
                            input.value = '';
                          }
                        }}
                        className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand transition-all shadow-lg"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {form.facilities?.filter(a => ![
                        'WiFi', 'AC', 'Parking', 'Valet Parking', 'Outdoor Seating', 
                        'Live Music', 'Bar', 'Vegetarian Friendly', 'Home Delivery',
                        'Takeaway', 'Card Payment', 'Digital Wallet', 'Kid Friendly',
                        'Smoking Area', 'Rooftop', 'Private Dining'
                       ].includes(a)).map(a => (
                         <span key={a} className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-slate-600 border border-slate-300">
                           {a}
                           <button 
                            type="button"
                            onClick={() => setForm({...form, facilities: form.facilities?.filter(item => item !== a)})}
                            className="text-slate-400 hover:text-red-500"
                           >
                              <X size={12} />
                           </button>
                         </span>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-8">
                  <button 
                    type="button"
                    onClick={() => setStep(5)}
                    className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSaving}
                    className="bg-slate-900 text-white px-12 py-5 rounded-[24px] font-black text-xl shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                    Submit Application
                  </button>
                </div>
              </motion.section>
            )}

            {step === 7 && (
              <motion.section 
                key="step6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[48px] p-12 border border-slate-300 shadow-2xl text-center space-y-8"
              >
                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
                   <ShieldCheck size={48} />
                </div>
                
                <div>
                  <h2 className="text-3xl text-[#363636] font-normal leading-[1.2]">Application Submitted</h2>
                  <p className="text-slate-500 font-medium mt-3">Your restaurant ID is <span className="text-brand font-black font-mono">#{restaurantId?.slice(-6).toUpperCase()}</span></p>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-300 max-w-sm mx-auto">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                      Status: <span className="text-amber-500">Pending for Approval</span>
                   </p>
                   <p className="text-[10px] text-slate-400 mt-2">
                     Your entry is currently in the review queue. It will not be visible to users until an admin approves it.
                   </p>
                </div>

                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black text-lg hover:bg-brand transition-all shadow-xl shadow-slate-900/10"
                >
                   Return to Dashboard
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
