import { useState, useEffect } from 'react';
import { 
  Ruler, 
  Hexagon, 
  X,
  Edit2
} from 'lucide-react';
import * as turf from '@turf/turf';
import { useMeasurementStore } from '../store/useMeasurementStore';
import { useAOIStore } from '../store/useAOIStore';

export default function MeasurementPanel() {
  const {
    isMeasuring,
    measureType,
    history,
    startMeasuring,
    stopMeasuring,
    deleteMeasurement,
    updateMeasurementName,
    setHoveredMeasurementId,
  } = useMeasurementStore();

  const isDrawerOpen = useAOIStore(state => state.isDrawerOpen);

  // Auto-activate distance mode on mount or when the drawer is re-opened
  useEffect(() => {
    if (isDrawerOpen && !isMeasuring) {
      startMeasuring('distance');
    }
  }, [isDrawerOpen, isMeasuring, startMeasuring]);

  // Clean up measurements on unmount
  useEffect(() => {
    return () => {
      stopMeasuring();
    };
  }, [stopMeasuring]);



  // Editing state for measurement names
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      updateMeasurementName(id, editingName.trim());
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Unit conversion helpers
  const formatDistance = (meters: any) => {
    const val = parseFloat(meters);
    if (isNaN(val)) return '0.0 m';
    if (val >= 1000) {
      return `${(val / 1000).toFixed(3)} km`;
    }
    return `${val.toFixed(1)} m`;
  };

  const formatArea = (sqMeters: any) => {
    const val = parseFloat(sqMeters);
    if (isNaN(val)) return '0.0 m²';
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(4)} km²`;
    }
    return `${val.toFixed(1)} m²`;
  };

  const getSegments = (coordinates: any, type: 'distance' | 'area', isDrawing?: boolean) => {
    const segments: { label: string; length: number }[] = [];
    
    if (type === 'area') {
      const coords = coordinates[0];
      if (!coords || coords.length < 4) return segments;
      
      const limit = coords.length - 1;
      for (let i = 0; i < limit; i++) {
        const pt1 = coords[i];
        const pt2 = coords[i + 1];
        if (!pt1 || !pt2) continue;
        const distInKm = turf.distance(pt1, pt2, { units: 'kilometers' });
        
        let label = '';
        if (i === limit - 1) {
          label = `Đoạn ${i + 1} - 1`;
        } else {
          label = `Đoạn ${i + 1} - ${i + 2}`;
        }
        
        segments.push({
          label,
          length: distInKm * 1000,
        });
      }
    } else {
      const coords = coordinates;
      if (!coords || coords.length < 2) return segments;
      
      const limit = isDrawing ? coords.length - 2 : coords.length - 1;
      for (let i = 0; i < limit; i++) {
        const pt1 = coords[i];
        const pt2 = coords[i + 1];
        if (!pt1 || !pt2) continue;
        const distInKm = turf.distance(pt1, pt2, { units: 'kilometers' });
        segments.push({
          label: `Đoạn ${i + 1} - ${i + 2}`,
          length: distInKm * 1000,
        });
      }
    }
    return segments;
  };

  return (
    <div className="space-y-4 text-slate-200">
      <div className="space-y-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">
          ĐO ĐẠC
        </div>
        {/* Mode selectors */}
        <div className="flex bg-slate-950/60 p-1 border border-slate-800/80 rounded-xl">
          <button
            onClick={() => {
              startMeasuring('distance');
            }}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              isMeasuring && measureType === 'distance'
                ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Khoảng cách</span>
          </button>

          <button
            onClick={() => {
              startMeasuring('area');
            }}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              isMeasuring && measureType === 'area'
                ? 'bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Hexagon className="w-3.5 h-3.5" />
            <span>Diện tích</span>
          </button>
        </div>
      </div>


      {/* Completed Measurements List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800/60 pb-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">
            DANH SÁCH KẾT QUẢ
          </span>
          {history.length > 0 && (
            <button
              onClick={() => useMeasurementStore.getState().clearHistory()}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {history.length > 0 ? (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 select-none custom-scrollbar">
            {history.map((m) => (
              <div 
                key={m.id}
                onMouseEnter={() => setHoveredMeasurementId(m.id)}
                onMouseLeave={() => setHoveredMeasurementId(null)}
                className="p-3 bg-slate-950/40 border border-slate-950/0 hover:border-white/40 rounded-xl space-y-2 transition-all relative group animate-in slide-in-from-top-4 duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 flex-1 min-w-0 mr-2">
                    {m.type === 'distance' ? (
                      <Ruler className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    ) : (
                      <Hexagon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    )}
                    {editingId === m.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveEdit(m.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(m.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                        className="bg-slate-900 text-white text-[11px] font-bold px-1.5 py-0.5 rounded border border-sky-500 focus:outline-none w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center space-x-1.5 min-w-0 group/name">
                        <span 
                          className="text-[11px] font-bold text-slate-300 truncate cursor-pointer hover:text-sky-400 transition-colors" 
                          title="Nhấp để đổi tên phép đo"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(m.id, m.name);
                          }}
                        >
                          {m.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(m.id, m.name);
                          }}
                          className="text-slate-400 hover:text-sky-400 p-0.5 transition-colors cursor-pointer shrink-0"
                          title="Đổi tên phép đo"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {editingId !== m.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMeasurement(m.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                      title="Xóa kết quả đo này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-baseline justify-between text-xs font-semibold text-white">
                  <span className="text-slate-400 text-[10px]">
                    {m.type === 'distance' ? 'Khoảng cách:' : 'Diện tích:'}
                  </span>
                  <span className="text-sky-400 font-bold text-sm">
                    {m.type === 'distance' ? formatDistance(m.value) : formatArea(m.value)}
                  </span>
                </div>

                {/* Segments list for completed distance or area */}
                <div className="mt-1.5 border-t border-slate-900/60 pt-1.5 space-y-1">
                  <div className="space-y-0.5 max-h-[80px] overflow-y-auto pr-0.5 custom-scrollbar">
                    {getSegments(m.geometry?.coordinates || [], m.type, m.isDrawing).map((seg, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-900/30 last:border-0">
                        <span className="text-slate-500">{seg.label}:</span>
                        <span className="text-slate-300 font-medium">{formatDistance(seg.length)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {m.type === 'area' && m.perimeter !== undefined && (
                  <div className="flex items-baseline justify-between text-[10px] font-medium text-slate-400 border-t border-slate-900/40 pt-1.5">
                    <span>Chu vi:</span>
                    <span className="text-slate-300 font-semibold">{formatDistance(m.perimeter)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-[10px] text-slate-500 italic bg-slate-950/20 border border-dashed border-slate-800/40 rounded-xl select-none">
            Chưa có kết quả đo đạc nào
          </div>
        )}
      </div>
    </div>
  );
}
