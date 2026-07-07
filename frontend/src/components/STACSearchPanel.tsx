import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Search, 
  Info, 
  Cloud, 
  Cpu, 
  ArrowRight, 
  Eye, 
  RefreshCw,
  Hexagon,
  Square,
  Circle,
  Trash2,
  Edit,
  Save,
  Calendar,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useSTACStore } from '../store/useSTACStore';
import type { STACCollection, STACItem } from '../store/useSTACStore';
import { useAOIStore } from '../store/useAOIStore';
import { api } from '../services/api';

const COLLECTION_ORDER = [
  'sentinel-2-l2a',
  'sentinel-1-grd',
  'landsat-8-c2-l2',
  'landsat-9-c2-l2',
  'PSScene'
];

const getPreviewUrl = (item: STACItem) => {
  const thumb = item.assets.thumbnail?.href;
  if (thumb) {
    if (thumb.startsWith('http') || thumb.startsWith('/cog/')) {
      return thumb;
    }
  }
  const visual = item.assets.visual?.href || '';
  return `/cog/preview.png?url=${encodeURIComponent(visual)}`;
};

export default function STACSearchPanel() {
  const {
    collections,
    searchResults,
    selectedItem,
    selectedSTACItems,
    filters,
    stacTempGeometry,
    isDrawingSTAC,
    drawTypeSTAC,
    isEditingSTAC,
    setCollections,
    setSearchResults,
    setSelectedItem,
    setSelectedSTACItems,
    setFilters,
    setStacTempGeometry,
    setIsDrawingSTAC,
    setDrawTypeSTAC,
    setIsEditingSTAC
  } = useSTACStore();

  const selectedAOIIds = useAOIStore((state) => state.selectedAOIIds);
  const aois = useAOIStore((state) => state.aois);
  const selectAOI = useAOIStore((state) => state.selectAOI);
  const fetchAOIs = useAOIStore((state) => state.fetchAOIs);
  const isDrawerOpen = useAOIStore((state) => state.isDrawerOpen);

  useEffect(() => {
    if (isDrawerOpen) {
      fetchAOIs();
    }
  }, [isDrawerOpen, fetchAOIs]);

  const [spatialScope, setSpatialScope] = useState<'draw' | 'aoi'>('draw');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  const activeSearchAOIs = aois.filter(aoi => selectedAOIIds.includes(aoi.id));

  // Programmatic calendar toggle states & refs to fix reopen on click issue
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const handleStartToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isStartOpen) {
      startInputRef.current?.blur();
      setIsStartOpen(false);
    } else {
      startInputRef.current?.showPicker();
      setIsStartOpen(true);
    }
  };

  const handleEndToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isEndOpen) {
      endInputRef.current?.blur();
      setIsEndOpen(false);
    } else {
      endInputRef.current?.showPicker();
      setIsEndOpen(true);
    }
  };

  // Sync spatial scope selection when selected AOI updates
  useEffect(() => {
    if (selectedAOIIds.length > 0) {
      setSpatialScope('aoi');
    }
  }, [selectedAOIIds]);

  // Reset STAC temp geometry when switching away from 'draw' to 'aoi'
  useEffect(() => {
    if (spatialScope === 'aoi') {
      clearDrawnArea();
    }
  }, [spatialScope]);

  // Cleanup drawn geometry when drawer is closed
  useEffect(() => {
    if (!isDrawerOpen) {
      clearDrawnArea();
    }
  }, [isDrawerOpen]);

  // Cleanup when tab switches (component unmounts)
  useEffect(() => {
    return () => {
      useSTACStore.getState().setStacTempGeometry(null);
      useSTACStore.getState().setIsDrawingSTAC(false);
      useSTACStore.getState().setDrawTypeSTAC(null);
      useSTACStore.getState().setIsEditingSTAC(false);
      useSTACStore.getState().setSearchResults([]);
      useSTACStore.getState().setSelectedItem(null);
      useSTACStore.getState().setSelectedSTACItems([]);
    };
  }, []);

  // STAC Draw Triggers
  const startDrawPolygon = () => {
    setStacTempGeometry(null);
    setIsDrawingSTAC(true);
    setDrawTypeSTAC('polygon');
    setIsEditingSTAC(false);
  };

  const startDrawRectangle = () => {
    setStacTempGeometry(null);
    setIsDrawingSTAC(true);
    setDrawTypeSTAC('rectangle');
    setIsEditingSTAC(false);
  };

  const startDrawCircle = () => {
    setStacTempGeometry(null);
    setIsDrawingSTAC(true);
    setDrawTypeSTAC('circle');
    setIsEditingSTAC(false);
  };

  const cancelDrawing = () => {
    setIsDrawingSTAC(false);
    setDrawTypeSTAC(null);
  };

  const clearDrawnArea = () => {
    setStacTempGeometry(null);
    setIsDrawingSTAC(false);
    setDrawTypeSTAC(null);
    setIsEditingSTAC(false);
    setSearchResults([]);
    setSelectedItem(null);
    setSelectedSTACItems([]);
  };

  // 1. Query Collections List
  const { isLoading: isLoadingCollections } = useQuery<STACCollection[]>({
    queryKey: ['stac-collections'],
    queryFn: async () => {
      const response = await api.get('/stac/collections');
      setCollections(response.data);
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  // 2. Search Mutation
  const searchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await api.post('/stac/search', payload);
      return response.data.features || [];
    },
    onSuccess: (data: STACItem[]) => {
      setSearchResults(data);
    },
  });

  const handleSearch = () => {
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      if (start > end) {
        alert('Ngày kết thúc không thể trước ngày bắt đầu! Vui lòng chọn lại.');
        return;
      }
    }

    const datetimeStr = filters.startDate && filters.endDate
      ? `${filters.startDate}/${filters.endDate}`
      : filters.startDate
      ? `${filters.startDate}/..`
      : filters.endDate
      ? `../${filters.endDate}`
      : undefined;

    const payload: any = {
      collections: [filters.selectedCollection],
      datetime: datetimeStr,
    };

    if (spatialScope === 'draw') {
      if (!stacTempGeometry) {
        alert('Vui lòng tự vẽ một vùng tìm kiếm trên bản đồ trước!');
        return;
      }
      payload.intersects = stacTempGeometry;
    } else if (spatialScope === 'aoi') {
      if (activeSearchAOIs.length === 0) {
        alert('Vui lòng chọn một vùng AOI để tìm kiếm!');
        return;
      }
      payload.intersects = activeSearchAOIs[0].geometry;
    }

    searchMutation.mutate(payload);
  };

  const isSearchDisabled = 
    searchMutation.isPending || 
    (spatialScope === 'draw' && (!stacTempGeometry || isEditingSTAC)) ||
    (spatialScope === 'aoi' && activeSearchAOIs.length === 0);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Search Filter Controls */}
      <div className="space-y-3.5">
        {/* Collection Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">
            Bộ sưu tập dữ liệu (STAC Collection)
          </label>
          <div className="relative">
            {isLoadingCollections ? (
              <div className="w-full h-10 px-3 flex items-center bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin text-sky-400" />
                Đang tải danh sách...
              </div>
            ) : (
              (() => {
                const orderedCollections = [...collections].sort((a, b) => {
                  const idxA = COLLECTION_ORDER.indexOf(a.id);
                  const idxB = COLLECTION_ORDER.indexOf(b.id);
                  if (idxA === -1 && idxB === -1) return 0;
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                });
                return (
                  <select
                    value={filters.selectedCollection}
                    onChange={(e) => setFilters({ selectedCollection: e.target.value })}
                    className="w-full h-10 px-3 bg-slate-950/60 border border-slate-800/80 focus:border-sky-500/80 rounded-xl text-xs text-slate-300 outline-none cursor-pointer appearance-none transition-all"
                  >
                    {orderedCollections.map((col) => (
                      <option key={col.id} value={col.id} className="bg-slate-900 text-slate-300">
                        {col.title}
                      </option>
                    ))}
                  </select>
                );
              })()
            )}
            <div className="absolute right-3.5 top-3.5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Date Filter (Range) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5">
            Thời gian chụp ảnh (Từ ngày - Đến ngày)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative flex items-center">
              <input
                ref={startInputRef}
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({ startDate: e.target.value });
                  setIsStartOpen(false);
                }}
                onBlur={() => setIsStartOpen(false)}
                className="w-full h-10 pl-3.5 pr-9 bg-slate-950/40 border border-slate-800/80 focus:border-sky-500/80 rounded-xl text-[11px] text-slate-300 outline-none transition-all cursor-pointer"
                title="Từ ngày"
              />
              <button
                type="button"
                onMouseDown={handleStartToggle}
                className="absolute right-3 text-slate-500 hover:text-slate-300 cursor-pointer flex items-center justify-center"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                ref={endInputRef}
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters({ endDate: e.target.value });
                  setIsEndOpen(false);
                }}
                onBlur={() => setIsEndOpen(false)}
                className="w-full h-10 pl-3.5 pr-9 bg-slate-950/40 border border-slate-800/80 focus:border-sky-500/80 rounded-xl text-[11px] text-slate-300 outline-none transition-all cursor-pointer"
                title="Đến ngày"
              />
              <button
                type="button"
                onMouseDown={handleEndToggle}
                className="absolute right-3 text-slate-500 hover:text-slate-300 cursor-pointer flex items-center justify-center"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Spatial Scope Selector */}
        <div className="space-y-1.5 py-1 px-0.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Phạm vi không gian (Spatial Scope)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setSpatialScope('draw')}
              className={`h-8 px-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                spatialScope === 'draw'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-400'
              }`}
            >
              Tạo mới vùng
            </button>
            <button
              type="button"
              disabled={aois.length === 0}
              onClick={() => setSpatialScope('aoi')}
              className={`h-8 px-2 rounded-lg text-[10px] font-bold transition-all border cursor-pointer flex items-center justify-center space-x-1 ${
                spatialScope === 'aoi'
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-400'
                  : aois.length === 0
                  ? 'bg-slate-950/20 border-slate-900/20 text-slate-600 cursor-not-allowed opacity-40'
                  : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40 text-slate-400'
              }`}
              title={
                aois.length === 0 
                  ? "Vui lòng tạo ít nhất một vùng AOI để kích hoạt" 
                  : selectedAOIIds.length > 0
                  ? `Đã chọn vùng AOI: ${activeSearchAOIs[0]?.name || ''}`
                  : "Chọn vùng AOI để cấu hình"
              }
            >
              <span>Vùng AOI</span>
              {selectedAOIIds.length > 0 && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
            </button>
          </div>
          {spatialScope === 'aoi' && aois.length > 0 && (
            <div className="relative mt-2" ref={dropdownRef}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-0.5 mb-1.5">
                Vùng AOI áp dụng tìm kiếm
              </span>
              
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
                    {activeSearchAOIs.length === 0
                      ? 'Chọn vùng quan tâm...'
                      : activeSearchAOIs[0].name}
                  </span>
                </button>
                
                {/* Actions (X and Chevron) inside the field */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10">
                  {activeSearchAOIs.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAOI(null);
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
                  <div className="space-y-0.5 max-h-[118px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {aois.map((aoi) => {
                      const isChecked = selectedAOIIds.includes(aoi.id);
                      return (
                        <div 
                          key={aoi.id}
                          onClick={() => {
                            if (isChecked) {
                              selectAOI(null);
                            } else {
                              useAOIStore.setState({
                                selectedAOIIds: [aoi.id],
                                selectedAOIId: aoi.id,
                                isDrawing: false,
                                drawType: null,
                                tempGeometry: null,
                                editingAOIId: null
                              });
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
                                  : aoi.area >= 10000 
                                  ? `${(aoi.area / 10000).toFixed(1)} ha` 
                                  : `${aoi.area.toFixed(0)} m²`}
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
          )}

          {/* Custom Drawing Options when "Tạo mới vùng" is active */}
          {spatialScope === 'draw' && (
            <div className="space-y-2 mt-2 p-2.5 bg-slate-950/40 border border-slate-900 rounded-xl animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Vùng tìm kiếm
                </span>
                {stacTempGeometry && (
                  <div className="flex items-center space-x-3">
                    {/* Sửa hình / Lưu */}
                    <button
                      type="button"
                      onClick={() => setIsEditingSTAC(!isEditingSTAC)}
                      className={`text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
                        isEditingSTAC
                           ? 'text-emerald-400 hover:text-emerald-300 animate-pulse'
                           : 'text-sky-400 hover:text-sky-300'
                      }`}
                    >
                      {isEditingSTAC ? (
                        <>
                          <Save className="w-3 h-3" />
                          <span>Lưu</span>
                        </>
                      ) : (
                        <>
                          <Edit className="w-3 h-3" />
                          <span>Sửa hình</span>
                        </>
                      )}
                    </button>

                    {/* Xóa vùng */}
                    <button
                      type="button"
                      onClick={clearDrawnArea}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa vùng</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {stacTempGeometry ? (
                  <div className="text-[10px] font-semibold flex items-center space-x-1 animate-in fade-in duration-200">
                    {isEditingSTAC ? (
                      <span className="text-amber-400 flex items-center">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-1.5 animate-pulse" />
                        Đang sửa hình dạng...
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5" />
                        Đã lưu vùng tìm kiếm
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] font-semibold flex items-center animate-in fade-in duration-200">
                    <span className="text-sky-400/90 flex items-center">
                      <span className="w-1.5 h-1.5 bg-sky-400 rounded-full mr-1.5 animate-pulse" />
                      Chọn công cụ để vẽ vùng tìm ảnh STAC trên bản đồ
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={isDrawingSTAC && drawTypeSTAC === 'polygon' ? cancelDrawing : startDrawPolygon}
                    className={`h-8 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 border transition-all cursor-pointer ${
                      isDrawingSTAC && drawTypeSTAC === 'polygon'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-850 hover:border-slate-800 text-slate-300'
                    }`}
                    title={isDrawingSTAC && drawTypeSTAC === 'polygon' ? 'Hủy chế độ vẽ' : 'Vẽ đa giác tự do'}
                  >
                    <Hexagon className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isDrawingSTAC && drawTypeSTAC === 'polygon' ? 'Hủy vẽ' : 'Đa giác'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={isDrawingSTAC && drawTypeSTAC === 'rectangle' ? cancelDrawing : startDrawRectangle}
                    className={`h-8 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 border transition-all cursor-pointer ${
                      isDrawingSTAC && drawTypeSTAC === 'rectangle'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-850 hover:border-slate-800 text-slate-300'
                    }`}
                    title={isDrawingSTAC && drawTypeSTAC === 'rectangle' ? 'Hủy chế độ vẽ' : 'Vẽ hình chữ nhật'}
                  >
                    <Square className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isDrawingSTAC && drawTypeSTAC === 'rectangle' ? 'Hủy vẽ' : 'Chữ nhật'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={isDrawingSTAC && drawTypeSTAC === 'circle' ? cancelDrawing : startDrawCircle}
                    className={`h-8 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 border transition-all cursor-pointer ${
                      isDrawingSTAC && drawTypeSTAC === 'circle'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-850 hover:border-slate-800 text-slate-300'
                    }`}
                    title={isDrawingSTAC && drawTypeSTAC === 'circle' ? 'Hủy chế độ vẽ' : 'Vẽ hình tròn'}
                  >
                    <Circle className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isDrawingSTAC && drawTypeSTAC === 'circle' ? 'Hủy vẽ' : 'Hình tròn'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Action Button */}
        <button
          onClick={handleSearch}
          disabled={isSearchDisabled}
          className="w-full h-11 bg-sky-500 hover:bg-sky-400 active:scale-[0.98] disabled:bg-slate-800/90 disabled:text-slate-300 disabled:border disabled:border-slate-700/60 disabled:shadow-none disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white shadow-lg shadow-sky-500/10 cursor-pointer flex items-center justify-center space-x-2 transition-all duration-150"
        >
          {searchMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Đang tìm kiếm...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Tìm kiếm ảnh vệ tinh</span>
            </>
          )}
        </button>
      </div>

      {/* Search Results list */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5 px-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Kết quả ({searchResults.length})
          </span>
          {selectedSTACItems.length > 0 && (
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md animate-in fade-in duration-200">
              <span className="w-1 h-1 bg-emerald-450 rounded-full mr-1.5 animate-pulse" />
              Đã chọn {selectedSTACItems.length}
            </span>
          )}
        </div>

        {searchResults.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic bg-slate-950/20 border border-slate-800/30 rounded-xl">
            {searchMutation.isPending ? 'Đang tải danh sách kết quả...' : 'Chưa có kết quả tìm kiếm nào'}
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {searchResults.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isChecked = selectedSTACItems.some(i => i.id === item.id);
              const rawCloudCover = item.properties['eo:cloud_cover'] ?? 0;
              const cloudCover = typeof rawCloudCover === 'number' 
                ? Math.round((rawCloudCover + Number.EPSILON) * 100) / 100 
                : 0;
              const platform = item.properties.platform || 'Sentinel';
              return (
                <div key={item.id} className="flex items-center space-x-2 w-full">
                  {/* Selection Checkbox */}
                  <div 
                    onClick={() => {
                      if (isChecked) {
                        setSelectedSTACItems(selectedSTACItems.filter(i => i.id !== item.id));
                      } else {
                        if (selectedSTACItems.length >= 5) {
                          alert('Bạn chỉ được chọn tối đa 5 ảnh vệ tinh!');
                          return;
                        }
                        setSelectedSTACItems([...selectedSTACItems, item]);
                      }
                    }}
                    className="flex-shrink-0 cursor-pointer p-1 hover:bg-slate-800/40 rounded-lg transition-colors"
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-150 ${
                      isChecked 
                        ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/20' 
                        : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
                    }`}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 stroke-white stroke-[3.5] fill-none" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Main Card (Selection of Detail) */}
                  <div
                    onClick={() => setSelectedItem(isSelected ? null : item)}
                    className={`flex-1 min-w-0 flex items-start space-x-3 p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-lg'
                        : 'bg-slate-950/20 border-slate-850 hover:bg-slate-800/20 hover:border-slate-800 text-slate-300'
                    }`}
                  >
                    {/* Metadata Summary */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-bold truncate text-slate-200">
                        {item.id}
                      </div>
                      <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-semibold">
                        <span className="flex items-center">
                          <Cpu className="w-3 h-3 text-sky-400 mr-1" />
                          {platform}
                        </span>
                        {item.properties['eo:cloud_cover'] !== undefined && (
                          <span className="flex items-center">
                            <Cloud className="w-3 h-3 text-sky-400 mr-1" />
                            {cloudCover}% mây
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono pl-4">
                        {formatDate(item.properties.datetime)}
                      </div>
                    </div>
                    
                    {/* Indicator Icon */}
                    <div className="flex-shrink-0 self-center">
                      <ArrowRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isSelected ? 'rotate-90 text-sky-400' : ''}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metadata Detail Drawer (Epic 7) */}
      {selectedItem && (
        <div className="p-3.5 bg-slate-950/60 border border-sky-500/20 rounded-xl space-y-3 shadow-inner animate-in fade-in slide-in-from-bottom-2 duration-250">
          <div className="flex items-center space-x-1.5 pb-1.5 border-b border-slate-800/80">
            <Info className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-200">Chi tiết ảnh đang hiển thị (Metadata)</h4>
          </div>

          <div className="space-y-2 text-[10px] font-medium text-slate-300">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">ID:</span>
              <span className="col-span-2 text-slate-200 break-all font-mono">{selectedItem.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Ngày chụp:</span>
              <span className="col-span-2 text-slate-200">{formatDate(selectedItem.properties.datetime)}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Platform:</span>
              <span className="col-span-2 text-slate-200 uppercase">{selectedItem.properties.platform || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Tỉ lệ mây:</span>
              <span className="col-span-2 text-slate-200">
                {selectedItem.properties['eo:cloud_cover'] !== undefined 
                  ? `${Math.round((selectedItem.properties['eo:cloud_cover'] + Number.EPSILON) * 100) / 100}%` 
                  : '0%'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-slate-500 font-semibold">Tọa độ BBOX:</span>
              <span className="col-span-2 text-slate-200 font-mono text-[9px] leading-relaxed">
                [{selectedItem.bbox.map(n => n.toFixed(3)).join(', ')}]
              </span>
            </div>
          </div>

          {/* Action buttons inside drawer */}
          <div className="pt-1.5 flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <a
                href={getPreviewUrl(selectedItem)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-8 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem Ảnh Gốc</span>
              </a>
              
              {selectedItem.assets.visual.href && (
                <a
                  href={selectedItem.assets.visual.href}
                  download
                  className="px-2.5 h-8 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center justify-center transition-all cursor-pointer"
                  title="Tải ảnh vệ tinh TIFF"
                >
                  Tải TIF
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
