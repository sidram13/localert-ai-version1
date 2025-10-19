import { useState, useCallback, useEffect } from 'react';
import type { Coordinates } from '../types';

export function useLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const requestLocation = useCallback(() => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location access denied. Please enable location permissions for this site in your browser's settings to use this app.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information is unavailable. Check your internet connection or move to an area with a clearer view of the sky.");
            break;
          case err.TIMEOUT:
            setError("The request to get user location timed out. Please try again.");
            break;
          default:
            setError("An unknown error occurred while trying to get your location.");
            break;
        }
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, isLoading, error, requestLocation };
}