import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useRestaurants } from '../hooks/useFirebase';
import { useLocationContext } from './LocationContext';
import { RestaurantCard } from './RestaurantCard';
import { Restaurant, Booking, Review } from '../types';
import { Star, MapPin, Clock, Users, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, MessageSquare, Sparkles, Send, Loader2, Utensils, Zap, Gift, Info, Check, Heart, Share2, X, Maximize2, Phone, Compass, ChevronDown, TrendingUp, Wifi, Car, Wind, Music, Wine, Baby, UserCheck, Gamepad2, Tv, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfToday } from 'date-fns';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, formatDate } from '../lib/utils';
import { summarizeGoogleReviews } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { useMemo } from 'react';

export default function RestaurantDetailsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, signInWithGoogle } = useAuth();
  const { coords: userCoords } = useLocationContext();
  const { restaurants: allRestaurants, loading: restaurantsLoading } = useRestaurants(true);
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [isPostingReview, setIsPostingReview] = useState(false);

  // Booking Form State
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [userPhone, setUserPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Menu Carousel & Popup State
  const [selectedMenuImage, setSelectedMenuImage] = useState<string | null>(null);
  const [menuSlideIndex, setMenuSlideIndex] = useState(0);
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isTimingsOpen, setIsTimingsOpen] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    if (user && reviews.length > 0) {
      setHasReviewed(reviews.some(r => r.userId === user.uid));
    } else {
      setHasReviewed(false);
    }
  }, [user, reviews]);

  // Review Auto-slide
  useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(() => {
      setReviewSlideIndex(prev => {
        const itemsPerPage = window.innerWidth >= 768 ? 3 : 1;
        const maxIndex = Math.max(0, reviews.length - itemsPerPage);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function fetchRestaurant() {
      if (!id) return;
      try {
        const docRef = doc(db, 'restaurants', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRestaurant({ id: docSnap.id, ...docSnap.data() } as Restaurant);
        } else {
          setError('Restaurant not found');
        }
      } catch (err) {
        setError('Failed to fetch restaurant details');
      } finally {
        setLoading(false);
      }
    }
    fetchRestaurant();

    // Fetch Reviews
    if (id) {
      const q = query(
        collection(db, 'reviews'),
        where('restaurantId', '==', id),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
        setReviews(docs);
      });
      return () => unsubscribe();
    }
  }, [id]);

  useEffect(() => {
    if (restaurant && !aiSummary) {
      // Check cache first
      const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000;
      const lastUpdated = restaurant.aiSummaryUpdatedAt?.toMillis?.() || 0;
      const now = Date.now();

      if (restaurant.aiSummary && (now - lastUpdated < sixMonthsInMs)) {
        setAiSummary(restaurant.aiSummary);
      }
    }
  }, [restaurant]);

  const handleGenerateSummary = async () => {
    if (!restaurant || !id) return;
    
    setIsAiLoading(true);
    try {
      const summary = await summarizeGoogleReviews(restaurant.name, restaurant.location);
      setAiSummary(summary);
      
      // Save to Firestore for caching
      if (summary && !summary.includes("unavailable")) {
        await updateDoc(doc(db, 'restaurants', id), {
          aiSummary: summary,
          aiSummaryUpdatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Manual summary error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePostReview = async () => {
    if (!user || !restaurant) {
      signInWithGoogle();
      return;
    }

    if (!userComment.trim()) return;

    if (hasReviewed) {
      alert('You have already posted a review for this restaurant.');
      return;
    }

    setIsPostingReview(true);
    try {
      const reviewData: Omit<Review, 'id'> = {
        restaurantId: restaurant.id,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Guest',
        userPhoto: profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=0D8ABC&color=fff`,
        rating: userRating,
        text: userComment,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      setUserComment('');
      setUserRating(5);
    } catch (err) {
      console.error(err);
      alert('Failed to post review.');
    } finally {
      setIsPostingReview(false);
    }
  };

  const handleBooking = async () => {
    if (!user || !restaurant) {
      signInWithGoogle();
      return;
    }

    setIsSubmitting(true);
    try {
      const bookingDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes));

      const bookingData: Omit<Booking, 'id'> = {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'Guest',
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.image,
        restaurantOwnerId: restaurant.ownerId,
        dateTime: bookingDateTime,
        guests,
        userPhone,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'bookings'), bookingData);
      setBookingSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const facilityIcons: Record<string, any> = {
    'WiFi': Wifi,
    'Parking': Car,
    'AC': Wind,
    'Outdoor Seating': MapPin,
    'Live Music': Music,
    'Bar': Wine,
    'Valet': UserCheck,
    'Family Friendly': Baby,
    'Kids Play Area': Gamepad2,
    'TV': Tv,
  };

  const isCurrentlyOpen = () => {
    const now = new Date();
    const day = format(now, 'EEEE');
    
    // Check dailyTimings first
    const daily = restaurant?.dailyTimings?.[day];
    let openStr = restaurant?.openingHours?.open || '11:00 AM';
    let closeStr = restaurant?.openingHours?.close || '11:00 PM';
    let isClosed = false;

    if (daily) {
      if (daily.closed) isClosed = true;
      else {
        openStr = daily.open;
        closeStr = daily.close;
      }
    }

    if (isClosed) return { status: 'Closed Today', color: 'text-red-500', closeTime: 'Tomorrow' };

    try {
      const parseTime = (timeStr: string) => {
        const parts = timeStr.trim().split(' ');
        const period = parts.length > 1 ? parts[1].toUpperCase() : (timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM');
        const time = parts[0].replace(/AM|PM/i, '');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + (m || 0);
      };

      const openMin = parseTime(openStr);
      const closeMin = parseTime(closeStr);
      const currentMin = now.getHours() * 60 + now.getMinutes();

      if (currentMin < openMin) {
        if (openMin - currentMin <= 60) return { status: 'Opening shortly', color: 'text-amber-500', closeTime: openStr };
        return { status: 'Closed', color: 'text-red-500', closeTime: openStr };
      }

      if (currentMin >= openMin && currentMin < closeMin) {
        if (closeMin - currentMin <= 60) return { status: 'Closing shortly', color: 'text-amber-500', closeTime: closeStr };
        return { status: 'Open Now', color: 'text-vibrant-success', closeTime: closeStr };
      }
      
      return { status: 'Closed for the day', color: 'text-red-500', closeTime: 'Tomorrow' };
    } catch (e) {
      return { status: 'Open Now', color: 'text-vibrant-success', closeTime: closeStr };
    }
  };

  const bannerImages = restaurant ? [restaurant.image, ...(restaurant.secondaryImages || [])] : [];

  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerImages.length]);

  const status = isCurrentlyOpen();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));
  const times = restaurant?.bookingSlots && restaurant.bookingSlots.length > 0 
    ? restaurant.bookingSlots 
    : [
        '12:00', '12:30', '13:00', '13:30', '14:00', 
        '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
      ];

  // Haversine formula for distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
  };

  const recommendations = useMemo(() => {
    if (!restaurant || !allRestaurants.length) return { similar: [], nearby: [], youMayLike: [] };

    const filtered = allRestaurants.filter(r => r.id !== restaurant.id);
    
    // Similar: Same cuisine
    const similar = filtered
      .filter(r => r.cuisine === restaurant.cuisine)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    // Nearby
    const nearby = filtered
      .filter(r => r.lat && r.lng && restaurant.lat && restaurant.lng)
      .map(r => ({
        ...r,
        distance: calculateDistance(restaurant.lat!, restaurant.lng!, r.lat!, r.lng!)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);

    // You May Like: High rated other cuisines
    const youMayLike = filtered
      .filter(r => r.cuisine !== restaurant.cuisine && r.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    return { similar, nearby, youMayLike };
  }, [restaurant, allRestaurants]);

  const isTimeInPast = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    return selectedDateTime < new Date();
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
    </div>
  );

  if (error || !restaurant) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
      <h2 className="text-2xl font-display font-bold text-vibrant-dark mb-2">{error || 'Something went wrong'}</h2>
      <button onClick={() => navigate('/')} className="text-brand font-bold hover:underline">Back to Explore</button>
    </div>
  );

  return (
    <div className="bg-vibrant-bg min-h-screen pb-20 overflow-x-hidden">
      {/* Mobile Special Header */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 transition-all duration-300",
        scrolled ? "bg-white shadow-md" : "bg-transparent"
      )}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className={cn(
              "p-2 rounded-full transition-all active:scale-90",
              scrolled ? "bg-slate-100 text-vibrant-dark" : "bg-black/20 backdrop-blur-md text-white"
            )}
          >
            <ChevronLeft size={24} />
          </button>
          
          <AnimatePresence>
            {scrolled && (
              <motion.h2 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-base font-display font-bold text-vibrant-dark line-clamp-1"
              >
                {restaurant.name}
              </motion.h2>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={cn(
              "p-2 rounded-full transition-all active:scale-90",
              scrolled ? "bg-slate-100 text-vibrant-dark" : "bg-black/20 backdrop-blur-md text-white"
            )}
          >
            <Heart size={20} className={isBookmarked ? "fill-red-500 text-red-500" : ""} />
          </button>
          <button 
            className={cn(
              "p-2 rounded-full transition-all active:scale-90",
              scrolled ? "bg-slate-100 text-vibrant-dark" : "bg-black/20 backdrop-blur-md text-white"
            )}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: restaurant.name,
                  text: restaurant.description,
                  url: window.location.href,
                }).catch(() => {});
              }
            }}
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Restaurant Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm md:pt-0 pt-0">
        <div className="max-w-7xl mx-auto px-4 md:py-8 py-0">
          <button 
            onClick={() => navigate(-1)}
            className="hidden md:flex items-center gap-2 text-vibrant-gray hover:text-brand mb-6 transition-colors font-semibold"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="flex flex-col md:flex-row gap-10 md:pt-0 pt-0">
            {/* Banner Slider Section */}
            <div className="w-screen md:w-[450px] aspect-[4/3] md:rounded-2xl rounded-none overflow-hidden shadow-vibrant relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] md:left-auto md:right-auto md:ml-0 md:mr-0 group">
              <div className="relative w-full h-full">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={bannerIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    src={bannerImages[bannerIndex] || RESTAURANT_IMAGE_FALLBACK} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
                  />
                </AnimatePresence>
                
                {bannerImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {bannerImages.map((_, i) => (
                      <button 
                        key={i} 
                        onClick={() => setBannerIndex(i)}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all duration-300",
                          i === bannerIndex ? "bg-white w-4" : "bg-white/40"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Banner Info Overlap (Keep for mobile aesthetic or remove if redesigning mobile too) */}
              <div className="md:hidden absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20 flex flex-col justify-end p-6 pointer-events-none">
                <div className="flex items-start justify-between">
                  <div className="pb-10">
                    <h1 className="text-3xl font-display font-bold text-white mb-1 drop-shadow-md">{restaurant.name}</h1>
                    <div className="flex flex-wrap items-center gap-2 text-white/90 font-medium">
                      <span>{restaurant.cuisine}</span>
                      <span className="w-1 h-1 bg-white/50 rounded-full" />
                      <span>{restaurant.location.split(',')[0]}</span>
                    </div>
                  </div>
                  <div className="bg-vibrant-success px-3 py-1.5 rounded-lg flex flex-col items-center shadow-lg shrink-0 scale-90 border border-white/20">
                    <div className="flex items-center gap-1 text-white">
                      <Star size={14} className="fill-white" />
                      <span className="text-lg font-black">{restaurant.rating}</span>
                    </div>
                    <span className="text-[8px] font-black text-white/70 tracking-tighter mt-0.5">Rating</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Redesigned Details Section (Desktop & Tablet) */}
            <div className="flex-grow md:py-2 md:block hidden py-6 px-4 md:px-0">
              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-slate-800 font-display">
                    <div className="bg-emerald-600 p-1.5 rounded-full text-white">
                      <Star size={16} className="fill-white" />
                    </div>
                    <span className="text-xl font-bold">{restaurant.rating} • {reviews.length} reviews</span>
                    <span className="text-slate-400 mx-1">|</span>
                    <span className="text-xl font-bold">₹{restaurant.avgPrice} for two</span>
                  </div>

                  <h1 className="text-4xl font-display font-black text-slate-900 tracking-tight">{restaurant.name}</h1>
                  
                  <div className="text-xl text-slate-800 font-bold">
                    {restaurant.cuisine}
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex gap-2 text-xl items-baseline">
                    <span className="text-slate-500 font-bold shrink-0">Location</span>
                    <span className="text-slate-800 font-medium line-clamp-1">{restaurant.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xl">
                    <span className={cn("font-bold flex items-center gap-1.5 tracking-tighter", status.color)}>
                      {status.status}
                    </span>
                    <span className="text-slate-400">•</span>
                    <button 
                      onClick={() => setIsTimingsOpen(true)}
                      className="flex items-center gap-1 text-vibrant-gray font-bold tracking-tighter hover:text-brand transition-colors"
                    >
                      Open till {status.closeTime}
                      <ChevronDown size={20} className="text-brand shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Action Bar */}
                <div className="flex items-center gap-12 pt-8 border-t border-slate-100 max-w-4xl">
                  <button 
                    onClick={() => {
                      document.getElementById('table-booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="flex items-center gap-3 text-brand font-black text-xl group"
                  >
                    <CalendarIcon size={24} className="group-hover:scale-110 transition-transform" />
                    Book Table
                  </button>
                  
                  <div className="h-8 w-px bg-slate-200" />
                  
                  <a 
                    href="tel:+919876543210" 
                    className="flex items-center gap-3 text-slate-800 font-black text-xl group"
                  >
                    <Phone size={24} className="group-hover:scale-110 transition-transform" />
                    Call
                  </a>
                  
                  <div className="h-8 w-px bg-slate-200" />
                  
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.location}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-brand font-black text-xl group"
                  >
                    <Compass size={24} className="group-hover:scale-110 transition-transform" />
                    Direction
                  </a>
                </div>
              </div>
            </div>
            
            {/* Mobile Redesigned Header (Optional, but let's align it) */}
            <div className="md:hidden px-4 -mt-8 relative z-20">
               <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <div className="bg-emerald-600 p-1 rounded-full text-white">
                      <Star size={12} className="fill-white" />
                    </div>
                    <span className="text-sm font-black">{restaurant.rating} • {reviews.length} reviews • ₹{restaurant.avgPrice} for two</span>
                  </div>

                  <h1 className="text-2xl font-display font-black text-slate-900">{restaurant.name}</h1>
                  <p className="text-sm font-bold text-slate-600 tracking-wide">{restaurant.cuisine}</p>

                  <div className="pt-2">
                    <div className="flex gap-2 text-xs items-baseline mb-2">
                      <span className="text-slate-400 font-bold shrink-0">Location</span>
                      <span className="text-slate-800 font-medium line-clamp-1">{restaurant.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                       <span className={cn("font-bold tracking-tighter", status.color)}>{status.status}</span>
                       <span className="text-slate-400">•</span>
                       <button 
                        onClick={() => setIsTimingsOpen(true)}
                        className="flex items-center gap-1 text-slate-600 font-bold tracking-tighter"
                      >
                         Open till {status.closeTime}
                         <ChevronDown size={14} className="text-brand" />
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-50">
                     <button className="flex flex-col items-center gap-1 text-brand font-bold text-[10px]">
                        <CalendarIcon size={18} />
                        Book
                     </button>
                     <a href="tel:+919876543210" className="flex flex-col items-center gap-1 text-slate-800 font-bold text-[10px]">
                        <Phone size={18} />
                        Call
                     </a>
                     <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.location}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 text-brand font-bold text-[10px]"
                    >
                        <Compass size={18} />
                        Direction
                     </a>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery & Features */}
      {restaurant.secondaryImages && restaurant.secondaryImages.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-8 md:mt-12 overflow-x-auto pb-4 scrollbar-none">
          <div className="flex gap-4 md:gap-6">
            {restaurant.secondaryImages.map((img, i) => (
              <div key={i} className="w-[200px] md:w-[300px] h-32 md:h-48 rounded-xl overflow-hidden shadow-vibrant shrink-0">
                <img src={img} alt={`${restaurant.name} view ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 space-y-8 md:space-y-10">
          {/* Menu & Offers Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Offers */}
            <div className="bg-vibrant-success/5 border border-vibrant-success/20 p-8 rounded-3xl h-full">
              <div className="flex items-center gap-2 mb-6 text-vibrant-success">
                <Gift size={24} />
                <h3 className="text-xl font-display font-bold">Exclusive Offers</h3>
              </div>
              {restaurant.offers && restaurant.offers.length > 0 ? (
                <div className="space-y-4">
                  {restaurant.offers.map((offer, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-vibrant-success/10">
                      <Zap className="text-vibrant-success shrink-0" size={18} />
                      <p className="text-sm font-bold text-vibrant-dark">{offer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-white/50 rounded-2xl border border-dashed border-vibrant-success/10">
                  <Gift size={32} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">No offers at the moment</p>
                </div>
              )}
            </div>

            {/* Menu Snippet */}
            <div className="bg-slate-50 border border-gray-200 p-8 rounded-3xl h-full">
              <div className="flex items-center gap-2 mb-6 text-brand">
                <Utensils size={24} />
                <h3 className="text-xl font-display font-bold">Popular Dishes</h3>
              </div>
              {restaurant.menu && restaurant.menu.length > 0 ? (
                <div className="space-y-4">
                  {restaurant.menu.map((item, i) => (
                    <div key={i} className="flex justify-between items-start border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                      <div>
                        <h4 className="font-bold text-vibrant-dark text-sm">{item.name}</h4>
                        <p className="text-xs text-vibrant-gray line-clamp-1">{item.description}</p>
                      </div>
                      <span className="font-display font-bold text-brand">₹{item.price}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                  <Utensils size={32} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">Menu not available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Visual Menu Images Carousel */}
          {restaurant.menuImages && restaurant.menuImages.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Utensils className="text-brand" size={24} />
                  <h2 className="text-2xl font-display font-bold text-vibrant-dark">Visual Menu</h2>
                </div>
                
                {restaurant.menuImages.length > (window.innerWidth >= 768 ? 3 : 2) && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setMenuSlideIndex(prev => Math.max(0, prev - 1))}
                      disabled={menuSlideIndex === 0}
                      className="p-2 rounded-full bg-white border border-gray-200 text-vibrant-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button 
                      onClick={() => setMenuSlideIndex(prev => {
                        const maxIndex = restaurant.menuImages!.length - (window.innerWidth >= 768 ? 3 : 2);
                        return Math.min(maxIndex, prev + 1);
                      })}
                      disabled={menuSlideIndex >= (restaurant.menuImages.length - (window.innerWidth >= 768 ? 3 : 2))}
                      className="p-2 rounded-full bg-white border border-gray-200 text-vibrant-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>

              <div className="relative overflow-hidden">
                <motion.div 
                  className="flex gap-4"
                  animate={{ x: `calc(-${menuSlideIndex * (100 / (window.innerWidth >= 768 ? 3 : 2))}% - ${menuSlideIndex * 16}px)` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  {restaurant.menuImages.map((img, i) => (
                    <motion.div 
                      key={i}
                      layout
                      className="shrink-0 w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] aspect-[3/4] rounded-2xl overflow-hidden shadow-md border border-gray-100 cursor-zoom-in group relative"
                      onClick={() => setSelectedMenuImage(img)}
                    >
                      <img 
                        src={img} 
                        alt={`Menu page ${i + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                        referrerPolicy="no-referrer"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg text-brand">
                          <Maximize2 size={20} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          )}

          {/* Amenities / Facilities Section */}
          <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-vibrant">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center">
                <Settings2 size={20} />
              </div>
              <div>
                <h3 className="text-xl font-display font-bold text-vibrant-dark tracking-tight">Amenities & Facilities</h3>
                <p className="text-vibrant-gray font-medium text-sm">Everything you need for a comfortable visit</p>
              </div>
            </div>

            {restaurant.facilities && restaurant.facilities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {restaurant.facilities.map((fac, i) => {
                  const Icon = facilityIcons[fac] || Check;
                  return (
                    <div 
                      key={i} 
                      className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-brand/30 hover:bg-white transition-all shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-vibrant-gray group-hover:text-brand transition-colors">
                        <Icon size={18} />
                      </div>
                      <span className="text-xs font-bold text-vibrant-dark">{fac}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-gray-200">
                <CheckCircle2 size={32} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">Standard amenities provided</p>
              </div>
            )}
          </div>
        </div>

        {/* Post Review Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 space-y-6">
            {/* Booking Form in Sidebar */}
            <div id="table-booking-card" className="bg-white rounded-3xl border border-gray-100 shadow-vibrant overflow-hidden scroll-mt-24">
              <div className="bg-vibrant-dark p-6 text-white flex flex-col justify-center min-h-[80px]">
                <h2 className="text-xl font-display font-bold text-white tracking-tight">Table Booking</h2>
              </div>

              <div className="p-6">
                {!restaurant.approved ? (
                   <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-display font-bold text-vibrant-dark mb-1">Coming Soon</h3>
                    <p className="text-xs text-vibrant-gray">This restaurant is pending verification.</p>
                  </div>
                ) : !restaurant.isBookingEnabled ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon size={32} />
                    </div>
                    <h3 className="text-lg font-display font-bold text-vibrant-dark mb-1">Reservation Unavailable</h3>
                    <p className="text-xs text-vibrant-gray">Restaurant is currently unavailable for Table reservation</p>
                    <a href="tel:+919876543210" className="mt-4 inline-block text-brand font-bold text-xs uppercase tracking-widest hover:underline">Call to Enquire</a>
                  </div>
                ) : bookingSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center"
                  >
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-display font-bold text-vibrant-dark mb-1">Requested!</h3>
                    <p className="text-xs text-vibrant-gray">Redirecting to your dashboard...</p>
                  </motion.div>
                ) : (
                  <div className="space-y-8">
                    {/* Date Selection */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-vibrant-gray tracking-widest mb-3 opacity-60">
                        <CalendarIcon size={14} />
                        Select Date
                      </label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                        {dates.map((date) => (
                          <button
                            key={date.toString()}
                            onClick={() => setSelectedDate(date)}
                            className={cn(
                              "flex flex-col items-center min-w-[54px] py-3 rounded-xl border transition-all font-bold",
                              format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                                ? "bg-brand text-white border-brand shadow-md"
                                : "bg-white border-gray-100 text-vibrant-gray hover:border-brand"
                            )}
                          >
                            <span className="text-[9px] opacity-60 mb-0.5">{format(date, 'EEE')}</span>
                            <span className="text-sm">{format(date, 'd')}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Selection */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-vibrant-gray tracking-widest mb-3 opacity-60">
                        <Clock size={14} />
                        Select Time
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {times.map((time) => {
                          const past = isTimeInPast(time);
                          return (
                            <button
                              key={time}
                              disabled={past}
                              onClick={() => setSelectedTime(time)}
                              className={cn(
                                "py-2 rounded-lg border text-[11px] font-bold transition-all",
                                selectedTime === time
                                  ? "bg-brand text-white border-brand shadow-sm"
                                  : "bg-white border-gray-100 text-vibrant-gray hover:border-brand whitespace-nowrap",
                                past && "opacity-20 cursor-not-allowed bg-slate-100 border-transparent text-slate-400"
                              )}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Guests */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-vibrant-gray tracking-widest mb-3 opacity-60">
                        <Users size={14} />
                        Guests
                      </label>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                          <button
                            key={num}
                            onClick={() => setGuests(num)}
                            className={cn(
                              "w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold transition-all shrink-0 snap-center",
                              guests === num
                                ? "bg-brand text-white border-brand shadow-md"
                                : "bg-white border-gray-100 text-vibrant-gray hover:border-brand"
                            )}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-vibrant-gray tracking-widest mb-3 opacity-60">
                        <MessageSquare size={14} />
                        Phone number (for WhatsApp)
                      </label>
                      <input 
                        type="tel"
                        required
                        placeholder="e.g. +91 9876543210"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-vibrant-dark outline-none focus:border-brand transition-all"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      id="booking-form"
                      onClick={handleBooking}
                      disabled={isSubmitting || !userPhone || !selectedTime || isTimeInPast(selectedTime)}
                      className="w-full bg-brand text-white py-4 rounded-2xl font-bold text-sm tracking-wide hover:bg-brand-dark transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-brand/20"
                    >
                      {isSubmitting ? 'Processing...' : user ? `Confirm Booking` : 'Sign In to Book'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Callout small version in sidebar could go here if needed, but it's fine in main column */}
          </div>
        </div>
      </div>

      {/* Review Section (AI Summary + Leave Review) */}
      <div className="max-w-7xl mx-auto px-4 mt-8 md:mt-12 pt-8 md:pt-12 border-t border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* AI Summary Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-brand p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[220px]">
             <div className="absolute top-0 right-0 p-6 opacity-10">
               <Sparkles size={80} />
             </div>
             <div className="relative z-10">
               <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                   <Sparkles size={16} />
                 </div>
                 <h2 className="text-lg font-display font-bold">AI Google Review Summary</h2>
               </div>
               
               {isAiLoading ? (
                 <div className="flex items-center gap-3">
                   <Loader2 size={16} className="animate-spin" />
                   <p className="text-xs font-medium animate-pulse">Gemini is summarizing reviews...</p>
                 </div>
               ) : aiSummary ? (
                 <div className="prose prose-invert max-w-none text-white/90 font-medium text-xs leading-relaxed line-clamp-[8]">
                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                   <p className="text-[10px] font-medium text-white/70 mb-3 text-center">
                     Get an AI summary of recent public reviews.
                   </p>
                   <button 
                     onClick={handleGenerateSummary}
                     className="bg-white text-brand px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all shadow-lg"
                   >
                     <Sparkles size={14} /> Generate
                   </button>
                 </div>
               )}
             </div>
          </div>

          {/* Leave a Review Card */}
          <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-vibrant">
            <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="text-brand" size={24} />
                <h3 className="text-lg font-display font-bold text-vibrant-dark">Leave a Review</h3>
            </div>
              
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest mb-3 block">Your rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        onClick={() => setUserRating(star)}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                          userRating >= star ? "bg-vibrant-success text-white shadow-md shadow-green-500/20" : "bg-white border border-slate-100 text-vibrant-gray opacity-40 hover:opacity-100"
                        )}
                      >
                        <Star size={12} className={userRating >= star ? "fill-white" : ""} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <textarea 
                    rows={2}
                    placeholder="Tell others what you loved..."
                    className="w-full p-4 bg-slate-50 border-none focus:ring-4 focus:ring-brand/10 focus:bg-white rounded-xl outline-none text-xs font-medium transition-all resize-none shadow-inner-sm"
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                  />
                </div>

                <button 
                  onClick={handlePostReview}
                  disabled={isPostingReview || !userComment.trim() || hasReviewed}
                  className="w-full bg-vibrant-dark text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-slate-900/10 tracking-widest"
                >
                  {isPostingReview ? <Loader2 size={18} className="animate-spin" /> : hasReviewed ? <Check size={16} /> : <Send size={16} />}
                  {hasReviewed ? 'Reviewed' : 'Share Review'}
                </button>
              </div>
          </div>
        </div>
      </div>

      {/* Member Reviews Carousel Section */}
      {reviews.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mt-8 md:mt-12 pt-8 md:pt-12 border-t border-gray-200">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <MessageSquare className="text-brand" size={28} />
              <h2 className="text-2xl font-display font-bold text-vibrant-dark">User Review</h2>
            </div>
            
            {reviews.length > (window.innerWidth >= 768 ? 3 : 1) && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setReviewSlideIndex(prev => Math.max(0, prev - 1))}
                  disabled={reviewSlideIndex === 0}
                  className="hidden md:flex p-2 rounded-full bg-white border border-gray-200 text-vibrant-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setReviewSlideIndex(prev => {
                    const itemsPerPage = window.innerWidth >= 768 ? 3 : 1;
                    const maxIndex = reviews.length - itemsPerPage;
                    return Math.min(maxIndex, prev + 1);
                  })}
                  disabled={reviewSlideIndex >= (reviews.length - (window.innerWidth >= 768 ? 3 : 1))}
                  className="hidden md:flex p-2 rounded-full bg-white border border-gray-200 text-vibrant-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          <div className="relative overflow-hidden -mx-2 px-2">
            <motion.div 
              className="flex gap-4 cursor-grab active:cursor-grabbing overflow-x-auto md:overflow-hidden scrollbar-none snap-x"
              drag={window.innerWidth < 768 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              animate={window.innerWidth >= 768 ? { x: `calc(-${reviewSlideIndex * (100 / 3.0)}% - ${reviewSlideIndex * 16}px)` } : {}}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {reviews.map((review) => (
                <div 
                  key={review.id} 
                  className="shrink-0 w-[calc(100%-16px)] md:w-[calc(33.333%-11px)] snap-center bg-white p-6 rounded-3xl border border-gray-100 shadow-vibrant-sm flex flex-col min-h-[160px]"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <img 
                      src={review.userPhoto} 
                      alt={review.userName} 
                      className="w-10 h-10 rounded-full border border-gray-100 shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-vibrant-dark text-sm truncate">{review.userName}</h4>
                      <p className="text-[10px] text-vibrant-gray/50 font-bold tracking-widest">{formatDate(review.createdAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 text-vibrant-success font-black text-xs mb-3">
                    <Star size={12} className="fill-vibrant-success" />
                    {review.rating}.0
                  </div>
                  
                  <p className="text-vibrant-gray text-xs line-clamp-3 leading-relaxed flex-grow italic">
                    "{review.text}"
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      )}

      {/* Recommended Restaurants Sections */}
      <div className="max-w-7xl mx-auto px-4 mt-16 space-y-20">
        {/* Similar Restaurants */}
        {recommendations.similar.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-brand/10 rounded-full flex items-center justify-center text-brand">
                <Utensils size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-vibrant-dark tracking-tight">Similar to {restaurant.name}</h2>
                <p className="text-vibrant-gray font-medium text-sm">More great {restaurant.cuisine} options you might enjoy</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.similar.map((res) => (
                <RestaurantCard key={res.id} restaurant={res} className="shadow-vibrant-sm" />
              ))}
            </div>
          </section>
        )}

        {/* Nearby Restaurants */}
        {recommendations.nearby.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                <MapPin size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-vibrant-dark tracking-tight">Nearby Restaurants</h2>
                <p className="text-vibrant-gray font-medium text-sm">Great dining spots just around the corner</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.nearby.map((res) => (
                <RestaurantCard key={res.id} restaurant={res} className="shadow-vibrant-sm" />
              ))}
            </div>
          </section>
        )}

        {/* You May Like */}
        {recommendations.youMayLike.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-vibrant-dark tracking-tight">You May Also Like</h2>
                <p className="text-vibrant-gray font-medium text-sm">Top rated experiences in other cuisines</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.youMayLike.map((res) => (
                <RestaurantCard key={res.id} restaurant={res} className="shadow-vibrant-sm" />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Sticky Booking Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
           <div className="pl-2">
              <p className="text-[10px] font-black text-slate-400 tracking-widest">Starting from</p>
              <p className="text-xl font-display font-black text-slate-900">₹{restaurant.avgPrice}<span className="text-sm text-slate-400 font-bold ml-1">/2</span></p>
           </div>
           <button 
              onClick={() => {
                const el = document.getElementById('table-booking-card');
                if (el) {
                  const offset = 80;
                  const bodyRect = document.body.getBoundingClientRect().top;
                  const elementRect = el.getBoundingClientRect().top;
                  const elementPosition = elementRect - bodyRect;
                  const offsetPosition = elementPosition - offset;
                  window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
              }}
              className="bg-brand text-white px-8 py-3.5 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all"
           >
              Book Table
           </button>
      </div>

      {/* Menu Image Popup Modal */}
      <AnimatePresence>
        {isTimingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-8 border-b border-slate-50">
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Outlet Timings</h2>
                <button 
                  onClick={() => setIsTimingsOpen(false)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8 space-y-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const daily = restaurant.dailyTimings?.[day];
                  const isToday = format(new Date(), 'EEEE') === day;
                  return (
                    <div key={day} className={cn(
                      "flex items-center justify-between py-3 border-b border-slate-50 last:border-0",
                      isToday && "bg-brand/5 -mx-4 px-4 rounded-xl"
                    )}>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-lg", isToday ? "text-brand" : "text-slate-700")}>{day}</span>
                        {isToday && <span className="bg-brand text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Today</span>}
                      </div>
                      <span className={cn(
                        "font-medium text-lg",
                        daily?.closed ? "text-red-500" : "text-slate-900"
                      )}>
                        {daily ? (daily.closed ? 'Closed' : `${daily.open} - ${daily.close}`) : `${restaurant.openingHours?.open || '12:30 PM'} - ${restaurant.openingHours?.close || '11:59 PM'}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              <div className="p-8 bg-slate-50/50 flex justify-center">
                <button 
                  onClick={() => setIsTimingsOpen(false)}
                  className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold transition-transform active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10" onClick={() => setIsTimingsOpen(false)} />
          </motion.div>
        )}

        {selectedMenuImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-4xl h-full flex flex-col items-center justify-center"
            >
              <div 
                className="absolute inset-0 bg-black/90 backdrop-blur-sm -z-10" 
                onClick={() => setSelectedMenuImage(null)}
              />
              
              <button 
                onClick={() => setSelectedMenuImage(null)}
                className="absolute top-4 right-4 md:top-0 md:-right-12 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X size={24} />
              </button>

              <div className="w-full h-full flex items-center justify-center pointer-events-none">
                <img 
                  src={selectedMenuImage} 
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg pointer-events-auto"
                  alt="Full resolution menu"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
