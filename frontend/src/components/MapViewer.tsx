import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Home } from 'lucide-react';
import { useMapStore } from '../store/useMapStore';
import { useSTACStore } from '../store/useSTACStore';

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
};

export default function MapViewer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const activeBaseLayer = useRef<string>('openfreemap');

  const { center, zoom, selectedLayer, setCenter, setZoom } = useMapStore();
  const selectedItem = useSTACStore((state) => state.selectedItem);

  // Helper to dynamically render STAC image overlay
  const updateStacOverlay = () => {
    if (!map.current) return;

    // Guard against style load race conditions
    if (!map.current.isStyleLoaded()) {
      map.current.once('style.load', updateStacOverlay);
      return;
    }

    const item = useSTACStore.getState().selectedItem;

    try {
      // Clean up existing overlay layer if present
      if (map.current.getLayer('stac-overlay')) {
        map.current.removeLayer('stac-overlay');
      }
      if (map.current.getSource('stac-source')) {
        map.current.removeSource('stac-source');
      }

      if (item) {
        const visualAsset = item.assets.visual;
        if (visualAsset) {
          const href = visualAsset.href;
          const isGlobal = href.includes('blob.core.windows.net') || href.includes('planetarycomputer');
          
          let tileUrl = '';
          if (isGlobal) {
            // Route directly to Microsoft Planetary Computer Tile API
            if (item.collection === 'sentinel-2-l2a') {
              tileUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=sentinel-2-l2a&item=${item.id}&assets=visual&asset_bidx=visual%7C1%2C2%2C3&nodata=0&format=png`;
            } else if (item.collection === 'sentinel-1-grd') {
              // Pre-configured false-color composite (vv, vh, vv/vh) for optimal SAR visualization
              tileUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?collection=sentinel-1-grd&item=${item.id}&assets=vv&assets=vh&expression=vv%3Bvh%3Bvv%2Fvh&rescale=0%2C600&rescale=0%2C270&rescale=0%2C9&asset_as_band=True&format=png`;
            } else if (item.collection === 'landsat-8-c2-l2' || item.collection === 'landsat-9-c2-l2') {
              // Pre-configured natural true-color RGB combination with color enhancement
              tileUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=landsat-c2-l2&item=${item.id}&assets=red&assets=green&assets=blue&color_formula=gamma+RGB+2.7%2C+saturation+1.5%2C+sigmoidal+RGB+15+0.55&format=png`;
            } else {
              tileUrl = `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=${item.collection}&item=${item.id}&assets=visual&format=png`;
            }
          } else {
            // Local offline sample files via local TiTiler
            const isSAR = item.collection === 'sentinel-1-grd';
            const isLandsat = item.collection === 'landsat-8-c2-l2' || item.collection === 'landsat-9-c2-l2';
            
            let colormap = '';
            if (isSAR) colormap = '&colormap_name=bone';
            else if (isLandsat) colormap = '&colormap_name=terrain';

            tileUrl = `/cog/tiles/{z}/{x}/{y}.png?url=${encodeURIComponent(href)}${colormap}`;
          }

          console.log(`[STAC] Rendering tile overlay for item "${item.id}":`, tileUrl);

          map.current.addSource('stac-source', {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            bounds: item.bbox,
          });

          map.current.addLayer({
            id: 'stac-overlay',
            type: 'raster',
            source: 'stac-source',
            paint: { 'raster-opacity': 1.0 },
          });
        }
      }
    } catch (error) {
      console.error('[STAC] Error updating STAC overlay:', error);
    }
  };

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
        attributionControl: false,
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

      // Add compact attribution control to bottom-left
      map.current.addControl(
        new maplibregl.AttributionControl({
          compact: true,
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

        // Update current bounding box in STAC store
        const rawBounds = map.current.getBounds();
        useSTACStore.getState().setBbox([
          rawBounds.getWest(),
          rawBounds.getSouth(),
          rawBounds.getEast(),
          rawBounds.getNorth(),
        ]);
      });

      // Synchronize initial bounding box on load
      map.current.once('load', () => {
        if (!map.current) return;
        const rawBounds = map.current.getBounds();
        useSTACStore.getState().setBbox([
          rawBounds.getWest(),
          rawBounds.getSouth(),
          rawBounds.getEast(),
          rawBounds.getNorth(),
        ]);
      });

      // Load initial overlay if the initial selected layer is a remote sensing one
      if (!isBase) {
        map.current.once('style.load', () => {
          updateRemoteSensingOverlay();
          updateStacOverlay();
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
        updateStacOverlay();
      });
    } else {
      // If the base style hasn't changed, we can update the overlay immediately
      if (map.current.isStyleLoaded()) {
        updateRemoteSensingOverlay();
        updateStacOverlay();
      } else {
        map.current.once('style.load', () => {
          updateRemoteSensingOverlay();
          updateStacOverlay();
        });
      }
    }
  }, [selectedLayer]);

  // Listen to STAC selected item changes from the store
  useEffect(() => {
    updateStacOverlay();

    if (selectedItem) {
      const centerLng = (selectedItem.bbox[0] + selectedItem.bbox[2]) / 2;
      const centerLat = (selectedItem.bbox[1] + selectedItem.bbox[3]) / 2;
      
      const isCalif = selectedItem.bbox[0] < -100;
      const zoomLevel = isCalif ? 14 : 12;

      setCenter([centerLng, centerLat]);
      setZoom(zoomLevel);
    }
  }, [selectedItem]);

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

  const handleHomeClick = () => {
    setCenter([105.83416, 21.02776]);
    setZoom(6);
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapContainer} className="w-full h-full absolute inset-0 z-0" />
      
      {/* Floating Home Button (Epic 7 - Reset View) */}
      <div className="absolute top-[120px] right-[10px] z-10">
        <button
          onClick={handleHomeClick}
          title="Reset View (Về vị trí mặc định)"
          className="flex items-center justify-center w-[29px] h-[29px] bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 rounded-md text-slate-300 hover:text-white shadow-lg cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
