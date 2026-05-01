import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { POPULAR_CITIES, KNOWN_CITIES } from '../constants/cities';
import { CUISINE_DATA } from '../constants/cuisines';

interface City {
  id?: string;
  name: string;
  image: string;
  lat: number;
  lng: number;
  isPopular?: boolean;
  isKnown?: boolean;
}

interface Cuisine {
  id?: string;
  name: string;
  image: string;
  description: string;
}

interface MasterDataContextType {
  cities: City[];
  cuisines: Cuisine[];
  loading: boolean;
  seedData: () => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCities = onSnapshot(collection(db, 'cities'), (snapshot) => {
      const cityData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as City[];
      setCities(cityData);
    });

    const unsubCuisines = onSnapshot(collection(db, 'cuisines'), (snapshot) => {
      const cuisineData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cuisine[];
      setCuisines(cuisineData);
      setLoading(false);
    });

    return () => {
      unsubCities();
      unsubCuisines();
    };
  }, []);

  const seedData = async () => {
    const citiesSnap = await getDocs(collection(db, 'cities'));
    if (citiesSnap.empty) {
      console.log('Seeding cities...');
      for (const city of POPULAR_CITIES) {
        await addDoc(collection(db, 'cities'), {
          ...city,
          isPopular: true,
          isKnown: true,
          createdAt: serverTimestamp()
        });
      }
      // Also add known but not popular ones
      for (const cityName of KNOWN_CITIES) {
        if (!POPULAR_CITIES.find(c => c.name === cityName)) {
          await addDoc(collection(db, 'cities'), {
            name: cityName,
            image: '',
            lat: 0,
            lng: 0,
            isPopular: false,
            isKnown: true,
            createdAt: serverTimestamp()
          });
        }
      }
    }

    const cuisinesSnap = await getDocs(collection(db, 'cuisines'));
    if (cuisinesSnap.empty) {
      console.log('Seeding cuisines...');
      for (const cuisine of CUISINE_DATA) {
        await addDoc(collection(db, 'cuisines'), {
          name: cuisine.name,
          image: cuisine.image,
          description: cuisine.description,
          createdAt: serverTimestamp()
        });
      }
    }
  };

  return (
    <MasterDataContext.Provider value={{ cities, cuisines, loading, seedData }}>
      {children}
    </MasterDataContext.Provider>
  );
}

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (context === undefined) {
    throw new Error('useMasterData must be used within a MasterDataProvider');
  }
  return context;
}
