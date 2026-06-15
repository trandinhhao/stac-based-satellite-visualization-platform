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

  fetchDetections: (jobId: string) => Promise<void>;
  runDetection: (aoiId: string, model?: string) => Promise<string>;
  clearDetections: () => void;
  selectObject: (obj: DetectedObject | null) => void;
}

export const useDetectionStore = create<DetectionState>((set) => ({
  detections: [],
  isLoading: false,
  error: null,
  activeJobId: null,
  selectedObject: null,

  fetchDetections: async (jobId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<{ job_id: string; objects: DetectedObject[] }>(
        `/v1/detections/${jobId}`
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

  runDetection: async (aoiId, model = 'yolov8') => {
    set({ isLoading: true, error: null, detections: [], selectedObject: null });
    try {
      const response = await api.post<{ job_id: string; status: string }>('/v1/detections', {
        aoi_id: aoiId,
        model,
        collection: 'sentinel-2',
      });
      set({ activeJobId: response.data.job_id, isLoading: false });
      return response.data.job_id;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể chạy tác vụ nhận dạng AI.';
      set({ error: errMsg, isLoading: false });
      throw err;
    }
  },

  clearDetections: () => {
    set({ detections: [], selectedObject: null, activeJobId: null, error: null });
  },

  selectObject: (obj) => {
    set({ selectedObject: obj });
  },
}));
