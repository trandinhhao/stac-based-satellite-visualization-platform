import { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Play, 
  Download, 
  Loader2, 
  Trash2,
  ChevronRight,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAOIStore } from '../store/useAOIStore';
import { useJobStore } from '../store/useJobStore';
import { useDetectionStore, type DetectedObject } from '../store/useDetectionStore';
import { useMapStore } from '../store/useMapStore';

export default function DetectionPanel() {
  const { aois, selectedAOIId, selectAOI, fetchAOIs, activeTab, isDrawerOpen } = useAOIStore();
  const { jobs } = useJobStore();
  const { 
    detections, 
    error, 
    activeJobId, 
    selectedObject, 
    runDetection, 
    fetchDetections, 
    clearDetections, 
    selectObject,
    showLabels,
    setShowLabels
  } = useDetectionStore();
  const { setCenter, setZoom } = useMapStore();

  const selectedModel = 'yolo26';
  const [triggerAoiId, setTriggerAoiId] = useState(selectedAOIId || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeAoi = aois.find(aoi => aoi.id === triggerAoiId);

  // Load AOIs on mount
  useEffect(() => {
    fetchAOIs();
  }, [fetchAOIs]);

  // Enforce Google Satellite map layer when the AI tab is open and active
  useEffect(() => {
    if (activeTab === 'ai' && isDrawerOpen) {
      useMapStore.getState().setSelectedLayer('google-satellite');
    }
  }, [activeTab, isDrawerOpen]);

  // Synchronize internal selection with global AOI selection & clear detections if AOI selection changes
  useEffect(() => {
    if (triggerAoiId && selectedAOIId !== triggerAoiId) {
      clearDetections();
    }
    setTriggerAoiId(selectedAOIId || '');
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
    setIsSubmitting(true);
    try {
      // Run detection job
      await runDetection(triggerAoiId, selectedModel);
    } catch (err) {
      console.error('Failed to trigger AI detection:', err);
    } finally {
      setIsSubmitting(false);
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
    URL.revokeObjectURL(url);
  };

  const jsonToString = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };


  return (
    <div className="space-y-4 text-slate-200">
      {/* 1. Job Trigger Section */}
      <div className="space-y-3 p-3.5 bg-slate-950/40 border border-slate-800/60 rounded-xl">
        <div className="flex items-center space-x-2 pb-1.5 border-b border-slate-800/60">
          <Cpu className="w-4 h-4 text-sky-400" />
          <h4 className="text-xs font-bold text-slate-300">Khởi chạy AI Detection</h4>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">
              Chọn Vùng AOI Mục Tiêu
            </label>
            
            <div className="relative">
              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full h-9 pl-3 pr-16 bg-slate-950 hover:bg-slate-900 border rounded-lg text-xs text-slate-200 font-medium flex items-center justify-between cursor-pointer transition-all ${
                  isDropdownOpen
                    ? 'border-sky-500/60 ring-1 ring-sky-500/10 shadow-[0_0_10px_rgba(56,189,248,0.12)]'
                    : 'border-slate-800 hover:border-slate-700/80'
                }`}
              >
                <span className="truncate max-w-[180px]">
                  {!activeAoi
                    ? 'Chọn vùng quan tâm...'
                    : activeAoi.name}
                </span>
              </button>
              
              {/* Actions (X and Chevron) inside the field */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10">
                {activeAoi && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTriggerAoiId('');
                      selectAOI(null);
                      clearDetections();
                      setIsDropdownOpen(false);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                    title="Bỏ chọn vùng"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                >
                  {isDropdownOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 z-30 p-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-800/90 rounded-lg shadow-2xl space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="space-y-0.5 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {aois.map((aoi) => {
                    const isChecked = triggerAoiId === aoi.id;
                    return (
                      <div 
                        key={aoi.id}
                        onClick={() => {
                          if (isChecked) {
                            setTriggerAoiId('');
                            selectAOI(null);
                            clearDetections();
                          } else {
                            setTriggerAoiId(aoi.id);
                            useAOIStore.setState({
                              selectedAOIIds: [aoi.id],
                              selectedAOIId: aoi.id,
                              isDrawing: false,
                              drawType: null,
                              tempGeometry: null,
                              editingAOIId: null
                            });
                            clearDetections();
                          }
                          setIsDropdownOpen(false);
                        }}
                        className={`flex items-center px-2.5 py-1.5 rounded transition-all cursor-pointer select-none group ${
                          isChecked
                            ? 'bg-sky-500/10 text-sky-400 font-semibold'
                            : 'hover:bg-slate-900/60 text-slate-350 hover:text-white'
                        }`}
                      >
                        {/* Name & Area Metadata */}
                        <div className="flex-1 min-w-0 flex items-baseline justify-between">
                          <span className="text-[11px] font-medium truncate leading-tight transition-colors">
                            {aoi.name}
                          </span>
                          {aoi.area && (
                            <span className={`text-[10px] font-mono font-bold ml-2 flex-shrink-0 transition-colors ${
                              isChecked 
                                ? 'text-sky-300' 
                                : 'text-emerald-400 group-hover:text-emerald-350'
                            }`}>
                              {aoi.area >= 1000000 
                                ? `${(aoi.area / 1000000).toFixed(2)} km²` 
                                : `${(aoi.area / 10000).toFixed(1)} ha`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase block px-0.5">
              Mô hình AI sử dụng
            </label>
            <div className="w-full h-9 px-3 bg-slate-950/40 border border-slate-900 rounded-lg text-xs text-sky-400 font-bold flex items-center justify-start">
              <span>YOLOv8 Multi-Specialized</span>
            </div>
          </div>

          <button
            onClick={handleStartDetection}
            disabled={!triggerAoiId || isSubmitting}
            className="w-full h-9 bg-sky-500 hover:bg-sky-400 disabled:opacity-55 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Bắt đầu Phân tích AI</span>
          </button>
        </div>
      </div>

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
                const countColor = cls === 'aircraft' ? 'text-red-400' : cls === 'ship' ? 'text-blue-400' : 'text-amber-400';
                return (
                  <div key={cls} className="bg-slate-950/60 border border-slate-800/40 p-2.5 rounded-lg text-center flex flex-col justify-center items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{cls === 'aircraft' ? 'Máy bay' : cls === 'ship' ? 'Tàu thủy' : 'Xe cộ'}</span>
                    <strong className={`text-base font-bold mt-1 ${count > 0 ? countColor : 'text-slate-500'}`}>
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

            {activeJobId && (
              <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-semibold">Mã tác vụ (ID):</span>
                <span className="font-mono text-sky-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[170px]" title={activeJobId}>
                  {activeJobId}
                </span>
              </div>
            )}
          </div>

          {/* Detections Detail List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between w-full px-0.5 pb-2 border-b border-slate-800/40 gap-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate" title={`Danh sách vật thể (${detections.length})`}>
                Danh sách vật thể ({detections.length})
              </h4>
              <label className="flex items-center justify-end space-x-1.5 cursor-pointer select-none text-[10px] text-slate-450 font-bold hover:text-slate-200 transition-colors flex-shrink-0">
                <input 
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500/20 cursor-pointer accent-sky-500 flex-shrink-0"
                />
                <span>Nhãn & Tin cậy</span>
              </label>
            </div>
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
                          ? 'bg-blue-400' 
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
