import { useEffect, useState } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Eye, 
  X, 
  Layers
} from 'lucide-react';
import { useJobStore, type Job } from '../../../store/useJobStore';
import { useCompareStore } from '../../comparison/store/useCompareStore';
import { useSTACStore } from '../../../store/useSTACStore';
import { useAOIStore } from '../../../store/useAOIStore';
import { api } from '../../../services/api';

export default function JobDashboard() {
  const { jobs, isLoading, error, fetchJobs, cancelJob, startPollingJobs, stopPollingJobs } = useJobStore();
  const { selectImageA, selectImageB, setCompareMode } = useCompareStore();
  const { setSearchResults } = useSTACStore();
  const { setActiveTab } = useAOIStore();

  const [selectedJobResult, setSelectedJobResult] = useState<any | null>(null);
  const [activeResultJob, setActiveResultJob] = useState<Job | null>(null);
  const [loadingResultId, setLoadingResultId] = useState<string | null>(null);

  // 1. Initial fetch and start polling
  useEffect(() => {
    fetchJobs().then(() => {
      startPollingJobs();
    });
    return () => {
      stopPollingJobs();
    };
  }, []);

  // Format Helper
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

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'aoi_extraction':
        return 'Tìm kiếm ảnh (AOI)';
      case 'comparison':
        return 'Đối chiếu ảnh vệ tinh';
      case 'object_detection':
        return 'Nhận diện đối tượng AI';
      default:
        return type;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
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

  // 2. Fetch and show Job Results
  const handleViewResult = async (job: Job) => {
    setLoadingResultId(job.id);
    try {
      const response = await api.get(`/v1/jobs/${job.id}/result`);
      setSelectedJobResult(response.data);
      setActiveResultJob(job);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể tải tệp kết quả của tác vụ.');
    } finally {
      setLoadingResultId(null);
    }
  };

  // 3. Load results dynamically into Map views
  const handleApplyResultToMap = () => {
    if (!activeResultJob || !selectedJobResult) return;

    if (activeResultJob.job_type === 'aoi_extraction') {
      // Load STAC search results
      const features = selectedJobResult.features || [];
      setSearchResults(features);
      setActiveTab('search');
      setSelectedJobResult(null);
      setActiveResultJob(null);
    } else if (activeResultJob.job_type === 'comparison') {
      // Load Image A & B into comparison store
      const { imageA, imageB } = selectedJobResult;
      selectImageA(imageA);
      selectImageB(imageB);
      setCompareMode('side-by-side');
      setActiveTab('comparison');
      setSelectedJobResult(null);
      setActiveResultJob(null);
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 px-0.5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Danh sách tác vụ xử lý nền
        </h4>
        <button
          type="button"
          onClick={() => fetchJobs()}
          disabled={isLoading}
          className="p-1 bg-slate-900 border border-slate-800 rounded-lg hover:text-white transition-all disabled:opacity-50 cursor-pointer"
          title="Làm mới danh sách"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start space-x-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main jobs list */}
      {jobs.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-slate-800/30 rounded-2xl">
          Chưa có tác vụ nền nào được xếp hàng hoặc thực hiện.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {jobs.map((job) => (
            <div 
              key={job.id} 
              className={`p-3.5 bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 rounded-xl space-y-3 transition-all ${
                job.status === 'running' ? 'shadow-lg shadow-sky-500/5' : ''
              }`}
            >
              {/* Row 1: Job Type & Status */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-slate-200">
                    {getJobTypeLabel(job.job_type)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5" title={job.id}>
                    ID: {job.id.slice(0, 8)}...
                  </span>
                </div>

                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeClass(job.status)}`}>
                  {job.status.toUpperCase()}
                </span>
              </div>

              {/* Row 2: Progress bar & logs */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px] text-slate-400 font-semibold px-0.5">
                  <span>Tiến độ thực hiện</span>
                  <span className="font-mono">{job.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${
                      job.status === 'completed'
                        ? 'bg-emerald-500'
                        : job.status === 'failed'
                        ? 'bg-red-500'
                        : job.status === 'cancelled'
                        ? 'bg-slate-600'
                        : 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]'
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              {/* Row 3: Timestamps & Error messaging */}
              {job.error_message && (
                <div className="p-2 bg-red-950/20 border border-red-900/30 rounded-lg text-[10px] text-red-400 font-medium">
                  <strong>Lỗi:</strong> {job.error_message}
                </div>
              )}

              <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium pt-1 border-t border-slate-900">
                <div className="flex flex-col space-y-0.5">
                  <span>Tạo lúc: {formatDate(job.created_at)}</span>
                  {job.started_at && <span>Bắt đầu: {formatDate(job.started_at)}</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1.5">
                  {/* Cancel button */}
                  {(job.status === 'queued' || job.status === 'running' || job.status === 'pending') && (
                    <button
                      onClick={() => cancelJob(job.id)}
                      className="px-2.5 h-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md text-[9px] font-bold text-red-400 cursor-pointer transition-all"
                    >
                      Hủy tác vụ
                    </button>
                  )}

                  {/* View Result button */}
                  {job.status === 'completed' && (
                    <button
                      onClick={() => handleViewResult(job)}
                      disabled={loadingResultId === job.id}
                      className="px-2.5 h-6 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-[9px] font-bold rounded-md flex items-center space-x-1 cursor-pointer transition-all"
                    >
                      {loadingResultId === job.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      <span>Xem kết quả</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Results Detail Modal */}
      {selectedJobResult && activeResultJob && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
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
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Content depending on Job type */}
              {activeResultJob.job_type === 'aoi_extraction' && (
                <div className="space-y-3">
                  <div className="text-slate-400 font-semibold">
                    Đã tìm thấy <span className="text-white font-black">{(selectedJobResult.features || []).length}</span> ảnh vệ tinh thỏa mãn điều kiện:
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(selectedJobResult.features || []).map((feature: any) => (
                      <div key={feature.id} className="p-2 bg-slate-950/50 border border-slate-800/80 rounded-lg space-y-1">
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

              {activeResultJob.job_type === 'comparison' && (
                <div className="space-y-3">
                  <div className="text-slate-400 font-bold mb-1">Thống kê so sánh:</div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 border border-slate-850 rounded-xl">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-slate-500 font-semibold text-[9px] uppercase">Khoảng cách thời gian</span>
                      <span className="text-slate-200 font-black text-sm">{selectedJobResult.stats?.days_difference ?? 'N/A'} ngày</span>
                    </div>
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-slate-500 font-semibold text-[9px] uppercase">Chênh lệch độ mây</span>
                      <span className={`text-sm font-black ${
                        (selectedJobResult.stats?.cloud_cover_difference ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {selectedJobResult.stats?.cloud_cover_difference?.toFixed(1) ?? 'N/A'}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Vệ tinh Ảnh A (T1):</span>
                      <span className="text-slate-300 font-mono text-[10px]">{selectedJobResult.imageA?.id.slice(0, 20)}...</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-500">Vệ tinh Ảnh B (T2):</span>
                      <span className="text-slate-300 font-mono text-[10px]">{selectedJobResult.imageB?.id.slice(0, 20)}...</span>
                    </div>
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
                          <span className="font-bold text-slate-200 uppercase tracking-wide">{det.class}</span>
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
                className="px-3.5 h-8 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Đóng
              </button>

              {/* Map action button */}
              {(activeResultJob.job_type === 'aoi_extraction' || activeResultJob.job_type === 'comparison') && (
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
