import { useState } from 'react';
import { 
  Ruler, 
  Hexagon, 
  X,
  Edit2
} from 'lucide-react';
import * as turf from '@turf/turf';
import { useMeasurementStore } from '../store/useMeasurementStore';

export default function MeasurementPanel() {
  const {
    isMeasuring,
    measureType,
    currentMeasurement,
    history,
    startMeasuring,
    stopMeasuring,
    deleteMeasurement,
    updateMeasurementName,
    setHoveredMeasurementId,
  } = useMeasurementStore();

  // Selected units
  const [areaUnit, setAreaUnit] = useState<'m2' | 'km2' | 'ha'>('ha');

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

  const formatArea = (sqMeters: any, unit: 'm2' | 'km2' | 'ha') => {
    const val = parseFloat(sqMeters);
    if (isNaN(val)) return '0.0 ha';
    if (unit === 'km2') {
      return `${(val / 1000000).toFixed(4)} km²`;
    }
    if (unit === 'ha') {
      return `${(val / 10000).toFixed(2)} ha`;
    }
    return `${val.toFixed(1)} m²`;
  };

  const getSegments = (coordinates: [number, number][], isDrawing?: boolean) => {
    const segments: { label: string; length: number }[] = [];
    const limit = isDrawing ? coordinates.length - 2 : coordinates.length - 1;
    for (let i = 0; i < limit; i++) {
      const pt1 = coordinates[i];
      const pt2 = coordinates[i + 1];
      const distInKm = turf.distance(pt1, pt2, { units: 'kilometers' });
      segments.push({
        label: `Đoạn ${i + 1} - ${i + 2}`,
        length: distInKm * 1000,
      });
    }
    return segments;
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Mode selectors */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            if (isMeasuring && measureType === 'distance') {
              stopMeasuring();
            } else {
              startMeasuring('distance');
            }
          }}
          className={`h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all border cursor-pointer ${
            isMeasuring && measureType === 'distance'
              ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-md'
              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
          }`}
        >
          <Ruler className="w-4 h-4 text-sky-400" />
          <span>{isMeasuring && measureType === 'distance' ? 'Hủy đo' : 'Đo Khoảng cách'}</span>
        </button>

        <button
          onClick={() => {
            if (isMeasuring && measureType === 'area') {
              stopMeasuring();
            } else {
              startMeasuring('area');
            }
          }}
          className={`h-12 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all border cursor-pointer ${
            isMeasuring && measureType === 'area'
              ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-md'
              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
          }`}
        >
          <Hexagon className="w-4 h-4 text-sky-400" />
          <span>{isMeasuring && measureType === 'area' ? 'Hủy đo' : 'Đo Diện tích'}</span>
        </button>
      </div>

      {currentMeasurement && (
        <div
          className="p-3.5 bg-sky-500/10 border border-sky-500/30 rounded-xl space-y-3.5 shadow-xl animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center justify-between pb-1 border-b border-sky-500/20">
            <div className="flex items-center space-x-2">
              {currentMeasurement.type === 'distance' ? (
                <Ruler className="w-4 h-4 text-sky-400 animate-pulse" />
              ) : (
                <Hexagon className="w-4 h-4 text-sky-400 animate-pulse" />
              )}
              <h4 className="text-xs font-bold text-sky-300">
                {currentMeasurement.type === 'distance' ? 'Đang đo khoảng cách...' : 'Đang đo diện tích...'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => stopMeasuring()}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3.5 space-y-2 text-xs">
            {currentMeasurement.type === 'distance' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-bold text-white border-b border-slate-800/40 pb-1.5 mb-1.5">
                  <span className="text-slate-400">Tổng khoảng cách:</span>
                  <span className="text-sm text-sky-400">
                    {formatDistance(currentMeasurement.value)}
                  </span>
                </div>
                {/* List of individual segments */}
                <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 select-none custom-scrollbar">
                  {getSegments(currentMeasurement.geometry?.coordinates || [], currentMeasurement.isDrawing).map((seg, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-900/50 last:border-0">
                      <span className="text-slate-500 font-medium">{seg.label}:</span>
                      <span className="text-slate-300 font-semibold">{formatDistance(seg.length)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Diện tích:</span>
                  <div className="flex items-center space-x-1.5 font-bold text-white">
                    <span className="text-sm text-sky-400">
                      {formatArea(currentMeasurement.value, areaUnit)}
                    </span>
                    <select
                      value={areaUnit}
                      onChange={(e) => setAreaUnit(e.target.value as 'm2' | 'km2' | 'ha')}
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none"
                    >
                      <option value="ha">ha</option>
                      <option value="km2">km²</option>
                      <option value="m2">m²</option>
                    </select>
                  </div>
                </div>
                {currentMeasurement.perimeter !== undefined && (
                  <div className="flex items-center justify-between border-t border-slate-800/40 pt-1.5">
                    <span className="text-slate-400">Chu vi:</span>
                    <span className="text-sm font-bold text-slate-300">
                      {formatDistance(currentMeasurement.perimeter)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completed Measurements List */}
      {history.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800/60 pb-1.5">
            <span>Danh sách kết quả ({history.length})</span>
            <button
              onClick={() => useMeasurementStore.getState().clearHistory()}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
            >
              Xóa tất cả
            </button>
          </div>

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
                  <span className="text-slate-400 text-[10px]">Tổng cộng:</span>
                  <span className="text-sky-400 font-bold text-sm">
                    {m.type === 'distance' ? formatDistance(m.value) : formatArea(m.value, areaUnit)}
                  </span>
                </div>

                {m.type === 'area' && m.perimeter !== undefined && (
                  <div className="flex items-baseline justify-between text-[10px] font-medium text-slate-400 border-t border-slate-900/40 pt-1">
                    <span>Chu vi:</span>
                    <span className="text-slate-300 font-semibold">{formatDistance(m.perimeter)}</span>
                  </div>
                )}

                {/* Segments list for completed distance */}
                {m.type === 'distance' && (
                  <div className="mt-1.5 border-t border-slate-900/60 pt-1.5 space-y-1">
                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Các đoạn thẳng:</div>
                    <div className="space-y-0.5 max-h-[80px] overflow-y-auto pr-0.5 custom-scrollbar">
                      {getSegments(m.geometry?.coordinates || [], m.isDrawing).map((seg, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] py-0.5 border-b border-slate-900/30 last:border-0">
                          <span className="text-slate-500">{seg.label}:</span>
                          <span className="text-slate-300 font-medium">{formatDistance(seg.length)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
