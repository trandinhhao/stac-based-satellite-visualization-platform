import { useState, useEffect, useRef } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  X, 
  Eye,
  ClipboardList,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useJobStore, type Job } from '../store/useJobStore';
import { useSTACStore } from '../store/useSTACStore';
import { useAOIStore } from '../store/useAOIStore';
import { useDetectionStore } from '../store/useDetectionStore';
import { useMapStore } from '../store/useMapStore';
import { api } from '../services/api';

export default function FloatingJobsWidget() {
  const { jobs, isLoading, error, fetchJobs, cancelJob, startPollingJobs, stopPollingJobs, liveStageNoti, setLiveStageNoti } = useJobStore();
  const { setSearchResults } = useSTACStore();

  const [isOpen, setIsOpen] = useState(false);
  const [loadingResultId, setLoadingResultId] = useState<string | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);
  const prevJobIdsRef = useRef<Set<string> | null>(null);

  // Poll jobs on mount
  useEffect(() => {
    fetchJobs().then(() => {
      startPollingJobs();
    });
    return () => {
      stopPollingJobs();
    };
  }, []);

  // Auto-open popover when a new active job (queued/running/pending) is created
  useEffect(() => {
    if (!prevJobIdsRef.current) {
      prevJobIdsRef.current = new Set(jobs.map((j) => j.id));
      return;
    }

    const hasNewActiveJob = jobs.some(
      (j) => !prevJobIdsRef.current!.has(j.id) && ['queued', 'running', 'pending'].includes(j.status)
    );

    if (hasNewActiveJob) {
      setIsOpen(true);
    }

    prevJobIdsRef.current = new Set(jobs.map((j) => j.id));
  }, [jobs]);

  // Directly apply result from job list card (without opening modal)
  const handleApplyResultDirectly = async (job: Job) => {
    if (job.status !== 'completed') return;
    setLoadingResultId(job.id);
    try {
      if (job.job_type === 'aoi_extraction') {
        const response = await api.get(`/v1/jobs/${job.id}/result`);
        const items = response.data.features || response.data.items || response.data || [];
        setSearchResults(items);
        useAOIStore.setState({ activeTab: 'search', isDrawerOpen: true });
      } else if (job.job_type === 'object_detection') {
        // 1. Fetch detection details into store
        await useDetectionStore.getState().fetchDetections(job.id);
        
        // 2. Select only this specific AOI and activate the AI tab
        useAOIStore.setState({ 
          selectedAOIIds: job.aoi_id ? [job.aoi_id] : [],
          selectedAOIId: job.aoi_id,
          activeTab: 'ai', 
          isDrawerOpen: true 
        });

        // 3. Move the map view to the center of the selected AOI
        const aoi = useAOIStore.getState().aois.find(a => a.id === job.aoi_id);
        if (aoi && aoi.geometry && aoi.geometry.coordinates[0]) {
          const coords = aoi.geometry.coordinates[0];
          let sumLng = 0;
          let sumLat = 0;
          const count = coords.length;
          if (count > 0) {
            coords.forEach(pt => {
              sumLng += pt[0];
              sumLat += pt[1];
            });
            const avgLng = sumLng / count;
            const avgLat = sumLat / count;
            
            useMapStore.getState().setCenter([avgLng, avgLat]);
            useMapStore.getState().setZoom(16.5);
          }
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể hiển thị kết quả lên bản đồ.');
    } finally {
      setLoadingResultId(null);
    }
  };

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'aoi_extraction':
        return 'Tìm kiếm vệ tinh';
      case 'object_detection':
        return 'Nhận diện đối tượng AI';
      case 'comparison':
        return 'Đối chiếu ảnh';
      default:
        return type;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450';
      case 'failed':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'running':
        return 'bg-sky-500/10 border-sky-500/30 text-sky-400';
      case 'queued':
      case 'pending':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse';
      case 'cancelled':
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
      default:
        return 'bg-slate-500/10 border-slate-800 text-slate-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'failed':
        return 'Thất bại';
      case 'cancelled':
        return 'Đã hủy';
      case 'running':
        return 'Đang xử lý';
      case 'queued':
      case 'pending':
        return 'Đang chờ';
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      // If server date string does not have 'Z' or offset, append 'Z' so JS parses as UTC
      const isoStr = (dateStr.endsWith('Z') || dateStr.includes('+')) ? dateStr : dateStr + 'Z';
      return new Date(isoStr).toLocaleString('vi-VN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Find active jobs
  const activeJobs = jobs.filter((job) => ['running', 'queued', 'pending'].includes(job.status));
  const activeCount = activeJobs.length;

  return (
    <div ref={widgetRef} className="relative select-none pointer-events-auto flex items-center justify-end space-x-3">
      {/* On-screen Live Stage Notification Toast (Single line format: ID:id-job | message | time) */}
      {liveStageNoti && (
        <div className="flex items-center space-x-2 px-3 py-2 bg-slate-950/95 backdrop-blur-md border border-sky-500/40 shadow-2xl rounded-xl text-xs text-slate-200 animate-in fade-in slide-in-from-right-4 duration-300 whitespace-nowrap cursor-default">
          <span className="font-mono text-sky-400 font-bold text-[11px]">
            ID:{liveStageNoti.jobId.slice(0, 8)}
          </span>
          <span className="text-slate-600 font-normal">|</span>
          <span className="text-[11px] text-slate-200 font-medium">
            {liveStageNoti.message}
          </span>
          <span className="text-slate-600 font-normal">|</span>
          <span className="font-mono text-slate-400 text-[10px]">
            {liveStageNoti.timestamp}
          </span>
          <button
            onClick={() => setLiveStageNoti(null)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-colors ml-1.5 flex-shrink-0"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Button & Dropdown Container */}
      <div className="relative">
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="Danh sách tác vụ nền"
          className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-900/90 backdrop-blur-md border transition-all cursor-pointer shadow-2xl relative group ${
            isOpen
              ? 'border-sky-500 text-sky-400 bg-slate-800'
              : 'border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          {activeCount > 0 ? (
            <>
              {/* Pulsing indicator ring */}
              <span className="absolute inset-0 rounded-full border border-sky-500 animate-ping opacity-60 pointer-events-none" />
              <Clock className="w-5 h-5 text-sky-400 animate-pulse" />
              {/* Active jobs badge */}
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-sky-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200">
                {activeCount}
              </span>
            </>
          ) : (
            <Clock className="w-5 h-5" />
          )}
        </button>

        {/* Popover Jobs Dashboard Dropdown */}
        {isOpen && (
          <div className="absolute bottom-12 right-0 mb-2 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800/90 rounded-2xl shadow-2xl p-4 z-20 flex flex-col max-h-[460px] animate-in slide-in-from-bottom-2 duration-200 origin-bottom-right">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3 flex-shrink-0">
              <div className="flex items-center space-x-1.5">
                <ClipboardList className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Tác vụ xử lý nền
                </h4>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => fetchJobs()}
                  disabled={isLoading}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                  title="Làm mới"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 flex items-start space-x-1.5 mb-2.5 flex-shrink-0 animate-in fade-in duration-200">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Job List Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[340px]">
              {jobs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-slate-850 rounded-xl">
                  Chưa có tác vụ nền nào.
                </div>
              ) : (
                jobs.map((job) => {
                  const isProcessing = ['running', 'queued', 'pending'].includes(job.status);
                  const isCompleted = job.status === 'completed';
                  const isFailed = job.status === 'failed' || job.status === 'cancelled';

                  return (
                    <div
                      key={job.id}
                      className={`p-3 bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 rounded-xl space-y-2.5 transition-all ${
                        job.status === 'running' ? 'shadow-md shadow-sky-500/5' : ''
                      }`}
                    >
                      {/* Row 1: Job Type & Status Badge */}
                      <div className="flex items-start justify-between space-x-2">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-slate-200 truncate">
                            {getJobTypeLabel(job.job_type)}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5" title={job.id}>
                            ID: {job.id.slice(0, 8)}...
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${getStatusBadgeClass(job.status)}`}>
                          {getStatusText(job.status).toUpperCase()}
                        </span>
                      </div>

                      {/* Row 2: Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                          <span>Tiến độ thực hiện</span>
                          <span className="font-mono">{job.progress}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : isFailed
                                ? 'bg-red-500'
                                : 'bg-sky-500 shadow-[0_0_6px_#0ea5e9]'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Error display inside card */}
                      {job.error_message && (
                        <div className="p-2 bg-red-950/20 border border-red-900/30 rounded-lg text-[9px] text-red-400 font-medium leading-normal">
                          <strong>Lỗi:</strong> {job.error_message}
                        </div>
                      )}

                      {/* Row 3: Timestamps & Actions */}
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium pt-1.5 border-t border-slate-900">
                        <div className="flex flex-col space-y-0.5">
                          <span>Tạo lúc: {formatDate(job.created_at)}</span>
                          {job.started_at && <span>Bắt đầu: {formatDate(job.started_at)}</span>}
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {/* Cancel button */}
                          {isProcessing && (
                            <button
                              onClick={() => cancelJob(job.id)}
                              className="px-2 h-5.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md text-[9px] font-bold text-red-400 cursor-pointer transition-all"
                            >
                              Hủy tác vụ
                            </button>
                          )}

                          {/* Hiển thị button to load onto map */}
                          {isCompleted && (
                            <button
                              onClick={() => handleApplyResultDirectly(job)}
                              disabled={loadingResultId === job.id}
                              className="px-2 h-6 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-[9px] font-black rounded-md flex items-center space-x-1 cursor-pointer transition-all shadow-md"
                            >
                              {loadingResultId === job.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                              <span>Hiển thị</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
