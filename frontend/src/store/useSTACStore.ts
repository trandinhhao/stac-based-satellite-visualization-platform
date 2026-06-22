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
  startDate: string;
  endDate: string;
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
  startDate: '2026-01-01',
  endDate: '2026-01-01',
  searchInViewport: true,
};

export const useSTACStore = create<STACState>((set) => ({
  collections: [],
  searchResults: [],
  selectedItem: null,
  filters: DEFAULT_FILTERS,
  bbox: null,
  setCollections: (collections) => set({ collections }),
  setSearchResults: (searchResults) => {
    const sorted = [...searchResults].sort((a, b) => {
      const timeA = a.properties.datetime ? new Date(a.properties.datetime).getTime() : 0;
      const timeB = b.properties.datetime ? new Date(b.properties.datetime).getTime() : 0;
      return timeA - timeB;
    });
    set({ searchResults: sorted });
  },
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setFilters: (updatedFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...updatedFilters },
    })),
  setBbox: (bbox) => set({ bbox }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
