import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { 
  LogOut, 
  Search, 
  User as UserIcon, 
  LayoutDashboard, 
  PlusCircle, 
  ShieldCheck,
  Calendar, ShoppingBag,
  UtensilsCrossed,
  MapPin,
  ChevronDown,
  Navigation,
  Facebook,
  Twitter,
  Instagram,
  Heart
} from 'lucide-react';
import { useLocationContext } from './LocationContext';
import { useMasterData } from './MasterDataContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import AppIcon from './AppIcon';
import ComingSoonView from './ComingSoonView';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut, signInWithGoogle, loading: authLoading } = useAuth();
  const { isComingSoon, loading: masterLoading } = useMasterData();
  const { city, setCity, setCoords, detectLocation, isDetecting } = useLocationContext();
  const { cities: allCities } = useMasterData();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'admin';
  const isOnboardingPage = location.pathname === '/onboarding-request';
  const showComingSoon = isComingSoon && !isAdmin && !isOnboardingPage; 

  const [hasRedirected, setHasRedirected] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const mobileProfileBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileDropdownRef.current && 
        !profileDropdownRef.current.contains(event.target as Node) &&
        (!mobileProfileBtnRef.current || !mobileProfileBtnRef.current.contains(event.target as Node))
      ) {
        setIsProfileOpen(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationModalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Redirect owner to Manage tab on login
  useEffect(() => {
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
    const query = citySearchQuery?.toLowerCase() || '';
    
    // Mix majorCities and allCities from master data
    const combined = [...majorCities];
    allCities.forEach(c => {
      if (!c || !c.name) return;
      if (!combined.some(mc => mc.name?.toLowerCase() === c.name?.toLowerCase())) {
        combined.push({ name: c.name, lat: c.lat, lng: c.lng });
      }
    });

    return combined
      .filter(c => (c.name || '')?.toLowerCase().includes(query))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [citySearchQuery, allCities]);

  const handleCitySelect = (cityName: string, lat: number, lng: number) => {
    setCity(cityName);
    setCoords({ lat, lng });
    setIsLocationModalOpen(false);
    setCitySearchQuery('');
    navigate(`/${cityName.toLowerCase()}`);
  };

  const handleDetectLocation = async () => {
    await detectLocation();
    setIsLocationModalOpen(false);
    navigate('/nearby');
  };

  const navItems: { label: string; path: string; icon: any }[] = [];

  if (profile?.role === 'owner') {
    navItems.push({ label: 'Manage', path: '/owner', icon: LayoutDashboard });
  }

  if (profile?.role === 'admin') {
    navItems.push({ label: 'Admin', path: '/admin', icon: ShieldCheck });
  }

  const isBookPage = location.pathname.endsWith('/book') || location.pathname.startsWith('/book/');
  const isTakeawayPage = location.pathname.includes('/takeaway');
  const isRestaurantPage = location.pathname.startsWith('/restaurant/') || isBookPage || isTakeawayPage;
  const isHomePage = location.pathname === '/';
  const isPartnersPage = location.pathname.startsWith('/partners');
  const isQrMenuPage = location.pathname.startsWith('/qr-menu/');

  if (isPartnersPage) {
    return <>{children}</>;
  }

  if (masterLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AppIcon size={64} className="animate-pulse" />
          <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-vibrant-bg">
      {/* Header - Hidden on Mobile Restaurant Page, completely hidden on Book page, and hidden on Onboarding page */}
      {!showComingSoon && (
        <header className={cn(
          "sticky top-0 z-[60] bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 transition-all duration-300",
          (isBookPage || isOnboardingPage || isQrMenuPage) ? "hidden" : (isRestaurantPage ? "md:block hidden" : "block")
        )}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo & Location */}
              <div className="flex items-center gap-4 sm:gap-8">
                <Link to="/" className="flex items-center gap-3 group shrink-0">
                  <AppIcon size={44} className="group-hover:scale-110 transition-transform duration-300" />
                  <span className="hidden lg:block text-2xl font-bold leading-[1.2] text-[#363636] tracking-tighter">
                    Bookmy<span className="text-brand">Table</span>
                  </span>
                </Link>
  
                {/* Location Picker (Swiggy Style) */}
                <div className="relative" ref={locationDropdownRef}>
                  <button 
                    onClick={() => setIsLocationModalOpen(!isLocationModalOpen)}
                    className="flex items-center gap-1.5 group cursor-pointer border-l border-gray-200 pl-4 sm:pl-6 py-1 hover:text-brand transition-all max-w-[150px] sm:max-w-none"
                  >
                    <span className="text-sm md:text-base font-bold leading-[1.2] text-[#363636] group-hover:text-brand border-b-2 border-vibrant-dark group-hover:border-brand transition-all whitespace-nowrap truncate leading-tight">
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
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 focus:border-brand/20 rounded-lg text-sm font-medium outline-none transition-all"
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
                                className="w-full text-left px-4 py-3 text-sm font-normal text-[#363636] leading-[1.2] hover:bg-slate-50 hover:text-brand rounded-xl transition-all"
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
              <div id="navbar-search-portal" className="flex flex-1 justify-end md:justify-start mx-2 md:mx-4 max-w-2xl transition-all min-w-[40px] min-h-[40px]"></div>
  
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
                      <p className="text-sm font-normal text-[#363636] leading-[1.2] leading-none">
                        {profile.displayName}
                      </p>
                      <p className="text-xs text-vibrant-gray mt-1 capitalize">
                        {profile.role}
                      </p>
                    </div>
                    <div className="relative" ref={profileDropdownRef}>
                      <img
                        src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}&background=0D8ABC&color=fff`}
                        alt="Avatar"
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all cursor-pointer",
                          isProfileOpen ? "border-brand" : "border-slate-300"
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
                                <p className="text-sm font-normal text-[#363636] leading-[1.2] truncate">
                                  {profile.displayName}
                                </p>
                                <p className="text-xs text-vibrant-gray capitalize">
                                  {profile.role}
                                </p>
                              </div>

                              <Link to="/dashboard?tab=profile" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold">
                                <UserIcon size={16} className="text-slate-400" />
                                Profile
                              </Link>
                              
                              <Link to="/dashboard?tab=bookings" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold">
                                <Calendar size={16} className="text-slate-400" />
                                Table Booking
                              </Link>
                              
                              <Link to="/dashboard?tab=takeawayOrders" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold">
                                <ShoppingBag size={16} className="text-slate-400" />
                                Food Orders
                              </Link>
                              
                              <Link to="/dashboard?tab=favorites" onClick={() => setIsProfileOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors font-semibold mb-2 border-b border-slate-50 pb-3">
                                <Heart size={16} className="text-slate-400" />
                                Favorites
                              </Link>

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
      )}

      {/* Main Content */}
      <main className="flex-grow">
        {showComingSoon ? (
          <ComingSoonView 
            onContactClick={() => navigate('/contact-us')} 
            onPartnerClick={() => navigate('/onboarding-request')}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transitionEnd: { transform: "none" } }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer */}
      {!isQrMenuPage && (
      <footer className={cn("bg-vibrant-dark py-10 md:py-12 text-vibrant-gray pb-24 md:pb-12")}>
        <div className="max-w-7xl mx-auto px-6 md:px-4">
          <div className="flex items-center justify-center gap-3 mb-6 opacity-80 filter grayscale brightness-200">
            <AppIcon size={32} />
            <span className="text-2xl font-normal leading-[1.2]">Bookmytable</span>
          </div>
          <p className="text-sm mb-10 max-w-sm mx-auto text-center">
            The best way to book a table at your favorite restaurants.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6 mb-10 text-sm font-medium mx-auto max-w-3xl text-left pl-4 md:pl-0">
            <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
            <Link to="/onboarding-request" className="hover:text-white transition-colors">Partner With Us</Link>
          </div>
          
          <div className="flex justify-center gap-6 mb-8">
            <a href="https://www.facebook.com/bookmytableIN/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-brand transition-colors p-2 -ml-2 text-center flex items-center">
              <Facebook size={24} />
            </a>
            <a href="https://twitter.com/bookmytableIN" target="_blank" rel="noopener noreferrer" className="text-white hover:text-brand transition-colors p-2 text-center flex items-center">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://www.instagram.com/bookmytable_IN/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-brand transition-colors p-2 text-center flex items-center">
              <Instagram size={24} />
            </a>
            <a href="https://wa.me/918639636729" target="_blank" rel="noopener noreferrer" className="text-white hover:text-brand transition-colors p-2 text-center flex items-center">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
            </a>
          </div>

          <p className="text-xs opacity-50 text-center">
            &copy; {new Date().getFullYear()} Bookmytable. All rights reserved.
          </p>
        </div>
      </footer>
      )}
      {/* Mobile Bottom Navigation - Hidden on Restaurant and Home pages */}
      {!showComingSoon && (!isRestaurantPage && !isHomePage && !isQrMenuPage) && (
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
              ref={mobileProfileBtnRef}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-95",
                isProfileOpen ? "text-brand" : "text-vibrant-gray opacity-50"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full border-2 transition-all overflow-hidden",
                isProfileOpen ? "border-brand" : "border-slate-300"
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
      )}
    </div>
  );
}
