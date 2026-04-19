import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Restaurant, Booking } from '../types';

export function useRestaurants(onlyApproved = true) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'));
    
    if (onlyApproved) {
      q = query(collection(db, 'restaurants'), where('approved', '==', true), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Restaurant[];
      setRestaurants(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onlyApproved]);

  return { restaurants, loading };
}

export function useBookings(uid: string | undefined, role: string | undefined) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid || !role) return;

    let q;
    if (role === 'user') {
      q = query(collection(db, 'bookings'), where('userId', '==', uid), orderBy('dateTime', 'desc'));
    } else if (role === 'owner') {
      // For owners, we'll need to fetch bookings where restaurant.ownerId == uid
      // This is slightly complex for a single query. We'll fetch all and filter or use a better schema.
      // Better schema: Booking has restaurantOwnerId.
      q = query(collection(db, 'bookings'), where('restaurantOwnerId', '==', uid), orderBy('dateTime', 'desc'));
    } else {
      // Admin
      q = query(collection(db, 'bookings'), orderBy('dateTime', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setBookings(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid, role]);

  return { bookings, loading };
}
