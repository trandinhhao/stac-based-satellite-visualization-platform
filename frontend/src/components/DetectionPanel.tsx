import { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  Download, 
  Info, 
  Loader2, 
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useAOIStore } from '../store/useAOIStore';
import { useJobStore } from '../store/useJobStore';
import { useDetectionStore, type DetectedObject } from '../store/useDetectionStore';
import { useMapStore } from '../store/useMapStore';

export default function DetectionPanel() {
  const { aois, selectedAOIId, selectAOI } = useAOIStore();
  const { jobs } = useJobStore();
  const { 
    detections, 
    isLoading: isStoreLoading, 
    error, 
    activeJobId, 
    selectedObject, 
    runDetection, 
    fetchDetections, 
    clearDetections, 
    selectObject 
  } = useDetectionStore();
  const { setCenter, setZoom } = useMapStore();

  const [selectedModel, setSelectedModel] = useState('yolov8');
  const [triggerAoiId, setTriggerAoiId] = useState(selectedAOIId || '');

  // Synchronize internal selection with global AOI selection
  useEffect(() => {
    if (selectedAOIId) {
      setTriggerAoiId(selectedAOIId);
    }
  }, [selectedAOIId]);

  // Find the active job in the job store to track real-time progress
  const activeJob = jobs.find(j => j.id === activeJobId);

  // When job finishes, automatically fetch detections
  useEffect(() => {
    if (activeJob && activeJob.status === 'completed' && detections.length === 0) {
      fetchDetections(activeJob.id);
    }
  }, [activeJob?.status, activeJobId]);

  const handleStartDetection = async () => {
    if (!triggerAoiId) return;
    try {
      selectAOI(triggerAoiId);
      // Run detection job
      const jobId = await runDetection(triggerAoiId, selectedModel);
      console.log('Detection job dispatched:', jobId);
    } catch (err) {
      console.error('Failed to trigger AI detection:', err);
    }
  };

  // Zoom to object bounding box centroid
  const handleZoomToObject = (obj: DetectedObject) => {
    selectObject(obj);
    const [xmin, ymin, xmax, ymax] = obj.bbox;
    const cx = (xmin + xmax) / 2;
    const cy = (ymin + ymax) / 2;
    setCenter([cx, cy]);
    setZoom(17.5);
  };

  // Group detections by class name
  const groupedDetections = detections.reduce((acc, curr) => {
    acc[curr.object_class] = acc[curr.object_class] || [];
    acc[curr.object_class].push(curr);
    return acc;
  }, {} as Record<string, DetectedObject[]>);

  // Export results as GeoJSON file
  const handleExportGeoJSON = () => {
    if (detections.length === 0) return;
    
    const features = detections.map((det) => {
      const [xmin, ymin, xmax, ymax] = det.bbox;
      return {
        type: 'Feature',
        properties: {
          class: det.object_class,
          confidence: det.confidence,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [xmin, ymin],
            [xmax, ymin],
            [xmax, ymax],
            [xmin, ymax],
            [xmin, ymin]
          ]]
        }
      };
    });

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonToString(geojson));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ai_detections_${activeJobId?.substring(0, 8)}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  // Export results as CSV file
  const handleExportCSV = () => {
    if (detections.length === 0) return;

    let csvContent = 'Class,Confidence,xmin,ymin,xmax,ymax\n';
    detections.forEach((det) => {
      const [xmin, ymin, xmax, ymax] = det.bbox;
      csvContent += `"${det.object_class}",${det.confidence},${xmin},${ymin},${xmax},${ymax}\n`;
    });

    // Add UTF-8 BOM for Microsoft Excel compatibility
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `ai_detections_${activeJobId?.substring(0, 8)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  const jsonToString = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };


  return (
    <div className="space-y-4 text-slate-200">
      {/* 1. Job Trigger Section */}
      {(!activeJobId || (activeJob && ['completed', 'failed', 'cancelled'].includes(activeJob.status))) && (
        <div className="space-y-3 p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
          <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-800/60">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-300">Khởi chạy AI Detection</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">
                Chọn Vùng AOI Mục Tiêu
              </label>
              <select
                value={triggerAoiId}
                onChange={(e) => {
                  setTriggerAoiId(e.target.value);
                  selectAOI(e.target.value || null);
                }}
                className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="">-- Chọn vùng AOI --</option>
                {aois.map((aoi) => (
                  <option key={aoi.id} value={aoi.id}>
                    {aoi.name} ({aoi.area ? `${(aoi.area / 10000).toFixed(1)} ha` : 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase block">
                Chọn Mô Hình AI
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="yolov8">YOLOv8 Satellite (Nano - Siêu nhẹ)</option>
                <option value="yolov11">YOLOv11 Remote Sensing (Mới nhất)</option>
              </select>
            </div>

            <button
              onClick={handleStartDetection}
              disabled={!triggerAoiId || isStoreLoading}
              className="w-full h-9 bg-sky-500 hover:bg-sky-400 disabled:opacity-55 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all mt-2"
            >
              {isStoreLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Bắt đầu Phân tích AI</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Async Progress UI */}
      {activeJob && ['queued', 'running', 'pending'].includes(activeJob.status) && (
        <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sky-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-bold uppercase tracking-wider">Đang nhận diện...</span>
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full">
              {activeJob.progress}%
            </span>
          </div>

          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-sky-500 transition-all duration-300 rounded-full"
              style={{ width: `${activeJob.progress}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-400 leading-normal flex items-start space-x-2">
            <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0 mt-0.5" />
            <span>
              {activeJob.status === 'running' 
                ? 'Đang nạp ảnh vệ tinh và chạy suy luận mạng nơ-ron YOLOv8...' 
                : 'Đang xếp hàng gửi yêu cầu tới Celery Worker...'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Results Panel */}
      {detections.length > 0 && (
        <div className="space-y-4">
          {/* Summary / Category badges */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-300">Thống kê vật thể</h4>
              </div>
              <button 
                onClick={clearDetections}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                title="Xóa kết quả hiện tại"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['aircraft', 'vehicle', 'ship'].map((cls) => {
                const count = groupedDetections[cls]?.length || 0;
                return (
                  <div key={cls} className="bg-slate-950/60 border border-slate-800/40 p-2.5 rounded-lg text-center flex flex-col justify-center items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{cls === 'aircraft' ? 'Máy bay' : cls === 'ship' ? 'Tàu thủy' : 'Xe cộ'}</span>
                    <strong className={`text-base font-bold mt-1 ${count > 0 ? 'text-sky-400' : 'text-slate-500'}`}>
                      {count}
                    </strong>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={handleExportGeoJSON}
                className="flex-1 h-8 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Xuất GeoJSON</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 h-8 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Xuất CSV</span>
              </button>
            </div>
          </div>

          {/* Detections Detail List */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Chi tiết vật thể nhận diện ({detections.length})
            </h4>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {detections.map((det, idx) => {
                const isSelected = selectedObject === det;
                return (
                  <button
                    key={idx}
                    onClick={() => handleZoomToObject(det)}
                    className={`w-full text-left flex items-center justify-between p-2 rounded-lg border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg'
                        : 'bg-slate-950/20 border-slate-850 hover:bg-slate-800/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        det.object_class === 'aircraft' 
                          ? 'bg-red-400' 
                          : det.object_class === 'ship' 
                          ? 'bg-emerald-400' 
                          : 'bg-amber-400'
                      }`} />
                      <span className="text-xs font-bold text-slate-200 capitalize">
                        {det.object_class === 'aircraft' 
                          ? 'Aircraft' 
                          : det.object_class === 'ship' 
                          ? 'Ship' 
                          : 'Vehicle'} #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px]">
                      <span className="text-slate-400 font-mono">Conf: {(det.confidence * 100).toFixed(0)}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Error state */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300">
          <span>Lỗi: {error}</span>
        </div>
      )}
    </div>
  );
}
