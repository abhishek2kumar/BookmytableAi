import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useRestaurants } from '../hooks/useFirebase';
import { useLocationContext } from './LocationContext';
import { RestaurantCard } from './RestaurantCard';
import { Restaurant, Booking, Review } from '../types';
import { Star, MapPin, Clock, Users, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, MessageSquare, Sparkles, Send, Loader2, Utensils, Zap, Gift, Info, Check, Heart, Share2, X, Maximize2, Phone, Compass, ChevronDown, TrendingUp, Wifi, Car, Wind, Music, Wine, Baby, UserCheck, Gamepad2, Tv, Settings2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfToday } from 'date-fns';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, formatDate, calculateDistance } from '../lib/utils';
import { summarizeGoogleReviews } from '../services/aiService';
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
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [isMobileBookingOpen, setIsMobileBookingOpen] = useState(false);

  // Load bookmark status
  useEffect(() => {
    if (user && profile && id) {
      setIsBookmarked((profile.favorites || []).includes(id));
    }
  }, [user, profile, id]);

  const toggleBookmark = async () => {
    if (!user || !profile || !id) {
      signInWithGoogle();
      return;
    }

    setIsBookmarking(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const currentFavorites = profile.favorites || [];
      let newFavorites;
      
      if (isBookmarked) {
        newFavorites = currentFavorites.filter(favId => favId !== id);
      } else {
        newFavorites = [...currentFavorites, id];
      }

      await updateDoc(userRef, {
        favorites: newFavorites,
        updatedAt: serverTimestamp()
      });
      
      setIsBookmarked(!isBookmarked);
    } catch (err) {
      console.error("Error updating bookmark:", err);
    } finally {
      setIsBookmarking(false);
    }
  };

  // Menu Carousel & Popup State
  const [menuSlideIndex, setMenuSlideIndex] = useState(0);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isTimingsOpen, setIsTimingsOpen] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  // Enhanced Photo Gallery & Viewer State
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [restaurantOwnerEmail, setRestaurantOwnerEmail] = useState<string | null>(null);
  const allPhotos = useMemo(() => {
    if (!restaurant) return [];
    const menuCatImages = (restaurant.menuCategories || []).flatMap((c: any) => c.images || []);
    return [
      restaurant.image,
      ...(restaurant.secondaryImages || []),
      ...(restaurant.menuImages || []),
      ...menuCatImages
    ].filter(Boolean);
  }, [restaurant]);

  const openPhotoViewer = (imageUrl: string) => {
    const idx = allPhotos.indexOf(imageUrl);
    setPhotoIndex(idx >= 0 ? idx : 0);
    setPhotoViewerOpen(true);
  };

  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhotoIndex(prev => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhotoIndex(prev => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) nextPhoto();
    if (isRightSwipe) prevPhoto();
  };

  const distance = useMemo(() => {
    if (userCoords && restaurant?.lat && restaurant?.lng) {
      return calculateDistance(userCoords.lat, userCoords.lng, restaurant.lat, restaurant.lng);
    }
    return "0.8"; // Fallback to a small realistic number if no coords
  }, [userCoords, restaurant]);

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

  useEffect(() => {
    async function fetchOwnerEmail() {
      if (restaurant?.ownerId) {
        try {
          const ownerDoc = await getDoc(doc(db, 'users', restaurant.ownerId));
          if (ownerDoc.exists()) {
            setRestaurantOwnerEmail(ownerDoc.data()?.email || null);
          }
        } catch (err) {
          console.error("Error fetching owner email:", err);
        }
      }
    }
    fetchOwnerEmail();
  }, [restaurant?.ownerId]);

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
        status: guests <= (restaurant.instantBookingLimit || 10) ? 'confirmed' : 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'bookings'), bookingData);

      // Send Email Confirmations via Backend API
      try {
        fetch('/api/confirm-booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: user.email,
            userName: profile?.displayName || user.displayName || 'Guest',
            restaurantName: restaurant.name,
            restaurantLocation: restaurant.location,
            ownerEmail: restaurantOwnerEmail,
            dateTime: bookingDateTime.toISOString(),
            guests,
            userPhone
          })
        }).catch(err => console.error('Silent email fail:', err));
      } catch (err) {
        console.error('Failed to trigger email confirmation:', err);
      }

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
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    
    const getTimingsForDay = (day: string) => {
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
      return { openStr, closeStr, isClosed };
    };

    const currentTimings = getTimingsForDay(currentDay);

    const parseTime = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.trim().split(' ');
      const period = parts.length > 1 ? parts[1].toUpperCase() : (timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM');
      const time = parts[0].replace(/AM|PM/i, '');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + (m || 0);
    };

    const currentMin = now.getHours() * 60 + now.getMinutes();
    const yesterdayIndex = (now.getDay() + 6) % 7;
    const yesterdayDay = dayNames[yesterdayIndex];
    const yesterdayTimings = getTimingsForDay(yesterdayDay);

    const checkIsOpen = () => {
      // Check if it's currently open based on today's timings
      if (!currentTimings.isClosed) {
        const openMin = parseTime(currentTimings.openStr);
        const closeMin = parseTime(currentTimings.closeStr);

        if (closeMin > openMin) {
          if (currentMin >= openMin && currentMin < closeMin) return { open: true, closeTime: currentTimings.closeStr };
        } else {
          // Overnight: open today from 'open' till EOD, and closes tomorrow morning
          if (currentMin >= openMin) return { open: true, closeTime: currentTimings.closeStr };
        }
      }

      // Check if it's still open from yesterday's overnight session
      if (!yesterdayTimings.isClosed) {
        const yOpenMin = parseTime(yesterdayTimings.openStr);
        const yCloseMin = parseTime(yesterdayTimings.closeStr);

        if (yCloseMin < yOpenMin) {
          if (currentMin < yCloseMin) return { open: true, closeTime: yesterdayTimings.closeStr };
        }
      }

      return { open: false };
    };

    const currentStatus = checkIsOpen();

    if (currentStatus.open) {
      const closeMin = parseTime(currentStatus.closeTime!);
      if (closeMin - currentMin <= 60 && closeMin > currentMin) {
        return { 
          displayText: `Closing soon at ${currentStatus.closeTime}`,
          color: 'text-amber-500',
          isClosed: false
        };
      }
      return { 
        displayText: `Open till ${currentStatus.closeTime}`,
        color: 'text-vibrant-success',
        isClosed: false
      };
    }

    if (currentTimings.isClosed || currentMin > parseTime(currentTimings.closeStr)) {
      // Look for next opening
      let nextDayIndex = (now.getDay() + 1) % 7;
      let daysAhead = 1;
      while (daysAhead <= 7) {
        const nextDayName = dayNames[nextDayIndex];
        const nextTimings = getTimingsForDay(nextDayName);
        if (!nextTimings.isClosed) {
           const label = daysAhead === 1 ? 'tomorrow' : nextDayName;
           return { 
             displayText: `Closed, Opens at ${nextTimings.openStr} ${label}`,
             color: 'text-red-500',
             isClosed: true
           };
        }
        nextDayIndex = (nextDayIndex + 1) % 7;
        daysAhead++;
      }
    } else if (currentMin < parseTime(currentTimings.openStr)) {
      return { 
        displayText: `Closed, opens at ${currentTimings.openStr}`,
        color: 'text-red-500',
        isClosed: true
      };
    }
    
    return { displayText: `Closed`, color: 'text-red-500', isClosed: true };
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
  const dates = useMemo(() => {
    const allDates = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));
    if (!restaurant?.blackoutDates || restaurant.blackoutDates.length === 0) return allDates;
    
    return allDates.filter(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return !restaurant.blackoutDates?.includes(dateStr);
    });
  }, [restaurant?.blackoutDates]);

  const slotData = useMemo(() => {
    if (restaurant?.slotCategories && restaurant.slotCategories.length > 0) {
      return {
        categorized: true,
        categories: restaurant.slotCategories
      };
    }

    const manualSlots = restaurant?.bookingSlots || [];
    if (manualSlots.length > 0) {
      return { categorized: false, slots: manualSlots };
    }

    // Fallback slots if not detailed: Generate 30min intervals based on current day timings
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDayName = dayNames[selectedDate.getDay()];
    const getTimingsForDay = (day: string) => {
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
      return { openStr, closeStr, isClosed };
    };

    const timings = getTimingsForDay(selectedDayName);
    if (timings.isClosed) return { categorized: false, slots: [] };

    const parseTime = (timeStr: string) => {
      const parts = timeStr.trim().split(' ');
      const period = parts.length > 1 ? parts[1].toUpperCase() : (timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM');
      const time = parts[0].replace(/AM|PM/i, '');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + (m || 0);
    };

    const openMin = parseTime(timings.openStr);
    const closeMin = parseTime(timings.closeStr);
    const slots = [];
    
    // Adjust end time for midnight/overnight
    let endMin = closeMin;
    if (closeMin <= openMin) endMin = closeMin + (24 * 60);

    for (let m = openMin; m < endMin; m += 30) {
      const hour = Math.floor((m % (24 * 60)) / 60);
      const min = m % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }

    return { categorized: false, slots };
  }, [restaurant, selectedDate]);

  const times = useMemo(() => {
    if (slotData.categorized) {
      return slotData.categories.flatMap(c => c.slots);
    }
    return slotData.slots;
  }, [slotData]);

  const recommendations = useMemo(() => {
    if (!restaurant || !allRestaurants.length) return { similar: [], nearby: [], youMayLike: [] };

    // STRICT city-based filtering for recommendations
    const cityNorm = (restaurant.city || '').toLowerCase();
    const filtered = allRestaurants.filter(r => 
      r.id !== restaurant.id && 
      ((r.city || '').toLowerCase() === cityNorm)
    );
    
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
        distance: Number(calculateDistance(restaurant.lat!, restaurant.lng!, r.lat!, r.lng!))
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
        "md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-300",
        scrolled ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100" : "bg-transparent"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className={cn(
              "w-10 h-10 rounded-full transition-all active:scale-90 flex items-center justify-center",
              scrolled ? "bg-slate-100 text-slate-800" : "bg-black/20 backdrop-blur-md text-white"
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
                className="text-lg font-display font-black text-slate-900 line-clamp-1"
              >
                {restaurant.name}
              </motion.h2>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={toggleBookmark}
            disabled={isBookmarking}
            className={cn(
              "w-10 h-10 rounded-full transition-all active:scale-90 flex items-center justify-center",
              scrolled ? "bg-slate-100 text-slate-800" : "bg-black/20 backdrop-blur-md text-white",
              isBookmarking && "opacity-50"
            )}
          >
            <Heart size={20} className={cn(isBookmarked ? "fill-red-500 text-red-500" : "", isBookmarking && "animate-pulse")} />
          </button>
          <button 
            className={cn(
              "w-10 h-10 rounded-full transition-all active:scale-90 flex items-center justify-center",
              scrolled ? "bg-slate-100 text-slate-800" : "bg-black/20 backdrop-blur-md text-white"
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
            <div 
              className="w-screen md:w-[450px] aspect-[4/3] md:rounded-lg rounded-none overflow-hidden shadow-vibrant relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] md:left-auto md:right-auto md:ml-0 md:mr-0 group cursor-zoom-in"
              onClick={() => openPhotoViewer(bannerImages[bannerIndex] || RESTAURANT_IMAGE_FALLBACK)}
            >
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
                  <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[10px] font-black z-10 border border-white/10">
                    {bannerIndex + 1}/{bannerImages.length}
                  </div>
                )}
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
                    <button 
                      onClick={() => setIsTimingsOpen(true)}
                      className={cn(
                        "flex items-center gap-1 font-bold tracking-tighter hover:text-brand transition-colors",
                        status.color
                      )}
                    >
                      {status.displayText}
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

                  <div className="h-8 w-px bg-slate-200" />
                  
                  <button 
                    onClick={toggleBookmark}
                    disabled={isBookmarking}
                    className={cn(
                      "flex items-center gap-3 font-black text-xl group transition-all",
                      isBookmarked ? "text-red-500" : "text-slate-800 hover:text-red-500",
                      isBookmarking && "opacity-50 animate-pulse"
                    )}
                  >
                    <Heart size={24} className={cn("group-hover:scale-110 transition-transform", isBookmarked && "fill-red-500")} />
                    {isBookmarked ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
            {/* Mobile "Dineout" Style Interface */}
            <div className="md:hidden px-0 -mt-[120px] relative z-20">
               <div className="bg-white rounded-t-[40px] shadow-2xl border-t border-slate-100 overflow-hidden">
                  <div className="p-6 space-y-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5 flex-1">
                        <h1 className="text-[28px] font-black text-slate-900 leading-tight tracking-tight">{restaurant.name}</h1>
                        <div className="flex items-center flex-wrap gap-1 text-[12px] font-bold text-slate-600">
                          <span>{distance} km</span>
                          <span className="text-slate-300">•</span>
                          <span className="line-clamp-1">{restaurant.location}</span>
                          <ChevronDown size={14} className="text-brand shrink-0" />
                        </div>
                        <p className="text-[12px] font-bold text-slate-500">
                          {restaurant.cuisine} | ₹{restaurant.avgPrice} for two
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-center shrink-0">
                        <div className="bg-[#0b8a4a] px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm text-white">
                          <span className="font-black text-base">{restaurant.rating}</span>
                          <Star size={14} className="fill-white text-white" />
                        </div>
                        <div className="mt-2 text-center">
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{reviews.length} ratings</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 pt-1">
                       <button 
                        onClick={() => setIsTimingsOpen(true)}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-3 rounded-2xl text-[11px] font-black border transition-colors",
                          status.isClosed ? "bg-red-50 text-red-700 border-red-100/30" : "bg-emerald-50 text-emerald-700 border-emerald-100/30"
                        )}
                       >
                         {status.displayText}
                         <ChevronDown size={14} />
                       </button>
                       
                       <div className="flex gap-3 ml-auto">
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.location}`)}`}
                            className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform border border-slate-100"
                          >
                            <Compass size={20} />
                          </a>
                          <a href="tel:+919876543210" className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform border border-slate-100">
                            <Phone size={20} />
                          </a>
                       </div>
                    </div>
                  </div>
               </div>

               {/* Offers Section Placeholder */}
               <div className="mt-8 px-4 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[22px] font-black text-slate-900 tracking-tight">Best Offers for you</h3>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden pb-4">
                     <div className="flex px-4 pt-4 gap-2">
                        <button className="flex-1 py-3 text-[11px] font-black text-white bg-black rounded-2xl">Pre-booking offers</button>
                        <button className="flex-1 py-3 text-[11px] font-black text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors">Walk-in offers</button>
                     </div>
                     
                     {restaurant.offers && restaurant.offers.length > 0 ? (
                       <div className="p-6 space-y-6">
                          {/* Featured Offer */}
                          <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                               <span className="text-[10px] font-black text-[#ff4d4d] uppercase tracking-[0.2em] font-display">Bookmytable</span>
                               <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">EXCLUSIVE</span>
                            </div>
                            <h4 className="text-[22px] font-black text-slate-900 tracking-tight leading-7">
                              {restaurant.offers[0]} <ChevronRight size={18} className="inline text-slate-300" />
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Available on All Days</p>
                            
                            <div className="flex justify-center gap-1.5 pt-2">
                               {restaurant.offers.slice(0, 3).map((_, i) => (
                                 <div 
                                   key={i} 
                                   className={cn(
                                     "w-2 h-2 rounded-full transition-colors duration-300",
                                     i === 0 ? "bg-brand" : "bg-slate-200"
                                   )} 
                                 />
                               ))}
                            </div>
                          </div>

                          {/* Offer Grid */}
                          {restaurant.offers.length > 1 && (
                            <div className="grid grid-cols-2 gap-3">
                              {restaurant.offers.slice(1, 3).map((offer, idx) => (
                                <div key={idx} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-2 text-center">
                                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Gift size={14} className="text-amber-600" />
                                  </div>
                                  <span className="text-[11px] font-black text-slate-800 leading-tight">{offer}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Extra Offer Banner */}
                          <div className="bg-[#ebfcf3] px-4 py-3 rounded-2xl flex items-center gap-3 border border-[#d4f5e3]">
                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center p-1 border border-amber-200">
                               <div className="w-full h-full bg-amber-500 rounded flex items-center justify-center text-[10px] font-black text-white">2X</div>
                            </div>
                            <div className="flex-1">
                              <span className="text-[11px] font-black text-[#008545] block">Earn & Redeem 2X DineCash</span>
                              <span className="text-[9px] font-bold text-[#008545]/70">on entire bill payment</span>
                            </div>
                            <Info size={14} className="text-[#008545]/40" />
                          </div>
                       </div>
                     ) : (
                        <div className="p-8 text-center">
                           <p className="text-slate-400 font-bold text-base">No exclusive offers available for this restaurant yet.</p>
                        </div>
                     )}
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
              <div 
                key={i} 
                className="w-[200px] md:w-[300px] h-32 md:h-48 rounded-lg overflow-hidden shadow-vibrant shrink-0 cursor-zoom-in active:scale-95 transition-transform"
                onClick={() => openPhotoViewer(img)}
              >
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
            {/* Offers (Hide on mobile as it's already shown in the mobile card) */}
            <div className="hidden md:block bg-vibrant-success/5 border border-vibrant-success/20 p-8 rounded-xl h-full">
              <div className="flex items-center gap-2 mb-6 text-vibrant-success">
                <Gift size={24} />
                <h3 className="text-xl font-display font-bold">Exclusive Offers</h3>
              </div>
              {restaurant.offers && restaurant.offers.length > 0 ? (
                <div className="space-y-4">
                  {restaurant.offers.map((offer, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-lg border border-vibrant-success/10">
                      <Zap className="text-vibrant-success shrink-0" size={18} />
                      <p className="text-sm font-bold text-vibrant-dark">{offer}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-white/50 rounded-lg border border-dashed border-vibrant-success/10">
                  <Gift size={32} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">No offers at the moment</p>
                </div>
              )}
            </div>

            {/* Menu Snippet */}
            <div className="bg-slate-50 border border-gray-200 p-8 rounded-xl h-full">
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
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 bg-white/50 rounded-lg border border-dashed border-gray-200">
                  <Utensils size={32} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">Menu not available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Visual Menu Section (Modern Categorized) */}
          {((restaurant.menuCategories && restaurant.menuCategories.length > 0) || (restaurant.menuImages && restaurant.menuImages.length > 0)) && (
            <div className="space-y-8 bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-vibrant overflow-hidden relative group/menu">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                    <Menu size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Visual Menu</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Explore our offerings</p>
                  </div>
                </div>

                {/* Category Selector Tabs */}
                {restaurant.menuCategories && restaurant.menuCategories.length > 0 && (
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide">
                    {restaurant.menuCategories.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveMenuCategory(cat.id);
                          setMenuSlideIndex(0);
                        }}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest",
                          (activeMenuCategory === cat.id || (!activeMenuCategory && restaurant.menuCategories[0].id === cat.id))
                            ? "bg-white text-brand shadow-sm" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                    {restaurant.menuImages && restaurant.menuImages.length > 0 && (
                      <button
                        onClick={() => {
                          setActiveMenuCategory('legacy');
                          setMenuSlideIndex(0);
                        }}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest",
                          activeMenuCategory === 'legacy' ? "bg-white text-brand shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Other
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Multi-Page Visual for Selected Category */}
              <div className="relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeMenuCategory || (restaurant.menuCategories?.[0]?.id) || 'legacy'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="relative"
                  >
                    {(() => {
                      const currentCat = activeMenuCategory === 'legacy' 
                        ? { images: restaurant.menuImages } 
                        : (restaurant.menuCategories?.find((c: any) => c.id === activeMenuCategory) || restaurant.menuCategories?.[0] || { images: restaurant.menuImages });
                      
                      const images = currentCat?.images || [];
                      
                      if (images.length === 0) return (
                        <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-100 italic text-slate-400 font-bold">
                          No images found for this category
                        </div>
                      );

                      return (
                        <div className="space-y-6">
                          <div className="relative group/slides overflow-hidden rounded-3xl">
                            <div className="flex gap-6 overflow-x-auto pb-6 md:pb-0 md:overflow-visible no-scrollbar">
                              <motion.div 
                                className="flex gap-6 shrink-0"
                                animate={{ x: `calc(-${menuSlideIndex * (100 / (window.innerWidth >= 768 ? 2 : 1.2))}% - ${menuSlideIndex * 24}px)` }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              >
                                {images.map((img: string, i: number) => (
                                  <motion.div 
                                    key={i}
                                    whileHover={{ y: -5 }}
                                    className="shrink-0 w-[80vw] md:w-[calc(50%-12px)] aspect-[3/4.2] rounded-[2rem] overflow-hidden shadow-2xl border border-white/50 cursor-zoom-in relative group/img bg-slate-100"
                                    onClick={() => openPhotoViewer(img)}
                                  >
                                    <img 
                                      src={img} 
                                      alt={`Menu page ${i + 1}`} 
                                      className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" 
                                      referrerPolicy="no-referrer"
                                      onError={handleImageError}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col justify-end p-8">
                                      <div className="flex items-center justify-between">
                                        <span className="text-white text-xs font-black uppercase tracking-widest">Page {i + 1} of {images.length}</span>
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20">
                                          <Maximize2 size={20} />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Page Number Badge */}
                                    <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-widest z-10 transition-transform group-hover/img:scale-110">
                                      {i + 1} / {images.length}
                                    </div>
                                  </motion.div>
                                ))}
                              </motion.div>
                            </div>

                            {/* Custom Controls */}
                            {images.length > (window.innerWidth >= 768 ? 2 : 1.2) && (
                              <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 inset-x-4 justify-between pointer-events-none">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuSlideIndex(prev => Math.max(0, prev - 1));
                                  }}
                                  disabled={menuSlideIndex === 0}
                                  className={cn(
                                    "w-12 h-12 rounded-full border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all translate-x-[-100%] group-hover/slides:translate-x-0 opacity-0 group-hover/slides:opacity-100 bg-black/20 backdrop-blur-md hover:bg-brand hover:scale-110",
                                    menuSlideIndex === 0 && "invisible"
                                  )}
                                >
                                  <ChevronLeft size={24} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const maxItems = window.innerWidth >= 768 ? 2 : 1;
                                    setMenuSlideIndex(prev => Math.min(images.length - maxItems, prev + 1));
                                  }}
                                  disabled={menuSlideIndex >= images.length - (window.innerWidth >= 768 ? 2 : 1)}
                                  className={cn(
                                    "w-12 h-12 rounded-full border border-white/20 text-white flex items-center justify-center pointer-events-auto transition-all translate-x-[100%] group-hover/slides:translate-x-0 opacity-0 group-hover/slides:opacity-100 bg-black/20 backdrop-blur-md hover:bg-brand hover:scale-110",
                                    menuSlideIndex >= images.length - (window.innerWidth >= 768 ? 2 : 1) && "invisible"
                                  )}
                                >
                                  <ChevronRight size={24} />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Progress Dots */}
                          <div className="flex justify-center gap-2 pb-4">
                             {Array.from({ length: Math.ceil(images.length - (window.innerWidth >= 768 ? 1 : 0)) }).map((_, idx) => (
                               <div 
                                 key={idx} 
                                 className={cn(
                                   "h-1.5 rounded-full transition-all duration-300",
                                   menuSlideIndex === idx ? "w-8 bg-brand" : "w-1.5 bg-slate-200"
                                 )}
                               />
                             ))}
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
                <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-brand/5 rounded-full blur-3xl -z-10 group-hover/menu:scale-150 transition-transform duration-1000" />
              </div>
            </div>
          )}

          {/* Amenities / Facilities Section (Minimalistic) */}
          <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-vibrant">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-brand" />
                <h3 className="text-sm font-display font-black text-vibrant-dark uppercase tracking-wider">Amenities</h3>
              </div>
            </div>

            {restaurant.facilities && restaurant.facilities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {restaurant.facilities.map((fac, i) => {
                  const Icon = facilityIcons[fac] || Check;
                  return (
                    <div 
                      key={i} 
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-50/80 border border-slate-100 rounded-full group hover:border-brand/20 hover:bg-white transition-all shadow-sm"
                    >
                      <Icon size={12} className="text-brand/60 group-hover:text-brand" />
                      <span className="text-[11px] font-bold text-slate-700">{fac}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 py-4">
                <CheckCircle2 size={16} className="opacity-40" />
                <p className="text-[11px] font-medium tracking-tight">Standard amenities provided at this outlet</p>
              </div>
            )}
          </div>
        </div>

        {/* Post Review Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 space-y-6">
            {/* Booking Form in Sidebar */}
            <div id="table-booking-card" className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-vibrant overflow-hidden scroll-mt-24">
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
                        {restaurant?.blackoutDates?.length ? (
                          <span className="ml-auto text-[8px] text-brand">Exclusive days filtered</span>
                        ) : null}
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
                      {slotData.categorized ? (
                        <div className="grid grid-cols-1 gap-4">
                          {slotData.categories.map((cat) => (
                            <div key={cat.id} className="space-y-2">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{cat.name}</p>
                               <div className="grid grid-cols-4 gap-2">
                                  {cat.slots.map((time) => {
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
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {slotData.slots.map((time) => {
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
                      )}
                    </div>

                    {/* Guests */}
                    <div>
                      <label className="flex items-center gap-2 text-[10px] font-bold text-vibrant-gray tracking-widest mb-3 opacity-60">
                        <Users size={14} />
                        Guests
                      </label>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((num) => (
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
                        placeholder="10 digit mobile number"
                        value={userPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setUserPhone(val);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold text-vibrant-dark outline-none focus:border-brand transition-all"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      id="booking-form"
                      onClick={handleBooking}
                      disabled={isSubmitting || userPhone.length !== 10 || !selectedTime || isTimeInPast(selectedTime)}
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
          <div className="bg-gradient-to-br from-indigo-500 to-brand p-6 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[120px]">
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
                   <p className="text-xs font-medium animate-pulse">OpenAI is summarizing reviews...</p>
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
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-vibrant">
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
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

        {photoViewerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center overscroll-none touch-none"
            onClick={() => setPhotoViewerOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') nextPhoto();
              if (e.key === 'ArrowLeft') prevPhoto();
              if (e.key === 'Escape') setPhotoViewerOpen(false);
            }}
            tabIndex={0}
          >
            <button 
              className="absolute top-6 right-6 z-[110] w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90"
              onClick={() => setPhotoViewerOpen(false)}
            >
              <X size={24} />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-white text-[10px] font-black tracking-widest uppercase">
              {photoIndex + 1} / {allPhotos.length}
            </div>

            <div 
              className="relative w-full h-full flex items-center justify-center p-4 md:p-12 select-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <button 
                className="hidden md:flex absolute left-8 z-[110] w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full items-center justify-center text-white transition-all active:scale-90"
                onClick={prevPhoto}
              >
                <ChevronLeft size={32} />
              </button>

              <motion.img
                key={photoIndex}
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.1, x: -20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                src={allPhotos[photoIndex]}
                alt="View"
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg pointer-events-none"
                referrerPolicy="no-referrer"
              />

              <button 
                className="hidden md:flex absolute right-8 z-[110] w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full items-center justify-center text-white transition-all active:scale-90"
                onClick={nextPhoto}
              >
                <ChevronRight size={32} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mobile Floating Action Bar */}
      <AnimatePresence>
        {!isMobileBookingOpen && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[60] p-4 pb-8 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center gap-4">
               {/* Small Price/Info */}
               <div className="shrink-0 flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Avg Price</span>
                  <span className="text-sm font-black text-slate-900 tracking-tighter">₹{restaurant.avgPrice} <span className="text-[10px] font-bold text-slate-400">/ 2 people</span></span>
               </div>
               
               <button 
                onClick={() => setIsMobileBookingOpen(true)}
                className="flex-1 bg-brand text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 {restaurant.isBookingEnabled !== false ? (
                   <>
                    <CalendarIcon size={18} />
                    Book a Table
                   </>
                 ) : (
                   'Booking Unavailable'
                 )}
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Booking Drawer (Full Screen) */}
      <AnimatePresence>
        {isMobileBookingOpen && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[200] flex flex-col md:hidden"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-display font-black text-slate-900 leading-tight">Book a Table</h3>
                <p className="text-xs font-bold text-slate-500">{restaurant.name}</p>
              </div>
              <button 
                onClick={() => setIsMobileBookingOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               {bookingSuccess ? (
                <div className="py-20 text-center">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-display font-black text-slate-900 mb-2">
                    {guests <= (restaurant.instantBookingLimit || 10) ? 'Booking Confirmed!' : 'Booking Requested!'}
                  </h3>
                  <p className="text-slate-500 font-medium whitespace-pre-wrap">
                    {guests <= (restaurant.instantBookingLimit || 10) 
                      ? `Pack your bags! Your table for ${guests} on ${format(selectedDate, 'MMM d')} at ${selectedTime} is confirmed.`
                      : "We'll let you know once the restaurant confirms your reservation."}
                  </p>
                </div>
               ) : (
                 <div className="space-y-10">
                    {/* Date */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Date</h4>
                        <span className="text-[10px] font-black text-brand bg-brand/5 px-2 py-0.5 rounded-full uppercase truncate max-w-[150px]">
                          {format(selectedDate, 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-2 px-2">
                        {dates.map((date) => (
                          <button
                            key={date.toString()}
                            onClick={() => setSelectedDate(date)}
                            className={cn(
                              "flex flex-col items-center min-w-[64px] py-4 rounded-2xl border-2 transition-all font-black",
                              format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                                ? "bg-brand/10 border-brand text-brand shadow-sm"
                                : "bg-white border-slate-100 text-slate-400 hover:border-brand"
                            )}
                          >
                            <span className="text-[10px] uppercase opacity-60 mb-1">{format(date, 'EEE')}</span>
                            <span className="text-lg">{format(date, 'd')}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time */}
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Select Time</h4>
                      {slotData.categorized ? (
                        <div className="space-y-6">
                           {slotData.categories.map((cat) => (
                             <div key={cat.id}>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-3">{cat.name}</p>
                                <div className="grid grid-cols-4 gap-3">
                                  {cat.slots.map((time) => {
                                    const past = isTimeInPast(time);
                                    return (
                                      <button
                                        key={time}
                                        disabled={past}
                                        onClick={() => setSelectedTime(time)}
                                        className={cn(
                                          "py-3 rounded-xl border-2 text-xs font-black transition-all",
                                          selectedTime === time
                                            ? "bg-brand/10 border-brand text-brand"
                                            : "bg-white border-slate-100 text-slate-600 hover:border-brand",
                                          past && "opacity-20 bg-slate-50 border-transparent text-slate-300"
                                        )}
                                      >
                                        {time}
                                      </button>
                                    );
                                  })}
                                </div>
                             </div>
                           ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                          {slotData.slots.map((time) => {
                            const past = isTimeInPast(time);
                            return (
                              <button
                                key={time}
                                disabled={past}
                                onClick={() => setSelectedTime(time)}
                                className={cn(
                                  "py-3 rounded-xl border-2 text-xs font-black transition-all",
                                  selectedTime === time
                                    ? "bg-brand/10 border-brand text-brand"
                                    : "bg-white border-slate-100 text-slate-600 hover:border-brand",
                                  past && "opacity-20 bg-slate-50 border-transparent text-slate-300"
                                )}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Guests */}
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Number of Guests</h4>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <div className="flex items-center gap-3">
                          <Users size={18} className="text-brand" />
                          <span className="text-sm font-black text-slate-900">{guests} People</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                            onClick={() => setGuests(Math.max(1, guests - 1))}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
                           >
                            -
                           </button>
                           <button 
                            onClick={() => setGuests(guests + 1)}
                            disabled={guests >= 20}
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all",
                              guests >= 20 ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white"
                            )}
                           >
                            +
                           </button>
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                       <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Contact Details</h4>
                       <div className="relative group">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors" size={18} />
                          <input 
                            type="tel" 
                            placeholder="10 digit mobile number"
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 font-bold text-base focus:border-brand focus:ring-0 transition-all"
                            value={userPhone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                              setUserPhone(val);
                            }}
                          />
                       </div>
                       <p className="mt-2 text-[10px] font-bold text-slate-400 bg-slate-50 p-3 rounded-xl">
                         By continuing, you agree that {restaurant.name} may contact you regarding your reservation.
                       </p>
                    </div>
                 </div>
               )}
            </div>

            {/* Drawer Footer */}
            {!bookingSuccess && (
              <div className="p-6 border-t bg-slate-50">
                <button
                  disabled={!selectedTime || userPhone.length !== 10 || isSubmitting}
                  onClick={handleBooking}
                  className={cn(
                    "w-full py-5 rounded-2xl font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2",
                    (!selectedTime || userPhone.length !== 10 || isSubmitting)
                      ? "bg-slate-300 text-white cursor-not-allowed"
                      : "bg-slate-900 text-white hover:-translate-y-1 active:translate-y-0"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      SECURELY BOOKING...
                    </>
                  ) : (
                    'CONFIRM RESERVATION'
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
