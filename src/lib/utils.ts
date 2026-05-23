import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-');    // Replace multiple - with single -
}

export function getRestaurantUrl(restaurant: { id?: string, name?: string, city?: string, location?: string } | null, fallbackId?: string, fallbackName?: string, fallbackLocation?: string): string {
  if (!restaurant && !fallbackId) return '/';
  
  const id = restaurant?.id || fallbackId;
  if (!id) return '/';

  const citySlug = slugify(restaurant?.city || 'ind');
  const nameSlug = slugify(restaurant?.name || fallbackName || 'restaurant');
  const locationSlug = slugify(restaurant?.location || fallbackLocation || '');
  const combinedSlug = locationSlug ? `${nameSlug}-${locationSlug}` : nameSlug;
  
  return `/restaurant/${citySlug}/${combinedSlug}`;
}

export function getRestaurantBookUrl(restaurant: { id?: string, name?: string, city?: string, location?: string } | null, fallbackId?: string, fallbackName?: string, fallbackLocation?: string): string {
  if (!restaurant && !fallbackId) return '/';
  
  const id = restaurant?.id || fallbackId;
  if (!id) return '/';

  const citySlug = slugify(restaurant?.city || 'ind');
  const nameSlug = slugify(restaurant?.name || fallbackName || 'restaurant');
  const locationSlug = slugify(restaurant?.location || fallbackLocation || '');
  const combinedSlug = locationSlug ? `${nameSlug}-${locationSlug}` : nameSlug;

  return `/restaurant/${citySlug}/${combinedSlug}/book`;
}

export function getRestaurantTabUrl(restaurant: { id?: string, name?: string, city?: string, location?: string } | null, tab: string): string {
  if (!restaurant || !restaurant.id) return '/';
  
  const citySlug = slugify(restaurant?.city || 'ind');
  const nameSlug = slugify(restaurant?.name || 'restaurant');
  const locationSlug = slugify(restaurant?.location || '');
  const combinedSlug = locationSlug ? `${nameSlug}-${locationSlug}` : nameSlug;
  
  return `/restaurant/${citySlug}/${combinedSlug}/${tab}`;
}

export function formatDate(date: any) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTime(date: any) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function convertTo24Hour(time12h: string): string {
  if (!time12h) return '';
  const [time, modifier] = time12h.split(' ');
  if (!time || !modifier) return time12h; // Return as-is if no modifier
  let [hours, minutes] = time.split(':');
  if (hours === '12') {
    hours = '00';
  }
  if (modifier.toUpperCase() === 'PM') {
    hours = parseInt(hours, 10) + 12 + '';
  }
  return `${hours.padStart(2, '0')}:${minutes}`;
}

export function convertTo12Hour(time24h: string): string {
  if (!time24h) return '';
  const [hoursString, minutes] = time24h.split(':');
  if (!hoursString || !minutes) return time24h;
  let hours = parseInt(hoursString, 10);
  const modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${modifier}`;
}

export function getRestaurantStatus(restaurant: any) {
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
      else if (daily.ranges && daily.ranges.length > 0) {
        openStr = daily.ranges[0].open;
        closeStr = daily.ranges[0].close;
      }
    }
    return { openStr, closeStr, isClosed };
  };

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(' ');
    const period = parts.length > 1 ? parts[1].toUpperCase() : (timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM');
    const time = parts[0].replace(/AM|PM/i, '');
    let [h, m] = time.split(':').map(Number);
    if (!isNaN(h)) {
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
    }
    return (h || 0) * 60 + (m || 0);
  };

  const currentTimings = getTimingsForDay(currentDay);
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
        isClosed: false,
        isOpen: true
      };
    }
    return { 
      displayText: `Open till ${currentStatus.closeTime}`,
      color: 'text-vibrant-success',
      isClosed: false,
      isOpen: true
    };
  }

  const openMin = parseTime(currentTimings.openStr);
  const closeMin = parseTime(currentTimings.closeStr);
  let opensLaterToday = false;

  if (!currentTimings.isClosed) {
    if (closeMin > openMin) {
      if (currentMin < openMin) opensLaterToday = true;
    } else {
      if (currentMin < openMin && currentMin >= closeMin) opensLaterToday = true;
    }
  }

  if (opensLaterToday) {
    return { 
      displayText: `Closed, opens at ${currentTimings.openStr}`,
      color: 'text-red-500',
      isClosed: true,
      isOpen: false
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
           isClosed: true,
           isOpen: false
         };
      }
      nextDayIndex = (nextDayIndex + 1) % 7;
      daysAhead++;
    }
  }
  
  return { displayText: `Closed`, color: 'text-red-500', isClosed: true, isOpen: false };
}

export const RESTAURANT_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800";

export function getRatingColor(rating: number): string {
  if (rating < 3) return 'bg-red-500 text-white border-red-500';
  if (rating < 4) return 'bg-amber-500 text-white border-amber-500';
  return 'bg-[#0b8a4a] text-white border-[#0b8a4a]'; // green color
}

export function getRatingTextColor(rating: number): string {
  if (rating < 3) return 'text-red-500';
  if (rating < 4) return 'text-amber-500';
  return 'text-[#25D366]'; // green color
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  e.currentTarget.src = RESTAURANT_IMAGE_FALLBACK;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d.toFixed(1);
}
