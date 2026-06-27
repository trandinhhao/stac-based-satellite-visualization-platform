import { create } from 'zustand';

export interface Measurement {
  id: string;
  name: string;
  type: 'distance' | 'area';
  value: number; // distance in meters, or area in square meters
  perimeter?: number; // for area (in meters)
  geometry: any; // GeoJSON geometry (LineString or Polygon)
  isDrawing?: boolean;
  created_at: string;
}

interface MeasurementState {
  isMeasuring: boolean;
  measureType: 'distance' | 'area' | 'none';
  currentMeasurement: Measurement | null;
  history: Measurement[];
  hoveredMeasurementId: string | null;
  
  startMeasuring: (type: 'distance' | 'area') => void;
  stopMeasuring: () => void;
  setCurrentMeasurement: (measurement: Measurement | null) => void;
  addCompletedMeasurement: (measurement: Measurement) => void;
  deleteMeasurement: (id: string) => void;
  updateMeasurementName: (id: string, name: string) => void;
  clearHistory: () => void;
  setHoveredMeasurementId: (id: string | null) => void;
}

export const useMeasurementStore = create<MeasurementState>((set) => ({
  isMeasuring: false,
  measureType: 'none',
  currentMeasurement: null,
  history: [],
  hoveredMeasurementId: null,
  
  startMeasuring: (type) => set({ isMeasuring: true, measureType: type, currentMeasurement: null }),
  stopMeasuring: () => set({ isMeasuring: false, measureType: 'none', currentMeasurement: null }),
  setCurrentMeasurement: (currentMeasurement) => set({ currentMeasurement }),
  addCompletedMeasurement: (measurement) => set((state) => ({
    history: [measurement, ...state.history]
  })),
  deleteMeasurement: (id) => set((state) => ({
    history: state.history.filter((m) => m.id !== id)
  })),
  updateMeasurementName: (id, name) => set((state) => ({
    history: state.history.map((m) => m.id === id ? { ...m, name } : m)
  })),
  clearHistory: () => set({ history: [] }),
  setHoveredMeasurementId: (hoveredMeasurementId) => set({ hoveredMeasurementId })
}));
