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
};

const syncBaseLayerVisibility = (mapInstance: maplibregl.Map, selectedId: string) => {
  const baseRasterLayers = {
    'osm': 'osm-tiles',
    'google-satellite': 'google-satellite',
    'sentinel-2': 'sentinel-2-tiles',
    'planet-basemap': 'planet-basemap-tiles',
  };

  Object.entries(baseRasterLayers).forEach(([id, layerId]) => {
    if (mapInstance.getLayer(layerId)) {
      const visibility = id === selectedId ? 'visible' : 'none';
      mapInstance.setLayoutProperty(layerId, 'visibility', visibility);
    }
  });
};


export default function MapViewer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const activeBaseLayer = useRef<string>('openfreemap');
  const drawRef = useRef<MapboxDraw | null>(null);
  const contextPin = useRef<maplibregl.Marker | null>(null);
  const prevSelectedAOIIds = useRef<string[]>([]);

  const { center, zoom, selectedLayer, setCenter, setZoom, searchPin } = useMapStore();
  const selectedItem = useSTACStore((state) => state.selectedItem);

  const aois = useAOIStore((state) => state.aois);
  const selectedAOIId = useAOIStore((state) => state.selectedAOIId);
  const selectedAOIIds = useAOIStore((state) => state.selectedAOIIds);
  const isDrawing = useAOIStore((state) => state.isDrawing);
  const drawType = useAOIStore((state) => state.drawType);
  const editingAOIId = useAOIStore((state) => state.editingAOIId);
  const activeTab = useAOIStore((state) => state.activeTab);
  const isDrawerOpen = useAOIStore((state) => state.isDrawerOpen);
  const showAllAOIs = useAOIStore((state) => state.showAllAOIs);

  // Detection State
  const detections = useDetectionStore((state) => state.detections);
  const selectedObject = useDetectionStore((state) => state.selectedObject);
  const selectObject = useDetectionStore((state) => state.selectObject);

  // Measurement State & Refs
  const { isMeasuring, measureType, history, hoveredMeasurementId } = useMeasurementStore();
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

  const deleteActiveDrawingFeature = () => {
    if (!drawRef.current) return;
    const historyIds = useMeasurementStore.getState().history.map((m: any) => String(m.id));
    const activeFeature = drawRef.current.getAll().features.find(
      (f) => (f.properties?.isMeasurement === 'true' || f.properties?.user_isMeasurement === 'true') && 
             f.properties?.isCompleted !== 'true' && 
             f.properties?.user_isCompleted !== 'true' && 
             !historyIds.includes(String(f.id))
    );
    console.log('[DEBUG] deleteActiveDrawingFeature found:', activeFeature, 'historyIds:', historyIds);
    if (activeFeature && activeFeature.id !== undefined) {
      console.log('[DEBUG] deleteActiveDrawingFeature actually deleting ID:', activeFeature.id);
      drawRef.current.delete(activeFeature.id as any);
    }
  };

  const ensureMeasurementProperties = () => {
    if (!drawRef.current || !useMeasurementStore.getState().isMeasuring) return;
    const all = drawRef.current.getAll();
    all.features.forEach((f) => {
      if (f.id && f.properties?.isMeasurement !== 'true' && f.properties?.user_isMeasurement !== 'true') {
        drawRef.current?.setFeatureProperty(f.id as any, 'isMeasurement', 'true');
      }
    });
  };

  const renderMeasurementLabels = (features: any[], cursorLngLat?: [number, number], activeFeatureId?: string) => {
    clearMeasurementMarkers();
    if (!map.current || !drawRef.current) return;
    const currentMap = map.current;

    const mode = drawRef.current.getMode();

    features.forEach((feature) => {
      const isFeatureActive = (feature.id === activeFeatureId);
      const isFeatureHovered = (String(feature.id) === String(hoveredMeasurementId));
      const markerBg = isFeatureHovered ? 'bg-amber-500' : 'bg-emerald-500';

      if (feature.geometry.type === 'LineString') {
        let coords = [...feature.geometry.coordinates];
        const isDrawing = (mode === 'draw_line_string' && isFeatureActive);
        if (isDrawing && cursorLngLat && coords.length > 0) {
          coords[coords.length - 1] = cursorLngLat;
        }

        if (coords.length < 2) return;

        const limit = isDrawing ? coords.length - 1 : coords.length;

        // Draw circular markers at all vertices with numbers inside
        for (let i = 0; i < limit; i++) {
          const pt = coords[i];
          
          const el = document.createElement('div');
          el.className = `flex items-center justify-center w-5 h-5 ${markerBg} border-2 border-white rounded-full text-[9px] font-black text-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none`;
          el.innerText = String(i + 1);

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(pt as [number, number])
            .addTo(currentMap);
          measurementMarkers.current.push(marker);
        }

      } else if (feature.geometry.type === 'Polygon') {
        let coords = [...feature.geometry.coordinates[0]];
        const isDrawing = (mode === 'draw_polygon' && isFeatureActive);
        if (isDrawing && cursorLngLat && coords.length >= 2) {
          coords[coords.length - 1] = cursorLngLat;
          coords.push(coords[0]);
        }

        if (coords.length < 4) return;

        const limit = isDrawing ? coords.length - 2 : coords.length - 1;

        // Draw circular markers at all vertices of the polygon with numbers inside
        for (let i = 0; i < limit; i++) {
          const pt = coords[i];
          
          const el = document.createElement('div');
          el.className = `flex items-center justify-center w-5 h-5 ${markerBg} border-2 border-white rounded-full text-[9px] font-black text-white shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none`;
          el.innerText = String(i + 1);

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(pt as [number, number])
            .addTo(currentMap);
          measurementMarkers.current.push(marker);
        }
      }
    });
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
    const measurementFeatures = all.features.filter(
      (f) => f.properties?.isMeasurement === 'true' || f.properties?.user_isMeasurement === 'true'
    );

    if (measurementFeatures.length === 0) {
      clearMeasurementMarkers();
      useMeasurementStore.getState().setCurrentMeasurement(null);
      return;
    }

    const mode = drawRef.current.getMode();
    let activeFeatureId: string | undefined = undefined;
    let activeFeature = null;

    if (mode === 'draw_line_string' || mode === 'draw_polygon') {
      const historyIds = useMeasurementStore.getState().history.map((m: any) => String(m.id));
      activeFeature = measurementFeatures.find(f => !historyIds.includes(String(f.id)));
      activeFeatureId = activeFeature?.id ? String(activeFeature.id) : undefined;
    } else {
      const selectedId = drawRef.current.getSelectedIds()[0];
      activeFeatureId = selectedId ? String(selectedId) : undefined;
      activeFeature = measurementFeatures.find(f => f.id === activeFeatureId);
    }

    // If we have an active feature and we are in active drawing mode, update currentMeasurement in store
    if (activeFeature && (mode === 'draw_line_string' || mode === 'draw_polygon')) {
      if (activeFeature.geometry.type === 'LineString') {
        let coords = [...activeFeature.geometry.coordinates];
        if (cursorLngLat && coords.length > 0) {
          coords[coords.length - 1] = cursorLngLat;
        }

        if (coords.length >= 2) {
          const totalLen = turf.length(turf.lineString(coords), { units: 'meters' });
          useMeasurementStore.getState().setCurrentMeasurement({
            id: String(activeFeature.id),
            name: 'Đo khoảng cách hiện tại',
            type: 'distance',
            value: totalLen,
            geometry: {
              type: 'LineString',
              coordinates: coords
            },
            isDrawing: true,
            created_at: new Date().toISOString()
          });
        }
      } else if (activeFeature.geometry.type === 'Polygon') {
        let coords = [...activeFeature.geometry.coordinates[0]];
        if (cursorLngLat && coords.length >= 2) {
          coords[coords.length - 1] = cursorLngLat;
          coords.push(coords[0]);
        }

        if (coords.length >= 4) {
          const poly = turf.polygon([coords]);
          const area = turf.area(poly);
          const perimeter = turf.length(turf.lineString(coords), { units: 'meters' });
          useMeasurementStore.getState().setCurrentMeasurement({
            id: String(activeFeature.id),
            name: 'Đo diện tích hiện tại',
            type: 'area',
            value: area,
            perimeter: perimeter,
            geometry: {
              type: 'Polygon',
              coordinates: [coords]
            },
            isDrawing: true,
            created_at: new Date().toISOString()
          });
        }
      }
    } else {
      // Not drawing, clear currentMeasurement
      useMeasurementStore.getState().setCurrentMeasurement(null);
    }

    // Combine active features in Mapbox Draw and completed features in history for rendering labels
    const historyFeatures = useMeasurementStore.getState().history.map((m) => ({
      type: 'Feature' as const,
      id: m.id,
      geometry: m.geometry,
      properties: {
        isMeasurement: 'true',
        isCompleted: 'true',
      },
    }));

    const featuresToLabel = [
      ...historyFeatures,
      ...measurementFeatures,
    ];

    renderMeasurementLabels(featuresToLabel, cursorLngLat, activeFeatureId);
  };



  // Helper to arrange layer order: base-map < stac-overlay < custom-vector-layers < gl-draw-layers
  const arrangeLayers = (mapInstance: maplibregl.Map) => {
    if (!mapInstance.getStyle() || !mapInstance.getStyle().layers) return;

    try {
      const layers = mapInstance.getStyle().layers || [];
      const layerIds = layers.map(l => l.id);

      const baseRasterLayers = ['osm-tiles', 'google-satellite', 'sentinel-2-tiles', 'planet-basemap-tiles'];
      const customLayers = [
        'stac-overlay',
        'completed-measurements-fill',
        'completed-measurements-line',
        'aois-fill',
        'aois-outline',
        'ai-detections-fill',
        'ai-detections-outline',
        'ai-detections-label'
      ];

      const firstCustomLayer = layers.find(l => 
        customLayers.includes(l.id) || l.id.startsWith('gl-draw-')
      );

      if (firstCustomLayer) {
        baseRasterLayers.forEach(baseId => {
          if (layerIds.includes(baseId) && mapInstance.getLayer(baseId)) {
            mapInstance.moveLayer(baseId, firstCustomLayer.id);
          }
        });
      }

      const hasStac = layerIds.includes('stac-overlay');
      if (hasStac) {
        const firstVectorLayer = layers.find(l => 
          l.id !== 'stac-overlay' && (
            [
              'completed-measurements-fill',
              'completed-measurements-line',
              'aois-fill',
              'aois-outline',
              'ai-detections-fill',
              'ai-detections-outline',
              'ai-detections-label'
            ].includes(l.id) || 
            l.id.startsWith('gl-draw-')
          )
        );

        if (firstVectorLayer && firstVectorLayer.id !== 'stac-overlay') {
          mapInstance.moveLayer('stac-overlay', firstVectorLayer.id);
          console.log(`[MapViewer] Arranged layers: moved stac-overlay before ${firstVectorLayer.id}`);
        }
      }
    } catch (err) {
      console.error('[MapViewer] Error arranging layers:', err);
    }
  };

  // Helper to dynamically render STAC image overlay
  const updateStacOverlay = () => {
    if (!map.current || !map.current.getStyle()) {
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
          if (item.collection === 'PSScene') {
            tileUrl = `/api/stac/planet/tiles/PSScene/${item.id}/{z}/{x}/{y}.png`;
          } else if (isGlobal) {
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

          // Insert under vector layers to keep AOIs on top
          const vectorLayers = [
            'aois-fill',
            'aois-outline',
            'ai-detections-fill',
            'ai-detections-outline',
            'ai-detections-label'
          ];
          const allLayers = map.current.getStyle().layers || [];
          const firstVectorLayer = allLayers.find(l => 
            vectorLayers.includes(l.id) || l.id.startsWith('gl-draw-')
          );

          map.current.addLayer({
            id: 'stac-overlay',
            type: 'raster',
            source: 'stac-source',
            paint: { 'raster-opacity': 1.0 },
          }, firstVectorLayer?.id);
        }
      }
      arrangeLayers(map.current);
    } catch (error) {
      console.error('[STAC] Error updating STAC overlay:', error);
    }
  };

  // Helper to dynamically update the remote sensing overlay layer
  const updateRemoteSensingOverlay = () => {
    // Deprecated: Remote sensing layers are now configured as full base styles in BASE_STYLES.
  };

  // Helper to dynamically update the completed measurements layer
  const updateCompletedMeasurementsLayer = (mapInstance: maplibregl.Map, forceRecreate = false) => {
    if (!mapInstance.getStyle()) {
      console.log('[DEBUG] completed layer: style not initialized yet');
      return;
    }

    try {
      const sourceId = 'completed-measurements-source';
      const fillLayerId = 'completed-measurements-fill';
      const lineLayerId = 'completed-measurements-line';

      if (forceRecreate) {
        console.log('[DEBUG] completed layer: forcing recreate of source and layers');
        if (mapInstance.getLayer(fillLayerId)) mapInstance.removeLayer(fillLayerId);
        if (mapInstance.getLayer(lineLayerId)) mapInstance.removeLayer(lineLayerId);
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      }

      const features = activeTab === 'measure'
        ? history.map((m) => ({
            type: 'Feature',
            id: m.id,
            geometry: m.geometry,
            properties: {
              id: m.id,
              type: m.type,
              isMeasurement: 'true',
              isCompleted: 'true',
            },
          }))
        : [];

      console.log('[DEBUG] completed layer: updating. activeTab =', activeTab, 'history length =', history.length, 'features count =', features.length);
      if (features.length > 0) {
        console.log('[DEBUG] completed layer first feature geometry:', JSON.stringify(features[0].geometry));
      }

      const geojson: any = {
        type: 'FeatureCollection',
        features,
      };

      const source = mapInstance.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (!source) {
        console.log('[DEBUG] completed layer: creating source and layers');
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: geojson,
        });

        // Polygon Fill Layer
        mapInstance.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'id'], hoveredMeasurementId || ''],
              '#f59e0b',
              '#10b981'
            ],
            'fill-opacity': [
              'case',
              ['==', ['get', 'id'], hoveredMeasurementId || ''],
              0.25,
              0.12
            ],
          },
        });

        // Line Stroke Layer (for both LineStrings and Polygon boundaries)
        mapInstance.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'id'], hoveredMeasurementId || ''],
              '#f59e0b',
              '#10b981'
            ],
            'line-width': 4.5,
          },
        });
      } else {
        console.log('[DEBUG] completed layer: calling source.setData');
        source.setData(geojson);
        
        // Dynamically update paint properties to reflect hover highlight state
        if (mapInstance.getLayer(fillLayerId)) {
          mapInstance.setPaintProperty(fillLayerId, 'fill-color', [
            'case',
            ['==', ['get', 'id'], hoveredMeasurementId || ''],
            '#f59e0b',
            '#10b981'
          ]);
          mapInstance.setPaintProperty(fillLayerId, 'fill-opacity', [
            'case',
            ['==', ['get', 'id'], hoveredMeasurementId || ''],
            0.25,
            0.12
          ]);
        }
        if (mapInstance.getLayer(lineLayerId)) {
          mapInstance.setPaintProperty(lineLayerId, 'line-color', [
            'case',
            ['==', ['get', 'id'], hoveredMeasurementId || ''],
            '#f59e0b',
            '#10b981'
          ]);
        }
      }
      const currentLayers = mapInstance.getStyle().layers || [];
      console.log('[DEBUG] completed layer: all style layers on map:', currentLayers.map(l => l.id));
      arrangeLayers(mapInstance);
    } catch (err) {
      console.error('[MapViewer] Error updating completed measurements layer:', err);
    }
  };

  // Helper to dynamically update the AOIs overlay layer (fill + outline)
  const updateAOIsLayer = (mapInstance: maplibregl.Map, forceRecreate = false) => {
    if (!mapInstance.getStyle()) {
      return;
    }

    try {
      const sourceId = 'aois-source';
      const fillLayerId = 'aois-fill';
      const outlineLayerId = 'aois-outline';

      if (forceRecreate) {
        if (mapInstance.getLayer(fillLayerId)) mapInstance.removeLayer(fillLayerId);
        if (mapInstance.getLayer(outlineLayerId)) mapInstance.removeLayer(outlineLayerId);
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      }

      // Hide the AOI that is currently being edited so it doesn't double-render
      // We filter it out in JS using a bulletproof string-cast comparison, and also pass isEditing just in case
      const showAOIs = activeTab === 'aoi' && isDrawerOpen && showAllAOIs;
      const features = showAOIs
        ? aois
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
                isSelected: selectedAOIIds.includes(aoi.id),
                isEditing: false, // Already filtered out, but defined for consistency
              },
            }))
        : aois
            .filter((aoi) => selectedAOIIds.includes(aoi.id))
            .map((aoi) => ({
              type: 'Feature',
              id: aoi.id,
              geometry: aoi.geometry,
              properties: {
                id: aoi.id,
                name: aoi.name,
                description: aoi.description,
                isSelected: true,
                isEditing: false,
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
            'fill-opacity': 0, // Fully transparent to keep STAC images completely clear while preserving click interaction
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


      } else {
        source.setData(geojson);
      }
      arrangeLayers(mapInstance);
    } catch (err) {
      console.error('Lỗi khi cập nhật lớp AOI:', err);
    }
  };

  // Helper to dynamically update the AI Detections overlay layer (fill + outline + label)
  const updateDetectionsLayer = (mapInstance: maplibregl.Map, forceRecreate = false) => {
    if (!mapInstance.getStyle()) {
      return;
    }

    try {
      const sourceId = 'ai-detections-source';
      const fillLayerId = 'ai-detections-fill';
      const outlineLayerId = 'ai-detections-outline';
      const labelLayerId = 'ai-detections-label';

      if (forceRecreate) {
        if (mapInstance.getLayer(fillLayerId)) mapInstance.removeLayer(fillLayerId);
        if (mapInstance.getLayer(outlineLayerId)) mapInstance.removeLayer(outlineLayerId);
        if (mapInstance.getLayer(labelLayerId)) mapInstance.removeLayer(labelLayerId);
        if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
      }

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
      arrangeLayers(mapInstance);
    } catch (err) {
      console.error('Lỗi khi cập nhật lớp AI Detection:', err);
    }
  };

  // Refs to keep track of the latest helper functions to prevent closure staleness
  const updateAOIsLayerRef = useRef(updateAOIsLayer);
  const updateDetectionsLayerRef = useRef(updateDetectionsLayer);
  const updateStacOverlayRef = useRef(updateStacOverlay);
  const updateRemoteSensingOverlayRef = useRef(updateRemoteSensingOverlay);
  const updateCompletedMeasurementsLayerRef = useRef(updateCompletedMeasurementsLayer);
  const arrangeLayersRef = useRef(arrangeLayers);

  useEffect(() => {
    updateAOIsLayerRef.current = updateAOIsLayer;
    updateDetectionsLayerRef.current = updateDetectionsLayer;
    updateStacOverlayRef.current = updateStacOverlay;
    updateRemoteSensingOverlayRef.current = updateRemoteSensingOverlay;
    updateCompletedMeasurementsLayerRef.current = updateCompletedMeasurementsLayer;
    arrangeLayersRef.current = arrangeLayers;
  });

  // Initialize Map Instance
  useEffect(() => {
    if (map.current) return; // Prevent double initialization

    let handleContextMenu: ((e: MouseEvent) => void) | null = null;
    let handleMouseDown: ((e: MouseEvent) => void) | null = null;
    let handleMouseMove: ((e: MouseEvent) => void) | null = null;
    let handleMouseUp: ((e: MouseEvent) => void) | null = null;

    if (mapContainer.current) {
      const initialBase = selectedLayer in BASE_STYLES ? selectedLayer : 'openfreemap';
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
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'user_isMeasurement', 'true'], ['!=', 'user_isCompleted', 'true']],
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
            'id': 'gl-draw-polygon-stroke-measurement-completed',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'user_isMeasurement', 'true'], ['==', 'user_isCompleted', 'true']],
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
            'filter': ['all', ['==', '$type', 'LineString'], ['==', 'user_isMeasurement', 'true'], ['!=', 'user_isCompleted', 'true']],
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
            'id': 'gl-draw-line-measurement-completed',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'LineString'], ['==', 'user_isMeasurement', 'true'], ['==', 'user_isCompleted', 'true']],
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
          console.log('[DEBUG] handleDrawCreate triggered with feature:', feature);
          const isMeasuring = useMeasurementStore.getState().isMeasuring;

          if (isMeasuring) {
            // Set the feature property
            if (drawRef.current) {
              console.log('[DEBUG] handleDrawCreate setting isMeasurement=true on ID:', feature.id);
              drawRef.current.setFeatureProperty(feature.id as any, 'isMeasurement', 'true');
            }

            try {
              console.log('[DEBUG] handleDrawCreate calling api.post("/measure")');
              const response = await api.post('/measure', { geometry: feature.geometry });
              const data = response.data;
              console.log('[DEBUG] handleDrawCreate API response:', data);

              // Mark as completed in Mapbox Draw immediately
              if (drawRef.current) {
                console.log('[DEBUG] handleDrawCreate setting isCompleted=true on ID:', feature.id);
                drawRef.current.setFeatureProperty(feature.id as any, 'isCompleted', 'true');
              }

              // Save to completed measurements list (history) in store
              const completedMeasurement = {
                id: feature.id ? String(feature.id) : Math.random().toString(36).substring(7),
                name: data.type === 'distance'
                  ? `Đo khoảng cách #${useMeasurementStore.getState().history.filter((m: any) => m.type === 'distance').length + 1}`
                  : `Đo diện tích #${useMeasurementStore.getState().history.filter((m: any) => m.type === 'area').length + 1}`,
                type: data.type === 'distance' ? ('distance' as const) : ('area' as const),
                value: data.type === 'distance' ? data.distance : data.area,
                perimeter: data.type === 'area' ? data.perimeter : undefined,
                geometry: feature.geometry,
                isDrawing: false,
                created_at: new Date().toISOString()
              };
              useMeasurementStore.getState().addCompletedMeasurement(completedMeasurement);

              // Delete the temporary active drawing from Mapbox Draw since it is now saved in history and rendered by Maplibre GL
              if (drawRef.current) {
                console.log('[DEBUG] handleDrawCreate deleting active drawing feature from Draw:', feature.id);
                drawRef.current.delete(feature.id as any);
              }
              
              // Stop measuring and deactivate button on sidebar tab upon completion
              setTimeout(() => {
                useMeasurementStore.getState().stopMeasuring();
              }, 50);
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

              // Ensure completed status is preserved if editing a completed shape
              if (drawRef.current) {
                const inHistory = useMeasurementStore.getState().history.some((m: any) => String(m.id) === String(feature.id));
                if (inHistory) {
                  drawRef.current.setFeatureProperty(feature.id as any, 'isCompleted', 'true');
                }
              }

              const updatedMeasurement = {
                id: feature.id ? String(feature.id) : Math.random().toString(36).substring(7),
                name: '', // Will be replaced/kept
                type: data.type === 'distance' ? ('distance' as const) : ('area' as const),
                value: data.type === 'distance' ? data.distance : data.area,
                perimeter: data.type === 'area' ? data.perimeter : undefined,
                geometry: feature.geometry,
                isDrawing: false,
                created_at: new Date().toISOString()
              };

              const inHistory = useMeasurementStore.getState().history.some((m: any) => String(m.id) === updatedMeasurement.id);
              if (inHistory) {
                useMeasurementStore.setState((state: any) => ({
                  history: state.history.map((m: any) => {
                    if (m.id === updatedMeasurement.id) {
                      return {
                        ...updatedMeasurement,
                        name: m.name,
                        created_at: m.created_at
                      };
                    }
                    return m;
                  })
                }));
              } else {
                useMeasurementStore.getState().setCurrentMeasurement(updatedMeasurement);
              }

              updateMeasurementCalculations();
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
          useMapStore.getState().setSearchPin(null);
        }
        const isMeasuring = useMeasurementStore.getState().isMeasuring;
        if (isMeasuring && drawRef.current) {
          const mode = drawRef.current.getMode();
          if (mode === 'simple_select' || mode === 'direct_select') {
            return;
          }
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

        const isMeasuring = useMeasurementStore.getState().isMeasuring;
        if (isMeasuring) {
          useMeasurementStore.getState().stopMeasuring();
          console.log('[Draw] Measurement cancelled and stopped via Canvas Right Click');
          return;
        }

        const editingAOIId = useAOIStore.getState().editingAOIId;
        
        let isDrawingMode = false;
        if (drawRef.current) {
          const mode = drawRef.current.getMode();
          if (mode.startsWith('draw_') || (editingAOIId && mode === 'direct_select')) {
            isDrawingMode = true;
            drawRef.current.changeMode('simple_select');
            drawRef.current.deleteAll();
            
            useAOIStore.getState().setDrawing(false);
            useAOIStore.getState().setDrawType(null);
            useAOIStore.getState().setTempGeometry(null);
            useAOIStore.getState().setEditingAOI(null);
            console.log('[Draw] AOI Drawing/Editing cancelled via Canvas Right Click');
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

      // Persistent styledata event listener to restore all custom sources and layers when style changes or data updates
      map.current.on('styledata', () => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        // Restore custom layers/sources if they are missing
        if (map.current.getStyle()) {
          // STAC Overlay
          const stacItem = useSTACStore.getState().selectedItem;
          if (stacItem && (!map.current.getSource('stac-source') || !map.current.getLayer('stac-overlay'))) {
            console.log('[MapViewer] Restoring STAC overlay on styledata');
            updateStacOverlayRef.current();
          }

          // AOIs Layer
          if (!map.current.getSource('aois-source') || !map.current.getLayer('aois-fill') || !map.current.getLayer('aois-outline')) {
            console.log('[MapViewer] Restoring AOIs layer on styledata');
            updateAOIsLayerRef.current(map.current, true);
          }

          // Completed Measurements Layer
          if (!map.current.getSource('completed-measurements-source') || !map.current.getLayer('completed-measurements-fill') || !map.current.getLayer('completed-measurements-line')) {
            console.log('[MapViewer] Restoring completed measurements layer on styledata');
            updateCompletedMeasurementsLayerRef.current(map.current, true);
          }

          // AI Detections Layer
          if (!map.current.getSource('ai-detections-source') || !map.current.getLayer('ai-detections-fill') || !map.current.getLayer('ai-detections-outline') || !map.current.getLayer('ai-detections-label')) {
            console.log('[MapViewer] Restoring AI detections layer on styledata');
            updateDetectionsLayerRef.current(map.current, true);
          }

          // Ensure proper layer order
          arrangeLayersRef.current(map.current);
        }
      });

      // Synchronize initial bounding box on load and initialize base raster layers
      map.current.once('load', () => {
        if (!map.current) return;

        const rasterSources = {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
          'google-satellite': {
            type: 'raster',
            tiles: ['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'],
            tileSize: 256,
            attribution: '© Google Maps',
          },
          'sentinel-2-tiles': {
            type: 'raster',
            tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg'],
            tileSize: 256,
            attribution: '© Copernicus Sentinel-2 / EOX Cloudless 2023',
          },
          'planet-basemap-tiles': {
            type: 'raster',
            tiles: ['/api/stac/planet/tiles/global_monthly_2025_06_mosaic/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© Planet Labs / Education & Research Program',
          },
        };

        Object.entries(rasterSources).forEach(([sourceId, sourceConfig]) => {
          if (!map.current) return;
          if (!map.current.getSource(sourceId)) {
            map.current.addSource(sourceId, sourceConfig as any);
          }
          if (!map.current.getLayer(sourceId)) {
            map.current.addLayer({
              id: sourceId,
              type: 'raster',
              source: sourceId,
              layout: {
                visibility: 'none',
              },
              paint: {
                'raster-opacity': 1.0,
              },
            });
          }
        });

        // Set initial base layer visibility
        const currentSelectedLayer = useMapStore.getState().selectedLayer;
        syncBaseLayerVisibility(map.current, currentSelectedLayer);

        const rawBounds = map.current.getBounds();
        useSTACStore.getState().setBbox([
          rawBounds.getWest(),
          rawBounds.getSouth(),
          rawBounds.getEast(),
          rawBounds.getNorth(),
        ]);

        updateCompletedMeasurementsLayerRef.current(map.current);
        arrangeLayersRef.current(map.current);
      });
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
    syncBaseLayerVisibility(map.current, selectedLayer);
    arrangeLayersRef.current(map.current);
  }, [selectedLayer]);

  // Listen to detections and selectedObject changes to update the map layers
  useEffect(() => {
    if (!map.current) return;
    updateDetectionsLayer(map.current);
  }, [detections, selectedObject]);

  const tempGeometry = useAOIStore((state) => state.tempGeometry);

  // Listen to isMeasuring and measureType changes to trigger Mapbox Draw modes for measurements
  useEffect(() => {
    if (!drawRef.current || !map.current || activeTab !== 'measure') return;

    if (isMeasuring && measureType !== 'none') {
      // Deactivate AOI drawing/editing states to avoid conflict
      useAOIStore.getState().setDrawing(false);
      useAOIStore.getState().setDrawType(null);
      useAOIStore.getState().setEditingAOI(null);
      useAOIStore.getState().selectAOI(null);

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
        deleteActiveDrawingFeature();
        drawRef.current.changeMode('simple_select');
      }
      clearMeasurementMarkers();

      // Keep completed measurements from history on the map
      const historyFeatures = history.map((m) => ({
        type: 'Feature' as const,
        id: m.id,
        geometry: m.geometry,
        properties: {
          isMeasurement: 'true',
          isCompleted: 'true',
        },
      }));
      renderMeasurementLabels(historyFeatures);
    }
  }, [isMeasuring, measureType, activeTab]);

  // Sync Mapbox Draw features with completed measurements (history) and activeTab
  // Sync Mapbox Draw features with completed measurements (history) and activeTab
  useEffect(() => {
    if (!map.current) return;

    // Update the completed measurements layer in Maplibre GL
    updateCompletedMeasurementsLayer(map.current);

    if (activeTab === 'measure') {
      const historyFeatures = history.map((m) => ({
        type: 'Feature' as const,
        id: m.id,
        geometry: m.geometry,
        properties: {
          isMeasurement: 'true',
          isCompleted: 'true',
        },
      }));

      // Find active drawing feature in Mapbox Draw (if any)
      let activeFeature = null;
      const isMeasuringStore = useMeasurementStore.getState().isMeasuring;
      if (isMeasuringStore && drawRef.current) {
        const all = drawRef.current.getAll();
        const historyIds = history.map((m) => String(m.id));
        activeFeature = all.features.find(
          (f) =>
            (f.properties?.isMeasurement === 'true' || f.properties?.user_isMeasurement === 'true') &&
            !historyIds.includes(String(f.id))
        );
      }

      const featuresToLabel = [
        ...historyFeatures,
        ...(activeFeature ? [activeFeature] : []),
      ];

      renderMeasurementLabels(
        featuresToLabel,
        undefined,
        activeFeature?.id ? String(activeFeature.id) : undefined
      );
    } else {
      // If we are not on the measure tab, clear everything measurement-related
      if (drawRef.current) {
        drawRef.current.deleteAll();
      }
      clearMeasurementMarkers();
    }
  }, [activeTab, history, hoveredMeasurementId]);

  // Stop measuring when activeTab changes away from 'measure'
  useEffect(() => {
    if (activeTab !== 'measure') {
      const isMeasuring = useMeasurementStore.getState().isMeasuring;
      if (isMeasuring) {
        useMeasurementStore.getState().stopMeasuring();
      }
    }
  }, [activeTab]);



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
  }, [aois, selectedAOIId, selectedAOIIds, editingAOIId, activeTab, isDrawerOpen, selectedLayer, showAllAOIs]);

  // Zoom to newly selected AOI
  useEffect(() => {
    if (!map.current) return;
    
    // Find newly added IDs
    const newlyAddedId = selectedAOIIds.find(id => !prevSelectedAOIIds.current.includes(id));
    
    // Update ref for next trigger
    prevSelectedAOIIds.current = selectedAOIIds;

    // Only zoom if an AOI was newly selected (unselected -> selected)
    if (!newlyAddedId) return;

    const selectedAOI = aois.find((a) => String(a.id).toLowerCase().trim() === String(newlyAddedId).toLowerCase().trim());
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
        const leftPadding = isDrawerOpen ? 450 : 120;
        map.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          {
            padding: { top: 120, bottom: 120, left: leftPadding, right: 120 },
            duration: 1500
          }
        );
      }
    }
  }, [selectedAOIIds, aois]);

  // Listen to STAC selected item changes from the store
  useEffect(() => {
    updateStacOverlay();
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

  // Listen to searchPin changes and place/remove marker
  useEffect(() => {
    if (!map.current) return;
    if (searchPin) {
      placePin(searchPin[0], searchPin[1]);
    } else {
      if (contextPin.current) {
        contextPin.current.remove();
        contextPin.current = null;
      }
    }
  }, [searchPin]);

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
