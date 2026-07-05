import { create } from 'zustand';
import { api } from '../services/api';

export interface Job {
  id: string;
  user_id: string | null;
  aoi_id: string | null;
  job_type: 'aoi_extraction' | 'comparison' | 'object_detection';
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result_url: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface LiveStageNotification {
  jobId: string;
  progress: number;
  message: string;
  timestamp: string;
  status: string;
}

export const getStageMessage = (progress: number, jobType?: string): string => {
  if (jobType === 'object_detection' || !jobType) {
    if (progress <= 15) return 'Đã trích xuất tọa độ vùng AOI.';
    if (progress <= 25) return 'Đã tải xong ảnh vệ tinh Google Satellite.';
    if (progress <= 35) return 'Đã khởi động các mô hình AI.';
    if (progress <= 50) return 'Đã xong nhận diện Máy bay.';
    if (progress <= 68) return 'Đã xong nhận diện Tàu thủy.';
    if (progress <= 80) return 'Đã xong nhận diện Xe cộ.';
    if (progress <= 88) return 'Đã lọc trùng NMS & phân tích chéo.';
    if (progress <= 95) return 'Đã lọc vật thể theo ranh giới AOI.';
    return 'Phân tích AI hoàn thành!';
  } else if (jobType === 'aoi_extraction') {
    if (progress <= 20) return 'Khởi tạo tìm kiếm ảnh vệ tinh.';
    if (progress <= 70) return 'Đang truy vấn dữ liệu vệ tinh.';
    return 'Tìm kiếm ảnh vệ tinh hoàn thành!';
  } else {
    if (progress <= 30) return 'Đang tải dữ liệu đối chiếu.';
    if (progress <= 80) return 'Đang tính toán chênh lệch.';
    return 'Đối chiếu ảnh hoàn thành!';
  }
};

interface JobState {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  pollingIntervalId: number | null;
  liveStageNoti: LiveStageNotification | null;

  setLiveStageNoti: (noti: LiveStageNotification | null) => void;
  fetchJobs: () => Promise<void>;
  fetchJobDetails: (jobId: string) => Promise<Job>;
  createJob: (jobType: string, aoiId: string | null, payload: any) => Promise<string>;
  cancelJob: (jobId: string) => Promise<void>;
  startPollingJobs: () => void;
  stopPollingJobs: () => void;
  updateJobFromEvent: (eventData: {
    event: string;
    job_id: string;
    progress: number;
    status: string;
    error?: string;
    result_url?: string;
    job_type?: string;
  }) => void;
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  isLoading: false,
  error: null,
  pollingIntervalId: null,
  liveStageNoti: null,

  setLiveStageNoti: (noti) => set({ liveStageNoti: noti }),

  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Job[]>('/v1/jobs');
      set({ jobs: response.data, isLoading: false });
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể tải danh sách Jobs.';
      set({ error: errMsg, isLoading: false });
    }
  },

  fetchJobDetails: async (jobId) => {
    const response = await api.get<Job>(`/v1/jobs/${jobId}`);
    return response.data;
  },

  createJob: async (jobType, aoiId, payload) => {
    set({ error: null });
    try {
      const response = await api.post<{ job_id: string; status: string }>('/v1/jobs', {
        job_type: jobType,
        aoi_id: aoiId,
        payload
      });
      await get().fetchJobs();
      
      // Only trigger polling if WebSocket is not currently connected
      const { useWebSocketStore } = await import('./useWebSocketStore');
      const isConnected = useWebSocketStore.getState().connected;
      if (!isConnected) {
        get().startPollingJobs();
      }
      return response.data.job_id;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể tạo mới Job xử lý nền.';
      set({ error: errMsg });
      throw err;
    }
  },

  cancelJob: async (jobId) => {
    try {
      await api.delete(`/v1/jobs/${jobId}`);
      await get().fetchJobs();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Không thể hủy Job.';
      set({ error: errMsg });
      throw err;
    }
  },

  startPollingJobs: async () => {
    // If WebSocket is connected, skip polling to conserve resources
    const { useWebSocketStore } = await import('./useWebSocketStore');
    if (useWebSocketStore.getState().connected) {
      return;
    }

    // Prevent multiple parallel intervals
    if (get().pollingIntervalId) return;

    const intervalId = window.setInterval(async () => {
      const { jobs } = get();
      // Only keep polling if there is at least one active job in queue/running
      const hasActiveJobs = jobs.some(
        (job) => job.status === 'queued' || job.status === 'running' || job.status === 'pending'
      );

      if (!hasActiveJobs) {
        get().stopPollingJobs();
        return;
      }

      try {
        const response = await api.get<Job[]>('/v1/jobs');
        set({ jobs: response.data });
      } catch (err) {
        console.error('Error polling jobs list:', err);
      }
    }, 2000);

    set({ pollingIntervalId: intervalId as any });
  },

  stopPollingJobs: () => {
    const intervalId = get().pollingIntervalId;
    if (intervalId) {
      window.clearInterval(intervalId);
      set({ pollingIntervalId: null });
    }
  },

  updateJobFromEvent: (eventData) => {
    const nowStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let msg = getStageMessage(eventData.progress, eventData.job_type);
    if (eventData.status === 'failed') {
      msg = `Thất bại: ${eventData.error || 'Lỗi xử lý tác vụ'}`;
    }

    set((state) => {
      // If job is not in state yet, pull the list
      const jobExists = state.jobs.some((j) => j.id === eventData.job_id);
      if (!jobExists) {
        get().fetchJobs();
      }

      const updatedJobs = state.jobs.map((job) => {
        if (job.id === eventData.job_id) {
          return {
            ...job,
            status: eventData.status as any,
            progress: eventData.progress,
            error_message: eventData.error !== undefined ? eventData.error : job.error_message,
            result_url: eventData.result_url !== undefined ? eventData.result_url : job.result_url,
          };
        }
        return job;
      });

      return {
        jobs: updatedJobs,
        liveStageNoti: {
          jobId: eventData.job_id,
          progress: eventData.progress,
          message: msg,
          timestamp: nowStr,
          status: eventData.status,
        },
      };
    });
  },
}));
