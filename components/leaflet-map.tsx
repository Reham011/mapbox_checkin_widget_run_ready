"use client";

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, MapPin } from 'lucide-react';

interface LeafletMapProps {
  userLocation: { lat: number; lng: number } | null;
  locationStatus: 'loading' | 'granted' | 'denied' | 'unavailable';
}

type LeafletLike = {
  map: (...args: any[]) => any;
  tileLayer: (...args: any[]) => { addTo: (map: any) => void };
  marker: (...args: any[]) => { addTo: (map: any) => any };
  divIcon: (...args: any[]) => any;
};

function getLeaflet(): LeafletLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (window as Window & { L?: LeafletLike }).L ?? null;
}

function ensureLeafletAssets(onReady: () => void) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const existingLeaflet = getLeaflet();
  if (existingLeaflet) {
    onReady();
    return () => {};
  }

  if (!document.querySelector('link[data-leaflet-css="true"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet-css', 'true');
    document.head.appendChild(link);
  }

  const existingScript = document.querySelector('script[data-leaflet-js="true"]') as HTMLScriptElement | null;
  if (existingScript) {
    existingScript.addEventListener('load', onReady);
    if (getLeaflet()) {
      onReady();
    }
    return () => existingScript.removeEventListener('load', onReady);
  }

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.async = true;
  script.setAttribute('data-leaflet-js', 'true');
  script.addEventListener('load', onReady);
  document.body.appendChild(script);

  return () => script.removeEventListener('load', onReady);
}

export default function LeafletMap({ userLocation, locationStatus }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const initializeMap = () => {
      const L = getLeaflet();
      if (!L || !mapContainerRef.current || mapRef.current) {
        return;
      }

      const center: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [24.7136, 46.6753];

      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(center, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 2,
      }).addTo(mapRef.current);

      setIsReady(true);
    };

    const cleanupAssetsListener = ensureLeafletAssets(initializeMap);
    initializeMap();

    return () => {
      cleanupAssetsListener();

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      markerRef.current = null;
      setIsReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !userLocation) {
      return;
    }

    mapRef.current.setView([userLocation.lat, userLocation.lng], 15);
  }, [userLocation]);

  useEffect(() => {
    const L = getLeaflet();
    if (!mapRef.current || !L) {
      return;
    }

    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (locationStatus !== 'granted' || !userLocation) {
      return;
    }

    const blueIcon = L.divIcon({
      html: `
        <div style="width: 32px; height: 32px; background: #3b82f6; border: 4px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: 'custom-marker',
    });

    markerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: blueIcon,
    }).addTo(mapRef.current);
  }, [locationStatus, userLocation]);

  return (
    <div className="relative w-full">
      <div ref={mapContainerRef} className="w-full h-96 bg-slate-100 rounded-lg border border-slate-200" />

      {!isReady && (
        <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm text-slate-700 font-medium mt-2">Loading map assets...</p>
          </div>
        </div>
      )}

      {isReady && locationStatus === 'denied' && (
        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg p-4 max-w-xs mx-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Location Access Denied</p>
                <p className="text-sm text-slate-600 mt-1">
                  Enable location permission in browser settings to check in.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReady && locationStatus === 'loading' && (
        <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm text-slate-700 font-medium mt-2">Getting your location...</p>
          </div>
        </div>
      )}
    </div>
  );
}
