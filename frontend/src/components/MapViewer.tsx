import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Home } from 'lucide-react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import * as turf from '@turf/turf';
import { useMapStore } from '../store/useMapStore';
import { useSTACStore } from '../store/useSTACStore';
import { useAOIStore } from '../store/useAOIStore';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { useDetectionStore } from '../store/useDetectionStore';
import { api } from '../services/api';

// Custom Rectangle Mode for MapboxDraw
const RectangleMode: any = {
  onSetup: function () {
    const rectangle = this.newFeature({
      type: 'Feature',
      properties: {
        isRectangle: true,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[]],
      },
    });
    this.addFeature(rectangle);
    this.clearSelectedFeatures();
    this.updateUIClasses({ mouse: 'add' });
    this.setActionableState({
      trash: true,
    });
    return {
      rectangle,
      startPoint: null,
    };
  },
  onClick: function (state: any, e: any) {
    if (!state.startPoint) {
      state.startPoint = [e.lngLat.lng, e.lngLat.lat];
      state.rectangle.setProperty('isRectangle', true);
      state.rectangle.updateCoordinate('0.0', e.lngLat.lng, e.lngLat.lat);
      state.rectangle.updateCoordinate('0.1', e.lngLat.lng, e.lngLat.lat);
      state.rectangle.updateCoordinate('0.2', e.lngLat.lng, e.lngLat.lat);
      state.rectangle.updateCoordinate('0.3', e.lngLat.lng, e.lngLat.lat);
      state.rectangle.updateCoordinate('0.4', e.lngLat.lng, e.lngLat.lat);
    } else {
      const startLng = state.startPoint[0];
      const startLat = state.startPoint[1];
      const currentLng = e.lngLat.lng;
      const currentLat = e.lngLat.lat;

      // Close the loop with 5 coordinates
      state.rectangle.setProperty('isRectangle', true);
      state.rectangle.updateCoordinate('0.0', startLng, startLat);
      state.rectangle.updateCoordinate('0.1', currentLng, startLat);
      state.rectangle.updateCoordinate('0.2', currentLng, currentLat);
      state.rectangle.updateCoordinate('0.3', startLng, currentLat);
      state.rectangle.updateCoordinate('0.4', startLng, startLat);

      this.changeMode('simple_select', { featureIds: [state.rectangle.id] });
      this.map.fire('draw.create', {
        features: [state.rectangle.toGeoJSON()]
      });
    }
  },
  onMouseMove: function (state: any, e: any) {
    if (state.startPoint) {
      const [startLng, startLat] = state.startPoint;
      const currentLng = e.lngLat.lng;
      const currentLat = e.lngLat.lat;

      state.rectangle.updateCoordinate('0.0', startLng, startLat);
      state.rectangle.updateCoordinate('0.1', currentLng, startLat);
      state.rectangle.updateCoordinate('0.2', currentLng, currentLat);
      state.rectangle.updateCoordinate('0.3', startLng, currentLat);
      state.rectangle.updateCoordinate('0.4', startLng, startLat);
    }
  },
  onKeyUp: function (state: any, e: any) {
    if (e.keyCode === 27) {
      this.deleteFeature([state.rectangle.id], { silent: true });
      this.changeMode('simple_select');
    }
  },
  toDisplayFeatures: function (state: any, geojson: any, display: any) {
    const isActive = geojson.id === state.rectangle.id;
    geojson.properties.active = isActive ? 'true' : 'false';
    if (!isActive) return display(geojson);
    if (!state.startPoint) return;
    return display(geojson);
  },
};

// Geodesic distance in kilometers helper
function getDistanceInKm(pt1: [number, number], pt2: [number, number]) {
  const R = 6371; // Earth's radius in km
  const dLat = (pt2[1] - pt1[1]) * Math.PI / 180;
  const dLng = (pt2[0] - pt1[0]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(pt1[1] * Math.PI / 180) * Math.cos(pt2[1] * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Geodesic circle polygon coords generator
function createGeodesicCircle(center: [number, number], radiusInKm: number, points = 64) {
  const [lng, lat] = center;
  const coords = [];
  const R = 6371; // Earth's radius in km
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  const d = radiusInKm / R; // angular distance

  for (let i = 0; i < points; i++) {
    const bearing = (i / points) * (2 * Math.PI);
    const circleLatRad = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
      Math.cos(latRad) * Math.sin(d) * Math.cos(bearing)
    );
    const circleLngRad = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(latRad),
      Math.cos(d) - Math.sin(latRad) * Math.sin(circleLatRad)
    );
    const circleLng = ((circleLngRad * 180 / Math.PI) + 540) % 360 - 180;
    const circleLat = circleLatRad * 180 / Math.PI;
    coords.push([circleLng, circleLat]);
  }
  coords.push(coords[0]); // Close loop
  return [coords];
}

// Custom Circle Mode for MapboxDraw
const CircleMode: any = {
  onSetup: function () {
    const circle = this.newFeature({
      type: 'Feature',
      properties: {
        isCircle: true,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[]],
      },
    });
    this.addFeature(circle);
    this.clearSelectedFeatures();
    this.updateUIClasses({ mouse: 'add' });
    this.setActionableState({
      trash: true,
    });
    return {
      circle,
      centerPoint: null,
    };
  },
  onClick: function (state: any, e: any) {
    if (!state.centerPoint) {
      state.centerPoint = [e.lngLat.lng, e.lngLat.lat];
      state.circle.setProperty('isCircle', true);
      state.circle.setProperty('circleCenter', state.centerPoint);
      const coords = createGeodesicCircle(state.centerPoint, 0.0001);
      state.circle.setCoordinates(coords);
    } else {
      state.circle.setProperty('isCircle', true);
      state.circle.setProperty('circleCenter', state.centerPoint);
      this.changeMode('simple_select', { featureIds: [state.circle.id] });
      this.map.fire('draw.create', {
        features: [state.circle.toGeoJSON()]
      });
    }
  },
  onMouseMove: function (state: any, e: any) {
    if (state.centerPoint) {
      const currentLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const radiusInKm = getDistanceInKm(state.centerPoint, currentLngLat);
      const coords = createGeodesicCircle(state.centerPoint, radiusInKm);
      state.circle.setCoordinates(coords);
    }
  },
  onKeyUp: function (state: any, e: any) {
    if (e.keyCode === 27) {
      this.deleteFeature([state.circle.id], { silent: true });
      this.changeMode('simple_select');
    }
  },
  toDisplayFeatures: function (state: any, geojson: any, display: any) {
    const isActive = geojson.id === state.circle.id;
    geojson.properties.active = isActive ? 'true' : 'false';
    if (!isActive) return display(geojson);

    // Display the circle boundary polygon
    display(geojson);

    // Display the circle center point
    if (state.centerPoint) {
      display({
        type: 'Feature',
        id: `${geojson.id}_center`,
        properties: {
          meta: 'circle_center',
          parent: geojson.id,
          active: 'true',
        },
        geometry: {
          type: 'Point',
          coordinates: state.centerPoint,
        },
      });
    }
  },
};

// Helper to calculate the centroid of a polygon (specifically for circle center)
function getPolygonCentroid(geojson: any): [number, number] | null {
  const coords = geojson.geometry?.coordinates?.[0];
  if (coords && coords.length > 1) {
    const points = coords.slice(0, -1);
    let sumLng = 0;
    let sumLat = 0;
    points.forEach((c: number[]) => {
      sumLng += c[0];
      sumLat += c[1];
    });
    return [sumLng / points.length, sumLat / points.length];
  }
  return null;
}

// Custom simple_select mode to display circle center
const customSimpleSelectMode: any = {
  ...MapboxDraw.modes.simple_select,
  toDisplayFeatures: function (state: any, geojson: any, display: any) {
    MapboxDraw.modes.simple_select.toDisplayFeatures.call(this, state, geojson, display);
    const isCircle = geojson.properties.isCircle || geojson.properties.user_isCircle;
    if (isCircle) {
      const centerCoords = getPolygonCentroid(geojson) || 
        (geojson.properties.circleCenter ? (typeof geojson.properties.circleCenter === 'string' ? JSON.parse(geojson.properties.circleCenter) : geojson.properties.circleCenter) : null) ||
        (geojson.properties.user_circleCenter ? (typeof geojson.properties.user_circleCenter === 'string' ? JSON.parse(geojson.properties.user_circleCenter) : geojson.properties.user_circleCenter) : null);
      if (centerCoords) {
        display({
          type: 'Feature',
          id: `${geojson.id}_center`,
          properties: {
            meta: 'circle_center',
            parent: geojson.id,
            active: geojson.properties.active,
          },
          geometry: {
            type: 'Point',
            coordinates: centerCoords,
          },
        });
      }
    }
  }
};

// Custom direct_select mode to display circle center and lock editing constraints
const customDirectSelectMode: any = {
  ...MapboxDraw.modes.direct_select,
  dragVertex: function (state: any, e: any, delta: any) {
    const feature = state.feature;
    const isCircle = feature.properties?.isCircle || feature.properties?.user_isCircle;
    const isRectangle = feature.properties?.isRectangle || feature.properties?.user_isRectangle;
    
    if (isCircle) {
      const circleCenter = feature.getProperty('circleCenter') || feature.properties?.circleCenter || feature.properties?.user_circleCenter;
      if (circleCenter) {
        const centerCoords = typeof circleCenter === 'string' ? JSON.parse(circleCenter) : circleCenter;
        const currentLngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const radiusInKm = getDistanceInKm(centerCoords, currentLngLat);
        const coords = createGeodesicCircle(centerCoords, radiusInKm);
        feature.setCoordinates(coords);
      }
    } else if (isRectangle) {
      const dragIndex = state.draggedVertexIndex;
      if (dragIndex !== undefined && dragIndex >= 0 && dragIndex < 4) {
        const coords = feature.getCoordinates()[0];
        if (coords && coords.length >= 5) {
          const oppIndex = (dragIndex + 2) % 4;
          const oppLng = coords[oppIndex][0];
          const oppLat = coords[oppIndex][1];
          const dragLng = e.lngLat.lng;
          const dragLat = e.lngLat.lat;

          const newCoords = [...coords];
          newCoords[dragIndex] = [dragLng, dragLat];
          
          const adj1 = (dragIndex + 1) % 4;
          const adj2 = (dragIndex + 3) % 4;
          
          if (dragIndex % 2 === 0) {
            newCoords[adj1] = [oppLng, dragLat];
            newCoords[adj2] = [dragLng, oppLat];
          } else {
            newCoords[adj1] = [dragLng, oppLat];
            newCoords[adj2] = [oppLng, dragLat];
          }
          newCoords[4] = newCoords[0];
          feature.setCoordinates([newCoords]);
        }
      }
    } else {
      (MapboxDraw.modes.direct_select as any).dragVertex.call(this, state, e, delta);
    }
  },
  toDisplayFeatures: function (state: any, geojson: any, display: any) {
    const isCircle = geojson.properties.isCircle || geojson.properties.user_isCircle;
    const isRectangle = geojson.properties.isRectangle || geojson.properties.user_isRectangle;

    // Custom display callback to intercept and hide vertices/midpoints
    const customDisplay = (f: any) => {
      // For circle, only show vertex at index 0 as the boundary handle
      if (isCircle && f.properties?.meta === 'vertex') {
        if (f.properties?.index !== 0) {
          return;
        }
      }
      // Hide all midpoints for circles and rectangles
      if ((isCircle || isRectangle) && f.properties?.meta === 'midpoint') {
        return;
      }
      display(f);
    };

    MapboxDraw.modes.direct_select.toDisplayFeatures.call(this, state, geojson, customDisplay);

    if (isCircle) {
      const centerCoords = getPolygonCentroid(geojson) || 
        (geojson.properties.circleCenter ? (typeof geojson.properties.circleCenter === 'string' ? JSON.parse(geojson.properties.circleCenter) : geojson.properties.circleCenter) : null) ||
        (geojson.properties.user_circleCenter ? (typeof geojson.properties.user_circleCenter === 'string' ? JSON.parse(geojson.properties.user_circleCenter) : geojson.properties.user_circleCenter) : null);
      if (centerCoords) {
        display({
          type: 'Feature',
          id: `${geojson.id}_center`,
          properties: {
            meta: 'circle_center',
            parent: geojson.id,
            active: geojson.properties.active,
          },
          geometry: {
            type: 'Point',
            coordinates: centerCoords,
          },
        });
      }
    }
  }
};

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
    url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
    attr: '© Copernicus Sentinel-2 / EOX Cloudless 2023',
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
  const drawRef = useRef<MapboxDraw | null>(null);
  const contextPin = useRef<maplibregl.Marker | null>(null);

  const { center, zoom, selectedLayer, setCenter, setZoom } = useMapStore();
  const selectedItem = useSTACStore((state) => state.selectedItem);

  const aois = useAOIStore((state) => state.aois);
  const selectedAOIId = useAOIStore((state) => state.selectedAOIId);
  const selectAOI = useAOIStore((state) => state.selectAOI);
  const isDrawing = useAOIStore((state) => state.isDrawing);
  const drawType = useAOIStore((state) => state.drawType);
  const editingAOIId = useAOIStore((state) => state.editingAOIId);
  const activeTab = useAOIStore((state) => state.activeTab);

  // Detection State
  const detections = useDetectionStore((state) => state.detections);
  const selectedObject = useDetectionStore((state) => state.selectedObject);
  const selectObject = useDetectionStore((state) => state.selectObject);

  // Measurement State & Refs
  const { isMeasuring, measureType, history, stopMeasuring } = useMeasurementStore();
  const measurementMarkers = useRef<maplibregl.Marker[]>([]);

  const placePin = (lng: number, lat: number) => {
    if (!map.current) return;

    if (contextPin.current) {
      contextPin.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'flex flex-col items-center select-none pointer-events-auto';
    el.innerHTML = `
      <div class="px-2.5 py-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-850 rounded-lg shadow-xl text-center flex flex-col space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
        <div class="text-[9.5px] font-black uppercase tracking-wider text-rose-400">Tọa độ Ghim</div>
        <div class="text-[10px] font-medium text-slate-300">Lat: <span class="text-white font-bold">${lat.toFixed(6)}</span></div>
        <div class="text-[10px] font-medium text-slate-300">Lng: <span class="text-white font-bold">${lng.toFixed(6)}</span></div>
      </div>
      <div class="w-2.5 h-2.5 bg-slate-950 border-r border-b border-slate-850 rotate-45 -mt-1.5 shadow-lg"></div>
      
      <!-- Premium Static Red Pushpin -->
      <div class="relative flex flex-col items-center mt-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 48" class="w-8 h-12 drop-shadow-[0_3px_5px_rgba(0,0,0,0.3)]">
          <defs>
            <radialGradient id="ballGrad" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stop-color="#FF6B6B" />
              <stop offset="60%" stop-color="#EF4444" />
              <stop offset="100%" stop-color="#991B1B" />
            </radialGradient>
          </defs>
          <!-- Needle Left Half (Light Silver) -->
          <polygon points="14.8,23 16,23 16,47 15.6,47" fill="#E5E7EB" />
          <!-- Needle Right Half (Dark Silver) -->
          <polygon points="16,23 17.2,23 16.4,47 16,47" fill="#9CA3AF" />
          <!-- Collar Left Half -->
          <polygon points="13.5,20.2 16,20.2 16,23 14.8,23" fill="#D1D5DB" />
          <!-- Collar Right Half -->
          <polygon points="16,20.2 18.5,20.2 17.2,23 16,23" fill="#9CA3AF" />
          <!-- Red Ball -->
          <circle cx="16" cy="11" r="9.5" fill="url(#ballGrad)" />
          <!-- Ball Highlight -->
          <ellipse cx="12.5" cy="7.5" rx="3.5" ry="2.5" fill="#FFFFFF" opacity="0.6" transform="rotate(-30 12.5 7.5)" />
        </svg>
      </div>
    `;

    contextPin.current = new maplibregl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat([lng, lat])
      .addTo(map.current);
  };

  const clearMeasurementMarkers = () => {
    measurementMarkers.current.forEach((m) => m.remove());
    measurementMarkers.current = [];
  };

  const ensureMeasurementProperties = () => {
    if (!drawRef.current || !useMeasurementStore.getState().isMeasuring) return;
    const all = drawRef.current.getAll();
    all.features.forEach((f) => {
      if (f.id && f.properties?.isMeasurement !== 'true') {
        drawRef.current?.setFeatureProperty(String(f.id), 'isMeasurement', 'true');
      }
    });
  };

  const renderMeasurementLabels = (feature: any, cursorLngLat?: [number, number]) => {
    clearMeasurementMarkers();
    if (!map.current || !drawRef.current) return;

    const mode = drawRef.current.getMode();

    if (feature.geometry.type === 'LineString') {
      let coords = [...feature.geometry.coordinates];
      if (mode === 'draw_line_string' && cursorLngLat) {
        coords.push(cursorLngLat);
      }

      if (coords.length < 2) return;

      // Draw segment markers
      for (let i = 0; i < coords.length - 1; i++) {
        const pt1 = coords[i];
        const pt2 = coords[i + 1];
        const distance = turf.distance(pt1, pt2, { units: 'meters' });
        const mid = turf.midpoint(pt1, pt2).geometry.coordinates as [number, number];

        const el = document.createElement('div');
        el.className = 'px-1.5 py-0.5 bg-slate-900/90 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 rounded shadow-md pointer-events-none backdrop-blur-sm';
        el.innerText = distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${distance.toFixed(0)} m`;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(mid)
          .addTo(map.current);
        measurementMarkers.current.push(marker);
      }

      // Draw cumulative distance marker at the last vertex
      const totalLen = turf.length(turf.lineString(coords), { units: 'meters' });
      const lastPt = coords[coords.length - 1] as [number, number];
      const el = document.createElement('div');
      el.className = 'px-2 py-1 bg-emerald-500 text-[11px] font-black text-slate-950 border border-white/40 rounded-md shadow-lg pointer-events-none flex items-center space-x-1';
      el.innerHTML = `<span>🚩</span> <span>${totalLen >= 1000 ? `${(totalLen / 1000).toFixed(2)} km` : `${totalLen.toFixed(0)} m`}</span>`;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(lastPt)
        .addTo(map.current);
      measurementMarkers.current.push(marker);

    } else if (feature.geometry.type === 'Polygon') {
      let coords = [...feature.geometry.coordinates[0]];
      if (mode === 'draw_polygon' && cursorLngLat && coords.length >= 2) {
        coords[coords.length - 1] = cursorLngLat;
        coords.push(coords[0]);
      }

      if (coords.length < 4) return;

      const poly = turf.polygon([coords]);
      const area = turf.area(poly);
      const perimeter = turf.length(turf.lineString(coords), { units: 'meters' });
      let center: [number, number];
      try {
        center = turf.centroid(poly).geometry.coordinates as [number, number];
      } catch {
        center = coords[0] as [number, number];
      }

      const el = document.createElement('div');
      el.className = 'px-2 py-1.5 bg-slate-900/90 border border-emerald-500/40 rounded-lg shadow-xl pointer-events-none text-center backdrop-blur-sm min-w-[90px] flex flex-col space-y-0.5';
      const formattedArea = area >= 1000000 
        ? `${(area / 1000000).toFixed(2)} km²` 
        : area >= 10000 
          ? `${(area / 10000).toFixed(2)} ha` 
          : `${area.toFixed(0)} m²`;
      const formattedPerim = perimeter >= 1000 ? `${(perimeter / 1000).toFixed(2)} km` : `${perimeter.toFixed(0)} m`;
      el.innerHTML = `
        <div class="text-[11px] font-black text-emerald-400">${formattedArea}</div>
        <div class="text-[9px] font-semibold text-slate-400 border-t border-slate-800/80 pt-0.5">CV: ${formattedPerim}</div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(center)
        .addTo(map.current);
      measurementMarkers.current.push(marker);
    }
  };

  const updateMeasurementCalculations = (cursorLngLat?: [number, number]) => {
    if (!drawRef.current || !map.current) return;
    const isMeasuring = useMeasurementStore.getState().isMeasuring;
    const measureType = useMeasurementStore.getState().measureType;
    if (!isMeasuring || measureType === 'none') {
      clearMeasurementMarkers();
      return;
    }

    const all = drawRef.current.getAll();
    const measurementFeature = all.features.find(
      (f) => f.properties?.isMeasurement === 'true' || f.properties?.user_isMeasurement === 'true'
    );

    if (!measurementFeature) {
      clearMeasurementMarkers();
      return;
    }

    const mode = drawRef.current.getMode();

    if (measurementFeature.geometry.type === 'LineString') {
      let coords = [...measurementFeature.geometry.coordinates];
      if (mode === 'draw_line_string' && cursorLngLat) {
        coords.push(cursorLngLat);
      }

      if (coords.length < 2) {
        clearMeasurementMarkers();
        return;
      }

      const totalLen = turf.length(turf.lineString(coords), { units: 'meters' });
      const current = useMeasurementStore.getState().currentMeasurement;
      
      useMeasurementStore.getState().setCurrentMeasurement({
        id: (measurementFeature.id as string) || current?.id || Math.random().toString(36).substring(7),
        name: current?.name || '',
        type: 'distance',
        value: totalLen,
        geometry: {
          type: 'LineString',
          coordinates: coords
        },
        created_at: current?.created_at || new Date().toISOString()
      });

      renderMeasurementLabels(measurementFeature, cursorLngLat);

    } else if (measurementFeature.geometry.type === 'Polygon') {
      let coords = [...measurementFeature.geometry.coordinates[0]];
      if (mode === 'draw_polygon' && cursorLngLat && coords.length >= 2) {
        coords[coords.length - 1] = cursorLngLat;
        coords.push(coords[0]);
      }

      if (coords.length < 4) {
        clearMeasurementMarkers();
        return;
      }

      const poly = turf.polygon([coords]);
      const area = turf.area(poly);
      const perimeter = turf.length(turf.lineString(coords), { units: 'meters' });
      const current = useMeasurementStore.getState().currentMeasurement;

      useMeasurementStore.getState().setCurrentMeasurement({
        id: (measurementFeature.id as string) || current?.id || Math.random().toString(36).substring(7),
        name: current?.name || '',
        type: 'area',
        value: area,
        perimeter: perimeter,
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        },
        created_at: current?.created_at || new Date().toISOString()
      });

      renderMeasurementLabels(measurementFeature, cursorLngLat);
    }
  };

  const updateMeasurementsLayer = (mapInstance: maplibregl.Map) => {
    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once('style.load', () => updateMeasurementsLayer(mapInstance));
      return;
    }

    try {
      const sourceId = 'measurements-history-source';
      const fillLayerId = 'measurements-history-fill';
      const outlineLayerId = 'measurements-history-outline';
      
      const history = useMeasurementStore.getState().history;

      const features = history.map((item) => ({
        type: 'Feature',
        id: item.id,
        geometry: item.geometry,
        properties: {
          id: item.id,
          name: item.name,
          type: item.type,
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

        mapInstance.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': '#10b981',
            'fill-opacity': 0.08,
          },
        });

        mapInstance.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#10b981',
            'line-width': 3,
          },
        });
      } else {
        source.setData(geojson);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật lớp lịch sử đo đạc:', err);
    }
  };

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

  // Helper to dynamically update the AOIs overlay layer (fill + outline)
  const updateAOIsLayer = (mapInstance: maplibregl.Map) => {
    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once('style.load', () => updateAOIsLayer(mapInstance));
      return;
    }

    try {
      const sourceId = 'aois-source';
      const fillLayerId = 'aois-fill';
      const outlineLayerId = 'aois-outline';

      // Hide the AOI that is currently being edited so it doesn't double-render
      // We filter it out in JS using a bulletproof string-cast comparison, and also pass isEditing just in case
      const features = aois
        .filter((aoi) => {
          if (!editingAOIId) return true;
          return String(aoi.id).toLowerCase().trim() !== String(editingAOIId).toLowerCase().trim();
        })
        .map((aoi) => ({
          type: 'Feature',
          id: aoi.id,
          geometry: aoi.geometry,
          properties: {
            id: aoi.id,
            name: aoi.name,
            description: aoi.description,
            isSelected: selectedAOIId ? String(aoi.id).toLowerCase().trim() === String(selectedAOIId).toLowerCase().trim() : false,
            isEditing: false, // Already filtered out, but defined for consistency
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

        // Add fill layer with semi-transparent color
        mapInstance.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': [
              'case',
              ['==', ['get', 'isSelected'], true],
              0.25,
              0.08,
            ],
          },
        });

        // Add outline layer (with thinner borders matching the dashed border: selected = 4.5, unselected = 3)
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
              4.5,
              3,
            ],
            'line-dasharray': [
              'case',
              ['==', ['get', 'isSelected'], true],
              ['literal', [1]], // solid
              ['literal', [3, 3]], // dashed
            ],
          },
        });

        // Add click and hover interactions
        mapInstance.on('click', fillLayerId, (e) => {
          // If the user is currently drawing or editing, do NOT allow selecting an AOI from the map!
          const isDrawing = useAOIStore.getState().isDrawing;
          const editingAOIId = useAOIStore.getState().editingAOIId;
          const isMeasuring = useMeasurementStore.getState().isMeasuring;
          const activeTab = useAOIStore.getState().activeTab;
          if (isDrawing || editingAOIId || isMeasuring || activeTab === 'measure') return;

          if (e.features && e.features.length > 0) {
            const clickedId = e.features[0].properties?.id;
            if (clickedId) {
              if (e.originalEvent) {
                (e.originalEvent as any).clickedOnAOI = true;
              }
              selectAOI(clickedId);
              useAOIStore.getState().setActiveTab('aoi');
            }
          }
        });

        mapInstance.on('mouseenter', fillLayerId, () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });

        mapInstance.on('mouseleave', fillLayerId, () => {
          mapInstance.getCanvas().style.cursor = '';
        });
      } else {
        source.setData(geojson);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật lớp AOI:', err);
    }
  };

  // Helper to dynamically update the AI Detections overlay layer (fill + outline + label)
  const updateDetectionsLayer = (mapInstance: maplibregl.Map) => {
    if (!mapInstance.isStyleLoaded()) {
      mapInstance.once('style.load', () => updateDetectionsLayer(mapInstance));
      return;
    }

    try {
      const sourceId = 'ai-detections-source';
      const fillLayerId = 'ai-detections-fill';
      const outlineLayerId = 'ai-detections-outline';
      const labelLayerId = 'ai-detections-label';

      const features = detections.map((det, index) => {
        const [xmin, ymin, xmax, ymax] = det.bbox;
        const isSelected = selectedObject === det;
        return {
          type: 'Feature',
          id: index,
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [xmin, ymin],
              [xmax, ymin],
              [xmax, ymax],
              [xmin, ymax],
              [xmin, ymin]
            ]]
          },
          properties: {
            id: index,
            object_class: det.object_class,
            confidence: det.confidence,
            isSelected,
          }
        };
      });

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

        // 1. Fill layer
        mapInstance.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': [
              'match',
              ['get', 'object_class'],
              'aircraft', '#ef4444',
              'ship', '#10b981',
              'vehicle', '#f59e0b',
              '#3b82f6'
            ],
            'fill-opacity': [
              'case',
              ['==', ['get', 'isSelected'], true],
              0.3,
              0.1
            ]
          }
        });

        // 2. Outline layer
        mapInstance.addLayer({
          id: outlineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': [
              'match',
              ['get', 'object_class'],
              'aircraft', '#f87171',
              'ship', '#34d399',
              'vehicle', '#fbbf24',
              '#60a5fa'
            ],
            'line-width': [
              'case',
              ['==', ['get', 'isSelected'], true],
              4,
              2
            ]
          }
        });

        // 3. Label layer
        mapInstance.addLayer({
          id: labelLayerId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': [
              'concat',
              ['upcase', ['get', 'object_class']],
              ' (',
              ['slice', ['number-format', ['*', ['get', 'confidence'], 100], { 'max-fraction-digits': 0 }], 0],
              '%)'
            ],
            'text-size': 10,
            'text-anchor': 'bottom',
            'text-offset': [0, -0.6],
            'text-allow-overlap': true,
            'text-ignore-placement': true
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#0f172a',
            'text-halo-width': 1.5
          }
        });

        // 4. Click interaction on detections to select/highlight them
        mapInstance.on('click', fillLayerId, (e) => {
          if (e.features && e.features.length > 0) {
            const index = e.features[0].properties?.id;
            if (index !== undefined && index !== null) {
              const det = detections[index];
              if (det) {
                selectObject(det);
              }
            }
          }
        });

        mapInstance.on('mouseenter', fillLayerId, () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });

        mapInstance.on('mouseleave', fillLayerId, () => {
          mapInstance.getCanvas().style.cursor = '';
        });
      } else {
        source.setData(geojson);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật lớp AI Detection:', err);
    }
  };

  // Initialize Map Instance
  useEffect(() => {
    if (map.current) return; // Prevent double initialization

    let handleContextMenu: ((e: MouseEvent) => void) | null = null;
    let handleMouseDown: ((e: MouseEvent) => void) | null = null;
    let handleMouseMove: ((e: MouseEvent) => void) | null = null;
    let handleMouseUp: ((e: MouseEvent) => void) | null = null;

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
        'bottom-right'
      );

      // Add scale control
      map.current.addControl(
        new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric',
        }),
        'bottom-right'
      );

      // Add compact attribution control to bottom-right next to navigation controls
      map.current.addControl(
        new maplibregl.AttributionControl({
          compact: true,
        }),
        'bottom-right'
      );

      // Force compact class on the attribution control on every render to prevent expanded states on load/change
      map.current.on('render', () => {
        const attribEl = mapContainer.current?.querySelector('.maplibregl-ctrl-attrib');
        if (attribEl && !attribEl.classList.contains('maplibregl-compact')) {
          attribEl.classList.add('maplibregl-compact');
        }
      });

      // Initialize Mapbox Draw
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        userProperties: true,
        modes: {
          ...MapboxDraw.modes,
          draw_rectangle: RectangleMode,
          draw_circle: CircleMode,
          simple_select: customSimpleSelectMode,
          direct_select: customDirectSelectMode,
        },
        styles: [
          // ACTIVE FILL (Always yellow/amber fill when in Mapbox Draw)
          {
            'id': 'gl-draw-polygon-fill-active',
            'type': 'fill',
            'filter': ['all', ['==', '$type', 'Polygon'], ['!=', 'user_isMeasurement', 'true']],
            'paint': {
              'fill-color': '#f59e0b',
              'fill-opacity': 0.12
            }
          },
          // ACTIVE STROKE - DRAWING POLYGON (Dashed yellow stroke during drawing)
          {
            'id': 'gl-draw-polygon-stroke-drawing-polygon',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'draw_polygon'], ['!=', 'user_isMeasurement', 'true']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#f59e0b',
              'line-width': 4.5,
              'line-dasharray': [2, 2]
            }
          },
          // ACTIVE LINE - DRAWING POLYGON (Dashed yellow stroke during drawing)
          {
            'id': 'gl-draw-line-stroke-drawing-polygon',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'draw_polygon'], ['!=', 'user_isMeasurement', 'true']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#f59e0b',
              'line-width': 4.5,
              'line-dasharray': [2, 2]
            }
          },
          // ACTIVE STROKE - DRAWING RECTANGLE (Dashed yellow stroke during drawing)
          {
            'id': 'gl-draw-polygon-stroke-drawing-rectangle',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'draw_rectangle'], ['!=', 'user_isMeasurement', 'true']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#f59e0b',
              'line-width': 4.5,
              'line-dasharray': [2, 2]
            }
          },
          // ACTIVE STROKE - DRAWING CIRCLE (Dashed yellow stroke during drawing)
          {
            'id': 'gl-draw-polygon-stroke-drawing-circle',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'draw_circle'], ['!=', 'user_isMeasurement', 'true']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#f59e0b',
              'line-width': 4.5,
              'line-dasharray': [2, 2]
            }
          },
          // ACTIVE STROKE - SELECTING (Solid yellow stroke when completed/waiting to save)
          {
            'id': 'gl-draw-polygon-stroke-selecting',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'simple_select'], ['!=', 'user_isMeasurement', 'true']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#f59e0b',
              'line-width': 4.5
            }
          },
          // ACTIVE STROKE - EDITING (Solid yellow stroke when editing)
          {
            'id': 'gl-draw-polygon-stroke-editing',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'direct_select'], ['!=', 'user_isMeasurement', 'true']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#f59e0b',
              'line-width': 4.5
            }
          },
          // VERTEX CIRCLES (Corners)
          {
            'id': 'gl-draw-polygon-and-line-vertex-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'user_isMeasurement', 'true']],
            'paint': {
              'circle-radius': 7,
              'circle-color': '#f59e0b',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          },
          // VERTEX STROKE (Highlight active selection)
          {
            'id': 'gl-draw-polygon-and-line-vertex-stroke-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'user_isMeasurement', 'true']],
            'paint': {
              'circle-radius': 9,
              'circle-color': '#ffffff',
              'circle-opacity': 0.4
            }
          },
          // MIDPOINT CIRCLES (Add new vertex)
          {
            'id': 'gl-draw-polygon-and-line-vertex-midpoint-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point'], ['!=', 'user_isMeasurement', 'true']],
            'paint': {
              'circle-radius': 5,
              'circle-color': '#3b82f6',
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff'
            }
          },
          // CIRCLE CENTER POINT (Drawn at the end to always render on top of fill and stroke)
          {
            'id': 'gl-draw-circle-center-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'circle_center'], ['==', '$type', 'Point']],
            'paint': {
              'circle-radius': 6,
              'circle-color': '#ef4444', // Red center point
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          },
          // --- MEASUREMENT STYLES (Emerald Green #10b981) ---
          {
            'id': 'gl-draw-polygon-fill-measurement-active',
            'type': 'fill',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'user_isMeasurement', 'true']],
            'paint': {
              'fill-color': '#10b981',
              'fill-opacity': 0.12
            }
          },
          {
            'id': 'gl-draw-polygon-stroke-measurement-selecting',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'user_isMeasurement', 'true'], ['==', 'mode', 'simple_select']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#10b981',
              'line-width': 4.5
            }
          },
          {
            'id': 'gl-draw-polygon-stroke-measurement-editing',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'user_isMeasurement', 'true'], ['==', 'mode', 'direct_select']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#10b981',
              'line-width': 4.5
            }
          },
          {
            'id': 'gl-draw-polygon-stroke-measurement-drawing',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'user_isMeasurement', 'true'], ['==', 'mode', 'draw_polygon']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#10b981',
              'line-width': 4.5,
              'line-dasharray': [2, 2]
            }
          },
          {
            'id': 'gl-draw-line-measurement-selecting',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'LineString'], ['==', 'user_isMeasurement', 'true'], ['==', 'mode', 'simple_select']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#10b981',
              'line-width': 4.5
            }
          },
          {
            'id': 'gl-draw-line-measurement-editing',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'LineString'], ['==', 'user_isMeasurement', 'true'], ['==', 'mode', 'direct_select']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#10b981',
              'line-width': 4.5
            }
          },
          {
            'id': 'gl-draw-line-measurement-drawing',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'LineString'], ['==', 'user_isMeasurement', 'true'], ['==', 'mode', 'draw_line_string']],
            'layout': {
              'line-cap': 'round',
              'line-join': 'round'
            },
            'paint': {
              'line-color': '#10b981',
              'line-width': 4.5,
              'line-dasharray': [2, 2]
            }
          },
          {
            'id': 'gl-draw-vertex-measurement-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['==', 'user_isMeasurement', 'true']],
            'paint': {
              'circle-radius': 7,
              'circle-color': '#10b981',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          },
          {
            'id': 'gl-draw-vertex-stroke-measurement-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['==', 'user_isMeasurement', 'true']],
            'paint': {
              'circle-radius': 9,
              'circle-color': '#ffffff',
              'circle-opacity': 0.4
            }
          },
          {
            'id': 'gl-draw-vertex-midpoint-measurement-active',
            'type': 'circle',
            'filter': ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point'], ['==', 'user_isMeasurement', 'true']],
            'paint': {
              'circle-radius': 5,
              'circle-color': '#3b82f6',
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff'
            }
          }
        ]
      });
      map.current.addControl(draw as any, 'top-right');
      drawRef.current = draw;

      const handleDrawCreate = async (e: any) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const isMeasuring = useMeasurementStore.getState().isMeasuring;

          if (isMeasuring) {
            // Set the feature property
            if (drawRef.current) {
              drawRef.current.setFeatureProperty(String(feature.id), 'isMeasurement', 'true');
            }

            try {
              const response = await api.post('/measure', { geometry: feature.geometry });
              const data = response.data;

              const current = useMeasurementStore.getState().currentMeasurement;
              useMeasurementStore.getState().setCurrentMeasurement({
                id: (feature.id as string) || Math.random().toString(36).substring(7),
                name: current?.name || '',
                type: data.type === 'distance' ? 'distance' : 'area',
                value: data.type === 'distance' ? data.distance : data.area,
                perimeter: data.type === 'area' ? data.perimeter : undefined,
                geometry: feature.geometry,
                created_at: new Date().toISOString()
              });

              renderMeasurementLabels(feature);
            } catch (err) {
              console.error('Error fetching backend measurement:', err);
              updateMeasurementCalculations();
            }
          } else if (feature.geometry.type === 'Polygon') {
            const editingId = useAOIStore.getState().editingAOIId;
            if (!editingId) {
              // We are drawing a new AOI. Set tempGeometry. Do NOT delete, keep it on the map.
              useAOIStore.getState().setTempGeometry(feature.geometry);
              useAOIStore.getState().setDrawing(false);
              useAOIStore.getState().setDrawType(null);
            }
          }
        }
      };

      const handleDrawUpdate = async (e: any) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const isMeasuring = useMeasurementStore.getState().isMeasuring;

          if (isMeasuring) {
            try {
              const response = await api.post('/measure', { geometry: feature.geometry });
              const data = response.data;

              const current = useMeasurementStore.getState().currentMeasurement;
              useMeasurementStore.getState().setCurrentMeasurement({
                id: (feature.id as string) || current?.id || Math.random().toString(36).substring(7),
                name: current?.name || '',
                type: data.type === 'distance' ? 'distance' : 'area',
                value: data.type === 'distance' ? data.distance : data.area,
                perimeter: data.type === 'area' ? data.perimeter : undefined,
                geometry: feature.geometry,
                created_at: current?.created_at || new Date().toISOString()
              });

              renderMeasurementLabels(feature);
            } catch (err) {
              console.error('Error updating backend measurement:', err);
              updateMeasurementCalculations();
            }
          } else if (feature.geometry.type === 'Polygon') {
            // Recalculate circleCenter for circle features so properties remain in sync
            const isCircle = feature.properties?.isCircle || feature.properties?.user_isCircle;
            if (isCircle && drawRef.current) {
              const coords = feature.geometry.coordinates[0];
              if (coords && coords.length > 1) {
                const points = coords.slice(0, -1);
                let sumLng = 0;
                let sumLat = 0;
                points.forEach((c: any) => {
                  sumLng += c[0];
                  sumLat += c[1];
                });
                const centerLng = sumLng / points.length;
                const centerLat = sumLat / points.length;
                
                const drawFeature = drawRef.current.get(feature.id);
                if (drawFeature) {
                  if (!drawFeature.properties) {
                    drawFeature.properties = {};
                  }
                  drawFeature.properties.circleCenter = [centerLng, centerLat];
                  drawFeature.properties.user_circleCenter = [centerLng, centerLat];
                  drawRef.current.add(drawFeature);
                }
              }
            }
            // Update tempGeometry in store with the latest drag/edit coordinates for both drawing and editing
            useAOIStore.getState().setTempGeometry(feature.geometry);
          }
        }
      };

      const handleDrawDelete = () => {
        const isMeasuring = useMeasurementStore.getState().isMeasuring;
        if (isMeasuring) {
          useMeasurementStore.getState().setCurrentMeasurement(null);
          clearMeasurementMarkers();
        } else {
          // If user deletes the shape, clear temp geometry.
          useAOIStore.getState().setTempGeometry(null);
        }
      };

      map.current.on('draw.create', handleDrawCreate);
      map.current.on('draw.update', handleDrawUpdate);
      map.current.on('draw.delete', handleDrawDelete);

      // Listen to mousemove for real-time measurement labels
      map.current.on('mousemove', (e) => {
        const isMeasuring = useMeasurementStore.getState().isMeasuring;
        if (isMeasuring) {
          const cursor: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          ensureMeasurementProperties();
          updateMeasurementCalculations(cursor);
        }
      });

      map.current.on('click', () => {
        if (contextPin.current) {
          contextPin.current.remove();
          contextPin.current = null;
        }
        const isMeasuring = useMeasurementStore.getState().isMeasuring;
        if (isMeasuring) {
          ensureMeasurementProperties();
          updateMeasurementCalculations();
        }
      });

      // Cancel drawing mode on Right Click (contextmenu) via Canvas Event Listener (very robust)
      // If not drawing, place a coordinates ghim pin on the map
      const canvas = map.current.getCanvas();
      
      let rightClickStart: { x: number; y: number } | null = null;
      let isRightDragging = false;

      handleMouseDown = (e: MouseEvent) => {
        if (e.button === 2) {
          rightClickStart = { x: e.clientX, y: e.clientY };
          isRightDragging = false;
        }
      };

      handleMouseMove = (e: MouseEvent) => {
        if (rightClickStart) {
          const dx = e.clientX - rightClickStart.x;
          const dy = e.clientY - rightClickStart.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 5) {
            isRightDragging = true;
          }
        }
      };

      handleMouseUp = (e: MouseEvent) => {
        if (e.button === 2) {
          rightClickStart = null;
        }
      };

      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);

      handleContextMenu = (e: MouseEvent) => {
        if (!map.current) return;
        e.preventDefault(); // Always prevent default context menu on map canvas
        
        if (isRightDragging) {
          isRightDragging = false; // Reset for future interactions
          return;
        }

        let isDrawingMode = false;
        if (drawRef.current) {
          const mode = drawRef.current.getMode();
          if (mode.startsWith('draw_')) {
            isDrawingMode = true;
            drawRef.current.changeMode('simple_select');
            drawRef.current.deleteAll();
            
            const isMeasuring = useMeasurementStore.getState().isMeasuring;
            if (isMeasuring) {
              useMeasurementStore.getState().stopMeasuring();
              clearMeasurementMarkers();
            } else {
              useAOIStore.getState().setDrawing(false);
              useAOIStore.getState().setDrawType(null);
              useAOIStore.getState().setTempGeometry(null);
            }
            console.log('[Draw] Drawing cancelled via Canvas Right Click');
          }
        }
        
        if (!isDrawingMode) {
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const lngLat = map.current.unproject([x, y]);
          placePin(lngLat.lng, lngLat.lat);
        }
      };
      canvas.addEventListener('contextmenu', handleContextMenu);

      // Click on map background to deselect active AOI
      map.current.on('click', (e) => {
        if (!map.current) return;

        // If the click was already handled by the AOI layer, do NOT deselect!
        if (e.originalEvent && (e.originalEvent as any).clickedOnAOI) return;

        // If user is drawing or editing, do NOT deselect!
        const isDrawing = useAOIStore.getState().isDrawing;
        const editingAOIId = useAOIStore.getState().editingAOIId;
        const isMeasuring = useMeasurementStore.getState().isMeasuring;
        const activeTab = useAOIStore.getState().activeTab;
        if (isDrawing || editingAOIId || isMeasuring || activeTab === 'measure') return;

        // Query if click was on any AOI feature
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['aois-fill'],
        });

        // If no AOI was clicked, deselect the active AOI
        if (features.length === 0) {
          useAOIStore.getState().selectAOI(null);
        }
      });

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

        updateAOIsLayer(map.current);
        updateMeasurementsLayer(map.current);
        updateDetectionsLayer(map.current);
      });

      // Load initial overlay if the initial selected layer is a remote sensing one
      if (!isBase) {
        map.current.once('style.load', () => {
          updateRemoteSensingOverlay();
          updateStacOverlay();
          if (map.current) {
            updateAOIsLayer(map.current);
            updateMeasurementsLayer(map.current);
            updateDetectionsLayer(map.current);
          }
        });
      }
    }

    return () => {
      if (contextPin.current) {
        contextPin.current.remove();
        contextPin.current = null;
      }
      if (map.current) {
        try {
          const canvasEl = map.current.getCanvas();
          if (canvasEl) {
            if (handleContextMenu) {
              canvasEl.removeEventListener('contextmenu', handleContextMenu);
            }
            if (handleMouseDown) {
              canvasEl.removeEventListener('mousedown', handleMouseDown);
            }
            if (handleMouseMove) {
              canvasEl.removeEventListener('mousemove', handleMouseMove);
            }
            if (handleMouseUp) {
              canvasEl.removeEventListener('mouseup', handleMouseUp);
            }
          }
        } catch (err) {
          // ignore
        }
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
        if (map.current) {
          updateAOIsLayer(map.current);
          updateMeasurementsLayer(map.current);
          updateDetectionsLayer(map.current);
        }
      });
    } else {
      // If the base style hasn't changed, we can update the overlay immediately
      if (map.current.isStyleLoaded()) {
        updateRemoteSensingOverlay();
        updateStacOverlay();
        updateAOIsLayer(map.current);
        updateMeasurementsLayer(map.current);
        updateDetectionsLayer(map.current);
      } else {
        map.current.once('style.load', () => {
          updateRemoteSensingOverlay();
          updateStacOverlay();
          if (map.current) {
            updateAOIsLayer(map.current);
            updateMeasurementsLayer(map.current);
            updateDetectionsLayer(map.current);
          }
        });
      }
    }
  }, [selectedLayer]);

  // Listen to detections and selectedObject changes to update the map layers
  useEffect(() => {
    if (!map.current) return;
    updateDetectionsLayer(map.current);
  }, [detections, selectedObject]);

  const tempGeometry = useAOIStore((state) => state.tempGeometry);

  // Listen to isMeasuring and measureType changes to trigger Mapbox Draw modes for measurements
  useEffect(() => {
    if (!drawRef.current || !map.current) return;
    if (isMeasuring && measureType !== 'none') {
      // Deactivate AOI drawing/editing states to avoid conflict
      useAOIStore.getState().setDrawing(false);
      useAOIStore.getState().setDrawType(null);
      useAOIStore.getState().setEditingAOI(null);
      useAOIStore.getState().selectAOI(null);

      // Clear previous draw features
      drawRef.current.deleteAll();

      // Change draw mode based on measure type
      if (measureType === 'distance') {
        drawRef.current.changeMode('draw_line_string');
      } else if (measureType === 'area') {
        drawRef.current.changeMode('draw_polygon');
      }

      // Ensure any newly created features have the measurement property
      setTimeout(() => {
        if (!drawRef.current) return;
        const all = drawRef.current.getAll();
        all.features.forEach((f) => {
          if (f.id) {
            drawRef.current?.setFeatureProperty(String(f.id), 'isMeasurement', 'true');
          }
        });
      }, 50);
    } else if (!isMeasuring) {
      const currentMode = drawRef.current.getMode();
      if (currentMode !== 'simple_select' && currentMode !== 'direct_select') {
        drawRef.current.changeMode('simple_select');
      }
      drawRef.current.deleteAll();
      clearMeasurementMarkers();
    }
  }, [isMeasuring, measureType]);

  // Clean draw features and markers when active tab changes and is not 'measure'
  useEffect(() => {
    if (activeTab !== 'measure' && isMeasuring) {
      stopMeasuring();
      if (drawRef.current) {
        drawRef.current.deleteAll();
      }
      clearMeasurementMarkers();
    }
  }, [activeTab, isMeasuring]);

  // Listen to history changes to update the map history layer
  useEffect(() => {
    if (!map.current) return;
    updateMeasurementsLayer(map.current);
  }, [history]);

  // Listen to isDrawing and drawType changes to trigger Mapbox Draw modes
  useEffect(() => {
    if (!drawRef.current || !map.current) return;
    if (isDrawing && drawType) {
      if (drawType === 'polygon') {
        drawRef.current.changeMode('draw_polygon');
      } else if (drawType === 'rectangle') {
        drawRef.current.changeMode('draw_rectangle');
      } else if (drawType === 'circle') {
        drawRef.current.changeMode('draw_circle');
      }
    } else if (!isDrawing && !editingAOIId) {
      const currentMode = drawRef.current.getMode();
      if (currentMode !== 'simple_select' && currentMode !== 'direct_select') {
        drawRef.current.changeMode('simple_select');
      }
    }
  }, [isDrawing, drawType, editingAOIId]);

  // Clean draw features when tempGeometry is reset to null externally (saved or cancelled)
  useEffect(() => {
    if (!drawRef.current) return;
    if (!tempGeometry && !isDrawing && !editingAOIId) {
      drawRef.current.deleteAll();
    }
  }, [tempGeometry, isDrawing, editingAOIId]);

  // Listen to editingAOIId changes to load selected AOI into Mapbox Draw for editing
  // ONLY depend on editingAOIId to prevent resetting map nodes while dragging/updating
  useEffect(() => {
    if (!drawRef.current || !map.current) return;
    if (editingAOIId) {
      const currentAOIs = useAOIStore.getState().aois;
      const editingAOI = currentAOIs.find((a) => a.id === editingAOIId);
      if (editingAOI) {
        drawRef.current.deleteAll();
        const featureIds = drawRef.current.add(editingAOI.geometry);
        const featureId = Array.isArray(featureIds) ? featureIds[0] : featureIds;
        drawRef.current.changeMode('direct_select', { featureId: featureId as any });
      }
    } else {
      drawRef.current.deleteAll();
    }
  }, [editingAOIId]);

  // Update AOIs layers when list, selection or editing state changes
  useEffect(() => {
    if (!map.current) return;
    
    // Update immediately
    updateAOIsLayer(map.current);

    // Also trigger with a small delay to prevent Mapbox Draw deletion race conditions
    const timer = setTimeout(() => {
      if (map.current) {
        updateAOIsLayer(map.current);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [aois, selectedAOIId, editingAOIId]);

  // Zoom to selected AOI when selectedAOIId changes
  useEffect(() => {
    if (!map.current || !selectedAOIId) return;
    const selectedAOI = aois.find((a) => selectedAOIId ? String(a.id).toLowerCase().trim() === String(selectedAOIId).toLowerCase().trim() : false);
    if (selectedAOI && selectedAOI.geometry) {
      // Calculate bounding box of coordinates
      const coords = selectedAOI.geometry.coordinates[0];
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      coords.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      });

      if (minLng !== Infinity) {
        map.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 120, duration: 1500 }
        );
      }
    }
  }, [selectedAOIId, aois]);

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
    setZoom(12);
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={mapContainer} className="w-full h-full absolute inset-0 z-0" />
      
      {/* Floating Home Button (Epic 7 - Reset View) */}
      <div className="absolute bottom-[150px] right-[10px] z-10">
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
