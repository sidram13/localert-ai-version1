

import { useState, useRef, useCallback, useEffect } from 'react';
import { Coordinates } from '../types';
import { getDistance } from '../utils/geolocation';

interface UseCommuteProps {
  destinationCoords: Coordinates | null | undefined;
  alertDistanceKm: number;
  alarmSoundUrl: string;
}

export function useCommute({ destinationCoords, alertDistanceKm, alarmSoundUrl }: UseCommuteProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Coordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isPreApproaching, setIsPreApproaching] = useState(false);
  const [isApproaching, setIsApproaching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vibrationInterval = useRef<number | null>(null);

  useEffect(() => {
    // Preload the audio. This now depends on the alarmSoundUrl prop.
    if (alarmSoundUrl) {
        audioRef.current = new Audio(alarmSoundUrl);
        audioRef.current.loop = true;
    }
  }, [alarmSoundUrl]);

  const stopCommute = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    if (vibrationInterval.current) {
        clearInterval(vibrationInterval.current);
        vibrationInterval.current = null;
    }
    if ('vibrate' in navigator) {
        navigator.vibrate(0); // Stop any ongoing vibration
    }
    setIsActive(false);
    setIsApproaching(false);
    setIsPreApproaching(false);
    setCurrentPosition(null);
    setDistance(null);
    setAccuracy(null);
  }, []);

  const startCommute = useCallback(() => {
    if (!destinationCoords) {
      setError('Destination not set.');
      return;
    }
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsActive(true);
    setError(null);
    setIsApproaching(false);
    setIsPreApproaching(false);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newPosition = { latitude, longitude };
        setCurrentPosition(newPosition);
        setAccuracy(accuracy);

        const dist = getDistance(newPosition, destinationCoords);
        setDistance(dist);
        
        // Pre-alert trigger (e.g., at 2x the distance)
        if (dist <= alertDistanceKm * 2 && !isPreApproaching && !isApproaching) {
            setIsPreApproaching(true);
            if ('vibrate' in navigator) {
                navigator.vibrate(200); // A short, single vibration
            }
        }

        // Final alert trigger
        if (dist <= alertDistanceKm && !isApproaching) {
          setIsApproaching(true);
          audioRef.current?.play().catch(e => console.error("Error playing audio:", e));
          if ('vibrate' in navigator) {
            const pattern = [600, 200, 600]; 
            navigator.vibrate(pattern); // Vibrate once immediately
            vibrationInterval.current = window.setInterval(() => {
                navigator.vibrate(pattern);
            }, 1800);
          }
        }
      },
      (err) => {
        setError(`Location Error: ${err.message}`);
        stopCommute();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [destinationCoords, stopCommute, isApproaching, isPreApproaching, alertDistanceKm]);

  useEffect(() => {
    return () => {
      stopCommute();
    };
  }, [stopCommute]);
  
  return { isActive, currentPosition, distance, isApproaching, isPreApproaching, error, startCommute, stopCommute, accuracy };
}