import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Measurement {
  id: string;
  name: string;
  type: 'distance' | 'area';
  value: number; // distance in meters, or area in square meters
  perimeter?: number; // for area (in meters)
  geometry: any; // GeoJSON geometry (LineString or Polygon)
  created_at: string;
}

interface MeasurementState {
  isMeasuring: boolean;
  measureType: 'distance' | 'area' | 'none';
  currentMeasurement: Measurement | null;
  history: Measurement[];
  
  startMeasuring: (type: 'distance' | 'area') => void;
  stopMeasuring: () => void;
  setCurrentMeasurement: (measurement: Measurement | null) => void;
  saveCurrentMeasurement: (name: string) => void;
  deleteMeasurement: (id: string) => void;
  clearHistory: () => void;
}

export const useMeasurementStore = create<MeasurementState>()(
  persist(
    (set) => ({
      isMeasuring: false,
      measureType: 'none',
      currentMeasurement: null,
      history: [],
      
      startMeasuring: (type) => set({ isMeasuring: true, measureType: type, currentMeasurement: null }),
      stopMeasuring: () => set({ isMeasuring: false, measureType: 'none', currentMeasurement: null }),
      setCurrentMeasurement: (currentMeasurement) => set({ currentMeasurement }),
      saveCurrentMeasurement: (name) => set((state) => {
        if (!state.currentMeasurement) return {};
        const savedMeasurement: Measurement = {
          ...state.currentMeasurement,
          name: name.trim(),
          created_at: new Date().toISOString()
        };
        return {
          history: [savedMeasurement, ...state.history],
          currentMeasurement: null,
          isMeasuring: false,
          measureType: 'none'
        };
      }),
      deleteMeasurement: (id) => set((state) => ({
        history: state.history.filter((m) => m.id !== id)
      })),
      clearHistory: () => set({ history: [] })
    }),
    {
      name: 'satellite-measurement-storage', // localStorage key
      partialize: (state) => ({ history: state.history }), // only persist history list
    }
  )
);
