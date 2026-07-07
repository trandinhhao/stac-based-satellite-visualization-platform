import { create } from 'zustand';

export interface Measurement {
  id: string;
  name: string;
  type: 'distance' | 'area';
  value: number; // Khoảng cách tính bằng mét (m), hoặc diện tích tính bằng mét vuông (m2)
  perimeter?: number; // Chu vi đối với đo diện tích (mét)
  geometry: any; // Dữ liệu địa lý GeoJSON (LineString hoặc Polygon)
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
  
  // Bắt đầu chế độ đo đạc không gian (đo khoảng cách hoặc diện tích)
  startMeasuring: (type) => set({ isMeasuring: true, measureType: type, currentMeasurement: null }),
  
  // Ngừng chế độ đo đạc không gian
  stopMeasuring: () => set({ isMeasuring: false, measureType: 'none', currentMeasurement: null }),
  
  setCurrentMeasurement: (currentMeasurement) => set({ currentMeasurement }),
  
  // Lưu phép đo đã hoàn thành vào danh sách lịch sử đo đạc
  addCompletedMeasurement: (measurement) => set((state) => ({
    history: [measurement, ...state.history]
  })),
  
  // Xóa bỏ một kết quả đo đạc trong lịch sử
  deleteMeasurement: (id) => set((state) => ({
    history: state.history.filter((m) => m.id !== id)
  })),
  
  // Cập nhật tên của phép đo
  updateMeasurementName: (id, name) => set((state) => ({
    history: state.history.map((m) => m.id === id ? { ...m, name } : m)
  })),
  
  clearHistory: () => set({ history: [] }),
  
  setHoveredMeasurementId: (hoveredMeasurementId) => set({ hoveredMeasurementId })
}));
