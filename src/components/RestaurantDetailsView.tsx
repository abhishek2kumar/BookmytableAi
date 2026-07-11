import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthProvider";
import { useRestaurants } from "../hooks/useFirebase";
import { useLocationContext } from "./LocationContext";
import { RestaurantCard } from "./RestaurantCard";
import { Restaurant, Booking, Review } from "../types";
import {
  Search,
  Star,
  MapPin,
  Clock,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  Utensils,
  Zap,
  Gift,
  Info,
  Check,
  Heart,
  Share2,
  X,
  Maximize2,
  Phone,
  Compass,
  Navigation,
  ChevronDown,
  TrendingUp,
  Wifi,
  Car,
  Wind,
  Music,
  Wine,
  Baby,
  UserCheck,
  Gamepad2,
  Tv,
  Settings2,
  Menu,
  Megaphone,
  Play,
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, startOfToday, parseISO } from "date-fns";
import {
  cn,
  handleImageError,
  RESTAURANT_IMAGE_FALLBACK,
  formatDate,
  calculateDistance,
  getRestaurantUrl,
  getRestaurantBookUrl,
  getRestaurantTakeawayUrl,
  getRestaurantStatus,
  getRestaurantTabUrl,
  getRatingColor,
  isTakeawayAvailable,
  formatAddress as formatAddressGlobal,
  slugify,
} from "../lib/utils";
import { summarizeGoogleReviews } from "../services/aiService";
import ReactMarkdown from "react-markdown";
import { Helmet } from "react-helmet-async";
import { useStories } from "../hooks/useStories";
import StoryViewer from "./StoryViewer";
import StoryAvatar from "./StoryAvatar";
import { ExpandableText } from "./ExpandableText";

export default function RestaurantDetailsView() {
  const { slug, tab, city } = useParams<{
    slug: string;
    tab?: string;
    city?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signInWithGoogle } = useAuth();
  const { coords: userCoords } = useLocationContext();
  const { restaurants: allRestaurants, loading: restaurantsLoading } =
    useRestaurants(true);

  const foundRestaurant = useMemo(() => {
    if (!slug) return null;
    let found = allRestaurants.find((r) => r.id === slug);
    if (!found) {
      found = allRestaurants.find((r) => {
        const rNameSlug = slugify(r.name || "restaurant");
        const rLocSlug = slugify(r.location || "");
        const combined = rLocSlug ? `${rNameSlug}-${rLocSlug}` : rNameSlug;
        return combined === slug;
      });
    }
    if (found) {
      return {
        ...found,
        signatureDishes: found.signatureDishes || (found as any).menu || [],
      } as Restaurant;
    }
    return null;
  }, [slug, allRestaurants]);

  const restaurant = foundRestaurant;
  const id = foundRestaurant?.id || null;
  const error =
    !restaurantsLoading && !foundRestaurant ? "Restaurant not found" : null;

  const { usersWithStories, loading: storiesLoading } = useStories(undefined, id || undefined);
  const hasStories = !storiesLoading && usersWithStories.length > 0;
  const allStoriesViewed = hasStories && usersWithStories[0].stories.every(s => s.views?.some(v => v.userId === user?.uid));
  const [showStoryViewer, setShowStoryViewer] = useState(false);

  // SEO Redirect
  useEffect(() => {
    if (foundRestaurant && !city) {
      const seoCity = slugify(foundRestaurant.city || "ind");
      const seoName = slugify(foundRestaurant.name || "restaurant");
      const seoLoc = slugify(foundRestaurant.location || "");
      const combined = seoLoc ? `${seoName}-${seoLoc}` : seoName;
      const targetUrl = `/${seoCity}/restaurant/${combined}${tab ? `/${tab}` : ""}${location.hash}`;

      if (
        location.pathname !== `/${seoCity}/restaurant/${combined}` &&
        location.pathname !== `/${seoCity}/restaurant/${combined}/${tab}`
      ) {
        navigate(targetUrl, { replace: true });
      }
    }
  }, [foundRestaurant, city, tab, location.hash, location.pathname, navigate]);

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState("");
  const [isPostingReview, setIsPostingReview] = useState(false);

  // Booking Form State
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [activeTimeCategory, setActiveTimeCategory] = useState<string | null>(
    null,
  );
  const [guests, setGuests] = useState(2);
  const [userPhone, setUserPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  // Search Overlay
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const findAndSetPortal = () => {
      const el = document.getElementById("navbar-search-portal");
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
      const stored = localStorage.getItem("bookmytable_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const saveRecentSearch = (item: any) => {
    try {
      const updated = [
        item,
        ...recentSearches.filter((s: any) => s.id !== item.id),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(
        "bookmytable_recent_searches",
        JSON.stringify(updated),
      );
    } catch (e) {}
  };

  const searchSuggestions = useMemo(() => {
    if (!searchQuery || !allRestaurants) return [];
    const q = searchQuery.toLowerCase();
    return allRestaurants
      .filter((res) => {
        return (
          res.name.toLowerCase().includes(q) ||
          (Array.isArray(res.cuisine)
            ? res.cuisine.join(" ")
            : res.cuisine || ""
          )
            .toLowerCase()
            .includes(q) ||
          res.location.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [searchQuery, allRestaurants]);

  // Load bookmark status
  useEffect(() => {
    if (user && profile && id) {
      setIsBookmarked((profile.favorites || []).includes(id));
    }
  }, [user, profile, id]);

  // Page view tracking
  const hasLoggedViewRef = useRef<string | null>(null);
  const viewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (restaurant?.id) {
      if (hasLoggedViewRef.current === restaurant.id) return;
      
      const logView = async () => {
        try {
          await addDoc(collection(db, "page_views"), {
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            timestamp: serverTimestamp(),
            userId: user?.uid || null,
            userName: user ? user.displayName || user.email : "Guest",
            userAgent: navigator.userAgent,
          });
        } catch (e) {
          console.error("Failed to log page view", e);
        }
      };

      if (!viewTimeoutRef.current) {
        viewTimeoutRef.current = setTimeout(() => {
          hasLoggedViewRef.current = restaurant.id;
          logView();
          viewTimeoutRef.current = null;
        }, 1000);
      }
      
      return () => {
        // We don't clear the timeout on unmount or re-render if it's the same restaurant to ensure we log the view
        // unless they bounce instantly (but we want to catch the view)
      };
    }
  }, [restaurant?.id, user]);

  // Scroll to tab section
  useEffect(() => {
    if (!restaurantsLoading && restaurant) {
      if (tab) {
        // give it a tiny bit of time to render everything
        setTimeout(() => {
          const el = document.getElementById(tab);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      } else if (location.hash) {
        setTimeout(() => {
          const el = document.getElementById(location.hash.replace("#", ""));
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      } else {
        window.scrollTo(0, 0);
      }
    }
  }, [restaurantsLoading, restaurant, tab, location.hash]);

  const toggleBookmark = async () => {
    if (!user || !profile || !id) {
      signInWithGoogle();
      return;
    }

    setIsBookmarking(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const currentFavorites = profile.favorites || [];
      let newFavorites;

      if (isBookmarked) {
        newFavorites = currentFavorites.filter((favId) => favId !== id);
      } else {
        newFavorites = [...currentFavorites, id];
      }

      await updateDoc(userRef, {
        favorites: newFavorites,
        updatedAt: serverTimestamp(),
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

  const scrollContainer = (
    ref: React.RefObject<HTMLDivElement>,
    direction: "left" | "right",
  ) => {
    if (ref.current) {
      const scrollAmount = window.innerWidth > 768 ? 600 : 300;
      ref.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      restaurant?.advertisements &&
      restaurant.advertisements.filter((ad) => ad.active).length > 1
    ) {
      interval = setInterval(() => {
        if (adsScrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = adsScrollRef.current;
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            adsScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
          } else {
            adsScrollRef.current.scrollBy({
              left: clientWidth + 32,
              behavior: "smooth",
            });
          }
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [restaurant?.advertisements]);

  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(
    null,
  );
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [enlargedAdImage, setEnlargedAdImage] = useState<string | null>(null);
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isTimingsOpen, setIsTimingsOpen] = useState(false);
  const [activePhotoTab, setActivePhotoTab] = useState<string>("food");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bookingMode, setBookingMode] = useState<"table" | "takeaway">("table");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isXXL = windowWidth >= 1536;
  const isDesktop = windowWidth >= 768;
  const photoLimit = isXXL ? 10 : isDesktop ? 5 : 4;

  // Memoize banner images to prevent unnecessary re-renders of the slider
  const bannerImages: string[] = useMemo(() => {
    if (!restaurant) return [];
    const images: string[] = [
      restaurant.image,
      ...(restaurant.secondaryImages?.map((img: any) => typeof img === 'string' ? img : img.url) || []),
    ].filter(Boolean);
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
      setBannerIndex((prev) => (prev + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerImages.length]);

  // Enhanced Photo Gallery & Viewer State
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [restaurantOwnerEmail, setRestaurantOwnerEmail] = useState<
    string | null
  >(null);
  const allPhotos: string[] = useMemo(() => {
    if (!restaurant) return [];
    const menuCatImages = (restaurant.menuCategories || []).flatMap(
      (c: any) => c.images || [],
    );
    const images: string[] = [
      restaurant.image,
      ...(restaurant.secondaryImages?.map((img: any) => typeof img === 'string' ? img : img.url) || []),
      ...(restaurant.foodImages || []),
      ...(restaurant.ambienceImages || []),
      ...(restaurant.menuImages || []),
      ...menuCatImages,
    ].filter(Boolean);
    return images;
  }, [restaurant]);

  const openPhotoViewer = (imageUrl: string) => {
    const idx = allPhotos.indexOf(imageUrl);
    setPhotoIndex(idx >= 0 ? idx : 0);
    setPhotoViewerOpen(true);
  };

  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
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
      return calculateDistance(
        userCoords.lat,
        userCoords.lng,
        restaurant.lat,
        restaurant.lng,
      );
    }
    return "0.8"; // Fallback to a small realistic number if no coords
  }, [userCoords, restaurant]);

  useEffect(() => {
    if (user && reviews.length > 0) {
      setHasReviewed(reviews.some((r) => r.userId === user.uid));
    } else {
      setHasReviewed(false);
    }
  }, [user, reviews]);

  const computedPhotoTabs = useMemo(() => {
    if (!restaurant) return [];
    
    const tabs: { id: string, label: string, images: string[] }[] = [];
    if (restaurant.foodImages && restaurant.foodImages.length > 0) {
      tabs.push({ id: "food", label: "Food", images: restaurant.foodImages });
    }
    if (restaurant.ambienceImages && restaurant.ambienceImages.length > 0) {
      tabs.push({ id: "ambience", label: "Ambience", images: restaurant.ambienceImages });
    }
    if (restaurant.secondaryImages && restaurant.secondaryImages.length > 0) {
      const cats: Record<string, string[]> = {};
      restaurant.secondaryImages.forEach((img: any) => {
         const url = typeof img === 'string' ? img : img.url;
         const cat = typeof img === 'string' ? 'All' : (img.category || 'All');
         if (!cats[cat]) cats[cat] = [];
         cats[cat].push(url);
      });
      
      Object.keys(cats).forEach(cat => {
        tabs.push({ id: `ext_${cat}`, label: cat, images: cats[cat] });
      });
    }
    return tabs;
  }, [restaurant]);

  useEffect(() => {
    if (computedPhotoTabs.length > 0) {
      // Keep the current tab if it still exists
      if (!computedPhotoTabs.find(t => t.id === activePhotoTab)) {
         setActivePhotoTab(computedPhotoTabs[0].id);
      }
    }
  }, [computedPhotoTabs]);

  // Review Auto-slide
  useEffect(() => {
    if (reviews.length <= 1) return;
    const interval = setInterval(() => {
      setReviewSlideIndex((prev) => {
        const itemsPerPage = window.innerWidth >= 768 ? 3 : 1;
        const maxIndex = Math.max(0, reviews.length - itemsPerPage);
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  const formatAddressLocal = (rest: Restaurant) => {
    const parts = [];
    if (rest.floor) parts.push(rest.floor);
    if (rest.shopNo) parts.push(rest.shopNo);
    if (rest.area) parts.push(rest.area);
    else if (rest.location) parts.push(rest.location);
    if (rest.landmark) parts.push(rest.landmark);
    if (rest.city) parts.push(rest.city);

    if (parts.length > 0) return formatAddressGlobal(parts.join(", "));
    return formatAddressGlobal(rest.address || rest.location || "");
  };

  const scroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "left" | "right",
  ) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Fetch Reviews
    if (id) {
      const q = query(
        collection(db, "reviews"),
        where("restaurantId", "==", id),
        orderBy("createdAt", "desc"),
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Review,
        );
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

      if (restaurant.aiSummary && now - lastUpdated < sixMonthsInMs) {
        setAiSummary(restaurant.aiSummary);
      }
    }
  }, [restaurant]);

  useEffect(() => {
    async function fetchOwnerEmail() {
      if (restaurant?.ownerId) {
        try {
          const ownerDoc = await getDoc(doc(db, "users", restaurant.ownerId));
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
      const summary = await summarizeGoogleReviews(
        restaurant.name,
        formatAddressLocal(restaurant),
      );
      setAiSummary(summary);

      // Save to Firestore for caching
      if (summary && !summary.includes("unavailable")) {
        await updateDoc(doc(db, "restaurants", id), {
          aiSummary: summary,
          aiSummaryUpdatedAt: serverTimestamp(),
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
      alert("You have already posted a review for this restaurant.");
      return;
    }

    setIsPostingReview(true);
    try {
      const reviewData: Omit<Review, "id"> = {
        restaurantId: restaurant.id,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || "Guest",
        userPhoto:
          profile?.photoURL ||
          user.photoURL ||
          `https://ui-avatars.com/api/?name=${user.displayName}&background=0D8ABC&color=fff`,
        rating: userRating,
        text: userComment,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "reviews"), reviewData);
      setUserComment("");
      setUserRating(5);
    } catch (err) {
      console.error(err);
      alert("Failed to post review.");
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
      const [hours, minutes] = selectedTime.split(":");
      bookingDateTime.setHours(parseInt(hours), parseInt(minutes));

      const dayStr = format(selectedDate, "EEEE");
      let catName = "Dinner";
      if (activeTimeCategory) {
        catName = activeTimeCategory.charAt(0).toUpperCase() + activeTimeCategory.slice(1);
      }

      let threshold = restaurant.instantBookingLimit || 10;
      if (restaurant?.autoApprovalThresholds) {
        const dayThresholds = restaurant.autoApprovalThresholds.find(t => t.day === dayStr);
        if (dayThresholds && dayThresholds.thresholds && dayThresholds.thresholds[catName] !== undefined) {
          threshold = dayThresholds.thresholds[catName];
        }
      }

      const finalStatus = guests <= threshold ? "confirmed" : "pending";
      const guestsLabel = guests > threshold ? `${threshold}+` : String(guests);

      const bookingData: Omit<Booking, "id"> = {
        userId: user.uid,
        userName: profile?.displayName || user.displayName || "Guest",
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantImage: restaurant.image,
        restaurantOwnerId: restaurant.ownerId,
        dateTime: bookingDateTime,
        guests,
        guestsLabel,
        userPhone,
        status: finalStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "bookings"), bookingData);

      // Send Email Confirmations via Backend API
      try {
        fetch("/api/confirm-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: user.email,
            userName: profile?.displayName || user.displayName || "Guest",
            restaurantName: restaurant.name,
            restaurantLocation: formatAddressLocal(restaurant),
            ownerEmail: restaurantOwnerEmail,
            dateTime: bookingDateTime.toISOString(),
            guests,
            guestsLabel,
            userPhone,
            status: finalStatus,
          }),
        }).catch((err) => console.error("Silent email fail:", err));
      } catch (err) {
        console.error("Failed to trigger email confirmation:", err);
      }

      setBookingSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to create booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = useMemo(() => getRestaurantStatus(restaurant), [restaurant]);
  const dates = useMemo(() => {
    const allDates = Array.from({ length: 7 }, (_, i) =>
      addDays(startOfToday(), i),
    );
    if (!restaurant?.blackoutDates || restaurant.blackoutDates.length === 0)
      return allDates;

    return allDates.filter((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return !restaurant.blackoutDates?.includes(dateStr);
    });
  }, [restaurant?.blackoutDates]);

  const slotData = useMemo(() => {
    const parseTimeForGrouping = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.trim().split(" ");
      const period =
        parts.length > 1
          ? parts[1].toUpperCase()
          : timeStr.toUpperCase().includes("PM")
            ? "PM"
            : "AM";
      const time = parts[0].replace(/AM|PM/i, "");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + (m || 0);
    };

    let rawSlots: string[] = [];

    // Always use outlet timings per the user instruction
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const selectedDayName = dayNames[selectedDate.getDay()];
    const daily = restaurant?.dailyTimings?.[selectedDayName];

    let rangesToProcess: any[] = [];
    if (daily?.closed) {
      rangesToProcess = [];
    } else if (daily?.ranges && daily.ranges.length > 0) {
      rangesToProcess = daily.ranges;
    } else {
      rangesToProcess = [
        {
          open: restaurant?.openingHours?.open || "11:00 AM",
          close: restaurant?.openingHours?.close || "11:00 PM",
        },
      ];
    }

    rangesToProcess.forEach((r) => {
      const openMin = parseTimeForGrouping(r.open);
      const closeMin = parseTimeForGrouping(r.close);

      let endMin = closeMin;
      if (closeMin <= openMin) endMin = closeMin + 24 * 60;

      for (let m = openMin; m < endMin; m += 30) {
        let hour24 = Math.floor((m % (24 * 60)) / 60);
        const min = m % 60;
        const period = hour24 >= 12 ? "PM" : "AM";
        let hour12 = hour24 % 12;
        if (hour12 === 0) hour12 = 12;
        rawSlots.push(
          `${hour12.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")} ${period}`,
        );
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

    let categories = [];
    if (breakfastSlots.length > 0)
      categories.push({
        id: "breakfast",
        name: "Breakfast",
        slots: breakfastSlots,
      });
    if (lunchSlots.length > 0)
      categories.push({ id: "lunch", name: "Lunch", slots: lunchSlots });
    if (dinnerSlots.length > 0)
      categories.push({ id: "dinner", name: "Dinner", slots: dinnerSlots });

    if (restaurant?.blackoutSlots) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const blackoutSlot = restaurant.blackoutSlots.find(b => b.date === dateStr);
      if (blackoutSlot && blackoutSlot.categories && blackoutSlot.categories.length > 0) {
        categories = categories.filter(cat => !blackoutSlot.categories.includes(cat.name));
      }
    }

    return { categorized: true, categories, slots: [] as string[] };
  }, [restaurant, selectedDate]);

  const times = useMemo(() => {
    if (slotData.categorized && slotData.categories) {
      return slotData.categories.flatMap((c) => c.slots);
    }
    return slotData.slots || [];
  }, [slotData]);

  const activeOffers = useMemo(() => {
    if (!restaurant?.offers) return [];

    // Use string comparison for YYYY-MM-DD dates to avoid timezone issues
    const todayStr = format(startOfToday(), "yyyy-MM-dd");

    return restaurant.offers.filter((offer) => {
      if (!offer.validFrom && !offer.validUntil) return true;

      try {
        const fromStr = offer.validFrom ? offer.validFrom.split("T")[0] : null;
        const untilStr = offer.validUntil
          ? offer.validUntil.split("T")[0]
          : null;

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
    if (
      slotData.categorized &&
      slotData.categories &&
      slotData.categories.length > 0
    ) {
      if (
        !activeTimeCategory ||
        !slotData.categories.find((c) => c.id === activeTimeCategory)
      ) {
        setActiveTimeCategory(slotData.categories[0].id);
      }
    } else {
      setActiveTimeCategory(null);
    }
  }, [slotData, activeTimeCategory]);

  useEffect(() => {
    if (restaurant?.id) {
      try {
        const stored = localStorage.getItem("recently_viewed_restaurants");
        let parsed: string[] = [];
        if (stored) parsed = JSON.parse(stored);

        const updated = [
          restaurant.id,
          ...parsed.filter((id) => id !== restaurant.id),
        ].slice(0, 10);
        localStorage.setItem(
          "recently_viewed_restaurants",
          JSON.stringify(updated),
        );
      } catch (e) {}
    }
  }, [restaurant?.id]);

  const recommendations = useMemo(() => {
    if (!restaurant || !allRestaurants.length)
      return { similar: [], nearby: [], youMayLike: [], recentlyViewed: [] };

    let recentIds: string[] = [];
    try {
      const stored = localStorage.getItem("recently_viewed_restaurants");
      if (stored) recentIds = JSON.parse(stored);
    } catch (e) {}

    const recentlyViewed = recentIds
      .filter((id) => id !== restaurant.id)
      .map((id) => allRestaurants.find((r) => r.id === id))
      .filter(Boolean) as Restaurant[];

    // STRICT city-based filtering for recommendations
    const cityNorm = (restaurant.city || "").toLowerCase();
    const filtered = allRestaurants.filter(
      (r) =>
        r.id !== restaurant.id && (r.city || "").toLowerCase() === cityNorm,
    );

    // Similar: Same cuisine
    const similar = filtered
      .filter((r) => r.cuisine === restaurant.cuisine)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    // Nearby
    const nearby = filtered
      .filter((r) => r.lat && r.lng && restaurant.lat && restaurant.lng)
      .map((r) => ({
        ...r,
        distance: Number(
          calculateDistance(restaurant.lat!, restaurant.lng!, r.lat!, r.lng!),
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);

    // You May Like: High rated other cuisines
    const youMayLike = filtered
      .filter((r) => r.cuisine !== restaurant.cuisine && r.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    return { similar, nearby, youMayLike, recentlyViewed };
  }, [restaurant, allRestaurants]);

  const isTimeInPast = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(hours, minutes, 0, 0);
    return selectedDateTime < new Date();
  };

  const canonicalUrl = useMemo(() => {
    if (!restaurant) return `https://www.bookmytable.co.in/restaurant/${slug}`;
    const seoCity = slugify(restaurant.city || "ind");
    const seoName = slugify(restaurant.name || "restaurant");
    const seoLoc = slugify(restaurant.location || "");
    const combined = seoLoc ? `${seoName}-${seoLoc}` : seoName;
    return `https://www.bookmytable.co.in/${seoCity}/restaurant/${combined}`;
  }, [restaurant, slug]);

  if (restaurantsLoading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    );

  if (error || !restaurant)
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <h2 className="text-2xl mb-2 text-[#363636] font-normal leading-[1.2]">
          {error || "Something went wrong"}
        </h2>
        <button
          onClick={() => navigate("/")}
          className="text-brand font-bold hover:underline"
        >
          Back to Explore
        </button>
      </div>
    );

  const getSeoData = () => {
    const cuisineStr = Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine;
    const locationStr = restaurant.location || city || restaurant.city || 'your city';
    const cityStr = city || restaurant.city || 'your city';
    const addressStr = restaurant.address || locationStr;
    const baseDesc = `Book a table for free at ${restaurant.name}, ${locationStr}, ${cityStr}. Check out the menu, reviews, photos, location, and get instant reservation deals on Bookmytable.`;
    const keywords = `book table online, restaurants in ${addressStr}, restaurants in ${cityStr}, online restaurant booking, bookmytable, booking, hotel, restaurant, dineout, table booking`;
    const defaultTitle = `${restaurant.name}, ${locationStr}, ${cityStr} | Book a Table Online - Bookmytable`;
    const ogTitle = `Book table for free at ${restaurant.name}, ${addressStr} with discounts`;
    const ogDesc = `Instant table booking with discounts at ${restaurant.name}, ${addressStr}`;

    let title = defaultTitle;
    let description = baseDesc;

    switch (tab) {
      case 'book':
        title = `Table Booking at ${restaurant.name} | Bookmytable`;
        break;
      case 'menu':
        title = `${restaurant.name} ${locationStr} Menu & Prices`;
        break;
      case 'photos':
        title = `Photos, Images & Ambiance of ${restaurant.name} | Bookmytable`;
        break;
      case 'reviews':
        title = `Customer Reviews for ${restaurant.name}, ${cityStr}`;
        break;
      case 'takeaway':
        title = `Order Takeaway from ${restaurant.name} | Bookmytable`;
        break;
      case 'offers':
        title = `Offers & Discounts at ${restaurant.name} | Bookmytable`;
        break;
    }

    const jsonLd: any = {
      "@context": "https://schema.org",
      "@type": "FoodEstablishment",
      "@id": canonicalUrl,
      "name": restaurant.name,
      "url": canonicalUrl,
      "description": restaurant.description || baseDesc,
      "hasMenu": canonicalUrl,
      "image": bannerImages[0] || RESTAURANT_IMAGE_FALLBACK,
      "servesCuisine": cuisineStr,
      "priceRange": `₹ ${restaurant.avgPrice || 500} (approx)`,
      "telephone": "+91 9989764575",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": addressStr,
        "addressLocality": locationStr,
        "addressRegion": cityStr,
        "postalCode": restaurant.pincode || "411001",
        "addressCountry": "IN"
      },
      "review": {
          "@type": "Review",
          "url": canonicalUrl,
          "author": { "@type": "Person", "name": "Google user" },
          "publisher": {
              "@type": "Organization",
              "name": "Bookmytable",
              "sameAs": "https://www.bookmytable.co.in"
          },
          "reviewRating": {
              "@type": "Rating", "worstRating": 1, "bestRating": 5, "ratingValue": restaurant.rating || 5
          }
      },
      "currenciesAccepted": "INR",
      "paymentAccepted": ["Cash", "Credit Cards", "Wallet"],
      "makesoffer": "Upto 50% off on final bill",
      "isAccessibleForFree": true,
      "publicAccess": true
    };

    if (restaurant.lat && restaurant.lng) {
        jsonLd.geo = {
            "@type": "GeoCoordinates",
            "latitude": restaurant.lat,
            "longitude": restaurant.lng
        };
    }

    return {
      title,
      description,
      keywords,
      ogTitle,
      ogDesc,
      jsonLd
    };
  };

  const seoData = getSeoData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white min-h-screen pb-20 overflow-x-hidden relative"
    >
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <link rel="alternate" hrefLang="en" href={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
        <meta name="url" content={canonicalUrl} />
        <meta name="twitter:app:name:iphone" content="Bookmytable" />
        <meta name="twitter:app:name:ipad" content="Bookmytable" />
        <meta name="twitter:app:country" content="in" />
        <meta property="og:title" content={seoData.ogTitle} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Bookmytable" />
        <meta property="og:description" content={seoData.ogDesc} />
        <meta property="og:image" content={bannerImages[0] || RESTAURANT_IMAGE_FALLBACK} />
        <meta property="product:brand" content="Bookmytable" />
        <meta property="product:price:amount" content={restaurant.avgPrice?.toString() || "500"} />
        <meta property="product:price:currency" content="INR" />
        <script type="application/ld+json">
          {JSON.stringify(seoData.jsonLd)}
        </script>
      </Helmet>

      {showStoryViewer && usersWithStories && (
         <StoryViewer 
           users={usersWithStories}
           initialUserIndex={0}
           onClose={() => setShowStoryViewer(false)}
         />
      )}

      {portalTarget &&
        createPortal(
          <div className="w-full flex justify-end md:block">
            <div className="hidden md:block relative w-full group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-vibrant-gray group-hover:text-brand transition-colors"
                size={18}
              />
              <input
                type="text"
                readOnly
                onClick={() => setIsSearchOverlayOpen(true)}
                placeholder="Search for restaurant"
                className="w-full pl-12 pr-6 py-2.5 bg-slate-50 border border-slate-300 hover:bg-white hover:border-brand/20 cursor-pointer rounded-xl font-medium shadow-sm transition-all text-sm outline-none text-[#363636]"
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
          portalTarget,
        )}

      {/* Mobile Blur Extension - Only visible behind the cards! */}
      <div
        className="md:hidden fixed inset-0 bg-cover bg-center z-[-1] pointer-events-none"
        style={{
          backgroundImage: `url(${bannerImages[bannerIndex % bannerImages.length] || RESTAURANT_IMAGE_FALLBACK})`,
        }}
      >
        <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[30px]" />
        <div className="absolute inset-x-0 bottom-0 h-[60vh] bg-gradient-to-t from-slate-100 to-transparent" />
      </div>

      {/* Mobile Special Header */}
      <div
        className={cn(
          "md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 transition-all duration-300",
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-300"
            : "bg-transparent",
        )}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              navigate(`/${(restaurant.city || "").toLowerCase()}`)
            }
            className="p-2 transition-all drop-shadow-sm text-slate-600 hover:text-black hover:scale-110 active:scale-95"
          >
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>

          <AnimatePresence>
            {scrolled && (
              <motion.h2
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-lg font-normal leading-[1.2] text-[#363636] line-clamp-1"
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
              "p-2 transition-all drop-shadow-sm",
              isBookmarked ? "text-red-500 scale-110" : "text-slate-600 hover:text-red-500 hover:scale-110",
              isBookmarking && "opacity-50",
            )}
          >
            <Heart
              size={24}
              strokeWidth={2.5}
              className={cn(
                isBookmarked ? "fill-current" : "",
                isBookmarking && "animate-pulse",
              )}
            />
          </button>
          <button
            className="p-2 transition-all drop-shadow-sm text-slate-600 hover:text-brand hover:scale-110"
            onClick={() => {
              if (navigator.share) {
                navigator
                  .share({
                    title: restaurant.name,
                    text: restaurant.description,
                    url: window.location.href,
                  })
                  .catch(() => {});
              }
            }}
          >
            <Share2 size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Restaurant Header */}
      <div className="relative bg-transparent md:bg-white md:border-b md:border-gray-200 md:shadow-sm md:pt-0 pt-0">
        <div className="relative z-10 max-w-6xl mx-auto px-0 sm:px-4 md:px-12 lg:px-16 md:py-8 py-0">
          <button
            onClick={() =>
              navigate(`/${(restaurant.city || "").toLowerCase()}`)
            }
            className="hidden md:flex items-center gap-2 text-vibrant-gray hover:text-brand mb-6 transition-colors font-semibold"
          >
            <ChevronLeft size={20} />
            Back
          </button>

          <div className="flex flex-col md:flex-row gap-0 pt-0 md:border md:border-slate-300 md:rounded-[32px] md:items-center relative md:bg-white overflow-hidden">
            {/* Banner Slider Section */}
            <div
              className="w-full aspect-[4/3] md:h-[360px] lg:h-[420px] md:aspect-auto md:rounded-[32px] rounded-none overflow-hidden relative group cursor-zoom-in shrink-0 z-10 shadow-sm"
              onClick={() =>
                openPhotoViewer(
                  bannerImages[bannerIndex % bannerImages.length] ||
                    RESTAURANT_IMAGE_FALLBACK,
                )
              }
            >
              <div className="relative w-full h-full bg-slate-100">
                <AnimatePresence mode="popLayout">
                  <motion.img
                    key={bannerIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                    src={
                      bannerImages[bannerIndex % bannerImages.length] ||
                      RESTAURANT_IMAGE_FALLBACK
                    }
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={handleImageError}
                  />
                </AnimatePresence>

                {bannerImages.length > 1 && (
                  <div className="absolute top-4 right-4 md:top-4 md:right-4 top-20 right-4 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-[10px] font-black z-10 border border-white/10">
                    {(bannerIndex % bannerImages.length) + 1}/
                    {bannerImages.length}
                  </div>
                )}
              </div>
            </div>

            {/* Redesigned Details Section (Desktop & Tablet) */}
            <div className="hidden md:flex flex-col md:absolute md:right-10 lg:right-16 top-1/2 -translate-y-1/2 md:w-[360px] lg:w-[420px] z-20 bg-white/95 backdrop-blur-xl rounded-[24px] shadow-[0_20px_40px_rgb(0,0,0,0.12)] border border-white/50 p-4 pb-2 lg:p-5 lg:pb-3 shrink-0 transition-all">
              <div className="space-y-3 relative">
                {/* Favourite Icon at Top Right */}
                <div className="absolute top-0 right-0 flex items-center gap-2 z-10">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: restaurant.name,
                            text: restaurant.description,
                            url: window.location.href,
                          })
                          .catch(() => {});
                      }
                    }}
                    className="p-1.5 transition-all text-slate-400 hover:text-brand hover:scale-110"
                    aria-label="Share"
                  >
                    <Share2 size={20} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={toggleBookmark}
                    disabled={isBookmarking}
                    className={cn(
                      "p-1.5 transition-all",
                      isBookmarked
                        ? "text-red-500 scale-110"
                        : "text-slate-400 hover:text-red-500 hover:scale-110",
                      isBookmarking && "opacity-50 animate-pulse",
                    )}
                    aria-label={isBookmarked ? "Saved" : "Save"}
                  >
                    <Heart
                      size={20}
                      strokeWidth={2.5}
                      className={cn(isBookmarked ? "fill-current" : "")}
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-2 pr-24">
                  <div className="flex items-center gap-2 text-[#363636] flex-wrap">
                    <div
                      className={cn(
                        "p-1 rounded-full shrink-0",
                        getRatingColor(restaurant.rating || 0),
                      )}
                    >
                      <Star size={12} className="fill-current" />
                    </div>
                    <span className="text-sm font-bold shrink-0">
                      {restaurant.rating} • {reviews.length} reviews
                    </span>
                    <span className="text-slate-400 mx-1 shrink-0">|</span>
                    <span className="text-sm font-bold shrink-0">
                      ₹{restaurant.avgPrice} for two
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl lg:text-3xl text-[#363636] font-normal leading-[1.2]">
                      {restaurant.name}
                    </h1>
                    {hasStories && (
                      <button 
                        onClick={() => setShowStoryViewer(true)}
                        className="flex flex-col items-center justify-center shrink-0 cursor-pointer group"
                      >
                         <StoryAvatar 
                             stories={usersWithStories[0].stories}
                             userPhoto={restaurant.image || RESTAURANT_IMAGE_FALLBACK}
                             currentUserId={user?.uid}
                             className="w-10 h-10 group-hover:scale-105 transition-transform"
                         />
                      </button>
                    )}
                  </div>

                  <div className="text-sm font-normal text-[#363636] leading-[1.2] hidden md:block">
                    {Array.isArray(restaurant.cuisine)
                      ? restaurant.cuisine.join(", ")
                      : restaurant.cuisine}
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-2 text-sm items-baseline">
                    <span className="text-[#363636] font-medium line-clamp-2 leading-snug">
                      {formatAddressLocal(restaurant)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => setIsTimingsOpen(true)}
                      className={cn(
                        "flex items-center gap-1 font-bold tracking-tighter hover:text-brand transition-colors",
                        status.color,
                      )}
                    >
                      {status.displayText}
                      <ChevronDown size={18} className="text-brand shrink-0" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Action Bar: 4 Icons in a single row */}
                <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-300 w-full mt-auto">
                  <a
                    href="tel:+919876543210"
                    className="flex flex-col items-center justify-center gap-1 p-1 rounded-xl hover:bg-slate-50 transition-colors text-slate-700"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                      <Phone size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-center">Call</span>
                  </a>

                  <button
                    onClick={async () => {
                      if (restaurant.isBookingEnabled !== false) {
                        if (!user) {
                          try {
                            await signInWithGoogle();
                            navigate(getRestaurantBookUrl(restaurant));
                          } catch (e) {
                            console.error("Failed to sign in:", e);
                          }
                        } else {
                          navigate(getRestaurantBookUrl(restaurant));
                        }
                      }
                    }}
                    disabled={restaurant.isBookingEnabled === false}
                    className="flex flex-col items-center justify-center gap-1 p-1 rounded-xl group hover:bg-slate-50 transition-colors text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                      <CalendarIcon size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-center leading-tight">Book<br/>Table</span>
                  </button>

                  <button
                    onClick={() => navigate(getRestaurantTakeawayUrl(restaurant))}
                    disabled={
                      !restaurant.liveMenu ||
                      restaurant.liveMenu.length === 0 ||
                      !isTakeawayAvailable(restaurant)
                    }
                    className="flex flex-col items-center justify-center gap-1 p-1 rounded-xl group hover:bg-slate-50 transition-colors text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                      <ShoppingBag size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-center leading-tight">Takeaway</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${formatAddressLocal(restaurant)}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1 p-1 rounded-xl group hover:bg-slate-50 transition-colors text-slate-700"
                    aria-label="Get Directions"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                      <Navigation size={18} className="fill-current -ml-0.5 mt-0.5" />
                    </div>
                    <span className="text-[11px] font-bold text-center leading-tight">Direction</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Mobile "Dineout" Style Interface */}
            <div className="md:hidden w-full relative -mt-[80px] pb-2 z-20">
              {/* Background extension - Stretch bottom pixels precisely */}
              <div
                className="absolute inset-x-0 bottom-0 rounded-b-[32px] overflow-hidden z-0"
                style={{ top: "79px" }}
              >
                <div
                  className="absolute top-0 left-0 w-full origin-top overflow-hidden"
                  style={{ height: "1px", transform: "scaleY(400)" }}
                >
                  <img
                    src={
                      bannerImages[bannerIndex % bannerImages.length] ||
                      RESTAURANT_IMAGE_FALLBACK
                    }
                    alt=""
                    className="absolute left-0 w-full object-cover"
                    style={{
                      height: "75vw",
                      top: "calc(1px - 75vw)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-100/80 to-slate-100/95" />
              </div>

              <div className="bg-white rounded-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border border-slate-300 overflow-hidden mx-4 pb-1 relative z-10 transition-all">
                <div className="p-5 space-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <h1 className="text-[26px] text-[#363636] font-normal leading-[1.2]">
                          {restaurant.name}
                        </h1>
                        {hasStories && (
                          <button 
                            onClick={() => setShowStoryViewer(true)}
                            className="flex flex-col items-center justify-center shrink-0 cursor-pointer group"
                          >
                             <StoryAvatar 
                                 stories={usersWithStories[0].stories}
                                 userPhoto={restaurant.image || RESTAURANT_IMAGE_FALLBACK}
                                 currentUserId={user?.uid}
                                 className="w-8 h-8 group-hover:scale-105 transition-transform"
                             />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-1 text-[13px] text-[#363636]">
                        <span>{distance} km</span>
                        <span className="text-slate-300">•</span>
                        <span className="line-clamp-1">
                          {restaurant.location}
                        </span>
                        <ChevronDown
                          size={14}
                          className="text-brand shrink-0"
                        />
                      </div>
                      <p className="text-[13px] text-slate-600">
                        {Array.isArray(restaurant.cuisine)
                          ? restaurant.cuisine.join(", ")
                          : restaurant.cuisine}{" "}
                        | ₹{restaurant.avgPrice} for two
                      </p>
                    </div>

                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={cn(
                          "px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm",
                          getRatingColor(restaurant.rating || 0),
                        )}
                      >
                        <span className="font-bold text-[15px]">
                          {restaurant.rating}
                        </span>
                        <Star size={12} className="fill-current" />
                      </div>
                      <div className="mt-1 pb-0.5 border-b border-dashed border-slate-300">
                        <div className="text-[10px] font-bold text-slate-500">
                          {reviews.length} ratings
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-50 mt-1">
                    <button
                      onClick={() => setIsTimingsOpen(true)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors border",
                        status.isClosed
                          ? "bg-red-50 text-red-600 border-red-50"
                          : "bg-emerald-50 text-emerald-700 border-emerald-50",
                      )}
                    >
                      {status.isClosed ? (
                        <span className="font-bold text-red-500">Closed,</span>
                      ) : (
                        <span className="font-bold text-emerald-600">
                          Open,
                        </span>
                      )}
                      <span>
                        {status.isClosed
                          ? `Opens at ${status.displayText.split("at ")[1] || "Tomorrow"}`
                          : `Closes at ${status.displayText.split("at ")[1] || "11:00 PM"}`}
                      </span>
                      <ChevronDown size={14} />
                    </button>

                    <div className="flex gap-2 ml-auto">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name} ${formatAddressLocal(restaurant)}`)}`}
                        className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform border border-slate-300"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Navigation
                          size={18}
                          className="fill-current -ml-0.5 mt-0.5"
                        />
                      </a>
                      <a
                        href="tel:+919876543210"
                        className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-transform border border-slate-300"
                      >
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
            { id: "offers", label: "Offers", show: activeOffers.length > 0 },
            { id: "menu", label: "Menu", show: true },
            {
              id: "photos",
              label: "Photos",
              show: !!(
                (restaurant.secondaryImages?.length || 0) > 0 ||
                (restaurant.foodImages?.length || 0) > 0 ||
                (restaurant.ambienceImages?.length || 0) > 0
              ),
            },
            { id: "overview", label: "About", show: true },
            { id: "reviews", label: "Reviews", show: true },
            {
              id: "book",
              label: "Table Booking",
              show: restaurant.isBookingEnabled !== false,
            },
            { id: "takeaway", label: "Take Away", show: (restaurant.liveMenu && restaurant.liveMenu.length > 0), disabled: !isTakeawayAvailable(restaurant) },
          ]
            .filter((tab) => tab.show)
            .map((t: any) => {
              const isActive =
                tab === t.id ||
                (!tab &&
                  !location.hash &&
                  t.id === (activeOffers.length ? "offers" : "menu"));
              return (
                <Link
                  key={t.id}
                  to={
                    t.disabled ? "#" :
                    t.id === "book"
                      ? getRestaurantBookUrl(restaurant)
                      : t.id === "takeaway"
                        ? getRestaurantTakeawayUrl(restaurant)
                        : getRestaurantTabUrl(restaurant, t.id)
                  }
                  className={cn(
                    "relative py-4 text-sm md:text-base font-bold transition-colors whitespace-nowrap",
                    t.disabled && "opacity-50 pointer-events-none",
                    isActive
                      ? "text-brand"
                      : "text-slate-500 hover:text-[#363636]",
                  )}
                >
                  {t.label}
                  {t.id === 'takeaway' && t.disabled && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">Closed</span>}
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
                <h2 className="text-2xl text-[#363636] font-normal leading-[1.2]">Offers</h2>
                {activeOffers.length > 1 && (
                  <div className="hidden md:flex gap-3">
                    <div
                      onClick={() => scrollContainer(offersScrollRef, "left")}
                      className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={20} strokeWidth={2} />
                    </div>
                    <div
                      onClick={() => scrollContainer(offersScrollRef, "right")}
                      className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                    >
                      <ArrowRight size={20} strokeWidth={2} />
                    </div>
                  </div>
                )}
              </div>

              <div
                ref={offersScrollRef}
                className="flex gap-4 md:gap-5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 scroll-px-4 md:scroll-px-0 md:mx-0 md:px-0 snap-x scroll-smooth"
                onScroll={() => {
                  if (offersScrollRef.current) {
                    const { scrollLeft, clientWidth } = offersScrollRef.current;
                    setActiveOfferIndex(Math.round(scrollLeft / clientWidth));
                  }
                }}
              >
                {activeOffers.map((offer, i) => (
                  <div
                    key={i}
                    className="snap-start shrink-0 w-full md:w-[280px] bg-white border border-slate-300 rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col"
                  >
                    <div className="p-5 bg-white pb-6">
                      <h4 className="text-[20px] md:text-[22px] mb-1 text-[#363636] font-normal leading-[1.2]">
                        {offer.title}
                      </h4>
                      <div className="text-[13px] text-slate-400 font-medium tracking-tight">
                        {offer.description || "on total bill"}
                      </div>
                    </div>

                    <div className="relative border-t border-dashed border-slate-300 bg-red-50/40 p-5 flex-grow overflow-hidden">
                      <div className="absolute right-0 bottom-0 opacity-[0.03] translate-x-1/4 translate-y-1/4 pointer-events-none">
                        <svg
                          width="100"
                          height="100"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-red-900"
                        >
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
                          {offer.terms ||
                            (offer.promoCode
                              ? "Limited slots, buy offer and book your table"
                              : "Pay restaurant bill to avail the offer")}
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
                          offersScrollRef.current.scrollTo({
                            left: i * offersScrollRef.current.clientWidth,
                            behavior: "smooth",
                          });
                          setActiveOfferIndex(i);
                        }
                      }}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        i === activeOfferIndex
                          ? "bg-brand w-6"
                          : "bg-slate-200 hover:bg-slate-300 w-2",
                      )}
                      aria-label={`Go to offer slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}


          {/* Advertisements / Featured Promos */}
          {restaurant.advertisements &&
            restaurant.advertisements.filter((ad) => ad.active).length > 0 && (
              <div className="scroll-mt-24 pt-8 border-t border-slate-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Megaphone size={20} className="text-brand" />
                    <h2 className="text-[20px] md:text-2xl font-display font-black text-slate-900 tracking-tight">
                      Featured Spotlights
                    </h2>
                  </div>
                  {restaurant.advertisements.filter((ad) => ad.active).length >
                    1 && (
                    <div className="hidden md:flex gap-3">
                      <div
                        onClick={() => {
                          if (adsScrollRef.current) {
                            adsScrollRef.current.scrollBy({ left: -(adsScrollRef.current.clientWidth + 32), behavior: "smooth" })
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={20} strokeWidth={2} />
                      </div>
                      <div
                        onClick={() => {
                          if (adsScrollRef.current) {
                            adsScrollRef.current.scrollBy({ left: (adsScrollRef.current.clientWidth + 32), behavior: "smooth" })
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-slate-200/70 hover:bg-slate-300 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                      >
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
                      setActiveAdIndex(Math.round(scrollLeft / (clientWidth + 32)));
                    }
                  }}
                >
                  {restaurant.advertisements
                    .filter((ad) => ad.active)
                    .map((ad) => (
                      <div
                        key={ad.id}
                        className="snap-start shrink-0 w-full bg-white rounded-[24px] border border-slate-300 shadow-sm hover:shadow-xl hover:border-brand/50 transition-all overflow-hidden flex flex-col md:flex-row group"
                      >
                        <div
                          className="relative shrink-0 w-full md:w-5/12 lg:w-2/5 overflow-hidden border-b md:border-b-0 md:border-r border-slate-300 flex bg-slate-50 cursor-pointer"
                          onClick={() => {
                            setEnlargedAdImage(
                              ad.image || RESTAURANT_IMAGE_FALLBACK,
                            );
                          }}
                        >
                          <img
                            src={ad.image || RESTAURANT_IMAGE_FALLBACK}
                            alt={ad.title}
                            className="block w-full h-48 md:h-full md:absolute md:inset-0 object-cover object-top group-hover:scale-105 transition-transform duration-700"
                          />
                        </div>
                        <div className="p-6 md:p-8 flex flex-col flex-grow bg-white justify-center">
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand transition-colors mb-3">
                            {ad.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 mb-8 flex-grow whitespace-pre-wrap">
                            {ad.description}
                          </p>
                          {ad.videoUrl && (
                            <div className="mt-auto md:mt-0">
                              <a
                                href={ad.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 w-full md:w-auto md:px-8 py-3.5 bg-brand text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-brand-dark transition-all active:scale-[0.98] shadow-md shadow-brand/20"
                              >
                                <Play size={14} fill="currentColor" /> Watch
                                Video
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

          {/* Menu Section */}
          <div
            id="menu"
            className={cn(
              "scroll-mt-24",
              activeOffers.length || restaurant.advertisements?.length
                ? "pt-8 border-t border-slate-300"
                : "",
            )}
          >
            {((restaurant.popularDishes &&
              restaurant.popularDishes.length > 0) ||
              (restaurant.signatureDishes &&
                restaurant.signatureDishes.length > 0)) && (
              <div className="mb-8">
                <h3 className="text-[20px] md:text-2xl mb-4 text-[#363636] font-normal leading-[1.2]">
                  Signature Dishes & Bestsellers
                </h3>

                {/* Real Popular Dishes from field */}
                {restaurant.popularDishes &&
                  restaurant.popularDishes.length > 0 && (
                    <div className="flex flex-wrap mb-8">
                      {restaurant.popularDishes.map((dish, i) => (
                        <span
                          key={i}
                          className="text-sm font-medium text-slate-700 mr-1"
                        >
                          {dish}
                          {i < restaurant.popularDishes!.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {restaurant.signatureDishes?.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-start group"
                    >
                      <div className="pr-4">
                        <h4 className="text-sm group-hover:text-brand transition-colors text-[#363636] font-normal leading-[1.2]">
                          {item.name}
                        </h4>
                        <ExpandableText text={item.description || ''} className="text-xs mt-1" />
                      </div>
                      {item.price > 0 && (
                        <span className="font-normal text-[#363636] leading-[1.2] shrink-0">
                          ₹{item.price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Menu Categories */}
            {(() => {
              const validMenuCategories = (restaurant.menuCategories || []).filter((c: any) => c.images && c.images.length > 0);
              const hasLegacyMenuImages = restaurant.menuImages && restaurant.menuImages.length > 0;
              
              if (validMenuCategories.length === 0 && !hasLegacyMenuImages) return null;

              return (
              <div className="mt-8">
                <h3 className="text-[20px] md:text-2xl mb-4 text-[#363636] font-normal leading-[1.2]">
                  {restaurant.name} {restaurant.location || restaurant.city || city} Menu & Prices
                </h3>
                {(validMenuCategories.length > 0 || hasLegacyMenuImages) && (
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl overflow-x-auto scrollbar-hide mb-6 max-w-max">
                      {validMenuCategories.map((cat: any, idx: number) => (
                        <button
                          key={cat.id || `menu-cat-${idx}`}
                          onClick={() => {
                            setActiveMenuCategory(cat.id);
                            setMenuSlideIndex(0);
                            requestAnimationFrame(() => {
                              if (menuScrollRef.current)
                                menuScrollRef.current.scrollTo({ left: 0 });
                            });
                          }}
                          className={cn(
                            "px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest",
                            activeMenuCategory === cat.id ||
                              (!activeMenuCategory &&
                                validMenuCategories[0]?.id === cat.id)
                              ? "bg-white text-brand shadow-sm"
                              : "text-slate-400 hover:text-slate-600",
                          )}
                        >
                          {cat.name}
                        </button>
                      ))}
                      {hasLegacyMenuImages && (
                          <button
                            onClick={() => {
                              setActiveMenuCategory("legacy");
                              setMenuSlideIndex(0);
                            }}
                            className={cn(
                              "px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap uppercase tracking-widest",
                              activeMenuCategory === "legacy" ||
                              (!activeMenuCategory && validMenuCategories.length === 0)
                                ? "bg-white text-brand shadow-sm"
                                : "text-slate-400 hover:text-slate-600",
                            )}
                          >
                            Menu
                          </button>
                        )}
                    </div>
                  )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={
                      activeMenuCategory ||
                      validMenuCategories[0]?.id ||
                      "legacy"
                    }
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {(() => {
                      const currentCat =
                        activeMenuCategory === "legacy" || (!activeMenuCategory && validMenuCategories.length === 0)
                          ? { images: restaurant.menuImages }
                          : validMenuCategories.find(
                              (c: any) => c.id === activeMenuCategory,
                            ) ||
                            validMenuCategories[0] || {
                              images: restaurant.menuImages,
                            };
                      const images = currentCat?.images || [];
                      if (images.length === 0) return null;

                      return (
                        <div className="relative group/slides">
                          <div
                            ref={menuScrollRef}
                            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-6 scroll-px-6 md:scroll-px-0 md:mx-0 md:px-0"
                            style={{ scrollBehavior: "smooth" }}
                          >
                            {images.map((img: string, i: number) => (
                              <div
                                key={i}
                                className="shrink-0 w-[45vw] md:w-[220px] aspect-[3/4.2] rounded-2xl overflow-hidden border border-slate-300 cursor-zoom-in relative bg-slate-100 snap-center"
                                onClick={() => openPhotoViewer(img)}
                              >
                                <img
                                  src={img}
                                  alt={`Menu page ${i + 1}`}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={handleImageError}
                                />
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-white text-[9px] font-black tracking-widest shadow-sm">
                                  {i + 1} / {images.length}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Navigation Arrows for Web/Tab */}
                          <div className="hidden md:block">
                            <button
                              onClick={() => scroll(menuScrollRef, "left")}
                              className="absolute left-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl border border-slate-300 flex items-center justify-center text-[#363636] hover:text-brand transition-colors z-10"
                            >
                              <ChevronLeft size={20} />
                            </button>
                            <button
                              onClick={() => scroll(menuScrollRef, "right")}
                              className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-xl border border-slate-300 flex items-center justify-center text-[#363636] hover:text-brand transition-colors z-10"
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
              );
            })()}
          </div>

          {/* Photos Section */}
          {(restaurant.secondaryImages?.length ||
            restaurant.foodImages?.length ||
            restaurant.ambienceImages?.length) && (
            <div
              id="photos"
              className="scroll-mt-24 pt-8 border-t border-slate-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-[20px] md:text-2xl text-[#363636] font-normal leading-[1.2]">
                  Photo Gallery
                </h2>

                <div className="flex bg-slate-50 p-1 rounded-2xl overflow-x-auto scrollbar-hide shrink-0">
                  {computedPhotoTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePhotoTab(tab.id)}
                      className={cn(
                        "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        activePhotoTab === tab.id
                          ? "bg-white text-brand shadow-sm"
                          : "text-slate-400 hover:text-slate-600",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
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
                    {(() => {
                      const activeTab = computedPhotoTabs.find(t => t.id === activePhotoTab);
                      if (!activeTab || !activeTab.images || activeTab.images.length === 0) return null;
                      const { images } = activeTab;

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-5 2xl:grid-cols-10 gap-2 md:gap-3">
                          {images.map((img, i, arr) => {
                            const showMore =
                              i === photoLimit - 1 && arr.length > photoLimit;
                            if (i >= photoLimit) return null;

                            return (
                              <div
                                key={i}
                                className="aspect-square rounded-xl md:rounded-2xl overflow-hidden cursor-zoom-in group relative bg-slate-50 border border-slate-300 shadow-sm md:shadow-none"
                                onClick={() => openPhotoViewer(img)}
                              >
                                <img
                                  src={img}
                                  alt={`${activeTab.label} ${i}`}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                  referrerPolicy="no-referrer"
                                  onError={handleImageError}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                {showMore && (
                                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                    <span className="text-xl md:text-2xl font-black">
                                      +{arr.length - (photoLimit - 1)}
                                    </span>
                                    <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest">
                                      More
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          )}

          <div
            id="overview"
            className="scroll-mt-24 pt-8 border-t border-slate-300"
          >
            <h2 className="text-[20px] md:text-2xl mb-6 text-[#363636] font-normal leading-[1.2]">
              About {restaurant.name}
            </h2>
            {restaurant.description && (
              <p className="text-[#363636] text-sm font-normal leading-[1.2] mb-8 text-justify">
                {restaurant.description}
              </p>
            )}

            {/* Amenities Grid */}
            <div className="mb-8">
              <h3 className="text-[20px] md:text-2xl mb-4 text-[#363636] font-normal leading-[1.2]">
                Facilities
              </h3>
              {restaurant.facilities && restaurant.facilities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {restaurant.facilities.map((fac, i) => (
                    <div
                      key={i}
                      className="flex items-center group transition-all"
                    >
                      <div className="w-[22px] h-[22px] rounded-full border border-slate-200 flex items-center justify-center mr-2 shrink-0">
                        <Star size={10} className="text-[#363636] fill-[#363636]/20" />
                      </div>
                      <span className="text-sm font-normal leading-[1.2] text-[#363636]">
                        {fac}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm font-medium italic">
                  Standard amenities provided.
                </p>
              )}
            </div>
          </div>


          {/* Reviews Section */}
          <div
            id="reviews"
            className="scroll-mt-24 pt-8 border-t border-slate-300"
          >
            <h2 className="text-[20px] md:text-2xl mb-6 text-[#363636] font-normal leading-[1.2]">Customer Reviews for {restaurant.name}, {restaurant.city || city}</h2>

            <div className="bg-slate-50/50 rounded-3xl p-6 md:p-8 space-y-8">
              {/* AI Summary and Leave Review Row */}
              <div className="grid grid-cols-1 gap-6">
                {/* AI Summary */}
                <div className="bg-[#f8fafc] p-6 md:p-8 rounded-[28px] text-[#363636] shadow-sm relative overflow-hidden flex flex-col justify-center min-h-[180px] border border-slate-200 group">
                  {/* Animated Background Accents */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-brand/10 transition-colors duration-700 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -ml-20 -mb-20 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14 flex items-center justify-center -ml-2">
                          {/* Ambient blue glow */}
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-blue-300 rounded-full blur-[14px] z-0"
                          />
                          
                          {/* Sparkling SVG */}
                          <motion.div
                             animate={{ scale: [0.95, 1.05, 0.95] }}
                             transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                             className="relative z-10 flex items-center justify-center mt-1"
                          >
                            <svg width="44" height="44" viewBox="0 0 100 100" className="drop-shadow-[0_0_8px_rgba(41,121,255,0.4)]">
                              <defs>
                                <linearGradient id="aiSparkleGrad" x1="10%" y1="10%" x2="90%" y2="90%">
                                  <stop offset="0%" stopColor="#2979FF" />
                                  <stop offset="40%" stopColor="#0D3B9E" />
                                  <stop offset="100%" stopColor="#0a2a7a" />
                                </linearGradient>
                                <linearGradient id="aiSparkleGradMini" x1="10%" y1="10%" x2="90%" y2="90%">
                                  <stop offset="0%" stopColor="#2979FF" />
                                  <stop offset="100%" stopColor="#0a2a7a" />
                                </linearGradient>
                              </defs>
                              {/* Main Star */}
                              <path fill="url(#aiSparkleGrad)" d="M 45 5 C 45 40 55 45 90 45 C 55 45 45 50 45 85 C 45 50 35 45 0 45 C 35 45 45 40 45 5 Z" />
                              
                              {/* Small orbiting star */}
                              <motion.path 
                                animate={{ opacity: [0.5, 1, 0.5], scale: [0.7, 1.1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                fill="url(#aiSparkleGradMini)" 
                                d="M 80 15 C 80 25 85 28 95 28 C 85 28 80 31 80 41 C 80 31 75 28 65 28 C 75 28 80 25 80 15 Z" 
                                style={{ transformOrigin: "80px 28px" }}
                              />
                            </svg>
                          </motion.div>
                        </div>
                        <div>
                          <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">
                            AI Dining Insight
                          </h3>
                          <p className="text-[10px] md:text-xs font-normal text-slate-500 uppercase tracking-[0.2em] mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Based on Google review
                          </p>
                        </div>
                      </div>
                      <div className="bg-slate-200/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-300">
                        <span className="text-[10px] md:text-xs font-normal leading-[1.2] text-slate-600">
                          BETA
                        </span>
                      </div>
                    </div>

                    {isAiLoading ? (
                      <div className="flex items-center gap-3 bg-slate-100 p-4 rounded-2xl">
                        <Loader2
                          size={18}
                          className="animate-spin text-slate-500"
                        />
                        <p className="text-sm font-normal leading-[1.2] animate-pulse text-[#363636]">
                          Processing culinary insights and guest experiences...
                        </p>
                      </div>
                    ) : aiSummary ? (
                      <div className="max-w-4xl space-y-4">
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="text-sm font-normal leading-[1.2] text-[#363636] text-justify" {...props} />,
                            li: ({node, ...props}) => <li className="text-sm font-normal leading-[1.2] text-[#363636]" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1.5 my-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1.5 my-2" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-[#363636]" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-lg font-normal leading-[1.2] text-[#363636] mb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-normal leading-[1.2] text-[#363636] mb-2 mt-4" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-normal leading-[1.2] text-[#363636] mb-2 mt-4" {...props} />
                          }}
                        >
                          {aiSummary}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start mt-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-sm font-normal leading-[1.2] text-[#363636] mb-5 max-w-2xl text-justify">
                          Discover what guests love most. Generate an AI-powered
                          summary of thousands of customer reviews to reveal top
                          dishes, ambiance, and service highlights in seconds.
                        </p>
                        <button
                          onClick={handleGenerateSummary}
                          className="bg-brand text-white px-6 py-3 rounded-xl text-sm font-normal leading-[1.2] uppercase tracking-[0.1em] flex items-center gap-2 hover:bg-orange-600 active:scale-95 transition-all shadow-md shadow-brand/20"
                        >
                          <Sparkles size={16} className="text-white" />{" "}
                          Generate Culinary Insight
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Leave Review */}
                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-center">
                  <h3 className="text-[20px] md:text-2xl mb-4 block text-[#363636] font-normal leading-[1.2]">
                    Rate your experience
                  </h3>

                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setUserRating(star)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                          userRating >= star
                            ? "bg-amber-100 text-amber-500 shadow-sm"
                            : "bg-slate-50 text-slate-300 hover:bg-slate-100",
                        )}
                      >
                        <Star
                          size={16}
                          className={userRating >= star ? "fill-amber-500" : ""}
                        />
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Tell us what you loved..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 focus:border-brand focus:bg-white rounded-xl outline-none text-sm font-medium transition-all"
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                  />

                  <button
                    onClick={handlePostReview}
                    disabled={
                      isPostingReview || !userComment.trim() || hasReviewed
                    }
                    className="mt-4 w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                  >
                    {isPostingReview ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : hasReviewed ? (
                      <Check size={14} />
                    ) : (
                      <Send size={14} />
                    )}
                    {hasReviewed ? "Reviewed" : "Submit Review"}
                  </button>
                </div>
              </div>

              {/* User Reviews */}
              {reviews.length > 0 && (
                <div className="pt-4 space-y-4">
                  <h3 className="text-[20px] md:text-2xl mb-4 block text-[#363636] font-normal leading-[1.2]">
                    Recent Reviews
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reviews.slice(0, 4).map((review, idx) => (
                      <div
                        key={review.id || `rev-${idx}`}
                        className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex flex-col"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={review.userPhoto}
                            alt={review.userName}
                            className="w-8 h-8 rounded-full bg-slate-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="overflow-hidden">
                            <h4 className="text-xs truncate text-[#363636] font-normal leading-[1.2]">
                              {review.userName}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">
                              {formatDate(review.createdAt)}
                            </p>
                          </div>
                          <div className="ml-auto flex items-center gap-1 bg-green-50 px-2 py-1 rounded text-green-700 font-black text-xs">
                            {review.rating}.0{" "}
                            <Star size={10} className="fill-green-700" />
                          </div>
                        </div>

                        <p className="text-sm font-normal leading-[1.2] text-[#363636] line-clamp-3 flex-grow">
                          "{review.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <hr className="my-8 border-slate-300" />
            
            {/* Claim Listing Banner */}
            {(!restaurant.contactEmail || !restaurant.contactNumber || (restaurant.contactNumber || '').includes('9999999999') || (restaurant.contactEmail || '').includes('contact@bookmytable.co.in')) && (
              <div className="bg-brand/5 border border-brand/20 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div>
                    <h3 className="text-brand font-bold text-lg mb-1">Is this your restaurant?</h3>
                    <p className="text-slate-600 text-sm font-medium">Claim this listing to unlock bookings, reply to reviews, and manage your page.</p>
                 </div>
                 <Link to={`/onboarding-request?restaurantName=${encodeURIComponent(restaurant.name)}`} className="shrink-0 bg-brand text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-dark transition-colors text-sm text-center w-full md:w-auto shadow-sm shadow-brand/20">
                    Claim Listing
                 </Link>
              </div>
            )}
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
                <h2 className="text-2xl text-[#363636] font-normal leading-[1.2]">
                  Recently Viewed
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  Restaurants you visited recently
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.recentlyViewed.slice(0, 4).map((res, idx) => (
                <RestaurantCard
                  key={res.id || `rec-recent-${idx}`}
                  restaurant={res}
                  className="shadow-vibrant-sm"
                />
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
                <h2 className="text-2xl text-[#363636] font-normal leading-[1.2]">
                  Similar to {restaurant.name}
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  More great {restaurant.cuisine} options you might enjoy
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.similar.map((res, idx) => (
                <RestaurantCard
                  key={res.id || `rec-similar-${idx}`}
                  restaurant={res}
                  className="shadow-vibrant-sm"
                />
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
                <h2 className="text-2xl text-[#363636] font-normal leading-[1.2]">
                  Nearby Restaurants
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  Great dining spots just around the corner
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.nearby.map((res, idx) => (
                <RestaurantCard
                  key={res.id || `rec-nearby-${idx}`}
                  restaurant={res}
                  className="shadow-vibrant-sm"
                />
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
                <h2 className="text-2xl text-[#363636] font-normal leading-[1.2]">
                  You May Also Like
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  Top rated experiences in other cuisines
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.youMayLike.map((res, idx) => (
                <RestaurantCard
                  key={res.id || `rec-like-${idx}`}
                  restaurant={res}
                  className="shadow-vibrant-sm"
                />
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
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsTimingsOpen(false)}
            ></div>
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-50 shrink-0">
                <h2 className="text-[20px] md:text-2xl text-[#363636] font-normal leading-[1.2]">
                  Outlet Timings
                </h2>
                <button
                  onClick={() => setIsTimingsOpen(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                >
                  <X size={18} className="md:w-5 md:h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-1 overflow-y-auto w-full">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => {
                  const daily = restaurant.dailyTimings?.[day];
                  const isToday = format(new Date(), "EEEE") === day;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "grid grid-cols-[1fr_auto] gap-4 py-3 md:py-3.5 border-b border-slate-50 last:border-0",
                        isToday && "bg-brand/5 -mx-4 px-4 rounded-xl",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-sans text-[13px] md:text-[15px] leading-[18px] tracking-[-0.35px]",
                            isToday
                              ? "text-brand font-medium"
                              : "text-[rgba(2,6,12,0.75)] font-light",
                          )}
                        >
                          {isToday ? "Today" : day}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "font-sans text-[13px] md:text-[15px] leading-[18px] tracking-[-0.35px] text-right",
                          daily?.closed
                            ? "text-red-500 font-medium"
                            : "text-[rgba(2,6,12,0.75)] font-light",
                        )}
                      >
                        {daily
                          ? daily.closed
                            ? "Closed"
                            : daily.ranges
                                .map((r) => `${r.open} - ${r.close}`)
                                .join(", ")
                          : `${restaurant.openingHours?.open || "12:30 PM"} - ${restaurant.openingHours?.close || "11:59 PM"}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10"
              onClick={() => setIsTimingsOpen(false)}
            />
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
              if (e.key === "ArrowRight") nextPhoto();
              if (e.key === "ArrowLeft") prevPhoto();
              if (e.key === "Escape") setPhotoViewerOpen(false);
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
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
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
          className="md:hidden fixed bottom-0 left-0 right-0 z-[60] p-4 pb-6 bg-white/95 backdrop-blur-xl border-t border-slate-300 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isTakeawayAvailable(restaurant)) {
                  navigate(getRestaurantTakeawayUrl(restaurant));
                }
              }}
              disabled={
                !restaurant.liveMenu ||
                restaurant.liveMenu.length === 0 ||
                !isTakeawayAvailable(restaurant)
              }
              className="flex-1 bg-slate-900 text-white py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 disabled:shadow-none disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100 active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} />
                <span>Takeaway</span>
              </div>
            </button>

            <button
              onClick={async () => {
                if (restaurant.isBookingEnabled !== false) {
                  if (!user) {
                    try {
                      await signInWithGoogle();
                      navigate(getRestaurantBookUrl(restaurant));
                    } catch (e) {
                      console.error("Failed to sign in:", e);
                    }
                  } else {
                    navigate(getRestaurantBookUrl(restaurant));
                  }
                }
              }}
              disabled={restaurant.isBookingEnabled === false}
              className="flex-1 bg-brand text-white py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-brand/20 disabled:shadow-none disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100 active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5"
            >
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} />
                <span>Book Table</span>
              </div>
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
                className="p-2 -ml-2 text-[#363636] hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="flex-1 relative border-none">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-brand"
                  size={18}
                />
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
                    onClick={() => setSearchQuery("")}
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
                        <span className="text-[10px] md:text-xs font-black text-vibrant-gray uppercase tracking-[0.15em]">
                          Restaurants
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchSuggestions.map((res, idx) => (
                          <Link
                            key={res.id || `search-sugg-${idx}`}
                            to={getRestaurantUrl(res)}
                            onClick={() => {
                              setIsSearchOverlayOpen(false);
                              saveRecentSearch({
                                type: "restaurant",
                                id: `res-${res.id}`,
                                name: res.name,
                                image: res.image || "",
                                city: res.city || res.location,
                                restaurantId: res.id,
                                subtitle: "Restaurant",
                              });
                            }}
                            className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-300 hover:border-slate-300"
                          >
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                              <img
                                src={res.image || RESTAURANT_IMAGE_FALLBACK}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={handleImageError}
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="md:text-lg truncate text-[#363636] font-normal leading-[1.2]">
                                {res.name}
                              </h4>
                              <p className="text-xs md:text-sm text-vibrant-gray font-medium text-ellipsis overflow-hidden line-clamp-1">
                                {Array.isArray(res.cuisine)
                                  ? res.cuisine.join(", ")
                                  : res.cuisine}{" "}
                                • {res.location}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5 md:mt-1">
                                <div
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] md:text-xs font-black flex items-center gap-1",
                                    getRatingColor(res.rating || 0),
                                  )}
                                >
                                  {res.rating}{" "}
                                  <Star size={10} className="fill-current" />
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
                      <p className="text-vibrant-gray font-bold md:text-lg">
                        No results found for "{searchQuery}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 md:p-6">
                  {recentSearches.length > 0 && (
                    <div className="mb-10 md:mb-16">
                      <h4 className="text-xs md:text-sm text-vibrant-gray uppercase tracking-widest mb-6 font-normal leading-[1.2]">
                        Recent Searches
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recentSearches.map((res) => (
                          <div
                            key={`rs-${res.id}`}
                            onClick={() => {
                              setIsSearchOverlayOpen(false);
                              if (res.type === "city") {
                                navigate(`/${res.name.toLowerCase()}`);
                              } else if (res.type === "restaurant") {
                                navigate(
                                  `/restaurant/${res.restaurantId || res.id.replace("res-", "")}`,
                                );
                              }
                            }}
                            className="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-slate-300 hover:border-slate-300 text-left cursor-pointer"
                          >
                            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-slate-100">
                              {res.image ? (
                                <img
                                  src={res.image}
                                  alt={res.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  {res.type === "city" ? (
                                    <MapPin size={24} />
                                  ) : (
                                    <Search size={24} />
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="md:text-lg truncate text-[#363636] font-normal leading-[1.2]">
                                {res.name}
                              </h4>
                              <p className="text-xs md:text-sm text-vibrant-gray font-medium text-ellipsis overflow-hidden line-clamp-1">
                                {res.subtitle} {res.city ? `• ${res.city}` : ""}
                              </p>
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
