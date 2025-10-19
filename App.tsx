import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useCommute } from './hooks/useCommute';
import { useCommuteHistory } from './hooks/useCommuteHistory';
import { useTheme } from './hooks/useTheme';
import { useLocation } from './hooks/useLocation';
import { getCoordinatesForDestination, getDestinationSuggestions, getCoordinatesFromDescription } from './services/aiService';
import type { Coordinates, CommuteHistoryEntry } from './types';

// FIX: The `google.maps` object from the Google Maps API was not correctly typed.
// This is fixed by declaring the `google.maps` namespace and the types used within the app.
declare global {
  namespace google {
    namespace maps {
      // FIX: Changed Map and Marker from `type` to `class` to allow `new` instantiation and usage as a type.
      class Map { constructor(el: any, opts?: any); [key: string]: any; }
      class Marker { constructor(opts?: any); [key: string]: any; }
      // FIX: Add type definition for `google.maps.Circle` to resolve property not found error.
      class Circle { constructor(opts?: any); [key: string]: any; }
      type LatLng = any;
      type MapMouseEvent = any;
      const Animation: any;
      class Geocoder {
        geocode(
          request: { location: LatLng },
          callback: (results: any[] | null, status: string) => void
        ): void;
      }
      namespace places {
        class Autocomplete {
          constructor(inputElement: HTMLInputElement, opts?: any);
          bindTo(key: string, target: any): void;
          addListener(eventName: string, handler: () => void): any;
          getPlace(): any;
        }
      }
    }
  }
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

// --- ICONS (SVG Components) --- //
const commonIconProps = {
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const MapPinIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <path d="M20.7,9.3c0,6.1-8.7,12.7-8.7,12.7S3.3,15.4,3.3,9.3a8.7,8.7,0,0,1,17.4,0Z"/>
        <circle cx="12" cy="9.3" r="3.3"/>
    </svg>
);
const MapIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
);
const BellIcon = ({ className }: { className:string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);
const CompassIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="15.5 8.5 12.5 12.5 8.5 15.5 11.5 11.5 15.5 8.5" />
    </svg>
);
const CheckCircleIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);
const AlertTriangleIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);
const SparklesIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2z"/>
        <path d="M5 2.5L6 5"/>
        <path d="M19 2.5L18 5"/>
        <path d="M5 21.5L6 19"/>
        <path d="M19 21.5L18 19"/>
    </svg>
);
const SunIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
);
const MoonIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);
const MonitorIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);
const KeyIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <path d="M14.5 7.5a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8z" />
        <path d="m14 14 6 6-2 2-6-6" />
    </svg>
);
const XIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const QuestionMarkCircleIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);
const SearchIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const StarIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);
const SmileIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);
const MehIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="8" y1="15" x2="16" y2="15" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);
const FrownIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);
const Volume2Icon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);
const UploadCloudIcon = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
    <path d="M12 12v9"/>
    <path d="m16 16-4-4-4 4"/>
  </svg>
);
const PlayIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" {...commonIconProps} className={className}>
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);
const PauseIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" {...commonIconProps} className={className}>
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);
const PencilIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" {...commonIconProps} className={className}>
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);


// --- Constants for Sounds --- //
const PRE_DEFINED_SOUNDS = [
  { name: 'Classic Alarm', url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg' },
  { name: 'Digital Watch', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' },
  { name: 'Buzzer', url: 'https://actions.google.com/sounds/v1/alarms/dosimeter_alarm.ogg' },
  { name: 'Gentle Wake', url: 'https://actions.google.com/sounds/v1/alarms/wind_chime_alarm.ogg' },
];
const DEFAULT_ALARM_SOUND_URL = PRE_DEFINED_SOUNDS[0].url;

// --- HOOK for dynamically loading Google Maps Script --- //
function useGoogleMapsScript(apiKey: string) {
  const [isLoaded, setIsLoaded] = useState(!!(window.google && window.google.maps));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded || !apiKey) return;
    
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      if (window.google && window.google.maps) {
          setIsLoaded(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    window.initMap = () => {
        setIsLoaded(true);
    };
    script.src += '&callback=initMap';
    
    script.onerror = () => {
        setError("Google Maps script failed to load. This can be caused by an invalid API key, missing billing information, or network issues.");
        setIsLoaded(false);
    };

    document.head.appendChild(script);

  }, [isLoaded, apiKey]);

  return { isLoaded, error };
}


// --- MAIN APP COMPONENT --- //
type JourneyStage = 'selecting_destination' | 'confirming_destination' | 'tracking' | 'completed';

export default function App() {
  const [journeyStage, setJourneyStage] = useState<JourneyStage>('selecting_destination');
  const [destination, setDestination] = useState<{ name: string; coords: Coordinates } | null>(null);
  const [alertDistanceKm, setAlertDistanceKm] = useState(0.5);
  const [alarmSoundUrl, setAlarmSoundUrl] = useState(DEFAULT_ALARM_SOUND_URL);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [isSurveyVisible, setIsSurveyVisible] = useState(false);
  const [isMapSelectorVisible, setIsMapSelectorVisible] = useState(false);
  const [isSoundModalVisible, setIsSoundModalVisible] = useState(false);

  const commute = useCommute({ destinationCoords: destination?.coords, alertDistanceKm, alarmSoundUrl });
  const { history, addCommuteToHistory, clearHistory } = useCommuteHistory();
  const { theme, cycleTheme } = useTheme();
  const { location: userLocation, isLoading: isGettingLocation, error: locationError, requestLocation } = useLocation();
  
  const { isLoaded: isMapsLoaded, error: mapsScriptError } = useGoogleMapsScript(process.env.API_KEY || '');

  // Effect to handle cleanup of blob URLs for custom sounds to prevent memory leaks.
  useEffect(() => {
    const previousUrl = alarmSoundUrl;
    return () => {
      if (previousUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previousUrl);
      }
    };
  }, [alarmSoundUrl]);

  // Effect to display map script loading errors
  useEffect(() => {
    if (mapsScriptError) {
      setApiError(mapsScriptError);
    }
  }, [mapsScriptError]);

  const isApiKeyMissing = !process.env.API_KEY;

  const handleDestinationSelect = (name: string, coords: Coordinates) => {
    setDestination({ name, coords });
    setJourneyStage('confirming_destination');
    setIsMapSelectorVisible(false);
  };
  
  const handleJourneyConfirm = useCallback(() => {
    if (destination) {
      if ('vibrate' in navigator) {
        navigator.vibrate(100); // Add short vibration for feedback
      }
      addCommuteToHistory({ name: destination.name, coords: destination.coords });
      commute.startCommute();
      setJourneyStage('tracking');
    }
  }, [destination, addCommuteToHistory, commute]);

  const handleTrackingCancel = () => {
    commute.stopCommute();
    setJourneyStage('selecting_destination');
    setDestination(null);
  };
  
  const handleAlertDismiss = () => {
    commute.stopCommute();
    setJourneyStage('completed');
    setIsSurveyVisible(true);
  };
  
  const handleSurveyComplete = () => {
      setIsSurveyVisible(false);
      setJourneyStage('selecting_destination');
      setDestination(null);
  }

  const renderContent = () => {
    if (isGettingLocation) {
      return <LoadingState message="Getting your location..." />;
    }
    if (locationError) {
      return <ErrorState 
        title={locationError.toLowerCase().includes('denied') ? "Enable Location Access" : "Location Unavailable"}
        message={locationError} 
        onRetry={requestLocation} 
      />;
    }
    if (userLocation) {
      switch (journeyStage) {
        case 'selecting_destination':
          return (
            <DestinationSelector
                onDestinationSelect={handleDestinationSelect} 
                userLocation={userLocation}
                setApiError={setApiError}
                onOpenMap={() => setIsMapSelectorVisible(true)}
                history={history}
                onClearHistory={clearHistory}
            />
          );
        case 'confirming_destination':
          if (!destination) return null;
          return (
            <JourneyConfirmation
              destinationName={destination.name}
              onConfirm={handleJourneyConfirm}
              onCancel={() => setJourneyStage('selecting_destination')}
              alertDistanceKm={alertDistanceKm}
              onAlertDistanceChange={setAlertDistanceKm}
              alarmSoundUrl={alarmSoundUrl}
              onOpenSoundSelector={() => setIsSoundModalVisible(true)}
            />
          );
        case 'tracking':
          if (!destination) return null;
          return (
             <TrackerUI
                distance={commute.distance}
                accuracy={commute.accuracy}
                error={commute.error}
                onCancel={handleTrackingCancel}
                destinationName={destination.name}
                alertDistanceKm={alertDistanceKm}
                isPreApproaching={commute.isPreApproaching}
            />
          );
        default:
          return <LoadingState message="Preparing your next journey..." />;
      }
    }
    return null; // Should not happen
  };

  const FullScreenWrapper = ({ children }: { children: React.ReactNode }) => (
     <div className="min-h-screen text-slate-900 dark:text-slate-200 font-body flex flex-col items-center justify-center p-4 overflow-hidden">
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        @keyframes wiggle { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        .animate-wiggle { animation: wiggle 0.4s ease-in-out infinite; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .animate-pulse-dot { animation: pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .pac-container {
          background-color: #fff;
          border-radius: 0.5rem;
          border: 2px solid #0F172A;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          z-index: 10000 !important;
        }
        .dark .pac-container {
          background-color: #1E293B;
          border-color: #64748B;
        }
        .pac-item {
          padding: 0.75rem 1rem;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          color: #0F172A;
          border-top: 1px solid #e2e8f0;
        }
        .dark .pac-item {
          color: #F1F5F9;
          border-top-color: #334155;
        }
        .pac-item:first-child {
          border-top: none;
        }
        .pac-item:hover {
          background-color: #FBBF24;
        }
        .dark .pac-item:hover {
          background-color: #F59E0B;
          color: #0F172A;
        }
        .pac-item-query {
          font-weight: 700;
        }
        /* Custom Range Slider Styles */
        input[type=range] { -webkit-appearance: none; width: 100%; background: transparent; }
        input[type=range]:focus { outline: none; }
        input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 1rem; cursor: pointer; background: #E2E8F0; border-radius: 0.5rem; border: 2px solid #0F172A; }
        .dark input[type=range]::-webkit-slider-runnable-track { background: #475569; border: 2px solid #94A3B8; }
        input[type=range]::-moz-range-track { width: 100%; height: 1rem; cursor: pointer; background: #E2E8F0; border-radius: 0.5rem; border: 2px solid #0F172A; }
        .dark input[type=range]::-moz-range-track { background: #475569; border: 2px solid #94A3B8; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 2rem; width: 2rem; border-radius: 9999px; background: #FBBF24; border: 4px solid #0F172A; cursor: pointer; margin-top: -0.6rem; transition: transform 0.1s ease-in-out; }
        .dark input[type=range]::-webkit-slider-thumb { background: #F59E0B; border-color: #F1F5F9; }
        input[type=range]:active::-webkit-slider-thumb { transform: scale(1.1); }
        input[type=range]::-moz-range-thumb { height: 2rem; width: 2rem; border-radius: 9999px; background: #FBBF24; border: 4px solid #0F172A; cursor: pointer; transition: transform 0.1s ease-in-out; }
        .dark input[type=range]::-moz-range-thumb { background: #F59E0B; border-color: #F1F5F9; }
        input[type=range]:active::-moz-range-thumb { transform: scale(1.1); }
      `}</style>
      
      {commute.isApproaching && destination && (
         <FinalAlertUI onDismiss={handleAlertDismiss} destinationName={destination.name} />
      )}
      {isHelpVisible && <HelpModal onClose={() => setIsHelpVisible(false)} />}
      {isSurveyVisible && <SatisfactionSurvey onComplete={handleSurveyComplete} />}
      {apiError && <ApiErrorAlert message={apiError} onDismiss={() => setApiError(null)} />}
      {isMapSelectorVisible && userLocation && <InteractiveMapSelector 
        userLocation={userLocation} 
        onSelect={handleDestinationSelect} 
        onClose={() => setIsMapSelectorVisible(false)} 
        isMapsLoaded={isMapsLoaded}
        mapsError={mapsScriptError}
        />}
      {isSoundModalVisible && <SoundSelectionModal 
        onClose={() => setIsSoundModalVisible(false)}
        onSoundSelect={(url) => {
            setAlarmSoundUrl(url);
            setIsSoundModalVisible(false);
        }}
        currentSoundUrl={alarmSoundUrl}
      />}
      
      {children}
    </div>
  );

  if (isApiKeyMissing) {
    return <FullScreenWrapper><ApiKeyPrompt /></FullScreenWrapper>;
  }

  return (
    <FullScreenWrapper>
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center">
        <Header active={journeyStage !== 'selecting_destination'} />
        <main className="main-card mt-8 bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 transition-all duration-500 w-full">
            {renderContent()}
        </main>
      </div>
      <footer className="relative z-10 mt-12 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="flex justify-center items-center gap-3 mb-4">
            <ThemeToggle theme={theme} cycleTheme={cycleTheme} />
             <button onClick={() => setIsHelpVisible(true)} title="Help & Info" aria-label="Help & Info" className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                <QuestionMarkCircleIcon className="w-5 h-5" />
            </button>
        </div>
        <p>&copy; {new Date().getFullYear()} LocaLert. All rights reserved.</p>
        <p className="mt-1">{locationError ? 'Location access is required.' : 'Set a destination to get arrival alerts.'}</p>
      </footer>
    </FullScreenWrapper>
  );
}

// --- UI State Components --- //

const LoadingState = ({ message }: { message: string }) => (
    <div className="text-center space-y-4 w-full min-h-[24rem] flex flex-col justify-center items-center">
        <BellIcon className="w-16 h-16 text-amber-500 mx-auto animate-wiggle" />
        <p className="text-lg text-slate-600 dark:text-slate-300 font-semibold">{message}</p>
    </div>
);
const ErrorState = ({ title, message, onRetry }: { title: string; message: string, onRetry: () => void }) => (
     <div className="text-center space-y-4 w-full min-h-[24rem] flex flex-col justify-center items-center bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
        <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-heading text-red-800 dark:text-red-200">{title}</h2>
        <p className="text-base text-red-700 dark:text-red-300">{message}</p>
        <button onClick={onRetry} className="btn-primary mt-4 bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-lg border-4 border-slate-900">
            Grant Permission
        </button>
    </div>
);
const ApiKeyPrompt = () => (
    <div className="w-full max-w-md mx-auto">
        <div className="main-card bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 text-center space-y-4">
            <KeyIcon className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-2xl font-heading text-slate-900 dark:text-slate-100">Welcome to LocaLert AI!</h2>
            <p className="text-slate-600 dark:text-slate-300">To unlock the AI-powered features, please add your Google Gemini API key.</p>
            <div className="text-left bg-slate-100 dark:bg-slate-700 p-4 rounded-lg border-2 border-slate-900 dark:border-slate-600 space-y-3">
                <p className="font-bold">1. Get your free API key</p>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 font-bold underline hover:text-amber-700 dark:hover:text-amber-300">
                    Click here to visit Google AI Studio
                </a>
                <p className="font-bold">2. Add the key to this app</p>
                <p>In the editor, open the "Secrets" panel (usually on the left) and add your key.</p>
                <p className="font-bold">3. Refresh the page</p>
                <p>Once the key is added, refresh this browser tab to start using the app.</p>
            </div>
        </div>
    </div>
);
const ApiErrorAlert = ({ message, onDismiss }: { message: string, onDismiss: () => void }) => {
     const alertRoot = document.getElementById('alert-root');
     if (!alertRoot) return null;
     return createPortal(
        <div className="fixed top-4 right-4 z-[100] w-full max-w-sm">
             <div className="main-card bg-red-50 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangleIcon className="w-6 h-6 flex-shrink-0 mt-1 text-red-600 dark:text-red-300" />
                <div className="flex-grow">
                    <p className="font-bold">Error</p>
                    <p className="text-sm">{message}</p>
                </div>
                <button onClick={onDismiss} aria-label="Dismiss error" className="p-1 -m-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
        </div>,
        alertRoot
     );
};
const HelpModal = ({ onClose }: { onClose: () => void }) => {
    const alertRoot = document.getElementById('alert-root');
    if (!alertRoot) return null;
    return createPortal(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="main-card relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                    <div className="inline-flex items-center justify-center bg-amber-300 dark:bg-amber-400 rounded-full p-3 mb-3 border-4 border-slate-900 dark:border-slate-200">
                        <QuestionMarkCircleIcon className="w-6 h-6 text-slate-900" />
                    </div>
                    <h2 className="text-2xl font-heading text-slate-900 dark:text-slate-100">Help & Information</h2>
                </div>
                <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">How It Works</h3>
                        <p>LocaLert uses your phone's GPS to track your location in real-time. Set a destination and an alert distance, and the app will sound a loud alarm and vibrate when you get close, so you never miss your stop.</p>
                    </div>
                     <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">Tips for Best Results</h3>
                        <ul className="list-disc list-inside space-y-1">
                            <li>For reliable alerts, keep this page open and your screen on during your commute.</li>
                            <li>Grant location permission when prompted. The app cannot function without it.</li>
                             <li>Disable battery optimization for your browser to prevent the app from being paused.</li>
                            <li>Ensure you have a stable internet connection for AI features to work correctly.</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">Feedback & Support</h3>
                        <p>Have ideas or running into issues? We'd love to hear from you!</p>
                        <a href="mailto:support@localert.app?subject=LocaLert%20Feedback" className="text-amber-600 dark:text-amber-400 font-bold underline hover:text-amber-700 dark:hover:text-amber-300 mt-1 inline-block">
                            Send us an email
                        </a>
                    </div>
                </div>
                <button onClick={onClose} className="btn-primary w-full mt-4 bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-lg border-2 border-slate-900">
                    Got it!
                </button>
                 <button onClick={onClose} aria-label="Close help" className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
        </div>,
        alertRoot
    );
};
const SatisfactionSurvey = ({ onComplete }: { onComplete: () => void }) => {
    const alertRoot = document.getElementById('alert-root');
    if (!alertRoot) return null;

    const ratings = [
        { icon: <FrownIcon className="w-10 h-10" />, label: "Bad" },
        { icon: <MehIcon className="w-10 h-10" />, label: "Okay" },
        { icon: <SmileIcon className="w-10 h-10" />, label: "Great!" },
    ];

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="main-card w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 space-y-6 text-center">
                <div className="inline-flex items-center justify-center bg-amber-300 dark:bg-amber-400 rounded-full p-3 mb-3 border-4 border-slate-900 dark:border-slate-200">
                    <StarIcon className="w-6 h-6 text-slate-900" />
                </div>
                <h2 className="text-2xl font-heading text-slate-900 dark:text-slate-100">Journey Complete!</h2>
                <p className="text-slate-600 dark:text-slate-300">How was your experience with LocaLert?</p>
                <div className="flex justify-center items-center gap-4 pt-2">
                    {ratings.map(({ icon, label }) => (
                        <button 
                            key={label} 
                            onClick={onComplete}
                            title={`Rate as ${label}`}
                            className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-amber-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        >
                            {icon}
                            <span className="text-sm font-bold">{label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        alertRoot
    );
};

// --- UI Sub-components --- //

const Header = ({ active }: { active: boolean }) => (
  <header className="text-center">
    <div className={`inline-flex items-center justify-center bg-amber-300 dark:bg-amber-400 rounded-full p-4 mb-4 border-4 border-slate-900 dark:border-slate-200 transition-transform duration-300 ${active ? 'scale-75' : 'scale-100'}`}>
      
      <img
    src="/favicon.png"  // replace with your actual PNG path
    alt="Notification Icon"
    className="w-11 h-11 object-contain"
  />
    </div>
    <h1 className={`font-heading tracking-tight text-slate-900 dark:text-slate-50 transition-all duration-300 ${active ? 'text-4xl' : 'text-6xl'}`}>
      LocaLert
    </h1>
    <p className={`mt-2 text-slate-600 dark:text-slate-400 transition-all duration-300 ${active ? 'text-base' : 'text-lg'}`}>Never miss your stop again.</p>
  </header>
);

const ThemeToggle = ({ theme, cycleTheme }: { theme: 'light' | 'dark' | 'system', cycleTheme: () => void }) => {
    const themeConfig = {
        system: { icon: <MonitorIcon className="w-5 h-5" />, title: 'Theme: System. Click for Light.' },
        light: { icon: <SunIcon className="w-5 h-5" />, title: 'Theme: Light. Click for Dark.' },
        dark: { icon: <MoonIcon className="w-5 h-5" />, title: 'Theme: Dark. Click for System.' }
    };
    return (
        <button onClick={cycleTheme} title={themeConfig[theme].title} aria-label={themeConfig[theme].title} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
            {themeConfig[theme].icon}
        </button>
    );
};

const DestinationSelector = ({ onDestinationSelect, userLocation, setApiError, onOpenMap, history, onClearHistory }: { 
    onDestinationSelect: (name: string, coords: Coordinates) => void; 
    userLocation: Coordinates; 
    setApiError: (error: string | null) => void; 
    onOpenMap: () => void;
    history: CommuteHistoryEntry[];
    onClearHistory: () => void;
}) => {
    const [searchType, setSearchType] = useState<'name' | 'description'>('name');
    
    const handleHistorySelect = (entry: CommuteHistoryEntry) => {
        onDestinationSelect(entry.destinationName, entry.destinationCoords);
    };
    
    return (
        <div className="space-y-6 flex flex-col justify-center min-h-[24rem]">
            {history.length > 0 && (
                 <div className="pt-2">
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="block text-base font-bold text-slate-800 dark:text-slate-200">
                            Recent Journeys
                        </h3>
                        <button onClick={onClearHistory} className="text-xs font-bold text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded">Clear</button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2 -mr-2">
                        {history.map(entry => (
                            <button
                                key={entry.id}
                                onClick={() => handleHistorySelect(entry)}
                                className="w-full text-left p-3 bg-slate-100 hover:bg-amber-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg flex items-center gap-3 transition-colors border-2 border-slate-900 dark:border-slate-600"
                            >
                                <MapPinIcon className="w-5 h-5 flex-shrink-0 text-slate-600 dark:text-slate-300" />
                                <span className="font-semibold truncate flex-grow">{entry.destinationName}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="text-center">
                <h2 className="text-2xl font-heading text-slate-900 dark:text-slate-100">
                    {history.length > 0 ? 'Set a New Destination' : 'Set a Destination'}
                </h2>
            </div>
            
            <div>
                <div className="flex border-b-2 border-slate-900 dark:border-slate-600 -mx-6 md:-mx-8 px-2 md:px-4">
                    <SearchTabButton isActive={searchType === 'name'} onClick={() => setSearchType('name')}>
                        <SearchIcon className="w-5 h-5" />
                        <span>Search by Name</span>
                    </SearchTabButton>
                    <SearchTabButton isActive={searchType === 'description'} onClick={() => setSearchType('description')}>
                        <SparklesIcon className="w-5 h-5" />
                        <span>Describe a Place</span>
                    </SearchTabButton>
                </div>
                <div className="pt-6">
                    {searchType === 'name' ? (
                        <SearchHeader onDestinationSelect={onDestinationSelect} userLocation={userLocation} setApiError={setApiError} />
                    ) : (
                        <DescriptionSearchInput onDestinationSelect={onDestinationSelect} userLocation={userLocation} setApiError={setApiError} />
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <hr className="flex-grow border-t-2 border-slate-300 dark:border-slate-600" />
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">OR</span>
                <hr className="flex-grow border-t-2 border-slate-300 dark:border-slate-600" />
            </div>
            
            <button onClick={onOpenMap} className="btn-primary w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 font-bold py-3 px-4 rounded-lg border-2 border-slate-900 flex items-center justify-center gap-2 text-lg">
                <MapIcon className="w-6 h-6" />
                Pick on Map
            </button>
        </div>
    );
};

const SearchTabButton = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        role="tab"
        aria-selected={isActive}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold border-b-4 transition-colors ${
            isActive 
                ? 'border-amber-500 text-slate-900 dark:text-slate-100' 
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
    >
        {children}
    </button>
);

const SearchHeader = ({ onDestinationSelect, userLocation, setApiError }: { onDestinationSelect: (name: string, coords: Coordinates) => void; userLocation: Coordinates | null; setApiError: (error: string | null) => void; }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (input.trim().length < 3) {
            setSuggestions([]);
            return;
        }
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        
        setIsFetchingSuggestions(true);
        debounceTimeoutRef.current = window.setTimeout(async () => {
            try {
                setApiError(null);
                const result = await getDestinationSuggestions(input, userLocation);
                setSuggestions(result || []);
            } catch (e) {
                setSuggestions([]);
                setApiError(e instanceof Error ? e.message : "Failed to fetch suggestions.");
            } finally {
                setIsFetchingSuggestions(false);
            }
        }, 300);

        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
    }, [input, userLocation, setApiError]);

    const selectDestination = async (destinationName: string) => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        setSuggestions([]);
        setInput(destinationName);
        setIsSearching(false);
        if (!destinationName.trim()) return;

        setApiError(null);
        setIsLoading(true);
        try {
            const coords = await getCoordinatesForDestination(destinationName, userLocation);
            if (coords) onDestinationSelect(destinationName, coords);
            else setApiError(`Could not find location for "${destinationName}".`);
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                <input
                    id="destination-search" type="text" value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setIsSearching(true)}
                    onBlur={() => setTimeout(() => setIsSearching(false), 200)}
                    placeholder="e.g., Main Street bus stop"
                    className="w-full bg-white dark:bg-slate-700 border-2 border-slate-900 dark:border-slate-600 rounded-lg pl-12 pr-4 py-3 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-300/50 dark:focus:ring-amber-400/50 transition-all"
                    disabled={isLoading} autoComplete="off"
                />
            </div>
            {(isFetchingSuggestions || suggestions.length > 0) && isSearching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-600 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {isFetchingSuggestions && !suggestions.length && <div className="p-3 font-semibold text-slate-500 dark:text-slate-400 animate-pulse">Searching...</div>}
                    <ul>{suggestions.map((s, i) => ( <li key={i} onMouseDown={() => selectDestination(s)} className="p-3 font-medium cursor-pointer hover:bg-amber-400 dark:hover:bg-amber-500 hover:text-slate-900 dark:hover:text-slate-900 border-b-2 border-slate-200 dark:border-b-slate-700 last:border-b-0">{s}</li>))}</ul>
                </div>
            )}
            {isLoading && <div className="mt-2 text-center font-semibold text-slate-600 dark:text-slate-300">Finding location...</div>}
        </div>
    );
};

const DescriptionSearchInput = ({ onDestinationSelect, userLocation, setApiError }: { 
    onDestinationSelect: (name: string, coords: Coordinates) => void; 
    userLocation: Coordinates | null; 
    setApiError: (error: string | null) => void; 
}) => {
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleFindDestination = async () => {
        if (!description.trim()) return;

        setIsLoading(true);
        setApiError(null);
        try {
            const result = await getCoordinatesFromDescription(description, userLocation);
            if (result) {
                onDestinationSelect(result.name, result.coords);
            } else {
                setApiError(`Could not identify a specific location from your description. Try being more specific.`);
            }
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "An unexpected error occurred while interpreting your description.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <textarea
                id="destination-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., the big red coffee shop next to the city library"
                className="w-full bg-white dark:bg-slate-700 border-2 border-slate-900 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-300/50 dark:focus:ring-amber-400/50 transition-all"
                disabled={isLoading}
            />
            <button
                onClick={handleFindDestination}
                disabled={isLoading || !description.trim()}
                className="btn-primary w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 font-bold py-3 px-4 rounded-lg border-2 border-slate-900 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <span className="animate-spin h-5 w-5 border-b-2 rounded-full mr-2"></span>
                        Interpreting...
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-6 h-6" />
                        Find Place
                    </>
                )}
            </button>
        </div>
    );
};


const InteractiveMapSelector = ({ userLocation, onSelect, onClose, isMapsLoaded, mapsError }: { 
    userLocation: Coordinates, 
    onSelect: (name: string, coords: Coordinates) => void, 
    onClose: () => void,
    isMapsLoaded: boolean,
    mapsError: string | null
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const markerInstance = useRef<google.maps.Marker | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<{ name: string; coords: Coordinates } | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    
    const pulseCircleRef = useRef<google.maps.Circle | null>(null);
    const pulseIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
            if (pulseCircleRef.current) pulseCircleRef.current.setMap(null);
        };
    }, []);

    const updateSelection = useCallback((latLng: google.maps.LatLng, shouldZoom = false, placeName: string | null = null) => {
        if (!window.google || !mapInstance.current) return;
        
        mapInstance.current.panTo(latLng);
        if (shouldZoom || mapInstance.current.getZoom()! < 15) {
            mapInstance.current.setZoom(17);
        }

        const coords = { latitude: latLng.lat(), longitude: latLng.lng() };

        if (markerInstance.current) {
            markerInstance.current.setPosition(latLng);
        } else {
            markerInstance.current = new window.google.maps.Marker({
                position: latLng,
                map: mapInstance.current,
                draggable: true,
            });
            markerInstance.current.addListener('dragend', () => {
                if (markerInstance.current) {
                    updateSelection(markerInstance.current.getPosition()!, false, null);
                }
            });
        }
        
        if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);

        if (!pulseCircleRef.current) {
            pulseCircleRef.current = new window.google.maps.Circle({
                strokeColor: '#FBBF24', strokeOpacity: 0.8, strokeWeight: 2,
                fillColor: '#FBBF24', fillOpacity: 0.35, map: mapInstance.current,
                center: latLng, radius: 0,
            });
        }
        pulseCircleRef.current.setCenter(latLng);

        let currentRadius = 0;
        const maxRadius = 120;
        const pulseSpeed = 3;
        pulseIntervalRef.current = window.setInterval(() => {
            currentRadius += pulseSpeed;
            if (currentRadius > maxRadius) currentRadius = 0;
            
            if (pulseCircleRef.current) {
                pulseCircleRef.current.setRadius(currentRadius);
                const fadeFactor = 1 - (currentRadius / maxRadius);
                pulseCircleRef.current.setOptions({
                    fillOpacity: 0.35 * fadeFactor,
                    strokeOpacity: 0.8 * fadeFactor,
                });
            }
        }, 30);

        setIsEditingName(false); // Reset editing state on new selection

        if (placeName) {
            setSelectedPlace({ name: placeName, coords });
            setEditedName(placeName);
            setIsGeocoding(false);
        } else {
            setIsGeocoding(true);
            const loadingName = 'Loading address...';
            setSelectedPlace({ name: loadingName, coords });
            setEditedName(loadingName);
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: latLng }, (results, status) => {
                setIsGeocoding(false);
                const finalName = (status === 'OK' && results && results[0]) ? results[0].formatted_address : 'Unknown Location';
                setSelectedPlace({ name: finalName, coords });
                setEditedName(finalName);
                if (finalName === 'Unknown Location') {
                    setIsEditingName(true);
                }
                if (status !== 'OK') {
                    console.error('Geocoder failed due to: ' + status);
                }
            });
        }
    }, []);

    useEffect(() => {
        if (isMapsLoaded && mapRef.current && !mapInstance.current) {
            const mapOptions = {
                center: { lat: userLocation.latitude, lng: userLocation.longitude },
                zoom: 15,
                disableDefaultUI: true,
                gestureHandling: 'greedy',
                 styles: [ { "featureType": "all", "elementType": "geometry.fill", "stylers": [ { "weight": "2.00" } ] }, { "featureType": "all", "elementType": "geometry.stroke", "stylers": [ { "color": "#9c9c9c" } ] }, { "featureType": "all", "elementType": "labels.text", "stylers": [ { "visibility": "on" } ] }, { "featureType": "landscape", "elementType": "all", "stylers": [ { "color": "#f2f2f2" } ] }, { "featureType": "landscape", "elementType": "geometry.fill", "stylers": [ { "color": "#ffffff" } ] }, { "featureType": "landscape.man_made", "elementType": "geometry.fill", "stylers": [ { "color": "#ffffff" } ] }, { "featureType": "poi", "elementType": "all", "stylers": [ { "visibility": "off" } ] }, { "featureType": "road", "elementType": "all", "stylers": [ { "saturation": -100 }, { "lightness": 45 } ] }, { "featureType": "road", "elementType": "geometry.fill", "stylers": [ { "color": "#eeeeee" } ] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#7b7b7b" } ] }, { "featureType": "road", "elementType": "labels.text.stroke", "stylers": [ { "color": "#ffffff" } ] }, { "featureType": "road.highway", "elementType": "all", "stylers": [ { "visibility": "simplified" } ] }, { "featureType": "road.arterial", "elementType": "labels.icon", "stylers": [ { "visibility": "off" } ] }, { "featureType": "transit", "elementType": "all", "stylers": [ { "visibility": "off" } ] }, { "featureType": "water", "elementType": "all", "stylers": [ { "color": "#46bcec" }, { "visibility": "on" } ] }, { "featureType": "water", "elementType": "geometry.fill", "stylers": [ { "color": "#c8d7d4" } ] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [ { "color": "#070707" } ] }, { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [ { "color": "#ffffff" } ] } ]
            };
            const map = new window.google.maps.Map(mapRef.current, mapOptions);
            mapInstance.current = map;
            
            map.addListener('click', (e: google.maps.MapMouseEvent) => {
                if(e.latLng) updateSelection(e.latLng, false, null);
            });
        }
    }, [isMapsLoaded, userLocation, updateSelection]);
    
     useEffect(() => {
        if (isMapsLoaded && searchInputRef.current && mapInstance.current) {
            const autocompleteOptions = {
                fields: ['name', 'geometry', 'formatted_address'],
                componentRestrictions: { country: "in" },
            };
            const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, autocompleteOptions);
            autocomplete.bindTo('bounds', mapInstance.current);
            
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place.geometry && place.geometry.location) {
                    const placeName = place.formatted_address || place.name;
                    updateSelection(place.geometry.location, true, placeName);
                }
            });
        }
    }, [isMapsLoaded, updateSelection]);

    const alertRoot = document.getElementById('alert-root');
    if (!alertRoot) return null;

    if (mapsError) {
        return createPortal(
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="main-card w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 text-center space-y-4" onClick={e => e.stopPropagation()}>
                    <AlertTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-2xl font-heading text-red-800 dark:text-red-200">Map Loading Error</h2>
                    <p className="text-slate-600 dark:text-slate-300">
                        The map could not be loaded. This is often caused by an invalid or restricted API key.
                    </p>
                    <div className="text-left bg-slate-100 dark:bg-slate-700 p-4 rounded-lg border-2 border-slate-900 dark:border-slate-600 space-y-2 text-sm">
                        <p><strong>Please check the following:</strong></p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Your API key in the "Secrets" panel is correct.</li>
                            <li>"Maps JavaScript API" is enabled in your Google Cloud project.</li>
                            <li>"Places API" is enabled for the search functionality.</li>
                            <li>Billing is enabled for your Google Cloud project.</li>
                        </ul>
                    </div>
                    <button onClick={onClose} className="btn-primary w-full mt-4 bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-lg border-2 border-slate-900">
                        Close
                    </button>
                </div>
            </div>,
            alertRoot
        );
    }

    if (!isMapsLoaded) {
        return createPortal(<div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center text-white font-bold text-lg">Loading Map...</div>, alertRoot);
    }
    
    return createPortal(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col" onClick={onClose}>
            <div className="relative w-full p-4 z-10" onClick={e => e.stopPropagation()}>
                <div className="relative">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input ref={searchInputRef} type="text" placeholder="Search for a place..." className="w-full bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-600 rounded-lg pl-12 pr-10 py-3 focus:outline-none focus:ring-4 focus:ring-amber-300/50" />
                    <button onClick={onClose} aria-label="Close map" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div ref={mapRef} className="flex-grow w-full h-full" onClick={e => e.stopPropagation()}></div>
            {selectedPlace && (
                <div className="w-full p-4 z-10" onClick={e => e.stopPropagation()}>
                    <div className="main-card w-full bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-3">
                        <div>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Selected Destination</p>
                            {isEditingName ? (
                                <form className="flex items-center gap-2 mt-1" onSubmit={(e) => { e.preventDefault(); setSelectedPlace(prev => prev ? { ...prev, name: editedName.trim() || "Untitled Location" } : null); setIsEditingName(false); }}>
                                    <input
                                        type="text" value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        className="flex-grow bg-white dark:bg-slate-700 border-2 border-slate-900 dark:border-slate-600 rounded-lg px-3 py-2 text-lg font-bold text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                        autoFocus
                                    />
                                    <button type="submit" className="p-2 bg-slate-200 dark:bg-slate-600 rounded-lg border-2 border-slate-900 dark:border-slate-500 flex-shrink-0" title="Save name">
                                        <CheckCircleIcon className="w-6 h-6 text-slate-800 dark:text-slate-100" />
                                    </button>
                                </form>
                            ) : (
                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                    <p className={`font-bold text-lg flex-grow truncate ${isGeocoding ? 'animate-pulse' : ''}`} title={selectedPlace.name}>
                                        {selectedPlace.name}
                                    </p>
                                    <button onClick={() => setIsEditingName(true)} title="Rename location" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={() => onSelect(selectedPlace.name, selectedPlace.coords)} 
                            className="btn-primary w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg border-2 border-slate-900 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isEditingName || isGeocoding}
                        >
                            <CheckCircleIcon className="w-6 h-6" /> Confirm Destination
                        </button>
                    </div>
                </div>
            )}
        </div>,
        alertRoot
    );
};


const JourneyConfirmation = ({ destinationName, onConfirm, onCancel, alertDistanceKm, onAlertDistanceChange, alarmSoundUrl, onOpenSoundSelector }: { destinationName: string; onConfirm: () => void; onCancel: () => void; alertDistanceKm: number; onAlertDistanceChange: (km: number) => void; alarmSoundUrl: string; onOpenSoundSelector: () => void; }) => {
    
    const getSoundNameFromUrl = (url: string) => {
        const preDefined = PRE_DEFINED_SOUNDS.find(s => s.url === url);
        if (preDefined) return preDefined.name;
        if (url.startsWith('blob:')) return 'Custom Sound';
        return 'Unknown Sound';
    };

    const formatDistance = (km: number) => {
        if (km < 1) {
            return `${Math.round(km * 1000)} m`;
        }
        return `${km.toFixed(2)} km`;
    };

    return (
        <div className="space-y-6">
            <div className='text-center'>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Destination is Set</h2>
                <div className="mt-2 flex items-center justify-center gap-3 p-4 bg-white dark:bg-slate-700 rounded-lg border-2 border-slate-900 dark:border-slate-600">
                    <MapPinIcon className="w-6 h-6 text-slate-900 dark:text-slate-100" />
                    <p className="font-bold text-lg truncate text-slate-900 dark:text-slate-100" title={destinationName}>{destinationName}</p>
                </div>
            </div>
            <div>
                 <div className="flex justify-between items-center mb-2">
                    <label htmlFor="distance-slider" className="block text-base font-bold text-slate-800 dark:text-slate-200">Alert Distance:</label>
                    <span className="font-bold text-lg text-amber-600 dark:text-amber-400 font-mono bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-md border-2 border-slate-900 dark:border-slate-600">
                        {formatDistance(alertDistanceKm)}
                    </span>
                </div>
                <input
                    id="distance-slider"
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.05"
                    value={alertDistanceKm}
                    onChange={(e) => onAlertDistanceChange(parseFloat(e.target.value))}
                />
            </div>
            <div>
                <label className="block text-base font-bold text-slate-800 dark:text-slate-200 mb-2">Alarm Sound:</label>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg border-2 border-slate-900 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                        <Volume2Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        <span className="font-semibold truncate">{getSoundNameFromUrl(alarmSoundUrl)}</span>
                    </div>
                    <button onClick={onOpenSoundSelector} className="font-bold text-amber-600 dark:text-amber-400 hover:underline text-sm px-2">
                        Change
                    </button>
                </div>
            </div>
            <div className='space-y-3 pt-2'>
                <button onClick={onConfirm} className="btn-primary w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg border-2 border-slate-900 flex items-center justify-center gap-2 text-lg">
                    <CompassIcon className="w-6 h-6" />
                    Start Journey
                </button>
                <button onClick={onCancel} className="w-full bg-white hover:bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-bold py-2 px-4 rounded-lg border-2 border-slate-900 dark:border-slate-500 transition-colors">
                    Back to Selection
                </button>
            </div>
        </div>
    );
};

const SoundSelectionModal = ({ onClose, onSoundSelect, currentSoundUrl }: { onClose: () => void; onSoundSelect: (url: string) => void; currentSoundUrl: string; }) => {
    const alertRoot = document.getElementById('alert-root');
    const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const audio = previewAudio;
        const handleEnded = () => setPlayingUrl(null);

        audio?.addEventListener('ended', handleEnded);
        audio?.addEventListener('pause', handleEnded);

        return () => {
            audio?.removeEventListener('ended', handleEnded);
            audio?.removeEventListener('pause', handleEnded);
            if (audio) {
                audio.pause();
                setPlayingUrl(null);
            }
        };
    }, [previewAudio]);

    const handlePreviewToggle = (url: string) => {
        if (playingUrl === url) {
            previewAudio?.pause();
            setPlayingUrl(null);
        } else {
            previewAudio?.pause();
            const newAudio = new Audio(url);
            setPreviewAudio(newAudio);
            setPlayingUrl(url);
            newAudio.play().catch(e => console.error("Preview failed:", e));
        }
    };
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            onSoundSelect(objectUrl);
        }
    };

    const isCustomSoundSelected = currentSoundUrl.startsWith('blob:');

    if (!alertRoot) return null;
    return createPortal(
         <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="main-card relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="text-center">
                    <div className="inline-flex items-center justify-center bg-amber-300 dark:bg-amber-400 rounded-full p-3 mb-3 border-4 border-slate-900 dark:border-slate-200">
                        <Volume2Icon className="w-6 h-6 text-slate-900" />
                    </div>
                    <h2 className="text-2xl font-heading text-slate-900 dark:text-slate-100">Choose Alarm Sound</h2>
                </div>
                
                <div className="space-y-3">
                    {PRE_DEFINED_SOUNDS.map((sound) => {
                        const isSelected = currentSoundUrl === sound.url;
                        return (
                            <div key={sound.url} className={`flex items-center p-3 rounded-lg border-2 border-slate-900 dark:border-slate-600 transition-colors ${isSelected ? 'bg-amber-100 dark:bg-slate-700' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                                <button onClick={() => handlePreviewToggle(sound.url)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                                    {playingUrl === sound.url ? <PauseIcon className="w-5 h-5 fill-current" /> : <PlayIcon className="w-5 h-5 fill-current" />}
                                </button>
                                <span className="flex-grow font-semibold ml-3 text-slate-900 dark:text-slate-200">{sound.name}</span>
                                {isSelected ? (
                                    <span className="flex items-center gap-2 font-bold text-sm px-4 py-2 text-slate-600 dark:text-slate-300">
                                        <CheckCircleIcon className="w-5 h-5" />
                                        Selected
                                    </span>
                                ) : (
                                    <button onClick={() => onSoundSelect(sound.url)} className="font-bold text-sm px-4 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-md border-2 border-slate-900 hover:bg-slate-700 dark:hover:bg-white">
                                        Select
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {isCustomSoundSelected && (
                    <div className="flex items-center p-3 rounded-lg border-2 border-slate-900 dark:border-slate-600 bg-amber-100 dark:bg-slate-700">
                        <button onClick={() => handlePreviewToggle(currentSoundUrl)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
                            {playingUrl === currentSoundUrl ? <PauseIcon className="w-5 h-5 fill-current" /> : <PlayIcon className="w-5 h-5 fill-current" />}
                        </button>
                        <span className="flex-grow font-semibold ml-3 text-slate-900 dark:text-slate-200">Custom Sound</span>
                        <span className="flex items-center gap-2 font-bold text-sm px-4 py-2 text-slate-600 dark:text-slate-300">
                            <CheckCircleIcon className="w-5 h-5" />
                            Selected
                        </span>
                    </div>
                )}
                
                <div className="flex items-center gap-4">
                    <hr className="flex-grow border-t-2 border-slate-300 dark:border-slate-600" />
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">OR</span>
                    <hr className="flex-grow border-t-2 border-slate-300 dark:border-slate-600" />
                </div>
                
                <input type="file" accept="audio/*" ref={uploadInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => uploadInputRef.current?.click()} className="btn-primary w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-bold py-3 px-4 rounded-lg border-2 border-slate-900 flex items-center justify-center gap-2 text-lg">
                    <UploadCloudIcon className="w-6 h-6" />
                    {isCustomSoundSelected ? 'Upload New Sound' : 'Upload Your Own'}
                </button>
                
                 <button onClick={onClose} aria-label="Close sound selector" className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
        </div>,
        alertRoot
    );
};


const BackgroundTrackingWarning = () => (
    <div className="bg-amber-100 dark:bg-amber-500/10 border-2 border-amber-500 text-amber-900 dark:text-amber-200 text-sm rounded-lg p-3 flex items-start gap-3 mb-4">
        <AlertTriangleIcon className="w-10 h-10 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
            <span className="font-bold">Important:</span> For reliable alerts, please keep this screen open. Locking your phone, switching apps, or enabling battery saver modes can interfere with tracking.
        </div>
    </div>
);

const TrackerUI = ({ distance, error, onCancel, destinationName, alertDistanceKm, isPreApproaching, accuracy }: { 
    distance: number | null; 
    error: string | null; 
    onCancel: () => void; 
    destinationName: string; 
    alertDistanceKm: number; 
    isPreApproaching: boolean; 
    accuracy: number | null; 
}) => {
    const [isCalibrating, setIsCalibrating] = useState(true);
    const progress = distance !== null ? Math.max(0, 100 - (distance / (alertDistanceKm * 3)) * 100) : 0; // Visual progress starts from 3x alert distance
    
    useEffect(() => {
        // Once we get a reasonably good accuracy reading, stop calibrating.
        // A good threshold is < 100 meters.
        if (isCalibrating && accuracy !== null && accuracy < 100) {
            setIsCalibrating(false);
        }
    }, [accuracy, isCalibrating]);

    const getAccuracyInfo = (acc: number | null) => {
        if (acc === null) return { color: 'text-slate-400', text: 'N/A', indicatorColor: 'bg-slate-400' };
        if (acc <= 20) return { color: 'text-green-600 dark:text-green-400', text: `Excellent (~${Math.round(acc)}m)`, indicatorColor: 'bg-green-500' };
        if (acc <= 50) return { color: 'text-yellow-600 dark:text-yellow-400', text: `Good (~${Math.round(acc)}m)`, indicatorColor: 'bg-yellow-500' };
        return { color: 'text-red-600 dark:text-red-400', text: `Poor (~${Math.round(acc)}m)`, indicatorColor: 'bg-red-500' };
    };
    
    const accuracyInfo = getAccuracyInfo(accuracy);
    const isSignalWeak = accuracy !== null && accuracy > 50;

    return (
        <div className="text-center space-y-4">
            <BackgroundTrackingWarning />
            {isSignalWeak && !isCalibrating && (
                <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-800 dark:text-red-200 text-sm rounded-lg p-3 flex items-start gap-3">
                    <AlertTriangleIcon className="w-8 h-8 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                        <span className="font-bold">Weak GPS Signal:</span> Distance calculation may be inaccurate. For better results, try moving to an area with a clearer view of the sky.
                    </div>
                </div>
            )}
            <h2 className="text-3xl font-heading text-slate-900 dark:text-slate-50">Commute in Progress</h2>
            <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border-2 border-slate-900 dark:border-slate-600 space-y-3">
                 {isPreApproaching && !error && !isCalibrating ? (
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 animate-pulse">Getting close...</p>
                ) : (
                    <p className="text-base font-semibold text-slate-600 dark:text-slate-300">
                        {isCalibrating ? "Calibrating GPS..." : "Monitoring your location..."}
                    </p>
                )}
                
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-5 overflow-hidden border-2 border-slate-900 dark:border-slate-500">
                    <div className={`h-full rounded-full transition-all duration-500 ${isPreApproaching ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-amber-400 dark:bg-amber-500'}`} style={{ width: `${isCalibrating ? 0 : progress}%` }}></div>
                </div>

                <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Straight-Line Distance</p>
                    <p className="text-4xl font-bold font-heading text-slate-900 dark:text-slate-50 mt-1">
                        {distance !== null && !isCalibrating ? `${distance.toFixed(2)} km` : '...'}
                    </p>
                </div>
                <div className="flex justify-between items-baseline">
                    <p className="text-base text-slate-600 dark:text-slate-300 font-semibold truncate pr-2" title={destinationName}>to {destinationName}</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-mono font-bold whitespace-nowrap">(Alert within {alertDistanceKm} km)</p>
                </div>
                
                <div className="!mt-4 pt-3 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 border-t-2 border-slate-200 dark:border-slate-600">
                    <span className="font-bold">GPS Signal:</span>
                    <div className={`w-3 h-3 rounded-full ${accuracyInfo.indicatorColor} ${isCalibrating ? '' : 'animate-pulse-dot'}`}></div>
                    <span className={`font-mono font-bold ${accuracyInfo.color}`}>{accuracyInfo.text}</span>
                </div>
                
                {error && <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 text-red-800 dark:text-red-200 font-semibold rounded-lg p-3 mt-2">{error}</div>}
            </div>

            <button onClick={onCancel} className="btn-primary w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-slate-900">
                Cancel Commute
            </button>
        </div>
    );
};

const FinalAlertUI = ({ onDismiss, destinationName }: { onDismiss: () => void; destinationName: string; }) => {
  const alertRoot = document.getElementById('alert-root');
  if (!alertRoot) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6 animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]">
          <BellIcon className="w-24 h-24 text-amber-300 mx-auto" />
          <h2 className="text-7xl font-heading text-white">WAKE UP!</h2>
          <p className="text-xl text-amber-100/90">
            You are approaching: <br />
            <span className="font-bold truncate">{destinationName}</span>
          </p>
          <MathMission onSuccess={onDismiss} />
      </div>
    </div>,
    alertRoot
  );
}

const MathMission = ({ onSuccess }: { onSuccess: () => void }) => {
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [answer, setAnswer] = useState('');
    const [isWrong, setIsWrong] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        generateProblem();
        inputRef.current?.focus();
    }, []);

    const generateProblem = () => {
        setNum1(Math.floor(Math.random() * 15) + 5);
        setNum2(Math.floor(Math.random() * 15) + 5);
        setAnswer('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (parseInt(answer, 10) === num1 + num2) {
            onSuccess();
        } else {
            setIsWrong(true);
            setAnswer('');
            setTimeout(() => setIsWrong(false), 500);
        }
    };

    return (
        <div className={`bg-black/40 p-6 rounded-2xl border-2 border-amber-300/50 ${isWrong ? 'animate-shake' : ''}`}>
            <p className="text-white text-lg mb-4 font-semibold">Solve the problem to dismiss:</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 items-center">
                <p className="text-5xl font-heading font-bold text-amber-200">{num1} + {num2} = ?</p>
                <input
                    ref={inputRef} type="number" value={answer} onChange={(e) => setAnswer(e.target.value)}
                    className="w-40 text-center bg-white/10 dark:bg-black/20 border-2 border-amber-300 dark:border-amber-400 rounded-lg px-4 py-3 text-3xl font-bold text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-amber-300/50 dark:focus:ring-amber-400/50 transition-all" autoFocus
                />
                <button type="submit" className="btn-primary w-full bg-amber-400 text-slate-900 font-bold py-3 px-4 rounded-lg text-lg border-2 border-slate-900 flex items-center justify-center gap-2">
                    <CheckCircleIcon className="w-6 h-6"/> Dismiss
                </button>
            </form>
        </div>
    );
};