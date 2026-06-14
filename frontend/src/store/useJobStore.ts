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

interface JobState {
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  pollingIntervalId: number | null;

  fetchJobs: () => Promise<void>;
  fetchJobDetails: (jobId: string) => Promise<Job>;
  createJob: (jobType: string, aoiId: string | null, payload: any) => Promise<string>;
  cancelJob: (jobId: string) => Promise<void>;
  startPollingJobs: () => void;
  stopPollingJobs: () => void;
}

export const useJobStore = create<JobState>((set, get) => ({
  jobs: [],
  isLoading: false,
  error: null,
  pollingIntervalId: null,

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
      get().startPollingJobs(); // Trigger immediate polling when a new job is created
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

  startPollingJobs: () => {
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
}));
