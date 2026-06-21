import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, addDays, startOfToday, isSameDay } from "date-fns";
import {
  ArrowLeft,
  Clock,
  Users,
  CalendarIcon,
  ChevronRight,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, getRestaurantUrl, slugify } from "../lib/utils";
import { useAuth } from "./AuthProvider";
import { useRestaurants } from "../hooks/useFirebase";

import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export default function BookTableView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { restaurants, loading: restaurantsLoading } = useRestaurants(true);

  // Find current restaurant
  const restaurant = useMemo(() => {
    let found = restaurants.find((r) => r.id === slug);
    if (!found) {
      found = restaurants.find((r) => {
        const rNameSlug = slugify(r.name || "restaurant");
        const rLocSlug = slugify(r.location || "");
        const combined = rLocSlug ? `${rNameSlug}-${rLocSlug}` : rNameSlug;
        return combined === slug;
      });
    }
    return found;
  }, [slug, restaurants]);

  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [activeTimeCategory, setActiveTimeCategory] = useState<string | null>(
    null,
  );
  const [selectedOffer, setSelectedOffer] = useState<number>(0);
  const [guests, setGuests] = useState(2);
  const [userPhone, setUserPhone] = useState(profile?.phone || "");

  useEffect(() => {
    if (profile?.phone && !userPhone) {
      setUserPhone(profile.phone);
    }
  }, [profile?.phone]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResultStatus, setBookingResultStatus] = useState<"confirmed" | "pending" | null>(null);

  useEffect(() => {
    if (bookingSuccess) {
      window.scrollTo(0, 0);
    }
  }, [bookingSuccess]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Pre-calculate next 7 days
  const dates = useMemo(() => {
    const allDates = Array.from({ length: 7 }, (_, i) =>
      addDays(startOfToday(), i),
    );
return allDates;
  }, [restaurant]);

  const slotData = useMemo(() => {
    // Always use outlet timings
    const parseTimeForGrouping = (timeStr: string) => {
      if (!timeStr) return 0;
      const timeParts = timeStr.trim().split(" ")[0].replace(/AM|PM/i, "").split(":");
      let h = parseInt(timeParts[0], 10) || 0;
      const m = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
      
      const upper = timeStr.toUpperCase();
      if (upper.includes("AM") || upper.includes("PM")) {
        const period = upper.includes("PM") ? "PM" : "AM";
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
      }
      return h * 60 + m;
    };

    let rawSlots: string[] = [];
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
      let endMin = closeMin <= openMin ? closeMin + 24 * 60 : closeMin;

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

    rawSlots.forEach((timeStr) => {
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
    });

    const categories = [];
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

    return { categories };
  }, [restaurant, selectedDate]);

  useEffect(() => {
    if (slotData.categories && slotData.categories.length > 0) {
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

  const activeOffers = useMemo(() => {
    if (!restaurant?.offers) return [];

    const todayStr = format(startOfToday(), "yyyy-MM-dd");

    return restaurant.offers.filter((offer) => {
      if (!offer.validFrom && !offer.validUntil) return true;

      try {
        const fromStr = offer.validFrom ? offer.validFrom.split("T")[0] : null;
        const untilStr = offer.validUntil
          ? offer.validUntil.split("T")[0]
          : null;

        if (fromStr && todayStr < fromStr) return false;
        if (untilStr && todayStr > untilStr) return false;
      } catch (e) {
        return true;
      }
      return true;
    });
  }, [restaurant?.offers]);

  const isTimeInPast = (timeStr: string) => {
    if (!isSameDay(selectedDate, new Date())) return false;
    const timeParts = timeStr.trim().split(" ")[0].replace(/AM|PM/i, "").split(":");
    let h = parseInt(timeParts[0], 10) || 0;
    const m = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
    
    const upper = timeStr.toUpperCase();
    if (upper.includes("AM") || upper.includes("PM")) {
      const period = upper.includes("PM") ? "PM" : "AM";
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
    }
    const now = new Date();
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
  };

  const handleBooking = async () => {
    setIsSubmitting(true);

    try {
      if (user && userPhone && userPhone !== profile?.phone) {
        await updateDoc(doc(db, "users", user.uid), { phone: userPhone });
      }

      const finalStatus = guests <= 10 ? "confirmed" : "pending";

      await addDoc(collection(db, "bookings"), {
        restaurantId: restaurant?.id,
        restaurantOwnerId: restaurant?.ownerId || null,
        restaurantName: restaurant?.name,
        userId: user?.uid || null,
        userPhoto: profile?.photoURL || null,
        userPhone,
        userName: profile?.displayName || "Guest",
        date: format(selectedDate, "yyyy-MM-dd"),
        time: selectedTime,
        guests,
        status: finalStatus,
        source: "Self",
        offer: activeOffers[selectedOffer] || null,
        createdAt: serverTimestamp(),
      });

      // Call server API for Email Confirmation
      try {
        await fetch("/api/confirm-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: user?.email || profile?.email || "",
            userName: profile?.displayName || "Guest",
            restaurantName: restaurant?.name,
            restaurantLocation: restaurant?.location,
            ownerEmail: restaurant?.ownerEmail || "",
            dateTime: `${format(selectedDate, "yyyy-MM-dd")} ${selectedTime}`,
            guests,
            userPhone,
            status: finalStatus,
          }),
        });
      } catch (emailErr) {
        console.error("Email API failed (might be missing API key):", emailErr);
      }

      setBookingResultStatus(finalStatus);
      setBookingSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to book table. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (restaurantsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 border-t border-slate-300">
        <div className="h-full flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-vibrant-gray font-medium">Restaurant not found.</p>
      </div>
    );
  }

  if (bookingSuccess) {
    const isPending = bookingResultStatus === "pending";
    return (
      <div className="min-h-screen bg-slate-50 pt-4 px-4 md:pt-20 pb-12 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 md:p-8 shadow-vibrant text-center border border-slate-300 mt-4 md:mt-0">
          <div className={`w-20 h-20 ${isPending ? 'bg-amber-500 shadow-amber-500/20' : 'bg-brand shadow-brand/20'} text-white rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-xl`}>
            {isPending ? <Clock size={40} strokeWidth={3} /> : <Check size={40} strokeWidth={3} />}
          </div>
          <h3 className="text-2xl mb-2 text-[#363636] font-normal leading-[1.2]">
            {isPending ? "Booking Pending Approval!" : "Booking Confirmed!"}
          </h3>
          <p className="text-sm font-bold text-slate-500 mb-8">
            {isPending 
              ? "Your request for a group size over 10 guests has been sent to the restaurant for approval." 
              : "A confirmation has been sent to your email and phone."}
          </p>

          <div className="bg-slate-50/80 rounded-2xl p-6 w-full text-left space-y-4 mb-8 font-medium border border-slate-300">
            <div className="border-b border-slate-300 pb-4 mb-4">
              <h4 className="text-lg mb-1 uppercase text-[#363636] font-normal leading-[1.2]">
                {restaurant.name}
              </h4>
              <p className="text-sm text-slate-500">
                {restaurant.address || restaurant.location}
              </p>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-bold">Date</span>
              <span className="text-[#363636] text-sm font-normal leading-[1.2]">
                {format(selectedDate, "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-bold">Time</span>
              <span className="text-[#363636] text-sm font-normal leading-[1.2]">
                {selectedTime}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-bold">Guests</span>
              <span className="text-[#363636] text-sm font-normal leading-[1.2]">
                {guests}
              </span>
            </div>
            <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-300">
              <span className="text-brand text-sm font-bold uppercase tracking-wide">
                Offer Applied
              </span>
              <span className="text-[#363636] text-sm font-normal leading-[1.2]">
                Flat 10% off
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                const message = `*Booking Confirmed!*%0A%0ARestaurant: ${restaurant.name}%0ADate: ${format(selectedDate, "MMM d, yyyy")}%0ATime: ${selectedTime}%0AGuests: ${guests}%0A%0ASee you there!`;
                window.open(`https://wa.me/?text=${message}`, "_blank");
              }}
              className="w-full bg-[#25D366] text-white rounded-xl py-4 font-black flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.888 11.888-11.888 3.176 0 6.161 1.237 8.404 3.48s3.479 5.228 3.479 8.408c0 6.556-5.332 11.888-11.888 11.888-1.922 0-3.805-.461-5.491-1.336l-6.491 1.705zm6.076-4.524l.363.216c1.378.82 2.981 1.253 4.636 1.253 4.903 0 8.892-3.989 8.892-8.892 0-2.378-.925-4.613-2.607-6.295s-3.917-2.607-6.285-2.607c-4.903 0-8.892 3.989-8.892 8.892 0 1.637.45 3.231 1.3 4.632l.237.389-.861 3.146 3.217-.844zm11.314-5.318c-.287-.143-1.696-.838-1.959-.933-.262-.096-.452-.143-.642.143-.191.286-.739.933-.906 1.127-.166.19-.333.214-.62.071-.286-.143-1.209-.445-2.304-1.422-.852-.759-1.428-1.697-1.595-1.983-.166-.286-.018-.44.125-.581.129-.126.286-.333.429-.5.143-.167.19-.286.286-.476.095-.19.048-.357-.024-.5-.071-.143-.642-1.547-.881-2.119-.232-.562-.468-.485-.643-.494-.167-.008-.357-.01-.547-.01s-.5.071-.762.357c-.262.286-1.001.977-1.001 2.381 0 1.405 1.024 2.762 1.167 2.952.143.19 2.015 3.076 4.881 4.316.682.295 1.214.471 1.629.603.684.217 1.307.187 1.8.113.55-.083 1.696-.693 1.935-1.36.239-.667.239-1.238.167-1.36-.071-.121-.262-.19-.548-.333z" />
              </svg>
              Send via WhatsApp
            </button>
            <button
              onClick={() => navigate(`/`)}
              className="w-full bg-slate-100 text-[#363636] rounded-xl py-4 active:scale-[0.98] transition-all hover:bg-slate-200 font-normal leading-[1.2]"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] pb-[100px] md:pb-24">
      {/* Mobile/Desktop App Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-300 flex items-center px-4 h-16 md:h-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center w-full">
          <button
            onClick={() => navigate(getRestaurantUrl(restaurant))}
            className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="ml-3 flex-1 overflow-hidden">
            <h1 className="text-lg md:text-xl mb-1 text-[#363636] font-normal leading-[1.2]">
              Book Table
            </h1>
            <p className="text-xs font-bold text-slate-500 truncate">
              {restaurant.name}, {restaurant.location}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        {/* Main Booking Content */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-300">
            <h3 className="text-lg mb-4 text-[#363636] font-normal leading-[1.2]">
              Number of guest(s)
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setGuests(num)}
                  className={cn(
                    "w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg transition-all border-2",
                    guests === num
                      ? "border-amber-500 text-amber-600 bg-amber-50 shadow-[0_4px_12px_rgba(245,158,11,0.15)]"
                      : "border-slate-300 text-slate-700 hover:border-slate-300",
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-300">
            <h3 className="text-lg mb-4 text-[#363636] font-normal leading-[1.2]">
              When are you visiting?
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 mb-6">
              {dates.map((date, i) => (
                <button
                  key={date.toString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "min-w-[80px] py-4 px-2 shrink-0 rounded-[20px] flex flex-col items-center justify-center transition-all border-2",
                    isSameDay(selectedDate, date)
                      ? "border-amber-500 text-amber-600 bg-amber-50 shadow-[0_4px_12px_rgba(245,158,11,0.15)]"
                      : "border-slate-300 text-slate-700 hover:border-slate-300",
                  )}
                >
                  <span className="text-xs uppercase font-bold opacity-70 mb-1">
                    {i === 0 ? "Today" : format(date, "EEE")}
                  </span>
                  <span className="text-lg font-black">
                    {format(date, "d MMM")}
                  </span>
                </button>
              ))}
            </div>

            {restaurant?.blackoutDates?.includes(format(selectedDate, 'yyyy-MM-dd')) ? (<div className="text-center p-8 bg-slate-50 rounded-[20px] text-slate-500 font-medium">Not accepting bookings on this date.</div>) : (<><h3 className="text-sm mb-4 text-[#363636] font-normal leading-[1.2]">
              Select the time of day to see the offers
            </h3>
            <div className="space-y-4">
              {slotData.categories.map((cat) => {
                const isActive = activeTimeCategory === cat.id;
                let icon = <Clock size={24} className="text-slate-400" />;
                if (cat.id === "breakfast")
                  icon = (
                    <svg
                      className="w-6 h-6 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                  );
                if (cat.id === "lunch")
                  icon = (
                    <svg
                      className="w-6 h-6 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  );
                if (cat.id === "dinner")
                  icon = (
                    <svg
                      className="w-6 h-6 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  );

                return (
                  <div
                    key={cat.id}
                    className="border border-slate-300 rounded-[20px] overflow-hidden bg-white"
                  >
                    <button
                      onClick={() =>
                        setActiveTimeCategory(isActive ? null : cat.id)
                      }
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-4">
                        {icon}
                        <div className="text-left">
                          <p className="font-normal text-[#363636] leading-[1.2]">{cat.name}</p>
                          <p className="text-xs text-slate-500 font-medium">
                            {cat.id === "breakfast" && "10:00 AM to 12:00 PM"}
                            {cat.id === "lunch" && "12:00 PM to 05:00 PM"}
                            {cat.id === "dinner" && "05:00 PM to 11:30 PM"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={20}
                        className={cn(
                          "text-slate-400 transition-transform",
                          isActive ? "rotate-90" : "",
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 overflow-hidden"
                        >
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-300">
                            {cat.slots.map((time) => {
                              const past = isTimeInPast(time);
                              return (
                                <button
                                  key={time}
                                  disabled={past}
                                  onClick={() => setSelectedTime(time)}
                                  className={cn(
                                    "py-3 rounded-xl border border-slate-300 text-[12px] font-bold transition-all flex items-center justify-center focus:outline-none",
                                    selectedTime === time
                                      ? "bg-brand text-white border-brand shadow-sm"
                                      : "bg-white text-slate-700 hover:border-slate-400",
                                    past &&
                                      "opacity-30 cursor-not-allowed bg-slate-50 text-slate-400",
                                  )}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            </>
          )}</div>

          <div className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-300">
            <h3 className="text-lg mb-4 text-[#363636] font-normal leading-[1.2]">
              Select offer to proceed
            </h3>

            {activeOffers.length > 0 ? (
              <div className="space-y-3">
                {activeOffers.map((offer, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOffer(idx)}
                    className={cn(
                      "w-full text-left border rounded-[20px] p-5 relative overflow-hidden transition-all",
                      selectedOffer === idx
                        ? "border-amber-500 bg-[#fffdf5] ring-1 ring-amber-500"
                        : "border-slate-300 bg-white hover:border-amber-200",
                    )}
                  >
                    {selectedOffer === idx && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                    )}

                    <div className="flex items-center gap-3 mb-1 relative z-10">
                      <div
                        className={cn(
                          "flex-shrink-0 w-4 h-4 rounded-full border-[5px]",
                          selectedOffer === idx
                            ? "border-amber-500 bg-white"
                            : "border-slate-300 bg-transparent",
                        )}
                      ></div>
                      <h4 className="text-base text-[#363636] font-normal leading-[1.2]">
                        {offer.title}
                      </h4>
                    </div>
                    <div className="pl-7 text-sm font-medium text-slate-600 relative z-10">
                      {offer.description ||
                        "Offers available during bill payment"}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="border border-slate-300 rounded-[20px] p-5 bg-slate-50 relative overflow-hidden text-center">
                <p className="text-sm font-medium text-slate-600">
                  No active offers available
                </p>
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Coupons & additional offers available during bill payment. These
              offers are managed by the restaurant and Bookmytable is not
              responsible for any discrepancies.
            </p>
          </div>

          {(!user || !profile?.phone) && (
            <div className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-300">
              <h3 className="text-lg mb-4 text-[#363636] font-normal leading-[1.2]">
                Contact Details
              </h3>
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-4 py-3.5 md:py-4 rounded-xl border-2 border-slate-300 focus:outline-none focus:border-amber-400 text-base font-bold placeholder-slate-400"
                placeholder="Enter your mobile number"
                pattern="[0-9]*"
                inputMode="numeric"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Bar for Proceed */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50 pb-[calc(max(env(safe-area-inset-bottom),16px))]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-[12px] text-slate-500 font-bold mb-1">
              Offer terms and conditions apply
            </p>
          </div>
          <button
            onClick={handleBooking}
            disabled={
              !selectedTime ||
              isSubmitting ||
              !userPhone ||
              userPhone.length < 10
            }
            className="w-full sm:w-1/2 py-3.5 md:py-4 bg-brand text-white font-black text-[16px] md:text-lg rounded-[16px] md:rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? "Processing..." : "Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}
