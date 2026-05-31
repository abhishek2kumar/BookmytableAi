import React, { useState, useEffect, useMemo } from "react";
import AppIcon from "./AppIcon";
import { db } from "../lib/firebase";
import { uploadImageToStorage } from "../lib/storage";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  getDocs,
  deleteField,
} from "firebase/firestore";
import { Restaurant, Booking, UserProfile } from "../types";
import {
  formatDate,
  formatTime,
  cn,
  handleImageError,
  RESTAURANT_IMAGE_FALLBACK,
  convertTo12Hour,
  convertTo24Hour,
} from "../lib/utils";
import {
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Users,
  Store,
  Calendar,
  Clock,
  History,
  TrendingUp,
  Sparkles,
  Loader2,
  MapPin,
  X,
  MoreVertical,
  Search,
  Filter,
  UtensilsCrossed,
  Settings2,
  Power,
  PowerOff,
  Plus,
  Globe,
  Soup,
  ChevronRight,
  Trash2,
  Edit2,
  Database,
  Save,
  Settings,
  Image,
  Gift,
  Megaphone,
  Video,
  Play,
  ExternalLink,
  ChevronDown,
  Link,
  ArrowRight,
  Upload,
  LayoutGrid,
  Building2,
} from "lucide-react";
import { searchRealRestaurants } from "../services/aiService";
import { useAuth } from "./AuthProvider";
import { useMasterData } from "./MasterDataContext";
import { INDIAN_STATES } from "../constants";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

const DEFAULT_BOOKING_SLOTS = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
];

interface City {
  id?: string;
  name: string;
  image: string;
  bannerImage?: string;
  lat: number;
  lng: number;
  isPopular?: boolean;
  isKnown?: boolean;
}

interface Cuisine {
  id?: string;
  name: string;
  image: string;
  description: string;
}

export default function AdminDashboardView() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const {
    seedData,
    loading: masterLoading,
    isComingSoon,
    updateComingSoon,
  } = useMasterData();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [importCity, setImportCity] = useState("Bangalore");

  // Modal states
  const [activeModal, setActiveModal] = useState<
    | "users"
    | "cities"
    | "cuisines"
    | "addCity"
    | "addCuisine"
    | "restaurantsMaster"
    | null
  >(null);
  const [selectedCityForRestaurants, setSelectedCityForRestaurants] = useState<
    string | null
  >(null);
  const [selectedAreaForRestaurants, setSelectedAreaForRestaurants] = useState<
    string | null
  >(null);
  const [restaurantMasterSearch, setRestaurantMasterSearch] = useState("");
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingCuisine, setEditingCuisine] = useState<Cuisine | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [activeEditTab, setActiveEditTab] = useState<
    | "general"
    | "operational"
    | "visuals"
    | "menu"
    | "liveMenu"
    | "offers"
    | "ads"
    | "reservations"
    | "system"
  >("general");
  const [isSavingRestaurant, setIsSavingRestaurant] = useState(false);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const updateEditingLocationField = (field: string, value: string) => {
    if (!editingRestaurant) return;
    const nextRes = { ...editingRestaurant, [field]: value };
    const fullAddress = [
      nextRes.shopNo,
      nextRes.floor,
      nextRes.area,
      nextRes.city,
      nextRes.state,
      nextRes.pincode,
      nextRes.country,
      nextRes.landmark,
    ]
      .filter(Boolean)
      .join(", ");
    setEditingRestaurant({
      ...nextRes,
      address: fullAddress,
      location: nextRes.area || nextRes.location || "",
    });
  };

  const handleGeocode = async () => {
    if (!editingRestaurant?.address || isGeocoding) return;
    setIsGeocoding(true);
    try {
      const response = await fetch("/api/system/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: editingRestaurant.address,
          city: editingRestaurant.city,
        }),
      });
      const data = await response.json();
      if (data.lat && data.lng) {
        setEditingRestaurant({
          ...editingRestaurant,
          lat: data.lat,
          lng: data.lng,
        });
        setNotification({
          type: "success",
          message: "Coordinates updated from address!",
        });
      } else {
        setNotification({
          type: "error",
          message: "AI could not find precise coordinates.",
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Geocoding request failed." });
    } finally {
      setIsGeocoding(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleMediaInjection = (cat: string, url: string) => {
    if (!editingRestaurant) return;
    let nextRes = { ...editingRestaurant };
    if (cat.startsWith("CUSTOM:")) {
      const customCat = cat.replace("CUSTOM:", "");
      const nextGallery = { ...(nextRes.gallery || {}) };
      nextGallery[customCat] = [...(nextGallery[customCat] || []), url];
      nextRes.gallery = nextGallery;
    } else {
      let field: keyof Restaurant = "secondaryImages";
      if (cat === "Food Images") field = "foodImages";
      else if (cat === "Ambience") field = "ambienceImages";
      else if (cat === "Exterior") field = "secondaryImages";
      else if (cat === "Gallery") field = "secondaryImages";

      nextRes[field] = [...((nextRes[field] as string[]) || []), url];
    }
    setEditingRestaurant(nextRes);
    setNotification({
      type: "success",
      message: `Added asset to ${cat.startsWith("CUSTOM:") ? cat.replace("CUSTOM:", "") : cat}`,
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [resSearchQuery, setResSearchQuery] = useState("");
  const [bookingSearchQuery, setBookingSearchQuery] = useState("");
  const [bookingFilter, setBookingFilter] = useState<
    "all" | "today" | "upcoming"
  >("all");
  const [pulseCityFilter, setPulseCityFilter] = useState("all");
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [cuisineSearchQuery, setCuisineSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "fleet" | "pulse" | "inventory" | "approvals" | "portal"
  >("fleet");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "approved" | "pending"
  >("all");

  const handleFirestoreError = (
    error: any,
    operation: string,
    path: string,
  ) => {
    const errorInfo = {
      error: error.message || String(error),
      operationType: operation,
      path: path,
      authInfo: {
        userId: currentUser?.uid,
        email: currentUser?.email,
      },
    };
    console.error("Firestore Error:", JSON.stringify(errorInfo));
    return errorInfo.error;
  };

  useEffect(() => {
    // One time migration script for menu -> signatureDishes
    if (!restaurants || restaurants.length === 0) return;
    const migrate = async () => {
      for (const r of restaurants) {
        if ("menu" in r) {
          console.log("Migrating", r.name);
          try {
            await updateDoc(doc(db, "restaurants", r.id!), {
              signatureDishes:
                (r as any).menu?.length > 0
                  ? (r as any).menu
                  : (r as any).signatureDishes || [],
              menu: deleteField(),
            });
            console.log("Migrated", r.name);
          } catch (e) {
            console.error("Failed to migrate", r.name, e);
          }
        }
      }
    };
    migrate();
  }, [restaurants]);

  useEffect(() => {
    const unsubRes = onSnapshot(collection(db, "restaurants"), (snapshot) => {
      setRestaurants(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            signatureDishes: data.signatureDishes || data.menu || [],
          } as Restaurant;
        }),
      );
    });

    const unsubBookings = onSnapshot(collection(db, "bookings"), (snapshot) => {
      setBookings(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[],
      );
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(
        snapshot.docs.map(
          (doc) => ({ uid: doc.id, ...doc.data() }) as UserProfile,
        ),
      );
    });

    const unsubCities = onSnapshot(collection(db, "cities"), (snapshot) => {
      setCities(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as City[],
      );
    });

    const unsubCuisines = onSnapshot(collection(db, "cuisines"), (snapshot) => {
      setCuisines(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Cuisine[],
      );
      setLoading(false);
    });

    return () => {
      unsubRes();
      unsubBookings();
      unsubUsers();
      unsubCities();
      unsubCuisines();
    };
  }, []);

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "restaurants", id), {
      approved: !currentStatus,
      lastModifiedBy: currentUser?.email || "admin",
      lastModifiedByType: "admin",
      updatedAt: serverTimestamp(),
    });
  };

  const toggleBookingStatus = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "restaurants", id), {
      isBookingEnabled: !currentStatus,
      lastModifiedBy: currentUser?.email || "admin",
      lastModifiedByType: "admin",
      updatedAt: serverTimestamp(),
    });
  };

  const cityStats = useMemo(() => {
    const stats: Record<string, number> = {};
    restaurants
      .filter((r) => r.approved)
      .forEach((r) => {
        const city = r.city || "Unknown";
        stats[city] = (stats[city] || 0) + 1;
      });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [restaurants]);

  const areaStats = useMemo(() => {
    if (!selectedCityForRestaurants) return [];
    const stats: Record<string, number> = {};
    restaurants
      .filter((r) => (r.city || "Unknown") === selectedCityForRestaurants)
      .forEach((r) => {
        const area = r.location || "Unknown";
        stats[area] = (stats[area] || 0) + 1;
      });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [restaurants, selectedCityForRestaurants]);

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return users;
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase()),
    );
  }, [users, userSearchQuery]);

  const filteredRestaurants = useMemo(() => {
    let list = [...restaurants];

    // Status Filter
    if (statusFilter === "approved") list = list.filter((r) => r.approved);
    if (statusFilter === "pending") list = list.filter((r) => !r.approved);

    if (resSearchQuery) {
      const query = resSearchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          (r.name?.toLowerCase() || "").includes(query) ||
          (r.city?.toLowerCase() || "").includes(query) ||
          (Array.isArray(r.cuisine) ? r.cuisine.join(" ") : r.cuisine || "")
            .toLowerCase()
            .includes(query) ||
          (r.location?.toLowerCase() || "").includes(query) ||
          (r.address?.toLowerCase() || "").includes(query) ||
          (r.lastModifiedBy?.toLowerCase() || "").includes(query),
      );
    }
    // Alphabetical sort (A-Z)
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [restaurants, resSearchQuery, statusFilter]);

  const [editingRatingRes, setEditingRatingRes] = useState<{
    id: string;
    rating: number;
  } | null>(null);

  const updateRating = async () => {
    if (!editingRatingRes) return;
    try {
      await updateDoc(doc(db, "restaurants", editingRatingRes.id), {
        rating: editingRatingRes.rating,
        lastModifiedBy: currentUser?.email || "admin",
        lastModifiedByType: "admin",
        updatedAt: serverTimestamp(),
      });
      setEditingRatingRes(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant || !currentUser) return;
    setIsSavingRestaurant(true);
    try {
      const { id } = editingRestaurant;

      const allowedKeys = [
        "name",
        "description",
        "cuisine",
        "avgPrice",
        "contactNumber",
        "contactEmail",
        "partnerEmails",
        "image",
        "location",
        "address",
        "city",
        "state",
        "pincode",
        "country",
        "shopNo",
        "floor",
        "area",
        "landmark",
        "isOpen",
        "rating",
        "approved",
        "facilities",
        "offers",
        "advertisements",
        "menuImages",
        "secondaryImages",
        "foodImages",
        "ambienceImages",
        "popularDishes",
        "signatureDishes",
        "dailyTimings",
        "isBookingEnabled",
        "bookingSlots",
        "lat",
        "lng",
        "instantBookingLimit",
        "blackoutDates",
        "slotCategories",
        "categorySlots",
        "menuCategories",
        "liveMenu",
      ];

      const updateData: any = {};
      allowedKeys.forEach((key) => {
        const val = (editingRestaurant as any)[key];
        if (val !== undefined) {
          updateData[key] = val;
        } else {
          // Provide defaults for critical missing fields to prevent Firestore 'undefined' error
          if (key === "location") updateData[key] = "";
          if (key === "rating") updateData[key] = 0;
          if (key === "cuisine") updateData[key] = [];
        }
      });

      // Re-compose address
      updateData.address = [
        updateData.shopNo,
        updateData.floor,
        updateData.area,
        updateData.city,
        updateData.state,
        updateData.pincode,
        updateData.country,
        updateData.landmark,
      ]
        .filter(Boolean)
        .join(", ");

      updateData.location = updateData.area || updateData.location || ""; // Sync for legacy and prevent undefined

      updateData.lastModifiedBy = currentUser.email || "admin";
      updateData.lastModifiedByType = "admin";
      updateData.updatedAt = serverTimestamp();

      await updateDoc(doc(db, "restaurants", id), updateData);
      setNotification({
        type: "success",
        message: "Restaurant updated successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
      setEditingRestaurant(null);
    } catch (err: any) {
      const errMsg = handleFirestoreError(
        err,
        "update",
        `restaurants/${(editingRestaurant as any).id}`,
      );
      setNotification({ type: "error", message: `Update failed: ${errMsg}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSavingRestaurant(false);
    }
  };

  const handleSeedData = async () => {
    if (!currentUser) return;
    setSeeding(true);
    try {
      const samples = await searchRealRestaurants(importCity);
      if (samples.length === 0) {
        alert(
          "No restaurants found for this area. Try searching for a specific neighborhood!",
        );
        return;
      }

      // Exact check for Duplicate: Name + Location/City
      const existingKey = (r: any) =>
        `${r.name.toLowerCase()}|${(r.location || r.city).toLowerCase()}`;
      const existingKeys = new Set(restaurants.map(existingKey));

      const newItems = samples.filter(
        (s) => s.name && !existingKeys.has(existingKey(s)),
      );

      if (newItems.length === 0) {
        alert("Found restaurants, but they are all already in your list!");
        return;
      }

      const promises = newItems.map((res) =>
        addDoc(collection(db, "restaurants"), {
          ...res,
          ownerId: currentUser.uid,
          isOpen: true,
          rating: 4.0, // Default for imported
          approved: true,
          isBookingEnabled: true,
          createdAt: serverTimestamp(),
        }),
      );
      await Promise.all(promises);
      alert(
        `Imported ${newItems.length} new restaurants from "${importCity}"!`,
      );
    } catch (err) {
      console.error(err);
      alert("Failed to fetch real data.");
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity) return;

    // Check for duplicate name if new city
    if (!editingCity.id) {
      const exists = cities.some(
        (c) => c.name.toLowerCase() === editingCity.name.toLowerCase(),
      );
      if (exists) {
        setNotification({
          type: "error",
          message: "This city already exists in the system.",
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    try {
      if (editingCity.id) {
        await updateDoc(doc(db, "cities", editingCity.id), { ...editingCity });
      } else {
        await addDoc(collection(db, "cities"), {
          ...editingCity,
          createdAt: serverTimestamp(),
        });
      }
      setActiveModal("cities");
      setEditingCity(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCuisine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCuisine) return;

    // Check for duplicate name if new cuisine
    if (!editingCuisine.id) {
      const exists = cuisines.some(
        (c) => c.name.toLowerCase() === editingCuisine.name.toLowerCase(),
      );
      if (exists) {
        setNotification({
          type: "error",
          message: "This cuisine already exists in the system.",
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }

    try {
      if (editingCuisine.id) {
        await updateDoc(doc(db, "cuisines", editingCuisine.id), {
          ...editingCuisine,
        });
      } else {
        await addDoc(collection(db, "cuisines"), {
          ...editingCuisine,
          createdAt: serverTimestamp(),
        });
      }
      setActiveModal("cuisines");
      setEditingCuisine(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCity = async (id: string) => {
    if (!confirm("Are you sure you want to delete this city?")) return;
    try {
      await updateDoc(doc(db, "cities", id), {
        isKnown: false,
        isPopular: false,
      }); // Or actually delete? Better to delete if requested
      // Actually the rules allow delete? Let's check.
      // await deleteDoc(doc(db, 'cities', id)); // Need to import deleteDoc
    } catch (err) {
      console.error(err);
    }
  };

  const usersWithBiz = useMemo(() => {
    return filteredUsers.map((u) => {
      const biz = restaurants.find((r) => r.ownerId === u.uid);
      return { ...u, bizName: biz?.name, bizCity: biz?.city };
    });
  }, [filteredUsers, restaurants]);

  const filteredBookings = useMemo(() => {
    let list = [...bookings];

    // Search
    if (bookingSearchQuery) {
      const q = bookingSearchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.userName.toLowerCase().includes(q) ||
          b.restaurantName.toLowerCase().includes(q) ||
          (b as any).userEmail?.toLowerCase().includes(q),
      );
    }

    // City Filter
    if (pulseCityFilter !== "all") {
      // We need to link booking to restaurant city
      list = list.filter((b) => {
        const res = restaurants.find((r) => r.name === b.restaurantName); // fallback if city not in booking
        return (
          (b as any).city === pulseCityFilter || res?.city === pulseCityFilter
        );
      });
    }

    // Time Filter
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    if (bookingFilter === "today") {
      list = list.filter((b) => {
        const d = new Date(b.dateTime);
        return d >= todayStart && d <= todayEnd;
      });
    } else if (bookingFilter === "upcoming") {
      list = list.filter((b) => new Date(b.dateTime) > todayEnd);
    }

    return list.sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
    );
  }, [
    bookings,
    bookingSearchQuery,
    bookingFilter,
    pulseCityFilter,
    restaurants,
  ]);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.name.localeCompare(b.name)),
    [cities],
  );
  const sortedCuisines = useMemo(
    () => [...cuisines].sort((a, b) => a.name.localeCompare(b.name)),
    [cuisines],
  );

  const renderEditTabs = () => {
    if (!editingRestaurant) return null;

    switch (activeEditTab) {
      case "general":
        return (
          <motion.div
            key="general"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-8"
          >
            {/* Consolidated Legal Identity Section */}
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-300 space-y-8">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-brand" size={18} />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Legal Identity
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={isGeocoding || !editingRestaurant.address}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-xl text-[9px] font-black text-brand uppercase tracking-wider hover:border-brand transition-all disabled:opacity-50 shadow-sm"
                >
                  {isGeocoding ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Database size={10} />
                  )}
                  Auto-Geocode
                </button>
              </div>

              {/* Primary Identity & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 md:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Legal Entity Name *
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.name}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Floor / Tower
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.floor || ""}
                    onChange={(e) =>
                      updateEditingLocationField("floor", e.target.value)
                    }
                    placeholder="2nd Floor"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Shop / Building No.
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.shopNo || ""}
                    onChange={(e) =>
                      updateEditingLocationField("shopNo", e.target.value)
                    }
                    placeholder="Shop 101"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Area / Locality *
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={
                      editingRestaurant.area || editingRestaurant.location || ""
                    }
                    onChange={(e) =>
                      updateEditingLocationField("area", e.target.value)
                    }
                    placeholder="Viman Nagar"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    City *
                  </label>
                  <select
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.city}
                    onChange={(e) =>
                      updateEditingLocationField("city", e.target.value)
                    }
                    required
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    State *
                  </label>
                  <select
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.state || ""}
                    onChange={(e) =>
                      updateEditingLocationField("state", e.target.value)
                    }
                    required
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Pincode *
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.pincode || ""}
                    onChange={(e) =>
                      updateEditingLocationField("pincode", e.target.value)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Landmark
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.landmark || ""}
                    onChange={(e) =>
                      updateEditingLocationField("landmark", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.lat || ""}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        lat: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.lng || ""}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        lng: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="h-px bg-slate-200/50 mx-1" />

              {/* Business & Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Average Price for two (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.avgPrice}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        avgPrice: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Global Rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.rating || 0}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        rating: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="e.g. 4.5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Contact Number
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.contactNumber || ""}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        contactNumber: e.target.value,
                      })
                    }
                    placeholder="+91..."
                  />
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Contact Email
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.contactEmail || ""}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        contactEmail: e.target.value,
                      })
                    }
                    placeholder="contact@restaurant.com"
                  />
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Partner Emails (Comma Separated)
                  </label>
                  <input
                    className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={(editingRestaurant.partnerEmails || []).join(", ")}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        partnerEmails: e.target.value.split(',').map(s=>s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="owner@gmail.com, manager@gmail.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Cuisine Classification (Multiple)
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-300">
                {cuisines.map((c) => {
                  const isSelected = Array.isArray(editingRestaurant.cuisine)
                    ? editingRestaurant.cuisine.includes(c.name)
                    : editingRestaurant.cuisine === c.name;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(editingRestaurant.cuisine)
                          ? editingRestaurant.cuisine
                          : editingRestaurant.cuisine
                            ? [editingRestaurant.cuisine]
                            : [];
                        const next = current.includes(c.name)
                          ? current.filter((item) => item !== c.name)
                          : [...current, c.name];
                        setEditingRestaurant({
                          ...editingRestaurant,
                          cuisine: next,
                        });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                        isSelected
                          ? "bg-brand text-white border-brand shadow-sm"
                          : "bg-white text-slate-400 border-slate-300 hover:border-slate-300",
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Brand Description / Story
              </label>
              <textarea
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm min-h-[200px]"
                value={editingRestaurant.description}
                onChange={(e) =>
                  setEditingRestaurant({
                    ...editingRestaurant,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Facilities
              </label>
              <div className="flex flex-wrap gap-2 p-5 bg-slate-50 rounded-3xl border border-slate-300">
                {[
                  "Fine Dine",
                  "Bar",
                  "Valet Parking",
                  "Indoor Seating",
                  "Outdoor Seating",
                  "Live Music",
                  "Vegetarian Only",
                  "Alcohol Served",
                  "Rooftop",
                  "Luxury",
                  "WiFi",
                  "Digital Menu",
                  "Wheelchair Accessible",
                  "Kid Friendly",
                  "Pet Friendly",
                  "Smoking Area",
                  "Breakfast",
                  "Lunch",
                  "Dinner",
                  "Private Dining",
                  "Event Space",
                  "Sports Screenings",
                  "Card Accepted",
                  "UPI Accepted",
                  "Takeaway",
                  "Delivery",
                ].map((fac) => {
                  const facArray = Array.isArray(editingRestaurant.facilities) ? editingRestaurant.facilities : typeof editingRestaurant.facilities === 'string' ? (editingRestaurant.facilities as unknown as string).split(',').map((x:any)=>x.trim()).filter(Boolean) : [];
                  const isSelected = facArray.includes(fac);
                  return (
                    <button
                      key={fac}
                      type="button"
                      onClick={() => {
                        const next = isSelected
                          ? facArray.filter((f: any) => f !== fac)
                          : [...facArray, fac];
                        setEditingRestaurant({
                          ...editingRestaurant,
                          facilities: next,
                        });
                      }}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10"
                          : "bg-white text-slate-400 border-slate-300 hover:border-slate-300 shadow-sm",
                      )}
                    >
                      {fac}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        );
      case "operational":
        const currentTimings = editingRestaurant.dailyTimings || {};
        const blackoutDates = editingRestaurant.blackoutDates || [];

        return (
          <motion.div
            key="operational"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-10"
          >
            {/* engine toggle moved here */}
            <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[32px] text-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    editingRestaurant.isBookingEnabled
                      ? "bg-emerald-500 shadow-lg shadow-emerald-500/20"
                      : "bg-red-500 shadow-lg shadow-red-500/20",
                  )}
                >
                  <Calendar size={24} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-white/90">
                    Reservation Engine
                  </p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-0.5">
                    {editingRestaurant.isBookingEnabled
                      ? "Operational & Syncing"
                      : "System Offline"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingRestaurant({
                    ...editingRestaurant,
                    isBookingEnabled: !editingRestaurant.isBookingEnabled,
                  })
                }
                className={cn(
                  "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ring-offset-2 ring-offset-slate-900 focus:ring-2",
                  editingRestaurant.isBookingEnabled
                    ? "bg-white/10 hover:bg-white/20 text-white ring-white/20"
                    : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg ring-emerald-500/50",
                )}
              >
                {editingRestaurant.isBookingEnabled
                  ? "Kill Engine"
                  : "Activate Engine"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-300 space-y-6">
                <div className="flex items-center gap-3 px-1">
                  <Clock className="text-brand" size={18} />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Operational Velocity
                  </h3>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    Confirmation Threshold (n)
                  </label>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">
                    Auto-confirm bookings up to this guest count
                  </p>
                  <input
                    type="number"
                    className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none transition-all shadow-sm"
                    value={editingRestaurant.instantBookingLimit || 10}
                    onChange={(e) =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        instantBookingLimit: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-300 space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3 text-red-500">
                    <PowerOff size={18} />
                    <h3 className="text-sm font-black uppercase tracking-widest">
                      Blackout Protocol
                    </h3>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input type="date" id="blackout-date-input" className="flex-grow px-4 py-3 bg-white border border-slate-300 rounded-xl font-bold text-xs" min={new Date().toISOString().split('T')[0]} />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById(
                          "blackout-date-input",
                        ) as HTMLInputElement;
                        if(input.value && !isNaN(new Date(input.value).getTime()) && !blackoutDates.includes(input.value)) {
                          setEditingRestaurant({
                            ...editingRestaurant,
                            blackoutDates: [
                              ...blackoutDates,
                              input.value,
                            ].sort(),
                          });
                          input.value = "";
                        }
                      }}
                      className="px-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all"
                    >
                      Lock
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {blackoutDates.map((date) => (
                      <div
                        key={date}
                        className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm"
                      >
                        <span className="text-[10px] font-bold text-slate-600">
                          {date}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingRestaurant({
                              ...editingRestaurant,
                              blackoutDates: blackoutDates.filter(
                                (d) => d !== date,
                              ),
                            })
                          }
                          className="text-slate-300 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {blackoutDates.length === 0 && (
                      <p className="text-[10px] font-bold text-slate-400 italic">
                        No blackout dates active
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-300 space-y-8">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em] bg-white px-4 py-1.5 rounded-full border border-slate-300 shadow-sm">
                  Standard Weekly Cadence
                </span>
                <div className="h-px flex-grow bg-slate-200" />
                <button
                  type="button"
                  onClick={() => {
                    const monday = currentTimings["Monday"] || {
                      ranges: [{ open: "11:00 AM", close: "11:00 PM" }],
                      closed: false,
                    };
                    const nextTimings = { ...currentTimings };
                    [
                      "Tuesday",
                      "Wednesday",
                      "Thursday",
                      "Friday",
                      "Saturday",
                      "Sunday",
                    ].forEach((day) => {
                      nextTimings[day] = JSON.parse(JSON.stringify(monday));
                    });
                    setEditingRestaurant({
                      ...editingRestaurant,
                      dailyTimings: nextTimings,
                    });
                  }}
                  className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-sm"
                >
                  Apply Monday to all
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => {
                  const dayData = currentTimings[day] || {
                    ranges: [{ open: "11:00 AM", close: "11:00 PM" }],
                    closed: false,
                  };

                  return (
                    <div
                      key={day}
                      className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-white rounded-[28px] border border-slate-300 shadow-sm transition-all hover:border-brand"
                    >
                      <div className="w-24 shrink-0">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">
                          {day}
                        </span>
                      </div>

                      <div className="flex-grow flex flex-wrap items-center gap-4">
                        {dayData.closed ? (
                          <div className="flex items-center gap-2 text-[10px] font-black text-red-500 bg-red-50 px-4 py-2 rounded-xl uppercase tracking-widest border border-red-100 shadow-inner">
                            <PowerOff size={12} />
                            Operations Suspended
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-3">
                            {(dayData.ranges || []).map((range, rIdx) => (
                              <div
                                key={rIdx}
                                className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-300 shadow-sm relative group/range"
                              >
                                <input
                                  type="time"
                                  className="bg-transparent text-xs font-black w-24 outline-none text-slate-800"
                                  value={convertTo24Hour(range.open)}
                                  onChange={(e) => {
                                    const nextRanges = [
                                      ...(dayData.ranges || []),
                                    ];
                                    nextRanges[rIdx] = {
                                      ...range,
                                      open: convertTo12Hour(e.target.value),
                                    };
                                    setEditingRestaurant({
                                      ...editingRestaurant,
                                      dailyTimings: {
                                        ...currentTimings,
                                        [day]: {
                                          ...dayData,
                                          ranges: nextRanges,
                                        },
                                      },
                                    });
                                  }}
                                />
                                <span className="text-slate-300 font-bold uppercase text-[9px] tracking-widest">
                                  to
                                </span>
                                <input
                                  type="time"
                                  className="bg-transparent text-xs font-black w-24 outline-none text-slate-800"
                                  value={convertTo24Hour(range.close)}
                                  onChange={(e) => {
                                    const nextRanges = [
                                      ...(dayData.ranges || []),
                                    ];
                                    nextRanges[rIdx] = {
                                      ...range,
                                      close: convertTo12Hour(e.target.value),
                                    };
                                    setEditingRestaurant({
                                      ...editingRestaurant,
                                      dailyTimings: {
                                        ...currentTimings,
                                        [day]: {
                                          ...dayData,
                                          ranges: nextRanges,
                                        },
                                      },
                                    });
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextRanges = (
                                      dayData.ranges || []
                                    ).filter((_, i) => i !== rIdx);
                                    setEditingRestaurant({
                                      ...editingRestaurant,
                                      dailyTimings: {
                                        ...currentTimings,
                                        [day]: {
                                          ...dayData,
                                          ranges: nextRanges,
                                        },
                                      },
                                    });
                                  }}
                                  className="w-7 h-7 bg-white text-red-500 rounded-xl flex items-center justify-center opacity-0 group-hover/range:opacity-100 transition-all shadow-sm border border-slate-300 hover:bg-red-500 hover:text-white"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const nextRanges = [
                                  ...(dayData.ranges || []),
                                  { open: "11:00 AM", close: "11:00 PM" },
                                ];
                                setEditingRestaurant({
                                  ...editingRestaurant,
                                  dailyTimings: {
                                    ...currentTimings,
                                    [day]: { ...dayData, ranges: nextRanges },
                                  },
                                });
                              }}
                              className="w-11 h-11 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-brand transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const dayTiming = currentTimings[day] || {
                            ranges: [{ open: "11:00 AM", close: "11:00 PM" }],
                            closed: false,
                          };
                          const nextTimings = { ...currentTimings };
                          [
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                            "Sunday",
                          ].forEach((d) => {
                            if (d !== day) {
                              nextTimings[d] = JSON.parse(
                                JSON.stringify(dayTiming),
                              );
                            }
                          });
                          setEditingRestaurant({
                            ...editingRestaurant,
                            dailyTimings: nextTimings,
                          });
                          setNotification({
                            type: "success",
                            message: `Copied ${day} timings to all week!`,
                          });
                          setTimeout(() => setNotification(null), 3000);
                        }}
                        className={cn(
                          "w-full md:w-48 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0 border bg-white text-brand border-brand/20 hover:bg-brand hover:text-white mb-2 md:mb-0",
                          dayData.closed && "opacity-50 pointer-events-none",
                        )}
                      >
                        Copy to all Days
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRestaurant({
                            ...editingRestaurant,
                            dailyTimings: {
                              ...currentTimings,
                              [day]: {
                                ...dayData,
                                closed: !dayData.closed,
                                ranges: dayData.ranges || [
                                  { open: "11:00 AM", close: "11:00 PM" },
                                ],
                              },
                            },
                          });
                        }}
                        className={cn(
                          "w-full md:w-36 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm shrink-0 border",
                          dayData.closed
                            ? "bg-white text-emerald-500 border-emerald-100 hover:bg-emerald-50"
                            : "bg-white text-red-500 border-red-100 hover:bg-red-50",
                        )}
                      >
                        {dayData.closed
                          ? "Restore Operations"
                          : "Suspend Operations"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Window Configurations (Slot Categories) */}
            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-300 space-y-6">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">
                    Booking Windows
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Configure slot categories for the reservation engine
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = Date.now().toString();
                    setEditingRestaurant({
                      ...editingRestaurant,
                      slotCategories: [
                        ...(editingRestaurant.slotCategories || []),
                        { id: newId, name: "New Category", slots: [] },
                      ],
                    });
                  }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
                >
                  <Plus size={14} /> Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(editingRestaurant.slotCategories || []).map((cat, catIdx) => (
                  <div
                    key={cat.id}
                    className="bg-white border border-slate-300 p-6 rounded-[32px] shadow-sm space-y-6 transition-all hover:border-brand/30"
                  >
                    <div className="flex items-center justify-between gap-4 border-b border-slate-300 pb-4">
                      <input
                        className="bg-transparent text-lg font-display font-black text-slate-900 focus:outline-none focus:ring-0 p-0 border-none w-full uppercase tracking-tight"
                        value={cat.name}
                        placeholder="Category Name (e.g. Dinner)"
                        onChange={(e) => {
                          const nextCats = [
                            ...(editingRestaurant.slotCategories || []),
                          ];
                          nextCats[catIdx] = { ...cat, name: e.target.value };
                          setEditingRestaurant({
                            ...editingRestaurant,
                            slotCategories: nextCats,
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const nextCats = [
                            ...(editingRestaurant.slotCategories || []),
                          ];
                          nextCats.splice(catIdx, 1);
                          setEditingRestaurant({
                            ...editingRestaurant,
                            slotCategories: nextCats,
                          });
                        }}
                        className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shrink-0 shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {(cat.slots || []).map((s, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 px-4 py-2 border border-slate-300 shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 text-slate-600 transition-all hover:bg-white hover:border-brand"
                        >
                          {convertTo12Hour(s)}
                          <button
                            type="button"
                            onClick={() => {
                              const nextCats = [
                                ...(editingRestaurant.slotCategories || []),
                              ];
                              nextCats[catIdx].slots = nextCats[
                                catIdx
                              ].slots.filter((_, i) => i !== idx);
                              setEditingRestaurant({
                                ...editingRestaurant,
                                slotCategories: nextCats,
                              });
                            }}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="relative group/time">
                        <input
                          type="time"
                          className="bg-white border-2 border-slate-300 outline-none rounded-xl px-4 py-2 text-[10px] font-black uppercase transition-all focus:border-brand shadow-sm text-slate-700 w-[140px] appearance-none"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const nextCats = [
                                ...(editingRestaurant.slotCategories || []),
                              ];
                              if (!nextCats[catIdx].slots.includes(val)) {
                                nextCats[catIdx].slots = [
                                  ...nextCats[catIdx].slots,
                                  val,
                                ].sort();
                              }
                              setEditingRestaurant({
                                ...editingRestaurant,
                                slotCategories: nextCats,
                              });
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {!(editingRestaurant.slotCategories || []).length && (
                  <div className="md:col-span-2 py-20 bg-white border-2 border-dashed border-slate-300 rounded-[48px] text-center opacity-60">
                    <Calendar
                      size={48}
                      className="mx-auto text-slate-100 mb-4"
                    />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                      No booking windows established
                    </p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                      Initialize your first category above
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      case "visuals":
        return (
          <motion.div
            key="visuals"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-12"
          >
            <div className="p-8 bg-slate-900 rounded-[48px] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand/20 blur-[100px] rounded-full -mr-20 -mt-20" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                    <Image size={32} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-display font-black tracking-tight uppercase">
                      Media Asset Manager
                    </h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-1">
                      Multi-Category Asset Injection
                    </p>
                  </div>
                </div>

                <div
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
                  id="media-manager-v2"
                >
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">
                      1. Target Categorization
                    </label>
                    <div className="relative group">
                      <select
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-white outline-none focus:border-brand transition-all text-sm appearance-none cursor-pointer hover:bg-white/10"
                        id="media-category-select"
                      >
                        <option className="bg-slate-900" value="Gallery">
                          Standard Gallery
                        </option>
                        <option className="bg-slate-900" value="Food Images">
                          Food Images
                        </option>
                        <option className="bg-slate-900" value="Ambience">
                          Ambience & Interior
                        </option>
                        <option className="bg-slate-900" value="Exterior">
                          Exterior & Secondary
                        </option>
                        {Object.keys(editingRestaurant.gallery || {}).map(
                          (cat) => (
                            <option
                              key={cat}
                              className="bg-slate-900"
                              value={`CUSTOM:${cat}`}
                            >
                              {cat}
                            </option>
                          ),
                        )}
                      </select>
                      <ChevronDown
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 group-hover:text-white/40 pointer-events-none"
                        size={16}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">
                      2. Injection Method
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          const catSelect = document.getElementById(
                            "media-category-select",
                          ) as HTMLSelectElement;
                          const cat = catSelect.value;
                          const url = prompt(`Paste Asset URL for ${cat}:`);
                          if (url) {
                            handleMediaInjection(cat, url);
                          }
                        }}
                        className="flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand/50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Link
                            size={18}
                            className="text-white/40 group-hover:text-brand"
                          />
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white">
                            External URL
                          </span>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-white/10 group-hover:text-white/40"
                        />
                      </button>

                      <label className="flex items-center justify-between px-6 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-brand/50 transition-all group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Upload
                            size={18}
                            className="text-white/40 group-hover:text-brand"
                          />
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white">
                            Local Upload
                          </span>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-white/10 group-hover:text-white/40"
                        />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setIsUploadingGlobal(true);
                              const url = await uploadImageToStorage(file, 'restaurants');
                              const catSelect = document.getElementById(
                                "media-category-select",
                              ) as HTMLSelectElement;
                              handleMediaInjection(
                                catSelect.value,
                                url,
                              );
                              setNotification({ type: 'success', message: 'Image uploaded!' });
                            } catch (err) {
                              setNotification({ type: 'error', message: 'Failed to upload image' });
                              console.error(err);
                            } finally {
                              setIsUploadingGlobal(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Primary Asset Group */}
            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-300 flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-1/3 aspect-[4/3] md:aspect-square rounded-[32px] overflow-hidden border-4 border-white shadow-xl bg-slate-200">
                <img
                  src={editingRestaurant.image || RESTAURANT_IMAGE_FALLBACK}
                  alt="Hero"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow space-y-6">
                <div className="text-left">
                  <h3 className="text-xl font-display font-black text-slate-900 tracking-tight leading-none uppercase">
                    Primary Display Asset
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 overflow-hidden">
                    The flagship image for search and listing cards
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2 text-left">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                      Source URL
                    </label>
                    <input
                      className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 outline-none transition-all shadow-sm text-sm"
                      value={editingRestaurant.image}
                      onChange={(e) =>
                        setEditingRestaurant({
                          ...editingRestaurant,
                          image: e.target.value,
                        })
                      }
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Enter Image URL:");
                        if (url)
                          setEditingRestaurant({
                            ...editingRestaurant,
                            image: url,
                          });
                      }}
                      className="flex-grow flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-brand transition-all shadow-lg shadow-slate-900/10"
                    >
                      <Image size={14} />
                      Update Hero Asset
                    </button>
                  </div>
                </div>
              </div>
            </div>{" "}
            {/* Enhanced Grouped Gallery */}
            <div className="space-y-12">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
                    <LayoutGrid size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-display font-black text-slate-900 tracking-tight uppercase">
                      Categorized Media Collections
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Images grouped by custom categories
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const catName = prompt("Enter New Category Name:");
                    if (catName) {
                      setEditingRestaurant({
                        ...editingRestaurant,
                        gallery: {
                          ...(editingRestaurant.gallery || {}),
                          [catName]: [],
                        },
                      });
                    }
                  }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all shadow-lg flex items-center gap-2"
                >
                  <Plus size={14} /> New Category
                </button>
              </div>

              <div className="space-y-16">
                {/* Default Food Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3 text-left">
                      <Soup className="text-brand" size={20} />
                      <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                        Food Images
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingRestaurant({
                          ...editingRestaurant,
                          foodImages: [
                            ...(editingRestaurant.foodImages || []),
                            "",
                          ],
                        })
                      }
                      className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-brand hover:text-brand transition-all shadow-sm flex items-center gap-2"
                    >
                      <Plus size={14} /> Add Asset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {(editingRestaurant.foodImages || []).map((img, i) => (
                      <div
                        key={i}
                        className="relative group aspect-[4/3] rounded-[32px] overflow-hidden border-2 border-white bg-slate-100 shadow-lg transition-all hover:scale-[1.02]"
                      >
                        <img
                          src={img || RESTAURANT_IMAGE_FALLBACK}
                          alt={`Food ${i}`}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-6 space-y-4">
                          <input
                            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-white text-[10px] font-bold outline-none"
                            value={img}
                            onChange={(e) => {
                              const next = [
                                ...(editingRestaurant.foodImages || []),
                              ];
                              next[i] = e.target.value;
                              setEditingRestaurant({
                                ...editingRestaurant,
                                foodImages: next,
                              });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRestaurant({
                                ...editingRestaurant,
                                foodImages:
                                  editingRestaurant.foodImages?.filter(
                                    (_, idx) => idx !== i,
                                  ),
                              })
                            }
                            className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ambience Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3 text-left">
                      <UtensilsCrossed className="text-brand" size={20} />
                      <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                        Ambience & Interior
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingRestaurant({
                          ...editingRestaurant,
                          ambienceImages: [
                            ...(editingRestaurant.ambienceImages || []),
                            "",
                          ],
                        })
                      }
                      className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-brand hover:text-brand transition-all shadow-sm flex items-center gap-2"
                    >
                      <Plus size={14} /> Add Asset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {(editingRestaurant.ambienceImages || []).map((img, i) => (
                      <div
                        key={i}
                        className="relative group aspect-[4/3] rounded-[32px] overflow-hidden border-2 border-white bg-slate-100 shadow-lg transition-all hover:scale-[1.02]"
                      >
                        <img
                          src={img || RESTAURANT_IMAGE_FALLBACK}
                          alt={`Ambience ${i}`}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-6 space-y-4">
                          <input
                            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-white text-[10px] font-bold outline-none"
                            value={img}
                            onChange={(e) => {
                              const next = [
                                ...(editingRestaurant.ambienceImages || []),
                              ];
                              next[i] = e.target.value;
                              setEditingRestaurant({
                                ...editingRestaurant,
                                ambienceImages: next,
                              });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRestaurant({
                                ...editingRestaurant,
                                ambienceImages:
                                  editingRestaurant.ambienceImages?.filter(
                                    (_, idx) => idx !== i,
                                  ),
                              })
                            }
                            className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Gallery Categories */}
                {Object.entries(editingRestaurant.gallery || {}).map(
                  ([category, images]) => (
                    <div key={category} className="space-y-6">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3 text-left">
                          <Image className="text-brand" size={20} />
                          <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                            {category}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const nextGallery = {
                                ...editingRestaurant.gallery,
                              };
                              delete nextGallery[category];
                              setEditingRestaurant({
                                ...editingRestaurant,
                                gallery: nextGallery,
                              });
                            }}
                            className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                            Delete Category
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextGallery = {
                                ...editingRestaurant.gallery,
                              };
                              nextGallery[category] = [
                                ...(nextGallery[category] || []),
                                "",
                              ];
                              setEditingRestaurant({
                                ...editingRestaurant,
                                gallery: nextGallery,
                              });
                            }}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all shadow-lg flex items-center gap-2"
                          >
                            <Plus size={14} /> Add to {category}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {(images || []).map((img, i) => (
                          <div
                            key={i}
                            className="relative group aspect-[4/3] rounded-[32px] overflow-hidden border-2 border-white bg-slate-100 shadow-lg transition-all hover:scale-[1.02]"
                          >
                            <img
                              src={img || RESTAURANT_IMAGE_FALLBACK}
                              alt={`${category} ${i}`}
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-6 space-y-4">
                              <input
                                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-white text-[10px] font-bold outline-none"
                                value={img}
                                onChange={(e) => {
                                  const nextGallery = {
                                    ...editingRestaurant.gallery,
                                  };
                                  nextGallery[category] = [
                                    ...(nextGallery[category] || []),
                                  ];
                                  nextGallery[category][i] = e.target.value;
                                  setEditingRestaurant({
                                    ...editingRestaurant,
                                    gallery: nextGallery,
                                  });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextGallery = {
                                    ...editingRestaurant.gallery,
                                  };
                                  nextGallery[category] = nextGallery[
                                    category
                                  ].filter((_, idx) => idx !== i);
                                  setEditingRestaurant({
                                    ...editingRestaurant,
                                    gallery: nextGallery,
                                  });
                                }}
                                className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-red-600 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                        {(!images || images.length === 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextGallery = {
                                ...editingRestaurant.gallery,
                              };
                              nextGallery[category] = [
                                ...(nextGallery[category] || []),
                                "",
                              ];
                              setEditingRestaurant({
                                ...editingRestaurant,
                                gallery: nextGallery,
                              });
                            }}
                            className="aspect-[4/3] rounded-[32px] border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-brand hover:text-brand transition-all group"
                          >
                            <Plus
                              size={32}
                              className="group-hover:scale-110 transition-transform"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              Add First Image
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3 text-left">
                  <Building2 className="text-brand" size={20} />
                  <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                    Secondary / Exterior
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingRestaurant({
                      ...editingRestaurant,
                      secondaryImages: [
                        ...(editingRestaurant.secondaryImages || []),
                        "",
                      ],
                    })
                  }
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all shadow-lg flex items-center gap-2"
                >
                  <Plus size={14} /> Add Asset
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {(editingRestaurant.secondaryImages || []).map((img, i) => (
                  <div
                    key={i}
                    className="relative group aspect-[4/3] rounded-[32px] overflow-hidden border-2 border-white bg-slate-100 shadow-lg"
                  >
                    <img
                      src={img || RESTAURANT_IMAGE_FALLBACK}
                      alt={`Secondary ${i}`}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center p-6 space-y-4">
                      <input
                        className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-white text-[10px] font-bold outline-none"
                        value={img}
                        onChange={(e) => {
                          const next = [
                            ...(editingRestaurant.secondaryImages || []),
                          ];
                          next[i] = e.target.value;
                          setEditingRestaurant({
                            ...editingRestaurant,
                            secondaryImages: next,
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingRestaurant({
                            ...editingRestaurant,
                            secondaryImages:
                              editingRestaurant.secondaryImages?.filter(
                                (_, idx) => idx !== i,
                              ),
                          })
                        }
                        className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case "menu":
        return (
          <motion.div
            key="menu"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                  Signature Dishes
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setEditingRestaurant({
                      ...editingRestaurant,
                      signatureDishes: [
                        ...(editingRestaurant.signatureDishes || []),
                        { name: "", price: 0, description: "" },
                      ],
                    })
                  }
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all flex items-center gap-2 shadow-xl shadow-slate-900/10"
                >
                  <Plus size={18} /> Add Signature Dish
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(editingRestaurant.signatureDishes || []).map((dish, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-3 bg-slate-50 p-6 rounded-[32px] border border-slate-300 group transition-all hover:bg-white hover:border-brand/30 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand shadow-sm border border-slate-300 group-hover:scale-110 transition-transform shrink-0">
                        <Sparkles size={20} />
                      </div>
                      <div className="flex-grow space-y-3">
                        <input
                          className="w-full bg-transparent border-none font-black text-slate-800 focus:ring-0 p-0 text-sm outline-none placeholder:text-slate-300"
                          value={dish.name}
                          placeholder="Dish Name (e.g. Butter Chicken)"
                          onChange={(e) => {
                            const next = [
                              ...(editingRestaurant.signatureDishes || []),
                            ];
                            next[idx].name = e.target.value;
                            setEditingRestaurant({
                              ...editingRestaurant,
                              signatureDishes: next,
                            });
                          }}
                        />
                        <textarea
                          className="w-full bg-transparent border-none font-bold text-slate-500 focus:ring-0 p-0 text-xs outline-none placeholder:text-slate-300 min-h-[40px] resize-none"
                          value={dish.description}
                          placeholder="Short enticing description..."
                          onChange={(e) => {
                            const next = [
                              ...(editingRestaurant.signatureDishes || []),
                            ];
                            next[idx].description = e.target.value;
                            setEditingRestaurant({
                              ...editingRestaurant,
                              signatureDishes: next,
                            });
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-300/50">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Price (₹)
                        </span>
                        <input
                          type="number"
                          className="w-20 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-brand shadow-sm"
                          value={dish.price || ""}
                          onChange={(e) => {
                            const next = [
                              ...(editingRestaurant.signatureDishes || []),
                            ];
                            next[idx].price = parseInt(e.target.value) || 0;
                            setEditingRestaurant({
                              ...editingRestaurant,
                              signatureDishes: next,
                            });
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingRestaurant({
                            ...editingRestaurant,
                            signatureDishes:
                              editingRestaurant.signatureDishes?.filter(
                                (_, i) => i !== idx,
                              ),
                          })
                        }
                        className="p-2.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {(editingRestaurant.signatureDishes || []).length === 0 && (
                  <div className="col-span-full py-12 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-[32px] opacity-60">
                    <UtensilsCrossed
                      size={32}
                      className="mx-auto text-slate-100 mb-2"
                    />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      No signature dishes added yet
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-12 border-t border-slate-300 space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xl font-display font-black text-slate-950 uppercase tracking-tight">
                    Popular Dishes
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        popularDishes: [
                          ...(editingRestaurant.popularDishes || []),
                          "",
                        ],
                      })
                    }
                    className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all shadow-sm"
                  >
                    <Plus size={14} /> Add Popular Dish Tag
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(editingRestaurant.popularDishes || []).map((tag, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white border border-slate-300 rounded-2xl px-4 py-2 group hover:border-brand shadow-sm transition-all text-left"
                    >
                      <input
                        className="bg-transparent border-none font-bold text-slate-800 focus:ring-0 p-0 text-sm outline-none placeholder:text-slate-300 w-32"
                        value={tag}
                        placeholder="e.g. Spicy"
                        onChange={(e) => {
                          const next = [
                            ...(editingRestaurant.popularDishes || []),
                          ];
                          next[idx] = e.target.value;
                          setEditingRestaurant({
                            ...editingRestaurant,
                            popularDishes: next,
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingRestaurant({
                            ...editingRestaurant,
                            popularDishes:
                              editingRestaurant.popularDishes?.filter(
                                (_, i) => i !== idx,
                              ),
                          })
                        }
                        className="text-slate-300 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 pt-6 border-t border-slate-300">
              <div>
                <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                  Digital Menu Ecosystem
                </h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Manage categories and page overlays
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = [...(editingRestaurant.menuCategories || [])];
                  next.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: "New Section",
                    images: [],
                  });
                  setEditingRestaurant({
                    ...editingRestaurant,
                    menuCategories: next,
                  });
                }}
                className="px-5 py-2.5 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/10 hover:bg-brand/90 transition-all"
              >
                Add Section
              </button>
            </div>

            <div className="space-y-6">
              {(editingRestaurant.menuCategories || []).map((cat, catIdx) => (
                <div
                  key={cat.id}
                  className="bg-slate-50 rounded-[40px] border border-slate-300 p-8 space-y-8 relative group/cat"
                >
                  <div className="flex items-center justify-between gap-6 border-b border-slate-300 pb-6">
                    <div className="flex-grow">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">
                        Category Title
                      </label>
                      <input
                        className="bg-transparent border-none text-2xl font-display font-black text-slate-900 w-full focus:ring-0 p-0 placeholder:opacity-20 uppercase tracking-tight"
                        value={cat.name}
                        placeholder="e.g. CULINARY SPECIALS"
                        onChange={(e) => {
                          const next = [
                            ...(editingRestaurant.menuCategories || []),
                          ];
                          next[catIdx].name = e.target.value;
                          setEditingRestaurant({
                            ...editingRestaurant,
                            menuCategories: next,
                          });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete entire menu section?")) {
                          const next = [
                            ...(editingRestaurant.menuCategories || []),
                          ];
                          next.splice(catIdx, 1);
                          setEditingRestaurant({
                            ...editingRestaurant,
                            menuCategories: next,
                          });
                        }
                      }}
                      className="p-4 bg-white text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/5 flex items-center justify-center shrink-0 border border-red-50"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {(cat.images || []).map((img, imgIdx) => (
                      <div key={imgIdx} className="space-y-4">
                        <div className="relative group/img aspect-[3/4.2] rounded-[32px] overflow-hidden border-4 border-white shadow-2xl bg-white">
                          <img
                            src={img || RESTAURANT_IMAGE_FALLBACK}
                            alt="Menu"
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center p-4">
                            <button
                              type="button"
                              onClick={() => {
                                const next = [
                                  ...(editingRestaurant.menuCategories || []),
                                ];
                                next[catIdx].images.splice(imgIdx, 1);
                                setEditingRestaurant({
                                  ...editingRestaurant,
                                  menuCategories: next,
                                });
                              }}
                              className="bg-red-500 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl"
                            >
                              Purge
                            </button>
                          </div>
                        </div>
                        <input
                          className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-3 text-[10px] font-bold outline-none focus:border-brand shadow-sm"
                          value={img}
                          placeholder="Source URL"
                          onChange={(e) => {
                            const next = [
                              ...(editingRestaurant.menuCategories || []),
                            ];
                            next[catIdx].images[imgIdx] = e.target.value;
                            setEditingRestaurant({
                              ...editingRestaurant,
                              menuCategories: next,
                            });
                          }}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [
                          ...(editingRestaurant.menuCategories || []),
                        ];
                        next[catIdx].images = [
                          ...(next[catIdx].images || []),
                          "",
                        ];
                        setEditingRestaurant({
                          ...editingRestaurant,
                          menuCategories: next,
                        });
                      }}
                      className="aspect-[3/4.2] border-2 border-dashed border-slate-300 rounded-[32px] flex flex-col items-center justify-center text-slate-300 hover:border-brand hover:text-brand hover:bg-white transition-all gap-4 bg-white/30"
                    >
                      <Plus size={40} className="opacity-40" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                        Add Page
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      case "liveMenu":
        return (
          <motion.div
            key="liveMenu"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-8"
          >
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[24px] border border-slate-300">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Takeaway Menu</h3>
                  <p className="text-slate-500 text-sm max-w-md">Manage your live takeaway items, pricing, and availability.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newItem = { id: Date.now().toString(), name: '', price: 0, isAvailable: true };
                    setEditingRestaurant({ ...editingRestaurant, liveMenu: [...(editingRestaurant.liveMenu || []), newItem] });
                  }}
                  className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-transform"
                >
                  <Plus size={16} /> Add Item
                </button>
              </div>

              {(!editingRestaurant.liveMenu || editingRestaurant.liveMenu.length === 0) ? (
                <div className="py-24 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-300">
                   <UtensilsCrossed size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-slate-400 font-bold">No takeaway menu items added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {editingRestaurant.liveMenu.map((item: any, idx: number) => (
                    <div key={item.id} className="bg-white p-6 rounded-[24px] border border-slate-300 shadow-sm relative group hover:shadow-md transition-all">
                      <button 
                         type="button"
                         onClick={() => {
                           const nextMenu = [...(editingRestaurant.liveMenu || [])];
                           nextMenu.splice(idx, 1);
                           setEditingRestaurant({ ...editingRestaurant, liveMenu: nextMenu });
                         }}
                         className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                         <Trash2 size={14} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Item Name</label>
                           <input 
                             type="text"
                             className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-900 border-none focus:ring-2 focus:ring-brand/20 transition-all text-sm"
                             value={item.name}
                             placeholder="E.g. Chicken Burger"
                             onChange={(e) => {
                               const nextMenu = [...(editingRestaurant.liveMenu || [])];
                               nextMenu[idx] = { ...item, name: e.target.value };
                               setEditingRestaurant({ ...editingRestaurant, liveMenu: nextMenu });
                             }}
                           />
                        </div>
                        <div>
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Category</label>
                           <input 
                             type="text"
                             className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-900 border-none focus:ring-2 focus:ring-brand/20 transition-all text-sm"
                             value={item.category || ''}
                             placeholder="E.g. Starter"
                             onChange={(e) => {
                               const nextMenu = [...(editingRestaurant.liveMenu || [])];
                               nextMenu[idx] = { ...item, category: e.target.value };
                               setEditingRestaurant({ ...editingRestaurant, liveMenu: nextMenu });
                             }}
                           />
                        </div>
                        <div>
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Type</label>
                           <select 
                             className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-900 border-none focus:ring-2 focus:ring-brand/20 transition-all text-sm"
                             value={item.isVeg === false ? 'false' : 'true'}
                             onChange={(e) => {
                               const nextMenu = [...(editingRestaurant.liveMenu || [])];
                               nextMenu[idx] = { ...item, isVeg: e.target.value === 'true' };
                               setEditingRestaurant({ ...editingRestaurant, liveMenu: nextMenu });
                             }}
                           >
                             <option value="true">Veg</option>
                             <option value="false">Non-Veg</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Price (₹)</label>
                           <input 
                             type="number"
                             className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-900 border-none focus:ring-2 focus:ring-brand/20 transition-all text-sm"
                             value={item.price || ''}
                             placeholder="E.g. 199"
                             onChange={(e) => {
                               const nextMenu = [...(editingRestaurant.liveMenu || [])];
                               nextMenu[idx] = { ...item, price: parseFloat(e.target.value) || 0 };
                               setEditingRestaurant({ ...editingRestaurant, liveMenu: nextMenu });
                             }}
                           />
                        </div>
                        <div className="md:col-span-2">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Description</label>
                           <textarea 
                             className="w-full px-4 py-3 bg-slate-50 rounded-xl font-medium text-slate-900 border-none focus:ring-2 focus:ring-brand/20 transition-all resize-none h-20 text-sm"
                             value={item.description || ''}
                             placeholder="Item details..."
                             onChange={(e) => {
                               const nextMenu = [...(editingRestaurant.liveMenu || [])];
                               nextMenu[idx] = { ...item, description: e.target.value };
                               setEditingRestaurant({ ...editingRestaurant, liveMenu: nextMenu });
                             }}
                           />
                        </div>
                        <div className="md:col-span-2">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Image URL</label>
                           <input 
                             type="text"
                             className="w-full px-4 py-3 bg-slate-50 rounded-xl font-medium text-slate-900 border-none focus:ring-2 focus:ring-brand/20 transition-all text-sm"
                             value={item.image || ''}
                             placeholder="https://..."
                             onChange={(e) => {
                               const nextMenu = [...(editingRestaurant.liveMenu || [])];
                               nextMenu[idx] = { ...item, image: e.target.value };
                               setEditingRestaurant({ ...editingRestaurant, liveMenu: nextMenu });
                             }}
                           />
                           {item.image && (
                             <img src={item.image} alt={item.name} className="mt-3 w-20 h-20 object-cover rounded-xl border border-slate-300" />
                           )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-300 pt-4">
                        <span className="text-sm font-bold text-slate-700">Available to Order</span>
                        <button 
                          type="button"
                          onClick={() => {
                             const nextMenu = [...(editingRestaurant.liveMenu || [])];
                             nextMenu[idx] = { ...item, isAvailable: !item.isAvailable };
                             setEditingRestaurant({ ...editingRestaurant, liveMenu: nextMenu });
                          }}
                          className={`w-12 h-7 rounded-full transition-colors relative ${item.isAvailable ? 'bg-brand' : 'bg-slate-300'}`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${item.isAvailable ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      case "offers":
        const offers = editingRestaurant.offers || [];
        return (
          <motion.div
            key="offers"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between px-1 border-b border-slate-300 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand/10 text-brand rounded-2xl">
                  <Gift size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                    Active Promotions
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 text-left">
                    Manage deals, promo codes and validity
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = [...offers];
                  next.push({
                    id: Math.random().toString(36).substr(2, 9),
                    title: "New Offer",
                    description: "",
                    promoCode: "",
                    terms: "",
                    validFrom: new Date().toISOString().split("T")[0],
                  });
                  setEditingRestaurant({ ...editingRestaurant, offers: next });
                }}
                className="px-6 py-3 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand/20 hover:bg-brand/90 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Deploy Offer
              </button>
            </div>

            <div className="space-y-6">
              {offers.map((offer, idx) => (
                <div
                  key={offer.id}
                  className="bg-slate-50 p-8 rounded-[40px] border border-slate-300 space-y-6 group transition-all hover:bg-white hover:border-brand/40 shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-6 border-b border-slate-300 pb-6">
                    <div className="flex-grow space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                        Promotion Title
                      </label>
                      <input
                        className="bg-transparent border-none text-xl font-display font-black text-slate-900 w-full focus:ring-0 p-0 placeholder:text-slate-200 uppercase tracking-tight"
                        value={offer.title}
                        placeholder="e.g. FLAT 20% OFF ON DINING"
                        onChange={(e) => {
                          const next = [...offers];
                          next[idx] = { ...offer, title: e.target.value };
                          setEditingRestaurant({
                            ...editingRestaurant,
                            offers: next,
                          });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...offers];
                        next.splice(idx, 1);
                        setEditingRestaurant({
                          ...editingRestaurant,
                          offers: next,
                        });
                      }}
                      className="w-12 h-12 bg-white text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0 border border-slate-300 shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                          <Database size={10} /> Description & Hook
                        </label>
                        <textarea
                          className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 outline-none focus:border-brand transition-all text-sm shadow-sm min-h-[80px] resize-none"
                          value={offer.description || ""}
                          placeholder="Describe the offer value..."
                          onChange={(e) => {
                            const next = [...offers];
                            next[idx] = {
                              ...offer,
                              description: e.target.value,
                            };
                            setEditingRestaurant({
                              ...editingRestaurant,
                              offers: next,
                            });
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Promo Code
                          </label>
                          <input
                            className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-black text-slate-800 outline-none focus:border-brand transition-all text-sm shadow-sm uppercase tracking-widest"
                            value={offer.promoCode || ""}
                            placeholder="e.g. BMT20"
                            onChange={(e) => {
                              const next = [...offers];
                              next[idx] = {
                                ...offer,
                                promoCode: e.target.value,
                              };
                              setEditingRestaurant({
                                ...editingRestaurant,
                                offers: next,
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Valid From
                          </label>
                          <input
                            type="date"
                            className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 outline-none focus:border-brand transition-all text-sm shadow-sm"
                            value={offer.validFrom || ""}
                            onChange={(e) => {
                              const next = [...offers];
                              next[idx] = {
                                ...offer,
                                validFrom: e.target.value,
                              };
                              setEditingRestaurant({
                                ...editingRestaurant,
                                offers: next,
                              });
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Valid Until
                          </label>
                          <input
                            type="date"
                            className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 outline-none focus:border-brand transition-all text-sm shadow-sm"
                            value={offer.validUntil || ""}
                            onChange={(e) => {
                              const next = [...offers];
                              next[idx] = {
                                ...offer,
                                validUntil: e.target.value,
                              };
                              setEditingRestaurant({
                                ...editingRestaurant,
                                offers: next,
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Active For (Meal Types)
                        </label>
                        <div className="flex gap-2">
                          {[
                            { id: "isBreakfast", label: "Breakfast" },
                            { id: "isLunch", label: "Lunch" },
                            { id: "isDinner", label: "Dinner" },
                          ].map((meal) => (
                            <button
                              key={meal.id}
                              type="button"
                              onClick={() => {
                                const next = [...offers];
                                next[idx] = {
                                  ...offer,
                                  [meal.id]:
                                    !offer[meal.id as keyof typeof offer],
                                };
                                setEditingRestaurant({
                                  ...editingRestaurant,
                                  offers: next,
                                });
                              }}
                              className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex-grow",
                                offer[meal.id as keyof typeof offer]
                                  ? "bg-brand text-white border-brand shadow-md"
                                  : "bg-white text-slate-400 border-slate-300 hover:border-slate-300 shadow-sm",
                              )}
                            >
                              {meal.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Fine Print / Terms
                        </label>
                        <textarea
                          className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-500 outline-none focus:border-brand transition-all text-[10px] shadow-sm min-h-[220px] leading-relaxed resize-none"
                          value={offer.terms || ""}
                          placeholder="Terms and conditions..."
                          onChange={(e) => {
                            const next = [...offers];
                            next[idx] = { ...offer, terms: e.target.value };
                            setEditingRestaurant({
                              ...editingRestaurant,
                              offers: next,
                            });
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Enter Image URL for Offer:");
                          if (url) {
                            const next = [...offers];
                            next[idx] = { ...offer, image: url };
                            setEditingRestaurant({
                              ...editingRestaurant,
                              offers: next,
                            });
                          }
                        }}
                        className="w-full py-4 bg-white border border-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand hover:border-brand transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <Image size={16} />
                        {offer.image ? "Change Asset" : "Attach Visual"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {offers.length === 0 && (
                <div className="py-32 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-[48px]">
                  <Gift size={64} className="mx-auto text-slate-100 mb-6" />
                  <p className="text-slate-400 font-bold text-lg">
                    No marketing campaigns pulse active.
                  </p>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">
                    Generate your first promotion above
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        );
      case "ads":
        return (
          <motion.div
            key="ads"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between border-b border-slate-300 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand/10 text-brand rounded-2xl">
                  <Megaphone size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">
                    Advertisement Campaigns
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Manage visual ads and video promos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditingRestaurant({
                    ...editingRestaurant,
                    advertisements: [
                      ...(editingRestaurant.advertisements || []),
                      {
                        id: Math.random().toString(36).substr(2, 9),
                        title: "",
                        description: "",
                        active: true,
                        validFrom: new Date().toISOString().split("T")[0],
                      },
                    ],
                  })
                }
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand transition-all shadow-lg shadow-slate-900/10"
              >
                <Plus size={14} /> Create New Ad
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {(editingRestaurant.advertisements || []).map((ad, idx) => (
                <div
                  key={ad.id}
                  className="bg-slate-50 p-6 rounded-[32px] border border-slate-300 space-y-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-6 flex-grow mr-6 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "w-3 h-3 rounded-full animate-pulse",
                              ad.active ? "bg-green-500" : "bg-slate-300",
                            )}
                          />
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                            Ad Slot #{idx + 1}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [
                              ...(editingRestaurant.advertisements || []),
                            ];
                            next[idx] = { ...ad, active: !ad.active };
                            setEditingRestaurant({
                              ...editingRestaurant,
                              advertisements: next,
                            });
                          }}
                          className={cn(
                            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            ad.active
                              ? "bg-green-100 text-green-600"
                              : "bg-slate-200 text-slate-400",
                          )}
                        >
                          {ad.active ? "Active" : "Paused"}
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Campaign Title
                          </label>
                          <input
                            className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none shadow-sm"
                            value={ad.title}
                            onChange={(e) => {
                              const next = [
                                ...(editingRestaurant.advertisements || []),
                              ];
                              next[idx] = { ...ad, title: e.target.value };
                              setEditingRestaurant({
                                ...editingRestaurant,
                                advertisements: next,
                              });
                            }}
                            placeholder="Monsoon Special Ad..."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            Description / Hook Line
                          </label>
                          <textarea
                            className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none shadow-sm min-h-[80px]"
                            value={ad.description || ""}
                            onChange={(e) => {
                              const next = [
                                ...(editingRestaurant.advertisements || []),
                              ];
                              next[idx] = {
                                ...ad,
                                description: e.target.value,
                              };
                              setEditingRestaurant({
                                ...editingRestaurant,
                                advertisements: next,
                              });
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              Poster Image URL
                            </label>
                            <div className="flex gap-2">
                              <input
                                className="flex-grow px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none shadow-sm"
                                value={ad.image || ""}
                                onChange={(e) => {
                                  const next = [
                                    ...(editingRestaurant.advertisements || []),
                                  ];
                                  next[idx] = { ...ad, image: e.target.value };
                                  setEditingRestaurant({
                                    ...editingRestaurant,
                                    advertisements: next,
                                  });
                                }}
                                placeholder="https://..."
                              />
                              <input
                                type="file"
                                id={`ad-image-upload-${idx}`}
                                className="hidden"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    setIsUploadingGlobal(true);
                                    const url = await uploadImageToStorage(file, 'restaurants');
                                    const next = [
                                      ...(editingRestaurant.advertisements ||
                                        []),
                                    ];
                                    next[idx] = {
                                      ...ad,
                                      image: url,
                                    };
                                    setEditingRestaurant({
                                      ...editingRestaurant,
                                      advertisements: next,
                                    });
                                    setNotification({ type: 'success', message: 'Image uploaded!' });
                                  } catch (err) {
                                    setNotification({ type: 'error', message: 'Failed to upload image' });
                                    console.error(err);
                                  } finally {
                                    setIsUploadingGlobal(false);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  document
                                    .getElementById(`ad-image-upload-${idx}`)
                                    ?.click()
                                }
                                className="p-3.5 bg-white border border-slate-300 rounded-2xl text-slate-400 hover:text-brand transition-all shadow-sm"
                                title="Upload Image"
                              >
                                <Upload size={18} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              YouTube Video Link
                            </label>
                            <div className="flex gap-2">
                              <input
                                className="flex-grow px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none shadow-sm"
                                value={ad.videoUrl || ""}
                                onChange={(e) => {
                                  const next = [
                                    ...(editingRestaurant.advertisements || []),
                                  ];
                                  next[idx] = {
                                    ...ad,
                                    videoUrl: e.target.value,
                                  };
                                  setEditingRestaurant({
                                    ...editingRestaurant,
                                    advertisements: next,
                                  });
                                }}
                                placeholder="https://youtube.com/watch?v=..."
                              />
                              <div className="p-3.5 bg-white border border-slate-300 rounded-2xl text-slate-400 shadow-sm">
                                <Video size={18} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Start Date
                            </label>
                            <input
                              type="date"
                              className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none shadow-sm"
                              value={ad.validFrom || ""}
                              onChange={(e) => {
                                const next = [
                                  ...(editingRestaurant.advertisements || []),
                                ];
                                next[idx] = {
                                  ...ad,
                                  validFrom: e.target.value,
                                };
                                setEditingRestaurant({
                                  ...editingRestaurant,
                                  advertisements: next,
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              End Date
                            </label>
                            <input
                              type="date"
                              className="w-full px-5 py-3.5 bg-white border border-slate-300 rounded-2xl font-bold text-slate-800 focus:border-brand outline-none shadow-sm"
                              value={ad.validUntil || ""}
                              onChange={(e) => {
                                const next = [
                                  ...(editingRestaurant.advertisements || []),
                                ];
                                next[idx] = {
                                  ...ad,
                                  validUntil: e.target.value,
                                };
                                setEditingRestaurant({
                                  ...editingRestaurant,
                                  advertisements: next,
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = editingRestaurant.advertisements?.filter(
                          (_, i) => i !== idx,
                        );
                        setEditingRestaurant({
                          ...editingRestaurant,
                          advertisements: next,
                        });
                      }}
                      className="p-4 bg-white border border-slate-300 text-slate-400 rounded-3xl hover:text-red-500 hover:border-red-500 transition-all shadow-sm"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {(!editingRestaurant.advertisements ||
                editingRestaurant.advertisements.length === 0) && (
                <div className="py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-300">
                  <div className="p-5 bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
                    <Megaphone size={32} className="text-slate-300" />
                  </div>
                  <h4 className="text-xl font-display font-black text-slate-900 uppercase">
                    No Active Campaigns
                  </h4>
                  <p className="text-sm font-bold text-slate-400 mt-2">
                    Create your first advertisement to boost visibility
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        );
      case "system":
        return (
          <motion.div
            key="system"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-6"
          >
            <div className="p-6 bg-red-50 border border-red-100 rounded-3xl space-y-4 shadow-inner">
              <div className="flex items-center gap-4 text-red-600">
                <AlertCircle size={28} />
                <div>
                  <h3 className="text-lg font-display font-black">
                    System Override
                  </h3>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                    Proceed with Caution
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-red-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      Platform Approval
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Public Visibility
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRestaurant({
                        ...editingRestaurant,
                        approved: !editingRestaurant.approved,
                      })
                    }
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all",
                      editingRestaurant.approved
                        ? "bg-emerald-500 text-white"
                        : "bg-red-500 text-white",
                    )}
                  >
                    {editingRestaurant.approved ? "Approved" : "Unapproved"}
                  </button>
                </div>
              </div>
            </div>

            {editingRestaurant.lastModifiedBy && (
              <div className="p-6 bg-slate-900 rounded-3xl text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <History size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                      Modification Trace
                    </p>
                    <p className="text-xs font-bold mt-0.5">
                      Last write by{" "}
                      <span className="text-brand truncate max-w-[150px] inline-block align-middle">
                        {editingRestaurant.lastModifiedBy}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        );
      default:
        return null;
    }
  };

  const stats = [
    {
      label: "Total Added Restaurants",
      value: restaurants.length,
      icon: Store,
      color: "text-purple-600",
      bg: "bg-purple-50",
      onClick: () => setActiveModal("restaurantsMaster"),
    },
    {
      label: "Total Users",
      value: users.length,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      onClick: () => setActiveModal("users"),
    },
    {
      label: "Cities",
      value: cities.length,
      icon: Globe,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      onClick: () => setActiveModal("cities"),
    },
    {
      label: "Cuisines",
      value: cuisines.length,
      icon: Soup,
      color: "text-amber-600",
      bg: "bg-amber-50",
      onClick: () => setActiveModal("cuisines"),
    },
    {
      label: "Total Bookings",
      value: bookings.length,
      icon: Calendar,
      color: "text-brand",
      bg: "bg-brand-light",
    },
  ];

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-brand animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-brand selection:text-white">
      <div className="max-w-7xl mx-auto px-4 py-12 pb-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-display font-black text-white tracking-tight leading-none">
                Admin Hub
              </h1>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-2 opacity-60">
                System Core & Control
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-[350px]">
              <MapPin
                className="absolute left-4 top-1/2 -translate-y-1/2 text-brand"
                size={18}
              />
              <input
                type="text"
                value={importCity}
                onChange={(e) => setImportCity(e.target.value)}
                placeholder="Area, City (e.g. Pune, Mumbai)"
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-slate-800 shadow-sm focus:ring-4 focus:ring-brand/10 outline-none transition-all"
              />
            </div>
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-slate-900/10 hover:bg-brand active:scale-95 transition-all disabled:opacity-50"
            >
              {seeding ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Sparkles size={20} />
              )}
              <span>{seeding ? "Mining Data..." : "Import LIVE"}</span>
            </button>

            <button
              onClick={() => navigate("/admin/onboard")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={20} />
              <span>New Restaurant</span>
            </button>

            <button
              onClick={async () => {
                if (
                  confirm(
                    "This will seed initial cities and cuisines if they are missing. Continue?",
                  )
                ) {
                  await seedData();
                  alert("Seed process completed.");
                }
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
            >
              <Database size={20} />
              <span>Seed Data</span>
            </button>
            <button
              onClick={async () => {
                if (!confirm("This will find all base64 string images in restaurants and migrate them to Firebase Storage. This might take a minute and consume bandwidth. Proceed?")) return;
                
                try {
                  setIsUploadingGlobal(true);
                  setNotification({ type: 'success', message: 'Migrating images... Check console for progress.' });
                  let count = 0;

                  const dataUriToBlob = async (dataUri: string) => {
                    const res = await fetch(dataUri);
                    return await res.blob();
                  };

                  for (const r of restaurants) {
                    let updated = false;
                    const nextR = { ...r };

                    const migrateField = async (field: string) => {
                      const val = nextR[field as keyof Restaurant];
                      if (typeof val === 'string' && val.startsWith('data:image')) {
                        const blob = await dataUriToBlob(val);
                        const file = new File([blob], 'migrated.jpg', { type: blob.type });
                        const url = await uploadImageToStorage(file, 'restaurants');
                        (nextR as any)[field] = url;
                        updated = true;
                        count++;
                      }
                    }
                    const migrateArray = async (field: keyof Restaurant) => {
                      const arr = nextR[field] as string[] | undefined;
                      if (Array.isArray(arr)) {
                        for (let i = 0; i < arr.length; i++) {
                          if (typeof arr[i] === 'string' && arr[i].startsWith('data:image')) {
                            const blob = await dataUriToBlob(arr[i]);
                            const file = new File([blob], 'migrated.jpg', { type: blob.type });
                            const url = await uploadImageToStorage(file, 'restaurants');
                            arr[i] = url;
                            updated = true;
                            count++;
                          }
                        }
                      }
                    }

                    await migrateField('image');
                    await migrateArray('foodImages');
                    await migrateArray('ambienceImages');
                    await migrateArray('secondaryImages');
                    await migrateArray('menuImages');

                    if (nextR.advertisements) {
                      for (const ad of nextR.advertisements) {
                        if (ad.image.startsWith('data:image')) {
                          const blob = await dataUriToBlob(ad.image);
                          const file = new File([blob], 'migrated.jpg', { type: blob.type });
                          const url = await uploadImageToStorage(file, 'restaurants');
                          ad.image = url;
                          updated = true;
                          count++;
                        }
                      }
                    }
                    
                    if (updated && nextR.id) {
                      console.log(`Updating ${nextR.name} with new storage urls...`);
                      await updateDoc(doc(db, "restaurants", nextR.id), { ...nextR });
                    }
                  }
                  
                  setNotification({ type: 'success', message: `Migrated ${count} images to Cloud Storage successfully!` });
                } catch (e: any) {
                  setNotification({ type: 'error', message: 'Migration failed: ' + e.message });
                  console.error(e);
                } finally {
                  setIsUploadingGlobal(false);
                }
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black hover:bg-brand/10 hover:text-brand transition-all"
            >
              <Upload size={20} className={isUploadingGlobal ? "animate-bounce" : ""} />
              <span>Migrate Base64</span>
            </button>
          </div>
        </div>

        {/* Total Value / Revenue Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat) => (
            <motion.button
              key={stat.label}
              whileHover={stat.onClick ? { scale: 1.02 } : {}}
              whileTap={stat.onClick ? { scale: 0.98 } : {}}
              onClick={stat.onClick}
              className={cn(
                "bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl text-left relative overflow-hidden group transition-all",
                stat.onClick && "cursor-pointer hover:border-brand/30",
              )}
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:-rotate-3 shadow-sm",
                  stat.bg,
                  stat.color,
                )}
              >
                <stat.icon size={26} />
              </div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none mb-2 opacity-50">
                {stat.label}
              </p>
              <p className="text-4xl font-display font-black text-white">
                {stat.value}
              </p>

              {stat.onClick && (
                <div className="absolute top-6 right-6 text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings2 size={16} />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Quick Access System Management */}
        <div className="mb-16">
          <h2 className="text-2xl font-display font-black text-vibrant-dark mb-6 flex items-center gap-2">
            <Settings2 className="text-brand" /> System Architecture
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setActiveModal("cities")}
              className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-300 shadow-vibrant hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Globe size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-vibrant-dark">
                    Manage Cities
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Expansion Control
                  </p>
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-slate-300 group-hover:text-brand transition-colors"
              />
            </button>

            <button
              onClick={() => setActiveModal("cuisines")}
              className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-300 shadow-vibrant hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Soup size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-vibrant-dark">
                    Manage Cuisines
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Menu Taxonomy
                  </p>
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-slate-300 group-hover:text-brand transition-colors"
              />
            </button>

            <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-500">
                    Security Layers
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Active & Hardened
                  </p>
                </div>
              </div>
              <CheckCircle className="text-emerald-500" size={20} />
            </div>
          </div>
        </div>

        {/* Main Content Area with Tabs */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-slate-300 shadow-sm w-fit mb-12">
            {[
              { id: "fleet", label: "Fleet Control", icon: Store },
              {
                id: "approvals",
                label: "Review Queue",
                icon: ShieldCheck,
                badge: restaurants.filter(
                  (r) => !r.approved && (r as any).status === "Pending",
                ).length,
              },
              { id: "pulse", label: "Live Pulse", icon: TrendingUp },
              { id: "inventory", label: "System Master", icon: Database },
              { id: "portal", label: "Portal Config", icon: Settings2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all relative",
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50",
                )}
              >
                <tab.icon size={18} />
                {tab.label}
                {tab.badge ? (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "approvals" && (
              <motion.div
                key="approvals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-display font-black text-vibrant-dark tracking-tighter">
                    Review Queue
                  </h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                    Verify new restaurant applications
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {restaurants
                    .filter(
                      (r) => !r.approved && (r as any).status === "Pending",
                    )
                    .map((res) => (
                      <div
                        key={res.id}
                        className="bg-white p-8 rounded-[40px] border border-slate-300 shadow-xl flex flex-col md:flex-row gap-8 items-start"
                      >
                        <div className="w-full md:w-64 aspect-[4/3] rounded-3xl overflow-hidden shrink-0 shadow-lg">
                          <img
                            src={res.image || RESTAURANT_IMAGE_FALLBACK}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        </div>

                        <div className="flex-grow space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-brand bg-brand/10 px-2 py-0.5 rounded-md uppercase tracking-widest">
                                Application #ID-
                                {res.id?.slice(-4).toUpperCase()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 ml-auto">
                                Applied on{" "}
                                {res.createdAt
                                  ? new Date(
                                      res.createdAt.seconds * 1000,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </div>
                            <h3 className="text-2xl font-display font-black text-slate-900 leading-tight">
                              {res.name}
                            </h3>
                            <p className="text-slate-400 font-bold text-sm flex items-center gap-1 mt-1">
                              <MapPin size={14} className="text-brand" />{" "}
                              {res.area}, {res.city}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Cuisines
                              </p>
                              <p className="text-xs font-bold text-slate-700 truncate">
                                {Array.isArray(res.cuisine)
                                  ? res.cuisine.join(", ")
                                  : res.cuisine || "N/A"}
                              </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Contact
                              </p>
                              <p className="text-xs font-bold text-slate-700">
                                {res.contactNumber || "N/A"}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button
                              onClick={() => {
                                if (confirm(`Approve ${res.name}?`)) {
                                  updateDoc(doc(db, "restaurants", res.id!), {
                                    approved: true,
                                    status: "Approved",
                                    updatedAt: serverTimestamp(),
                                  });
                                }
                              }}
                              className="flex-grow bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                              <ShieldCheck size={20} />
                              Approve Application
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Reject ${res.name}?`)) {
                                  updateDoc(doc(db, "restaurants", res.id!), {
                                    approved: false,
                                    status: "Rejected",
                                    updatedAt: serverTimestamp(),
                                  });
                                }
                              }}
                              className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => setEditingRestaurant(res)}
                              className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all"
                            >
                              <Edit2 size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                  {restaurants.filter(
                    (r) => !r.approved && (r as any).status === "Pending",
                  ).length === 0 && (
                    <div className="py-24 text-center bg-white/5 border border-white/5 rounded-[48px]">
                      <ShieldCheck
                        size={64}
                        className="mx-auto text-white/5 mb-6"
                      />
                      <p className="text-slate-400 font-bold text-lg">
                        No pending applications.
                      </p>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mt-2">
                        The system is fully caught up.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "fleet" && (
              <motion.div
                key="fleet"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-display font-black text-vibrant-dark tracking-tighter">
                      Active Fleet Control
                    </h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                      Manage global restaurant network
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {[
                        { id: "all", label: "ALL" },
                        { id: "approved", label: "APPROVED" },
                        { id: "pending", label: "PENDING" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setStatusFilter(f.id as any)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-black transition-all",
                            statusFilter === f.id
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-400 hover:text-slate-600",
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={14}
                      />
                      <input
                        type="text"
                        placeholder="Search name, city, cuisine..."
                        value={resSearchQuery}
                        onChange={(e) => setResSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-4 focus:ring-brand/10 outline-none w-full sm:w-64"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {filteredRestaurants.map((res) => (
                    <div
                      key={res.id}
                      className="bg-white p-6 rounded-[32px] border border-slate-300 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 group hover:shadow-2xl hover:border-brand/20 transition-all duration-500"
                    >
                      <div className="flex items-center gap-6 w-full">
                        <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0 border-4 border-slate-50 shadow-inner group-hover:scale-105 transition-transform">
                          <img
                            src={res.image || RESTAURANT_IMAGE_FALLBACK}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={handleImageError}
                          />
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-display font-black text-vibrant-dark text-xl group-hover:text-brand transition-colors">
                              {res.name}
                            </h4>
                            {!res.approved && (
                              <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">
                                Pending Review
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-3 gap-x-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-brand">
                                <MapPin size={12} />
                              </div>
                              <span className="truncate">
                                {res.location}, {res.city}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-brand">
                                <UtensilsCrossed size={12} />
                              </div>
                              <span>
                                {Array.isArray(res.cuisine)
                                  ? res.cuisine.join(", ")
                                  : res.cuisine}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <div
                                className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-amber-500"
                                onClick={() =>
                                  setEditingRatingRes({
                                    id: res.id,
                                    rating: res.rating,
                                  })
                                }
                              >
                                <Star size={12} className="fill-amber-500" />
                              </div>
                              <span>{res.rating || 0} Rating</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-indigo-500">
                                <Users size={12} />
                              </div>
                              <span>
                                {res.ownerId.slice(-6).toUpperCase()} Owner
                              </span>
                            </div>
                          </div>

                          {res.lastModifiedBy && (
                            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-lg">
                                <History size={10} />
                                <span>
                                  Last Modified: {res.lastModifiedBy} at{" "}
                                  {res.updatedAt
                                    ? formatDate(res.updatedAt)
                                    : "N/A"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingRestaurant(res)}
                          className="p-4 bg-white border border-slate-300 text-slate-400 hover:text-brand hover:border-brand rounded-2xl transition-all shadow-sm hover:shadow-md"
                          title="Edit Full Details"
                        >
                          <Edit2 size={18} />
                        </button>

                        {/* Booking Toggle */}
                        <button
                          onClick={() =>
                            toggleBookingStatus(
                              res.id,
                              res.isBookingEnabled ?? false,
                            )
                          }
                          className={cn(
                            "flex items-center gap-2 px-6 py-4 rounded-2xl text-xs font-black shadow-sm transition-all border",
                            res.isBookingEnabled
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                              : "bg-slate-50 text-slate-400 border-slate-300 hover:bg-slate-100",
                          )}
                        >
                          {res.isBookingEnabled ? (
                            <Power size={16} />
                          ) : (
                            <PowerOff size={16} />
                          )}
                          <span className="hidden lg:inline">Bookings</span>
                        </button>

                        {/* Approval Toggle */}
                        <button
                          onClick={() => toggleApproval(res.id, res.approved)}
                          className={cn(
                            "flex items-center gap-2 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                            res.approved
                              ? "bg-white border border-red-100 text-red-500 hover:bg-red-50"
                              : "bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-brand",
                          )}
                        >
                          {res.approved ? (
                            <XCircle size={16} />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                          {res.approved ? "Revoke" : "Approve"}
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredRestaurants.length === 0 && (
                    <div className="py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-300">
                      <Store
                        size={48}
                        className="mx-auto text-slate-100 mb-4"
                      />
                      <p className="text-slate-400 font-bold">
                        No restaurants found matching your criteria.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "pulse" && (
              <motion.div
                key="pulse"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-display font-black text-vibrant-dark tracking-tighter">
                      Live Business Pulse
                    </h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                      Real-time global reservation stream
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={14}
                      />
                      <input
                        type="text"
                        placeholder="Search bookings..."
                        value={bookingSearchQuery}
                        onChange={(e) => setBookingSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-bold min-w-[200px]"
                      />
                    </div>

                    {/* Date Filter */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {[
                        { id: "all", label: "All Time" },
                        { id: "today", label: "Today" },
                        { id: "upcoming", label: "Upcoming" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setBookingFilter(f.id as any)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-black transition-all",
                            bookingFilter === f.id
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-400 hover:text-slate-600",
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* City Select */}
                    <select
                      value={pulseCityFilter}
                      onChange={(e) => setPulseCityFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-4 py-3 text-xs font-black text-slate-600 outline-none focus:ring-4 focus:ring-brand/10"
                    >
                      <option value="all">All Cities</option>
                      {sortedCities.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-[40px] border border-slate-300 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <TrendingUp size={24} className="text-brand" />
                      <span className="text-xs font-black text-vibrant-gray uppercase tracking-widest">
                        Global Activity Stream
                      </span>
                    </div>
                    <span className="bg-brand/10 text-brand px-4 py-1 rounded-full text-[10px] font-black">
                      {filteredBookings.length} Events Total
                    </span>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {filteredBookings.slice(0, 50).map((booking) => (
                      <div
                        key={booking.id}
                        className="p-8 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center gap-8 group"
                      >
                        <div className="flex items-center gap-6 flex-grow">
                          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex-shrink-0 flex items-center justify-center font-black text-slate-400 text-xl shadow-inner group-hover:bg-brand group-hover:text-white transition-all">
                            {booking.userName.charAt(0)}
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xl font-display font-black text-vibrant-dark">
                                {booking.userName}
                              </p>
                              <div className="flex items-center gap-2 text-slate-400">
                                <Clock size={12} />
                                <p className="text-xs font-bold uppercase tracking-tighter">
                                  {formatDate(booking.dateTime)} at{" "}
                                  {formatTime(booking.dateTime)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <p className="text-sm text-brand font-black bg-brand/5 px-3 py-1 rounded-lg">
                                Reserved: {booking.restaurantName}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                <Users size={14} className="text-slate-300" />
                                <span>{booking.guests} Guests</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 sm:self-end md:self-auto">
                          <span
                            className={cn(
                              "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border",
                              booking.status === "confirmed"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : booking.status === "cancelled"
                                  ? "bg-red-50 text-red-600 border-red-100"
                                  : "bg-amber-50 text-amber-600 border-amber-100",
                            )}
                          >
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}

                    {bookings.length === 0 && (
                      <div className="py-24 text-center">
                        <Calendar
                          size={48}
                          className="mx-auto text-slate-100 mb-4"
                        />
                        <p className="text-slate-400 font-bold">
                          No reservations found in the stream.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "portal" && (
              <motion.div
                key="portal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-display font-black text-vibrant-dark tracking-tighter">
                    Portal Configuration
                  </h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                    Global application settings & maintenance
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[40px] border border-slate-300 shadow-vibrant space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            isComingSoon
                              ? "bg-amber-100 text-amber-600"
                              : "bg-emerald-100 text-emerald-600",
                          )}
                        >
                          {isComingSoon ? (
                            <PowerOff size={24} />
                          ) : (
                            <Power size={24} />
                          )}
                        </div>
                        <div>
                          <p className="font-display font-black text-slate-900 text-lg uppercase tracking-tight">
                            Coming Soon Splash
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Global Maintenance Mode
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateComingSoon(!isComingSoon)}
                        className={cn(
                          "w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner",
                          isComingSoon ? "bg-amber-500" : "bg-slate-200",
                        )}
                      >
                        <motion.div
                          initial={false}
                          animate={{ x: isComingSoon ? 28 : 2 }}
                          className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md"
                        />
                      </button>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-xs text-slate-500 font-bold leading-relaxed">
                        {isComingSoon
                          ? "Currently ENABLED. Regular users will see the coming soon page. Administrators can still access the full application."
                          : "Currently DISABLED. All users have full access to the portal."}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[40px] border border-slate-300 shadow-vibrant flex flex-col justify-center opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                        <Settings size={24} />
                      </div>
                      <div>
                        <p className="font-display font-black text-slate-400 text-lg uppercase tracking-tight">
                          Advanced System Lockdown
                        </p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                          Read-Only Mode (TBD)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "inventory" && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {stats.map((stat) => (
                    <motion.button
                      key={stat.label}
                      whileHover={stat.onClick ? { scale: 1.02, y: -4 } : {}}
                      onClick={stat.onClick}
                      className={cn(
                        "bg-white p-10 rounded-[40px] border border-slate-300 shadow-vibrant text-left relative overflow-hidden group transition-all",
                        stat.onClick && "cursor-pointer hover:border-brand/30",
                      )}
                    >
                      <div
                        className={cn(
                          "w-16 h-16 rounded-[24px] flex items-center justify-center mb-8 transition-transform group-hover:scale-110 group-hover:-rotate-3 shadow-sm",
                          stat.bg,
                          stat.color,
                        )}
                      >
                        <stat.icon size={32} />
                      </div>
                      <p className="text-[10px] font-black text-vibrant-gray uppercase tracking-widest leading-none mb-3 opacity-50">
                        {stat.label}
                      </p>
                      <p className="text-5xl font-display font-black text-vibrant-dark tracking-tighter">
                        {stat.value}
                      </p>
                    </motion.button>
                  ))}
                </div>

                <div>
                  <h2 className="text-2xl font-display font-black text-vibrant-dark mb-8 flex items-center gap-2">
                    <Database className="text-brand" /> Core Master Data Control
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <button
                      onClick={() => setActiveModal("cities")}
                      className="flex items-center justify-between p-10 bg-white rounded-[40px] border border-slate-300 shadow-vibrant hover:-translate-y-2 transition-all duration-500 group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[30px] flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-inner">
                          <Globe size={36} />
                        </div>
                        <div className="text-left">
                          <p className="text-2xl font-display font-black text-vibrant-dark">
                            City Fleet
                          </p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Expansion Geography Control
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={32}
                        className="text-slate-100 group-hover:text-brand group-hover:translate-x-2 transition-all"
                      />
                    </button>

                    <button
                      onClick={() => setActiveModal("cuisines")}
                      className="flex items-center justify-between p-10 bg-white rounded-[40px] border border-slate-300 shadow-vibrant hover:-translate-y-2 transition-all duration-500 group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-[30px] flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-500 shadow-inner">
                          <Soup size={36} />
                        </div>
                        <div className="text-left">
                          <p className="text-2xl font-display font-black text-vibrant-dark">
                            Cuisine Master
                          </p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Menu Taxonomy Management
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={32}
                        className="text-slate-100 group-hover:text-brand group-hover:translate-x-2 transition-all"
                      />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* --- MODALS --- */}
        <AnimatePresence>
          {activeModal === "restaurantsMaster" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedCityForRestaurants(null);
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative z-10"
              >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    {selectedAreaForRestaurants ? (
                      <button
                        onClick={() => setSelectedAreaForRestaurants(null)}
                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white transition-all shadow-sm"
                      >
                        <ChevronRight className="rotate-180" size={20} />
                      </button>
                    ) : selectedCityForRestaurants ? (
                      <button
                        onClick={() => setSelectedCityForRestaurants(null)}
                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white transition-all shadow-sm"
                      >
                        <ChevronRight className="rotate-180" size={20} />
                      </button>
                    ) : null}
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                      <Store size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-black text-slate-900">
                        {selectedAreaForRestaurants
                          ? `Restaurants in ${selectedAreaForRestaurants}`
                          : selectedCityForRestaurants
                            ? `Areas in ${selectedCityForRestaurants}`
                            : "Restaurants Directory"}
                      </h2>
                      <p className="text-vibrant-gray font-bold text-[10px] uppercase tracking-widest mt-1">
                        {selectedAreaForRestaurants
                          ? "Filtered List"
                          : selectedCityForRestaurants
                            ? `Area-wise distribution`
                            : `City-wise distribution`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      setSelectedCityForRestaurants(null);
                      setSelectedAreaForRestaurants(null);
                      setRestaurantMasterSearch("");
                    }}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-50 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto flex-grow bg-slate-50/30">
                  {!selectedCityForRestaurants ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {cityStats.map(([city, count]) => (
                        <button
                          key={city}
                          onClick={() => setSelectedCityForRestaurants(city)}
                          className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:border-brand hover:shadow-lg transition-all group flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="font-display font-bold text-slate-900 text-lg group-hover:text-brand truncate">
                              {city}
                            </p>
                            <p className="text-xs text-vibrant-gray font-medium mt-1">
                              View areas
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-brand text-lg">
                            {count}
                          </div>
                        </button>
                      ))}
                      {cityStats.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                          <p className="text-slate-400 font-bold">
                            No restaurants found in any city.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : !selectedAreaForRestaurants ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {areaStats.map(([area, count]) => (
                        <button
                          key={area}
                          onClick={() => setSelectedAreaForRestaurants(area)}
                          className="bg-white border border-gray-100 rounded-2xl p-6 text-left hover:border-brand hover:shadow-lg transition-all group flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="font-display font-bold text-slate-900 text-lg group-hover:text-brand truncate">
                              {area}
                            </p>
                            <p className="text-xs text-vibrant-gray font-medium mt-1">
                              View restaurants
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center font-black text-brand text-lg shrink-0">
                            {count}
                          </div>
                        </button>
                      ))}
                      {areaStats.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                          <p className="text-slate-400 font-bold">
                            No restaurants found in this city.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="relative">
                        <Search
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-vibrant-gray opacity-50"
                          size={20}
                        />
                        <input
                          type="text"
                          placeholder="Filter restaurants by name or cuisine..."
                          className="w-full bg-white border border-gray-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-brand transition-colors font-bold"
                          value={restaurantMasterSearch}
                          onChange={(e) =>
                            setRestaurantMasterSearch(e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-4">
                        {restaurants
                          .filter(
                            (r) =>
                              (r.city || "Unknown") ===
                              selectedCityForRestaurants,
                          )
                          .filter(
                            (r) =>
                              (r.location || "Unknown") ===
                              selectedAreaForRestaurants,
                          )
                          .filter((r) =>
                            restaurantMasterSearch
                              ? r.name
                                  .toLowerCase()
                                  .includes(
                                    restaurantMasterSearch.toLowerCase(),
                                  ) ||
                                (Array.isArray(r.cuisine)
                                  ? r.cuisine.join(" ")
                                  : r.cuisine || ""
                                )
                                  .toLowerCase()
                                  .includes(
                                    restaurantMasterSearch.toLowerCase(),
                                  )
                              : true,
                          )
                          .map((res) => (
                            <div
                              key={res.id}
                              className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-6">
                                <img
                                  src={res.image || RESTAURANT_IMAGE_FALLBACK}
                                  alt={res.name}
                                  className="w-20 h-20 rounded-xl object-cover"
                                />
                                <div>
                                  <h3 className="font-display font-black text-slate-900 text-lg">
                                    {res.name}
                                  </h3>
                                  <div className="flex items-center gap-3 mt-2 text-xs font-bold">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                      {Array.isArray(res.cuisine)
                                        ? res.cuisine.join(", ")
                                        : res.cuisine}
                                    </span>
                                    <span className="text-slate-400">
                                      {res.location}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">
                                    Status
                                  </p>
                                  {res.approved ? (
                                    <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                                      <CheckCircle size={14} /> Approved
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                                      <AlertCircle size={14} /> Pending
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setActiveModal(null);
                                    setEditingRestaurant(res);
                                    setActiveEditTab("general");
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
          {activeModal === "users" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-vibrant-dark/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="bg-white w-full h-full relative z-10 overflow-hidden flex flex-col"
              >
                <div className="p-10 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                  <div>
                    <h2 className="text-3xl font-display font-black text-vibrant-dark">
                      Member Directory
                    </h2>
                    <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">
                      {users.length} Registered Nodes
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-brand transition-all flex items-center gap-2 font-black shadow-xl"
                  >
                    <X size={20} />
                    <span>Close Directory</span>
                  </button>
                </div>

                <div className="p-10 bg-slate-50 border-b border-gray-100">
                  <div className="max-w-4xl mx-auto relative">
                    <Search
                      className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
                      size={20}
                    />
                    <input
                      type="text"
                      placeholder="Search users by name, email, or restaurant..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-16 pr-8 py-6 bg-white border border-slate-300 rounded-[32px] outline-none focus:ring-8 focus:ring-brand/5 font-bold text-xl text-slate-800 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto px-10 pb-20">
                  <div className="max-w-7xl mx-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-300">
                          <th className="py-8">Profile & Identity</th>
                          <th className="py-8">Business & Location</th>
                          <th className="py-8">Access Level</th>
                          <th className="py-8">Contact</th>
                          <th className="py-8">Onboarded</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {usersWithBiz.map((u) => (
                          <tr
                            key={u.uid}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-8">
                              <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-[20px] bg-brand/10 border border-brand/20 flex items-center justify-center overflow-hidden shrink-0">
                                  {u.photoURL ? (
                                    <img
                                      src={u.photoURL}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="font-black text-brand text-lg">
                                      {u.displayName?.charAt(0) ||
                                        u.email.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-black text-vibrant-dark text-xl leading-tight">
                                    {u.displayName || "Anonymous"}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    UID: {u.uid.slice(-8).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-8">
                              {u.bizName ? (
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-brand">
                                    {u.bizName}
                                  </span>
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase mt-1">
                                    <MapPin size={10} />
                                    {u.bizCity}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-slate-300 italic">
                                  No business linked
                                </span>
                              )}
                            </td>
                            <td className="py-8">
                              <span
                                className={cn(
                                  "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                                  u.role === "admin"
                                    ? "bg-purple-50 text-purple-600 border-purple-100"
                                    : u.role === "owner"
                                      ? "bg-amber-50 text-amber-600 border-amber-100"
                                      : "bg-slate-100 text-slate-500 border-slate-300",
                                )}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-8">
                              <span className="text-sm font-bold text-slate-500">
                                {u.email}
                              </span>
                            </td>
                            <td className="py-8">
                              <span className="text-xs font-bold text-slate-400">
                                {u.createdAt?.toDate
                                  ? formatDate(u.createdAt)
                                  : "Initial Onboarding"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {activeModal === "cities" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveModal(null)}
                className="absolute inset-0 bg-vibrant-dark/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="p-10 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0">
                  <div>
                    <h2 className="text-3xl font-display font-black text-vibrant-dark">
                      City Fleet
                    </h2>
                    <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">
                      Manage geography and market expansion
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-64">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search cities..."
                        value={citySearchQuery}
                        onChange={(e) => setCitySearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:ring-4 focus:ring-brand/10 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setEditingCity({
                            name: "",
                            image: "",
                            lat: 0,
                            lng: 0,
                            isPopular: true,
                            isKnown: true,
                          });
                          setCitySearchQuery("");
                          setActiveModal("addCity");
                        }}
                        className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-brand/20 hover:scale-105 transition-all"
                      >
                        <Plus size={18} />
                        <span>Add City</span>
                      </button>
                      <button
                        onClick={() => setActiveModal(null)}
                        className="p-3 bg-slate-100 rounded-full shrink-0"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-10 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow content-start min-h-0">
                  {cities
                    .filter((c) =>
                      c.name
                        .toLowerCase()
                        .includes(citySearchQuery.toLowerCase()),
                    )
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((city) => (
                      <div
                        key={city.id}
                        className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-300 group hover:border-brand transition-all shrink-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm bg-white">
                            <img
                              src={city.image || RESTAURANT_IMAGE_FALLBACK}
                              alt={city.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="text-xl font-black text-vibrant-dark block">
                              {city.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {city.isPopular && (
                                <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                  Popular
                                </span>
                              )}
                              {city.isKnown && (
                                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">
                                  Known
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCity(city);
                              setActiveModal("addCity");
                            }}
                            className="p-2 bg-white text-slate-400 hover:text-brand rounded-lg transition-colors border border-slate-300"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}

                  {cities.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <Globe
                        size={48}
                        className="mx-auto text-slate-200 mb-4"
                      />
                      <p className="text-slate-400 font-bold">
                        No cities deployed yet.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
          {/* Add/Edit City Modal */}
          {activeModal === "addCity" && editingCity && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveModal("cities")}
                className="absolute inset-0 bg-vibrant-dark/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-md rounded-[32px] overflow-hidden relative z-10 shadow-2xl"
              >
                <form onSubmit={handleSaveCity} className="p-10 space-y-6">
                  <h3 className="text-3xl font-display font-black text-slate-900 mb-8">
                    {editingCity.id ? "Refine City" : "Deploy New City"}
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        City Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-300 focus:border-brand rounded-2xl font-bold outline-none transition-all"
                        placeholder="e.g. Pune"
                        value={editingCity.name}
                        onChange={(e) =>
                          setEditingCity({
                            ...editingCity,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Image URL
                      </label>
                      <input
                        type="url"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-300 focus:border-brand rounded-2xl font-bold outline-none transition-all"
                        placeholder="https://..."
                        value={editingCity.image}
                        onChange={(e) =>
                          setEditingCity({
                            ...editingCity,
                            image: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Banner Image URL
                      </label>
                      <input
                        type="url"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-300 focus:border-brand rounded-2xl font-bold outline-none transition-all"
                        placeholder="https://..."
                        value={editingCity.bannerImage || ""}
                        onChange={(e) =>
                          setEditingCity({
                            ...editingCity,
                            bannerImage: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                          Latitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-300 focus:border-brand rounded-2xl font-bold outline-none transition-all"
                          value={editingCity.lat}
                          onChange={(e) =>
                            setEditingCity({
                              ...editingCity,
                              lat: parseFloat(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                          Longitude
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-300 focus:border-brand rounded-2xl font-bold outline-none transition-all"
                          value={editingCity.lng}
                          onChange={(e) =>
                            setEditingCity({
                              ...editingCity,
                              lng: parseFloat(e.target.value),
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <label className="flex-grow flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer">
                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                          Popular
                        </span>
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-brand"
                          checked={editingCity.isPopular}
                          onChange={(e) =>
                            setEditingCity({
                              ...editingCity,
                              isPopular: e.target.checked,
                            })
                          }
                        />
                      </label>
                      <label className="flex-grow flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer">
                        <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
                          Known
                        </span>
                        <input
                          type="checkbox"
                          className="w-5 h-5 accent-brand"
                          checked={editingCity.isKnown}
                          onChange={(e) =>
                            setEditingCity({
                              ...editingCity,
                              isKnown: e.target.checked,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button
                      type="submit"
                      className="flex-grow bg-brand text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-brand/20 active:scale-95 transition-all"
                    >
                      {editingCity.id ? "Save Changes" : "Deploy City"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModal("cities")}
                      className="px-8 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
          {/* Cuisines Modal */}
          {activeModal === "cuisines" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveModal(null)}
                className="absolute inset-0 bg-vibrant-dark/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="p-10 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 flex-shrink-0">
                  <div>
                    <h2 className="text-3xl font-display font-black text-vibrant-dark">
                      Cuisine Menu
                    </h2>
                    <p className="text-slate-500 font-bold mt-1 uppercase text-[10px] tracking-widest">
                      Manage flavors and category tags
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-64">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search cuisines..."
                        value={cuisineSearchQuery}
                        onChange={(e) => setCuisineSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold focus:ring-4 focus:ring-brand/10 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setEditingCuisine({
                            name: "",
                            image: "",
                            description: "",
                          });
                          setCuisineSearchQuery("");
                          setActiveModal("addCuisine");
                        }}
                        className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
                      >
                        <Plus size={18} />
                        <span>Add Cuisine</span>
                      </button>
                      <button
                        onClick={() => setActiveModal(null)}
                        className="p-3 bg-slate-100 rounded-full shrink-0"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-10 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow content-start min-h-0">
                  {cuisines
                    .filter((c) =>
                      c.name
                        .toLowerCase()
                        .includes(cuisineSearchQuery.toLowerCase()),
                    )
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((cuisine) => (
                      <div
                        key={cuisine.id}
                        className="bg-white rounded-[32px] border border-slate-300 overflow-hidden group hover:border-amber-500 transition-all flex flex-col shadow-sm shrink-0"
                      >
                        <div className="h-48 relative">
                          <img
                            src={cuisine.image || RESTAURANT_IMAGE_FALLBACK}
                            alt={cuisine.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <h4 className="absolute bottom-4 left-6 text-white font-black text-xl">
                            {cuisine.name}
                          </h4>
                        </div>
                        <div className="p-6 flex-grow flex flex-col justify-between">
                          <p className="text-xs text-slate-500 font-bold leading-relaxed">
                            {cuisine.description}
                          </p>
                          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-300/50">
                            <button
                              onClick={() => {
                                setEditingCuisine(cuisine);
                                setActiveModal("addCuisine");
                              }}
                              className="flex-grow flex items-center justify-center gap-2 bg-white text-slate-600 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-300 hover:border-amber-500 hover:text-amber-500 transition-all"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                  {cuisines.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <Soup size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold">
                        No cuisines added yet.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
          {/* Add/Edit Cuisine Modal */}
          {activeModal === "addCuisine" && editingCuisine && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveModal("cuisines")}
                className="absolute inset-0 bg-vibrant-dark/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-md rounded-[32px] overflow-hidden relative z-10 shadow-2xl"
              >
                <form onSubmit={handleSaveCuisine} className="p-10 space-y-6">
                  <h3 className="text-3xl font-display font-black text-slate-900 mb-8">
                    {editingCuisine.id ? "Refine Flavor" : "Add New Flavor"}
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Cuisine Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-300 focus:border-amber-500 rounded-2xl font-bold outline-none transition-all"
                        placeholder="e.g. Italian"
                        value={editingCuisine.name}
                        onChange={(e) =>
                          setEditingCuisine({
                            ...editingCuisine,
                            name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Image URL
                      </label>
                      <input
                        type="url"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-300 focus:border-amber-500 rounded-2xl font-bold outline-none transition-all"
                        placeholder="https://..."
                        value={editingCuisine.image}
                        onChange={(e) =>
                          setEditingCuisine({
                            ...editingCuisine,
                            image: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Description
                      </label>
                      <textarea
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-300 focus:border-amber-500 rounded-2xl font-bold outline-none transition-all min-h-[100px] resize-none"
                        placeholder="Briefly describe this cuisine..."
                        value={editingCuisine.description}
                        onChange={(e) =>
                          setEditingCuisine({
                            ...editingCuisine,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6">
                    <button
                      type="submit"
                      className="flex-grow bg-amber-500 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
                    >
                      {editingCuisine.id ? "Save Changes" : "Add Cuisine"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModal("cuisines")}
                      className="px-8 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
          {editingRatingRes && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingRatingRes(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden relative z-10 shadow-2xl p-8"
              >
                <h3 className="text-xl font-display font-black text-slate-900 mb-6 tracking-tight">
                  Adjust Restaurant Rating
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-center items-center gap-4 text-4xl font-black text-amber-500 bg-amber-50 py-8 rounded-[24px]">
                    <Star size={32} className="fill-amber-500" />
                    <span>{editingRatingRes.rating}</span>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand"
                      value={editingRatingRes.rating}
                      onChange={(e) =>
                        setEditingRatingRes({
                          ...editingRatingRes,
                          rating: parseFloat(e.target.value),
                        })
                      }
                    />
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                      <span>1.0</span>
                      <span>5.0</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={updateRating}
                      className="flex-grow bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                    >
                      Update Rating
                    </button>
                    <button
                      onClick={() => setEditingRatingRes(null)}
                      className="px-6 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all font-display"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}{" "}
          {editingRestaurant && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingRestaurant(null)}
                className="absolute inset-0 bg-slate-950/95 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="bg-white w-full h-full relative z-10 flex flex-col md:flex-row overflow-hidden"
              >
                {/* Sidebar Navigation - Desktop */}
                <div className="hidden md:flex flex-col w-64 bg-slate-50 border-r border-slate-300 shrink-0">
                  <div className="p-6">
                    <h2 className="text-lg font-display font-black text-slate-900 leading-tight">
                      Master Config
                    </h2>
                    <p className="text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                      {editingRestaurant.name}
                    </p>
                  </div>

                  <div className="flex-grow flex flex-col px-3 gap-0.5">
                    {[
                      { id: "general", label: "Brand Identity", icon: Globe },
                      {
                        id: "operational",
                        label: "Operational Hour",
                        icon: Clock,
                      },
                      {
                        id: "visuals",
                        label: "Gallery & Portfolio",
                        icon: Image,
                      },
                      { id: "menu", label: "Digital Menu", icon: Soup },
                      { id: "liveMenu", label: "Takeaway Menu", icon: UtensilsCrossed },
                      { id: "offers", label: "Promotions", icon: Gift },
                      { id: "ads", label: "Ads", icon: Megaphone },
                      { id: "system", label: "System Control", icon: Settings },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveEditTab(tab.id as any)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          activeEditTab === tab.id
                            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50"
                            : "text-slate-400 hover:text-slate-600 hover:bg-white/50",
                        )}
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            activeEditTab === tab.id
                              ? "bg-brand text-white"
                              : "bg-slate-100",
                          )}
                        >
                          <tab.icon size={14} />
                        </div>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-6 border-t border-slate-300">
                    <div className="p-3 bg-white rounded-xl border border-slate-300">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Restaurant ID
                      </p>
                      <p className="text-[9px] font-mono font-bold text-slate-400 truncate">
                        {editingRestaurant.id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-grow flex flex-col min-w-0 bg-white">
                  {/* Mobile Header / Desktop Top Action Bar */}
                  <div className="px-6 py-2 md:px-8 md:py-3 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex flex-col min-w-0 pr-4">
                      <p className="text-4xl font-display font-black text-slate-900 truncate max-w-[120px] md:max-w-md leading-tight">
                        {editingRestaurant.name}
                      </p>
                      <p className="text-lg font-bold text-slate-400 truncate max-w-[120px] md:max-w-md leading-tight whitespace-nowrap">
                        {editingRestaurant.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                        <div className="flex items-center gap-1.5 px-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Live
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRestaurant({
                                ...editingRestaurant,
                                isOpen: !editingRestaurant.isOpen,
                              })
                            }
                            className={cn(
                              "w-8 h-4 rounded-full relative transition-colors",
                              editingRestaurant.isOpen
                                ? "bg-emerald-500"
                                : "bg-slate-300",
                            )}
                          >
                            <div
                              className={cn(
                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                editingRestaurant.isOpen
                                  ? "left-4.5"
                                  : "left-0.5",
                              )}
                            />
                          </button>
                        </div>
                        <div className="w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-1.5 px-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Booking
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingRestaurant({
                                ...editingRestaurant,
                                isBookingEnabled:
                                  !editingRestaurant.isBookingEnabled,
                              })
                            }
                            className={cn(
                              "w-8 h-4 rounded-full relative transition-colors",
                              editingRestaurant.isBookingEnabled
                                ? "bg-emerald-500"
                                : "bg-slate-300",
                            )}
                          >
                            <div
                              className={cn(
                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                editingRestaurant.isBookingEnabled
                                  ? "left-4.5"
                                  : "left-0.5",
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingRestaurant(null)}
                        className="w-9 h-9 md:w-10 md:h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-all border border-slate-300"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Mobile Tabs */}
                  <div className="md:hidden flex bg-white border-b border-slate-300 overflow-x-auto no-scrollbar scroll-smooth">
                    {[
                      { id: "general", label: "Brand", icon: Globe },
                      { id: "operational", label: "Operating", icon: Clock },
                      { id: "visuals", label: "Media", icon: Image },
                      { id: "menu", label: "Menu", icon: Soup },
                      { id: "liveMenu", label: "Live Menu", icon: UtensilsCrossed },
                      { id: "offers", label: "Offers", icon: Gift },
                      { id: "ads", label: "Ads", icon: Megaphone },
                      { id: "system", label: "System", icon: Settings },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveEditTab(tab.id as any)}
                        className={cn(
                          "py-5 px-6 text-[10px] font-black uppercase tracking-widest relative transition-all whitespace-nowrap",
                          activeEditTab === tab.id
                            ? "text-brand"
                            : "text-slate-400",
                        )}
                      >
                        {tab.label}
                        {activeEditTab === tab.id && (
                          <div className="absolute bottom-0 left-4 right-4 h-1 bg-brand rounded-t-full" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex-grow overflow-y-auto p-4 md:p-6 lg:p-8 bg-white">
                    <div className="max-w-4xl mx-auto">
                      <form
                        id="master-edit-form"
                        onSubmit={handleSaveRestaurant}
                      >
                        <AnimatePresence mode="wait">
                          {renderEditTabs()}
                        </AnimatePresence>
                      </form>
                    </div>
                  </div>

                  <div className="px-6 py-3 md:px-8 md:py-3 border-t border-slate-300 bg-white flex shrink-0">
                    <div className="max-w-4xl mx-auto w-full flex items-center justify-end gap-3">
                      <button
                        type="submit"
                        form="master-edit-form"
                        disabled={isSavingRestaurant}
                        className="w-28 md:w-32 bg-slate-900 text-white h-9 md:h-10 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-brand active:scale-[0.98] transition-all text-[11px] disabled:opacity-50"
                      >
                        {isSavingRestaurant ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span className="uppercase tracking-widest">
                          {isSavingRestaurant ? "Saving..." : "Save"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRestaurant(null)}
                        className="px-4 bg-white text-slate-400 h-9 md:h-10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={cn(
                "fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-xl",
                notification.type === "success"
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white",
              )}
            >
              {notification.type === "success" ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span className="font-black text-sm tracking-tight">
                {notification.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
