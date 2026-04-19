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
        (position) => {
          const newCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCoords(newCoords);
          setCity('Nearby You');
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
