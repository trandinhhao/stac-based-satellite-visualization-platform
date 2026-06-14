import { useState } from 'react';
import { 
  Columns, 
  Layers, 
  Trash2, 
  Download, 
  Camera, 
  Calendar, 
  Cloud, 
  TrendingUp,
  Image as ImageIcon,
  Play,
  Loader2
} from 'lucide-react';
import { useCompareStore } from '../store/useCompareStore';
import { useSTACStore } from '../../../store/useSTACStore';
import { useAOIStore } from '../../../store/useAOIStore';
import { useJobStore } from '../../../store/useJobStore';

export default function ComparePanel() {
  const {
    imageA,
    imageB,
    compareMode,
    opacity,
    swipePosition,
    selectImageA,
    selectImageB,
    setCompareMode,
    setOpacity,
    setSwipePosition,
    clearComparison
  } = useCompareStore();

  const { searchResults } = useSTACStore();
  const { aois, selectedAOIId } = useAOIStore();
  const createJob = useJobStore((state) => state.createJob);
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  const handleCreateCompareJob = async () => {
    if (!imageA || !imageB) return;
    setIsCreatingJob(true);
    try {
      await createJob('comparison', selectedAOIId || null, {
        imageA: imageA.id,
        imageB: imageB.id
      });
      useAOIStore.getState().setActiveTab('jobs');
    } catch (err: any) {
      alert('Không thể tạo Job so sánh: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsCreatingJob(false);
    }
  };

  // Find active AOI
  const selectedAOI = aois.find((a) => selectedAOIId ? String(a.id).toLowerCase().trim() === String(selectedAOIId).toLowerCase().trim() : false);

  // Unit conversion helpers
  const formatArea = (areaSqM: number) => {
    if (areaSqM >= 1000000) {
      return `${(areaSqM / 1000000).toFixed(2)} km²`;
    }
    return `${(areaSqM / 10000).toFixed(1)} ha`;
  };

  // Date formatting helper
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate stats
  const dateDiffDays = () => {
    if (!imageA || !imageB) return null;
    const dateA = new Date(imageA.properties.datetime);
    const dateB = new Date(imageB.properties.datetime);
    const diffTime = Math.abs(dateB.getTime() - dateA.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const cloudDiff = () => {
    if (!imageA || !imageB) return null;
    const cloudA = imageA.properties['eo:cloud_cover'] ?? 0;
    const cloudB = imageB.properties['eo:cloud_cover'] ?? 0;
    const diff = cloudB - cloudA;
    return diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  };

  // Client-side JSON metadata export
  const handleExportJSON = () => {
    if (!imageA || !imageB) return;
    const exportData = {
      comparison: {
        mode: compareMode,
        timestamp: new Date().toISOString(),
        aoi: selectedAOI ? { name: selectedAOI.name, id: selectedAOI.id } : null,
      },
      imageA: {
        id: imageA.id,
        datetime: imageA.properties.datetime,
        cloud_cover: imageA.properties['eo:cloud_cover'],
        platform: imageA.properties.platform,
        collection: imageA.collection,
        bbox: imageA.bbox
      },
      imageB: {
        id: imageB.id,
        datetime: imageB.properties.datetime,
        cloud_cover: imageB.properties['eo:cloud_cover'],
        platform: imageB.properties.platform,
        collection: imageB.collection,
        bbox: imageB.bbox
      }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comparison_${imageA.id}_vs_${imageB.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger viewport snapshot event
  const handleCaptureViewport = () => {
    window.dispatchEvent(new CustomEvent('capture-comparison-view'));
  };

  // Sort search results chronologically for the timeline
  const timelineItems = [...searchResults].sort(
    (a, b) => new Date(a.properties.datetime).getTime() - new Date(b.properties.datetime).getTime()
  );

  return (
    <div className="space-y-4 text-slate-200">
      {/* 1. Comparison Selectors */}
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
          Ảnh vệ tinh đối chiếu
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {/* Card Image A */}
          <div className={`p-3 rounded-xl border flex flex-col space-y-2 relative transition-all ${
            imageA 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
              : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
          }`}>
            <span className="text-[9px] font-bold uppercase text-emerald-400 px-1 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded w-max">
              Ảnh A (T1)
            </span>
            {imageA ? (
              <div className="space-y-1 min-w-0">
                <div className="text-[11px] font-bold truncate text-slate-200" title={imageA.id}>
                  {imageA.id}
                </div>
                <div className="text-[9px] text-slate-400 flex items-center space-x-1.5 font-medium">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>{formatDate(imageA.properties.datetime)}</span>
                </div>
                {imageA.properties['eo:cloud_cover'] !== undefined && (
                  <div className="text-[9px] text-slate-400 flex items-center space-x-1.5 font-medium">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>{imageA.properties['eo:cloud_cover']}% mây</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => selectImageA(null)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="py-2.5 text-center text-[10px] italic text-slate-600 font-medium leading-relaxed">
                Chưa chọn. Nhấp ảnh ở tab STAC và click "Chọn Ảnh A"
              </div>
            )}
          </div>

          {/* Card Image B */}
          <div className={`p-3 rounded-xl border flex flex-col space-y-2 relative transition-all ${
            imageB 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
              : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
          }`}>
            <span className="text-[9px] font-bold uppercase text-emerald-400 px-1 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded w-max">
              Ảnh B (T2)
            </span>
            {imageB ? (
              <div className="space-y-1 min-w-0">
                <div className="text-[11px] font-bold truncate text-slate-200" title={imageB.id}>
                  {imageB.id}
                </div>
                <div className="text-[9px] text-slate-400 flex items-center space-x-1.5 font-medium">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>{formatDate(imageB.properties.datetime)}</span>
                </div>
                {imageB.properties['eo:cloud_cover'] !== undefined && (
                  <div className="text-[9px] text-slate-400 flex items-center space-x-1.5 font-medium">
                    <Cloud className="w-3 h-3 text-emerald-400" />
                    <span>{imageB.properties['eo:cloud_cover']}% mây</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => selectImageB(null)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="py-2.5 text-center text-[10px] italic text-slate-600 font-medium leading-relaxed">
                Chưa chọn. Nhấp ảnh ở tab STAC và click "Chọn Ảnh B"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Mode selectors */}
      {imageA && imageB && (
        <div className="space-y-2 animate-in slide-in-from-top duration-250">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">
            Chế độ so sánh (Comparison Mode)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setCompareMode(compareMode === 'side-by-side' ? 'none' : 'side-by-side')}
              className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-0.5 transition-all border cursor-pointer ${
                compareMode === 'side-by-side'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
              }`}
            >
              <Columns className="w-4 h-4 text-emerald-400" />
              <span>Bản đồ Song song</span>
            </button>

            <button
              onClick={() => setCompareMode(compareMode === 'swipe' ? 'none' : 'swipe')}
              className={`h-11 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-0.5 transition-all border cursor-pointer ${
                compareMode === 'swipe'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Thanh trượt (Swipe)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Slider Controls for Opacity / Swipe Position */}
      {compareMode === 'swipe' && (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3 animate-in fade-in duration-200">
          {/* Swipe Slider Control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase px-0.5">
              <span>Vị trí trượt chia đôi</span>
              <span className="font-mono text-emerald-400 font-black">{swipePosition}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={swipePosition}
              onChange={(e) => setSwipePosition(Number(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none"
            />
          </div>

          {/* Opacity Slider Control */}
          <div className="space-y-1.5 border-t border-slate-800/60 pt-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase px-0.5">
              <span>Độ đục lớp trên (Ảnh B)</span>
              <span className="font-mono text-emerald-400 font-black">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(opacity * 100)}
              onChange={(e) => setOpacity(Number(e.target.value) / 100)}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* 4. Difference Statistics & AOI Summary */}
      {imageA && imageB && (
        <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl space-y-3 shadow-inner animate-in slide-in-from-bottom-2 duration-250">
          <div className="flex items-center space-x-1.5 pb-1.5 border-b border-slate-800/60 text-slate-300">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold">Thống kê chênh lệch</h4>
          </div>
          
          <div className="space-y-2 text-[10px] font-semibold text-slate-400">
            {selectedAOI && (
              <div className="grid grid-cols-3 gap-1">
                <span>Vùng AOI:</span>
                <span className="col-span-2 text-slate-200">{selectedAOI.name}</span>
              </div>
            )}
            {selectedAOI && (
              <div className="grid grid-cols-3 gap-1">
                <span>Diện tích AOI:</span>
                <span className="col-span-2 text-slate-200">{formatArea(selectedAOI.area)}</span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-1">
              <span>Thời gian trôi qua:</span>
              <span className="col-span-2 text-slate-200 font-bold">
                {dateDiffDays()} ngày (~{(dateDiffDays()! / 365).toFixed(1)} năm)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span>Chênh lệch độ mây:</span>
              <span className={`col-span-2 font-bold ${
                parseFloat(cloudDiff()!) > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {cloudDiff()}
              </span>
            </div>
          </div>

          {/* Export & Actions */}
          <div className="pt-2 border-t border-slate-800/60 flex flex-col space-y-2">
            <button
              onClick={handleCreateCompareJob}
              disabled={isCreatingJob}
              className="w-full h-8.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 text-[10px] font-black rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-md"
            >
              {isCreatingJob ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>TẠO PHÂN TÍCH NỀN (GENERATE ANALYSIS)</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCaptureViewport}
                disabled={compareMode === 'none'}
                className="flex-1 h-8 bg-slate-900 hover:bg-slate-850 border border-slate-800 disabled:opacity-50 text-slate-300 text-[10px] font-bold rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-sm"
                title="Chụp màn hình so sánh bản đồ hiện tại"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Chụp ảnh màn hình</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="h-8 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1 transition-all cursor-pointer"
                title="Tải siêu dữ liệu đối chiếu JSON"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>JSON</span>
              </button>

              <button
                onClick={clearComparison}
                className="h-8 px-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-[10px] font-bold text-red-400 hover:text-red-300 transition-all cursor-pointer"
                title="Hủy đối chiếu"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Timeline (Chronological search results sequence) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Dòng thời gian (Timeline)
          </span>
        </div>

        {timelineItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-slate-800/30 rounded-xl">
            Tìm kiếm ảnh vệ tinh tại tab STAC trước để khởi tạo dòng thời gian.
          </div>
        ) : (
          <div className="relative border-l border-slate-800 ml-2.5 pl-4 py-1 space-y-4 max-h-56 overflow-y-auto pr-1">
            {timelineItems.map((item) => {
              const isA = imageA?.id === item.id;
              const isB = imageB?.id === item.id;
              const cloudCover = item.properties['eo:cloud_cover'] ?? 0;
              const thumbUrl = item.assets.thumbnail?.href || '';

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline point indicator */}
                  <span className={`absolute -left-[22.5px] top-1 w-3 h-3 rounded-full border-2 transition-all ${
                    isA 
                      ? 'bg-emerald-500 border-white scale-125'
                      : isB 
                      ? 'bg-emerald-400 border-white scale-125 animate-pulse'
                      : 'bg-slate-950 border-slate-700 group-hover:border-slate-500'
                  }`} />

                  {/* Thumbnail / Info Card */}
                  <div className={`p-2.5 rounded-lg border transition-all flex items-start space-x-2.5 ${
                    isA 
                      ? 'bg-emerald-500/10 border-emerald-500/50'
                      : isB 
                      ? 'bg-emerald-400/15 border-emerald-400/40'
                      : 'bg-slate-950/20 border-slate-850 hover:bg-slate-800/10'
                  }`}>
                    {/* Tiny thumbnail */}
                    <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="Thumb" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-750" />
                      )}
                    </div>
                    {/* Tiny info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-slate-200 truncate font-mono">
                        {item.id}
                      </div>
                      <div className="text-[9px] text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="font-semibold text-slate-300">{formatDate(item.properties.datetime)}</span>
                        <span>•</span>
                        <span>{cloudCover}% mây</span>
                      </div>
                    </div>
                    
                    {/* Mini Quick Set Actions */}
                    <div className="flex flex-col space-y-1 flex-shrink-0">
                      <button
                        onClick={() => selectImageA(isA ? null : item)}
                        className={`px-1.5 py-0.5 text-[8px] font-black rounded border transition-all cursor-pointer ${
                          isA 
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        T1
                      </button>
                      <button
                        onClick={() => selectImageB(isB ? null : item)}
                        className={`px-1.5 py-0.5 text-[8px] font-black rounded border transition-all cursor-pointer ${
                          isB 
                            ? 'bg-emerald-400 text-slate-950 border-emerald-350' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        T2
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Reuse X icon
function X({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
