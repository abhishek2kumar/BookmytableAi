import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export const RESTAURANT_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800";

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  e.currentTarget.src = RESTAURANT_IMAGE_FALLBACK;
}
