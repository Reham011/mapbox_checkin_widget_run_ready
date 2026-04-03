"use client";

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, MapPin } from 'lucide-react';

interface MapboxMapProps {
  userLocation: { lat: number; lng: number } | null;
  locationStatus: 'loading' | 'granted' | 'denied' | 'unavailable';
}

const DEFAULT_CENTER: [number, number] = [31.2357, 30.0444];

export default function MapboxMap({ userLocation, locationStatus }: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';

  useEffect(() => {
    let isMounted = true;

    async function initializeMap() {
      if (
        typeof window === 'undefined' ||
        typeof document === 'undefined' ||
        !mapContainerRef.current ||
        mapRef.current
      ) {
        return;
      }

      if (!token) {
        setMapError('Missing NEXT_PUBLIC_MAPBOX_TOKEN. Add it to your .env.local file.');
        return;
      }

      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        mapboxgl.accessToken = token;

        const center: [number, number] = userLocation
          ? [userLocation.lng, userLocation.lat]
          : DEFAULT_CENTER;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center,
          zoom: userLocation ? 14 : 10,
          attributionControl: true,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('load', () => {
          if (!isMounted) {
            return;
          }
          setIsReady(true);
        });

        map.on('error', (event: { error?: { message?: string } }) => {
          if (!isMounted) {
            return;
          }
          if (event?.error?.message) {
            setMapError(event.error.message);
          }
        });

        mapRef.current = map;

        if (userLocation) {
          markerRef.current = new mapboxgl.Marker({ color: '#2563eb' })
            .setLngLat([userLocation.lng, userLocation.lat])
            .addTo(map);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize Mapbox.';
        setMapError(message);
      }
    }

    initializeMap();

    return () => {
      isMounted = false;

      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      setIsReady(false);
    };
  }, [token, userLocation]);

  useEffect(() => {
    if (!mapRef.current || !userLocation) {
      return;
    }

    mapRef.current.easeTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 15,
      duration: 1200,
    });

    let cancelled = false;

    async function syncMarker() {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        if (cancelled || !mapRef.current) {
          return;
        }

        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }

        markerRef.current = new mapboxgl.Marker({ color: '#2563eb' })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(mapRef.current);
      } catch {
        // Keep the map visible even if marker sync fails.
      }
    }

    if (locationStatus === 'granted') {
      syncMarker();
    }

    return () => {
      cancelled = true;
    };
  }, [locationStatus, userLocation]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <style jsx global>{`
        .mapboxgl-map,
        .mapboxgl-canvas,
        .mapboxgl-canvas-container {
          width: 100%;
          height: 100%;
        }

        .mapboxgl-ctrl-bottom-left,
        .mapboxgl-ctrl-bottom-right {
          z-index: 1;
        }
      `}</style>

      <div ref={mapContainerRef} className="h-80 w-full md:h-96" />

      {!isReady && !mapError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/10">
          <div className="text-center">
            <MapPin className="mx-auto h-8 w-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm font-medium text-slate-700">Loading map...</p>
          </div>
        </div>
      )}

      {locationStatus === 'loading' && !mapError && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow">
          Requesting your location...
        </div>
      )}

      {locationStatus === 'denied' && (
        <div className="absolute left-4 right-4 top-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Location access was denied. The map is still available, but Check In is disabled until location permission is allowed.
            </p>
          </div>
        </div>
      )}

      {locationStatus === 'unavailable' && (
        <div className="absolute left-4 right-4 top-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              Location is unavailable on this device or browser. The map remains visible, but Check In is disabled.
            </p>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-6 text-center">
          <div>
            <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
            <p className="mt-3 font-semibold text-slate-900">Map failed to load</p>
            <p className="mt-1 text-sm text-slate-600">{mapError}</p>
          </div>
        </div>
      )}
    </div>
  );
}
