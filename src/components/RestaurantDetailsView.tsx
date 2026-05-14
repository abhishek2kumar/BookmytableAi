import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, formatDate, calculateDistance, getRestaurantUrl, getRestaurantBookUrl } from '../lib/utils';
import { summarizeGoogleReviews } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';

export default function RestaurantDetailsView() {
  const { id, tab, city, name } = useParams<{ id: string, tab?: string, city?: string, name?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [activeTimeCategory, setActiveTimeCategory] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [userPhone, setUserPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  
  // Load bookmark status
  useEffect(() => {
    if (user && profile && id) {
      setIsBookmarked((profile.favorites || []).includes(id));
    }
  }, [user, profile, id]);

  // Scroll to tab section
  useEffect(() => {
    if (!loading && restaurant) {
      if (tab) {
        // give it a tiny bit of time to render everything
        setTimeout(() => {
          const el = document.getElementById(tab);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else if (location.hash) {
        setTimeout(() => {
          const el = document.getElementById(location.hash.replace('#', ''));
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [loading, restaurant, tab, location.hash]);

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
  const menuScrollRef = useRef<HTMLDivElement>(null);
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
          const fetchedRestaurant = { id: docSnap.id, ...docSnap.data() } as Restaurant;
          setRestaurant(fetchedRestaurant);
          
          // Auto-redirect to SEO friendly URL if necessary
          if (!city || !name) {
            const seoCity = (fetchedRestaurant.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const seoName = (fetchedRestaurant.name || 'restaurant').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            navigate(`/restaurant/${seoCity}/${seoName}/${id}${tab ? `/${tab}` : ''}${location.hash}`, { replace: true });
          }
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
      const summary = await summarizeGoogleReviews(restaurant.name, restaurant.address || restaurant.location);
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
            restaurantLocation: restaurant.address || restaurant.location,
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

    const openMin = parseTime(currentTimings.openStr);
    const closeMin = parseTime(currentTimings.closeStr);
    let opensLaterToday = false;

    if (!currentTimings.isClosed) {
      if (closeMin > openMin) {
        // normal shift
        if (currentMin < openMin) opensLaterToday = true;
      } else {
        // overnight shift
        if (currentMin < openMin && currentMin >= closeMin) opensLaterToday = true;
      }
    }

    if (opensLaterToday) {
      return { 
        displayText: `Closed, opens at ${currentTimings.openStr}`,
        color: 'text-red-500',
        isClosed: true
      };
    } else {
      // Look for next opening
      let nextDayIndex = (now.getDay() + 1) % 7;
      let daysAhead = 1;
      while (daysAhead <= 7) {
        const nextDayName = dayNames[nextDayIndex];
        const nextTimings = getTimingsForDay(nextDayName);
        if (!nextTimings.isClosed) {
           const label = daysAhead === 1 ? 'tomorrow' : nextDayName;
           return { 
             displayText: `Closed, opens at ${nextTimings.openStr} ${label}`,
             color: 'text-red-500',
             isClosed: true
           };
        }
        nextDayIndex = (nextDayIndex + 1) % 7;
        daysAhead++;
      }
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

    const parseTimeForGrouping = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.trim().split(' ');
      const period = parts.length > 1 ? parts[1].toUpperCase() : (timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM');
      const time = parts[0].replace(/AM|PM/i, '');
      let [h, m] = time.split(':').map(Number);
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + (m || 0);
    };

    let rawSlots: string[] = [];
    const manualSlots = restaurant?.bookingSlots || [];
    
    if (manualSlots.length > 0) {
      rawSlots = manualSlots;
    } else {
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
      if (!timings.isClosed) {
        const openMin = parseTimeForGrouping(timings.openStr);
        const closeMin = parseTimeForGrouping(timings.closeStr);
        
        let endMin = closeMin;
        if (closeMin <= openMin) endMin = closeMin + (24 * 60);

        for (let m = openMin; m < endMin; m += 30) {
          const hour = Math.floor((m % (24 * 60)) / 60);
          const min = m % 60;
          rawSlots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        }
      }
    }

    const lunchSlots: string[] = [];
    const dinnerSlots: string[] = [];

    for (const timeStr of rawSlots) {
      const timeVal = parseTimeForGrouping(timeStr);
      if (timeVal < 18 * 60) {
        lunchSlots.push(timeStr);
      } else {
        dinnerSlots.push(timeStr);
      }
    }

    const categories = [];
    if (lunchSlots.length > 0) categories.push({ id: 'lunch', name: 'Lunch', slots: lunchSlots });
    if (dinnerSlots.length > 0) categories.push({ id: 'dinner', name: 'Dinner', slots: dinnerSlots });

    return { categorized: true, categories, slots: [] as string[] };
  }, [restaurant, selectedDate]);

  const times = useMemo(() => {
    if (slotData.categorized && slotData.categories) {
      return slotData.categories.flatMap(c => c.slots);
    }
    return slotData.slots || [];
  }, [slotData]);

  useEffect(() => {
    if (slotData.categorized && slotData.categories && slotData.categories.length > 0) {
      if (!activeTimeCategory || !slotData.categories.find(c => c.id === activeTimeCategory)) {
        setActiveTimeCategory(slotData.categories[0].id);
      }
    } else {
      setActiveTimeCategory(null);
    }
  }, [slotData, activeTimeCategory]);

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
    <div className="bg-white min-h-screen pb-20 overflow-x-hidden relative">
      <Helmet>
        <title>{restaurant.name} | Bookmytable</title>
        <meta name="description" content={`Book a table at ${restaurant.name}. ${Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine} Cuisine in ${restaurant.location}.`} />
        <meta property="og:title" content={`${restaurant.name} | Bookmytable`} />
        <meta property="og:description" content={`Book a table at ${restaurant.name}. ${Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine} Cuisine in ${restaurant.location}.`} />
        <meta property="og:image" content={bannerImages[0] || RESTAURANT_IMAGE_FALLBACK} />
      </Helmet>
      {/* Mobile Blur Extension - Only visible behind the cards! */}
      <div 
        className="md:hidden fixed inset-0 bg-cover bg-center z-[-1] pointer-events-none" 
        style={{ backgroundImage: `url(${bannerImages[bannerIndex] || RESTAURANT_IMAGE_FALLBACK})` }}
      >
         <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[30px]" />
         <div className="absolute inset-x-0 bottom-0 h-[60vh] bg-gradient-to-t from-slate-100 to-transparent" />
      </div>

      {/* Mobile Special Header */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 transition-all duration-300",
        scrolled ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100" : "bg-transparent"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-800 active:scale-95 transition-all"
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
              "w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-800 active:scale-95 transition-all",
              isBookmarking && "opacity-50"
            )}
          >
            <Heart size={20} className={cn(isBookmarked ? "fill-red-500 text-red-500" : "", isBookmarking && "animate-pulse")} />
          </button>
          <button 
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-800 active:scale-95 transition-all"
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
      <div className="relative bg-transparent md:bg-white md:border-b md:border-gray-200 md:shadow-sm md:pt-0 pt-0">
        
        <div className="relative z-10 max-w-6xl mx-auto px-0 sm:px-4 md:px-12 lg:px-16 md:py-8 py-0">
          <button 
            onClick={() => navigate(-1)}
            className="hidden md:flex items-center gap-2 text-vibrant-gray hover:text-brand mb-6 transition-colors font-semibold"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="flex flex-col md:flex-row gap-0 pt-0 md:border md:border-slate-300 md:rounded-[32px] md:items-center relative md:bg-white overflow-hidden">
            {/* Banner Slider Section */}
            <div 
              className="w-full aspect-[4/3] md:h-[360px] lg:h-[420px] md:aspect-auto md:rounded-[32px] rounded-none overflow-hidden relative group cursor-zoom-in shrink-0 z-10 shadow-sm"
              onClick={() => openPhotoViewer(bannerImages[bannerIndex] || RESTAURANT_IMAGE_FALLBACK)}
            >
              <div className="relative w-full h-full bg-slate-100">
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
                  <div className="absolute top-4 right-4 md:top-4 md:right-4 top-20 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[10px] font-black z-10 border border-white/10">
                    {bannerIndex + 1}/{bannerImages.length}
                  </div>
                )}
              </div>
            </div>

            {/* Redesigned Details Section (Desktop & Tablet) */}
            <div className="hidden md:flex flex-col md:absolute md:right-10 lg:right-16 top-1/2 -translate-y-1/2 md:w-[360px] lg:w-[420px] z-20 bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_20px_40px_rgb(0,0,0,0.12)] border border-white/50 p-5 lg:p-6 shrink-0 transition-all">
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-slate-800 font-display flex-wrap">
                    <div className="bg-emerald-600 p-1 rounded-full text-white shrink-0">
                      <Star size={12} className="fill-white" />
                    </div>
                    <span className="text-sm font-bold shrink-0">{restaurant.rating} • {reviews.length} reviews</span>
                    <span className="text-slate-400 mx-1 shrink-0">|</span>
                    <span className="text-sm font-bold shrink-0">₹{restaurant.avgPrice} for two</span>
                  </div>

                  <h1 className="text-2xl lg:text-3xl font-display font-black text-slate-900 tracking-tight leading-tight">{restaurant.name}</h1>
                  
                  <div className="text-sm text-slate-800 font-bold hidden md:block">
                    {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-2 text-sm items-baseline">
                    <span className="text-slate-500 font-bold shrink-0">Location</span>
                    <span className="text-slate-800 font-medium line-clamp-2 leading-snug">{restaurant.address || restaurant.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <button 
                      onClick={() => setIsTimingsOpen(true)}
                      className={cn(
                        "flex items-center gap-1 font-bold tracking-tighter hover:text-brand transition-colors",
                        status.color
                      )}
                    >
                      {status.displayText}
                      <ChevronDown size={18} className="text-brand shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Action Bar */}
                <div className="flex items-center flex-wrap gap-2 pt-4 border-t border-slate-100 w-full mt-auto">
                  <button 
                    onClick={() => {
                      if (restaurant.isBookingEnabled) {
                        navigate(getRestaurantBookUrl(restaurant));
                      }
                    }}
                    disabled={!restaurant.isBookingEnabled}
                    className="flex items-center gap-2 text-brand bg-brand/5 hover:bg-brand/10 disabled:opacity-50 disabled:cursor-not-allowed font-bold px-3 py-2 rounded-xl transition-colors shrink-0 text-sm"
                  >
                    <CalendarIcon size={16} />
                    Book Table
                  </button>
                  
                  <a 
                    href="tel:+919876543210" 
                    className="flex items-center gap-2 text-slate-700 bg-slate-50 border border-slate-100 hover:bg-slate-100 font-bold px-3 py-2 rounded-xl transition-colors shrink-0 text-sm"
                  >
                    <Phone size={16} />
                    Call
                  </a>
                  
                  <div className="ml-auto flex items-center gap-2">
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address || restaurant.location}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center text-brand bg-brand/5 hover:bg-brand/10 font-bold w-[38px] h-[38px] rounded-xl transition-colors shrink-0"
                      aria-label="Get Directions"
                    >
                      <Compass size={18} />
                    </a>

                    <button 
                      onClick={toggleBookmark}
                      disabled={isBookmarking}
                      className={cn(
                        "flex items-center justify-center font-bold w-[38px] h-[38px] rounded-xl border transition-all shrink-0",
                        isBookmarked ? "text-red-600 bg-red-50 border-red-100 hover:bg-red-100" : "text-slate-700 bg-slate-50 border-slate-100 hover:bg-slate-100",
                        isBookmarking && "opacity-50 animate-pulse"
                      )}
                      aria-label={isBookmarked ? 'Saved' : 'Save'}
                    >
                      <Heart size={18} className={cn(isBookmarked && "fill-current")} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile "Dineout" Style Interface */}
            <div className="md:hidden w-full relative -mt-[80px] pb-2 z-20">
               {/* Background extension - Stretch bottom pixels precisely */}
               <div className="absolute inset-x-0 bottom-0 rounded-b-[32px] overflow-hidden z-0" style={{ top: '79px' }}>
                  <div
                     className="absolute top-0 left-0 w-full origin-top overflow-hidden"
                     style={{ height: '1px', transform: 'scaleY(400)' }}
                  >
                     <img
                       src={bannerImages[bannerIndex] || RESTAURANT_IMAGE_FALLBACK}
                       alt=""
                       className="absolute left-0 w-full object-cover"
                       style={{ height: '75vw', top: 'calc(1px - 75vw)', pointerEvents: 'none' }}
                     />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-100/80 to-slate-100/95" />
               </div>

               <div className="bg-white rounded-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden mx-4 pb-1 relative z-10 transition-all">
                  <div className="p-5 space-y-1">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1 flex-1">
                        <h1 className="text-[26px] font-black text-slate-900 leading-tight tracking-tight">{restaurant.name}</h1>
                        <div className="flex items-center flex-wrap gap-1 text-[13px] text-slate-800">
                          <span>{distance} km</span>
                          <span className="text-slate-300">•</span>
                          <span className="line-clamp-1">{restaurant.location}</span>
                          <ChevronDown size={14} className="text-brand shrink-0" />
                        </div>
                        <p className="text-[13px] text-slate-600">
                          {restaurant.cuisine} | ₹{restaurant.avgPrice} for two
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-center shrink-0">
                        <div className="bg-[#0b8a4a] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm text-white">
                          <span className="font-bold text-[15px]">{restaurant.rating}</span>
                          <Star size={12} className="fill-white text-white" />
                        </div>
                        <div className="mt-1 pb-0.5 border-b border-dashed border-slate-300">
                           <div className="text-[10px] font-bold text-slate-500">{reviews.length} ratings</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-1">
                       <button 
                        onClick={() => setIsTimingsOpen(true)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors border",
                          status.isClosed ? "bg-red-50 text-red-600 border-red-50" : "bg-emerald-50 text-emerald-700 border-emerald-50"
                        )}
                       >
                         {status.isClosed ? <span className="font-bold text-red-500">Closed,</span> : <span className="font-bold text-emerald-600">Open,</span>}
                         <span>{status.isClosed ? `Opens at ${status.displayText.split('at ')[1] || 'Tomorrow'}` : `Closes at ${status.displayText.split('at ')[1] || '11:00 PM'}`}</span>
                         <ChevronDown size={14} />
                       </button>
                       
                       <div className="flex gap-2 ml-auto">
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${restaurant.address || restaurant.location}`)}`}
                            className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform border border-slate-100" target="_blank" rel="noopener noreferrer"
                          >
                            <Compass size={18} />
                          </a>
                          <a href="tel:+919876543210" className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform border border-slate-100">
                            <Phone size={18} />
                          </a>
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Mobile Offers Card - Outside the banner image wrapper */}
            {restaurant.offers && restaurant.offers.length > 0 && (
              <div className="md:hidden mx-4 mt-2 relative z-10 bg-white/80 backdrop-blur-xl rounded-[24px] p-4 border border-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex items-center gap-1.5 mb-2 text-[#0b8a4a]">
                  <Gift size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#0b8a4a]">Exclusive Offers</span>
                </div>
                <div className="flex flex-col gap-2">
                  {restaurant.offers.map((offer, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-gradient-to-r from-emerald-50/80 to-white/80 p-3 rounded-xl border border-emerald-100">
                      <Zap className="text-[#0b8a4a] shrink-0 mt-0.5" size={14} />
                      <p className="text-[12px] font-bold text-slate-800 leading-tight">{offer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Navigation Tabs (Desktop) */}
      <div className="hidden md:flex sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-slate-300 mt-8 px-4 md:px-12 lg:px-16 w-full transition-all">
        <div className="max-w-6xl mx-auto w-full flex gap-8">
           <a href="#offers" className={cn("py-4 text-base font-bold border-b-[3px] transition-colors", location.hash === '#offers' || (!location.hash && restaurant.offers?.length) ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-900")}>Offers</a>
           <a href="#menu" className={cn("py-4 text-base font-bold border-b-[3px] transition-colors", location.hash === '#menu' || (!location.hash && !restaurant.offers?.length) ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-900")}>Menu</a>
           <a href="#photos" className={cn("py-4 text-base font-bold border-b-[3px] transition-colors", location.hash === '#photos' ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-900")}>Photos</a>
           <a href="#overview" className={cn("py-4 text-base font-bold border-b-[3px] transition-colors", location.hash === '#overview' ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-900")}>Overview</a>
           <a href="#reviews" className={cn("py-4 text-base font-bold border-b-[3px] transition-colors", location.hash === '#reviews' ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-slate-900")}>Reviews</a>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-4xl mx-auto px-4 md:px-12 lg:px-16 mt-6 md:mt-10 gap-8 md:gap-16">
        <div className="space-y-12 md:space-y-16">
          
          {/* Offers Section */}
          {restaurant.offers && restaurant.offers.length > 0 && (
            <div id="offers" className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Offers</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                {restaurant.offers.map((offer, i) => (
                  <div key={i} className="shrink-0 w-[280px] bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl flex items-start gap-4 transition-all hover:bg-emerald-50">
                    <div className="bg-white p-2 rounded-full shadow-sm text-emerald-600 shrink-0">
                      <Zap size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-snug mb-1">{offer}</h4>
                      <p className="text-xs text-slate-500 font-medium">Auto-applied upon booking</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* Menu Section */}
          <div id="menu" className={cn("scroll-mt-24", restaurant.offers && restaurant.offers.length > 0 ? "pt-8 border-t border-slate-300" : "")}>
            {restaurant.menu && restaurant.menu.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Popular Dishes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {restaurant.menu.map((item, i) => (
                    <div key={i} className="flex justify-between items-start group">
                      <div className="pr-4">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-brand transition-colors">{item.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 md:line-clamp-1">{item.description}</p>
                      </div>
                      {item.price > 0 && <span className="font-black text-slate-900 shrink-0">₹{item.price}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Menu Categories */}
            {((restaurant.menuCategories && restaurant.menuCategories.length > 0) || (restaurant.menuImages && restaurant.menuImages.length > 0)) && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Menu Pages</h3>
                {restaurant.menuCategories && restaurant.menuCategories.length > 0 && (
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide mb-6 max-w-max">
                    {restaurant.menuCategories?.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveMenuCategory(cat.id);
                          setMenuSlideIndex(0);
                          requestAnimationFrame(() => {
                            if (menuScrollRef.current) menuScrollRef.current.scrollTo({ left: 0 });
                          });
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
                        Menu
                      </button>
                    )}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeMenuCategory || (restaurant.menuCategories?.[0]?.id) || 'legacy'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {(() => {
                      const currentCat = activeMenuCategory === 'legacy' 
                        ? { images: restaurant.menuImages } 
                        : (restaurant.menuCategories?.find((c: any) => c.id === activeMenuCategory) || restaurant.menuCategories?.[0] || { images: restaurant.menuImages });
                      const images = currentCat?.images || [];
                      if (images.length === 0) return null;

                      return (
                        <div className="relative group/slides">
                          <div ref={menuScrollRef} className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollBehavior: 'smooth' }}>
                            {images.map((img: string, i: number) => (
                              <div 
                                key={i}
                                className="shrink-0 w-[45vw] md:w-[220px] aspect-[3/4.2] rounded-2xl overflow-hidden border border-slate-100 cursor-zoom-in relative bg-slate-100 snap-center"
                                onClick={() => openPhotoViewer(img)}
                              >
                                <img src={img} alt={`Menu page ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded bg-white/10 text-white text-[9px] font-black tracking-widest shadow-sm">
                                  {i + 1} / {images.length}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Photos Section */}
          {restaurant.secondaryImages && restaurant.secondaryImages.length > 0 && (
            <div id="photos" className="scroll-mt-24 pt-8 border-t border-slate-300">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Photos</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {restaurant.secondaryImages.slice(0, 5).map((img, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-32 md:h-40 rounded-xl overflow-hidden cursor-zoom-in group relative",
                      i === 0 && "col-span-2 lg:col-span-1 h-32 md:h-40 lg:h-40" // Make first photo wide on mobile
                    )}
                    onClick={() => openPhotoViewer(img)}
                  >
                    <img src={img} alt={`View ${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" onError={handleImageError} />
                    {i === 4 && restaurant.secondaryImages!.length > 5 && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors">
                        <span className="text-white font-black text-lg">+{restaurant.secondaryImages!.length - 5} MORE</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overview Section */}
          <div id="overview" className="scroll-mt-24 pt-8 border-t border-slate-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Overview</h2>
            {restaurant.description && (
              <p className="text-slate-600 text-[14px] md:text-base font-medium leading-relaxed mb-8">
                {restaurant.description}
              </p>
            )}

            {/* Amenities Grid */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Facilities</h3>
              {restaurant.facilities && restaurant.facilities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                  {restaurant.facilities.map((fac, i) => {
                    return (
                      <div key={i} className="flex items-center gap-2 group">
                        <Check size={16} className="text-[#0b8a4a]" />
                        <span className="text-sm font-bold text-slate-700">{fac}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm font-medium italic">Standard amenities provided.</p>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div id="reviews" className="scroll-mt-24 pt-8 border-t border-slate-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Reviews</h2>

            <div className="bg-slate-50/50 rounded-3xl p-6 md:p-8 space-y-8">
              {/* AI Summary and Leave Review Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* AI Summary */}
                <div className="bg-gradient-to-br from-indigo-500 to-brand p-6 rounded-2xl text-white shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[120px]">
                   <div className="absolute top-0 right-0 p-6 opacity-10">
                     <Sparkles size={80} />
                   </div>
                   <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-4">
                       <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
                         <Sparkles size={16} className="text-white" />
                       </div>
                       <h3 className="text-xl font-bold text-white/90">AI Summary from Google Review</h3>
                     </div>
                     
                     {isAiLoading ? (
                       <div className="flex items-center gap-3">
                         <Loader2 size={16} className="animate-spin text-white/80" />
                         <p className="text-xs font-medium animate-pulse text-white/80">Summarizing...</p>
                       </div>
                     ) : aiSummary ? (
                       <div className="prose prose-invert max-w-none text-white/95 font-medium text-xs leading-relaxed text-opacity-90 line-clamp-6">
                          <ReactMarkdown>{aiSummary}</ReactMarkdown>
                       </div>
                     ) : (
                       <div className="flex flex-col items-start mt-2">
                         <p className="text-xs font-medium text-white/80 mb-4">
                           Get an AI-generated summary of recent public reviews.
                         </p>
                         <button 
                           onClick={handleGenerateSummary}
                           className="bg-white text-brand px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all shadow-sm"
                         >
                           <Sparkles size={14} /> Generate
                         </button>
                       </div>
                     )}
                   </div>
                </div>

                {/* Leave Review */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                  <h3 className="text-xl font-bold text-slate-900 mb-4 block">Rate your experience</h3>
                  
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star}
                        onClick={() => setUserRating(star)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          userRating >= star ? "bg-amber-100 text-amber-500 shadow-sm" : "bg-slate-50 text-slate-300 hover:bg-slate-100"
                        )}
                      >
                        <Star size={16} className={userRating >= star ? "fill-amber-500" : ""} />
                      </button>
                    ))}
                  </div>

                  <input 
                    type="text"
                    placeholder="Tell us what you loved..."
                    className="w-full p-3 bg-slate-50 border border-slate-100 focus:border-brand focus:bg-white rounded-xl outline-none text-sm font-medium transition-all"
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                  />

                  <button 
                    onClick={handlePostReview}
                    disabled={isPostingReview || !userComment.trim() || hasReviewed}
                    className="mt-4 w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                  >
                    {isPostingReview ? <Loader2 size={16} className="animate-spin" /> : hasReviewed ? <Check size={14} /> : <Send size={14} />}
                    {hasReviewed ? 'Reviewed' : 'Submit Review'}
                  </button>
                </div>
              </div>

              {/* User Reviews */}
              {reviews.length > 0 && (
                <div className="pt-4 space-y-4">
                   <h3 className="text-xl font-bold text-slate-900 mb-4 block">Recent Reviews</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {reviews.slice(0, 4).map((review) => (
                        <div key={review.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                          <div className="flex items-center gap-3 mb-3">
                            <img 
                              src={review.userPhoto} 
                              alt={review.userName} 
                              className="w-8 h-8 rounded-full bg-slate-100 shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="overflow-hidden">
                              <h4 className="font-bold text-slate-900 text-xs truncate">{review.userName}</h4>
                              <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">{formatDate(review.createdAt)}</p>
                            </div>
                            <div className="ml-auto flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-green-700 font-black text-xs">
                              {review.rating}.0 <Star size={10} className="fill-green-700" />
                            </div>
                          </div>
                          
                          <p className="text-slate-600 text-sm italic line-clamp-3 leading-relaxed flex-grow">
                            "{review.text}"
                          </p>
                        </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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



      {/* Menu Image Popup Modal */}
      <AnimatePresence>
        {isTimingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTimingsOpen(false)}></div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-50 shrink-0">
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Outlet Timings</h2>
                <button 
                  onClick={() => setIsTimingsOpen(false)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 md:p-8 space-y-4 overflow-y-auto w-full">
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
              
              <div className="p-6 md:p-8 bg-slate-50/50 flex justify-center shrink-0">
                <button 
                  onClick={() => setIsTimingsOpen(false)}
                  className="bg-slate-900 text-white w-full md:w-auto md:px-8 py-3.5 rounded-2xl font-bold transition-transform active:scale-95 flex items-center justify-center"
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
        
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[60] p-4 pb-6 bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center gap-4">
               {/* Small Price/Info */}
               <div className="shrink-0 flex flex-col gap-0.5 min-w-[100px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Avg Price</span>
                  <span className="text-base font-black text-slate-900 tracking-tighter">₹{restaurant.avgPrice} <span className="text-[10px] font-bold text-slate-400">/ 2</span></span>
               </div>
               
               <button 
                onClick={() => {
                  if (restaurant.isBookingEnabled !== false) {
                    navigate(getRestaurantBookUrl(restaurant));
                  }
                }}
                className="flex-1 bg-brand text-white py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-2"
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
       
      </AnimatePresence>
    </div>
  );
}
