import { create } from 'zustand';
import { api } from '../services/api';

export interface AOIGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface AOI {
  id: string;
  name: string;
  description: string;
  geometry: AOIGeometry;
  area: number;
  perimeter: number;
  created_at: string;
  updated_at: string;
}

interface AOIState {
  aois: AOI[];
  selectedAOIId: string | null;
  isDrawing: boolean;
  drawType: 'polygon' | 'rectangle' | 'circle' | null;
  tempGeometry: AOIGeometry | null;
  editingAOIId: string | null;
  isLoading: boolean;
  error: string | null;
  activeTab: 'search' | 'aoi' | 'measure' | 'comparison' | 'jobs';
  
  fetchAOIs: () => Promise<void>;
  selectAOI: (id: string | null) => void;
  createAOI: (name: string, description: string, geometry: AOIGeometry) => Promise<AOI>;
  updateAOI: (id: string, data: { name?: string; description?: string; geometry?: AOIGeometry }) => Promise<AOI>;
  deleteAOI: (id: string) => Promise<void>;
  importAOI: (file: File) => Promise<AOI>;
  setDrawing: (isDrawing: boolean) => void;
  setDrawType: (drawType: 'polygon' | 'rectangle' | 'circle' | null) => void;
  setTempGeometry: (geometry: AOIGeometry | null) => void;
  setEditingAOI: (id: string | null) => void;
  setActiveTab: (tab: 'search' | 'aoi' | 'measure' | 'comparison' | 'jobs') => void;
  clearError: () => void;
}

export const useAOIStore = create<AOIState>((set) => ({
  aois: [],
  selectedAOIId: null,
  isDrawing: false,
  drawType: null,
  tempGeometry: null,
  editingAOIId: null,
  isLoading: false,
  error: null,
  activeTab: 'search',

  fetchAOIs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<AOI[]>('/aois');
      set({ aois: response.data, isLoading: false });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể tải danh sách vùng quan tâm (AOI).';
      set({ error: errMsg, isLoading: false });
    }
  },

  selectAOI: (id) => {
    set({ selectedAOIId: id });
  },

  createAOI: async (name, description, geometry) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<AOI>('/aois', { name, description, geometry });
      const newAOI = response.data;
      set((state) => ({
        aois: [newAOI, ...state.aois],
        selectedAOIId: newAOI.id,
        isLoading: false,
      }));
      return newAOI;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể tạo mới vùng quan tâm (AOI).';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  updateAOI: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put<AOI>(`/aois/${id}`, data);
      const updatedAOI = response.data;
      set((state) => ({
        aois: state.aois.map((aoi) => (aoi.id === id ? updatedAOI : aoi)),
        isLoading: false,
      }));
      return updatedAOI;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể cập nhật vùng quan tâm (AOI).';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  deleteAOI: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/aois/${id}`);
      set((state) => ({
        aois: state.aois.filter((aoi) => aoi.id !== id),
        selectedAOIId: state.selectedAOIId === id ? null : state.selectedAOIId,
        isLoading: false,
      }));
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể xóa vùng quan tâm (AOI).';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  importAOI: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<AOI>('/aois/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newAOI = response.data;
      set((state) => ({
        aois: [newAOI, ...state.aois],
        selectedAOIId: newAOI.id,
        isLoading: false,
      }));
      return newAOI;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể nhập vùng quan tâm từ tệp.';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  setDrawing: (isDrawing) => set({ isDrawing }),
  setDrawType: (drawType) => set({ drawType }),
  setTempGeometry: (tempGeometry) => set({ tempGeometry }),
  setEditingAOI: (editingAOIId) => set({ editingAOIId }),
  setActiveTab: (activeTab) => set({ activeTab }),
  clearError: () => set({ error: null }),
}));
