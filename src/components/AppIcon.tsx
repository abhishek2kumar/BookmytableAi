import React from 'react';
import { cn } from '../lib/utils';

interface AppIconProps {
  className?: string;
  size?: number;
  iconColor?: string;
  bgColor?: string;
}

export default function AppIcon({ className, size = 120, iconColor = "#ffffff", bgColor = "#FC8019" }: AppIconProps) {
  return (
    <svg 
      viewBox="0 0 120 120" 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      className={cn("shrink-0", className)}
    >
      {/* Background */}
      <rect width="120" height="120" rx="28" fill={bgColor}/>

      {/* Table frame */}
      <rect x="25" y="25" width="70" height="70" rx="10" fill={iconColor}/>

      {/* Booking slot (center cut) */}
      <rect x="45" y="45" width="30" height="30" rx="6" fill={bgColor}/>

      {/* Subtle vertical line (represents reservation split / B style) */}
      <rect x="58" y="25" width="4" height="70" fill={bgColor}/>
    </svg>
  );
}
