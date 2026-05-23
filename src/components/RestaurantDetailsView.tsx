import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useRestaurants } from '../hooks/useFirebase';
import { useLocationContext } from './LocationContext';
import { RestaurantCard } from './RestaurantCard';
import { Restaurant, Booking, Review } from '../types';
import { Search, Star, MapPin, Clock, Users, Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, MessageSquare, Sparkles, Send, Loader2, Utensils, Zap, Gift, Info, Check, Heart, Share2, X, Maximize2, Phone, Compass, Navigation, ChevronDown, TrendingUp, Wifi, Car, Wind, Music, Wine, Baby, UserCheck, Gamepad2, Tv, Settings2, Menu, Megaphone, Play, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfToday, parseISO } from 'date-fns';
import { cn, handleImageError, RESTAURANT_IMAGE_FALLBACK, formatDate, calculateDistance, getRestaurantUrl, getRestaurantBookUrl, getRestaurantStatus, getRestaurantTabUrl, getRatingColor } from '../lib/utils';
import { summarizeGoogleReviews } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';

export default function RestaurantDetailsView() {
  const { slug, tab, city } = useParams<{ slug: string, tab?: string, city?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signInWithGoogle } = useAuth();
  const { coords: userCoords } = useLocationContext();
  const { restaurants: allRestaurants, loading: restaurantsLoading } = useRestaurants(true);
  
  const [id, setId] = useState<string | null>(null);
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
  
  // Search Overlay
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const findAndSetPortal = () => {
      const el = document.getElementById('navbar-search-portal');
      if (el) {
        setPortalTarget(el);
      } else {
        timer = setTimeout(findAndSetPortal, 100);
      }
    };
    findAndSetPortal();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bookmytable_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const saveRecentSearch = (item: any) => {
    try {
      const updated = [item, ...recentSearches.filter((s: any) => s.id !== item.id)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('bookmytable_recent_searches', JSON.stringify(updated));
    } catch (e) {}
  };

  const searchSuggestions = useMemo(() => {
    if (!searchQuery || !allRestaurants) return [];
    const q = searchQuery.toLowerCase();
    return allRestaurants.filter(res => {
      return res.name.toLowerCase().includes(q) || 
        (Array.isArray(res.cuisine) ? res.cuisine.join(' ') : (res.cuisine || '')).toLowerCase().includes(q) ||
        res.location.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [searchQuery, allRestaurants]);

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
  const offersScrollRef = useRef<HTMLDivElement>(null);
  const adsScrollRef = useRef<HTMLDivElement>(null);
  
  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = window.innerWidth > 768 ? 600 : 300;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restaurant?.advertisements && restaurant.advertisements.filter(ad => ad.active).length > 1) {
      interval = setInterval(() => {
        if (adsScrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = adsScrollRef.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            adsScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            adsScrollRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
          }
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [restaurant?.advertisements]);

  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [enlargedAdImage, setEnlargedAdImage] = useState<string | null>(null);
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isTimingsOpen, setIsTimingsOpen] = useState(false);
  const [activePhotoTab, setActivePhotoTab] = useState<'food' | 'ambience' | 'exterior'>('food');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bookingMode, setBookingMode] = useState<'table' | 'takeaway'>('table');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isXXL = windowWidth >= 1536;
  const isDesktop = windowWidth >= 768;
  const photoLimit = isXXL ? 10 : (isDesktop ? 5 : 4);

  // Memoize banner images to prevent unnecessary re-renders of the slider
  const bannerImages = useMemo(() => {
    if (!restaurant) return [];
    const images = [restaurant.image, ...(restaurant.secondaryImages || [])].filter(Boolean);
    return images.length > 0 ? images : [RESTAURANT_IMAGE_FALLBACK];
  }, [restaurant]);

  // Reset banner index when changing restaurants
  useEffect(() => {
    setBannerIndex(0);
  }, [id]);

  // Banner Auto-slide
  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerImages.length]);

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
      ...(restaurant.foodImages || []),
      ...(restaurant.ambienceImages || []),
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

  useEffect(() => {
    if (restaurant) {
      if (restaurant.foodImages?.length) setActivePhotoTab('food');
      else if (restaurant.ambienceImages?.length) setActivePhotoTab('ambience');
      else if (restaurant.secondaryImages?.length) setActivePhotoTab('exterior');
    }
  }, [restaurant]);

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

  const formatAddress = (rest: Restaurant) => {
    const parts = [];
    if (rest.floor) parts.push(rest.floor);
    if (rest.shopNo) parts.push(rest.shopNo);
    if (rest.area) parts.push(rest.area);
    else if (rest.location) parts.push(rest.location);
    if (rest.landmark) parts.push(rest.landmark);
    if (rest.city) parts.push(rest.city);
    
    if (parts.length > 0) return parts.join(', ');
    return rest.address || rest.location || '';
  };

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function resolveRestaurant() {
      if (restaurantsLoading) return;
      if (!slug) {
        setError('No restaurant specified');
        setLoading(false);
        return;
      }

      let found = allRestaurants.find(r => r.id === slug);
      if (!found) {
        found = allRestaurants.find(r => {
          const rNameSlug = (r.name || 'restaurant').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const rLocSlug = (r.location || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const combined = rLocSlug ? `${rNameSlug}-${rLocSlug}` : rNameSlug;
          return combined === slug;
        });
      }

      if (found) {
        const fetchedRestaurant = { 
          ...found,
          signatureDishes: found.signatureDishes || (found as any).menu || [] 
        } as Restaurant;
        setRestaurant(fetchedRestaurant);
        setId(found.id!);
        
        // Auto-redirect to SEO friendly URL if necessary
        if (!city) {
          const seoCity = (fetchedRestaurant.city || 'city').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const seoName = (fetchedRestaurant.name || 'restaurant').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const seoLoc = (fetchedRestaurant.location || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const combined = seoLoc ? `${seoName}-${seoLoc}` : seoName;
          const targetUrl = `/restaurant/${seoCity}/${combined}${tab ? `/${tab}` : ''}${location.hash}`;
          if (location.pathname !== `/restaurant/${seoCity}/${combined}` && location.pathname !== `/restaurant/${seoCity}/${combined}/${tab}`) {
             navigate(targetUrl, { replace: true });
          }
        }
      } else {
        setError('Restaurant not found');
      }
      setLoading(false);
    }
    resolveRestaurant();
  }, [slug, city, allRestaurants, restaurantsLoading, tab, navigate, location.hash, location.pathname]);

  useEffect(() => {
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
      const summary = await summarizeGoogleReviews(restaurant.name, formatAddress(restaurant));
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
            restaurantLocation: formatAddress(restaurant),
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


  const status = useMemo(() => getRestaurantStatus(restaurant), [restaurant]);
  const dates = useMemo(() => {
    const allDates = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));
    if (!restaurant?.blackoutDates || restaurant.blackoutDates.length === 0) return allDates;
    
    return allDates.filter(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return !restaurant.blackoutDates?.includes(dateStr);
    });
  }, [restaurant?.blackoutDates]);

  const slotData = useMemo(() => {
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
    
    // Always use outlet timings per the user instruction
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDayName = dayNames[selectedDate.getDay()];
    const daily = restaurant?.dailyTimings?.[selectedDayName];
    
    let rangesToProcess: any[] = [];
    if (daily?.closed) {
      rangesToProcess = [];
    } else if (daily?.ranges && daily.ranges.length > 0) {
      rangesToProcess = daily.ranges;
    } else {
      rangesToProcess = [{
        open: restaurant?.openingHours?.open || '11:00 AM',
        close: restaurant?.openingHours?.close || '11:00 PM'
      }];
    }

    rangesToProcess.forEach(r => {
      const openMin = parseTimeForGrouping(r.open);
      const closeMin = parseTimeForGrouping(r.close);
      
      let endMin = closeMin;
      if (closeMin <= openMin) endMin = closeMin + (24 * 60);

      for (let m = openMin; m < endMin; m += 30) {
        let hour24 = Math.floor((m % (24 * 60)) / 60);
        const min = m % 60;
        const period = hour24 >= 12 ? 'PM' : 'AM';
        let hour12 = hour24 % 12;
        if (hour12 === 0) hour12 = 12;
        rawSlots.push(`${hour12.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${period}`);
      }
    });

    const lunchSlots: string[] = [];
    const dinnerSlots: string[] = [];
    const breakfastSlots: string[] = [];

    for (const timeStr of rawSlots) {
      const timeVal = parseTimeForGrouping(timeStr);
      // Anything > 6:00 AM and < 12:00 PM is breakfast
      if (timeVal > 6 * 60 && timeVal < 12 * 60) {
        breakfastSlots.push(timeStr);
      } 
      // 12:00 PM to 5:30 PM is lunch
      else if (timeVal >= 12 * 60 && timeVal <= 17.5 * 60) {
        lunchSlots.push(timeStr);
      } 
      // 6:00 PM till closing time is dinner
      else if (timeVal >= 18 * 60) {
        dinnerSlots.push(timeStr);
      }
    }

    const categories = [];
    if (breakfastSlots.length > 0) categories.push({ id: 'breakfast', name: 'Breakfast', slots: breakfastSlots });
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

  const activeOffers = useMemo(() => {
    if (!restaurant?.offers) return [];
    
    // Use string comparison for YYYY-MM-DD dates to avoid timezone issues
    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    
    return restaurant.offers.filter(offer => {
      if (!offer.validFrom && !offer.validUntil) return true;
      
      try {
        const fromStr = offer.validFrom ? offer.validFrom.split('T')[0] : null;
        const untilStr = offer.validUntil ? offer.validUntil.split('T')[0] : null;
        
        if (fromStr && untilStr) {
          return todayStr >= fromStr && todayStr <= untilStr;
        }
        if (fromStr) return todayStr >= fromStr;
        if (untilStr) return todayStr <= untilStr;
      } catch (e) {
        return true;
      }
      return true;
    });
  }, [restaurant?.offers]);

  useEffect(() => {
    if (slotData.categorized && slotData.categories && slotData.categories.length > 0) {
      if (!activeTimeCategory || !slotData.categories.find(c => c.id === activeTimeCategory)) {
        setActiveTimeCategory(slotData.categories[0].id);
      }
    } else {
      setActiveTimeCategory(null);
    }
  }, [slotData, activeTimeCategory]);

  useEffect(() => {
    if (restaurant?.id) {
      try {
        const stored = localStorage.getItem('recently_viewed_restaurants');
        let parsed: string[] = [];
        if (stored) parsed = JSON.parse(stored);
        
        const updated = [restaurant.id, ...parsed.filter(id => id !== restaurant.id)].slice(0, 10);
        localStorage.setItem('recently_viewed_restaurants', JSON.stringify(updated));
      } catch (e) {}
    }
  }, [restaurant?.id]);

  const recommendations = useMemo(() => {
    if (!restaurant || !allRestaurants.length) return { similar: [], nearby: [], youMayLike: [], recentlyViewed: [] };

    let recentIds: string[] = [];
    try {
      const stored = localStorage.getItem('recently_viewed_restaurants');
      if (stored) recentIds = JSON.parse(stored);
    } catch(e) {}

    const recentlyViewed = recentIds
      .filter(id => id !== restaurant.id)
      .map(id => allRestaurants.find(r => r.id === id))
      .filter(Boolean) as Restaurant[];

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

    return { similar, nearby, youMayLike, recentlyViewed };
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white min-h-screen pb-20 overflow-x-hidden relative"
    >
      <Helmet>
        <title>{restaurant.name} | Bookmytable</title>
        <meta name="description" content={`Book a table at ${restaurant.name}. ${Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine} Cuisine in ${restaurant.location}.`} />
        <meta property="og:title" content={`${restaurant.name} | Bookmytable`} />
        <meta property="og:description" content={`Book a table at ${restaurant.name}. ${Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine} Cuisine in ${restaurant.location}.`} />
        <meta property="og:image" content={bannerImages[0] || RESTAURANT_IMAGE_FALLBACK} />
      </Helmet>

      {portalTarget && createPortal(
         <div className="w-full flex justify-end md:block">
           <div className="hidden md:block relative w-full group">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-vibrant-gray group-hover:text-brand transition-colors" size={18} />
             <input 
               type="text" 
               readOnly
               onClick={() => setIsSearchOverlayOpen(true)}
               placeholder="Search for restaurant"
               className="w-full pl-12 pr-6 py-2.5 bg-slate-50 border border-transparent hover:bg-white hover:border-brand/20 cursor-pointer rounded-xl font-medium shadow-sm transition-all text-sm outline-none text-slate-800"
               value={searchQuery}
             />
           </div>
           
           <button 
             className="md:hidden p-2 text-vibrant-gray hover:text-brand transition-colors"
             onClick={() => setIsSearchOverlayOpen(true)}
           >
             <Search size={22} className="stroke-[2.5]" />
           </button>
         </div>,
         portalTarget
      )}

      {/* Mobile Blur Extension - Only visible behind the cards! */}
      <div 
        className="md:hidden fixed inset-0 bg-cover bg-center z-[-1] pointer-events-none" 
        style={{ backgroundImage: `url(${bannerImages[bannerIndex % bannerImages.length] || RESTAURANT_IMAGE_FALLBACK})` }}
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
              onClick={() => openPhotoViewer(bannerImages[bannerIndex % bannerImages.length] || RESTAURANT_IMAGE_FALLBACK)}
            >
              <div className="relative w-full h-full bg-slate-100">
                <AnimatePresence mode="popLayout">
                  <motion.img 
                    key={bannerIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    src={bannerImages[bannerIndex % bannerImages.length] || RESTAURANT_IMAGE_FALLBACK} 
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
                  />
                </AnimatePresence>
                
                {bannerImages.length > 1 && (
                  <div className="absolute top-4 right-4 md:top-4 md:right-4 top-20 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[10px] font-black z-10 border border-white/10">
                    {((bannerIndex % bannerImages.length) + 1)}/{bannerImages.length}
                  </div>
                )}
              </div>
            </div>

            {/* Redesigned Details Section (Desktop & Tablet) */}
            <div className="hidden md:flex flex-col md:absolute md:right-10 lg:right-16 top-1/2 -translate-y-1/2 md:w-[360px] lg:w-[420px] z-20 bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_20px_40px_rgb(0,0,0,0.12)] border border-white/50 p-5 lg:p-6 shrink-0 transition-all">
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-slate-800 font-display flex-wrap">
                    <div className={cn("p-1 rounded-full shrink-0", getRatingColor(restaurant.rating || 0))}>
                      <Star size={12} className="fill-current" />
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
                    <span className="text-slate-800 font-medium line-clamp-2 leading-snug">{formatAddress(restaurant)}</span>
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
                      onClick={async () => {
                        if (restaurant.isBookingEnabled !== false) {
                          if (!user) {
                            try {
                              await signInWithGoogle();
                              navigate(getRestaurantBookUrl(restaurant));
                            } catch (e) {
                              console.error('Failed to sign in:', e);
                            }
                          } else {
                            navigate(getRestaurantBookUrl(restaurant));
                          }
                        }
                      }}
                      disabled={restaurant.isBookingEnabled === false}
                      className="flex items-center gap-2 text-brand bg-brand/5 hover:bg-brand/10 disabled:opacity-50 disabled:cursor-not-allowed font-bold px-3 py-2 rounded-xl transition-colors shrink-0 text-sm"
                    >
                      <CalendarIcon size={16} />
                      {restaurant.isBookingEnabled !== false ? 'Book Table' : 'Booking Unavailable'}
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
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${formatAddress(restaurant)}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center text-brand bg-brand/5 hover:bg-brand/10 font-bold w-[38px] h-[38px] rounded-xl transition-colors shrink-0"
                      aria-label="Get Directions"
                    >
                      <Navigation size={18} className="fill-current -ml-0.5 mt-0.5" />
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
                       src={bannerImages[bannerIndex % bannerImages.length] || RESTAURANT_IMAGE_FALLBACK}
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
                          {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine} | ₹{restaurant.avgPrice} for two
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-center shrink-0">
                        <div className={cn("px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm", getRatingColor(restaurant.rating || 0))}>
                          <span className="font-bold text-[15px]">{restaurant.rating}</span>
                          <Star size={12} className="fill-current" />
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
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${formatAddress(restaurant)}`)}`}
                            className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform border border-slate-100" target="_blank" rel="noopener noreferrer"
                          >
                            <Navigation size={18} className="fill-current -ml-0.5 mt-0.5" />
                          </a>
                          <a href="tel:+919876543210" className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform border border-slate-100">
                            <Phone size={18} />
                          </a>
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Active Offers was here */}
          </div>
        </div>
      </div>

      {/* Content Navigation Tabs (Desktop & Mobile) */}
      <div className="flex sticky top-[72px] md:top-0 bg-white/95 backdrop-blur-md z-40 border-b border-slate-300 mt-0 md:mt-8 px-4 md:px-12 lg:px-16 w-full transition-all overflow-x-auto scrollbar-hide">
        <div className="max-w-6xl mx-auto w-full flex gap-6 md:gap-8 min-w-max">
          {[
            { id: 'offers', label: 'Offers', show: activeOffers.length > 0 },
            { id: 'menu', label: 'Menu', show: true },
            { id: 'photos', label: 'Photos', show: !!((restaurant.secondaryImages?.length || 0) > 0 || (restaurant.foodImages?.length || 0) > 0 || (restaurant.ambienceImages?.length || 0) > 0) },
            { id: 'overview', label: 'Story', show: true },
            { id: 'reviews', label: 'Reviews', show: true },
            { id: 'book', label: 'Table Booking', show: restaurant.isBookingEnabled !== false },
            { id: 'takeaway', label: 'Take Away', show: true }
          ].filter(tab => tab.show).map((t) => {
            const isActive = tab === t.id || (!tab && !location.hash && t.id === (activeOffers.length ? 'offers' : 'menu'));
            return (
              <Link 
                key={t.id}
                to={getRestaurantTabUrl(restaurant, t.id)}
                className={cn(
                  "relative py-4 text-sm md:text-base font-bold transition-colors whitespace-nowrap", 
                  isActive ? "text-brand" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {t.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-4xl mx-auto px-4 md:px-12 lg:px-16 mt-6 md:mt-10 gap-8 md:gap-16">
        <div className="space-y-12 md:space-y-16">
          
          {/* Offers Section */}
          {activeOffers.length > 0 && (
            <div id="offers" className="scroll-mt-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-slate-900">Offers</h2>
                {activeOffers.length > 1 && (
                  <div className="hidden md:flex gap-3">
                     <div onClick={() => scrollContainer(offersScrollRef, 'left')} className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors cursor-pointer">
                       <ArrowLeft size={20} strokeWidth={2} />
                     </div>
                     <div onClick={() => scrollContainer(offersScrollRef, 'right')} className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors cursor-pointer">
                       <ArrowRight size={20} strokeWidth={2} />
                     </div>
                  </div>
                )}
              </div>
              
              <div 
                ref={offersScrollRef} 
                className="flex gap-4 md:gap-5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 snap-x scroll-smooth"
                onScroll={() => {
                  if (offersScrollRef.current) {
                    const { scrollLeft, clientWidth } = offersScrollRef.current;
                    setActiveOfferIndex(Math.round(scrollLeft / clientWidth));
                  }
                }}
              >
                {activeOffers.map((offer, i) => (
                  <div key={i} className="snap-start shrink-0 w-full md:w-[280px] bg-white border border-slate-200 rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
                    <div className="p-5 bg-white pb-6">
                      <h4 className="font-black text-slate-900 leading-tight text-[20px] md:text-[22px] tracking-tight mb-1">
                        {offer.title}
                      </h4>
                      <div className="text-[13px] text-slate-400 font-medium tracking-tight">
                        {offer.description || 'on total bill'}
                      </div>
                    </div>
                    
                    <div className="relative border-t border-dashed border-slate-200 bg-red-50/40 p-5 flex-grow overflow-hidden">
                      <div className="absolute right-0 bottom-0 opacity-[0.03] translate-x-1/4 translate-y-1/4 pointer-events-none">
                        <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-900">
                          <path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.87-11.45V2"></path>
                        </svg>
                      </div>
                      
                      <div className="relative z-10 flex flex-col gap-1.5 w-full">
                        <div className="flex items-center gap-2">

                          {offer.promoCode && (
                            <span className="bg-[#f05a41] text-white text-[9px] font-black px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider">
                              EXCLUSIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-slate-500 font-medium leading-snug">
                          {offer.terms || (offer.promoCode 
                            ? 'Limited slots, buy offer and book your table' 
                            : 'Pay restaurant bill to avail the offer')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Offer Carousel Dots (Mobile Only) */}
              {!isDesktop && activeOffers.length > 1 && (
                <div className="flex md:hidden justify-center items-center gap-2 mt-2 pb-2">
                  {activeOffers.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (offersScrollRef.current) {
                          offersScrollRef.current.scrollTo({ left: i * offersScrollRef.current.clientWidth, behavior: 'smooth' });
                          setActiveOfferIndex(i);
                        }
                      }}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        i === activeOfferIndex ? "bg-brand w-6" : "bg-slate-200 hover:bg-slate-300 w-2"
                      )}
                      aria-label={`Go to offer slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Advertisements / Featured Promos */}
          {restaurant.advertisements && restaurant.advertisements.filter(ad => ad.active).length > 0 && (
            <div className="scroll-mt-24 pt-8 border-t border-slate-200">
               <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                   <Megaphone size={20} className="text-brand" />
                   <h2 className="text-2xl font-bold text-slate-900">Featured Spotlights</h2>
                 </div>
                 {restaurant.advertisements.filter(ad => ad.active).length > 1 && (
                   <div className="hidden md:flex gap-3">
                     <div onClick={() => scrollContainer(adsScrollRef, 'left')} className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors cursor-pointer">
                       <ArrowLeft size={20} strokeWidth={2} />
                     </div>
                     <div onClick={() => scrollContainer(adsScrollRef, 'right')} className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors cursor-pointer">
                       <ArrowRight size={20} strokeWidth={2} />
                     </div>
                   </div>
                 )}
               </div>
               <div 
                 ref={adsScrollRef} 
                 className="flex gap-8 overflow-x-auto pb-2 scrollbar-hide snap-x scroll-smooth"
                 onScroll={() => {
                   if (adsScrollRef.current) {
                     const { scrollLeft, clientWidth } = adsScrollRef.current;
                     setActiveAdIndex(Math.round(scrollLeft / clientWidth));
                   }
                 }}
               >
                 {restaurant.advertisements.filter(ad => ad.active).map((ad) => (
                   <div key={ad.id} className="snap-start shrink-0 w-full bg-white rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand/50 transition-all overflow-hidden flex flex-col md:flex-row group">
                     <div 
                       className="relative shrink-0 w-full md:w-5/12 lg:w-2/5 overflow-hidden border-b md:border-b-0 md:border-r border-slate-100 flex bg-slate-50 cursor-pointer"
                       onClick={() => {
                         setEnlargedAdImage(ad.image || RESTAURANT_IMAGE_FALLBACK);
                       }}
                     >
                       <img src={ad.image || RESTAURANT_IMAGE_FALLBACK} alt={ad.title} className="block w-full h-48 md:h-full md:absolute md:inset-0 object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                     </div>
                     <div className="p-6 md:p-8 flex flex-col flex-grow bg-white justify-center">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand transition-colors mb-3">{ad.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 mb-8 flex-grow whitespace-pre-wrap">{ad.description}</p>
                        {ad.videoUrl && (
                          <div className="mt-auto md:mt-0">
                            <a 
                              href={ad.videoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 w-full md:w-auto md:px-8 py-3.5 bg-brand text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-dark transition-all active:scale-[0.98] shadow-md shadow-brand/20"
                            >
                              <Play size={14} fill="currentColor" /> Watch Video
                            </a>
                          </div>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
               
               {/* Ad Carousel Dots */}
               {restaurant.advertisements.filter(ad => ad.active).length > 1 && (
                 <div className="flex justify-center items-center gap-2 mt-2 pb-1">
                   {restaurant.advertisements.filter(ad => ad.active).map((_, i) => (
                     <button
                       key={i}
                       onClick={() => {
                         if (adsScrollRef.current) {
                           adsScrollRef.current.scrollTo({ left: i * adsScrollRef.current.clientWidth, behavior: 'smooth' });
                           setActiveAdIndex(i);
                         }
                       }}
                       className={cn(
                         "h-2 rounded-full transition-all duration-300",
                         i === activeAdIndex ? "bg-brand w-6" : "bg-slate-200 hover:bg-slate-300 w-2"
                       )}
                       aria-label={`Go to slide ${i + 1}`}
                     />
                   ))}
                 </div>
               )}
            </div>
          )}

          {/* Menu Section */}
          <div id="menu" className={cn("scroll-mt-24", (activeOffers.length || restaurant.advertisements?.length) ? "pt-8 border-t border-slate-300" : "")}>
            {((restaurant.popularDishes && restaurant.popularDishes.length > 0) || (restaurant.signatureDishes && restaurant.signatureDishes.length > 0)) && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Signature Dishes & Bestsellers</h3>
                
                {/* Real Popular Dishes from field */}
                {restaurant.popularDishes && restaurant.popularDishes.length > 0 && (
                  <div className="flex flex-wrap mb-8">
                    {restaurant.popularDishes.map((dish, i) => (
                      <span key={i} className="text-sm font-medium text-slate-700 mr-1">
                        {dish}{i < restaurant.popularDishes!.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {restaurant.signatureDishes?.map((item, i) => (
                    <div key={i} className="flex justify-between items-start group">
                      <div className="pr-4">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-brand transition-colors">{item.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{item.description}</p>
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
                          <div ref={menuScrollRef} className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-6 md:mx-0 md:px-0" style={{ scrollBehavior: 'smooth' }}>
                            {images.map((img: string, i: number) => (
                              <div 
                                key={i}
                                className="shrink-0 w-[45vw] md:w-[220px] aspect-[3/4.2] rounded-2xl overflow-hidden border border-slate-100 cursor-zoom-in relative bg-slate-100 snap-center"
                                onClick={() => openPhotoViewer(img)}
                              >
                                <img src={img} alt={`Menu page ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-white text-[9px] font-black tracking-widest shadow-sm">
                                  {i + 1} / {images.length}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Navigation Arrows for Web/Tab */}
                          <div className="hidden md:block">
                             <button 
                               onClick={() => scroll(menuScrollRef, 'left')}
                               className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-800 hover:text-brand transition-colors z-10"
                             >
                               <ChevronLeft size={20} />
                             </button>
                             <button 
                               onClick={() => scroll(menuScrollRef, 'right')}
                               className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-800 hover:text-brand transition-colors z-10"
                             >
                               <ChevronRight size={20} />
                             </button>
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
          {(restaurant.secondaryImages?.length || restaurant.foodImages?.length || restaurant.ambienceImages?.length) && (
            <div id="photos" className="scroll-mt-24 pt-8 border-t border-slate-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Photo Gallery</h2>
                
                <div className="flex bg-slate-50 p-1 rounded-2xl overflow-x-auto scrollbar-hide shrink-0">
                  {restaurant.foodImages && restaurant.foodImages.length > 0 && (
                    <button
                      onClick={() => setActivePhotoTab('food')}
                      className={cn(
                        "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        activePhotoTab === 'food' ? "bg-white text-brand shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Food
                    </button>
                  )}
                  {restaurant.ambienceImages && restaurant.ambienceImages.length > 0 && (
                    <button
                      onClick={() => setActivePhotoTab('ambience')}
                      className={cn(
                        "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        activePhotoTab === 'ambience' ? "bg-white text-brand shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Ambience
                    </button>
                  )}
                  {restaurant.secondaryImages && restaurant.secondaryImages.length > 0 && (
                    <button
                      onClick={() => setActivePhotoTab('exterior')}
                      className={cn(
                        "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        activePhotoTab === 'exterior' ? "bg-white text-brand shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Exterior
                    </button>
                  )}
                </div>
              </div>
              
              <div className="relative min-h-[200px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePhotoTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activePhotoTab === 'food' && restaurant.foodImages && (
                      <div className="grid grid-cols-2 md:grid-cols-5 2xl:grid-cols-10 gap-2 md:gap-3">
                        {restaurant.foodImages.map((img, i, arr) => {
                          const showMore = i === photoLimit - 1 && arr.length > photoLimit;
                          if (i >= photoLimit) return null;
                          
                          return (
                            <div key={i} className="aspect-square rounded-xl md:rounded-2xl overflow-hidden cursor-zoom-in group relative bg-slate-50 border border-slate-100 shadow-sm md:shadow-none" onClick={() => openPhotoViewer(img)}>
                              <img src={img} alt={`Food ${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" onError={handleImageError} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              {showMore && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                  <span className="text-xl md:text-2xl font-black">+{arr.length - (photoLimit - 1)}</span>
                                  <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest">More</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {activePhotoTab === 'ambience' && restaurant.ambienceImages && (
                      <div className="grid grid-cols-2 md:grid-cols-5 2xl:grid-cols-10 gap-2 md:gap-3">
                        {restaurant.ambienceImages.map((img, i, arr) => {
                           const showMore = i === photoLimit - 1 && arr.length > photoLimit;
                           if (i >= photoLimit) return null;

                          return (
                            <div key={i} className="aspect-square rounded-xl md:rounded-2xl overflow-hidden cursor-zoom-in group relative bg-slate-50 border border-slate-100 shadow-sm md:shadow-none" onClick={() => openPhotoViewer(img)}>
                              <img src={img} alt={`Ambience ${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" onError={handleImageError} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              {showMore && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                  <span className="text-xl md:text-2xl font-black">+{arr.length - (photoLimit - 1)}</span>
                                  <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest">More</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {activePhotoTab === 'exterior' && restaurant.secondaryImages && (
                      <div className="grid grid-cols-2 md:grid-cols-5 2xl:grid-cols-10 gap-2 md:gap-3">
                        {restaurant.secondaryImages.map((img, i, arr) => {
                           const showMore = i === photoLimit - 1 && arr.length > photoLimit;
                           if (i >= photoLimit) return null;

                          return (
                            <div key={i} className="aspect-square rounded-xl md:rounded-2xl overflow-hidden cursor-zoom-in group relative bg-slate-50 border border-slate-100 shadow-sm md:shadow-none" onClick={() => openPhotoViewer(img)}>
                              <img src={img} alt={`Exterior ${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" onError={handleImageError} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              {showMore && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                  <span className="text-xl md:text-2xl font-black">+{arr.length - (photoLimit - 1)}</span>
                                  <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest">More</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          <div id="overview" className="scroll-mt-24 pt-8 border-t border-slate-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">{restaurant.name}'s Story</h2>
            {restaurant.description && (
              <p className="text-slate-600 text-[14px] md:text-base font-medium leading-relaxed mb-8 text-justify">
                {restaurant.description}
              </p>
            )}

            {/* Amenities Grid */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Facilities</h3>
              {restaurant.facilities && restaurant.facilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {restaurant.facilities.map((fac, i) => (
                    <div 
                      key={i} 
                      className="flex items-center group transition-all"
                    >
                      <span className="text-sm font-medium text-slate-700">{fac}</span>
                    </div>
                  ))}
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
              <div className="grid grid-cols-1 gap-6">
                
                {/* AI Summary */}
                <div className="bg-[#0f172a] p-6 md:p-8 rounded-[28px] text-white shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[180px] border border-white/10 group">
                   {/* Animated Background Accents */}
                   <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-brand/20 transition-colors duration-700 pointer-events-none" />
                   <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -ml-20 -mb-20 pointer-events-none" />
                   
                   <div className="relative z-10">
                     <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-gradient-to-tr from-brand to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20 ring-1 ring-white/20">
                           <Sparkles size={24} className="text-white fill-white/20" />
                         </div>
                         <div>
                           <h3 className="text-xl font-black text-white tracking-tight leading-none">AI Dining Insight</h3>
                           <p className="text-[10px] md:text-xs font-bold text-white/50 uppercase tracking-[0.2em] mt-2 flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                             Verified Analysis
                           </p>
                         </div>
                       </div>
                       <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
                          <span className="text-[10px] md:text-xs font-black text-white/70">BETA</span>
                       </div>
                     </div>
                     
                     {isAiLoading ? (
                       <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl">
                         <Loader2 size={18} className="animate-spin text-white/80" />
                         <p className="text-sm font-medium animate-pulse text-white/80">Processing culinary insights and guest experiences...</p>
                       </div>
                     ) : aiSummary ? (
                       <div className="prose prose-invert max-w-none text-white/90 font-medium text-sm md:text-base leading-relaxed text-opacity-90 max-w-4xl">
                          <ReactMarkdown>{aiSummary}</ReactMarkdown>
                       </div>
                     ) : (
                       <div className="flex flex-col items-start mt-4 bg-white/5 p-5 md:p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                         <p className="text-sm md:text-base font-medium text-white/80 mb-5 leading-relaxed max-w-2xl">
                           Discover what guests love most. Generate an AI-powered summary of thousands of customer reviews to reveal top dishes, ambiance, and service highlights in seconds.
                         </p>
                         <button 
                           onClick={handleGenerateSummary}
                           className="bg-white text-brand px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all shadow-xl hover:shadow-white/20"
                         >
                           <Sparkles size={16} className="fill-brand/20" /> Generate Culinary Insight
                         </button>
                       </div>
                     )}
                   </div>
                </div>

                {/* Leave Review */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
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
          {/* Take Away Section */}
          <div id="takeaway" className="scroll-mt-24 pt-8 border-t border-slate-300">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Take Away</h2>
            <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Utensils size={28} className="text-slate-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Take Away Orders</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">This restaurant hasn't enabled online take away orders yet. Please contact them directly.</p>
              </div>
               <a href="tel:+919876543210" className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-xl active:scale-95 transition-transform mt-2">
                 <Phone size={18} />
                 Call Restaurant
               </a>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Restaurants Sections */}
      <div className="max-w-7xl mx-auto px-4 mt-16 space-y-20">
        {/* Recently Viewed Restaurants */}
        {recommendations.recentlyViewed.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-vibrant-dark tracking-tight">Recently Viewed</h2>
                <p className="text-vibrant-gray font-medium text-sm">Restaurants you visited recently</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.recentlyViewed.slice(0, 4).map((res) => (
                <RestaurantCard key={res.id} restaurant={res} className="shadow-vibrant-sm" />
              ))}
            </div>
          </section>
        )}

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
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-6"
          >
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTimingsOpen(false)}></div>
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-50 shrink-0">
                <h2 className="text-[20px] md:text-2xl font-display font-black text-slate-900 tracking-tight">Outlet Timings</h2>
                <button 
                  onClick={() => setIsTimingsOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  <X size={18} className="md:w-5 md:h-5" />
                </button>
              </div>
              
              <div className="p-6 md:p-8 space-y-1 overflow-y-auto w-full">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                  const daily = restaurant.dailyTimings?.[day];
                  const isToday = format(new Date(), 'EEEE') === day;
                  return (
                    <div key={day} className={cn(
                      "grid grid-cols-[1fr_auto] gap-4 py-3 md:py-3.5 border-b border-slate-50 last:border-0",
                      isToday && "bg-brand/5 -mx-4 px-4 rounded-xl"
                    )}>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-sans text-[13px] md:text-[15px] leading-[18px] tracking-[-0.35px]", isToday ? "text-brand font-medium" : "text-[rgba(2,6,12,0.75)] font-light")}>{isToday ? 'Today' : day}</span>
                      </div>
                      <div className={cn(
                        "font-sans text-[13px] md:text-[15px] leading-[18px] tracking-[-0.35px] text-right",
                        daily?.closed ? "text-red-500 font-medium" : "text-[rgba(2,6,12,0.75)] font-light"
                      )}>
                        {daily ? (
                          daily.closed ? 'Closed' : daily.ranges.map(r => `${r.open} - ${r.close}`).join(', ')
                        ) : `${restaurant.openingHours?.open || '12:30 PM'} - ${restaurant.openingHours?.close || '11:59 PM'}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10" onClick={() => setIsTimingsOpen(false)} />
          </motion.div>
        )}

        {enlargedAdImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center overscroll-none touch-none p-4"
            onClick={() => setEnlargedAdImage(null)}
          >
            <div className="absolute top-6 right-6">
              <button 
                onClick={() => setEnlargedAdImage(null)}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
              >
                <X size={24} />
              </button>
            </div>
            
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={enlargedAdImage}
              alt="Enlarged Advertisement"
              className="w-full max-w-lg max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
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
                  onClick={async () => {
                    if (restaurant.isBookingEnabled !== false) {
                      if (!user) {
                        try {
                          await signInWithGoogle();
                          navigate(getRestaurantBookUrl(restaurant));
                        } catch (e) {
                          console.error('Failed to sign in:', e);
                        }
                      } else {
                        navigate(getRestaurantBookUrl(restaurant));
                      }
                    }
                  }}
                  disabled={restaurant.isBookingEnabled === false}
                  className="flex-1 bg-brand text-white py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-brand/20 disabled:shadow-none disabled:bg-slate-300 active:scale-95 transition-all flex items-center justify-center gap-2"
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

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOverlayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-[200] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 md:p-6 border-b flex items-center gap-3 max-w-4xl mx-auto w-full">
              <button 
                onClick={() => setIsSearchOverlayOpen(false)}
                className="p-2 -ml-2 text-vibrant-dark hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 relative border-none">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand" size={18} />
                <div className="flex flex-col w-full">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search for restaurants by name, location, or cuisine"
                    className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-2.5 md:text-base text-sm font-bold focus:ring-0 outline-none h-11"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Viewport content */}
            <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto">
              {searchQuery.length > 0 ? (
                <div className="p-4 md:p-6 divide-y divide-gray-100">
                  {searchSuggestions.length > 0 ? (
                    <>
                      <div className="pb-3 pt-1">
                        <span className="text-[10px] md:text-xs font-black text-vibrant-gray uppercase tracking-[0.15em]">Restaurants</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchSuggestions.map(res => (
                          <Link 
                            key={res.id} 
                            to={getRestaurantUrl(res)}
                            onClick={() => {
                              setIsSearchOverlayOpen(false);
                              saveRecentSearch({
                                type: 'restaurant',
                                id: `res-${res.id}`,
                                name: res.name,
                                image: res.image || '',
                                city: res.city || res.location,
                                restaurantId: res.id,
                                subtitle: 'Restaurant'
                              });
                            }}
                            className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100"
                          >
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                              <img src={res.image || RESTAURANT_IMAGE_FALLBACK} alt="" className="w-full h-full object-cover" onError={handleImageError} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-vibrant-dark md:text-lg truncate">{res.name}</h4>
                              <p className="text-xs md:text-sm text-vibrant-gray font-medium text-ellipsis overflow-hidden line-clamp-1">
                                {Array.isArray(res.cuisine) ? res.cuisine.join(', ') : res.cuisine} • {res.location}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                                <div className={cn("px-1.5 py-0.5 rounded text-[10px] md:text-xs font-black flex items-center gap-1", getRatingColor(res.rating || 0))}>
                                   {res.rating} <Star size={10} className="fill-current" />
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <button 
                        onClick={() => setIsSearchOverlayOpen(false)}
                        className="w-full mt-6 py-4 bg-brand/5 text-brand font-black text-xs md:text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-brand/10 transition-colors"
                      >
                        SEE ALL RESULTS <ArrowRight size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="py-20 text-center">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Search size={32} className="md:w-10 md:h-10" />
                      </div>
                      <p className="text-vibrant-gray font-bold md:text-lg">No results found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 md:p-6">
                  {recentSearches.length > 0 && (
                    <div className="mb-10 md:mb-16">
                      <h4 className="text-xs md:text-sm font-black text-vibrant-gray uppercase tracking-widest mb-6">Recent Searches</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recentSearches.map(res => (
                          <div 
                            key={`rs-${res.id}`} 
                            onClick={() => {
                              setIsSearchOverlayOpen(false);
                              if (res.type === 'city') {
                                navigate(`/city/${res.name.toLowerCase()}`);
                              } else if (res.type === 'restaurant') {
                                navigate(`/restaurant/${res.restaurantId || res.id.replace('res-', '')}`);
                              }
                            }}
                            className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100 text-left cursor-pointer"
                          >
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-slate-100">
                              {res.image ? (
                                <img src={res.image} alt={res.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  {res.type === 'city' ? <MapPin size={24} /> : <Search size={24} />}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-vibrant-dark md:text-lg truncate">{res.name}</h4>
                              <p className="text-xs md:text-sm text-vibrant-gray font-medium text-ellipsis overflow-hidden line-clamp-1">{res.subtitle} {res.city ? `• ${res.city}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
