import React, { createContext, useContext, useState, useEffect } from 'react';

interface Coords {
  lat: number;
  lng: number;
}

interface LocationContextType {
  city: string;
  coords: Coords;
  setCity: (city: string) => void;
  setCoords: (coords: Coords) => void;
  detectLocation: () => Promise<void>;
  isDetecting: boolean;
}

const BANGALORE_COORDS = { lat: 12.9716, lng: 77.5946 };

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState(() => localStorage.getItem('selectedCity') || 'Bangalore');
  const [coords, setCoordsState] = useState<Coords>(() => {
    const saved = localStorage.getItem('selectedCoords');
    return saved ? JSON.parse(saved) : BANGALORE_COORDS;
  });
  const [isDetecting, setIsDetecting] = useState(false);

  const setCity = (newCity: string) => {
    setCityState(newCity);
    localStorage.setItem('selectedCity', newCity);
  };

  const setCoords = (newCoords: Coords) => {
    setCoordsState(newCoords);
    localStorage.setItem('selectedCoords', JSON.stringify(newCoords));
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) return;
    setIsDetecting(true);
    
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          const newCoords = { lat, lng };
          setCoords(newCoords);
          
          try {
            // Use Nominatim (OSM) for free reverse geocoding
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
            const data = await response.json();
            
            // Try to find the city in the response
            const detectedCityRaw = data.address.city || 
                               data.address.town || 
                               data.address.suburb || 
                               data.address.village || 
                               data.address.state || 
                               'Nearby You';
            
            // Note: We'll keep the raw name for now, but in CityView we'll capitalize properly
            setCity(detectedCityRaw);
          } catch (error) {
            console.error("Reverse geocoding error:", error);
            setCity('Nearby You');
          }
          
          setIsDetecting(false);
          resolve();
        },
        (error) => {
          console.error("Location error:", error);
          setIsDetecting(false);
          resolve();
        }
      );
    });
  };

  return (
    <LocationContext.Provider value={{ city, coords, setCity, setCoords, detectLocation, isDetecting }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}
