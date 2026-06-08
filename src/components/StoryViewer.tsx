import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Story } from '../types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';

interface StoryUser {
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  stories: Story[];
}

interface Props {
  users: StoryUser[];
  initialUserIndex?: number;
  onClose: () => void;
}

const STORY_DURATION = 5000;

function getTimeAgo(timestamp: any): string {
  if (!timestamp) return 'Just now';
  const time = timestamp.toMillis ? timestamp.toMillis() : Date.now();
  const diffInSeconds = Math.floor((Date.now() - time) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
}

export default function StoryViewer({ users, initialUserIndex = 0, onClose }: Props) {
  const { user } = useAuth();
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentUser = users[currentUserIndex];
  const currentStory = currentUser?.stories[currentStoryIndex];

  // Log view when story changes
  useEffect(() => {
    if (!currentStory || !user) return;
    
    // Check if user already viewed
    const hasViewed = currentStory.views?.some(v => v.userId === user.uid);
    if (!hasViewed) {
      const docRef = doc(db, 'stories', currentStory.id);
      updateDoc(docRef, {
        views: arrayUnion({
          userId: user.uid,
          userName: user.displayName || 'Guest',
          userPhoto: user.photoURL || '',
          viewedAt: new Date().toISOString()
        })
      }).catch(console.error);
    }
  }, [currentStory?.id, user?.uid]);

  // Next Story logic
  const handleNext = () => {
    if (currentStoryIndex < currentUser.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentUserIndex < users.length - 1) {
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose(); // End of all stories
    }
    setImgLoaded(false);
    setProgress(0);
  };

  const handlePrev = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex(prev => prev - 1);
      setCurrentStoryIndex(users[currentUserIndex - 1].stories.length - 1);
    }
    setImgLoaded(false);
    setProgress(0);
  };

  useEffect(() => {
    if (currentStory?.mediaType === 'video') {
        if (videoRef.current) {
            if (isPaused) videoRef.current.pause();
            else videoRef.current.play();
        }
        return;
    }

    if (!imgLoaded || isPaused) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    let startTimestamp: number | null = null;
    const initialProgress = progress; // closure captures current progress safely because effect runs on pause/resume
    
    // Instead of accumulated time, let's just track elapsed from start and pause times.
    const animateProgress = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const addedProgress = (elapsed / STORY_DURATION) * 100;
      const newProgress = initialProgress + addedProgress;

      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
        animationRef.current = requestAnimationFrame(animateProgress);
      }
    };

    animationRef.current = requestAnimationFrame(animateProgress);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPaused, imgLoaded, currentStoryIndex, currentUserIndex, currentStory]);

  useEffect(() => {
    setProgress(0);
  }, [currentStoryIndex, currentUserIndex]);

  // Video time update
  const handleTimeUpdate = () => {
    if (videoRef.current && currentStory?.mediaType === 'video') {
      const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(prog);
    }
  };

  const handleVideoEnded = () => {
      handleNext();
  };

  if (!currentUser || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Container */}
      <div 
        className="w-full max-w-sm h-full max-h-[900px] bg-slate-900 relative overflow-hidden"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Media Background */}
        <div className="absolute inset-0 bg-slate-900">
          {currentStory.mediaType === 'video' ? (
            <video 
              ref={videoRef}
              src={currentStory.mediaUrl} 
              className="w-full h-full object-contain"
              autoPlay 
              playsInline 
              muted={false}
              onEnded={handleVideoEnded}
              onTimeUpdate={handleTimeUpdate}
              onLoadedData={() => setImgLoaded(true)}
            />
          ) : (
             <img 
               src={currentStory.mediaUrl}
               className="w-full h-full object-contain"
               onLoad={() => setImgLoaded(true)}
             />
          )}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-10" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent z-10" />

        {/* Progress Bars */}
        <div className="absolute top-4 inset-x-2 flex gap-1 z-20">
          {currentUser.stories.map((story, idx) => (
            <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-white"
                style={{ 
                  width: `${
                    idx < currentStoryIndex ? 100 : 
                    idx === currentStoryIndex ? progress : 0
                  }%` 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 inset-x-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden bg-slate-200 shrink-0">
               <img src={currentUser.restaurantImage} className="w-full h-full object-cover" />
            </div>
            <div className="text-white drop-shadow-md">
               <h3 className="text-sm font-normal leading-[1.2]">{currentUser.restaurantName}</h3>
               <span className="text-xs text-white/80 font-medium">
                  {getTimeAgo(currentStory.createdAt)}
               </span>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tap areas for nav */}
        <div 
          className="absolute inset-y-20 left-0 w-1/3 z-10" 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        />
        <div 
          className="absolute inset-y-20 right-0 w-2/3 z-10" 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        />
        
        {/* Play/Pause Indicator (Optional, debug) */}
        {/* {isPaused && (
           <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none text-white/50">
             <Pause size={48} />
           </div>
        )} */}

      </div>
    </div>
  );
}
