import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { 
  LogOut, 
  Search, 
  User as UserIcon, 
  LayoutDashboard, 
  PlusCircle, 
  ShieldCheck,
  Calendar,
  UtensilsCrossed,
  MapPin,
  ChevronDown,
  Navigation
} from 'lucide-react';
import { useLocationContext } from './LocationContext';
import { useMasterData } from './MasterDataContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import AppIcon from './AppIcon';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut, signInWithGoogle } = useAuth();
  const { city, setCity, setCoords, detectLocation, isDetecting } = useLocationContext();
  const { cities: allCities } = useMasterData();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  // Redirect owner to Manage tab on login
  React.useEffect(() => {
    if (profile?.role === 'owner' && !hasRedirected) {
      if (location.pathname === '/') {
        setHasRedirected(true);
        navigate('/owner');
      }
    }
    // If user logs out, reset the redirect flag
    if (!profile) {
      setHasRedirected(false);
    }
  }, [profile, location.pathname, navigate, hasRedirected]);

  const majorCities = [
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  ];

  const filteredCities = useMemo(() => {
    if (!citySearchQuery) return majorCities;
    const query = citySearchQuery.toLowerCase();
    
    // Mix majorCities and allCities from master data
    const combined = [...majorCities];
    allCities.forEach(c => {
      if (!combined.some(mc => mc.name.toLowerCase() === c.name.toLowerCase())) {
        combined.push({ name: c.name, lat: c.lat, lng: c.lng });
      }
    });

    return combined
      .filter(c => c.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [citySearchQuery, allCities]);

  const handleCitySelect = (cityName: string, lat: number, lng: number) => {
    setCity(cityName);
    setCoords({ lat, lng });
    setIsLocationModalOpen(false);
    setCitySearchQuery('');
    navigate(`/city/${cityName.toLowerCase()}`);
  };

  const handleDetectLocation = async () => {
    await detectLocation();
    setIsLocationModalOpen(false);
    navigate('/city/nearby');
  };

  const navItems = [
    { label: 'Bookings', path: profile?.role === 'owner' ? '/owner?tab=bookings' : '/dashboard', icon: Calendar },
  ];

  if (profile?.role === 'owner') {
    navItems.push({ label: 'Manage', path: '/owner', icon: LayoutDashboard });
  }

  if (profile?.role === 'admin') {
    navItems.push({ label: 'Admin', path: '/admin', icon: ShieldCheck });
  }

  const isRestaurantPage = location.pathname.startsWith('/restaurant/');

  return (
    <div className="min-h-screen flex flex-col bg-vibrant-bg">
      {/* Header - Hidden on Mobile Restaurant Page */}
      <header className={cn(
        "sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 transition-all duration-300",
        isRestaurantPage ? "md:block hidden" : "block"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Location */}
            <div className="flex items-center gap-4 sm:gap-8">
              <Link to="/" className="flex items-center gap-2 group shrink-0">
                <AppIcon size={40} className="rounded-xl shadow-lg shadow-brand/20 group-hover:scale-105 transition-transform duration-200" />
                <span className="hidden lg:block text-2xl font-display font-bold text-vibrant-dark tracking-tight">
                  Bookmy<span className="text-brand">Table</span>
                </span>
              </Link>

              {/* Location Picker (Swiggy Style) */}
              <div className="relative">
                <button 
                  onClick={() => setIsLocationModalOpen(!isLocationModalOpen)}
                  className="flex items-center gap-1.5 group cursor-pointer border-l border-gray-200 pl-4 sm:pl-6 py-1 hover:text-brand transition-all max-w-[150px] sm:max-w-none"
                >
                  <span className="text-xs font-bold text-vibrant-dark group-hover:text-brand border-b-2 border-vibrant-dark group-hover:border-brand transition-all whitespace-nowrap truncate leading-tight">
                    {isDetecting ? 'Detecting...' : city}
                  </span>
                  <ChevronDown size={14} className="text-brand transition-transform duration-200 group-hover:translate-y-0.5 shrink-0" />
                </button>

                <AnimatePresence>
                  {isLocationModalOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-3 w-[260px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden ring-4 ring-black/5"
                    >
                      <div className="p-4 border-b border-gray-50">
                        <button 
                          onClick={handleDetectLocation}
                          className="w-full flex items-center gap-3 p-3 text-brand hover:bg-brand-light rounded-xl transition-all font-bold text-sm"
                        >
                          <Navigation size={16} className={isDetecting ? "animate-spin" : ""} />
                          {isDetecting ? 'Detecting...' : 'Detect Current Location'}
                        </button>
                      </div>
                      <div className="p-2">
                        <div className="px-4 py-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-vibrant-gray opacity-40" size={14} />
                            <input 
                              type="text" 
                              placeholder="Search for city..."
                              value={citySearchQuery}
                              onChange={(e) => setCitySearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-transparent focus:border-brand/20 rounded-lg text-sm font-medium outline-none transition-all"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && filteredCities.length > 0) {
                                  handleCitySelect(filteredCities[0].name, filteredCities[0].lat, filteredCities[0].lng);
                                }
                              }}
                            />
                          </div>
                        </div>
                        <p className="px-4 py-2 text-[10px] font-black text-vibrant-gray uppercase tracking-widest opacity-40">
                          {citySearchQuery ? 'Found Cities' : 'Popular Cities'}
                        </p>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                          {filteredCities.map(c => (
                            <button
                              key={c.name}
                              onClick={() => handleCitySelect(c.name, c.lat, c.lng)}
                              className="w-full text-left px-4 py-3 text-sm font-semibold text-vibrant-dark hover:bg-slate-50 hover:text-brand rounded-xl transition-all"
                            >
                              {c.name}
                            </button>
                          ))}
                          {filteredCities.length === 0 && (
                            <p className="px-4 py-8 text-center text-xs font-bold text-slate-400">No cities found matching your search</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Portal target for page-specific search (like CityView) */}
            <div id="navbar-search-portal" className="hidden md:flex flex-1 mx-4 max-w-2xl transition-all"></div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-brand",
                    location.pathname === item.path ? "text-brand" : "text-vibrant-gray"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Auth section */}
            <div className="flex items-center gap-4">
              {profile ? (
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-vibrant-dark leading-none">
                      {profile.displayName}
                    </p>
                    <p className="text-xs text-vibrant-gray mt-1 capitalize">
                      {profile.role}
                    </p>
                  </div>
                  <div className="relative">
                    <img
                      src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=0D8ABC&color=fff`}
                      alt="Avatar"
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all cursor-pointer",
                        isProfileOpen ? "border-brand" : "border-transparent"
                      )}
                      referrerPolicy="no-referrer"
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                    />
                    <AnimatePresence>
                      {isProfileOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 top-full pt-2 z-50"
                        >
                          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2 w-48 ring-4 ring-black/5">
                            <div className="px-3 py-2 mb-2 border-b border-gray-50 md:hidden">
                              <p className="text-sm font-semibold text-vibrant-dark truncate">
                                {profile.displayName}
                              </p>
                              <p className="text-xs text-vibrant-gray capitalize">
                                {profile.role}
                              </p>
                            </div>
                             <button
                              onClick={() => {
                                signOut();
                                setIsProfileOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
                            >
                              <LogOut size={16} />
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="bg-brand text-white px-4 sm:px-6 py-2 rounded-xl font-semibold shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all duration-200 active:scale-95 text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="sm:hidden">Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={cn("bg-vibrant-dark py-12 text-vibrant-gray pb-32 md:pb-12")}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6 opacity-80 filter grayscale brightness-200">
            <AppIcon size={32} />
            <span className="text-2xl font-display font-bold">Bookmytable</span>
          </div>
          <p className="text-sm mb-6">
            The best way to book a table at your favorite restaurants.
          </p>
          <div className="flex justify-center gap-8 mb-8 text-sm font-medium">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
          </div>
          <p className="text-xs opacity-50">
            &copy; {new Date().getFullYear()} Bookmytable. All rights reserved.
          </p>
        </div>
      </footer>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-8 py-4 flex items-center justify-between shadow-[0_-8px_30px_rgb(0,0,0,0.05)] pb-8">
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center gap-1 transition-all active:scale-95",
            location.pathname === "/" ? "text-brand" : "text-vibrant-gray opacity-50"
          )}
        >
          <div className={cn(
            "w-12 h-8 flex items-center justify-center rounded-2xl transition-all",
            location.pathname === "/" ? "bg-brand/10" : ""
          )}>
            <Search size={22} className={location.pathname === "/" ? "stroke-[2.5]" : ""} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Explore</span>
        </Link>

        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all active:scale-95",
              location.pathname === item.path ? "text-brand" : "text-vibrant-gray opacity-50"
            )}
          >
            <div className={cn(
              "w-12 h-8 flex items-center justify-center rounded-2xl transition-all",
              location.pathname === item.path ? "bg-brand/10" : ""
            )}>
              <item.icon size={22} className={location.pathname === item.path ? "stroke-[2.5]" : ""} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}

        {profile ? (
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all active:scale-95",
              isProfileOpen ? "text-brand" : "text-vibrant-gray opacity-50"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full border-2 transition-all overflow-hidden",
              isProfileOpen ? "border-brand" : "border-transparent"
            )}>
              <img
                src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=0D8ABC&color=fff`}
                alt="Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
          </button>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="flex flex-col items-center gap-1 text-brand active:scale-95"
          >
            <div className="w-12 h-8 flex items-center justify-center rounded-2xl bg-brand/10">
              <UserIcon size={22} className="stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Login</span>
          </button>
        )}
      </div>
    </div>
  );
}
