import { create } from 'zustand';

export interface STACCollection {
  id: string;
  title: string;
}

export interface STACAsset {
  href: string;
  type?: string;
  title?: string;
}

export interface STACItem {
  id: string;
  type: 'Feature';
  collection: string;
  bbox: [number, number, number, number];
  geometry: any;
  properties: {
    datetime: string;
    'eo:cloud_cover'?: number;
    platform?: string;
    [key: string]: any;
  };
  assets: Record<string, STACAsset>;
}

interface STACFilters {
  selectedCollection: string;
  date: string;
  searchInViewport: boolean;
}

interface STACState {
  collections: STACCollection[];
  searchResults: STACItem[];
  selectedItem: STACItem | null;
  filters: STACFilters;
  bbox: [number, number, number, number] | null;
  setCollections: (collections: STACCollection[]) => void;
  setSearchResults: (results: STACItem[]) => void;
  setSelectedItem: (item: STACItem | null) => void;
  setFilters: (filters: Partial<STACFilters>) => void;
  setBbox: (bbox: [number, number, number, number] | null) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: STACFilters = {
  selectedCollection: 'sentinel-2-l2a',
  date: '2025-06-15',
  searchInViewport: true,
};

export const useSTACStore = create<STACState>((set) => ({
  collections: [],
  searchResults: [],
  selectedItem: null,
  filters: DEFAULT_FILTERS,
  bbox: null,
  setCollections: (collections) => set({ collections }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setFilters: (updatedFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...updatedFilters },
    })),
  setBbox: (bbox) => set({ bbox }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
