import { create } from 'zustand';
import { api } from '../services/api';

export interface DetectedObject {
  object_class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
}

interface DetectionState {
  detections: DetectedObject[];
  isLoading: boolean;
  error: string | null;
  activeJobId: string | null;
  selectedObject: DetectedObject | null;
  showLabels: boolean;

  fetchDetections: (jobId: string) => Promise<void>;
  runDetection: (aoiId: string, model?: string) => Promise<string>;
  clearDetections: () => void;
  selectObject: (obj: DetectedObject | null) => void;
  setShowLabels: (show: boolean) => void;
}

export const useDetectionStore = create<DetectionState>((set) => ({
  detections: [],
  isLoading: false,
  error: null,
  activeJobId: null,
  selectedObject: null,
  showLabels: true,

  // Lấy dữ liệu các vật thể nhận diện được từ API theo Job ID tương ứng
  fetchDetections: async (jobId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ job_id: string; objects: DetectedObject[] }>(
        `/detections/${jobId}`
      );
      set({
        detections: response.data.objects,
        activeJobId: jobId,
        isLoading: false,
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể tải kết quả nhận diện.';
      set({ error: errMsg, isLoading: false });
    }
  },

  // Gửi lệnh kích hoạt tiến trình quét nhận diện AI trên một vùng đa giác AOI cụ thể
  runDetection: async (aoiId, model = 'yolo26') => {
    set({ error: null });
    try {
      const response = await api.post<{ job_id: string; status: string }>('/detections', {
        aoi_id: aoiId,
        model,
        collection: 'sentinel-2',
      });
      
      // Cập nhật ngay danh sách tác vụ hiển thị ở góc màn hình
      const { useJobStore } = await import('./useJobStore');
      await useJobStore.getState().fetchJobs();
      
      // Tự động kích hoạt cơ chế Polling dự phòng nếu mất kết nối WebSocket
      const { useWebSocketStore } = await import('./useWebSocketStore');
      if (!useWebSocketStore.getState().connected) {
        useJobStore.getState().startPollingJobs();
      }
      
      return response.data.job_id;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể chạy tác vụ nhận dạng AI.';
      set({ error: errMsg });
      throw err;
    }
  },

  // Dọn dẹp danh sách các vật thể đang hiển thị trên bản đồ
  clearDetections: () => {
    set({ detections: [], selectedObject: null, activeJobId: null, error: null });
  },

  // Chọn/lấy nét một vật thể cụ thể để zoom đến và hiển thị thông tin
  selectObject: (obj) => {
    set({ selectedObject: obj });
  },

  // Ẩn/Hiện nhãn dán loại đối tượng (aircraft, ship, vehicle) trên bản đồ
  setShowLabels: (showLabels) => {
    set({ showLabels });
  },
}));
