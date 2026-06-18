import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, Link } from "react-router-dom";
import { useRestaurants } from "../hooks/useFirebase";
import { Restaurant } from "../types";
import { RestaurantCard } from "./RestaurantCard";
import { useMasterData } from "./MasterDataContext";
import { useAuth } from "./AuthProvider";
import {
  Star,
  MapPin,
  Search,
  Filter,
  Navigation,
  Zap,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Percent,
  ArrowRight,
  X,
  ShoppingBag,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  cn,
  handleImageError,
  RESTAURANT_IMAGE_FALLBACK,
  getRestaurantUrl,
  getRatingColor,
  isTakeawayAvailable,
  getRestaurantStatus,
} from "../lib/utils";
import { Helmet } from "react-helmet-async";
import { useLocationContext } from "./LocationContext";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStories } from "../hooks/useStories";
import StoryViewer from "./StoryViewer";
import StoryAvatar from "./StoryAvatar";

const QuickFiltersBar = ({
  activeFilters,
  setActiveFilters,
  setIsFilterOpen,
  }: any) => {
  const getActiveFilterCountInner = () => {
    let count = activeFilters.cuisines.length;
    if (activeFilters.minRating > 0) count++;
    if (activeFilters.onlyWithOffers) count++;
    if (activeFilters.onlyTakeaway) count++;
    if (activeFilters.openNow) count++;
    if (activeFilters.pureVeg) count++;
    if (activeFilters.servesAlcohol) count++;
    if (activeFilters.bookTable) count++;
    if (activeFilters.delivery) count++;
    return count;
  };

  const count = getActiveFilterCountInner();

  const toggleFilter = (key: string) => {
    setActiveFilters((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  
  const toggleRating = () => {
    setActiveFilters((prev: any) => ({
      ...prev,
      minRating: prev.minRating === 4.5 ? 0 : 4.5,
    }));
  };

  const buttonClass = (isActive: boolean) => 
    cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-[15px] font-normal transition-all shrink-0", 
        isActive ? "bg-[#ef4f5f] text-white border border-[#ef4f5f]" : "bg-white border border-[#cfcfcf] text-[#696969] hover:border-[#9c9c9c]");

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0 mt-4 md:mt-2 max-w-[100vw] sm:max-w-none">
      <button
        onClick={() => setIsFilterOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-[15px] font-normal transition-all bg-white border border-[#cfcfcf] text-[#696969] hover:border-[#9c9c9c] shrink-0"
      >
        {count > 0 ? (
          <span className="w-[20px] h-[20px] flex items-center justify-center bg-[#ef4f5f] text-white rounded-[4px] text-[13px] font-medium leading-none">
            {count}
          </span>
        ) : (
          <Filter size={16} />
        )}
        Filters
      </button>

      <button onClick={() => toggleFilter('onlyWithOffers')} className={buttonClass(activeFilters.onlyWithOffers)}>
        Offers {activeFilters.onlyWithOffers && <X size={16} />}
      </button>

      <button onClick={toggleRating} className={buttonClass(activeFilters.minRating >= 4.5)}>
        Rating: 4.5+ {activeFilters.minRating >= 4.5 && <X size={16} />}
      </button>
      
      <button onClick={() => toggleFilter('openNow')} className={buttonClass(activeFilters.openNow)}>
        Open Now {activeFilters.openNow && <X size={16} />}
      </button>

      <button onClick={() => toggleFilter('pureVeg')} className={buttonClass(activeFilters.pureVeg)}>
        Pure Veg {activeFilters.pureVeg && <X size={16} />}
      </button>

      <button onClick={() => toggleFilter('servesAlcohol')} className={buttonClass(activeFilters.servesAlcohol)}>
        Serves Alcohol {activeFilters.servesAlcohol && <X size={16} />}
      </button>
      
      <button onClick={() => toggleFilter('bookTable')} className={buttonClass(activeFilters.bookTable)}>
        Book a Table {activeFilters.bookTable && <X size={16} />}
      </button>

      <button onClick={() => toggleFilter('onlyTakeaway')} className={buttonClass(activeFilters.onlyTakeaway)}>
        Take Away {activeFilters.onlyTakeaway && <X size={16} />}
      </button>

      <button onClick={() => toggleFilter('delivery')} className={buttonClass(activeFilters.delivery)}>
        Delivery {activeFilters.delivery && <X size={16} />}
      </button>
    </div>
  );
};


export default function CityView() {
  const { cityId, locationSlug } = useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { cities, cuisines, loading: masterDataLoading } = useMasterData();
  const { restaurants, loading: restaurantsLoading } = useRestaurants(true);

  const queryCityName = cityId || "delhi";
  const { usersWithStories, loading: storiesLoading } = useStories(queryCityName);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);

  const loading = restaurantsLoading || masterDataLoading;
  const { coords: userCoords, city: contextCity } = useLocationContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("bookmytable_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading recent searches", e);
    }
  }, []);

  const saveRecentSearch = (item: any) => {
    try {
      const updated = [
        item,
        ...recentSearches.filter((s) => s.id !== item.id),
      ].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(
        "bookmytable_recent_searches",
        JSON.stringify(updated),
      );
    } catch (e) {
      console.error("Error saving recent search", e);
    }
  };

  const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
    openNow: false,
    pureVeg: false,
    servesAlcohol: false,
    bookTable: false,
    delivery: false,
    cuisines: [] as string[],
    minRating: 0,
    onlyWithOffers: false,
    onlyTakeaway: false,
  });

  const getActiveFilterCount = () => {
    let count = activeFilters.cuisines.length;
    if (activeFilters.minRating > 0) count++;
    if (activeFilters.onlyWithOffers) count++;
    if (activeFilters.onlyTakeaway) count++;
    if (activeFilters.openNow) count++;
    if (activeFilters.pureVeg) count++;
    if (activeFilters.servesAlcohol) count++;
    if (activeFilters.bookTable) count++;
    if (activeFilters.delivery) count++;
    return count;
  };
  const hasActiveFilters = getActiveFilterCount() > 0;


  // Validate cityId on mount
  useEffect(() => {
    if (cityId && cities.length > 0) {
      const isNearby = cityId.toLowerCase() === "nearby";
      const isSupported = cities.some(
        (c) => c.name.toLowerCase() === cityId.toLowerCase() && c.lat !== 0,
      );

      if (!isNearby && !isSupported) {
        const isKnown = cities.some(
          (c) => c.name.toLowerCase() === cityId.toLowerCase() && c.isKnown,
        );
        if (isKnown) {
          navigate(
            `/error?city=${encodeURIComponent(cityId)}&type=unsupported`,
          );
        } else {
          navigate(`/error?city=${encodeURIComponent(cityId)}&type=invalid`);
        }
      }
    }
  }, [cityId, navigate, cities]);

  const featuredRef = useRef<HTMLDivElement>(null);
  const discountRef = useRef<HTMLDivElement>(null);
  const nearbyRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const takeawayRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);

  const scroll = (
    ref: React.RefObject<HTMLDivElement>,
    direction: "left" | "right",
  ) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const cityName = useMemo(() => {
    if (!cityId || cityId.toLowerCase() === "nearby") {
      // If it's the raw detected city name, try to find a match in our cities list for formatting
      const match = cities.find(
        (c) => c.name.toLowerCase() === contextCity.toLowerCase(),
      );
      return match ? match.name : contextCity;
    }

    // Check if it matches any known city for proper capitalization
    const knownCity = cities.find(
      (c) => c.name.toLowerCase() === cityId.toLowerCase(),
    );
    return knownCity
      ? knownCity.name
      : cityId.charAt(0).toUpperCase() + cityId.slice(1);
  }, [cityId, contextCity, cities]);

  // Haversine formula for distance in km
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  const cityRestaurants = useMemo(() => {
    return restaurants
      .filter((res) => {
        // Normalize city names for comparison
        const resCityNorm = res.city ? res.city.toLowerCase() : "";
        const currentCityNorm = cityName.toLowerCase();

        // If Nearby You is selected, and we have user coords, we show restaurants within a reasonable distance (e.g. 50km for strictly "near")
        if (currentCityNorm === "nearby you" || currentCityNorm === "nearby") {
          if (!userCoords) return true;

          if (res.lat && res.lng) {
            const dist = calculateDistance(
              userCoords.lat,
              userCoords.lng,
              res.lat,
              res.lng,
            );
            return dist <= 50;
          }
          return contextCity && resCityNorm === contextCity.toLowerCase();
        }

        // Strict match by city field or valid location string
        const matchesCity = resCityNorm === currentCityNorm;
        return matchesCity;
      })
      .map((res) => ({
        ...res,
        distance:
          userCoords && res.lat && res.lng
            ? calculateDistance(
                userCoords.lat,
                userCoords.lng,
                res.lat,
                res.lng,
              )
            : null,
      }));
  }, [restaurants, cityName, userCoords, contextCity]);

  const featuredRestaurants = useMemo(() => {
    return [...cityRestaurants].sort((a, b) => b.rating - a.rating).slice(0, 5);
  }, [cityRestaurants]);

  const spotlightRestaurants = useMemo(() => {
    return [...cityRestaurants]
      .filter((r) => r.advertisements?.some((ad) => ad.active))
      .sort(() => 0.5 - Math.random()) // Shuffle a bit or sort by rank
      .slice(0, 5);
  }, [cityRestaurants]);

  const takeawayRestaurants = useMemo(() => {
    let list = [...cityRestaurants].filter(
      (r) => r.liveMenu && r.liveMenu.length > 0,
    );
    if (locationSlug) {
      const hasAnyAreaMatch = cityRestaurants.some(rest => {
         const f = (rest.location || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
         return f && locationSlug.includes(f);
      });
      if (hasAnyAreaMatch) {
        list = list.filter((r) => {
          const locSlugFormat = (r.location || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const isLocMatch = !locationSlug || locSlugFormat === locationSlug || (locSlugFormat && locationSlug.includes(locSlugFormat));
          return isLocMatch;
        });
      }
    }
    const withDistance = list
      .filter((r) => r.distance !== null)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    return withDistance.length > 0
      ? withDistance.slice(0, 5)
      : list.slice(0, 5);
  }, [cityRestaurants, locationSlug]);

  const famousLocations = useMemo(() => {
    const counts: Record<string, number> = {};
    cityRestaurants.forEach((r) => {
      if (r.location) {
        counts[r.location] = (counts[r.location] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map((e) => e[0]);
  }, [cityRestaurants]);

  const nearbyRestaurants = useMemo(() => {
    return [...cityRestaurants]
      .filter((r) => r.distance !== null)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, 5);
  }, [cityRestaurants]);

  const discountedRestaurants = useMemo(() => {
    return [...cityRestaurants]
      .filter((r) => r.offers && r.offers.length > 0)
      .slice(0, 5);
  }, [cityRestaurants]);

  const filteredListing = useMemo(() => {
    return cityRestaurants
      .filter((res) => {
        // Search matches
        const matchesSearch =
          res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (Array.isArray(res.cuisine)
            ? res.cuisine.join(" ")
            : res.cuisine || ""
          )
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          res.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (res.address &&
            res.address.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch && searchQuery.length > 0) return false;

        if (locationSlug) {
          // Detect if any area in the city matches the locationSlug
          const hasAnyAreaMatch = cityRestaurants.some(r => {
             const f = (r.location || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
             return f && locationSlug.includes(f);
          });
          
          if (hasAnyAreaMatch) {
            const locSlugFormat = (res.location || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const isLocMatch = !locationSlug || locSlugFormat === locationSlug || (locSlugFormat && locationSlug.includes(locSlugFormat));
            if (!isLocMatch) return false;
          }
        }

        // Filter matches
        const matchesCuisine =
          activeFilters.cuisines.length === 0 ||
          (Array.isArray(res.cuisine)
            ? res.cuisine.some((c) => activeFilters.cuisines.includes(c))
            : activeFilters.cuisines.includes(res.cuisine));
        const matchesRating = res.rating >= activeFilters.minRating;
        const matchesOffers =
          !activeFilters.onlyWithOffers ||
          (res.offers && res.offers.length > 0);
        const matchesTakeaway = 
          !activeFilters.onlyTakeaway || 
          (res.liveMenu && res.liveMenu.length > 0);
          
        const status = getRestaurantStatus(res);
        const matchesOpenNow = !activeFilters.openNow || status.isOpen;
        
        const matchesPureVeg = !activeFilters.pureVeg || res.facilities?.includes("Vegetarian Friendly") || (res as any).isVeg === true;
        const matchesAlcohol = !activeFilters.servesAlcohol || res.facilities?.includes("Bar") || res.facilities?.includes("Serves Alcohol");
        const matchesBookTable = !activeFilters.bookTable || res.isBookingEnabled;
        const matchesDelivery = !activeFilters.delivery || res.facilities?.includes("Home Delivery");

        return matchesCuisine && matchesRating && matchesOffers && matchesTakeaway && matchesOpenNow && matchesPureVeg && matchesAlcohol && matchesBookTable && matchesDelivery;
      })
      .sort((a, b) => {
        if (
          (cityName === "Nearby You" || cityName === "Nearby") &&
          a.distance !== null &&
          b.distance !== null
        ) {
          return a.distance - b.distance;
        }
        return a.name.localeCompare(b.name);
      });
  }, [cityRestaurants, searchQuery, cityName, activeFilters, locationSlug]);

  const mallGroups = useMemo(() => {
    const groups: { [slug: string]: { mallName: string, location: string, outlets: any[] } } = {};
    
    cityRestaurants.forEach(r => {
      if (r.mallName) {
        const slug = r.mallName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + 
                     "-" + 
                     (r.location || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
                     
        if (!groups[slug]) {
          groups[slug] = {
            mallName: r.mallName,
            location: r.location || '',
            outlets: []
          };
        }
        groups[slug].outlets.push(r);
      }
    });

    return Object.entries(groups).map(([slug, data]) => ({
      ...data,
      slug,
      image: "https://images.unsplash.com/photo-1519567281727-84bc7bf3a200?w=800&auto=format&fit=crop"
    }));
  }, [cityRestaurants]);

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const findAndSetPortal = () => {
      const el = document.getElementById("navbar-search-portal");
      if (el) {
        setPortalTarget(el);
        if (timer) clearInterval(timer);
      }
    };

    findAndSetPortal();
    timer = setInterval(findAndSetPortal, 100);

    return () => clearInterval(timer);
  }, []);

  const searchSuggestions = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return cityRestaurants
      .filter(
        (res) =>
          res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (Array.isArray(res.cuisine)
            ? res.cuisine.join(" ")
            : res.cuisine || ""
          )
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
      .slice(0, 6);
  }, [cityRestaurants, searchQuery]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop + 100 >=
        document.documentElement.offsetHeight
      ) {
        if (visibleCount < filteredListing.length) {
          setVisibleCount((prev) => prev + 4);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCount, filteredListing.length]);

  const currentCity = useMemo(
    () => cities.find((c) => c.name.toLowerCase() === cityName?.toLowerCase()),
    [cities, cityName],
  );

  const welcomeText = authLoading
    ? ""
    : user
      ? `Hi ${profile?.displayName?.split(" ")[0] || "User"}, What's on your mind?`
      : `Hey, What's on your mind?`;

  const getSeoData = () => {
    const locName = locationSlug ? locationSlug.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') : 'Best';
    let url = locationSlug ? `https://www.bookmytable.co.in/${cityId}/location/${locationSlug}` : `https://www.bookmytable.co.in/${cityId}`;
    let title = locationSlug ? `${locName} Restaurants, ${cityName} - Bookmytable` : `${locName} Restaurants, ${cityName} - Bookmytable`;
    let description = locationSlug ? `Explore restaurants in ${locName}, ${cityName} and book table instantly with discounts on Bookmytable...` : `Explore restaurants in ${cityName} and book table instantly with discounts on Bookmytable...`;
    let keywords = locationSlug ? `book table online, resturants in ${cityName}, restaurants in ${locName}, online table booking, bookmytable, booking, hotel, resturant` : `book table online, resturants in ${cityName}, online table booking, bookmytable, booking, hotel, resturant`;

    return { title, url, description, keywords, locName };
  };

  const seoData = getSeoData();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-20 bg-vibrant-bg min-h-screen"
    >
      <Helmet>
        <title>{seoData.title}</title>
        <link rel="alternate" hrefLang="en" href={seoData.url} /> 
        <meta name="description" content={seoData.description} />
        <meta name="keywords" content={seoData.keywords} />
        <meta name="url" content={seoData.url} />
        <meta name="twitter:app:name:iphone" content="Bookmytable" />
        <meta name="twitter:app:name:ipad" content="Bookmytable" />
        <meta name="twitter:app:country" content="in" />
        <meta property="og:title" content={`${seoData.locName} Restaurants, ${cityName} - Bookmytable India`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoData.url} />
        <meta property="og:site_name" content="Bookmytable" />
        <meta property="og:description" content={seoData.description} />
      </Helmet>
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

      {/* Categories & Cuisines */}
      {!locationSlug && (
      <section className="relative bg-white pt-4 pb-8">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          {/* Welcome Banner */}
          <div className="relative mb-8 rounded-none overflow-hidden h-[130px] md:h-40 w-[calc(100%+48px)] md:w-[calc(100%+64px)] -mx-6 md:-mx-8 flex items-center bg-slate-100">
            {loading || authLoading ? (
              <div className="absolute inset-0 bg-slate-200 animate-pulse" />
            ) : (
              <>
                <img
                  src={
                    currentCity?.bannerImage ||
                    "https://i.pinimg.com/736x/57/49/c5/5749c5f0d470c1f48ace375243d8e994.jpg"
                  }
                  alt="Welcome Banner"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                <h2 className="relative z-10 text-xl sm:text-2xl md:text-3xl text-white px-6 md:px-10 w-full md:max-w-2xl font-normal leading-[1.2]">
                  {welcomeText}
                </h2>
              </>
            )}
          </div>
          <QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} />
        </div>
      </section>
      )}

      {/* CUISINE CAROUSEL */}
      {!locationSlug && !hasActiveFilters && (
      <section className="relative bg-white pb-8">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          {/* Cuisine Cards Carousel */}
          {!hasActiveFilters && (
          <div>
            <div className="flex items-start gap-4 md:gap-6 overflow-x-auto pb-6 scrollbar-none snap-x -mx-6 px-6 md:mx-0 md:px-0">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[100px] md:w-[140px] h-[140px] md:h-[190px] rounded-2xl bg-slate-200 shrink-0 snap-start animate-pulse"
                    />
                  ))
                : cuisines.map((cuisine) => (
                    <Link
                      key={cuisine.id}
                      to={`/cuisine/${cuisine.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "")}`}
                      className="relative flex flex-col justify-end w-[100px] md:w-[140px] h-[140px] md:h-[190px] rounded-2xl overflow-hidden shrink-0 snap-start group shadow border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <img
                        src={cuisine.image || RESTAURANT_IMAGE_FALLBACK}
                        alt={cuisine.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 h-1/3 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />
                      <span className="relative z-10 text-[13px] md:text-base font-medium leading-[1.2] text-white px-3 pb-4 text-center tracking-wide">
                        {cuisine.name}
                      </span>
                    </Link>
                  ))}
            </div>
          </div>
          )}
        </div>
      </section>
      )}

      {locationSlug && (
        <div className="max-w-7xl mx-auto px-6 mt-6 md:mt-8 mb-6 md:mb-8">
          <div className="pt-4 pb-0 md:pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <button 
                onClick={() => navigate(`/${cityId}`)}
                className="flex items-center gap-1 text-slate-500 hover:text-brand font-medium text-sm mb-3 transition-colors"
              >
                <ChevronLeft size={16} /> Back to {cityName}
              </button>
              <h1 className="text-3xl md:text-4xl mb-2 text-[#363636] font-normal leading-[1.2]">
                Restaurants in {famousLocations.find(loc => loc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === locationSlug) || locationSlug.split('-').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ')}
              </h1>
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <MapPin size={20} className="text-brand" />
                <span>{filteredListing.length} places to explore</span>
              </div>
            </div>
          </div>
          <QuickFiltersBar activeFilters={activeFilters} setActiveFilters={setActiveFilters} setIsFilterOpen={setIsFilterOpen} />
        </div>
      )}

      {/* Stories Section */}
      {!hasActiveFilters && (!storiesLoading && usersWithStories.length > 0) && (
        <div className="max-w-7xl mx-auto px-6 mt-4 md:mt-6 mb-2">
          <section className="relative">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x -mx-6 px-6 md:mx-0 md:px-0">
               {usersWithStories.map((storyUser, idx) => (
                  <div key={storyUser.restaurantId} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer snap-start" onClick={() => setActiveStoryIndex(idx)}>
                      <StoryAvatar 
                         stories={storyUser.stories} 
                         userPhoto={storyUser.restaurantImage} 
                         currentUserId={user?.uid} 
                         className="w-16 h-16 md:w-20 md:h-20" 
                      />
                      <span className="text-xs font-bold text-slate-700 w-16 md:w-20 truncate text-center">{storyUser.restaurantName}</span>
                  </div>
               ))}
            </div>
            
            {/* Fullscreen Viewer */}
            <AnimatePresence>
               {activeStoryIndex !== null && (
                  <StoryViewer 
                     users={usersWithStories} 
                     initialUserIndex={activeStoryIndex} 
                     onClose={() => setActiveStoryIndex(null)} 
                  />
               )}
            </AnimatePresence>
          </section>
        </div>
      )}

      <div className={cn("max-w-7xl mx-auto px-6 mt-4 md:mt-6", locationSlug ? "space-y-4 md:space-y-6" : "space-y-12 md:space-y-20")}>

        {/* Featured Section */}
        {!hasActiveFilters && !locationSlug && (loading || featuredRestaurants.length > 0) && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                  Featured Restaurants
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  Handpicked selections by our food experts
                </p>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="text-brand" size={24} />
                <div className="hidden md:flex gap-2">
                  <button
                    onClick={() => scroll(featuredRef, "left")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={20} className="text-[#363636]" />
                  </button>
                  <button
                    onClick={() => scroll(featuredRef, "right")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={20} className="text-[#363636]" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={featuredRef}
              className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-6 px-6 md:mx-0 md:px-0"
            >
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start animate-pulse"
                    >
                      <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))
                : featuredRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start"
                    />
                  ))}
            </div>
          </section>
        )}

        {/* Spotlight Section */}
        {!hasActiveFilters && !locationSlug && !loading && spotlightRestaurants.length > 0 && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                  Spotlight in {cityName}
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  Sponsored places you must try
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Star className="text-amber-500 fill-amber-500" size={24} />
                <div className="hidden md:flex gap-2">
                  <button
                    onClick={() => scroll(spotlightRef, "left")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={20} className="text-[#363636]" />
                  </button>
                  <button
                    onClick={() => scroll(spotlightRef, "right")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={20} className="text-[#363636]" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={spotlightRef}
              className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-6 px-6 md:mx-0 md:px-0"
            >
              {spotlightRestaurants.map((restaurant) => {
                const activeAd = restaurant.advertisements?.find(ad => ad.active);
                return (
                <div
                  key={restaurant.id}
                  onClick={() => navigate(getRestaurantUrl(restaurant))}
                  className="relative w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start cursor-pointer group rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-300 h-[280px]"
                >
                  <div className="absolute top-3 left-3 bg-white text-[#363636] text-[10px] uppercase tracking-widest px-2.5 py-1 rounded shadow-sm z-20 font-normal leading-[1.2]">
                    Ad
                  </div>
                  <img 
                    src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=600'} 
                    alt={restaurant.name} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 transition-opacity duration-300"></div>
                  
                  <div className="absolute inset-0 p-5 pt-12 flex flex-col justify-end z-20">
                    <div className="mt-auto flex flex-col">
                      {activeAd && (
                        <div className="mb-3">
                          <p className="font-bold text-white text-base md:text-lg line-clamp-2 leading-tight drop-shadow-md">
                            {activeAd.title}
                          </p>
                          {activeAd.description && (
                            <p className="text-sm text-white/90 line-clamp-1 mt-1 drop-shadow-md">
                              {activeAd.description}
                            </p>
                          )}
                        </div>
                      )}
                      <div className={activeAd ? "border-t border-white/20 pt-3 flex flex-col gap-0.5" : "flex flex-col gap-0.5"}>
                        <h3 className="text-base text-white line-clamp-1 drop-shadow-md font-normal leading-[1.2]">{restaurant.name}</h3>
                        <div className="flex items-center gap-1.5 text-white/80 drop-shadow-md">
                          <MapPin size={14} className="shrink-0" />
                          <p className="text-xs line-clamp-1">{restaurant.location}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </section>
        )}

        {/* Top Discount Section */}
        {!hasActiveFilters && !locationSlug && (loading || discountedRestaurants.length > 0) && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                  Top Discounts in {cityName}
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  Save big on your next meal
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full font-black text-xs flex items-center gap-1">
                  <Percent size={14} />
                  LTD TIME
                </div>
                <div className="hidden md:flex gap-2">
                  <button
                    onClick={() => scroll(discountRef, "left")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={20} className="text-[#363636]" />
                  </button>
                  <button
                    onClick={() => scroll(discountRef, "right")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={20} className="text-[#363636]" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={discountRef}
              className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-6 px-6 md:mx-0 md:px-0"
            >
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start animate-pulse"
                    >
                      <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))
                : discountedRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start"
                      showFullOffer
                    />
                  ))}
            </div>
          </section>
        )}

        {/* Food Courts Section */}
        {!hasActiveFilters && !locationSlug && mallGroups.length > 0 && (
          <section className="relative group/section mb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                  Food Courts in <span className="text-brand">{currentCity?.name || queryCityName}</span>
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  Skip the queue and order from your favorite mall outlets
                </p>
              </div>
            </div>

            <div className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-6 px-6 md:mx-0 md:px-0">
              {mallGroups.map((group) => (
                <Link
                  key={group.slug}
                  to={`/mall/${group.slug}`}
                  className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start bg-white rounded-2xl border border-slate-100 shadow hover:shadow-xl transition-all block group/card"
                >
                  <div className="relative overflow-hidden rounded-t-2xl aspect-video bg-slate-100">
                    <img 
                      src={group.image} 
                      alt={group.mallName} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                      loading="lazy" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="font-bold text-lg leading-tight">{group.mallName}</h3>
                      <p className="text-sm opacity-90">{group.location}</p>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                     <span className="text-sm font-medium text-slate-600">
                       {group.outlets.length} Outlets available
                     </span>
                     <span className="bg-brand text-white text-xs font-bold px-2 py-1 rounded">View All</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Nearby Section */}
        {!hasActiveFilters && !locationSlug && (loading || nearbyRestaurants.length > 0) && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                  Restaurants Near You
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  Quick dining options in your immediate vicinity
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Navigation className="text-brand" size={24} />
                <div className="hidden md:flex gap-2">
                  <button
                    onClick={() => scroll(nearbyRef, "left")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={20} className="text-[#363636]" />
                  </button>
                  <button
                    onClick={() => scroll(nearbyRef, "right")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={20} className="text-[#363636]" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={nearbyRef}
              className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-6 px-6 md:mx-0 md:px-0"
            >
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start animate-pulse"
                    >
                      <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  ))
                : nearbyRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      className="w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start"
                    />
                  ))}
            </div>
          </section>
        )}

        {/* Famous Locations */}
        {!hasActiveFilters && !locationSlug && !loading && famousLocations.length > 0 && (
          <section className="relative group/section">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                Browse by Famous locations
              </h2>
              <p className="text-vibrant-gray font-medium text-sm">
                Explore top areas in {cityName}
              </p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none -mx-6 px-6 md:mx-0 md:px-0 snap-x">
              {famousLocations.map((locationName, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    navigate(`/${cityId}/${locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`);
                    setTimeout(() => {
                      document
                        .getElementById("all-restaurants")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="snap-start bg-white border border-gray-100 hover:border-brand rounded-2xl p-6 cursor-pointer min-w-[140px] md:min-w-[160px] shadow-sm hover:shadow transition-all group flex flex-col items-center justify-center shrink-0"
                >
                  <MapPin
                    size={28}
                    className="text-brand mb-3 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-sm md:text-base text-[#363636] text-center font-normal leading-[1.2]">
                    {locationName}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Takeaway Restaurants */}
        {!hasActiveFilters && !loading && takeawayRestaurants.length > 0 && (
          <section className="relative group/section">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                  {locationSlug ? `Take Away Restaurants in ${famousLocations.find(loc => loc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === locationSlug) || locationSlug.split('-').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ')}` : "Takeaway restaurants near You"}
                </h2>
                <p className="text-vibrant-gray font-medium text-sm">
                  {locationSlug ? "Quick bites ready for pickup" : "Order online & pick up quickly"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-brand" size={24} />
                <div className="hidden md:flex gap-2">
                  <button
                    onClick={() => scroll(takeawayRef, "left")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft size={20} className="text-[#363636]" />
                  </button>
                  <button
                    onClick={() => scroll(takeawayRef, "right")}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={20} className="text-[#363636]" />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={takeawayRef}
              className="flex gap-4 md:gap-8 overflow-x-auto pb-6 scrollbar-none snap-x -mx-6 px-6 md:mx-0 md:px-0"
            >
              {takeawayRestaurants.map((restaurant) => {
                const isAvailable = isTakeawayAvailable(restaurant);
                return (
                  <div
                    key={restaurant.id}
                    className={cn(
                      "relative w-[85vw] max-w-[280px] md:max-w-none md:w-[320px] shrink-0 snap-start",
                      !isAvailable && "opacity-50 grayscale pointer-events-none"
                    )}
                  >
                    <RestaurantCard restaurant={restaurant} />
                    {!isAvailable && (
                      <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
                         <div className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-md">
                           Takeaway Closed
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Main Listing Section */}
        <section
          id="all-restaurants"
          className={cn(!locationSlug && "pt-8 md:pt-12 border-t border-gray-100")}
        >
          {!hasActiveFilters && !locationSlug && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl text-[#363636] font-normal leading-[1.2]">
              {searchQuery
                ? `Search results for "${searchQuery}"`
                : `Explore All in ${cityName}`}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFilterOpen(true)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
                  hasActiveFilters
                    ? "bg-brand text-white shadow-lg shadow-brand/30"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-brand/30 hover:bg-slate-50",
                )}
              >
                <Filter size={18} />
                Filters
                {hasActiveFilters && (
                  <span className="flex items-center justify-center w-5 h-5 ml-1 bg-white text-brand rounded-full text-xs font-black">
                    {getActiveFilterCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-200 aspect-[4/3] rounded-2xl mb-4" />
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredListing.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-x-6 md:gap-y-10">
              {filteredListing
                .slice(0, visibleCount)
                .map((restaurant, index) => (
                  <motion.div
                    key={restaurant.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <RestaurantCard restaurant={restaurant} />
                  </motion.div>
                ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
              <h3 className="text-2xl text-slate-400 font-normal leading-[1.2]">
                No restaurants matching your search
              </h3>
            </div>
          )}

          {visibleCount < filteredListing.length && (
            <div className="mt-20 flex justify-center">
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm font-bold text-vibrant-gray">
                  Scroll for more
                </p>
                <div className="animate-bounce">
                  <div className="w-1.5 h-1.5 bg-brand rounded-full mb-1"></div>
                  <div className="w-1.5 h-1.5 bg-brand/50 rounded-full mb-1"></div>
                  <div className="w-1.5 h-1.5 bg-brand/20 rounded-full"></div>
                </div>
              </div>
            </div>
          )}
        </section>


        {/* Famous Locations on Area Page */}
        {!hasActiveFilters && locationSlug && !loading && famousLocations.length > 0 && (
          <section className="relative group/section pt-12 border-t border-gray-100">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl text-[#363636] font-normal leading-[1.2]">
                Browse by Famous locations
              </h2>
              <p className="text-vibrant-gray font-medium text-sm">
                Explore top areas in {cityName}
              </p>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none -mx-6 px-6 md:mx-0 md:px-0 snap-x">
              {famousLocations.map((locationName, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    navigate(`/${cityId}/${locationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`);
                    setTimeout(() => {
                      document
                        .getElementById("all-restaurants")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="snap-start bg-white border border-gray-100 hover:border-brand rounded-2xl p-6 cursor-pointer min-w-[140px] md:min-w-[160px] shadow-sm hover:shadow transition-all group flex flex-col items-center justify-center shrink-0"
                >
                  <MapPin
                    size={28}
                    className="text-brand mb-3 group-hover:scale-110 transition-transform"
                  />
                  <span className="text-sm md:text-base text-[#363636] text-center font-normal leading-[1.2]">
                    {locationName}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Filter Drawer */}
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
              <div className="flex-1 relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-brand"
                  size={18}
                />
                <input
                  autoFocus
                  type="text"
                  placeholder="Where would you like to eat?"
                  className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 md:py-4 md:text-base text-sm font-bold focus:ring-2 focus:ring-brand"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
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
                        {searchSuggestions.map((res) => (
                          <Link
                            key={res.id}
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
                                src={res.image}
                                alt=""
                                className="w-full h-full object-cover"
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
                                const rData = restaurants.find(
                                  (r) =>
                                    r.id ===
                                    (res.restaurantId ||
                                      res.id.replace("res-", "")),
                                );
                                if (rData) {
                                  navigate(getRestaurantUrl(rData));
                                } else {
                                  navigate(
                                    `/restaurant/${res.restaurantId || res.id.replace("res-", "")}`,
                                  );
                                }
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {cuisines.slice(0, 8).map((cuisine) => (
                      <button
                        key={cuisine.id}
                        onClick={() => {
                          setSearchQuery(cuisine.name);
                        }}
                        className="flex items-center gap-3 p-3 md:p-4 bg-slate-50 rounded-2xl hover:bg-brand/5 active:scale-95 transition-all text-left group"
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shrink-0 border border-white group-hover:shadow-md transition-shadow">
                          <img
                            src={cuisine.image}
                            alt={cuisine.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-sm md:text-base text-[#363636] group-hover:text-brand transition-colors truncate font-normal leading-[1.2]">
                          {cuisine.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-10 md:mt-16">
                    <h4 className="text-xs md:text-sm text-vibrant-gray uppercase tracking-widest mb-6 font-normal leading-[1.2]">
                      Trending Near {cityName}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {featuredRestaurants.slice(0, 4).map((res) => (
                        <div
                          key={res.id}
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
                            navigate(`/restaurant/${res.id}`);
                          }}
                          className="flex items-center gap-3 md:gap-4 cursor-pointer group p-3 md:p-4 hover:bg-slate-50 rounded-2xl transition-colors"
                        >
                          <TrendingUp
                            size={16}
                            className="text-brand shrink-0"
                          />
                          <span className="text-sm md:text-base font-normal leading-[1.2] text-[#363636] group-hover:text-brand transition-colors truncate">
                            {res.name}
                          </span>
                          <span className="text-[10px] md:text-xs bg-slate-100 text-vibrant-gray px-2 py-1 rounded font-black ml-auto whitespace-nowrap">
                            {Array.isArray(res.cuisine)
                              ? res.cuisine.join(", ")
                              : res.cuisine}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFilterOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-xl text-[#363636] font-normal leading-[1.2]">
                  Filters
                </h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-10">
                {/* Cuisines */}
                <section>
                  <h4 className="text-sm text-vibrant-gray uppercase tracking-widest mb-4 font-normal leading-[1.2]">
                    Cuisines
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {cuisines.map((c) => {
                      const isSelected = activeFilters.cuisines.includes(
                        c.name,
                      );
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setActiveFilters((prev) => ({
                              ...prev,
                              cuisines: isSelected
                                ? prev.cuisines.filter(
                                    (name) => name !== c.name,
                                  )
                                : [...prev.cuisines, c.name],
                            }));
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all border-2",
                            isSelected
                              ? "bg-brand/10 border-brand text-brand"
                              : "bg-white border-gray-100 text-[#363636] hover:border-gray-300",
                          )}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Rating */}
                <section>
                  <h4 className="text-sm text-vibrant-gray uppercase tracking-widest mb-4 font-normal leading-[1.2]">
                    Minimum Rating
                  </h4>
                  <div className="flex gap-2">
                    {[0, 3, 3.5, 4, 4.5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() =>
                          setActiveFilters((prev) => ({
                            ...prev,
                            minRating: rating,
                          }))
                        }
                        className={cn(
                          "flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2 flex flex-col items-center gap-1",
                          activeFilters.minRating === rating
                            ? "bg-brand/10 border-brand text-brand"
                            : "bg-white border-gray-100 text-[#363636] hover:border-gray-200",
                        )}
                      >
                        {rating === 0 ? (
                          "Any"
                        ) : (
                          <>
                            <div className="flex items-center gap-1">
                              {rating} <Star size={12} fill="currentColor" />
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Offers */}
                <section>
                  <h4 className="text-sm text-vibrant-gray uppercase tracking-widest mb-4 font-normal leading-[1.2]">
                    Offers & Deals
                  </h4>
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-slate-300 hover:border-slate-300 cursor-pointer transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <Percent size={20} />
                      </div>
                      <div>
                        <p className="font-normal leading-[1.2] text-[#363636]">
                          Exclusive Offers
                        </p>
                        <p className="text-xs text-vibrant-gray font-medium">
                          Show only restaurants with active deals
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-6 h-6 rounded-lg text-brand focus:ring-brand accent-brand border-gray-300"
                      checked={activeFilters.onlyWithOffers}
                      onChange={(e) =>
                        setActiveFilters((prev) => ({
                          ...prev,
                          onlyWithOffers: e.target.checked,
                        }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 cursor-pointer hover:border-gray-200 transition-colors mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <ShoppingBag size={20} />
                      </div>
                      <div>
                        <p className="font-normal leading-[1.2] text-[#363636] text-sm">
                          Takeaway Available
                        </p>
                        <p className="text-xs text-vibrant-gray font-medium">
                          Show only restaurants equipped for takeaway
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-6 h-6 rounded-lg text-brand focus:ring-brand accent-brand border-gray-300"
                      checked={activeFilters.onlyTakeaway}
                      onChange={(e) =>
                        setActiveFilters((prev) => ({
                          ...prev,
                          onlyTakeaway: e.target.checked,
                        }))
                      }
                    />
                  </label>
                </section>
              </div>

              <div className="p-6 border-t bg-slate-50 flex items-center gap-4">
                <button
                  onClick={() => {
                    setActiveFilters({
                      openNow: false,
                      pureVeg: false,
                      servesAlcohol: false,
                      bookTable: false,
                      delivery: false,
                      cuisines: [],
                      minRating: 0,
                      onlyWithOffers: false,
                      onlyTakeaway: false,
                    });
                  }}
                  className="flex-1 py-4 text-sm font-black text-vibrant-gray hover:text-[#363636] transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-[2] py-4 bg-vibrant-dark text-white rounded-2xl font-black text-sm shadow-xl hover:-translate-y-1 transition-all active:translate-y-0"
                >
                  Show Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
