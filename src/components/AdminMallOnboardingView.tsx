import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Mall } from '../types';
import { IndianRupee, MapPin, Store, Image as ImageIcon, AlertCircle, CheckCircle2, ChevronLeft, Save, Navigation, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useMasterData } from './MasterDataContext';
import { uploadImageToStorage } from '../lib/storage';

export default function AdminMallOnboardingView() {
  const navigate = useNavigate();
  const { cities } = useMasterData();
  const [form, setForm] = useState<Partial<Mall>>({
    name: '',
    image: '',
    location: '',
    address: '',
    area: '',
    city: 'Pune',
    pincode: '',
    lat: 0,
    lng: 0,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleGeocodeAddress = async () => {
    const { name, area, city, pincode, address } = form;
    if (!area || !city) {
      showNotification('error', 'Area and City are required to locate on map.');
      return;
    }
    
    setIsGeocoding(true);
    try {
      const queriesToTry = [
        [name, area, city, pincode].filter(Boolean).join(', '),
        [area, city, pincode].filter(Boolean).join(', '),
        [area, city].filter(Boolean).join(', '),
        [city].filter(Boolean).join(', ')
      ];

      let foundData = null;

      for (const queryStr of queriesToTry) {
        if (!queryStr) continue;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1&countrycodes=in&email=rec.abhishek@gmail.com`,
          { headers: { 'Accept-Language': 'en-US,en;q=0.5' } }
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          foundData = data[0];
          break;
        }

        // Wait 1.5 seconds between requests as per Nominatim usage policy (1req/s max)
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      if (foundData) {
        setForm({ ...form, lat: parseFloat(foundData.lat), lng: parseFloat(foundData.lon) });
        showNotification('success', 'Lat/Lng fetched successfully!');
      } else {
        showNotification('error', 'Could not find coordinates for this address.');
      }
    } catch (error) {
      console.error(error);
      showNotification('error', 'Failed to fetch coordinates.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadImageToStorage(file, 'malls');
      setForm({ ...form, image: url });
      showNotification('success', 'Image uploaded successfully!');
    } catch (error: any) {
      console.error(error);
      showNotification('error', error.message || 'Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.city || !form.location || !form.area) {
      showNotification('error', 'Name, City, Location, and Area are required');
      return;
    }
    
    setIsSaving(true);
    try {
      const finalData: any = {
        ...form,
        createdAt: serverTimestamp(),
      };
      
      // Strip undefined properties to prevent Firestore SDK errors
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === undefined) {
          delete finalData[key];
        }
      });

      await addDoc(collection(db, 'malls'), finalData);
      showNotification('success', 'Mall onboarded successfully!');
      setTimeout(() => navigate('/admin'), 1500);
    } catch (e: any) {
      showNotification('error', e.message || 'Error saving mall');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="font-bold text-lg text-[#363636] leading-tight">Onboard Food Court / Mall</h1>
            <p className="text-xs text-slate-500">Add a new mall to the platform</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-brand border-b border-slate-100 pb-4">
                <Store size={24} />
                <h2 className="font-bold text-lg text-[#363636]">Mall Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Mall Name *</label>
                  <input
                    placeholder="e.g. Phoenix Marketcity"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-4 md:col-span-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Mall Image (Optional)</label>
                  
                  {form.image && (
                    <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden bg-slate-100 relative">
                      <img src={form.image} alt="Mall preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setForm({ ...form, image: '' })}
                        className="absolute top-4 right-4 bg-red-500 text-white p-2 text-xs font-bold rounded-lg shadow"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {!form.image && (
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="flex-1 w-full">
                        <input
                          placeholder="Image URL"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                          value={form.image || ''}
                          onChange={e => setForm({ ...form, image: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center justify-center w-full md:w-auto h-full">
                        <label className="relative flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:bg-slate-50 hover:border-brand cursor-pointer transition-colors whitespace-nowrap text-[#363636] font-medium w-full">
                          {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                          <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload} 
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">City *</label>
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium appearance-none"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                  >
                    <option value="">Select City</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.name}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Pincode</label>
                  <input
                    placeholder="e.g. 411014"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                    value={form.pincode}
                    onChange={e => setForm({ ...form, pincode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Area / Locality *</label>
                  <input
                    placeholder="e.g. Viman Nagar"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                    value={form.area}
                    onChange={e => setForm({ ...form, area: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Location Subtitle *</label>
                  <input
                    placeholder="e.g. Ground Floor, Right Wing"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Full Address</label>
                  <textarea
                    placeholder="e.g. S No. 207, Viman Nagar Road..."
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium min-h-[100px] resize-y"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="space-y-4 md:col-span-2 p-6 rounded-2xl bg-brand/5 border border-brand/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[#363636] font-bold">Map Coordinates</h3>
                      <p className="text-slate-500 text-sm">Used for distance calculation</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGeocodeAddress}
                      disabled={isGeocoding}
                      className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-brand/90 transition-colors disabled:opacity-50"
                    >
                      {isGeocoding ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                      Fetch from Address
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Latitude</label>
                      <input
                        type="number"
                        placeholder="Latitude"
                        className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                        value={form.lat || ''}
                        onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Longitude</label>
                      <input
                        type="number"
                        placeholder="Longitude"
                        className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium"
                        value={form.lng || ''}
                        onChange={e => setForm({ ...form, lng: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-[#363636] text-white px-8 py-3 rounded-xl font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>{isSaving ? 'Saving...' : 'Save Details'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border text-white font-medium",
            notification.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-red-600 border-red-500'
          )}>
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}
