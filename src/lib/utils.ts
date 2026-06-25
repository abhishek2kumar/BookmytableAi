import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  targetSize: number = 600
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Set canvas size to the target fixed size (600x600)
  canvas.width = targetSize;
  canvas.height = targetSize;

  // Draw the cropped image onto the target canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
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
  
  return `/${citySlug}/restaurant/${combinedSlug}`;
}

export function getRestaurantBookUrl(restaurant: { id?: string, name?: string, city?: string, location?: string } | null, fallbackId?: string, fallbackName?: string, fallbackLocation?: string): string {
  if (!restaurant && !fallbackId) return '/';
  
  const id = restaurant?.id || fallbackId;
  if (!id) return '/';

  const citySlug = slugify(restaurant?.city || 'ind');
  const nameSlug = slugify(restaurant?.name || fallbackName || 'restaurant');
  const locationSlug = slugify(restaurant?.location || fallbackLocation || '');
  const combinedSlug = locationSlug ? `${nameSlug}-${locationSlug}` : nameSlug;

  return `/${citySlug}/restaurant/${combinedSlug}/book`;
}

export function getRestaurantTakeawayUrl(restaurant: { id?: string, name?: string, city?: string, location?: string } | null): string {
  if (!restaurant || !restaurant.id) return '/';
  
  const citySlug = slugify(restaurant?.city || 'ind');
  const nameSlug = slugify(restaurant?.name || 'restaurant');
  const locationSlug = slugify(restaurant?.location || '');
  const combinedSlug = locationSlug ? `${nameSlug}-${locationSlug}` : nameSlug;
  
  return `/${citySlug}/restaurant/${combinedSlug}/takeaway`;
}

export function getRestaurantTabUrl(restaurant: { id?: string, name?: string, city?: string, location?: string } | null, tab: string): string {
  if (!restaurant || !restaurant.id) return '/';
  
  const citySlug = slugify(restaurant?.city || 'ind');
  const nameSlug = slugify(restaurant?.name || 'restaurant');
  const locationSlug = slugify(restaurant?.location || '');
  const combinedSlug = locationSlug ? `${nameSlug}-${locationSlug}` : nameSlug;
  
  return `/${citySlug}/restaurant/${combinedSlug}/${tab}`;
}

export function formatDate(date: any) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d).replace(/ /g, '-');
}

export function formatTime(date: any) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatAddress(address?: string) {
  if (!address) return '';
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  const statesToRemove = [
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", "haryana", 
    "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur", 
    "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", 
    "tripura", "uttar pradesh", "uttarakhand", "west bengal", "andaman and nicobar islands", "chandigarh", 
    "dadra and nagar haveli and daman and diu", "lakshadweep", "delhi", "puducherry", "india"
  ];

  const filtered = parts.filter(part => {
    const l = part.toLowerCase();
    if (statesToRemove.includes(l)) return false;
    if (/^\d{6}$/.test(l)) return false;
    return true;
  });

  const landmarks = [];
  const others = [];
  for (const p of filtered) {
    const pl = p.toLowerCase();
    if (pl.startsWith('opposite') || pl.startsWith('opp ') || pl.startsWith('opp. ') || pl.startsWith('near ') || pl.startsWith('behind ') || pl.startsWith('beside ') || pl.startsWith('next to ')) {
      landmarks.push(p);
    } else {
      others.push(p);
    }
  }

  if (others.length >= 2 && landmarks.length > 0) {
    const city = others.pop()!;
    const locality = others.pop()!;
    return [...others, ...landmarks, locality, city].join(', ');
  } else if (others.length >= 1 && landmarks.length > 0) {
     const city = others.pop()!;
     return [...others, ...landmarks, city].join(', ');
  }
  
  return filtered.join(', ');
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
    let ranges = [{ open: openStr, close: closeStr }];

    if (daily) {
      if (daily.closed) {
        isClosed = true;
        ranges = [];
      } else if (daily.ranges && daily.ranges.length > 0) {
        openStr = daily.ranges[0].open;
        closeStr = daily.ranges[0].close;
        ranges = daily.ranges;
      }
    }
    return { openStr, closeStr, isClosed, ranges };
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
    if (!currentTimings.isClosed && currentTimings.ranges) {
      for (const range of currentTimings.ranges) {
        const openMin = parseTime(range.open);
        const closeMin = parseTime(range.close);

        if (closeMin > openMin) {
          if (currentMin >= openMin && currentMin < closeMin) return { open: true, closeTime: range.close };
        } else {
          // Overnight: open today from 'open' till EOD, and closes tomorrow morning
          if (currentMin >= openMin) return { open: true, closeTime: range.close };
        }
      }
    }

    // Check if it's still open from yesterday's overnight session
    if (!yesterdayTimings.isClosed && yesterdayTimings.ranges) {
      for (const range of yesterdayTimings.ranges) {
        const yOpenMin = parseTime(range.open);
        const yCloseMin = parseTime(range.close);

        if (yCloseMin < yOpenMin) {
          if (currentMin < yCloseMin) return { open: true, closeTime: range.close };
        }
      }
    }

    return { open: false };
  };

  const currentStatus = checkIsOpen();

  if (currentStatus.open) {
    const closeMin = parseTime(currentStatus.closeTime!);
    let diff = closeMin - currentMin;
    if (diff < 0) {
      diff += 24 * 60; // handle overnight wrap-around correctly
    }
    if (diff <= 60 && diff > 0) {
      return { 
        displayText: `Closing soon at ${currentStatus.closeTime}`,
        color: 'text-amber-500',
        isClosed: false,
        isOpen: true,
        closeTime: currentStatus.closeTime,
        closeMinDiff: diff
      };
    }
    return { 
      displayText: `Open till ${currentStatus.closeTime}`,
      color: 'text-vibrant-success',
      isClosed: false,
      isOpen: true,
      closeTime: currentStatus.closeTime,
      closeMinDiff: diff > 0 ? diff : diff + 24 * 60
    };
  }

  let opensLaterToday = false;
  let nextOpenStr = '';

  if (!currentTimings.isClosed && currentTimings.ranges) {
    for (const range of currentTimings.ranges) {
      const openMin = parseTime(range.open);
      const closeMin = parseTime(range.close);

      if (closeMin > openMin) {
        if (currentMin < openMin) {
          opensLaterToday = true;
          nextOpenStr = range.open;
          break;
        }
      } else {
        if (currentMin < openMin && currentMin >= closeMin) {
          opensLaterToday = true;
          nextOpenStr = range.open;
          break;
        }
      }
    }
  }

  if (opensLaterToday) {
    return { 
      displayText: `Closed, opens at ${nextOpenStr}`,
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

export function isTakeawayAvailable(restaurant: any): boolean {
  if (!restaurant || restaurant.isTakeawayEnabled === false || (restaurant.liveMenu && restaurant.liveMenu.length === 0)) return false;
  const status = getRestaurantStatus(restaurant);
  if (!status.isOpen) return false;
  // If closeMinDiff is available and <= 30 mins, takeaway ceases
  if (status.closeMinDiff !== undefined && status.closeMinDiff <= 30) return false;
  return true;
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

export function generateSeoFriendlyFileName(originalName: string, context: string = '', restaurantName: string = ''): string {
  const ext = originalName.split('.').pop() || 'jpg';
  const uniqueId = Math.random().toString(36).substring(2, 6);
  
  let parts = [];
  if (restaurantName) parts.push(slugify(restaurantName));
  if (context) parts.push(slugify(context));
  
  // also include a bit of the original name, but slugified
  const originalWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
  if (originalWithoutExt) {
      parts.push(slugify(originalWithoutExt).substring(0, 15));
  }
  
  const baseName = parts.filter(Boolean).join('-') || 'media';
  
  return `${baseName}-${uniqueId}.${ext.toLowerCase()}`;
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
