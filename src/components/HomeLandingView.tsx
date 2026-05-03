import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Navigation, TrendingUp, Star, Zap, ChevronRight, ChevronDown, Clock, X, UtensilsCrossed, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocationContext } from './LocationContext';
import { useMasterData } from './MasterDataContext';
import { cn } from '../lib/utils';
import { useRestaurants } from '../hooks/useFirebase';

export default function HomeLandingView() {
  const navigate = useNavigate();
  const { cities } = useMasterData();
  const { setCity, setCoords, detectLocation, isDetecting } = useLocationContext();
  const { restaurants } = useRestaurants(true);
  const [searchValue, setSearchValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCitySelect = (cityName: string, lat?: number, lng?: number) => {
    const trimmedInput = cityName.trim();
    if (!trimmedInput) return;

    const cityData = cities.find(c => c.name.toLowerCase() === trimmedInput.toLowerCase() && c.lat !== 0);
    
    if (cityData) {
      // Valid & Supported
      setCity(cityData.name);
      setCoords({ lat: lat || cityData.lat, lng: lng || cityData.lng });
      navigate(`/city/${cityData.name.toLowerCase()}`);
    } else {
      // Check if it's a known city but unsupported
      const isKnown = cities.some(c => c.name.toLowerCase() === trimmedInput.toLowerCase() && c.isKnown);
      
      if (isKnown) {
        // Valid but Unsupported
        navigate(`/error?city=${encodeURIComponent(trimmedInput)}&type=unsupported`);
      } else {
        // Completely Invalid
        navigate(`/error?city=${encodeURIComponent(trimmedInput)}&type=invalid`);
      }
      // Note: setCity is NOT called for invalid/unsupported locations as requested
    }
    setShowSuggestions(false);
  };

  const handleSuggestionSelect = (suggestion: any) => {
    if (suggestion.type === 'city') {
      const cityData = cities.find(c => c.name === suggestion.name);
      if (cityData) {
        setCity(cityData.name);
        setCoords({ lat: cityData.lat, lng: cityData.lng });
        navigate(`/city/${cityData.name.toLowerCase()}`);
      }
    } else if (suggestion.type === 'restaurant') {
      // If we select a restaurant, we usually need the city context if there's any state relying on it,
      // but navigating to restaurant directly should work independently.
      navigate(`/restaurant/${suggestion.restaurantId}`);
    }
    setShowSuggestions(false);
  };

  const handleSearchSubmit = () => {
    const trimmedInput = searchValue.trim();
    if (!trimmedInput) return;

    // First try finding an exact match
    const exactCity = cities.find(c => c.name.toLowerCase() === trimmedInput.toLowerCase() && c.lat !== 0);
    if (exactCity) {
      handleSuggestionSelect({ type: 'city', name: exactCity.name });
      return;
    }

    const exactRestaurant = restaurants.find(r => r.name.toLowerCase() === trimmedInput.toLowerCase());
    if (exactRestaurant) {
      handleSuggestionSelect({ type: 'restaurant', restaurantId: exactRestaurant.id });
      return;
    }

    // Since we didn't find an exact match, check for partial matches and redirect to the first suggestion
    const firstSuggestion = suggestions[0];
    if (firstSuggestion) {
       handleSuggestionSelect(firstSuggestion);
       return;
    }

    // If nothing matches completely, do the default unsupported/invalid check for City
    const isKnown = cities.some(c => c.name.toLowerCase() === trimmedInput.toLowerCase() && c.isKnown);
    if (isKnown) {
      navigate(`/error?city=${encodeURIComponent(trimmedInput)}&type=unsupported`);
    } else {
      navigate(`/error?city=${encodeURIComponent(trimmedInput)}&type=invalid`);
    }
    setShowSuggestions(false);
  };

  const normalizedSearch = searchValue.trim().toLowerCase();
  
  const citySuggestions = normalizedSearch 
    ? cities
        .filter(c => c.name.toLowerCase().includes(normalizedSearch) && c.lat !== 0)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => ({ 
           type: 'city', 
           id: `city-${c.name}`, 
           name: c.name, 
           image: c.image, 
           subtitle: 'City' 
        }))
    : [];

  const restaurantSuggestions = normalizedSearch
    ? restaurants
        .filter(r => r.name.toLowerCase().includes(normalizedSearch))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(r => ({ 
           type: 'restaurant', 
           id: `res-${r.id}`, 
           name: r.name, 
           image: r.image || '', 
           city: r.city || r.location, 
           restaurantId: r.id, 
           subtitle: 'Restaurant' 
        }))
    : [];

  const suggestions = [...citySuggestions, ...restaurantSuggestions].slice(0, 10);

  const handleDetectLocation = async () => {
    await detectLocation();
    // After detection, the context city is updated. 
    // We can either stay here or navigate to a generic page that shows the detected city.
    // navigated to /city/nearby which will now display the detected city name thanks to our CityView fix.
    navigate('/city/nearby');
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[600px] flex items-center justify-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-50"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-900"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-7xl font-display font-black text-white mb-6 leading-tight drop-shadow-2xl">
              Book the perfect table,<br />
              <span className="text-brand">wherever you are.</span>
            </h1>
            <p className="text-base md:text-xl text-slate-100 mb-8 md:mb-12 max-w-2xl mx-auto drop-shadow-md">
              Discover and book the finest dining experiences at the best restaurants in your city.
            </p>
            
            <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-3 md:gap-4 relative px-4 md:px-0" ref={searchRef}>
              <div className="flex-grow relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-vibrant-gray group-focus-within:text-brand transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Search cities or restaurants..."
                  className="w-full pl-12 pr-4 py-4 md:py-5 bg-white border-2 border-transparent focus:border-brand rounded-2xl text-lg font-bold outline-none shadow-elevation transition-all placeholder:text-slate-300"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                       handleSearchSubmit();
                    }
                  }}
                />

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-slate-100 max-h-72 overflow-y-auto"
                    >
                      {suggestions.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => handleSuggestionSelect(item)}
                          className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group/item"
                        >
                          <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                             {item.image ? (
                               <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                             ) : (
                               <MapPin className="text-slate-400" size={20} />
                             )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 group-hover/item:text-brand transition-colors truncate">
                                {item.name}
                                {item.type === 'restaurant' && item.city && <span className="font-bold text-slate-400 ml-2">({item.city})</span>}
                            </p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{item.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button 
                onClick={handleSearchSubmit}
                className="w-full md:w-auto bg-brand text-white px-10 py-4 md:py-5 rounded-2xl font-black text-lg hover:bg-brand-dark transition-all transform active:scale-95 shadow-lg shadow-brand/40"
              >
                Search
              </button>
            </div>

            <div className="mt-8">
              <button 
                onClick={handleDetectLocation}
                className="inline-flex items-center gap-2 text-white/80 hover:text-white font-bold transition-colors bg-white/10 backdrop-blur-md px-6 py-3 rounded-full hover:bg-white/20"
              >
                <Navigation size={18} className={isDetecting ? 'animate-spin' : ''} />
                {isDetecting ? 'Detecting Location...' : 'Use Current Location'}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Popular Cities */}
      <section className="max-w-7xl mx-auto px-4 py-24 md:py-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-black text-vibrant-dark mb-4">
            Popular Cities
          </h2>
          <p className="text-vibrant-gray font-medium text-lg">
            Find the best restaurants in these dining hotspots
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-6 md:gap-8">
          {[...cities]
            .filter(c => c.isPopular)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((city, index) => (
            <motion.button
              key={city.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleCitySelect(city.name, city.lat, city.lng)}
              className="group flex flex-col items-center gap-4 focus:outline-none"
            >
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-vibrant group-hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
                <img 
                  src={city.image} 
                  alt={city.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
              </div>
              <span className="text-lg font-black text-vibrant-dark group-hover:text-brand transition-colors">
                {city.name}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Features / Why Bookmytable */}
      <section className="bg-slate-50 py-24 md:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-display font-black text-vibrant-dark mb-16 leading-tight">
              Your <span className="text-brand">Fine Dining</span> Experience<br />
              Starts Right Here.
            </h2>
            
            <div className="grid md:grid-cols-3 gap-12">
              {[
                { 
                  icon: Zap, 
                  title: 'Instant Confirmations', 
                  desc: 'No more waiting on hold. Book your table and get instant confirmation via SMS and Email.',
                  color: 'text-vibrant-success bg-vibrant-success/10'
                },
                { 
                  icon: TrendingUp, 
                  title: 'Top Rated Spots', 
                  desc: 'Curated selection of high-rated restaurants based on real customer feedback and food quality.',
                  color: 'text-brand bg-brand/10'
                },
                { 
                  icon: Clock, 
                  title: 'Flexible Bookings', 
                  desc: 'Modify or cancel your bookings on the go. Planning a last-minute dinner was never this easy.',
                  color: 'text-amber-500 bg-amber-500/10'
                },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className={cn("shrink-0 w-20 h-20 rounded-3xl flex items-center justify-center", item.color)}>
                    <item.icon size={36} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-vibrant-dark mb-3">{item.title}</h3>
                    <p className="text-vibrant-gray font-medium leading-relaxed text-sm md:text-base">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Onboarding Section */}
      <section id="onboarding-request" className="py-24 md:py-32 bg-vibrant-dark text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl md:text-6xl font-display font-black mb-8 leading-tight">
                  Grow your business with <span className="text-brand">Bookmytable</span>
                </h2>
                <p className="text-xl text-white/70 mb-12 font-medium leading-relaxed">
                  Join thousands of restaurant owners who are reaching more customers and streamlining their bookings with our platform.
                </p>
                
                <div className="space-y-6 mb-12">
                   {[
                     'Zero onboarding fee for the first 3 months',
                     'Real-time booking management dashboard',
                     'Performance analytics and insights',
                     'Dedicated partner support team'
                   ].map((item, i) => (
                     <div key={i} className="flex items-center gap-4">
                        <div className="w-6 h-6 bg-brand/20 rounded-full flex items-center justify-center">
                           <div className="w-2 h-2 bg-brand rounded-full" />
                        </div>
                        <span className="font-bold text-white/90">{item}</span>
                     </div>
                   ))}
                </div>

                <div className="flex flex-wrap gap-6">
                  <button 
                    onClick={() => navigate('/owner')}
                    className="bg-brand text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand/20 hover:scale-105 transition-all"
                  >
                    Register as Partner
                  </button>
                  <button 
                    onClick={() => navigate('/contact')}
                    className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-10 py-5 rounded-2xl font-black text-lg hover:bg-white/20 transition-all"
                  >
                    Contact Sales
                  </button>
                </div>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
                <div className="bg-gradient-to-br from-brand to-brand-dark p-1 rounded-2xl shadow-2xl">
                   <div className="bg-slate-900 rounded-2xl overflow-hidden p-8 md:p-12">
                    {onboardingSubmitted ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-vibrant-success/20 text-vibrant-success rounded-full flex items-center justify-center mx-auto mb-4">
                           <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-display font-black mb-2">Request Received!</h3>
                        <p className="text-white/60 mb-6 font-medium">Our team will get in touch with you shortly.</p>
                        <button 
                          onClick={() => setOnboardingSubmitted(false)}
                          className="text-brand font-bold hover:underline text-sm uppercase tracking-widest"
                        >
                          Submit Another
                        </button>
                      </div>
                    ) : (
                      <form 
                        className="space-y-6"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setIsSubmittingOnboarding(true);
                          try {
                            const formData = new FormData(e.currentTarget);
                            const data = Object.fromEntries(formData.entries());
                            const response = await fetch('/api/contact', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({...data, subject: 'Onboarding Request'}),
                            });
                            if (response.ok) setOnboardingSubmitted(true);
                          } catch (error) {
                            console.error('Failed to submit', error);
                          } finally {
                            setIsSubmittingOnboarding(false);
                          }
                        }}
                      >
                         <h3 className="text-2xl font-display font-black text-center mb-8">Onboarding Request</h3>
                         
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Owner Name</label>
                            <input required name="name" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors font-bold" placeholder="E.g. John Doe" />
                         </div>

                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Email Address</label>
                            <input required name="email" type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors font-bold" placeholder="E.g. john@spice-garden.com" />
                         </div>

                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Restaurant Name</label>
                            <input required name="restaurantName" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors font-bold" placeholder="E.g. Spice Garden" />
                         </div>
                         
                         <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Contact Number</label>
                            <div className="flex gap-2">
                               <span className="bg-white/5 px-4 py-3 rounded-xl font-bold border border-white/10">+91</span>
                               <input required name="phone" type="tel" className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors font-bold" placeholder="9988776655" />
                            </div>
                         </div>
                         
                         <button 
                            type="submit" 
                            disabled={isSubmittingOnboarding}
                            className="w-full bg-brand py-4 rounded-xl font-black tracking-widest uppercase text-sm mt-4 shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                         >
                            {isSubmittingOnboarding ? 'Submitting...' : 'Get a call back'}
                         </button>
                      </form>
                    )}
                 </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-brand/10 rounded-full blur-3xl -z-10"></div>
            </motion.div>
          </div>
        </div>
        
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      </section>

      {/* CTA section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-display font-black text-vibrant-dark mb-10 leading-tight">
            Ready to explore the best<br />
            cuisines in your town?
          </h2>
          <button 
            onClick={() => handleCitySelect('Bangalore', 12.9716, 77.5946)}
            className="group relative inline-flex items-center gap-3 bg-vibrant-dark text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-black transition-all shadow-xl active:scale-95 overflow-hidden"
          >
            <span className="relative z-10">Start Exploring Now</span>
            <ChevronRight className="relative z-10 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-brand to-brand-dark opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>
      </section>

      {/* Download App Section */}
      <section className="pb-24 px-4">
         <div className="max-w-6xl mx-auto bg-gradient-to-br from-slate-900 to-vibrant-dark rounded-3xl p-10 md:p-20 relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12 group shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)]">
            <div className="relative z-10 max-w-xl">
               <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-6 leading-tight">
                  Download the <span className="text-brand">Bookmytable</span> Mobile App
               </h2>
               <p className="text-xl text-white/60 mb-10 font-medium">
                  Experience seamless dining discovery and instant table reservations right from your fingertips. Available on iOS and Android.
               </p>
               <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <a href="#" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-8 py-4 rounded-2xl transition-all flex items-center gap-3 group/btn">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                       <Zap size={20} className="text-white fill-white" />
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] font-black uppercase text-white/40 leading-none mb-1">Get it on</p>
                       <p className="text-lg font-black text-white leading-none">Play Store</p>
                    </div>
                  </a>
                  <a href="#" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-8 py-4 rounded-2xl transition-all flex items-center gap-3 group/btn">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                       <Zap size={20} className="text-white fill-white" />
                    </div>
                    <div className="text-left">
                       <p className="text-[10px] font-black uppercase text-white/40 leading-none mb-1">Download on the</p>
                       <p className="text-lg font-black text-white leading-none">App Store</p>
                    </div>
                  </a>
               </div>
            </div>
            
            <div className="relative scale-110 md:translate-x-10">
               <div className="w-64 h-[500px] bg-slate-900 rounded-[2.5rem] border-[8px] border-slate-800 shadow-2xl relative overflow-hidden group-hover:-translate-y-4 transition-transform duration-700">
                  {/* Phone Notch/Header */}
                  <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 z-30 flex items-center justify-center">
                     <div className="w-16 h-1 bg-slate-700 rounded-full" />
                  </div>
                  
                  {/* App Content Preview */}
                  <div className="absolute inset-0 bg-white pt-6 overflow-hidden flex flex-col">
                    {/* Tiny App Header */}
                    <div className="px-3 py-2 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm z-10">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={10} className="text-brand" />
                        <span className="text-[9px] font-black text-slate-900">Pune, Maharashtra</span>
                        <ChevronDown size={8} className="text-slate-400" />
                      </div>
                      <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-brand/20 rounded-full" />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-none pb-12">
                      {/* Tiny App Hero */}
                      <div className="px-3 py-3 space-y-3">
                         <div className="space-y-1">
                           <h4 className="text-[10px] font-black text-slate-900 leading-tight">Explore the best<br/>dining in Pune</h4>
                           <div className="h-1.5 w-12 bg-brand/20 rounded-full" />
                         </div>
                         <div className="h-7 w-full bg-slate-50 border border-slate-100 rounded-lg flex items-center px-2 shadow-sm">
                            <Search size={10} className="text-slate-300 mr-1.5" />
                            <div className="h-1.5 w-24 bg-slate-200/50 rounded-full" />
                         </div>
                      </div>

                      {/* Tiny Categories */}
                      <div className="px-3 space-y-2 mb-4">
                         <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-900 uppercase tracking-wider">Cuisines</span>
                            <div className="h-1 w-6 bg-brand/10 rounded-full" />
                         </div>
                         <div className="flex gap-2 overflow-x-auto scrollbar-none">
                            {['Italian', 'Chinese', 'Indian', 'Bakery'].map((c, i) => (
                              <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                                 <div className={cn("w-10 h-10 rounded-lg shadow-sm border border-slate-50", i === 0 ? "bg-brand/10" : "bg-slate-50")} />
                                 <div className="h-1 w-6 bg-slate-200 rounded-full" />
                              </div>
                            ))}
                         </div>
                      </div>

                      {/* Tiny Restaurant List */}
                      <div className="px-3 space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-900 uppercase tracking-wider">Trending Now</span>
                         </div>
                         {[1,2,3].map(i => (
                           <div key={i} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                              <div className="h-20 w-full bg-slate-100 relative">
                                 <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm flex items-center gap-0.5">
                                    <Star size={6} className="fill-brand text-brand" />
                                    <span className="text-[6px] font-black text-brand">4.5</span>
                                 </div>
                                 <div className="absolute bottom-2 left-2 h-3.5 w-16 bg-brand/90 rounded px-1 flex items-center gap-1">
                                    <Zap size={6} className="text-white fill-white" />
                                    <span className="text-[6px] font-black text-white uppercase">50% OFF</span>
                                 </div>
                              </div>
                              <div className="p-2 space-y-1">
                                 <div className="flex justify-between items-start">
                                    <div className="h-2 w-16 bg-slate-900 rounded-full" />
                                 </div>
                                 <div className="flex justify-between">
                                    <div className="h-1.5 w-12 bg-slate-300 rounded-full" />
                                    <div className="h-1.5 w-8 bg-slate-200 rounded-full" />
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>

                    {/* Tiny Tab Bar */}
                    <div className="absolute bottom-0 inset-x-0 border-t border-slate-100 px-6 py-3 flex justify-between bg-white/90 backdrop-blur-md">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i === 1 ? "bg-brand" : "bg-slate-200")} />
                        ))}
                    </div>
                  </div>

                  {/* Glass overlay for realism */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none z-20" />
               </div>
               
               {/* Decorative floating stats */}
               <motion.div 
                 animate={{ y: [0, -10, 0] }}
                 transition={{ duration: 4, repeat: Infinity }}
                 className="absolute -right-8 top-20 bg-brand text-white px-4 py-2 rounded-xl shadow-2xl font-black text-xs"
               >
                  4.8 ★ Ratings
               </motion.div>
               <motion.div 
                 animate={{ y: [0, 10, 0] }}
                 transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                 className="absolute -left-12 bottom-40 bg-white text-vibrant-dark px-4 py-2 rounded-xl shadow-2xl font-black text-xs"
               >
                  1M+ Downloads
               </motion.div>
            </div>
            
            {/* Background blurred circles */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-brand/20 rounded-full blur-[100px] -z-0" />
            <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-brand/10 rounded-full blur-[120px] -z-0" />
         </div>
      </section>
    </div>
  );
}
