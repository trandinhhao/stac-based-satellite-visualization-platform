import React, { useEffect, useState, useRef } from 'react';
import { 
  Hexagon, 
  Square, 
  Upload, 
  Download, 
  Trash2, 
  Maximize2, 
  Edit2, 
  Save, 
  X, 
  Loader2, 
  Info, 
  Circle
} from 'lucide-react';
import { useAOIStore, type AOI } from '../store/useAOIStore';

export default function AOIManagerPanel() {
  const {
    aois,
    selectedAOIId,
    selectedAOIIds,
    isDrawing,
    drawType,
    tempGeometry,
    editingAOIId,
    isLoading,
    error,
    showAllAOIs,
    fetchAOIs,
    selectAOI,
    createAOI,
    updateAOI,
    deleteAOI,
    importAOI,
    setDrawing,
    setDrawType,
    setTempGeometry,
    setEditingAOI,
    clearError,
    setShowAllAOIs
  } = useAOIStore();

  // Form states for creating a new AOI
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Form states for updating an AOI
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch AOIs on mount
  useEffect(() => {
    fetchAOIs();
  }, []);

  // Format Area for human reading
  const formatArea = (areaSqM: number) => {
    if (areaSqM >= 1000000) {
      return `${(areaSqM / 1000000).toFixed(2)} km²`;
    }
    return `${areaSqM.toFixed(0)} m²`;
  };

  // Format Perimeter for human reading
  const formatPerimeter = (perimM: number) => {
    if (perimM >= 1000) {
      return `${(perimM / 1000).toFixed(2)} km`;
    }
    return `${perimM.toFixed(0)} m`;
  };

  // Handle Draw triggers
  const startDrawPolygon = () => {
    setEditingAOI(null);
    setTempGeometry(null);
    setDrawing(true);
    setDrawType('polygon');
  };

  const startDrawRectangle = () => {
    setEditingAOI(null);
    setTempGeometry(null);
    setDrawing(true);
    setDrawType('rectangle');
  };

  const startDrawCircle = () => {
    setEditingAOI(null);
    setTempGeometry(null);
    setDrawing(true);
    setDrawType('circle');
  };

  const cancelDrawing = () => {
    setDrawing(false);
    setDrawType(null);
  };

  // Save Drawn AOI
  const handleSaveDrawn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempGeometry) return;
    if (!name.trim()) return;

    try {
      await createAOI(name.trim(), description.trim(), tempGeometry);
      // Reset form
      setName('');
      setDescription('');
      setTempGeometry(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle GeoJSON File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    try {
      await importAOI(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger File Dialog
  const triggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Export AOI as GeoJSON
  const handleExport = (aoi: AOI) => {
    const link = document.createElement('a');
    link.href = `/api/aois/${aoi.id}/export`;
    link.setAttribute('download', `aoi_${aoi.name.replace(/\s+/g, '_')}.geojson`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Start Inline Text Editing
  const startInlineEdit = (aoi: AOI) => {
    setInlineEditingId(aoi.id);
    setEditingName(aoi.name);
    setEditingDescription(aoi.description);
  };

  // Save Inline Text Edits
  const handleSaveInlineEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateAOI(id, { name: editingName.trim(), description: editingDescription.trim() });
      setInlineEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };



  // Toggle Edit Geometry and handle Save when exiting edit mode
  const toggleEditGeometry = async (aoi: AOI) => {
    if (editingAOIId === aoi.id) {
      // Ending edit mode: SAVE changes!
      if (tempGeometry) {
        if (!confirm('Bạn có chắc chắn muốn xác nhận chỉnh sửa hình học của vùng này?')) {
          return;
        }
        try {
          await updateAOI(aoi.id, { geometry: tempGeometry });
        } catch (err) {
          console.error('Lỗi khi cập nhật hình học AOI:', err);
        }
      }
      setEditingAOI(null);
      setTempGeometry(null);
    } else {
      // Starting edit mode
      setDrawing(false);
      setDrawType(null);
      setEditingAOI(aoi.id);
      setTempGeometry(aoi.geometry);
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Action Buttons (Drawing & Importing) */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={isDrawing && drawType === 'polygon' ? cancelDrawing : startDrawPolygon}
          className={`h-10 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center space-y-0.5 transition-all border cursor-pointer ${
            isDrawing && drawType === 'polygon'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
          }`}
          title={isDrawing && drawType === 'polygon' ? 'Hủy chế độ vẽ' : 'Vẽ đa giác tự do'}
        >
          <Hexagon className="w-3.5 h-3.5 text-sky-400" />
          <span>{isDrawing && drawType === 'polygon' ? 'Hủy Vẽ' : 'Đa giác'}</span>
        </button>

        <button
          type="button"
          onClick={isDrawing && drawType === 'rectangle' ? cancelDrawing : startDrawRectangle}
          className={`h-10 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center space-y-0.5 transition-all border cursor-pointer ${
            isDrawing && drawType === 'rectangle'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
          }`}
          title={isDrawing && drawType === 'rectangle' ? 'Hủy chế độ vẽ' : 'Vẽ hình chữ nhật'}
        >
          <Square className="w-3.5 h-3.5 text-sky-400" />
          <span>{isDrawing && drawType === 'rectangle' ? 'Hủy Vẽ' : 'Chữ nhật'}</span>
        </button>

        <button
          type="button"
          onClick={isDrawing && drawType === 'circle' ? cancelDrawing : startDrawCircle}
          className={`h-10 px-1 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center space-y-0.5 transition-all border cursor-pointer ${
            isDrawing && drawType === 'circle'
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
          }`}
          title={isDrawing && drawType === 'circle' ? 'Hủy chế độ vẽ' : 'Vẽ hình tròn bằng cách chọn tâm và kéo bán kính'}
        >
          <Circle className="w-3.5 h-3.5 text-sky-400" />
          <span>{isDrawing && drawType === 'circle' ? 'Hủy Vẽ' : 'Hình tròn'}</span>
        </button>
      </div>

      <button
        onClick={triggerImport}
        disabled={isLoading}
        className="w-full h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
        ) : (
          <Upload className="w-4 h-4 text-sky-400" />
        )}
        <span>Nhập vùng GeoJSON (.geojson)</span>
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,application/json,application/geo+json"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Error Message Alert */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start justify-between">
          <div className="flex space-x-2">
            <Info className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-300 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Save Shape Form (When a new shape has been drawn but not saved) */}
      {!editingAOIId && tempGeometry && (
        <form 
          onSubmit={handleSaveDrawn} 
          className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3.5 shadow-xl animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-center space-x-2 pb-1 border-b border-amber-500/20">
            <Hexagon className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-amber-300">Vùng đa giác mới được vẽ</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tên vùng quan tâm
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Sân bay Nội Bài, Khu vực Hà Đông..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 bg-slate-950/60 border border-slate-800/80 focus:border-amber-500/80 rounded-lg text-xs text-slate-200 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Mô tả chi tiết
              </label>
              <textarea
                placeholder="Theo dõi biến động, giám sát ngập lụt..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[50px] p-2 bg-slate-950/60 border border-slate-800/80 focus:border-amber-500/80 rounded-lg text-xs text-slate-200 outline-none resize-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 h-8 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center space-x-1 cursor-pointer transition-all"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Lưu AOI</span>
            </button>
            <button
              type="button"
              onClick={() => setTempGeometry(null)}
              className="px-3 h-8 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* AOI List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Danh sách vùng AOI ({aois.length})
          </span>
          <label className="flex items-center space-x-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllAOIs}
              onChange={(e) => setShowAllAOIs(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-sky-500/20 cursor-pointer"
            />
            <span className="text-[10px] font-bold text-slate-400">Hiện tất cả</span>
          </label>
        </div>

        {aois.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-slate-800/30 rounded-xl">
            {isLoading ? 'Đang tải danh sách AOI...' : 'Chưa có vùng AOI nào được tạo. Hãy bắt đầu vẽ hoặc tải tệp lên.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {aois.map((aoi) => {
              const isSelected = selectedAOIIds.includes(aoi.id);
              const isEditingText = inlineEditingId === aoi.id;
              
              return (
                <div
                  key={aoi.id}
                  onClick={() => !isEditingText && selectAOI(aoi.id)}
                  className={`w-full p-3 rounded-xl border transition-all duration-200 flex flex-col space-y-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg'
                      : 'bg-slate-950/20 border-slate-850 hover:bg-slate-800/10 hover:border-slate-800 text-slate-300'
                  }`}
                >
                  {/* Item Header / Inline Name Edit */}
                  <div className="flex items-start justify-between min-w-0">
                    {isEditingText ? (
                      <div className="flex-1 space-y-2 mr-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full h-8 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                        />
                        <textarea
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          className="w-full min-h-[40px] p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300 outline-none resize-none"
                        />
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleSaveInlineEdit(aoi.id)}
                            className="px-2.5 py-1 bg-sky-500 text-slate-950 text-[10px] font-bold rounded hover:bg-sky-400 cursor-pointer transition-all"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setInlineEditingId(null)}
                            className="px-2.5 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded hover:bg-slate-700 border border-slate-700 cursor-pointer transition-all"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold truncate text-slate-200">
                          {aoi.name}
                        </div>
                        {aoi.description && (
                          <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                            {aoi.description}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fast Action Icons (Only visible when primary selected) */}
                    {selectedAOIId === aoi.id && !isEditingText && (
                      <div className="flex items-center space-x-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {editingAOIId === aoi.id ? (
                          <>
                            <button
                              onClick={() => toggleEditGeometry(aoi)}
                              title="Lưu hình học"
                              className="p-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 animate-pulse rounded-lg cursor-pointer transition-all"
                            >
                              <Save className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingAOI(null);
                                setTempGeometry(null);
                              }}
                              title="Hủy chỉnh sửa"
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg text-red-400 hover:text-red-300 cursor-pointer transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startInlineEdit(aoi)}
                              title="Sửa tên / mô tả"
                              className="p-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleEditGeometry(aoi)}
                              title="Sửa hình học trên bản đồ"
                              className="p-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleExport(aoi)}
                              title="Xuất file GeoJSON"
                              className="p-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Bạn có chắc chắn muốn xóa vùng AOI "${aoi.name}"?`)) {
                                  await deleteAOI(aoi.id);
                                }
                              }}
                              title="Xóa vùng"
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-lg text-red-400 hover:text-red-300 cursor-pointer transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Area and Perimeter badges */}
                  <div className="flex items-center space-x-4 text-[10px] text-slate-400 font-semibold border-t border-slate-800/60 pt-2">
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-sky-400 rounded-full mr-1.5" />
                      Diện tích: <strong className="text-slate-300 ml-1">{formatArea(aoi.area)}</strong>
                    </span>
                    <span className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-sky-400 rounded-full mr-1.5" />
                      Chu vi: <strong className="text-slate-300 ml-1">{formatPerimeter(aoi.perimeter)}</strong>
                    </span>
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
