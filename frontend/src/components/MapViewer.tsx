import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../store/useMapStore';

export default function MapViewer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const { center, zoom, setCenter, setZoom } = useMapStore();

  // Initialize Map
  useEffect(() => {
    if (map.current) return; // Prevent double initialization

    if (mapContainer.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: center,
        zoom: zoom,
        minZoom: 3,
        maxZoom: 18,
      });

      // Add navigation controls (Zoom + Compass)
      map.current.addControl(
        new maplibregl.NavigationControl({
          showCompass: true,
          showZoom: true,
        }),
        'top-right'
      );

      // Add scale control
      map.current.addControl(
        new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric',
        }),
        'bottom-left'
      );

      // Listen for map movement to synchronize state with Zustand store
      map.current.on('moveend', () => {
        if (!map.current) return;
        const currentCenter = map.current.getCenter();
        const currentZoom = map.current.getZoom();

        // Update the global store
        setCenter([currentCenter.lng, currentCenter.lat]);
        setZoom(currentZoom);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Listen to external store changes (e.g. from flyTo search results)
  useEffect(() => {
    if (!map.current) return;

    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();

    // Only apply flyTo if there is a significant coordinate or zoom mismatch
    const isCenterChanged =
      Math.abs(currentCenter.lng - center[0]) > 0.0001 ||
      Math.abs(currentCenter.lat - center[1]) > 0.0001;
    const isZoomChanged = Math.abs(currentZoom - zoom) > 0.01;

    if (isCenterChanged || isZoomChanged) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        essential: true,
        duration: 1500, // Smooth transition
      });
    }
  }, [center, zoom]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapContainer} className="w-full h-full absolute inset-0 z-0" />
    </div>
  );
}
