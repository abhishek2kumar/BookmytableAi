import React from "react";
import { Story } from "../types";

interface StoryAvatarProps {
  stories: Story[];
  userPhoto: string;
  className?: string; // size classes e.g. w-16 h-16
  currentUserId?: string;
}

export default function StoryAvatar({
  stories,
  userPhoto,
  className = "w-16 h-16",
  currentUserId,
}: StoryAvatarProps) {
  const numStories = stories.length;

  if (numStories === 0) {
    return (
      <div className={`${className} rounded-full overflow-hidden`}>
        <img
          src={userPhoto}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Calculate svg segments
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  // Reduce gap for many stories. If 1 story, no gap.
  const gap = numStories > 1 ? (numStories > 10 ? 2 : 5) : 0;
  const segmentLength = (circumference - gap * numStories) / numStories;

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full -rotate-90"
      >
        {stories.map((story, i) => {
          const viewed = story.views?.some((v) => v.userId === currentUserId);
          const strokeColor = viewed ? "#cbd5e1" : "url(#story-gradient)";
          const offset = i * (segmentLength + gap);

          return (
            <circle
              key={story.id}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
              strokeDashoffset={-offset}
              className="transition-colors duration-300"
            />
          );
        })}
        <defs>
          <linearGradient
            id="story-gradient"
            x1="0%"
            y1="100%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#facc15" /> {/* yellow-400 */}
            <stop offset="50%" stopColor="#f97316" /> {/* orange-500 */}
            <stop offset="100%" stopColor="#ec4899" /> {/* pink-500 */}
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-1 p-[3px]">
        <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white">
          <img
            src={userPhoto}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}
