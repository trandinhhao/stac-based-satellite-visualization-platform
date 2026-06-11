import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Home } from 'lucide-react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useMapStore } from '../store/useMapStore';
import { useSTACStore } from '../store/useSTACStore';
import { useAOIStore } from '../store/useAOIStore';

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
  const drawRef = useRef<MapboxDraw | null>(null);

  const { center, zoom, selectedLayer, setCenter, setZoom } = useMapStore();
  const selectedItem = useSTACStore((state) => state.selectedItem);

  const aois = useAOIStore((state) => state.aois);
  const selectedAOIId = useAOIStore((state) => state.selectedAOIId);
  const selectAOI = useAOIStore((state) => state.selectAOI);
  const isDrawing = useAOIStore((state) => state.isDrawing);
  const drawType = useAOIStore((state) => state.drawType);
  const editingAOIId = useAOIStore((state) => state.editingAOIId);

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
          if (isDrawing || editingAOIId) return;

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

  // Initialize Map Instance
  useEffect(() => {
    if (map.current) return; // Prevent double initialization

    let handleContextMenu: ((e: MouseEvent) => void) | null = null;

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

      // Initialize Mapbox Draw
      const draw = new MapboxDraw({
        displayControlsDefault: false,
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
            'filter': ['==', '$type', 'Polygon'],
            'paint': {
              'fill-color': '#f59e0b',
              'fill-opacity': 0.12
            }
          },
          // ACTIVE STROKE - DRAWING POLYGON (Dashed yellow stroke during drawing)
          {
            'id': 'gl-draw-polygon-stroke-drawing-polygon',
            'type': 'line',
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'draw_polygon']],
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
            'filter': ['all', ['==', '$type', 'LineString'], ['==', 'mode', 'draw_polygon']],
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
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'draw_rectangle']],
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
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'draw_circle']],
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
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'simple_select']],
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
            'filter': ['all', ['==', '$type', 'Polygon'], ['==', 'mode', 'direct_select']],
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
            'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
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
            'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
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
            'filter': ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
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
          }
        ]
      });
      map.current.addControl(draw as any, 'top-right');
      drawRef.current = draw;

      const handleDrawCreate = (e: any) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          if (feature.geometry.type === 'Polygon') {
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

      const handleDrawUpdate = (e: any) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          if (feature.geometry.type === 'Polygon') {
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
        // If user deletes the shape, clear temp geometry.
        useAOIStore.getState().setTempGeometry(null);
      };

      map.current.on('draw.create', handleDrawCreate);
      map.current.on('draw.update', handleDrawUpdate);
      map.current.on('draw.delete', handleDrawDelete);

      // Cancel drawing mode on Right Click (contextmenu) via Canvas Event Listener (very robust)
      const canvas = map.current.getCanvas();
      handleContextMenu = (e: MouseEvent) => {
        if (drawRef.current) {
          const mode = drawRef.current.getMode();
          if (mode.startsWith('draw_')) {
            e.preventDefault();
            drawRef.current.changeMode('simple_select');
            drawRef.current.deleteAll();
            useAOIStore.getState().setDrawing(false);
            useAOIStore.getState().setDrawType(null);
            useAOIStore.getState().setTempGeometry(null);
            console.log('[Draw] Drawing cancelled via Canvas Right Click');
          }
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
        if (isDrawing || editingAOIId) return;

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
      });

      // Load initial overlay if the initial selected layer is a remote sensing one
      if (!isBase) {
        map.current.once('style.load', () => {
          updateRemoteSensingOverlay();
          updateStacOverlay();
          if (map.current) updateAOIsLayer(map.current);
        });
      }
    }

    return () => {
      if (map.current) {
        try {
          const canvasEl = map.current.getCanvas();
          if (canvasEl && handleContextMenu) {
            canvasEl.removeEventListener('contextmenu', handleContextMenu);
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
        if (map.current) updateAOIsLayer(map.current);
      });
    } else {
      // If the base style hasn't changed, we can update the overlay immediately
      if (map.current.isStyleLoaded()) {
        updateRemoteSensingOverlay();
        updateStacOverlay();
        updateAOIsLayer(map.current);
      } else {
        map.current.once('style.load', () => {
          updateRemoteSensingOverlay();
          updateStacOverlay();
          if (map.current) updateAOIsLayer(map.current);
        });
      }
    }
  }, [selectedLayer]);

  const tempGeometry = useAOIStore((state) => state.tempGeometry);

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
