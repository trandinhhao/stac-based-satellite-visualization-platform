import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ChevronsLeftRight } from 'lucide-react';
import { useCompareStore } from '../store/useCompareStore';
import { useMapStore } from '../../../store/useMapStore';
import { useAOIStore } from '../../../store/useAOIStore';
import type { STACItem } from '../../../store/useSTACStore';

// Base map style definitions matching MapViewer
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

// Tile URL generator for Sentinel-2, Sentinel-1, Landsat etc.
function getTileUrl(item: STACItem) {
  const visualAsset = item.assets.visual;
  if (!visualAsset) return '';
  const href = visualAsset.href;
  const isGlobal = href.includes('blob.core.windows.net') || href.includes('planetarycomputer');
  
  if (isGlobal) {
    if (item.collection === 'sentinel-2-l2a') {
      return `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=sentinel-2-l2a&item=${item.id}&assets=visual&asset_bidx=visual%7C1%2C2%2C3&nodata=0&format=png`;
    } else if (item.collection === 'sentinel-1-grd') {
      return `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?collection=sentinel-1-grd&item=${item.id}&assets=vv&assets=vh&expression=vv%3Bvh%3Bvv%2Fvh&rescale=0%2C600&rescale=0%2C270&rescale=0%2C9&asset_as_band=True&format=png`;
    } else if (item.collection === 'landsat-8-c2-l2' || item.collection === 'landsat-9-c2-l2') {
      return `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=landsat-c2-l2&item=${item.id}&assets=red&assets=green&assets=blue&color_formula=gamma+RGB+2.7%2C+saturation+1.5%2C+sigmoidal+RGB+15+0.55&format=png`;
    } else {
      return `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=${item.collection}&item=${item.id}&assets=visual&format=png`;
    }
  } else {
    const isSAR = item.collection === 'sentinel-1-grd';
    const isLandsat = item.collection === 'landsat-8-c2-l2' || item.collection === 'landsat-9-c2-l2';
    
    let colormap = '';
    if (isSAR) colormap = '&colormap_name=bone';
    else if (isLandsat) colormap = '&colormap_name=terrain';

    return `/cog/tiles/{z}/{x}/{y}.png?url=${encodeURIComponent(href)}${colormap}`;
  }
}

export default function CompareViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapAContainer = useRef<HTMLDivElement>(null);
  const mapBContainer = useRef<HTMLDivElement>(null);
  
  const mapA = useRef<maplibregl.Map | null>(null);
  const mapB = useRef<maplibregl.Map | null>(null);
  const isSyncingRef = useRef(false);

  const { imageA, imageB, compareMode, opacity, swipePosition, setSwipePosition } = useCompareStore();
  const { center, zoom, selectedLayer, setCenter, setZoom } = useMapStore();
  const { aois, selectedAOIId } = useAOIStore();

  // 1. Initialize maps
  useEffect(() => {
    if (!mapAContainer.current || !mapBContainer.current) return;
    if (mapA.current || mapB.current) return; // Prevent double init

    const isBase = selectedLayer in BASE_STYLES;
    const initialBase = isBase ? selectedLayer : 'openfreemap';

    // Map A
    mapA.current = new maplibregl.Map({
      container: mapAContainer.current,
      style: BASE_STYLES[initialBase],
      center: center,
      zoom: zoom,
      minZoom: 3,
      maxZoom: 18,
      preserveDrawingBuffer: true,
      attributionControl: false,
    } as any);

    // Map B
    mapB.current = new maplibregl.Map({
      container: mapBContainer.current,
      style: BASE_STYLES[initialBase],
      center: center,
      zoom: zoom,
      minZoom: 3,
      maxZoom: 18,
      preserveDrawingBuffer: true,
      attributionControl: false,
    } as any);

    // Controls
    mapA.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');
    mapA.current.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    mapB.current.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    // Camera syncer
    const onMoveA = () => {
      if (isSyncingRef.current || !mapA.current || !mapB.current) return;
      isSyncingRef.current = true;
      mapB.current.setCenter(mapA.current.getCenter());
      mapB.current.setZoom(mapA.current.getZoom());
      mapB.current.setPitch(mapA.current.getPitch());
      mapB.current.setBearing(mapA.current.getBearing());
      // Sync global store so footer displays coordinates
      const currentCenter = mapA.current.getCenter();
      setCenter([currentCenter.lng, currentCenter.lat]);
      setZoom(mapA.current.getZoom());
      isSyncingRef.current = false;
    };

    const onMoveB = () => {
      if (isSyncingRef.current || !mapA.current || !mapB.current) return;
      isSyncingRef.current = true;
      mapA.current.setCenter(mapB.current.getCenter());
      mapA.current.setZoom(mapB.current.getZoom());
      mapA.current.setPitch(mapB.current.getPitch());
      mapA.current.setBearing(mapB.current.getBearing());
      // Sync global store
      const currentCenter = mapB.current.getCenter();
      setCenter([currentCenter.lng, currentCenter.lat]);
      setZoom(mapB.current.getZoom());
      isSyncingRef.current = false;
    };

    mapA.current.on('move', onMoveA);
    mapB.current.on('move', onMoveB);

    // Initial style layers additions on load
    mapA.current.on('style.load', () => {
      updateAOILayer(mapA.current);
      updateStacOverlayA();
    });

    mapB.current.on('style.load', () => {
      updateAOILayer(mapB.current);
      updateStacOverlayB();
    });

    return () => {
      if (mapA.current) {
        mapA.current.off('move', onMoveA);
        mapA.current.remove();
        mapA.current = null;
      }
      if (mapB.current) {
        mapB.current.off('move', onMoveB);
        mapB.current.remove();
        mapB.current = null;
      }
    };
  }, []);

  // 2. Helper to render AOI geometry outline
  const updateAOILayer = (mapInstance: maplibregl.Map | null) => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    try {
      const sourceId = 'aois-source';
      const fillLayerId = 'aois-fill';
      const outlineLayerId = 'aois-outline';

      const features = aois.map((aoi) => ({
        type: 'Feature',
        id: aoi.id,
        geometry: aoi.geometry,
        properties: {
          id: aoi.id,
          name: aoi.name,
          isSelected: selectedAOIId ? String(aoi.id).toLowerCase().trim() === String(selectedAOIId).toLowerCase().trim() : false,
        },
      }));

      const geojson: any = {
        type: 'FeatureCollection',
        features,
      };

      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (!source) {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        // Add fill layer
        mapInstance.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': [
              'case',
              ['==', ['get', 'isSelected'], true],
              0.15,
              0.05,
            ],
          },
        });

        // Add outline layer
        mapInstance.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'isSelected'], true],
              '#3b82f6',
              '#60a5fa',
            ],
            'line-width': [
              'case',
              ['==', ['get', 'isSelected'], true],
              4,
              2,
            ],
            'line-dasharray': [
              'case',
              ['==', ['get', 'isSelected'], true],
              ['literal', [1]],
              ['literal', [3, 3]],
            ],
          },
        });
      } else {
        source.setData(geojson);
      }
    } catch (err) {
      console.error('Error updating AOI overlay on compare map:', err);
    }
  };

  // 3. Helper to update STAC Overlay A
  const updateStacOverlayA = () => {
    if (!mapA.current || !mapA.current.isStyleLoaded()) return;
    try {
      if (mapA.current.getLayer('stac-overlay')) {
        mapA.current.removeLayer('stac-overlay');
      }
      if (mapA.current.getSource('stac-source')) {
        mapA.current.removeSource('stac-source');
      }

      if (imageA) {
        const tileUrl = getTileUrl(imageA);
        if (tileUrl) {
          mapA.current.addSource('stac-source', {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            bounds: imageA.bbox,
          });

          mapA.current.addLayer({
            id: 'stac-overlay',
            type: 'raster',
            source: 'stac-source',
            paint: { 'raster-opacity': 1.0 },
          });
        }
      }
    } catch (e) {
      console.error('Error rendering overlay A:', e);
    }
  };

  // 4. Helper to update STAC Overlay B
  const updateStacOverlayB = () => {
    if (!mapB.current || !mapB.current.isStyleLoaded()) return;
    try {
      if (mapB.current.getLayer('stac-overlay')) {
        mapB.current.removeLayer('stac-overlay');
      }
      if (mapB.current.getSource('stac-source')) {
        mapB.current.removeSource('stac-source');
      }

      if (imageB) {
        const tileUrl = getTileUrl(imageB);
        if (tileUrl) {
          mapB.current.addSource('stac-source', {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            bounds: imageB.bbox,
          });

          mapB.current.addLayer({
            id: 'stac-overlay',
            type: 'raster',
            source: 'stac-source',
            paint: { 'raster-opacity': 1.0 }, // Container handles visual opacity in CSS
          });
        }
      }
    } catch (e) {
      console.error('Error rendering overlay B:', e);
    }
  };

  // Sync state: updates on STAC images selected
  useEffect(() => {
    updateStacOverlayA();
  }, [imageA]);

  useEffect(() => {
    updateStacOverlayB();
  }, [imageB]);

  // Sync state: updates on AOIs list changes
  useEffect(() => {
    updateAOILayer(mapA.current);
    updateAOILayer(mapB.current);
  }, [aois, selectedAOIId]);

  // Sync state: updates on selected map base style
  useEffect(() => {
    if (mapA.current && selectedLayer in BASE_STYLES) {
      mapA.current.setStyle(BASE_STYLES[selectedLayer]);
    }
    if (mapB.current && selectedLayer in BASE_STYLES) {
      mapB.current.setStyle(BASE_STYLES[selectedLayer]);
    }
  }, [selectedLayer]);

  // Sync map sizes on compareMode toggling
  useEffect(() => {
    setTimeout(() => {
      mapA.current?.resize();
      mapB.current?.resize();
    }, 100);
  }, [compareMode]);

  // Mouse drag events for Swipe Slider Divider
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSwipePosition(pct);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  // Touch drag events for Swipe Slider Divider (Mobile support)
  const handleTouchStart = (_e: React.TouchEvent) => {
    const handleMove = (moveEvent: TouchEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const touch = moveEvent.touches[0];
      const x = touch.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSwipePosition(pct);
    };

    const handleUp = () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };

    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
  };

  // Capture viewport png snapshot event listener
  useEffect(() => {
    const handleCapture = () => {
      const canvasA = mapA.current?.getCanvas();
      const canvasB = mapB.current?.getCanvas();
      if (!canvasA || !canvasB) return;

      const widthA = canvasA.width;
      const heightA = canvasA.height;
      const widthB = canvasB.width;
      const heightB = canvasB.height;

      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      if (compareMode === 'side-by-side') {
        tempCanvas.width = widthA + widthB;
        tempCanvas.height = Math.max(heightA, heightB);

        // Fill background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw Map A & Map B
        ctx.drawImage(canvasA, 0, 0);
        ctx.drawImage(canvasB, widthA, 0);

        // Render Labels
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(15, 15, 220, 42);
        ctx.fillRect(widthA + 15, 15, 220, 42);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(15, 15, 220, 42);
        ctx.strokeRect(widthA + 15, 15, 220, 42);

        ctx.fillStyle = '#10b981'; // emerald-400
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('ẢNH A (T1)', 30, 41);
        ctx.fillText('ẢNH B (T2)', widthA + 30, 41);

      } else if (compareMode === 'swipe') {
        tempCanvas.width = widthA;
        tempCanvas.height = heightA;

        // Draw Map A
        ctx.drawImage(canvasA, 0, 0);

        // Clip and draw Map B
        ctx.save();
        ctx.beginPath();
        const splitX = (swipePosition / 100) * widthA;
        ctx.rect(splitX, 0, widthA - splitX, heightA);
        ctx.clip();

        // Apply blending opacity
        ctx.globalAlpha = opacity;
        ctx.drawImage(canvasB, 0, 0);
        ctx.restore();

        // Draw vertical green divider
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, heightA);
        ctx.stroke();

        // Draw handle circle
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(splitX, heightA / 2, 22, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(splitX, heightA / 2, 18, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◀▶', splitX, heightA / 2);
      }

      // Download snapshot
      const link = document.createElement('a');
      link.href = tempCanvas.toDataURL('image/png');
      link.download = `Satellite_Comparison_${compareMode}_${new Date().toISOString().slice(0,10)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    window.addEventListener('capture-comparison-view', handleCapture);
    return () => {
      window.removeEventListener('capture-comparison-view', handleCapture);
    };
  }, [compareMode, swipePosition, opacity]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-950 overflow-hidden flex select-none">
      {compareMode === 'side-by-side' ? (
        // Side by Side Mode: two columns
        <div className="w-full h-full flex flex-col md:flex-row">
          <div className="relative flex-1 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800/80">
            <div ref={mapAContainer} className="w-full h-full" />
            <div className="absolute top-4 left-16 bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[10px] font-bold text-emerald-400 backdrop-blur-md shadow-md">
              Ảnh A (T1): {imageA?.id || 'Chưa chọn'}
            </div>
          </div>
          <div className="relative flex-1 h-1/2 md:h-full">
            <div ref={mapBContainer} className="w-full h-full" />
            <div className="absolute top-4 right-16 bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-[10px] font-bold text-emerald-450 backdrop-blur-md shadow-md">
              Ảnh B (T2): {imageB?.id || 'Chưa chọn'}
            </div>
          </div>
        </div>
      ) : (
        // Swipe Mode or None (fallback layered)
        <div className="w-full h-full relative">
          {/* Map A is the background map */}
          <div className="absolute inset-0 z-0">
            <div ref={mapAContainer} className="w-full h-full" />
          </div>

          {/* Map B is overlayed on top, clipped by clip-path and opacity */}
          <div 
            className="absolute inset-0 z-10 overflow-hidden transition-all duration-75"
            style={{
              clipPath: `inset(0 0 0 ${swipePosition}%)`,
              opacity: opacity,
            }}
          >
            <div ref={mapBContainer} className="w-full h-full" />
          </div>

          {/* Draggable Divider Line & Handle */}
          <div 
            className="absolute top-0 bottom-0 z-20 w-1 cursor-ew-resize flex items-center justify-center"
            style={{ 
              left: `${swipePosition}%`,
              transform: 'translateX(-2px)'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Split Screen Line */}
            <div className="absolute inset-y-0 w-1 bg-emerald-500 shadow-[0_0_10px_#10b981]" />

            {/* Float Circle Handle */}
            <div className="w-10 h-10 bg-emerald-500 rounded-full border border-white/40 shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-slate-950">
              <ChevronsLeftRight className="w-5 h-5 font-bold" />
            </div>
          </div>

          {/* Labels badges */}
          <div className="absolute top-4 left-4 z-30 bg-slate-900/85 border border-slate-700/60 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-300 backdrop-blur-md shadow-lg flex items-center space-x-1">
            <span className="text-emerald-400">◄</span>
            <span>Ảnh A (T1)</span>
          </div>
          <div className="absolute top-4 right-4 z-30 bg-slate-900/85 border border-slate-700/60 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-300 backdrop-blur-md shadow-lg flex items-center space-x-1">
            <span>Ảnh B (T2)</span>
            <span className="text-emerald-400">►</span>
          </div>
        </div>
      )}
    </div>
  );
}
