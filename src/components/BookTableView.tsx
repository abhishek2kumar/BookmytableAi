import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ArrowLeft, Clock, Users, CalendarIcon, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from './AuthProvider';
import { useRestaurants } from '../hooks/useFirebase';

import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function BookTableView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const { restaurants } = useRestaurants();

  // Find current restaurant
  const restaurant = useMemo(() => {
    return restaurants.find(r => r.id === id);
  }, [id, restaurants]);

  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [activeTimeCategory, setActiveTimeCategory] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [userPhone, setUserPhone] = useState(profile?.phone || '');
  
  useEffect(() => {
    if (profile?.phone && !userPhone) {
      setUserPhone(profile.phone);
    }
  }, [profile?.phone]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Pre-calculate next 7 days
  const dates = useMemo(() => {
    const allDates = Array.from({ length: 7 }, (_, i) => addDays(startOfToday(), i));
    if (!restaurant?.blackoutDates || restaurant.blackoutDates.length === 0) return allDates;
    return allDates.filter(date => !restaurant.blackoutDates?.includes(format(date, 'yyyy-MM-dd')));
  }, [restaurant]);

  const slotData = useMemo(() => {
    if (restaurant?.slotCategories && restaurant.slotCategories.length > 0) {
      return { categories: restaurant.slotCategories };
    }

    // Generate 30min intervals
    let rawSlots = restaurant?.bookingSlots || [];
    
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

    if (rawSlots.length === 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const timings = getTimingsForDay(dayNames[selectedDate.getDay()]);
      
      const parseTimeForGrouping = (timeStr: string) => {
        if (!timeStr) return 0;
        const p = timeStr.trim().split(' ');
        const period = p.length > 1 ? p[1].toUpperCase() : (timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM');
        const timeParts = p[0].replace(/AM|PM/i, '').split(':');
        const h = parseInt(timeParts[0], 10) || 0;
        const m = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
        let hour = h;
        if (period === 'PM' && hour !== 12) hour += 12;
        if (period === 'AM' && hour === 12) hour = 0;
        return hour * 60 + (m || 0);
      };

      if (!timings.isClosed) {
        const openMin = parseTimeForGrouping(timings.openStr);
        const closeMin = parseTimeForGrouping(timings.closeStr);
        let endMin = closeMin <= openMin ? closeMin + 24 * 60 : closeMin;

        for (let m = openMin; m < endMin; m += 30) {
          const hour = Math.floor((m % (24 * 60)) / 60);
          const min = m % 60;
          rawSlots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        }
      }
    }

    const parseTimeForGrouping = (timeStr: string) => {
      const p = timeStr.trim().split(' ');
      const period = p.length > 1 ? p[1].toUpperCase() : (timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM');
      const timeParts = p[0].replace(/AM|PM/i, '').split(':');
      const h = parseInt(timeParts[0], 10) || 0;
      const m = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
      let hour = h;
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return hour * 60 + (m || 0);
    };

    const lunchSlots: string[] = [];
    const dinnerSlots: string[] = [];
    const breakfastSlots: string[] = [];

    rawSlots.forEach(timeStr => {
      const timeVal = parseTimeForGrouping(timeStr);
      if (timeVal < 12 * 60) { // < 12:00 PM
        breakfastSlots.push(timeStr);
      } else if (timeVal < 18 * 60) { // < 6:00 PM
        lunchSlots.push(timeStr);
      } else {
        dinnerSlots.push(timeStr);
      }
    });

    const categories = [];
    if (breakfastSlots.length > 0) categories.push({ id: 'breakfast', name: 'Breakfast', slots: breakfastSlots });
    if (lunchSlots.length > 0) categories.push({ id: 'lunch', name: 'Lunch', slots: lunchSlots });
    if (dinnerSlots.length > 0) categories.push({ id: 'dinner', name: 'Dinner', slots: dinnerSlots });

    return { categories };
  }, [restaurant, selectedDate]);

  useEffect(() => {
    if (slotData.categories && slotData.categories.length > 0) {
      if (!activeTimeCategory || !slotData.categories.find(c => c.id === activeTimeCategory)) {
        setActiveTimeCategory(slotData.categories[0].id);
      }
    } else {
      setActiveTimeCategory(null);
    }
  }, [slotData, activeTimeCategory]);

  const isTimeInPast = (timeStr: string) => {
    if (!isSameDay(selectedDate, new Date())) return false;
    const p = timeStr.trim().split(' ');
    const period = p.length > 1 ? p[1].toUpperCase() : (timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM');
    let [h, m] = p[0].replace(/AM|PM/i, '').split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const now = new Date();
    return (h * 60 + m) <= (now.getHours() * 60 + now.getMinutes());
  };

  const handleBooking = async () => {
    setIsSubmitting(true);
    
    try {
      if (user && userPhone && userPhone !== profile?.phone) {
        await updateDoc(doc(db, 'users', user.uid), { phone: userPhone });
      }

      await addDoc(collection(db, 'bookings'), {
        restaurantId: restaurant?.id,
        restaurantName: restaurant?.name,
        userId: user?.uid || null,
        userPhone,
        userName: profile?.displayName || 'Guest',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        guests,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setBookingSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Failed to book table. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-vibrant-gray font-medium">Restaurant not found.</p>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 pb-12 flex flex-col items-center">
        <div className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-vibrant text-center border border-slate-100">
           <div className="w-20 h-20 bg-brand text-white rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand/20">
             <Check size={40} strokeWidth={3} />
           </div>
           <h3 className="text-2xl font-display font-black text-slate-900 mb-2">Booking Confirmed!</h3>
           <p className="text-sm font-bold text-slate-500 mb-8">
             A confirmation has been sent to your email and phone.
           </p>
           
           <div className="bg-slate-50/80 rounded-2xl p-6 w-full text-left space-y-4 mb-8 font-medium border border-slate-100">
              <div className="border-b border-slate-200 pb-4 mb-4">
                 <h4 className="font-bold text-slate-900 text-lg mb-1">{restaurant.name}</h4>
                 <p className="text-sm text-slate-500">{restaurant.address || restaurant.location}</p>
              </div>

             <div className="flex justify-between items-center">
               <span className="text-slate-500 text-sm font-bold">Date</span>
               <span className="text-slate-900 text-sm font-black">{format(selectedDate, 'MMM d, yyyy')}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-slate-500 text-sm font-bold">Time</span>
               <span className="text-slate-900 text-sm font-black">{selectedTime}</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm font-bold">Guests</span>
                <span className="text-slate-900 text-sm font-black">{guests}</span>
             </div>
             <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-200">
                <span className="text-brand text-sm font-bold uppercase tracking-wide">Offer Applied</span>
                <span className="text-slate-900 text-sm font-black">Flat 10% off</span>
             </div>
           </div>
           
           <button 
             onClick={() => navigate(`/`)}
             className="w-full bg-slate-900 text-white rounded-xl py-4 font-bold active:scale-[0.98] transition-all"
           >
             Go to Home
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] pb-[100px] md:pb-24">
      {/* Mobile/Desktop App Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center px-4 h-16 md:h-20 shadow-sm">
         <div className="max-w-4xl mx-auto flex items-center w-full">
           <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:scale-95 transition-transform text-slate-700 hover:bg-slate-100">
             <ArrowLeft size={24} />
           </button>
           <div className="ml-3 flex-1 overflow-hidden">
             <h1 className="font-black text-lg md:text-xl text-slate-900 leading-none mb-1">Book Table</h1>
             <p className="text-xs font-bold text-slate-500 truncate">{restaurant.name}, {restaurant.location}</p>
           </div>
         </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        {/* Main Booking Content */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Number of guest(s)</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <button
                  key={num}
                  onClick={() => setGuests(num)}
                  className={cn(
                    "w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg transition-all border-2",
                    guests === num
                      ? "border-amber-500 text-amber-600 bg-amber-50 shadow-[0_4px_12px_rgba(245,158,11,0.15)]"
                      : "border-slate-100 text-slate-700 hover:border-slate-300"
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg mb-4">When are you visiting?</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 mb-6">
              {dates.map((date, i) => (
                <button
                  key={date.toString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "min-w-[80px] py-4 px-2 shrink-0 rounded-[20px] flex flex-col items-center justify-center transition-all border-2",
                    isSameDay(selectedDate, date)
                      ? "border-amber-500 text-amber-600 bg-amber-50 shadow-[0_4px_12px_rgba(245,158,11,0.15)]"
                      : "border-slate-100 text-slate-700 hover:border-slate-300"
                  )}
                >
                  <span className="text-xs uppercase font-bold opacity-70 mb-1">{i === 0 ? 'Today' : format(date, 'EEE')}</span>
                  <span className="text-lg font-black">{format(date, 'd MMM')}</span>
                </button>
              ))}
            </div>

            <h3 className="font-bold text-slate-900 text-sm mb-4">Select the time of day to see the offers</h3>
            <div className="space-y-4">
              {slotData.categories.map((cat) => {
                 const isActive = activeTimeCategory === cat.id;
                 let icon = <Clock size={24} className="text-slate-400" />;
                 if (cat.id === 'breakfast') icon = <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/></svg>;
                 if (cat.id === 'lunch') icon = <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
                 if (cat.id === 'dinner') icon = <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
                 
                 return (
                  <div key={cat.id} className="border border-slate-200 rounded-[20px] overflow-hidden bg-white">
                    <button 
                      onClick={() => setActiveTimeCategory(isActive ? null : cat.id)}
                      className="w-full flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-4">
                        {icon}
                        <div className="text-left">
                           <p className="font-bold text-slate-900">{cat.name}</p>
                           <p className="text-xs text-slate-500 font-medium">
                             {cat.id === 'breakfast' && "10:00 AM to 12:00 PM"}
                             {cat.id === 'lunch' && "12:00 PM to 05:00 PM"}
                             {cat.id === 'dinner' && "05:00 PM to 11:30 PM"}
                           </p>
                        </div>
                      </div>
                      <ChevronRight size={20} className={cn("text-slate-400 transition-transform", isActive ? "rotate-90" : "")} />
                    </button>
                    <AnimatePresence>
                      {isActive && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 overflow-hidden"
                        >
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                             {cat.slots.map((time) => {
                                const past = isTimeInPast(time);
                                return (
                                  <button
                                    key={time}
                                    disabled={past}
                                    onClick={() => setSelectedTime(time)}
                                    className={cn(
                                      "py-3 rounded-xl border border-slate-200 text-[12px] font-bold transition-all flex items-center justify-center focus:outline-none",
                                      selectedTime === time
                                        ? "bg-brand text-white border-brand shadow-sm"
                                        : "bg-white text-slate-700 hover:border-slate-400",
                                      past && "opacity-30 cursor-not-allowed bg-slate-50 text-slate-400"
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
          </div>
          
          <div className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
             <h3 className="font-bold text-slate-900 text-lg mb-4">Select offer to proceed</h3>
             
             <div className="border border-amber-200 rounded-[20px] p-5 relative overflow-hidden bg-[#fffdf5]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="flex items-center gap-3 mb-1">
                   <div className="w-4 h-4 rounded-full border-[5px] border-amber-500 bg-white"></div>
                   <h4 className="font-bold text-slate-900 text-base">Flat 10% off on total bill</h4>
                </div>
                <div className="pl-7 text-sm font-medium text-slate-600">
                   Booking Fee: FREE
                </div>
             </div>
             <p className="mt-4 text-xs text-slate-500">Coupons & additional offers available during bill payment</p>
          </div>

          {(!user || !profile?.phone) && (
            <div className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg mb-4">Contact Details</h3>
              <input
                 type="tel"
                 value={userPhone}
                 onChange={(e) => setUserPhone(e.target.value)}
                 className="w-full px-4 py-3.5 md:py-4 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-amber-400 text-base font-bold placeholder-slate-400"
                 placeholder="Enter your mobile number"
                 pattern="[0-9]*"
                 inputMode="numeric"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Bar for Proceed */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50 pb-[calc(max(env(safe-area-inset-bottom),16px))]">
         <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
             <div className="hidden sm:block">
               <p className="text-[12px] text-slate-500 font-bold mb-1">Offer terms and conditions apply</p>
             </div>
             <button 
                onClick={handleBooking}
                disabled={!selectedTime || isSubmitting || !userPhone || userPhone.length < 10}
                className="w-full sm:w-1/2 py-3.5 md:py-4 bg-brand text-white font-black text-[16px] md:text-lg rounded-[16px] md:rounded-2xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
             >
                {isSubmitting ? 'Processing...' : 'Proceed'}
             </button>
         </div>
      </div>

    </div>
  );
}
