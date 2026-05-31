import React, { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users } from 'lucide-react';

interface UserAvatarProps {
  userId?: string;
  userPhoto?: string;
  userName?: string;
  className?: string;
  iconClassName?: string;
  fallbackSize?: number;
}

export function UserAvatar({ userId, userPhoto, userName, className = "w-6 h-6", iconClassName = "text-brand", fallbackSize = 14 }: UserAvatarProps) {
  const [photo, setPhoto] = useState<string | null>(userPhoto || null);

  useEffect(() => {
    if (!photo && userId) {
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setPhoto(userDoc.data().photoURL || null);
          }
        } catch (err) {
          console.error("Failed to fetch user photo:", err);
        }
      };
      fetchUser();
    }
  }, [userId, photo]);

  if (photo) {
    return <img src={photo} alt={userName || 'Guest'} className={`${className} rounded-full object-cover`} />;
  }

  return (
    <div className={`${className} rounded-full bg-slate-100 flex items-center justify-center`}>
      <Users size={fallbackSize} className={iconClassName} />
    </div>
  );
}
