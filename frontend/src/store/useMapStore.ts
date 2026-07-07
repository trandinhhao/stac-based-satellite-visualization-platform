import { create } from 'zustand';

interface MapState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  selectedLayer: string;
  searchResults: any[];
  searchPin: [number, number] | null;
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setSelectedLayer: (layer: string) => void;
  setSearchResults: (results: any[]) => void;
  setSearchPin: (pin: [number, number] | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: [105.83416, 21.02776], // Tọa độ trung tâm mặc định (Việt Nam) [Kinh độ, Vĩ độ]
  zoom: 12,                     // Cấp độ zoom mặc định
  selectedLayer: 'openfreemap', // Lớp bản đồ mặc định là OpenFreeMap
  searchResults: [],
  searchPin: null,
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedLayer: (selectedLayer) => set({ selectedLayer }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSearchPin: (searchPin) => set({ searchPin }),
}));
