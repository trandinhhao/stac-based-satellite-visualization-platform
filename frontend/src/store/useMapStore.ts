import { create } from 'zustand';

interface MapState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  selectedLayer: string;
  searchResults: any[];
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setSelectedLayer: (layer: string) => void;
  setSearchResults: (results: any[]) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [105.83416, 21.02776], // Default center for Vietnam [lng, lat]
  zoom: 6,                      // Default zoom level
  selectedLayer: 'openfreemap', // Default layer is OpenFreeMap
  searchResults: [],
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedLayer: (selectedLayer) => set({ selectedLayer }),
  setSearchResults: (searchResults) => set({ searchResults }),
}));
