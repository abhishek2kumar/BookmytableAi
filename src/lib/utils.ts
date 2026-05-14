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

export function getRestaurantUrl(restaurant: { id?: string, name?: string, location?: string } | null, fallbackId?: string, fallbackName?: string, fallbackLocation?: string): string {
  if (!restaurant && !fallbackId) return '/';
  
  const id = restaurant?.id || fallbackId;
  if (!id) return '/';

  const citySlug = slugify(restaurant?.location || fallbackLocation || 'ind');
  const nameSlug = slugify(restaurant?.name || fallbackName || 'restaurant');
  return `/restaurant/${citySlug}/${nameSlug}/${id}`;
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

export const RESTAURANT_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800";

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
