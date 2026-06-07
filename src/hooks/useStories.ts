import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Story } from '../types';

export interface StoryUser {
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  stories: Story[];
}

export function useStories(city?: string, restaurantId?: string) {
  const [usersWithStories, setUsersWithStories] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch stories not expired
    const now = Date.now();
    let q = query(collection(db, 'stories'));

    if (restaurantId) {
       q = query(collection(db, 'stories'), where('restaurantId', '==', restaurantId));
    } else if (city) {
       // Since the city string might be slightly different like "Nearby You", we might just fetch all and filter client side 
       // to avoid complex combinations and index issues
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
       const storiesByRestaurant = new Map<string, StoryUser>();
       
       snapshot.forEach(doc => {
           const data = doc.data() as Story;
           const s: Story = { ...data, id: doc.id };
           
           if (s.expiresAt > now) {
               // If city is specified, check against city. 
               // For "Nearby You" we'll just check if it's there via props maybe? Or just skip city filter for now if it's hard
               if (!city || city.toLowerCase() === 'nearby you' || city.toLowerCase() === 'nearby' || s.city.toLowerCase() === city.toLowerCase() || restaurantId) {
                  if (!storiesByRestaurant.has(s.restaurantId)) {
                      storiesByRestaurant.set(s.restaurantId, {
                          restaurantId: s.restaurantId,
                          restaurantName: s.restaurantName,
                          restaurantImage: s.restaurantImage,
                          stories: []
                      });
                  }
                  storiesByRestaurant.get(s.restaurantId)!.stories.push(s);
               }
           }
       });

       // Sort stories by createdAt ascending within each user
   const result = Array.from(storiesByRestaurant.values()).map(user => {
           user.stories.sort((a, b) => {
               const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
               const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
               return timeA - timeB;
           });
           return user;
       });

       result.sort((a, b) => {
           const timeA = a.stories[a.stories.length - 1].createdAt?.toMillis ? a.stories[a.stories.length - 1].createdAt.toMillis() : Date.now();
           const timeB = b.stories[b.stories.length - 1].createdAt?.toMillis ? b.stories[b.stories.length - 1].createdAt.toMillis() : Date.now();
           return timeB - timeA;
       });

       setUsersWithStories(result);
       setLoading(false);
    }, (err) => {
       console.error("Story fetch error:", err);
       setLoading(false);
    });

    return () => unsubscribe();
  }, [city, restaurantId]);

  return { usersWithStories, loading };
}
