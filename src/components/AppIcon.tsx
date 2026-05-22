import React from 'react';
import { cn } from '../lib/utils';

interface AppIconProps {
  className?: string;
  size?: number;
}

export default function AppIcon({ className, size = 120 }: AppIconProps) {
  return (
    <div 
      className={cn("shrink-0 relative flex items-center justify-center", className)}
      style={{ 
        width: size, 
        height: size 
      }}
    >
      <img 
        src="/logo.png?v=1.2" 
        alt="Bookmytable"
        className="w-full h-full object-contain block"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
