import React, { useState } from 'react';
import { 
  Ruler, 
  Hexagon, 
  Save, 
  X, 
  Download, 
  Trash2, 
  Maximize2, 
  Info 
} from 'lucide-react';
import { useMeasurementStore, type Measurement } from '../store/useMeasurementStore';
import { useMapStore } from '../store/useMapStore';

export default function MeasurementPanel() {
  const {
    isMeasuring,
    measureType,
    currentMeasurement,
    history,
    startMeasuring,
    stopMeasuring,
    saveCurrentMeasurement,
    deleteMeasurement,
    clearHistory
  } = useMeasurementStore();

  const { setCenter, setZoom } = useMapStore();

  // Form input name
  const [name, setName] = useState('');
  
  // Selected units
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'km'>('km');
  const [areaUnit, setAreaUnit] = useState<'m2' | 'km2' | 'ha'>('ha');



  // Unit conversion helpers
  const formatDistance = (meters: number, unit: 'm' | 'km') => {
    if (unit === 'km') {
      return `${(meters / 1000).toFixed(3)} km`;
    }
    return `${meters.toFixed(1)} m`;
  };

  const formatArea = (sqMeters: number, unit: 'm2' | 'km2' | 'ha') => {
    if (unit === 'km2') {
      return `${(sqMeters / 1000000).toFixed(4)} km²`;
    }
    if (unit === 'ha') {
      return `${(sqMeters / 10000).toFixed(2)} ha`;
    }
    return `${sqMeters.toFixed(1)} m²`;
  };

  // Zoom to measurement geometry
  const handleZoomTo = (item: Measurement) => {
    if (!item.geometry || !item.geometry.coordinates) return;

    let coords: number[][] = [];
    if (item.type === 'distance') {
      coords = item.geometry.coordinates;
    } else {
      coords = item.geometry.coordinates[0];
    }

    if (coords.length > 0) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      coords.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      });

      if (minLng !== Infinity) {
        // Calculate center
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;
        
        // Approximate zoom level
        const dLng = maxLng - minLng;
        const dLat = maxLat - minLat;
        const maxDelta = Math.max(dLng, dLat);
        let zoom = 12;
        if (maxDelta > 0.5) zoom = 9;
        else if (maxDelta > 0.1) zoom = 11;
        else if (maxDelta > 0.01) zoom = 14;
        else if (maxDelta > 0.001) zoom = 16;

        setCenter([centerLng, centerLat]);
        setZoom(zoom);
      }
    }
  };

  // Client-side export GeoJSON
  const handleExportGeoJSON = (item: Measurement, e: React.MouseEvent) => {
    e.stopPropagation();
    const feature = {
      type: 'Feature',
      geometry: item.geometry,
      properties: {
        name: item.name,
        type: item.type,
        value: item.value,
        perimeter: item.perimeter,
        created_at: item.created_at
      }
    };
    const blob = new Blob([JSON.stringify(feature, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `measurement_${item.name.replace(/\s+/g, '_')}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Client-side export CSV
  const handleExportCSV = (item: Measurement, e: React.MouseEvent) => {
    e.stopPropagation();
    const headers = ['Tên', 'Loại', 'Giá trị', 'Đơn vị', 'Chu vi (m)', 'Ngày tạo'];
    const row = [
      `"${item.name.replace(/"/g, '""')}"`,
      item.type === 'distance' ? 'Khoảng cách' : 'Diện tích',
      item.value,
      item.type === 'distance' ? 'm' : 'm2',
      item.perimeter || '',
      item.created_at
    ];
    const csvContent = '\uFEFF' + [headers.join(','), row.join(',')].join('\n'); // Add BOM for Excel UTF-8 support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `measurement_${item.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveCurrentMeasurement(name.trim());
    setName('');
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
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md'
              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
          }`}
        >
          <Ruler className="w-4 h-4 text-emerald-400" />
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
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md'
              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
          }`}
        >
          <Hexagon className="w-4 h-4 text-emerald-400" />
          <span>{isMeasuring && measureType === 'area' ? 'Hủy đo' : 'Đo Diện tích'}</span>
        </button>
      </div>

      {/* Instructions when drawing */}
      {isMeasuring && !currentMeasurement && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start space-x-2.5 animate-pulse">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-300 leading-normal">
            {measureType === 'distance' ? (
              <p>Nhấp chuột trên bản đồ để bắt đầu vẽ tuyến đường cần đo. Nhấp đúp chuột để kết thúc vẽ.</p>
            ) : (
              <p>Nhấp chuột trên bản đồ để xác định các đỉnh của đa giác cần đo. Nhấp đúp chuột để đóng vùng đa giác.</p>
            )}
            <p className="mt-1 text-slate-400">Ấn <span className="font-mono bg-slate-900 px-1 py-0.5 rounded">Esc</span> hoặc Click chuột phải để hủy vẽ.</p>
          </div>
        </div>
      )}

      {/* Active Measurement / Save Form */}
      {currentMeasurement && (
        <form
          onSubmit={handleSave}
          className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3.5 shadow-xl animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center justify-between pb-1 border-b border-emerald-500/20">
            <div className="flex items-center space-x-2">
              {currentMeasurement.type === 'distance' ? (
                <Ruler className="w-4 h-4 text-emerald-400" />
              ) : (
                <Hexagon className="w-4 h-4 text-emerald-400" />
              )}
              <h4 className="text-xs font-bold text-emerald-300">
                {currentMeasurement.type === 'distance' ? 'Kết quả đo khoảng cách' : 'Kết quả đo diện tích'}
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

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 space-y-2 text-xs">
            {currentMeasurement.type === 'distance' ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tổng khoảng cách:</span>
                <div className="flex items-center space-x-1.5 font-bold text-white">
                  <span className="text-sm text-emerald-400">
                    {formatDistance(currentMeasurement.value, distanceUnit)}
                  </span>
                  <select
                    value={distanceUnit}
                    onChange={(e) => setDistanceUnit(e.target.value as 'm' | 'km')}
                    className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none"
                  >
                    <option value="km">km</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Diện tích:</span>
                  <div className="flex items-center space-x-1.5 font-bold text-white">
                    <span className="text-sm text-emerald-400">
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
                    <div className="flex items-center space-x-1.5 font-bold text-white">
                      <span className="text-slate-300">
                        {formatDistance(currentMeasurement.perimeter, distanceUnit)}
                      </span>
                      <select
                        value={distanceUnit}
                        onChange={(e) => setDistanceUnit(e.target.value as 'm' | 'km')}
                        className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 outline-none"
                      >
                        <option value="km">km</option>
                        <option value="m">m</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Tên phép đo để lưu
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Khoảng cách đê sông Hồng, Vùng hồ Tây..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800/80 focus:border-emerald-500/80 rounded-lg text-xs text-slate-200 outline-none transition-all"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 h-8 bg-emerald-500 hover:bg-emerald-450 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center space-x-1 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu lịch sử</span>
            </button>
            <button
              type="button"
              onClick={() => stopMeasuring()}
              className="px-3 h-8 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* History List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Lịch sử đo đạc ({history.length})
          </span>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử đo đạc?')) {
                  clearHistory();
                }
              }}
              className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-all cursor-pointer"
            >
              Xóa sạch
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-slate-800/30 rounded-xl">
            Chưa có dữ liệu đo đạc nào. Hãy chọn công cụ phía trên và thực hiện đo trên bản đồ.
          </div>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleZoomTo(item)}
                className="w-full p-3 bg-slate-950/20 border border-slate-850 hover:bg-slate-800/10 hover:border-slate-800 rounded-xl text-slate-300 flex flex-col space-y-2 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between min-w-0">
                  <div className="flex items-start space-x-2 min-w-0">
                    <div className="p-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 flex-shrink-0 mt-0.5">
                      {item.type === 'distance' ? (
                        <Ruler className="w-3.5 h-3.5" />
                      ) : (
                        <Hexagon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 truncate pr-1">
                        {item.name}
                      </div>
                      <span className="text-[9px] text-slate-500 font-medium">
                        {new Date(item.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleZoomTo(item)}
                      title="Zoom đến đối tượng"
                      className="p-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <button
                      onClick={(e) => handleExportGeoJSON(item, e)}
                      title="Xuất file GeoJSON"
                      className="p-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                    </button>

                    <button
                      onClick={(e) => handleExportCSV(item, e)}
                      title="Xuất file CSV"
                      className="p-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all flex items-center justify-center text-[10px] font-bold"
                    >
                      CSV
                    </button>

                    <button
                      onClick={() => deleteMeasurement(item.id)}
                      title="Xóa kết quả"
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg text-red-400 hover:text-red-300 cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Values Display */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400 font-semibold border-t border-slate-800/60 pt-2">
                  {item.type === 'distance' ? (
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5" />
                      Khoảng cách: <strong className="text-slate-200 ml-1">{formatDistance(item.value, distanceUnit)}</strong>
                    </span>
                  ) : (
                    <>
                      <span className="flex items-center">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5" />
                        Diện tích: <strong className="text-slate-200 ml-1">{formatArea(item.value, areaUnit)}</strong>
                      </span>
                      {item.perimeter !== undefined && (
                        <span className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5" />
                          Chu vi: <strong className="text-slate-200 ml-1">{formatDistance(item.perimeter, distanceUnit)}</strong>
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
