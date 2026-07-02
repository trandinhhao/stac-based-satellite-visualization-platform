import { useState, useEffect, useRef } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Layers, 
  Eye,
  ClipboardList,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useJobStore, type Job } from '../store/useJobStore';
import { useSTACStore } from '../store/useSTACStore';
import { useAOIStore } from '../store/useAOIStore';
import { api } from '../services/api';

export default function FloatingJobsWidget() {
  const { jobs, isLoading, error, fetchJobs, cancelJob, startPollingJobs, stopPollingJobs } = useJobStore();
  const { setSearchResults } = useSTACStore();
  const { setActiveTab } = useAOIStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedJobResult, setSelectedJobResult] = useState<any | null>(null);
  const [activeResultJob, setActiveResultJob] = useState<Job | null>(null);
  const [loadingResultId, setLoadingResultId] = useState<string | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);

  // Poll jobs on mount
  useEffect(() => {
    fetchJobs().then(() => {
      startPollingJobs();
    });
    return () => {
      stopPollingJobs();
    };
  }, []);

  // Click outside to close behavior
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Do not close popover if clicking inside the results modal backdrop
      if (target.closest('.fixed.inset-0.z-50')) {
        return;
      }
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // View job result handler
  const handleViewResult = async (job: Job) => {
    setLoadingResultId(job.id);
    try {
      const response = await api.get(`/v1/jobs/${job.id}/result`);
      setSelectedJobResult(response.data);
      setActiveResultJob(job);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể tải kết quả của tác vụ.');
    } finally {
      setLoadingResultId(null);
    }
  };

  // Apply STAC search result to map
  const handleApplyResultToMap = () => {
    if (!activeResultJob || !selectedJobResult) return;

    if (activeResultJob.job_type === 'aoi_extraction') {
      const features = selectedJobResult.features || [];
      setSearchResults(features);
      setActiveTab('search');
      setSelectedJobResult(null);
      setActiveResultJob(null);
      setIsOpen(false); // Close popover when applying
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
      return new Date(dateStr).toLocaleString('vi-VN', {
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
    <div ref={widgetRef} className="relative select-none pointer-events-auto">
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

                        {/* View Result button */}
                        {isCompleted && (
                          <button
                            onClick={() => handleViewResult(job)}
                            disabled={loadingResultId === job.id}
                            className="px-2 h-5.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-[9px] font-bold rounded-md flex items-center space-x-1 cursor-pointer transition-all"
                          >
                            {loadingResultId === job.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                            <span>Kết quả</span>
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

      {/* Results Detail Modal */}
      {selectedJobResult && activeResultJob && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          onClick={() => {
            setSelectedJobResult(null);
            setActiveResultJob(null);
          }}
        >
          <div
            className="bg-slate-900/95 border border-slate-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  Kết quả tác vụ: {getJobTypeLabel(activeResultJob.job_type)}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedJobResult(null);
                  setActiveResultJob(null);
                }}
                className="text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs text-slate-350">
              {activeResultJob.job_type === 'aoi_extraction' && (
                <div className="space-y-3">
                  <div className="text-slate-400 font-semibold">
                    Đã tìm thấy <span className="text-white font-black">{(selectedJobResult.features || []).length}</span> ảnh vệ tinh thỏa mãn điều kiện:
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(selectedJobResult.features || []).map((feature: any) => (
                      <div key={feature.id} className="p-2.5 bg-slate-950/50 border border-slate-800/80 rounded-lg space-y-1">
                        <div className="font-mono text-[10px] font-bold text-sky-400 truncate">{feature.id}</div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                          <span>{new Date(feature.properties.datetime).toLocaleDateString('vi-VN')}</span>
                          <span>{feature.properties['eo:cloud_cover'] ?? 0}% mây</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeResultJob.job_type === 'object_detection' && (
                <div className="space-y-3">
                  <div className="text-slate-400 font-semibold">
                    Đã nhận diện thành công <span className="text-white font-black">{(selectedJobResult.detections || []).length}</span> đối tượng:
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(selectedJobResult.detections || []).map((det: any, idx: number) => (
                      <div key={idx} className="p-2 bg-slate-950/50 border border-slate-850 rounded-lg flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 uppercase tracking-wide">
                            {det.class === 'aircraft' ? 'Máy bay (Aircraft)' : det.class === 'ship' ? 'Tàu thủy (Ship)' : det.class === 'vehicle' ? 'Xe cộ (Vehicle)' : det.class}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">BBox: [{det.bbox.map((n: number) => n.toFixed(3)).join(', ')}]</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          {Math.round(det.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setSelectedJobResult(null);
                  setActiveResultJob(null);
                }}
                className="px-4 h-8 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>

              {/* Map action button */}
              {activeResultJob.job_type === 'aoi_extraction' && (
                <button
                  onClick={handleApplyResultToMap}
                  className="px-4.5 h-8 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Hiển thị trên bản đồ</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
