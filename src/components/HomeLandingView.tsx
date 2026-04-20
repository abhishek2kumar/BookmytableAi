import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Navigation, TrendingUp, Star, Zap, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocationContext } from './LocationContext';
import { cn } from '../lib/utils';

const POPULAR_CITIES = [
  { name: 'Bangalore', image: 'https://i.pinimg.com/736x/65/2e/12/652e12e6d11188f44bf0094ad8bc245c.jpg??auto=format&fit=crop&q=80&w=400', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', image: 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&q=80&w=400', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', image: 'https://i.pinimg.com/736x/8b/94/6c/8b946c6b3a6d452dbea16a0ac556aa4d.jpg??auto=format&fit=crop&q=80&w=400', lat: 28.6139, lng: 77.2090 },
  { name: 'Hyderabad', image: 'https://i.pinimg.com/736x/b8/d0/6d/b8d06d9cea5a9831857e093f3403de37.jpg?auto=format&fit=crop&q=80&w=400', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=400', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', image: 'https://i.pinimg.com/736x/72/4f/96/724f96ae23d7889cc27caf8563427d0c.jpg?auto=format&fit=crop&q=80&w=400', lat: 18.5204, lng: 73.8567 },
  { name: 'Kolkata', image: 'https://i.pinimg.com/736x/9a/de/33/9ade339aeb1fcd1d74195b062d3e8191.jpg?auto=format&fit=crop&q=80&w=400', lat: 22.5726, lng: 88.3639 },
  { name: 'Jaipur', image: 'https://i.pinimg.com/736x/69/39/b1/6939b19b873db0e4d3402f9d3eff7528.jpg?auto=format&fit=crop&q=80&w=400', lat: 26.9124, lng: 75.7873 }
];

export default function HomeLandingView() {
  const navigate = useNavigate();
  const { setCity, setCoords, detectLocation, isDetecting } = useLocationContext();
  const [searchValue, setSearchValue] = useState('');

  const handleCitySelect = (city: string, lat: number, lng: number) => {
    setCity(city);
    setCoords({ lat, lng });
    navigate(`/city/${city.toLowerCase()}`);
  };

  const handleDetectLocation = async () => {
    await detectLocation();
    navigate('/city/nearby');
  };

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-50"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-900"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-6 leading-tight drop-shadow-2xl">
              Book the perfect table,<br />
              <span className="text-brand">wherever you are.</span>
            </h1>
            <p className="text-xl text-slate-100 mb-12 max-w-2xl mx-auto drop-shadow-md">
              Discover and book the finest dining experiences at the best restaurants in your city.
            </p>
            
            <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-4">
              <div className="flex-grow relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-vibrant-gray group-focus-within:text-brand transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Enter your city (e.g. Pune, Bangalore)"
                  className="w-full pl-12 pr-4 py-4 md:py-5 bg-white border-2 border-transparent focus:border-brand rounded-2xl text-lg font-bold outline-none shadow-elevation transition-all placeholder:text-slate-300"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchValue) {
                       handleCitySelect(searchValue, 0, 0); // Logic for general city search could be improved with geocoding
                    }
                  }}
                />
              </div>
              <button 
                onClick={() => searchValue && handleCitySelect(searchValue, 0, 0)}
                className="bg-brand text-white px-10 py-4 md:py-5 rounded-2xl font-black text-lg hover:bg-brand-dark transition-all transform active:scale-95 shadow-lg shadow-brand/40"
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
          {POPULAR_CITIES.map((city, index) => (
            <motion.button
              key={city.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleCitySelect(city.name, city.lat, city.lng)}
              className="group flex flex-col items-center gap-4 focus:outline-none"
            >
              <div className="relative w-full aspect-square rounded-[2rem] overflow-hidden shadow-vibrant group-hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2">
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

      {/* Features / Why BookMyTable */}
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
      <section className="py-24 md:py-32 bg-vibrant-dark text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl md:text-6xl font-display font-black mb-8 leading-tight">
                  Grow your business with <span className="text-brand">BookMyTable</span>
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
              <div className="bg-gradient-to-br from-brand to-brand-dark p-1 rounded-[3rem] shadow-2xl">
                 <div className="bg-slate-900 rounded-[2.8rem] overflow-hidden p-8 md:p-12">
                    <div className="space-y-6">
                       <h3 className="text-2xl font-display font-black text-center mb-8">Onboarding Request</h3>
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Restaurant Name</label>
                          <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors font-bold" placeholder="E.g. Spice Garden" />
                       </div>
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2 block">Contact Number</label>
                          <div className="flex gap-2">
                             <span className="bg-white/5 px-4 py-3 rounded-xl font-bold">+91</span>
                             <input type="tel" className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand transition-colors font-bold" placeholder="9988776655" />
                          </div>
                       </div>
                       <button className="w-full bg-brand py-4 rounded-xl font-black tracking-widest uppercase text-sm mt-4 shadow-xl shadow-brand/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                          Get a call back
                       </button>
                    </div>
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
         <div className="max-w-6xl mx-auto bg-gradient-to-br from-slate-900 to-vibrant-dark rounded-[3.5rem] p-10 md:p-20 relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12 group shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)]">
            <div className="relative z-10 max-w-xl">
               <h2 className="text-4xl md:text-5xl font-display font-black text-white mb-6 leading-tight">
                  Download the <span className="text-brand">BookMyTable</span> Mobile App
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
            
            <div className="relative">
               <div className="w-64 h-[500px] bg-slate-800 rounded-[3rem] border-8 border-slate-700 shadow-2xl relative overflow-hidden group-hover:-translate-y-4 transition-transform duration-700">
                  <div className="absolute top-0 inset-x-0 h-6 bg-slate-700 flex items-center justify-center">
                     <div className="w-16 h-1 bg-slate-600 rounded-full" />
                  </div>
                  <img 
                    src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=400" 
                    alt="App Screenshot" 
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent p-6 flex flex-col justify-end">
                     <div className="w-10 h-10 bg-brand rounded-lg mb-2" />
                     <div className="h-4 w-24 bg-white/20 rounded mb-2" />
                     <div className="h-4 w-32 bg-white/10 rounded" />
                  </div>
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
