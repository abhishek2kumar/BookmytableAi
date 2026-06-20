import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface ScrollCarouselProps {
  children: React.ReactNode;
  className?: string;
  buttonClassName?: string;
}

const ScrollCarousel = forwardRef<HTMLDivElement, ScrollCarouselProps>(({ children, className, buttonClassName }, ref) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollRef = (ref as React.RefObject<HTMLDivElement>) || innerRef;
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const handleScroll = () => {
    if (!innerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = innerRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useImperativeHandle(ref, () => innerRef.current as HTMLDivElement, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (!innerRef.current) return;
    const clientWidth = innerRef.current.clientWidth;
    const scrollAmount = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
    innerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <div className="relative group/carousel">
      {showLeft && (
        <button 
          onClick={() => scroll('left')}
          className={cn("absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-lg text-white hover:bg-black/60 hover:scale-105 transition-all opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0 disabled:hidden", buttonClassName)}
        >
          <ChevronLeft className="w-6 h-6 -ml-0.5" />
        </button>
      )}
      <div 
        ref={innerRef} 
        onScroll={handleScroll}
        className={cn("overflow-x-auto", className)}
      >
        {children}
      </div>
      {showRight && (
        <button 
          onClick={() => scroll('right')}
          className={cn("absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-lg text-white hover:bg-black/60 hover:scale-105 transition-all opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0 disabled:hidden", buttonClassName)}
        >
          <ChevronRight className="w-6 h-6 -mr-0.5" />
        </button>
      )}
    </div>
  );
});

ScrollCarousel.displayName = 'ScrollCarousel';
export default ScrollCarousel;
