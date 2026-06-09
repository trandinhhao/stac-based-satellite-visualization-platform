import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '../store/useMapStore';

// Base style definitions for standard base layers
const BASE_STYLES: Record<string, string | maplibregl.StyleSpecification> = {
  openfreemap: 'https://tiles.openfreemap.org/styles/liberty',
  osm: {
    version: 8,
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm-tiles',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  },
  'google-satellite': {
    version: 8,
    sources: {
      'google-satellite': {
        type: 'raster',
        tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
        tileSize: 256,
        attribution: '© Google Maps',
      },
    },
    layers: [
      {
        id: 'google-satellite',
        type: 'raster',
        source: 'google-satellite',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
};

// Remote sensing configuration
// Sentinel-2 is global online via EOX
// Sentinel-1, Landsat-8, and PlanetScope are local offline high-res scenes with exact bounds
const REMOTE_SENSING_LAYERS: Record<string, { url: string; attr: string; bounds?: [number, number, number, number]; minzoom?: number; maxzoom?: number }> = {
  'sentinel-2': {
    url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    attr: '© Copernicus Sentinel-2 / EOX Cloudless',
  },
  'sentinel-1': {
    url: '/cog/tiles/{z}/{x}/{y}.png?url=/data/samples/sentinel1.tif&colormap_name=bone',
    attr: '© ESA Sentinel-1 / California (byte.tif) / TiTiler',
    bounds: [-117.64204279334717, 33.891546129503816, -117.6289845627537, 33.90243533203516],
    minzoom: 11,
    maxzoom: 18,
  },
  'landsat-8': {
    url: '/cog/tiles/{z}/{x}/{y}.png?url=/data/samples/landsat8.tif&colormap_name=terrain',
    attr: '© NASA/USGS Landsat-8 / California (byte.tif) / TiTiler',
    bounds: [-117.64204279334717, 33.891546129503816, -117.6289845627537, 33.90243533203516],
    minzoom: 11,
    maxzoom: 18,
  },
  'planet-scope': {
    url: '/cog/tiles/{z}/{x}/{y}.png?url=/data/samples/planetscope.tif',
    attr: '© Planet Labs / Rio de Janeiro (rgbsmall.tif) / TiTiler',
    bounds: [-44.84032, -23.104184, -44.66872, -22.932584],
    minzoom: 9,
    maxzoom: 18,
  },
};

export default function MapViewer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const activeBaseLayer = useRef<string>('openfreemap');

  const { center, zoom, selectedLayer, setCenter, setZoom } = useMapStore();

  // Helper to dynamically update the remote sensing overlay layer
  // Helper to dynamically update the remote sensing overlay layer
  const updateRemoteSensingOverlay = () => {
    if (!map.current) return;

    try {
      // Clean up existing overlay layer if present
      if (map.current.getLayer('rs-overlay')) {
        map.current.removeLayer('rs-overlay');
      }

      // Add new remote sensing layer as overlay if selected
      const rsConfig = REMOTE_SENSING_LAYERS[selectedLayer];
      if (rsConfig) {
        const sourceId = `rs-source-${selectedLayer}`;
        const tileUrl = rsConfig.url;
        console.log(`[TiTiler] Rendering overlay for layer "${selectedLayer}" using source "${sourceId}"`);

        // Check if the source already exists in the map style
        if (!map.current.getSource(sourceId)) {
          const sourceConfig: any = {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution: rsConfig.attr,
          };

          if (rsConfig.bounds !== undefined) {
            sourceConfig.bounds = rsConfig.bounds;
          }
          if (rsConfig.minzoom !== undefined) {
            sourceConfig.minzoom = rsConfig.minzoom;
          }
          if (rsConfig.maxzoom !== undefined) {
            sourceConfig.maxzoom = rsConfig.maxzoom;
          }

          console.log(`[TiTiler] Creating new source "${sourceId}":`, sourceConfig);
          map.current.addSource(sourceId, sourceConfig);
        } else {
          console.log(`[TiTiler] Reusing existing source "${sourceId}"`);
        }

        map.current.addLayer({
          id: 'rs-overlay',
          type: 'raster',
          source: sourceId,
          paint: { 'raster-opacity': 1.0 },
        });
      }
    } catch (error) {
      console.error('[TiTiler] Error in updateRemoteSensingOverlay:', error);
    }
  };

  // Initialize Map Instance
  useEffect(() => {
    if (map.current) return; // Prevent double initialization

    if (mapContainer.current) {
      const isBase = selectedLayer in BASE_STYLES;
      const initialBase = isBase ? selectedLayer : 'openfreemap';
      activeBaseLayer.current = initialBase;

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: BASE_STYLES[initialBase],
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

      // Synchronize map movement with global state
      map.current.on('moveend', () => {
        if (!map.current) return;
        const currentCenter = map.current.getCenter();
        const currentZoom = map.current.getZoom();

        setCenter([currentCenter.lng, currentCenter.lat]);
        setZoom(currentZoom);
      });

      // Load initial overlay if the initial selected layer is a remote sensing one
      if (!isBase) {
        map.current.once('style.load', () => {
          updateRemoteSensingOverlay();
        });
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Listen to layer changes from the Zustand store
  useEffect(() => {
    if (!map.current) return;

    const isBase = selectedLayer in BASE_STYLES;
    const targetBase = isBase ? selectedLayer : activeBaseLayer.current;

    // Camera coordinates and zoom are 100% preserved. No flyTo movements.
    if (activeBaseLayer.current !== targetBase) {
      activeBaseLayer.current = targetBase;
      map.current.setStyle(BASE_STYLES[targetBase]);
      // Wait for the style to load before applying the overlay layer
      map.current.once('style.load', () => {
        updateRemoteSensingOverlay();
      });
    } else {
      // If the base style hasn't changed, we can update the overlay immediately
      if (map.current.isStyleLoaded()) {
        updateRemoteSensingOverlay();
      } else {
        map.current.once('style.load', () => {
          updateRemoteSensingOverlay();
        });
      }
    }
  }, [selectedLayer]);

  // Listen to external store updates (e.g., geocoding flyTo updates)
  useEffect(() => {
    if (!map.current) return;

    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();

    const isCenterChanged =
      Math.abs(currentCenter.lng - center[0]) > 0.0001 ||
      Math.abs(currentCenter.lat - center[1]) > 0.0001;
    const isZoomChanged = Math.abs(currentZoom - zoom) > 0.01;

    if (isCenterChanged || isZoomChanged) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        essential: true,
        duration: 1500,
      });
    }
  }, [center, zoom]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapContainer} className="w-full h-full absolute inset-0 z-0" />
    </div>
  );
}
