import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, getDocs, doc, setDoc } from 'firebase/firestore';
import { POPULAR_CITIES, KNOWN_CITIES } from '../constants/cities';
import { CUISINE_DATA } from '../constants/cuisines';

interface City {
  id?: string;
  name: string;
  image: string;
  bannerImage?: string;
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

interface DiningCollection {
  id?: string;
  name: string;
  image: string;
  slug: string;
  description?: string;
  city?: string;
  restaurantIds?: string[];
  isActive: boolean;
  order: number;
}

interface MasterDataContextType {
  cities: City[];
  cuisines: Cuisine[];
  diningCollections: DiningCollection[];
  appSettings: any;
  isComingSoon: boolean;
  loading: boolean;
  seedData: () => Promise<void>;
  updateComingSoon: (status: boolean) => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

export function MasterDataProvider({ children }: { children: React.ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [diningCollections, setDiningCollections] = useState<DiningCollection[]>([]);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [appSettings, setAppSettings] = useState<any>({ platformFee: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCities = onSnapshot(collection(db, 'cities'), (snapshot) => {
      const cityData = snapshot.docs.map(doc => {
        const data = doc.data() as City;
        if (!data.bannerImage) {
           const popularMatch = POPULAR_CITIES.find(c => c.name === data.name);
           if (popularMatch?.bannerImage) {
             data.bannerImage = popularMatch.bannerImage;
           }
        }
        return { id: doc.id, ...data };
      });
      setCities(cityData);
    });

    const unsubGlobalSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(docSnap.data());
      }
    });

    const unsubCuisines = onSnapshot(collection(db, 'cuisines'), (snapshot) => {
      const cuisineData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cuisine[];
      setCuisines(cuisineData);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if (docSnap.exists()) {
        setIsComingSoon(docSnap.data().isComingSoon || false);
      }
      setLoading(false);
    });
    
    const unsubCollections = onSnapshot(collection(db, 'dining_collections'), (snapshot) => {
      const collectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiningCollection));
      setDiningCollections(collectionsData);
    });

    return () => {
      unsubCities();
      unsubCuisines();
      unsubGlobalSettings();
      unsubSettings();
      unsubCollections();
    };
  }, []);

  const updateComingSoon = async (status: boolean) => {
    await setDoc(doc(db, 'settings', 'system'), {
      isComingSoon: status,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

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

    const collectionsSnap = await getDocs(collection(db, 'dining_collections'));
    if (collectionsSnap.empty) {
      console.log('Seeding collections...');
      const seedCollections = [
        { name: 'Perfect Date ❤️', slug: 'perfect-date', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4', description: 'Romantic spots for a perfect evening', isActive: true, order: 1 },
        { name: 'Buffet', slug: 'buffet', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1', description: 'All-you-can-eat venues', isActive: true, order: 2 },
        { name: 'Rooftop', slug: 'rooftop', image: 'https://images.unsplash.com/photo-1544148103-0773bf10d330', description: 'Breathtaking views & great food', isActive: true, order: 3 },
        { name: 'Pure Veg', slug: 'pure-veg', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', description: 'Exclusive vegetarian dining', isActive: true, order: 4 },
        { name: 'Breakfast', slug: 'breakfast', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666', description: 'Start your day right', isActive: true, order: 5 },
        { name: 'Fine Dining', slug: 'fine-dining', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0', description: 'Exquisite culinary experiences', isActive: true, order: 6 },
        { name: 'Cafe', slug: 'cafe', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24', description: 'Coffee, snacks and wifi', isActive: true, order: 7 },
        { name: 'Outdoor Seating', slug: 'outdoor-seating', image: 'https://images.unsplash.com/photo-1525610553991-2bede1a236e2', description: 'Enjoy the weather', isActive: true, order: 8 },
        { name: 'Microbrewery', slug: 'microbrewery', image: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13', description: 'Freshly brewed craft beers', isActive: true, order: 9 },
        { name: 'Live Music', slug: 'live-music', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7', description: 'Great food with live bands', isActive: true, order: 10 }
      ];
      for (const col of seedCollections) {
        await addDoc(collection(db, 'dining_collections'), {
          ...col,
          createdAt: serverTimestamp()
        });
      }
    }
  };

  return (
    <MasterDataContext.Provider value={{ cities, cuisines, diningCollections, appSettings, isComingSoon, loading, seedData, updateComingSoon }}>
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
